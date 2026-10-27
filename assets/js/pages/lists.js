/* Zone — lists */

(function () {
  "use strict";

  var esc = Z.esc;
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  var KINDS = {
    home: {
      key: "home",
      label: "Home",
      icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V21h14V9.8"/><path d="M9.5 21v-6h5v6"/>'
    },
    work: {
      key: "work",
      label: "Project",
      icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/><path d="M3 12h18"/>'
    },
    reading: {
      key: "reading",
      label: "Reading",
      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'
    },
    trip: {
      key: "trip",
      label: "Travel",
      icon: '<path d="M9 7V4h6v3"/><rect x="4" y="7" width="16" height="14" rx="2"/><path d="M4 12h16"/><path d="M9 21v2M15 21v2"/>'
    },
    grocery: {
      key: "grocery",
      label: "Errands",
      icon: '<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6"/>'
    },
    other: {
      key: "other",
      label: "General",
      icon: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>'
    }
  };

  var TEMPLATES = [
    {
      id: "blank",
      name: "Blank page",
      kind: "other",
      items: []
    },
    {
      id: "weekend",
      name: "Weekend reset",
      kind: "home",
      items: [
        { text: "Laundry and bedding", children: ["Strip the bed", "Wash the curtains", "Fold everything"] },
        { text: "Grocery run", children: ["Oats and coffee", "Olive oil", "Something green"] },
        { text: "Clean the desk properly", children: [] },
        { text: "Water the balcony plants", children: [] },
        { text: "Plan the week, not the month", children: [] }
      ]
    },
    {
      id: "trip",
      name: "Trip packing",
      kind: "trip",
      items: [
        { text: "Passport and tickets", children: ["Check the expiry date", "Save the boarding passes", "Download an offline map"] },
        { text: "Clothes", children: ["Layers", "Walking shoes", "Rain shell"] },
        { text: "Toiletries", children: ["Sunscreen", "Prescriptions", "Toothbrush"] },
        { text: "Devices and cables", children: ["Charger", "Power bank", "Travel adapter"] },
        { text: "Before leaving", children: ["Water the plants", "Take out the bins", "Lock the windows"] }
      ]
    },
    {
      id: "launch",
      name: "Launch checklist",
      kind: "work",
      items: [
        { text: "Copy review", children: ["Headline and deck", "Pricing page"] },
        { text: "Mobile pass", children: ["Small phone (375px)", "Large phone, landscape"] },
        { text: "Analytics events", children: ["Signup completion", "Pricing click-through"] },
        { text: "Social cards", children: [] },
        { text: "Send the preview to Priya", children: [] }
      ]
    },
    {
      id: "groceries",
      name: "Grocery run",
      kind: "grocery",
      items: [
        { text: "Produce", children: ["Something green", "Fruit for the week", "Lemons"] },
        { text: "Pantry", children: ["Oats", "Coffee", "Olive oil"] },
        { text: "Cold", children: ["Milk", "Yoghurt"] },
        { text: "Home", children: ["Dish soap", "Paper towels"] }
      ]
    },
    {
      id: "reading",
      name: "Reading queue",
      kind: "reading",
      items: [
        { text: "The Creative Act — Rick Rubin", children: [] },
        { text: "Slow Productivity — Cal Newport", children: [] },
        { text: "The Shape of Design — Frank Chimero", children: [] },
        { text: "Ways of Seeing — John Berger", children: [] },
        { text: "A book chosen purely by its cover", children: [] }
      ]
    }
  ];

  var $ = function (id) { return document.getElementById(id); };

  var lists = Z.store.get("lists", []);
  if (!Array.isArray(lists)) lists = [];

  var normalized = false;
  var rawListCount = lists.length;

  lists = lists.filter(function (list) {
    return list && typeof list === "object";
  });
  if (lists.length !== rawListCount) normalized = true;

  lists.forEach(function (list) {
    if (list.id == null) {
      list.id = Z.uid("list");
      normalized = true;
    } else if (typeof list.id !== "string") {
      list.id = String(list.id);
      normalized = true;
    }

    if (typeof list.title !== "string" || !list.title.trim()) {
      list.title = "Untitled list";
      normalized = true;
    }

    if (!Array.isArray(list.items)) {
      list.items = [];
      normalized = true;
    }

    var rawItemCount = list.items.length;
    list.items = list.items.filter(function (item) {
      return item && typeof item === "object";
    });
    if (list.items.length !== rawItemCount) normalized = true;

    list.items.forEach(function (item) {
      if (item.id == null) {
        item.id = Z.uid("li");
        normalized = true;
      } else if (typeof item.id !== "string") {
        item.id = String(item.id);
        normalized = true;
      }

      if (typeof item.text !== "string") {
        item.text = String(item.text == null ? "Untitled item" : item.text);
        normalized = true;
      }
      if (!item.text.trim()) {
        item.text = "Untitled item";
        normalized = true;
      }

      item.done = !!item.done;

      if (!Array.isArray(item.children)) {
        item.children = [];
        normalized = true;
      }

      var rawChildCount = item.children.length;
      item.children = item.children.filter(function (child) {
        return child && typeof child === "object";
      });
      if (item.children.length !== rawChildCount) normalized = true;

      item.children.forEach(function (child) {
        if (child.id == null) {
          child.id = Z.uid("lc");
          normalized = true;
        } else if (typeof child.id !== "string") {
          child.id = String(child.id);
          normalized = true;
        }

        if (typeof child.text !== "string") {
          child.text = String(child.text == null ? "Untitled step" : child.text);
          normalized = true;
        }
        if (!child.text.trim()) {
          child.text = "Untitled step";
          normalized = true;
        }

        child.done = !!child.done;
      });

      if (item.children.length) {
        var everyChildDone = item.children.every(function (child) { return child.done; });
        if (item.done !== everyChildDone) {
          item.done = everyChildDone;
          normalized = true;
        }
      }
    });
  });

  function save() {
    Z.store.set("lists", lists);
  }

  if (normalized) {
    if (Z.audit && Z.audit.suppress) Z.audit.suppress(save);
    else save();
  }

  var initialOpen = lists.filter(function (list) { return itemProgress(list).open > 0; })[0];
  var selectedId = initialOpen ? initialOpen.id : (lists[0] ? lists[0].id : null);
  var searchQuery = "";
  var listFilter = "all";
  var itemFilter = "all";
  var addingSubFor = null;
  var templateId = "blank";
  var dialogTarget = { kind: "new", listId: null, itemId: null, childId: null };
  var lastPulse = "";
  var pulseTimer = 0;

  var detailHost = $("list-detail");
  var indexHost = $("list-index");
  var statsHost = $("list-stats");
  var focusHost = $("lists-focus");
  var heroMeta = $("lists-hero-meta");
  var exportButton = $("export-lists");
  var listCount = $("list-count");
  var listFilters = $("list-filters");
  var searchInput = $("list-search");
  var searchClear = $("list-search-clear");
  var listDialog = $("list-dialog");
  var listForm = $("list-form");
  var listTitle = $("list-title");
  var templateGrid = $("list-template-grid");
  var templateField = $("list-template-field");

  function noun(count, single, many) {
    return count === 1 ? single : many;
  }

  function plural(count, single, many) {
    return count + " " + noun(count, single, many);
  }

  function pad2(number) {
    return String(number).padStart(2, "0");
  }

  function findList(id) {
    return lists.filter(function (list) { return list.id === id; })[0];
  }

  function findItem(list, id) {
    if (!list) return null;
    return (list.items || []).filter(function (item) { return item.id === id; })[0] || null;
  }

  function findChild(item, id) {
    if (!item) return null;
    return (item.children || []).filter(function (child) { return child.id === id; })[0] || null;
  }

  function findData(root, attribute, value) {
    var nodes = root.querySelectorAll("[" + attribute + "]");
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].getAttribute(attribute) === String(value)) return nodes[i];
    }
    return null;
  }

  function activeList() {
    var list = findList(selectedId);
    if (!list && lists.length) {
      var visible = visibleLists();
      list = visible[0] || lists[0];
      selectedId = list.id;
    }
    return list || null;
  }

  function itemProgress(list) {
    var total = 0;
    var done = 0;
    (list.items || []).forEach(function (item) {
      total += 1;
      if (item.done) done += 1;
      (item.children || []).forEach(function (child) {
        total += 1;
        if (child.done) done += 1;
      });
    });
    return {
      total: total,
      done: done,
      open: total - done,
      pct: total ? Math.round((done / total) * 100) : 0
    };
  }

  function allProgress() {
    return lists.reduce(function (acc, list) {
      var p = itemProgress(list);
      acc.total += p.total;
      acc.done += p.done;
      acc.open += p.open;
      return acc;
    }, { total: 0, done: 0, open: 0 });
  }

  function childCount(list) {
    return (list.items || []).reduce(function (sum, item) {
      return sum + (item.children || []).length;
    }, 0);
  }

  function itemCounts(list) {
    var counts = { all: 0, open: 0, done: 0 };
    (list.items || []).forEach(function (item) {
      counts.all += 1;
      if (item.done) counts.done += 1;
      else counts.open += 1;
    });
    return counts;
  }

  function listStatus(list) {
    var p = itemProgress(list);
    if (!p.total) return "blank";
    if (!p.open) return "done";
    return "open";
  }

  function listKind(list) {
    var text = String(list.title || "").toLowerCase();
    if (/\b(read|reading|book|books|library|novel)\b/.test(text)) return KINDS.reading;
    if (/\b(trip|travel|packing|pack|holiday|flight|vacation)\b/.test(text)) return KINDS.trip;
    if (/\b(grocery|groceries|shopping|shop|market|errands?)\b/.test(text)) return KINDS.grocery;
    if (/\b(launch|project|work|client|team|sprint|ship|review)\b/.test(text)) return KINDS.work;
    if (/\b(weekend|home|house|clean|reset|garden|flat)\b/.test(text)) return KINDS.home;
    return KINDS.other;
  }

  function kindIcon(kind) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + kind.icon + "</svg>";
  }

  function startedLabel(list) {
    if (!list.createdAt) return "Undated";
    return "Started " + Z.relDate(list.createdAt).toLowerCase();
  }

  function syncParentDone(parent) {
    if (!parent || !Array.isArray(parent.children) || !parent.children.length) return;
    parent.done = parent.children.every(function (child) { return child.done; });
  }

  function nextOpenFor(list) {
    var items = list.items || [];
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      if (item.done) continue;
      if (item.children && item.children.length) {
        var openChild = item.children.filter(function (child) { return !child.done; })[0];
        if (openChild) {
          return { item: item, child: openChild, text: openChild.text };
        }
      }
      return { item: item, child: null, text: item.text };
    }
    return null;
  }

  function nextOpenList(excludeId) {
    for (var i = 0; i < lists.length; i += 1) {
      var list = lists[i];
      if (list.id === excludeId) continue;
      if (itemProgress(list).open > 0) return list;
    }
    return null;
  }

  function queryValue() {
    return searchQuery.trim().toLowerCase();
  }

  function listSearchInfo(list, query) {
    var needle = query || "";
    if (!needle) {
      return { visible: true, titleMatch: false, matches: [], count: 0 };
    }

    var titleMatch = String(list.title || "").toLowerCase().indexOf(needle) !== -1;
    var matches = [];

    (list.items || []).forEach(function (item) {
      if (String(item.text || "").toLowerCase().indexOf(needle) !== -1) {
        matches.push(item.text);
      }
      (item.children || []).forEach(function (child) {
        if (String(child.text || "").toLowerCase().indexOf(needle) !== -1) {
          matches.push(child.text);
        }
      });
    });

    return {
      visible: titleMatch || matches.length > 0,
      titleMatch: titleMatch,
      matches: matches,
      count: matches.length + (titleMatch ? 1 : 0)
    };
  }

  function highlightText(value, query) {
    var text = String(value == null ? "" : value);
    var needle = String(query || "").trim();
    if (!needle) return esc(text);

    var lower = text.toLowerCase();
    var lowerNeedle = needle.toLowerCase();
    var out = "";
    var pos = 0;
    var index = lower.indexOf(lowerNeedle, pos);

    if (index === -1) return esc(text);

    while (index !== -1) {
      out += esc(text.slice(pos, index));
      out += '<mark class="ls-mark">' + esc(text.slice(index, index + needle.length)) + "</mark>";
      pos = index + needle.length;
      index = lower.indexOf(lowerNeedle, pos);
    }
    out += esc(text.slice(pos));
    return out;
  }

  function listMatchesFilter(list) {
    var p = itemProgress(list);
    if (listFilter === "open") return p.open > 0;
    if (listFilter === "done") return p.total > 0 && p.open === 0;
    return true;
  }

  function visibleLists() {
    var query = queryValue();
    return lists.filter(function (list) {
      if (!listMatchesFilter(list)) return false;
      if (query && !listSearchInfo(list, query).visible) return false;
      return true;
    });
  }

  function ensureSelection() {
    var visible = visibleLists();
    if (!visible.length) return;
    if (!findList(selectedId) || !visible.some(function (list) { return list.id === selectedId; })) {
      selectedId = visible[0].id;
      itemFilter = "all";
      addingSubFor = null;
    }
  }

  function setPulse(id) {
    lastPulse = id || "";
    window.clearTimeout(pulseTimer);
    pulseTimer = window.setTimeout(function () {
      lastPulse = "";
    }, 980);
  }

  function motionBehavior() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function scrollDetailIntoView() {
    if (!window.matchMedia || !window.matchMedia("(max-width: 980px)").matches) return;
    window.setTimeout(function () {
      detailHost.scrollIntoView({ behavior: motionBehavior(), block: "start" });
    }, 40);
  }

  function templateById(id) {
    return TEMPLATES.filter(function (template) { return template.id === id; })[0] || TEMPLATES[0];
  }

  function templateSummary(template) {
    var lines = template.items.length;
    if (!lines) return "A clean sheet";
    var steps = template.items.reduce(function (sum, item) {
      return sum + (item.children || []).length;
    }, 0);
    return plural(lines, "item", "items") + (steps ? " · " + plural(steps, "step", "steps") : "");
  }

  function buildTemplateItems(template) {
    return (template.items || []).map(function (line) {
      return {
        id: Z.uid("li"),
        text: line.text,
        done: false,
        children: (line.children || []).map(function (step) {
          return { id: Z.uid("lc"), text: step, done: false };
        })
      };
    });
  }

  function listAsText(list) {
    var p = itemProgress(list);
    var lines = [
      list.title,
      (p.total ? p.done + " of " + p.total + " done" : "No checks yet") + " · " + startedLabel(list),
      ""
    ];

    (list.items || []).forEach(function (item) {
      lines.push((item.done ? "[x] " : "[ ] ") + item.text);
      (item.children || []).forEach(function (child) {
        lines.push((child.done ? "  [x] " : "  [ ] ") + child.text);
      });
    });

    if (!list.items.length) lines.push("(No items yet.)");
    return lines.join("\n");
  }

  /* ------------------------------------------------------------------------
     Rendering
     ------------------------------------------------------------------------ */

  function renderHeroMeta() {
    var all = allProgress();
    var pct = all.total ? Math.round((all.done / all.total) * 100) : 0;
    var chunks = [];

    if (lists.length) {
      chunks.push("<span><strong>" + lists.length + "</strong> " + esc(noun(lists.length, "list", "lists")) + "</span>");
      chunks.push("<span><strong>" + all.open + "</strong> open</span>");
      chunks.push("<span><strong>" + pct + "%</strong> crossed off</span>");
    } else {
      chunks.push("<span>A fresh notebook</span>");
    }

    chunks.push("<span>Saved to your workspace</span>");
    heroMeta.innerHTML = chunks.join('<span class="ls-meta-dot" aria-hidden="true"></span>');
    exportButton.disabled = !lists.length;
  }

  function renderStats() {
    var all = allProgress();
    var steps = lists.reduce(function (sum, list) { return sum + childCount(list); }, 0);
    var openLists = lists.filter(function (list) { return itemProgress(list).open > 0; }).length;
    var cleared = lists.filter(function (list) {
      var p = itemProgress(list);
      return p.total > 0 && p.open === 0;
    }).length;
    var blank = lists.filter(function (list) { return itemProgress(list).total === 0; }).length;
    var pct = all.total ? Math.round((all.done / all.total) * 100) : 0;
    var openScale = all.total ? all.open / all.total : 0;
    var doneScale = all.total ? all.done / all.total : 0;
    var listScale = lists.length ? openLists / lists.length : 0;
    var stepScale = all.total ? steps / all.total : 0;

    var stats = [
      {
        key: "open",
        label: "Still open",
        value: all.open,
        icon: "clock",
        hint: !all.total ? "Nothing on the page yet" : (!all.open ? "Everything is crossed off" : plural(openLists, "list", "lists") + " still in motion"),
        scale: openScale
      },
      {
        key: "done",
        label: "Crossed off",
        value: all.done,
        icon: "check",
        hint: all.total ? pct + "% of every item and step" : "No checks yet",
        scale: doneScale
      },
      {
        key: "lists",
        label: "Lists",
        value: lists.length,
        icon: "list",
        hint: cleared + " cleared · " + blank + " blank",
        scale: listScale
      },
      {
        key: "steps",
        label: "Sub-steps",
        value: steps,
        icon: "tag",
        hint: steps ? "Nested under the parent items" : "No nested steps yet",
        scale: stepScale
      }
    ];

    statsHost.innerHTML = stats.map(function (stat, index) {
      return '<article class="ls-metric is-' + stat.key + '" style="--ls-fill-scale:' + Math.max(0, Math.min(1, stat.scale)).toFixed(2) + '">' +
        '<div class="ls-metric-top">' +
        '<span class="ls-metric-label">' + Z.icon(stat.icon) + esc(stat.label) + "</span>" +
        '<span class="ls-metric-index">0' + (index + 1) + "</span>" +
        "</div>" +
        '<div class="ls-metric-value">' + stat.value + "</div>" +
        '<p class="ls-metric-hint">' + esc(stat.hint) + "</p>" +
        "</article>";
    }).join("");
  }

  function emptyFocusMarkup() {
    return '<article class="ls-focus-card is-empty">' +
      '<div class="ls-focus-empty">' +
      '<span class="ls-focus-empty-mark">' + Z.icon("list") + "</span>" +
      '<p class="ls-focus-kicker">A fresh notebook</p>' +
      "<h2>No list yet.</h2>" +
      "<p>Start with one thing that needs more than a single thought. The steps can follow.</p>" +
      '<button type="button" class="btn btn-primary btn-sm" data-open-new-list>' + Z.icon("plus") + "New list</button>" +
      "</div></article>";
  }

  function renderFocus() {
    if (!lists.length) {
      focusHost.innerHTML = emptyFocusMarkup();
      return;
    }

    var list = activeList();
    if (!list) {
      focusHost.innerHTML = emptyFocusMarkup();
      return;
    }

    var kind = listKind(list);
    var p = itemProgress(list);
    var next = nextOpenFor(list);
    var isClear = p.total > 0 && p.open === 0;
    var index = lists.indexOf(list) + 1;
    var openLabel = !p.total ? "Blank" : (isClear ? "All clear" : p.open + " open");
    var meta = [
      "<span>" + esc(openLabel) + "</span>",
      "<span>" + plural(list.items.length, "item", "items") + "</span>",
      "<span>" + esc(startedLabel(list)) + "</span>"
    ].join('<span class="ls-meta-dot" aria-hidden="true"></span>');

    var nextBlock = "";

    if (!p.total) {
      nextBlock = '<div class="ls-focus-next is-blank">' +
        '<div class="ls-focus-next-copy">' +
        '<span class="ls-focus-next-label">Blank page</span>' +
        "<strong>Add the first line</strong>" +
        "<small>One item is enough to begin.</small>" +
        "</div>" +
        '<button type="button" class="ls-jump ls-focus-jump" data-focus-composer>Add a line ' + Z.icon("plus") + "</button>" +
        "</div>";
    } else if (isClear) {
      var other = nextOpenList(list.id);
      if (other) {
        var otherProgress = itemProgress(other);
        nextBlock = '<div class="ls-focus-next is-clear">' +
          '<div class="ls-focus-next-copy">' +
          '<span class="ls-focus-next-label">This list is clear</span>' +
          "<strong>Next: " + esc(other.title) + "</strong>" +
          "<small>" + otherProgress.open + " open · " + plural(other.items.length, "item", "items") + "</small>" +
          "</div>" +
          '<button type="button" class="ls-jump ls-focus-jump" data-next-list="' + esc(other.id) + '" aria-label="Open next list: ' + esc(other.title) + '">Open next ' + Z.icon("arrowRight") + "</button>" +
          "</div>";
      } else {
        nextBlock = '<div class="ls-focus-next is-clear">' +
          '<div class="ls-focus-next-copy">' +
          '<span class="ls-focus-next-label">Every list is clear</span>' +
          "<strong>Nothing left to cross off.</strong>" +
          "<small>Start a fresh page when you are ready.</small>" +
          "</div>" +
          '<button type="button" class="ls-jump ls-focus-jump" data-open-new-list>' + Z.icon("plus") + "New list</button>" +
          "</div>";
      }
    } else if (next) {
      nextBlock = '<div class="ls-focus-next">' +
        '<div class="ls-focus-next-copy">' +
        '<span class="ls-focus-next-label">Next up</span>' +
        "<strong>" + esc(next.text) + "</strong>" +
        (next.child ? "<small>Under " + esc(next.item.text) + "</small>" : "") +
        "</div>" +
        '<button type="button" class="ls-jump ls-focus-jump" data-jump-item="' + esc(next.item.id) + '"' +
        (next.child ? ' data-jump-child="' + esc(next.child.id) + '"' : "") +
        ' aria-label="Jump to ' + esc(next.text) + '">Jump ' + Z.icon("arrowRight") + "</button>" +
        "</div>";
    }

    focusHost.innerHTML = '<article class="ls-focus-card ls-kind-' + kind.key + (isClear ? " is-clear" : "") + '">' +
      '<div class="ls-focus-top">' +
      '<span class="ls-focus-kicker">Current list</span>' +
      '<span class="ls-focus-index">List ' + pad2(index) + "</span>" +
      "</div>" +
      '<div class="ls-focus-body">' +
      '<div class="ls-focus-copy">' +
      '<span class="ls-focus-kind"><span class="ls-focus-kind-mark">' + kindIcon(kind) + "</span><span>" + esc(kind.label) + " list</span></span>" +
      '<h2 class="ls-focus-title">' + esc(list.title) + "</h2>" +
      '<p class="ls-focus-meta">' + meta + "</p>" +
      "</div>" +
      '<div class="ls-dial" style="--ls-p:' + p.pct + '" role="img" aria-label="' + p.pct + '% complete">' +
      '<span class="ls-dial-value"><strong>' + p.pct + "</strong><small>%</small></span>" +
      "</div>" +
      "</div>" +
      nextBlock +
      "</article>";
  }

  function updateListTabs() {
    var counts = { all: lists.length, open: 0, done: 0 };
    lists.forEach(function (list) {
      var p = itemProgress(list);
      if (p.total > 0 && p.open === 0) counts.done += 1;
      else if (p.open > 0) counts.open += 1;
    });

    listFilters.querySelectorAll("[data-list-filter]").forEach(function (button) {
      var key = button.getAttribute("data-list-filter");
      var active = key === listFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      var count = button.querySelector("[data-list-filter-count]");
      if (count) count.textContent = counts[key];
    });
  }

  function listEntryMarkup(list, query) {
    var p = itemProgress(list);
    var kind = listKind(list);
    var status = listStatus(list);
    var active = list.id === selectedId;
    var steps = childCount(list);
    var info = query ? listSearchInfo(list, query) : null;
    var countLabel = status === "blank" ? "Blank" : (status === "done" ? "Clear" : p.open + " open");
    var countClass = status === "done" ? " is-clear" : (status === "blank" ? " is-blank" : "");
    var classes = "ls-entry ls-kind-" + kind.key +
      (active ? " is-active" : "") +
      (status === "done" ? " is-done" : "") +
      (status === "blank" ? " is-blank" : "");
    var meta = esc(kind.label) + " · " + plural(list.items.length, "item", "items") +
      (steps ? " · " + plural(steps, "step", "steps") : "");
    var snippet = info && info.matches.length
      ? '<span class="ls-entry-match">' + Z.icon("search") + "<span>" + highlightText(info.matches[0], query) + "</span></span>"
      : "";

    return '<button type="button" class="' + classes + '" data-list-id="' + esc(list.id) + '"' +
      (active ? ' aria-current="true"' : "") + ">" +
      '<span class="ls-entry-mark">' + kindIcon(kind) + "</span>" +
      '<span class="ls-entry-body">' +
      '<span class="ls-entry-top">' +
      '<span class="ls-entry-name">' + highlightText(list.title, query) + "</span>" +
      '<span class="ls-entry-count' + countClass + '">' + esc(countLabel) + "</span>" +
      "</span>" +
      '<span class="ls-entry-meta">' + meta + "</span>" +
      snippet +
      '<span class="ls-entry-progress" aria-hidden="true"><span style="width:' + p.pct + '%"></span></span>' +
      "</span>" +
      "</button>";
  }

  function renderIndexEmpty() {
    var query = queryValue();
    var title;
    var text;
    var label;

    if (query) {
      title = "No matches.";
      text = "Nothing in the index contains “" + esc(searchQuery.trim()) + "”.";
      label = "Clear search";
    } else if (listFilter === "done") {
      title = "Nothing cleared yet.";
      text = "Finished lists will collect here once every box is crossed off.";
      label = "Show all lists";
    } else {
      title = "Nothing in motion.";
      text = "Every list has been cleared or is waiting for its first line.";
      label = "Show all lists";
    }

    return '<div class="ls-index-empty">' + Z.icon(query ? "search" : "list") +
      "<h3>" + title + "</h3><p>" + text + "</p>" +
      '<button type="button" class="ls-text-btn" data-reset-list-view>' + Z.icon("refresh") + esc(label) + "</button>" +
      "</div>";
  }

  function renderIndex() {
    updateListTabs();
    var query = queryValue();
    var visible = visibleLists();

    if (!lists.length) {
      listCount.textContent = "empty";
    } else if (visible.length === lists.length) {
      listCount.textContent = plural(lists.length, "list", "lists");
    } else {
      listCount.textContent = visible.length + " of " + lists.length;
    }

    if (!lists.length) {
      indexHost.innerHTML = '<div class="ls-index-empty">' + Z.icon("list") +
        "<h3>No lists yet.</h3><p>A list is a good place to put a week, a trip, or a Tuesday.</p>" +
        '<button type="button" class="ls-text-btn" data-open-new-list>' + Z.icon("plus") + "New list</button>" +
        "</div>";
      return;
    }

    if (!visible.length) {
      indexHost.innerHTML = renderIndexEmpty();
      return;
    }

    var groups = [];

    if (query) {
      groups = [{ label: "Matches", lists: visible }];
    } else if (listFilter === "open") {
      groups = [{ label: "In progress", lists: visible }];
    } else if (listFilter === "done") {
      groups = [{ label: "Cleared", lists: visible }];
    } else {
      var open = [];
      var cleared = [];
      var blank = [];
      visible.forEach(function (list) {
        var status = listStatus(list);
        if (status === "done") cleared.push(list);
        else if (status === "blank") blank.push(list);
        else open.push(list);
      });
      if (open.length) groups.push({ label: "In progress", lists: open });
      if (cleared.length) groups.push({ label: "Cleared", lists: cleared });
      if (blank.length) groups.push({ label: "Blank lists", lists: blank });
    }

    indexHost.innerHTML = groups.map(function (group) {
      return '<div class="ls-index-group">' +
        '<div class="ls-index-group-head"><span>' + esc(group.label) + "</span><span>" + group.lists.length + "</span></div>" +
        group.lists.map(function (list) { return listEntryMarkup(list, query); }).join("") +
        "</div>";
    }).join("");
  }

  function nextStripMarkup(p, next) {
    if (!p.total) {
      return '<div class="ls-next-strip is-blank">' +
        '<span class="ls-next-mark">' + Z.icon("plus") + "</span>" +
        '<span class="ls-next-copy"><span>Blank page</span><strong>Add the first line above.</strong></span>' +
        "</div>";
    }

    if (!next) {
      return '<div class="ls-next-strip is-clear">' +
        '<span class="ls-next-mark">' + Z.icon("check") + "</span>" +
        '<span class="ls-next-copy"><span>All clear</span><strong>Every box on this list is crossed.</strong></span>' +
        "</div>";
    }

    return '<div class="ls-next-strip">' +
      '<span class="ls-next-mark">' + Z.icon("arrowRight") + "</span>" +
      '<span class="ls-next-copy">' +
      "<span>Next up</span>" +
      "<strong>" + esc(next.text) + "</strong>" +
      (next.child ? "<small>Under " + esc(next.item.text) + "</small>" : "") +
      "</span>" +
      '<button type="button" class="ls-jump" data-jump-item="' + esc(next.item.id) + '"' +
      (next.child ? ' data-jump-child="' + esc(next.child.id) + '"' : "") +
      ' aria-label="Jump to ' + esc(next.text) + '">Jump ' + Z.icon("arrowRight") + "</button>" +
      "</div>";
  }

  function itemTabsMarkup(counts) {
    var specifications = [
      { key: "all", label: "All" },
      { key: "open", label: "Open" },
      { key: "done", label: "Done" }
    ];

    return specifications.map(function (specification) {
      var active = itemFilter === specification.key;
      return '<button type="button" class="ls-item-tab' + (active ? " is-active" : "") + '" data-item-filter="' + specification.key + '" aria-pressed="' + active + '">' +
        specification.label + " <span>" + counts[specification.key] + "</span></button>";
    }).join("");
  }

  function emptyListMarkup() {
    return '<div class="ls-empty-list">' +
      '<span class="ls-empty-list-mark">' + Z.icon("list") + "</span>" +
      "<h3>A blank page.</h3>" +
      "<p>Add the first line above. Steps can follow when the thing has parts.</p>" +
      '<div class="ls-empty-lines" aria-hidden="true"><span></span><span></span><span></span></div>' +
      "</div>";
  }

  function filteredEmptyMarkup() {
    var doneMode = itemFilter === "done";
    return '<div class="ls-filter-empty">' +
      '<span class="ls-filter-empty-mark">' + (doneMode ? Z.icon("check") : Z.icon("list")) + "</span>" +
      "<h3>" + (doneMode ? "Nothing crossed off yet." : "Every item is clear.") + "</h3>" +
      "<p>" + (doneMode
        ? "The first tick is still ahead. Switch back to all items to see the list."
        : "This view is empty because every item here has been crossed off.") + "</p>" +
      '<button type="button" class="btn btn-sm" data-show-all-items>Show all items</button>' +
      "</div>";
  }

  function childMarkup(item, child, query) {
    var classes = "ls-step" +
      (child.done ? " is-done" : "") +
      (lastPulse === child.id ? " is-pulse" : "");
    var checkLabel = child.done
      ? "Mark step not done: " + child.text
      : "Mark step done: " + child.text;

    return '<div class="' + classes + '" data-step-id="' + esc(child.id) + '">' +
      '<button type="button" class="ls-step-check" data-toggle-child="' + esc(child.id) + '" data-parent-id="' + esc(item.id) + '" role="checkbox" aria-checked="' + (child.done ? "true" : "false") + '" aria-label="' + esc(checkLabel) + '">' + (child.done ? CHECK : "") + "</button>" +
      '<span class="ls-step-label">' + highlightText(child.text, query) + "</span>" +
      '<span class="ls-step-actions">' +
      '<button type="button" class="ls-step-action" data-rename-child="' + esc(child.id) + '" data-parent-id="' + esc(item.id) + '" aria-label="Rename step: ' + esc(child.text) + '" title="Rename step">' + Z.icon("pencil") + "</button>" +
      '<button type="button" class="ls-step-action is-danger" data-delete-child="' + esc(child.id) + '" data-parent-id="' + esc(item.id) + '" aria-label="Delete step: ' + esc(child.text) + '" title="Delete step">' + Z.icon("trash") + "</button>" +
      "</span>" +
      "</div>";
  }

  function itemMarkup(item, index, list, query) {
    var children = item.children || [];
    var doneChildren = children.filter(function (child) { return child.done; }).length;
    var partial = !item.done && doneChildren > 0 && doneChildren < children.length;
    var stepPct = children.length ? Math.round((doneChildren / children.length) * 100) : 0;
    var upDisabled = index === 0;
    var downDisabled = index === list.items.length - 1;
    var classes = "ls-item" +
      (item.done ? " is-done" : "") +
      (partial ? " is-partial" : "") +
      (lastPulse === item.id ? " is-pulse" : "");
    var checked = item.done ? "true" : (partial ? "mixed" : "false");
    var checkLabel = item.done
      ? "Mark item not done: " + item.text
      : "Mark item done: " + item.text;
    var meta = children.length
      ? '<div class="ls-item-meta"><span class="ls-step-count">' + doneChildren + " of " + children.length + " " + noun(children.length, "step", "steps") + '</span><span class="ls-mini-track" aria-hidden="true"><span style="width:' + stepPct + '%"></span></span></div>'
      : "";
    var subForm = addingSubFor === item.id
      ? '<form class="ls-step-add" data-sub-form data-parent-id="' + esc(item.id) + '">' +
        '<label class="sr-only" for="sub-input-' + esc(item.id) + '">New step for ' + esc(item.text) + "</label>" +
        '<input type="text" id="sub-input-' + esc(item.id) + '" data-sub-input maxlength="140" placeholder="Add a step…" required>' +
        '<button type="submit" class="btn btn-sm">Add</button>' +
        '<button type="button" class="ls-step-cancel" data-cancel-sub aria-label="Cancel new step for ' + esc(item.text) + '">' + Z.icon("close") + "</button>" +
        "</form>"
      : "";

    return '<article class="' + classes + '" data-item-id="' + esc(item.id) + '">' +
      '<span class="ls-item-index" aria-hidden="true">' + pad2(index + 1) + "</span>" +
      '<button type="button" class="ls-check" data-toggle-item="' + esc(item.id) + '" role="checkbox" aria-checked="' + checked + '" aria-label="' + esc(checkLabel) + '">' + (item.done ? CHECK : "") + "</button>" +
      '<div class="ls-item-main">' +
      '<div class="ls-item-head">' +
      '<div class="ls-item-copy">' +
      '<div class="ls-item-label">' + highlightText(item.text, query) + "</div>" +
      meta +
      "</div>" +
      '<div class="ls-item-actions">' +
      '<button type="button" class="ls-item-action" data-move-item="up" data-item-id="' + esc(item.id) + '" aria-label="Move item up: ' + esc(item.text) + '" title="Move up"' + (upDisabled ? " disabled" : "") + ">" + Z.icon("up") + "</button>" +
      '<button type="button" class="ls-item-action" data-move-item="down" data-item-id="' + esc(item.id) + '" aria-label="Move item down: ' + esc(item.text) + '" title="Move down"' + (downDisabled ? " disabled" : "") + ">" + Z.icon("down") + "</button>" +
      '<button type="button" class="ls-item-action" data-add-sub="' + esc(item.id) + '" aria-label="Add a step beneath: ' + esc(item.text) + '" title="Add a step">' + Z.icon("plus") + "</button>" +
      '<button type="button" class="ls-item-action" data-rename-item="' + esc(item.id) + '" aria-label="Rename item: ' + esc(item.text) + '" title="Rename item">' + Z.icon("pencil") + "</button>" +
      '<button type="button" class="ls-item-action is-danger" data-delete-item="' + esc(item.id) + '" aria-label="Delete item: ' + esc(item.text) + '" title="Delete item">' + Z.icon("trash") + "</button>" +
      "</div>" +
      "</div>" +
      (children.length ? '<div class="ls-steps">' + children.map(function (child) { return childMarkup(item, child, query); }).join("") + "</div>" : "") +
      subForm +
      "</div>" +
      "</article>";
  }

  function emptyDetailMarkup() {
    return '<section class="ls-sheet ls-sheet-empty">' +
      '<div class="ls-empty-page">' +
      '<span class="ls-empty-page-mark">' + Z.icon("list") + "</span>" +
      '<p class="ls-guide-kicker">Blank notebook</p>' +
      "<h2>No list, no steps.</h2>" +
      "<p>Start with one thing that needs more than a single line. Give it a name, then break it into the smallest useful pieces.</p>" +
      '<button type="button" class="btn btn-primary" data-open-new-list>' + Z.icon("plus") + "New list</button>" +
      '<div class="ls-empty-page-lines" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
      "</div></section>";
  }

  function renderDetail() {
    var list = activeList();

    if (!list) {
      detailHost.innerHTML = emptyDetailMarkup();
      return;
    }

    var query = queryValue();
    var searchInfo = query ? listSearchInfo(list, query) : null;
    var p = itemProgress(list);
    var steps = childCount(list);
    var kind = listKind(list);
    var index = lists.indexOf(list) + 1;
    var counts = itemCounts(list);
    var filtered = (list.items || []).filter(function (item) {
      if (itemFilter === "open") return !item.done;
      if (itemFilter === "done") return !!item.done;
      return true;
    });
    var isClear = p.total > 0 && p.open === 0;
    var next = nextOpenFor(list);
    var matchCount = searchInfo ? searchInfo.count : 0;

    var subBits = [
      "<span>" + esc(startedLabel(list)) + "</span>",
      "<span>" + plural(list.items.length, "item", "items") + "</span>"
    ];
    if (steps) subBits.push("<span>" + plural(steps, "step", "steps") + "</span>");
    if (matchCount) {
      subBits.push('<span class="ls-search-note">' + Z.icon("search") + plural(matchCount, "match", "matches") + " highlighted</span>");
    }

    var itemsMarkup;
    if (!list.items.length) {
      itemsMarkup = emptyListMarkup();
    } else if (!filtered.length) {
      itemsMarkup = filteredEmptyMarkup();
    } else {
      itemsMarkup = '<div class="ls-items">' + filtered.map(function (item) {
        return itemMarkup(item, list.items.indexOf(item), list, query);
      }).join("") + "</div>";
    }

    var itemsMeta = !list.items.length
      ? "No items yet"
      : (itemFilter === "all"
        ? plural(list.items.length, "item", "items")
        : filtered.length + " of " + plural(list.items.length, "item", "items") + " shown");
    var progressText = p.total ? p.done + " of " + p.total + " done" : "No checks yet";

    detailHost.innerHTML = '<section class="ls-sheet ls-kind-' + kind.key + (isClear ? " is-clear" : "") + '">' +
      '<header class="ls-sheet-head">' +
      '<div class="ls-sheet-title-wrap">' +
      '<div class="ls-sheet-kicker">' +
      '<span class="ls-sheet-kindmark">' + kindIcon(kind) + "</span>" +
      '<span class="ls-sheet-kind">' + esc(kind.label) + " list</span>" +
      '<span class="ls-sheet-page">List ' + pad2(index) + "</span>" +
      "</div>" +
      '<h2 class="ls-sheet-title">' + esc(list.title) + "</h2>" +
      '<p class="ls-sheet-sub">' + subBits.join('<span class="ls-meta-dot" aria-hidden="true"></span>') + "</p>" +
      "</div>" +
      '<div class="ls-sheet-tools">' +
      '<button type="button" class="ls-tool" data-copy-list aria-label="Copy list as text" title="Copy list as text">' + Z.icon("copy") + "</button>" +
      '<button type="button" class="ls-tool" data-rename-list aria-label="Rename list" title="Rename list">' + Z.icon("pencil") + "</button>" +
      '<button type="button" class="ls-tool is-danger" data-delete-list aria-label="Delete list" title="Delete list">' + Z.icon("trash") + "</button>" +
      "</div>" +
      "</header>" +
      '<div class="ls-progress-block">' +
      '<div class="ls-progress-top">' +
      '<span class="ls-progress-label">Progress</span>' +
      '<span class="ls-progress-count">' + progressText + "</span>" +
      '<span class="ls-progress-pct">' + p.pct + "%</span>" +
      "</div>" +
      '<div class="ls-progress-track" aria-hidden="true"><span style="width:' + p.pct + '%"></span></div>' +
      nextStripMarkup(p, next) +
      "</div>" +
      '<form class="ls-composer" data-item-form>' +
      '<span class="ls-composer-mark">' + Z.icon("plus") + "</span>" +
      '<label class="sr-only" for="item-add-input">Add an item to ' + esc(list.title) + "</label>" +
      '<input type="text" id="item-add-input" maxlength="140" placeholder="Add a line to this list…" autocomplete="off" required>' +
      '<button type="submit" class="btn btn-primary">Add</button>' +
      "</form>" +
      '<div class="ls-items-bar">' +
      '<div class="ls-item-tabs" role="group" aria-label="Filter items in this list">' + itemTabsMarkup(counts) + "</div>" +
      '<span class="ls-items-meta">' + esc(itemsMeta) + "</span>" +
      "</div>" +
      itemsMarkup +
      "</section>";
  }

  function renderAll() {
    renderHeroMeta();
    renderStats();
    renderIndex();
    renderFocus();
    renderDetail();
  }

  /* ------------------------------------------------------------------------
     Dialog
     ------------------------------------------------------------------------ */

  function renderTemplates() {
    templateGrid.innerHTML = TEMPLATES.map(function (template) {
      var kind = KINDS[template.kind] || KINDS.other;
      return '<button type="button" class="ls-template ls-kind-' + kind.key + '" data-template-id="' + esc(template.id) + '" aria-pressed="false">' +
        '<span class="ls-template-mark">' + kindIcon(kind) + "</span>" +
        '<span class="ls-template-copy">' +
        '<span class="ls-template-name">' + esc(template.name) + "</span>" +
        '<span class="ls-template-hint">' + esc(templateSummary(template)) + "</span>" +
        "</span>" +
        '<span class="ls-template-check">' + Z.icon("check") + "</span>" +
        "</button>";
    }).join("");
  }

  function updateTemplateUI() {
    var template = templateById(templateId);
    templateGrid.querySelectorAll("[data-template-id]").forEach(function (button) {
      var active = button.getAttribute("data-template-id") === template.id;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    $("list-template-meta").textContent = templateSummary(template);
    $("list-template-hint").textContent = template.id === "blank"
      ? "A clean page. Add your own items and steps."
      : "Starts with " + templateSummary(template).toLowerCase() + ". Every line stays editable.";
  }

  function setDialog(target, heading, kicker, label, value, hint, saveLabel) {
    dialogTarget = target;
    templateField.hidden = target.kind !== "new";
    $("list-dialog-kicker").textContent = kicker;
    $("list-dialog-title").textContent = heading;
    $("list-title-label").textContent = label;
    $("list-title-hint").textContent = hint;
    $("list-save").textContent = saveLabel;
    listTitle.maxLength = target.kind === "new" || target.kind === "list" ? 80 : 140;
    listTitle.value = value || "";
    if (!listDialog.open) listDialog.showModal();
    window.setTimeout(function () {
      if (!listDialog.open) return;
      listTitle.focus();
      listTitle.select();
    }, 40);
  }

  function openNewList() {
    listForm.reset();
    templateId = "blank";
    setDialog(
      { kind: "new", listId: null, itemId: null, childId: null },
      "Start a list",
      "A new page",
      "List name",
      "",
      "You can add the individual steps next.",
      "Create list"
    );
    updateTemplateUI();
  }

  function openRenameList(list) {
    setDialog(
      { kind: "list", listId: list.id, itemId: null, childId: null },
      "Rename this list",
      "A better word",
      "List name",
      list.title,
      "The items inside stay exactly where they are.",
      "Save name"
    );
  }

  function openRenameItem(list, item) {
    setDialog(
      { kind: "item", listId: list.id, itemId: item.id, childId: null },
      "Rename this item",
      "A clearer line",
      "Item",
      item.text,
      "Steps beneath it are untouched.",
      "Save item"
    );
  }

  function openRenameChild(list, item, child) {
    setDialog(
      { kind: "child", listId: list.id, itemId: item.id, childId: child.id },
      "Rename this step",
      "A smaller thing",
      "Step",
      child.text,
      "It stays beneath the parent item.",
      "Save step"
    );
  }

  /* ------------------------------------------------------------------------
     Mutations
     ------------------------------------------------------------------------ */

  function resetSearchAndFilters() {
    searchQuery = "";
    searchInput.value = "";
    searchClear.hidden = true;
    listFilter = "all";
    itemFilter = "all";
    addingSubFor = null;
  }

  function setListFilter(next) {
    if (["all", "open", "done"].indexOf(next) === -1) next = "all";
    listFilter = next;
    ensureSelection();
    renderAll();
  }

  function selectList(id) {
    if (!findList(id)) return;
    selectedId = id;
    itemFilter = "all";
    addingSubFor = null;
    renderAll();
    scrollDetailIntoView();
  }

  function jumpToStep(itemId, childId) {
    var list = activeList();
    var item = findItem(list, itemId);

    if (!item) {
      for (var i = 0; i < lists.length; i += 1) {
        var possible = findItem(lists[i], itemId);
        if (possible) {
          list = lists[i];
          item = possible;
          selectedId = lists[i].id;
          break;
        }
      }
    }

    if (!item) return;

    itemFilter = "all";
    addingSubFor = null;
    setPulse(childId || itemId);
    renderAll();

    window.setTimeout(function () {
      var target = childId ? findData(detailHost, "data-step-id", childId) : null;
      if (!target) target = findData(detailHost, "data-item-id", item.id);
      if (target) target.scrollIntoView({ behavior: motionBehavior(), block: "center" });
    }, 70);
  }

  function focusComposer() {
    var input = $("item-add-input");
    if (!input) {
      openNewList();
      return;
    }
    input.scrollIntoView({ behavior: motionBehavior(), block: "center" });
    window.setTimeout(function () {
      input.focus({ preventScroll: true });
    }, 260);
  }

  function copyList(list) {
    Z.copy(listAsText(list));
  }

  function exportLists() {
    if (!lists.length) return;
    var rows = [["List", "Started", "Item", "Step", "Status"]];

    lists.forEach(function (list) {
      if (!list.items.length) {
        rows.push([list.title, list.createdAt || "", "", "", "Empty"]);
      }
      list.items.forEach(function (item) {
        rows.push([list.title, list.createdAt || "", item.text, "", item.done ? "Done" : "Open"]);
        (item.children || []).forEach(function (child) {
          rows.push([list.title, list.createdAt || "", item.text, child.text, child.done ? "Done" : "Open"]);
        });
      });
    });

    Z.download("zone-lists-" + Z.todayISO() + ".csv", Z.csv(rows), "text/csv;charset=utf-8");
    Z.toast("Lists exported.");
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  function bindEvents() {
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-open-new-list]")) {
        openNewList();
        return;
      }

      var jump = event.target.closest("[data-jump-item]");
      if (jump) {
        jumpToStep(jump.getAttribute("data-jump-item"), jump.getAttribute("data-jump-child"));
        return;
      }

      var nextList = event.target.closest("[data-next-list]");
      if (nextList) {
        resetSearchAndFilters();
        selectList(nextList.getAttribute("data-next-list"));
        return;
      }

      if (event.target.closest("[data-focus-composer]")) {
        focusComposer();
      }
    });

    exportButton.addEventListener("click", exportLists);

    searchInput.addEventListener("input", function () {
      searchQuery = searchInput.value;
      searchClear.hidden = !searchQuery.trim();
      if (searchQuery.trim() && listFilter !== "all") listFilter = "all";
      ensureSelection();
      renderAll();
    });

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (searchInput.value) {
          searchQuery = "";
          searchInput.value = "";
          searchClear.hidden = true;
          ensureSelection();
          renderAll();
        } else {
          searchInput.blur();
        }
        event.preventDefault();
        event.stopPropagation();
      }
    });

    searchClear.addEventListener("click", function () {
      searchQuery = "";
      searchInput.value = "";
      searchClear.hidden = true;
      ensureSelection();
      renderAll();
      searchInput.focus();
    });

    document.addEventListener("keydown", function (event) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== "/") return;

      var target = event.target;
      var tag = target && target.tagName ? target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select" || (target && target.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;

      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    });

    listFilters.addEventListener("click", function (event) {
      var button = event.target.closest("[data-list-filter]");
      if (!button) return;
      setListFilter(button.getAttribute("data-list-filter"));
    });

    indexHost.addEventListener("click", function (event) {
      var card = event.target.closest("[data-list-id]");
      if (card) {
        selectList(card.getAttribute("data-list-id"));
        return;
      }

      if (event.target.closest("[data-reset-list-view]")) {
        resetSearchAndFilters();
        ensureSelection();
        renderAll();
        searchInput.focus();
      }
    });

    document.querySelectorAll("[data-close-list]").forEach(function (button) {
      button.addEventListener("click", function () {
        listDialog.close();
      });
    });

    templateGrid.addEventListener("click", function (event) {
      var button = event.target.closest("[data-template-id]");
      if (!button) return;

      var previous = templateById(templateId);
      var next = templateById(button.getAttribute("data-template-id"));
      var currentTitle = listTitle.value.trim();

      if (!currentTitle || currentTitle === previous.name) {
        listTitle.value = next.id === "blank" ? "" : next.name;
      }

      templateId = next.id;
      updateTemplateUI();
    });

    listForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = listTitle.value.trim();

      if (!text) {
        Z.toast("Write something first.", "error");
        listTitle.focus();
        return;
      }

      if (dialogTarget.kind === "new") {
        var template = templateById(templateId);
        var list = {
          id: Z.uid("list"),
          title: text,
          createdAt: Z.todayISO(),
          items: buildTemplateItems(template)
        };
        lists.push(list);
        selectedId = list.id;
        resetSearchAndFilters();
        save();
        Z.toast(template.id === "blank" ? "List created." : "Created from " + template.name + ".");
      } else if (dialogTarget.kind === "list") {
        var listToRename = findList(dialogTarget.listId);
        if (!listToRename) return;
        listToRename.title = text;
        save();
        Z.toast("List renamed.");
      } else if (dialogTarget.kind === "item") {
        var listForItem = findList(dialogTarget.listId);
        var item = findItem(listForItem, dialogTarget.itemId);
        if (!item) return;
        item.text = text;
        save();
        Z.toast("Item renamed.");
      } else if (dialogTarget.kind === "child") {
        var listForChild = findList(dialogTarget.listId);
        var parent = findItem(listForChild, dialogTarget.itemId);
        var child = findChild(parent, dialogTarget.childId);
        if (!child) return;
        child.text = text;
        save();
        Z.toast("Step renamed.");
      }

      listDialog.close();
      renderAll();
      scrollDetailIntoView();
    });

    detailHost.addEventListener("submit", function (event) {
      var form = event.target.closest("form");
      if (!form || !form.matches("[data-item-form], [data-sub-form]")) return;
      event.preventDefault();

      var list = activeList();
      if (!list) return;

      if (form.matches("[data-item-form]")) {
        var input = form.querySelector("input");
        var text = input.value.trim();
        if (!text) {
          input.focus();
          return;
        }
        list.items.push({ id: Z.uid("li"), text: text, done: false, children: [] });
        itemFilter = "all";
        if (listFilter === "done") listFilter = "all";
        save();
        renderAll();
        window.setTimeout(function () {
          var field = $("item-add-input");
          if (field) field.focus();
        }, 30);
        return;
      }

      var parentId = form.getAttribute("data-parent-id");
      var parent = findItem(list, parentId);
      if (!parent) return;
      var subInput = form.querySelector("input");
      var subText = subInput.value.trim();
      if (!subText) {
        subInput.focus();
        return;
      }

      parent.children.push({ id: Z.uid("lc"), text: subText, done: false });
      parent.done = false;
      addingSubFor = null;
      itemFilter = "all";
      if (listFilter === "done") listFilter = "all";
      save();
      renderAll();
      window.setTimeout(function () {
        var addButton = findData(detailHost, "data-add-sub", parent.id);
        if (addButton) addButton.focus();
      }, 30);
    });

    detailHost.addEventListener("click", function (event) {
      var list = activeList();
      if (!list) return;

      var itemFilterButton = event.target.closest("[data-item-filter]");
      if (itemFilterButton) {
        var nextItemFilter = itemFilterButton.getAttribute("data-item-filter");
        if (["all", "open", "done"].indexOf(nextItemFilter) === -1) nextItemFilter = "all";
        itemFilter = nextItemFilter;
        renderDetail();
        var activeFilter = detailHost.querySelector('[data-item-filter="' + nextItemFilter + '"]');
        if (activeFilter) activeFilter.focus();
        return;
      }

      if (event.target.closest("[data-show-all-items]")) {
        itemFilter = "all";
        renderDetail();
        var composer = $("item-add-input");
        if (composer) composer.focus();
        return;
      }

      if (event.target.closest("[data-copy-list]")) {
        copyList(list);
        return;
      }

      if (event.target.closest("[data-rename-list]")) {
        openRenameList(list);
        return;
      }

      if (event.target.closest("[data-delete-list]")) {
        var nestedSteps = childCount(list);
        var contents = list.items.length
          ? plural(list.items.length, "item", "items") +
            (nestedSteps ? " and " + plural(nestedSteps, "step", "steps") : "")
          : "its blank page";
        Z.confirm({
          kicker: "Delete list",
          title: "Remove " + list.title + "?",
          message: "This deletes <strong>" + esc(list.title) + "</strong> and " + contents + ". It cannot be undone.",
          label: "Delete list"
        }).then(function (ok) {
          if (!ok) return;
          lists = lists.filter(function (entry) { return entry.id !== list.id; });
          selectedId = null;
          if (!lists.length) {
            resetSearchAndFilters();
          } else {
            var visible = visibleLists();
            if (!visible.length) {
              searchQuery = "";
              searchInput.value = "";
              searchClear.hidden = true;
              listFilter = "all";
              visible = visibleLists();
            }
            selectedId = visible.length ? visible[0].id : lists[0].id;
            itemFilter = "all";
            addingSubFor = null;
          }
          save();
          renderAll();
          Z.toast("List deleted.");
        });
        return;
      }

      var toggleItem = event.target.closest("[data-toggle-item]");
      if (toggleItem) {
        var item = findItem(list, toggleItem.getAttribute("data-toggle-item"));
        if (!item) return;
        var wasOpen = itemProgress(list).open;
        var itemWasDone = !!item.done;
        item.done = !itemWasDone;
        (item.children || []).forEach(function (child) { child.done = item.done; });
        save();
        setPulse(item.id);
        renderAll();
        var itemToggleFocus = findData(detailHost, "data-toggle-item", item.id);
        if (itemToggleFocus) itemToggleFocus.focus({ preventScroll: true });
        if (!itemWasDone && wasOpen > 0 && itemProgress(list).open === 0) {
          Z.toast("List cleared — every box is crossed.");
        }
        return;
      }

      var toggleChild = event.target.closest("[data-toggle-child]");
      if (toggleChild) {
        var parent = findItem(list, toggleChild.getAttribute("data-parent-id"));
        var child = findChild(parent, toggleChild.getAttribute("data-toggle-child"));
        if (!parent || !child) return;
        var childWasDone = !!child.done;
        var openBefore = itemProgress(list).open;
        child.done = !childWasDone;
        syncParentDone(parent);
        save();
        setPulse(child.id);
        renderAll();
        var childToggleFocus = findData(detailHost, "data-toggle-child", child.id);
        if (childToggleFocus) childToggleFocus.focus({ preventScroll: true });
        if (!childWasDone && openBefore > 0 && itemProgress(list).open === 0) {
          Z.toast("List cleared — every box is crossed.");
        }
        return;
      }

      var move = event.target.closest("[data-move-item]");
      if (move) {
        var moveItem = findItem(list, move.getAttribute("data-item-id"));
        if (!moveItem) return;
        var index = list.items.indexOf(moveItem);
        var swapWith = move.getAttribute("data-move-item") === "up" ? index - 1 : index + 1;
        if (index < 0 || swapWith < 0 || swapWith >= list.items.length) return;
        var temp = list.items[index];
        list.items[index] = list.items[swapWith];
        list.items[swapWith] = temp;
        save();
        setPulse(moveItem.id);
        renderAll();
        return;
      }

      var addSub = event.target.closest("[data-add-sub]");
      if (addSub) {
        var parentId = addSub.getAttribute("data-add-sub");
        addingSubFor = addingSubFor === parentId ? null : parentId;
        renderDetail();
        window.setTimeout(function () {
          if (addingSubFor) {
            var field = detailHost.querySelector("[data-sub-input]");
            if (field) field.focus();
          } else {
            var addButton = findData(detailHost, "data-add-sub", parentId);
            if (addButton) addButton.focus();
          }
        }, 30);
        return;
      }

      if (event.target.closest("[data-cancel-sub]")) {
        var cancelParentId = addingSubFor;
        addingSubFor = null;
        renderDetail();
        window.setTimeout(function () {
          if (!cancelParentId) return;
          var cancelButton = findData(detailHost, "data-add-sub", cancelParentId);
          if (cancelButton) cancelButton.focus();
        }, 30);
        return;
      }

      var renameItem = event.target.closest("[data-rename-item]");
      if (renameItem) {
        var itemToRename = findItem(list, renameItem.getAttribute("data-rename-item"));
        if (itemToRename) openRenameItem(list, itemToRename);
        return;
      }

      var deleteItem = event.target.closest("[data-delete-item]");
      if (deleteItem) {
        var itemToDelete = findItem(list, deleteItem.getAttribute("data-delete-item"));
        if (!itemToDelete) return;
        Z.confirm({
          kicker: "Delete item",
          title: "Remove this item?",
          message: "Delete <strong>" + esc(itemToDelete.text) + "</strong>" +
            (itemToDelete.children.length ? " and its " + plural(itemToDelete.children.length, "step", "steps") : "") + "?",
          label: "Delete item"
        }).then(function (ok) {
          if (!ok) return;
          list.items = list.items.filter(function (entry) { return entry.id !== itemToDelete.id; });
          if (addingSubFor === itemToDelete.id) addingSubFor = null;
          save();
          renderAll();
          Z.toast("Item deleted.");
        });
        return;
      }

      var renameChild = event.target.closest("[data-rename-child]");
      if (renameChild) {
        var parentForRename = findItem(list, renameChild.getAttribute("data-parent-id"));
        var childForRename = findChild(parentForRename, renameChild.getAttribute("data-rename-child"));
        if (childForRename) openRenameChild(list, parentForRename, childForRename);
        return;
      }

      var deleteChild = event.target.closest("[data-delete-child]");
      if (deleteChild) {
        var parentForDelete = findItem(list, deleteChild.getAttribute("data-parent-id"));
        var childForDelete = findChild(parentForDelete, deleteChild.getAttribute("data-delete-child"));
        if (!parentForDelete || !childForDelete) return;
        Z.confirm({
          kicker: "Delete step",
          title: "Remove this step?",
          message: "Delete <strong>" + esc(childForDelete.text) + "</strong> from the list?",
          label: "Delete step"
        }).then(function (ok) {
          if (!ok) return;
          parentForDelete.children = parentForDelete.children.filter(function (entry) { return entry.id !== childForDelete.id; });
          if (parentForDelete.children.length) syncParentDone(parentForDelete);
          save();
          renderAll();
          Z.toast("Step deleted.");
        });
      }
    });
  }

  renderTemplates();
  updateTemplateUI();
  bindEvents();
  renderAll();
})();
