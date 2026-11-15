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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Share
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.Subscription
import com.zone.desk.domain.monthlyOf
import com.zone.desk.domain.subscriptionSummary
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneChip
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDateField
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZonePicker
import com.zone.desk.ui.components.ZoneProgress
import com.zone.desk.ui.components.ZoneSegmented
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneGhostButton
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneIntents
import com.zone.desk.util.ZoneMoney
import java.time.LocalDate
import kotlin.math.abs

private val subscriptionCategories = listOf("Video", "Music", "Software", "News", "Health", "Storage", "Other")

@Composable
fun SubscriptionsScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onCalendar: () -> Unit,
    onEdit: (String) -> Unit
) {
    val subscriptions by vm.subscriptions.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val summary = subscriptionSummary(subscriptions)

    ZoneDetailScaffold(
        title = "Subscriptions",
        onBack = onBack,
        actions = {
            IconButton(onClick = onCalendar) {
                Icon(Icons.Outlined.CalendarMonth, contentDescription = "Calendar", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(19.dp))
            }
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
                    MonoLabel("Library \u00B7 subscriptions")
                    Spacer(Modifier.height(10.dp))
                    Text("Normalised burn.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${ZoneMoney.money(summary.monthly, currency)} a month \u00B7 ${ZoneMoney.money(summary.annual, currency)} a year, normalised.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = summary.active.toString(),
                            label = "Active plans",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                        )
                        ZoneStat(
                            value = summary.paused.toString(),
                            label = "Paused",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                        )
                        ZoneStat(
                            value = ZoneMoney.compact(summary.annual, currency),
                            label = "A year",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 23.sp)
                        )
                    }
                }
            }
            if (summary.next != null) {
                item { Spacer(Modifier.height(14.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), onClick = { onEdit(summary.next!!.id) }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel("Next on the calendar", color = ZoneTheme.colors.accent)
                            Spacer(Modifier.weight(1f))
                            MonoLabel(ZoneDates.relative(summary.next!!.next))
                        }
                        Spacer(Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                summary.next!!.name,
                                style = ZoneType.headline.copy(fontSize = 22.sp),
                                color = ZoneTheme.colors.ink,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                ZoneMoney.money(summary.next!!.amount, currency),
                                style = ZoneType.number.copy(fontSize = 23.sp),
                                color = ZoneTheme.colors.ink
                            )
                        }
                        Spacer(Modifier.height(3.dp))
                        MonoLabel("${summary.next!!.category} \u00B7 ${ZoneDates.prettyDate(summary.next!!.next)}")
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("The calendar", trailing = "${summary.thisWeek.size} this week") }
            item {
                if (summary.thisWeek.isEmpty()) {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Text("Nothing charges this week.", style = ZoneType.body, color = ZoneTheme.colors.inkSoft)
                    }
                } else {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                        summary.thisWeek.forEachIndexed { index, sub ->
                            if (index > 0) Rule()
                            ChargeRow(sub, currency, onClick = { onEdit(sub.id) })
                        }
                    }
                }
            }
            if (summary.byCategory.isNotEmpty()) {
                item { Spacer(Modifier.height(18.dp)) }
                item { SectionLabel("Where it goes", trailing = "per month") }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        val max = summary.byCategory.maxOf { it.second }.takeIf { it > 0 } ?: 1.0
                        summary.byCategory.forEachIndexed { index, (category, amount) ->
                            if (index > 0) Spacer(Modifier.height(9.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(category, style = ZoneType.bodySmall, color = ZoneTheme.colors.ink, modifier = Modifier.weight(1f))
                                MonoLabel(ZoneMoney.money(amount, currency))
                            }
                            Spacer(Modifier.height(3.dp))
                            ZoneProgress((amount / max).toFloat(), height = 3.dp, color = ZoneTheme.colors.sage)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("The plans", trailing = "${subscriptions.size} total") }
            if (subscriptions.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "No subscriptions tracked.",
                        body = "Add the quiet monthly lines. Zone normalises the cycles to one honest number.",
                        actionLabel = "Add a subscription",
                        onAction = onNew
                    )
                }
            } else {
                items(subscriptions.sortedBy { it.status == "Paused" }, key = { it.id }) { sub ->
                    SubscriptionRow(
                        sub = sub,
                        currency = currency,
                        onClick = { onEdit(sub.id) },
                        onToggle = { vm.toggleSubscriptionPaused(sub.id) },
                        onDelete = { vm.deleteSubscription(sub.id) }
                    )
                    Rule(Modifier.padding(horizontal = 20.dp))
                }
                item { Spacer(Modifier.height(12.dp)) }
                item { ZoneButton("Add a subscription", onNew, modifier = Modifier.padding(horizontal = 20.dp)) }
            }
            item { Spacer(Modifier.height(10.dp)) }
            item {
                Text(
                    "Yearly plans are divided by twelve. Weekly plans are multiplied by fifty-two, then divided by twelve.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}

@Composable
private fun ChargeRow(sub: Subscription, currency: String, onClick: (() -> Unit)? = null) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 14.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .clip(RoundedCornerShape(6.dp))
                .background(ZoneTheme.colors.deep)
                .padding(horizontal = 8.dp, vertical = 5.dp)
        ) {
            MonoLabel(ZoneDates.shortDate(sub.next).uppercase())
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(sub.name, style = ZoneType.body, color = ZoneTheme.colors.ink)
            MonoLabel(sub.category)
        }
        Text(ZoneMoney.money(sub.amount, currency), style = ZoneType.body, color = ZoneTheme.colors.ink)
    }
}

@Composable
private fun SubscriptionRow(
    sub: Subscription,
    currency: String,
    onClick: () -> Unit,
    onToggle: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(34.dp)
                .clip(CircleShape)
                .background(if (sub.status == "Paused") ZoneTheme.colors.deep else ZoneTheme.colors.accentSoft),
            contentAlignment = Alignment.Center
        ) {
            Text(
                sub.name.take(1).uppercase(),
                style = ZoneType.monoBig.copy(fontSize = 14.sp),
                color = if (sub.status == "Paused") ZoneTheme.colors.muted else ZoneTheme.colors.accent
            )
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                sub.name,
                style = ZoneType.body,
                color = if (sub.status == "Paused") ZoneTheme.colors.muted else ZoneTheme.colors.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            MonoLabel("${sub.category} \u00B7 ${sub.cycle.lowercase()} \u00B7 next ${ZoneDates.relativeShort(sub.next)}")
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                ZoneMoney.money(monthlyOf(sub), currency),
                style = ZoneType.body,
                color = if (sub.status == "Paused") ZoneTheme.colors.muted else ZoneTheme.colors.ink
            )
            MonoLabel("/ month", maxLines = 1)
        }
        Spacer(Modifier.width(4.dp))
        IconButton(onClick = onDelete, modifier = Modifier.size(30.dp)) {
            Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = ZoneTheme.colors.muted, modifier = Modifier.size(14.dp))
        }
    }
}

@Composable
fun SubscriptionFormScreen(
    vm: ZoneViewModel,
    subId: String?,
    onBack: () -> Unit
) {
    val subscriptions by vm.subscriptions.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val sub = remember(subscriptions, subId) { subscriptions.firstOrNull { it.id == subId } }
    val editing = subId != null
    var hydrated by rememberSaveable(subId) { mutableStateOf(!editing) }
    var name by rememberSaveable(subId) { mutableStateOf(sub?.name ?: "") }
    var amount by rememberSaveable(subId) { mutableStateOf(sub?.amount?.takeIf { it > 0 }?.toString() ?: "") }
    var cycle by rememberSaveable(subId) { mutableStateOf(sub?.cycle ?: "Monthly") }
    var next by rememberSaveable(subId) { mutableStateOf(sub?.next ?: ZoneDates.today()) }
    var category by rememberSaveable(subId) { mutableStateOf(sub?.category ?: "Other") }
    var status by rememberSaveable(subId) { mutableStateOf(sub?.status ?: "Active") }
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(sub) {
        if (!hydrated && sub != null) {
            name = sub.name
            amount = sub.amount.toString()
            cycle = sub.cycle
            next = sub.next
            category = sub.category
            status = sub.status
            hydrated = true
        }
    }

    if (confirmDelete && sub != null) {
        ZoneConfirmDialog(
            title = "Remove this subscription?",
            body = "The monthly line will leave the burn.",
            onConfirm = {
                confirmDelete = false
                vm.deleteSubscription(sub.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    val parsed = amount.toDoubleOrNull() ?: 0.0
    val monthly = when (cycle) {
        "Yearly" -> parsed / 12.0
        "Weekly" -> parsed * 52.0 / 12.0
        else -> parsed
    }
    val valid = name.isNotBlank() && parsed > 0

    ZoneEditorScaffold(
        title = if (editing) "Edit subscription" else "Add a subscription",
        onCancel = onBack,
        onSave = {
            vm.saveSubscription(
                Subscription(
                    id = sub?.id.orEmpty(),
                    name = name,
                    amount = parsed,
                    cycle = cycle,
                    next = next,
                    category = category,
                    status = status
                )
            )
            onBack()
        },
        saveEnabled = valid
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Library \u00B7 subscriptions", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(8.dp))
                Text("Another monthly line.", style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Normalised to one honest number \u2014 the quiet monthly cost of it all.",
                    style = ZoneType.body,
                    color = ZoneTheme.colors.inkSoft
                )
            }
            item { Spacer(Modifier.height(16.dp)) }
            item { ZoneField(name, { name = it }, "Service", placeholder = "Figma, Netflix, Spotify\u2026") }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneField(
                    amount,
                    { amount = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    "Amount per charge",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    supporting = if (parsed > 0) "${ZoneMoney.money(parsed, currency)} per charge" else null
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                MonoLabel("Cycle")
                Spacer(Modifier.height(6.dp))
                ZoneSegmented(listOf("Monthly", "Yearly", "Weekly"), cycle, onSelect = { cycle = it })
            }
            item { Spacer(Modifier.height(14.dp)) }
            item { ZoneDateField(next, { next = it }, "Next charge") }
            item { Spacer(Modifier.height(14.dp)) }
            item { ZonePicker("Category", category, subscriptionCategories, { category = it }) }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                MonoLabel("Status")
                Spacer(Modifier.height(6.dp))
                ZoneSegmented(listOf("Active", "Paused"), status, onSelect = { status = it })
                Spacer(Modifier.height(5.dp))
                Text(
                    "Paused plans stay on the shelf, but not in the burn.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted
                )
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneCard(padding = PaddingValues(14.dp)) {
                    MonoLabel("Monthly share", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        "${ZoneMoney.money(monthly, currency)} / month",
                        style = ZoneType.number.copy(fontSize = 26.sp),
                        color = ZoneTheme.colors.ink
                    )
                    Spacer(Modifier.height(3.dp))
                    Text(
                        "Yearly plans are divided by twelve. Weekly plans are multiplied by fifty-two, then divided by twelve.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton(
                    if (editing) "Save subscription" else "Add subscription",
                    onClick = {
                        vm.saveSubscription(
                            Subscription(
                                id = sub?.id.orEmpty(),
                                name = name,
                                amount = parsed,
                                cycle = cycle,
                                next = next,
                                category = category,
                                status = status
                            )
                        )
                        onBack()
                    },
                    enabled = valid
                )
            }
            if (editing && sub != null) {
                item { Spacer(Modifier.height(8.dp)) }
                item {
                    Text(
                        "Remove this subscription",
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
}

@Composable
fun SubscriptionCalendarScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit
) {
    val subscriptions by vm.subscriptions.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val currency = settings.currency
    val month = ZoneDates.currentMonth()
    val charges = subscriptions.filter { it.status != "Paused" && it.next.startsWith(month) }
    val total = charges.sumOf { it.amount }
    val byDay = charges.groupBy { ZoneDates.parse(it.next)?.dayOfMonth }
    val dates = ZoneDates.monthDates(month)
    val cells: List<LocalDate?> = List(ZoneDates.firstDayOffset(month)) { null } + dates
    val rows = cells.chunked(7)

    ZoneDetailScaffold(
        title = "Calendar",
        onBack = onBack,
        actions = {
            IconButton(onClick = {
                val rowsCsv = mutableListOf(listOf("Date", "Service", "Category", "Amount", "Cycle"))
                charges.sortedBy { it.next }.forEach { sub ->
                    rowsCsv += listOf(sub.next, sub.name, sub.category, sub.amount.toString(), sub.cycle)
                }
                ZoneIntents.share(context, "${ZoneDates.monthLabel(month)} subscriptions", ZoneMoney.csv(rowsCsv))
            }) {
                Icon(Icons.Outlined.Share, contentDescription = "Export CSV", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
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
                    MonoLabel("What's next \u00B7 ${ZoneDates.monthLabel(month)}")
                    Spacer(Modifier.height(9.dp))
                    Text("The calendar.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${charges.size} charges \u00B7 ${ZoneMoney.money(total, currency)} due this month.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row(Modifier.fillMaxWidth()) {
                        listOf("MO", "TU", "WE", "TH", "FR", "SA", "SU").forEach { day ->
                            Text(
                                day,
                                style = ZoneType.monoSmall.copy(fontSize = 8.sp),
                                color = ZoneTheme.colors.muted,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                    rows.forEach { week ->
                        Row(Modifier.fillMaxWidth()) {
                            week.forEach { date ->
                                Box(
                                    Modifier
                                        .weight(1f)
                                        .height(42.dp)
                                        .padding(2.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (date != null) {
                                        val dayCharges = byDay[date.dayOfMonth].orEmpty()
                                        val has = dayCharges.isNotEmpty()
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Box(
                                                Modifier
                                                    .size(26.dp)
                                                    .clip(CircleShape)
                                                    .background(if (has) ZoneTheme.colors.accentSoft else Color.Transparent)
                                                    .then(if (date.toString() == ZoneDates.today()) Modifier.background(ZoneTheme.colors.ink, CircleShape) else Modifier),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(
                                                    date.dayOfMonth.toString(),
                                                    style = ZoneType.monoSmall.copy(fontSize = 8.sp),
                                                    color = if (date.toString() == ZoneDates.today()) ZoneTheme.colors.paper else if (has) ZoneTheme.colors.accent else ZoneTheme.colors.muted
                                                )
                                            }
                                            if (has) {
                                                Box(
                                                    Modifier
                                                        .padding(top = 1.dp)
                                                        .size(3.dp)
                                                        .clip(CircleShape)
                                                        .background(ZoneTheme.colors.accent)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Due this month", trailing = "${charges.size} charges") }
            if (charges.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "The month is clear.",
                        body = "No subscription charges land this month.",
                        actionLabel = "Add a subscription",
                        onAction = onNew
                    )
                }
            } else {
                items(charges.sortedBy { it.next }, key = { it.id }) { sub ->
                    ChargeRow(sub, currency)
                    Rule(Modifier.padding(horizontal = 20.dp))
                }
                item { Spacer(Modifier.height(12.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel("Due this month", color = ZoneTheme.colors.inkSoft)
                            Spacer(Modifier.weight(1f))
                            Text(
                                ZoneMoney.money(total, currency),
                                style = ZoneType.number.copy(fontSize = 24.sp),
                                color = ZoneTheme.colors.ink
                            )
                        }
                        Spacer(Modifier.height(3.dp))
                        MonoLabel("${charges.size} charges")
                    }
                }
            }
        }
    }
}
