/* Zone — mileage instrument cluster */

(function () {
  "use strict";

  var esc = Z.esc;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var TYPE_META = {
    bike: { label: "Bike" },
    scooter: { label: "Scooter" },
    car: { label: "Car" },
    suv: { label: "SUV" },
    truck: { label: "Truck" }
  };

  var CURRENCY_META = {
    INR: { code: "INR", locale: "en-IN", symbol: "₹" },
    USD: { code: "USD", locale: "en-US", symbol: "$" },
    EUR: { code: "EUR", locale: "de-DE", symbol: "€" },
    GBP: { code: "GBP", locale: "en-GB", symbol: "£" }
  };

  var CHART_COLORS = ["#c9a164", "#7e97a6", "#92a88d", "#c78f79", "#a596b7"];
  var MAX_GAUGE = 40;

  var form = $("mileage-form");
  var idField = $("trip-id");
  var vehicleField = $("trip-vehicle");
  var dateField = $("trip-date");
  var startField = $("trip-start");
  var endField = $("trip-end");
  var priceField = $("trip-price");
  var paidField = $("trip-paid");
  var noteField = $("trip-note");
  var saveButton = $("save-trip");
  var cancelButton = $("cancel-trip");
  var modeLabel = $("calc-mode");
  var chartHost = $("mileage-chart");
  var chartLegend = $("chart-legend");
  var tableBody = $("trips-body");
  var filterField = $("vehicle-filter");
  var chartField = $("chart-vehicle");
  var statsHost = $("mileage-stats");
  var compareHost = $("mileage-compare");
  var vehicleGrid = $("vehicle-grid");
  var vehiclePicker = $("vehicle-picker");
  var vehicleCount = $("vehicle-count");
  var logCount = $("log-count");
  var fleetStatsHost = $("fleet-stats");
  var pulseMeta = $("pulse-meta");
  var latestFillHost = $("latest-fill");
  var logSearchField = $("log-search");
  var logSortField = $("log-sort");
  var chainStrip = $("chain-strip");
  var chainLast = $("chain-last");
  var chainStart = $("chain-start");
  var chainNote = $("chain-note");
  var chainReset = $("chain-reset");
  var gaugeCard = $("gauge-card");
  var gaugeArc = $("gauge-arc");
  var gaugeNeedle = $("gauge-needle");
  var gaugeTicks = $("gauge-ticks");
  var gaugeMode = $("gauge-mode");
  var gaugeModeLabel = $("gauge-mode-label");
  var gaugeSub = $("gauge-sub");
  var gaugeDelta = $("gauge-delta");
  var gaugeDesc = $("gauge-desc");
  var calcValue = $("calc-value");
  var calcDistance = $("calc-distance");
  var calcLitres = $("calc-litres");
  var calcCost = $("calc-cost");
  var calcFormula = $("calc-formula");
  var priceSuffix = $("price-suffix");
  var paidSuffix = $("paid-suffix");
  var currencyToggle = $("currency-toggle");
  var vehicleDialog = $("vehicle-dialog");
  var vehicleForm = $("vehicle-form");
  var vehicleNameField = $("vehicle-name");
  var fuelDatalist = $("vehicle-options");
  var dataDialog = $("mileage-data-dialog");
  var dataVehicleCount = $("data-vehicle-count");
  var dataFillCount = $("data-fill-count");
  var dataCurrencyLabel = $("data-currency-label");
  var dataFileInput = $("import-mileage-file");
  var importStatus = $("mileage-import-status");
  var applyImportButton = $("apply-mileage-import");
  var datePickerMax = Z.todayISO();

  var SAVE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && isFinite(value);
  }

  function sameName(a, b) {
    return String(a == null ? "" : a).trim().toLowerCase() === String(b == null ? "" : b).trim().toLowerCase();
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeType(value) {
    var key = String(value || "").toLowerCase();
    return TYPE_META[key] ? key : "car";
  }

  function normalizeFuel(value) {
    return String(value || "").toLowerCase() === "diesel" ? "diesel" : "petrol";
  }

  function inferType(name) {
    var value = String(name || "").toLowerCase();
    if (/scooter|activa|vespa|jupiter|nmax|burgman|pleasure/.test(value)) return "scooter";
    if (/bike|enfield|bullet|classic|pulsar|duke|r15|fz-|fz |mt-|ninja|himalayan|dominar/.test(value)) return "bike";
    if (/suv|fortuner|scorpio|creta|xuv|seltos|thar|brezza|breza|harrier|safari|endeavour/.test(value)) return "suv";
    if (/truck|lorry|tempo|pickup|canter|eicher|ace/.test(value)) return "truck";
    return "car";
  }

  function loadTrips() {
    var source = Z.store.get("trips", []);
    var list = [];
    if (!Array.isArray(source)) return list;
    source.forEach(function (trip, index) {
      if (!isObject(trip)) return;
      var copy = {};
      Object.keys(trip).forEach(function (key) { copy[key] = trip[key]; });
      copy.id = String(copy.id == null || copy.id === "" ? "legacy-trip-" + index : copy.id);
      copy.vehicle = String(copy.vehicle == null ? "" : copy.vehicle).trim() || "Unnamed vehicle";
      list.push(copy);
    });
    return list;
  }

  function loadVehicles() {
    var source = Z.store.get("vehicles", []);
    var list = [];
    var seen = {};
    if (!Array.isArray(source)) return list;
    source.forEach(function (vehicle, index) {
      if (!isObject(vehicle)) return;
      var name = String(vehicle.name == null ? "" : vehicle.name).trim().slice(0, 40);
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      list.push({
        id: String(vehicle.id == null || vehicle.id === "" ? "vehicle-" + index : vehicle.id),
        name: name,
        type: normalizeType(vehicle.type),
        fuel: normalizeFuel(vehicle.fuel),
        createdAt: String(vehicle.createdAt || "")
      });
    });
    return list;
  }

  function readCurrency() {
    var saved = String(Z.store.get("mileage_currency", "") || "").toUpperCase();
    return CURRENCY_META[saved] ? saved : "INR";
  }

  var trips = loadTrips();
  var storedVehicles = loadVehicles();
  var currency = readCurrency();
  var currentFilter = "all";
  var chartFilter = "all";
  var logQuery = "";
  var logSort = "recent";
  var gaugeFirst = true;
  var gaugeTimer = null;
  var pendingGauge = 0;
  var lastCalcText = "";
  var autoStartValue = "";
  var autoEndValue = "";
  var pendingImport = null;

  dateField.max = datePickerMax;
  dateField.value = datePickerMax;

  function currencyInfo() {
    return CURRENCY_META[currency] || CURRENCY_META.INR;
  }

  function symbol() {
    return currencyInfo().symbol;
  }

  function formatCount(value, digits) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    var places = typeof digits === "number" ? digits : 0;
    try {
      return new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: places,
        maximumFractionDigits: places
      }).format(n);
    } catch (error) {
      return n.toFixed(places);
    }
  }

  function formatMoney(value, digits) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    var places = typeof digits === "number" ? digits : 0;
    var meta = currencyInfo();
    try {
      return new Intl.NumberFormat(meta.locale, {
        style: "currency",
        currency: meta.code,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: places,
        maximumFractionDigits: places
      }).format(n);
    } catch (error) {
      return meta.symbol + formatCount(n, places);
    }
  }

  function parseDate(iso) {
    var text = String(iso || "").slice(0, 10);
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var result = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isNaN(result.getTime()) ? null : result;
  }

  function dateFull(iso) {
    var date = parseDate(iso);
    if (!date) return String(iso || "—");
    try {
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch (error) {
      return String(iso);
    }
  }

  function dateShort(iso) {
    var date = parseDate(iso);
    if (!date) return String(iso || "—");
    try {
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    } catch (error) {
      return String(iso);
    }
  }

  function dateRelative(iso) {
    var date = parseDate(iso);
    var today = parseDate(datePickerMax);
    if (!date || !today) return dateFull(iso);
    var diff = Math.round((today.getTime() - date.getTime()) / 86400000);
    if (diff <= 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 30) return diff + " days ago";
    return dateShort(iso) + " " + yearOf(iso);
  }

  function yearOf(iso) {
    var match = String(iso || "").match(/^(\d{4})-/);
    return match ? match[1] : "";
  }

  function tripTime(iso) {
    var date = parseDate(iso);
    return date ? date.getTime() : 0;
  }

  function sortTripsDesc(a, b) {
    var byDate = String(b.date || "").localeCompare(String(a.date || ""));
    if (byDate) return byDate;
    var endDiff = Number(b.end) - Number(a.end);
    if (isFinite(endDiff) && endDiff) return endDiff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  }

  function sortTripsAsc(a, b) {
    return sortTripsDesc(b, a);
  }

  function metrics(trip) {
    var start = Number(trip && trip.start);
    var end = Number(trip && trip.end);
    var price = Number(trip && trip.price);
    var paid = Number(trip && trip.paid);
    var distance = end - start;
    var litres = price > 0 ? paid / price : 0;
    var mileage = litres > 0 ? distance / litres : 0;
    var cost = distance > 0 ? paid / distance : 0;
    var valid = isFinite(start) && isFinite(end) && isFinite(price) && isFinite(paid) &&
      distance > 0 && price > 0 && paid > 0 && litres > 0 && mileage > 0 && cost > 0;
    return {
      start: start,
      end: end,
      price: price,
      paid: paid,
      distance: distance,
      litres: litres,
      mileage: mileage,
      cost: cost,
      valid: valid
    };
  }

  function allVehicles() {
    var map = {};
    var list = [];
    storedVehicles.forEach(function (vehicle) {
      var key = vehicle.name.toLowerCase();
      if (!map[key]) {
        map[key] = {
          id: vehicle.id,
          name: vehicle.name,
          type: normalizeType(vehicle.type),
          fuel: normalizeFuel(vehicle.fuel),
          stored: true
        };
        list.push(map[key]);
      }
    });
    trips.forEach(function (trip) {
      var name = String(trip.vehicle || "").trim();
      if (!name) return;
      var key = name.toLowerCase();
      if (!map[key]) {
        map[key] = {
          id: "derived-" + (slug(name) || "vehicle"),
          name: name,
          type: inferType(name),
          fuel: "petrol",
          stored: false
        };
        list.push(map[key]);
      }
    });
    list.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }); });
    return list;
  }

  function findVehicle(name) {
    var list = allVehicles();
    for (var i = 0; i < list.length; i += 1) {
      if (sameName(list[i].name, name)) return list[i];
    }
    return null;
  }

  function canonicalName(name) {
    var found = findVehicle(name);
    return found ? found.name : String(name || "").trim();
  }

  function tripsFor(name) {
    return trips.filter(function (trip) { return sameName(trip.vehicle, name); });
  }

  function latestTripFor(name, excludeId) {
    var rows = tripsFor(name).filter(function (trip) {
      if (excludeId && String(trip.id) === String(excludeId)) return false;
      return String(trip.end == null ? "" : trip.end).trim() !== "" && isFinite(Number(trip.end));
    });
    rows.sort(sortTripsDesc);
    return rows[0] || null;
  }

  function hasReading(value) {
    return String(value == null ? "" : value).trim() !== "" && isFinite(Number(value));
  }

  function latestTripOnOrBefore(name, date, excludeId) {
    var cutoff = String(date || datePickerMax).slice(0, 10);
    var rows = tripsFor(name).filter(function (trip) {
      if (excludeId && String(trip.id) === String(excludeId)) return false;
      var tripDate = String(trip.date || "").slice(0, 10);
      return tripDate !== "" && tripDate <= cutoff && hasReading(trip.end);
    });
    rows.sort(sortTripsDesc);
    return rows[0] || null;
  }

  function nextTripAfter(name, date, excludeId) {
    var cutoff = String(date || datePickerMax).slice(0, 10);
    var rows = tripsFor(name).filter(function (trip) {
      if (excludeId && String(trip.id) === String(excludeId)) return false;
      var tripDate = String(trip.date || "").slice(0, 10);
      return tripDate !== "" && tripDate > cutoff && hasReading(trip.start) && hasReading(trip.end);
    });
    rows.sort(sortTripsAsc);
    return rows[0] || null;
  }

  function chainNeighbors(name, date, start, end, excludeId) {
    var cutoff = String(date || datePickerMax).slice(0, 10);
    var prev = null;
    var next = null;
    var overlap = null;
    tripsFor(name).forEach(function (trip) {
      if (excludeId && String(trip.id) === String(excludeId)) return;
      if (!hasReading(trip.start) || !hasReading(trip.end)) return;
      var tripDate = String(trip.date || "").slice(0, 10);
      if (!tripDate) return;
      var tripStart = Number(trip.start);
      var tripEnd = Number(trip.end);

      if (tripDate < cutoff) {
        if (!prev || sortTripsDesc(trip, prev) < 0) prev = trip;
        return;
      }
      if (tripDate > cutoff) {
        if (!next || sortTripsAsc(trip, next) < 0) next = trip;
        return;
      }
      if (start != null && isFinite(start) && tripEnd <= start) {
        if (!prev || sortTripsDesc(trip, prev) < 0) prev = trip;
        return;
      }
      if (end != null && isFinite(end) && tripStart >= end) {
        if (!next || sortTripsAsc(trip, next) < 0) next = trip;
        return;
      }
      if (start != null && end != null && isFinite(start) && isFinite(end)) {
        overlap = trip;
      }
    });
    return { prev: prev, next: next, overlap: overlap };
  }

  function aggregateFor(name) {
    var rows = tripsFor(name);
    var result = {
      rows: rows,
      count: rows.length,
      validCount: 0,
      distance: 0,
      litres: 0,
      paid: 0,
      average: 0,
      best: 0
    };
    rows.forEach(function (trip) {
      var m = metrics(trip);
      if (!m.valid) return;
      result.validCount += 1;
      result.distance += m.distance;
      result.litres += m.litres;
      result.paid += m.paid;
      if (m.mileage > result.best) result.best = m.mileage;
    });
    result.average = result.litres > 0 ? result.distance / result.litres : 0;
    return result;
  }

  function computeTotals() {
    var result = {
      count: trips.length,
      validCount: 0,
      distance: 0,
      litres: 0,
      paid: 0,
      average: 0,
      best: 0,
      bestVehicle: ""
    };
    trips.forEach(function (trip) {
      var m = metrics(trip);
      if (!m.valid) return;
      result.validCount += 1;
      result.distance += m.distance;
      result.litres += m.litres;
      result.paid += m.paid;
      if (m.mileage > result.best) {
        result.best = m.mileage;
        result.bestVehicle = canonicalName(trip.vehicle);
      }
    });
    result.average = result.litres > 0 ? result.distance / result.litres : 0;
    return result;
  }

  function ensureVehicle(name) {
    var existing = findVehicle(name);
    if (existing) return existing;
    var record = {
      id: Z.uid("vehicle"),
      name: String(name || "").trim().slice(0, 40),
      type: inferType(name),
      fuel: "petrol",
      createdAt: datePickerMax
    };
    storedVehicles.push(record);
    Z.store.set("vehicles", storedVehicles);
    return record;
  }

  function colorFor(name) {
    var list = allVehicles();
    for (var i = 0; i < list.length; i += 1) {
      if (sameName(list[i].name, name)) return CHART_COLORS[i % CHART_COLORS.length];
    }
    return CHART_COLORS[0];
  }

  function vehicleArt(type) {
    var kind = normalizeType(type);
    var art = "";

    function wheel(cx, cy, radius) {
      return '<g class="mi-wheel">' +
        '<circle class="mi-art-fill" cx="' + cx + '" cy="' + cy + '" r="' + radius + '"></circle>' +
        '<circle class="mi-art-line" cx="' + cx + '" cy="' + cy + '" r="' + radius + '"></circle>' +
        '<circle class="mi-art-soft" cx="' + cx + '" cy="' + cy + '" r="' + (radius * 0.55).toFixed(1) + '"></circle>' +
        '<path class="mi-art-soft" d="M' + (cx - radius * 0.6).toFixed(1) + ' ' + cy + 'H' + (cx + radius * 0.6).toFixed(1) +
        'M' + cx + ' ' + (cy - radius * 0.6).toFixed(1) + 'V' + (cy + radius * 0.6).toFixed(1) + '"></path>' +
        '<circle class="mi-art-line" cx="' + cx + '" cy="' + cy + '" r="2.2"></circle>' +
        '</g>';
    }

    if (kind === "bike") {
      art = '<ellipse class="mi-art-shadow" cx="110" cy="92" rx="74" ry="4"></ellipse>' +
        wheel(57, 78, 18) +
        wheel(164, 78, 18) +
        '<path class="mi-art-line" d="M57 78 94 46 113 77 57 78M94 46 139 40 164 78M113 77 139 40"></path>' +
        '<path class="mi-art-fill" d="M92 45h27l-4 12H89z"></path>' +
        '<path class="mi-art-line" d="M78 42h16l-2 7H79zM139 40l-3-13M132 27h15M115 59l8 13"></path>' +
        '<circle class="mi-art-light" cx="158" cy="50" r="3.1"></circle>' +
        '<path class="mi-art-soft" d="M66 82h18M151 82h19M89 55h19"></path>';
    } else if (kind === "scooter") {
      art = '<ellipse class="mi-art-shadow" cx="110" cy="92" rx="70" ry="4"></ellipse>' +
        wheel(55, 79, 14) +
        wheel(165, 79, 14) +
        '<path class="mi-art-fill" d="M54 65h27l14-14h18l7 14 20 3c11 2 17 7 19 13H54z"></path>' +
        '<path class="mi-art-line" d="M54 65c4-7 9-11 18-12h9l6 13H54zM102 53h18l15 2 12 13M139 43l13 4M145 34l8 8M73 52h24l-2 7H73z"></path>' +
        '<path class="mi-art-soft" d="M111 74h26l9 7M64 82h15M149 82h20"></path>' +
        '<circle class="mi-art-light" cx="159" cy="52" r="3"></circle>';
    } else if (kind === "suv") {
      art = '<ellipse class="mi-art-shadow" cx="110" cy="93" rx="83" ry="4"></ellipse>' +
        '<path class="mi-art-fill" d="M23 73c1-8 8-12 18-14l20-2 13-16h54l18 15 28 4c9 2 15 6 17 13l2 7H23z"></path>' +
        '<path class="mi-art-line" d="M23 73c1-8 8-12 18-14l20-2 13-16h54l18 15 28 4c9 2 15 6 17 13l2 7H23zM73 41h49v13H78zM128 41h18l16 13h-34z"></path>' +
        wheel(60, 79, 16) +
        wheel(164, 79, 16) +
        '<path class="mi-art-line" d="M56 70c2-8 8-12 16-11M149 59h16M139 57v15M26 65h12M197 64h5"></path>' +
        '<path class="mi-art-soft" d="M74 34h49M118 34h18M39 51h22M24 78h26M176 78h25"></path>' +
        '<circle class="mi-art-light" cx="199" cy="65" r="3"></circle>';
    } else if (kind === "truck") {
      art = '<ellipse class="mi-art-shadow" cx="111" cy="93" rx="88" ry="4"></ellipse>' +
        '<path class="mi-art-fill" d="M19 38h112v38H19zM131 50h27l23 15v11h-50z"></path>' +
        '<path class="mi-art-line" d="M19 38h112v38H19zM131 50h27l23 15v11h-50zM157 51v13h22M136 62h13"></path>' +
        '<path class="mi-art-soft" d="M27 44h88M27 50h88M27 56h88M27 62h88"></path>' +
        wheel(54, 80, 15) +
        wheel(112, 80, 15) +
        wheel(165, 80, 15) +
        '<path class="mi-art-line" d="M29 76h14M128 76h17M181 76h13M133 73h27"></path>' +
        '<circle class="mi-art-light" cx="181" cy="66" r="3.1"></circle>';
    } else {
      art = '<ellipse class="mi-art-shadow" cx="110" cy="93" rx="83" ry="4"></ellipse>' +
        '<path class="mi-art-fill" d="M24 73c1-8 7-13 18-15l23-3 14-14h52l19 14 27 4c9 1 14 5 17 12l2 7H24z"></path>' +
        '<path class="mi-art-line" d="M24 73c1-8 7-13 18-15l23-3 14-14h52l19 14 27 4c9 1 14 5 17 12l2 7H24zM81 41h19v13H73zM107 41h20l18 13h-38z"></path>' +
        wheel(62, 79, 15) +
        wheel(163, 79, 15) +
        '<path class="mi-art-line" d="M56 69c2-7 7-11 15-11M148 57h16M136 55v16M25 65h13M198 65h4M82 63h31"></path>' +
        '<path class="mi-art-soft" d="M39 51h18M79 34h47M124 35h18M38 79h27M168 79h28"></path>' +
        '<circle class="mi-art-light" cx="200" cy="66" r="3"></circle>';
    }

    return '<svg class="mi-vehicle-svg" viewBox="0 0 220 100" fill="none" aria-hidden="true" focusable="false">' + art + '</svg>';
  }

  function miniVehicleIcon(type) {
    var kind = normalizeType(type);
    var inner = "";
    if (kind === "bike") {
      inner = '<circle cx="6.2" cy="17" r="3.2"></circle><circle cx="17.8" cy="17" r="3.2"></circle><path d="M6.2 17 10 9h5l3 8M10 9l3 8M15 9h4"></path>';
    } else if (kind === "scooter") {
      inner = '<circle cx="6.2" cy="17" r="2.8"></circle><circle cx="17.8" cy="17" r="2.8"></circle><path d="M6.2 17h5l3-7h4l3 7M14.2 10h4l2-4M16 6h3M6 12h5"></path>';
    } else if (kind === "suv") {
      inner = '<path d="M3 17h18l-1-5-3-5H9L6 12l-3 5Z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle><path d="M9 12h8M9 7v5"></path>';
    } else if (kind === "truck") {
      inner = '<path d="M3 16V8h11v8H3Zm11-6h4l3 4v2h-7V10Z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle>';
    } else {
      inner = '<path d="M3 17h18l-1-4-3-4H9L6 13l-3 4Z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle><path d="M9 13h7"></path>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  function vehicleSparkline(name) {
    var validRows = tripsFor(name).map(function (trip) {
      return { trip: trip, metrics: metrics(trip) };
    }).filter(function (row) {
      return row.metrics.valid;
    }).sort(function (a, b) {
      return sortTripsAsc(a.trip, b.trip);
    }).slice(-8);

    if (validRows.length < 2) {
      return '<span class="mi-vehicle-spark is-empty" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
    }

    var width = 118;
    var height = 30;
    var pad = 3;
    var values = validRows.map(function (row) { return row.metrics.mileage; });
    var minimum = Math.min.apply(null, values);
    var maximum = Math.max.apply(null, values);
    var range = maximum - minimum || 1;
    var points = values.map(function (value, index) {
      var x = pad + (index / (values.length - 1)) * (width - pad * 2);
      var y = height - pad - ((value - minimum) / range) * (height - pad * 2);
      return { x: x, y: y };
    });
    var path = points.map(function (point, index) {
      return (index ? "L" : "M") + point.x.toFixed(2) + " " + point.y.toFixed(2);
    }).join(" ");
    var first = points[0];
    var last = points[points.length - 1];
    var area = path + " L" + last.x.toFixed(2) + " " + height + " L" + first.x.toFixed(2) + " " + height + " Z";

    return '<span class="mi-vehicle-spark" style="--spark:' + colorFor(name) + '" aria-hidden="true">' +
      '<svg viewBox="0 0 ' + width + ' ' + height + '" fill="none">' +
        '<path class="mi-spark-area" d="' + area + '"></path>' +
        '<path class="mi-spark-line" d="' + path + '"></path>' +
        '<circle class="mi-spark-dot" cx="' + last.x.toFixed(2) + '" cy="' + last.y.toFixed(2) + '" r="2.3"></circle>' +
      '</svg>' +
    '</span>';
  }

  function statIcon(kind) {
    if (kind === "road") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21 9 3M18 21 15 3M12 5v2M12 11v2M12 17v2"></path></svg>';
    }
    if (kind === "wallet") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h15a1 1 0 0 1 1 1v12H5a1 1 0 0 1-1-1V6Zm0 0 3-3h10"></path><path d="M16 12h4v4h-4z"></path></svg>';
    }
    if (kind === "gauge") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18a8 8 0 1 1 16 0M12 14l4-4"></path><circle cx="12" cy="18" r="1.4"></circle></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3Z"></path></svg>';
  }

  function updateCurrencyUI() {
    var meta = currencyInfo();
    var buttons = currencyToggle.querySelectorAll("[data-currency]");
    for (var i = 0; i < buttons.length; i += 1) {
      var active = buttons[i].getAttribute("data-currency") === currency;
      buttons[i].classList.toggle("is-active", active);
      buttons[i].setAttribute("aria-pressed", active ? "true" : "false");
    }
    if (priceSuffix) priceSuffix.textContent = meta.symbol + "/L";
    if (paidSuffix) paidSuffix.textContent = meta.symbol;
  }

  function buildGaugeTicks() {
    if (!gaugeTicks || gaugeTicks.childNodes.length) return;
    var ns = "http://www.w3.org/2000/svg";
    for (var i = 0; i <= 20; i += 1) {
      var value = i * 2;
      var major = i % 5 === 0;
      var angle = (-120 + (value / MAX_GAUGE) * 240) * Math.PI / 180;
      var inner = major ? 85 : 91;
      var outer = 97;
      var line = document.createElementNS(ns, "line");
      line.setAttribute("x1", String((160 + Math.sin(angle) * inner).toFixed(2)));
      line.setAttribute("y1", String((157 - Math.cos(angle) * inner).toFixed(2)));
      line.setAttribute("x2", String((160 + Math.sin(angle) * outer).toFixed(2)));
      line.setAttribute("y2", String((157 - Math.cos(angle) * outer).toFixed(2)));
      line.setAttribute("class", major ? "mi-tick-line major" : "mi-tick-line");
      gaugeTicks.appendChild(line);

      if (major) {
        var label = document.createElementNS(ns, "text");
        label.setAttribute("x", String((160 + Math.sin(angle) * 75).toFixed(2)));
        label.setAttribute("y", String((157 - Math.cos(angle) * 75 + 2.4).toFixed(2)));
        label.setAttribute("class", "mi-tick-label");
        label.textContent = String(value);
        gaugeTicks.appendChild(label);
      }
    }
  }

  function paintGauge(value) {
    var numeric = Number(value);
    if (!isFinite(numeric)) numeric = 0;
    var scale = Math.max(0, Math.min(MAX_GAUGE, numeric));
    var percent = scale / MAX_GAUGE;
    if (gaugeArc) gaugeArc.style.strokeDashoffset = String(100 - percent * 100);
    if (gaugeNeedle) gaugeNeedle.style.transform = "rotate(" + (-120 + percent * 240).toFixed(2) + "deg)";
    if (gaugeDesc) {
      gaugeDesc.textContent = "Speedometer needle reading " + numeric.toFixed(1) +
        " kilometres per litre on a zero to forty scale.";
    }
  }

  function setGauge(value) {
    pendingGauge = Number(value);
    if (!isFinite(pendingGauge)) pendingGauge = 0;
    if (reduceMotion) {
      gaugeFirst = false;
      paintGauge(pendingGauge);
      return;
    }
    if (gaugeFirst) {
      if (gaugeTimer) return;
      gaugeTimer = window.setTimeout(function () {
        gaugeFirst = false;
        gaugeTimer = null;
        paintGauge(pendingGauge);
      }, 230);
      return;
    }
    paintGauge(pendingGauge);
  }

  function updateLive() {
    var rawStart = String(startField.value || "").trim();
    var rawEnd = String(endField.value || "").trim();
    var rawPrice = String(priceField.value || "").trim();
    var rawPaid = String(paidField.value || "").trim();
    var start = Number(rawStart);
    var end = Number(rawEnd);
    var price = Number(rawPrice);
    var paid = Number(rawPaid);
    var distance = end - start;
    var hasStart = rawStart !== "" && isFinite(start);
    var hasEnd = rawEnd !== "" && isFinite(end);
    var hasPrice = rawPrice !== "" && isFinite(price);
    var hasPaid = rawPaid !== "" && isFinite(paid);
    var distancesOk = hasStart && hasEnd && distance > 0;
    var litres = hasPrice && hasPaid && price > 0 ? paid / price : 0;
    var mileage = distancesOk && litres > 0 ? distance / litres : 0;
    var cost = distancesOk && paid > 0 ? paid / distance : 0;
    var live = distancesOk && price > 0 && paid > 0 && litres > 0 && mileage > 0;
    var hasAnyReading = rawStart !== "" || rawEnd !== "" || rawPrice !== "" || rawPaid !== "";
    var totals = computeTotals();
    var focusName = String(vehicleField.value || "").trim();
    var focusVehicle = focusName ? findVehicle(focusName) : null;
    var focusAggregate = focusVehicle ? aggregateFor(focusVehicle.name) : null;
    var focusMode = !!focusVehicle;
    var base = focusAggregate || totals;
    var lifetimeCost = base.distance > 0 ? base.paid / base.distance : 0;
    var display = live ? mileage : base.average;
    var displayText = display.toFixed(1);

    if (calcValue.textContent !== displayText) {
      calcValue.textContent = displayText;
      calcValue.classList.remove("is-rolling");
      void calcValue.offsetWidth;
      calcValue.classList.add("is-rolling");
      lastCalcText = displayText;
      window.setTimeout(function () {
        if (calcValue.textContent === lastCalcText) calcValue.classList.remove("is-rolling");
      }, 480);
    }

    if (calcDistance) {
      if (distancesOk) {
        calcDistance.textContent = formatCount(distance, 0) + " km";
      } else if (!hasAnyReading && base.distance > 0) {
        calcDistance.textContent = formatCount(base.distance, 0) + " km";
      } else {
        calcDistance.textContent = "—";
      }
    }
    if (calcLitres) {
      if (hasPrice && hasPaid && price > 0 && paid > 0) {
        calcLitres.textContent = formatCount(litres, 2) + " L";
      } else if (!hasAnyReading && base.litres > 0) {
        calcLitres.textContent = formatCount(base.litres, 2) + " L";
      } else {
        calcLitres.textContent = "—";
      }
    }
    if (calcCost) {
      if (distancesOk && paid > 0) {
        calcCost.textContent = formatMoney(cost, 2);
      } else if (!hasAnyReading && lifetimeCost > 0) {
        calcCost.textContent = formatMoney(lifetimeCost, 2);
      } else {
        calcCost.textContent = "—";
      }
    }
    if (calcFormula) {
      if (live) {
        calcFormula.textContent = formatCount(distance, 0) + " km ÷ " + formatCount(litres, 2) +
          " L = " + mileage.toFixed(1) + " km/l";
      } else if (hasStart && hasEnd && distance <= 0) {
        calcFormula.textContent = "The end odometer needs to be higher than the start.";
      } else if (!hasAnyReading && focusMode && base.average > 0) {
        calcFormula.textContent = focusVehicle.name + " · " + formatCount(base.distance, 0) + " km ÷ " +
          formatCount(base.litres, 2) + " L = " + base.average.toFixed(1) + " km/l";
      } else if (!hasAnyReading && totals.average > 0) {
        calcFormula.textContent = "Lifetime · " + formatCount(totals.distance, 0) + " km ÷ " +
          formatCount(totals.litres, 2) + " L = " + totals.average.toFixed(1) + " km/l";
      } else if (!hasAnyReading && focusMode) {
        calcFormula.textContent = "No complete tank for " + focusVehicle.name + " yet. The first one starts the average.";
      } else if (!hasAnyReading) {
        calcFormula.textContent = "Enter the readings to see the arithmetic.";
      } else {
        calcFormula.textContent = "Add the remaining readings to complete the tank.";
      }
    }

    gaugeCard.classList.toggle("is-live", live);
    gaugeCard.classList.toggle("is-focused", !live && focusMode);
    if (live) {
      gaugeMode.textContent = "Live tank";
      gaugeModeLabel.textContent = "Live tank";
      gaugeSub.textContent = "this fill · " + formatCount(distance, 0) + " km on " + formatCount(litres, 2) + " L";
    } else if (focusMode) {
      gaugeMode.textContent = "Vehicle average";
      gaugeModeLabel.textContent = focusVehicle.name;
      gaugeSub.textContent = base.validCount
        ? "across " + base.validCount + " complete fill" + (base.validCount === 1 ? "" : "s")
        : "no complete tank yet";
    } else if (totals.average > 0) {
      gaugeMode.textContent = "Fleet average";
      gaugeModeLabel.textContent = "Lifetime average";
      gaugeSub.textContent = "across " + totals.validCount + " complete fill" + (totals.validCount === 1 ? "" : "s");
    } else {
      gaugeMode.textContent = "Awaiting data";
      gaugeModeLabel.textContent = "Awaiting a fill";
      gaugeSub.textContent = "no completed tanks yet";
    }

    if (gaugeDelta) {
      if (live && totals.average > 0) {
        var delta = mileage - totals.average;
        gaugeDelta.hidden = false;
        if (Math.abs(delta) < 0.05) {
          gaugeDelta.className = "mi-readout-delta is-even";
          gaugeDelta.textContent = "level with lifetime";
        } else {
          gaugeDelta.className = "mi-readout-delta " + (delta > 0 ? "is-up" : "is-down");
          gaugeDelta.textContent = (delta > 0 ? "+" : "") + delta.toFixed(1) + " km/l vs lifetime";
        }
      } else {
        gaugeDelta.hidden = true;
        gaugeDelta.textContent = "";
        gaugeDelta.className = "mi-readout-delta";
      }
    }

    setGauge(display);
  }

  function updateChain() {
    var name = String(vehicleField.value || "").trim();
    var editing = !!idField.value;
    var date = String(dateField.value || datePickerMax).slice(0, 10);
    var startRaw = String(startField.value || "").trim();
    var endRaw = String(endField.value || "").trim();
    var startValue = startRaw !== "" && isFinite(Number(startRaw)) ? Number(startRaw) : null;
    var endValue = endRaw !== "" && isFinite(Number(endRaw)) ? Number(endRaw) : null;
    var context = name
      ? chainNeighbors(name, date, startValue, endValue, editing ? idField.value : null)
      : { prev: null, next: null, overlap: null };
    var prev = context.prev;
    var next = context.next;
    var linked = !!(prev && startValue != null && Math.abs(startValue - Number(prev.end)) < 0.001);

    chainLast.textContent = prev ? formatCount(prev.end, 0) + " km" : "—";
    chainStart.textContent = startValue != null ? formatCount(startValue, 0) + " km" : "—";
    chainStrip.classList.remove("is-linked", "is-manual", "is-backdated");
    chainReset.hidden = true;

    if (editing) {
      chainNote.textContent = "Editing this fill. The odometer chain is paused so corrections stay put.";
      return;
    }
    if (!name) {
      chainNote.textContent = "Pick a vehicle to carry its date-aware odometer chain forward.";
      return;
    }
    if (context.overlap) {
      chainStrip.classList.add("is-manual");
      chainNote.textContent = "This fill overlaps the " + dateFull(context.overlap.date) +
        " fill. Adjust the readings so it can sit in the chain.";
      return;
    }
    if (!prev && !next) {
      chainNote.textContent = "First fill for " + name + ". Enter its starting odometer.";
      return;
    }

    if (next) chainStrip.classList.add("is-backdated");
    if (linked) chainStrip.classList.add("is-linked");
    else if (prev && startValue != null) chainStrip.classList.add("is-manual");

    if (prev && startValue != null && !linked) chainReset.hidden = false;

    var notes = [];
    if (prev) {
      if (linked) {
        notes.push("Chain carried from the " + dateFull(prev.date) + " fill.");
      } else if (startValue != null) {
        notes.push("Manual start. The previous fill ends at " + formatCount(prev.end, 0) + " km.");
      } else {
        notes.push("Previous fill ends at " + formatCount(prev.end, 0) + " km on " + dateFull(prev.date) + ".");
      }
    } else {
      notes.push("Earliest fill for " + name + ".");
    }

    if (next) {
      notes.push("Next fill on " + dateFull(next.date) + " starts at " + formatCount(next.start, 0) + " km.");
      if (endValue != null && endValue >= Number(next.end)) {
        chainStrip.classList.remove("is-linked");
        chainStrip.classList.add("is-manual");
        notes.push("Lower this end below " + formatCount(next.end, 0) + " km to insert it.");
      } else if (endValue != null && Math.abs(endValue - Number(next.start)) > 0.001) {
        notes.push("Its start will move to this end on save to keep the chain linked.");
      } else if (endValue == null) {
        notes.push("Enter the end reading so the chain can sit in order.");
      }
    } else if (endValue == null) {
      notes.push("Enter the end reading at the pump.");
    }

    chainNote.textContent = notes.join(" ");
  }

  function autoChain(force) {
    if (idField.value) {
      updateChain();
      updateLive();
      return;
    }
    var name = String(vehicleField.value || "").trim();
    if (!name) {
      updateChain();
      updateLive();
      return;
    }
    var date = String(dateField.value || datePickerMax).slice(0, 10);
    var prev = latestTripOnOrBefore(name, date, null);
    var next = nextTripAfter(name, date, null);
    var currentStart = String(startField.value || "").trim();
    var currentEnd = String(endField.value || "").trim();

    if (prev) {
      if (force || currentStart === "" || currentStart === autoStartValue) {
        startField.value = String(prev.end);
        autoStartValue = String(prev.end);
      } else {
        autoStartValue = null;
      }
    } else if (force || currentStart === "" || currentStart === autoStartValue) {
      startField.value = "";
      autoStartValue = "";
    } else {
      autoStartValue = null;
    }

    var carryEnd = !!(next && (!prev || Number(next.start) > Number(prev.end) + 0.001));
    if (carryEnd) {
      if (force || currentEnd === "" || currentEnd === autoEndValue) {
        endField.value = String(next.start);
        autoEndValue = String(next.start);
      } else {
        autoEndValue = null;
      }
    } else if (next) {
      if (force || currentEnd === "" || currentEnd === autoEndValue) {
        endField.value = "";
        autoEndValue = "";
      } else {
        autoEndValue = null;
      }
    } else if (force || currentEnd === "" || currentEnd === autoEndValue) {
      endField.value = "";
      autoEndValue = "";
    } else {
      autoEndValue = null;
    }

    updateChain();
    updateLive();
  }

  function refreshPicker() {
    var name = String(vehicleField.value || "").trim();
    var chips = vehiclePicker.querySelectorAll("[data-pick-vehicle]");
    for (var i = 0; i < chips.length; i += 1) {
      chips[i].classList.toggle("is-active", sameName(chips[i].getAttribute("data-pick-vehicle"), name));
    }
    var cards = vehicleGrid.querySelectorAll("[data-vehicle-name]");
    for (var j = 0; j < cards.length; j += 1) {
      cards[j].classList.toggle("is-picked", sameName(cards[j].getAttribute("data-vehicle-name"), name));
    }
  }

  function selectVehicle(name, focusStart) {
    vehicleField.value = name;
    autoChain(true);
    refreshPicker();
    if (focusStart) {
      try {
        form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      } catch (error) {
        form.scrollIntoView();
      }
      window.setTimeout(function () {
        startField.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 260);
    }
  }

  function resetForm(options) {
    var opts = options || {};
    var keepVehicle = typeof opts.vehicle === "string" ? opts.vehicle : vehicleField.value;
    var keepPrice = opts.price != null ? String(opts.price) : priceField.value;
    form.reset();
    idField.value = "";
    dateField.value = datePickerMax;
    priceField.value = keepPrice;
    vehicleField.value = keepVehicle || "";
    noteField.value = "";
    startField.value = "";
    endField.value = "";
    autoStartValue = "";
    autoEndValue = "";
    if (opts.start != null) {
      startField.value = String(opts.start);
      autoStartValue = null;
      updateChain();
      updateLive();
    } else {
      autoChain(true);
    }
    saveButton.innerHTML = SAVE_ICON + "Save fill";
    cancelButton.hidden = true;
    modeLabel.textContent = "Live calculation";
    updateCurrencyUI();
    refreshPicker();
  }

  function renderSelectors() {
    var vehicles = allVehicles();
    var names = vehicles.map(function (vehicle) { return vehicle.name; });

    fuelDatalist.innerHTML = names.map(function (name) {
      return '<option value="' + esc(name) + '"></option>';
    }).join("");

    vehiclePicker.innerHTML = names.map(function (name) {
      return '<button type="button" class="mi-quick-chip" data-pick-vehicle="' + esc(name) + '">' + esc(name) + '</button>';
    }).join("");

    var filterOptions = ['<option value="all">All vehicles</option>'];
    names.forEach(function (name) {
      filterOptions.push('<option value="' + esc(name) + '">' + esc(name) + '</option>');
    });
    filterField.innerHTML = filterOptions.join("");
    if (currentFilter !== "all" && names.indexOf(currentFilter) === -1) currentFilter = "all";
    filterField.value = currentFilter;

    var chartOptions = ['<option value="all">All vehicles</option>'];
    names.forEach(function (name) {
      chartOptions.push('<option value="' + esc(name) + '">' + esc(name) + '</option>');
    });
    chartField.innerHTML = chartOptions.join("");
    if (chartFilter !== "all" && names.indexOf(chartFilter) === -1) chartFilter = "all";
    chartField.value = chartFilter;
  }

  function animateCounter(el) {
    var target = Number(el.getAttribute("data-count"));
    if (!isFinite(target)) target = 0;
    var decimals = Number(el.getAttribute("data-decimals") || 0);
    var mode = el.getAttribute("data-mode") || "num";

    function render(value) {
      el.textContent = mode === "money" ? formatMoney(value, decimals) : formatCount(value, decimals);
    }

    // Paint the final figure first. The count-up is a flourish, never a reason
    // for a number to be missing if a browser throttles animation frames.
    render(target);
    if (reduceMotion || target === 0) return;
    if (document.visibilityState !== "visible" || !document.hasFocus()) return;

    var duration = 760;
    window.setTimeout(function () {
      var started = 0;
      function frame(now) {
        if (!started) started = now;
        var progress = Math.min(1, (now - started) / duration);
        var eased = 1 - Math.pow(1 - progress, 3);
        render(target * eased);
        if (progress < 1) window.requestAnimationFrame(frame);
        else render(target);
      }
      window.requestAnimationFrame(frame);
      window.setTimeout(function () { render(target); }, duration + 60);
    }, 180);
  }

  function renderStats() {
    var totals = computeTotals();
    var averagePrice = totals.litres > 0 ? totals.paid / totals.litres : 0;
    var averageTank = totals.validCount > 0 ? totals.paid / totals.validCount : 0;
    var costPerKm = totals.distance > 0 ? totals.paid / totals.distance : 0;
    var stats = [
      {
        label: "Fuel used",
        icon: "road",
        accent: "#7e97a6",
        value: totals.litres,
        mode: "num",
        decimals: 1,
        unit: "L",
        hint: "litres across complete tanks"
      },
      {
        label: "Price / litre",
        icon: "star",
        accent: "#c9a164",
        value: averagePrice,
        mode: "money",
        decimals: 2,
        unit: "",
        hint: "weighted at the pump"
      },
      {
        label: "Cost / km",
        icon: "wallet",
        accent: "#c78f79",
        value: costPerKm,
        mode: "money",
        decimals: 2,
        unit: "",
        hint: "full-fill spend / distance"
      },
      {
        label: "Average fill",
        icon: "gauge",
        accent: "#92a88d",
        value: averageTank,
        mode: "money",
        decimals: 0,
        unit: "",
        hint: totals.validCount + " complete tank" + (totals.validCount === 1 ? "" : "s")
      }
    ];

    statsHost.innerHTML = stats.map(function (stat, index) {
      return '<div class="mi-stat" style="--i:' + index + ';--metric:' + stat.accent + '">' +
        '<div class="mi-stat-top">' +
          '<span class="mi-stat-label">' + esc(stat.label) + '</span>' +
          '<span class="mi-stat-icon">' + statIcon(stat.icon) + '</span>' +
        '</div>' +
        '<strong class="mi-stat-value">' +
          '<span data-count="' + stat.value + '" data-mode="' + stat.mode + '" data-decimals="' + stat.decimals + '">0</span>' +
          (stat.unit ? '<span class="unit">' + esc(stat.unit) + '</span>' : '') +
        '</strong>' +
        '<span class="mi-stat-hint">' + esc(stat.hint) + '</span>' +
      '</div>';
    }).join("");

    var counters = statsHost.querySelectorAll("[data-count]");
    for (var i = 0; i < counters.length; i += 1) animateCounter(counters[i]);
  }

  function renderFleetStats() {
    if (!fleetStatsHost) return;
    var totals = computeTotals();
    var stats = [
      {
        label: "Distance",
        accent: "#7e97a6",
        value: totals.distance,
        mode: "num",
        decimals: 0,
        unit: "km",
        hint: totals.count ? totals.count + " fill" + (totals.count === 1 ? "" : "s") + " logged" : "the road starts here"
      },
      {
        label: "Average",
        accent: "#c9a164",
        value: totals.average,
        mode: "num",
        decimals: 1,
        unit: "km/l",
        hint: totals.validCount + " complete tank" + (totals.validCount === 1 ? "" : "s")
      },
      {
        label: "Best tank",
        accent: "#92a88d",
        value: totals.best,
        mode: "num",
        decimals: 1,
        unit: "km/l",
        hint: totals.bestVehicle || "no complete tank yet"
      },
      {
        label: "Fuel spend",
        accent: "#c78f79",
        value: totals.paid,
        mode: "money",
        decimals: 0,
        unit: "",
        hint: totals.count ? "across the logbook" : "nothing recorded yet"
      }
    ];

    fleetStatsHost.innerHTML = stats.map(function (stat, index) {
      return '<div class="mi-pulse-stat" style="--i:' + index + ';--metric:' + stat.accent + '">' +
        '<div class="mi-pulse-stat-top">' +
          '<span class="mi-pulse-label">' + esc(stat.label) + '</span>' +
          '<span class="mi-pulse-index">0' + (index + 1) + '</span>' +
        '</div>' +
        '<strong class="mi-pulse-value">' +
          '<span data-count="' + stat.value + '" data-mode="' + stat.mode + '" data-decimals="' + stat.decimals + '">0</span>' +
          (stat.unit ? '<span class="unit">' + esc(stat.unit) + '</span>' : '') +
        '</strong>' +
        '<p class="mi-pulse-hint">' + esc(stat.hint) + '</p>' +
      '</div>';
    }).join("");

    var counters = fleetStatsHost.querySelectorAll("[data-count]");
    for (var i = 0; i < counters.length; i += 1) animateCounter(counters[i]);
  }

  function renderLatestFill() {
    if (!latestFillHost) return;
    var latest = trips.slice().sort(sortTripsDesc)[0] || null;
    if (!latest) {
      latestFillHost.style.removeProperty("--vehicle-tint");
      latestFillHost.innerHTML = '<div class="mi-latest-empty">' +
        '<p class="mi-kicker">Last stop</p>' +
        '<strong>No fills yet.</strong>' +
        '<p>The first save will leave a last-stop snapshot here.</p>' +
        '<button type="button" class="mi-text-link" data-focus-pump>Log the first fill <span aria-hidden="true">↘</span></button>' +
      '</div>';
      return;
    }

    var m = metrics(latest);
    var vehicle = findVehicle(latest.vehicle);
    var type = vehicle ? vehicle.type : inferType(latest.vehicle);
    var fuel = vehicle ? vehicle.fuel : "petrol";
    var typeLabel = (TYPE_META[type] || TYPE_META.car).label;
    var fuelLabel = fuel === "diesel" ? "Diesel" : "Petrol";
    var economy = m.valid ? m.mileage.toFixed(1) : "—";
    var note = String(latest.note || "").trim();
    var distanceText = m.valid ? formatCount(m.distance, 0) + " km" : "Readings incomplete";
    var paidText = isFinite(Number(latest.paid)) && Number(latest.paid) > 0 ? formatMoney(latest.paid, 0) : "—";
    var litresText = m.valid ? formatCount(m.litres, 2) + " L" : "—";

    latestFillHost.style.setProperty("--vehicle-tint", colorFor(latest.vehicle));
    latestFillHost.innerHTML = '<div class="mi-latest-head">' +
        '<p class="mi-kicker">Last stop</p>' +
        '<span class="mi-latest-date">' + esc(dateFull(latest.date)) + '</span>' +
      '</div>' +
      '<div class="mi-latest-main">' +
        '<div class="mi-latest-copy">' +
          '<span class="mi-latest-vehicle"><span class="mi-latest-badge">' + miniVehicleIcon(type) + '</span>' +
            '<span><strong>' + esc(latest.vehicle) + '</strong><small>' + esc(typeLabel + " · " + fuelLabel) + '</small></span>' +
          '</span>' +
          '<span class="mi-latest-age">' + esc(dateRelative(latest.date)) + '</span>' +
        '</div>' +
        '<div class="mi-latest-economy"><strong>' + esc(economy) + '</strong><span>km/l</span></div>' +
      '</div>' +
      '<p class="mi-latest-note">' + esc(note || "No note for this tank.") + '</p>' +
      '<div class="mi-latest-foot">' +
        '<span><small>Distance</small><strong>' + esc(distanceText) + '</strong></span>' +
        '<span><small>Fuel</small><strong>' + esc(litresText) + '</strong></span>' +
        '<span><small>Paid</small><strong>' + esc(paidText) + '</strong></span>' +
        '<button type="button" class="mi-icon-btn" data-edit-trip="' + esc(latest.id) + '" aria-label="Edit the last fill for ' + esc(latest.vehicle) + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>' +
        '</button>' +
      '</div>';
  }

  function renderPulse() {
    var totals = computeTotals();
    var latest = trips.slice().sort(sortTripsDesc)[0] || null;
    if (pulseMeta) {
      pulseMeta.textContent = latest
        ? totals.count + " fill" + (totals.count === 1 ? "" : "s") + " · last " + dateRelative(latest.date)
        : "All time · no fills yet";
    }
    renderFleetStats();
    renderLatestFill();
  }

  function renderGarage() {
    var vehicles = allVehicles();
    vehicleCount.textContent = vehicles.length + " vehicle" + (vehicles.length === 1 ? "" : "s");
    var picked = String(vehicleField.value || "").trim();

    var cards = vehicles.map(function (vehicle, index) {
      var aggregate = aggregateFor(vehicle.name);
      var lastTrip = tripsFor(vehicle.name).sort(sortTripsDesc)[0] || null;
      var typeLabel = (TYPE_META[vehicle.type] || TYPE_META.car).label;
      var fuelLabel = vehicle.fuel === "diesel" ? "Diesel" : "Petrol";
      var distanceText = aggregate.validCount ? formatCount(aggregate.distance, 0) + " km" : "—";
      var averageText = aggregate.average > 0 ? aggregate.average.toFixed(1) : "—";
      var spendText = aggregate.validCount ? formatMoney(aggregate.paid, 0) : "—";
      var fillLabel = aggregate.count + " fill" + (aggregate.count === 1 ? "" : "s");
      var selected = sameName(picked, vehicle.name);
      return '<article class="mi-vehicle-card' + (selected ? ' is-picked' : '') + '" data-vehicle-name="' + esc(vehicle.name) + '" style="--i:' + index + ';--vehicle-tint:' + colorFor(vehicle.name) + '">' +
        '<button type="button" class="mi-vehicle-main" data-pick-vehicle="' + esc(vehicle.name) + '" aria-label="Use ' + esc(vehicle.name) + ' for a new fill-up">' +
          '<span class="mi-vehicle-art" aria-hidden="true">' + vehicleArt(vehicle.type) + '</span>' +
          '<span class="mi-vehicle-body">' +
            '<span class="mi-vehicle-name-row"><span class="mi-vehicle-name">' + esc(vehicle.name) + '</span><span class="mi-vehicle-fuel">' + esc(fuelLabel) + '</span></span>' +
            '<span class="mi-vehicle-meta">' + esc(typeLabel) + ' · ' + esc(fillLabel) + '</span>' +
            '<span class="mi-vehicle-stats">' +
              '<span><span>Distance</span><strong>' + esc(distanceText) + '</strong></span>' +
              '<span><span>Average</span><strong>' + esc(averageText) + (aggregate.average > 0 ? ' km/l' : '') + '</strong></span>' +
              '<span><span>Spend</span><strong>' + esc(spendText) + '</strong></span>' +
            '</span>' +
            '<span class="mi-vehicle-trend">' +
              vehicleSparkline(vehicle.name) +
              '<span class="mi-vehicle-trend-label">' + esc(lastTrip ? "Updated " + dateRelative(lastTrip.date) : "No fills yet") + '</span>' +
            '</span>' +
          '</span>' +
        '</button>' +
        '<button type="button" class="mi-vehicle-delete" data-delete-vehicle="' + esc(vehicle.name) + '" aria-label="Delete vehicle ' + esc(vehicle.name) + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"></path></svg>' +
        '</button>' +
      '</article>';
    }).join("");

    cards += '<button type="button" class="mi-vehicle-add" data-open-vehicle>' +
      '<span class="mi-vehicle-add-icon" aria-hidden="true">+</span>' +
      '<strong>Add a vehicle</strong>' +
      '<span>Bike · scooter · car · SUV · truck</span>' +
    '</button>';

    vehicleGrid.innerHTML = cards;
    refreshPicker();
  }

  function renderChart() {
    var validRows = trips.map(function (trip) {
      return { trip: trip, metrics: metrics(trip) };
    }).filter(function (row) {
      if (!row.metrics.valid) return false;
      if (chartFilter === "all") return true;
      return sameName(row.trip.vehicle, chartFilter);
    });

    if (!validRows.length) {
      chartLegend.innerHTML = "";
      var who = chartFilter === "all" ? "a" : esc(chartFilter) + " yet";
      chartHost.innerHTML = '<div class="mi-chart-empty"><div><span class="mi-empty-kicker">No line yet</span>' +
        (chartFilter === "all"
          ? 'Complete a fill-up with a start and end odometer to draw the first trend line.'
          : 'No completed fills for ' + esc(chartFilter) + ' yet. The line will appear after the first tank.') +
        '</div></div>';
      return;
    }

    var seriesMap = {};
    validRows.forEach(function (row) {
      var key = String(row.trip.vehicle || "").toLowerCase();
      if (!seriesMap[key]) {
        seriesMap[key] = {
          name: canonicalName(row.trip.vehicle),
          rows: [],
          color: colorFor(row.trip.vehicle)
        };
      }
      seriesMap[key].rows.push(row);
    });

    var series = Object.keys(seriesMap).map(function (key) { return seriesMap[key]; });
    series.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }); });
    series.forEach(function (one) {
      one.rows.sort(function (a, b) { return sortTripsAsc(a.trip, b.trip); });
      one.rows = one.rows.slice(-12);
    });

    var allTimes = [];
    series.forEach(function (one) {
      one.rows.forEach(function (row) { allTimes.push(tripTime(row.trip.date)); });
    });
    var minTime = Math.min.apply(null, allTimes);
    var maxTime = Math.max.apply(null, allTimes);
    var minMileage = Infinity;
    var maxMileage = -Infinity;
    series.forEach(function (one) {
      one.rows.forEach(function (row) {
        minMileage = Math.min(minMileage, row.metrics.mileage);
        maxMileage = Math.max(maxMileage, row.metrics.mileage);
      });
    });

    var hostWidth = chartHost && chartHost.clientWidth ? chartHost.clientWidth : 0;
    var compact = hostWidth > 0 && hostWidth < 620;
    var width = compact ? Math.max(320, Math.round(hostWidth)) : 680;
    var height = compact ? 240 : 260;
    var left = compact ? 36 : 42;
    var right = compact ? 12 : 16;
    var top = 24;
    var bottom = 34;
    var plotWidth = width - left - right;
    var plotHeight = height - top - bottom;
    var yMin = Math.max(0, Math.floor((minMileage - 2) * 10) / 10);
    var yMax = Math.ceil((maxMileage + 2) * 10) / 10;
    if (yMax - yMin < 5) yMax = yMin + 5;
    var sameTime = maxTime === minTime;
    if (sameTime) maxTime = minTime + 1;

    function xFor(trip) {
      if (sameTime) return left + plotWidth / 2;
      return left + ((tripTime(trip.date) - minTime) / (maxTime - minTime)) * plotWidth;
    }

    function yFor(value) {
      return top + (1 - (value - yMin) / (yMax - yMin)) * plotHeight;
    }

    var grid = "";
    for (var g = 0; g < 5; g += 1) {
      var gridValue = yMin + (yMax - yMin) * (g / 4);
      var gridY = yFor(gridValue);
      grid += '<line class="mi-chart-grid" x1="' + left + '" y1="' + gridY.toFixed(2) + '" x2="' + (width - right) + '" y2="' + gridY.toFixed(2) + '"></line>';
      grid += '<text class="mi-chart-axis" x="' + (left - 8) + '" y="' + (gridY + 3).toFixed(2) + '" text-anchor="end">' + gridValue.toFixed(1) + '</text>';
    }

    var datePoints = [];
    var seenDates = {};
    series.forEach(function (one) {
      one.rows.forEach(function (row) {
        var key = String(row.trip.date || "");
        if (!seenDates[key] && key) {
          seenDates[key] = true;
          datePoints.push({ date: key, time: tripTime(key) });
        }
      });
    });
    datePoints.sort(function (a, b) { return a.time - b.time; });
    var labelStep = Math.max(1, Math.ceil(datePoints.length / 5));
    var xLabels = "";
    datePoints.forEach(function (point, index) {
      if (index % labelStep === 0 || index === datePoints.length - 1) {
        var x = sameTime ? left + plotWidth / 2 : left + ((point.time - minTime) / (maxTime - minTime)) * plotWidth;
        xLabels += '<text class="mi-chart-axis" x="' + x.toFixed(2) + '" y="' + (height - 10) + '" text-anchor="middle">' + esc(dateShort(point.date)) + '</text>';
      }
    });

    var areas = "";
    var lines = "";
    var dots = "";
    var labels = "";
    var showValues = validRows.length <= 8;

    series.forEach(function (one) {
      var points = one.rows.map(function (row) {
        return {
          row: row,
          x: xFor(row.trip),
          y: yFor(row.metrics.mileage)
        };
      });
      if (!points.length) return;
      var d = points.map(function (point, index) {
        return (index ? "L" : "M") + point.x.toFixed(2) + " " + point.y.toFixed(2);
      }).join(" ");

      if (series.length === 1 && points.length > 1) {
        var last = points[points.length - 1];
        var first = points[0];
        areas += '<path class="mi-chart-area" style="fill:url(#mi-chart-fill)" d="' + d +
          ' L' + last.x.toFixed(2) + ' ' + (top + plotHeight) +
          ' L' + first.x.toFixed(2) + ' ' + (top + plotHeight) + ' Z"></path>';
      }

      lines += '<path class="mi-chart-line" style="--series:' + one.color + '" d="' + d + '"></path>';

      points.forEach(function (point) {
        var note = String(point.row.trip.note || "").trim();
        dots += '<g class="mi-chart-point" data-color="' + one.color + '" data-vehicle="' + esc(one.name) + '" data-date="' + esc(dateFull(point.row.trip.date)) + '" data-mileage="' + point.row.metrics.mileage.toFixed(1) + '" data-distance="' + esc(formatCount(point.row.metrics.distance, 0) + " km") + '" data-paid="' + esc(formatMoney(point.row.trip.paid, 0)) + '" data-note="' + esc(note) + '">' +
          '<circle class="mi-chart-hit" cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="13"></circle>' +
          '<circle class="mi-chart-dot-halo" style="--series:' + one.color + '" cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="7"></circle>' +
          '<circle class="mi-chart-dot" style="--series:' + one.color + '" cx="' + point.x.toFixed(2) + '" cy="' + point.y.toFixed(2) + '" r="3.2"><title>' +
          esc(one.name + " · " + dateFull(point.row.trip.date) + " · " + point.row.metrics.mileage.toFixed(1) + " km/l") +
          '</title></circle>' +
        '</g>';
        if (showValues) {
          labels += '<text class="mi-chart-value" x="' + point.x.toFixed(2) + '" y="' + (point.y - 9).toFixed(2) + '" text-anchor="middle">' + point.row.metrics.mileage.toFixed(1) + '</text>';
        }
      });
    });

    var gradient = '<defs><linearGradient id="mi-chart-fill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + (series[0] ? series[0].color : "#c9a164") + '" stop-opacity="0.2"></stop>' +
      '<stop offset="1" stop-color="' + (series[0] ? series[0].color : "#c9a164") + '" stop-opacity="0"></stop>' +
      '</linearGradient></defs>';

    var aria = "Mileage trend by fill-up for " + series.map(function (one) { return one.name; }).join(", ") + ".";
    chartHost.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + esc(aria) + '">' +
      gradient + grid + areas + lines + labels + dots + xLabels +
      '<text class="mi-chart-axis" x="' + left + '" y="' + (top - 10) + '">km/l</text>' +
      '</svg>';

    var chartTip = document.createElement("div");
    chartTip.className = "mi-chart-tip";
    chartTip.setAttribute("aria-hidden", "true");
    chartHost.appendChild(chartTip);

    chartLegend.innerHTML = series.map(function (one) {
      return '<span class="mi-legend-item"><i class="mi-legend-dot" style="--dot:' + one.color + '"></i>' + esc(one.name) + '</span>';
    }).join("");
  }

  function renderCompare() {
    var rows = allVehicles().map(function (vehicle) {
      return { vehicle: vehicle, aggregate: aggregateFor(vehicle.name) };
    }).filter(function (row) {
      return row.aggregate.validCount > 0 && row.aggregate.average > 0;
    });

    if (!rows.length) {
      compareHost.innerHTML = '<div class="mi-compare-empty"><div><span class="mi-empty-kicker">No bars yet</span>' +
        'Complete a fill-up for any vehicle and the fleet comparison will fill in.</div></div>';
      return;
    }

    rows.sort(function (a, b) { return b.aggregate.average - a.aggregate.average; });
    var maximum = rows[0].aggregate.average || 1;
    compareHost.innerHTML = rows.map(function (row, index) {
      var aggregate = row.aggregate;
      var percent = Math.max(4, Math.round((aggregate.average / maximum) * 100));
      var color = colorFor(row.vehicle.name);
      return '<div class="mi-compare-row" style="--bar:' + color + ';--i:' + index + '">' +
        '<div class="mi-compare-top">' +
          '<span class="mi-compare-name"><i></i><span>' + esc(row.vehicle.name) + '</span></span>' +
          '<span class="mi-compare-value">' + aggregate.average.toFixed(1) + ' <small>km/l</small></span>' +
        '</div>' +
        '<div class="mi-compare-track"><span class="mi-compare-bar" style="width:' + percent + '%"></span></div>' +
        '<div class="mi-compare-meta"><span>' + aggregate.count + ' fill' + (aggregate.count === 1 ? "" : "s") + ' · ' + formatCount(aggregate.distance, 0) + ' km</span>' +
          '<span>best ' + aggregate.best.toFixed(1) + '</span></div>' +
      '</div>';
    }).join("");
  }

  function routeStrip(rows) {
    var numeric = rows.filter(function (trip) {
      return String(trip.start == null ? "" : trip.start).trim() !== "" &&
        String(trip.end == null ? "" : trip.end).trim() !== "";
    }).sort(sortTripsAsc);
    if (!numeric.length) return "";
    var recent = numeric.slice(-3);
    var values = [recent[0].start];
    recent.forEach(function (trip) { values.push(trip.end); });
    var nodes = values.map(function (value, index) {
      return (index ? '<span class="mi-road-seg"></span>' : '') +
        '<span class="mi-road-node"><i></i><strong>' + formatCount(value, 0) + '</strong></span>';
    }).join("");
    var aria = recent.map(function (trip) { return formatCount(trip.start, 0) + " to " + formatCount(trip.end, 0); }).join(", ");
    return '<span class="mi-road-strip" aria-label="Odometer chain: ' + esc(aria) + '">' + nodes + '</span>';
  }

  function logMatches(trip) {
    if (!logQuery) return true;
    var haystack = [
      trip.vehicle,
      trip.note,
      dateFull(trip.date),
      yearOf(trip.date),
      String(trip.start == null ? "" : trip.start),
      String(trip.end == null ? "" : trip.end)
    ].join(" ").toLowerCase();
    return haystack.indexOf(logQuery.toLowerCase()) !== -1;
  }

  function compareLogTrips(a, b) {
    if (logSort === "mileage") {
      var aMileage = metrics(a).mileage;
      var bMileage = metrics(b).mileage;
      if (bMileage !== aMileage) return bMileage - aMileage;
    } else if (logSort === "spend") {
      var aPaid = Number(a.paid) || 0;
      var bPaid = Number(b.paid) || 0;
      if (bPaid !== aPaid) return bPaid - aPaid;
    }
    return sortTripsDesc(a, b);
  }

  function renderTable() {
    var scoped = trips.filter(function (trip) {
      return currentFilter === "all" || sameName(trip.vehicle, currentFilter);
    });
    var filtered = scoped.filter(logMatches);
    var narrowed = currentFilter !== "all" || !!logQuery;

    logCount.textContent = narrowed
      ? filtered.length + " of " + scoped.length + " fill" + (scoped.length === 1 ? "" : "s")
      : filtered.length + " fill" + (filtered.length === 1 ? "" : "s");

    if (!filtered.length) {
      var emptyMessage;
      if (!trips.length) {
        emptyMessage = '<strong>The road starts here.</strong>Log the first fill-up and this logbook will keep the chain.' +
          '<div><button type="button" class="mi-btn mi-btn-sm mi-log-empty-action" data-focus-pump>Log a fill</button></div>';
      } else if (logQuery) {
        emptyMessage = '<strong>Nothing matches.</strong>No fills mention “' + esc(logQuery) + '” in this logbook.' +
          '<div><button type="button" class="mi-btn mi-btn-sm mi-log-empty-action" data-clear-filter>Clear search</button></div>';
      } else {
        emptyMessage = '<strong>No fills here yet.</strong>No completed fills for ' + esc(currentFilter) + ' in this logbook.' +
          '<div><button type="button" class="mi-btn mi-btn-sm mi-log-empty-action" data-clear-filter>Show all vehicles</button></div>';
      }
      tableBody.innerHTML = '<tr class="mi-empty-row"><td colspan="8"><div class="mi-log-empty">' + emptyMessage + '</div></td></tr>';
      return;
    }

    var groupsByKey = {};
    filtered.forEach(function (trip) {
      var key = String(trip.vehicle || "").trim().toLowerCase();
      if (!groupsByKey[key]) {
        groupsByKey[key] = { key: key, name: canonicalName(trip.vehicle), rows: [] };
      }
      groupsByKey[key].rows.push(trip);
    });

    var groups = Object.keys(groupsByKey).map(function (key) { return groupsByKey[key]; });
    groups.forEach(function (group) {
      group.rows.sort(compareLogTrips);
    });
    groups.sort(function (a, b) {
      if (logSort === "mileage") {
        var aMileage = metrics(a.rows[0]).mileage;
        var bMileage = metrics(b.rows[0]).mileage;
        if (bMileage !== aMileage) return bMileage - aMileage;
      } else if (logSort === "spend") {
        var aPaid = Number(a.rows[0].paid) || 0;
        var bPaid = Number(b.rows[0].paid) || 0;
        if (bPaid !== aPaid) return bPaid - aPaid;
      }
      var byDate = sortTripsDesc(a.rows[0], b.rows[0]);
      if (byDate) return byDate;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

    var html = "";
    var rowIndex = 0;
    groups.forEach(function (group) {
      var vehicle = findVehicle(group.name);
      var type = vehicle ? vehicle.type : inferType(group.name);
      var fuel = vehicle ? vehicle.fuel : "petrol";
      var groupRows = tripsFor(group.name).sort(sortTripsDesc);
      var groupMeta = (TYPE_META[type] || TYPE_META.car).label + " · " +
        (fuel === "diesel" ? "Diesel" : "Petrol") + " · " +
        groupRows.length + " fill" + (groupRows.length === 1 ? "" : "s");
      html += '<tr class="mi-group-row" style="--vehicle-tint:' + colorFor(group.name) + '"><td colspan="8">' +
        '<div class="mi-log-group">' +
          '<span class="mi-group-badge">' + miniVehicleIcon(type) + '</span>' +
          '<span class="mi-log-group-name"><strong>' + esc(group.name) + '</strong><span>' + esc(groupMeta) + '</span></span>' +
          routeStrip(groupRows) +
        '</div>' +
      '</td></tr>';

      group.rows.forEach(function (trip) {
        var m = metrics(trip);
        var note = String(trip.note || "").trim();
        var noteText = note ? note : "No note";
        var startText = String(trip.start == null ? "" : trip.start).trim() === "" ? "—" : formatCount(trip.start, 0);
        var endText = String(trip.end == null ? "" : trip.end).trim() === "" ? "—" : formatCount(trip.end, 0);
        var distanceText = m.valid ? formatCount(m.distance, 0) + " km" : "—";
        var litresText = m.valid ? formatCount(m.litres, 2) + " L" : "—";
        var mileageText = m.valid ? m.mileage.toFixed(1) : "—";
        var costText = m.valid ? formatMoney(m.cost, 2) : "—";
        var paidText = isFinite(Number(trip.paid)) && Number(trip.paid) > 0 ? formatMoney(trip.paid, 0) : "—";
        html += '<tr data-id="' + esc(trip.id) + '" style="--i:' + rowIndex + '">' +
          '<td class="mi-log-date"><span>' + esc(dateShort(trip.date)) + '</span><small>' + esc(yearOf(trip.date)) + '</small></td>' +
          '<td class="mi-log-odo" data-label="Odometer">' +
            '<div class="mi-odometer-chain"><span class="start">' + esc(startText) + '</span><span class="mi-odo-link" aria-hidden="true"></span><span class="end">' + esc(endText) + '</span></div>' +
            '<div class="mi-log-odo-note" title="' + esc(noteText) + '">' + esc(noteText) + '</div>' +
          '</td>' +
          '<td class="num mi-log-metric" data-label="Distance">' + esc(distanceText) + '</td>' +
          '<td class="num mi-log-metric" data-label="Fuel">' + esc(litresText) + '</td>' +
          '<td class="num mi-log-mileage" data-label="Mileage">' + esc(mileageText) + (m.valid ? ' <small>km/l</small>' : '') + '</td>' +
          '<td class="num mi-log-metric" data-label="Cost / km">' + esc(costText) + '</td>' +
          '<td class="num mi-log-paid" data-label="Paid">' + esc(paidText) + '</td>' +
          '<td class="mi-log-actions"><div class="mi-row-actions">' +
            '<button type="button" class="mi-icon-btn" data-edit-trip="' + esc(trip.id) + '" aria-label="Edit fill from ' + esc(dateFull(trip.date)) + ' for ' + esc(group.name) + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>' +
            '</button>' +
            '<button type="button" class="mi-icon-btn is-danger" data-delete-trip="' + esc(trip.id) + '" aria-label="Delete fill from ' + esc(dateFull(trip.date)) + ' for ' + esc(group.name) + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"></path></svg>' +
            '</button>' +
          '</div></td>' +
        '</tr>';
        rowIndex += 1;
      });
    });

    tableBody.innerHTML = html;
  }

  function renderAll() {
    renderSelectors();
    renderGarage();
    renderStats();
    renderPulse();
    renderChart();
    renderCompare();
    renderTable();
    refreshPicker();
    updateLive();
    updateChain();
  }

  function editTrip(id) {
    var trip = null;
    for (var i = 0; i < trips.length; i += 1) {
      if (String(trips[i].id) === String(id)) {
        trip = trips[i];
        break;
      }
    }
    if (!trip) return;
    idField.value = trip.id;
    vehicleField.value = trip.vehicle;
    dateField.value = String(trip.date || datePickerMax);
    startField.value = trip.start == null ? "" : String(trip.start);
    endField.value = trip.end == null ? "" : String(trip.end);
    priceField.value = trip.price == null ? "" : String(trip.price);
    paidField.value = trip.paid == null ? "" : String(trip.paid);
    noteField.value = trip.note == null ? "" : String(trip.note);
    autoStartValue = null;
    autoEndValue = null;
    saveButton.innerHTML = SAVE_ICON + "Update fill";
    cancelButton.hidden = false;
    modeLabel.textContent = "Editing a fill";
    updateChain();
    updateLive();
    refreshPicker();
    try {
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    } catch (error) {
      form.scrollIntoView();
    }
    window.setTimeout(function () {
      startField.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 280);
  }

  function deleteTrip(id) {
    var trip = null;
    for (var i = 0; i < trips.length; i += 1) {
      if (String(trips[i].id) === String(id)) {
        trip = trips[i];
        break;
      }
    }
    if (!trip) return;
    Z.confirm({
      kicker: "Remove a fill",
      title: "Delete this fill-up?",
      message: "The <strong>" + esc(dateFull(trip.date)) + "</strong> fill for <strong>" + esc(trip.vehicle) +
        "</strong> will leave the logbook. The odometer chain will reconnect to the fill before it.",
      label: "Delete fill"
    }).then(function (ok) {
      if (!ok) return;
      var chain = chainNeighbors(trip.vehicle, trip.date, Number(trip.start), Number(trip.end), trip.id);
      var relinked = false;
      if (chain.next && hasReading(trip.end) && Math.abs(Number(chain.next.start) - Number(trip.end)) < 0.001) {
        chain.next.start = chain.prev ? Number(chain.prev.end) : Number(trip.start);
        relinked = true;
      }
      trips = trips.filter(function (item) { return String(item.id) !== String(id); });
      Z.store.set("trips", trips);
      if (idField.value && String(idField.value) === String(id)) {
        resetForm({ vehicle: vehicleField.value, price: priceField.value });
      }
      renderAll();
      updateChain();
      Z.toast(relinked ? "Fill removed · next fill re-linked." : "Fill removed.");
    });
  }

  function deleteVehicle(name) {
    var vehicle = findVehicle(name);
    if (!vehicle) return;
    var related = tripsFor(name);
    var message = related.length
      ? "Deleting <strong>" + esc(vehicle.name) + "</strong> also removes its " + related.length +
        " fill-up" + (related.length === 1 ? "" : "s") + " from the logbook."
      : "This removes <strong>" + esc(vehicle.name) + "</strong> from the garage. It has no fills yet.";
    Z.confirm({
      kicker: "Remove from the garage",
      title: "Delete this vehicle?",
      message: message,
      label: "Delete vehicle"
    }).then(function (ok) {
      if (!ok) return;
      trips = trips.filter(function (trip) { return !sameName(trip.vehicle, name); });
      storedVehicles = storedVehicles.filter(function (item) { return !sameName(item.name, name); });
      Z.store.set("trips", trips);
      if (storedVehicles.length) Z.store.set("vehicles", storedVehicles);
      else Z.store.remove("vehicles");
      if (sameName(vehicleField.value, name)) {
        resetForm({ vehicle: "", price: "" });
      }
      renderAll();
      updateChain();
      Z.toast("Vehicle removed.");
    });
  }

  function saveTrip(event) {
    event.preventDefault();
    var vehicle = String(vehicleField.value || "").trim();
    var date = String(dateField.value || "").trim();
    var rawStart = String(startField.value || "").trim();
    var rawEnd = String(endField.value || "").trim();
    var rawPrice = String(priceField.value || "").trim();
    var rawPaid = String(paidField.value || "").trim();
    var start = Number(rawStart);
    var end = Number(rawEnd);
    var price = Number(rawPrice);
    var paid = Number(rawPaid);

    if (!vehicle) {
      Z.toast("Add a vehicle first.", "error");
      vehicleField.focus();
      return;
    }
    if (!date) {
      Z.toast("Pick a date for this fill.", "error");
      dateField.focus();
      return;
    }
    if (rawStart === "" || rawEnd === "" || !isFinite(start) || !isFinite(end)) {
      Z.toast("Enter both odometer readings.", "error");
      (rawStart === "" ? startField : endField).focus();
      return;
    }
    if (start < 0 || end < 0) {
      Z.toast("Odometer readings cannot be negative.", "error");
      startField.focus();
      return;
    }
    if (end <= start) {
      Z.toast("The end odometer must be higher than the start.", "error");
      endField.focus();
      return;
    }
    if (rawPrice === "" || !isFinite(price) || price <= 0) {
      Z.toast("Enter a fuel price above zero.", "error");
      priceField.focus();
      return;
    }
    if (rawPaid === "" || !isFinite(paid) || paid <= 0) {
      Z.toast("Enter the total paid amount.", "error");
      paidField.focus();
      return;
    }

    var editingId = String(idField.value || "");
    var chain = chainNeighbors(vehicle, date, start, end, editingId || null);

    if (chain.overlap) {
      Z.toast("This fill overlaps the " + dateFull(chain.overlap.date) + " fill. Check the date and readings.", "error");
      dateField.focus();
      return;
    }
    if (chain.prev && end <= Number(chain.prev.end)) {
      Z.toast("End odometer must be above the previous fill's " + formatCount(chain.prev.end, 0) + " km.", "error");
      endField.focus();
      return;
    }
    if (chain.next && end >= Number(chain.next.end)) {
      Z.toast("End odometer must stay below the next fill's " + formatCount(chain.next.end, 0) + " km.", "error");
      endField.focus();
      return;
    }

    var payload = {
      id: editingId || Z.uid("trip"),
      vehicle: vehicle,
      date: date,
      start: start,
      end: end,
      price: price,
      paid: paid,
      note: String(noteField.value || "").trim()
    };
    var m = metrics(payload);
    var relinked = false;

    ensureVehicle(vehicle);
    if (editingId) {
      var index = -1;
      for (var i = 0; i < trips.length; i += 1) {
        if (String(trips[i].id) === editingId) {
          index = i;
          break;
        }
      }
      if (index === -1) trips.push(payload);
      else trips[index] = payload;
    } else {
      trips.push(payload);
    }

    if (chain.next && Math.abs(Number(chain.next.start) - end) > 0.001) {
      chain.next.start = end;
      relinked = true;
    }

    Z.store.set("trips", trips);

    var message = editingId ? "Fill updated" : "Fill saved";
    if (m.valid) message += " · " + m.mileage.toFixed(1) + " km/l";
    if (relinked) message += " · next fill re-linked";
    Z.toast(message);

    var keepPrice = priceField.value;
    resetForm({ vehicle: vehicle, price: keepPrice });
    renderAll();
    window.setTimeout(function () {
      endField.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 80);
  }

  function addVehicle(event) {
    event.preventDefault();
    var name = String(vehicleNameField.value || "").trim();
    var typeInput = vehicleForm.querySelector('input[name="vehicle-type"]:checked');
    var fuelInput = vehicleForm.querySelector('input[name="vehicle-fuel"]:checked');
    var type = typeInput ? normalizeType(typeInput.value) : "car";
    var fuel = fuelInput ? normalizeFuel(fuelInput.value) : "petrol";
    if (!name) {
      Z.toast("Give the vehicle a name.", "error");
      vehicleNameField.focus();
      return;
    }
    if (findVehicle(name)) {
      Z.toast("That vehicle is already in the garage.", "error");
      vehicleNameField.focus();
      return;
    }
    storedVehicles.push({
      id: Z.uid("vehicle"),
      name: name.slice(0, 40),
      type: type,
      fuel: fuel,
      createdAt: datePickerMax
    });
    Z.store.set("vehicles", storedVehicles);
    vehicleDialog.close();
    vehicleNameField.value = "";
    renderAll();
    selectVehicle(name, true);
    Z.toast(name + " added to the garage.");
  }

  function openVehicleDialog() {
    if (!vehicleDialog) return;
    vehicleForm.reset();
    if (typeof vehicleDialog.showModal === "function") {
      vehicleDialog.showModal();
    } else {
      vehicleDialog.setAttribute("open", "open");
    }
    window.setTimeout(function () { vehicleNameField.focus(); }, 30);
  }

  function closeVehicleDialog() {
    if (vehicleDialog && vehicleDialog.open) vehicleDialog.close();
  }

  function exportCsv() {
    if (!trips.length) {
      Z.toast("No fills to export yet.", "error");
      return;
    }
    var header = [
      "Date", "Vehicle", "Type", "Fuel", "Start km", "End km", "Distance km",
      "Price per litre", "Total paid", "Litres used", "Mileage km/l", "Cost per km", "Currency", "Note"
    ];
    var rows = [header];
    trips.slice().sort(sortTripsDesc).forEach(function (trip) {
      var vehicle = findVehicle(trip.vehicle);
      var m = metrics(trip);
      rows.push([
        String(trip.date || ""),
        trip.vehicle,
        vehicle ? (TYPE_META[vehicle.type] || TYPE_META.car).label : "Car",
        vehicle ? (vehicle.fuel === "diesel" ? "Diesel" : "Petrol") : "Petrol",
        isFinite(Number(trip.start)) ? Number(trip.start) : "",
        isFinite(Number(trip.end)) ? Number(trip.end) : "",
        m.valid ? m.distance.toFixed(2) : "",
        isFinite(Number(trip.price)) ? Number(trip.price).toFixed(2) : "",
        isFinite(Number(trip.paid)) ? Number(trip.paid).toFixed(2) : "",
        m.valid ? m.litres.toFixed(3) : "",
        m.valid ? m.mileage.toFixed(2) : "",
        m.valid ? m.cost.toFixed(3) : "",
        currency,
        String(trip.note || "")
      ]);
    });
    var content = "\uFEFF" + Z.csv(rows);
    if (typeof Z.download === "function") {
      Z.download("zone-mileage-" + datePickerMax + ".csv", content, "text/csv;charset=utf-8");
    } else {
      var blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "zone-mileage-" + datePickerMax + ".csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    Z.toast("CSV exported · " + trips.length + " fill" + (trips.length === 1 ? "" : "s"));
  }

  function copyRecord(source) {
    var copy = {};
    Object.keys(source || {}).forEach(function (key) { copy[key] = source[key]; });
    return copy;
  }

  function tripSignature(trip) {
    return [
      String(trip.vehicle || "").trim().toLowerCase(),
      String(trip.date || "").slice(0, 10),
      Number(trip.start),
      Number(trip.end),
      Number(trip.price),
      Number(trip.paid),
      String(trip.note || "").trim()
    ].join("|");
  }

  function buildExportPayload() {
    var garage = allVehicles().map(function (vehicle) {
      var createdAt = "";
      for (var i = 0; i < storedVehicles.length; i += 1) {
        if (sameName(storedVehicles[i].name, vehicle.name)) {
          createdAt = String(storedVehicles[i].createdAt || "");
          break;
        }
      }
      return {
        id: String(vehicle.id || ""),
        name: vehicle.name,
        type: normalizeType(vehicle.type),
        fuel: normalizeFuel(vehicle.fuel),
        createdAt: createdAt
      };
    });
    var records = trips.slice().sort(sortTripsDesc).map(function (trip) {
      return {
        id: String(trip.id == null ? "" : trip.id),
        vehicle: String(trip.vehicle || ""),
        date: String(trip.date || "").slice(0, 10),
        start: trip.start,
        end: trip.end,
        price: trip.price,
        paid: trip.paid,
        note: String(trip.note || "")
      };
    });
    return {
      schema: "zone.mileage.backup.v1",
      app: "Zone",
      page: "mileage",
      exportedAt: new Date().toISOString(),
      currency: currency,
      counts: { vehicles: garage.length, fills: records.length },
      vehicles: garage,
      trips: records
    };
  }

  function exportJson() {
    var payload = buildExportPayload();
    if (!payload.vehicles.length && !payload.trips.length) {
      Z.toast("Nothing to back up yet. Add a vehicle or a fill first.", "error");
      return;
    }
    Z.download(
      "zone-mileage-backup-" + datePickerMax + ".json",
      JSON.stringify(payload, null, 2) + "\n",
      "application/json;charset=utf-8"
    );
    updateDataSummary();
    Z.toast("JSON backup exported · " + payload.vehicles.length + " vehicle" +
      (payload.vehicles.length === 1 ? "" : "s") + " · " + payload.trips.length + " fill" +
      (payload.trips.length === 1 ? "" : "s"));
  }

  function normalizeImportedVehicle(source) {
    if (!isObject(source)) return null;
    var name = String(source.name == null ? "" : source.name).trim().slice(0, 40);
    if (!name) return null;
    return {
      id: String(source.id == null ? "" : source.id).trim() || Z.uid("vehicle"),
      name: name,
      type: normalizeType(source.type),
      fuel: normalizeFuel(source.fuel),
      createdAt: String(source.createdAt == null ? "" : source.createdAt).slice(0, 10)
    };
  }

  function normalizeImportedTrip(source) {
    if (!isObject(source)) return null;
    var vehicle = String(source.vehicle == null ? "" : source.vehicle).trim().slice(0, 40);
    var date = String(source.date == null ? "" : source.date).slice(0, 10);
    var start = Number(source.start);
    var end = Number(source.end);
    var price = Number(source.price);
    var paid = Number(source.paid);
    if (!vehicle || !parseDate(date)) return null;
    if (!isFinite(start) || !isFinite(end) || !isFinite(price) || !isFinite(paid)) return null;
    if (start < 0 || end <= start || price <= 0 || paid <= 0) return null;
    return {
      id: String(source.id == null ? "" : source.id).trim() || Z.uid("trip"),
      vehicle: vehicle,
      date: date,
      start: start,
      end: end,
      price: price,
      paid: paid,
      note: String(source.note == null ? "" : source.note).trim().slice(0, 90)
    };
  }

  function normalizeImport(raw) {
    if (!isObject(raw)) throw new Error("That file is not a Mileage backup.");
    var sourceVehicles = Array.isArray(raw.vehicles) ? raw.vehicles : [];
    var sourceTrips = Array.isArray(raw.trips) ? raw.trips : [];
    if (!sourceVehicles.length && !sourceTrips.length) {
      throw new Error("No vehicles or fills found in that file.");
    }

    var vehicles = [];
    var names = {};
    var vehicleIds = {};
    var skippedVehicles = 0;

    sourceVehicles.forEach(function (item) {
      var vehicle = normalizeImportedVehicle(item);
      if (!vehicle) {
        skippedVehicles += 1;
        return;
      }
      var key = vehicle.name.toLowerCase();
      if (names[key] || vehicleIds[vehicle.id]) {
        skippedVehicles += 1;
        return;
      }
      names[key] = true;
      vehicleIds[vehicle.id] = true;
      vehicles.push(vehicle);
    });

    var importedTrips = [];
    var tripIds = {};
    var signatures = {};
    var skippedTrips = 0;

    sourceTrips.forEach(function (item) {
      var trip = normalizeImportedTrip(item);
      if (!trip) {
        skippedTrips += 1;
        return;
      }
      var signature = tripSignature(trip);
      if (tripIds[trip.id] || signatures[signature]) {
        skippedTrips += 1;
        return;
      }
      tripIds[trip.id] = true;
      signatures[signature] = true;
      importedTrips.push(trip);

      var nameKey = trip.vehicle.toLowerCase();
      if (!names[nameKey]) {
        names[nameKey] = true;
        var generatedId = Z.uid("vehicle");
        while (vehicleIds[generatedId]) generatedId = Z.uid("vehicle");
        vehicleIds[generatedId] = true;
        vehicles.push({
          id: generatedId,
          name: trip.vehicle,
          type: inferType(trip.vehicle),
          fuel: "petrol",
          createdAt: trip.date
        });
      }
    });

    if (!vehicles.length && !importedTrips.length) {
      throw new Error("No readable vehicles or fills found in that file.");
    }

    var code = String(raw.currency || "").toUpperCase();
    return {
      vehicles: vehicles,
      trips: importedTrips,
      currency: CURRENCY_META[code] ? code : "",
      skippedVehicles: skippedVehicles,
      skippedTrips: skippedTrips
    };
  }

  function mergeImport(data) {
    var nextVehicles = storedVehicles.map(copyRecord);
    var nameMap = {};
    var idMap = {};
    allVehicles().forEach(function (vehicle) {
      nameMap[vehicle.name.toLowerCase()] = true;
      idMap[String(vehicle.id)] = true;
    });
    nextVehicles.forEach(function (vehicle) {
      nameMap[vehicle.name.toLowerCase()] = true;
      idMap[String(vehicle.id)] = true;
    });

    var addedVehicles = 0;
    data.vehicles.forEach(function (vehicle) {
      var key = vehicle.name.toLowerCase();
      if (nameMap[key] || idMap[String(vehicle.id)]) return;
      nextVehicles.push(copyRecord(vehicle));
      nameMap[key] = true;
      idMap[String(vehicle.id)] = true;
      addedVehicles += 1;
    });

    var nextTrips = trips.map(copyRecord);
    var tripIds = {};
    var signatures = {};
    nextTrips.forEach(function (trip) {
      tripIds[String(trip.id)] = true;
      signatures[tripSignature(trip)] = true;
    });

    var addedTrips = 0;
    data.trips.forEach(function (trip) {
      if (tripIds[String(trip.id)] || signatures[tripSignature(trip)]) return;
      nextTrips.push(copyRecord(trip));
      tripIds[String(trip.id)] = true;
      signatures[tripSignature(trip)] = true;
      addedTrips += 1;

      var nameKey = trip.vehicle.toLowerCase();
      if (!nameMap[nameKey]) {
        var vehicle = {
          id: Z.uid("vehicle"),
          name: trip.vehicle,
          type: inferType(trip.vehicle),
          fuel: "petrol",
          createdAt: trip.date
        };
        nextVehicles.push(vehicle);
        nameMap[nameKey] = true;
        idMap[String(vehicle.id)] = true;
        addedVehicles += 1;
      }
    });

    Z.store.set("trips", nextTrips);
    if (nextVehicles.length) Z.store.set("vehicles", nextVehicles);
    else Z.store.remove("vehicles");

    return {
      addedTrips: addedTrips,
      addedVehicles: addedVehicles,
      totalTrips: nextTrips.length
    };
  }

  function replaceImport(data) {
    var nextVehicles = data.vehicles.map(copyRecord);
    var nextTrips = data.trips.map(copyRecord);
    Z.store.set("trips", nextTrips);
    if (nextVehicles.length) Z.store.set("vehicles", nextVehicles);
    else Z.store.remove("vehicles");
    if (data.currency) Z.store.set("mileage_currency", data.currency);
    else Z.store.remove("mileage_currency");
    return {
      addedTrips: nextTrips.length,
      addedVehicles: nextVehicles.length,
      totalTrips: nextTrips.length
    };
  }

  function refreshAfterImport() {
    trips = loadTrips();
    storedVehicles = loadVehicles();
    currency = readCurrency();
    currentFilter = "all";
    chartFilter = "all";
    logQuery = "";
    logSort = "recent";
    filterField.value = "all";
    chartField.value = "all";
    if (logSearchField) logSearchField.value = "";
    if (logSortField) logSortField.value = "recent";
    resetForm({ vehicle: "", price: "" });
    updateCurrencyUI();
    renderAll();
    updateDataSummary();
  }

  function updateDataSummary() {
    if (!dataVehicleCount) return;
    dataVehicleCount.textContent = String(allVehicles().length);
    dataFillCount.textContent = String(trips.length);
    if (dataCurrencyLabel) dataCurrencyLabel.textContent = currencyInfo().symbol + " " + currency;
  }

  function setImportStatus(message, kind) {
    if (!importStatus) return;
    importStatus.textContent = message;
    importStatus.className = "mi-import-status" + (kind ? " " + kind : "");
  }

  function resetImportState() {
    pendingImport = null;
    if (dataFileInput) dataFileInput.value = "";
    if (applyImportButton) applyImportButton.hidden = true;
    setImportStatus("No backup selected.", "");
  }

  function openDataDialog() {
    if (!dataDialog) return;
    updateDataSummary();
    resetImportState();
    if (typeof dataDialog.showModal === "function") dataDialog.showModal();
    else dataDialog.setAttribute("open", "open");
    window.setTimeout(function () {
      var exportButton = $("export-mileage-json");
      if (exportButton) exportButton.focus();
    }, 40);
  }

  function closeDataDialog() {
    resetImportState();
    if (!dataDialog) return;
    if (dataDialog.open) dataDialog.close();
    else dataDialog.removeAttribute("open");
  }

  function handleImportFile() {
    if (!dataFileInput) return;
    var file = dataFileInput.files && dataFileInput.files[0];
    if (!file) return;
    pendingImport = null;
    if (applyImportButton) applyImportButton.hidden = true;
    setImportStatus("Reading " + file.name + "…", "");

    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = normalizeImport(JSON.parse(String(reader.result || "")));
      } catch (error) {
        var message = error && error.name === "SyntaxError"
          ? "That file is not valid JSON."
          : (error && error.message ? error.message : "Could not read that backup.");
        setImportStatus(message, "is-error");
        Z.toast("That file is not a readable Mileage backup.", "error");
        dataFileInput.value = "";
        return;
      }

      pendingImport = data;
      dataFileInput.value = "";
      var parts = [];
      if (data.vehicles.length) {
        parts.push(data.vehicles.length + " vehicle" + (data.vehicles.length === 1 ? "" : "s"));
      }
      if (data.trips.length) {
        parts.push(data.trips.length + " fill" + (data.trips.length === 1 ? "" : "s"));
      }
      var skipped = data.skippedVehicles + data.skippedTrips;
      setImportStatus(
        "Ready · " + parts.join(" · ") +
        (skipped ? " · " + skipped + " row" + (skipped === 1 ? "" : "s") + " skipped" : ""),
        "is-ready"
      );
      if (applyImportButton) applyImportButton.hidden = false;
    };
    reader.onerror = function () {
      setImportStatus("Could not read that file. Try choosing it again.", "is-error");
      dataFileInput.value = "";
    };
    reader.readAsText(file);
  }

  function finishImport(mode) {
    var data = pendingImport;
    if (!data) return;
    var result = mode === "replace" ? replaceImport(data) : mergeImport(data);
    pendingImport = null;
    closeDataDialog();
    refreshAfterImport();

    if (mode === "replace") {
      Z.toast("JSON restored · " + trips.length + " fill" + (trips.length === 1 ? "" : "s") +
        " · " + allVehicles().length + " vehicle" + (allVehicles().length === 1 ? "" : "s"));
      return;
    }
    if (!result.addedTrips && !result.addedVehicles) {
      Z.toast("JSON merged · nothing new to add.");
      return;
    }
    Z.toast("JSON merged · " + result.addedTrips + " new fill" + (result.addedTrips === 1 ? "" : "s") +
      (result.addedVehicles ? " · " + result.addedVehicles + " new vehicle" + (result.addedVehicles === 1 ? "" : "s") : ""));
  }

  function applyPendingImport() {
    if (!pendingImport) return;
    var modeField = dataDialog
      ? dataDialog.querySelector('input[name="mileage-import-mode"]:checked')
      : null;
    var mode = modeField ? modeField.value : "merge";
    if (mode === "replace") {
      var importedVehicles = pendingImport.vehicles.length;
      var importedTrips = pendingImport.trips.length;
      var currentVehicles = allVehicles().length;
      if (applyImportButton) applyImportButton.disabled = true;
      Z.confirm({
        kicker: "Restore JSON",
        title: "Replace this Mileage ledger?",
        message: "This clears <strong>" + currentVehicles + " vehicle" + (currentVehicles === 1 ? "" : "s") +
          "</strong> and <strong>" + trips.length + " fill" + (trips.length === 1 ? "" : "s") +
          "</strong>, then restores <strong>" + importedVehicles + " vehicle" + (importedVehicles === 1 ? "" : "s") +
          "</strong> and <strong>" + importedTrips + " fill" + (importedTrips === 1 ? "" : "s") +
          "</strong> from the backup.",
        label: "Replace ledger"
      }).then(function (ok) {
        if (applyImportButton) applyImportButton.disabled = false;
        if (!ok) return;
        finishImport("replace");
      });
      return;
    }
    finishImport("merge");
  }

  function clearFilter() {
    currentFilter = "all";
    logQuery = "";
    logSort = "recent";
    filterField.value = "all";
    if (logSearchField) logSearchField.value = "";
    if (logSortField) logSortField.value = "recent";
    renderTable();
  }

  function focusPump() {
    try {
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    } catch (error) {
      form.scrollIntoView();
    }
    window.setTimeout(function () { vehicleField.focus({ preventScroll: true }); }, reduceMotion ? 0 : 250);
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  form.addEventListener("submit", saveTrip);

  vehicleField.addEventListener("input", function () {
    refreshPicker();
    updateChain();
    updateLive();
  });
  vehicleField.addEventListener("change", function () {
    autoChain(true);
    refreshPicker();
  });

  dateField.addEventListener("change", function () {
    autoChain(false);
  });

  [startField, endField, priceField, paidField].forEach(function (field) {
    field.addEventListener("input", function () {
      if (field === startField && String(startField.value || "").trim() !== autoStartValue) autoStartValue = null;
      if (field === endField && String(endField.value || "").trim() !== autoEndValue) autoEndValue = null;
      updateChain();
      updateLive();
    });
  });

  chainReset.addEventListener("click", function () {
    var name = String(vehicleField.value || "").trim();
    var date = String(dateField.value || datePickerMax).slice(0, 10);
    var prev = latestTripOnOrBefore(name, date, idField.value || null);
    if (!prev || idField.value) return;
    startField.value = String(prev.end);
    autoStartValue = String(prev.end);
    updateChain();
    updateLive();
    startField.focus();
  });

  cancelButton.addEventListener("click", function () {
    var keepVehicle = String(vehicleField.value || "").trim();
    var keepPrice = priceField.value;
    resetForm({ vehicle: keepVehicle, price: keepPrice });
    renderAll();
  });

  filterField.addEventListener("change", function () {
    currentFilter = filterField.value || "all";
    renderTable();
  });

  if (logSearchField) {
    logSearchField.addEventListener("input", function () {
      logQuery = String(logSearchField.value || "").trim();
      renderTable();
    });
  }

  if (logSortField) {
    logSortField.addEventListener("change", function () {
      logSort = logSortField.value || "recent";
      renderTable();
    });
  }

  chartField.addEventListener("change", function () {
    chartFilter = chartField.value || "all";
    renderChart();
  });

  if (chartHost) {
    chartHost.addEventListener("pointermove", function (event) {
      var point = event.target.closest(".mi-chart-point");
      var tip = chartHost.querySelector(".mi-chart-tip");
      if (!point || !tip) {
        if (tip) tip.classList.remove("is-visible");
        return;
      }
      var pointRect = point.getBoundingClientRect();
      var hostRect = chartHost.getBoundingClientRect();
      var note = point.getAttribute("data-note") || "";
      tip.innerHTML = '<span class="mi-chart-tip-kicker">' + esc(point.getAttribute("data-vehicle")) + '</span>' +
        '<strong>' + esc(point.getAttribute("data-mileage")) + '<small>km/l</small></strong>' +
        '<span class="mi-chart-tip-meta">' + esc(point.getAttribute("data-date")) + '</span>' +
        '<span class="mi-chart-tip-foot">' + esc(point.getAttribute("data-distance")) + ' · ' + esc(point.getAttribute("data-paid")) + '</span>' +
        (note ? '<span class="mi-chart-tip-note">' + esc(note) + '</span>' : '');
      tip.style.setProperty("--tip-tint", point.getAttribute("data-color") || "#c9a164");
      tip.classList.add("is-visible");
      var x = pointRect.left + pointRect.width / 2 - hostRect.left;
      var y = pointRect.top - hostRect.top;
      var width = tip.offsetWidth || 170;
      var left = Math.max(width / 2 + 4, Math.min(hostRect.width - width / 2 - 4, x));
      tip.style.left = left.toFixed(1) + "px";
      tip.style.top = Math.max(8, y).toFixed(1) + "px";
    });

    chartHost.addEventListener("pointerleave", function () {
      var tip = chartHost.querySelector(".mi-chart-tip");
      if (tip) tip.classList.remove("is-visible");
    });
  }

  window.addEventListener("resize", Z.debounce(renderChart, 140));

  currencyToggle.addEventListener("click", function (event) {
    var button = event.target.closest("[data-currency]");
    if (!button) return;
    var next = button.getAttribute("data-currency");
    if (!CURRENCY_META[next]) return;
    currency = next;
    Z.store.set("mileage_currency", currency);
    updateCurrencyUI();
    renderStats();
    renderPulse();
    renderGarage();
    renderCompare();
    renderChart();
    renderTable();
    updateLive();
  });

  $("focus-log").addEventListener("click", focusPump);
  $("export-mileage").addEventListener("click", exportCsv);
  $("open-mileage-data").addEventListener("click", openDataDialog);

  if ($("export-mileage-json")) $("export-mileage-json").addEventListener("click", exportJson);
  if (applyImportButton) applyImportButton.addEventListener("click", applyPendingImport);
  if (dataFileInput) dataFileInput.addEventListener("change", handleImportFile);

  if (dataDialog) {
    dataDialog.addEventListener("click", function (event) {
      if (event.target.closest("[data-close-mileage-data]")) {
        event.preventDefault();
        closeDataDialog();
        return;
      }
      if (event.target === dataDialog) closeDataDialog();
    });
  }

  document.addEventListener("click", function (event) {
    var opener = event.target.closest("[data-open-vehicle]");
    if (opener) {
      event.preventDefault();
      openVehicleDialog();
      return;
    }
    var closer = event.target.closest("[data-close-vehicle]");
    if (closer) {
      event.preventDefault();
      closeVehicleDialog();
    }
  });

  vehiclePicker.addEventListener("click", function (event) {
    var button = event.target.closest("[data-pick-vehicle]");
    if (!button) return;
    selectVehicle(button.getAttribute("data-pick-vehicle"), true);
  });

  vehicleGrid.addEventListener("click", function (event) {
    var remove = event.target.closest("[data-delete-vehicle]");
    if (remove) {
      event.preventDefault();
      deleteVehicle(remove.getAttribute("data-delete-vehicle"));
      return;
    }
    var pick = event.target.closest("[data-pick-vehicle]");
    if (pick) {
      event.preventDefault();
      selectVehicle(pick.getAttribute("data-pick-vehicle"), true);
    }
  });

  if (latestFillHost) {
    latestFillHost.addEventListener("click", function (event) {
      var edit = event.target.closest("[data-edit-trip]");
      if (edit) {
        event.preventDefault();
        editTrip(edit.getAttribute("data-edit-trip"));
        return;
      }
      if (event.target.closest("[data-focus-pump]")) {
        event.preventDefault();
        focusPump();
      }
    });
  }

  tableBody.addEventListener("click", function (event) {
    var edit = event.target.closest("[data-edit-trip]");
    if (edit) {
      event.preventDefault();
      editTrip(edit.getAttribute("data-edit-trip"));
      return;
    }
    var remove = event.target.closest("[data-delete-trip]");
    if (remove) {
      event.preventDefault();
      deleteTrip(remove.getAttribute("data-delete-trip"));
      return;
    }
    if (event.target.closest("[data-clear-filter]")) {
      event.preventDefault();
      clearFilter();
      return;
    }
    if (event.target.closest("[data-focus-pump]")) {
      event.preventDefault();
      focusPump();
    }
  });

  vehicleForm.addEventListener("submit", addVehicle);

  vehicleDialog.addEventListener("click", function (event) {
    if (event.target === vehicleDialog) vehicleDialog.close();
  });

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  buildGaugeTicks();
  var typeArts = document.querySelectorAll(".mi-type-art");
  for (var t = 0; t < typeArts.length; t += 1) {
    typeArts[t].innerHTML = vehicleArt(typeArts[t].getAttribute("data-type"));
  }

  updateCurrencyUI();
  renderAll();
  updateChain();
})();
