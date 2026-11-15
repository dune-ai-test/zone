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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.TaskItem
import com.zone.desk.data.model.ZoneList
import com.zone.desk.domain.ListTemplate
import com.zone.desk.domain.ListTemplates
import com.zone.desk.domain.allListProgress
import com.zone.desk.domain.listKind
import com.zone.desk.domain.listKindLabel
import com.zone.desk.domain.listProgress
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.CheckCircle
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneAddButton
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZoneProgress
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTextDialog
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates

@Composable
fun ListsScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onNew: () -> Unit,
    onOpenList: (String) -> Unit
) {
    val lists by vm.lists.collectAsStateWithLifecycle()
    val total = allListProgress(lists)

    ZoneDetailScaffold(
        title = "Lists",
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
                    MonoLabel("Personal \u00B7 lists")
                    Spacer(Modifier.height(10.dp))
                    Text("Your lists.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "One line for the thing. Steps beneath it. Watch the page clear.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = lists.size.toString(),
                            label = "Lists",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = total.open.toString(),
                            label = "Open",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                        ZoneStat(
                            value = "${total.pct}%",
                            label = "Cleared",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 26.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            if (lists.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "No lists yet.",
                        body = "Start with the weekend, a trip, or the ordinary groceries.",
                        actionLabel = "Start a list",
                        onAction = onNew
                    )
                }
            } else {
                item { SectionLabel("The index", trailing = "${lists.size} lists") }
                items(lists, key = { it.id }) { list ->
                    ListIndexCard(list = list, onClick = { onOpenList(list.id) })
                    Spacer(Modifier.height(9.dp))
                }
                item {
                    Spacer(Modifier.height(6.dp))
                    ZoneButton("Start a list", onNew, modifier = Modifier.padding(horizontal = 20.dp))
                }
            }
        }
    }
}

@Composable
private fun ListIndexCard(list: ZoneList, onClick: () -> Unit) {
    val progress = listProgress(list)
    val next = list.items.firstOrNull { !it.done }
    ZoneCard(Modifier.padding(horizontal = 20.dp), onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            MonoLabel(listKindLabel(listKind(list.title)), color = ZoneTheme.colors.accent)
            Spacer(Modifier.weight(1f))
            MonoLabel(if (progress.total == 0) "Empty" else "${progress.done}/${progress.total}")
            Spacer(Modifier.width(10.dp))
            Box(
                Modifier
                    .clip(RoundedCornerShape(50))
                    .background(if (progress.open == 0 && progress.total > 0) ZoneTheme.colors.ink else ZoneTheme.colors.deep)
                    .padding(horizontal = 9.dp, vertical = 4.dp)
            ) {
                Text(
                    if (progress.open == 0 && progress.total > 0) "CLEAR" else "${progress.open} OPEN",
                    style = ZoneType.monoSmall.copy(fontSize = 8.sp),
                    color = if (progress.open == 0 && progress.total > 0) ZoneTheme.colors.paper else ZoneTheme.colors.inkSoft
                )
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            list.title,
            style = ZoneType.headline.copy(fontSize = 22.sp),
            color = ZoneTheme.colors.ink,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(8.dp))
        ZoneProgress(progress.pct / 100f)
        Spacer(Modifier.height(7.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = next?.text ?: "A clear page.",
                style = ZoneType.bodySmall,
                color = ZoneTheme.colors.inkSoft,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f)
            )
            Spacer(Modifier.width(10.dp))
            MonoLabel("${progress.pct}%")
        }
    }
}

@Composable
fun ListNewScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit
) {
    var name by rememberSaveable { mutableStateOf("") }
    var selectedId by rememberSaveable { mutableStateOf(ListTemplates.all.first().id) }
    val template = ListTemplates.byId(selectedId)

    ZoneEditorScaffold(
        title = "New list",
        onCancel = onBack,
        onSave = {
            vm.createList(name, selectedId)
            onBack()
        }
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Personal \u00B7 lists", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(9.dp))
                Text("Start a list.", style = ZoneType.display, color = ZoneTheme.colors.ink)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Name the thing, then borrow a shape if it helps.",
                    style = ZoneType.body,
                    color = ZoneTheme.colors.inkSoft
                )
                Spacer(Modifier.height(18.dp))
                ZoneField(
                    name,
                    { name = it },
                    "List name",
                    placeholder = template.name
                )
            }
            item { Spacer(Modifier.height(20.dp)) }
            item { SectionLabel("Start from", trailing = "${template.items.size} lines") }
            item {
                Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    ListTemplates.all.forEach { option ->
                        TemplateCard(
                            template = option,
                            selected = option.id == selectedId,
                            onClick = { selectedId = option.id }
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(20.dp)) }
            item { SectionLabel("On the page", trailing = template.kind.uppercase()) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    if (template.items.isEmpty()) {
                        Text(
                            "One blank line, waiting for you.",
                            style = ZoneType.body,
                            color = ZoneTheme.colors.inkSoft
                        )
                    } else {
                        template.items.forEachIndexed { index, item ->
                            if (index > 0) Rule(Modifier.padding(vertical = 8.dp))
                            Text(item.text, style = ZoneType.body, color = ZoneTheme.colors.ink)
                            item.children.forEach { child ->
                                Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        Modifier
                                            .padding(start = 4.dp)
                                            .size(3.dp)
                                            .clip(RoundedCornerShape(50))
                                            .background(ZoneTheme.colors.muted)
                                    )
                                    Spacer(Modifier.width(7.dp))
                                    Text(child, style = ZoneType.bodySmall, color = ZoneTheme.colors.inkSoft)
                                }
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(20.dp)) }
            item {
                ZoneButton("Create list", {
                    vm.createList(name, selectedId)
                    onBack()
                })
            }
        }
    }
}

@Composable
private fun TemplateCard(template: ListTemplate, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(12.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (selected) ZoneTheme.colors.raised else Color.Transparent)
            .border(1.dp, if (selected) ZoneTheme.colors.ink else ZoneTheme.colors.line, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(template.name, style = ZoneType.headline.copy(fontSize = 18.sp, lineHeight = 22.sp), color = ZoneTheme.colors.ink)
                Spacer(Modifier.width(7.dp))
                MonoLabel(listKindLabel(template.kind), color = ZoneTheme.colors.muted)
            }
            Spacer(Modifier.height(2.dp))
            Text(template.hint, style = ZoneType.bodySmall, color = ZoneTheme.colors.inkSoft)
        }
        Spacer(Modifier.width(10.dp))
        MonoLabel("${template.items.size} lines")
    }
}

@Composable
fun ListDetailScreen(
    vm: ZoneViewModel,
    listId: String,
    onBack: () -> Unit
) {
    val lists by vm.lists.collectAsStateWithLifecycle()
    val list = lists.firstOrNull { it.id == listId }
    var renameOpen by remember { mutableStateOf(false) }
    var childTarget by remember { mutableStateOf<TaskItem?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    var newLine by rememberSaveable(listId) { mutableStateOf("") }

    if (list == null) {
        ZoneDetailScaffold(title = "List", onBack = onBack) {
            ZoneEmptyState("That list is gone.", "It may have been deleted on another device.")
        }
        return
    }

    if (renameOpen) {
        ZoneTextDialog(
            title = "Rename this list",
            label = "List name",
            initial = list.title,
            confirmLabel = "Rename",
            onDismiss = { renameOpen = false },
            onConfirm = {
                vm.saveList(list.copy(title = it))
                renameOpen = false
            }
        )
    }
    if (childTarget != null) {
        ZoneTextDialog(
            title = "Add a step",
            label = "Step",
            confirmLabel = "Add step",
            onDismiss = { childTarget = null },
            onConfirm = { text ->
                vm.addChild(list.id, childTarget!!.id, text)
                childTarget = null
            }
        )
    }
    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Delete this list?",
            body = "Its lines and steps will be removed from your workspace.",
            onConfirm = {
                confirmDelete = false
                vm.deleteList(list.id)
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    val progress = listProgress(list)
    ZoneDetailScaffold(
        title = list.title,
        onBack = onBack,
        actions = {
            IconButton(onClick = { renameOpen = true }) {
                Icon(Icons.Outlined.Edit, contentDescription = "Rename list", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
            IconButton(onClick = { confirmDelete = true }) {
                Icon(Icons.Outlined.Delete, contentDescription = "Delete list", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
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
                        MonoLabel(listKindLabel(listKind(list.title)), color = ZoneTheme.colors.accent)
                        Spacer(Modifier.weight(1f))
                        MonoLabel("Created ${ZoneDates.shortDate(list.createdAt)}")
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(list.title, style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ZoneProgress(progress.pct / 100f, Modifier.weight(1f))
                        Spacer(Modifier.width(12.dp))
                        MonoLabel("${progress.done}/${progress.total}")
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        if (progress.open == 0 && progress.total > 0) "A clear page." else "${progress.open} left to clear.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
            item { Spacer(Modifier.height(12.dp)) }
            if (list.items.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "One blank line.",
                        body = "Add the first thing. The steps can come after."
                    )
                }
            } else {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(vertical = 4.dp)) {
                        list.items.forEachIndexed { index, item ->
                            if (index > 0) Rule(Modifier.padding(horizontal = 14.dp))
                            TaskItemRow(
                                item = item,
                                onToggle = { vm.toggleItem(list.id, item.id) },
                                onToggleChild = { childId -> vm.toggleChild(list.id, item.id, childId) },
                                onAddStep = { childTarget = item },
                                onDelete = { vm.deleteItem(list.id, item.id) },
                                onDeleteChild = { childId -> vm.deleteChild(list.id, item.id, childId) }
                            )
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ZoneField(
                        value = newLine,
                        onValueChange = { newLine = it },
                        label = "Add a line",
                        placeholder = "The next thing",
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(8.dp))
                    Box(
                        Modifier
                            .size(52.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(ZoneTheme.colors.ink)
                            .clickable {
                                if (newLine.isNotBlank()) {
                                    vm.addItem(list.id, newLine)
                                    newLine = ""
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Outlined.Add, contentDescription = "Add line", tint = ZoneTheme.colors.paper, modifier = Modifier.size(20.dp))
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton("Add a line", {
                    if (newLine.isNotBlank()) {
                        vm.addItem(list.id, newLine)
                        newLine = ""
                    }
                }, enabled = newLine.isNotBlank(), modifier = Modifier.padding(horizontal = 20.dp))
            }
            item { Spacer(Modifier.height(8.dp)) }
            item {
                Text(
                    "Delete this list",
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
private fun TaskItemRow(
    item: TaskItem,
    onToggle: () -> Unit,
    onToggleChild: (String) -> Unit,
    onAddStep: () -> Unit,
    onDelete: () -> Unit,
    onDeleteChild: (String) -> Unit
) {
    Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            CheckCircle(checked = item.done, onClick = onToggle)
            Spacer(Modifier.width(11.dp))
            Text(
                text = item.text,
                style = ZoneType.body.copy(fontSize = 15.sp),
                color = if (item.done) ZoneTheme.colors.muted else ZoneTheme.colors.ink,
                textDecoration = if (item.done) TextDecoration.LineThrough else TextDecoration.None,
                modifier = Modifier.weight(1f)
            )
            if (!item.done) {
                IconButton(onClick = onAddStep, modifier = Modifier.size(30.dp)) {
                    Icon(Icons.Outlined.Add, contentDescription = "Add step", tint = ZoneTheme.colors.muted, modifier = Modifier.size(16.dp))
                }
            }
            IconButton(onClick = onDelete, modifier = Modifier.size(30.dp)) {
                Icon(Icons.Outlined.Close, contentDescription = "Delete line", tint = ZoneTheme.colors.muted, modifier = Modifier.size(15.dp))
            }
        }
        item.children.forEach { child ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(start = 32.dp, top = 5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CheckCircle(checked = child.done, onClick = { onToggleChild(child.id) }, size = 18.dp)
                Spacer(Modifier.width(9.dp))
                Text(
                    child.text,
                    style = ZoneType.bodySmall,
                    color = if (child.done) ZoneTheme.colors.muted else ZoneTheme.colors.inkSoft,
                    textDecoration = if (child.done) TextDecoration.LineThrough else TextDecoration.None,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = { onDeleteChild(child.id) }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Outlined.Close, contentDescription = "Delete step", tint = ZoneTheme.colors.muted, modifier = Modifier.size(13.dp))
                }
            }
        }
    }
}
