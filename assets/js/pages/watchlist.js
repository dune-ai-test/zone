/* Zone — watchlist */

(function () {
  "use strict";

  /*
   * Series carry an optional seasons array:
   *   seasons: [{ number: 1, episodes: 10, watched: 6 }, ...]
   * Flat watched/total stay in sync for older records, exports and quick stats.
   */

  var esc = Z.esc;
  var STATUSES = ["Queued", "Watching", "Watched", "Dropped"];
  var titles = Z.store.get("watchlist", []);
  if (!Array.isArray(titles)) titles = [];
  titles = titles.filter(function (item) { return item && typeof item === "object"; });
  titles.forEach(function (item) {
    if (item.id != null) item.id = String(item.id);
  });

  var filterStatus = "All";
  var filterType = "All";
  var filterGenre = "";
  var favoritesOnly = false;
  var pickId = "";
  var shelfCols = 0;

  var $ = function (id) { return document.getElementById(id); };
  var main = $("main");
  var statsHost = $("watch-stats");
  var pickHost = $("watch-tonight");
  var pickStatus = $("watch-pick-status");
  var nowHost = $("watch-now-list");
  var nowMeta = $("watch-now-meta");
  var listHost = $("watch-list");
  var countLabel = $("watch-count");
  var asideHost = $("watch-aside");
  var shelfLayout = $("watch-shelf-layout");
  var shelfSection = $("watch-shelf");
  var heroMeta = $("watch-hero-meta");
  var exportButton = $("export-shelf");
  var statusTabs = $("watch-filters");
  var typeTabs = $("watch-types");
  var genreHost = $("watch-genres");
  var genreWrap = $("watch-genre-wrap");
  var favoritesToggle = $("watch-favorites");
  var resetButton = $("watch-reset");
  var searchField = $("watch-search");
  var sortField = $("watch-sort");

  var dialog = $("watch-dialog");
  var detailDialog = $("watch-detail-dialog");
  var detailShell = $("watch-detail-shell");
  var detailId = "";
  var form = $("watch-form");
  var idField = $("watch-id");
  var titleField = $("watch-title");
  var typeField = $("watch-type");
  var yearField = $("watch-year");
  var genreField = $("watch-genre");
  var statusField = $("watch-status");
  var serviceField = $("watch-service");
  var ratingField = $("watch-rating");
  var favoriteField = $("watch-favorite");
  var noteField = $("watch-note");
  var seriesFields = $("watch-series-fields");
  var seasonList = $("watch-season-list");
  var seasonEmpty = $("watch-season-empty");
  var seasonSummary = $("watch-season-summary");
  var addSeasonButton = $("watch-add-season");
  var ratingQuick = $("watch-rating-stars");
  var progressBox = $("watch-dialog-progress");
  var progressLabel = $("watch-progress-label");
  var progressBar = $("watch-progress-bar");
  var dialogTitle = $("watch-dialog-title");
  var dialogKicker = $("watch-dialog-kicker");
  var saveButton = $("watch-save");
  var deleteButton = $("watch-delete");

  var STAR = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M8 5.4v13.2L19 12z"/></svg>';

  function safeStatus(value) {
    var raw = String(value == null ? "" : value).trim().toLowerCase();
    for (var i = 0; i < STATUSES.length; i += 1) {
      if (STATUSES[i].toLowerCase() === raw) return STATUSES[i];
    }
    return "Queued";
  }

  function typeOf(item) {
    var raw = String(item && item.type || "").trim().toLowerCase();
    return raw === "series" ? "Series" : "Film";
  }

  function yearOf(item) {
    var year = parseInt(item && item.year, 10);
    return isFinite(year) && year > 0 ? year : 0;
  }

  function seasonListOf(item) {
    if (!item || typeOf(item) !== "Series" || !Array.isArray(item.seasons)) return [];
    var seasons = [];
    item.seasons.forEach(function (season) {
      if (!season || typeof season !== "object") return;
      var episodes = parseInt(season.episodes, 10);
      if (!isFinite(episodes) || episodes <= 0) return;
      var watched = parseInt(season.watched, 10);
      if (!isFinite(watched) || watched < 0) watched = 0;
      if (watched > episodes) watched = episodes;
      seasons.push({ number: seasons.length + 1, episodes: episodes, watched: watched });
    });
    return seasons;
  }

  function seasonTotals(seasons) {
    var episodes = 0;
    var watched = 0;
    (seasons || []).forEach(function (season) {
      episodes += season.episodes;
      watched += season.watched;
    });
    return { episodes: episodes, watched: watched };
  }

  function nextSeasonEpisode(seasons) {
    for (var i = 0; i < seasons.length; i += 1) {
      if (seasons[i].watched < seasons[i].episodes) {
        return { season: seasons[i].number, episode: seasons[i].watched + 1, index: i };
      }
    }
    return null;
  }

  function episodeCode(season, episode) {
    return "S" + pad(season) + "E" + pad(episode);
  }

  function nextEpisodeOf(item) {
    var seasons = seasonListOf(item);
    return seasons.length ? nextSeasonEpisode(seasons) : null;
  }

  function applySeasonProgress(item, seasons) {
    var totals = seasonTotals(seasons);
    item.seasons = seasons;
    item.watched = totals.watched;
    item.total = totals.episodes;
    return item;
  }

  function watchedOf(item) {
    var seasons = seasonListOf(item);
    if (seasons.length) return seasonTotals(seasons).watched;
    var watched = parseInt(item && item.watched, 10);
    return isFinite(watched) && watched > 0 ? watched : 0;
  }

  function totalOf(item) {
    var seasons = seasonListOf(item);
    if (seasons.length) return seasonTotals(seasons).episodes;
    var total = parseInt(item && item.total, 10);
    return isFinite(total) && total > 0 ? total : 0;
  }

  function ratingOf(item) {
    var rating = Number(item && item.rating) || 0;
    return Math.max(0, Math.min(10, rating));
  }

  function genreOf(item) {
    return String(item && item.genre || "").trim();
  }

  function serviceOf(item) {
    return String(item && item.service || "").trim();
  }

  function favoriteOf(item) {
    return !!(item && (item.favorite === true || item.favorite === 1 || item.favorite === "true"));
  }

  function plural(number, one, many) {
    return number + " " + (number === 1 ? one : (many || one + "s"));
  }

  function pad(number) {
    return (number < 10 ? "0" : "") + number;
  }

  function progressPct(item) {
    var total = totalOf(item);
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((watchedOf(item) / total) * 100)));
  }

  function findTitle(id) {
    for (var i = 0; i < titles.length; i += 1) {
      if (titles[i].id === id) return titles[i];
    }
    return null;
  }

  function queueSorted() {
    return titles.filter(function (item) {
      return safeStatus(item.status) === "Queued";
    }).sort(function (a, b) {
      var addedA = String(a.added || "9999-12-31");
      var addedB = String(b.added || "9999-12-31");
      if (addedA !== addedB) return addedA < addedB ? -1 : 1;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function currentPick() {
    var pick = findTitle(pickId);
    if (pick && safeStatus(pick.status) === "Queued") return pick;
    return queueSorted()[0];
  }

  function waitingDays(item) {
    if (!item || !item.added) return 0;
    var days = Z.daysBetween(item.added, Z.todayISO());
    return days > 0 ? days : 0;
  }

  function waitingLabel(item) {
    var days = waitingDays(item);
    return days ? plural(days, "day") : "Today";
  }

  function addedLabel(item) {
    if (!item || !item.added) return "Added today";
    var label = Z.relDate(item.added);
    if (label === "Today" || label === "Yesterday") label = label.toLowerCase();
    return "Added " + label;
  }

  function genreCounts() {
    var map = {};
    titles.forEach(function (item) {
      var label = genreOf(item);
      if (!label) return;
      var key = label.toLowerCase();
      if (!map[key]) map[key] = { key: key, label: label, count: 0 };
      map[key].count += 1;
    });
    return Object.keys(map).map(function (key) {
      return map[key];
    }).sort(function (a, b) {
      return b.count - a.count || a.label.localeCompare(b.label);
    });
  }

  function statusMarkup(status) {
    var safe = safeStatus(status);
    return '<span class="wl-status is-' + safe.toLowerCase() + '">' + safe + "</span>";
  }

  function hasActiveFilters() {
    return filterStatus !== "All" || filterType !== "All" || filterGenre !== "" ||
      favoritesOnly || searchField.value.trim() !== "";
  }

  function updateResetButton() {
    resetButton.hidden = !hasActiveFilters();
  }

  function saveTitles() {
    Z.store.set("watchlist", titles);
  }

  function seasonRowsFromDom() {
    return Array.prototype.map.call(
      seasonList.querySelectorAll("[data-season-row]"),
      function (row) {
        return {
          episodes: row.querySelector("[data-season-episodes]").value,
          watched: row.querySelector("[data-season-watched]").value
        };
      }
    );
  }

  function integerFromInput(value) {
    var number = parseInt(value, 10);
    return isFinite(number) && number > 0 ? number : 0;
  }

  function seasonRowMarkup(season, index) {
    var episodes = season && season.episodes ? String(season.episodes) : "";
    var watched = season && season.watched ? String(season.watched) : "";
    return '<div class="wl-season-row" data-season-row data-season-index="' + index + '">' +
      '<span class="wl-season-badge"><span>Season</span><b>' + pad(index + 1) + "</b></span>" +
      '<label class="wl-season-field is-episodes"><span>Episodes</span>' +
        '<input class="input" type="number" min="1" step="1" inputmode="numeric" data-season-episodes value="' + esc(episodes) + '" placeholder="10" aria-label="Season ' + (index + 1) + ' episode count">' +
      "</label>" +
      '<label class="wl-season-field is-watched"><span>Watched</span>' +
        '<input class="input" type="number" min="0" step="1" inputmode="numeric" data-season-watched value="' + esc(watched) + '" placeholder="0" aria-label="Season ' + (index + 1) + ' episodes watched">' +
      "</label>" +
      '<span class="wl-season-next" data-season-next></span>' +
      '<button type="button" class="wl-season-remove" data-remove-season aria-label="Remove season ' + (index + 1) + '" title="Remove season">' + Z.icon("trash") + "</button>" +
      "</div>";
  }

  function renderSeasonRows(seasons) {
    var rows = seasons || [];
    seasonList.innerHTML = rows.map(seasonRowMarkup).join("");
    seasonEmpty.hidden = rows.length > 0;
    refreshSeasonRows();
  }

  function addSeasonRow(season) {
    var rows = seasonRowsFromDom();
    rows.push(season || { episodes: "", watched: "" });
    renderSeasonRows(rows);
    var inputs = seasonList.querySelectorAll("[data-season-episodes]");
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  function rowTotals(rows) {
    var episodes = 0;
    var watched = 0;
    rows.forEach(function (row) {
      var count = integerFromInput(row.episodes);
      var seen = integerFromInput(row.watched);
      episodes += count;
      watched += count ? Math.min(count, seen) : 0;
    });
    return { episodes: episodes, watched: watched };
  }

  function nextRowEpisode(rows) {
    for (var i = 0; i < rows.length; i += 1) {
      var episodes = integerFromInput(rows[i].episodes);
      var watched = integerFromInput(rows[i].watched);
      if (episodes > 0 && watched < episodes) {
        return { season: i + 1, episode: watched + 1 };
      }
    }
    return null;
  }

  function refreshSeasonRows() {
    var rows = seasonRowsFromDom();
    rows.forEach(function (row, index) {
      var rowNode = seasonList.querySelector('[data-season-index="' + index + '"]');
      if (!rowNode) return;
      var count = integerFromInput(row.episodes);
      var seen = integerFromInput(row.watched);
      var next = rowNode.querySelector("[data-season-next]");
      var watchedInput = rowNode.querySelector("[data-season-watched]");
      var invalid = (count <= 0 && seen > 0) || (count > 0 && seen > count);

      rowNode.classList.toggle("is-invalid", invalid);
      rowNode.classList.toggle("is-complete", count > 0 && seen >= count && !invalid);

      if (watchedInput) {
        if (count > 0) watchedInput.setAttribute("max", String(count));
        else watchedInput.removeAttribute("max");
        if (invalid) watchedInput.setAttribute("aria-invalid", "true");
        else watchedInput.removeAttribute("aria-invalid");
      }

      if (invalid) {
        next.textContent = count > 0 ? "Check watched count" : "Set episode count";
      } else if (!count) {
        next.textContent = "No episode count";
      } else if (seen >= count) {
        next.textContent = "Season complete";
      } else {
        next.textContent = "Next " + episodeCode(index + 1, seen + 1);
      }
    });

    var totals = rowTotals(rows);
    var seasonCount = rows.length;
    seasonEmpty.hidden = seasonCount > 0;
    seasonSummary.hidden = seasonCount === 0;
    seasonSummary.innerHTML = seasonCount
      ? "<span><b>" + seasonCount + "</b> " + (seasonCount === 1 ? "season" : "seasons") + "</span>" +
        "<span><b>" + totals.episodes + "</b> " + (totals.episodes === 1 ? "episode" : "episodes") + "</span>" +
        "<span><b>" + totals.watched + "</b> watched</span>"
      : "";
    updateDialogProgress();
  }

  function updateDialogProgress() {
    var rows = seasonRowsFromDom();
    var totals = rowTotals(rows);
    var next = nextRowEpisode(rows);
    var pct = totals.episodes > 0
      ? Math.max(0, Math.min(100, Math.round((totals.watched / totals.episodes) * 100)))
      : 0;

    progressBar.style.width = pct + "%";
    if (totals.episodes > 0) {
      progressLabel.textContent = next
        ? episodeCode(next.season, next.episode) + " next · " + totals.watched + " of " + plural(totals.episodes, "episode")
        : "Complete · " + totals.watched + " of " + plural(totals.episodes, "episode");
    } else {
      progressLabel.textContent = "No episode count yet";
    }
    progressBox.classList.toggle("is-complete", totals.episodes > 0 && totals.watched >= totals.episodes);
  }

  function collectSeasons() {
    var rows = seasonRowsFromDom();
    var lastFilled = -1;
    rows.forEach(function (row, index) {
      if (integerFromInput(row.episodes) || integerFromInput(row.watched)) lastFilled = index;
    });

    for (var i = 0; i <= lastFilled; i += 1) {
      var count = integerFromInput(rows[i].episodes);
      var seen = integerFromInput(rows[i].watched);
      if (!count) {
        return { error: "Season " + (i + 1) + " needs an episode count.", row: i, field: "episodes" };
      }
      if (seen > count) {
        return { error: "Season " + (i + 1) + " has more watched episodes than its episode count.", row: i, field: "watched" };
      }
    }

    var seasons = [];
    for (var j = 0; j <= lastFilled; j += 1) {
      seasons.push({
        number: seasons.length + 1,
        episodes: integerFromInput(rows[j].episodes),
        watched: integerFromInput(rows[j].watched)
      });
    }
    return { seasons: seasons };
  }

  function syncSeriesFields() {
    var series = typeField.value === "Series";
    seriesFields.hidden = !series;
    progressBox.hidden = !series;
    if (!series) return;
    if (!seasonList.querySelector("[data-season-row]")) {
      renderSeasonRows([{ episodes: "", watched: "" }]);
    } else {
      refreshSeasonRows();
    }
  }

  function updateQuickStars() {
    var rating = Math.max(0, Math.min(10, parseFloat(ratingField.value) || 0));
    ratingQuick.querySelectorAll("[data-quick-rating]").forEach(function (button) {
      var amount = Number(button.getAttribute("data-quick-rating"));
      if (amount === 0) {
        button.hidden = rating <= 0;
        return;
      }
      button.classList.toggle("is-on", rating >= amount);
    });
  }

  function openDialog(item) {
    form.reset();
    idField.value = item ? item.id : "";
    dialogKicker.textContent = item ? "Edit the entry" : "Add to the shelf";
    dialogTitle.textContent = item ? "A familiar title" : "A new arrival";
    saveButton.textContent = item ? "Save changes" : "Add to shelf";
    deleteButton.hidden = !item;

    titleField.value = item ? item.title || "" : "";
    typeField.value = item ? typeOf(item) : "Film";
    yearField.value = item && yearOf(item) ? yearOf(item) : "";
    genreField.value = item ? genreOf(item) : "";
    statusField.value = item ? safeStatus(item.status) : "Queued";
    serviceField.value = item ? serviceOf(item) : "";
    ratingField.value = item && ratingOf(item) ? String(ratingOf(item)) : "";
    favoriteField.checked = item ? favoriteOf(item) : false;
    noteField.value = item ? item.note || "" : "";

    var initialSeasons = [];
    if (item && typeOf(item) === "Series") {
      initialSeasons = seasonListOf(item);
      if (!initialSeasons.length) {
        var legacyTotal = totalOf(item);
        var legacyWatched = watchedOf(item);
        if (legacyTotal > 0) {
          initialSeasons = [{ episodes: legacyTotal, watched: Math.min(legacyWatched, legacyTotal) }];
        } else if (legacyWatched > 0) {
          initialSeasons = [{ episodes: "", watched: legacyWatched }];
        }
      }
    }
    renderSeasonRows(initialSeasons);

    syncSeriesFields();
    updateQuickStars();

    if (!dialog.open) dialog.showModal();
    setTimeout(function () { titleField.focus(); }, 40);
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  function renderHeroMeta() {
    var queued = titles.filter(function (item) { return safeStatus(item.status) === "Queued"; }).length;
    var watching = titles.filter(function (item) { return safeStatus(item.status) === "Watching"; }).length;
    var parts = [];

    if (!titles.length) {
      parts.push("<span>A quiet shelf</span>");
    } else {
      parts.push("<span><strong>" + titles.length + "</strong> " + (titles.length === 1 ? "title" : "titles") + "</span>");
      parts.push('<span class="wl-meta-dot" aria-hidden="true"></span>');
      parts.push("<span><strong>" + queued + "</strong> waiting</span>");
      parts.push('<span class="wl-meta-dot" aria-hidden="true"></span>');
      parts.push("<span><strong>" + watching + "</strong> in rotation</span>");
    }

    parts.push('<span class="wl-meta-dot" aria-hidden="true"></span>');
    parts.push("<span>Saved to your workspace</span>");
    heroMeta.innerHTML = parts.join("");
    exportButton.disabled = !titles.length;
  }

  function renderStats() {
    var queued = titles.filter(function (item) { return safeStatus(item.status) === "Queued"; });
    var watching = titles.filter(function (item) { return safeStatus(item.status) === "Watching"; });
    var watched = titles.filter(function (item) { return safeStatus(item.status) === "Watched"; });
    var rated = titles.filter(function (item) { return ratingOf(item) > 0; });
    var avg = rated.length
      ? rated.reduce(function (sum, item) { return sum + ratingOf(item); }, 0) / rated.length
      : 0;
    var next = queueSorted()[0];
    var totalTitles = titles.length;
    var finishedPct = totalTitles ? Math.round((watched.length / totalTitles) * 100) : 0;
    var episodesLeft = watching.reduce(function (sum, item) {
      if (typeOf(item) !== "Series") return sum;
      var total = totalOf(item);
      return sum + (total ? Math.max(0, total - watchedOf(item)) : 0);
    }, 0);

    var stats = [
      {
        label: "In the queue",
        value: String(queued.length),
        hint: next ? "Next: " + next.title : "Nothing waiting",
        icon: "clock",
        fill: totalTitles ? Math.round((queued.length / totalTitles) * 100) : 0,
        status: "Queued",
        aria: "Show " + plural(queued.length, "queued title")
      },
      {
        label: "In rotation",
        value: String(watching.length),
        hint: watching.length
          ? (episodesLeft ? plural(episodesLeft, "episode") + " left" : "Ready when you are")
          : "The screen is dark",
        icon: "film",
        fill: totalTitles ? Math.round((watching.length / totalTitles) * 100) : 0,
        status: "Watching",
        aria: "Show " + plural(watching.length, "title in rotation", "titles in rotation")
      },
      {
        label: "Finished",
        value: String(watched.length),
        hint: finishedPct + "% of the shelf",
        icon: "check",
        fill: finishedPct,
        status: "Watched",
        aria: "Show " + plural(watched.length, "finished title")
      },
      {
        label: "Average rating",
        value: avg ? avg.toFixed(1) : "—",
        unit: avg ? " / 10" : "",
        hint: rated.length ? rated.length + " of " + totalTitles + " rated" : "Nothing rated yet",
        icon: "star",
        fill: avg * 10,
        sort: "rating",
        aria: "Sort the shelf by rating. " +
          (rated.length ? "Average " + avg.toFixed(1) + " out of 10." : "Nothing rated yet.")
      }
    ];

    statsHost.innerHTML = stats.map(function (stat) {
      var data = stat.status
        ? ' data-stat-status="' + stat.status + '"'
        : ' data-stat-sort="' + stat.sort + '"';
      return '<button type="button" class="wl-stat"' + data +
        ' style="--wl-fill:' + Math.max(0, Math.min(100, stat.fill)) + '%" aria-label="' + esc(stat.aria) + '">' +
        '<span class="wl-stat-label">' + Z.icon(stat.icon) + esc(stat.label) + "</span>" +
        '<span class="wl-stat-value">' + stat.value + (stat.unit ? '<span class="wl-stat-unit">' + stat.unit + "</span>" : "") + "</span>" +
        '<span class="wl-stat-hint">' + esc(stat.hint) + "</span>" +
        '<span class="wl-stat-arrow" aria-hidden="true">' + Z.icon("arrowRight") + "</span>" +
        "</button>";
    }).join("");
  }

  function pickEmptyMarkup() {
    var hasTitles = titles.length > 0;
    var title = hasTitles ? "The queue is clear." : "Nothing to pick yet.";
    var copy = hasTitles
      ? "Nothing is waiting for a quiet night. Add something for later."
      : "Add the first title and it will wait here for a quiet night.";
    return '<div class="wl-pick is-empty">' +
      '<div class="wl-pick-head"><span class="wl-pick-kicker">Tonight\'s pick</span></div>' +
      '<div class="wl-pick-empty-body">' +
      '<span class="wl-pick-empty-icon">' + Z.icon(hasTitles ? "check" : "film") + "</span>" +
      '<h2 class="wl-pick-empty-title">' + title + "</h2>" +
      '<p class="wl-pick-empty-copy">' + copy + "</p>" +
      '<button type="button" class="wl-pick-primary" data-empty-add>' + Z.icon("plus") + " Add a title</button>" +
      '<p class="wl-pick-empty-foot">Saved to your workspace, not a third-party queue.</p>' +
      "</div>" +
      "</div>";
  }

  function renderPick() {
    if (pickStatus) pickStatus.textContent = "";
    var queued = queueSorted();
    if (!queued.length) {
      pickId = "";
      pickHost.innerHTML = pickEmptyMarkup();
      return;
    }

    var pick = null;
    var queueIndex = 0;
    for (var i = 0; i < queued.length; i += 1) {
      if (queued[i].id === pickId) {
        pick = queued[i];
        queueIndex = i;
        break;
      }
    }
    if (!pick) {
      pick = queued[0];
      queueIndex = 0;
      pickId = pick.id;
    }

    var type = typeOf(pick);
    var year = yearOf(pick);
    var genre = genreOf(pick);
    var service = serviceOf(pick);
    var days = waitingDays(pick);
    var note = String(pick.note || "").trim() || "No note. It made the cut anyway.";
    var metaParts = [];
    if (genre) metaParts.push(genre);
    metaParts.push(days ? "Waiting " + plural(days, "day") : "Added today");
    if (service) metaParts.push(service);

    pickHost.innerHTML = '<article class="wl-pick">' +
      '<div class="wl-pick-head">' +
      '<span class="wl-pick-kicker">Tonight\'s pick</span>' +
      '<button type="button" class="wl-pick-shuffle" data-pick-another>' + Z.icon("refresh") + " Shuffle</button>" +
      "</div>" +
      '<div class="wl-pick-poster wl-tone-' + Z.toneFor(pick.title) + '">' +
      '<span class="wl-pick-count">' + queued.length + " waiting</span>" +
      '<span class="wl-pick-mark" aria-hidden="true">' + esc(Z.initials(pick.title)) + "</span>" +
      '<div class="wl-pick-caption"><span>' + esc(type + (year ? " · " + year : "")) + "</span><span>" + esc(genre) + "</span></div>" +
      "</div>" +
      '<div class="wl-pick-body">' +
      '<h2 class="wl-pick-title">' + esc(pick.title) + "</h2>" +
      '<p class="wl-pick-meta">' + metaParts.map(esc).join(" · ") + "</p>" +
      '<p class="wl-pick-note">' + esc(note) + "</p>" +
      '<div class="wl-pick-actions">' +
      '<button type="button" class="wl-pick-primary" data-pick-start>' + PLAY + " Start watching</button>" +
      '<button type="button" class="wl-pick-detail" data-pick-detail aria-haspopup="dialog">Details' + Z.icon("arrowRight") + "</button>" +
      "</div>" +
      "</div>" +
      '<div class="wl-pick-foot"><span>A coin toss for the indecisive.</span><span>' + (queueIndex + 1) + " of " + queued.length + " in line</span></div>" +
      "</article>";
  }

  function episodeSegments(item) {
    var total = totalOf(item);
    var watched = watchedOf(item);
    if (!total || total > 14) {
      return '<div class="wl-progress"><span style="width:' + progressPct(item) + '%"></span></div>';
    }
    var html = "";
    for (var i = 0; i < total; i += 1) {
      html += '<i class="' + (i < watched ? "is-on" : "") + '"></i>';
    }
    return '<div class="wl-episodes" aria-hidden="true">' + html + "</div>";
  }

  function seasonStripMarkup(item) {
    var seasons = seasonListOf(item);
    if (!seasons.length) return "";
    var next = nextSeasonEpisode(seasons);
    return '<div class="wl-season-strip">' + seasons.map(function (season) {
      var complete = season.watched >= season.episodes;
      var current = !!next && next.season === season.number;
      return '<span class="wl-season-chip' + (complete ? " is-complete" : (current ? " is-current" : "")) +
        '" title="Season ' + season.number + ': ' + season.watched + " of " + season.episodes + ' episodes">' +
        "<b>S" + pad(season.number) + "</b><span>" + season.watched + "/" + season.episodes + "</span></span>";
    }).join("") + "</div>";
  }

  function nowCardMarkup(item) {
    var type = typeOf(item);
    var year = yearOf(item);
    var total = totalOf(item);
    var watched = watchedOf(item);
    var isSeries = type === "Series";
    var next = nextEpisodeOf(item);
    var canAdvance = isSeries && (total === 0 || watched < total);
    var genre = genreOf(item);
    var service = serviceOf(item);
    var note = String(item.note || "").trim();
    var meta = [genre, service].filter(Boolean).join(" · ");
    var progress = "";
    var nextText = "";
    var primaryIcon = Z.icon("plus");
    var primaryLabel = "Log episode";
    var primaryAction = "advance";

    if (isSeries) {
      if (total > 0) {
        progress = '<div class="wl-now-progress"><div class="wl-progress-label"><span>' +
          watched + " of " + plural(total, "episode") + "</span><span>" + progressPct(item) + "%</span></div>" +
          episodeSegments(item) + seasonStripMarkup(item) + "</div>";
        nextText = next
          ? "Next up · " + episodeCode(next.season, next.episode)
          : (watched < total ? "Next up · Episode " + (watched + 1) : "All episodes watched.");
      } else {
        nextText = watched ? plural(watched, "episode") + " logged." : "No episode count; log as you go.";
      }
      if (canAdvance) {
        primaryLabel = next
          ? "Log " + episodeCode(next.season, next.episode)
          : (total > 0 ? "Next episode" : "Log episode");
      } else {
        primaryLabel = "Mark finished";
        primaryIcon = Z.icon("check");
        primaryAction = "finish";
      }
    } else {
      nextText = "The film is in progress.";
      primaryLabel = "Mark finished";
      primaryIcon = Z.icon("check");
      primaryAction = "finish";
    }

    return '<article class="wl-now-card" data-id="' + esc(item.id) + '" data-detail="' + esc(item.id) + '">' +
      '<div class="wl-now-poster wl-tone-' + Z.toneFor(item.title) + '">' +
      '<span class="wl-now-flag">Now</span>' +
      '<span class="wl-now-mark" aria-hidden="true">' + esc(Z.initials(item.title)) + "</span>" +
      '<span class="wl-now-index">' + (isSeries && total ? watched + " / " + total : esc(type)) + "</span>" +
      "</div>" +
      '<div class="wl-now-body">' +
      '<div class="wl-now-eyebrow">' + statusMarkup("Watching") + "<span>" + esc(type + (year ? " · " + year : "")) + "</span></div>" +
      '<h3 class="wl-now-title"><button type="button" data-detail="' + esc(item.id) + '" aria-haspopup="dialog" aria-label="View details for ' + esc(item.title) + '">' + esc(item.title) + "</button></h3>" +
      (meta ? '<p class="wl-now-meta">' + esc(meta) + "</p>" : "") +
      (note ? '<p class="wl-now-note">' + esc(note) + "</p>" : "") +
      progress +
      '<div class="wl-now-foot">' +
      '<span class="wl-now-next">' + esc(nextText) + "</span>" +
      '<div class="wl-now-actions">' +
      '<button type="button" class="wl-now-primary" data-watch-action="' + primaryAction + '" data-id="' + esc(item.id) + '">' + primaryIcon + primaryLabel + "</button>" +
      (isSeries && canAdvance ? '<button type="button" class="wl-icon-action" data-watch-action="finish" data-id="' + esc(item.id) + '" aria-label="Mark ' + esc(item.title) + ' finished" title="Mark finished">' + Z.icon("check") + "</button>" : "") +
      '<button type="button" class="wl-icon-action" data-edit="' + esc(item.id) + '" aria-label="Edit ' + esc(item.title) + '" title="Edit">' + Z.icon("pencil") + "</button>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>";
  }

  function renderNow() {
    var watching = titles.filter(function (item) {
      return safeStatus(item.status) === "Watching";
    }).sort(function (a, b) {
      return String(a.added || "").localeCompare(String(b.added || ""));
    });

    var episodesLeft = watching.reduce(function (sum, item) {
      if (typeOf(item) !== "Series") return sum;
      var total = totalOf(item);
      return sum + (total ? Math.max(0, total - watchedOf(item)) : 0);
    }, 0);

    if (!watching.length) {
      var next = currentPick();
      nowMeta.textContent = "Nothing in rotation";
      nowHost.innerHTML = '<div class="wl-now-empty">' +
        '<span class="wl-now-empty-icon">' + PLAY + "</span>" +
        '<div class="wl-now-empty-copy"><h3>The screen is dark.</h3><p>' +
        (next
          ? "Start with <strong>" + esc(next.title) + "</strong> and it will show up here."
          : "Add something to the queue and it will show up here.") +
        "</p></div>" +
        (next
          ? '<button type="button" class="btn btn-sm" data-start-next>Start the pick</button>'
          : '<button type="button" class="btn btn-sm" data-empty-add>Add a title</button>') +
        "</div>";
      return;
    }

    nowMeta.textContent = watching.length + (watching.length === 1 ? " title" : " titles") +
      (episodesLeft ? " · " + plural(episodesLeft, "episode") + " left" : "");
    nowHost.innerHTML = watching.map(nowCardMarkup).join("");
  }

  function renderGenres() {
    var genres = genreCounts();
    if (filterGenre && !genres.some(function (genre) { return genre.key === filterGenre; })) {
      filterGenre = "";
    }
    if (!genres.length) {
      genreWrap.hidden = true;
      genreHost.innerHTML = "";
      return;
    }
    genreWrap.hidden = false;
    var html = '<button type="button" class="wl-genre' + (filterGenre ? "" : " is-active") + '" data-genre="" aria-pressed="' + (filterGenre ? "false" : "true") + '">All <span>' + titles.length + "</span></button>";
    genres.forEach(function (genre) {
      var active = filterGenre === genre.key;
      html += '<button type="button" class="wl-genre' + (active ? " is-active" : "") + '" data-genre="' + esc(genre.key) + '" aria-pressed="' + (active ? "true" : "false") + '">' +
        esc(genre.label) + " <span>" + genre.count + "</span></button>";
    });
    genreHost.innerHTML = html;
  }

  function updateFilterUI() {
    statusTabs.querySelectorAll("[data-status]").forEach(function (button) {
      var active = button.getAttribute("data-status") === filterStatus;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    typeTabs.querySelectorAll("[data-type]").forEach(function (button) {
      var active = button.getAttribute("data-type") === filterType;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    favoritesToggle.classList.toggle("is-active", favoritesOnly);
    favoritesToggle.setAttribute("aria-pressed", String(favoritesOnly));
    updateResetButton();
  }

  function renderFilters() {
    var counts = { All: titles.length, Queued: 0, Watching: 0, Watched: 0, Dropped: 0, Film: 0, Series: 0 };
    var favorites = 0;
    titles.forEach(function (item) {
      counts[safeStatus(item.status)] += 1;
      counts[typeOf(item)] += 1;
      if (favoriteOf(item)) favorites += 1;
    });

    statusTabs.querySelectorAll("[data-status]").forEach(function (button) {
      var label = button.querySelector("[data-status-count]");
      if (label) label.textContent = String(counts[button.getAttribute("data-status")] || 0);
    });
    typeTabs.querySelectorAll("[data-type]").forEach(function (button) {
      var label = button.querySelector("[data-type-count]");
      if (label) label.textContent = String(counts[button.getAttribute("data-type")] || 0);
    });
    var favCount = favoritesToggle.querySelector("[data-fav-count]");
    if (favCount) favCount.textContent = String(favorites);

    renderGenres();
    updateFilterUI();
  }

  function filteredTitles() {
    var query = searchField.value.trim().toLowerCase();
    var mode = sortField.value;
    var sorted = titles.slice();

    sorted.sort(function (a, b) {
      if (mode === "title") {
        return String(a.title || "").localeCompare(String(b.title || ""));
      }
      if (mode === "year") {
        var yearA = yearOf(a);
        var yearB = yearOf(b);
        if (yearA !== yearB) return yearB - yearA;
      }
      if (mode === "rating") {
        var ratingA = ratingOf(a);
        var ratingB = ratingOf(b);
        if (ratingA !== ratingB) return ratingB - ratingA;
      }
      if (mode === "added" || mode === "year" || mode === "rating") {
        var addedA = String(a.added || "");
        var addedB = String(b.added || "");
        if (addedA !== addedB) return addedB < addedA ? -1 : 1;
      }
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    return sorted.filter(function (item) {
      if (filterStatus !== "All" && safeStatus(item.status) !== filterStatus) return false;
      if (filterType !== "All" && typeOf(item) !== filterType) return false;
      if (filterGenre && genreOf(item).toLowerCase() !== filterGenre) return false;
      if (favoritesOnly && !favoriteOf(item)) return false;
      if (!query) return true;
      var haystack = [item.title, item.genre, item.note, item.service, item.type, item.year].join(" ").toLowerCase();
      return haystack.indexOf(query) !== -1;
    });
  }

  function caseProgress(item, status) {
    var total = totalOf(item);
    var watched = watchedOf(item);
    var seasons = seasonListOf(item);
    var next = nextSeasonEpisode(seasons);
    var left = watched + " / " + total;
    var right = progressPct(item) + "%";
    var title = watched + " of " + plural(total, "episode") + " watched";

    if (seasons.length) {
      if (safeStatus(status) === "Watched" || !next) left = "Complete";
      else if (safeStatus(status) === "Queued" && watched === 0) left = "Not started";
      else left = "Next " + episodeCode(next.season, next.episode);
      right = watched + " / " + total;
      title = next ? "Next " + episodeCode(next.season, next.episode) : "All episodes watched";
    }

    return '<div class="wl-case-progress is-' + safeStatus(status).toLowerCase() + '">' +
      '<div class="wl-case-progress-label" title="' + esc(title) + '"><span>' + left + "</span><span>" + right + "</span></div>" +
      '<div class="wl-progress"><span style="width:' + progressPct(item) + '%"></span></div>' +
      "</div>";
  }

  function primaryAction(item) {
    var status = safeStatus(item.status);
    var isSeries = typeOf(item) === "Series";
    var total = totalOf(item);
    var watched = watchedOf(item);
    var next = nextEpisodeOf(item);

    if (status === "Queued") {
      return { action: "start", label: "Start", icon: PLAY };
    }
    if (status === "Watching") {
      if (isSeries && (total === 0 || watched < total)) {
        return {
          action: "advance",
          label: total > 0 ? "+1 episode" : "Log episode",
          icon: Z.icon("plus"),
          title: next ? "Log " + episodeCode(next.season, next.episode) : "Log next episode"
        };
      }
      return { action: "finish", label: "Finish", icon: Z.icon("check") };
    }
    if (status === "Watched") {
      return { action: "rewatch", label: "Watch again", icon: Z.icon("repeat") };
    }
    return { action: "requeue", label: "Requeue", icon: Z.icon("plus") };
  }

  function detailSeasonRows(item) {
    var seasons = seasonListOf(item);
    if (!seasons.length) return "";

    var next = nextSeasonEpisode(seasons);
    return '<div class="wl-detail-seasons">' + seasons.map(function (season) {
      var done = season.watched >= season.episodes;
      var current = !!next && next.season === season.number;
      var pct = season.episodes
        ? Math.max(0, Math.min(100, Math.round((season.watched / season.episodes) * 100)))
        : 0;
      var state = done
        ? "Done"
        : (current ? "Next " + episodeCode(season.number, season.watched + 1) : season.watched + " / " + season.episodes);
      return '<div class="wl-detail-season' + (done ? " is-complete" : (current ? " is-current" : "")) + '">' +
        '<span class="wl-detail-season-code">S' + pad(season.number) + "</span>" +
        '<span class="wl-detail-season-count">' + season.watched + " / " + season.episodes + "</span>" +
        '<span class="wl-detail-season-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
        '<span class="wl-detail-season-state">' + esc(state) + "</span>" +
        "</div>";
    }).join("") + "</div>";
  }

  function detailProgressMarkup(item) {
    if (typeOf(item) !== "Series") return "";

    var status = safeStatus(item.status);
    var total = totalOf(item);
    var watched = watchedOf(item);
    var pct = progressPct(item);
    var next = nextEpisodeOf(item);
    var summary = total
      ? watched + " of " + plural(total, "episode")
      : (watched ? plural(watched, "episode") + " logged" : "No episode count");
    var nextText;
    if (status === "Watched" && total > 0) {
      nextText = "All episodes watched";
    } else if (status === "Dropped" && next) {
      nextText = "Stopped at · " + episodeCode(next.season, next.episode);
    } else if (next) {
      nextText = "Next up · " + episodeCode(next.season, next.episode);
    } else {
      nextText = total && watched >= total ? "All episodes watched" : "Log episodes as you go";
    }

    return '<section class="wl-detail-progress">' +
      '<div class="wl-detail-progress-head">' +
      '<span class="wl-detail-label">Series progress</span>' +
      "<span>" + esc(summary) + "</span>" +
      "</div>" +
      (total
        ? '<div class="wl-detail-progress-track" aria-hidden="true"><span style="width:' + pct + '%"></span></div>' +
          '<div class="wl-detail-progress-next"><span>' + esc(nextText) + "</span><span>" + pct + "%</span></div>"
        : '<p class="wl-detail-progress-empty">' + esc(nextText) + "</p>") +
      detailSeasonRows(item) +
      "</section>";
  }

  function detailPillsMarkup(item) {
    var rating = ratingOf(item);
    var favorite = favoriteOf(item);
    var service = serviceOf(item);
    var pills = '<span class="wl-detail-pill is-rating' + (rating > 0 ? "" : " is-empty") + '">' +
      (rating > 0 ? STAR : Z.icon("star")) +
      "<span>" + (rating > 0 ? rating.toFixed(1) + " / 10" : "Unrated") + "</span></span>";

    if (favorite) {
      pills += '<span class="wl-detail-pill is-favorite">' + STAR + "<span>Favorite</span></span>";
    }
    if (service) {
      pills += '<span class="wl-detail-pill">' + Z.icon("play") + "<span>" + esc(service) + "</span></span>";
    }
    return pills;
  }

  function detailPrimaryLabel(item, action) {
    if (action.action === "start") return "Start watching";
    if (action.action === "advance") {
      var next = nextEpisodeOf(item);
      return next ? "Log " + episodeCode(next.season, next.episode) : "Log episode";
    }
    return action.label;
  }

  function renderDetail(item) {
    if (!item) return;

    detailId = item.id;
    var type = typeOf(item);
    var status = safeStatus(item.status);
    var year = yearOf(item);
    var genre = genreOf(item);
    var service = serviceOf(item);
    var favorite = favoriteOf(item);
    var note = String(item.note || "").trim();
    var meta = [type, year ? String(year) : "", genre].filter(Boolean).join(" · ");
    var action = primaryAction(item);
    var primaryLabel = detailPrimaryLabel(item, action);
    var canFinish = status === "Watching" && type === "Series" && action.action === "advance";
    var added = item.added ? Z.dateMedium(item.added) : "Today";

    var facts = '<div class="wl-detail-facts">' +
      '<div class="wl-detail-fact"><span>On the shelf</span><b>' + esc(added) + "</b></div>" +
      '<div class="wl-detail-fact"><span>Where to watch</span><b>' + esc(service || "Not set") + "</b></div>" +
      "</div>";
    var noteMarkup = note
      ? '<section class="wl-detail-note"><span class="wl-detail-label">A note to yourself</span><p>' + esc(note) + "</p></section>"
      : "";

    detailShell.innerHTML =
      '<button type="button" class="wl-detail-close" data-detail-close aria-label="Close details">' + Z.icon("close") + "</button>" +
      '<div class="wl-detail-layout">' +
        '<div class="wl-detail-poster wl-tone-' + Z.toneFor(item.title) + '">' +
          '<div class="wl-detail-cover-top"><span>' + esc(type) + "</span><span>" + esc(year || "Shelf") + "</span></div>" +
          '<span class="wl-detail-cover-mark" aria-hidden="true">' + esc(Z.initials(item.title)) + "</span>" +
          '<div class="wl-detail-cover-foot"><span>' + esc(genre || "Unfiled") + "</span><span>" + esc(service || "At home") + "</span></div>" +
        "</div>" +
        '<div class="wl-detail-main">' +
          '<header class="wl-detail-head">' +
            '<div class="wl-detail-eyebrow"><span class="wl-detail-kicker">Shelf entry</span>' + statusMarkup(status) + "</div>" +
            '<h2 class="wl-detail-title" id="watch-detail-title">' + esc(item.title) + "</h2>" +
            '<p class="wl-detail-meta">' + esc(meta) + "</p>" +
            '<div class="wl-detail-pills">' + detailPillsMarkup(item) + "</div>" +
          "</header>" +
          '<div class="wl-detail-body">' +
            detailProgressMarkup(item) +
            noteMarkup +
            facts +
          "</div>" +
        "</div>" +
      "</div>" +
      '<footer class="wl-detail-foot">' +
        '<div class="wl-detail-tools">' +
          '<button type="button" class="wl-detail-tool is-danger" data-detail-delete="' + esc(item.id) + '">' + Z.icon("trash") + "<span>Remove</span></button>" +
          '<button type="button" class="wl-detail-tool' + (favorite ? " is-on" : "") + '" data-detail-action="favorite" aria-pressed="' + (favorite ? "true" : "false") + '">' + STAR + "<span>" + (favorite ? "Unfavorite" : "Favorite") + "</span></button>" +
        "</div>" +
        '<div class="wl-detail-actions">' +
          '<button type="button" class="wl-detail-edit" data-detail-edit="' + esc(item.id) + '">' + Z.icon("pencil") + "<span>Edit entry</span></button>" +
          (canFinish ? '<button type="button" class="wl-detail-secondary" data-detail-action="finish">' + Z.icon("check") + "<span>Mark finished</span></button>" : "") +
          '<button type="button" class="wl-detail-primary" data-detail-action="' + action.action + '">' + action.icon + "<span>" + esc(primaryLabel) + "</span></button>" +
        "</div>" +
      "</footer>";
  }

  function openDetail(item) {
    if (!item) return;
    renderDetail(item);
    if (!detailDialog.open) detailDialog.showModal();
    setTimeout(function () {
      var close = detailShell.querySelector("[data-detail-close]");
      if (close) close.focus();
    }, 40);
  }

  function closeDetail() {
    if (detailDialog.open) detailDialog.close();
  }

  function editDetail(id) {
    var item = findTitle(id || detailId);
    closeDetail();
    if (item) openDialog(item);
  }

  function handleDetailClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;

    if (target.closest("[data-detail-close]")) {
      closeDetail();
      return;
    }

    var edit = target.closest("[data-detail-edit]");
    if (edit) {
      editDetail(edit.getAttribute("data-detail-edit"));
      return;
    }

    var remove = target.closest("[data-detail-delete]");
    if (remove) {
      var item = findTitle(remove.getAttribute("data-detail-delete") || detailId);
      closeDetail();
      if (item) removeTitle(item);
      return;
    }

    var actionButton = target.closest("[data-detail-action]");
    if (!actionButton) return;
    var entry = findTitle(detailId);
    if (!entry) {
      closeDetail();
      return;
    }

    var actionName = actionButton.getAttribute("data-detail-action");
    runAction(actionName, entry.id);
    var updated = findTitle(entry.id);
    if (!updated) {
      closeDetail();
      return;
    }
    if (detailDialog.open) {
      renderDetail(updated);
      var focusTarget = detailShell.querySelector('[data-detail-action="' + actionName + '"]') ||
        detailShell.querySelector(".wl-detail-primary");
      if (focusTarget) focusTarget.focus();
    }
  }

  function caseMarkup(item, index) {
    var status = safeStatus(item.status);
    var type = typeOf(item);
    var year = yearOf(item);
    var rating = ratingOf(item);
    var service = serviceOf(item);
    var note = String(item.note || "").trim();
    var favorite = favoriteOf(item);
    var action = primaryAction(item);
    var meta = [year ? String(year) : "", genreOf(item), service].filter(Boolean).join(" · ");
    var progress = type === "Series" && totalOf(item) > 0 ? caseProgress(item, status) : "";
    var favLabel = favorite ? "Remove " + item.title + " from favorites" : "Add " + item.title + " to favorites";
    var ratingLabel = rating > 0 ? "Edit rating for " + item.title : "Rate " + item.title;

    return '<article class="wl-case' + (favorite ? " is-favorite" : "") + (type === "Series" ? " is-series" : "") + '" data-id="' + esc(item.id) + '" data-detail="' + esc(item.id) + '">' +
      '<div class="wl-case-object wl-tone-' + Z.toneFor(item.title) + '">' +
      '<div class="wl-case-cover">' +
      '<div class="wl-case-top">' +
      '<span class="wl-case-index" title="' + esc(addedLabel(item)) + '" aria-hidden="true">' + pad(index + 1) + "</span>" +
      '<span class="wl-case-format">' + esc(type) + "</span>" +
      '<button type="button" class="wl-case-fav" data-watch-action="favorite" data-id="' + esc(item.id) + '" aria-pressed="' + (favorite ? "true" : "false") + '" aria-label="' + esc(favLabel) + '" title="' + (favorite ? "Unfavorite" : "Favorite") + '">' + STAR + "</button>" +
      "</div>" +
      '<div class="wl-case-art" aria-hidden="true">' + esc(Z.initials(item.title)) + "</div>" +
      '<div class="wl-case-copy">' +
      '<h3 class="wl-case-title"><button type="button" data-detail="' + esc(item.id) + '" aria-haspopup="dialog" aria-label="View details for ' + esc(item.title) + '" title="View details">' + esc(item.title) + "</button></h3>" +
      (meta ? '<p class="wl-case-meta" title="' + esc(meta) + '">' + esc(meta) + "</p>" : "") +
      (note ? '<p class="wl-case-note">' + esc(note) + "</p>" : "") +
      "</div>" +
      progress +
      '<div class="wl-case-foot">' +
      '<div class="wl-case-statusline">' + statusMarkup(status) +
      '<button type="button" class="wl-case-rating' + (rating > 0 ? "" : " is-empty") + '" data-edit="' + esc(item.id) + '" aria-label="' + esc(ratingLabel) + '" title="' + esc(ratingLabel) + '">' +
      (rating > 0 ? STAR : Z.icon("star")) + "<span>" + (rating > 0 ? rating.toFixed(1) : "Rate") + "</span></button>" +
      "</div>" +
      '<div class="wl-case-actions">' +
      '<button type="button" class="wl-case-quick" data-watch-action="' + action.action + '" data-id="' + esc(item.id) + '" title="' + esc(action.title || action.label) + '">' + action.icon + "<span>" + esc(action.label) + "</span></button>" +
      '<button type="button" class="wl-case-icon" data-edit="' + esc(item.id) + '" aria-label="Edit ' + esc(item.title) + '" title="Edit">' + Z.icon("pencil") + "</button>" +
      '<button type="button" class="wl-case-icon is-danger" data-delete="' + esc(item.id) + '" aria-label="Remove ' + esc(item.title) + '" title="Remove">' + Z.icon("trash") + "</button>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</article>";
  }

  function shelfColumnCount() {
    var width = listHost.clientWidth || 0;
    var style = window.getComputedStyle(listHost);
    var padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    var available = Math.max(0, width - padX);
    if (!available) available = Math.max(250, Math.min(760, window.innerWidth - 90));
    if (available < 250) return 1;
    if (available < 420) return 2;
    if (available < 600) return 3;
    if (available < 820) return 4;
    if (available < 1040) return 5;
    return 6;
  }

  function shelfMarkup(items) {
    var columns = shelfColumnCount();
    shelfCols = columns;
    var markup = "";
    for (var i = 0; i < items.length; i += columns) {
      var row = items.slice(i, i + columns);
      markup += '<div class="wl-shelf-run">' +
        '<div class="wl-shelf-cases" style="grid-template-columns:repeat(' + columns + ',minmax(0,1fr))">' +
        row.map(function (item, offset) { return caseMarkup(item, i + offset); }).join("") +
        "</div>" +
        '<div class="wl-shelf-plank" aria-hidden="true"></div>' +
        "</div>";
    }
    return markup;
  }

  function renderList() {
    var filtered = filteredTitles();
    var query = searchField.value.trim();
    var active = hasActiveFilters();

    if (!titles.length) {
      countLabel.textContent = "An empty shelf";
    } else if (!filtered.length) {
      countLabel.textContent = "No matches";
    } else if (active) {
      countLabel.textContent = filtered.length + " of " + titles.length + (titles.length === 1 ? " title" : " titles");
    } else {
      countLabel.textContent = titles.length + (titles.length === 1 ? " title" : " titles");
    }
    updateResetButton();
    listHost.classList.toggle("is-empty", !filtered.length);

    if (!titles.length) {
      listHost.innerHTML = '<div class="wl-empty">' +
        '<div class="wl-empty-mark">' + Z.icon("film") + "</div>" +
        "<h3>A shelf with room on it.</h3>" +
        "<p>Add the film everyone keeps mentioning, or the one you have been saving for a quiet night.</p>" +
        '<button type="button" class="btn" data-empty-add>Add the first title</button>' +
        "</div>";
      return;
    }

    if (!filtered.length) {
      listHost.innerHTML = '<div class="wl-empty wl-empty-sm">' +
        '<div class="wl-empty-mark">' + Z.icon("search") + "</div>" +
        "<h3>Nothing on this part of the shelf.</h3>" +
        "<p>" + (query ? "No matches for <strong>" + esc(query) + "</strong>." : "Try a different filter, or clear them all.") + "</p>" +
        '<button type="button" class="btn btn-sm" data-clear-filters>Clear filters</button>' +
        "</div>";
      return;
    }

    listHost.innerHTML = shelfMarkup(filtered);
  }

  function renderAside() {
    if (!titles.length) {
      asideHost.hidden = true;
      shelfLayout.classList.add("is-solo");
      return;
    }

    asideHost.hidden = false;
    shelfLayout.classList.remove("is-solo");

    var genres = genreCounts();
    var top = genres[0];
    var oldest = queueSorted()[0];
    var rated = titles.filter(function (item) { return ratingOf(item) > 0; });
    var best = rated.slice().sort(function (a, b) {
      return ratingOf(b) - ratingOf(a) || String(a.title || "").localeCompare(String(b.title || ""));
    })[0];
    var filmCount = titles.filter(function (item) { return typeOf(item) === "Film"; }).length;
    var seriesCount = titles.length - filmCount;
    var filmPct = Math.round((filmCount / titles.length) * 1000) / 10;
    var favoriteCount = titles.filter(favoriteOf).length;

    var titleCountLabel = titles.length === 1 ? "title" : "titles";
    var favoriteLabel = favoriteCount === 1 ? "favorite" : "favorites";

    var html = '<div class="wl-notes-head"><h3>Shelf notes</h3><span>' + titles.length + " " + titleCountLabel + "</span></div>" +
      '<div class="wl-notes-body">' +
      '<div class="wl-mix">' +
      '<div class="wl-mix-ring" style="--film-pct:' + filmPct + '%"><span class="wl-mix-center"><strong>' + titles.length + "</strong><small>" + titleCountLabel + "</small></span></div>" +
      '<div class="wl-mix-legend"><span><i class="wl-legend-dot is-film"></i>Films <b>' + filmCount + '</b></span><span><i class="wl-legend-dot is-series"></i>Series <b>' + seriesCount + "</b></span></div>" +
      "</div>" +
      '<div class="wl-notes-row">' +
      '<span class="wl-notes-label">Most collected</span>' +
      (top
        ? '<button type="button" class="wl-notes-link" data-genre-jump="' + esc(top.key) + '"><span>' + esc(top.label) + "</span><b>" + top.count + "</b></button>" +
          '<span class="wl-notes-bar" aria-hidden="true"><i style="width:' + Math.round((top.count / titles.length) * 100) + '%"></i></span>'
        : '<p class="wl-notes-empty">No genres yet.</p>') +
      "</div>" +
      '<div class="wl-notes-row">' +
      '<span class="wl-notes-label">Longest waiting</span>' +
      (oldest
        ? '<button type="button" class="wl-notes-link" data-detail="' + esc(oldest.id) + '"><span>' + esc(oldest.title) + "</span><b>" + waitingLabel(oldest) + "</b></button>"
        : '<p class="wl-notes-empty">Queue clear.</p>') +
      "</div>" +
      '<div class="wl-notes-row">' +
      '<span class="wl-notes-label">Best rated</span>' +
      (best
        ? '<button type="button" class="wl-notes-link" data-detail="' + esc(best.id) + '"><span>' + esc(best.title) + '</span><b class="wl-notes-score">' + STAR + ratingOf(best).toFixed(1) + "</b></button>"
        : '<p class="wl-notes-empty">Nothing rated yet.</p>') +
      "</div>" +
      "</div>" +
      '<div class="wl-notes-foot"><span><b>' + rated.length + "</b> rated</span><span><b>" + favoriteCount + "</b> " + favoriteLabel + "</span></div>";

    asideHost.innerHTML = html;
  }

  function renderAll() {
    renderHeroMeta();
    renderStats();
    renderPick();
    renderNow();
    renderFilters();
    renderAside();
    renderList();
  }

  function setStatusFilter(value) {
    filterStatus = STATUSES.indexOf(value) !== -1 ? value : "All";
    updateFilterUI();
    renderList();
  }

  function setTypeFilter(value) {
    filterType = value === "Film" || value === "Series" ? value : "All";
    updateFilterUI();
    renderList();
  }

  function setGenreFilter(key) {
    filterGenre = String(key || "");
    renderFilters();
    renderList();
  }

  function clearFilters() {
    filterStatus = "All";
    filterType = "All";
    filterGenre = "";
    favoritesOnly = false;
    searchField.value = "";
    renderFilters();
    renderList();
  }

  function showStatusShortcut(value) {
    filterStatus = STATUSES.indexOf(value) !== -1 ? value : "All";
    filterType = "All";
    filterGenre = "";
    favoritesOnly = false;
    searchField.value = "";
    renderFilters();
    renderList();
    scrollToShelf();
  }

  function sortByShortcut(value) {
    filterStatus = "All";
    filterType = "All";
    filterGenre = "";
    favoritesOnly = false;
    searchField.value = "";
    sortField.value = value;
    renderFilters();
    renderList();
    scrollToShelf();
  }

  function scrollToShelf() {
    if (!shelfSection || !shelfSection.scrollIntoView) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      shelfSection.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    } catch (error) {
      shelfSection.scrollIntoView();
    }
  }

  function toggleFavorite(item) {
    item.favorite = !favoriteOf(item);
    saveTitles();
    renderAll();
    Z.toast(item.favorite ? "Added to favorites: " + item.title : "Removed from favorites: " + item.title);
  }

  function startTitle(item) {
    item.status = "Watching";
    saveTitles();
    renderAll();
    Z.toast("Moved to rotation: " + item.title);
  }

  function advanceTitle(item) {
    if (typeOf(item) !== "Series") {
      finishTitle(item);
      return;
    }

    var seasons = seasonListOf(item);
    if (seasons.length) {
      var next = nextSeasonEpisode(seasons);
      item.status = "Watching";
      if (!next) {
        item.status = "Watched";
        applySeasonProgress(item, seasons);
        saveTitles();
        renderAll();
        Z.toast("Finished " + item.title + ".");
        return;
      }

      var code = episodeCode(next.season, next.episode);
      seasons[next.index].watched += 1;
      applySeasonProgress(item, seasons);
      if (!nextSeasonEpisode(seasons)) item.status = "Watched";
      saveTitles();
      renderAll();
      Z.toast(item.status === "Watched"
        ? "Finished " + item.title + " with " + code + "."
        : "Logged " + code + " for " + item.title + ".");
      return;
    }

    var total = totalOf(item);
    var watched = watchedOf(item);
    item.status = "Watching";

    if (total > 0 && watched >= total) {
      item.status = "Watched";
      item.watched = total;
      saveTitles();
      renderAll();
      Z.toast("Finished " + item.title + ".");
      return;
    }

    item.watched = watched + 1;
    if (total > 0 && item.watched >= total) {
      item.watched = total;
      item.status = "Watched";
      saveTitles();
      renderAll();
      Z.toast("Finished " + item.title + ".");
      return;
    }

    saveTitles();
    renderAll();
    Z.toast("Episode logged for " + item.title + ".");
  }

  function finishTitle(item) {
    item.status = "Watched";
    if (typeOf(item) === "Series") {
      var seasons = seasonListOf(item);
      if (seasons.length) {
        seasons.forEach(function (season) { season.watched = season.episodes; });
        applySeasonProgress(item, seasons);
      } else if (totalOf(item) > 0) {
        item.watched = totalOf(item);
      }
    }
    saveTitles();
    renderAll();
    Z.toast("Finished " + item.title + ".");
  }

  function requeueTitle(item) {
    item.status = "Queued";
    saveTitles();
    renderAll();
    Z.toast("Back in the queue: " + item.title);
  }

  function rewatchTitle(item) {
    item.status = "Watching";
    if (typeOf(item) === "Series") {
      var seasons = seasonListOf(item);
      if (seasons.length) {
        seasons.forEach(function (season) { season.watched = 0; });
        applySeasonProgress(item, seasons);
      } else {
        item.watched = 0;
      }
    }
    saveTitles();
    renderAll();
    Z.toast("Back in rotation: " + item.title);
  }

  function runAction(action, id) {
    var item = findTitle(id);
    if (!item) return;
    if (action === "favorite") toggleFavorite(item);
    else if (action === "start") startTitle(item);
    else if (action === "advance") advanceTitle(item);
    else if (action === "finish") finishTitle(item);
    else if (action === "requeue") requeueTitle(item);
    else if (action === "rewatch") rewatchTitle(item);
  }

  function shufflePick() {
    var queued = queueSorted();
    if (!queued.length) return;
    var others = queued.filter(function (item) { return item.id !== pickId; });
    if (!others.length) {
      Z.toast("Only one title in the queue.");
      return;
    }
    var next = others[Math.floor(Math.random() * others.length)];
    pickId = next.id;
    renderPick();
    renderNow();
    if (pickStatus) pickStatus.textContent = "Tonight's pick: " + next.title;
  }

  function startNext() {
    var next = currentPick();
    if (next) runAction("start", next.id);
    else openDialog(null);
  }

  function removeTitle(item, after) {
    Z.confirm({
      kicker: "Remove from shelf",
      title: "Take this one off?",
      message: "Remove <strong>" + esc(item.title) + "</strong> from your watchlist? This cannot be undone.",
      label: "Remove title"
    }).then(function (ok) {
      if (!ok) return;
      titles = titles.filter(function (entry) { return entry.id !== item.id; });
      if (pickId === item.id) pickId = "";
      saveTitles();
      renderAll();
      if (after) after();
      Z.toast("Removed from the shelf.");
    });
  }

  function exportShelf() {
    if (!titles.length) {
      Z.toast("There is nothing to export yet.");
      return;
    }
    var rows = [["Title", "Type", "Year", "Genre", "Status", "Rating", "Watched episodes", "Total episodes", "Season progress", "Where to watch", "Favorite", "Note", "Added"]];
    titles.slice().sort(function (a, b) {
      return String(b.added || "").localeCompare(String(a.added || ""));
    }).forEach(function (item) {
      var seasons = typeOf(item) === "Series" ? seasonListOf(item) : [];
      rows.push([
        item.title || "",
        typeOf(item),
        yearOf(item) || "",
        genreOf(item),
        safeStatus(item.status),
        ratingOf(item) ? ratingOf(item).toFixed(1) : "",
        typeOf(item) === "Series" ? watchedOf(item) : "",
        typeOf(item) === "Series" ? totalOf(item) : "",
        seasons.map(function (season) {
          return "S" + pad(season.number) + " " + season.watched + "/" + season.episodes;
        }).join("; "),
        serviceOf(item),
        favoriteOf(item) ? "Yes" : "No",
        item.note || "",
        item.added || ""
      ]);
    });
    var content = "\uFEFF" + Z.csv(rows);
    if (typeof Z.download === "function") {
      Z.download("zone-watchlist-" + Z.todayISO() + ".csv", content, "text/csv;charset=utf-8");
    }
    Z.toast("Watchlist exported.");
  }

  function handleMainClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;

    if (target.closest("#add-title") || target.closest("[data-empty-add]")) {
      event.preventDefault();
      openDialog(null);
      return;
    }
    if (target.closest("#export-shelf")) {
      exportShelf();
      return;
    }

    var statusButton = target.closest("#watch-filters [data-status]");
    if (statusButton) {
      setStatusFilter(statusButton.getAttribute("data-status"));
      return;
    }
    var typeButton = target.closest("#watch-types [data-type]");
    if (typeButton) {
      setTypeFilter(typeButton.getAttribute("data-type"));
      return;
    }
    if (target.closest("#watch-favorites")) {
      favoritesOnly = !favoritesOnly;
      updateFilterUI();
      renderList();
      return;
    }
    if (target.closest("#watch-reset") || target.closest("[data-clear-filters]")) {
      clearFilters();
      return;
    }

    var statStatus = target.closest("[data-stat-status]");
    if (statStatus) {
      showStatusShortcut(statStatus.getAttribute("data-stat-status"));
      return;
    }
    var statSort = target.closest("[data-stat-sort]");
    if (statSort) {
      sortByShortcut(statSort.getAttribute("data-stat-sort"));
      return;
    }

    var genreButton = target.closest("#watch-genres [data-genre]");
    if (genreButton) {
      setGenreFilter(genreButton.getAttribute("data-genre"));
      return;
    }
    var genreJump = target.closest("[data-genre-jump]");
    if (genreJump) {
      setGenreFilter(genreJump.getAttribute("data-genre-jump"));
      scrollToShelf();
      return;
    }

    if (target.closest("[data-pick-another]")) {
      shufflePick();
      return;
    }
    if (target.closest("[data-pick-start]")) {
      var pick = findTitle(pickId);
      if (pick) startTitle(pick);
      return;
    }
    if (target.closest("[data-pick-detail]")) {
      var pickToView = findTitle(pickId);
      if (pickToView) openDetail(pickToView);
      return;
    }
    if (target.closest("[data-start-next]")) {
      startNext();
      return;
    }

    var watchAction = target.closest("[data-watch-action]");
    if (watchAction) {
      runAction(watchAction.getAttribute("data-watch-action"), watchAction.getAttribute("data-id"));
      return;
    }
    var deleteButtonCard = target.closest("[data-delete]");
    if (deleteButtonCard) {
      var toRemove = findTitle(deleteButtonCard.getAttribute("data-delete"));
      if (toRemove) removeTitle(toRemove);
      return;
    }
    var editButton = target.closest("[data-edit]");
    if (editButton) {
      var toEdit = findTitle(editButton.getAttribute("data-edit"));
      if (toEdit) openDialog(toEdit);
      return;
    }
    var detailButton = target.closest("[data-detail]");
    if (detailButton) {
      var toView = findTitle(detailButton.getAttribute("data-detail"));
      if (toView) openDetail(toView);
      return;
    }
  }

  document.querySelectorAll("#watch-dialog [data-close-dialog]").forEach(function (button) {
    button.addEventListener("click", closeDialog);
  });

  detailShell.addEventListener("click", handleDetailClick);
  detailDialog.addEventListener("click", function (event) {
    if (event.target === detailDialog) closeDetail();
  });
  detailDialog.addEventListener("close", function () {
    detailId = "";
  });

  typeField.addEventListener("change", syncSeriesFields);
  ratingField.addEventListener("input", updateQuickStars);

  addSeasonButton.addEventListener("click", function () {
    addSeasonRow();
  });

  seasonList.addEventListener("input", function (event) {
    if (!event.target.closest("[data-season-episodes], [data-season-watched]")) return;
    refreshSeasonRows();
  });

  seasonList.addEventListener("click", function (event) {
    var button = event.target.closest("[data-remove-season]");
    if (!button) return;
    var row = button.closest("[data-season-row]");
    if (!row) return;
    var index = Number(row.getAttribute("data-season-index"));
    var rows = seasonRowsFromDom();
    rows.splice(index, 1);
    renderSeasonRows(rows);
    if (!rows.length) addSeasonButton.focus();
  });

  ratingQuick.addEventListener("click", function (event) {
    var button = event.target.closest("[data-quick-rating]");
    if (!button) return;
    var value = Number(button.getAttribute("data-quick-rating")) || 0;
    ratingField.value = value > 0 ? String(value) : "";
    updateQuickStars();
  });

  deleteButton.addEventListener("click", function () {
    var item = findTitle(idField.value);
    if (!item) return;
    removeTitle(item, closeDialog);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var title = titleField.value.trim();
    if (!title) {
      Z.toast("A title is required.", "error");
      titleField.focus();
      return;
    }

    var type = typeField.value === "Series" ? "Series" : "Film";
    var collected = type === "Series" ? collectSeasons() : { seasons: [] };
    if (collected.error) {
      Z.toast(collected.error, "error");
      var badRow = seasonList.querySelector('[data-season-index="' + collected.row + '"]');
      var badField = badRow && badRow.querySelector(
        collected.field === "watched" ? "[data-season-watched]" : "[data-season-episodes]"
      );
      if (badField) badField.focus();
      return;
    }

    var seasons = type === "Series" ? collected.seasons : [];
    var totals = seasonTotals(seasons);
    var total = totals.episodes;
    var watched = totals.watched;
    var status = safeStatus(statusField.value);

    if (type === "Series" && total > 0 && status === "Watched") {
      seasons = seasons.map(function (season) {
        return { number: season.number, episodes: season.episodes, watched: season.episodes };
      });
      watched = total;
    }
    if (type === "Series" && total > 0 && watched >= total && status !== "Dropped") {
      status = "Watched";
      watched = total;
    }

    var rating = parseFloat(ratingField.value);
    if (!isFinite(rating)) rating = 0;
    rating = Math.round(Math.max(0, Math.min(10, rating)) * 10) / 10;

    var year = parseInt(yearField.value, 10);
    if (!isFinite(year) || year < 1900 || year > 2100) year = "";

    var editingId = idField.value;
    var original = findTitle(editingId);
    if (editingId && !original) editingId = "";
    var item = {
      id: editingId || Z.uid("watch"),
      title: title,
      type: type,
      year: year,
      genre: genreField.value.trim(),
      status: status,
      rating: rating,
      watched: watched,
      total: total,
      service: serviceField.value.trim(),
      favorite: favoriteField.checked,
      note: noteField.value.trim(),
      added: original && original.added ? original.added : Z.todayISO()
    };
    if (type === "Series" && seasons.length) item.seasons = seasons;

    if (editingId) {
      titles = titles.map(function (entry) { return entry.id === editingId ? item : entry; });
      Z.toast("Saved: " + title);
    } else {
      titles.push(item);
      Z.toast("Added to the shelf: " + title);
    }

    saveTitles();
    closeDialog();
    renderAll();
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeDialog();
  });

  searchField.addEventListener("input", Z.debounce(renderList, 120));
  sortField.addEventListener("change", renderList);
  main.addEventListener("click", handleMainClick);
  window.addEventListener("resize", Z.debounce(function () {
    if (!listHost.querySelector(".wl-shelf-cases")) return;
    if (shelfColumnCount() !== shelfCols) renderList();
  }, 140));

  renderAll();
})();
