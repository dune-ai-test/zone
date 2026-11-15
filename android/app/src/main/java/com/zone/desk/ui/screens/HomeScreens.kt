package com.zone.desk.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.Keys
import com.zone.desk.domain.allListProgress
import com.zone.desk.domain.diaryStats
import com.zone.desk.domain.checkedToday
import com.zone.desk.domain.fleetStats
import com.zone.desk.domain.habitStats
import com.zone.desk.domain.habitWeekPulse
import com.zone.desk.domain.monthSummary
import com.zone.desk.domain.openListRows
import com.zone.desk.domain.passbookTotal
import com.zone.desk.domain.splitOverall
import com.zone.desk.domain.subscriptionSummary
import com.zone.desk.domain.watchStats
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.CheckCircle
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneBars
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneGhostButton
import com.zone.desk.ui.components.ZoneNavRow
import com.zone.desk.ui.components.ZoneProgress
import com.zone.desk.ui.components.ZoneRootHeader
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTabScaffold
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneMoney

@Composable
fun HomeScreen(
    vm: ZoneViewModel,
    onSelectTab: (String) -> Unit,
    onOpen: (String) -> Unit
) {
    val diary by vm.diary.collectAsStateWithLifecycle()
    val lists by vm.lists.collectAsStateWithLifecycle()
    val habits by vm.habits.collectAsStateWithLifecycle()
    val notes by vm.notes.collectAsStateWithLifecycle()
    val money by vm.money.collectAsStateWithLifecycle()
    val passbook by vm.passbook.collectAsStateWithLifecycle()
    val split by vm.split.collectAsStateWithLifecycle()
    val trips by vm.trips.collectAsStateWithLifecycle()
    val watchlist by vm.watchlist.collectAsStateWithLifecycle()
    val links by vm.links.collectAsStateWithLifecycle()
    val subscriptions by vm.subscriptions.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val sync by vm.syncState.collectAsStateWithLifecycle()
    val pending by vm.pendingAudit.collectAsStateWithLifecycle()

    val diaryMeta = diaryStats(diary)
    val progress = allListProgress(lists)
    val habitsToday = checkedToday(habits)
    val month = monthSummary(money, ZoneDates.currentMonth())
    val fleet = fleetStats(trips)
    val watch = watchStats(watchlist)
    val subs = subscriptionSummary(subscriptions)
    val splitNet = splitOverall(split.groups)
    val currency = settings.currency
    val allHabitsChecked = habitsToday == habits.habits.size && habits.habits.isNotEmpty()

    ZoneTabScaffold(current = Routes.HOME, onSelectTab = onSelectTab) { inner ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner),
            contentPadding = PaddingValues(bottom = 30.dp)
        ) {
            item {
                ZoneRootHeader(
                    eyebrow = "Personal utilities",
                    title = ZoneDates.greeting(),
                    subtitle = "A quiet desk tonight \u2014 ${progress.open} open items, $habitsToday of ${habits.habits.size} habits, and ${sync.message.lowercase()}."
                )
            }
            item {
                Row(Modifier.padding(horizontal = 20.dp)) {
                    ZoneCard(Modifier.weight(1f).padding(end = 6.dp), padding = PaddingValues(14.dp)) {
                        ZoneStat(
                            value = progress.open.toString(),
                            label = "Open items",
                            note = "${progress.done} done across ${lists.size} lists",
                            valueStyle = ZoneType.number.copy(fontSize = 27.sp)
                        )
                    }
                    ZoneCard(Modifier.weight(1f).padding(start = 6.dp), padding = PaddingValues(14.dp)) {
                        ZoneStat(
                            value = "$habitsToday/${habits.habits.size}",
                            label = "Habits today",
                            note = if (allHabitsChecked) "Every small thing kept" else "${habits.habits.size - habitsToday} still open",
                            valueStyle = ZoneType.number.copy(fontSize = 27.sp),
                            accent = allHabitsChecked
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
            item {
                Row(Modifier.padding(horizontal = 20.dp)) {
                    ZoneCard(Modifier.weight(1f).padding(end = 6.dp), padding = PaddingValues(14.dp)) {
                        ZoneStat(
                            value = ZoneMoney.compact(month.spent, currency),
                            label = "Spent this month",
                            note = "${month.expenseCount} entries \u00B7 ${month.budgetPct}% of budget",
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                    }
                    ZoneCard(Modifier.weight(1f).padding(start = 6.dp), padding = PaddingValues(14.dp)) {
                        ZoneStat(
                            value = "${diaryMeta.streak}d",
                            label = "Diary streak",
                            note = "${diaryMeta.entries} pages \u00B7 ${ZoneMoney.compact(diaryMeta.words.toDouble(), currency)} words",
                            valueStyle = ZoneType.number.copy(fontSize = 27.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            if (pending > 0) {
                item {
                    ZoneCard(
                        modifier = Modifier.padding(horizontal = 20.dp),
                        onClick = { onOpen(Routes.ADMIN) }
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(ZoneTheme.colors.accentSoft)
                                    .padding(horizontal = 9.dp, vertical = 5.dp)
                            ) {
                                MonoLabel("$pending waiting", color = ZoneTheme.colors.accent)
                            }
                            Spacer(Modifier.weight(1f))
                            MonoLabel("Review the queue", color = ZoneTheme.colors.inkSoft)
                        }
                        Spacer(Modifier.height(9.dp))
                        Text(
                            "Every change has a receipt.",
                            style = ZoneType.headline.copy(fontSize = 18.sp),
                            color = ZoneTheme.colors.ink
                        )
                    }
                }
                item { Spacer(Modifier.height(8.dp)) }
            }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel("From the desk \u00B7 today", color = ZoneTheme.colors.accent)
                        Spacer(Modifier.weight(1f))
                        MonoLabel(ZoneDates.shortDate(ZoneDates.today()))
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = "\u201CWhat did you notice today that you would otherwise forget?\u201D",
                        style = ZoneType.headline.copy(fontSize = 21.sp, lineHeight = 26.sp),
                        color = ZoneTheme.colors.ink
                    )
                    Spacer(Modifier.height(14.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ZoneGhostButton("Write an entry", { onOpen(Routes.DIARY_NEW) })
                        Spacer(Modifier.weight(1f))
                        Text(
                            "Another \u2192 Diary",
                            style = ZoneType.monoSmall,
                            color = ZoneTheme.colors.accent,
                            modifier = Modifier
                                .clickable { onOpen(Routes.DIARY) }
                                .padding(6.dp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                SectionLabel("The full desk", trailing = "12 tools")
            }
            item {
                ZoneCard(
                    modifier = Modifier.padding(horizontal = 20.dp),
                    padding = PaddingValues(0.dp)
                ) {
                    val tools = listOf(
                        ToolRow("01", "Diary", "${diaryMeta.entries} entries \u00B7 streak ${diaryMeta.streak}", Routes.DIARY),
                        ToolRow("02", "Money", "${ZoneDates.monthLabel(ZoneDates.currentMonth(), false)} spent ${ZoneMoney.compact(month.spent, currency)}", Routes.MONEY),
                        ToolRow("03", "Lists", "${progress.open} open \u00B7 ${progress.done} done", Routes.LISTS),
                        ToolRow("04", "Habits", "$habitsToday of ${habits.habits.size} checked today", Routes.HABITS),
                        ToolRow("05", "Notes", "${notes.size} notes \u00B7 ${notes.count { it.pinned }} pinned", Routes.NOTES),
                        ToolRow("06", "Passbook", "${passbook.accounts.size} accounts \u00B7 ${ZoneMoney.compact(passbookTotal(passbook), currency)}", Routes.PASSBOOK),
                        ToolRow("07", "Split", "${ZoneMoney.compact(kotlin.math.abs(splitNet.first), currency)} ${if (splitNet.first >= 0) "to collect" else "to settle"} \u00B7 ${split.groups.size} tables", Routes.SPLIT),
                        ToolRow("08", "Mileage", "${if (fleet.average > 0) String.format(java.util.Locale.US, "%.1f", fleet.average) else "\u2014"} km/L fleet avg", Routes.MILEAGE),
                        ToolRow("09", "Watchlist", "${watch.watching} watching \u00B7 ${watch.queued} queued", Routes.WATCHLIST),
                        ToolRow("10", "Links", "${links.size} saved corners", Routes.LINKS),
                        ToolRow("11", "Subscriptions", "${ZoneMoney.compact(subs.monthly, currency)} /mo burn", Routes.SUBSCRIPTIONS),
                        ToolRow("12", "Admin", if (pending == 0) "Nothing waiting" else "$pending awaiting review", Routes.ADMIN)
                    )
                    tools.forEachIndexed { index, tool ->
                        if (index > 0) Rule()
                        ZoneNavRow(
                            title = tool.title,
                            meta = tool.meta,
                            index = tool.index,
                            onClick = { onOpen(tool.route) }
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        MonoLabel("Workspace", color = ZoneTheme.colors.inkSoft)
                        Text(
                            text = sync.message,
                            style = ZoneType.bodySmall,
                            color = ZoneTheme.colors.inkSoft,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "D1 \u00B7 local first",
                        style = ZoneType.monoSmall,
                        color = ZoneTheme.colors.muted
                    )
                }
            }
        }
    }
}

private data class ToolRow(val index: String, val title: String, val meta: String, val route: String)

@Composable
fun PersonalScreen(
    vm: ZoneViewModel,
    onSelectTab: (String) -> Unit,
    onOpen: (String) -> Unit
) {
    val diary by vm.diary.collectAsStateWithLifecycle()
    val lists by vm.lists.collectAsStateWithLifecycle()
    val habits by vm.habits.collectAsStateWithLifecycle()
    val notes by vm.notes.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()

    val diaryMeta = diaryStats(diary)
    val progress = allListProgress(lists)
    val habitsToday = checkedToday(habits)
    val pulse = habitWeekPulse(habits.habits, 8)
    val pulseLabels = (7 downTo 0).map { ZoneDates.weekLabel(-it) }
    val openRows = openListRows(lists).take(5)
    val week = ZoneDates.weekDates()
    val weekDone = habits.habits.sumOf { habit -> week.count { habit.checks[it] == true } }
    val weekTarget = habits.habits.sumOf { it.target.coerceIn(1, 7) }
    val weekPct = if (weekTarget <= 0) 0 else ((weekDone.toDouble() / weekTarget) * 100).toInt()
    val bestHabit = habits.habits.maxByOrNull { habitStats(it).streak }

    val todaySummary = buildString {
        append("${progress.open} open items")
        if (habits.habits.isNotEmpty()) append(", $habitsToday of ${habits.habits.size} habits")
        if (bestHabit != null) append(", and ${bestHabit.name.lowercase()} is your anchor")
        append(".")
    }

    ZoneTabScaffold(current = Routes.PERSONAL, onSelectTab = onSelectTab) { inner ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner),
            contentPadding = PaddingValues(bottom = 30.dp)
        ) {
            item {
                ZoneRootHeader(
                    eyebrow = "Personal \u00B7 today",
                    title = "Today.",
                    subtitle = ZoneDates.longDate(ZoneDates.today()) + ". " + todaySummary
                )
            }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        ZoneStat(
                            value = "$habitsToday/${habits.habits.size}",
                            label = "Habits today",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp),
                            accent = habitsToday == habits.habits.size && habits.habits.isNotEmpty()
                        )
                        ZoneStat(
                            value = "${bestHabit?.let { habitStats(it).streak } ?: 0}d",
                            label = "Anchor streak",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = progress.open.toString(),
                            label = "Open items",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                    }
                    Spacer(Modifier.height(14.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel("This week", color = ZoneTheme.colors.inkSoft)
                        Spacer(Modifier.weight(1f))
                        MonoLabel("$weekPct%", color = ZoneTheme.colors.accent)
                    }
                    Spacer(Modifier.height(6.dp))
                    ZoneProgress(weekPct / 100f)
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    MonoLabel("From the desk \u00B7 today", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "\u201CWhat did you notice today that you would otherwise forget?\u201D",
                        style = ZoneType.headline.copy(fontSize = 20.sp, lineHeight = 25.sp),
                        color = ZoneTheme.colors.ink
                    )
                    Spacer(Modifier.height(13.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ZoneGhostButton("Write an entry", { onOpen(Routes.DIARY_NEW) })
                        Spacer(Modifier.weight(1f))
                        MonoLabel("${diaryMeta.streak}-day streak")
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("The four tools", trailing = "Personal") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                    ZoneNavRow("Diary", "${diaryMeta.entries} entries \u00B7 ${diaryMeta.streak}-day streak", index = "01", onClick = { onOpen(Routes.DIARY) })
                    Rule()
                    ZoneNavRow("Lists", "${progress.open} of ${progress.total} items open \u00B7 ${lists.size} lists", index = "02", onClick = { onOpen(Routes.LISTS) })
                    Rule()
                    ZoneNavRow("Habits", "$habitsToday of ${habits.habits.size} today \u00B7 $weekPct% this week", index = "03", onClick = { onOpen(Routes.HABITS) })
                    Rule()
                    ZoneNavRow("Notes", "${notes.size} notes \u00B7 ${notes.count { it.pinned }} pinned", index = "04", onClick = { onOpen(Routes.NOTES) })
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("8-week pulse", trailing = "$weekPct% this wk") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Text("The longer view.", style = ZoneType.headline.copy(fontSize = 19.sp), color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(12.dp))
                    ZoneBars(values = pulse, labels = pulseLabels)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "Each bar is a week of kept habits, measured against what was still possible. Missing one is not a score.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            if (openRows.isNotEmpty()) {
                item { Spacer(Modifier.height(18.dp)) }
                item { SectionLabel("Open, right now", trailing = "Tap to clear") }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                        openRows.forEachIndexed { index, (list, item) ->
                            if (index > 0) Rule()
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clickable { vm.toggleItem(list.id, item.id) }
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CheckCircle(checked = false, onClick = { vm.toggleItem(list.id, item.id) })
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        item.text,
                                        style = ZoneType.body,
                                        color = ZoneTheme.colors.ink,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    MonoLabel(list.title)
                                }
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(20.dp)) }
            item {
                Text(
                    "Kept quietly in your workspace. ${if (settings.currency.isNotBlank()) "Amounts in ${ZoneMoney.info(settings.currency).label}." else ""}",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}
