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
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Link
import androidx.compose.material.icons.outlined.OpenInNew
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material.icons.outlined.X
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.ZoneLink
import com.zone.desk.domain.linkStats
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneChip
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZoneGhostButton
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTagRow
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneIntents
import com.zone.desk.util.ZoneMoney
import java.util.Locale

/* The links shelf uses the deep reading-room green from the web design. It is
   deliberately fixed rather than themed: the spotlight is the one dark corner
   of the paper desk, in light and dark alike. */
private val LinkDeep = Color(0xFF22352E)
private val LinkDeepLine = Color(0xFF2F463D)
private val LinkMint = Color(0xFFA7C8BA)
private val LinkPaper = Color(0xFFF7F2E7)

private val linkTagIdeas = listOf(
    "design", "reading", "tools", "web", "philosophy", "slow-living",
    "favorites", "work", "reference", "inspiration", "writing", "later"
)

@Composable
fun LinksScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onDetail: (String) -> Unit
) {
    val links by vm.links.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val stats = linkStats(links)
    var activeTag by rememberSaveable { mutableStateOf<String?>(null) }
    var spotIndex by rememberSaveable { mutableIntStateOf(0) }

    val pool = links.filter { it.favorite }.ifEmpty { links }
    val spot = if (pool.isEmpty()) null else pool[spotIndex % pool.size]
    val filtered = links
        .filter { link -> activeTag == null || link.tags.any { it.equals(activeTag, ignoreCase = true) } }
        .sortedWith(compareByDescending<ZoneLink> { it.favorite }.thenByDescending { it.saved })

    ZoneDetailScaffold(
        title = "Links",
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
                    MonoLabel("Library \u00B7 links")
                    Spacer(Modifier.height(9.dp))
                    Text("Saved corners.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${stats.total} saved \u00B7 ${stats.favorites} favourites \u00B7 ${stats.domains.size} domains. " +
                            "The good corners of the web, kept on purpose.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }

            if (spot != null) {
                item { Spacer(Modifier.height(14.dp)) }
                item {
                    LinkSpotlight(
                        link = spot,
                        onOpen = { ZoneIntents.openUrl(context, spot.url) },
                        onPullAnother = {
                            if (pool.isNotEmpty()) spotIndex = (spotIndex + 1) % pool.size
                        },
                        onClick = { onDetail(spot.id) }
                    )
                }
            } else {
                item {
                    ZoneEmptyState(
                        title = "No corners saved.",
                        body = "Keep the articles, tools, and small pages you want to return to. Zone keeps the link and the reason.",
                        actionLabel = "Save a link",
                        onAction = onNew
                    )
                }
            }

            if (stats.tags.isNotEmpty()) {
                item { Spacer(Modifier.height(14.dp)) }
                item {
                    ZoneTagRow(
                        tags = listOf("All") + stats.tags.map { it.first },
                        selected = activeTag ?: "All",
                        onTag = { tag -> activeTag = if (tag == "All") null else tag }
                    )
                }
            }

            item { Spacer(Modifier.height(18.dp)) }
            item {
                SectionLabel(
                    "The catalogue",
                    trailing = if (activeTag == null) "${filtered.size} saved" else "${filtered.size} under #$activeTag"
                )
            }
            if (filtered.isEmpty()) {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Text(
                            if (activeTag == null) "Nothing saved yet." else "Nothing under that tag.",
                            style = ZoneType.headline.copy(fontSize = 20.sp),
                            color = ZoneTheme.colors.ink
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "A saved link is a promise to come back.",
                            style = ZoneType.bodySmall,
                            color = ZoneTheme.colors.inkSoft
                        )
                    }
                }
            } else {
                item {
                    ZoneCard(
                        Modifier.padding(horizontal = 20.dp),
                        padding = PaddingValues(horizontal = 14.dp, vertical = 2.dp)
                    ) {
                        filtered.forEachIndexed { index, link ->
                            if (index > 0) Rule()
                            LinkCatalogueRow(
                                link = link,
                                onClick = { onDetail(link.id) },
                                onToggleFavorite = { vm.toggleLinkFavorite(link.id) }
                            )
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneButton(
                    "Save a link",
                    onNew,
                    modifier = Modifier.padding(horizontal = 20.dp),
                    icon = Icons.Outlined.Add
                )
            }
            item { Spacer(Modifier.height(12.dp)) }
            item {
                Text(
                    "A link is kept with a reason. The note is the part that remembers why it mattered.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}

@Composable
private fun LinkSpotlight(
    link: ZoneLink,
    onOpen: () -> Unit,
    onPullAnother: () -> Unit,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(18.dp)
    Column(
        Modifier
            .padding(horizontal = 20.dp)
            .fillMaxWidth()
            .clip(shape)
            .background(LinkDeep)
            .border(1.dp, LinkDeepLine, shape)
            .clickable(onClick = onClick)
            .padding(16.dp)
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .width(16.dp)
                    .height(2.dp)
                    .background(LinkMint, RoundedCornerShape(1.dp))
            )
            Spacer(Modifier.width(6.dp))
            Text("SPOTLIGHT", style = ZoneType.monoSmall.copy(letterSpacing = 1.6.sp), color = LinkMint)
            Spacer(Modifier.weight(1f))
            Box(
                Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.White.copy(alpha = 0.08f))
                    .padding(horizontal = 9.dp, vertical = 4.dp)
            ) {
                Text(
                    ZoneMoney.domainOf(link.url).uppercase(Locale.ENGLISH),
                    style = ZoneType.monoSmall.copy(fontSize = 8.sp, letterSpacing = 1.3.sp),
                    color = LinkMint,
                    maxLines = 1
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Text(
            link.title.ifBlank { ZoneMoney.domainOf(link.url) },
            style = ZoneType.headline.copy(fontSize = 23.sp, lineHeight = 27.sp),
            color = LinkPaper,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(6.dp))
        Text(
            buildString {
                append("Saved ${ZoneDates.relative(link.saved)}")
                if (link.tags.isNotEmpty()) append(" \u00B7 " + link.tags.take(3).joinToString(" ") { "#$it" })
                if (link.note.isNotBlank()) append(" \u00B7 \u201C${link.note}\u201D")
            },
            style = ZoneType.bodySmall.copy(fontSize = 10.5.sp, lineHeight = 15.sp),
            color = LinkMint.copy(alpha = 0.86f),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Row(
                Modifier
                    .clip(RoundedCornerShape(17.dp))
                    .background(LinkMint)
                    .clickable(onClick = onOpen)
                    .padding(horizontal = 16.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Outlined.ArrowUpward, contentDescription = null, tint = Color(0xFF15231E), modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(6.dp))
                Text("Open link", style = ZoneType.bodySmall.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold), color = Color(0xFF15231E))
            }
            Spacer(Modifier.width(8.dp))
            Box(
                Modifier
                    .clip(RoundedCornerShape(17.dp))
                    .border(1.dp, LinkMint.copy(alpha = 0.30f), RoundedCornerShape(17.dp))
                    .clickable(onClick = onPullAnother)
                    .padding(horizontal = 14.dp, vertical = 9.dp)
            ) {
                Text("Pull another", style = ZoneType.bodySmall, color = LinkMint)
            }
        }
    }
}

@Composable
private fun LinkCatalogueRow(
    link: ZoneLink,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(ZoneTheme.colors.deep),
            contentAlignment = Alignment.Center
        ) {
            Text(
                link.title.ifBlank { ZoneMoney.domainOf(link.url) }.take(1).uppercase(Locale.ENGLISH),
                style = ZoneType.headline.copy(fontSize = 18.sp),
                color = ZoneTheme.colors.ink
            )
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                link.title.ifBlank { ZoneMoney.domainOf(link.url) },
                style = ZoneType.body.copy(fontSize = 12.sp, lineHeight = 16.sp),
                color = ZoneTheme.colors.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(2.dp))
            Text(
                "${ZoneMoney.domainOf(link.url).uppercase(Locale.ENGLISH)} \u00B7 SAVED ${ZoneDates.relative(link.saved).uppercase(Locale.ENGLISH)}",
                style = ZoneType.monoSmall.copy(fontSize = 7.sp, letterSpacing = 0.5.sp),
                color = ZoneTheme.colors.muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        IconButton(onClick = onToggleFavorite, modifier = Modifier.size(32.dp)) {
            Icon(
                if (link.favorite) Icons.Filled.Star else Icons.Outlined.StarBorder,
                contentDescription = if (link.favorite) "Remove favourite" else "Favourite",
                tint = if (link.favorite) ZoneTheme.colors.sand else ZoneTheme.colors.muted,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

@Composable
fun LinkFormScreen(
    vm: ZoneViewModel,
    linkId: String?,
    onBack: () -> Unit
) {
    val links by vm.links.collectAsStateWithLifecycle()
    val link = remember(links, linkId) { links.firstOrNull { it.id == linkId } }
    val editing = linkId != null
    var hydrated by rememberSaveable(linkId) { mutableStateOf(!editing) }
    var url by rememberSaveable(linkId) { mutableStateOf(link?.url ?: "") }
    var title by rememberSaveable(linkId) { mutableStateOf(link?.title ?: "") }
    var note by rememberSaveable(linkId) { mutableStateOf(link?.note ?: "") }
    var favorite by rememberSaveable(linkId) { mutableStateOf(link?.favorite ?: false) }
    var tags by remember(linkId) { mutableStateOf(link?.tags.orEmpty()) }
    var tagDraft by rememberSaveable(linkId) { mutableStateOf("") }

    LaunchedEffect(link) {
        if (!hydrated && link != null) {
            url = link.url
            title = link.title
            note = link.note
            favorite = link.favorite
            tags = link.tags
            hydrated = true
        }
    }

    val normalized = ZoneMoney.normalizeUrl(url)
    val valid = normalized != null
    val suggestions = (linkTagIdeas + links.flatMap { it.tags })
        .map { it.trim().removePrefix("#") }
        .filter { it.isNotBlank() && tags.none { selected -> selected.equals(it, true) } }
        .distinctBy { it.lowercase(Locale.ENGLISH) }

    fun addTag(raw: String) {
        val tag = raw.trim().removePrefix("#").replace(Regex("\\s+"), "-").lowercase(Locale.ENGLISH)
        if (tag.isNotBlank() && tags.none { it.equals(tag, true) }) tags = (tags + tag).take(8)
        tagDraft = ""
    }

    fun persist() {
        val target = normalized ?: return
        vm.saveLink(
            ZoneLink(
                id = link?.id.orEmpty(),
                title = title,
                url = target,
                tags = tags,
                note = note,
                favorite = favorite,
                saved = link?.saved ?: ZoneDates.today()
            )
        )
        onBack()
    }

    ZoneEditorScaffold(
        title = if (editing) "Edit link" else "Save a link",
        onCancel = onBack,
        onSave = { persist() },
        saveEnabled = valid
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Library / links \u00B7 add to the shelf", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(9.dp))
                Text(
                    if (editing) "Sharpen the corner." else "A good corner.",
                    style = ZoneType.displaySmall,
                    color = ZoneTheme.colors.ink
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "A URL, a title, and the reason it deserved a place on the shelf.",
                    style = ZoneType.body,
                    color = ZoneTheme.colors.inkSoft
                )
                Spacer(Modifier.height(18.dp))
            }
            item {
                ZoneField(
                    url,
                    { url = it },
                    "URL",
                    placeholder = "https://aeon.co/essays\u2026",
                    keyboardType = KeyboardType.Uri,
                    supporting = if (url.isNotBlank() && normalized == null) "That does not look like a web address." else normalized?.let { ZoneMoney.domainOf(it) }
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneField(
                    title,
                    { title = it },
                    "Title",
                    placeholder = "The uses of uselessness"
                )
            }
            item { Spacer(Modifier.height(16.dp)) }
            item { MonoLabel("Tags", color = ZoneTheme.colors.inkSoft) }
            if (tags.isNotEmpty()) {
                item { Spacer(Modifier.height(7.dp)) }
                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        tags.forEach { tag ->
                            Row(
                                Modifier
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(ZoneTheme.colors.accentSoft)
                                    .border(1.dp, ZoneTheme.colors.accent, RoundedCornerShape(14.dp))
                                    .clickable { tags = tags.filterNot { it == tag } }
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("#$tag", style = ZoneType.monoSmall, color = ZoneTheme.colors.accent)
                                Spacer(Modifier.width(5.dp))
                                Icon(Icons.Outlined.X, contentDescription = "Remove tag", tint = ZoneTheme.colors.accent, modifier = Modifier.size(10.dp))
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
            item {
                ZoneField(
                    tagDraft,
                    { tagDraft = it },
                    "Add a tag",
                    placeholder = "reading",
                    supporting = if (tags.size >= 8) "Eight tags is plenty." else null,
                    trailing = {
                        Text(
                            "Add",
                            style = ZoneType.monoSmall,
                            color = if (tagDraft.isBlank() || tags.size >= 8) ZoneTheme.colors.muted else ZoneTheme.colors.accent,
                            modifier = Modifier
                                .clickable(enabled = tagDraft.isNotBlank() && tags.size < 8) { addTag(tagDraft) }
                                .padding(8.dp)
                        )
                    }
                )
            }
            if (suggestions.isNotEmpty()) {
                item { Spacer(Modifier.height(9.dp)) }
                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        suggestions.take(12).forEach { suggestion ->
                            ZoneChip("#$suggestion", onClick = { addTag(suggestion) })
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(ZoneTheme.colors.raised)
                        .border(1.dp, ZoneTheme.colors.line, RoundedCornerShape(14.dp))
                        .clickable { favorite = !favorite }
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(11.dp))
                            .background(if (favorite) ZoneTheme.colors.sand else ZoneTheme.colors.deep),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            if (favorite) Icons.Filled.Star else Icons.Outlined.StarBorder,
                            contentDescription = null,
                            tint = if (favorite) ZoneTheme.colors.paper else ZoneTheme.colors.inkSoft,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(Modifier.width(11.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Keep this one close", style = ZoneType.body.copy(fontSize = 12.5.sp), color = ZoneTheme.colors.ink)
                        Spacer(Modifier.height(2.dp))
                        MonoLabel("Starred for a quicker return to the shelf")
                    }
                    LinkToggle(checked = favorite, onCheckedChange = { favorite = it })
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneField(
                    note,
                    { note = it },
                    "Why keep it?",
                    placeholder = "The line that made you save it\u2026",
                    singleLine = false,
                    minLines = 4
                )
            }
            item { Spacer(Modifier.height(6.dp)) }
            item {
                Text(
                    if (normalized != null) "Will open at ${ZoneMoney.domainOf(normalized)}." else "Paste a URL to enable saving.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted
                )
            }
            item { Spacer(Modifier.height(20.dp)) }
            item {
                ZoneButton(
                    if (editing) "Save link" else "Put it on the shelf",
                    onClick = { persist() },
                    enabled = valid,
                    icon = Icons.Outlined.Link
                )
            }
            if (editing && link != null) {
                item { Spacer(Modifier.height(12.dp)) }
                item {
                    var confirm by remember { mutableStateOf(false) }
                    Text(
                        "Remove this link",
                        style = ZoneType.monoSmall,
                        color = ZoneTheme.colors.accent,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { confirm = true }
                            .padding(12.dp),
                        textAlign = TextAlign.Center
                    )
                    if (confirm) {
                        ZoneConfirmDialog(
                            title = "Remove this link?",
                            body = "The corner leaves the shelf. The trail keeps a receipt.",
                            onConfirm = {
                                confirm = false
                                vm.deleteLink(link.id)
                                onBack()
                            },
                            onDismiss = { confirm = false }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun LinkDetailScreen(
    vm: ZoneViewModel,
    linkId: String,
    onBack: () -> Unit,
    onEdit: (String) -> Unit
) {
    val links by vm.links.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val link = links.firstOrNull { it.id == linkId }
    var confirmDelete by remember { mutableStateOf(false) }

    if (link == null) {
        ZoneDetailScaffold(title = "The shelf", onBack = onBack) {
            ZoneEmptyState(
                title = "That corner is gone.",
                body = "It may have been removed on another device.",
                actionLabel = "Back to links",
                onAction = onBack
            )
        }
        return
    }

    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Remove this link?",
            body = "The corner leaves the shelf. The trail keeps a receipt.",
            onConfirm = {
                confirmDelete = false
                vm.deleteLink(link.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    val domain = ZoneMoney.domainOf(link.url)
    val type = linkType(link.url)
    val noteSentences = link.note
        .split(Regex("(?<=[.!?])\\s+"))
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .take(2)

    ZoneDetailScaffold(
        title = "The shelf",
        onBack = onBack,
        actions = {
            IconButton(onClick = { vm.toggleLinkFavorite(link.id) }) {
                Icon(
                    if (link.favorite) Icons.Filled.Star else Icons.Outlined.StarBorder,
                    contentDescription = "Favourite",
                    tint = if (link.favorite) ZoneTheme.colors.sand else ZoneTheme.colors.inkSoft,
                    modifier = Modifier.size(19.dp)
                )
            }
            Text(
                "Edit",
                style = ZoneType.mono,
                color = ZoneTheme.colors.accent,
                modifier = Modifier
                    .clickable { onEdit(link.id) }
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            )
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 6.dp, bottom = 32.dp)
        ) {
            item {
                val shape = RoundedCornerShape(18.dp)
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(shape)
                        .background(LinkDeep)
                        .border(1.dp, LinkDeepLine, shape)
                        .padding(16.dp)
                ) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(56.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(LinkPaper),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                link.title.ifBlank { domain }.take(1).uppercase(Locale.ENGLISH),
                                style = ZoneType.headline.copy(fontSize = 30.sp),
                                color = Color(0xFF15231E)
                            )
                        }
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.width(16.dp).height(2.dp).background(LinkMint, RoundedCornerShape(1.dp)))
                                Spacer(Modifier.width(6.dp))
                                Text(
                                    "${domain.uppercase(Locale.ENGLISH)} \u00B7 ${type.uppercase(Locale.ENGLISH)}",
                                    style = ZoneType.monoSmall.copy(letterSpacing = 1.4.sp),
                                    color = LinkMint,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "SAVED ${ZoneDates.relative(link.saved).uppercase(Locale.ENGLISH)}",
                                style = ZoneType.monoSmall.copy(fontSize = 7.5.sp, letterSpacing = 1.2.sp),
                                color = LinkMint.copy(alpha = 0.82f)
                            )
                        }
                        if (link.favorite) {
                            Icon(Icons.Filled.Star, contentDescription = "Favourite", tint = Color(0xFFDDBD83), modifier = Modifier.size(19.dp))
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        link.title.ifBlank { domain },
                        style = ZoneType.headline.copy(fontSize = 28.sp, lineHeight = 31.sp),
                        color = LinkPaper
                    )
                    if (link.tags.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp))
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            link.tags.forEach { tag -> DarkTag(tag) }
                        }
                    }
                }
            }

            if (link.note.isNotBlank()) {
                item { Spacer(Modifier.height(13.dp)) }
                item {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(ZoneTheme.colors.deep)
                            .padding(horizontal = 14.dp, vertical = 12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.width(16.dp).height(2.dp).background(ZoneTheme.colors.clay, RoundedCornerShape(1.dp)))
                            Spacer(Modifier.width(6.dp))
                            MonoLabel("Why keep it? \u00B7 your note", color = ZoneTheme.colors.clay)
                        }
                        Spacer(Modifier.height(7.dp))
                        Text(
                            link.note,
                            style = ZoneType.serifBody.copy(fontSize = 15.sp, lineHeight = 22.sp, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic),
                            color = ZoneTheme.colors.ink
                        )
                    }
                }
            }

            if (noteSentences.isNotEmpty()) {
                item { Spacer(Modifier.height(13.dp)) }
                item {
                    ZoneCard(Modifier.fillMaxWidth(), padding = PaddingValues(horizontal = 14.dp, vertical = 12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.width(16.dp).height(2.dp).background(ZoneTheme.colors.accent, RoundedCornerShape(1.dp)))
                            Spacer(Modifier.width(6.dp))
                            MonoLabel("From your note", color = ZoneTheme.colors.accent)
                        }
                        Spacer(Modifier.height(9.dp))
                        noteSentences.forEachIndexed { index, sentence ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    Modifier
                                        .width(3.dp)
                                        .height(34.dp)
                                        .clip(RoundedCornerShape(1.5.dp))
                                        .background(if (index == 0) ZoneTheme.colors.accent else ZoneTheme.colors.sage)
                                )
                                Spacer(Modifier.width(10.dp))
                                Text(
                                    sentence,
                                    style = ZoneType.serifBody.copy(fontSize = 13.5.sp, lineHeight = 19.sp, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic),
                                    color = ZoneTheme.colors.inkSoft,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            if (index < noteSentences.lastIndex) Spacer(Modifier.height(6.dp))
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(13.dp)) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    LinkDetailCell("TYPE", type, Modifier.weight(1f))
                    LinkDetailCell("DOMAIN", domain, Modifier.weight(1f))
                }
            }

            item { Spacer(Modifier.height(13.dp)) }
            item {
                ZoneCard(padding = PaddingValues(14.dp)) {
                    MonoLabel("The full address", color = ZoneTheme.colors.inkSoft)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        link.url,
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.ink,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(Modifier.height(6.dp))
                    MonoLabel("Saved ${ZoneDates.prettyDate(link.saved)}")
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneButton(
                    "Open $domain",
                    onClick = { ZoneIntents.openUrl(context, link.url) },
                    icon = Icons.Outlined.OpenInNew
                )
            }
            item { Spacer(Modifier.height(8.dp)) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ZoneGhostButton(
                        "Copy link",
                        { ZoneIntents.copy(context, "Link", link.url) },
                        Modifier.weight(1f),
                        icon = Icons.Outlined.ContentCopy
                    )
                    ZoneGhostButton(
                        "Share",
                        {
                            ZoneIntents.share(
                                context,
                                link.title.ifBlank { domain },
                                listOf(link.title, link.url, link.note).filter { it.isNotBlank() }.joinToString("\n\n")
                            )
                        },
                        Modifier.weight(1f),
                        icon = Icons.Outlined.Share
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                Text(
                    "Remove this link",
                    style = ZoneType.monoSmall,
                    color = ZoneTheme.colors.accent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { confirmDelete = true }
                        .padding(12.dp),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun DarkTag(tag: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(9.dp))
            .background(Color.White.copy(alpha = 0.08f))
            .padding(horizontal = 9.dp, vertical = 4.dp)
    ) {
        Text("#$tag", style = ZoneType.monoSmall.copy(fontSize = 8.5.sp), color = LinkMint)
    }
}

@Composable
private fun LinkDetailCell(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(ZoneTheme.colors.raised)
            .border(1.dp, ZoneTheme.colors.line, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 9.dp)
    ) {
        MonoLabel(label)
        Spacer(Modifier.height(3.dp))
        Text(
            value,
            style = ZoneType.body.copy(fontSize = 11.5.sp),
            color = ZoneTheme.colors.ink,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun LinkToggle(checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Box(
        Modifier
            .width(44.dp)
            .height(26.dp)
            .clip(CircleShape)
            .background(if (checked) ZoneTheme.colors.sand else ZoneTheme.colors.line)
            .clickable { onCheckedChange(!checked) }
            .padding(3.dp),
        contentAlignment = if (checked) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        Box(
            Modifier
                .size(20.dp)
                .clip(CircleShape)
                .background(ZoneTheme.colors.paper)
        )
    }
}

private fun linkType(url: String): String {
    val value = url.lowercase(Locale.ENGLISH)
    return when {
        "essay" in value || "blog" in value -> "Essay"
        "docs" in value || "documentation" in value -> "Docs"
        "github" in value -> "Repository"
        "youtube" in value || "vimeo" in value || "video" in value -> "Video"
        "podcast" in value -> "Podcast"
        "pdf" in value || "paper" in value -> "Paper"
        "producthunt" in value || "tool" in value -> "Tool"
        else -> "Link"
    }
}
