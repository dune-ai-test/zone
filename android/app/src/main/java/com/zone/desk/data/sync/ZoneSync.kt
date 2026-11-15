package com.zone.desk.data.sync

import com.zone.desk.data.model.DataItem
import com.zone.desk.data.prefs.ZonePreferences
import com.zone.desk.data.remote.ApiException
import com.zone.desk.data.remote.ZoneApi
import com.zone.desk.data.repo.WorkspaceRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean

enum class SyncPhase {
    LOCAL, UNCONFIGURED, SYNCING, SYNCED, OFFLINE, ERROR
}

data class SyncState(
    val phase: SyncPhase = SyncPhase.LOCAL,
    val message: String = "Local cache",
    val lastSync: Long = 0L,
    val pendingWrites: Int = 0
) {
    val isBusy: Boolean get() = phase == SyncPhase.SYNCING
    val isOnline: Boolean get() = phase == SyncPhase.SYNCED || phase == SyncPhase.SYNCING
}

/**
 * Pushes queued local writes to the existing Cloudflare Pages API and pulls the
 * shared D1 snapshot back. Conflict rule: a section that changed locally while
 * offline keeps the local version; everything else follows D1.
 */
class ZoneSync(
    private val api: ZoneApi,
    private val prefs: ZonePreferences,
    private val repository: WorkspaceRepository,
    private val scope: CoroutineScope,
    private val json: Json
) {
    private val state = MutableStateFlow(SyncState())
    val stateFlow: StateFlow<SyncState> = state
    private val mutex = Mutex()
    private var debounce: Job? = null
    private val started = AtomicBoolean(false)

    init {
        scope.launch {
            repository.changes.collect {
                if (started.get()) requestSync()
            }
        }
    }

    fun start() {
        if (!started.compareAndSet(false, true)) return
        scope.launch {
            val settings = prefs.data.first()
            if (settings.apiBase.isBlank()) {
                state.value = SyncState(
                    phase = SyncPhase.UNCONFIGURED,
                    message = "Add your workspace URL in Settings",
                    lastSync = settings.lastSync
                )
            } else {
                syncNow()
            }
        }
    }

    fun requestSync(delayMs: Long = 850) {
        debounce?.cancel()
        debounce = scope.launch {
            delay(delayMs)
            syncNow()
        }
    }

    suspend fun syncNow(): Boolean = mutex.withLock {
        val settings = prefs.data.first()
        if (settings.apiBase.isBlank()) {
            state.value = state.value.copy(
                phase = SyncPhase.UNCONFIGURED,
                message = "Local only \u2014 add your workspace URL",
                lastSync = settings.lastSync
            )
            return@withLock true
        }

        state.value = state.value.copy(phase = SyncPhase.SYNCING, message = "Talking to D1\u2026")
        try {
            var pending = 0

            repository.dirtyDocuments().chunked(100).forEach { batch ->
                val items = batch.map { document ->
                    val value: JsonElement? = runCatching { json.parseToJsonElement(document.json) }.getOrNull()
                    DataItem(document.key, value)
                }
                api.putData(settings.apiBase, items, settings.adminToken.ifBlank { null })
                batch.forEach { repository.markDocumentClean(it.key, it.json) }
                pending += batch.size
            }

            val events = repository.dirtyAuditEvents()
            if (events.isNotEmpty()) {
                api.postAudit(settings.apiBase, events, emptyList(), settings.adminToken.ifBlank { null })
                events.forEach { event ->
                    repository.markAuditClean(
                        event.id,
                        json.encodeToString(com.zone.desk.data.model.AuditEvent.serializer(), event)
                    )
                }
                pending += events.size
            }

            val deleted = repository.queuedAuditDeletions()
            if (deleted.isNotEmpty()) {
                if (settings.adminToken.isBlank()) {
                    throw ApiException(401, "Unlock the back office before clearing the activity trail.")
                }
                api.postAudit(settings.apiBase, emptyList(), deleted, settings.adminToken)
                repository.clearAuditDeletions(deleted)
            }

            val snapshot = api.bootstrap(settings.apiBase)
            if (!snapshot.ok) {
                throw IOException(snapshot.error.ifBlank { "The workspace returned an unexpected response." })
            }
            repository.replaceDocumentsFromServer(snapshot.data)
            repository.replaceAuditFromServer(snapshot.audit.events)

            val now = System.currentTimeMillis()
            prefs.setLastSync(now)
            state.value = SyncState(
                phase = SyncPhase.SYNCED,
                message = "In sync with D1",
                lastSync = now,
                pendingWrites = 0
            )
            true
        } catch (error: ApiException) {
            state.value = state.value.copy(
                phase = if (error.status == 0) SyncPhase.OFFLINE else SyncPhase.ERROR,
                message = error.message,
                pendingWrites = repository.dirtyDocuments().size
            )
            false
        } catch (error: IOException) {
            state.value = state.value.copy(
                phase = SyncPhase.OFFLINE,
                message = "Offline \u2014 ${error.message ?: "D1 is unreachable"}",
                pendingWrites = repository.dirtyDocuments().size
            )
            false
        } catch (error: Exception) {
            state.value = state.value.copy(
                phase = SyncPhase.ERROR,
                message = error.message ?: "Sync failed.",
                pendingWrites = repository.dirtyDocuments().size
            )
            false
        }
    }
}
