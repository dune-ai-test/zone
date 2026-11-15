package com.zone.desk.data.repo

import com.zone.desk.data.audit.AuditEngine
import com.zone.desk.data.local.AuditDao
import com.zone.desk.data.local.AuditDeletionDao
import com.zone.desk.data.local.AuditDeletionEntity
import com.zone.desk.data.local.AuditEventEntity
import com.zone.desk.data.local.WorkspaceDao
import com.zone.desk.data.local.WorkspaceRecordEntity
import com.zone.desk.data.local.ZoneDatabase
import com.zone.desk.data.model.AdminData
import com.zone.desk.data.model.AuditEvent
import com.zone.desk.data.model.Keys
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonArray
import java.time.Instant

/**
 * The single local cache for the workspace. Every section is stored as the same
 * JSON document the web app writes to D1, which keeps the two surfaces fully
 * interchangeable. Writes land in Room synchronously (from the user's point of
 * view) and are queued for D1 by the sync engine.
 */
class WorkspaceRepository(
    database: ZoneDatabase,
    val json: Json
) {
    private val workspaceDao: WorkspaceDao = database.workspaceDao()
    private val auditDao: AuditDao = database.auditDao()
    private val deletionDao: AuditDeletionDao = database.auditDeletionDao()
    private val auditEngine = AuditEngine(json)

    private val localChanges = MutableSharedFlow<Unit>(extraBufferCapacity = 16)
    val changes: SharedFlow<Unit> = localChanges

    val documents: Flow<Map<String, JsonElement>> = workspaceDao.observeAll()
        .map { rows ->
            rows.mapNotNull { row ->
                val value = runCatching { json.parseToJsonElement(row.json) }.getOrNull()
                if (value == null) null else row.key to value
            }.toMap()
        }
        .distinctUntilChanged()

    val auditEvents: Flow<List<AuditEvent>> = auditDao.observeAll()
        .map { rows -> rows.mapNotNull { decodeAudit(it.json) } }
        .distinctUntilChanged()

    /* ---------------------------------------------------------------------
       Reading
       --------------------------------------------------------------------- */

    suspend fun readDocument(key: String): JsonElement? =
        workspaceDao.find(key)?.let { row ->
            runCatching { json.parseToJsonElement(row.json) }.getOrNull()
        }

    suspend fun readAllDocuments(): Map<String, JsonElement> =
        workspaceDao.dirty().associate { row ->
            row.key to (runCatching { json.parseToJsonElement(row.json) }.getOrNull() ?: JsonObject(emptyMap()))
        } + cleanDocuments()

    private suspend fun cleanDocuments(): Map<String, JsonElement> {
        val found = linkedMapOf<String, JsonElement>()
        workspaceDao.cleanKeys().forEach { key ->
            workspaceDao.find(key)?.let { row ->
                runCatching { json.parseToJsonElement(row.json) }.getOrNull()?.let { found[key] = it }
            }
        }
        return found
    }

    suspend fun cacheRecordCount(): Int = workspaceDao.count()

    suspend fun cacheByteSize(): Long = workspaceDao.byteSize()

    suspend fun auditCount(): Int = auditDao.count()

    /* ---------------------------------------------------------------------
       Writing
       --------------------------------------------------------------------- */

    suspend fun write(key: String, value: JsonElement, source: String = "android") {
        val previous = readDocument(key)
        if (previous == value) return
        val text = value.toString()
        workspaceDao.upsert(
            WorkspaceRecordEntity(
                key = key,
                json = text,
                updatedAt = System.currentTimeMillis(),
                dirty = true
            )
        )
        queueAudit(key, previous, value, source)
        localChanges.tryEmit(Unit)
    }

    suspend fun remove(key: String, source: String = "android") {
        val previous = readDocument(key) ?: return
        workspaceDao.delete(key)
        queueAudit(key, previous, null, source)
        localChanges.tryEmit(Unit)
    }

    private suspend fun queueAudit(key: String, before: JsonElement?, after: JsonElement?, source: String) {
        if (key !in auditedKeys) return
        val auto = autoApprove()
        val event = auditEngine.createEvent(key, before, after, auto, source) ?: return
        auditDao.upsert(
            AuditEventEntity(
                id = event.id,
                json = json.encodeToString(AuditEvent.serializer(), event),
                at = event.at,
                status = event.status,
                dirty = true
            )
        )
    }

    private suspend fun autoApprove(): Boolean {
        val row = workspaceDao.find(Keys.ADMIN) ?: return false
        return runCatching {
            json.decodeFromString(AdminData.serializer(), row.json).settings.autoApprove
        }.getOrDefault(false)
    }

    /* ---------------------------------------------------------------------
       Audit review
       --------------------------------------------------------------------- */

    suspend fun approveEvent(id: String, note: String = "Approved on Android.") {
        val row = auditDao.all().firstOrNull { it.id == id } ?: return
        val event = decodeAudit(row.json) ?: return
        if (event.status != "pending") return
        val updated = event.copy(
            status = "approved",
            reviewedAt = Instant.now().toString(),
            auto = false,
            reviewNote = note
        )
        auditDao.upsert(
            AuditEventEntity(
                id = updated.id,
                json = json.encodeToString(AuditEvent.serializer(), updated),
                at = updated.at,
                status = updated.status,
                dirty = true
            )
        )
        localChanges.tryEmit(Unit)
    }

    /**
     * Rejects an event and writes the previous values back, creating the same
     * kind of restore receipt as the web back office.
     */
    suspend fun rejectEvent(id: String, note: String = "Rejected on Android.") {
        val row = auditDao.all().firstOrNull { it.id == id } ?: return
        val event = decodeAudit(row.json) ?: return
        if (event.status != "pending" && event.status != "approved") return

        val documents = readAllDocuments()
        val target = auditEngine.revertDocuments(event, documents)

        if (event.status == "approved" || event.status == "pending") {
            target.forEach { (key, value) ->
                if (value == null) {
                    workspaceDao.delete(key)
                } else {
                    workspaceDao.upsert(
                        WorkspaceRecordEntity(
                            key = key,
                            json = value.toString(),
                            updatedAt = System.currentTimeMillis(),
                            dirty = true
                        )
                    )
                }
            }
        }

        val restore = auditEngine.restoreEvent(event, documents, target, note)
        val now = Instant.now().toString()
        val updated = event.copy(
            status = "rejected",
            reviewedAt = now,
            restoredAt = now,
            restoreNote = note,
            restoreEventId = restore?.id.orEmpty()
        )
        auditDao.upsert(
            AuditEventEntity(
                id = updated.id,
                json = json.encodeToString(AuditEvent.serializer(), updated),
                at = updated.at,
                status = updated.status,
                dirty = true
            )
        )
        if (restore != null) {
            auditDao.upsert(
                AuditEventEntity(
                    id = restore.id,
                    json = json.encodeToString(AuditEvent.serializer(), restore),
                    at = restore.at,
                    status = restore.status,
                    dirty = true
                )
            )
        }
        localChanges.tryEmit(Unit)
    }

    suspend fun clearResolvedEvents() {
        val resolved = auditDao.resolved()
        if (resolved.isEmpty()) return
        val ids = resolved.map { it.id }
        auditDao.deleteByIds(ids)
        ids.forEach { deletionDao.enqueue(AuditDeletionEntity(it, System.currentTimeMillis())) }
        localChanges.tryEmit(Unit)
    }

    suspend fun pendingAuditCount(): Int =
        auditDao.all().count { it.status == "pending" }

    suspend fun lastAuditAt(): String? = auditDao.all().firstOrNull()?.at

    /* ---------------------------------------------------------------------
       Sync support
       --------------------------------------------------------------------- */

    data class DirtyDocument(val key: String, val json: String)

    suspend fun dirtyDocuments(): List<DirtyDocument> =
        workspaceDao.dirty().map { DirtyDocument(it.key, it.json) }

    suspend fun markDocumentClean(key: String, json: String) {
        workspaceDao.markClean(key, json)
    }

    suspend fun dirtyAuditEvents(): List<AuditEvent> =
        auditDao.dirty().mapNotNull { decodeAudit(it.json) }

    suspend fun markAuditClean(id: String, text: String) {
        auditDao.markClean(id, text)
    }

    suspend fun queuedAuditDeletions(): List<String> =
        deletionDao.all().map { it.id }

    suspend fun clearAuditDeletions(ids: List<String>) {
        if (ids.isNotEmpty()) deletionDao.remove(ids)
    }

    /**
     * Applies the server snapshot while protecting sections edited locally but
     * not yet pushed. Clean sections that no longer exist on the server are
     * removed, keeping D1 as the shared source of truth.
     */
    suspend fun replaceDocumentsFromServer(remote: Map<String, JsonElement>) {
        val dirtyKeys = workspaceDao.dirty().map { it.key }.toSet()
        remote.forEach { (key, value) ->
            if (key in RESERVED_KEYS || key in dirtyKeys) return@forEach
            workspaceDao.upsert(
                WorkspaceRecordEntity(
                    key = key,
                    json = value.toString(),
                    updatedAt = System.currentTimeMillis(),
                    dirty = false
                )
            )
        }
        val remoteKeys = remote.keys - RESERVED_KEYS
        workspaceDao.cleanKeys()
            .filter { it !in remoteKeys && it !in dirtyKeys }
            .forEach { workspaceDao.deleteIfClean(it) }
    }

    suspend fun replaceAuditFromServer(remote: List<AuditEvent>) {
        val dirtyIds = auditDao.dirty().map { it.id }.toSet()
        val remoteIds = remote.map { it.id }.toSet()
        remote.forEach { event ->
            if (event.id.isBlank() || event.id in dirtyIds) return@forEach
            auditDao.upsert(
                AuditEventEntity(
                    id = event.id,
                    json = json.encodeToString(AuditEvent.serializer(), event),
                    at = event.at,
                    status = event.status,
                    dirty = false
                )
            )
        }
        auditDao.all()
            .filter { !it.dirty && it.id !in remoteIds }
            .forEach { auditDao.deleteIfClean(it.id) }
    }

    suspend fun restoreFromBackup(data: Map<String, JsonElement>) {
        data.forEach { (key, value) ->
            if (key in RESERVED_KEYS) return@forEach
            workspaceDao.upsert(
                WorkspaceRecordEntity(
                    key = key,
                    json = value.toString(),
                    updatedAt = System.currentTimeMillis(),
                    dirty = true
                )
            )
        }
        localChanges.tryEmit(Unit)
    }

    private fun decodeAudit(text: String): AuditEvent? =
        runCatching { json.decodeFromString(AuditEvent.serializer(), text) }.getOrNull()

    companion object {
        val auditedKeys = setOf(
            Keys.DIARY, Keys.LISTS, Keys.HABITS, Keys.NOTES, Keys.MONEY, Keys.PASSBOOK,
            Keys.SPLIT, Keys.TRIPS, Keys.VEHICLES, Keys.WATCHLIST, Keys.LINKS, Keys.SUBSCRIPTIONS
        )
        private val RESERVED_KEYS = setOf("audit", "seeded", "cloud", "precloud")
    }
}
