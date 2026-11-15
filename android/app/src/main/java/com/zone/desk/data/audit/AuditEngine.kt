package com.zone.desk.data.audit

import com.zone.desk.data.model.AuditEvent
import com.zone.desk.data.model.Keys
import com.zone.desk.util.ZoneIds
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.time.Instant

/**
 * Builds the same compact, before/after audit receipts that the web app writes.
 * The shape is intentionally identical so the back office can read changes
 * created on either surface.
 */
class AuditEngine(private val json: Json) {

    data class FieldDef(
        val name: String?,
        val kind: String,
        val noun: String,
        val plural: String,
        val titleFields: List<String> = emptyList(),
        val label: String? = null
    )

    data class SectionDef(
        val key: String,
        val tool: String,
        val page: String,
        val icon: String,
        val label: String,
        val kind: String,
        val noun: String = "",
        val plural: String = "",
        val titleFields: List<String> = emptyList(),
        val fields: List<FieldDef> = emptyList()
    )

    private data class Change(
        val key: String,
        val tool: String,
        val page: String,
        val label: String,
        val id: String,
        val op: String,
        val title: String,
        val before: JsonElement?,
        val after: JsonElement?,
        val noun: String,
        val plural: String,
        val scalar: Boolean = false,
        val value: Boolean = false
    )

    private val sections: Map<String, SectionDef> = listOf(
        SectionDef(
            Keys.DIARY, "Diary", "diary", "book", "Diary", "array",
            noun = "diary entry", plural = "diary entries", titleFields = listOf("title")
        ),
        SectionDef(
            Keys.LISTS, "Lists", "lists", "list", "Lists", "array",
            noun = "list", plural = "lists", titleFields = listOf("title")
        ),
        SectionDef(
            Keys.HABITS, "Habits", "habits", "repeat", "Habits", "object",
            fields = listOf(FieldDef("habits", "array", "habit", "habits", listOf("name")))
        ),
        SectionDef(
            Keys.NOTES, "Notes", "notes", "note", "Notes", "array",
            noun = "note", plural = "notes", titleFields = listOf("title")
        ),
        SectionDef(
            Keys.MONEY, "Money", "money", "wallet", "Money", "object",
            fields = listOf(
                FieldDef("transactions", "array", "transaction", "transactions", listOf("note", "category")),
                FieldDef("budget", "scalar", "budget", "budgets", label = "Monthly budget")
            )
        ),
        SectionDef(
            Keys.PASSBOOK, "Passbook", "passbook", "ledger", "Passbook", "object",
            fields = listOf(
                FieldDef("accounts", "array", "account", "accounts", listOf("name")),
                FieldDef("transactions", "array", "entry", "entries", listOf("description", "category"))
            )
        ),
        SectionDef(
            Keys.SPLIT, "Split", "split", "split", "Split", "object",
            fields = listOf(FieldDef("groups", "array", "split group", "split groups", listOf("name")))
        ),
        SectionDef(
            Keys.TRIPS, "Mileage", "mileage", "car", "Mileage", "array",
            noun = "fill-up", plural = "fill-ups", titleFields = listOf("vehicle", "note")
        ),
        SectionDef(
            Keys.VEHICLES, "Mileage", "mileage", "car", "Mileage", "array",
            noun = "vehicle", plural = "vehicles", titleFields = listOf("name")
        ),
        SectionDef(
            Keys.WATCHLIST, "Watchlist", "watchlist", "film", "Watchlist", "array",
            noun = "title", plural = "titles", titleFields = listOf("title")
        ),
        SectionDef(
            Keys.LINKS, "Links", "links", "link", "Links", "array",
            noun = "link", plural = "links", titleFields = listOf("title", "url")
        ),
        SectionDef(
            Keys.SUBSCRIPTIONS, "Subscriptions", "subscriptions", "card", "Subscriptions", "array",
            noun = "subscription", plural = "subscriptions", titleFields = listOf("name")
        )
    ).associateBy { it.key }

    fun section(key: String): SectionDef? = sections[key]

    fun createEvent(
        key: String,
        before: JsonElement?,
        after: JsonElement?,
        autoApprove: Boolean,
        source: String = "android"
    ): AuditEvent? {
        val patch = diffSection(key, before, after) ?: return null
        return eventFromPatches(
            patches = listOf(patch),
            autoApprove = autoApprove,
            source = source
        )
    }

    private fun eventFromPatches(
        patches: List<JsonObject>,
        autoApprove: Boolean,
        source: String,
        action: String? = null,
        status: String? = null,
        titleOverride: String? = null,
        detailOverride: String? = null,
        restoredFrom: String = "",
        note: String = ""
    ): AuditEvent? {
        if (patches.isEmpty()) return null
        val copy = eventCopy(patches)
        val now = Instant.now().toString()
        val resolvedStatus = status ?: if (autoApprove) "approved" else "pending"
        return AuditEvent(
            id = ZoneIds.uid("chg"),
            at = now,
            tool = copy.tool,
            page = copy.page,
            icon = copy.icon,
            action = action ?: copy.action,
            title = titleOverride ?: copy.title,
            detail = detailOverride ?: copy.detail,
            status = resolvedStatus,
            source = source,
            patches = patches,
            count = copy.count,
            recordCount = copy.recordCount,
            restoredFrom = restoredFrom,
            reviewedAt = if (resolvedStatus == "approved") now else "",
            auto = autoApprove && status == null,
            reviewNote = note
        )
    }

    fun diffSection(key: String, before: JsonElement?, after: JsonElement?): JsonObject? {
        val section = sections[key] ?: return null
        val fields = mutableListOf<JsonObject>()

        if (section.kind == "array") {
            val field = FieldDef(null, "array", section.noun, section.plural, section.titleFields)
            diffArray(before, after, field)?.let { fields += it }
        } else {
            val beforeObject = before as? JsonObject ?: JsonObject(emptyMap())
            val afterObject = after as? JsonObject ?: JsonObject(emptyMap())
            section.fields.forEach { field ->
                val name = field.name ?: return@forEach
                if (field.kind == "array") {
                    diffArray(beforeObject[name], afterObject[name], field)?.let { fields += it }
                } else if (field.kind == "scalar") {
                    val beforeValue = beforeObject[name] ?: JsonNull
                    val afterValue = afterObject[name] ?: JsonNull
                    if (beforeValue != afterValue) {
                        fields += buildJsonObject {
                            put("name", name)
                            put("kind", "scalar")
                            put("label", field.label ?: name)
                            put("before", beforeValue)
                            put("after", afterValue)
                        }
                    }
                }
            }
        }

        if (fields.isEmpty()) return null
        return buildJsonObject {
            put("key", key)
            put("tool", section.tool)
            put("page", section.page)
            put("icon", section.icon)
            put("label", section.label)
            put("fields", JsonArray(fields))
        }
    }

    private fun diffArray(before: JsonElement?, after: JsonElement?, field: FieldDef): JsonObject? {
        val beforeArray = before as? JsonArray ?: JsonArray(emptyList())
        val afterArray = after as? JsonArray ?: JsonArray(emptyList())
        if (beforeArray == afterArray) return null

        val beforeMap = linkedMapOf<String, Pair<JsonObject, Int>>()
        val afterMap = linkedMapOf<String, Pair<JsonObject, Int>>()
        var unkeyed = false

        beforeArray.forEachIndexed { index, element ->
            val record = element as? JsonObject ?: run { unkeyed = true; null }
            if (record == null) return@forEachIndexed
            val id = record.string("id")
            if (id.isBlank()) unkeyed = true else beforeMap[id] = record to index
        }
        afterArray.forEachIndexed { index, element ->
            val record = element as? JsonObject ?: run { unkeyed = true; null }
            if (record == null) return@forEachIndexed
            val id = record.string("id")
            if (id.isBlank()) unkeyed = true else afterMap[id] = record to index
        }

        if (unkeyed) {
            return buildJsonObject {
                put("name", field.name)
                put("kind", "value")
                put("noun", field.noun)
                put("plural", field.plural)
                put("before", beforeArray)
                put("after", afterArray)
            }
        }

        val changes = mutableListOf<JsonObject>()
        afterArray.forEachIndexed { index, element ->
            val record = element as? JsonObject ?: return@forEachIndexed
            val id = record.string("id")
            val previous = beforeMap[id]
            if (previous == null) {
                changes += buildJsonObject {
                    put("id", id)
                    put("op", "add")
                    put("index", index)
                    put("title", recordTitle(field, record))
                    put("after", record)
                }
            } else if (previous.first != record) {
                changes += buildJsonObject {
                    put("id", id)
                    put("op", "edit")
                    put("index", index)
                    put("title", recordTitle(field, record))
                    put("before", previous.first)
                    put("after", record)
                }
            }
        }
        beforeArray.forEachIndexed { index, element ->
            val record = element as? JsonObject ?: return@forEachIndexed
            val id = record.string("id")
            if (afterMap.containsKey(id)) return@forEachIndexed
            changes += buildJsonObject {
                put("id", id)
                put("op", "remove")
                put("index", index)
                put("title", recordTitle(field, record))
                put("before", record)
            }
        }

        if (changes.isEmpty()) return null
        return buildJsonObject {
            put("name", field.name)
            put("kind", "array")
            put("noun", field.noun)
            put("plural", field.plural)
            put("changes", JsonArray(changes))
        }
    }

    private fun recordTitle(field: FieldDef, record: JsonObject): String {
        val fields = field.titleFields.ifEmpty { listOf("title", "name", "description", "note") }
        fields.forEach { name ->
            val value = record.string(name)
            if (value.isNotBlank()) return clip(value, 72)
        }
        return "Untitled ${field.noun}"
    }

    private fun changes(patches: List<JsonObject>): List<Change> {
        val out = mutableListOf<Change>()
        patches.forEach { patch ->
            val key = patch.string("key")
            val tool = patch.string("tool")
            val page = patch.string("page")
            val label = patch.string("label")
            val fields = patch["fields"] as? JsonArray ?: JsonArray(emptyList())
            fields.forEach { fieldElement ->
                val field = fieldElement as? JsonObject ?: return@forEach
                val name = field.string("name")
                val kind = field.string("kind")
                if (kind == "array") {
                    val noun = field.string("noun")
                    val plural = field.string("plural")
                    (field["changes"] as? JsonArray ?: JsonArray(emptyList())).forEach { changeElement ->
                        val change = changeElement as? JsonObject ?: return@forEach
                        out += Change(
                            key = key,
                            tool = tool,
                            page = page,
                            label = label,
                            id = change.string("id"),
                            op = change.string("op"),
                            title = change.string("title"),
                            before = change["before"],
                            after = change["after"],
                            noun = noun,
                            plural = plural
                        )
                    }
                } else {
                    out += Change(
                        key = key,
                        tool = tool,
                        page = page,
                        label = label,
                        id = "",
                        op = "edit",
                        title = field.string("label").ifBlank { name.ifBlank { label } },
                        before = field["before"],
                        after = field["after"],
                        noun = "value",
                        plural = "values",
                        scalar = kind == "scalar",
                        value = kind == "value"
                    )
                }
            }
        }
        return out
    }

    private data class EventCopy(
        val tool: String,
        val page: String,
        val icon: String,
        val action: String,
        val title: String,
        val detail: String,
        val count: Int,
        val recordCount: Int
    )

    private fun eventCopy(patches: List<JsonObject>): EventCopy {
        val changes = changes(patches)
        val tools = changes.map { it.tool }.distinct()
        val pages = changes.map { it.page }.distinct()
        val tool = if (tools.size == 1) tools.first() else "Workspace"
        val page = if (pages.size == 1) pages.first() else "admin"
        val icon = if (page == "admin") "shield"
        else sections.values.firstOrNull { it.page == page }?.icon ?: "spark"
        val ops = changes.groupingBy { it.op }.eachCount()
        val action = when {
            ops.getOrDefault("add", 0) > 0 && ops.getOrDefault("edit", 0) == 0 && ops.getOrDefault("remove", 0) == 0 -> "add"
            ops.getOrDefault("remove", 0) > 0 && ops.getOrDefault("edit", 0) == 0 && ops.getOrDefault("add", 0) == 0 -> "delete"
            ops.getOrDefault("edit", 0) > 0 && ops.getOrDefault("add", 0) == 0 && ops.getOrDefault("remove", 0) == 0 -> "edit"
            else -> "mixed"
        }
        val records = changes.filter { !it.scalar && !it.value }
        val title: String
        if (records.size == 1 && changes.size == 1) {
            val record = records.first()
            title = when (action) {
                "add" -> "Added \u201C${record.title}\u201D"
                "delete" -> "Deleted \u201C${record.title}\u201D"
                "mixed" -> "Updated \u201C${record.title}\u201D"
                else -> "Edited \u201C${record.title}\u201D"
            }
        } else if (records.isNotEmpty()) {
            val noun = records.first().plural.ifBlank { "records" }
            val sameNoun = records.all { it.plural == noun }
            title = when (action) {
                "add" -> if (sameNoun) "Added ${plural(records.size, records.first().noun.ifBlank { "record" }, noun)}"
                else "Added ${plural(records.size, "record", "records")}"
                "delete" -> if (sameNoun) "Deleted ${plural(records.size, records.first().noun.ifBlank { "record" }, noun)}"
                else "Deleted ${plural(records.size, "record", "records")}"
                else -> "Updated ${plural(records.size, "record", "records")} in $tool"
            }
        } else {
            val labels = changes.map { it.title }.filter { it.isNotBlank() }
            title = "Updated ${labels.joinToString(", ").ifBlank { "$tool data" }}"
        }
        val detail = "$tool \u00B7 ${plural(changes.size, "change", "changes")}" +
            if (records.isNotEmpty() && changes.size != records.size) {
                " across ${plural(records.size, "record", "records")}"
            } else ""
        return EventCopy(
            tool = tool,
            page = page,
            icon = icon,
            action = action,
            title = clip(title, 96),
            detail = detail,
            count = changes.size,
            recordCount = records.size
        )
    }

    /**
     * Applies an audit event in reverse. Returns the affected workspace keys and
     * the value each key should hold after restoration. A null value means the
     * section should be removed.
     */
    fun revertDocuments(event: AuditEvent, documents: Map<String, JsonElement>): Map<String, JsonElement?> {
        val result = linkedMapOf<String, JsonElement?>()
        event.patches.forEach { patch ->
            val key = patch.string("key")
            if (key.isBlank()) return@forEach
            val section = sections[key] ?: return@forEach
            val current = documents[key] ?: defaultSection(section)
            result[key] = revertPatch(section, current, patch)
        }
        return result
    }

    private fun revertPatch(section: SectionDef, current: JsonElement, patch: JsonObject): JsonElement {
        val fields = patch["fields"] as? JsonArray ?: JsonArray(emptyList())
        if (section.kind == "array") {
            val field = fields.firstOrNull() as? JsonObject ?: return current
            val kind = field.string("kind")
            if (kind == "value") return field["before"] ?: JsonArray(emptyList())
            return applyArrayChanges(current, field)
        }

        val base = (current as? JsonObject)?.toMutableMap() ?: linkedMapOf()
        fields.forEach { element ->
            val field = element as? JsonObject ?: return@forEach
            val name = field.string("name")
            if (name.isBlank()) return@forEach
            val kind = field.string("kind")
            if (kind == "array") {
                base[name] = applyArrayChanges(base[name], field)
            } else {
                if (field.containsKey("before")) {
                    base[name] = field["before"] ?: JsonNull
                } else {
                    base.remove(name)
                }
            }
        }
        return JsonObject(base)
    }

    private fun applyArrayChanges(current: JsonElement?, field: JsonObject): JsonArray {
        val list = ((current as? JsonArray) ?: JsonArray(emptyList())).toMutableList()
        val changes = field["changes"] as? JsonArray ?: JsonArray(emptyList())
        changes.forEach { element ->
            val change = element as? JsonObject ?: return@forEach
            val id = change.string("id")
            val op = change.string("op")
            val index = change.int("index").coerceAtLeast(0)
            val before = change["before"]
            val existing = list.indexOfFirst { (it as? JsonObject)?.string("id") == id }
            when (op) {
                "add" -> if (existing >= 0) list.removeAt(existing)
                "remove" -> {
                    if (before != null) {
                        list.add(index.coerceIn(0, list.size), before)
                    }
                }
                "edit" -> {
                    if (before != null) {
                        if (existing >= 0) list[existing] = before
                        else list.add(index.coerceIn(0, list.size), before)
                    }
                }
            }
        }
        return JsonArray(list)
    }

    fun restoreEvent(
        event: AuditEvent,
        documents: Map<String, JsonElement>,
        target: Map<String, JsonElement?>,
        note: String = ""
    ): AuditEvent? {
        val patches = mutableListOf<JsonObject>()
        target.forEach { (key, value) ->
            if (value == null) return@forEach
            diffSection(key, documents[key], value)?.let { patches += it }
        }
        if (patches.isEmpty()) return null
        val wasPending = event.status == "pending"
        return eventFromPatches(
            patches = patches,
            autoApprove = true,
            source = "admin",
            action = "restore",
            status = "approved",
            titleOverride = (if (wasPending) "Rejected \u201C" else "Rolled back \u201C") + "${event.title}\u201D",
            detailOverride = "Data restored to the state before this change.",
            restoredFrom = event.id,
            note = note
        )
    }

    private fun defaultSection(section: SectionDef): JsonElement =
        if (section.kind == "array") JsonArray(emptyList()) else JsonObject(emptyMap())

    private fun plural(count: Int, one: String, many: String): String =
        "$count ${if (count == 1) one else many}"

    private fun clip(text: String, max: Int): String {
        val clean = text.replace(Regex("\\s+"), " ").trim()
        return if (clean.length > max) clean.take(max - 1) + "\u2026" else clean
    }

    private fun JsonObject.string(key: String): String =
        (this[key] as? JsonPrimitive)?.contentOrNull.orEmpty()

    private fun JsonObject.int(key: String): Int =
        (this[key] as? JsonPrimitive)?.intOrNull ?: 0
}
