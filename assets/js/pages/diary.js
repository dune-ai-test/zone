/* Zone — diary */

(function () {
  "use strict";

  var esc = Z.esc;
  var MOODS = ["low", "flat", "good", "bright", "peak"];
  var MOOD_LABEL = { low: "Low", flat: "Flat", good: "Good", bright: "Bright", peak: "Peak" };
  var MOOD_COLOR = { low: "#9a6755", flat: "#8b8b80", good: "#6b8468", bright: "#c09a49", peak: "#d8431c" };
  var MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var PROMPTS = [
    "What did you notice today that you would otherwise forget?",
    "Who did you spend time with, and what stayed with you?",
    "What was the smallest good thing about today?",
    "What did today ask of you?",
    "Write the day as one scene. Where are you standing?",
    "What would you tell a friend about today?",
    "What are you carrying into tomorrow?",
    "Which ordinary detail deserves to be remembered?"
  ];

  var $ = function (id) { return document.getElementById(id); };
  var form = $("diary-form");
  var idField = $("entry-id");
  var dateField = $("entry-date");
  var moodField = $("entry-mood");
  var titleField = $("entry-title");
  var bodyField = $("entry-body");
  var tagsField = $("entry-tags");
  var saveButton = $("save-entry");
  var cancelButton = $("cancel-edit");
  var modeLabel = $("composer-mode");
  var wordCount = $("word-count");
  var readingTime = $("reading-time");
  var listHost = $("entries");
  var searchField = $("diary-search");
  var searchClear = $("diary-search-clear");
  var searchBox = searchField.closest(".dy-search");
  var moodFilter = $("diary-mood-filter");
  var sortField = $("diary-sort");
  var countLabel = $("diary-count");
  var journalTitle = $("diary-journal-title");
  var filterNote = $("diary-filter-note");
  var statsHost = $("diary-stats");
  var todayHost = $("diary-today");
  var heroMeta = $("diary-hero-meta");
  var calendarHost = $("diary-calendar");
  var calendarClear = $("diary-calendar-clear");
  var fortnightRange = $("fortnight-range");
  var fortnightMeta = $("fortnight-meta");
  var promptText = $("diary-prompt-text");

  var entries = normalizeEntries(Z.store.get("diary", []));
  var activeMood = "all";
  var activeDate = "";
  var expanded = {};
  var promptIndex = 0;

  dateField.max = Z.todayISO();

  function moodOf(value) {
    return MOODS.indexOf(value) !== -1 ? value : "good";
  }

  function plural(number, one, many) {
    return number + " " + (number === 1 ? one : many);
  }

  function wordsIn(text) {
    var trimmed = String(text || "").trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function readingMinutes(text) {
    var count = wordsIn(text);
    return count ? Math.max(1, Math.ceil(count / 200)) : 0;
  }

  function readLabel(text) {
    var minutes = readingMinutes(text);
    return minutes ? plural(minutes, "min read", "min read") : "—";
  }

  function validDate(value) {
    var text = String(value || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
    return Z.toISO(Z.parseISO(text)) === text ? text : "";
  }

  function cleanTags(value) {
    var source = Array.isArray(value) ? value : [];
    var seen = {};
    var tags = [];
    source.forEach(function (tag) {
      var clean = String(tag || "").trim().replace(/^#+/, "").replace(/\s+/g, " ");
      var key = clean.toLowerCase();
      if (!clean || seen[key] || tags.length >= 8) return;
      seen[key] = true;
      tags.push(clean);
    });
    return tags;
  }

  function parseTags(value) {
    return cleanTags(String(value || "").split(","));
  }

  function normalizeEntries(raw) {
    if (!Array.isArray(raw)) return [];
    var seen = {};
    return raw.filter(function (entry) {
      return entry && typeof entry === "object";
    }).map(function (entry) {
      var id = entry.id == null ? "" : String(entry.id);
      if (!id || seen[id]) id = Z.uid("diary");
      seen[id] = true;
      return {
        id: id,
        date: validDate(entry.date) || Z.todayISO(),
        mood: moodOf(entry.mood),
        title: String(entry.title == null ? "" : entry.title).trim(),
        body: String(entry.body == null ? "" : entry.body),
        tags: cleanTags(entry.tags)
      };
    });
  }

  function findEntry(id) {
    return entries.filter(function (entry) { return entry.id === id; })[0];
  }

  function uniqueDays() {
    var seen = {};
    entries.forEach(function (entry) { seen[entry.date] = true; });
    return Object.keys(seen).sort();
  }

  function currentStreak() {
    var days = {};
    uniqueDays().forEach(function (day) { days[day] = true; });
    var cursor = Z.todayISO();
    if (!days[cursor]) cursor = Z.addDays(cursor, -1);
    var count = 0;
    while (days[cursor]) {
      count += 1;
      cursor = Z.addDays(cursor, -1);
    }
    return count;
  }

  function bestStreak() {
    var days = uniqueDays();
    if (!days.length) return 0;
    var best = 1;
    var run = 1;
    for (var i = 1; i < days.length; i += 1) {
      if (Z.daysBetween(days[i - 1], days[i]) === 1) {
        run += 1;
      } else {
        run = 1;
      }
      if (run > best) best = run;
    }
    return best;
  }

  function topTag() {
    var counts = {};
    entries.forEach(function (entry) {
      entry.tags.forEach(function (tag) {
        var key = tag.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    var keys = Object.keys(counts).sort(function (a, b) {
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return a.localeCompare(b);
    });
    return keys.length ? { name: keys[0], count: counts[keys[0]] } : null;
  }

  function topMood() {
    var counts = {};
    entries.forEach(function (entry) {
      var mood = moodOf(entry.mood);
      counts[mood] = (counts[mood] || 0) + 1;
    });
    var keys = MOODS.slice().sort(function (a, b) {
      if ((counts[b] || 0) !== (counts[a] || 0)) return (counts[b] || 0) - (counts[a] || 0);
      return MOODS.indexOf(a) - MOODS.indexOf(b);
    });
    return keys.length && counts[keys[0]] ? { mood: keys[0], count: counts[keys[0]] } : null;
  }

  function byDateMap() {
    var map = {};
    entries.forEach(function (entry) { map[entry.date] = entry; });
    return map;
  }

  function setHeroMeta() {
    if (!heroMeta) return;
    var sorted = entries.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var latest = sorted[0];
    var tag = topTag();
    var parts = [
      '<span class="dy-meta-item"><span class="dy-local-dot" aria-hidden="true"></span>Local journal</span>',
      '<span class="dy-meta-item">' + plural(entries.length, "page", "pages") + " kept</span>"
    ];
    if (latest) {
      parts.push('<span class="dy-meta-item">' + (latest.date === Z.todayISO() ? "Written today" : "Last page " + esc(Z.relDate(latest.date))) + "</span>");
    } else {
      parts.push('<span class="dy-meta-item">The first page is blank</span>');
    }
    if (tag) {
      parts.push('<span class="dy-meta-item">Thread <strong>#' + esc(tag.name) + "</strong></span>");
    }
    heroMeta.innerHTML = parts.join("");
  }

  function renderStats() {
    if (!statsHost) return;
    var today = Z.todayISO();
    var monthKey = Z.monthKey(today);
    var monthCount = entries.filter(function (entry) { return Z.monthKey(entry.date) === monthKey; }).length;
    var totalWords = entries.reduce(function (sum, entry) { return sum + wordsIn(entry.body); }, 0);
    var averageWords = entries.length ? Math.round(totalWords / entries.length) : 0;
    var mood = topMood();
    var byDate = byDateMap();
    var week = [];
    for (var i = 6; i >= 0; i -= 1) {
      var day = Z.addDays(today, -i);
      var entry = byDate[day];
      week.push('<span class="dy-stat-day' + (entry ? " has" : "") + '"' +
        (entry ? ' style="--mood:' + MOOD_COLOR[moodOf(entry.mood)] + '"' : "") + "></span>");
    }

    statsHost.innerHTML = [
      '<article class="dy-stat dy-stat-pages">' +
        '<div class="dy-stat-head"><span>Pages filled</span><span class="dy-stat-index">01</span></div>' +
        '<p class="dy-stat-value">' + entries.length + "</p>" +
        '<p class="dy-stat-foot">' + plural(monthCount, "page", "pages") + " this month</p>" +
      "</article>",
      '<article class="dy-stat dy-stat-streak">' +
        '<div class="dy-stat-head"><span>Current streak</span><span class="dy-stat-index">02</span></div>' +
        '<p class="dy-stat-value">' + currentStreak() + '<span class="unit"> days</span></p>' +
        '<p class="dy-stat-foot">Longest run, ' + plural(bestStreak(), "day", "days") + "</p>" +
        '<div class="dy-stat-days" role="img" aria-label="' + week.filter(function (dot) { return dot.indexOf(" has") !== -1; }).length + ' of the last seven days written">' + week.join("") + "</div>" +
      "</article>",
      '<article class="dy-stat dy-stat-words">' +
        '<div class="dy-stat-head"><span>Words kept</span><span class="dy-stat-index">03</span></div>' +
        '<p class="dy-stat-value">' + Z.num(totalWords) + "</p>" +
        '<p class="dy-stat-foot">' + (entries.length ? Z.num(averageWords) + " words on average" : "Nothing written yet") + "</p>" +
      "</article>",
      '<article class="dy-stat dy-stat-mood">' +
        '<div class="dy-stat-head"><span>Dominant weather</span><span class="dy-stat-index">04</span></div>' +
        '<p class="dy-stat-value dy-stat-value-mood">' +
          (mood ? '<span class="dy-mood-dot" style="--mood:' + MOOD_COLOR[mood.mood] + '"></span>' + esc(MOOD_LABEL[mood.mood]) : "—") +
        "</p>" +
        '<p class="dy-stat-foot">' + (mood ? plural(mood.count, "entry", "entries") + " in that weather" : "Write a page to see this") + "</p>" +
      "</article>"
    ].join("");
  }

  function renderToday() {
    if (!todayHost) return;
    var today = Z.todayISO();
    var date = Z.parseISO(today);
    var todaysEntries = entries.filter(function (entry) { return entry.date === today; });
    var entry = todaysEntries[todaysEntries.length - 1];
    var dateBlock = '<div class="dy-today-date"><span class="dy-today-day">' + date.getDate() + "</span>" +
      '<span class="dy-today-month">' + MONTHS_LONG[date.getMonth()] + "<br>" + WEEKDAYS_LONG[date.getDay()] + "</span></div>";

    todayHost.classList.toggle("is-written", Boolean(entry));

    if (entry) {
      var mood = moodOf(entry.mood);
      var words = wordsIn(entry.body);
      todayHost.innerHTML =
        '<div class="dy-today-top"><span class="dy-today-kicker">' + (todaysEntries.length > 1 ? plural(todaysEntries.length, "page", "pages") + " today" : "Today&rsquo;s page") + "</span>" +
          '<span class="dy-today-weather"><span class="dy-mood-dot" style="--mood:' + MOOD_COLOR[mood] + '"></span>' + esc(MOOD_LABEL[mood]) + "</span></div>" +
        dateBlock +
        '<h2 class="dy-today-title">' + esc(entry.title || "Untitled entry") + "</h2>" +
        '<p class="dy-today-excerpt">' + esc(entry.body.trim() || "A page with no words yet.") + "</p>" +
        '<div class="dy-today-foot"><span>' + plural(words, "word", "words") + " · " + esc(readLabel(entry.body)) + "</span>" +
          '<button type="button" class="dy-today-cta" data-today-edit="' + esc(entry.id) + '">Continue writing ' + Z.icon("arrowRight") + "</button></div>";
      return;
    }

    todayHost.innerHTML =
      '<div class="dy-today-top"><span class="dy-today-kicker">Today&rsquo;s page</span><span class="dy-today-weather is-empty">Unwritten</span></div>' +
      dateBlock +
      '<p class="dy-today-empty-title">An unwritten day.</p>' +
      '<p class="dy-today-empty-copy">A few honest lines are enough. Start with where you were and what you noticed.</p>' +
      '<div class="dy-today-foot"><span>' + esc(WEEKDAYS_LONG[date.getDay()]) + " · " + esc(Z.dateMedium(today)) + "</span>" +
        '<button type="button" class="dy-today-cta" data-today-write>Begin the page ' + Z.icon("arrowRight") + "</button></div>";
  }

  function renderMoodFilters() {
    if (!moodFilter) return;
    var counts = { all: entries.length };
    MOODS.forEach(function (mood) { counts[mood] = 0; });
    entries.forEach(function (entry) {
      var mood = moodOf(entry.mood);
      counts[mood] += 1;
    });

    var items = [{ value: "all", label: "All" }].concat(MOODS.map(function (mood) {
      return { value: mood, label: MOOD_LABEL[mood] };
    }));

    moodFilter.innerHTML = items.map(function (item) {
      var active = activeMood === item.value;
      return '<button type="button" class="dy-mood-tab' + (active ? " is-active" : "") + '" data-mood-filter="' + item.value + '" aria-pressed="' + active + '">' +
        (item.value === "all" ? "" : '<span class="dy-mood-dot" style="--mood:' + MOOD_COLOR[item.value] + '"></span>') +
        "<span>" + item.label + "</span><span class=\"dy-tab-count\">" + counts[item.value] + "</span></button>";
    }).join("");
  }

  function renderCalendar() {
    if (!calendarHost) return;
    var today = Z.todayISO();
    var start = Z.addDays(Z.startOfWeek(today), -28);
    var byDate = byDateMap();
    var cells = [];
    var written = 0;

    for (var i = 0; i < 35; i += 1) {
      var day = Z.addDays(start, i);
      var date = Z.parseISO(day);
      var entry = byDate[day];
      var future = day > today;
      var active = activeDate === day;
      var classes = "dy-cal";
      var label = Z.dateLong(day);

      if (entry) {
        written += 1;
        classes += " has";
      }
      if (day === today) classes += " is-today";
      if (active) classes += " is-active";
      if (future) classes += " is-future";
      if (future) {
        label += " — in the future";
      } else if (entry) {
        label += " — " + (entry.title || "diary entry") + ", " + MOOD_LABEL[moodOf(entry.mood)] + ". View this day.";
      } else {
        label += " — nothing written. Start an entry for this day.";
      }

      cells.push('<button type="button" class="' + classes + '" data-cal-day="' + esc(day) + '"' +
        (entry ? ' data-cal-entry="' + esc(entry.id) + '"' : "") +
        (future ? " disabled" : "") +
        ' aria-pressed="' + active + '" aria-label="' + esc(label) + '"' +
        (entry ? ' style="--day-tone:' + MOOD_COLOR[moodOf(entry.mood)] + '"' : "") + ">" +
        "<span>" + date.getDate() + "</span></button>");
    }

    calendarHost.innerHTML = cells.join("");
    var end = Z.addDays(start, 34);
    if (fortnightRange) fortnightRange.textContent = Z.dateShort(start) + " — " + Z.dateShort(end);
    if (fortnightMeta) fortnightMeta.textContent = plural(written, "page", "pages") + " written";
    if (calendarClear) calendarClear.hidden = !activeDate;
  }

  function filteredEntries() {
    var query = searchField.value.trim().toLowerCase();
    var sorted = entries.slice().sort(function (a, b) {
      var order = b.date.localeCompare(a.date);
      if (order !== 0) return sortField.value === "oldest" ? -order : order;
      return sortField.value === "oldest" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
    });
    return sorted.filter(function (entry) {
      if (activeMood !== "all" && moodOf(entry.mood) !== activeMood) return false;
      if (activeDate && entry.date !== activeDate) return false;
      if (!query) return true;
      var tags = entry.tags.join(" ");
      return (entry.title + " " + entry.body + " " + tags).toLowerCase().indexOf(query) !== -1;
    });
  }

  function syncSearchClear() {
    var hasValue = searchField.value.trim().length > 0;
    if (searchClear) searchClear.hidden = !hasValue;
    if (searchBox) searchBox.classList.toggle("has-value", hasValue);
  }

  function renderFilterNote() {
    if (!filterNote) return;
    var query = searchField.value.trim();
    var bits = [];
    if (query) bits.push("“" + esc(query) + "”");
    if (activeMood !== "all") bits.push(esc(MOOD_LABEL[activeMood]));
    if (activeDate) bits.push(esc(Z.dateMedium(activeDate)));

    if (!bits.length) {
      filterNote.hidden = true;
      filterNote.innerHTML = "";
      return;
    }

    filterNote.hidden = false;
    filterNote.innerHTML = '<span class="dy-filter-text">Filtered by <strong>' +
      bits.join("</strong> <span aria-hidden=\"true\">·</span> <strong>") +
      '</strong></span><button type="button" class="dy-filter-clear" data-clear-filters>Clear filters</button>';
  }

  function renderEntry(entry) {
    var mood = moodOf(entry.mood);
    var date = Z.parseISO(entry.date);
    var words = wordsIn(entry.body);
    var isLong = words > 45 || String(entry.body).length > 300;
    var isOpen = Boolean(expanded[entry.id]);
    var title = entry.title || "Untitled entry";
    var body = String(entry.body || "").trim();
    var tags = entry.tags.map(function (tag) {
      return '<button type="button" class="dy-tag" data-tag="' + esc(tag) + '">#' + esc(tag) + "</button>";
    }).join("");

    var titleHTML = isLong
      ? '<h3 class="dy-entry-title"><button type="button" class="dy-entry-title-btn" data-expand="' + esc(entry.id) + '" aria-expanded="' + isOpen + '">' + esc(title) + "</button></h3>"
      : '<h3 class="dy-entry-title">' + esc(title) + "</h3>";

    return '<article class="dy-entry' + (isOpen ? " is-expanded" : "") + '" data-id="' + esc(entry.id) + '">' +
      '<div class="dy-entry-date">' +
        '<span class="dy-entry-day">' + date.getDate() + "</span>" +
        '<span class="dy-entry-mon">' + MONTHS_SHORT[date.getMonth()] + "</span>" +
        '<span class="dy-entry-weekday">' + WEEKDAYS_SHORT[date.getDay()] + "</span>" +
        '<span class="dy-entry-mood" style="--mood:' + MOOD_COLOR[mood] + '" title="' + esc(MOOD_LABEL[mood]) + '"></span>' +
      "</div>" +
      '<div class="dy-entry-main">' +
        '<div class="dy-entry-top"><span class="dy-entry-rel">' + esc(Z.relDate(entry.date)) + ' <span aria-hidden="true">·</span> ' + esc(readLabel(entry.body)) + "</span>" +
          '<div class="dy-entry-actions">' +
            '<button type="button" class="icon-btn small" data-copy="' + esc(entry.id) + '" aria-label="Copy ' + esc(title) + '" title="Copy entry">' + Z.icon("copy") + "</button>" +
            '<button type="button" class="icon-btn small" data-edit="' + esc(entry.id) + '" aria-label="Edit ' + esc(title) + '" title="Edit entry">' + Z.icon("pencil") + "</button>" +
            '<button type="button" class="icon-btn small danger" data-delete="' + esc(entry.id) + '" aria-label="Delete ' + esc(title) + '" title="Delete entry">' + Z.icon("trash") + "</button>" +
          "</div>" +
        "</div>" +
        titleHTML +
        '<p class="dy-entry-body' + (isLong && !isOpen ? " is-clamped" : "") + '">' + (body ? esc(body) : '<span class="dy-entry-empty">No words on this page yet.</span>') + "</p>" +
        (isLong ? '<button type="button" class="dy-entry-more" data-expand="' + esc(entry.id) + '" aria-expanded="' + isOpen + '"><span data-expand-label>' + (isOpen ? "Show less" : "Read full entry") + "</span>" + Z.icon("chevronDown") + "</button>" : "") +
        '<div class="dy-entry-foot">' +
          '<span class="dy-entry-mood-label"><span class="dy-mood-dot" style="--mood:' + MOOD_COLOR[mood] + '"></span>' + esc(MOOD_LABEL[mood]) + "</span>" +
          (tags ? '<div class="dy-entry-tags">' + tags + "</div>" : "") +
          '<span class="dy-entry-words">' + plural(words, "word", "words") + "</span>" +
        "</div>" +
      "</div></article>";
  }

  function renderList() {
    syncSearchClear();
    var filtered = filteredEntries();
    var hasFilters = Boolean(searchField.value.trim()) || activeMood !== "all" || Boolean(activeDate);
    var query = searchField.value.trim();

    if (journalTitle) {
      if (query) journalTitle.textContent = "Search results";
      else if (activeDate) journalTitle.textContent = Z.dateMedium(activeDate);
      else if (activeMood !== "all") journalTitle.textContent = MOOD_LABEL[activeMood] + " entries";
      else journalTitle.textContent = "All entries";
    }

    if (countLabel) {
      countLabel.textContent = hasFilters
        ? filtered.length + " of " + plural(entries.length, "entry", "entries")
        : plural(filtered.length, "entry", "entries");
    }

    renderFilterNote();

    if (!entries.length) {
      listHost.innerHTML = '<div class="dy-empty">' +
        '<div class="dy-empty-mark">' + Z.icon("book") + "</div>" +
        '<p class="dy-kicker">The first page</p>' +
        "<h3>A blank page, for now.</h3>" +
        "<p>A line a day is enough. Start with where you were, what you noticed, and who was there.</p>" +
        '<button type="button" class="btn dy-empty-btn" data-empty-new>Write the first entry</button>' +
      "</div>";
      return;
    }

    if (!filtered.length) {
      var dateOnly = activeDate && !query && activeMood === "all";
      listHost.innerHTML = '<div class="dy-empty dy-empty-sm">' +
        '<div class="dy-empty-mark">' + Z.icon(dateOnly ? "calendar" : "search") + "</div>" +
        "<h3>" + (dateOnly ? "That page is still blank." : "No entries match.") + "</h3>" +
        "<p>" + (dateOnly ? "There is nothing written on " + esc(Z.dateMedium(activeDate)) + " yet." : "Try a different word, mood, or day, or clear the filters.") + "</p>" +
        (dateOnly
          ? '<button type="button" class="btn dy-empty-btn" data-write-day="' + esc(activeDate) + '">Write this day</button>'
          : '<button type="button" class="btn dy-empty-btn" data-clear-filters>Clear filters</button>') +
      "</div>";
      return;
    }

    var groups = [];
    var current = null;
    filtered.forEach(function (entry) {
      var key = Z.monthKey(entry.date);
      if (!current || current.key !== key) {
        current = { key: key, entries: [] };
        groups.push(current);
      }
      current.entries.push(entry);
    });

    listHost.innerHTML = groups.map(function (group) {
      return '<section class="dy-month" aria-label="' + esc(Z.monthLabel(group.key, true)) + '">' +
        '<header class="dy-month-head"><h3>' + esc(Z.monthLabel(group.key, true)) + "</h3>" +
        '<span class="dy-month-count">' + plural(group.entries.length, "entry", "entries") + "</span></header>" +
        '<div class="dy-month-list">' + group.entries.map(renderEntry).join("") + "</div></section>";
    }).join("");
  }

  function renderAll() {
    renderStats();
    setHeroMeta();
    renderToday();
    renderMoodFilters();
    renderCalendar();
    renderList();
  }

  function updateWordCount() {
    var count = wordsIn(bodyField.value);
    if (wordCount) wordCount.textContent = plural(count, "word", "words");
    if (readingTime) readingTime.textContent = readLabel(bodyField.value);
  }

  function setMood(mood) {
    var safe = moodOf(mood);
    moodField.value = safe;
    document.querySelectorAll(".dy-mood-option").forEach(function (button) {
      var on = button.dataset.mood === safe;
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", String(on));
    });
  }

  function focusDesk(field) {
    var desk = form.closest(".dy-desk");
    if (desk) {
      var rect = desk.getBoundingClientRect();
      if (rect.top < 62 || rect.bottom > window.innerHeight) {
        desk.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setTimeout(function () {
      (field || titleField).focus({ preventScroll: true });
    }, window.innerWidth < 1180 ? 260 : 20);
  }

  function resetForm(focus) {
    form.reset();
    idField.value = "";
    dateField.value = Z.todayISO();
    setMood("good");
    tagsField.value = "";
    saveButton.textContent = "Save entry";
    cancelButton.hidden = true;
    modeLabel.textContent = "New entry";
    form.classList.remove("is-editing");
    updateWordCount();
    if (focus) focusDesk(titleField);
  }

  function editEntry(id) {
    var entry = findEntry(id);
    if (!entry) return;
    idField.value = entry.id;
    dateField.value = entry.date;
    setMood(entry.mood);
    titleField.value = entry.title;
    bodyField.value = entry.body;
    tagsField.value = entry.tags.join(", ");
    saveButton.textContent = "Update entry";
    cancelButton.hidden = false;
    modeLabel.textContent = "Editing";
    form.classList.add("is-editing");
    updateWordCount();
    focusDesk(titleField);
  }

  function startForDate(day) {
    if (!validDate(day)) return;
    if (idField.value) {
      Z.toast("Finish or cancel the entry you are editing first.", "error");
      return;
    }
    var hasDraft = Boolean(titleField.value.trim() || bodyField.value.trim() || tagsField.value.trim());
    if (hasDraft) {
      dateField.value = day;
      focusDesk(titleField);
      Z.toast("Date set to " + Z.dateMedium(day) + ".");
      return;
    }
    resetForm(false);
    dateField.value = day;
    focusDesk(titleField);
  }

  function clearFilters() {
    searchField.value = "";
    activeMood = "all";
    activeDate = "";
    syncSearchClear();
    renderAll();
  }

  function toggleExpanded(id, card) {
    expanded[id] = !expanded[id];
    var open = expanded[id];
    var body = card.querySelector(".dy-entry-body");
    if (body) body.classList.toggle("is-clamped", !open);
    card.classList.toggle("is-expanded", open);
    card.querySelectorAll("[data-expand]").forEach(function (button) {
      button.setAttribute("aria-expanded", String(open));
    });
    var label = card.querySelector("[data-expand-label]");
    if (label) label.textContent = open ? "Show less" : "Read full entry";
  }

  function copyEntry(entry) {
    var text = (entry.title || "Untitled entry") + "\n" +
      Z.dateLong(entry.date) + " · " + MOOD_LABEL[moodOf(entry.mood)] + "\n\n" +
      entry.body.trim();
    if (entry.tags.length) {
      text += "\n\n" + entry.tags.map(function (tag) { return "#" + tag; }).join(" ");
    }
    Z.copy(text);
  }

  function exportJournal() {
    if (!entries.length) {
      Z.toast("There is nothing to export yet.", "error");
      return;
    }
    var rows = [["Date", "Mood", "Title", "Threads", "Words", "Entry"]];
    entries.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).forEach(function (entry) {
      rows.push([
        entry.date,
        MOOD_LABEL[moodOf(entry.mood)],
        entry.title || "Untitled entry",
        entry.tags.join(", "),
        wordsIn(entry.body),
        entry.body
      ]);
    });
    Z.download("zone-diary-" + Z.todayISO() + ".csv", Z.csv(rows), "text/csv;charset=utf-8");
    Z.toast("Journal exported.");
  }

  function changePrompt() {
    promptIndex = (promptIndex + 1) % PROMPTS.length;
    if (promptText) promptText.textContent = PROMPTS[promptIndex];
  }

  var renderSearchResults = Z.debounce(renderList, 120);

  document.querySelectorAll(".dy-mood-option").forEach(function (button) {
    button.addEventListener("click", function () { setMood(button.dataset.mood); });
  });

  bodyField.addEventListener("input", updateWordCount);

  $("new-entry").addEventListener("click", function () { resetForm(true); });
  cancelButton.addEventListener("click", function () { resetForm(false); });
  $("diary-export").addEventListener("click", exportJournal);
  $("diary-shuffle-prompt").addEventListener("click", changePrompt);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var date = dateField.value;
    var title = titleField.value.trim();
    var body = bodyField.value.trim();
    var tags = parseTags(tagsField.value);
    var editingId = idField.value;

    if (!validDate(date)) {
      Z.toast("Add a valid date for the entry.", "error");
      dateField.focus();
      return;
    }
    if (date > Z.todayISO()) {
      Z.toast("Choose today or an earlier day.", "error");
      dateField.focus();
      return;
    }
    if (!title) {
      Z.toast("Give the day a title.", "error");
      titleField.focus();
      return;
    }
    if (!body) {
      Z.toast("Write something — even a single line.", "error");
      bodyField.focus();
      return;
    }

    var savedEntry = {
      id: editingId || Z.uid("diary"),
      date: date,
      mood: moodOf(moodField.value),
      title: title,
      body: body,
      tags: tags
    };

    if (editingId) {
      entries = entries.map(function (entry) {
        return entry.id === editingId ? savedEntry : entry;
      });
    } else {
      entries = entries.concat([savedEntry]);
    }

    Z.store.set("diary", entries);

    if (activeDate && activeDate !== date) activeDate = "";
    if (activeMood !== "all" && activeMood !== savedEntry.mood) activeMood = "all";

    resetForm(false);
    renderAll();
    Z.toast(editingId ? "Entry updated." : "Entry saved.");
  });

  form.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  searchField.addEventListener("input", function () {
    syncSearchClear();
    renderSearchResults();
  });

  searchField.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && searchField.value) {
      searchField.value = "";
      syncSearchClear();
      renderList();
    }
  });

  if (searchClear) {
    searchClear.addEventListener("click", function () {
      searchField.value = "";
      syncSearchClear();
      renderList();
      searchField.focus();
    });
  }

  moodFilter.addEventListener("click", function (event) {
    var button = event.target.closest("[data-mood-filter]");
    if (!button) return;
    activeMood = button.dataset.moodFilter;
    renderMoodFilters();
    renderList();
  });

  sortField.addEventListener("change", renderList);

  filterNote.addEventListener("click", function (event) {
    if (event.target.closest("[data-clear-filters]")) clearFilters();
  });

  todayHost.addEventListener("click", function (event) {
    var editButton = event.target.closest("[data-today-edit]");
    if (editButton) {
      editEntry(editButton.dataset.todayEdit);
      return;
    }
    if (event.target.closest("[data-today-write]")) resetForm(true);
  });

  calendarHost.addEventListener("click", function (event) {
    var button = event.target.closest("[data-cal-day]");
    if (!button || button.disabled) return;
    var day = button.dataset.calDay;
    if (button.dataset.calEntry) {
      if (activeDate === day) {
        activeDate = "";
      } else {
        activeDate = day;
        activeMood = "all";
        searchField.value = "";
        syncSearchClear();
      }
      renderAll();
      if (activeDate && window.innerWidth < 1180) {
        document.querySelector(".dy-journal").scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    startForDate(day);
  });

  calendarClear.addEventListener("click", function () {
    activeDate = "";
    renderCalendar();
    renderList();
  });

  listHost.addEventListener("click", function (event) {
    var clear = event.target.closest("[data-clear-filters]");
    if (clear) {
      clearFilters();
      return;
    }
    if (event.target.closest("[data-empty-new]")) {
      resetForm(true);
      return;
    }
    var writeDay = event.target.closest("[data-write-day]");
    if (writeDay) {
      startForDate(writeDay.dataset.writeDay);
      return;
    }
    var tagButton = event.target.closest("[data-tag]");
    if (tagButton) {
      searchField.value = tagButton.dataset.tag;
      activeMood = "all";
      activeDate = "";
      syncSearchClear();
      renderAll();
      return;
    }
    var expandButton = event.target.closest("[data-expand]");
    if (expandButton) {
      var card = expandButton.closest(".dy-entry");
      if (card) toggleExpanded(card.dataset.id, card);
      return;
    }
    var copy = event.target.closest("[data-copy]");
    if (copy) {
      var copyTarget = findEntry(copy.dataset.copy);
      if (copyTarget) copyEntry(copyTarget);
      return;
    }
    var edit = event.target.closest("[data-edit]");
    if (edit) {
      editEntry(edit.dataset.edit);
      return;
    }
    var del = event.target.closest("[data-delete]");
    if (!del) return;
    var entry = findEntry(del.dataset.delete);
    if (!entry) return;
    Z.confirm({
      kicker: "Delete entry",
      title: "Let this page go?",
      message: "This removes <strong>" + esc(entry.title || "this entry") + "</strong> from the diary. There is no undo.",
      label: "Delete entry"
    }).then(function (ok) {
      if (!ok) return;
      entries = entries.filter(function (item) { return item.id !== entry.id; });
      delete expanded[entry.id];
      Z.store.set("diary", entries);
      if (idField.value === entry.id) resetForm(false);
      if (activeDate && !entries.some(function (item) { return item.date === activeDate; })) activeDate = "";
      renderAll();
      Z.toast("Entry deleted.");
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    var target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
    event.preventDefault();
    searchField.focus();
  });

  var todayNumber = Math.floor(Z.parseISO(Z.todayISO()).getTime() / 86400000);
  promptIndex = Math.abs(todayNumber) % PROMPTS.length;
  promptText.textContent = PROMPTS[promptIndex];

  resetForm(false);
  renderAll();
})();
