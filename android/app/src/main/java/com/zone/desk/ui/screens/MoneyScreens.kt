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
import com.zone.desk.data.model.MoneyTxn
import com.zone.desk.domain.categoryTotals
import com.zone.desk.domain.fleetStats
import com.zone.desk.domain.monthSummary
import com.zone.desk.domain.monthsBack
import com.zone.desk.domain.passbookTotal
import com.zone.desk.domain.roundInt
import com.zone.desk.domain.splitOverall
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
import com.zone.desk.ui.components.ZoneGhostButton
import com.zone.desk.ui.components.ZoneNavRow
import com.zone.desk.ui.components.ZonePicker
import com.zone.desk.ui.components.ZoneProgress
import com.zone.desk.ui.components.ZoneRootHeader
import com.zone.desk.ui.components.ZoneSegmented
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTabScaffold
import com.zone.desk.ui.components.ZoneTextDialog
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneIntents
import com.zone.desk.util.ZoneMoney
import kotlin.math.abs

private val moneyCategories = listOf(
    "Rent", "Groceries", "Food", "Transport", "Utilities", "Shopping",
    "Health", "Fun", "Travel", "Education", "Gifts", "Other", "Salary", "Freelance"
)

@Composable
fun MoneyHubScreen(
    vm: ZoneViewModel,
    onSelectTab: (String) -> Unit,
    onOpen: (String) -> Unit
) {
    val money by vm.money.collectAsStateWithLifecycle()
    val passbook by vm.passbook.collectAsStateWithLifecycle()
    val split by vm.split.collectAsStateWithLifecycle()
    val trips by vm.trips.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val month = monthSummary(money, ZoneDates.currentMonth())
    val fleet = fleetStats(trips)
    val splitNet = splitOverall(split.groups)
    var budgetOpen by remember { mutableStateOf(false) }

    if (budgetOpen) {
        ZoneTextDialog(
            title = "Monthly budget",
            label = "Budget amount",
            initial = if (money.budget > 0) money.budget.toString() else "",
            confirmLabel = "Set budget",
            onDismiss = { budgetOpen = false },
            onConfirm = {
                vm.setBudget(it.toDoubleOrNull() ?: 0.0)
                budgetOpen = false
            }
        )
    }

    ZoneTabScaffold(current = Routes.MONEY, onSelectTab = onSelectTab) { inner ->
        LazyColumn(
            Modifier.fillMaxSize().padding(inner),
            contentPadding = PaddingValues(bottom = 30.dp)
        ) {
            item {
                ZoneRootHeader(
                    eyebrow = "Money \u00B7 4 tools",
                    title = "Where the month actually goes.",
                    subtitle = "One ledger, one book, one table, one tank. Amounts never leave your workspace."
                )
            }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel(ZoneDates.monthLabel(ZoneDates.currentMonth()), color = ZoneTheme.colors.accent)
                        Spacer(Modifier.weight(1f))
                        MonoLabel("${month.daysLeft} days left")
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        ZoneMoney.money(month.net, currency),
                        style = ZoneType.numberBig,
                        color = ZoneTheme.colors.ink
                    )
                    MonoLabel(if (month.net >= 0) "Kept this month" else "Over this month")
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = ZoneMoney.compact(month.income, currency),
                            label = "In",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = ZoneMoney.compact(month.spent, currency),
                            label = "Out",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = if (money.budget > 0) "${month.budgetPct}%" else "\u2014",
                            label = "Of budget",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    ZoneProgress(if (money.budget > 0) (month.spent / money.budget).toFloat().coerceIn(0f, 1f) else 0f)
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel(
                            if (money.budget > 0) {
                                "${ZoneMoney.money(month.remaining.coerceAtLeast(0.0), currency)} left of ${ZoneMoney.money(money.budget, currency)}"
                            } else {
                                "Set a monthly envelope"
                            }
                        )
                        Spacer(Modifier.weight(1f))
                        Text(
                            if (money.budget > 0) "Edit budget" else "Set budget",
                            style = ZoneType.monoSmall,
                            color = ZoneTheme.colors.accent,
                            modifier = Modifier
                                .clickable { budgetOpen = true }
                                .padding(5.dp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("The ledgers", trailing = "Four ways to count") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                    ZoneNavRow(
                        title = "Ledger",
                        meta = "${ZoneMoney.money(month.spent, currency)} \u00B7 ${month.expenseCount} entries \u00B7 ${month.budgetPct}% of budget",
                        index = "01",
                        onClick = { onOpen(Routes.LEDGER) }
                    )
                    Rule()
                    ZoneNavRow(
                        title = "Passbook",
                        meta = "${passbook.accounts.size} accounts \u00B7 ${ZoneMoney.money(passbookTotal(passbook), currency)} combined",
                        index = "02",
                        onClick = { onOpen(Routes.PASSBOOK) }
                    )
                    Rule()
                    ZoneNavRow(
                        title = "Split",
                        meta = "${ZoneMoney.money(abs(splitNet.first), currency)} ${if (splitNet.first >= 0) "to collect" else "to settle"} \u00B7 ${split.groups.size} tables",
                        index = "03",
                        onClick = { onOpen(Routes.SPLIT) }
                    )
                    Rule()
                    ZoneNavRow(
                        title = "Mileage",
                        meta = "${if (fleet.average > 0) String.format(java.util.Locale.US, "%.1f", fleet.average) else "\u2014"} km/L avg \u00B7 ${ZoneMoney.compact(fleet.distance, currency)} km logged",
                        index = "04",
                        onClick = { onOpen(Routes.MILEAGE) }
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("The shape of spending", trailing = "Open") }
            item {
                ZoneCard(
                    Modifier.padding(horizontal = 20.dp),
                    onClick = { onOpen(Routes.MONEY_SPENDING) }
                ) {
                    val cats = categoryTotals(month.transactions).take(4)
                    if (cats.isEmpty()) {
                        Text(
                            "No spending recorded this month. The shape will appear here.",
                            style = ZoneType.body,
                            color = ZoneTheme.colors.inkSoft
                        )
                    } else {
                        cats.forEachIndexed { index, cat ->
                            if (index > 0) Spacer(Modifier.height(10.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(cat.name, style = ZoneType.body, color = ZoneTheme.colors.ink, modifier = Modifier.weight(1f))
                                MonoLabel(ZoneMoney.money(cat.amount, currency))
                                Spacer(Modifier.width(8.dp))
                                MonoLabel("${cat.pct}%", color = ZoneTheme.colors.muted)
                            }
                            Spacer(Modifier.height(4.dp))
                            ZoneProgress(cat.pct / 100f, height = 3.dp)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Recent entries", trailing = "Add") }
            item {
                if (month.transactions.isEmpty()) {
                    ZoneEmptyState("A quiet ledger.", "Record the first entry and the month starts to take shape.")
                } else {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(vertical = 4.dp)) {
                        month.transactions.take(6).forEachIndexed { index, txn ->
                            if (index > 0) Rule(Modifier.padding(horizontal = 14.dp))
                            TxnRow(txn, currency, onClick = { onOpen(Routes.txnEdit(txn.id)) })
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneButton("Add a transaction", { onOpen(Routes.TXN_NEW) }, modifier = Modifier.padding(horizontal = 20.dp))
            }
            item { Spacer(Modifier.height(10.dp)) }
            item {
                Text(
                    "Amounts never leave your workspace.",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}

@Composable
fun TxnRow(txn: MoneyTxn, currency: String, onClick: (() -> Unit)? = null) {
    val income = txn.type == "income"
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 14.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(if (income) ZoneTheme.colors.sage else ZoneTheme.colors.accent)
        )
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                txn.note.ifBlank { txn.category },
                style = ZoneType.body,
                color = ZoneTheme.colors.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            MonoLabel("${txn.category} \u00B7 ${ZoneDates.shortDate(txn.date)}")
        }
        Spacer(Modifier.width(8.dp))
        Text(
            text = "${if (income) "+" else "\u2212"}${ZoneMoney.money(txn.amount, currency)}",
            style = ZoneType.body,
            color = if (income) ZoneTheme.colors.sage else ZoneTheme.colors.ink,
            maxLines = 1
        )
    }
}

@Composable
fun LedgerScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onEdit: (String) -> Unit
) {
    val money by vm.money.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    var monthKey by rememberSaveable { mutableStateOf(ZoneDates.currentMonth()) }
    val month = monthSummary(money, monthKey)
    val cats = categoryTotals(month.transactions)
    var confirmDelete by remember { mutableStateOf<MoneyTxn?>(null) }
    val months = monthsBack(6).reversed()

    if (confirmDelete != null) {
        ZoneConfirmDialog(
            title = "Delete this entry?",
            body = "The transaction will leave the ledger and D1.",
            onConfirm = {
                vm.deleteTransaction(confirmDelete!!.id)
                confirmDelete = null
            },
            onDismiss = { confirmDelete = null }
        )
    }

    ZoneDetailScaffold(
        title = "Ledger",
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
                    MonoLabel(ZoneDates.monthLabel(monthKey))
                    Spacer(Modifier.height(9.dp))
                    Text("The ledger.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(5.dp))
                    Text("Every entry, in order.", style = ZoneType.body, color = ZoneTheme.colors.inkSoft)
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    months.forEach { key ->
                        ZoneChip(
                            ZoneDates.monthShort(key).uppercase(),
                            selected = monthKey == key,
                            onClick = { monthKey = key }
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row {
                        ZoneStat(
                            value = ZoneMoney.money(month.net, currency),
                            label = "Kept this month",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = ZoneMoney.compact(month.spent, currency),
                            label = "Out",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = ZoneMoney.compact(month.income, currency),
                            label = "In",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel("${month.expenseCount} expenses \u00B7 ${month.incomeCount} income")
                        Spacer(Modifier.weight(1f))
                        MonoLabel("${ZoneMoney.money(if (month.expenseCount > 0) month.spent / month.expenseCount else 0.0, currency)} avg")
                    }
                }
            }
            if (cats.isNotEmpty()) {
                item { Spacer(Modifier.height(16.dp)) }
                item { SectionLabel("Where it went", trailing = ZoneDates.monthShort(monthKey)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        cats.take(6).forEachIndexed { index, cat ->
                            if (index > 0) Spacer(Modifier.height(9.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(cat.name, style = ZoneType.bodySmall, color = ZoneTheme.colors.ink, modifier = Modifier.weight(1f))
                                MonoLabel(ZoneMoney.money(cat.amount, currency))
                            }
                            Spacer(Modifier.height(3.dp))
                            ZoneProgress(cat.pct / 100f, height = 3.dp)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Every entry", trailing = "${month.transactions.size}") }
            if (month.transactions.isEmpty()) {
                item { ZoneEmptyState("Nothing recorded.", "Add a transaction and the ledger begins.") }
            } else {
                items(month.transactions, key = { it.id }) { txn ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { onEdit(txn.id) }
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                txn.note.ifBlank { txn.category },
                                style = ZoneType.body,
                                color = ZoneTheme.colors.ink,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            MonoLabel("${ZoneDates.prettyDate(txn.date)} \u00B7 ${txn.category}")
                        }
                        Text(
                            text = "${if (txn.type == "income") "+" else "\u2212"}${ZoneMoney.money(txn.amount, currency)}",
                            style = ZoneType.body,
                            color = if (txn.type == "income") ZoneTheme.colors.sage else ZoneTheme.colors.ink
                        )
                        Spacer(Modifier.width(4.dp))
                        IconButton(onClick = { confirmDelete = txn }, modifier = Modifier.size(30.dp)) {
                            Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = ZoneTheme.colors.muted, modifier = Modifier.size(15.dp))
                        }
                    }
                    Rule(Modifier.padding(horizontal = 20.dp))
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneButton("Add a transaction", onNew, modifier = Modifier.padding(horizontal = 20.dp))
            }
        }
    }
}

@Composable
fun TxnEditorScreen(
    vm: ZoneViewModel,
    txnId: String?,
    onBack: () -> Unit
) {
    val money by vm.money.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val txn = remember(money.transactions, txnId) { money.transactions.firstOrNull { it.id == txnId } }
    val editing = txnId != null
    var hydrated by rememberSaveable(txnId) { mutableStateOf(!editing) }
    var type by rememberSaveable(txnId) { mutableStateOf(txn?.type ?: "expense") }
    var amount by rememberSaveable(txnId) { mutableStateOf(txn?.amount?.takeIf { it > 0 }?.toString() ?: "") }
    var date by rememberSaveable(txnId) { mutableStateOf(txn?.date ?: ZoneDates.today()) }
    var category by rememberSaveable(txnId) { mutableStateOf(txn?.category ?: "Other") }
    var note by rememberSaveable(txnId) { mutableStateOf(txn?.note ?: "") }
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(txn) {
        if (!hydrated && txn != null) {
            type = txn.type
            amount = txn.amount.toString()
            date = txn.date
            category = txn.category
            note = txn.note
            hydrated = true
        }
    }

    if (confirmDelete && txn != null) {
        ZoneConfirmDialog(
            title = "Delete this transaction?",
            body = "It will be removed from the ledger.",
            onConfirm = {
                confirmDelete = false
                vm.deleteTransaction(txn.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    val parsed = amount.toDoubleOrNull() ?: 0.0
    val valid = parsed > 0.0

    ZoneEditorScaffold(
        title = if (editing) "Edit transaction" else "New transaction",
        onCancel = onBack,
        onSave = {
            vm.saveTransaction(
                MoneyTxn(
                    id = txn?.id.orEmpty(),
                    type = type,
                    amount = parsed,
                    category = category,
                    date = date,
                    note = note
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
                MonoLabel("Money \u00B7 ledger", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(8.dp))
                Text(
                    if (editing) "Edit the entry." else "Add to the ledger.",
                    style = ZoneType.displaySmall,
                    color = ZoneTheme.colors.ink
                )
                Spacer(Modifier.height(14.dp))
                ZoneSegmented(listOf("Expense", "Income"), if (type == "income") "Income" else "Expense", onSelect = {
                    type = if (it == "Income") "income" else "expense"
                })
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneField(
                    value = amount,
                    onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    label = "Amount",
                    placeholder = "0",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    supporting = if (valid) ZoneMoney.money(parsed, settings.currency) else "Enter an amount greater than zero."
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneDateField(date, { date = it }, "Date")
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZonePicker("Category", category, moneyCategories, { category = it })
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneField(note, { note = it }, "Note", placeholder = "What was this for?")
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneCard(padding = PaddingValues(14.dp)) {
                    MonoLabel("One entry, one date", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        "If a cost spans the month, split it in two. The ledger stays honest that way.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton(
                    if (editing) "Save transaction" else "Add transaction",
                    onClick = {
                        vm.saveTransaction(
                            MoneyTxn(
                                id = txn?.id.orEmpty(),
                                type = type,
                                amount = parsed,
                                category = category,
                                date = date,
                                note = note
                            )
                        )
                        onBack()
                    },
                    enabled = valid
                )
            }
            if (editing && txn != null) {
                item { Spacer(Modifier.height(8.dp)) }
                item {
                    Text(
                        "Delete this transaction",
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
fun SpendingScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit
) {
    val money by vm.money.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val currency = settings.currency
    val monthKey = ZoneDates.currentMonth()
    val month = monthSummary(money, monthKey)
    val previousKey = monthsBack(2).first()
    val previous = monthSummary(money, previousKey)
    val cats = categoryTotals(month.transactions)
    val change = if (previous.spent > 0) ((month.spent - previous.spent) / previous.spent * 100).roundInt() else 0
    val biggest = cats.firstOrNull()

    ZoneDetailScaffold(
        title = "Spending",
        onBack = onBack,
        actions = {
            IconButton(onClick = {
                val rows = mutableListOf(listOf("Date", "Type", "Category", "Note", "Amount"))
                month.transactions.forEach { txn ->
                    rows += listOf(txn.date, txn.type, txn.category, txn.note, txn.amount.toString())
                }
                ZoneIntents.share(context, "${ZoneDates.monthLabel(monthKey)} CSV", ZoneMoney.csv(rows))
            }) {
                Icon(Icons.Outlined.Share, contentDescription = "Export CSV", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            item {
                Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 6.dp)) {
                    MonoLabel("The shape of spending \u00B7 ${ZoneDates.monthShort(monthKey)}")
                    Spacer(Modifier.height(9.dp))
                    Text("Where it went.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "${month.expenseCount} entries \u00B7 ${ZoneMoney.money(month.spent, currency)} spent",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                Row(Modifier.padding(horizontal = 20.dp)) {
                    ZoneStat(
                        value = ZoneMoney.money(month.spent, currency),
                        label = "Spent",
                        modifier = Modifier.weight(1f),
                        valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                    )
                    ZoneStat(
                        value = "${if (change >= 0) "+" else ""}$change%",
                        label = "vs ${ZoneDates.monthShort(previousKey)}",
                        modifier = Modifier.weight(1f),
                        valueStyle = ZoneType.number.copy(fontSize = 25.sp),
                        accent = change > 0
                    )
                    ZoneStat(
                        value = if (month.expenseCount > 0) ZoneMoney.money(month.spent / month.expenseCount, currency) else "\u2014",
                        label = "Average",
                        modifier = Modifier.weight(1f),
                        valueStyle = ZoneType.number.copy(fontSize = 21.sp)
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("By category", trailing = "${cats.size} categories") }
            if (cats.isEmpty()) {
                item { ZoneEmptyState("Nothing to chart.", "Add a transaction to see the shape of the month.") }
            } else {
                items(cats, key = { it.name }) { cat ->
                    Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(cat.name, style = ZoneType.body, color = ZoneTheme.colors.ink, modifier = Modifier.weight(1f))
                            Text(ZoneMoney.money(cat.amount, currency), style = ZoneType.body, color = ZoneTheme.colors.ink)
                            Spacer(Modifier.width(9.dp))
                            MonoLabel("${cat.pct}%")
                        }
                        Spacer(Modifier.height(5.dp))
                        ZoneProgress(cat.pct / 100f, color = if (cat.name == biggest?.name) ZoneTheme.colors.accent else ZoneTheme.colors.ink)
                    }
                }
            }
            if (biggest != null) {
                item { Spacer(Modifier.height(16.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        MonoLabel("Biggest mover", color = ZoneTheme.colors.accent)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "${biggest.name} \u2014 ${ZoneMoney.money(biggest.amount, currency)}",
                            style = ZoneType.headline.copy(fontSize = 19.sp),
                            color = ZoneTheme.colors.ink
                        )
                        Spacer(Modifier.height(3.dp))
                        Text(
                            if (change >= 0) "Spending is up $change% against ${ZoneDates.monthLabel(previousKey, false)}." else "Spending is down ${-change}% against ${ZoneDates.monthLabel(previousKey, false)}.",
                            style = ZoneType.bodySmall,
                            color = ZoneTheme.colors.inkSoft
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneGhostButton(
                    "Export ${ZoneDates.monthLabel(monthKey, false)} (CSV)",
                    onClick = {
                        val rows = mutableListOf(listOf("Date", "Type", "Category", "Note", "Amount"))
                        month.transactions.forEach { txn ->
                            rows += listOf(txn.date, txn.type, txn.category, txn.note, txn.amount.toString())
                        }
                        ZoneIntents.share(context, "${ZoneDates.monthLabel(monthKey)} CSV", ZoneMoney.csv(rows))
                    },
                    icon = Icons.Outlined.Share,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}
