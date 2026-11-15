package com.zone.desk.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme

@Composable
fun ZoneNavRow(
    title: String,
    meta: String,
    modifier: Modifier = Modifier,
    index: String? = null,
    note: String? = null,
    trailing: String? = null,
    onClick: (() -> Unit)? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (onClick != null) {
                    Modifier.clickable(onClick = onClick)
                } else Modifier
            )
            .padding(horizontal = 20.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (index != null) {
            Text(
                text = index,
                style = ZoneType.monoSmall,
                color = ZoneTheme.colors.accent,
                modifier = Modifier.width(28.dp)
            )
        }
        Column(Modifier.weight(1f)) {
            Text(
                text = title,
                style = ZoneType.headline.copy(fontSize = 19.sp, lineHeight = 23.sp),
                color = ZoneTheme.colors.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.width(4.dp))
            MonoLabel(meta, maxLines = 2)
            if (note != null) {
                Text(
                    text = note,
                    style = ZoneType.bodySmall,
                    color = ZoneTheme.colors.inkSoft,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 3.dp)
                )
            }
        }
        if (trailing != null) {
            Text(
                text = trailing,
                style = ZoneType.monoSmall,
                color = ZoneTheme.colors.muted,
                modifier = Modifier.padding(start = 10.dp)
            )
        }
        if (onClick != null) {
            Spacer(Modifier.width(6.dp))
            Icon(
                Icons.Outlined.ChevronRight,
                contentDescription = null,
                tint = ZoneTheme.colors.muted,
                modifier = Modifier.size(17.dp)
            )
        }
    }
}

@Composable
fun ZoneTagRow(
    tags: List<String>,
    modifier: Modifier = Modifier,
    selected: String? = null,
    onTag: ((String) -> Unit)? = null
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        tags.forEach { tag ->
            ZoneChip(
                text = if (tag.startsWith("#")) tag else "#$tag",
                selected = selected != null && selected.equals(tag.removePrefix("#"), ignoreCase = true),
                onClick = onTag?.let { { it(tag) } }
            )
        }
    }
}

@Composable
fun ZoneTwoStats(
    leftValue: String,
    leftLabel: String,
    rightValue: String,
    rightLabel: String,
    modifier: Modifier = Modifier,
    leftNote: String? = null,
    rightNote: String? = null
) {
    Row(modifier.fillMaxWidth()) {
        ZoneStat(leftValue, leftLabel, Modifier.weight(1f), leftNote)
        Spacer(Modifier.width(16.dp))
        ZoneStat(rightValue, rightLabel, Modifier.weight(1f), rightNote)
    }
}

@Composable
fun ZoneThreeStats(
    first: Pair<String, String>,
    second: Pair<String, String>,
    third: Pair<String, String>,
    modifier: Modifier = Modifier
) {
    Row(modifier.fillMaxWidth()) {
        ZoneStat(first.first, first.second, Modifier.weight(1f), valueStyle = ZoneType.number.copy(fontSize = 23.sp))
        ZoneStat(second.first, second.second, Modifier.weight(1f), valueStyle = ZoneType.number.copy(fontSize = 23.sp))
        ZoneStat(third.first, third.second, Modifier.weight(1f), valueStyle = ZoneType.number.copy(fontSize = 23.sp))
    }
}

@Composable
fun ZoneDot(color: Color, label: String, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(color)
        )
        Spacer(Modifier.width(6.dp))
        MonoLabel(label)
    }
}

@Composable
fun ZoneNumberBadge(value: String, label: String, modifier: Modifier = Modifier, accent: Boolean = false) {
    Column(
        modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (accent) ZoneTheme.colors.accentSoft else ZoneTheme.colors.deep)
            .padding(horizontal = 12.dp, vertical = 9.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            value,
            style = ZoneType.monoBig,
            color = if (accent) ZoneTheme.colors.accent else ZoneTheme.colors.ink
        )
        MonoLabel(label, maxLines = 1)
    }
}
