package com.zone.desk.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.Habit
import com.zone.desk.domain.HabitStarters
import com.zone.desk.domain.checkedToday
import com.zone.desk.domain.habitStats
import com.zone.desk.domain.habitWeekPulse
import com.zone.desk.domain.isChecked
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneBars
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneChip
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZoneProgress
import com.zone.desk.ui.components.ZoneSegmented
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates

@Composable
fun HabitsScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onOpenHabit: (String) -> Unit
) {
    val data by vm.habits.collectAsStateWithLifecycle()
    val habits = data.habits
    val today = ZoneDates.today()
    val week = ZoneDates.weekDates()
    val checked = checkedToday(data)
    val anchor = habits.maxByOrNull { habitStats(it).streak }
    val fading = habits.minByOrNull { habitStats(it).weekChecked }
    val weekPct = if (habits.isEmpty()) 0 else {
        val done = habits.sumOf { habit -> week.count { habit.checks[it] == true } }
        val target = habits.sumOf { it.target.coerceIn(1, 7) }
        if (target <= 0) 0 else ((done.toDouble() / target) * 100).toInt().coerceAtMost(100)
    }

    ZoneDetailScaffold(
        title = "Habits",
        onBack = onBack,
        actions = {
            Text(
                "New",
                style = ZoneType.mono,
                color = ZoneTheme.colors.accent,
                modifier = Modifier
                    .clickable(onClick = onNew)
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            )
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 30.dp)
        ) {
            item {
                Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp)) {
                    MonoLabel("Today's rhythm")
                    Spacer(Modifier.height(10.dp))
                    Text(
                        if (habits.isEmpty()) "Begin small." else "$checked of ${habits.size} checked.",
                        style = ZoneType.display,
                        color = ZoneTheme.colors.ink
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = when {
                            habits.isEmpty() -> "One small thing, repeated where you can see it."
                            checked == habits.size -> "Every small thing kept. The day has a shape."
                            anchor != null -> "${anchor.name} is your anchor (${habitStats(anchor).streak}-day streak)."
                            else -> "Signals, not scores."
                        },
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = "$checked/${habits.size}",
                            label = "Today",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = "$weekPct%",
                            label = "This week",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = "${anchor?.let { habitStats(it).streak } ?: 0}d",
                            label = "Longest run",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item { SectionLabel("The weekly board", trailing = "Week ${ZoneDates.weekNumber()}") }
            item {
                Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
                    Spacer(Modifier.width(112.dp))
                    week.forEachIndexed { index, date ->
                        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                            MonoLabel(ZoneDates.weekdayLetter(index))
                        }
                    }
                }
                Spacer(Modifier.height(5.dp))
            }
            if (habits.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "No habits yet.",
                        body = "Choose one repetition you can see. A week is a shape you return to, not a scoreboard.",
                        actionLabel = "Choose a habit",
                        onAction = onNew
                    )
                }
            } else {
                items(habits, key = { it.id }) { habit ->
                    HabitBoardRow(
                        habit = habit,
                        week = week,
                        today = today,
                        onOpen = { onOpenHabit(habit.id) },
                        onToggle = { date -> vm.toggleHabit(habit.id, date) }
                    )
                    Rule(Modifier.padding(horizontal = 20.dp))
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
            item {
                Row(
                    Modifier.padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CheckBoxGlyph(checked = true)
                        Spacer(Modifier.width(5.dp))
                        MonoLabel("Checked")
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CheckBoxGlyph(checked = false)
                        Spacer(Modifier.width(5.dp))
                        MonoLabel("Open")
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Signals, not scores") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    if (anchor != null) {
                        SignalLine(
                            label = "Most consistent",
                            title = anchor.name,
                            body = "${habitStats(anchor).streak} days and counting \u2014 your anchor habit."
                        )
                    }
                    if (fading != null && fading.id != anchor?.id) {
                        if (anchor != null) {
                            Spacer(Modifier.height(14.dp))
                            Rule()
                            Spacer(Modifier.height(14.dp))
                        }
                        SignalLine(
                            label = "Fading",
                            title = fading.name,
                            body = "${habitStats(fading).weekChecked} of ${fading.target} this week. Small counts too \u2014 begin again without ceremony."
                        )
                    }
                    if (anchor == null && fading == null) {
                        Text("Add a habit to see the longer view.", style = ZoneType.body, color = ZoneTheme.colors.inkSoft)
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton("Choose a habit", onNew, modifier = Modifier.padding(horizontal = 20.dp))
            }
        }
    }
}

@Composable
private fun CheckBoxGlyph(checked: Boolean) {
    Box(
        Modifier
            .size(13.dp)
            .clip(RoundedCornerShape(4.dp))
            .background(if (checked) ZoneTheme.colors.ink else Color.Transparent)
            .border(1.dp, if (checked) ZoneTheme.colors.ink else ZoneTheme.colors.line, RoundedCornerShape(4.dp)),
        contentAlignment = Alignment.Center
    ) {
        if (checked) {
            Icon(Icons.Outlined.Check, contentDescription = null, tint = ZoneTheme.colors.paper, modifier = Modifier.size(9.dp))
        }
    }
}

@Composable
private fun HabitBoardRow(
    habit: Habit,
    week: List<String>,
    today: String,
    onOpen: () -> Unit,
    onToggle: (String) -> Unit
) {
    val stats = habitStats(habit)
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpen)
            .padding(horizontal = 20.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.width(112.dp)) {
            Text(
                habit.name,
                style = ZoneType.body,
                color = ZoneTheme.colors.ink,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(2.dp))
            MonoLabel(if (stats.streak > 0) "${stats.streak}d streak" else "${stats.weekChecked}/${habit.target} this wk")
        }
        week.forEach { date ->
            Box(
                Modifier
                    .weight(1f)
                    .padding(horizontal = 2.dp),
                contentAlignment = Alignment.Center
            ) {
                val checked = isChecked(habit, date)
                val future = date > today
                Box(
                    Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(if (checked) ZoneTheme.colors.ink else Color.Transparent)
                        .border(
                            1.dp,
                            if (checked) ZoneTheme.colors.ink else if (future) ZoneTheme.colors.line.copy(alpha = 0.4f) else ZoneTheme.colors.line,
                            CircleShape
                        )
                        .clickable(enabled = !future) { onToggle(date) },
                    contentAlignment = Alignment.Center
                ) {
                    if (checked) {
                        Icon(Icons.Outlined.Check, contentDescription = null, tint = ZoneTheme.colors.paper, modifier = Modifier.size(13.dp))
                    } else if (!future) {
                        Box(
                            Modifier
                                .size(5.dp)
                                .clip(CircleShape)
                                .background(ZoneTheme.colors.line)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SignalLine(label: String, title: String, body: String) {
    Row {
        Column(Modifier.weight(1f)) {
            MonoLabel(label, color = ZoneTheme.colors.accent)
            Spacer(Modifier.height(4.dp))
            Text(title, style = ZoneType.headline.copy(fontSize = 18.sp), color = ZoneTheme.colors.ink)
            Spacer(Modifier.height(3.dp))
            Text(body, style = ZoneType.bodySmall, color = ZoneTheme.colors.inkSoft)
        }
    }
}

@Composable
fun HabitNewScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit
) {
    var name by rememberSaveable { mutableStateOf("") }
    var target by rememberSaveable { mutableStateOf(7) }

    ZoneEditorScaffold(
        title = "New habit",
        onCancel = onBack,
        onSave = {
            vm.saveHabit(Habit(name = name, target = target, createdAt = ZoneDates.today()))
            onBack()
        },
        saveEnabled = name.isNotBlank()
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Personal \u00B7 habits", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(9.dp))
                Text("Choose a small repetition.", style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                Spacer(Modifier.height(6.dp))
                Text(
                    "One small thing, repeated where you can see it. A week is a shape you return to, not a scoreboard.",
                    style = ZoneType.body,
                    color = ZoneTheme.colors.inkSoft
                )
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Start with", trailing = "or write your own") }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                        .then(Modifier)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        HabitStarters.all.chunked(2).forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                row.forEach { starter ->
                                    ZoneChip(
                                        starter,
                                        selected = name == starter,
                                        onClick = { name = starter },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneField(name, { name = it }, "The habit", placeholder = "Morning walk")
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                MonoLabel("Days per week")
                Spacer(Modifier.height(7.dp))
                ZoneSegmented(
                    options = (1..7).map { it.toString() },
                    selected = target.toString(),
                    onSelect = { target = it.toIntOrNull() ?: 7 }
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    if (target == 7) "Every day. Extra days still count." else "$target days a week. A check-in for every day; extra days still count.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted
                )
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneCard(padding = PaddingValues(14.dp)) {
                    MonoLabel("A quiet rule", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "A habit appears as a row in every week, past and present. Its history begins today.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton("Add habit", {
                    vm.saveHabit(Habit(name = name, target = target, createdAt = ZoneDates.today()))
                    onBack()
                }, enabled = name.isNotBlank())
            }
        }
    }
}

@Composable
fun HabitDetailScreen(
    vm: ZoneViewModel,
    habitId: String,
    onBack: () -> Unit
) {
    val data by vm.habits.collectAsStateWithLifecycle()
    val habit = data.habits.firstOrNull { it.id == habitId }
    var editOpen by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    if (habit == null) {
        ZoneDetailScaffold(title = "Habit", onBack = onBack) {
            ZoneEmptyState("That habit is gone.", "It may have been removed on another device.")
        }
        return
    }

    val stats = habitStats(habit)
    val week = ZoneDates.weekDates()
    val today = ZoneDates.today()
    val pulse = habitWeekPulse(habit, 8)
    val pulseLabels = (7 downTo 0).map { ZoneDates.weekLabel(-it) }
    val missed = habit.checks.filter { it.value }.keys.filter { it < today }.maxOrNull()

    if (editOpen) {
        HabitEditDialog(
            habit = habit,
            onDismiss = { editOpen = false },
            onSave = {
                vm.saveHabit(it)
                editOpen = false
            }
        )
    }
    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Delete this habit?",
            body = "Its check-ins and history will leave your workspace.",
            onConfirm = {
                confirmDelete = false
                vm.deleteHabit(habit.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    ZoneDetailScaffold(
        title = habit.name,
        onBack = onBack,
        actions = {
            IconButton(onClick = { editOpen = true }) {
                Icon(Icons.Outlined.Edit, contentDescription = "Edit habit", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Outlined.Delete, contentDescription = "Delete habit", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            item {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                    MonoLabel("Personal \u00B7 habit", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(8.dp))
                    Text(habit.name, style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        if (habit.target >= 7) "Every day \u00B7 ${stats.streak} days in a row" else "${habit.target} days a week \u00B7 ${stats.streak} days in a row",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = "${stats.streak}d",
                            label = "Streak",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp),
                            accent = stats.streak > 0
                        )
                        ZoneStat(
                            value = "${stats.longest}d",
                            label = "Best run",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = stats.monthCount.toString(),
                            label = "This month",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel("This week", color = ZoneTheme.colors.inkSoft)
                        Spacer(Modifier.weight(1f))
                        MonoLabel("${stats.weekChecked} of ${habit.target}")
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(Modifier.fillMaxWidth()) {
                        week.forEachIndexed { index, date ->
                            val checked = isChecked(habit, date)
                            val future = date > today
                            Column(
                                Modifier.weight(1f),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                MonoLabel(ZoneDates.weekdayLetter(index))
                                Spacer(Modifier.height(5.dp))
                                Box(
                                    Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(if (checked) ZoneTheme.colors.ink else Color.Transparent)
                                        .border(1.dp, if (checked) ZoneTheme.colors.ink else ZoneTheme.colors.line, CircleShape)
                                        .clickable(enabled = !future) { vm.toggleHabit(habit.id, date) },
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (checked) {
                                        Icon(Icons.Outlined.Check, contentDescription = null, tint = ZoneTheme.colors.paper, modifier = Modifier.size(16.dp))
                                    } else {
                                        Text(
                                            date.takeLast(2),
                                            style = ZoneType.monoSmall.copy(fontSize = 8.sp),
                                            color = if (future) ZoneTheme.colors.line else ZoneTheme.colors.muted
                                        )
                                    }
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    ZoneProgress(stats.weekPct / 100f)
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item { SectionLabel("Eight-week pulse", trailing = "${stats.weekPct}% this wk") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    ZoneBars(values = pulse, labels = pulseLabels)
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item { SectionLabel("Signals, not scores") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    SignalLine(
                        label = "Most consistent",
                        title = if (stats.streak > 0) "Your anchor habit" else "The beginning",
                        body = if (stats.streak > 0) "${stats.streak} days and counting." else "History begins with the first check-in."
                    )
                    Spacer(Modifier.height(12.dp))
                    Rule()
                    Spacer(Modifier.height(12.dp))
                    ZoneInfoLine(
                        "Best week",
                        if (stats.longest > 0) "${minOf(stats.longest, 7)} of 7 checks" else "\u2014"
                    )
                    ZoneInfoLine(
                        "Last missed",
                        missed?.let { ZoneDates.prettyDate(it) } ?: "Never"
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Begin again without ceremony.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.muted
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton(
                    if (stats.checkedToday) "Checked in for today" else "Check in for today",
                    onClick = { vm.toggleHabit(habit.id, today) },
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
            item { Spacer(Modifier.height(8.dp)) }
            item {
                Text(
                    "Delete this habit",
                    style = ZoneType.monoSmall,
                    color = ZoneTheme.colors.accent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { confirmDelete = true }
                        .padding(12.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun ZoneInfoLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        MonoLabel(label, modifier = Modifier.weight(1f))
        Text(value, style = ZoneType.bodySmall, color = ZoneTheme.colors.ink)
    }
}

@Composable
private fun HabitEditDialog(habit: Habit, onDismiss: () -> Unit, onSave: (Habit) -> Unit) {
    var name by rememberSaveable { mutableStateOf(habit.name) }
    var target by rememberSaveable { mutableStateOf(habit.target) }
    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(ZoneTheme.colors.raised)
                .padding(20.dp)
        ) {
            Text("Edit habit", style = ZoneType.headline, color = ZoneTheme.colors.ink)
            Spacer(Modifier.height(14.dp))
            ZoneField(name, { name = it }, "The habit")
            Spacer(Modifier.height(14.dp))
            MonoLabel("Days per week")
            Spacer(Modifier.height(6.dp))
            ZoneSegmented((1..7).map { it.toString() }, target.toString(), onSelect = { target = it.toIntOrNull() ?: 7 })
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Text(
                    "Cancel",
                    style = ZoneType.mono,
                    color = ZoneTheme.colors.inkSoft,
                    modifier = Modifier.clickable(onClick = onDismiss).padding(10.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "Save",
                    style = ZoneType.mono,
                    color = ZoneTheme.colors.accent,
                    modifier = Modifier
                        .clickable(enabled = name.isNotBlank()) {
                            onSave(habit.copy(name = name, target = target))
                        }
                        .padding(10.dp)
                )
            }
        }
    }
}
