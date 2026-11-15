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
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.PushPin
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.Note
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.CheckCircle
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneAreaField
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTagRow
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneMoney

@Composable
fun notePaperColor(color: String): Color = when (color) {
    "sand" -> ZoneTheme.colors.sand.copy(alpha = 0.28f)
    "sage" -> ZoneTheme.colors.sage.copy(alpha = 0.18f)
    "clay" -> ZoneTheme.colors.clay.copy(alpha = 0.18f)
    else -> ZoneTheme.colors.raised
}

@Composable
fun NotesScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onRead: (String) -> Unit
) {
    val notes by vm.notes.collectAsStateWithLifecycle()
    var search by rememberSaveable { mutableStateOf("") }
    val filtered = notes.filter {
        search.isBlank() || "$search ${it.title} ${it.body}".contains(search, ignoreCase = true)
    }
    val pinned = filtered.filter { it.pinned }
    val others = filtered.filterNot { it.pinned }.sortedByDescending { it.updated }
    val words = notes.sumOf { ZoneMoney.words(it.body) }

    ZoneDetailScaffold(
        title = "Notes",
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
                    MonoLabel("The notebook \u00B7 ${ZoneDates.todayLong()}")
                    Spacer(Modifier.height(10.dp))
                    Text("The notebook.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "There are no folders here. Pin what matters; search finds the rest.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = notes.size.toString(),
                            label = "Notes",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = notes.count { it.pinned }.toString(),
                            label = "Pinned",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = ZoneMoney.compact(words.toDouble(), null),
                            label = "Words",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
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
                        placeholder = "Titles and pages\u2026"
                    )
                }
            }
            if (filtered.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = if (notes.isEmpty()) "A blank page, on purpose." else "No note matches.",
                        body = if (notes.isEmpty()) "Keep the thought before it goes. It stays in your workspace." else "Try another word.",
                        actionLabel = if (notes.isEmpty()) "Add a note" else null,
                        onAction = if (notes.isEmpty()) onNew else null
                    )
                }
            }
            if (pinned.isNotEmpty()) {
                item { Spacer(Modifier.height(14.dp)) }
                item { SectionLabel("Pinned", trailing = "${pinned.size}") }
                items(pinned, key = { "pin-${it.id}" }) { note ->
                    NoteCard(note, onClick = { onRead(note.id) })
                    Spacer(Modifier.height(8.dp))
                }
            }
            if (others.isNotEmpty()) {
                item { Spacer(Modifier.height(10.dp)) }
                item { SectionLabel("From the desk", trailing = "${others.size}") }
                items(others, key = { it.id }) { note ->
                    NoteCard(note, onClick = { onRead(note.id) })
                    Spacer(Modifier.height(8.dp))
                }
            }
            item {
                Spacer(Modifier.height(14.dp))
                ZoneButton("Add a note", onNew, modifier = Modifier.padding(horizontal = 20.dp))
            }
            item { Spacer(Modifier.height(10.dp)) }
            item {
                Text(
                    "Notes stay in your workspace, quietly.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}

@Composable
private fun NoteCard(note: Note, onClick: () -> Unit) {
    val shape = RoundedCornerShape(13.dp)
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .clip(shape)
            .background(notePaperColor(note.color))
            .border(1.dp, ZoneTheme.colors.line, shape)
            .clickable(onClick = onClick)
            .padding(15.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (note.pinned) {
                Icon(Icons.Outlined.PushPin, contentDescription = null, tint = ZoneTheme.colors.accent, modifier = Modifier.size(13.dp))
                Spacer(Modifier.width(5.dp))
            }
            MonoLabel(if (note.pinned) "Pinned" else note.color, color = if (note.pinned) ZoneTheme.colors.accent else ZoneTheme.colors.muted)
            Spacer(Modifier.weight(1f))
            MonoLabel("${ZoneMoney.words(note.body)} words")
        }
        Spacer(Modifier.height(7.dp))
        Text(
            note.title.ifBlank { "Untitled note" },
            style = ZoneType.headline.copy(fontSize = 20.sp),
            color = ZoneTheme.colors.ink,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (note.body.isNotBlank()) {
            Spacer(Modifier.height(5.dp))
            Text(
                note.body,
                style = ZoneType.bodySmall,
                color = ZoneTheme.colors.inkSoft,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }
        Spacer(Modifier.height(9.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            MonoLabel(ZoneDates.relativeShort(note.updated.ifBlank { note.created }))
            Spacer(Modifier.weight(1f))
            MonoLabel(note.color)
        }
    }
}

@Composable
fun NoteEditorScreen(
    vm: ZoneViewModel,
    noteId: String?,
    onBack: () -> Unit
) {
    val notes by vm.notes.collectAsStateWithLifecycle()
    val note = remember(notes, noteId) { notes.firstOrNull { it.id == noteId } }
    val editing = noteId != null
    var hydrated by rememberSaveable(noteId) { mutableStateOf(!editing) }
    var title by rememberSaveable(noteId) { mutableStateOf(note?.title ?: "") }
    var body by rememberSaveable(noteId) { mutableStateOf(note?.body ?: "") }
    var color by rememberSaveable(noteId) { mutableStateOf(note?.color ?: "plain") }
    var pinned by rememberSaveable(noteId) { mutableStateOf(note?.pinned ?: false) }

    LaunchedEffect(note) {
        if (!hydrated && note != null) {
            title = note.title
            body = note.body
            color = note.color
            pinned = note.pinned
            hydrated = true
        }
    }

    val words = ZoneMoney.words(body)

    ZoneEditorScaffold(
        title = if (editing) "Edit note" else "New note",
        onCancel = onBack,
        onSave = {
            vm.saveNote(
                Note(
                    id = note?.id.orEmpty(),
                    title = title,
                    body = body,
                    color = color,
                    pinned = pinned,
                    created = note?.created?.ifBlank { ZoneDates.today() } ?: ZoneDates.today(),
                    updated = ZoneDates.today()
                )
            )
            onBack()
        },
        saveEnabled = title.isNotBlank() || body.isNotBlank()
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Personal \u00B7 notes", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(8.dp))
                Text("A thought worth keeping.", style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
            }
            item { Spacer(Modifier.height(16.dp)) }
            item { ZoneField(title, { title = it }, "Title", placeholder = "Name the thought") }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneAreaField(
                    body,
                    { body = it },
                    "The note",
                    minLines = 12,
                    supporting = "$words words \u00B7 kept in your workspace"
                )
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                MonoLabel("Paper")
                Spacer(Modifier.height(7.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("plain", "sand", "sage", "clay").forEach { option ->
                        Column(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(9.dp))
                                .background(notePaperColor(option))
                                .border(
                                    1.dp,
                                    if (color == option) ZoneTheme.colors.ink else ZoneTheme.colors.line,
                                    RoundedCornerShape(9.dp)
                                )
                                .clickable { color = option }
                                .padding(vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Box(
                                Modifier
                                    .size(15.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when (option) {
                                            "sand" -> ZoneTheme.colors.sand
                                            "sage" -> ZoneTheme.colors.sage
                                            "clay" -> ZoneTheme.colors.clay
                                            else -> ZoneTheme.colors.raised
                                        }
                                    )
                                    .border(1.dp, ZoneTheme.colors.line, CircleShape)
                            )
                            Spacer(Modifier.height(5.dp))
                            MonoLabel(option, color = if (color == option) ZoneTheme.colors.ink else ZoneTheme.colors.muted)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(ZoneTheme.colors.raised)
                        .border(1.dp, ZoneTheme.colors.line, RoundedCornerShape(10.dp))
                        .clickable { pinned = !pinned }
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CheckCircle(checked = pinned, onClick = { pinned = !pinned })
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Keep this one close", style = ZoneType.body, color = ZoneTheme.colors.ink)
                        MonoLabel("Pinned for a quicker return to the notebook")
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton("Save note", {
                    vm.saveNote(
                        Note(
                            id = note?.id.orEmpty(),
                            title = title,
                            body = body,
                            color = color,
                            pinned = pinned,
                            created = note?.created?.ifBlank { ZoneDates.today() } ?: ZoneDates.today(),
                            updated = ZoneDates.today()
                        )
                    )
                    onBack()
                }, enabled = title.isNotBlank() || body.isNotBlank())
            }
        }
    }
}

@Composable
fun NoteReaderScreen(
    vm: ZoneViewModel,
    noteId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit
) {
    val notes by vm.notes.collectAsStateWithLifecycle()
    val note = notes.firstOrNull { it.id == noteId }
    var confirmDelete by remember { mutableStateOf(false) }

    if (note == null) {
        ZoneDetailScaffold(title = "Note", onBack = onBack) {
            ZoneEmptyState("That note is gone.", "It may have been deleted on another device.")
        }
        return
    }

    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Delete this note?",
            body = "The page will leave your workspace and D1.",
            onConfirm = {
                confirmDelete = false
                vm.deleteNote(note.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    ZoneDetailScaffold(
        title = "The note",
        onBack = onBack,
        actions = {
            IconButton(onClick = { onEdit(note.id) }) {
                Icon(Icons.Outlined.Edit, contentDescription = "Edit note", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Outlined.Delete, contentDescription = "Delete note", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 22.dp, end = 22.dp, top = 6.dp, bottom = 34.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MonoLabel(if (note.pinned) "Pinned" else "From the notebook", color = if (note.pinned) ZoneTheme.colors.accent else ZoneTheme.colors.muted)
                    Spacer(Modifier.weight(1f))
                    MonoLabel(ZoneDates.shortDate(note.updated.ifBlank { note.created }).uppercase())
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    note.title.ifBlank { "Untitled note" },
                    style = ZoneType.displaySmall,
                    color = ZoneTheme.colors.ink
                )
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MonoLabel("${ZoneMoney.words(note.body)} words")
                    Spacer(Modifier.width(12.dp))
                    MonoLabel("${note.color} paper")
                }
                Spacer(Modifier.height(18.dp))
                Rule()
                Spacer(Modifier.height(18.dp))
                Text(note.body, style = ZoneType.serifBody, color = ZoneTheme.colors.ink)
                Spacer(Modifier.height(26.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ZoneGhostButton(
                        if (note.pinned) "Unpin note" else "Pin note",
                        { vm.toggleNotePin(note.id) }
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "Edit note",
                        style = ZoneType.monoSmall,
                        color = ZoneTheme.colors.accent,
                        modifier = Modifier
                            .clickable { onEdit(note.id) }
                            .padding(8.dp)
                    )
                }
            }
        }
    }
}
