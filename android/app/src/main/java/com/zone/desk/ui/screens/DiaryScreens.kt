package com.zone.desk.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.DiaryEntry
import com.zone.desk.domain.DiaryStats
import com.zone.desk.domain.diaryStats
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneAreaField
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneChip
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDateField
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZoneSegmented
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTagRow
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneMoney
import java.time.LocalDate
import kotlin.math.abs

private val moods = listOf("Low", "Flat", "Good", "Bright", "Peak")

@Composable
fun moodColor(mood: String): Color {
    val colors = ZoneTheme.colors
    return when (mood.lowercase()) {
        "low" -> colors.muted
        "flat" -> colors.sand.copy(alpha = 0.65f)
        "bright" -> colors.sage
        "peak" -> colors.accent
        else -> colors.inkSoft
    }
}

@Composable
fun DiaryListScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onRead: (String) -> Unit
) {
    val entries by vm.diary.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val stats = diaryStats(entries)
    var search by rememberSaveable { mutableStateOf("") }
    var selectedMood by rememberSaveable { mutableStateOf("All") }

    val filtered = entries.filter { entry ->
        val text = "$search ${entry.title} ${entry.body} ${entry.tags.joinToString(" ")}"
        val matchesSearch = search.isBlank() || text.contains(search, ignoreCase = true)
        val matchesMood = selectedMood == "All" || entry.mood.equals(selectedMood, ignoreCase = true)
        matchesSearch && matchesMood
    }.sortedByDescending { it.date }

    ZoneDetailScaffold(
        title = "Diary",
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
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 28.dp)
        ) {
            item {
                Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp)) {
                    MonoLabel("The journal \u00B7 ${ZoneDates.todayLong()}")
                    Spacer(Modifier.height(12.dp))
                    Text("The journal.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = stats.entries.toString(),
                            label = "Pages filled",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                        )
                        ZoneStat(
                            value = "${stats.streak}d",
                            label = "Day streak",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                        )
                        ZoneStat(
                            value = ZoneMoney.compact(stats.words.toDouble(), settings.currency),
                            label = "Words kept",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                Column(Modifier.padding(horizontal = 20.dp)) {
                    ZoneField(
                        value = search,
                        onValueChange = { search = it },
                        label = "Search",
                        placeholder = "Words, titles, threads\u2026"
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .horizontalScrollable()
                    ) {
                        ZoneChip("All", selected = selectedMood == "All", onClick = { selectedMood = "All" })
                        Spacer(Modifier.width(6.dp))
                        moods.forEach { mood ->
                            ZoneChip(mood, selected = selectedMood == mood, onClick = { selectedMood = mood })
                            Spacer(Modifier.width(6.dp))
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                DiaryMonthCard(entries)
            }
            if (filtered.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = if (entries.isEmpty()) "The first page is blank." else "Nothing matches.",
                        body = if (entries.isEmpty()) "Write the day as one scene. The rest will follow." else "Try another word or mood.",
                        actionLabel = if (entries.isEmpty()) "Write an entry" else null,
                        onAction = if (entries.isEmpty()) onNew else null
                    )
                }
            } else {
                item { SectionLabel("All entries", trailing = "${filtered.size} total") }
                items(filtered, key = { it.id }) { entry ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clickable { onRead(entry.id) }
                    ) {
                        EntryRow(entry)
                        Rule(Modifier.padding(horizontal = 20.dp))
                    }
                }
            }
            item {
                Spacer(Modifier.height(16.dp))
                ZoneButton("Write an entry", onNew, modifier = Modifier.padding(horizontal = 20.dp))
            }
        }
    }
}

@Composable
private fun Modifier.horizontalScrollable(): Modifier =
    this.horizontalScroll(rememberScrollState())

@Composable
private fun EntryRow(entry: DiaryEntry) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 14.dp)
    ) {
        Column(
            Modifier.width(48.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = ZoneDates.parse(entry.date)?.dayOfMonth?.toString() ?: "\u00B7",
                style = ZoneType.number.copy(fontSize = 24.sp),
                color = ZoneTheme.colors.ink
            )
            MonoLabel(ZoneDates.weekdayShort(entry.date), color = ZoneTheme.colors.muted)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(7.dp)
                        .clip(CircleShape)
                        .background(moodColor(entry.mood))
                )
                Spacer(Modifier.width(6.dp))
                MonoLabel(entry.mood, color = moodColor(entry.mood))
                Spacer(Modifier.width(8.dp))
                MonoLabel(ZoneDates.relativeShort(entry.date))
            }
            Spacer(Modifier.height(5.dp))
            Text(
                text = entry.title.ifBlank { "Untitled page" },
                style = ZoneType.headline.copy(fontSize = 19.sp),
                color = ZoneTheme.colors.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (entry.body.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = entry.body,
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.inkSoft,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
            if (entry.tags.isNotEmpty()) {
                Spacer(Modifier.height(6.dp))
                Text(
                    text = entry.tags.joinToString("  ") { "#$it" },
                    style = ZoneType.monoSmall,
                    color = ZoneTheme.colors.muted,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
private fun DiaryMonthCard(entries: List<DiaryEntry>) {
    val month = ZoneDates.currentMonth()
    val dates = ZoneDates.monthDates(month)
    val byDate = entries.filter { it.date.startsWith(month) }.associateBy { it.date }
    val offset = ZoneDates.firstDayOffset(month)
    val cells: List<LocalDate?> = List(offset) { null } + dates
    val rows = cells.chunked(7)
    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            MonoLabel("The month, in colour", color = ZoneTheme.colors.inkSoft)
            Spacer(Modifier.weight(1f))
            MonoLabel(ZoneDates.monthLabel(month, false))
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth()) {
            listOf("M", "T", "W", "T", "F", "S", "S").forEach { day ->
                Text(
                    day,
                    style = ZoneType.monoSmall.copy(fontSize = 8.sp),
                    color = ZoneTheme.colors.muted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f)
                )
            }
        }
        Spacer(Modifier.height(5.dp))
        rows.forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                week.forEach { date ->
                    Box(
                        Modifier
                            .weight(1f)
                            .height(32.dp)
                            .padding(2.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        if (date != null) {
                            val entry = byDate[date.toString()]
                            val background = if (entry != null) moodColor(entry.mood).copy(alpha = 0.30f) else Color.Transparent
                            val border = if (date.toString() == ZoneDates.today()) ZoneTheme.colors.accent else ZoneTheme.colors.line
                            Box(
                                Modifier
                                    .size(27.dp)
                                    .clip(CircleShape)
                                    .background(background)
                                    .border(if (entry != null) 0.dp else 1.dp, if (entry != null) Color.Transparent else border, CircleShape)
                                    .then(if (entry == null && date.toString() == ZoneDates.today()) Modifier.border(1.dp, border, CircleShape) else Modifier),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    date.dayOfMonth.toString(),
                                    style = ZoneType.monoSmall.copy(fontSize = 8.sp),
                                    color = if (entry != null) ZoneTheme.colors.ink else ZoneTheme.colors.muted
                                )
                            }
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier
                .fillMaxWidth()
                .horizontalScrollable(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            moods.forEach { mood ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(moodColor(mood))
                    )
                    Spacer(Modifier.width(4.dp))
                    MonoLabel(mood, color = ZoneTheme.colors.muted)
                }
            }
        }
    }
}

@Composable
fun DiaryEditorScreen(
    vm: ZoneViewModel,
    entryId: String?,
    onBack: () -> Unit
) {
    val entries by vm.diary.collectAsStateWithLifecycle()
    val entry = remember(entries, entryId) { entries.firstOrNull { it.id == entryId } }
    val editing = entryId != null
    var hydrated by rememberSaveable(entryId) { mutableStateOf(!editing) }
    var date by rememberSaveable(entryId) { mutableStateOf(entry?.date ?: ZoneDates.today()) }
    var mood by rememberSaveable(entryId) { mutableStateOf(entry?.mood ?: "good") }
    var title by rememberSaveable(entryId) { mutableStateOf(entry?.title ?: "") }
    var body by rememberSaveable(entryId) { mutableStateOf(entry?.body ?: "") }
    var tags by rememberSaveable(entryId) { mutableStateOf(entry?.tags?.joinToString(", ") ?: "") }

    LaunchedEffect(entry) {
        if (!hydrated && entry != null) {
            date = entry.date
            mood = entry.mood
            title = entry.title
            body = entry.body
            tags = entry.tags.joinToString(", ")
            hydrated = true
        }
    }

    val words = ZoneMoney.words(body)
    val minutes = ZoneMoney.readingMinutes(body)

    ZoneEditorScaffold(
        title = if (editing) "Edit entry" else "New entry",
        onCancel = onBack,
        onSave = {
            vm.saveDiary(
                DiaryEntry(
                    id = entry?.id.orEmpty(),
                    date = date,
                    mood = mood,
                    title = title,
                    body = body,
                    tags = tags.split(",").map { it.trim() }.filter { it.isNotBlank() }
                )
            )
            onBack()
        },
        saveEnabled = title.isNotBlank() || body.isNotBlank()
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp, top = 8.dp)
        ) {
            item {
                MonoLabel("The day")
                Spacer(Modifier.height(6.dp))
                Text(
                    ZoneDates.longDate(date),
                    style = ZoneType.headline,
                    color = ZoneTheme.colors.ink
                )
                Spacer(Modifier.height(16.dp))
                ZoneDateField(date, { date = it.ifBlank { ZoneDates.today() } }, "Date")
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                MonoLabel("The weather")
                Spacer(Modifier.height(7.dp))
                ZoneSegmented(moods, mood.replaceFirstChar { it.uppercase() }, onSelect = { picked ->
                    mood = picked.lowercase()
                })
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneField(title, { title = it }, "Title", placeholder = "Give the day a name")
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneAreaField(
                    body,
                    { body = it },
                    "Entry",
                    minLines = 10,
                    supporting = "$words words \u00B7 $minutes min read"
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneField(
                    tags,
                    { tags = it },
                    "Threads",
                    placeholder = "work, reading, mornings",
                    supporting = "Comma-separated. Hash marks are added for you."
                )
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneCard(padding = PaddingValues(14.dp)) {
                    MonoLabel("A place to start", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Write the day as one scene. Where are you standing? What is the light doing? What stayed with you?",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton(
                    if (editing) "Save entry" else "Write entry",
                    onClick = {
                        vm.saveDiary(
                            DiaryEntry(
                                id = entry?.id.orEmpty(),
                                date = date,
                                mood = mood,
                                title = title,
                                body = body,
                                tags = tags.split(",").map { it.trim() }.filter { it.isNotBlank() }
                            )
                        )
                        onBack()
                    },
                    enabled = title.isNotBlank() || body.isNotBlank()
                )
            }
        }
    }
}

@Composable
fun DiaryReaderScreen(
    vm: ZoneViewModel,
    entryId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit
) {
    val entries by vm.diary.collectAsStateWithLifecycle()
    val entry = entries.firstOrNull { it.id == entryId }
    var confirmDelete by remember { mutableStateOf(false) }
    val sorted = entries.sortedByDescending { it.date }
    val index = sorted.indexOfFirst { it.id == entryId }

    if (entry == null) {
        ZoneDetailScaffold(title = "Diary", onBack = onBack) {
            ZoneEmptyState("That page is gone.", "It may have been deleted on another device.")
        }
        return
    }

    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Delete this entry?",
            body = "The words will be removed from your workspace and D1.",
            onConfirm = {
                confirmDelete = false
                vm.deleteDiary(entry.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    ZoneDetailScaffold(
        title = "The day",
        onBack = onBack,
        actions = {
            IconButton(onClick = { onEdit(entry.id) }) {
                Icon(Icons.Outlined.Edit, contentDescription = "Edit entry", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(19.dp))
            }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Outlined.Delete, contentDescription = "Delete entry", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(19.dp))
            }
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 22.dp, end = 22.dp, top = 6.dp, bottom = 34.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(moodColor(entry.mood))
                    )
                    Spacer(Modifier.width(7.dp))
                    MonoLabel(entry.mood, color = moodColor(entry.mood))
                    Spacer(Modifier.width(10.dp))
                    MonoLabel(ZoneDates.shortDate(entry.date).uppercase())
                    Spacer(Modifier.weight(1f))
                    if (index >= 0) MonoLabel("${index + 1} of ${sorted.size}")
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    text = entry.title.ifBlank { "Untitled page" },
                    style = ZoneType.displaySmall,
                    color = ZoneTheme.colors.ink
                )
                Spacer(Modifier.height(10.dp))
                MonoLabel(ZoneDates.longDate(entry.date))
                Spacer(Modifier.height(20.dp))
                Rule()
                Spacer(Modifier.height(20.dp))
                Text(
                    text = entry.body,
                    style = ZoneType.serifBody,
                    color = ZoneTheme.colors.ink
                )
                if (entry.tags.isNotEmpty()) {
                    Spacer(Modifier.height(20.dp))
                    Text(
                        text = entry.tags.joinToString("  ") { "#$it" },
                        style = ZoneType.monoSmall,
                        color = ZoneTheme.colors.muted
                    )
                }
                Spacer(Modifier.height(24.dp))
                Rule()
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MonoLabel("${ZoneMoney.words(entry.body)} words")
                    Spacer(Modifier.width(12.dp))
                    MonoLabel("${ZoneMoney.readingMinutes(entry.body)} min read")
                    Spacer(Modifier.weight(1f))
                    MonoLabel(ZoneDates.relative(entry.date))
                }
                Spacer(Modifier.height(22.dp))
                ZoneButton("Edit entry", { onEdit(entry.id) })
                Spacer(Modifier.height(10.dp))
                Text(
                    "Delete this entry",
                    style = ZoneType.monoSmall,
                    color = ZoneTheme.colors.accent,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { confirmDelete = true }
                        .padding(10.dp)
                )
            }
        }
    }
}
