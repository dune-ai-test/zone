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
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Share
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.Account
import com.zone.desk.data.model.PassbookTxn
import com.zone.desk.domain.accountBalance
import com.zone.desk.domain.passbookBalanceSeries
import com.zone.desk.domain.passbookMonthTotals
import com.zone.desk.domain.passbookTotal
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneBars
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDateField
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZonePicker
import com.zone.desk.ui.components.ZoneSegmented
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTextDialog
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneIntents
import com.zone.desk.util.ZoneMoney
import kotlin.math.abs

private val passbookCategories = listOf(
    "Salary", "Rent", "Groceries", "Food", "Transport", "Utilities",
    "Shopping", "Health", "Fun", "Transfer", "Gift", "Other"
)

@Composable
fun PassbookScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onAdd: () -> Unit,
    onAccount: (String) -> Unit
) {
    val book by vm.passbook.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val total = passbookTotal(book)
    val (income, out) = passbookMonthTotals(book, ZoneDates.currentMonth())
    val series = passbookBalanceSeries(book, 6)
    val maxBalance = series.maxOfOrNull { it.second }?.takeIf { it > 0 } ?: 1.0
    var accountDialog by remember { mutableStateOf(false) }

    if (accountDialog) {
        AccountDialog(
            onDismiss = { accountDialog = false },
            onSave = {
                vm.saveAccount(it)
                accountDialog = false
            }
        )
    }

    ZoneDetailScaffold(
        title = "Passbook",
        onBack = onBack,
        actions = {
            Text(
                "Add",
                style = ZoneType.mono,
                color = ZoneTheme.colors.accent,
                modifier = Modifier
                    .clickable {
                        if (book.accounts.isEmpty()) accountDialog = true else onAdd()
                    }
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
                    MonoLabel("Across every account \u00B7 ${ZoneDates.todayLong()}")
                    Spacer(Modifier.height(10.dp))
                    Text("The book.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        if (book.accounts.isEmpty()) {
                            "Add an account and the book begins."
                        } else {
                            "${ZoneMoney.money(total, currency)} across ${book.accounts.size} accounts."
                        },
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = ZoneMoney.compact(total, currency),
                            label = "Combined",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                        )
                        ZoneStat(
                            value = "+${ZoneMoney.compact(income, currency)}",
                            label = "In this month",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                        ZoneStat(
                            value = "\u2212${ZoneMoney.compact(out, currency)}",
                            label = "Out this month",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                    }
                }
            }
            if (series.isNotEmpty() && book.accounts.isNotEmpty()) {
                item { Spacer(Modifier.height(16.dp)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel("Balance at the end of each month")
                            Spacer(Modifier.weight(1f))
                            MonoLabel(ZoneDates.monthShort(ZoneDates.currentMonth()))
                        }
                        Spacer(Modifier.height(10.dp))
                        ZoneBars(
                            values = series.map { (it.second / maxBalance).toFloat() },
                            labels = series.map { ZoneDates.monthShort(it.first) },
                            height = 62.dp
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Accounts, side by side", trailing = "${book.accounts.size} accounts") }
            if (book.accounts.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "No accounts yet.",
                        body = "A bank account, cash in hand, a travel pot. Add the first one.",
                        actionLabel = "Add an account",
                        onAction = { accountDialog = true }
                    )
                }
            } else {
                items(book.accounts, key = { it.id }) { account ->
                    val balance = accountBalance(account, book.transactions, ZoneDates.currentMonth())
                    ZoneCard(
                        Modifier.padding(horizontal = 20.dp, vertical = 5.dp),
                        onClick = { onAccount(account.id) }
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel(account.type, color = ZoneTheme.colors.accent)
                            Spacer(Modifier.weight(1f))
                            MonoLabel(maskNumber(account.number))
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(account.name, style = ZoneType.headline.copy(fontSize = 21.sp), color = ZoneTheme.colors.ink)
                        Spacer(Modifier.height(3.dp))
                        Text(
                            if (account.type.equals("Cash", true) || account.type.equals("Wallet", true)) "Physical \u00B7 wallet" else "${account.type} \u00B7 opened ${ZoneDates.shortDate(ZoneDates.today())}",
                            style = ZoneType.bodySmall,
                            color = ZoneTheme.colors.muted
                        )
                        Spacer(Modifier.height(10.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                ZoneMoney.money(balance.balance, currency),
                                style = ZoneType.number.copy(fontSize = 24.sp),
                                color = ZoneTheme.colors.ink,
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                "${if (balance.netMonth >= 0) "+" else "\u2212"}${ZoneMoney.money(abs(balance.netMonth), currency)}",
                                style = ZoneType.bodySmall,
                                color = if (balance.netMonth >= 0) ZoneTheme.colors.sage else ZoneTheme.colors.accent
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        MonoLabel("${balance.entries} entries this month")
                    }
                }
                item { Spacer(Modifier.height(12.dp)) }
                item {
                    ZoneButton("Add an entry", onAdd, modifier = Modifier.padding(horizontal = 20.dp))
                }
                item { Spacer(Modifier.height(8.dp)) }
                item {
                    Text(
                        "Add an account",
                        style = ZoneType.monoSmall,
                        color = ZoneTheme.colors.accent,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { accountDialog = true }
                            .padding(12.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

private fun maskNumber(number: String): String {
    if (number.isBlank()) return "\u2022\u2022\u2022\u2022"
    return "\u2022\u2022\u2022\u2022 " + number.takeLast(4)
}

@Composable
fun PassbookAddScreen(
    vm: ZoneViewModel,
    initialAccountId: String?,
    onBack: () -> Unit
) {
    val book by vm.passbook.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val accounts = book.accounts
    var type by rememberSaveable { mutableStateOf("withdraw") }
    var amount by rememberSaveable { mutableStateOf("") }
    var date by rememberSaveable { mutableStateOf(ZoneDates.today()) }
    var accountId by rememberSaveable { mutableStateOf(initialAccountId ?: accounts.firstOrNull()?.id ?: "") }
    var category by rememberSaveable { mutableStateOf("Other") }
    var description by rememberSaveable { mutableStateOf("") }

    val selected = accounts.firstOrNull { it.id == accountId } ?: accounts.firstOrNull()
    val parsed = amount.toDoubleOrNull() ?: 0.0
    val valid = parsed > 0 && selected != null
    val resulting = selected?.let {
        accountBalance(it, book.transactions).balance + if (type == "deposit") parsed else -parsed
    } ?: 0.0

    ZoneEditorScaffold(
        title = "New entry",
        onCancel = onBack,
        onSave = {
            vm.savePassbookTxn(
                PassbookTxn(
                    accountId = selected?.id.orEmpty(),
                    type = type,
                    amount = parsed,
                    category = category,
                    description = description.ifBlank { category },
                    date = date
                )
            )
            onBack()
        },
        saveEnabled = valid
    ) {
        if (accounts.isEmpty()) {
            ZoneEmptyState(
                title = "No account to write in.",
                body = "Add an account from the passbook first.",
                actionLabel = "Go back",
                onAction = onBack
            )
            return@ZoneEditorScaffold
        }
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("A line in the book", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(8.dp))
                Text("Add an entry.", style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                Spacer(Modifier.height(14.dp))
                ZoneSegmented(listOf("Withdrawal", "Deposit"), if (type == "deposit") "Deposit" else "Withdrawal") {
                    type = if (it == "Deposit") "deposit" else "withdraw"
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneField(
                    value = amount,
                    onValueChange = { amount = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    label = "Amount",
                    placeholder = "0",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    supporting = if (valid) {
                        "New balance \u2248 ${ZoneMoney.money(resulting, currency)}"
                    } else "A deposit adds to the balance. A withdrawal takes away."
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item { ZoneDateField(date, { date = it }, "Date") }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZonePicker(
                    label = "Account",
                    value = selected?.name.orEmpty(),
                    options = accounts.map { it.name },
                    onSelect = { picked -> accounts.firstOrNull { it.name == picked }?.let { accountId = it.id } }
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item { ZonePicker("Category", category, passbookCategories, { category = it }) }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneField(description, { description = it }, "Description", placeholder = "What was this line?")
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneCard(padding = PaddingValues(14.dp)) {
                    MonoLabel("The running total", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        "Entries are read in date order. The running balance updates with every line.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton(
                    "Save entry",
                    onClick = {
                        vm.savePassbookTxn(
                            PassbookTxn(
                                accountId = selected?.id.orEmpty(),
                                type = type,
                                amount = parsed,
                                category = category,
                                description = description.ifBlank { category },
                                date = date
                            )
                        )
                        onBack()
                    },
                    enabled = valid
                )
            }
        }
    }
}

@Composable
fun AccountStatementScreen(
    vm: ZoneViewModel,
    accountId: String,
    onBack: () -> Unit,
    onAdd: () -> Unit
) {
    val book by vm.passbook.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val context = LocalContext.current
    val account = book.accounts.firstOrNull { it.id == accountId }
    var confirmDelete by remember { mutableStateOf(false) }
    var editOpen by remember { mutableStateOf(false) }

    if (account == null) {
        ZoneDetailScaffold(title = "Statement", onBack = onBack) {
            ZoneEmptyState("That account is gone.", "It may have been removed on another device.")
        }
        return
    }

    if (editOpen) {
        AccountDialog(
            initial = account,
            onDismiss = { editOpen = false },
            onSave = {
                vm.saveAccount(it)
                editOpen = false
            }
        )
    }
    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Delete this account?",
            body = "Every entry in ${account.name} will be removed too.",
            onConfirm = {
                confirmDelete = false
                vm.deleteAccount(account.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    val balance = accountBalance(account, book.transactions, ZoneDates.currentMonth())
    val month = ZoneDates.currentMonth()
    val entries = book.transactions.filter { it.accountId == account.id }.sortedBy { it.date + it.id }
    var running = account.opening
    val runningById = linkedMapOf<String, Double>()
    entries.forEach { txn ->
        running += if (txn.type == "deposit") txn.amount else -txn.amount
        runningById[txn.id] = running
    }
    val display = entries.sortedByDescending { it.date + it.id }

    ZoneDetailScaffold(
        title = account.name,
        onBack = onBack,
        actions = {
            IconButton(onClick = { editOpen = true }) {
                Icon(Icons.Outlined.Edit, contentDescription = "Edit account", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
            IconButton(onClick = {
                val rows = mutableListOf(listOf("Date", "Description", "Category", "Type", "Amount", "Balance"))
                display.forEach { txn ->
                    rows += listOf(
                        txn.date, txn.description, txn.category, txn.type,
                        txn.amount.toString(), runningById[txn.id]?.toString().orEmpty()
                    )
                }
                ZoneIntents.share(context, "${account.name} CSV", ZoneMoney.csv(rows))
            }) {
                Icon(Icons.Outlined.Share, contentDescription = "Export CSV", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Outlined.Delete, contentDescription = "Delete account", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
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
                        MonoLabel("${account.type} \u00B7 ${maskNumber(account.number)}", color = ZoneTheme.colors.accent)
                        Spacer(Modifier.weight(1f))
                        MonoLabel("As of ${ZoneDates.shortDate(ZoneDates.today())}")
                    }
                    Spacer(Modifier.height(7.dp))
                    Text(account.name, style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(8.dp))
                    Text(ZoneMoney.money(balance.balance, currency), style = ZoneType.numberBig, color = ZoneTheme.colors.ink)
                    MonoLabel("Current balance")
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = "+${ZoneMoney.compact(balance.inMonth, currency)}",
                            label = "In ${ZoneDates.monthShort(month)}",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 23.sp)
                        )
                        ZoneStat(
                            value = "\u2212${ZoneMoney.compact(balance.outMonth, currency)}",
                            label = "Out ${ZoneDates.monthShort(month)}",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 23.sp)
                        )
                        ZoneStat(
                            value = "${if (balance.netMonth >= 0) "+" else "\u2212"}${ZoneMoney.compact(abs(balance.netMonth), currency)}",
                            label = "Net",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 23.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item { SectionLabel("Every line", trailing = "${display.size} entries") }
            if (display.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "A clean page.",
                        body = "The first deposit or withdrawal starts the running balance.",
                        actionLabel = "Add an entry",
                        onAction = onAdd
                    )
                }
            } else {
                items(display, key = { it.id }) { txn ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 11.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                txn.description.ifBlank { txn.category },
                                style = ZoneType.body,
                                color = ZoneTheme.colors.ink,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            MonoLabel("${ZoneDates.prettyDate(txn.date)} \u00B7 ${txn.category}")
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                "${if (txn.type == "deposit") "+" else "\u2212"}${ZoneMoney.money(txn.amount, currency)}",
                                style = ZoneType.body,
                                color = if (txn.type == "deposit") ZoneTheme.colors.sage else ZoneTheme.colors.ink
                            )
                            MonoLabel("bal ${ZoneMoney.compact(runningById[txn.id] ?: 0.0, currency)}")
                        }
                    }
                    Rule(Modifier.padding(horizontal = 20.dp))
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
            item {
                Row(Modifier.padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ZoneButton("Deposit", onAdd, modifier = Modifier.weight(1f))
                    ZoneGhostButton("Withdraw", onAdd, modifier = Modifier.weight(1f))
                }
            }
            item { Spacer(Modifier.height(6.dp)) }
            item {
                Text(
                    "Opening balance ${ZoneMoney.money(account.opening, currency)}",
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.muted,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }
        }
    }
}

@Composable
private fun AccountDialog(
    initial: Account? = null,
    onDismiss: () -> Unit,
    onSave: (Account) -> Unit
) {
    var name by rememberSaveable { mutableStateOf(initial?.name.orEmpty()) }
    var type by rememberSaveable { mutableStateOf(initial?.type ?: "Bank") }
    var number by rememberSaveable { mutableStateOf(initial?.number.orEmpty()) }
    var opening by rememberSaveable { mutableStateOf(initial?.opening?.toString() ?: "0") }
    val types = listOf("Bank", "Cash", "Savings", "Wallet", "Credit")

    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(ZoneTheme.colors.raised)
                .padding(20.dp)
        ) {
            Text(if (initial == null) "Add an account" else "Edit account", style = ZoneType.headline, color = ZoneTheme.colors.ink)
            Spacer(Modifier.height(14.dp))
            ZoneField(name, { name = it }, "Account name", placeholder = "HDFC Savings")
            Spacer(Modifier.height(12.dp))
            ZonePicker("Type", type, types, { type = it })
            Spacer(Modifier.height(12.dp))
            ZoneField(number, { number = it }, "Last four digits", placeholder = "4821")
            Spacer(Modifier.height(12.dp))
            ZoneField(
                opening,
                { opening = it.filter { ch -> ch.isDigit() || ch == '.' || ch == '-' } },
                "Opening balance",
                keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
            )
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
                            onSave(
                                Account(
                                    id = initial?.id.orEmpty(),
                                    name = name,
                                    type = type,
                                    number = number,
                                    opening = opening.toDoubleOrNull() ?: 0.0
                                )
                            )
                        }
                        .padding(10.dp)
                )
            }
        }
    }
}
