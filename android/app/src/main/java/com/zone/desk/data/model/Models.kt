package com.zone.desk.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/* =========================================================================
   Zone workspace records
   These shapes mirror the JSON the web app keeps in localStorage and D1.
   Every field has a default so missing or older records still decode.
   ========================================================================= */

object Keys {
    const val DIARY = "diary"
    const val LISTS = "lists"
    const val HABITS = "habits"
    const val NOTES = "notes"
    const val MONEY = "money"
    const val PASSBOOK = "passbook"
    const val SPLIT = "split"
    const val TRIPS = "trips"
    const val VEHICLES = "vehicles"
    const val MILEAGE_CURRENCY = "mileage_currency"
    const val WATCHLIST = "watchlist"
    const val LINKS = "links"
    const val LINKS_VIEW = "linksView"
    const val SUBSCRIPTIONS = "subscriptions"
    const val SETTINGS = "settings"
    const val ADMIN = "admin"
    const val AUDIT = "audit"

    val allContent = listOf(
        DIARY, LISTS, HABITS, NOTES, MONEY, PASSBOOK, SPLIT, TRIPS, VEHICLES,
        MILEAGE_CURRENCY, WATCHLIST, LINKS, LINKS_VIEW, SUBSCRIPTIONS, SETTINGS, ADMIN
    )
}

@Serializable
data class DiaryEntry(
    val id: String = "",
    val date: String = "",
    val mood: String = "good",
    val title: String = "",
    val body: String = "",
    val tags: List<String> = emptyList()
)

@Serializable
data class TaskChild(
    val id: String = "",
    val text: String = "",
    val done: Boolean = false
)

@Serializable
data class TaskItem(
    val id: String = "",
    val text: String = "",
    val done: Boolean = false,
    val children: List<TaskChild> = emptyList()
)

@Serializable
data class ZoneList(
    val id: String = "",
    val title: String = "",
    val createdAt: String = "",
    val items: List<TaskItem> = emptyList()
)

@Serializable
data class Habit(
    val id: String = "",
    val name: String = "",
    val target: Int = 7,
    val createdAt: String = "",
    val checks: Map<String, Boolean> = emptyMap()
)

@Serializable
data class HabitData(
    val habits: List<Habit> = emptyList()
)

@Serializable
data class Note(
    val id: String = "",
    val title: String = "",
    val body: String = "",
    val color: String = "plain",
    val pinned: Boolean = false,
    val created: String = "",
    val updated: String = ""
)

@Serializable
data class MoneyTxn(
    val id: String = "",
    val type: String = "expense",
    val amount: Double = 0.0,
    val category: String = "Other",
    val date: String = "",
    val note: String = ""
)

@Serializable
data class MoneyData(
    val budget: Double = 0.0,
    val transactions: List<MoneyTxn> = emptyList()
)

@Serializable
data class Account(
    val id: String = "",
    val name: String = "",
    val type: String = "Bank",
    val number: String = "",
    val opening: Double = 0.0
)

@Serializable
data class PassbookTxn(
    val id: String = "",
    val accountId: String = "",
    val type: String = "withdraw",
    val amount: Double = 0.0,
    val category: String = "Other",
    val description: String = "",
    val date: String = ""
)

@Serializable
data class PassbookData(
    val accounts: List<Account> = emptyList(),
    val transactions: List<PassbookTxn> = emptyList()
)

@Serializable
data class SplitMember(
    val id: String = "",
    val name: String = ""
)

@Serializable
data class SplitExpense(
    val id: String = "",
    val description: String = "",
    val amount: Double = 0.0,
    val paidBy: String = "",
    val date: String = "",
    val sharedWith: List<String> = emptyList(),
    val category: String = "other"
)

@Serializable
data class SplitGroup(
    val id: String = "",
    val name: String = "",
    val kind: String = "other",
    val members: List<SplitMember> = emptyList(),
    val expenses: List<SplitExpense> = emptyList()
)

@Serializable
data class SplitData(
    val groups: List<SplitGroup> = emptyList()
)

@Serializable
data class Trip(
    val id: String = "",
    val vehicle: String = "",
    val date: String = "",
    val start: Double = 0.0,
    val end: Double = 0.0,
    val price: Double = 0.0,
    val paid: Double = 0.0,
    val note: String = ""
)

@Serializable
data class Vehicle(
    val id: String = "",
    val name: String = "",
    val type: String = "car",
    val fuel: String = "petrol",
    val createdAt: String = ""
)

@Serializable
data class Season(
    val number: Int = 1,
    val episodes: Int = 0,
    val watched: Int = 0
)

@Serializable
data class WatchItem(
    val id: String = "",
    val title: String = "",
    val type: String = "Film",
    val year: Int = 0,
    val genre: String = "",
    val status: String = "Queued",
    val rating: Double = 0.0,
    val watched: Int = 0,
    val total: Int = 0,
    val service: String = "",
    val favorite: Boolean = false,
    val note: String = "",
    val added: String = "",
    val seasons: List<Season> = emptyList()
)

@Serializable
data class ZoneLink(
    val id: String = "",
    val title: String = "",
    val url: String = "",
    val tags: List<String> = emptyList(),
    val note: String = "",
    val favorite: Boolean = false,
    val saved: String = ""
)

@Serializable
data class Subscription(
    val id: String = "",
    val name: String = "",
    val amount: Double = 0.0,
    val cycle: String = "Monthly",
    val next: String = "",
    val category: String = "Other",
    val status: String = "Active"
)

@Serializable
data class ZoneSettings(
    val theme: String = "system",
    val currency: String = "INR"
)

@Serializable
data class AdminSettings(
    @SerialName("autoApprove") val autoApprove: Boolean = false
)

@Serializable
data class AdminData(
    val settings: AdminSettings = AdminSettings()
)

/* =========================================================================
   Audit trail — matches the web app's zone.v1.audit records.
   ========================================================================= */

@Serializable
data class AuditEvent(
    val id: String = "",
    val at: String = "",
    val tool: String = "Workspace",
    val page: String = "admin",
    val icon: String = "spark",
    val action: String = "edit",
    val title: String = "",
    val detail: String = "",
    val status: String = "pending",
    val source: String = "android",
    val patches: List<JsonObject> = emptyList(),
    val count: Int = 0,
    val recordCount: Int = 0,
    val restoredFrom: String = "",
    val reviewedAt: String = "",
    val auto: Boolean = false,
    val reviewNote: String = "",
    val restoreNote: String = "",
    val restoredAt: String = "",
    val restoreEventId: String = ""
)

/* =========================================================================
   Remote DTOs for the Cloudflare Pages /api endpoints.
   ========================================================================= */

@Serializable
data class DataItem(
    val key: String,
    val value: JsonElement? = null
)

@Serializable
data class DataRequest(
    val items: List<DataItem>
)

@Serializable
data class AuditRequest(
    val events: List<AuditEvent> = emptyList(),
    val deleted: List<String> = emptyList()
)

@Serializable
data class AuditEnvelope(
    val events: List<AuditEvent> = emptyList()
)

@Serializable
data class BootstrapResponse(
    val ok: Boolean = false,
    val data: Map<String, JsonElement> = emptyMap(),
    val audit: AuditEnvelope = AuditEnvelope(),
    val error: String = ""
)

@Serializable
data class DataResponse(
    val ok: Boolean = false,
    val saved: Int = 0,
    val error: String = ""
)

@Serializable
data class LoginResponse(
    val ok: Boolean = false,
    val token: String = "",
    val expiresAt: Long = 0,
    val error: String = ""
)

@Serializable
data class SessionResponse(
    val ok: Boolean = false,
    val expiresAt: Long = 0,
    val error: String = ""
)

@Serializable
data class HealthResponse(
    val ok: Boolean = false,
    val db: Boolean = false,
    val schema: Boolean = false,
    val adminSecretSet: Boolean = false,
    val error: String = ""
)

@Serializable
data class ApiErrorResponse(
    val ok: Boolean = false,
    val error: String = ""
)
