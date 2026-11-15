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
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.SplitExpense
import com.zone.desk.data.model.SplitGroup
import com.zone.desk.data.model.SplitMember
import com.zone.desk.domain.SplitShare
import com.zone.desk.domain.SplitSummary
import com.zone.desk.domain.SplitTransfer
import com.zone.desk.domain.splitOverall
import com.zone.desk.domain.splitSummary
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.CheckCircle
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneAreaField
import com.zone.desk.ui.components.ZoneAvatar
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDateField
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZoneGhostButton
import com.zone.desk.ui.components.ZonePicker
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTextDialog
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneMoney
import kotlin.math.abs

private val splitKinds = listOf("Home", "Trip", "Work", "Other")

private fun kindLabel(kind: String): String = when (kind.lowercase()) {
    "home" -> "Home \u00B7 rent & bills"
    "trip" -> "Trip \u00B7 travel & stays"
    "work" -> "Work \u00B7 lunches & teams"
    else -> "Other \u00B7 anything shared"
}

@Composable
fun SplitScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onGroup: (String) -> Unit
) {
    val split by vm.split.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val overall = splitOverall(split.groups)
    val transfers = split.groups.flatMap { group ->
        splitSummary(group).transfers.map { Triple(group, it, splitSummary(group)) }
    }.filter { (_, transfer, _) ->
        transfer.fromName.equals("You", true) || transfer.toName.equals("You", true)
    }

    ZoneDetailScaffold(
        title = "Split",
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
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            item {
                Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp)) {
                    MonoLabel("Overall statement")
                    Spacer(Modifier.height(10.dp))
                    Text(
                        when {
                            overall.second == 0 -> "All square."
                            overall.first > 0 -> "The table owes you ${ZoneMoney.money(abs(overall.first), currency)}."
                            else -> "You owe the table ${ZoneMoney.money(abs(overall.first), currency)}."
                        },
                        style = ZoneType.display.copy(fontSize = 34.sp, lineHeight = 37.sp),
                        color = ZoneTheme.colors.ink
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${overall.second} tables include you. Equal splits, one shortest way back to even.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Route to even", trailing = "${transfers.size} moves") }
            if (transfers.isEmpty()) {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Text(
                            if (split.groups.isEmpty()) "Start a table. Add the people and the shared costs." else "Nothing to settle. Everyone is even.",
                            style = ZoneType.body,
                            color = ZoneTheme.colors.inkSoft
                        )
                    }
                }
            } else {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                        transfers.take(6).forEachIndexed { index, (group, transfer, _) ->
                            if (index > 0) Rule()
                            TransferRow(
                                transfer = transfer,
                                groupName = group.name,
                                onSettle = {
                                    vm.settleSplit(group.id, transfer.fromId, transfer.toId, transfer.amount)
                                }
                            )
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Open tables", trailing = "${split.groups.size} tables") }
            if (split.groups.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "No tables yet.",
                        body = "Rent with flatmates, a trip split six ways, Friday lunches. One ledger per table.",
                        actionLabel = "Start a table",
                        onAction = onNew
                    )
                }
            } else {
                items(split.groups, key = { it.id }) { group ->
                    val summary = splitSummary(group)
                    GroupCard(group, summary, currency, onClick = { onGroup(group.id) })
                    Spacer(Modifier.height(8.dp))
                }
                item { Spacer(Modifier.height(6.dp)) }
                item {
                    ZoneButton("Start a table", onNew, modifier = Modifier.padding(horizontal = 20.dp))
                }
            }
            item { Spacer(Modifier.height(10.dp)) }
            item {
                Text(
                    "Money moves by mutual agreement. Zone only keeps the receipt.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}

@Composable
private fun TransferRow(transfer: SplitTransfer, groupName: String, onSettle: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                "${transfer.fromName} pays ${transfer.toName}",
                style = ZoneType.body,
                color = ZoneTheme.colors.ink
            )
            MonoLabel("${groupName} \u00B7 settles the table")
        }
        Text(ZoneMoney.money(transfer.amount, null), style = ZoneType.body, color = ZoneTheme.colors.accent)
        Spacer(Modifier.width(8.dp))
        ZoneGhostButton("Settle", onSettle)
    }
}

@Composable
private fun GroupCard(group: SplitGroup, summary: SplitSummary, currency: String, onClick: () -> Unit) {
    ZoneCard(Modifier.padding(horizontal = 20.dp), onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            MonoLabel(kindLabel(group.kind).substringBefore(" \u00B7"), color = ZoneTheme.colors.accent)
            Spacer(Modifier.weight(1f))
            MonoLabel("${group.members.size} people")
        }
        Spacer(Modifier.height(6.dp))
        Text(group.name, style = ZoneType.headline.copy(fontSize = 21.sp), color = ZoneTheme.colors.ink)
        Spacer(Modifier.height(3.dp))
        Text(
            "${ZoneMoney.money(summary.total, currency)} total \u00B7 ${summary.entries} entries",
            style = ZoneType.bodySmall,
            color = ZoneTheme.colors.inkSoft
        )
        Spacer(Modifier.height(9.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            val net = summary.yourNet
            Text(
                when {
                    net == null -> "You are not at this table"
                    abs(net) < 0.01 -> "You are even"
                    net > 0 -> "You are owed ${ZoneMoney.money(net, currency)}"
                    else -> "You owe ${ZoneMoney.money(-net, currency)}"
                },
                style = ZoneType.bodySmall,
                color = if (net != null && net > 0.01) ZoneTheme.colors.sage else ZoneTheme.colors.inkSoft
            )
            Spacer(Modifier.weight(1f))
            Text("Open table \u2192", style = ZoneType.monoSmall, color = ZoneTheme.colors.muted)
        }
    }
}

@Composable
fun SplitNewScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit
) {
    var name by rememberSaveable { mutableStateOf("") }
    var kind by rememberSaveable { mutableStateOf("Home") }
    var members by rememberSaveable { mutableStateOf("You\n") }

    val parsed = members.split("\n", ",").map { it.trim() }.filter { it.isNotBlank() }.distinct()

    ZoneEditorScaffold(
        title = "New table",
        onCancel = onBack,
        onSave = {
            vm.createGroup(name, kind, parsed)
            onBack()
        },
        saveEnabled = name.isNotBlank() && parsed.isNotEmpty()
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Money \u00B7 split", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(8.dp))
                Text("The table, squared.", style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Rent with flatmates, a trip split six ways. One ledger, one shortest way back to even.",
                    style = ZoneType.body,
                    color = ZoneTheme.colors.inkSoft
                )
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { ZoneField(name, { name = it }, "Group name", placeholder = "Goa in February") }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                MonoLabel("Kind of table")
                Spacer(Modifier.height(7.dp))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    splitKinds.forEach { option ->
                        val selected = option == kind
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (selected) ZoneTheme.colors.raised else Color.Transparent)
                                .then(Modifier)
                                .clickable { kind = option }
                                .padding(vertical = 11.dp, horizontal = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CheckCircle(checked = selected, onClick = { kind = option })
                            Spacer(Modifier.width(10.dp))
                            Text(kindLabel(option), style = ZoneType.body, color = ZoneTheme.colors.ink)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneAreaField(
                    members,
                    { members = it },
                    "Members",
                    minLines = 6,
                    supporting = "${parsed.size} people \u00B7 include yourself, one name per line"
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneCard(padding = PaddingValues(14.dp)) {
                    MonoLabel("A note on you", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        "Name yourself \u201CYou\u201D so Zone can show your share separately. 2 to 12 people.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton("Create table", {
                    vm.createGroup(name, kind, parsed)
                    onBack()
                }, enabled = name.isNotBlank() && parsed.isNotEmpty())
            }
        }
    }
}

@Composable
fun SplitDetailScreen(
    vm: ZoneViewModel,
    groupId: String,
    onBack: () -> Unit
) {
    val split by vm.split.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val group = split.groups.firstOrNull { it.id == groupId }
    var expenseOpen by remember { mutableStateOf(false) }
    var memberOpen by remember { mutableStateOf(false) }
    var renameOpen by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    if (group == null) {
        ZoneDetailScaffold(title = "Table", onBack = onBack) {
            ZoneEmptyState("That table is gone.", "It may have been removed on another device.")
        }
        return
    }

    val summary = splitSummary(group)

    if (expenseOpen) {
        SplitExpenseDialog(
            group = group,
            currency = currency,
            onDismiss = { expenseOpen = false },
            onSave = {
                vm.saveSplitExpense(group.id, it)
                expenseOpen = false
            }
        )
    }
    if (memberOpen) {
        ZoneTextDialog(
            title = "Add a member",
            label = "Name",
            confirmLabel = "Add person",
            onDismiss = { memberOpen = false },
            onConfirm = {
                vm.addSplitMember(group.id, it)
                memberOpen = false
            }
        )
    }
    if (renameOpen) {
        ZoneTextDialog(
            title = "Rename this table",
            label = "Table name",
            initial = group.name,
            confirmLabel = "Rename",
            onDismiss = { renameOpen = false },
            onConfirm = {
                vm.saveGroup(group.copy(name = it))
                renameOpen = false
            }
        )
    }
    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Delete this table?",
            body = "The ledger and its shared costs will leave your workspace.",
            onConfirm = {
                confirmDelete = false
                vm.deleteGroup(group.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    ZoneDetailScaffold(
        title = group.name,
        onBack = onBack,
        actions = {
            IconButton(onClick = { renameOpen = true }) {
                Icon(Icons.Outlined.Edit, contentDescription = "Rename table", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Outlined.Delete, contentDescription = "Delete table", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
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
                        MonoLabel(kindLabel(group.kind), color = ZoneTheme.colors.accent)
                        Spacer(Modifier.weight(1f))
                        MonoLabel("${group.members.size} people")
                    }
                    Spacer(Modifier.height(7.dp))
                    Text(group.name, style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        when {
                            summary.yourNet == null -> "${ZoneMoney.money(summary.total, currency)} across ${summary.entries} entries."
                            summary.yourNet > 0.01 -> "The table owes you ${ZoneMoney.money(summary.yourNet, currency)}."
                            summary.yourNet < -0.01 -> "You owe the table ${ZoneMoney.money(-summary.yourNet, currency)}."
                            else -> "You are even at this table."
                        },
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = ZoneMoney.compact(summary.total, currency),
                            label = "Table total",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = summary.entries.toString(),
                            label = "Entries",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = "${group.expenses.filter { it.category == "settlement" }.size}",
                            label = "Settled",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
            item {
                SectionLabel("Balance sheet", trailing = "Paid minus share")
            }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(vertical = 4.dp)) {
                    summary.shares.forEachIndexed { index, share ->
                        if (index > 0) Rule(Modifier.padding(horizontal = 14.dp))
                        BalanceRow(share, currency)
                    }
                }
            }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    MonoLabel("${group.members.size} seats at this table")
                    Spacer(Modifier.weight(1f))
                    Text(
                        "Add a person",
                        style = ZoneType.monoSmall,
                        color = ZoneTheme.colors.accent,
                        modifier = Modifier
                            .clickable { memberOpen = true }
                            .padding(6.dp)
                    )
                }
            }
            item { Spacer(Modifier.height(8.dp)) }
            item { SectionLabel("Route to even", trailing = "${summary.transfers.size} moves") }
            if (summary.transfers.isEmpty()) {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Text("Everyone is even.", style = ZoneType.body, color = ZoneTheme.colors.inkSoft)
                    }
                }
            } else {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                        summary.transfers.forEachIndexed { index, transfer ->
                            if (index > 0) Rule()
                            TransferRow(
                                transfer = transfer,
                                groupName = group.name,
                                onSettle = {
                                    vm.settleSplit(group.id, transfer.fromId, transfer.toId, transfer.amount)
                                }
                            )
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Shared costs", trailing = "${group.expenses.size}") }
            if (group.expenses.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "No costs yet.",
                        body = "Add the first shared expense and the table starts to balance.",
                        actionLabel = "Add an expense",
                        onAction = { expenseOpen = true }
                    )
                }
            } else {
                items(group.expenses.sortedByDescending { it.date }, key = { it.id }) { expense ->
                    ExpenseRow(
                        expense = expense,
                        memberName = group.members.firstOrNull { it.id == expense.paidBy }?.name ?: "Someone",
                        currency = currency,
                        onDelete = { vm.deleteSplitExpense(group.id, expense.id) }
                    )
                    Rule(Modifier.padding(horizontal = 20.dp))
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneButton("Add an expense", { expenseOpen = true }, modifier = Modifier.padding(horizontal = 20.dp))
            }
        }
    }
}

@Composable
private fun BalanceRow(share: SplitShare, currency: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ZoneAvatar(share.name, 32.dp)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(share.name, style = ZoneType.body, color = ZoneTheme.colors.ink)
            MonoLabel("paid ${ZoneMoney.compact(share.paid, currency)} \u00B7 share ${ZoneMoney.compact(share.share, currency)}")
        }
        Text(
            ZoneMoney.signed(share.net, currency),
            style = ZoneType.body,
            color = when {
                share.net > 0.01 -> ZoneTheme.colors.sage
                share.net < -0.01 -> ZoneTheme.colors.accent
                else -> ZoneTheme.colors.muted
            }
        )
    }
}

@Composable
private fun ExpenseRow(
    expense: SplitExpense,
    memberName: String,
    currency: String,
    onDelete: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                expense.description,
                style = ZoneType.body,
                color = ZoneTheme.colors.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            MonoLabel("${ZoneDates.prettyDate(expense.date)} \u00B7 paid by $memberName")
        }
        Text(ZoneMoney.money(expense.amount, currency), style = ZoneType.body, color = ZoneTheme.colors.ink)
        Spacer(Modifier.width(4.dp))
        IconButton(onClick = onDelete, modifier = Modifier.size(30.dp)) {
            Icon(Icons.Outlined.Close, contentDescription = "Delete expense", tint = ZoneTheme.colors.muted, modifier = Modifier.size(15.dp))
        }
    }
}

@Composable
private fun SplitExpenseDialog(
    group: SplitGroup,
    currency: String,
    onDismiss: () -> Unit,
    onSave: (SplitExpense) -> Unit
) {
    var description by rememberSaveable { mutableStateOf("") }
    var amount by rememberSaveable { mutableStateOf("") }
    var date by rememberSaveable { mutableStateOf(ZoneDates.today()) }
    var paidById by rememberSaveable { mutableStateOf(group.members.firstOrNull()?.id.orEmpty()) }
    var sharedWith by rememberSaveable(group.members.map { it.id }) {
        mutableStateOf(group.members.map { it.id }.toSet())
    }
    val parsed = amount.toDoubleOrNull() ?: 0.0
    val paidBy = group.members.firstOrNull { it.id == paidById }
    val valid = parsed > 0 && paidBy != null && sharedWith.isNotEmpty()
    val perPerson = if (sharedWith.isNotEmpty()) parsed / sharedWith.size else 0.0

    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(ZoneTheme.colors.raised)
                .padding(20.dp)
        ) {
            Text("Add an expense", style = ZoneType.headline, color = ZoneTheme.colors.ink)
            Spacer(Modifier.height(14.dp))
            ZoneField(description, { description = it }, "What was it?", placeholder = "Dinner, fuel, rent")
            Spacer(Modifier.height(10.dp))
            ZoneField(
                amount,
                { amount = it.filter { ch -> ch.isDigit() || ch == '.' } },
                "Amount",
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                supporting = if (parsed > 0) "${ZoneMoney.money(parsed, currency)} total" else null
            )
            Spacer(Modifier.height(10.dp))
            ZoneDateField(date, { date = it }, "Date")
            Spacer(Modifier.height(10.dp))
            ZonePicker(
                "Paid by",
                paidBy?.name.orEmpty(),
                group.members.map { it.name },
                onSelect = { name -> group.members.firstOrNull { it.name == name }?.let { paidById = it.id } }
            )
            Spacer(Modifier.height(10.dp))
            MonoLabel("Split between")
            Spacer(Modifier.height(4.dp))
            group.members.forEach { member ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clickable {
                            sharedWith = if (member.id in sharedWith) sharedWith - member.id else sharedWith + member.id
                        }
                        .padding(vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CheckCircle(checked = member.id in sharedWith, onClick = {
                        sharedWith = if (member.id in sharedWith) sharedWith - member.id else sharedWith + member.id
                    }, size = 19.dp)
                    Spacer(Modifier.width(9.dp))
                    Text(member.name, style = ZoneType.bodySmall, color = ZoneTheme.colors.ink)
                }
            }
            if (sharedWith.isNotEmpty() && parsed > 0) {
                Spacer(Modifier.height(4.dp))
                MonoLabel("${ZoneMoney.money(perPerson, currency)} each \u00B7 ${sharedWith.size} people")
            }
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Text(
                    "Cancel",
                    style = ZoneType.mono,
                    color = ZoneTheme.colors.inkSoft,
                    modifier = Modifier.clickable(onClick = onDismiss).padding(10.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "Add cost",
                    style = ZoneType.mono,
                    color = ZoneTheme.colors.accent,
                    modifier = Modifier
                        .clickable(enabled = valid) {
                            onSave(
                                SplitExpense(
                                    description = description.ifBlank { "Shared cost" },
                                    amount = parsed,
                                    paidBy = paidById,
                                    date = date,
                                    sharedWith = sharedWith.toList(),
                                    category = "shared"
                                )
                            )
                        }
                        .padding(10.dp)
                )
            }
        }
    }
}
