package com.zone.desk.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material.icons.outlined.StarBorder
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.Season
import com.zone.desk.data.model.WatchItem
import com.zone.desk.domain.nextEpisode
import com.zone.desk.domain.seasonTotals
import com.zone.desk.domain.watchProgress
import com.zone.desk.domain.watchStats
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.CheckCircle
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneAreaField
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneChip
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZoneGhostButton
import com.zone.desk.ui.components.ZonePicker
import com.zone.desk.ui.components.ZoneProgress
import com.zone.desk.ui.components.ZoneSegmented
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import java.util.Locale

private val watchStatuses = listOf("Queued", "Watching", "Watched", "Dropped")
private val watchGenres = listOf(
    "Drama", "Comedy", "Thriller", "Sci-Fi", "Romance", "Documentary",
    "Animation", "Mystery", "Fantasy", "Horror", "Action", "Other"
)

@Composable
fun WatchlistScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onDetail: (String) -> Unit
) {
    val watchlist by vm.watchlist.collectAsStateWithLifecycle()
    val stats = watchStats(watchlist)
    var filter by rememberSaveable { mutableStateOf("All") }
    val current = watchlist.firstOrNull { it.status == "Watching" && nextEpisode(it) != null }
    val next = current?.let { nextEpisode(it) }
    val filtered = watchlist.filter { filter == "All" || it.status == filter }
        .sortedWith(compareByDescending<WatchItem> { it.favorite }.thenByDescending { it.rating })

    ZoneDetailScaffold(
        title = "Watchlist",
        onBack = onBack,
        actions = {
            Text(
                "Add",
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
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            item {
                Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp)) {
                    MonoLabel("Library \u00B7 watchlist")
                    Spacer(Modifier.height(10.dp))
                    Text("In rotation.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        if (current != null && next != null) {
                            "${current.title} \u2014 ${next.label}. ${next.remaining} episodes left in season ${next.season}."
                        } else {
                            "${stats.watching} watching, ${stats.queued} queued, ${stats.watched} watched. The shelf waits."
                        },
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = stats.watching.toString(),
                            label = "Watching",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = stats.queued.toString(),
                            label = "Queued",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = "${stats.pctWatched}%",
                            label = "Shelf watched",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                    }
                }
            }
            if (current != null && next != null) {
                item { Spacer(Modifier.height(14.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel("Next up", color = ZoneTheme.colors.accent)
                            Spacer(Modifier.weight(1f))
                            MonoLabel(current.service.ifBlank { "streaming" })
                        }
                        Spacer(Modifier.height(7.dp))
                        Text(current.title, style = ZoneType.headline.copy(fontSize = 22.sp), color = ZoneTheme.colors.ink)
                        Spacer(Modifier.height(3.dp))
                        Text(
                            "${next.label} \u00B7 ${next.remaining} episodes left in season ${next.season}",
                            style = ZoneType.bodySmall,
                            color = ZoneTheme.colors.inkSoft
                        )
                        Spacer(Modifier.height(10.dp))
                        ZoneProgress(watchProgress(current) / 100f)
                        Spacer(Modifier.height(10.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ZoneGhostButton("Open title", { onDetail(current.id) })
                            Spacer(Modifier.weight(1f))
                            Text(
                                "Mark watched",
                                style = ZoneType.monoSmall,
                                color = ZoneTheme.colors.accent,
                                modifier = Modifier
                                    .clickable { vm.advanceWatch(current.id) }
                                    .padding(7.dp)
                            )
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("All", "Queued", "Watching", "Watched", "Dropped").forEach { option ->
                        ZoneChip(option, selected = filter == option, onClick = { filter = option })
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item { SectionLabel("The shelf", trailing = "${filtered.size} titles") }
            if (filtered.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = if (watchlist.isEmpty()) "The shelf is empty." else "Nothing in this filter.",
                        body = if (watchlist.isEmpty()) "Add the first title. A film, a series, a thing you meant to get to." else "Try another shelf.",
                        actionLabel = if (watchlist.isEmpty()) "Add a title" else null,
                        onAction = if (watchlist.isEmpty()) onNew else null
                    )
                }
            } else {
                items(filtered, key = { it.id }) { item ->
                    WatchRow(item, onClick = { onDetail(item.id) }, onFavorite = { vm.toggleWatchFavorite(item.id) })
                    Rule(Modifier.padding(horizontal = 20.dp))
                }
                item { Spacer(Modifier.height(12.dp)) }
                item {
                    ZoneButton("Add a title", onNew, modifier = Modifier.padding(horizontal = 20.dp))
                }
            }
        }
    }
}

@Composable
private fun WatchRow(item: WatchItem, onClick: () -> Unit, onFavorite: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    item.title,
                    style = ZoneType.headline.copy(fontSize = 19.sp),
                    color = ZoneTheme.colors.ink,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (item.rating > 0) {
                    Spacer(Modifier.width(7.dp))
                    Text(
                        String.format(Locale.US, "%.1f", item.rating),
                        style = ZoneType.monoSmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            Spacer(Modifier.height(3.dp))
            MonoLabel(
                listOfNotNull(
                    item.type,
                    item.year.takeIf { it > 0 }?.toString(),
                    item.genre.takeIf { it.isNotBlank() },
                    item.status.uppercase()
                ).joinToString(" \u00B7 ")
            )
            if (item.total > 0) {
                Spacer(Modifier.height(6.dp))
                ZoneProgress(watchProgress(item) / 100f, height = 3.dp)
            }
        }
        IconButton(onClick = onFavorite, modifier = Modifier.size(34.dp)) {
            Icon(
                if (item.favorite) Icons.Filled.Star else Icons.Outlined.StarBorder,
                contentDescription = "Favorite",
                tint = if (item.favorite) ZoneTheme.colors.sand else ZoneTheme.colors.muted,
                modifier = Modifier.size(17.dp)
            )
        }
    }
}

@Composable
fun WatchFormScreen(
    vm: ZoneViewModel,
    itemId: String?,
    onBack: () -> Unit
) {
    val watchlist by vm.watchlist.collectAsStateWithLifecycle()
    val item = remember(watchlist, itemId) { watchlist.firstOrNull { it.id == itemId } }
    val editing = itemId != null
    var hydrated by rememberSaveable(itemId) { mutableStateOf(!editing) }
    var title by rememberSaveable(itemId) { mutableStateOf(item?.title ?: "") }
    var type by rememberSaveable(itemId) { mutableStateOf(item?.type ?: "Film") }
    var year by rememberSaveable(itemId) { mutableStateOf(item?.year?.takeIf { it > 0 }?.toString() ?: "") }
    var genre by rememberSaveable(itemId) { mutableStateOf(item?.genre ?: "Drama") }
    var status by rememberSaveable(itemId) { mutableStateOf(item?.status ?: "Queued") }
    var service by rememberSaveable(itemId) { mutableStateOf(item?.service ?: "") }
    var rating by rememberSaveable(itemId) { mutableStateOf(item?.rating ?: 0.0) }
    var favorite by rememberSaveable(itemId) { mutableStateOf(item?.favorite ?: false) }
    var note by rememberSaveable(itemId) { mutableStateOf(item?.note ?: "") }
    var seasons by remember(itemId) { mutableStateOf(item?.seasons ?: emptyList()) }
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(item) {
        if (!hydrated && item != null) {
            title = item.title
            type = item.type
            year = item.year.takeIf { it > 0 }?.toString() ?: ""
            genre = item.genre.ifBlank { "Drama" }
            status = item.status
            service = item.service
            rating = item.rating
            favorite = item.favorite
            note = item.note
            seasons = item.seasons
            hydrated = true
        }
    }

    if (confirmDelete && item != null) {
        ZoneConfirmDialog(
            title = "Remove this title?",
            body = "It will leave the shelf and the workspace.",
            onConfirm = {
                confirmDelete = false
                vm.deleteWatch(item.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    val total = seasonTotals(seasons).first

    ZoneEditorScaffold(
        title = if (editing) "Edit title" else "New arrival",
        onCancel = onBack,
        onSave = {
            vm.saveWatch(
                WatchItem(
                    id = item?.id.orEmpty(),
                    title = title,
                    type = type,
                    year = year.toIntOrNull() ?: 0,
                    genre = genre,
                    status = status,
                    rating = rating,
                    watched = item?.watched ?: 0,
                    total = if (type == "Series") total else item?.total ?: 0,
                    service = service,
                    favorite = favorite,
                    note = note,
                    added = item?.added?.ifBlank { ZoneDates.today() } ?: ZoneDates.today(),
                    seasons = if (type == "Series") seasons else emptyList()
                )
            )
            onBack()
        },
        saveEnabled = title.isNotBlank()
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Library \u00B7 watchlist", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(8.dp))
                Text(if (editing) "The title, kept." else "A new arrival.", style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
            }
            item { Spacer(Modifier.height(16.dp)) }
            item { ZoneField(title, { title = it }, "Title", placeholder = "The Bear") }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                MonoLabel("Format")
                Spacer(Modifier.height(6.dp))
                ZoneSegmented(listOf("Film", "Series"), type) { picked ->
                    type = picked
                    if (picked == "Series" && seasons.isEmpty()) {
                        seasons = listOf(Season(number = 1, episodes = 0, watched = 0))
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ZoneField(
                        year,
                        { year = it.filter { ch -> ch.isDigit() }.take(4) },
                        "Year",
                        keyboardType = KeyboardType.Number,
                        modifier = Modifier.weight(1f)
                    )
                    Column(Modifier.weight(1.4f)) {
                        ZonePicker("Genre", genre, watchGenres, { genre = it })
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                MonoLabel("Status")
                Spacer(Modifier.height(6.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    watchStatuses.forEach { option ->
                        ZoneChip(option, selected = status == option, onClick = { status = option })
                    }
                }
            }
            if (type == "Series") {
                item { Spacer(Modifier.height(18.dp)) }
                item { SectionLabel("Seasons & episodes", trailing = "$total episodes") }
                item {
                    Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        seasons.forEachIndexed { index, season ->
                            SeasonEditorRow(
                                season = season,
                                onChange = { updated ->
                                    seasons = seasons.toMutableList().also { it[index] = updated }
                                },
                                onRemove = {
                                    seasons = seasons.filterIndexed { i, _ -> i != index }
                                }
                            )
                        }
                        ZoneGhostButton("Add season", {
                            val nextNumber = (seasons.maxOfOrNull { it.number } ?: 0) + 1
                            seasons = seasons + Season(number = nextNumber, episodes = 0, watched = 0)
                        })
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item { ZoneField(service, { service = it }, "Where to watch", placeholder = "Netflix, Hulu, cinema\u2026") }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                MonoLabel("Your rating")
                Spacer(Modifier.height(5.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                    (1..10).forEach { star ->
                        Icon(
                            if (rating >= star - 0.5) Icons.Filled.Star else Icons.Outlined.StarBorder,
                            contentDescription = "$star out of 10",
                            tint = if (rating >= star - 0.5) ZoneTheme.colors.sand else ZoneTheme.colors.line,
                            modifier = Modifier
                                .size(24.dp)
                                .clickable { rating = star.toDouble() }
                        )
                    }
                }
                Spacer(Modifier.height(3.dp))
                MonoLabel(if (rating > 0) String.format(Locale.US, "%.1f / 10", rating) else "Not rated yet")
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(ZoneTheme.colors.raised)
                        .clickable { favorite = !favorite }
                        .padding(13.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CheckCircle(checked = favorite, onClick = { favorite = !favorite })
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Keep this one close", style = ZoneType.body, color = ZoneTheme.colors.ink)
                        MonoLabel("Starred for a quicker return to the shelf")
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneAreaField(note, { note = it }, "A note to yourself", minLines = 3)
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton(if (editing) "Save title" else "Add to shelf", {
                    vm.saveWatch(
                        WatchItem(
                            id = item?.id.orEmpty(),
                            title = title,
                            type = type,
                            year = year.toIntOrNull() ?: 0,
                            genre = genre,
                            status = status,
                            rating = rating,
                            watched = item?.watched ?: 0,
                            total = if (type == "Series") total else item?.total ?: 0,
                            service = service,
                            favorite = favorite,
                            note = note,
                            added = item?.added?.ifBlank { ZoneDates.today() } ?: ZoneDates.today(),
                            seasons = if (type == "Series") seasons else emptyList()
                        )
                    )
                    onBack()
                }, enabled = title.isNotBlank())
            }
            if (editing && item != null) {
                item { Spacer(Modifier.height(8.dp)) }
                item {
                    Text(
                        "Remove this title",
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
}

@Composable
private fun SeasonEditorRow(
    season: Season,
    onChange: (Season) -> Unit,
    onRemove: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(ZoneTheme.colors.raised)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            "S${season.number.toString().padStart(2, '0')}",
            style = ZoneType.monoBig.copy(fontSize = 14.sp),
            color = ZoneTheme.colors.ink
        )
        Spacer(Modifier.width(10.dp))
        Counter(
            label = "episodes",
            value = season.episodes,
            onChange = { onChange(season.copy(episodes = it.coerceAtLeast(0))) }
        )
        Spacer(Modifier.width(12.dp))
        Counter(
            label = "watched",
            value = season.watched,
            onChange = {
                onChange(season.copy(watched = it.coerceIn(0, season.episodes)))
            }
        )
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onRemove, modifier = Modifier.size(28.dp)) {
            Icon(Icons.Outlined.Remove, contentDescription = "Remove season", tint = ZoneTheme.colors.muted, modifier = Modifier.size(15.dp))
        }
    }
}

@Composable
private fun Counter(label: String, value: Int, onChange: (Int) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "\u2212",
                style = ZoneType.mono,
                color = ZoneTheme.colors.inkSoft,
                modifier = Modifier
                    .clickable { onChange(value - 1) }
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            )
            Text(
                value.toString(),
                style = ZoneType.monoBig.copy(fontSize = 14.sp),
                color = ZoneTheme.colors.ink,
                modifier = Modifier.width(22.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Text(
                "+",
                style = ZoneType.mono,
                color = ZoneTheme.colors.inkSoft,
                modifier = Modifier
                    .clickable { onChange(value + 1) }
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }
        MonoLabel(label, maxLines = 1)
    }
}

@Composable
fun WatchDetailScreen(
    vm: ZoneViewModel,
    itemId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit
) {
    val watchlist by vm.watchlist.collectAsStateWithLifecycle()
    val item = watchlist.firstOrNull { it.id == itemId }
    var confirmDelete by remember { mutableStateOf(false) }

    if (item == null) {
        ZoneDetailScaffold(title = "Title", onBack = onBack) {
            ZoneEmptyState("That title is gone.", "It may have been removed on another device.")
        }
        return
    }

    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Remove this title?",
            body = "It will leave the shelf.",
            onConfirm = {
                confirmDelete = false
                vm.deleteWatch(item.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    val next = nextEpisode(item)
    val progress = watchProgress(item)

    ZoneDetailScaffold(
        title = item.title,
        onBack = onBack,
        actions = {
            IconButton(onClick = { onEdit(item.id) }) {
                Icon(Icons.Outlined.Edit, contentDescription = "Edit title", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Outlined.Delete, contentDescription = "Remove title", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            item {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel(
                            listOfNotNull(
                                item.status.uppercase(),
                                item.type.uppercase(),
                                item.year.takeIf { it > 0 }?.toString()
                            ).joinToString(" \u00B7 "),
                            color = ZoneTheme.colors.accent
                        )
                        Spacer(Modifier.weight(1f))
                        if (item.rating > 0) {
                            Text(
                                String.format(Locale.US, "%.1f", item.rating),
                                style = ZoneType.number.copy(fontSize = 22.sp),
                                color = ZoneTheme.colors.ink
                            )
                            MonoLabel("/ 10")
                        }
                    }
                    Spacer(Modifier.height(7.dp))
                    Text(item.title, style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(4.dp))
                    MonoLabel(
                        listOfNotNull(
                            item.genre.takeIf { it.isNotBlank() },
                            item.service.takeIf { it.isNotBlank() }
                        ).joinToString(" \u00B7 "),
                        maxLines = 2
                    )
                    Spacer(Modifier.height(13.dp))
                    ZoneProgress(progress / 100f, height = 5.dp)
                    Spacer(Modifier.height(5.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel(if (item.total > 0) "${item.watched} of ${item.total} watched" else item.status)
                        Spacer(Modifier.weight(1f))
                        MonoLabel("$progress%")
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            if (next != null) {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel("Next", color = ZoneTheme.colors.accent)
                            Spacer(Modifier.weight(1f))
                            MonoLabel("${next.remaining} left")
                        }
                        Spacer(Modifier.height(5.dp))
                        Text(next.label, style = ZoneType.displaySmall.copy(fontSize = 29.sp), color = ZoneTheme.colors.ink)
                        Spacer(Modifier.height(2.dp))
                        Text(
                            if (item.service.isNotBlank()) "Streaming on ${item.service}." else "Ready when you are.",
                            style = ZoneType.bodySmall,
                            color = ZoneTheme.colors.inkSoft
                        )
                        Spacer(Modifier.height(10.dp))
                        ZoneButton("Mark ${next.label} watched", { vm.advanceWatch(item.id) })
                    }
                }
            } else {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        MonoLabel("Shelf cleared", color = ZoneTheme.colors.sage)
                        Spacer(Modifier.height(5.dp))
                        Text(
                            if (item.status == "Watched") "You finished this one." else "No episodes queued. Set a status or add a season.",
                            style = ZoneType.body,
                            color = ZoneTheme.colors.inkSoft
                        )
                    }
                }
            }
            if (item.seasons.isNotEmpty()) {
                item { Spacer(Modifier.height(18.dp)) }
                item { SectionLabel("Seasons", trailing = "${item.seasons.size}") }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(vertical = 4.dp)) {
                        item.seasons.sortedBy { it.number }.forEachIndexed { index, season ->
                            if (index > 0) Rule(Modifier.padding(horizontal = 14.dp))
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "S${season.number.toString().padStart(2, '0')}",
                                    style = ZoneType.monoBig.copy(fontSize = 14.sp),
                                    color = ZoneTheme.colors.ink,
                                    modifier = Modifier.width(40.dp)
                                )
                                Column(Modifier.weight(1f)) {
                                    ZoneProgress(
                                        if (season.episodes > 0) season.watched.toFloat() / season.episodes else 0f,
                                        height = 3.dp
                                    )
                                    Spacer(Modifier.height(3.dp))
                                    MonoLabel("${season.watched} of ${season.episodes} watched")
                                }
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Status") }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    watchStatuses.forEach { option ->
                        ZoneChip(option, selected = item.status == option, onClick = { vm.setWatchStatus(item.id, option) })
                    }
                }
            }
            if (item.note.isNotBlank()) {
                item { Spacer(Modifier.height(18.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        MonoLabel("A note to yourself", color = ZoneTheme.colors.accent)
                        Spacer(Modifier.height(5.dp))
                        Text(item.note, style = ZoneType.body, color = ZoneTheme.colors.inkSoft)
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                    ZoneGhostButton(
                        if (item.favorite) "Unstar" else "Keep close",
                        { vm.toggleWatchFavorite(item.id) }
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "Edit title",
                        style = ZoneType.monoSmall,
                        color = ZoneTheme.colors.accent,
                        modifier = Modifier
                            .clickable { onEdit(item.id) }
                            .padding(8.dp)
                    )
                }
            }
        }
    }
}
