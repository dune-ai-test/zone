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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.domain.linkStats
import com.zone.desk.domain.monthlyOf
import com.zone.desk.domain.nextEpisode
import com.zone.desk.domain.subscriptionSummary
import com.zone.desk.domain.watchPick
import com.zone.desk.domain.watchProgress
import com.zone.desk.domain.watchStats
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneGhostButton
import com.zone.desk.ui.components.ZoneNavRow
import com.zone.desk.ui.components.ZoneProgress
import com.zone.desk.ui.components.ZoneRootHeader
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.components.ZoneTabScaffold
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneMoney
import java.util.Locale

@Composable
fun LibraryScreen(
    vm: ZoneViewModel,
    onSelectTab: (String) -> Unit,
    onOpen: (String) -> Unit
) {
    val watchlist by vm.watchlist.collectAsStateWithLifecycle()
    val links by vm.links.collectAsStateWithLifecycle()
    val subscriptions by vm.subscriptions.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val watch = watchStats(watchlist)
    val linkMeta = linkStats(links)
    val subs = subscriptionSummary(subscriptions)
    var shuffleIndex by remember { mutableIntStateOf(0) }
    val pool = watchlist.filter { it.status == "Watching" || it.status == "Queued" }.ifEmpty { watchlist }
    val pick = if (pool.isEmpty()) null else pool[shuffleIndex % pool.size]
    val next = pick?.let { nextEpisode(it) }
    val pickProgress = pick?.let { watchProgress(it) } ?: 0

    ZoneTabScaffold(current = Routes.LIBRARY, onSelectTab = onSelectTab) { inner ->
        LazyColumn(
            Modifier.fillMaxSize().padding(inner),
            contentPadding = PaddingValues(bottom = 30.dp)
        ) {
            item {
                ZoneRootHeader(
                    eyebrow = "Library \u00B7 3 tools",
                    title = "The shelf, not the algorithm.",
                    subtitle = "A watchlist with intent, corners worth keeping, and the quiet cost of subscriptions."
                )
            }
            if (pick != null) {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel("Tonight's pick", color = ZoneTheme.colors.accent)
                            Spacer(Modifier.weight(1f))
                            if (pick.rating > 0) {
                                Text(
                                    String.format(Locale.US, "%.1f", pick.rating),
                                    style = ZoneType.number.copy(fontSize = 20.sp),
                                    color = ZoneTheme.colors.ink
                                )
                                Spacer(Modifier.width(3.dp))
                                MonoLabel("/ 10")
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            pick.title,
                            style = ZoneType.displaySmall.copy(fontSize = 27.sp),
                            color = ZoneTheme.colors.ink,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(Modifier.height(4.dp))
                        MonoLabel(
                            listOfNotNull(
                                pick.year.takeIf { it > 0 }?.toString(),
                                pick.genre.takeIf { it.isNotBlank() },
                                pick.service.takeIf { it.isNotBlank() }
                            ).joinToString(" \u00B7 "),
                            maxLines = 1
                        )
                        Spacer(Modifier.height(11.dp))
                        ZoneProgress(pickProgress / 100f)
                        Spacer(Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel(
                                next?.label?.let { "$it next \u00B7 ${next.remaining} left" }
                                    ?: if (pick.status == "Watched") "Watched" else "${pickProgress}% through"
                            )
                            Spacer(Modifier.weight(1f))
                            MonoLabel("${pickProgress}%")
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ZoneGhostButton("Watch now", { onOpen(Routes.watchDetail(pick.id)) })
                            Spacer(Modifier.weight(1f))
                            Text(
                                "Shuffle the shelf",
                                style = ZoneType.monoSmall,
                                color = ZoneTheme.colors.accent,
                                modifier = Modifier
                                    .clickable {
                                        if (pool.isNotEmpty()) shuffleIndex = (shuffleIndex + 1) % pool.size
                                    }
                                    .padding(7.dp)
                            )
                        }
                    }
                }
            } else {
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Text("The shelf is empty.", style = ZoneType.headline, color = ZoneTheme.colors.ink)
                        Spacer(Modifier.height(4.dp))
                        Text("Add the first title. Zone will keep the place.", style = ZoneType.bodySmall, color = ZoneTheme.colors.inkSoft)
                        Spacer(Modifier.height(10.dp))
                        ZoneButton("Add a title", { onOpen(Routes.watchNew()) })
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("The three shelves", trailing = "Library") }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                    ZoneNavRow(
                        title = "Watchlist",
                        meta = "${watch.watching} watching \u00B7 ${watch.queued} queued \u00B7 ${watch.pctWatched}% of shelf watched",
                        index = "01",
                        onClick = { onOpen(Routes.WATCHLIST) }
                    )
                    Rule()
                    ZoneNavRow(
                        title = "Links",
                        meta = "${linkMeta.total} saved \u00B7 ${linkMeta.favorites} favorites \u00B7 ${linkMeta.domains.size} domains",
                        index = "02",
                        onClick = { onOpen(Routes.LINKS) }
                    )
                    Rule()
                    ZoneNavRow(
                        title = "Subscriptions",
                        meta = "${subs.active} active \u00B7 ${ZoneMoney.money(subs.monthly, currency)} /mo \u00B7 ${subs.next?.let { "next ${it.name} ${ZoneDates.relativeShort(it.next)}" } ?: "nothing due"}",
                        index = "03",
                        onClick = { onOpen(Routes.SUBSCRIPTIONS) }
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                Row(Modifier.padding(horizontal = 20.dp)) {
                    ZoneStat(
                        value = watch.total.toString(),
                        label = "Titles",
                        modifier = Modifier.weight(1f),
                        valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                    )
                    ZoneStat(
                        value = linkMeta.total.toString(),
                        label = "Saved corners",
                        modifier = Modifier.weight(1f),
                        valueStyle = ZoneType.number.copy(fontSize = 25.sp)
                    )
                    ZoneStat(
                        value = ZoneMoney.compact(subs.monthly, currency),
                        label = "Monthly shelf",
                        modifier = Modifier.weight(1f),
                        valueStyle = ZoneType.number.copy(fontSize = 23.sp)
                    )
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Due this week", trailing = "${subs.thisWeek.size} charges") }
            item {
                if (subs.thisWeek.isEmpty()) {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Text("The calendar is quiet this week.", style = ZoneType.body, color = ZoneTheme.colors.inkSoft)
                    }
                } else {
                    ZoneCard(Modifier.padding(horizontal = 20.dp), padding = PaddingValues(0.dp)) {
                        subs.thisWeek.forEachIndexed { index, sub ->
                            if (index > 0) Rule()
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clickable { onOpen(Routes.subscriptionNew(sub.id)) }
                                    .padding(horizontal = 14.dp, vertical = 11.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(ZoneTheme.colors.deep)
                                        .padding(horizontal = 7.dp, vertical = 5.dp)
                                ) {
                                    MonoLabel(ZoneDates.shortDate(sub.next).uppercase())
                                }
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(sub.name, style = ZoneType.body, color = ZoneTheme.colors.ink)
                                    MonoLabel(sub.category)
                                }
                                Text(ZoneMoney.money(monthlyOf(sub), currency), style = ZoneType.body, color = ZoneTheme.colors.ink)
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    MonoLabel("The shelf, not the algorithm", color = ZoneTheme.colors.accent)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        "Tonight's pick listens to what you already chose. No feed, no infinite scroll \u2014 just the things you meant to get to.",
                        style = ZoneType.bodySmall,
                        color = ZoneTheme.colors.inkSoft
                    )
                }
            }
        }
    }
}
