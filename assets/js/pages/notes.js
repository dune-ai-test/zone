/* Zone — notes */

(function () {
  "use strict";

  var esc = Z.esc;
  var COLORS = ["plain", "sand", "sage", "clay"];
  var COLOR_LABELS = { plain: "Plain", sand: "Sand", sage: "Sage", clay: "Clay" };
  var COLOR_TONES = { plain: "#9a8c76", sand: "#b69a63", sage: "#809174", clay: "#b77a63" };
  var PROMPTS = [
    { title: "Notice one thing.", text: "What did you see today that you would otherwise forget by tomorrow?" },
    { title: "A useful sentence.", text: "Write down a sentence you read or heard this week that changed the shape of a thought." },
    { title: "Something to try.", text: "What is one small experiment worth running before the week is over?" },
    { title: "The unfinished idea.", text: "What have you been circling lately without quite saying it plainly?" },
    { title: "A place to return.", text: "Describe a place you would like to stand in again, even briefly." },
    { title: "What mattered.", text: "If today left only one detail behind, which detail should it be?" },
    { title: "A question for later.", text: "What do you want future-you to remember about right now?" }
  ];
  var today = Z.todayISO();
  var notes = Z.store.get("notes", []);
  if (!Array.isArray(notes)) notes = [];

  var seen = {};
  notes = notes.filter(function (note) {
    return note && typeof note === "object";
  }).map(function (note) {
    var id = note.id == null ? "" : String(note.id);
    if (!id || seen[id]) id = Z.uid("note");
    seen[id] = true;
    note.id = id;
    note.title = String(note.title == null ? "" : note.title).trim() || "Untitled note";
    note.body = String(note.body == null ? "" : note.body);
    if (COLORS.indexOf(note.color) === -1) note.color = "plain";
    note.pinned = Boolean(note.pinned);
    note.created = validISO(note.created) || today;
    note.updated = validISO(note.updated) || note.created;
    return note;
  });

  var state = { search: "", filter: "all", sort: "updated" };
  var noteColor = "plain";
  var viewingId = "";
  var currentPrompt = PROMPTS[0];

  var $ = function (id) { return document.getElementById(id); };
  var dialog = $("note-dialog");
  var form = $("note-form");
  var idField = $("note-id");
  var titleField = $("note-name");
  var bodyField = $("note-content");
  var viewDialog = $("note-view-dialog");
  var gridHost = $("notes-grid");
  var searchField = $("note-search");
  var searchClear = $("note-search-clear");
  var searchBox = searchField.closest(".nt-search");

  function validISO(value) {
    var text = String(value || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
    return Z.toISO(Z.parseISO(text)) === text ? text : "";
  }

  function save() {
    Z.store.set("notes", notes);
  }

  function findNote(id) {
    return notes.filter(function (note) { return note.id === id; })[0];
  }

  function words(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function readingTime(text) {
    return Math.max(1, Math.round(words(text) / 200));
  }

  function excerpt(text, limit) {
    var clean = String(text || "").replace(/\s+/g, " ").trim();
    if (clean.length <= limit) return clean;
    return clean.slice(0, limit).replace(/\s+\S*$/, "") + "…";
  }

  function totalWords() {
    return notes.reduce(function (sum, note) { return sum + words(note.body); }, 0);
  }

  function filteredNotes() {
    var query = state.search.trim().toLowerCase();
    var weekStart = Z.addDays(today, -6);
    var rows = notes.filter(function (note) {
      if (state.filter === "pinned" && !note.pinned) return false;
      if (state.filter === "week" && String(note.updated) < weekStart) return false;
      if (!query) return true;
      return (note.title + " " + note.body).toLowerCase().indexOf(query) !== -1;
    });

    rows.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (state.sort === "title") return a.title.localeCompare(b.title);
      if (state.sort === "created") return String(b.created).localeCompare(String(a.created));
      return String(b.updated).localeCompare(String(a.updated));
    });
    return rows;
  }

  function latestNote() {
    return notes.slice().sort(function (a, b) {
      return String(b.updated).localeCompare(String(a.updated));
    })[0] || null;
  }

  function syncSearch() {
    var hasValue = Boolean(state.search.trim());
    searchClear.hidden = !hasValue;
    searchBox.classList.toggle("has-value", hasValue);
  }

  function renderHeroMeta() {
    var pinned = notes.filter(function (note) { return note.pinned; }).length;
    $("note-hero-meta").innerHTML =
      '<span class="nt-meta-item"><span class="nt-local-dot" aria-hidden="true"></span>Local commonplace</span>' +
      '<span class="nt-meta-item">' + notes.length + (notes.length === 1 ? " note" : " notes") + "</span>" +
      '<span class="nt-meta-item">' + pinned + " pinned</span>" +
      '<span class="nt-meta-item">' + Z.num(totalWords()) + " words</span>";
  }

  function renderStats() {
    var pinned = notes.filter(function (note) { return note.pinned; }).length;
    var allWords = totalWords();
    var month = notes.filter(function (note) {
      return Z.monthKey(note.created) === Z.monthKey(today);
    }).length;
    var monthName = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(Z.parseISO(today));

    $("note-stats").innerHTML =
      '<article class="nt-stat">' +
        '<span class="nt-stat-index">01</span><span class="nt-stat-label">Notes kept</span>' +
        '<p class="nt-stat-value">' + Z.num(notes.length) + "</p>" +
        '<p class="nt-stat-foot">' + (notes.length ? "Pages in the notebook" : "An empty first page") + "</p>" +
      "</article>" +
      '<article class="nt-stat">' +
        '<span class="nt-stat-index">02</span><span class="nt-stat-label">Pinned</span>' +
        '<p class="nt-stat-value">' + pinned + "</p>" +
        '<p class="nt-stat-foot">' + (pinned ? "Kept near the top" : "Nothing pinned yet") + "</p>" +
      "</article>" +
      '<article class="nt-stat">' +
        '<span class="nt-stat-index">03</span><span class="nt-stat-label">Words written</span>' +
        '<p class="nt-stat-value">' + Z.num(allWords) + "</p>" +
        '<p class="nt-stat-foot">' + (allWords ? "Across every note" : "The page is still blank") + "</p>" +
      "</article>" +
      '<article class="nt-stat">' +
        '<span class="nt-stat-index">04</span><span class="nt-stat-label">This month</span>' +
        '<p class="nt-stat-value">' + month + "</p>" +
        '<p class="nt-stat-foot">' + (month ? "New pages in " + esc(monthName) : "No new pages in " + esc(monthName)) + "</p>" +
      "</article>";
  }

  function renderFeature() {
    var host = $("note-feature-body");
    var note = latestNote();

    if (!note) {
      host.innerHTML = '<div class="nt-feature-empty"><p class="nt-kicker">A blank page</p>' +
        "<h2>The notebook is open.</h2>" +
        "<p>No note has to be finished. Begin with the useful part and leave the rest for later.</p>" +
        '<button type="button" class="btn btn-sm nt-feature-btn" data-add-note>Write the first note</button></div>';
      return;
    }

    var pinned = note.pinned;
    host.innerHTML =
      '<div class="nt-feature-date"><span>Latest leaf · ' + esc(Z.dateMedium(note.updated)) + "</span>" +
        '<span class="nt-feature-status">' + (pinned ? Z.icon("pin") + " Pinned" : readingTime(note.body) + " min read") + "</span></div>" +
      '<h2 class="nt-feature-title">' + esc(note.title) + "</h2>" +
      '<p class="nt-feature-excerpt">' + esc(excerpt(note.body, 255)) + "</p>" +
      '<div class="nt-feature-actions">' +
        '<button type="button" class="nt-feature-open" data-open-note="' + esc(note.id) + '">Read note ' + Z.icon("arrowRight") + "</button>" +
        '<button type="button" class="nt-feature-edit" data-edit-note="' + esc(note.id) + '">Edit</button>' +
      "</div>";
  }

  function renderRecent() {
    var host = $("note-recent");
    var recent = notes.slice().sort(function (a, b) {
      return String(b.updated).localeCompare(String(a.updated));
    }).slice(0, 4);

    if (!recent.length) {
      host.innerHTML = '<p class="nt-recent-empty">The desk is clear. The next note will appear here.</p>';
      return;
    }

    host.innerHTML = recent.map(function (note) {
      return '<button type="button" class="nt-recent-item" data-open-note="' + esc(note.id) + '">' +
        '<span class="nt-recent-dot" style="--tone:' + COLOR_TONES[note.color] + '"></span>' +
        '<span class="nt-recent-copy"><strong>' + esc(note.title) + "</strong><small>" +
          words(note.body) + " words" + (note.pinned ? " · pinned" : "") + "</small></span>" +
        '<span class="nt-recent-date">' + esc(Z.relDate(note.updated)) + "</span></button>";
    }).join("");
  }

  function renderArchive() {
    var host = $("note-archive");
    var oldest = notes.slice().sort(function (a, b) {
      return String(a.created).localeCompare(String(b.created));
    })[0];
    var longest = notes.slice().sort(function (a, b) {
      return words(b.body) - words(a.body);
    })[0];
    var colorCounts = {};
    notes.forEach(function (note) {
      colorCounts[note.color] = (colorCounts[note.color] || 0) + 1;
    });
    var favouriteColor = Object.keys(colorCounts).sort(function (a, b) {
      return colorCounts[b] - colorCounts[a];
    })[0];

    function row(label, value) {
      return '<div class="nt-archive-row"><span>' + label + "</span><strong>" + value + "</strong></div>";
    }

    host.innerHTML =
      row("Oldest page", oldest ? esc(Z.dateMedium(oldest.created)) : "—") +
      row("Longest note", longest ? esc(excerpt(longest.title, 26)) + " · " + words(longest.body) + "w" : "—") +
      row("Ink of choice", favouriteColor ? COLOR_LABELS[favouriteColor] + " · " + colorCounts[favouriteColor] + " notes" : "—");
  }

  function renderPrompt() {
    var dayNumber = Math.floor(Z.parseISO(today).getTime() / 86400000);
    currentPrompt = PROMPTS[dayNumber % PROMPTS.length];
    $("note-prompt-title").textContent = currentPrompt.title;
    $("note-prompt-text").textContent = currentPrompt.text;
  }

  function noteCard(note) {
    var pinned = note.pinned;
    var updated = Z.relDate(note.updated);
    return '<article class="nt-card nt-paper-' + esc(note.color) + (pinned ? " is-pinned" : "") + '" data-note-id="' + esc(note.id) + '">' +
      '<button type="button" class="nt-card-pin' + (pinned ? " is-pinned" : "") + '" data-pin-note="' + esc(note.id) + '" aria-label="' + (pinned ? "Unpin note" : "Pin note") + '" aria-pressed="' + pinned + '" title="' + (pinned ? "Unpin" : "Pin to top") + '">' + Z.icon("pin") + "</button>" +
      '<div class="nt-card-top"><span class="nt-card-date">' + esc(Z.dateMedium(note.updated)) + "</span>" +
        (pinned ? '<span class="nt-card-flag">' + Z.icon("pin") + " Pinned</span>" : "") + "</div>" +
      '<button type="button" class="nt-card-title" data-open-note="' + esc(note.id) + '">' + esc(note.title) + "</button>" +
      '<span class="nt-card-excerpt">' + esc(excerpt(note.body, 360) || "No words yet.") + "</span>" +
      '<div class="nt-card-foot">' +
        '<span class="nt-card-meta"><span>' + words(note.body) + " words</span><span>" + esc(updated) + "</span></span>" +
        '<span class="nt-card-actions">' +
          '<button type="button" class="icon-btn small" data-edit-note="' + esc(note.id) + '" aria-label="Edit ' + esc(note.title) + '" title="Edit note">' + Z.icon("pencil") + "</button>" +
          '<button type="button" class="icon-btn small danger" data-delete-note="' + esc(note.id) + '" aria-label="Delete ' + esc(note.title) + '" title="Delete note">' + Z.icon("trash") + "</button>" +
        "</span>" +
      "</div>" +
    "</article>";
  }

  function renderGrid() {
    var rows = filteredNotes();
    var pinned = notes.filter(function (note) { return note.pinned; }).length;
    $("note-count").textContent = rows.length + " of " + notes.length + " notes · " + pinned + " pinned";

    if (!notes.length) {
      gridHost.innerHTML = '<div class="nt-empty"><div class="nt-empty-mark">' + Z.icon("note") + "</div>" +
        "<h3>Nothing written yet.</h3><p>A note does not need to be finished. Put down the useful part and leave.</p>" +
        '<button type="button" class="btn" data-empty-add-note>Write the first note</button></div>';
      return;
    }

    if (!rows.length) {
      gridHost.innerHTML = '<div class="nt-empty"><div class="nt-empty-mark">' + Z.icon("search") + "</div>" +
        "<h3>No notes match.</h3><p>Try a different word, a wider filter, or look at everything for a moment.</p>" +
        '<button type="button" class="btn" data-clear-note-filters>Clear filters</button></div>';
      return;
    }

    gridHost.innerHTML = rows.map(noteCard).join("");
  }

  function renderAll() {
    renderHeroMeta();
    renderStats();
    renderFeature();
    renderRecent();
    renderArchive();
    renderGrid();
  }

  function updateWordCount() {
    var count = words(bodyField.value);
    $("note-word-count").textContent = count + (count === 1 ? " word" : " words") + " · " + readingTime(bodyField.value) + " min read";
  }

  function selectColor(color) {
    noteColor = COLORS.indexOf(color) === -1 ? "plain" : color;
    document.querySelectorAll("#note-colors [data-note-color]").forEach(function (button) {
      var active = button.dataset.noteColor === noteColor;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function openNote(note, seed) {
    if (viewDialog.open) viewDialog.close();
    form.reset();
    var editing = Boolean(note);
    idField.value = editing ? note.id : "";
    $("note-kicker").textContent = editing ? "Return to the page" : "A thought worth keeping";
    $("note-title").textContent = editing ? "Edit note" : "New note";
    $("note-save").textContent = editing ? "Save changes" : "Save note";
    titleField.value = editing ? note.title : seed && seed.title ? seed.title : "";
    bodyField.value = editing ? note.body : seed && seed.body ? seed.body : "";
    selectColor(editing ? note.color : "plain");
    updateWordCount();
    dialog.showModal();
    setTimeout(function () {
      if (seed && !titleField.value) {
        titleField.focus();
        return;
      }
      if (seed) {
        bodyField.focus();
        bodyField.setSelectionRange(bodyField.value.length, bodyField.value.length);
        return;
      }
      titleField.focus();
      if (editing) titleField.select();
    }, 40);
  }

  function updateView(note) {
    if (!note) return;
    viewingId = note.id;
    $("note-view-kicker").textContent = note.pinned ? "Pinned leaf" : "From the notebook";
    $("note-view-title").textContent = note.title;
    $("note-view-meta").textContent = Z.dateMedium(note.updated) + " · " + COLOR_LABELS[note.color] + " paper · " + readingTime(note.body) + " min read";
    var body = $("note-view-body");
    body.textContent = note.body.trim() || "No words yet.";
    body.classList.toggle("is-empty", !note.body.trim());
    $("note-view-words").textContent = words(note.body) + (words(note.body) === 1 ? " word" : " words");
    var pin = $("note-view-pin");
    pin.textContent = note.pinned ? "Unpin note" : "Pin note";
    pin.classList.toggle("is-pinned", note.pinned);
    pin.setAttribute("aria-pressed", String(note.pinned));
  }

  function openView(note) {
    if (!note) return;
    updateView(note);
    if (!viewDialog.open) viewDialog.showModal();
  }

  function openViewingId() {
    var note = findNote(viewingId);
    if (note) openView(note);
  }

  function clearFilters() {
    state.search = "";
    state.filter = "all";
    searchField.value = "";
    $("note-filter").value = "all";
    syncSearch();
    renderGrid();
    searchField.focus();
  }

  function exportNotes() {
    if (!notes.length) {
      Z.toast("Write a note before exporting.", "error");
      return;
    }
    var ordered = notes.slice().sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return String(b.updated).localeCompare(String(a.updated));
    });
    var lines = ["# Zone notebook", "", "Exported " + Z.dateMedium(today) + " · " + notes.length + " notes", ""];
    ordered.forEach(function (note) {
      lines.push("## " + note.title, "");
      lines.push("_" + Z.dateMedium(note.updated) + " · " + COLOR_LABELS[note.color] + " paper" + (note.pinned ? " · pinned" : "") + "_", "");
      lines.push(note.body.trim() || "_(No words yet.)_", "");
      lines.push("---", "");
    });
    Z.download("zone-notes-" + today + ".md", lines.join("\n"), "text/markdown;charset=utf-8");
    Z.toast("Notebook exported as Markdown.");
  }

  var renderSearch = Z.debounce(function () {
    renderGrid();
  }, 120);

  $("add-note").addEventListener("click", function () { openNote(null); });
  $("export-notes").addEventListener("click", exportNotes);

  $("note-feature-body").addEventListener("click", function (event) {
    if (event.target.closest("[data-add-note]")) {
      openNote(null);
      return;
    }
    var open = event.target.closest("[data-open-note]");
    if (open) {
      openView(findNote(open.dataset.openNote));
      return;
    }
    var edit = event.target.closest("[data-edit-note]");
    if (edit) openNote(findNote(edit.dataset.editNote));
  });

  $("note-recent").addEventListener("click", function (event) {
    var open = event.target.closest("[data-open-note]");
    if (open) openView(findNote(open.dataset.openNote));
  });

  gridHost.addEventListener("click", function (event) {
    if (event.target.closest("[data-empty-add-note]")) {
      openNote(null);
      return;
    }
    if (event.target.closest("[data-clear-note-filters]")) {
      clearFilters();
      return;
    }
    var open = event.target.closest("[data-open-note]");
    if (open) {
      openView(findNote(open.dataset.openNote));
      return;
    }
    var pin = event.target.closest("[data-pin-note]");
    if (pin) {
      var pinned = findNote(pin.dataset.pinNote);
      if (!pinned) return;
      pinned.pinned = !pinned.pinned;
      save();
      renderAll();
      Z.toast(pinned.pinned ? "Pinned to the top." : "Unpinned.");
      return;
    }
    var edit = event.target.closest("[data-edit-note]");
    if (edit) {
      openNote(findNote(edit.dataset.editNote));
      return;
    }
    var del = event.target.closest("[data-delete-note]");
    if (del) {
      var victim = findNote(del.dataset.deleteNote);
      if (!victim) return;
      Z.confirm({
        kicker: "Delete note",
        title: "Throw this note away?",
        message: "Delete <strong>" + esc(victim.title) + "</strong> and its " + words(victim.body) + " words? This cannot be undone.",
        label: "Delete note"
      }).then(function (ok) {
        if (!ok) return;
        notes = notes.filter(function (note) { return note.id !== victim.id; });
        if (viewingId === victim.id) {
          viewingId = "";
          if (viewDialog.open) viewDialog.close();
        }
        save();
        renderAll();
        Z.toast("Note deleted.");
      });
      return;
    }
    if (event.target.closest("button, a")) return;
    var card = event.target.closest(".nt-card");
    if (card) openView(findNote(card.dataset.noteId));
  });

  $("note-prompt").addEventListener("click", function (event) {
    if (!event.target.closest("[data-use-prompt]")) return;
    openNote(null, {
      title: currentPrompt.title,
      body: currentPrompt.text + "\n\n"
    });
  });

  $("note-search").addEventListener("input", function () {
    state.search = searchField.value;
    syncSearch();
    renderSearch();
  });

  searchField.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && state.search) {
      state.search = "";
      searchField.value = "";
      syncSearch();
      renderGrid();
    }
  });

  searchClear.addEventListener("click", function () {
    state.search = "";
    searchField.value = "";
    syncSearch();
    renderGrid();
    searchField.focus();
  });

  $("note-filter").addEventListener("change", function () {
    state.filter = $("note-filter").value;
    renderGrid();
  });

  $("note-sort").addEventListener("change", function () {
    state.sort = $("note-sort").value;
    renderGrid();
  });

  document.querySelectorAll("[data-close-note]").forEach(function (button) {
    button.addEventListener("click", function () { dialog.close(); });
  });

  viewDialog.addEventListener("click", function (event) {
    if (event.target === viewDialog) viewDialog.close();
  });

  document.querySelectorAll("[data-close-note-view]").forEach(function (button) {
    button.addEventListener("click", function () { viewDialog.close(); });
  });

  $("note-view-pin").addEventListener("click", function () {
    var note = findNote(viewingId);
    if (!note) return;
    note.pinned = !note.pinned;
    save();
    renderAll();
    updateView(note);
    Z.toast(note.pinned ? "Pinned to the top." : "Unpinned.");
  });

  $("note-view-edit").addEventListener("click", function () {
    var note = findNote(viewingId);
    if (!note) return;
    viewDialog.close();
    openNote(note);
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll("#note-colors [data-note-color]").forEach(function (button) {
    button.addEventListener("click", function () { selectColor(button.dataset.noteColor); });
  });

  bodyField.addEventListener("input", updateWordCount);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var title = titleField.value.trim();
    var body = bodyField.value.trim();
    if (!title) {
      Z.toast("Give the note a title.", "error");
      titleField.focus();
      return;
    }
    if (!body) {
      Z.toast("Write something in the note.", "error");
      bodyField.focus();
      return;
    }

    var editing = idField.value;
    if (editing) {
      var existing = findNote(editing);
      if (!existing) return;
      existing.title = title;
      existing.body = body;
      existing.color = noteColor;
      existing.updated = today;
      Z.toast("Note updated.");
    } else {
      notes.push({
        id: Z.uid("note"),
        title: title,
        body: body,
        color: noteColor,
        pinned: false,
        created: today,
        updated: today
      });
      Z.toast("Note saved.");
    }
    save();
    dialog.close();
    renderAll();
  });

  form.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var target = event.target;
    var typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    if (event.key === "/" && !typing) {
      event.preventDefault();
      searchField.focus();
      return;
    }
    if ((event.key === "n" || event.key === "N") && !typing && !dialog.open && !viewDialog.open) {
      event.preventDefault();
      openNote(null);
    }
  });

  syncSearch();
  renderPrompt();
  renderAll();
})();
