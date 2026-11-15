package com.zone.desk.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import java.time.Instant
import java.time.ZoneOffset

/* =========================================================================
   Type helpers
   ========================================================================= */

@Composable
fun MonoLabel(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = ZoneTheme.colors.muted,
    maxLines: Int = 1,
    align: TextAlign = TextAlign.Start
) {
    Text(
        text = text.uppercase(),
        modifier = modifier,
        style = ZoneType.monoSmall,
        color = color,
        maxLines = maxLines,
        overflow = TextOverflow.Ellipsis,
        textAlign = align
    )
}

@Composable
fun SectionLabel(
    text: String,
    modifier: Modifier = Modifier,
    trailing: String? = null,
    onTrailing: (() -> Unit)? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        MonoLabel(text, modifier = Modifier.weight(1f), color = ZoneTheme.colors.inkSoft)
        if (trailing != null) {
            Text(
                text = trailing.uppercase(),
                style = ZoneType.monoSmall,
                color = ZoneTheme.colors.accent,
                modifier = if (onTrailing != null) {
                    Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .clickable(onClick = onTrailing)
                        .padding(horizontal = 6.dp, vertical = 3.dp)
                } else Modifier
            )
        }
    }
}

@Composable
fun Rule(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(ZoneTheme.colors.line)
    )
}

/* =========================================================================
   Page chrome
   ========================================================================= */

@Composable
fun ZoneRootHeader(
    eyebrow: String,
    title: String,
    subtitle: String? = null,
    meta: String = ZoneDates.dateStamp(),
    bottom: @Composable ColumnScope.() -> Unit = {}
) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("ZONE", style = ZoneType.monoSmall, color = ZoneTheme.colors.accent, letterSpacing = 2.4.sp)
            Spacer(Modifier.width(10.dp))
            MonoLabel(eyebrow, modifier = Modifier.weight(1f))
            MonoLabel(meta, align = TextAlign.End, modifier = Modifier.widthIn(max = 190.dp))
        }
        Spacer(Modifier.height(18.dp))
        Text(
            text = title,
            style = ZoneType.display,
            color = ZoneTheme.colors.ink
        )
        if (!subtitle.isNullOrBlank()) {
            Spacer(Modifier.height(9.dp))
            Text(
                text = subtitle,
                style = ZoneType.body,
                color = ZoneTheme.colors.inkSoft
            )
        }
        Spacer(Modifier.height(12.dp))
        bottom()
    }
}

@Composable
fun ZoneTopBar(
    title: String,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 54.dp)
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (onBack != null) {
            IconButton(onClick = onBack, modifier = Modifier.size(46.dp)) {
                Icon(
                    Icons.Outlined.ArrowBack,
                    contentDescription = "Back",
                    tint = ZoneTheme.colors.ink,
                    modifier = Modifier.size(20.dp)
                )
            }
        } else {
            Spacer(Modifier.width(12.dp))
        }
        Text(
            text = title.uppercase(),
            style = ZoneType.monoSmall,
            color = ZoneTheme.colors.inkSoft,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = if (onBack != null) TextAlign.Center else TextAlign.Start,
            modifier = Modifier.weight(1f)
        )
        Row(verticalAlignment = Alignment.CenterVertically, content = actions)
    }
}

@Composable
fun ZoneEditorTopBar(
    title: String,
    onCancel: () -> Unit,
    onSave: () -> Unit,
    saveLabel: String = "Save",
    saveEnabled: Boolean = true
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 58.dp)
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Cancel",
            style = ZoneType.mono,
            color = ZoneTheme.colors.inkSoft,
            modifier = Modifier
                .clip(RoundedCornerShape(6.dp))
                .clickable(onClick = onCancel)
                .padding(horizontal = 10.dp, vertical = 10.dp)
        )
        Text(
            text = title.uppercase(),
            style = ZoneType.monoSmall,
            color = ZoneTheme.colors.ink,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(7.dp))
                .background(if (saveEnabled) ZoneTheme.colors.ink else ZoneTheme.colors.deep)
                .clickable(enabled = saveEnabled, onClick = onSave)
                .padding(horizontal = 14.dp, vertical = 9.dp)
        ) {
            Text(
                text = saveLabel.uppercase(),
                style = ZoneType.monoSmall,
                color = if (saveEnabled) ZoneTheme.colors.paper else ZoneTheme.colors.muted
            )
        }
    }
}

@Composable
fun ZoneTabScaffold(
    current: String,
    onSelectTab: (String) -> Unit,
    content: @Composable (PaddingValues) -> Unit
) {
    Scaffold(
        containerColor = ZoneTheme.colors.paper,
        bottomBar = { ZoneBottomBar(current, onSelectTab) }
    ) { padding -> content(padding) }
}

@Composable
fun ZoneBottomBar(current: String, onSelectTab: (String) -> Unit) {
    val items = listOf(
        Triple(Routes.HOME, "Home", Icons.Outlined.Home),
        Triple(Routes.PERSONAL, "Personal", Icons.Outlined.Person),
        Triple(Routes.MONEY, "Money", Icons.Outlined.AccountBalanceWallet),
        Triple(Routes.LIBRARY, "Library", Icons.Outlined.AutoStories),
        Triple(Routes.SETTINGS, "Settings", Icons.Outlined.Tune)
    )
    Column(Modifier.background(ZoneTheme.colors.paper)) {
        Rule()
        Row(
            Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .height(62.dp)
        ) {
            items.forEach { (route, label, icon) ->
                val selected = current == route
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxSize()
                        .clickable { if (!selected) onSelectTab(route) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        tint = if (selected) ZoneTheme.colors.accent else ZoneTheme.colors.muted,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = label.uppercase(),
                        style = ZoneType.monoSmall.copy(fontSize = 8.sp, letterSpacing = 0.8.sp),
                        color = if (selected) ZoneTheme.colors.ink else ZoneTheme.colors.muted,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

/**
 * Full-screen detail chrome: a quiet top bar, then content that can scroll.
 * The content lambda owns its own LazyColumn so headers can sit inside it.
 */
@Composable
fun ZoneDetailScaffold(
    title: String,
    onBack: () -> Unit,
    actions: @Composable RowScope.() -> Unit = {},
    bottomBar: @Composable BoxScope.() -> Unit = {},
    content: @Composable BoxScope.() -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(ZoneTheme.colors.paper)
            .statusBarsPadding()
    ) {
        ZoneTopBar(title, onBack, actions)
        Box(
            Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            content()
            bottomBar()
        }
    }
}

@Composable
fun ZoneEditorScaffold(
    title: String,
    onCancel: () -> Unit,
    onSave: () -> Unit,
    saveLabel: String = "Save",
    saveEnabled: Boolean = true,
    content: @Composable BoxScope.() -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(ZoneTheme.colors.paper)
            .statusBarsPadding()
    ) {
        ZoneEditorTopBar(title, onCancel, onSave, saveLabel, saveEnabled)
        Box(
            Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            content()
        }
    }
}

/* =========================================================================
   Surfaces and simple data display
   ========================================================================= */

@Composable
fun ZoneCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    padding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit
) {
    val shape = RoundedCornerShape(14.dp)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(ZoneTheme.colors.raised)
            .border(1.dp, ZoneTheme.colors.line, shape)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(padding),
        content = content
    )
}

@Composable
fun ZoneStat(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
    note: String? = null,
    accent: Boolean = false,
    valueStyle: androidx.compose.ui.text.TextStyle = ZoneType.number
) {
    Column(modifier) {
        Text(
            text = value,
            style = valueStyle,
            color = if (accent) ZoneTheme.colors.accent else ZoneTheme.colors.ink,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Spacer(Modifier.height(4.dp))
        MonoLabel(label, maxLines = 2)
        if (note != null) {
            Spacer(Modifier.height(3.dp))
            Text(note, style = ZoneType.bodySmall, color = ZoneTheme.colors.inkSoft)
        }
    }
}

@Composable
fun ZoneInfoRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    valueColor: Color = ZoneTheme.colors.ink,
    note: String? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 9.dp),
        verticalAlignment = Alignment.Top
    ) {
        Column(Modifier.weight(1f)) {
            MonoLabel(label)
            if (note != null) {
                Spacer(Modifier.height(3.dp))
                Text(note, style = ZoneType.bodySmall, color = ZoneTheme.colors.muted)
            }
        }
        Text(
            text = value,
            style = ZoneType.body,
            color = valueColor,
            textAlign = TextAlign.End,
            modifier = Modifier.padding(start = 16.dp)
        )
    }
}

@Composable
fun ZoneAvatar(name: String, size: Dp = 36.dp, modifier: Modifier = Modifier) {
    val tone = com.zone.desk.util.ZoneMoney.toneFor(name)
    val colors = ZoneTheme.colors
    val background = when (tone) {
        0 -> colors.accentSoft
        1 -> colors.deep
        2 -> colors.sage.copy(alpha = 0.28f)
        3 -> colors.sand.copy(alpha = 0.40f)
        4 -> colors.clay.copy(alpha = 0.30f)
        else -> colors.deep
    }
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(background),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = com.zone.desk.util.ZoneMoney.initials(name),
            style = ZoneType.mono.copy(fontSize = size.value.times(0.29f).sp, letterSpacing = 0.sp),
            color = colors.ink
        )
    }
}

@Composable
fun ZoneEmptyState(
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 28.dp, vertical = 46.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = title,
            style = ZoneType.headline,
            color = ZoneTheme.colors.ink,
            textAlign = TextAlign.Center
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = body,
            style = ZoneType.body,
            color = ZoneTheme.colors.inkSoft,
            textAlign = TextAlign.Center
        )
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(18.dp))
            ZoneGhostButton(actionLabel, onAction)
        }
    }
}

/* =========================================================================
   Actions
   ========================================================================= */

@Composable
fun ZoneButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    icon: ImageVector? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(if (enabled) ZoneTheme.colors.ink else ZoneTheme.colors.deep)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = 15.dp, horizontal = 18.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (enabled) ZoneTheme.colors.paper else ZoneTheme.colors.muted,
                modifier = Modifier.size(16.dp)
            )
            Spacer(Modifier.width(8.dp))
        }
        Text(
            text = text.uppercase(),
            style = ZoneType.mono,
            color = if (enabled) ZoneTheme.colors.paper else ZoneTheme.colors.muted,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun ZoneGhostButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .border(1.dp, ZoneTheme.colors.line, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = ZoneTheme.colors.ink, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(7.dp))
        }
        Text(text.uppercase(), style = ZoneType.monoSmall, color = ZoneTheme.colors.ink)
    }
}

@Composable
fun ZoneAddButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(ZoneTheme.colors.accentSoft)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(Icons.Outlined.Add, contentDescription = null, tint = ZoneTheme.colors.accent, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(7.dp))
        Text(text.uppercase(), style = ZoneType.mono, color = ZoneTheme.colors.accent)
    }
}

@Composable
fun ZoneChip(
    text: String,
    selected: Boolean = false,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(50)
    Row(
        modifier = modifier
            .clip(shape)
            .background(if (selected) ZoneTheme.colors.ink else Color.Transparent)
            .border(1.dp, if (selected) ZoneTheme.colors.ink else ZoneTheme.colors.line, shape)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = text,
            style = ZoneType.monoSmall,
            color = if (selected) ZoneTheme.colors.paper else ZoneTheme.colors.inkSoft,
            maxLines = 1
        )
    }
}

@Composable
fun ZoneSegmented(
    options: List<String>,
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(9.dp))
            .border(1.dp, ZoneTheme.colors.line, RoundedCornerShape(9.dp))
            .padding(3.dp)
    ) {
        options.forEach { option ->
            val active = option == selected
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (active) ZoneTheme.colors.ink else Color.Transparent)
                    .clickable { onSelect(option) }
                    .padding(vertical = 9.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = option,
                    style = ZoneType.monoSmall,
                    color = if (active) ZoneTheme.colors.paper else ZoneTheme.colors.inkSoft,
                    maxLines = 1
                )
            }
        }
    }
}

/* =========================================================================
   Inputs
   ========================================================================= */

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = ZoneTheme.colors.ink,
    unfocusedTextColor = ZoneTheme.colors.ink,
    disabledTextColor = ZoneTheme.colors.muted,
    focusedBorderColor = ZoneTheme.colors.ink,
    unfocusedBorderColor = ZoneTheme.colors.line,
    disabledBorderColor = ZoneTheme.colors.line,
    cursorColor = ZoneTheme.colors.accent,
    focusedContainerColor = ZoneTheme.colors.raised,
    unfocusedContainerColor = ZoneTheme.colors.raised,
    disabledContainerColor = ZoneTheme.colors.deep,
    focusedLabelColor = ZoneTheme.colors.muted,
    unfocusedLabelColor = ZoneTheme.colors.muted
)

@Composable
fun ZoneField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    singleLine: Boolean = true,
    minLines: Int = 1,
    keyboardType: KeyboardType = KeyboardType.Text,
    readOnly: Boolean = false,
    trailing: (@Composable () -> Unit)? = null,
    supporting: String? = null,
    visualTransformation: VisualTransformation = VisualTransformation.None
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label.uppercase(), style = ZoneType.monoSmall) },
        placeholder = if (placeholder != null) {
            { Text(placeholder, style = ZoneType.body, color = ZoneTheme.colors.muted) }
        } else null,
        textStyle = ZoneType.body,
        singleLine = singleLine,
        minLines = minLines,
        readOnly = readOnly,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = visualTransformation,
        trailingIcon = trailing,
        supportingText = if (supporting != null) {
            { Text(supporting, style = ZoneType.monoSmall, color = ZoneTheme.colors.muted) }
        } else null,
        shape = RoundedCornerShape(10.dp),
        colors = fieldColors()
    )
}

@Composable
fun ZoneAreaField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    minLines: Int = 5,
    supporting: String? = null
) {
    ZoneField(
        value = value,
        onValueChange = onValueChange,
        label = label,
        modifier = modifier,
        singleLine = false,
        minLines = minLines,
        supporting = supporting
    )
}

@Composable
fun ZonePicker(
    label: String,
    value: String,
    options: List<String>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Choose"
) {
    var expanded by remember { mutableStateOf(false) }
    Column(modifier) {
        Box {
            val shape = RoundedCornerShape(10.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(shape)
                    .background(ZoneTheme.colors.raised)
                    .border(1.dp, ZoneTheme.colors.line, shape)
                    .clickable { expanded = true }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(Modifier.weight(1f)) {
                    MonoLabel(label)
                    Spacer(Modifier.height(3.dp))
                    Text(
                        text = value.ifBlank { placeholder },
                        style = ZoneType.body,
                        color = if (value.isBlank()) ZoneTheme.colors.muted else ZoneTheme.colors.ink,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Icon(
                    Icons.Outlined.ArrowDropDown,
                    contentDescription = null,
                    tint = ZoneTheme.colors.muted,
                    modifier = Modifier.size(20.dp)
                )
            }
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier.background(ZoneTheme.colors.raised)
            ) {
                options.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option, style = ZoneType.body) },
                        onClick = {
                            onSelect(option)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ZoneDateField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String = "Date",
    modifier: Modifier = Modifier
) {
    var open by remember { mutableStateOf(false) }
    ZoneField(
        value = value,
        onValueChange = { onValueChange(it) },
        label = label,
        modifier = modifier,
        placeholder = "YYYY-MM-DD",
        keyboardType = KeyboardType.Number,
        trailing = {
            IconButton(onClick = { open = true }) {
                Icon(
                    Icons.Outlined.CalendarMonth,
                    contentDescription = "Pick a date",
                    tint = ZoneTheme.colors.inkSoft,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    )
    if (open) {
        val initial = ZoneDates.parse(value)
            ?.atStartOfDay(ZoneOffset.UTC)
            ?.toInstant()
            ?.toEpochMilli()
        val state = rememberDatePickerState(initialSelectedDateMillis = initial)
        DatePickerDialog(
            onDismissRequest = { open = false },
            confirmButton = {
                Text(
                    "Use date",
                    style = ZoneType.mono,
                    color = ZoneTheme.colors.accent,
                    modifier = Modifier
                        .clickable {
                            state.selectedDateMillis?.let { millis ->
                                onValueChange(
                                    Instant.ofEpochMilli(millis)
                                        .atZone(ZoneOffset.UTC)
                                        .toLocalDate()
                                        .toString()
                                )
                            }
                            open = false
                        }
                        .padding(12.dp)
                )
            },
            dismissButton = {
                Text(
                    "Cancel",
                    style = ZoneType.mono,
                    color = ZoneTheme.colors.inkSoft,
                    modifier = Modifier
                        .clickable { open = false }
                        .padding(12.dp)
                )
            }
        ) {
            DatePicker(state = state)
        }
    }
}

@Composable
fun ZoneSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier
) {
    ZoneField(
        value = value,
        onValueChange = onValueChange,
        label = "Search",
        placeholder = placeholder,
        singleLine = true,
        modifier = modifier
    )
}

/* =========================================================================
   Progress and small charts
   ========================================================================= */

@Composable
fun ZoneProgress(
    value: Float,
    modifier: Modifier = Modifier,
    color: Color = ZoneTheme.colors.accent,
    track: Color = ZoneTheme.colors.line,
    height: Dp = 4.dp
) {
    Box(
        modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(50))
            .background(track)
    ) {
        Box(
            Modifier
                .fillMaxWidth(value.coerceIn(0f, 1f))
                .height(height)
                .clip(RoundedCornerShape(50))
                .background(color)
        )
    }
}

@Composable
fun ZoneRing(
    progress: Float,
    size: Dp = 92.dp,
    stroke: Dp = 7.dp,
    color: Color = ZoneTheme.colors.accent,
    track: Color = ZoneTheme.colors.line,
    center: @Composable () -> Unit = {}
) {
    Box(
        modifier = Modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val inset = stroke.toPx() / 2f
            drawArc(
                color = track,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = Offset(inset, inset),
                size = androidx.compose.ui.geometry.Size(this.size.width - inset * 2, this.size.height - inset * 2),
                style = Stroke(width = stroke.toPx(), cap = StrokeCap.Round)
            )
            drawArc(
                color = color,
                startAngle = -90f,
                sweepAngle = 360f * progress.coerceIn(0f, 1f),
                useCenter = false,
                topLeft = Offset(inset, inset),
                size = androidx.compose.ui.geometry.Size(this.size.width - inset * 2, this.size.height - inset * 2),
                style = Stroke(width = stroke.toPx(), cap = StrokeCap.Round)
            )
        }
        center()
    }
}

@Composable
fun ZoneBars(
    values: List<Float>,
    modifier: Modifier = Modifier,
    labels: List<String>? = null,
    height: Dp = 76.dp,
    color: Color = ZoneTheme.colors.ink,
    highlightLast: Boolean = true
) {
    Column(modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(height),
            horizontalArrangement = Arrangement.spacedBy(5.dp),
            verticalAlignment = Alignment.Bottom
        ) {
            values.forEachIndexed { index, value ->
                val active = highlightLast && index == values.lastIndex
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxSize(),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height((height.value * value.coerceIn(0.04f, 1f)).dp)
                            .clip(RoundedCornerShape(topStart = 3.dp, topEnd = 3.dp))
                            .background(if (active) ZoneTheme.colors.accent else color.copy(alpha = 0.72f))
                    )
                }
            }
        }
        if (labels != null) {
            Spacer(Modifier.height(6.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                labels.forEachIndexed { index, label ->
                    Text(
                        text = label,
                        style = ZoneType.monoSmall.copy(fontSize = 8.sp),
                        color = if (highlightLast && index == labels.lastIndex) ZoneTheme.colors.accent else ZoneTheme.colors.muted,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
fun ZoneSparkline(
    values: List<Float>,
    modifier: Modifier = Modifier,
    color: Color = ZoneTheme.colors.accent
) {
    Canvas(modifier.fillMaxWidth().height(54.dp)) {
        if (values.size < 2) return@Canvas
        val min = values.minOrNull() ?: 0f
        val max = values.maxOrNull() ?: 1f
        val span = (max - min).takeIf { it > 0.001f } ?: 1f
        val path = Path()
        values.forEachIndexed { index, value ->
            val x = size.width * index / (values.size - 1).toFloat()
            val y = size.height - ((value - min) / span) * (size.height * 0.82f) - size.height * 0.08f
            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        drawPath(path, color, style = Stroke(width = 2.4.dp.toPx(), cap = StrokeCap.Round))
    }
}

/* =========================================================================
   Dialogs
   ========================================================================= */

@Composable
fun ZoneConfirmDialog(
    title: String,
    body: String,
    confirmLabel: String = "Delete",
    dismissLabel: String = "Keep",
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = ZoneTheme.colors.raised,
        title = { Text(title, style = ZoneType.headline, color = ZoneTheme.colors.ink) },
        text = { Text(body, style = ZoneType.body, color = ZoneTheme.colors.inkSoft) },
        confirmButton = {
            Text(
                confirmLabel.uppercase(),
                style = ZoneType.mono,
                color = ZoneTheme.colors.accent,
                modifier = Modifier
                    .clickable(onClick = onConfirm)
                    .padding(8.dp)
            )
        },
        dismissButton = {
            Text(
                dismissLabel.uppercase(),
                style = ZoneType.mono,
                color = ZoneTheme.colors.inkSoft,
                modifier = Modifier
                    .clickable(onClick = onDismiss)
                    .padding(8.dp)
            )
        }
    )
}

@Composable
fun ZoneTextDialog(
    title: String,
    label: String,
    initial: String = "",
    confirmLabel: String = "Save",
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var value by remember { mutableStateOf(initial) }
    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(ZoneTheme.colors.raised)
                .padding(20.dp)
        ) {
            Text(title, style = ZoneType.headline, color = ZoneTheme.colors.ink)
            Spacer(Modifier.height(14.dp))
            ZoneField(value, { value = it }, label)
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Cancel",
                    style = ZoneType.mono,
                    color = ZoneTheme.colors.inkSoft,
                    modifier = Modifier
                        .clickable(onClick = onDismiss)
                        .padding(10.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    confirmLabel.uppercase(),
                    style = ZoneType.mono,
                    color = ZoneTheme.colors.accent,
                    modifier = Modifier
                        .clickable { if (value.isNotBlank()) onConfirm(value.trim()) }
                        .padding(10.dp)
                )
            }
        }
    }
}

@Composable
fun CheckCircle(
    checked: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 22.dp
) {
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .background(if (checked) ZoneTheme.colors.ink else Color.Transparent)
            .border(1.dp, if (checked) ZoneTheme.colors.ink else ZoneTheme.colors.line, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (checked) {
            Icon(
                Icons.Outlined.Check,
                contentDescription = null,
                tint = ZoneTheme.colors.paper,
                modifier = Modifier.size(size * 0.62f)
            )
        }
    }
}
