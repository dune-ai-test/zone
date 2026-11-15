package com.zone.desk.ui.screens

import android.content.ClipboardManager
import android.content.Context
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
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.AuditEvent
import com.zone.desk.data.prefs.ZonePreferences
import com.zone.desk.data.sync.SyncPhase
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.CheckCircle
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneChip
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZoneGhostButton
import com.zone.desk.ui.components.ZoneInfoRow
import com.zone.desk.ui.components.ZoneNavRow
import com.zone.desk.ui.components.ZonePicker
import com.zone.desk.ui.components.ZoneRootHeader
import com.zone.desk.ui.components.ZoneSearchField
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTabScaffold
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneNight
import com.zone.desk.ui.theme.ZoneNightLine
import com.zone.desk.ui.theme.ZoneNightRaised
import com.zone.desk.ui.theme.ZonePaper
import com.zone.desk.ui.theme.ZonePaperRaised
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneIntents
import com.zone.desk.util.ZoneMoney
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.Locale

/* =========================================================================
   Settings — the quiet control room.
   ========================================================================= */

@Composable
fun SettingsScreen(
    vm: ZoneViewModel,
    onSelectTab: (String) -> Unit,
    onOpenAdmin: () -> Unit,
    onActivity: () -> Unit
) {
    val settings by vm.settings.collectAsStateWithLifecycle()
    val prefs by vm.prefs.collectAsStateWithLifecycle()
    val sync by vm.syncState.collectAsStateWithLifecycle()
    val pending by vm.pendingAudit.collectAsStateWithLifecycle()
    val sections by vm.cachedSections.collectAsStateWithLifecycle()
    val unlocked by vm.adminUnlocked.collectAsStateWithLifecycle()
    val records = rememberWorkspaceRecordCount(vm)
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var apiField by rememberSaveable { mutableStateOf("") }
    var hydrated by rememberSaveable { mutableStateOf(false) }
    var confirmRestore by remember { mutableStateOf(false) }
    var restoring by remember { mutableStateOf(false) }

    LaunchedEffect(prefs.apiBase) {
        if (!hydrated) {
            apiField = prefs.apiBase
            hydrated = true
        }
    }

    if (confirmRestore) {
        ZoneConfirmDialog(
            title = "Restore from clipboard?",
            body = "The copied backup replaces matching workspace sections. Changes on this device are kept and pushed next sync.",
            confirmLabel = "Restore",
            dismissLabel = "Cancel",
            onConfirm = {
                confirmRestore = false
                val text = readClipboard(context)
                if (text == null) {
                    vm.announce("The clipboard is empty.")
                } else {
                    restoring = true
                    scope.launch {
                        val result = vm.importBackup(text)
                        restoring = false
                        vm.announce(
                            result.fold(
                                onSuccess = { count -> "Restored $count workspace sections." },
                                onFailure = { error -> error.message ?: "That backup could not be restored." }
                            )
                        )
                        if (result.isSuccess) vm.syncNow()
                    }
                }
            },
            onDismiss = { confirmRestore = false }
        )
    }

    ZoneTabScaffold(current = Routes.SETTINGS, onSelectTab = onSelectTab) { inner ->
        LazyColumn(
            Modifier
                .fillMaxSize()
                .padding(inner),
            contentPadding = PaddingValues(bottom = 30.dp)
        ) {
            item {
                ZoneRootHeader(
                    eyebrow = "System \u00B7 settings",
                    title = "The desk, as you like it.",
                    subtitle = "Warm paper or dark, one display currency, and a workspace kept both here and in D1."
                )
            }

            item { SectionLabel("Appearance", trailing = settings.theme) }
            item {
                Row(
                    Modifier.padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    themeOptions.forEach { option ->
                        ThemePreviewCard(
                            value = option.first,
                            label = option.second,
                            selected = settings.theme == option.first,
                            onClick = { vm.setTheme(option.first) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
            item { SectionLabel("Money & currency", trailing = "Display only") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    ZonePicker(
                        label = "Display currency",
                        value = "${settings.currency} \u00B7 ${ZoneMoney.info(settings.currency).label}",
                        options = ZoneMoney.currencies.map { "${it.code} \u00B7 ${it.label}" },
                        onSelect = { choice -> vm.setCurrency(choice.substringBefore(" ").trim()) }
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel("Preview", color = ZoneTheme.colors.inkSoft)
                        Spacer(Modifier.weight(1f))
                        Text(
                            ZoneMoney.money(11_283_450.0, settings.currency),
                            style = ZoneType.number.copy(fontSize = 23.sp),
                            color = ZoneTheme.colors.ink
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Amounts are stored as plain numbers. Changing the display currency never converts or rewrites a value.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
            item { SectionLabel("Workspace", trailing = syncLabel(sync.phase)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(syncColor(sync.phase))
                        )
                        Spacer(Modifier.width(8.dp))
                        MonoLabel(syncLabel(sync.phase), color = ZoneTheme.colors.inkSoft)
                        Spacer(Modifier.weight(1f))
                        MonoLabel(lastSyncLabel(prefs.lastSync), color = ZoneTheme.colors.muted)
                    }
                    Spacer(Modifier.height(5.dp))
                    Text(
                        sync.message,
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (sync.pendingWrites > 0) {
                        Spacer(Modifier.height(4.dp))
                        MonoLabel("${sync.pendingWrites} local ${if (sync.pendingWrites == 1) "write" else "writes"} queued", color = ZoneTheme.colors.accent)
                    }
                    Spacer(Modifier.height(12.dp))
                    ZoneField(
                        apiField,
                        { apiField = it },
                        "Workspace URL",
                        placeholder = "https://your-project.pages.dev",
                        keyboardType = KeyboardType.Uri,
                        supporting = if (prefs.apiBase.isBlank()) "Local only until a Pages workspace is connected." else "Connected to ${prefs.apiBase}"
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ZoneGhostButton(
                            "Save workspace",
                            {
                                vm.setApiBase(apiField) { ok, message ->
                                    if (ok) apiField = ZonePreferences.normalizeApiBase(apiField)
                                    vm.announce(message)
                                }
                            },
                            Modifier.weight(1f)
                        )
                        ZoneGhostButton(
                            "Sync now",
                            { vm.syncNow() },
                            Modifier.weight(1f),
                            icon = Icons.Outlined.Refresh
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Point this at your Cloudflare Pages project. Zone appends /api and uses the existing bootstrap, data, audit, and admin routes.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.muted
                    )
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
            item { SectionLabel("Back office", trailing = if (unlocked) "Unlocked" else "Locked") }
            item {
                Column(
                    Modifier
                        .padding(horizontal = 20.dp)
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF141310))
                        .clickable(onClick = onOpenAdmin)
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(11.dp))
                                .background(Color(0xFF2A2620)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Outlined.Lock,
                                contentDescription = null,
                                tint = ZonePaper,
                                modifier = Modifier.size(19.dp)
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                if (unlocked) "Back office" else "Unlock the back office",
                                style = ZoneType.body.copy(fontSize = 13.5.sp),
                                color = ZonePaper
                            )
                            Spacer(Modifier.height(2.dp))
                            Text(
                                if (unlocked) "Session active \u00B7 review the queue" else "Reviews, audit trail, backups, export",
                                style = ZoneType.monoSmall.copy(fontSize = 7.5.sp),
                                color = Color(0xFF989284)
                            )
                        }
                        if (pending > 0) {
                            Box(
                                Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .background(ZoneTheme.colors.accent),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("$pending", style = ZoneType.monoSmall, color = ZonePaper)
                            }
                        } else {
                            MonoLabel("Open", color = Color(0xFF989284))
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Every change lands live and leaves a receipt. Approve the ones you trust, restore the ones you do not.",
                        style = ZoneType.bodySmall,
                        color = Color(0xFFBDB6A6)
                    )
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                    ZoneNavRow(
                        title = "Activity trail",
                        meta = "Every add, edit, delete, and restore \u00B7 searchable",
                        trailing = "Open",
                        onClick = onActivity
                    )
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
            item { SectionLabel("Backups", trailing = "JSON") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                    ZoneNavRow(
                        title = "Export a backup",
                        meta = "The whole workspace as one JSON file",
                        trailing = "Share",
                        onClick = {
                            scope.launch {
                                ZoneIntents.share(context, "Zone backup", vm.backupJson())
                            }
                        }
                    )
                    Rule()
                    ZoneNavRow(
                        title = "Restore from clipboard",
                        meta = if (restoring) "Restoring\u2026" else "Copy a backup, then bring the sections back",
                        trailing = "Restore",
                        onClick = { if (!restoring) confirmRestore = true }
                    )
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
            item {
                Text(
                    "Backups contain the same JSON documents D1 holds. The audit trail is never included in a restore.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }

            item { Spacer(Modifier.height(16.dp)) }
            item { SectionLabel("About", trailing = "Zone. V2.0") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Text("Zone.", style = ZoneType.headline.copy(fontSize = 22.sp), color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(2.dp))
                    MonoLabel("Personal utilities \u00B7 living colour")
                    Spacer(Modifier.height(10.dp))
                    ZoneInfoRow("Version", "v2.0 \u00B7 Living colour")
                    Rule()
                    ZoneInfoRow("Storage", "$sections sections cached in Room")
                    Rule()
                    ZoneInfoRow("Records", "$records across 12 tools")
                    Rule()
                    ZoneInfoRow("Sync", syncLabel(sync.phase), note = if (prefs.apiBase.isBlank()) "No workspace connected" else prefs.apiBase, valueColor = syncColor(sync.phase))
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                Text(
                    "Kept quietly in your workspace. ${if (settings.currency.isNotBlank()) "Amounts are shown in ${ZoneMoney.info(settings.currency).label}." else ""}",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}

private val themeOptions = listOf(
    "light" to "Light",
    "dark" to "Dark",
    "system" to "System"
)

@Composable
private fun ThemePreviewCard(
    value: String,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(12.dp)
    Column(
        modifier
            .clip(shape)
            .background(ZoneTheme.colors.raised)
            .border(
                if (selected) 1.5.dp else 1.dp,
                if (selected) ZoneTheme.colors.accent else ZoneTheme.colors.line,
                shape
            )
            .clickable(onClick = onClick)
            .padding(8.dp)
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(46.dp)
                .clip(RoundedCornerShape(7.dp))
                .background(ZoneTheme.colors.deep)
        ) {
            when (value) {
                "light" -> MiniThemePreview(ZonePaper, ZonePaperRaised, ZoneTheme.colors.line)
                "dark" -> MiniThemePreview(ZoneNight, ZoneNightRaised, ZoneNightLine)
                else -> Row(Modifier.fillMaxSize()) {
                    Box(Modifier.weight(1f).fillMaxSize()) {
                        MiniThemePreview(ZonePaper, ZonePaperRaised, ZoneTheme.colors.line)
                    }
                    Box(Modifier.weight(1f).fillMaxSize()) {
                        MiniThemePreview(ZoneNight, ZoneNightRaised, ZoneNightLine)
                    }
                }
            }
        }
        Spacer(Modifier.height(7.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(13.dp)
                    .clip(CircleShape)
                    .border(1.dp, if (selected) ZoneTheme.colors.accent else ZoneTheme.colors.line, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (selected) {
                    Box(
                        Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(ZoneTheme.colors.accent)
                    )
                }
            }
            Spacer(Modifier.width(5.dp))
            Text(label, style = ZoneType.bodySmall, color = ZoneTheme.colors.ink)
        }
    }
}

@Composable
private fun MiniThemePreview(background: Color, card: Color, line: Color) {
    Box(
        Modifier
            .fillMaxSize()
            .background(background)
            .padding(7.dp)
    ) {
        Box(
            Modifier
                .fillMaxWidth(0.78f)
                .height(16.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(card)
                .border(1.dp, line, RoundedCornerShape(3.dp))
                .align(Alignment.TopStart)
        )
        Box(
            Modifier
                .fillMaxWidth(0.47f)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(line)
                .align(Alignment.BottomStart)
        )
        Box(
            Modifier
                .width(14.dp)
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(ZoneTheme.colors.accent)
                .align(Alignment.BottomEnd)
        )
    }
}

/* =========================================================================
   Admin — the review desk.
   ========================================================================= */

@Composable
fun AdminScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onUnlock: () -> Unit,
    onActivity: () -> Unit
) {
    val unlocked by vm.adminUnlocked.collectAsStateWithLifecycle()
    val events by vm.auditEvents.collectAsStateWithLifecycle()
    val admin by vm.admin.collectAsStateWithLifecycle()
    val records = rememberWorkspaceRecordCount(vm)

    val pendingEvents = events.filter { it.status == "pending" }.sortedByDescending { it.at }
    val approved = events.count { it.status == "approved" }
    val today = ZoneDates.today()
    val changesToday = events.count { auditDate(it.at) == today }

    ZoneDetailScaffold(
        title = "Back office",
        onBack = onBack,
        actions = {
            Text(
                "Trail",
                style = ZoneType.mono,
                color = ZoneTheme.colors.accent,
                modifier = Modifier
                    .clickable(onClick = onActivity)
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            )
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            if (!unlocked) {
                item {
                    Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp)) {
                        MonoLabel("Restricted zone \u00B7 restricted access", color = ZoneTheme.colors.accent)
                        Spacer(Modifier.height(9.dp))
                        Text("Every change has a receipt.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                        Spacer(Modifier.height(7.dp))
                        Text(
                            "The back office is the quiet half of Zone. Approve the changes you trust, restore the ones you do not.",
                            style = ZoneType.body,
                            color = ZoneTheme.colors.inkSoft
                        )
                        Spacer(Modifier.height(14.dp))
                        Row {
                            ZoneStat(
                                value = pendingEvents.size.toString(),
                                label = "Awaiting review",
                                modifier = Modifier.weight(1f),
                                valueStyle = ZoneType.number.copy(fontSize = 28.sp)
                            )
                            ZoneStat(
                                value = events.size.toString(),
                                label = "Receipts kept",
                                modifier = Modifier.weight(1f),
                                valueStyle = ZoneType.number.copy(fontSize = 28.sp)
                            )
                        }
                    }
                }
                item { Spacer(Modifier.height(18.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                        AdminRuleRow("01", "Review every workspace change")
                        Rule()
                        AdminRuleRow("02", "Restore the previous version")
                        Rule()
                        AdminRuleRow("03", "Keep the full activity trail")
                    }
                }
                item { Spacer(Modifier.height(16.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .size(42.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(ZoneTheme.colors.accentSoft),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Outlined.Lock,
                                    contentDescription = null,
                                    tint = ZoneTheme.colors.accent,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                MonoLabel("Admin access", color = ZoneTheme.colors.accent)
                                Spacer(Modifier.height(3.dp))
                                Text("The desk is locked.", style = ZoneType.headline.copy(fontSize = 22.sp), color = ZoneTheme.colors.ink)
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        Text(
                            "Enter the admin password configured for this Cloudflare Pages project. The password is checked by a Pages Function and is never stored on this device.",
                            style = ZoneType.bodySmall,
                            color = ZoneTheme.colors.inkSoft
                        )
                        Spacer(Modifier.height(14.dp))
                        ZoneButton("Unlock the back office", onUnlock, icon = Icons.Outlined.Lock)
                        Spacer(Modifier.height(8.dp))
                        MonoLabel("Admin_password \u00B7 set in Cloudflare Pages", maxLines = 2)
                    }
                }
                item { Spacer(Modifier.height(16.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                        ZoneNavRow(
                            title = "Read the activity trail",
                            meta = "Every receipt is public to this device",
                            trailing = "Open",
                            onClick = onActivity
                        )
                    }
                }
            } else {
                item {
                    Row(
                        Modifier
                            .padding(horizontal = 20.dp)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(ZoneTheme.colors.deep)
                            .padding(horizontal = 12.dp, vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(ZoneTheme.colors.sage)
                        )
                        Spacer(Modifier.width(8.dp))
                        MonoLabel("Operator session active", color = ZoneTheme.colors.inkSoft)
                        Spacer(Modifier.weight(1f))
                        Text(
                            "Lock now",
                            style = ZoneType.monoSmall,
                            color = ZoneTheme.colors.accent,
                            modifier = Modifier
                                .clickable { vm.logout() }
                                .padding(5.dp)
                        )
                    }
                }
                item { Spacer(Modifier.height(14.dp)) }
                item {
                    Column(Modifier.padding(horizontal = 20.dp)) {
                        MonoLabel("Back office")
                        Spacer(Modifier.height(9.dp))
                        Text("The review desk.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                        Spacer(Modifier.height(7.dp))
                        Text(
                            "Every change lands live, then waits here for a decision. Approve keeps it. Reject writes the previous version back.",
                            style = ZoneType.body,
                            color = ZoneTheme.colors.inkSoft
                        )
                    }
                }
                item { Spacer(Modifier.height(16.dp)) }
                item {
                    Row(Modifier.padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ZoneCard(Modifier.weight(1f), padding = PaddingValues(14.dp)) {
                            ZoneStat(
                                value = pendingEvents.size.toString(),
                                label = "Awaiting review",
                                note = "pending",
                                valueStyle = ZoneType.number.copy(fontSize = 25.sp),
                                accent = pendingEvents.isNotEmpty()
                            )
                        }
                        ZoneCard(Modifier.weight(1f), padding = PaddingValues(14.dp)) {
                            ZoneStat(
                                value = changesToday.toString(),
                                label = "Changes today",
                                note = "landed live",
                                valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                            )
                        }
                    }
                }
                item { Spacer(Modifier.height(8.dp)) }
                item {
                    Row(Modifier.padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ZoneCard(Modifier.weight(1f), padding = PaddingValues(14.dp)) {
                            ZoneStat(
                                value = approved.toString(),
                                label = "Approved",
                                note = "kept",
                                valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                            )
                        }
                        ZoneCard(Modifier.weight(1f), padding = PaddingValues(14.dp)) {
                            ZoneStat(
                                value = records.toString(),
                                label = "Records on desk",
                                note = "12 tools",
                                valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                            )
                        }
                    }
                }

                item { Spacer(Modifier.height(18.dp)) }
                item {
                    SectionLabel(
                        "Waiting for a decision",
                        trailing = if (pendingEvents.isEmpty()) "clear" else "${pendingEvents.size} pending"
                    )
                }
                if (pendingEvents.isEmpty()) {
                    item {
                        ZoneEmptyState(
                            title = "The queue is clear.",
                            body = "Nothing is waiting for review. New changes will appear here with their receipts, ready to approve or restore.",
                            actionLabel = "Read the activity trail",
                            onAction = onActivity
                        )
                    }
                } else {
                    items(pendingEvents, key = { it.id }) { event ->
                        AuditEventCard(
                            event = event,
                            showActions = true,
                            onApprove = { vm.approveEvent(event.id) },
                            onReject = { vm.rejectEvent(event.id) }
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                }

                item { Spacer(Modifier.height(10.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Auto-approve changes", style = ZoneType.body, color = ZoneTheme.colors.ink)
                                Spacer(Modifier.height(3.dp))
                                MonoLabel("New writes become approved receipts immediately")
                            }
                            CheckCircle(
                                checked = admin.settings.autoApprove,
                                onClick = { vm.setAutoApprove(!admin.settings.autoApprove) }
                            )
                        }
                    }
                }
                item { Spacer(Modifier.height(8.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                        ZoneNavRow(
                            title = "The full activity trail",
                            meta = "${events.size} receipts \u00B7 search, filter, clear resolved",
                            trailing = "Open",
                            onClick = onActivity
                        )
                    }
                }
                item { Spacer(Modifier.height(16.dp)) }
                item {
                    Text(
                        "Every change landed live \u2014 this desk is the receipt. The trail syncs with D1 across every device.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.muted,
                        modifier = Modifier.padding(horizontal = 20.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun AdminRuleRow(number: String, text: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(number, style = ZoneType.monoSmall, color = ZoneTheme.colors.accent)
        Spacer(Modifier.width(12.dp))
        Text(text, style = ZoneType.body, color = ZoneTheme.colors.ink)
    }
}

/* =========================================================================
   Unlock the desk.
   ========================================================================= */

@Composable
fun UnlockScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onUnlocked: () -> Unit
) {
    val prefs by vm.prefs.collectAsStateWithLifecycle()
    var password by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }

    fun submit() {
        if (busy) return
        busy = true
        error = ""
        vm.login(password) { ok, message ->
            busy = false
            if (ok) {
                password = ""
                onUnlocked()
            } else {
                error = message
                vm.announce(message)
            }
        }
    }

    ZoneDetailScaffold(title = "Restricted access", onBack = onBack) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 6.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Restricted zone \u00B7 restricted access", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(10.dp))
                Text("Every change, has a receipt.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                Spacer(Modifier.height(8.dp))
                Text(
                    "The back office is the quiet half of Zone. Approve the changes you trust, restore the ones you do not.",
                    style = ZoneType.body,
                    color = ZoneTheme.colors.inkSoft
                )
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneCard(padding = PaddingValues(0.dp)) {
                    AdminRuleRow("01", "Review every workspace change")
                    Rule()
                    AdminRuleRow("02", "Restore the previous version")
                    Rule()
                    AdminRuleRow("03", "Keep the full activity trail")
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(ZoneTheme.colors.deep),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Outlined.Lock,
                                contentDescription = null,
                                tint = ZoneTheme.colors.inkSoft,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(Modifier.width(11.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    Modifier
                                        .size(7.dp)
                                        .clip(CircleShape)
                                        .background(if (prefs.hasAdminSession) ZoneTheme.colors.sage else ZoneTheme.colors.muted)
                                )
                                Spacer(Modifier.width(6.dp))
                                MonoLabel(if (prefs.hasAdminSession) "Session active" else "Panel locked")
                            }
                            Spacer(Modifier.height(3.dp))
                            MonoLabel(if (prefs.apiBase.isBlank()) "No workspace connected" else ZoneMoney.domainOf(prefs.apiBase).uppercase(Locale.ENGLISH))
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    MonoLabel("Admin access", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(4.dp))
                    Text("Unlock the desk.", style = ZoneType.headline.copy(fontSize = 24.sp), color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        "Enter the admin password configured for this Cloudflare Pages project. The password is checked by a Pages Function and is never stored in this page.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    ZoneField(
                        value = password,
                        onValueChange = { password = it },
                        label = "Admin password",
                        placeholder = "The password from ADMIN_PASSWORD",
                        keyboardType = KeyboardType.Password,
                        visualTransformation = PasswordVisualTransformation(),
                        supporting = if (prefs.apiBase.isBlank()) "Connect your workspace in Settings first." else null
                    )
                    if (error.isNotBlank()) {
                        Spacer(Modifier.height(5.dp))
                        Text(error, style = ZoneType.bodySmall, color = ZoneTheme.colors.accent)
                    }
                    Spacer(Modifier.height(14.dp))
                    ZoneButton(
                        if (busy) "Checking\u2026" else "Enter admin",
                        onClick = { submit() },
                        enabled = password.isNotBlank() && !busy && prefs.apiBase.isNotBlank(),
                        icon = Icons.Outlined.Lock
                    )
                    Spacer(Modifier.height(8.dp))
                    MonoLabel("Admin_password \u00B7 set in Cloudflare Pages", maxLines = 2)
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                Text(
                    "A session lasts as long as the Pages Function says it does. Lock the desk at any time from the review screen.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted
                )
            }
        }
    }
}

/* =========================================================================
   Activity trail.
   ========================================================================= */

@Composable
fun ActivityScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onUnlock: () -> Unit
) {
    val events by vm.auditEvents.collectAsStateWithLifecycle()
    val unlocked by vm.adminUnlocked.collectAsStateWithLifecycle()
    var search by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("All") }
    var confirmClear by remember { mutableStateOf(false) }

    val resolved = events.count { it.status != "pending" }
    val filtered = events.filter { event ->
        val text = "$search ${event.title} ${event.detail} ${event.tool} ${event.action}"
        (search.isBlank() || text.contains(search, ignoreCase = true)) && actionMatches(event, filter)
    }.sortedByDescending { it.at }

    if (confirmClear) {
        ZoneConfirmDialog(
            title = "Clear resolved receipts?",
            body = "Approved, rejected, and restored receipts will leave this device and D1. Pending changes stay in the queue.",
            confirmLabel = "Clear resolved",
            dismissLabel = "Keep",
            onConfirm = {
                confirmClear = false
                vm.clearResolved()
            },
            onDismiss = { confirmClear = false }
        )
    }

    ZoneDetailScaffold(
        title = "Activity trail",
        onBack = onBack,
        actions = {
            if (resolved > 0) {
                Text(
                    if (unlocked) "Clear resolved" else "Locked",
                    style = ZoneType.monoSmall,
                    color = if (unlocked) ZoneTheme.colors.accent else ZoneTheme.colors.muted,
                    modifier = Modifier
                        .clickable(enabled = unlocked) { confirmClear = true }
                        .padding(horizontal = 10.dp, vertical = 10.dp)
                )
            }
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            item {
                Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp)) {
                    MonoLabel("Full audit \u00B7 every receipt")
                    Spacer(Modifier.height(9.dp))
                    Text("Every receipt.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${events.size} events kept across every tool. Search a record, a tool, or a line of the story.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneSearchField(
                    search,
                    { search = it },
                    "Search activity, records, tools\u2026",
                    Modifier.padding(horizontal = 20.dp)
                )
            }
            item { Spacer(Modifier.height(10.dp)) }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("All", "Added", "Edited", "Deleted", "Restored").forEach { option ->
                        ZoneChip(
                            text = option,
                            selected = filter == option,
                            onClick = { filter = option }
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            if (filtered.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = if (events.isEmpty()) "No receipts yet." else "Nothing matches.",
                        body = if (events.isEmpty()) {
                            "The first edit will leave a receipt here, with the old value kept safely behind it."
                        } else {
                            "Try another search or filter. The trail keeps every add, edit, delete, and restore."
                        }
                    )
                }
            } else {
                items(filtered, key = { it.id }) { event ->
                    AuditEventCard(
                        event = event,
                        showActions = false,
                        onApprove = {},
                        onReject = {}
                    )
                    Spacer(Modifier.height(8.dp))
                }
            }
            if (!unlocked && resolved > 0) {
                item { Spacer(Modifier.height(4.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Text(
                            "The trail is readable without a session. Unlock the back office to clear resolved receipts.",
                            style = ZoneType.bodySmall,
                            color = ZoneTheme.colors.inkSoft
                        )
                        Spacer(Modifier.height(10.dp))
                        ZoneGhostButton("Unlock the back office", onUnlock, icon = Icons.Outlined.Lock)
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MonoLabel("Synced with D1 across every device", color = ZoneTheme.colors.muted)
                    Spacer(Modifier.weight(1f))
                    MonoLabel("400-event cap", color = ZoneTheme.colors.muted)
                }
            }
        }
    }
}

@Composable
private fun AuditEventCard(
    event: AuditEvent,
    showActions: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    ZoneCard(
        Modifier.padding(horizontal = 20.dp),
        padding = PaddingValues(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .clip(RoundedCornerShape(5.dp))
                    .background(ZoneTheme.colors.deep)
                    .padding(horizontal = 7.dp, vertical = 4.dp)
            ) {
                Text(
                    event.tool.uppercase(Locale.ENGLISH),
                    style = ZoneType.monoSmall.copy(fontSize = 7.5.sp),
                    color = ZoneTheme.colors.inkSoft
                )
            }
            Spacer(Modifier.width(6.dp))
            Box(
                Modifier
                    .clip(RoundedCornerShape(5.dp))
                    .background(actionColor(event).copy(alpha = 0.13f))
                    .padding(horizontal = 7.dp, vertical = 4.dp)
            ) {
                Text(
                    actionLabel(event.action),
                    style = ZoneType.monoSmall.copy(fontSize = 7.5.sp),
                    color = actionColor(event)
                )
            }
            Spacer(Modifier.weight(1f))
            MonoLabel(auditAge(event.at))
        }
        Spacer(Modifier.height(8.dp))
        Text(
            event.title.ifBlank { "Workspace change" },
            style = ZoneType.headline.copy(fontSize = 18.sp, lineHeight = 22.sp),
            color = ZoneTheme.colors.ink,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )
        if (event.detail.isNotBlank()) {
            Spacer(Modifier.height(3.dp))
            Text(
                event.detail,
                style = ZoneType.bodySmall,
                color = ZoneTheme.colors.inkSoft,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
        if (event.count > 0) {
            Spacer(Modifier.height(4.dp))
            MonoLabel(
                buildString {
                    append("${event.count} ${if (event.count == 1) "change" else "changes"}")
                    if (event.recordCount > 0) append(" across ${event.recordCount} ${if (event.recordCount == 1) "record" else "records"}")
                    if (event.restoredFrom.isNotBlank()) append(" \u00B7 restored")
                }
            )
        }
        Spacer(Modifier.height(9.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .clip(CircleShape)
                    .border(1.dp, statusColor(event).copy(alpha = 0.5f), CircleShape)
                    .padding(horizontal = 7.dp, vertical = 3.dp)
            ) {
                Text(
                    statusLabel(event),
                    style = ZoneType.monoSmall.copy(fontSize = 7.sp, letterSpacing = 0.7.sp),
                    color = statusColor(event)
                )
            }
            if (event.auto) {
                Spacer(Modifier.width(6.dp))
                MonoLabel("Auto", color = ZoneTheme.colors.muted)
            }
            Spacer(Modifier.weight(1f))
            if (showActions && event.status == "pending") {
                ReviewActionButton("Approve", primary = true, icon = Icons.Outlined.Check, onClick = onApprove)
                Spacer(Modifier.width(6.dp))
                ReviewActionButton("Reject & restore", primary = false, icon = Icons.Outlined.Close, onClick = onReject)
            }
        }
    }
}

@Composable
private fun ReviewActionButton(
    label: String,
    primary: Boolean,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Row(
        Modifier
            .clip(RoundedCornerShape(7.dp))
            .background(if (primary) ZoneTheme.colors.ink else Color.Transparent)
            .border(1.dp, if (primary) ZoneTheme.colors.ink else ZoneTheme.colors.line, RoundedCornerShape(7.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 9.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (primary) ZoneTheme.colors.paper else ZoneTheme.colors.accent,
            modifier = Modifier.size(11.dp)
        )
        Spacer(Modifier.width(4.dp))
        Text(
            label.uppercase(Locale.ENGLISH),
            style = ZoneType.monoSmall.copy(fontSize = 7.5.sp, letterSpacing = 0.5.sp),
            color = if (primary) ZoneTheme.colors.paper else ZoneTheme.colors.accent
        )
    }
}

/* =========================================================================
   Shared helpers.
   ========================================================================= */

@Composable
private fun rememberWorkspaceRecordCount(vm: ZoneViewModel): Int {
    val diary by vm.diary.collectAsStateWithLifecycle()
    val lists by vm.lists.collectAsStateWithLifecycle()
    val habits by vm.habits.collectAsStateWithLifecycle()
    val notes by vm.notes.collectAsStateWithLifecycle()
    val money by vm.money.collectAsStateWithLifecycle()
    val passbook by vm.passbook.collectAsStateWithLifecycle()
    val split by vm.split.collectAsStateWithLifecycle()
    val trips by vm.trips.collectAsStateWithLifecycle()
    val vehicles by vm.vehicles.collectAsStateWithLifecycle()
    val watchlist by vm.watchlist.collectAsStateWithLifecycle()
    val links by vm.links.collectAsStateWithLifecycle()
    val subscriptions by vm.subscriptions.collectAsStateWithLifecycle()
    return diary.size +
        lists.sumOf { list -> list.items.size + list.items.sumOf { it.children.size } } +
        habits.habits.size +
        notes.size +
        money.transactions.size +
        passbook.accounts.size +
        passbook.transactions.size +
        split.groups.size +
        trips.size +
        vehicles.size +
        watchlist.size +
        links.size +
        subscriptions.size
}

private fun syncLabel(phase: SyncPhase): String = when (phase) {
    SyncPhase.LOCAL -> "Local only"
    SyncPhase.UNCONFIGURED -> "Not connected"
    SyncPhase.SYNCING -> "Talking to D1"
    SyncPhase.SYNCED -> "In sync"
    SyncPhase.OFFLINE -> "Offline"
    SyncPhase.ERROR -> "Needs attention"
}

@Composable
private fun syncColor(phase: SyncPhase): Color = when (phase) {
    SyncPhase.SYNCED -> ZoneTheme.colors.sage
    SyncPhase.SYNCING -> ZoneTheme.colors.sand
    SyncPhase.OFFLINE, SyncPhase.ERROR -> ZoneTheme.colors.accent
    else -> ZoneTheme.colors.muted
}

private fun lastSyncLabel(millis: Long): String {
    if (millis <= 0L) return "Never synced"
    val minutes = ChronoUnit.MINUTES.between(Instant.ofEpochMilli(millis), Instant.now())
    return when {
        minutes < 1L -> "Just now"
        minutes < 60L -> "${minutes}m ago"
        minutes < 60L * 24L -> "${minutes / 60L}h ago"
        minutes < 60L * 24L * 7L -> "${minutes / (60L * 24L)}d ago"
        else -> Instant.ofEpochMilli(millis).atZone(ZoneId.systemDefault()).toLocalDate().toString()
    }
}

private fun auditAge(at: String): String {
    val instant = runCatching { Instant.parse(at) }.getOrNull() ?: return at.take(10)
    val minutes = ChronoUnit.MINUTES.between(instant, Instant.now())
    return when {
        minutes < 1L -> "now"
        minutes < 60L -> "${minutes}m"
        minutes < 60L * 24L -> "${minutes / 60L}h"
        minutes < 60L * 24L * 7L -> "${minutes / (60L * 24L)}d"
        else -> "${minutes / (60L * 24L * 7L)}w"
    }
}

private fun auditDate(at: String): String =
    runCatching { Instant.parse(at).atZone(ZoneId.systemDefault()).toLocalDate().toString() }
        .getOrElse { at.take(10) }

private fun actionLabel(action: String): String = when (action) {
    "add" -> "ADDED"
    "edit" -> "EDITED"
    "delete" -> "DELETED"
    "restore" -> "RESTORED"
    "mixed" -> "MIXED"
    else -> action.uppercase(Locale.ENGLISH)
}

@Composable
private fun actionColor(event: AuditEvent): Color = when {
    event.action == "restore" || event.restoredFrom.isNotBlank() -> ZoneTheme.colors.sand
    event.action == "add" -> ZoneTheme.colors.accent
    event.action == "delete" -> ZoneTheme.colors.clay
    event.action == "edit" -> ZoneTheme.colors.sage
    else -> ZoneTheme.colors.muted
}

private fun statusLabel(event: AuditEvent): String = when {
    event.status == "pending" -> "PENDING"
    event.status == "approved" && event.action == "restore" -> "RESTORED"
    event.status == "rejected" -> "REJECTED"
    else -> event.status.uppercase(Locale.ENGLISH)
}

@Composable
private fun statusColor(event: AuditEvent): Color = when (event.status) {
    "pending" -> ZoneTheme.colors.sand
    "approved" -> ZoneTheme.colors.sage
    "rejected" -> ZoneTheme.colors.clay
    else -> ZoneTheme.colors.muted
}

private fun actionMatches(event: AuditEvent, filter: String): Boolean = when (filter) {
    "Added" -> event.action == "add"
    "Edited" -> event.action == "edit" || event.action == "mixed"
    "Deleted" -> event.action == "delete"
    "Restored" -> event.action == "restore" || event.restoredFrom.isNotBlank()
    else -> true
}

private fun readClipboard(context: Context): String? {
    val manager = context.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager ?: return null
    val clip = manager.primaryClip ?: return null
    if (clip.itemCount == 0) return null
    return clip.getItemAt(0).text?.toString()?.takeIf { it.isNotBlank() }
}
