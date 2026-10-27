/* Zone — links */

(function () {
  "use strict";

  var esc = Z.esc;
  var links = Z.store.get("links", []);
  if (!Array.isArray(links)) links = [];

  var selectedTag = "all";
  var favoritesOnly = false;
  var viewMode = Z.store.get("linksView", "grid") === "list" ? "list" : "grid";
  var spotlightId = "";

  var $ = function (id) { return document.getElementById(id); };
  var grid = $("links-grid");
  var tagHost = $("link-tags");
  var searchField = $("link-search");
  var sortField = $("link-sort");
  var countLabel = $("link-count");
  var dialog = $("link-dialog");
  var form = $("link-form");
  var idField = $("link-id");
  var urlField = $("link-url");
  var nameField = $("link-name");
  var tagsField = $("link-tags-input");
  var tagOptions = $("link-tag-options");
  var tagClear = $("link-tag-clear");
  var tagEmpty = $("link-tag-empty");
  var noteField = $("link-note");
  var favoriteField = $("link-favorite");
  var dialogTitle = $("link-title");
  var dialogKicker = $("link-kicker");
  var saveButton = $("link-save");
  var favoritesToggle = $("link-favorites");
  var favoritesCount = $("link-fav-count");
  var viewHost = $("link-view");
  var spotlightHost = $("link-spotlight");
  var indexHost = $("link-index-list");
  var indexCount = $("link-index-count");
  var heroMeta = $("link-hero-meta");
  var statusLabel = $("link-status");
  var shuffleButton = $("link-shuffle");

  function favoriteOf(link) {
    return !!(link && (link.favorite === true || link.favorite === 1 || link.favorite === "true" || link.favorite === "1"));
  }

  function tagsOf(link) {
    if (!link || !Array.isArray(link.tags)) return [];
    return link.tags.map(function (tag) {
      return String(tag || "").trim();
    }).filter(function (tag) {
      return !!tag;
    });
  }

  function normalizeUrl(raw) {
    var text = String(raw || "").trim();
    if (!text) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = "https://" + text;
    try {
      var url = new URL(text);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.href;
    } catch (err) {
      return null;
    }
  }

  function linkUrl(link) {
    return normalizeUrl(link && link.url) || "#";
  }

  function domainOf(link) {
    try {
      return new URL(linkUrl(link)).hostname.replace(/^www\./, "");
    } catch (err) {
      return String((link && link.url) || "").replace(/^https?:\/\//, "").split("/")[0];
    }
  }

  function monogramFor(domain) {
    var letter = String(domain || "?").charAt(0).toUpperCase();
    return /[A-Z0-9]/.test(letter) ? letter : "?";
  }

  function toneFor(domain) {
    var text = String(domain || "");
    var sum = 0;
    for (var i = 0; i < text.length; i += 1) {
      sum = (sum * 31 + text.charCodeAt(i)) % 100000;
    }
    return sum % 6;
  }

  function pad(value) {
    var text = String(value);
    while (text.length < 2) text = "0" + text;
    return text;
  }

  function findLink(id) {
    return links.filter(function (link) { return link.id === id; })[0];
  }

  function sortedBySaved() {
    return links.slice().sort(function (a, b) {
      var byDate = String(b.saved || "").localeCompare(String(a.saved || ""));
      if (byDate) return byDate;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function tagCounts() {
    var counts = {};
    links.forEach(function (link) {
      tagsOf(link).forEach(function (tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }

  function sortedTagNames(counts) {
    var source = counts || tagCounts();
    return Object.keys(source).sort(function (a, b) {
      if (source[b] !== source[a]) return source[b] - source[a];
      return a.localeCompare(b);
    });
  }

  function parseTags(value) {
    return String(value || "").split(",").map(function (tag) {
      return tag.trim().replace(/^#/, "");
    }).filter(function (tag, i, all) {
      return tag && all.indexOf(tag) === i;
    });
  }

  function cloneLink(link) {
    var copy = {};
    Object.keys(link).forEach(function (key) {
      copy[key] = link[key];
    });
    return copy;
  }

  function announce(message) {
    if (!statusLabel) return;
    statusLabel.textContent = "";
    setTimeout(function () {
      statusLabel.textContent = message;
    }, 30);
  }

  function syncTagPicker() {
    if (!tagOptions) return;
    var selected = parseTags(tagsField.value);
    tagOptions.querySelectorAll("[data-picker-tag]").forEach(function (button) {
      var active = selected.indexOf(button.dataset.pickerTag) !== -1;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active", active);
    });
    if (tagClear) tagClear.hidden = !selected.length;
  }

  function renderTagPicker() {
    if (!tagOptions) return;
    var counts = tagCounts();
    var names = sortedTagNames(counts);
    tagOptions.hidden = !names.length;
    if (tagEmpty) tagEmpty.hidden = !!names.length;
    tagOptions.innerHTML = names.map(function (name) {
      return '<button type="button" class="tag-pick" data-picker-tag="' + esc(name) + '" aria-pressed="false">' +
        "<span>" + esc(name) + "</span><span class=\"tag-pick-count\">" + counts[name] + "</span></button>";
    }).join("");
    syncTagPicker();
  }

  function renderHeroMeta() {
    if (!heroMeta) return;
    if (!links.length) {
      heroMeta.textContent = "A D1-backed catalogue · nothing saved yet";
      return;
    }
    var counts = tagCounts();
    var favoriteTotal = links.filter(favoriteOf).length;
    var subjectTotal = sortedTagNames(counts).length;
    var parts = [
      links.length + (links.length === 1 ? " corner" : " corners"),
      subjectTotal + (subjectTotal === 1 ? " subject" : " subjects"),
      favoriteTotal + (favoriteTotal === 1 ? " favorite" : " favorites")
    ];
    heroMeta.innerHTML = parts.map(function (part) {
      return "<span>" + esc(part) + "</span>";
    }).join('<span class="link-meta-sep" aria-hidden="true">·</span>');
  }

  function renderStats() {
    var host = $("link-stats");
    if (!host) return;
    var monthKey = Z.monthKey(Z.todayISO());
    var monthCount = links.filter(function (link) {
      return Z.monthKey(link.saved) === monthKey;
    }).length;
    var domains = {};
    links.forEach(function (link) {
      var domain = domainOf(link);
      if (domain) domains[domain] = true;
    });
    var counts = tagCounts();
    var names = sortedTagNames(counts);
    var favorites = links.filter(favoriteOf);
    var topTag = names[0];

    var stats = [
      {
        label: "In the library",
        value: String(links.length),
        hint: links.length ? (monthCount ? monthCount + " added this month" : "All kept locally") : "The shelf is waiting",
        icon: "link"
      },
      {
        label: "Subjects",
        value: String(names.length),
        hint: topTag ? "Most used: #" + topTag : "No subjects yet",
        icon: "tag"
      },
      {
        label: "Different domains",
        value: String(Object.keys(domains).length),
        hint: Object.keys(domains).length ? "A varied shelf" : "Nothing saved yet",
        icon: "external"
      },
      {
        label: "Favorites",
        value: String(favorites.length),
        hint: favorites.length ? "Starred for a return" : "Star what matters",
        icon: "star"
      }
    ];

    host.innerHTML = stats.map(function (stat) {
      return '<div class="stat link-stat">' +
        '<div class="stat-label"><span>' + stat.label + "</span>" + Z.icon(stat.icon) + "</div>" +
        '<div class="stat-value">' + stat.value + "</div>" +
        '<div class="stat-hint">' + esc(stat.hint) + "</div></div>";
    }).join("");
  }

  function renderTags() {
    if (!tagHost) return;
    var counts = tagCounts();
    var names = sortedTagNames(counts);
    if (selectedTag !== "all" && names.indexOf(selectedTag) === -1) selectedTag = "all";

    tagHost.innerHTML = '<button type="button" class="chip link-chip' + (selectedTag === "all" ? " active" : "") +
      '" data-tag="all" aria-pressed="' + (selectedTag === "all") + '">All corners <span class="count">' + links.length + "</span></button>" +
      names.map(function (name) {
        return '<button type="button" class="chip link-chip' + (selectedTag === name ? " active" : "") +
          '" data-tag="' + esc(name) + '" aria-pressed="' + (selectedTag === name) + '">' +
          '<span class="link-chip-hash" aria-hidden="true">#</span>' + esc(name) +
          ' <span class="count">' + counts[name] + "</span></button>";
      }).join("");

    if (favoritesToggle) {
      favoritesToggle.classList.toggle("is-active", favoritesOnly);
      favoritesToggle.setAttribute("aria-pressed", String(favoritesOnly));
      favoritesToggle.disabled = !links.length;
    }
    if (favoritesCount) favoritesCount.textContent = String(links.filter(favoriteOf).length);
  }

  function visibleLinks() {
    var query = searchField.value.trim().toLowerCase();
    var sorted = links.slice();
    sorted.sort(function (a, b) {
      if (sortField.value === "oldest") return String(a.saved || "").localeCompare(String(b.saved || ""));
      if (sortField.value === "title") return String(a.title || "").localeCompare(String(b.title || ""));
      if (sortField.value === "domain") return domainOf(a).localeCompare(domainOf(b));
      return String(b.saved || "").localeCompare(String(a.saved || ""));
    });
    return sorted.filter(function (link) {
      if (favoritesOnly && !favoriteOf(link)) return false;
      if (selectedTag !== "all" && tagsOf(link).indexOf(selectedTag) === -1) return false;
      if (!query) return true;
      var searchable = [
        String(link.title || ""),
        String(link.url || ""),
        String(link.note || ""),
        tagsOf(link).join(" "),
        domainOf(link)
      ].join(" ").toLowerCase();
      return searchable.indexOf(query) !== -1;
    });
  }

  function favoriteButtonMarkup(link, className) {
    var pressed = favoriteOf(link);
    var label = (pressed ? "Remove " : "Add ") + link.title + (pressed ? " from" : " to") + " favorites";
    return '<button type="button" class="' + className + '" data-favorite="' + esc(link.id) +
      '" aria-pressed="' + pressed + '" aria-label="' + esc(label) + '" title="' +
      (pressed ? "Remove from favorites" : "Add to favorites") + '">' + Z.icon("star") + "</button>";
  }

  function actionsMarkup(link) {
    var url = linkUrl(link);
    var title = esc(link.title);
    return '<div class="link-actions">' +
      '<button type="button" class="icon-btn small" data-copy="' + esc(url) + '" aria-label="Copy link" title="Copy link">' + Z.icon("copy") + "</button>" +
      '<button type="button" class="icon-btn small" data-edit="' + esc(link.id) + '" aria-label="Edit ' + title + '" title="Edit">' + Z.icon("pencil") + "</button>" +
      '<a class="icon-btn small" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Open ' + title + '" title="Open in a new tab">' + Z.icon("external") + "</a>" +
      '<button type="button" class="icon-btn small danger" data-delete="' + esc(link.id) + '" aria-label="Delete ' + title + '" title="Delete">' + Z.icon("trash") + "</button>" +
      "</div>";
  }

  function tagPillsMarkup(tags, limit) {
    return tags.slice(0, limit).map(function (tag) {
      return '<span class="tag link-tag">#' + esc(tag) + "</span>";
    }).join("");
  }

  function gridCardMarkup(link, index) {
    var domain = domainOf(link);
    var url = linkUrl(link);
    var tags = tagsOf(link);
    var pills = tagPillsMarkup(tags, 4);
    var note = link.note ? String(link.note) : "No note yet — open it, then decide what to remember.";
    return '<article class="link-card' + (favoriteOf(link) ? " is-favorite" : "") + '" data-tone="' + toneFor(domain) + '">' +
      '<div class="link-card-top">' +
        '<span class="link-card-no">' + pad(index + 1) + "</span>" +
        '<span class="link-domain"><span class="link-domain-mark">' + esc(monogramFor(domain)) + "</span>" +
          '<span class="link-domain-name">' + esc(domain) + "</span></span>" +
        favoriteButtonMarkup(link, "link-star") +
      "</div>" +
      '<div class="link-card-main">' +
        '<h3 class="link-title"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(link.title) + "</a></h3>" +
        '<p class="link-note' + (link.note ? "" : " link-note-empty") + '">' + esc(note) + "</p>" +
        (pills ? '<div class="tag-list link-tag-list">' + pills + "</div>" : "") +
      "</div>" +
      '<div class="link-card-foot">' +
        '<span class="link-date">Saved ' + esc(Z.relDate(link.saved)) + "</span>" +
        actionsMarkup(link) +
      "</div>" +
    "</article>";
  }

  function listCardMarkup(link, index) {
    var domain = domainOf(link);
    var url = linkUrl(link);
    var note = link.note ? String(link.note) : "No note yet.";
    return '<article class="link-card link-card-list' + (favoriteOf(link) ? " is-favorite" : "") + '" data-tone="' + toneFor(domain) + '">' +
      '<span class="link-card-no">' + pad(index + 1) + "</span>" +
      '<div class="link-list-main">' +
        '<div class="link-list-top">' +
          '<span class="link-domain"><span class="link-domain-mark">' + esc(monogramFor(domain)) + "</span>" +
            '<span class="link-domain-name">' + esc(domain) + "</span></span>" +
          '<span class="link-list-saved">Saved ' + esc(Z.relDate(link.saved)) + "</span>" +
        "</div>" +
        '<h3 class="link-title link-list-title"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(link.title) + "</a></h3>" +
        '<p class="link-note' + (link.note ? "" : " link-note-empty") + '">' + esc(note) + "</p>" +
      "</div>" +
      '<div class="link-list-tags">' + tagPillsMarkup(tagsOf(link), 3) + "</div>" +
      '<div class="link-list-side">' +
        favoriteButtonMarkup(link, "link-star") +
        actionsMarkup(link) +
      "</div>" +
    "</article>";
  }

  function emptyMarkup() {
    if (!links.length) {
      return '<div class="link-empty">' +
        '<span class="link-empty-mark">' + Z.icon("link") + "</span>" +
        "<h3>An empty shelf.</h3>" +
        "<p>Save the essay you keep reopening, the reference you always forget, or the page that made you think.</p>" +
        '<button type="button" class="btn btn-primary" data-empty-add>Save the first corner</button>' +
      "</div>";
    }
    var hasFavorites = links.some(favoriteOf);
    var title = "No corners match.";
    var copy = "Try a different subject or search phrase, or let the whole catalogue back in.";
    if (favoritesOnly && !hasFavorites) {
      title = "No favorites yet.";
      copy = "Star a link and it will wait for you here. Or clear the filters to see the whole shelf.";
    } else if (favoritesOnly) {
      title = "No favorites match.";
      copy = "No starred corner fits those filters. Clear them to see the rest of the shelf.";
    }
    return '<div class="link-empty link-empty-sm">' +
      '<span class="link-empty-mark">' + Z.icon(favoritesOnly ? "star" : "search") + "</span>" +
      "<h3>" + title + "</h3>" +
      "<p>" + copy + "</p>" +
      '<button type="button" class="btn btn-sm" data-clear-filters>Clear filters</button>' +
    "</div>";
  }

  function renderGrid() {
    if (!grid) return;
    var visible = visibleLinks();
    grid.setAttribute("data-view", viewMode);
    if (countLabel) {
      countLabel.textContent = links.length
        ? (visible.length === links.length ? links.length + " corners" : visible.length + " of " + links.length + " showing")
        : "No corners yet";
    }
    if (!links.length) {
      grid.innerHTML = emptyMarkup();
    } else if (!visible.length) {
      grid.innerHTML = emptyMarkup();
    } else {
      grid.innerHTML = visible.map(function (link, index) {
        return viewMode === "list" ? listCardMarkup(link, index) : gridCardMarkup(link, index);
      }).join("");
    }
    if (viewHost) {
      viewHost.querySelectorAll("[data-link-view]").forEach(function (button) {
        var active = button.dataset.linkView === viewMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }
  }

  function defaultSpotlight() {
    var sorted = sortedBySaved();
    var favorite = sorted.filter(favoriteOf)[0];
    return favorite || sorted[0] || null;
  }

  function currentSpotlight() {
    var current = findLink(spotlightId);
    if (current) return current;
    var fallback = defaultSpotlight();
    spotlightId = fallback ? fallback.id : "";
    return fallback;
  }

  function spotlightMarkup(link) {
    var domain = domainOf(link);
    var url = linkUrl(link);
    var tags = tagsOf(link);
    var position = sortedBySaved().indexOf(link) + 1;
    var pressed = favoriteOf(link);
    var tagMarkup = tags.slice(0, 6).map(function (tag) {
      return '<span class="link-spotlight-tag"><b aria-hidden="true">#</b>' + esc(tag) + "</span>";
    }).join("");

    return '<article class="link-spotlight-card" data-tone="' + toneFor(domain) + '">' +
      '<div class="link-spotlight-top">' +
        '<span class="link-spotlight-kicker"><span class="link-spotlight-dot" aria-hidden="true"></span>On the desk</span>' +
        '<span class="link-spotlight-coordinate">No. ' + pad(position) + " / " + pad(links.length) + "</span>" +
      "</div>" +
      '<div class="link-spotlight-body">' +
        '<span class="link-spotlight-mark" aria-hidden="true">' + esc(monogramFor(domain)) + "</span>" +
        '<div class="link-spotlight-copy">' +
          '<p class="link-spotlight-domain">' + esc(domain) + "</p>" +
          '<h2 class="link-spotlight-title"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(link.title) + "</a></h2>" +
          '<p class="link-spotlight-note">' + esc(link.note || "No note yet. Open it, then decide what to remember.") + "</p>" +
          (tagMarkup ? '<div class="link-spotlight-tags">' + tagMarkup + "</div>" : "") +
        "</div>" +
      "</div>" +
      '<div class="link-spotlight-foot">' +
        '<span class="link-spotlight-saved">' + Z.icon("clock") + "Saved " + esc(Z.relDate(link.saved)) + "</span>" +
        '<div class="link-spotlight-actions">' +
          '<button type="button" class="link-spotlight-action' + (pressed ? " is-active" : "") + '" data-favorite="' + esc(link.id) +
            '" aria-pressed="' + pressed + '" aria-label="' + esc((pressed ? "Remove " : "Add ") + link.title + (pressed ? " from" : " to") + " favorites") + '">' +
            Z.icon("star") + "<span>" + (pressed ? "Kept close" : "Keep close") + "</span></button>" +
          '<button type="button" class="link-spotlight-action" data-copy="' + esc(url) + '" aria-label="Copy link">' +
            Z.icon("copy") + "<span>Copy</span></button>" +
          '<button type="button" class="link-spotlight-action" data-edit="' + esc(link.id) + '" aria-label="Edit ' + esc(link.title) + '">' +
            Z.icon("pencil") + "<span>Edit</span></button>" +
          '<a class="link-spotlight-action is-primary" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">Open corner' + Z.icon("arrowUpRight") + "</a>" +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function emptySpotlightMarkup() {
    return '<article class="link-spotlight-card is-empty">' +
      '<div class="link-spotlight-top">' +
        '<span class="link-spotlight-kicker"><span class="link-spotlight-dot" aria-hidden="true"></span>On the desk</span>' +
        '<span class="link-spotlight-coordinate">No. 00 / 00</span>' +
      "</div>" +
      '<div class="link-spotlight-empty">' +
        '<span class="link-spotlight-empty-mark">' + Z.icon("link") + "</span>" +
        '<p class="link-spotlight-domain">A D1-backed catalogue</p>' +
        '<h2 class="link-spotlight-title">The desk is clear.</h2>' +
        '<p class="link-spotlight-note">Save the first essay, reference, or odd little corner. This is where it will wait.</p>' +
        '<button type="button" class="btn" data-empty-add>Save the first corner</button>' +
      "</div>" +
    "</article>";
  }

  function renderSpotlight() {
    if (!spotlightHost) return;
    var link = currentSpotlight();
    spotlightHost.innerHTML = link ? spotlightMarkup(link) : emptySpotlightMarkup();
  }

  function renderIndex() {
    if (!indexHost) return;
    if (shuffleButton) shuffleButton.disabled = !links.length;
    if (!links.length) {
      if (indexCount) indexCount.textContent = "0 entries";
      indexHost.innerHTML = '<p class="link-index-empty">The index will fill itself as you save corners.</p>';
      return;
    }
    var sorted = sortedBySaved();
    var current = currentSpotlight();
    if (indexCount) indexCount.textContent = pad(links.length) + (links.length === 1 ? " entry" : " entries");
    indexHost.innerHTML = sorted.map(function (link, index) {
      var active = !!(current && current.id === link.id);
      var favorite = favoriteOf(link);
      return '<button type="button" class="link-index-row' + (active ? " is-active" : "") +
        '" data-spotlight-id="' + esc(link.id) + '" title="Put ' + esc(link.title) + ' on the desk"' +
        (active ? ' aria-current="true"' : "") + ">" +
        '<span class="link-index-no">' + pad(index + 1) + "</span>" +
        '<span class="link-index-body"><span class="link-index-name">' + esc(link.title) + "</span>" +
          '<span class="link-index-domain">' + esc(domainOf(link)) + "</span></span>" +
        '<span class="link-index-star' + (favorite ? " is-favorite" : "") + '" aria-hidden="true">' +
          (favorite ? Z.icon("star") : Z.icon("chevronRight")) + "</span>" +
      "</button>";
    }).join("");
  }

  function renderAll() {
    renderHeroMeta();
    renderStats();
    renderTags();
    renderSpotlight();
    renderIndex();
    renderGrid();
  }

  function toggleFavorite(id) {
    var link = findLink(id);
    if (!link) return;
    link.favorite = !favoriteOf(link);
    Z.store.set("links", links);
    renderAll();
    Z.toast(link.favorite ? "Added to favorites: " + link.title : "Removed from favorites: " + link.title);
    announce(link.favorite ? link.title + " added to favorites." : link.title + " removed from favorites.");
  }

  function requestDelete(id) {
    var victim = findLink(id);
    if (!victim) return;
    Z.confirm({
      kicker: "Remove from shelf",
      title: "Let this one go?",
      message: "Remove <strong>" + esc(victim.title) + "</strong> from your links? The page itself will still be out there.",
      label: "Remove link"
    }).then(function (ok) {
      if (!ok) return;
      links = links.filter(function (link) { return link.id !== victim.id; });
      if (spotlightId === victim.id) spotlightId = "";
      Z.store.set("links", links);
      renderAll();
      Z.toast("Link removed.");
      announce("Removed " + victim.title + ".");
    });
  }

  function randomSpotlight() {
    if (!links.length) {
      openDialog(null);
      return;
    }
    var current = currentSpotlight();
    var pool = links.filter(function (link) {
      return !current || link.id !== current.id;
    });
    var pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : links[0];
    spotlightId = pick.id;
    renderSpotlight();
    renderIndex();
    announce("On the desk: " + pick.title);
    var card = spotlightHost.querySelector(".link-spotlight-card");
    if (card) {
      card.classList.add("is-shuffled");
      setTimeout(function () { card.classList.remove("is-shuffled"); }, 520);
    }
  }

  function clearFilters() {
    searchField.value = "";
    selectedTag = "all";
    favoritesOnly = false;
    renderTags();
    renderGrid();
    announce("Filters cleared.");
  }

  function handleEntryAction(event) {
    if (event.target.closest("[data-empty-add]")) {
      openDialog(null);
      return true;
    }
    if (event.target.closest("[data-clear-filters]")) {
      clearFilters();
      return true;
    }
    var favoriteButton = event.target.closest("[data-favorite]");
    if (favoriteButton) {
      toggleFavorite(favoriteButton.dataset.favorite);
      return true;
    }
    var copyButton = event.target.closest("[data-copy]");
    if (copyButton) {
      Z.copy(copyButton.dataset.copy);
      return true;
    }
    var editButton = event.target.closest("[data-edit]");
    if (editButton) {
      var link = findLink(editButton.dataset.edit);
      if (link) openDialog(link);
      return true;
    }
    var deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) {
      requestDelete(deleteButton.dataset.delete);
      return true;
    }
    return false;
  }

  function openDialog(link) {
    form.reset();
    idField.value = link ? link.id : "";
    dialogKicker.textContent = link ? "Back at the desk" : "Add to the catalogue";
    dialogTitle.textContent = link ? "A familiar corner" : "A good corner";
    saveButton.textContent = link ? "Save changes" : "Save link";
    urlField.value = link ? link.url : "";
    nameField.value = link ? link.title : "";
    tagsField.value = link ? tagsOf(link).join(", ") : "";
    noteField.value = link ? link.note || "" : "";
    if (favoriteField) favoriteField.checked = link ? favoriteOf(link) : false;
    renderTagPicker();
    dialog.showModal();
    setTimeout(function () { (link ? nameField : urlField).focus(); }, 40);
  }

  tagOptions.addEventListener("click", function (event) {
    var button = event.target.closest("[data-picker-tag]");
    if (!button) return;
    var tag = button.dataset.pickerTag;
    var selected = parseTags(tagsField.value);
    var index = selected.indexOf(tag);
    if (index !== -1) {
      selected.splice(index, 1);
    } else {
      if (selected.length >= 6) {
        Z.toast("Six tags is the limit for a link.", "error");
        return;
      }
      selected.push(tag);
    }
    tagsField.value = selected.join(", ");
    syncTagPicker();
  });

  tagsField.addEventListener("input", syncTagPicker);

  tagClear.addEventListener("click", function () {
    tagsField.value = "";
    syncTagPicker();
    tagsField.focus();
  });

  $("add-link").addEventListener("click", function () { openDialog(null); });
  $("link-surprise").addEventListener("click", randomSpotlight);
  if (shuffleButton) shuffleButton.addEventListener("click", randomSpotlight);
  document.querySelectorAll("[data-close-link]").forEach(function (button) {
    button.addEventListener("click", function () { dialog.close(); });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var normalized = normalizeUrl(urlField.value);
    var title = nameField.value.trim();
    if (!normalized) {
      Z.toast("That does not look like a web address.", "error");
      urlField.focus();
      return;
    }
    if (!title) {
      Z.toast("Give the link a title.", "error");
      nameField.focus();
      return;
    }
    var tags = parseTags(tagsField.value).slice(0, 6);

    var editingId = idField.value;
    var original = findLink(editingId);
    if (editingId && !original) editingId = "";
    var payload = original ? cloneLink(original) : {};
    payload.id = editingId || Z.uid("link");
    payload.title = title;
    payload.url = normalized;
    payload.tags = tags;
    payload.note = noteField.value.trim();
    payload.favorite = favoriteField ? favoriteField.checked : false;
    payload.saved = original && original.saved ? original.saved : Z.todayISO();

    if (editingId) {
      links = links.map(function (link) { return link.id === editingId ? payload : link; });
    } else {
      links.push(payload);
      selectedTag = "all";
      favoritesOnly = false;
      searchField.value = "";
    }
    spotlightId = payload.id;
    Z.store.set("links", links);
    dialog.close();
    renderAll();
    Z.toast(editingId ? "Link updated: " + title : "Saved to the shelf: " + title);
    announce(editingId ? "Updated " + title + "." : "Saved " + title + " to the shelf.");
  });

  searchField.addEventListener("input", Z.debounce(renderGrid, 120));
  sortField.addEventListener("change", renderGrid);

  favoritesToggle.addEventListener("click", function () {
    favoritesOnly = !favoritesOnly;
    renderTags();
    renderGrid();
    announce(favoritesOnly ? "Showing favorites only." : "Showing all corners.");
  });

  viewHost.addEventListener("click", function (event) {
    var button = event.target.closest("[data-link-view]");
    if (!button) return;
    var next = button.dataset.linkView;
    if (next !== "grid" && next !== "list") return;
    viewMode = next;
    Z.store.set("linksView", viewMode);
    renderGrid();
  });

  tagHost.addEventListener("click", function (event) {
    var chip = event.target.closest("[data-tag]");
    if (!chip) return;
    selectedTag = chip.dataset.tag;
    renderTags();
    renderGrid();
  });

  grid.addEventListener("click", function (event) {
    handleEntryAction(event);
  });

  spotlightHost.addEventListener("click", function (event) {
    handleEntryAction(event);
  });

  indexHost.addEventListener("click", function (event) {
    var row = event.target.closest("[data-spotlight-id]");
    if (!row) return;
    spotlightId = row.dataset.spotlightId;
    renderSpotlight();
    renderIndex();
    var link = findLink(spotlightId);
    if (link) announce("On the desk: " + link.title);
  });

  renderAll();
})();
