package com.zone.desk.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.zone.desk.ZoneApplication
import com.zone.desk.data.model.Account
import com.zone.desk.data.model.AdminData
import com.zone.desk.data.model.AuditEvent
import com.zone.desk.data.model.DiaryEntry
import com.zone.desk.data.model.Habit
import com.zone.desk.data.model.HabitData
import com.zone.desk.data.model.Keys
import com.zone.desk.data.model.MoneyData
import com.zone.desk.data.model.MoneyTxn
import com.zone.desk.data.model.Note
import com.zone.desk.data.model.PassbookData
import com.zone.desk.data.model.PassbookTxn
import com.zone.desk.data.model.Season
import com.zone.desk.data.model.SplitData
import com.zone.desk.data.model.SplitExpense
import com.zone.desk.data.model.SplitGroup
import com.zone.desk.data.model.SplitMember
import com.zone.desk.data.model.Subscription
import com.zone.desk.data.model.TaskChild
import com.zone.desk.data.model.TaskItem
import com.zone.desk.data.model.Trip
import com.zone.desk.data.model.Vehicle
import com.zone.desk.data.model.WatchItem
import com.zone.desk.data.model.ZoneLink
import com.zone.desk.data.model.ZoneList
import com.zone.desk.data.model.ZoneSettings
import com.zone.desk.data.prefs.ZonePreferences
import com.zone.desk.data.prefs.ZonePrefs
import com.zone.desk.data.sync.SyncState
import com.zone.desk.domain.ListTemplates
import com.zone.desk.domain.seasonTotals
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneIds
import com.zone.desk.util.ZoneMoney
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant
import java.util.Locale

class ZoneViewModel(application: Application) : AndroidViewModel(application) {
    private val container = (application as ZoneApplication).container
    private val repository = container.repository
    private val prefsStore = container.prefs
    private val sync = container.sync
    private val api = container.api
    private val json: Json = container.json

    /* ---------------------------------------------------------------------
       Observable cache
       --------------------------------------------------------------------- */

    private fun <T> typedFlow(key: String, default: T, serializer: KSerializer<T>): StateFlow<T> =
        repository.documents
            .map { docs ->
                docs[key]?.let { element ->
                    runCatching { json.decodeFromJsonElement(serializer, element) }.getOrNull()
                } ?: default
            }
            .stateIn(viewModelScope, SharingStarted.Eagerly, default)

    val settings: StateFlow<ZoneSettings> =
        typedFlow(Keys.SETTINGS, ZoneSettings(), ZoneSettings.serializer())
    val diary: StateFlow<List<DiaryEntry>> =
        typedFlow(Keys.DIARY, emptyList(), ListSerializer(DiaryEntry.serializer()))
    val lists: StateFlow<List<ZoneList>> =
        typedFlow(Keys.LISTS, emptyList(), ListSerializer(ZoneList.serializer()))
    val habits: StateFlow<HabitData> =
        typedFlow(Keys.HABITS, HabitData(), HabitData.serializer())
    val notes: StateFlow<List<Note>> =
        typedFlow(Keys.NOTES, emptyList(), ListSerializer(Note.serializer()))
    val money: StateFlow<MoneyData> =
        typedFlow(Keys.MONEY, MoneyData(), MoneyData.serializer())
    val passbook: StateFlow<PassbookData> =
        typedFlow(Keys.PASSBOOK, PassbookData(), PassbookData.serializer())
    val split: StateFlow<SplitData> =
        typedFlow(Keys.SPLIT, SplitData(), SplitData.serializer())
    val trips: StateFlow<List<Trip>> =
        typedFlow(Keys.TRIPS, emptyList(), ListSerializer(Trip.serializer()))
    val vehicles: StateFlow<List<Vehicle>> =
        typedFlow(Keys.VEHICLES, emptyList(), ListSerializer(Vehicle.serializer()))
    val watchlist: StateFlow<List<WatchItem>> =
        typedFlow(Keys.WATCHLIST, emptyList(), ListSerializer(WatchItem.serializer()))
    val links: StateFlow<List<ZoneLink>> =
        typedFlow(Keys.LINKS, emptyList(), ListSerializer(ZoneLink.serializer()))
    val subscriptions: StateFlow<List<Subscription>> =
        typedFlow(Keys.SUBSCRIPTIONS, emptyList(), ListSerializer(Subscription.serializer()))
    val admin: StateFlow<AdminData> =
        typedFlow(Keys.ADMIN, AdminData(), AdminData.serializer())

    val auditEvents: StateFlow<List<AuditEvent>> = repository.auditEvents
        .stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val pendingAudit: StateFlow<Int> = auditEvents
        .map { events -> events.count { it.status == "pending" } }
        .stateIn(viewModelScope, SharingStarted.Eagerly, 0)

    val prefs: StateFlow<ZonePrefs> = prefsStore.data
        .stateIn(viewModelScope, SharingStarted.Eagerly, ZonePrefs())

    val syncState: StateFlow<SyncState> = sync.stateFlow

    val cachedSections: StateFlow<Int> = repository.documents
        .map { it.size }
        .stateIn(viewModelScope, SharingStarted.Eagerly, 0)

    val adminUnlocked: StateFlow<Boolean> = prefs
        .map { it.hasAdminSession }
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    private val _toast = MutableStateFlow<String?>(null)
    val toast: StateFlow<String?> = _toast.asStateFlow()

    init {
        sync.start()
    }

    fun announce(message: String) {
        _toast.value = message
    }

    fun clearToast() {
        _toast.value = null
    }

    /* ---------------------------------------------------------------------
       Workspace + sync
       --------------------------------------------------------------------- */

    fun setApiBase(raw: String, onResult: (Boolean, String) -> Unit = { _, _ -> }) {
        viewModelScope.launch {
            val normalized = ZonePreferences.normalizeApiBase(raw)
            prefsStore.setApiBase(normalized)
            if (normalized.isBlank()) {
                onResult(false, "Enter your Cloudflare Pages workspace URL.")
                return@launch
            }
            sync.requestSync(0)
            onResult(true, "Workspace saved. Syncing with D1\u2026")
        }
    }

    fun syncNow() {
        sync.requestSync(0)
    }

    fun login(password: String, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            val base = prefs.value.apiBase
            if (base.isBlank()) {
                onResult(false, "Connect your workspace first.")
                return@launch
            }
            if (password.isBlank()) {
                onResult(false, "Enter the admin password.")
                return@launch
            }
            val result = api.login(base, password)
            if (result.ok && result.token.isNotBlank()) {
                prefsStore.setAdminSession(result.token, result.expiresAt)
                sync.requestSync(300)
                onResult(true, "Back office unlocked.")
            } else {
                onResult(false, result.error.ifBlank { "That password did not match." })
            }
        }
    }

    fun logout() {
        viewModelScope.launch { prefsStore.clearAdminSession() }
    }

    fun approveEvent(id: String) {
        viewModelScope.launch {
            repository.approveEvent(id)
            announce("Change approved.")
            sync.requestSync(400)
        }
    }

    fun rejectEvent(id: String) {
        viewModelScope.launch {
            repository.rejectEvent(id)
            announce("Change rejected and restored.")
            sync.requestSync(400)
        }
    }

    fun clearResolved() {
        viewModelScope.launch {
            repository.clearResolvedEvents()
            announce("Resolved activity cleared.")
            sync.requestSync(400)
        }
    }

    suspend fun backupJson(): String {
        val docs = repository.readAllDocuments()
        val payload = buildJsonObject {
            put("app", "Zone")
            put("version", 1)
            put("exportedAt", Instant.now().toString())
            put("data", JsonObject(docs))
        }
        return payload.toString()
    }

    suspend fun importBackup(text: String): Result<Int> = runCatching {
        val root = json.parseToJsonElement(text) as? JsonObject ?: error("That backup is not a JSON object.")
        val data = root["data"] as? JsonObject ?: error("That backup has no workspace data.")
        var count = 0
        data.forEach { (key, value) ->
            if (key != "audit" && key != "seeded") count += 1
        }
        repository.restoreFromBackup(data)
        count
    }

    /* ---------------------------------------------------------------------
       Diary
       --------------------------------------------------------------------- */

    fun saveDiary(entry: DiaryEntry) {
        val clean = entry.copy(
            id = entry.id.ifBlank { ZoneIds.uid("diary") },
            date = ZoneDates.valid(entry.date) ?: ZoneDates.today(),
            mood = if (entry.mood in MOODS) entry.mood else "good",
            title = entry.title.trim(),
            tags = cleanTags(entry.tags)
        )
        val next = diary.value.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        writeList(Keys.DIARY, next.sortedWith(compareByDescending<DiaryEntry> { it.date }.thenByDescending { it.id }), DiaryEntry.serializer())
        announce("Diary entry saved.")
    }

    fun deleteDiary(id: String) {
        writeList(Keys.DIARY, diary.value.filterNot { it.id == id }, DiaryEntry.serializer())
        announce("Diary entry deleted.")
    }

    /* ---------------------------------------------------------------------
       Lists
       --------------------------------------------------------------------- */

    fun createList(title: String, templateId: String) {
        val template = ListTemplates.byId(templateId)
        val list = ZoneList(
            id = ZoneIds.uid("list"),
            title = title.trim().ifBlank { template.name },
            createdAt = ZoneDates.today(),
            items = ListTemplates.buildItems(template)
        )
        writeList(Keys.LISTS, lists.value + list, ZoneList.serializer())
        announce("List created.")
    }

    fun saveList(list: ZoneList) {
        val clean = list.copy(
            id = list.id.ifBlank { ZoneIds.uid("list") },
            title = list.title.trim().ifBlank { "Untitled list" }
        )
        updateLists { current ->
            val next = current.toMutableList()
            val index = next.indexOfFirst { it.id == clean.id }
            if (index >= 0) next[index] = clean else next += clean
            next
        }
    }

    fun deleteList(id: String) {
        writeList(Keys.LISTS, lists.value.filterNot { it.id == id }, ZoneList.serializer())
        announce("List deleted.")
    }

    fun addItem(listId: String, text: String) {
        if (text.isBlank()) return
        updateList(listId) { list ->
            list.copy(items = list.items + TaskItem(ZoneIds.uid("li"), text.trim()))
        }
    }

    fun addChild(listId: String, itemId: String, text: String) {
        if (text.isBlank()) return
        updateList(listId) { list ->
            list.copy(items = list.items.map { item ->
                if (item.id == itemId) {
                    item.copy(children = item.children + TaskChild(ZoneIds.uid("lc"), text.trim()), done = false)
                } else item
            })
        }
    }

    fun toggleItem(listId: String, itemId: String) {
        updateList(listId) { list ->
            list.copy(items = list.items.map { item ->
                if (item.id != itemId) item
                else item.copy(
                    done = !item.done,
                    children = item.children.map { it.copy(done = !item.done) }
                )
            })
        }
    }

    fun toggleChild(listId: String, itemId: String, childId: String) {
        updateList(listId) { list ->
            list.copy(items = list.items.map { item ->
                if (item.id != itemId) item
                else {
                    val children = item.children.map { child ->
                        if (child.id == childId) child.copy(done = !child.done) else child
                    }
                    item.copy(children = children, done = children.isNotEmpty() && children.all { it.done })
                }
            })
        }
    }

    fun deleteItem(listId: String, itemId: String) {
        updateList(listId) { list -> list.copy(items = list.items.filterNot { it.id == itemId }) }
    }

    fun deleteChild(listId: String, itemId: String, childId: String) {
        updateList(listId) { list ->
            list.copy(items = list.items.map { item ->
                if (item.id != itemId) item
                else item.copy(children = item.children.filterNot { it.id == childId })
            })
        }
    }

    private fun updateList(listId: String, transform: (ZoneList) -> ZoneList) {
        updateLists { current -> current.map { if (it.id == listId) transform(it) else it } }
    }

    private fun updateLists(transform: (List<ZoneList>) -> List<ZoneList>) {
        writeList(Keys.LISTS, transform(lists.value), ZoneList.serializer())
    }

    /* ---------------------------------------------------------------------
       Habits
       --------------------------------------------------------------------- */

    fun saveHabit(habit: Habit) {
        val clean = habit.copy(
            id = habit.id.ifBlank { ZoneIds.uid("habit") },
            name = habit.name.trim().ifBlank { "Untitled habit" },
            target = habit.target.coerceIn(1, 7),
            createdAt = ZoneDates.valid(habit.createdAt) ?: ZoneDates.today()
        )
        val next = habits.value.habits.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        write(Keys.HABITS, json.encodeToJsonElement(HabitData.serializer(), HabitData(next)))
        announce("Habit saved.")
    }

    fun deleteHabit(id: String) {
        write(Keys.HABITS, json.encodeToJsonElement(HabitData.serializer(), HabitData(habits.value.habits.filterNot { it.id == id })))
        announce("Habit deleted.")
    }

    fun toggleHabit(id: String, date: String = ZoneDates.today()) {
        val next = habits.value.habits.map { habit ->
            if (habit.id != id) habit
            else {
                val checks = habit.checks.toMutableMap()
                if (checks[date] == true) checks.remove(date) else checks[date] = true
                habit.copy(checks = checks)
            }
        }
        write(Keys.HABITS, json.encodeToJsonElement(HabitData.serializer(), HabitData(next)))
    }

    /* ---------------------------------------------------------------------
       Notes
       --------------------------------------------------------------------- */

    fun saveNote(note: Note) {
        val clean = note.copy(
            id = note.id.ifBlank { ZoneIds.uid("note") },
            title = note.title.trim().ifBlank { "Untitled note" },
            color = if (note.color in NOTE_COLORS) note.color else "plain",
            created = ZoneDates.valid(note.created) ?: ZoneDates.today(),
            updated = ZoneDates.today()
        )
        val next = notes.value.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        writeList(Keys.NOTES, next.sortedByDescending { it.updated }, Note.serializer())
        announce("Note saved.")
    }

    fun deleteNote(id: String) {
        writeList(Keys.NOTES, notes.value.filterNot { it.id == id }, Note.serializer())
        announce("Note deleted.")
    }

    fun toggleNotePin(id: String) {
        writeList(
            Keys.NOTES,
            notes.value.map { if (it.id == id) it.copy(pinned = !it.pinned, updated = ZoneDates.today()) else it },
            Note.serializer()
        )
    }

    /* ---------------------------------------------------------------------
       Money
       --------------------------------------------------------------------- */

    fun saveTransaction(txn: MoneyTxn) {
        val clean = txn.copy(
            id = txn.id.ifBlank { ZoneIds.uid("txn") },
            type = if (txn.type == "income") "income" else "expense",
            amount = txn.amount.coerceAtLeast(0.0),
            date = ZoneDates.valid(txn.date) ?: ZoneDates.today(),
            category = txn.category.ifBlank { "Other" },
            note = txn.note.trim()
        )
        val current = money.value
        val next = current.transactions.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        write(Keys.MONEY, json.encodeToJsonElement(MoneyData.serializer(), current.copy(transactions = next.sortedByDescending { it.date })))
        announce("Transaction saved.")
    }

    fun deleteTransaction(id: String) {
        val current = money.value
        write(Keys.MONEY, json.encodeToJsonElement(MoneyData.serializer(), current.copy(transactions = current.transactions.filterNot { it.id == id })))
        announce("Transaction deleted.")
    }

    fun setBudget(amount: Double) {
        write(Keys.MONEY, json.encodeToJsonElement(MoneyData.serializer(), money.value.copy(budget = amount.coerceAtLeast(0.0))))
        announce("Monthly budget updated.")
    }

    /* ---------------------------------------------------------------------
       Passbook
       --------------------------------------------------------------------- */

    fun saveAccount(account: Account) {
        val clean = account.copy(
            id = account.id.ifBlank { ZoneIds.uid("acc") },
            name = account.name.trim().ifBlank { "Untitled account" },
            opening = account.opening
        )
        val current = passbook.value
        val next = current.accounts.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        write(Keys.PASSBOOK, json.encodeToJsonElement(PassbookData.serializer(), current.copy(accounts = next)))
        announce("Account saved.")
    }

    fun deleteAccount(id: String) {
        val current = passbook.value
        write(
            Keys.PASSBOOK,
            json.encodeToJsonElement(
                PassbookData.serializer(),
                current.copy(
                    accounts = current.accounts.filterNot { it.id == id },
                    transactions = current.transactions.filterNot { it.accountId == id }
                )
            )
        )
        announce("Account and its entries removed.")
    }

    fun savePassbookTxn(txn: PassbookTxn) {
        val clean = txn.copy(
            id = txn.id.ifBlank { ZoneIds.uid("pb") },
            type = if (txn.type == "deposit") "deposit" else "withdraw",
            amount = txn.amount.coerceAtLeast(0.0),
            date = ZoneDates.valid(txn.date) ?: ZoneDates.today(),
            category = txn.category.ifBlank { "Other" },
            description = txn.description.trim()
        )
        val current = passbook.value
        val next = current.transactions.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        write(Keys.PASSBOOK, json.encodeToJsonElement(PassbookData.serializer(), current.copy(transactions = next.sortedByDescending { it.date })))
        announce("Passbook entry saved.")
    }

    fun deletePassbookTxn(id: String) {
        val current = passbook.value
        write(Keys.PASSBOOK, json.encodeToJsonElement(PassbookData.serializer(), current.copy(transactions = current.transactions.filterNot { it.id == id })))
        announce("Passbook entry deleted.")
    }

    /* ---------------------------------------------------------------------
       Split
       --------------------------------------------------------------------- */

    fun createGroup(name: String, kind: String, members: List<String>) {
        val cleanMembers = members.map { it.trim() }.filter { it.isNotBlank() }.distinct()
            .ifEmpty { listOf("You") }
            .map { SplitMember(ZoneIds.uid("sm"), it) }
        val group = SplitGroup(
            id = ZoneIds.uid("group"),
            name = name.trim().ifBlank { "Untitled table" },
            kind = kind,
            members = cleanMembers,
            expenses = emptyList()
        )
        writeList(Keys.SPLIT, split.value.groups + group, SplitGroup.serializer())
        announce("Table created.")
    }

    fun saveGroup(group: SplitGroup) {
        val clean = group.copy(
            id = group.id.ifBlank { ZoneIds.uid("group") },
            name = group.name.trim().ifBlank { "Untitled table" }
        )
        val next = split.value.groups.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        write(Keys.SPLIT, json.encodeToJsonElement(SplitData.serializer(), SplitData(next)))
    }

    fun deleteGroup(id: String) {
        writeList(Keys.SPLIT, split.value.groups.filterNot { it.id == id }, SplitGroup.serializer())
        announce("Table deleted.")
    }

    fun addSplitMember(groupId: String, name: String) {
        if (name.isBlank()) return
        updateGroup(groupId) { group ->
            group.copy(members = group.members + SplitMember(ZoneIds.uid("sm"), name.trim()))
        }
    }

    fun removeSplitMember(groupId: String, memberId: String) {
        updateGroup(groupId) { group ->
            group.copy(members = group.members.filterNot { it.id == memberId })
        }
    }

    fun saveSplitExpense(groupId: String, expense: SplitExpense) {
        val clean = expense.copy(
            id = expense.id.ifBlank { ZoneIds.uid("gx") },
            description = expense.description.trim().ifBlank { "Shared cost" },
            amount = expense.amount.coerceAtLeast(0.0),
            date = ZoneDates.valid(expense.date) ?: ZoneDates.today(),
            sharedWith = expense.sharedWith.ifEmpty { listOfNotNull(split.value.groups.firstOrNull { it.id == groupId }?.members?.firstOrNull()?.id) }
        )
        updateGroup(groupId) { group ->
            val next = group.expenses.toMutableList()
            val index = next.indexOfFirst { it.id == clean.id }
            if (index >= 0) next[index] = clean else next += clean
            group.copy(expenses = next.sortedByDescending { it.date })
        }
        announce("Shared cost saved.")
    }

    fun deleteSplitExpense(groupId: String, expenseId: String) {
        updateGroup(groupId) { group -> group.copy(expenses = group.expenses.filterNot { it.id == expenseId }) }
        announce("Shared cost deleted.")
    }

    fun settleSplit(groupId: String, fromId: String, toId: String, amount: Double) {
        val group = split.value.groups.firstOrNull { it.id == groupId } ?: return
        val from = group.members.firstOrNull { it.id == fromId } ?: return
        val to = group.members.firstOrNull { it.id == toId } ?: return
        saveSplitExpense(
            groupId,
            SplitExpense(
                id = ZoneIds.uid("gx"),
                description = "Settlement \u2014 ${from.name} to ${to.name}",
                amount = amount,
                paidBy = fromId,
                date = ZoneDates.today(),
                sharedWith = listOf(toId),
                category = "settlement"
            )
        )
    }

    private fun updateGroup(groupId: String, transform: (SplitGroup) -> SplitGroup) {
        val next = split.value.groups.map { if (it.id == groupId) transform(it) else it }
        write(Keys.SPLIT, json.encodeToJsonElement(SplitData.serializer(), SplitData(next)))
    }

    /* ---------------------------------------------------------------------
       Mileage
       --------------------------------------------------------------------- */

    fun saveTrip(trip: Trip) {
        val clean = trip.copy(
            id = trip.id.ifBlank { ZoneIds.uid("trip") },
            vehicle = trip.vehicle.trim().ifBlank { "Unnamed vehicle" },
            date = ZoneDates.valid(trip.date) ?: ZoneDates.today(),
            start = trip.start.coerceAtLeast(0.0),
            end = trip.end.coerceAtLeast(0.0),
            price = trip.price.coerceAtLeast(0.0),
            paid = trip.paid.coerceAtLeast(0.0),
            note = trip.note.trim()
        )
        val next = trips.value.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        writeList(Keys.TRIPS, next.sortedByDescending { it.date }, Trip.serializer())

        if (vehicles.value.none { it.name.equals(clean.vehicle, ignoreCase = true) }) {
            val vehicle = Vehicle(
                id = ZoneIds.uid("vehicle"),
                name = clean.vehicle.take(40),
                type = inferVehicleType(clean.vehicle),
                fuel = "petrol",
                createdAt = ZoneDates.today()
            )
            writeList(Keys.VEHICLES, vehicles.value + vehicle, Vehicle.serializer())
        }
        announce("Fill-up saved.")
    }

    fun deleteTrip(id: String) {
        writeList(Keys.TRIPS, trips.value.filterNot { it.id == id }, Trip.serializer())
        announce("Fill-up deleted.")
    }

    fun saveVehicle(vehicle: Vehicle) {
        val clean = vehicle.copy(
            id = vehicle.id.ifBlank { ZoneIds.uid("vehicle") },
            name = vehicle.name.trim().take(40).ifBlank { "Unnamed vehicle" },
            createdAt = ZoneDates.valid(vehicle.createdAt) ?: ZoneDates.today()
        )
        val next = vehicles.value.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        writeList(Keys.VEHICLES, next, Vehicle.serializer())
        announce("Vehicle saved.")
    }

    fun deleteVehicle(id: String) {
        writeList(Keys.VEHICLES, vehicles.value.filterNot { it.id == id }, Vehicle.serializer())
        announce("Vehicle removed.")
    }

    /* ---------------------------------------------------------------------
       Watchlist
       --------------------------------------------------------------------- */

    fun saveWatch(item: WatchItem) {
        val type = if (item.type == "Series") "Series" else "Film"
        val seasons = if (type == "Series") item.seasons.filter { it.episodes > 0 } else emptyList()
        val totals = seasonTotals(seasons)
        val clean = item.copy(
            id = item.id.ifBlank { ZoneIds.uid("watch") },
            title = item.title.trim().ifBlank { "Untitled" },
            type = type,
            status = if (item.status in WATCH_STATUSES) item.status else "Queued",
            genre = item.genre.trim(),
            service = item.service.trim(),
            note = item.note.trim(),
            seasons = seasons,
            watched = if (type == "Series" && seasons.isNotEmpty()) totals.second else item.watched,
            total = if (type == "Series" && seasons.isNotEmpty()) totals.first else item.total,
            added = ZoneDates.valid(item.added) ?: ZoneDates.today()
        )
        val next = watchlist.value.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        writeList(Keys.WATCHLIST, next, WatchItem.serializer())
        announce("Title saved.")
    }

    fun deleteWatch(id: String) {
        writeList(Keys.WATCHLIST, watchlist.value.filterNot { it.id == id }, WatchItem.serializer())
        announce("Title removed.")
    }

    fun toggleWatchFavorite(id: String) {
        writeList(Keys.WATCHLIST, watchlist.value.map { if (it.id == id) it.copy(favorite = !it.favorite) else it }, WatchItem.serializer())
    }

    fun advanceWatch(id: String) {
        val item = watchlist.value.firstOrNull { it.id == id } ?: return
        val seasons = item.seasons.sortedBy { it.number }.toMutableList()
        var advanced = false
        for (index in seasons.indices) {
            val season = seasons[index]
            if (season.watched < season.episodes) {
                seasons[index] = season.copy(watched = season.watched + 1)
                advanced = true
                break
            }
        }
        if (!advanced && item.total > item.watched) {
            val watched = (item.watched + 1).coerceAtMost(item.total)
            val done = watched >= item.total
            writeList(
                Keys.WATCHLIST,
                watchlist.value.map {
                    if (it.id == id) it.copy(watched = watched, status = if (done) "Watched" else "Watching") else it
                },
                WatchItem.serializer()
            )
            announce(if (done) "Shelf cleared: ${item.title}." else "Watched through E$watched.")
            return
        }
        val totals = seasonTotals(seasons)
        val done = totals.second >= totals.first
        writeList(
            Keys.WATCHLIST,
            watchlist.value.map {
                if (it.id == id) it.copy(
                    seasons = seasons,
                    watched = totals.second,
                    total = totals.first,
                    status = if (done) "Watched" else "Watching"
                ) else it
            },
            WatchItem.serializer()
        )
        announce(if (done) "Shelf cleared: ${item.title}." else "Next episode marked watched.")
    }

    fun setWatchStatus(id: String, status: String) {
        if (status !in WATCH_STATUSES) return
        writeList(Keys.WATCHLIST, watchlist.value.map { if (it.id == id) it.copy(status = status) else it }, WatchItem.serializer())
    }

    /* ---------------------------------------------------------------------
       Links
       --------------------------------------------------------------------- */

    fun saveLink(link: ZoneLink) {
        val url = ZoneMoney.normalizeUrl(link.url) ?: return
        val clean = link.copy(
            id = link.id.ifBlank { ZoneIds.uid("link") },
            title = link.title.trim().ifBlank { ZoneMoney.domainOf(url) },
            url = url,
            tags = link.tags.map { it.trim().removePrefix("#") }.filter { it.isNotBlank() }.distinct().take(6),
            note = link.note.trim(),
            saved = ZoneDates.valid(link.saved) ?: ZoneDates.today()
        )
        val next = links.value.toMutableList()
        val index = next.indexOfFirst { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        writeList(Keys.LINKS, next, ZoneLink.serializer())
        announce("Link saved.")
    }

    fun deleteLink(id: String) {
        writeList(Keys.LINKS, links.value.filterNot { it.id == id }, ZoneLink.serializer())
        announce("Link removed.")
    }

    fun toggleLinkFavorite(id: String) {
        writeList(Keys.LINKS, links.value.map { if (it.id == id) it.copy(favorite = !it.favorite) else it }, ZoneLink.serializer())
    }

    /* ---------------------------------------------------------------------
       Subscriptions
       --------------------------------------------------------------------- */

    fun saveSubscription(sub: Subscription) {
        val clean = sub.copy(
            id = sub.id.ifBlank { ZoneIds.uid("sub") },
            name = sub.name.trim().ifBlank { "Untitled subscription" },
            amount = sub.amount.coerceAtLeast(0.0),
            cycle = if (sub.cycle in SUB_CYCLES) sub.cycle else "Monthly",
            next = ZoneDates.valid(sub.next) ?: ZoneDates.today(),
            category = sub.category.ifBlank { "Other" },
            status = if (sub.status == "Paused") "Paused" else "Active"
        )
        val next = subscriptions.value.toMutableList()
        val index = next.firstIndexOf { it.id == clean.id }
        if (index >= 0) next[index] = clean else next += clean
        writeList(Keys.SUBSCRIPTIONS, next, Subscription.serializer())
        announce("Subscription saved.")
    }

    fun deleteSubscription(id: String) {
        writeList(Keys.SUBSCRIPTIONS, subscriptions.value.filterNot { it.id == id }, Subscription.serializer())
        announce("Subscription removed.")
    }

    fun toggleSubscriptionPaused(id: String) {
        writeList(
            Keys.SUBSCRIPTIONS,
            subscriptions.value.map {
                if (it.id == id) it.copy(status = if (it.status == "Paused") "Active" else "Paused") else it
            },
            Subscription.serializer()
        )
    }

    /* ---------------------------------------------------------------------
       Settings
       --------------------------------------------------------------------- */

    fun setTheme(theme: String) {
        if (theme !in listOf("light", "dark", "system")) return
        write(Keys.SETTINGS, json.encodeToJsonElement(ZoneSettings.serializer(), settings.value.copy(theme = theme)))
    }

    fun setCurrency(code: String) {
        if (ZoneMoney.currencies.none { it.code == code }) return
        write(Keys.SETTINGS, json.encodeToJsonElement(ZoneSettings.serializer(), settings.value.copy(currency = code)))
    }

    fun setAutoApprove(enabled: Boolean) {
        write(Keys.ADMIN, json.encodeToJsonElement(AdminData.serializer(), AdminData(com.zone.desk.data.model.AdminSettings(enabled))))
        announce(if (enabled) "Changes approve themselves from now on." else "Changes will wait for review.")
    }

    /* ---------------------------------------------------------------------
       Shared writers
       --------------------------------------------------------------------- */

    private fun <T> writeList(key: String, list: List<T>, serializer: KSerializer<T>) {
        write(key, json.encodeToJsonElement(ListSerializer(serializer), list))
    }

    private fun write(key: String, element: JsonElement) {
        viewModelScope.launch { repository.write(key, element) }
    }

    private fun cleanTags(tags: List<String>): List<String> {
        val seen = mutableSetOf<String>()
        return tags.map { it.trim().removePrefix("#").replace(Regex("\\s+"), " ") }
            .filter { it.isNotBlank() && seen.add(it.lowercase(Locale.ENGLISH)) }
            .take(8)
    }

    private fun inferVehicleType(name: String): String {
        val value = name.lowercase(Locale.ENGLISH)
        return when {
            Regex("scooter|activa|vespa|jupiter|nmax|burgman|pleasure").containsMatchIn(value) -> "scooter"
            Regex("bike|enfield|bullet|classic|pulsar|duke|r15|fz-|fz |mt-|ninja|himalayan|dominar").containsMatchIn(value) -> "bike"
            Regex("suv|fortuner|scorpio|creta|xuv|seltos|thar|brezza|harrier|safari|endeavour").containsMatchIn(value) -> "suv"
            Regex("truck|lorry|tempo|pickup|canter|eicher|ace").containsMatchIn(value) -> "truck"
            else -> "car"
        }
    }

    private fun <T> List<T>.firstIndexOf(predicate: (T) -> Boolean): Int =
        indexOfFirst(predicate)

    companion object {
        val MOODS = listOf("low", "flat", "good", "bright", "peak")
        val NOTE_COLORS = listOf("plain", "sand", "sage", "clay")
        val WATCH_STATUSES = listOf("Queued", "Watching", "Watched", "Dropped")
        val SUB_CYCLES = listOf("Monthly", "Yearly", "Weekly")
    }
}
