package com.zone.desk.domain

import com.zone.desk.data.model.Account
import com.zone.desk.data.model.DiaryEntry
import com.zone.desk.data.model.Habit
import com.zone.desk.data.model.HabitData
import com.zone.desk.data.model.MoneyData
import com.zone.desk.data.model.MoneyTxn
import com.zone.desk.data.model.PassbookData
import com.zone.desk.data.model.PassbookTxn
import com.zone.desk.data.model.Season
import com.zone.desk.data.model.SplitExpense
import com.zone.desk.data.model.SplitGroup
import com.zone.desk.data.model.Subscription
import com.zone.desk.data.model.TaskItem
import com.zone.desk.data.model.Trip
import com.zone.desk.data.model.WatchItem
import com.zone.desk.data.model.ZoneLink
import com.zone.desk.data.model.ZoneList
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneMoney
import java.time.LocalDate
import kotlin.math.abs

/* ================================ Diary ================================ */

data class DiaryStats(
    val entries: Int = 0,
    val words: Int = 0,
    val days: Int = 0,
    val streak: Int = 0,
    val latest: String? = null
)

fun diaryStats(entries: List<DiaryEntry>): DiaryStats {
    if (entries.isEmpty()) return DiaryStats()
    val dates = entries.mapNotNull { ZoneDates.parse(it.date) }.distinct().sortedDescending()
    var streak = 0
    if (dates.isNotEmpty()) {
        var cursor = LocalDate.now()
        if (dates.first() != cursor) cursor = cursor.minusDays(1)
        while (dates.contains(cursor)) {
            streak += 1
            cursor = cursor.minusDays(1)
        }
    }
    return DiaryStats(
        entries = entries.size,
        words = entries.sumOf { ZoneMoney.words(it.body) },
        days = dates.size,
        streak = streak,
        latest = entries.maxByOrNull { it.date }?.id
    )
}

/* ================================ Lists ================================ */

data class ListProgress(val total: Int = 0, val done: Int = 0, val open: Int = 0, val pct: Int = 0)

fun listProgress(list: ZoneList): ListProgress {
    var total = 0
    var done = 0
    list.items.forEach { item ->
        total += 1
        if (item.done) done += 1
        item.children.forEach { child ->
            total += 1
            if (child.done) done += 1
        }
    }
    return ListProgress(total, done, total - done, if (total == 0) 0 else ((done.toDouble() / total) * 100).roundInt())
}

fun allListProgress(lists: List<ZoneList>): ListProgress {
    var total = 0
    var done = 0
    lists.forEach { list ->
        val p = listProgress(list)
        total += p.total
        done += p.done
    }
    return ListProgress(total, done, total - done, if (total == 0) 0 else ((done.toDouble() / total) * 100).roundInt())
}

fun openListRows(lists: List<ZoneList>): List<Pair<ZoneList, TaskItem>> {
    val rows = mutableListOf<Pair<ZoneList, TaskItem>>()
    lists.forEach { list ->
        list.items.forEach { item ->
            if (!item.done) rows += list to item
        }
    }
    return rows
}

fun listKind(title: String): String {
    val text = title.lowercase()
    return when {
        Regex("\\b(read|reading|book|books|library|novel)\\b").containsMatchIn(text) -> "reading"
        Regex("\\b(trip|travel|packing|pack|holiday|flight|vacation)\\b").containsMatchIn(text) -> "trip"
        Regex("\\b(grocery|groceries|shopping|shop|market|errands?)\\b").containsMatchIn(text) -> "grocery"
        Regex("\\b(launch|project|work|client|team|sprint|ship|review)\\b").containsMatchIn(text) -> "work"
        Regex("\\b(weekend|home|house|clean|reset|garden|flat)\\b").containsMatchIn(text) -> "home"
        else -> "other"
    }
}

fun listKindLabel(kind: String): String = when (kind) {
    "home" -> "Home"
    "work" -> "Project"
    "reading" -> "Reading"
    "trip" -> "Travel"
    "grocery" -> "Errands"
    else -> "General"
}

/* ================================ Habits ================================ */

data class HabitStats(
    val streak: Int = 0,
    val longest: Int = 0,
    val monthCount: Int = 0,
    val weekChecked: Int = 0,
    val weekTarget: Int = 0,
    val weekPct: Int = 0,
    val checkedToday: Boolean = false
)

fun isChecked(habit: Habit, date: String): Boolean = habit.checks[date] == true

fun habitStreak(habit: Habit): Int {
    var cursor = LocalDate.now()
    if (!isChecked(habit, cursor.toString())) cursor = cursor.minusDays(1)
    var count = 0
    while (isChecked(habit, cursor.toString())) {
        count += 1
        cursor = cursor.minusDays(1)
    }
    return count
}

fun habitLongestStreak(habit: Habit): Int {
    val days = habit.checks.filter { it.value }.keys.mapNotNull { ZoneDates.parse(it) }.sorted()
    if (days.isEmpty()) return 0
    var best = 1
    var run = 1
    for (index in 1 until days.size) {
        if (days[index - 1].plusDays(1) == days[index]) run += 1 else run = 1
        if (run > best) best = run
    }
    return best
}

fun habitStats(habit: Habit): HabitStats {
    val today = LocalDate.now()
    val monthKey = today.toString().take(7)
    val monthCount = habit.checks.count { it.value && it.key.startsWith(monthKey) }
    val week = ZoneDates.weekDates()
    val elapsed = week.count { it <= today.toString() }
    val checked = week.take(elapsed).count { isChecked(habit, it) }
    val target = habit.target.coerceIn(1, 7)
    return HabitStats(
        streak = habitStreak(habit),
        longest = habitLongestStreak(habit),
        monthCount = monthCount,
        weekChecked = checked,
        weekTarget = minOf(target, elapsed),
        weekPct = if (elapsed == 0) 0 else ((checked.toDouble() / minOf(target, elapsed)) * 100).roundInt().coerceAtMost(100),
        checkedToday = isChecked(habit, today.toString())
    )
}

fun checkedToday(data: HabitData): Int = data.habits.count { isChecked(it, ZoneDates.today()) }

fun habitWeekPulse(habits: List<Habit>, weeksBack: Int = 8): List<Float> {
    val today = LocalDate.now()
    return (weeksBack - 1 downTo 0).map { offset ->
        val dates = ZoneDates.weekDates(-offset)
        val elapsed = dates.count { it <= today.toString() }
        var met = 0.0
        var slots = 0.0
        habits.forEach { habit ->
            val counted = dates.take(elapsed).count { isChecked(habit, it) }
            val cap = minOf(habit.target.coerceIn(1, 7), elapsed)
            met += minOf(counted, cap)
            slots += cap
        }
        if (slots <= 0) 0f else ((met / slots) * 100).toFloat()
    }
}

fun habitWeekPulse(habit: Habit, weeksBack: Int = 8): List<Float> {
    val today = LocalDate.now()
    return (weeksBack - 1 downTo 0).map { offset ->
        val dates = ZoneDates.weekDates(-offset)
        val elapsed = dates.count { it <= today.toString() }
        val counted = dates.take(elapsed).count { isChecked(habit, it) }
        val cap = minOf(habit.target.coerceIn(1, 7), elapsed)
        if (cap <= 0) 0f else (counted.toFloat() / cap * 100f).coerceAtMost(100f)
    }
}

/* ================================ Money ================================ */

data class MoneyMonth(
    val month: String,
    val transactions: List<MoneyTxn> = emptyList(),
    val spent: Double = 0.0,
    val income: Double = 0.0,
    val net: Double = 0.0,
    val budget: Double = 0.0,
    val budgetPct: Int = 0,
    val remaining: Double = 0.0,
    val daysLeft: Int = 0,
    val expenseCount: Int = 0,
    val incomeCount: Int = 0
)

data class CategoryTotal(val name: String, val amount: Double, val pct: Int)

fun monthSummary(money: MoneyData, month: String): MoneyMonth {
    val list = money.transactions.filter { it.date.startsWith(month) }
    val spent = list.filter { it.type == "expense" }.sumOf { it.amount }
    val income = list.filter { it.type == "income" }.sumOf { it.amount }
    val today = LocalDate.now()
    val daysLeft = if (month == today.toString().take(7)) {
        today.lengthOfMonth() - today.dayOfMonth
    } else 0
    return MoneyMonth(
        month = month,
        transactions = list.sortedByDescending { it.date },
        spent = spent,
        income = income,
        net = income - spent,
        budget = money.budget,
        budgetPct = ZoneMoney.pct(spent, money.budget),
        remaining = money.budget - spent,
        daysLeft = daysLeft,
        expenseCount = list.count { it.type == "expense" },
        incomeCount = list.count { it.type == "income" }
    )
}

fun categoryTotals(transactions: List<MoneyTxn>): List<CategoryTotal> {
    val expenses = transactions.filter { it.type == "expense" && it.amount > 0 }
    val total = expenses.sumOf { it.amount }
    return expenses.groupBy { it.category.ifBlank { "Other" } }
        .map { (name, rows) ->
            val amount = rows.sumOf { it.amount }
            CategoryTotal(name, amount, if (total <= 0) 0 else ((amount / total) * 100).roundInt())
        }
        .sortedByDescending { it.amount }
}

fun monthsBack(count: Int = 6): List<String> {
    val today = LocalDate.now().withDayOfMonth(1)
    return (count - 1 downTo 0).map { offset ->
        val date = today.minusMonths(offset.toLong())
        "${date.year}-${date.monthValue.toString().padStart(2, '0')}"
    }
}

/* ================================ Passbook ================================ */

data class AccountBalance(
    val account: Account,
    val balance: Double = 0.0,
    val inMonth: Double = 0.0,
    val outMonth: Double = 0.0,
    val netMonth: Double = 0.0,
    val entries: Int = 0
)

fun accountBalance(account: Account, transactions: List<PassbookTxn>, month: String? = null): AccountBalance {
    var balance = account.opening
    var income = 0.0
    var out = 0.0
    var entries = 0
    transactions.filter { it.accountId == account.id }.forEach { txn ->
        val delta = if (txn.type == "deposit") txn.amount else -txn.amount
        balance += delta
        if (month == null || txn.date.startsWith(month)) {
            if (txn.type == "deposit") income += txn.amount else out += txn.amount
            entries += 1
        }
    }
    return AccountBalance(account, balance, income, out, income - out, entries)
}

fun passbookTotal(book: PassbookData): Double =
    book.accounts.sumOf { accountBalance(it, book.transactions).balance }

fun passbookMonthTotals(book: PassbookData, month: String): Pair<Double, Double> {
    var income = 0.0
    var out = 0.0
    book.transactions.filter { it.date.startsWith(month) }.forEach {
        if (it.type == "deposit") income += it.amount else out += it.amount
    }
    return income to out
}

fun passbookBalanceSeries(book: PassbookData, months: Int = 6): List<Pair<String, Double>> {
    val keys = monthsBack(months)
    return keys.map { key ->
        val end = LocalDate.parse("$key-01").plusMonths(1).minusDays(1).toString()
        val total = book.accounts.sumOf { account ->
            account.opening + book.transactions
                .filter { it.accountId == account.id && it.date <= end }
                .sumOf { if (it.type == "deposit") it.amount else -it.amount }
        }
        key to total
    }
}

/* ================================ Split ================================ */

data class SplitShare(
    val memberId: String,
    val name: String,
    val paid: Double = 0.0,
    val share: Double = 0.0,
    val net: Double = 0.0
)

data class SplitTransfer(
    val fromId: String,
    val fromName: String,
    val toId: String,
    val toName: String,
    val amount: Double
)

data class SplitSummary(
    val group: SplitGroup,
    val total: Double = 0.0,
    val yourNet: Double? = null,
    val shares: List<SplitShare> = emptyList(),
    val transfers: List<SplitTransfer> = emptyList(),
    val entries: Int = 0
)

fun splitSummary(group: SplitGroup): SplitSummary {
    val paid = group.members.associate { it.id to 0.0 }.toMutableMap()
    val share = group.members.associate { it.id to 0.0 }.toMutableMap()
    var total = 0.0
    group.expenses.forEach { expense ->
        paid[expense.paidBy] = (paid[expense.paidBy] ?: 0.0) + expense.amount
        total += expense.amount
        val members = expense.sharedWith.ifEmpty { group.members.map { it.id } }.filter { group.members.any { m -> m.id == it } }
        if (members.isEmpty()) return@forEach
        val each = expense.amount / members.size
        members.forEach { share[it] = (share[it] ?: 0.0) + each }
    }
    val shares = group.members.map { member ->
        val paidAmount = paid[member.id] ?: 0.0
        val shareAmount = share[member.id] ?: 0.0
        SplitShare(member.id, member.name, paidAmount, shareAmount, paidAmount - shareAmount)
    }.sortedByDescending { it.net }
    val transfers = transfersFor(shares)
    val you = shares.firstOrNull { it.name.trim().equals("you", ignoreCase = true) }
    return SplitSummary(group, total, you?.net, shares, transfers, group.expenses.size)
}

private fun transfersFor(shares: List<SplitShare>): List<SplitTransfer> {
    val debtors = shares.filter { it.net < -0.005 }
        .map { it.memberId to -it.net }
        .toMutableList()
    val creditors = shares.filter { it.net > 0.005 }
        .map { it.memberId to it.net }
        .toMutableList()
    val result = mutableListOf<SplitTransfer>()
    var i = 0
    var j = 0
    while (i < debtors.size && j < creditors.size) {
        val amount = minOf(debtors[i].second, creditors[j].second)
        if (amount > 0.005) {
            val from = shares.first { it.memberId == debtors[i].first }
            val to = shares.first { it.memberId == creditors[j].first }
            result += SplitTransfer(from.memberId, from.name, to.memberId, to.name, amount)
        }
        debtors[i] = debtors[i].first to (debtors[i].second - amount)
        creditors[j] = creditors[j].first to (creditors[j].second - amount)
        if (debtors[i].second < 0.005) i += 1
        if (creditors[j].second < 0.005) j += 1
    }
    return result
}

fun splitOverall(groups: List<SplitGroup>): Pair<Double, Int> {
    var net = 0.0
    var hasYou = 0
    groups.forEach { group ->
        splitSummary(group).yourNet?.let {
            net += it
            hasYou += 1
        }
    }
    return net to hasYou
}

fun splitYourShare(group: SplitGroup): Double? = splitSummary(group).yourNet

/* ================================ Mileage ================================ */

data class TripMetrics(
    val distance: Double = 0.0,
    val litres: Double = 0.0,
    val paid: Double = 0.0,
    val price: Double = 0.0,
    val mileage: Double = 0.0,
    val costPerKm: Double = 0.0,
    val valid: Boolean = false
)

fun tripMetrics(trip: Trip): TripMetrics {
    val distance = (trip.end - trip.start).coerceAtLeast(0.0)
    val litres = if (trip.price > 0) trip.paid / trip.price else 0.0
    val mileage = if (litres > 0 && distance > 0) distance / litres else 0.0
    val costPerKm = if (distance > 0) trip.paid / distance else 0.0
    return TripMetrics(
        distance = distance,
        litres = litres,
        paid = trip.paid,
        price = trip.price,
        mileage = mileage,
        costPerKm = costPerKm,
        valid = distance > 0 && trip.price > 0 && trip.paid > 0 && mileage > 0
    )
}

data class FleetStats(
    val fills: Int = 0,
    val distance: Double = 0.0,
    val litres: Double = 0.0,
    val paid: Double = 0.0,
    val average: Double = 0.0,
    val best: Double = 0.0,
    val costPerKm: Double = 0.0
)

fun fleetStats(trips: List<Trip>): FleetStats {
    var distance = 0.0
    var litres = 0.0
    var paid = 0.0
    var best = 0.0
    trips.forEach { trip ->
        val m = tripMetrics(trip)
        if (m.valid) {
            distance += m.distance
            litres += m.litres
            paid += m.paid
            if (m.mileage > best) best = m.mileage
        }
    }
    return FleetStats(
        fills = trips.size,
        distance = distance,
        litres = litres,
        paid = paid,
        average = if (litres > 0) distance / litres else 0.0,
        best = best,
        costPerKm = if (distance > 0) paid / distance else 0.0
    )
}

data class VehicleStats(
    val name: String,
    val fills: Int = 0,
    val distance: Double = 0.0,
    val litres: Double = 0.0,
    val paid: Double = 0.0,
    val average: Double = 0.0,
    val best: Double = 0.0
)

fun vehicleStats(trips: List<Trip>): List<VehicleStats> =
    trips.groupBy { it.vehicle.trim().ifBlank { "Unnamed vehicle" } }
        .map { (name, rows) ->
            val fleet = fleetStats(rows)
            VehicleStats(name, rows.size, fleet.distance, fleet.litres, fleet.paid, fleet.average, fleet.best)
        }
        .sortedByDescending { it.fills }

fun latestFill(trips: List<Trip>): Trip? = trips.maxByOrNull { it.date + it.id }

/* ================================ Watchlist ================================ */

data class WatchStats(
    val total: Int = 0,
    val watching: Int = 0,
    val queued: Int = 0,
    val watched: Int = 0,
    val dropped: Int = 0,
    val pctWatched: Int = 0
)

fun watchStats(titles: List<WatchItem>): WatchStats {
    val watched = titles.count { it.status == "Watched" }
    return WatchStats(
        total = titles.size,
        watching = titles.count { it.status == "Watching" },
        queued = titles.count { it.status == "Queued" },
        watched = watched,
        dropped = titles.count { it.status == "Dropped" },
        pctWatched = if (titles.isEmpty()) 0 else ((watched.toDouble() / titles.size) * 100).roundInt()
    )
}

data class NextEpisode(val season: Int, val episode: Int, val label: String, val remaining: Int)

fun nextEpisode(item: WatchItem): NextEpisode? {
    if (item.type == "Series" && item.seasons.isNotEmpty()) {
        item.seasons.sortedBy { it.number }.forEach { season ->
            if (season.watched < season.episodes) {
                return NextEpisode(
                    season = season.number,
                    episode = season.watched + 1,
                    label = "S${season.number.toString().padStart(2, '0')}E${(season.watched + 1).toString().padStart(2, '0')}",
                    remaining = season.episodes - season.watched
                )
            }
        }
        return null
    }
    if (item.total > 0 && item.watched < item.total) {
        return NextEpisode(1, item.watched + 1, "E${item.watched + 1}", item.total - item.watched)
    }
    return null
}

fun watchProgress(item: WatchItem): Int {
    if (item.type == "Series" && item.seasons.isNotEmpty()) {
        val total = item.seasons.sumOf { it.episodes }
        val watched = item.seasons.sumOf { it.watched.coerceAtMost(it.episodes) }
        return if (total <= 0) 0 else ((watched.toDouble() / total) * 100).roundInt()
    }
    return if (item.total <= 0) {
        if (item.status == "Watched") 100 else 0
    } else ((item.watched.toDouble() / item.total) * 100).roundInt().coerceIn(0, 100)
}

fun seasonTotals(seasons: List<Season>): Pair<Int, Int> =
    seasons.sumOf { it.episodes } to seasons.sumOf { it.watched.coerceAtMost(it.episodes) }

fun watchPick(titles: List<WatchItem>): WatchItem? {
    val pool = titles.filter { it.status == "Watching" || it.status == "Queued" }
    return (pool.ifEmpty { titles }).sortedByDescending { it.rating }.firstOrNull()
}

/* ================================ Subscriptions ================================ */

data class SubscriptionSummary(
    val monthly: Double = 0.0,
    val annual: Double = 0.0,
    val active: Int = 0,
    val paused: Int = 0,
    val next: Subscription? = null,
    val thisWeek: List<Subscription> = emptyList(),
    val byCategory: List<Pair<String, Double>> = emptyList()
)

fun monthlyOf(sub: Subscription): Double = when (sub.cycle) {
    "Yearly" -> sub.amount / 12.0
    "Weekly" -> sub.amount * 52.0 / 12.0
    else -> sub.amount
}

fun subscriptionSummary(subs: List<Subscription>): SubscriptionSummary {
    val active = subs.filter { it.status != "Paused" }
    val monthly = active.sumOf { monthlyOf(it) }
    val next = active.sortedBy { it.next.ifBlank { "9999-12-31" } }.firstOrNull()
    val week = active.filter {
        val days = ZoneDates.daysUntil(it.next)
        days != null && days in 0..7
    }.sortedBy { it.next }
    val byCategory = active.groupBy { it.category.ifBlank { "Other" } }
        .map { (name, rows) -> name to rows.sumOf { monthlyOf(it) } }
        .sortedByDescending { it.second }
    return SubscriptionSummary(
        monthly = monthly,
        annual = monthly * 12,
        active = active.size,
        paused = subs.size - active.size,
        next = next,
        thisWeek = week,
        byCategory = byCategory
    )
}

/* ================================ Links ================================ */

data class LinkStats(
    val total: Int = 0,
    val favorites: Int = 0,
    val tags: List<Pair<String, Int>> = emptyList(),
    val domains: List<Pair<String, Int>> = emptyList()
)

fun linkStats(links: List<ZoneLink>): LinkStats {
    val tags = mutableMapOf<String, Int>()
    val domains = mutableMapOf<String, Int>()
    links.forEach { link ->
        link.tags.filter { it.isNotBlank() }.forEach { tags[it] = (tags[it] ?: 0) + 1 }
        val domain = ZoneMoney.domainOf(link.url)
        if (domain.isNotBlank()) domains[domain] = (domains[domain] ?: 0) + 1
    }
    return LinkStats(
        total = links.size,
        favorites = links.count { it.favorite },
        tags = tags.entries.sortedByDescending { it.value }.map { it.key to it.value },
        domains = domains.entries.sortedByDescending { it.value }.map { it.key to it.value }
    )
}

/* ================================ Small helpers ================================ */

fun Double.roundInt(): Int = kotlin.math.round(this).toInt()

fun moneyish(value: Double): Boolean = abs(value - value.toLong()) > 0.004
