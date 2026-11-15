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
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.zone.desk.data.model.Trip
import com.zone.desk.data.model.Vehicle
import com.zone.desk.domain.FleetStats
import com.zone.desk.domain.TripMetrics
import com.zone.desk.domain.fleetStats
import com.zone.desk.domain.latestFill
import com.zone.desk.domain.tripMetrics
import com.zone.desk.domain.vehicleStats
import com.zone.desk.ui.ZoneViewModel
import com.zone.desk.ui.components.MonoLabel
import com.zone.desk.ui.components.Rule
import com.zone.desk.ui.components.SectionLabel
import com.zone.desk.ui.components.ZoneButton
import com.zone.desk.ui.components.ZoneCard
import com.zone.desk.ui.components.ZoneConfirmDialog
import com.zone.desk.ui.components.ZoneDateField
import com.zone.desk.ui.components.ZoneDetailScaffold
import com.zone.desk.ui.components.ZoneEditorScaffold
import com.zone.desk.ui.components.ZoneEmptyState
import com.zone.desk.ui.components.ZoneField
import com.zone.desk.ui.components.ZonePicker
import com.zone.desk.ui.components.ZoneStat
import com.zone.desk.ui.navigation.Routes
import com.zone.desk.ui.theme.ZoneType
import com.zone.desk.ui.theme.ZoneTheme
import com.zone.desk.util.ZoneDates
import com.zone.desk.util.ZoneMoney
import java.util.Locale

private fun km(value: Double): String = if (value <= 0) "\u2014" else String.format(Locale.US, "%,.0f km", value)
private fun kmL(value: Double): String = if (value <= 0) "\u2014" else String.format(Locale.US, "%.1f km/L", value)
private fun litres(value: Double): String = if (value <= 0) "\u2014" else String.format(Locale.US, "%.1f L", value)

@Composable
fun MileageScreen(
    vm: ZoneViewModel,
    onBack: () -> Unit,
    onLog: (String?) -> Unit,
    onVehicle: (String) -> Unit
) {
    val trips by vm.trips.collectAsStateWithLifecycle()
    val vehicles by vm.vehicles.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val fleet = fleetStats(trips)
    val byVehicle = vehicleStats(trips)
    val latest = latestFill(trips)
    val latestMetrics = latest?.let { tripMetrics(it) }

    ZoneDetailScaffold(
        title = "Mileage",
        onBack = onBack,
        actions = {
            Text(
                "Log",
                style = ZoneType.mono,
                color = ZoneTheme.colors.accent,
                modifier = Modifier
                    .clickable { onLog(null) }
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
                    MonoLabel("Fleet \u00B7 ${byVehicle.size} vehicles")
                    Spacer(Modifier.height(10.dp))
                    Text(
                        if (fleet.average > 0) kmL(fleet.average) else "The garage.",
                        style = ZoneType.display,
                        color = ZoneTheme.colors.ink
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        if (fleet.fills == 0) "Log a fill to begin the record." else "${fleet.fills} fills across ${byVehicle.size} vehicles \u00B7 ${km(fleet.distance)} distance.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = km(fleet.distance),
                            label = "Distance",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                        ZoneStat(
                            value = litres(fleet.litres),
                            label = "Fuel used",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                        ZoneStat(
                            value = if (fleet.costPerKm > 0) ZoneMoney.money(fleet.costPerKm, currency) else "\u2014",
                            label = "Cost / km",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row {
                        ZoneStat(
                            value = fleet.fills.toString(),
                            label = "Fills logged",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = kmL(fleet.average),
                            label = "Average",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                        ZoneStat(
                            value = kmL(fleet.best),
                            label = "Best tank",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                    }
                }
            }
            if (latest != null && latestMetrics != null) {
                item { Spacer(Modifier.height(18.dp)) }
                item { SectionLabel("Last stop", trailing = ZoneDates.shortDate(latest.date)) }
                item {
                    ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(ZoneTheme.colors.deep),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("F", style = ZoneType.monoBig, color = ZoneTheme.colors.ink)
                            }
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(latest.vehicle, style = ZoneType.headline.copy(fontSize = 19.sp), color = ZoneTheme.colors.ink)
                                MonoLabel(ZoneDates.prettyDate(latest.date))
                            }
                            Text(kmL(latestMetrics.mileage), style = ZoneType.number.copy(fontSize = 22.sp), color = ZoneTheme.colors.accent)
                        }
                        Spacer(Modifier.height(10.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel("${litres(latestMetrics.litres)} \u00B7 ${ZoneMoney.money(latest.paid, currency)} \u00B7 ${km(latestMetrics.distance)}")
                            Spacer(Modifier.weight(1f))
                            MonoLabel("full tank", color = ZoneTheme.colors.inkSoft)
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("The garage", trailing = "${byVehicle.size} vehicles") }
            if (byVehicle.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "An empty tank.",
                        body = "Log the first fill. Distance, price, and a single receipt are enough.",
                        actionLabel = "Log a fill",
                        onAction = { onLog(null) }
                    )
                }
            } else {
                items(byVehicle, key = { it.name }) { stats ->
                    ZoneCard(
                        Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                        onClick = { onVehicle(stats.name) }
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(stats.name, style = ZoneType.headline.copy(fontSize = 20.sp), color = ZoneTheme.colors.ink, modifier = Modifier.weight(1f))
                            Text(if (stats.average > 0) kmL(stats.average) else "\u2014", style = ZoneType.body, color = ZoneTheme.colors.accent)
                        }
                        Spacer(Modifier.height(3.dp))
                        MonoLabel("${stats.fills} fills \u00B7 ${km(stats.distance)} \u00B7 ${litres(stats.litres)}")
                        Spacer(Modifier.height(7.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MonoLabel("Spent ${ZoneMoney.money(stats.paid, currency)}")
                            Spacer(Modifier.weight(1f))
                            MonoLabel("Best ${kmL(stats.best)}")
                        }
                    }
                }
                item { Spacer(Modifier.height(8.dp)) }
                item {
                    ZoneButton("Log a fill", { onLog(null) }, modifier = Modifier.padding(horizontal = 20.dp))
                }
                if (vehicles.any { vehicle -> byVehicle.none { it.name.equals(vehicle.name, true) } }) {
                    item { Spacer(Modifier.height(8.dp)) }
                }
            }
        }
    }
}

@Composable
fun MileageNewScreen(
    vm: ZoneViewModel,
    initialVehicle: String?,
    onBack: () -> Unit
) {
    val trips by vm.trips.collectAsStateWithLifecycle()
    val vehicles by vm.vehicles.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val names = (vehicles.map { it.name } + trips.map { it.vehicle })
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .distinctBy { it.lowercase() }

    var vehicle by rememberSaveable { mutableStateOf(initialVehicle ?: names.firstOrNull().orEmpty()) }
    var date by rememberSaveable { mutableStateOf(ZoneDates.today()) }
    var price by rememberSaveable { mutableStateOf("") }
    var start by rememberSaveable { mutableStateOf("") }
    var end by rememberSaveable { mutableStateOf("") }
    var paid by rememberSaveable { mutableStateOf("") }
    var note by rememberSaveable { mutableStateOf("") }

    val previous = trips.filter { it.vehicle.equals(vehicle, true) }.maxByOrNull { it.date + it.id }
    LaunchedEffect(vehicle) {
        if (start.isBlank() && previous != null && previous.end > 0) start = previous.end.toString()
    }

    val trip = Trip(
        vehicle = vehicle,
        date = date,
        start = start.toDoubleOrNull() ?: 0.0,
        end = end.toDoubleOrNull() ?: 0.0,
        price = price.toDoubleOrNull() ?: 0.0,
        paid = paid.toDoubleOrNull() ?: 0.0,
        note = note
    )
    val metrics = tripMetrics(trip)

    ZoneEditorScaffold(
        title = "Log a fill",
        onCancel = onBack,
        onSave = {
            vm.saveTrip(trip)
            onBack()
        },
        saveEnabled = vehicle.isNotBlank() && metrics.valid
    ) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 32.dp)
        ) {
            item {
                MonoLabel("Mileage \u00B7 log a fill", color = ZoneTheme.colors.accent)
                Spacer(Modifier.height(8.dp))
                Text("Re-link the chain.", style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                Spacer(Modifier.height(6.dp))
                Text(
                    "One receipt, two odometer readings. The mileage takes care of itself.",
                    style = ZoneType.body,
                    color = ZoneTheme.colors.inkSoft
                )
            }
            item { Spacer(Modifier.height(16.dp)) }
            item {
                ZoneField(vehicle, { vehicle = it }, "Vehicle", placeholder = "Swift")
                if (names.isNotEmpty()) {
                    Spacer(Modifier.height(7.dp))
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .horizontalScrollableRow(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        names.take(6).forEach { name ->
                            Text(
                                name,
                                style = ZoneType.monoSmall,
                                color = if (vehicle.equals(name, true)) ZoneTheme.colors.paper else ZoneTheme.colors.inkSoft,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(if (vehicle.equals(name, true)) ZoneTheme.colors.ink else Color.Transparent)
                                    .clickable { vehicle = name }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }
                if (previous != null) {
                    Spacer(Modifier.height(5.dp))
                    MonoLabel("Previous end \u00B7 ${String.format(Locale.US, "%,.0f", previous.end)} km", color = ZoneTheme.colors.muted)
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item { ZoneDateField(date, { date = it }, "Date") }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneField(
                    price,
                    { price = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    "Price per litre",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    supporting = if ((price.toDoubleOrNull() ?: 0.0) > 0) ZoneMoney.money(price.toDoubleOrNull() ?: 0.0, currency) + " per litre" else null
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ZoneField(
                        start,
                        { start = it.filter { ch -> ch.isDigit() || ch == '.' } },
                        "Start odometer",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                        modifier = Modifier.weight(1f)
                    )
                    ZoneField(
                        end,
                        { end = it.filter { ch -> ch.isDigit() || ch == '.' } },
                        "End odometer",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneField(
                    paid,
                    { paid = it.filter { ch -> ch.isDigit() || ch == '.' } },
                    "Total paid",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    supporting = if ((paid.toDoubleOrNull() ?: 0.0) > 0) ZoneMoney.money(paid.toDoubleOrNull() ?: 0.0, currency) else null
                )
            }
            item { Spacer(Modifier.height(14.dp)) }
            item { ZoneField(note, { note = it }, "Note", placeholder = "City traffic, highway, full tank\u2026") }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneCard(Modifier.background(ZoneTheme.colors.raised)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoLabel("This fill", color = ZoneTheme.colors.accent)
                        Spacer(Modifier.weight(1f))
                        if (metrics.valid) {
                            MonoLabel("valid", color = ZoneTheme.colors.sage)
                        } else {
                            MonoLabel("needs distance, price and spend", color = ZoneTheme.colors.muted)
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Row {
                        ZoneStat(
                            value = km(metrics.distance),
                            label = "Distance",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                        ZoneStat(
                            value = litres(metrics.litres),
                            label = "Litres",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                        ZoneStat(
                            value = kmL(metrics.mileage),
                            label = "Mileage",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp),
                            accent = metrics.valid
                        )
                    }
                    if (metrics.costPerKm > 0) {
                        Spacer(Modifier.height(7.dp))
                        MonoLabel("${ZoneMoney.money(metrics.costPerKm, currency)} per km")
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item {
                ZoneButton("Save fill", {
                    vm.saveTrip(trip)
                    onBack()
                }, enabled = vehicle.isNotBlank() && metrics.valid)
            }
        }
    }
}

@Composable
private fun Modifier.horizontalScrollableRow(): Modifier =
    this.horizontalScroll(rememberScrollState())

@Composable
fun VehicleScreen(
    vm: ZoneViewModel,
    vehicleName: String,
    onBack: () -> Unit,
    onLog: () -> Unit
) {
    val trips by vm.trips.collectAsStateWithLifecycle()
    val vehicles by vm.vehicles.collectAsStateWithLifecycle()
    val settings by vm.settings.collectAsStateWithLifecycle()
    val currency = settings.currency
    val vehicle = vehicles.firstOrNull { it.name.equals(vehicleName, true) }
    val rows = trips.filter { it.vehicle.equals(vehicleName, true) }
    val fleet = fleetStats(rows)
    val stats = vehicleStats(rows).firstOrNull()
    val latest = rows.maxByOrNull { it.date + it.id }
    var editOpen by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    if (editOpen) {
        VehicleDialog(
            initial = vehicle ?: Vehicle(name = vehicleName, type = "car", fuel = "petrol", createdAt = ZoneDates.today()),
            onDismiss = { editOpen = false },
            onSave = {
                vm.saveVehicle(it)
                editOpen = false
            }
        )
    }
    if (confirmDelete) {
        ZoneConfirmDialog(
            title = "Remove this vehicle?",
            body = "Its fills stay in the log, but the garage entry will be removed.",
            onConfirm = {
                confirmDelete = false
                vehicle?.let { vm.deleteVehicle(it.id) }
                onBack()
            },
            onDismiss = { confirmDelete = false }
        )
    }

    ZoneDetailScaffold(
        title = vehicleName,
        onBack = onBack,
        actions = {
            IconButton(onClick = { editOpen = true }) {
                Icon(Icons.Outlined.Edit, contentDescription = "Edit vehicle", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
            }
            if (vehicle != null) {
                IconButton(onClick = { confirmDelete = true }) {
                    Icon(Icons.Outlined.Delete, contentDescription = "Remove vehicle", tint = ZoneTheme.colors.inkSoft, modifier = Modifier.size(18.dp))
                }
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
                        MonoLabel("${(vehicle?.type ?: "car").uppercase()} \u00B7 ${(vehicle?.fuel ?: "petrol").uppercase()}", color = ZoneTheme.colors.accent)
                        Spacer(Modifier.weight(1f))
                        MonoLabel(if (vehicle != null) "Since ${ZoneDates.shortDate(vehicle.createdAt)}" else "${rows.size} fills")
                    }
                    Spacer(Modifier.height(7.dp))
                    Text(vehicleName, style = ZoneType.displaySmall, color = ZoneTheme.colors.ink)
                    Spacer(Modifier.height(7.dp))
                    Text(
                        if (fleet.average > 0) "${kmL(fleet.average)} lifetime average across ${rows.size} fills." else "No fills logged yet.",
                        style = ZoneType.body,
                        color = ZoneTheme.colors.inkSoft
                    )
                    Spacer(Modifier.height(14.dp))
                    Row {
                        ZoneStat(
                            value = km(fleet.distance),
                            label = "Logged",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                        ZoneStat(
                            value = litres(fleet.litres),
                            label = "Fuel",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                        ZoneStat(
                            value = ZoneMoney.compact(fleet.paid, currency),
                            label = "Spent",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 22.sp)
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneCard(Modifier.padding(horizontal = 20.dp)) {
                    Row {
                        ZoneStat(
                            value = kmL(fleet.average),
                            label = "Lifetime avg",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = kmL(fleet.best),
                            label = "Best tank",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 24.sp)
                        )
                        ZoneStat(
                            value = if (fleet.costPerKm > 0) ZoneMoney.money(fleet.costPerKm, currency) else "\u2014",
                            label = "Cost / km",
                            modifier = Modifier.weight(1f),
                            valueStyle = ZoneType.number.copy(fontSize = 21.sp)
                        )
                    }
                    if (latest != null) {
                        Spacer(Modifier.height(8.dp))
                        Rule()
                        Spacer(Modifier.height(8.dp))
                        MonoLabel("Latest fill \u00B7 ${ZoneDates.prettyDate(latest.date)} \u00B7 ${ZoneMoney.money(latest.paid, currency)}")
                    }
                }
            }
            item { Spacer(Modifier.height(18.dp)) }
            item { SectionLabel("Recent fills", trailing = "${rows.size}") }
            if (rows.isEmpty()) {
                item {
                    ZoneEmptyState(
                        title = "The first tank.",
                        body = "Log a fill and the record begins.",
                        actionLabel = "Log a fill",
                        onAction = onLog
                    )
                }
            } else {
                items(rows.sortedByDescending { it.date + it.id }, key = { it.id }) { trip ->
                    FillRow(trip, currency, onDelete = { vm.deleteTrip(trip.id) })
                    Rule(Modifier.padding(horizontal = 20.dp))
                }
            }
            item { Spacer(Modifier.height(14.dp)) }
            item {
                ZoneButton("Log a fill", onLog, modifier = Modifier.padding(horizontal = 20.dp))
            }
        }
    }
}

@Composable
private fun FillRow(trip: Trip, currency: String, onDelete: () -> Unit) {
    val metrics = tripMetrics(trip)
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                MonoLabel(ZoneDates.prettyDate(trip.date))
                Spacer(Modifier.width(8.dp))
                MonoLabel("${String.format(Locale.US, "%,.0f", trip.start)} \u2192 ${String.format(Locale.US, "%,.0f", trip.end)} km", color = ZoneTheme.colors.muted)
            }
            Spacer(Modifier.height(4.dp))
            Text(
                trip.note.ifBlank { if (metrics.valid) "Full tank" else "Incomplete fill" },
                style = ZoneType.bodySmall,
                color = ZoneTheme.colors.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            MonoLabel("${km(metrics.distance)} \u00B7 ${litres(metrics.litres)} \u00B7 ${ZoneMoney.money(trip.paid, currency)}")
        }
        Text(
            kmL(metrics.mileage),
            style = ZoneType.body,
            color = if (metrics.valid) ZoneTheme.colors.accent else ZoneTheme.colors.muted
        )
        Spacer(Modifier.width(5.dp))
        IconButton(onClick = onDelete, modifier = Modifier.size(30.dp)) {
            Icon(Icons.Outlined.Delete, contentDescription = "Delete fill", tint = ZoneTheme.colors.muted, modifier = Modifier.size(15.dp))
        }
    }
}

@Composable
private fun VehicleDialog(initial: Vehicle, onDismiss: () -> Unit, onSave: (Vehicle) -> Unit) {
    var name by rememberSaveable { mutableStateOf(initial.name) }
    var type by rememberSaveable { mutableStateOf(initial.type) }
    var fuel by rememberSaveable { mutableStateOf(initial.fuel) }
    val types = listOf("car", "scooter", "bike", "suv", "truck")
    val fuels = listOf("petrol", "diesel", "electric", "cng", "hybrid")

    Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(ZoneTheme.colors.raised)
                .padding(20.dp)
        ) {
            Text("Edit vehicle", style = ZoneType.headline, color = ZoneTheme.colors.ink)
            Spacer(Modifier.height(14.dp))
            ZoneField(name, { name = it }, "Name")
            Spacer(Modifier.height(12.dp))
            ZonePicker("Type", type.replaceFirstChar { it.uppercase() }, types.map { it.replaceFirstChar { c -> c.uppercase() } }, { picked ->
                type = picked.lowercase()
            })
            Spacer(Modifier.height(12.dp))
            ZonePicker("Fuel", fuel.replaceFirstChar { it.uppercase() }, fuels.map { it.replaceFirstChar { c -> c.uppercase() } }, { picked ->
                fuel = picked.lowercase()
            })
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
                            onSave(initial.copy(name = name.trim(), type = type, fuel = fuel))
                        }
                        .padding(10.dp)
                )
            }
        }
    }
}
