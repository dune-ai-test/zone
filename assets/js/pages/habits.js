/* Zone — habits */

(function () {
  "use strict";

  var esc = Z.esc;
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
  var WEEK_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var today = Z.todayISO();

  var data = Z.store.get("habits", { habits: [] });
  data = normalizeData(data);
  var habits = data.habits;
  var weekOffset = 0;
  var query = "";
  var filter = "all";
  var sortMode = "custom";
  var expanded = {};

  var $ = function (id) { return document.getElementById(id); };
  var dialog = $("habit-dialog");
  var form = $("habit-form");
  var idField = $("habit-id");
  var nameField = $("habit-name");
  var targetField = $("habit-target");
  var saveButton = $("habit-save");
  var dialogKicker = $("habit-kicker");
  var dialogTitle = $("habit-title");
  var startersField = $("habit-starters-field");
  var targetNote = $("habit-target-note");
  var statsHost = $("habit-stats");
  var weekCard = $("habit-week-card");
  var heroMeta = $("habit-hero-meta");
  var todayStrip = $("today-strip");
  var checkinSection = $("habit-checkin");
  var checkinDate = $("habit-checkin-date");
  var checkinCount = $("today-checkin-count");
  var weekLabel = $("habit-week-label");
  var prevWeekButton = $("habit-prev-week");
  var nextWeekButton = $("habit-next-week");
  var thisWeekButton = $("habit-this-week");
  var tableHost = $("habit-table");
  var filtersHost = $("habit-filters");
  var searchField = $("habit-search");
  var searchClear = $("habit-search-clear");
  var searchBox = searchField.closest(".hb-search");
  var sortField = $("habit-sort");
  var pulseHost = $("habit-week-chart");
  var pulseMeta = $("habit-pulse-meta");
  var insightsHost = $("habit-insights");

  function plural(number, one, many) {
    return number + " " + (number === 1 ? one : many);
  }

  function validDate(value) {
    var text = String(value || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
    return Z.toISO(Z.parseISO(text)) === text ? text : "";
  }

  function normalizeChecks(value) {
    var out = {};
    if (!value || typeof value !== "object") return out;
    Object.keys(value).forEach(function (key) {
      var day = validDate(key);
      if (day && value[key]) out[day] = true;
    });
    return out;
  }

  function normalizeData(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) raw = { habits: [] };
    if (!Array.isArray(raw.habits)) raw.habits = [];
    var seen = {};
    raw.habits = raw.habits.filter(function (habit) {
      return habit && typeof habit === "object";
    }).map(function (habit) {
      var id = habit.id == null ? "" : String(habit.id);
      if (!id || seen[id]) id = Z.uid("habit");
      seen[id] = true;
      habit.id = id;
      habit.name = String(habit.name == null ? "" : habit.name).trim() || "Untitled habit";
      habit.target = Math.min(7, Math.max(1, Number(habit.target) || 7));
      habit.createdAt = validDate(habit.createdAt) || today;
      habit.checks = normalizeChecks(habit.checks);
      return habit;
    });
    return raw;
  }

  function save() {
    data.habits = habits;
    Z.store.set("habits", data);
  }

  function findHabit(id) {
    return habits.filter(function (habit) { return habit.id === id; })[0];
  }

  function isChecked(habit, day) {
    return Boolean(habit.checks[day]);
  }

  function countDays(habit, dates) {
    return dates.filter(function (day) { return isChecked(habit, day); }).length;
  }

  function streakFor(habit) {
    var cursor = today;
    if (!isChecked(habit, cursor)) cursor = Z.addDays(cursor, -1);
    var count = 0;
    while (isChecked(habit, cursor)) {
      count += 1;
      cursor = Z.addDays(cursor, -1);
    }
    return count;
  }

  function longestStreak(habit) {
    var days = Object.keys(habit.checks).filter(function (day) {
      return habit.checks[day];
    }).sort();
    if (!days.length) return 0;
    var best = 1;
    var run = 1;
    for (var i = 1; i < days.length; i += 1) {
      if (Z.daysBetween(days[i - 1], days[i]) === 1) run += 1;
      else run = 1;
      if (run > best) best = run;
    }
    return best;
  }

  function monthCount(habit) {
    var key = Z.monthKey(today);
    return Object.keys(habit.checks).filter(function (day) {
      return habit.checks[day] && Z.monthKey(day) === key;
    }).length;
  }

  function currentWeekSummary(list) {
    var dates = Z.weekDates(0);
    var elapsed = dates.filter(function (day) { return day <= today; }).length;
    var met = 0;
    var slots = 0;
    var raw = 0;
    (list || habits).forEach(function (habit) {
      var counted = countDays(habit, dates.slice(0, elapsed));
      var cap = Math.min(habit.target, elapsed);
      met += Math.min(counted, cap);
      slots += cap;
      raw += counted;
    });
    return {
      dates: dates,
      elapsed: elapsed,
      met: met,
      slots: slots,
      raw: raw,
      pct: slots ? Math.round((met / slots) * 100) : 0
    };
  }

  function weekSummary(offset, list) {
    var dates = Z.weekDates(offset);
    var elapsed = offset === 0 ? dates.filter(function (day) { return day <= today; }).length : 7;
    var met = 0;
    var slots = 0;
    var raw = 0;
    (list || habits).forEach(function (habit) {
      var counted = countDays(habit, dates.slice(0, elapsed));
      var cap = Math.min(habit.target, elapsed);
      met += Math.min(counted, cap);
      slots += cap;
      raw += counted;
    });
    return {
      dates: dates,
      elapsed: elapsed,
      met: met,
      slots: slots,
      raw: raw,
      pct: slots ? Math.round((met / slots) * 100) : 0
    };
  }

  function weekCount(habit, offset) {
    return countDays(habit, Z.weekDates(offset));
  }

  function consistency(habit) {
    var met = 0;
    for (var offset = -7; offset <= 0; offset += 1) {
      met += Math.min(weekCount(habit, offset), habit.target);
    }
    return Math.round((met / (habit.target * 8)) * 100);
  }

  function recentCheckins() {
    var start = Z.addDays(today, -55);
    var count = 0;
    habits.forEach(function (habit) {
      Object.keys(habit.checks).forEach(function (day) {
        if (day >= start && day <= today && habit.checks[day]) count += 1;
      });
    });
    return count;
  }

  function bestStreakHabit() {
    var list = habits.slice().sort(function (a, b) {
      if (streakFor(b) !== streakFor(a)) return streakFor(b) - streakFor(a);
      return a.name.localeCompare(b.name);
    });
    return list[0] || null;
  }

  function weekRange(offset) {
    var dates = Z.weekDates(offset);
    return Z.dateShort(dates[0]) + " – " + Z.dateShort(dates[6]);
  }

  function renderHero() {
    var done = habits.filter(function (habit) { return isChecked(habit, today); }).length;
    var total = habits.length;
    var percent = total ? Math.round((done / total) * 100) : 0;
    var summary = currentWeekSummary();
    var open = habits.filter(function (habit) { return !isChecked(habit, today); });
    var title;
    var note;
    var date = Z.parseISO(today);

    if (!total) {
      title = "Begin with one small thing.";
      note = "Choose something small enough to do on a bad day. The rest can wait.";
    } else if (!open.length) {
      title = "A full set today.";
      note = "Every habit checked. Leave the rest of the day alone.";
    } else if (open.length === 1) {
      title = "One open page.";
      note = open[0].name + " is the only thing still waiting today.";
    } else {
      title = "The day, in small parts.";
      var names = open.slice(0, 2).map(function (habit) { return habit.name; });
      note = names.join(" and ");
      if (open.length > 2) note += " and " + (open.length - 2) + " more";
      note += " are still open today.";
    }

    var dots = "";
    summary.dates.forEach(function (day, index) {
      var doneCount = habits.filter(function (habit) { return isChecked(habit, day); }).length;
      var ratio = total ? Math.round((doneCount / total) * 100) : 0;
      var label = WEEK_NAMES[index] + ", " + Z.dateMedium(day) + " — " + doneCount + " of " + total + " habits checked";
      dots += '<span class="hb-week-dot' + (day === today ? " is-today" : "") + (doneCount === total && total ? " is-full" : doneCount ? " is-some" : "") + '" style="--fill:' + ratio + '%" title="' + esc(label) + '"></span>';
    });

    weekCard.innerHTML =
      '<div class="hb-ring-wrap"><div class="hb-ring" style="--hb-progress:' + percent + '%">' +
        '<div class="hb-ring-inner"><span class="hb-ring-label">Today</span><strong>' + (total ? done : "—") + "</strong><span class=\"hb-ring-denom\">" + (total ? "of " + total : "no habits") + "</span></div>" +
      "</div></div>" +
      '<div class="hb-week-copy">' +
        '<p class="hb-kicker">Today&rsquo;s rhythm · ' + esc(Z.dateWeekday(today)) + " " + date.getDate() + " " + esc(Z.dateMedium(today).split(" ")[1] || "") + "</p>" +
        '<h2 class="hb-week-title">' + esc(title) + "</h2>" +
        '<p class="hb-week-note">' + esc(note) + "</p>" +
        '<div class="hb-week-dots" role="img" aria-label="' + summary.raw + ' check-ins across this week so far">' + dots + "</div>" +
        '<div class="hb-week-foot"><span><strong>' + summary.pct + '%</strong> of this week&rsquo;s pace</span>' +
          '<button type="button" class="hb-week-cta" data-scroll-checkin>Open check-in ' + Z.icon("arrowRight") + "</button></div>" +
      "</div>";
  }

  function renderStats() {
    var done = habits.filter(function (habit) { return isChecked(habit, today); }).length;
    var total = habits.length;
    var open = total - done;
    var week = currentWeekSummary();
    var streakHabit = bestStreakHabit();
    var streak = streakHabit ? streakFor(streakHabit) : 0;
    var recent = recentCheckins();

    statsHost.innerHTML =
      '<article class="hb-metric hb-metric-today">' +
        '<div class="hb-metric-head"><span>Today</span><span class="hb-metric-index">01</span></div>' +
        '<p class="hb-metric-value">' + (total ? done + '<span class="hb-unit">/' + total + "</span>" : "—") + "</p>" +
        '<p class="hb-metric-foot">' + (total ? plural(open, "habit", "habits") + " still open" : "Add your first habit") + "</p>" +
        '<span class="hb-meter" aria-hidden="true"><i style="width:' + (total ? Math.round((done / total) * 100) : 0) + '%"></i></span>' +
      "</article>" +
      '<article class="hb-metric hb-metric-week">' +
        '<div class="hb-metric-head"><span>This week</span><span class="hb-metric-index">02</span></div>' +
        '<p class="hb-metric-value">' + week.pct + '<span class="hb-unit">%</span></p>' +
        '<p class="hb-metric-foot">' + (week.slots ? week.met + " of " + week.slots + " target checks so far" : "Add a habit to begin") + "</p>" +
        '<span class="hb-meter" aria-hidden="true"><i style="width:' + week.pct + '%"></i></span>' +
      "</article>" +
      '<article class="hb-metric hb-metric-streak">' +
        '<div class="hb-metric-head"><span>Best current streak</span><span class="hb-metric-index">03</span></div>' +
        '<p class="hb-metric-value">' + streak + '<span class="hb-unit">' + (streak === 1 ? "day" : "days") + "</span></p>" +
        '<p class="hb-metric-foot">' + (streakHabit && streak ? esc(streakHabit.name) : "A streak starts with one day") + "</p>" +
      "</article>" +
      '<article class="hb-metric hb-metric-checkins">' +
        '<div class="hb-metric-head"><span>Check-ins</span><span class="hb-metric-index">04</span></div>' +
        '<p class="hb-metric-value">' + Z.num(recent) + '<span class="hb-unit">8 wks</span></p>' +
        '<p class="hb-metric-foot">' + (recent ? "Small repetitions, counted" : "The first one is the hardest") + "</p>" +
      "</article>";

    if (heroMeta) {
      heroMeta.innerHTML =
        '<span class="hb-meta-item"><span class="hb-local-dot" aria-hidden="true"></span>Local tracker</span>' +
        '<span class="hb-meta-item">' + plural(total, "habit", "habits") + "</span>" +
        '<span class="hb-meta-item">' + done + " done today</span>" +
        '<span class="hb-meta-item">' + week.pct + "% of this week&rsquo;s pace</span>";
    }
  }

  function renderWeekControls() {
    var dates = Z.weekDates(weekOffset);
    var relative = weekOffset === 0 ? "this week" : plural(Math.abs(weekOffset), "week", "weeks") + " ago";
    weekLabel.innerHTML = esc(Z.dateShort(dates[0]) + " – " + Z.dateShort(dates[6])) + '<span>' + esc(relative) + "</span>";
    nextWeekButton.disabled = weekOffset >= 0;
    thisWeekButton.hidden = weekOffset === 0;
  }

  function renderTodayStrip() {
    var total = habits.length;
    var done = habits.filter(function (habit) { return isChecked(habit, today); }).length;
    checkinSection.hidden = !total;
    checkinDate.textContent = "Today · " + Z.dateWeekday(today) + ", " + Z.dateMedium(today);
    checkinCount.textContent = total ? done + " of " + total + " done" : "—";

    todayStrip.innerHTML = habits.map(function (habit) {
      var checked = isChecked(habit, today);
      var week = weekCount(habit, 0);
      var streak = streakFor(habit);
      return '<button type="button" class="hb-checkin-card' + (checked ? " is-done" : "") + '" data-today-habit="' + esc(habit.id) + '" aria-pressed="' + checked + '">' +
        '<span class="hb-avatar hb-tone-' + Z.toneFor(habit.name) + '">' + esc(Z.initials(habit.name, 2)) + "</span>" +
        '<span class="hb-checkin-text"><strong>' + esc(habit.name) + "</strong><small>" + week + " of " + habit.target + " this week" + (streak ? " · " + plural(streak, "day", "days") + " streak" : "") + "</small></span>" +
        '<span class="hb-checkin-mark">' + (checked ? CHECK : "<i></i>") + "</span>" +
      "</button>";
    }).join("");
  }

  function renderFilters() {
    var open = habits.filter(function (habit) { return !isChecked(habit, today); }).length;
    var streaking = habits.filter(function (habit) { return streakFor(habit) > 0; }).length;
    var items = [
      { value: "all", label: "All", count: habits.length },
      { value: "open", label: "Open today", count: open },
      { value: "streak", label: "On a streak", count: streaking }
    ];
    filtersHost.innerHTML = items.map(function (item) {
      var active = filter === item.value;
      return '<button type="button" class="hb-filter' + (active ? " is-active" : "") + '" data-habit-filter="' + item.value + '" aria-pressed="' + active + '">' +
        item.label + '<span>' + item.count + "</span></button>";
    }).join("");
  }

  function filteredHabits() {
    var q = query.trim().toLowerCase();
    var list = habits.filter(function (habit) {
      if (q && habit.name.toLowerCase().indexOf(q) === -1) return false;
      if (filter === "open" && isChecked(habit, today)) return false;
      if (filter === "streak" && !streakFor(habit)) return false;
      return true;
    });
    if (sortMode === "streak") {
      list = list.slice().sort(function (a, b) {
        if (streakFor(b) !== streakFor(a)) return streakFor(b) - streakFor(a);
        return a.name.localeCompare(b.name);
      });
    } else if (sortMode === "name") {
      list = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    return list;
  }

  function weekToggle(habit, day, index) {
    var done = isChecked(habit, day);
    var future = day > today;
    var classes = "hb-day" + (done ? " is-done" : "") + (day === today ? " is-today" : "") + (future ? " is-future" : "");
    var label = WEEK_NAMES[index] + ", " + Z.dateMedium(day) + " — " + habit.name + ", " + (done ? "checked" : "not checked");
    return '<button type="button" class="' + classes + '" data-toggle-day="' + esc(day) + '" data-habit-id="' + esc(habit.id) + '" aria-pressed="' + done + '" aria-label="' + esc(label) + '"' + (future ? " disabled" : "") + ">" +
      '<span class="hb-day-letter" aria-hidden="true">' + WEEK_LETTERS[index] + "</span>" +
      '<span class="hb-day-mark">' + (done ? CHECK : "<i></i>") + "</span>" +
    "</button>";
  }

  function heatGrid(habit) {
    var start = Z.addDays(Z.startOfWeek(today), -49);
    var cells = [];
    for (var i = 0; i < 56; i += 1) {
      var day = Z.addDays(start, i);
      var done = isChecked(habit, day);
      var future = day > today;
      var classes = "hb-heat-cell" + (done ? " is-done" : "") + (day === today ? " is-today" : "") + (future ? " is-future" : "");
      var label = Z.dateLong(day) + " — " + (done ? "checked" : "not checked");
      cells.push('<button type="button" class="' + classes + '" data-toggle-day="' + esc(day) + '" data-habit-id="' + esc(habit.id) + '" aria-pressed="' + done + '" aria-label="' + esc(label) + '"' + (future ? " disabled" : "") + ">" +
        '<span aria-hidden="true">' + Z.parseISO(day).getDate() + "</span></button>");
    }
    return '<div class="hb-heat">' +
      '<div class="hb-heat-head"><span>Eight weeks, day by day</span><span>Click any day to change it</span></div>' +
      '<div class="hb-heat-weekdays" aria-hidden="true"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>' +
      '<div class="hb-heat-grid">' + cells.join("") + "</div>" +
    "</div>";
  }

  function habitDetail(habit) {
    return '<div class="hb-habit-detail"><div class="hb-detail-inner">' +
      '<div class="hb-detail-stats">' +
        '<div class="hb-detail-stat"><strong>' + streakFor(habit) + "</strong><span>Current streak</span></div>" +
        '<div class="hb-detail-stat"><strong>' + longestStreak(habit) + "</strong><span>Longest streak</span></div>" +
        '<div class="hb-detail-stat"><strong>' + monthCount(habit) + "</strong><span>This month</span></div>" +
        '<div class="hb-detail-stat"><strong>' + consistency(habit) + '%</strong><span>Eight-week consistency</span></div>' +
      "</div>" + heatGrid(habit) +
    "</div></div>";
  }

  function habitRow(habit) {
    var open = Boolean(expanded[habit.id]);
    var dates = Z.weekDates(weekOffset);
    var counted = countDays(habit, dates);
    var met = counted >= habit.target;
    var streak = streakFor(habit);
    var targetLabel = weekOffset === 0 ? "this week" : "that week";
    var progress = Math.min(100, Math.round((counted / habit.target) * 100));
    var expandLabel = open ? "Close eight-week history for " + habit.name : "Open eight-week history for " + habit.name;

    return '<article class="hb-habit' + (open ? " is-open" : "") + '" data-id="' + esc(habit.id) + '">' +
      '<div class="hb-habit-row">' +
        '<div class="hb-identity">' +
          '<span class="hb-avatar hb-tone-' + Z.toneFor(habit.name) + '">' + esc(Z.initials(habit.name, 2)) + "</span>" +
          '<div class="hb-identity-copy">' +
            '<h4><button type="button" class="hb-habit-name" data-toggle-habit="' + esc(habit.id) + '" title="' + esc(expandLabel) + '">' + esc(habit.name) + "</button></h4>" +
            '<p><span class="hb-target-pill">' + habit.target + "× / week</span><span class=\"hb-week-count" + (met ? " is-met" : "") + '">' + counted + " of " + habit.target + " " + targetLabel + "</span></p>" +
            '<span class="hb-identity-meter" aria-hidden="true"><i style="width:' + progress + '%"></i></span>' +
          "</div>" +
        "</div>" +
        '<div class="hb-week">' + dates.map(function (day, index) { return weekToggle(habit, day, index); }).join("") + "</div>" +
        '<div class="hb-streak' + (streak ? "" : " is-quiet") + '">' + Z.icon("flame") + "<span>" + (streak || "—") + '</span><small>day' + (streak === 1 ? "" : "s") + "</small></div>" +
        '<div class="hb-actions">' +
          '<button type="button" class="icon-btn small hb-expand" data-toggle-habit="' + esc(habit.id) + '" aria-expanded="' + open + '" aria-label="' + esc(expandLabel) + '" title="Eight-week history">' + Z.icon("chevronDown") + "</button>" +
          '<button type="button" class="icon-btn small" data-edit-habit="' + esc(habit.id) + '" aria-label="Edit ' + esc(habit.name) + '" title="Edit habit">' + Z.icon("pencil") + "</button>" +
          '<button type="button" class="icon-btn small danger" data-delete-habit="' + esc(habit.id) + '" aria-label="Delete ' + esc(habit.name) + '" title="Delete habit">' + Z.icon("trash") + "</button>" +
        "</div>" +
      "</div>" + (open ? habitDetail(habit) : "") +
    "</article>";
  }

  function renderTable() {
    var dates = Z.weekDates(weekOffset);
    var list = filteredHabits();

    renderWeekControls();

    if (!habits.length) {
      tableHost.innerHTML = '<div class="hb-empty"><div class="hb-empty-mark">' + Z.icon("repeat") + "</div>" +
        '<p class="hb-kicker">The first row</p><h3>Begin with one small thing.</h3>' +
        "<p>A habit can be five minutes long. The point is returning, not performing.</p>" +
        '<button type="button" class="btn hb-empty-btn" data-add-habit>Add your first habit</button></div>';
      return;
    }

    if (!list.length) {
      tableHost.innerHTML = '<div class="hb-empty hb-empty-sm"><div class="hb-empty-mark">' + Z.icon("search") + "</div>" +
        "<h3>No habits match.</h3><p>Try another word or filter, or begin again with the whole board.</p>" +
        '<button type="button" class="btn hb-empty-btn" data-clear-habit-filters>Clear filters</button></div>';
      return;
    }

    var header = '<div class="hb-table-head"><span class="hb-col-habit">Habit</span>' +
      '<div class="hb-week-head">' + dates.map(function (day, index) {
        return '<span class="hb-week-head-cell' + (day === today ? " is-today" : "") + '"><span>' + WEEK_LETTERS[index] + "</span><strong>" + Z.parseISO(day).getDate() + "</strong></span>";
      }).join("") + "</div>" +
      '<span class="hb-col-streak">Streak</span><span class="hb-col-actions"><span class="sr-only">Actions</span></span></div>';

    tableHost.innerHTML = header + list.map(habitRow).join("");
  }

  function renderPulse() {
    var offsets = [];
    for (var offset = -7; offset <= 0; offset += 1) offsets.push(offset);
    var sum = 0;
    pulseHost.innerHTML = offsets.map(function (item) {
      var summary = weekSummary(item);
      var dates = summary.dates;
      sum += summary.pct;
      var selected = weekOffset === item;
      var classes = "hb-pulse-bar" + (item === 0 ? " is-current" : "") + (selected ? " is-selected" : "");
      var label = "Week " + Z.dateShort(dates[0]) + " to " + Z.dateShort(dates[6]) + ", " + summary.pct + "% of target. Open this week.";
      return '<button type="button" class="' + classes + '" data-jump-week="' + item + '" aria-label="' + esc(label) + '" title="' + esc(Z.dateShort(dates[0]) + " – " + Z.dateShort(dates[6]) + " · " + summary.pct + "%") + '">' +
        '<span class="hb-bar-track"><i style="height:' + Math.max(summary.pct, summary.met ? 4 : 0) + '%"></i></span>' +
        '<span class="hb-bar-label">' + Z.parseISO(dates[0]).getDate() + "</span>" +
      "</button>";
    }).join("");
    pulseMeta.textContent = Math.round(sum / offsets.length) + "% avg";
  }

  function renderInsights() {
    if (!habits.length) {
      insightsHost.innerHTML = '<div class="hb-insight is-quiet"><span>No signals yet</span><strong>Your first check-in starts the pattern.</strong></div>';
      return;
    }

    var regular = habits.slice().sort(function (a, b) {
      if (consistency(b) !== consistency(a)) return consistency(b) - consistency(a);
      return a.name.localeCompare(b.name);
    })[0];
    var weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    var monthTotal = 0;
    var start = Z.addDays(today, -55);
    habits.forEach(function (habit) {
      Object.keys(habit.checks).forEach(function (day) {
        if (!habit.checks[day]) return;
        if (Z.monthKey(day) === Z.monthKey(today)) monthTotal += 1;
        if (day >= start && day <= today) {
          var index = (Z.parseISO(day).getDay() + 6) % 7;
          weekdayCounts[index] += 1;
        }
      });
    });
    var bestDay = weekdayCounts.indexOf(Math.max.apply(null, weekdayCounts));
    var bestDayCount = Math.max.apply(null, weekdayCounts);

    insightsHost.innerHTML =
      '<div class="hb-insight"><span>Most regular</span><strong>' + esc(regular.name) + "</strong><small>" + consistency(regular) + "% of its eight-week target</small></div>" +
      '<div class="hb-insight"><span>Busiest day</span><strong>' + (bestDayCount ? WEEK_NAMES[bestDay] + "s" : "No pattern yet") + "</strong><small>" + (bestDayCount ? plural(bestDayCount, "check-in", "check-ins") + " in eight weeks" : "Check in to begin the map") + "</small></div>" +
      '<div class="hb-insight"><span>This month</span><strong>' + Z.num(monthTotal) + "</strong><small>" + (monthTotal ? "check-ins kept so far" : "A fresh month, still unwritten") + "</small></div>";
  }

  function renderAll() {
    renderHero();
    renderStats();
    renderTodayStrip();
    renderFilters();
    renderTable();
    renderPulse();
    renderInsights();
  }

  function updateTargetNote() {
    var target = Number(targetField.value) || 1;
    targetNote.textContent = target === 7
      ? "A check-in for every day of the week."
      : "A check-in for " + target + " of the 7 days. Extra days still count.";
  }

  function openHabit(id) {
    var habit = id ? findHabit(id) : null;
    form.reset();
    idField.value = habit ? habit.id : "";
    nameField.value = habit ? habit.name : "";
    targetField.value = habit ? String(habit.target) : "7";
    startersField.hidden = Boolean(habit);
    dialogKicker.textContent = habit ? "Edit habit" : "New habit";
    dialogTitle.textContent = habit ? "Refine the repetition." : "Choose a small repetition.";
    saveButton.textContent = habit ? "Save changes" : "Add habit";
    updateTargetNote();
    dialog.showModal();
    setTimeout(function () { nameField.focus(); }, 30);
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  function syncSearchClear() {
    var hasValue = Boolean(query.trim());
    searchClear.hidden = !hasValue;
    searchBox.classList.toggle("has-value", hasValue);
  }

  function clearFilters() {
    query = "";
    filter = "all";
    sortMode = "custom";
    searchField.value = "";
    sortField.value = "custom";
    syncSearchClear();
    renderFilters();
    renderTable();
  }

  function restoreCheckFocus(habitId, day, source) {
    var target;
    if (source && source.classList.contains("hb-checkin-card")) {
      var cards = todayStrip.querySelectorAll("[data-today-habit]");
      for (var c = 0; c < cards.length; c += 1) {
        if (cards[c].dataset.todayHabit === habitId) target = cards[c];
      }
    } else {
      var buttons = tableHost.querySelectorAll(".hb-day, .hb-heat-cell");
      for (var i = 0; i < buttons.length; i += 1) {
        var button = buttons[i];
        if (button.dataset.habitId !== habitId || button.dataset.toggleDay !== day) continue;
        if (source && source.classList.contains("hb-heat-cell") !== button.classList.contains("hb-heat-cell")) continue;
        target = button;
      }
    }
    if (target) target.focus({ preventScroll: true });
  }

  function toggleCheck(habitId, day, source) {
    var habit = findHabit(habitId);
    if (!habit || day > today) return;
    if (habit.checks[day]) delete habit.checks[day];
    else habit.checks[day] = true;
    save();
    renderAll();
    restoreCheckFocus(habitId, day, source);
  }

  function toggleHabitExpanded(habitId) {
    expanded[habitId] = !expanded[habitId];
    renderTable();
    var cards = tableHost.querySelectorAll(".hb-habit");
    for (var i = 0; i < cards.length; i += 1) {
      if (cards[i].dataset.id !== habitId) continue;
      var button = cards[i].querySelector(".hb-expand");
      if (button) button.focus({ preventScroll: true });
      break;
    }
  }

  function exportHabits() {
    if (!habits.length) {
      Z.toast("Add a habit before exporting.", "error");
      return;
    }
    var rows = [["Habit", "Target per week", "Created", "Checked dates"]];
    habits.forEach(function (habit) {
      var days = Object.keys(habit.checks).filter(function (day) {
        return habit.checks[day];
      }).sort();
      rows.push([habit.name, habit.target, habit.createdAt, days.join("; ")]);
    });
    Z.download("zone-habits-" + today + ".csv", Z.csv(rows), "text/csv;charset=utf-8");
    Z.toast("Habit history exported.");
  }

  function shiftWeek(delta) {
    var next = Math.min(0, weekOffset + delta);
    if (next === weekOffset) return;
    weekOffset = next;
    renderTable();
    renderPulse();
  }

  function jumpToWeek(offset) {
    weekOffset = Math.min(0, Number(offset) || 0);
    renderTable();
    renderPulse();
    if (window.innerWidth < 900) {
      document.getElementById("habit-board").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  var renderSearch = Z.debounce(function () {
    renderTable();
  }, 120);

  $("add-habit").addEventListener("click", function () { openHabit(); });
  $("export-habits").addEventListener("click", exportHabits);
  prevWeekButton.addEventListener("click", function () { shiftWeek(-1); });
  nextWeekButton.addEventListener("click", function () { shiftWeek(1); });
  thisWeekButton.addEventListener("click", function () { jumpToWeek(0); });

  weekCard.addEventListener("click", function (event) {
    if (!event.target.closest("[data-scroll-checkin]")) return;
    if (!habits.length) {
      openHabit();
      return;
    }
    checkinSection.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("habit-board").addEventListener("click", function (event) {
    var add = event.target.closest("[data-add-habit]");
    if (add) {
      openHabit();
      return;
    }
    var clear = event.target.closest("[data-clear-habit-filters]");
    if (clear) {
      clearFilters();
      return;
    }
    var todayButton = event.target.closest("[data-today-habit]");
    if (todayButton) {
      toggleCheck(todayButton.dataset.todayHabit, today, todayButton);
      return;
    }
    var dayButton = event.target.closest("[data-toggle-day]");
    if (dayButton) {
      toggleCheck(dayButton.dataset.habitId, dayButton.dataset.toggleDay, dayButton);
      return;
    }
    var expand = event.target.closest("[data-toggle-habit]");
    if (expand) {
      toggleHabitExpanded(expand.dataset.toggleHabit);
      return;
    }
    var edit = event.target.closest("[data-edit-habit]");
    if (edit) {
      openHabit(edit.dataset.editHabit);
      return;
    }
    var del = event.target.closest("[data-delete-habit]");
    if (!del) return;
    var habit = findHabit(del.dataset.deleteHabit);
    if (!habit) return;
    Z.confirm({
      kicker: "Delete habit",
      title: "Let this row go?",
      message: "This removes <strong>" + esc(habit.name) + "</strong> and all of its check-ins. There is no undo.",
      label: "Delete habit"
    }).then(function (ok) {
      if (!ok) return;
      habits = habits.filter(function (item) { return item.id !== habit.id; });
      delete expanded[habit.id];
      save();
      renderAll();
      Z.toast("Habit deleted.");
    });
  });

  pulseHost.addEventListener("click", function (event) {
    var bar = event.target.closest("[data-jump-week]");
    if (bar) jumpToWeek(bar.dataset.jumpWeek);
  });

  filtersHost.addEventListener("click", function (event) {
    var button = event.target.closest("[data-habit-filter]");
    if (!button) return;
    filter = button.dataset.habitFilter;
    renderFilters();
    renderTable();
  });

  sortField.addEventListener("change", function () {
    sortMode = sortField.value;
    renderTable();
  });

  searchField.addEventListener("input", function () {
    query = searchField.value;
    syncSearchClear();
    renderSearch();
  });

  searchField.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && query) {
      query = "";
      searchField.value = "";
      syncSearchClear();
      renderTable();
    }
  });

  searchClear.addEventListener("click", function () {
    query = "";
    searchField.value = "";
    syncSearchClear();
    renderTable();
    searchField.focus();
  });

  targetField.addEventListener("change", updateTargetNote);

  document.getElementById("habit-starters").addEventListener("click", function (event) {
    var starter = event.target.closest("[data-habit-starter]");
    if (!starter) return;
    nameField.value = starter.dataset.habitStarter;
    targetField.value = starter.dataset.target;
    updateTargetNote();
    nameField.focus();
  });

  document.querySelectorAll("[data-habit-close]").forEach(function (button) {
    button.addEventListener("click", closeDialog);
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeDialog();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = nameField.value.trim();
    var target = Math.min(7, Math.max(1, Number(targetField.value) || 7));
    if (!name) {
      Z.toast("Give the habit a name.", "error");
      nameField.focus();
      return;
    }
    var editingId = idField.value;
    if (editingId) {
      var habit = findHabit(editingId);
      if (!habit) return;
      habit.name = name;
      habit.target = target;
    } else {
      habits.push({
        id: Z.uid("habit"),
        name: name,
        target: target,
        createdAt: today,
        checks: {}
      });
    }
    save();
    closeDialog();
    renderAll();
    Z.toast(editingId ? "Habit updated." : "Habit added.");
  });

  form.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    var target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
    event.preventDefault();
    searchField.focus();
  });

  sortField.value = sortMode;
  updateTargetNote();
  syncSearchClear();
  renderAll();
})();
