/* Zone — admin
   An operator console: live change review, rollback, and a full D1-synced trail.
   ========================================================================== */

(function () {
  "use strict";

  var esc = Z.esc;
  var $ = function (id) { return document.getElementById(id); };

  var gate = $("admin-gate");
  var app = $("admin-app");
  var loginForm = $("admin-login");
  var codeInput = $("admin-code");
  var loginError = $("admin-error");
  var lockButton = $("admin-lock");
  var autoApproveInput = $("admin-auto-approve");

  var admin = loadAdmin();
  var state = {
    tab: "overview",
    q: "",
    tool: "all",
    status: "all",
    limit: 20,
    aq: "",
    atool: "all",
    aaction: "all",
    astatus: "all",
    alimit: 20
  };
  var lastRecords = [];

  /* ------------------------------------------------------------------------
     Admin state
     ------------------------------------------------------------------------ */

  function loadAdmin() {
    var data = Z.store.get("admin", null);
    if (!data || typeof data !== "object" || Array.isArray(data)) data = {};
    if (!data.settings || typeof data.settings !== "object") data.settings = {};
    if (typeof data.settings.autoApprove !== "boolean") data.settings.autoApprove = false;
    return data;
  }

  function saveAdmin() {
    Z.store.set("admin", admin);
  }

  /* ------------------------------------------------------------------------
     Workspace backups
     ------------------------------------------------------------------------ */

  var BACKUP_SECTIONS = {
    settings: { label: "Settings", type: "object" },
    diary: { label: "Diary", type: "array" },
    watchlist: { label: "Watchlist", type: "array" },
    trips: { label: "Mileage", type: "array" },
    money: { label: "Money", type: "object" },
    passbook: { label: "Passbook", type: "object" },
    split: { label: "Split", type: "object" },
    links: { label: "Links", type: "array" },
    lists: { label: "Lists", type: "array" },
    habits: { label: "Habits", type: "object" },
    subscriptions: { label: "Subscriptions", type: "array" },
    notes: { label: "Notes", type: "array" }
  };

  function backupSizeLabel() {
    var size = Z.store.size();
    if (size < 1024) return size + " B";
    return (size / 1024).toFixed(1) + " KB";
  }

  function renderStorageSummary() {
    var host = $("admin-storage-summary");
    if (!host) return;
    var keys = Z.store.keys().filter(function (key) { return BACKUP_SECTIONS[key]; });
    host.innerHTML = "<span>Storage</span><strong>" + backupSizeLabel() + "</strong>" +
      "<span>across</span><strong>" + keys.length + "</strong><span>sections · cached in this browser</span>";
  }

  function validateBackup(raw) {
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error("That file is not valid JSON.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("That does not look like a Zone backup.");
    }
    var data = parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data) ? parsed.data : parsed;
    var prepared = {};
    Object.keys(BACKUP_SECTIONS).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) return;
      var value = data[key];
      var expected = BACKUP_SECTIONS[key].type;
      var valid = expected === "array"
        ? Array.isArray(value)
        : value && typeof value === "object" && !Array.isArray(value);
      if (!valid) throw new Error(BACKUP_SECTIONS[key].label + " in this backup is not in the expected shape.");
      prepared[key] = value;
    });
    if (!Object.keys(prepared).length) {
      throw new Error("This backup contains no Zone sections.");
    }
    return prepared;
  }

  /* ------------------------------------------------------------------------
     Data sources
     ------------------------------------------------------------------------ */

  function readArray(key) {
    var value = Z.store.get(key, []);
    return Array.isArray(value) ? value : [];
  }

  function membersText(group) {
    return (group.members || []).map(function (member) { return member.name; }).join(", ");
  }

  function latestExpenseDate(group) {
    return (group.expenses || []).reduce(function (latest, expense) {
      return !latest || String(expense.date) > latest ? expense.date : latest;
    }, "");
  }

  function groupMoney(group) {
    return (group.expenses || []).reduce(function (sum, expense) {
      return sum + (Number(expense.amount) || 0);
    }, 0);
  }

  function passbookAccountName(book, id) {
    var account = (book.accounts || []).filter(function (item) { return item.id === id; })[0];
    return account ? account.name : "Unknown account";
  }

  var SOURCES = [
    {
      collection: "diary",
      page: "diary",
      tool: "Diary",
      kind: "Diary entry",
      via: "Diary form",
      icon: "book",
      read: function () { return readArray("diary"); },
      shape: function (entry) {
        return {
          title: entry.title || "Untitled entry",
          meta: [entry.mood, (entry.tags || []).join(" · ")].filter(Boolean).join(" · ") || "No tags",
          date: entry.date,
          preview: entry.body || ""
        };
      }
    },
    {
      collection: "lists",
      page: "lists",
      tool: "Lists",
      kind: "List",
      via: "Lists form",
      icon: "list",
      read: function () { return readArray("lists"); },
      shape: function (list) {
        var open = 0;
        var done = 0;
        (list.items || []).forEach(function (item) {
          if (item.done) done += 1; else open += 1;
          (item.children || []).forEach(function (child) {
            if (child.done) done += 1; else open += 1;
          });
        });
        return {
          title: list.title || "Untitled list",
          meta: open + " open · " + done + " done",
          date: list.createdAt,
          preview: (list.items || []).slice(0, 4).map(function (item) { return item.text; }).join(" · ")
        };
      }
    },
    {
      collection: "habits.habits",
      page: "habits",
      tool: "Habits",
      kind: "Habit",
      via: "Habits form",
      icon: "repeat",
      read: function () {
        var data = Z.store.get("habits", { habits: [] }) || { habits: [] };
        return Array.isArray(data.habits) ? data.habits : [];
      },
      shape: function (habit) {
        return {
          title: habit.name || "Untitled habit",
          meta: (habit.target || 0) + "× per week",
          date: habit.createdAt,
          preview: "A weekly rhythm kept in the habit board."
        };
      }
    },
    {
      collection: "notes",
      page: "notes",
      tool: "Notes",
      kind: "Note",
      via: "Notes form",
      icon: "note",
      read: function () { return readArray("notes"); },
      shape: function (note) {
        return {
          title: note.title || "Untitled note",
          meta: note.pinned ? "Pinned note" : "Note",
          date: note.updated || note.created,
          preview: note.body || ""
        };
      }
    },
    {
      collection: "money.transactions",
      page: "money",
      tool: "Money",
      kind: "Transaction",
      via: "Money form",
      icon: "wallet",
      read: function () {
        var data = Z.store.get("money", { transactions: [] }) || { transactions: [] };
        return Array.isArray(data.transactions) ? data.transactions : [];
      },
      shape: function (txn) {
        return {
          title: txn.note || txn.category || "Untitled transaction",
          meta: [txn.type, txn.category, Z.money(txn.amount)].filter(Boolean).join(" · "),
          date: txn.date,
          preview: txn.type === "income" ? "Income recorded in the monthly ledger." : "Expense recorded in the monthly ledger."
        };
      }
    },
    {
      collection: "passbook.accounts",
      page: "passbook",
      tool: "Passbook",
      kind: "Account",
      via: "Passbook account form",
      icon: "ledger",
      read: function () {
        var book = Z.store.get("passbook", { accounts: [] }) || { accounts: [] };
        return Array.isArray(book.accounts) ? book.accounts : [];
      },
      shape: function (account) {
        return {
          title: account.name || "Untitled account",
          meta: [account.type, account.number].filter(Boolean).join(" · "),
          date: null,
          preview: "Opening balance " + Z.money(account.opening || 0) + "."
        };
      }
    },
    {
      collection: "passbook.transactions",
      page: "passbook",
      tool: "Passbook",
      kind: "Entry",
      via: "Passbook entry form",
      icon: "ledger",
      read: function () {
        var book = Z.store.get("passbook", { transactions: [] }) || { transactions: [] };
        return Array.isArray(book.transactions) ? book.transactions : [];
      },
      shape: function (txn) {
        var book = Z.store.get("passbook", { accounts: [] }) || { accounts: [] };
        return {
          title: txn.description || txn.category || "Untitled entry",
          meta: [txn.type, txn.category, passbookAccountName(book, txn.accountId)].filter(Boolean).join(" · "),
          date: txn.date,
          preview: (txn.type === "deposit" ? "Deposit of " : "Withdrawal of ") + Z.money(txn.amount)
        };
      }
    },
    {
      collection: "split.groups",
      page: "split",
      tool: "Split",
      kind: "Group",
      via: "Split group form",
      icon: "split",
      read: function () {
        var split = Z.store.get("split", { groups: [] }) || { groups: [] };
        return Array.isArray(split.groups) ? split.groups : [];
      },
      shape: function (group) {
        return {
          title: group.name || "Untitled group",
          meta: (group.members || []).length + " members · " + (group.expenses || []).length + " expenses · " + Z.money(groupMoney(group)),
          date: latestExpenseDate(group) || null,
          preview: membersText(group)
        };
      }
    },
    {
      collection: "trips",
      page: "mileage",
      tool: "Mileage",
      kind: "Fill-up",
      via: "Mileage form",
      icon: "car",
      read: function () { return readArray("trips"); },
      shape: function (trip) {
        var distance = Number(trip.end) - Number(trip.start);
        return {
          title: trip.vehicle || "Untitled trip",
          meta: distance + " km · " + Z.money(trip.paid || 0) + " fuel",
          date: trip.date,
          preview: trip.note || "A fill recorded in the mileage log."
        };
      }
    },
    {
      collection: "vehicles",
      page: "mileage",
      tool: "Mileage",
      kind: "Vehicle",
      via: "Mileage garage",
      icon: "car",
      read: function () { return readArray("vehicles"); },
      shape: function (vehicle) {
        return {
          title: vehicle.name || "Untitled vehicle",
          meta: [vehicle.type, vehicle.fuel].filter(Boolean).join(" · ") || "Garage vehicle",
          date: vehicle.createdAt,
          preview: "A vehicle in the mileage garage."
        };
      }
    },
    {
      collection: "watchlist",
      page: "watchlist",
      tool: "Watchlist",
      kind: "Title",
      via: "Watchlist form",
      icon: "film",
      read: function () { return readArray("watchlist"); },
      shape: function (title) {
        return {
          title: title.title || "Untitled title",
          meta: [title.type, title.year, title.status].filter(Boolean).join(" · "),
          date: title.added,
          preview: title.note || "Saved to the watchlist."
        };
      }
    },
    {
      collection: "links",
      page: "links",
      tool: "Links",
      kind: "Link",
      via: "Links form",
      icon: "link",
      read: function () { return readArray("links"); },
      shape: function (link) {
        var domain = "";
        try { domain = new URL(link.url).hostname.replace(/^www\./, ""); } catch (err) { domain = link.url || ""; }
        return {
          title: link.title || link.url || "Untitled link",
          meta: domain + ((link.tags || []).length ? " · " + link.tags.join(" · ") : ""),
          date: link.saved,
          preview: link.note || link.url || ""
        };
      }
    },
    {
      collection: "subscriptions",
      page: "subscriptions",
      tool: "Subscriptions",
      kind: "Subscription",
      via: "Subscriptions form",
      icon: "card",
      read: function () { return readArray("subscriptions"); },
      shape: function (sub) {
        return {
          title: sub.name || "Untitled subscription",
          meta: [sub.cycle, sub.category, Z.money(sub.amount), sub.status].filter(Boolean).join(" · "),
          date: null,
          preview: sub.next ? "Next renewal " + Z.dateMedium(sub.next) + "." : "A recurring cost on the desk."
        };
      }
    }
  ];

  /* ------------------------------------------------------------------------
     Date and status helpers
     ------------------------------------------------------------------------ */

  function asDate(value) {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return Z.parseISO(value);
    var date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, withTime) {
    var date = asDate(value);
    if (!date) return "No date";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: withTime ? undefined : "numeric",
      hour: withTime ? "2-digit" : undefined,
      minute: withTime ? "2-digit" : undefined
    }).format(date);
  }

  function formatDay(value) {
    var date = asDate(value);
    if (!date) return "No date";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function relDate(value) {
    var date = asDate(value);
    if (!date) return "No date";
    var days = Z.daysBetween(Z.toISO(date), Z.todayISO());
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days > 1 && days < 7) return days + " days ago";
    if (days > 6 && days < 31) return Math.round(days / 7) + "w ago";
    if (days < 0 && days > -7) return "In " + Math.abs(days) + " days";
    return formatDay(value);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function statusLabel(status) {
    return {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      rolledback: "Rolled back",
      active: "Active",
      restored: "Restored"
    }[status] || "Active";
  }

  function statusBadge(status, event, labelOverride) {
    var label = labelOverride || statusLabel(status);
    if (event && event.auto && status === "approved" && !labelOverride) label = "Auto-approved";
    return '<span class="admin-status status-' + esc(status) + '"><i></i>' + esc(label) + "</span>";
  }

  function toolPage(pageId) {
    return Z.PAGES.filter(function (page) { return page.id === pageId; })[0] || null;
  }

  function toolPageForLabel(label) {
    var clean = String(label || "").toLowerCase();
    return Z.PAGES.filter(function (page) {
      return page.label.toLowerCase() === clean || page.id === clean;
    })[0] || null;
  }

  function toolChip(page, label, iconOverride) {
    var pageData = page || toolPageForLabel(label) || {};
    var iconName = iconOverride || pageData.icon || "note";
    var text = label || pageData.label || "Record";
    return '<span class="admin-tool-chip" data-tool="' + esc(pageData.id || "record") + '">' +
      Z.icon(iconName) + "<span>" + esc(text) + "</span></span>";
  }

  function sameJSON(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (err) { return a === b; }
  }

  function compactValue(value, max) {
    if (value === undefined) return "—";
    var text;
    try { text = JSON.stringify(value); } catch (err) { text = String(value); }
    if (text === undefined) return "—";
    text = text.replace(/\s+/g, " ");
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
  }

  /* ------------------------------------------------------------------------
     Audit helpers
     ------------------------------------------------------------------------ */

  function auditEvents() {
    return Z.audit.list().slice().sort(function (a, b) {
      return String(b.at).localeCompare(String(a.at));
    });
  }

  function pendingChanges() {
    return auditEvents().filter(function (event) { return event.status === "pending"; });
  }

  function findAuditEvent(id) {
    return auditEvents().filter(function (event) { return event.id === id; })[0] || null;
  }

  function isReapplied(event) {
    if (!event || !event.reapplyEventId) return false;
    var reapplied = Z.audit.find(event.reapplyEventId);
    return !!(reapplied && reapplied.status === "approved");
  }

  function actionBucket(action) {
    if (action === "add") return "add";
    if (action === "delete") return "delete";
    if (action === "restore" || action === "reapply") return "restore";
    if (action === "import") return "import";
    if (action === "policy" || action === "clear" || action === "system") return "system";
    return "edit";
  }

  function actionLabel(action) {
    return {
      add: "Added",
      edit: "Edited",
      delete: "Deleted",
      mixed: "Updated",
      restore: "Restored",
      reapply: "Reapplied",
      import: "Imported",
      policy: "Policy changed",
      clear: "History cleared",
      system: "System"
    }[action] || "Activity";
  }

  function actionIcon(action) {
    return {
      add: "plus",
      edit: "pencil",
      delete: "trash",
      mixed: "pencil",
      restore: "refresh",
      reapply: "refresh",
      import: "upload",
      policy: "shield",
      clear: "trash",
      system: "info"
    }[action] || "info";
  }

  function actionPill(action) {
    var bucket = actionBucket(action);
    return '<span class="admin-action-pill action-' + esc(bucket) + '">' + esc(actionLabel(action)) + "</span>";
  }

  function eventChanges(event) {
    var changes = [];
    (event.patches || []).forEach(function (patch) {
      (patch.fields || []).forEach(function (field) {
        if (field.kind === "array") {
          (field.changes || []).forEach(function (change) {
            changes.push({ patch: patch, field: field, change: change });
          });
        } else {
          changes.push({ patch: patch, field: field, change: null });
        }
      });
    });
    return changes;
  }

  function eventPreview(event) {
    var parts = [];
    eventChanges(event).forEach(function (item) {
      var title = item.change ? item.change.title : (item.field.label || item.field.name);
      if (title && parts.indexOf(title) === -1) parts.push(title);
    });
    if (!parts.length) return event.detail || "No record detail.";
    return parts.slice(0, 4).join(" · ") + (parts.length > 4 ? " · +" + (parts.length - 4) + " more" : "");
  }

  function eventSearchText(event) {
    var parts = [event.title, event.detail, event.tool, actionLabel(event.action), statusLabel(event.status)];
    eventChanges(event).forEach(function (item) {
      if (item.change) {
        parts.push(item.change.title || "");
        parts.push(item.change.id || "");
      }
      if (item.field) {
        parts.push(item.field.label || item.field.name || "");
      }
    });
    return parts.join(" ").toLowerCase();
  }

  function recordFieldDiff(before, after) {
    if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
    var keys = [];
    Object.keys(before).forEach(function (key) { if (keys.indexOf(key) === -1) keys.push(key); });
    Object.keys(after).forEach(function (key) { if (keys.indexOf(key) === -1) keys.push(key); });
    return keys.filter(function (key) {
      return !sameJSON(before[key], after[key]);
    }).map(function (key) {
      return { key: key, before: before[key], after: after[key] };
    });
  }

  /* ------------------------------------------------------------------------
     Records
     ------------------------------------------------------------------------ */

  function collectRecords() {
    var records = [];
    SOURCES.forEach(function (source) {
      source.read().forEach(function (item) {
        if (!item || item.id == null) return;
        var key = source.collection + ":" + item.id;
        var shape = source.shape(item) || {};
        var hit = Z.audit.recordStatus(source.collection, item.id);
        var status = "active";
        var latest = null;
        if (hit && hit.event) {
          latest = hit.event;
          if (latest.action === "restore") status = "restored";
          else if (hit.status === "rejected" || hit.status === "rolledback") status = "restored";
          else status = hit.status;
        }
        var record = {
          key: key,
          item: item,
          id: item.id,
          source: source,
          page: source.page,
          tool: source.tool,
          kind: source.kind,
          icon: source.icon,
          via: source.via,
          title: shape.title || "Untitled record",
          meta: shape.meta || "",
          date: shape.date || null,
          preview: String(shape.preview || "").replace(/\s+/g, " ").trim(),
          latest: latest,
          status: status,
          submittedAt: latest ? latest.at : (shape.date || null),
          href: (toolPage(source.page) || {}).href || "index.html"
        };
        records.push(record);
      });
    });
    return records;
  }

  function emptyState(title, message, iconName) {
    return '<div class="admin-empty">' +
      '<span class="admin-empty-mark">' + Z.icon(iconName || "check") + "</span>" +
      "<h3>" + esc(title) + "</h3><p>" + esc(message) + "</p></div>";
  }

  /* ------------------------------------------------------------------------
     Rendering — stats and overview
     ------------------------------------------------------------------------ */

  function renderStats(records, pending) {
    var host = $("admin-stats");
    if (!host) return;
    var events = auditEvents();
    var today = Z.todayISO();
    var todayCount = events.filter(function (event) { return String(event.at).indexOf(today) === 0; }).length;
    var approved = events.filter(function (event) { return event.status === "approved"; }).length;
    var toolCount = Z.PAGES.filter(function (page) {
      return ["home", "settings", "admin"].indexOf(page.id) === -1;
    }).length;
    var stats = [
      {
        tone: "rust",
        icon: "clock",
        label: "Pending review",
        value: String(pending.length),
        hint: pending.length ? "Waiting in Activity" : "The queue is clear"
      },
      {
        tone: "sage",
        icon: "refresh",
        label: "Changes today",
        value: String(todayCount),
        hint: "Every logged change"
      },
      {
        tone: "gold",
        icon: "check",
        label: "Approved changes",
        value: String(approved),
        hint: "Kept on the desk"
      },
      {
        tone: "blue",
        icon: "grid",
        label: "Records on the desk",
        value: String(records.length),
        hint: "Across " + toolCount + " working tools"
      }
    ];
    host.innerHTML = stats.map(function (stat) {
      return '<article class="admin-stat admin-stat-' + stat.tone + '">' +
        '<div class="admin-stat-top"><span class="admin-stat-label">' + esc(stat.label) + "</span>" +
        '<span class="admin-stat-icon">' + Z.icon(stat.icon) + "</span></div>" +
        '<strong class="admin-stat-value">' + esc(stat.value) + "</strong>" +
        '<p class="admin-stat-hint">' + esc(stat.hint) + "</p></article>";
    }).join("");
  }

  function renderQueue(pending) {
    var host = $("admin-queue");
    var count = $("admin-queue-count");
    var approveAll = $("admin-approve-all");
    if (count) count.textContent = pending.length + " pending";
    if (approveAll) approveAll.disabled = !pending.length;
    if (!host) return;

    if (!pending.length) {
      host.innerHTML = emptyState(
        "The queue is clear.",
        "Every change has been seen. New work goes live immediately and will appear here when manual review is on.",
        "check"
      );
      return;
    }

    var visible = pending.slice(0, 6);
    host.innerHTML = visible.map(function (event) {
      var page = toolPage(event.page);
      return '<article class="admin-review-card admin-change-queue" data-event-id="' + esc(event.id) + '">' +
        '<div class="admin-review-top">' +
        toolChip(page, event.tool) +
        actionPill(event.action) +
        '<span class="admin-review-age">' + esc(relDate(event.at)) + "</span>" +
        "</div>" +
        '<h3 class="admin-review-title">' + esc(event.title) + "</h3>" +
        '<p class="admin-review-preview">' + esc(eventPreview(event)) + "</p>" +
        '<div class="admin-review-meta"><span>' + esc(event.tool) + "</span><span>" +
        esc(event.count === 1 ? "1 change" : event.count + " changes") + "</span></div>" +
        '<div class="admin-provenance">' +
        '<span class="admin-provenance-avatar">' + esc(Z.initials(event.tool, 1)) + "</span>" +
        '<span class="admin-provenance-copy"><strong>' + esc(event.source === "admin" ? "Admin change" : "Workspace change") + "</strong>" +
        "<small>" + esc(formatDate(event.at, true)) + " · live on this device</small></span>" +
        '<span class="admin-provenance-local">Live</span>' +
        "</div>" +
        '<div class="admin-review-actions">' +
        '<button type="button" class="btn btn-sm admin-accept" data-audit-action="approve" data-event-id="' + esc(event.id) + '">' + Z.icon("check") + "Accept</button>" +
        '<button type="button" class="btn btn-sm admin-decline" data-audit-action="restore" data-event-id="' + esc(event.id) + '">' + Z.icon("close") + "Reject &amp; restore</button>" +
        '<button type="button" class="text-link admin-open-link" data-review-record="' + esc(event.title) + '">Inspect' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></button>' +
        "</div></article>";
    }).join("");

    if (pending.length > visible.length) {
      host.innerHTML += '<button type="button" class="text-link admin-queue-more" data-pending-jump="1">View all ' +
        pending.length + " pending changes" +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></button>';
    }
  }

  function renderBreakdown() {
    var host = $("admin-breakdown");
    if (!host) return;
    var events = auditEvents();
    var tools = Z.PAGES.filter(function (page) {
      return ["home", "settings", "admin"].indexOf(page.id) === -1;
    });
    var rows = tools.map(function (page) {
      var inTool = events.filter(function (event) { return event.page === page.id; });
      var pending = inTool.filter(function (event) { return event.status === "pending"; }).length;
      return { page: page, count: inTool.length, pending: pending };
    });
    var max = Math.max.apply(null, rows.map(function (row) { return row.count; }).concat([1]));
    host.innerHTML = rows.map(function (row) {
      var width = row.count ? Math.max(6, Math.round((row.count / max) * 100)) : 0;
      return '<button type="button" class="admin-breakdown-row" data-tool-jump="' + esc(row.page.id) + '">' +
        '<span class="admin-breakdown-tool">' + Z.icon(row.page.icon) + "<span>" + esc(row.page.label) + "</span></span>" +
        '<span class="admin-breakdown-bar"><i style="width:' + width + '%"></i></span>' +
        '<span class="admin-breakdown-numbers"><strong>' + row.count + '</strong>' +
        (row.pending ? '<em>' + row.pending + " pending</em>" : "<em>clear</em>") + "</span></button>";
    }).join("");
  }

  function auditMiniMarkup(event) {
    return '<article class="admin-event action-' + esc(actionBucket(event.action)) + '">' +
      '<span class="admin-event-icon">' + Z.icon(actionIcon(event.action)) + "</span>" +
      '<div class="admin-event-copy"><div class="admin-event-head"><strong>' + esc(event.title || "Workspace") + "</strong>" +
      '<span class="admin-event-action">' + esc(actionLabel(event.action)) + "</span></div>" +
      "<p>" + esc(eventPreview(event)) + "</p>" +
      '<div class="admin-event-meta"><span>' + esc(event.tool || "Workspace") +
      '</span><span class="admin-event-status">' + esc(statusLabel(event.status)) +
      '</span><time datetime="' + esc(event.at || "") + '">' + esc(formatDate(event.at, true)) + "</time></div>" +
      "</div></article>";
  }

  function renderRecentActivity() {
    var host = $("admin-recent-activity");
    if (!host) return;
    var events = auditEvents().slice(0, 6);
    if (!events.length) {
      host.innerHTML = emptyState("A clean page.", "The activity trail is empty for now.", "note");
      return;
    }
    host.innerHTML = events.map(auditMiniMarkup).join("");
  }

  /* ------------------------------------------------------------------------
     Rendering — register
     ------------------------------------------------------------------------ */

  function filteredRecords(records) {
    var query = state.q.trim().toLowerCase();
    return records.filter(function (record) {
      if (state.status !== "all" && record.status !== state.status) return false;
      if (state.tool !== "all" && record.page !== state.tool) return false;
      if (!query) return true;
      return [record.title, record.meta, record.preview, record.tool, record.kind, record.via]
        .join(" ").toLowerCase().indexOf(query) !== -1;
    }).sort(function (a, b) {
      var rank = { pending: 0, restored: 1, approved: 2, active: 3 };
      var left = rank[a.status] == null ? 5 : rank[a.status];
      var right = rank[b.status] == null ? 5 : rank[b.status];
      if (left !== right) return left - right;
      return String(b.submittedAt || b.date || "").localeCompare(String(a.submittedAt || a.date || ""));
    });
  }

  function renderSubmissions(records) {
    var host = $("admin-list");
    var count = $("admin-list-count");
    var emptyNote = $("admin-empty-note");
    var loadMore = $("admin-load-more");
    if (!host) return;

    var all = filteredRecords(records);
    var visible = all.slice(0, state.limit);
    if (count) count.textContent = all.length + (all.length === 1 ? " record" : " records");

    if (!all.length) {
      host.innerHTML = emptyState("Nothing in this drawer.", "Try a different tool, status, or search phrase.", "search");
      if (emptyNote) emptyNote.textContent = "No records match these filters.";
      if (loadMore) loadMore.hidden = true;
      return;
    }

    host.innerHTML =
      '<div class="admin-record admin-record-head" aria-hidden="true">' +
      '<span>Record</span><span>Tool</span><span>Last change</span><span>Status</span><span>Actions</span></div>' +
      visible.map(function (record) {
        var page = toolPage(record.page);
        var actions = "";
        if (record.status === "pending") {
          actions += '<button type="button" class="admin-row-action accept" data-review-record="' + esc(record.title) + '">' + Z.icon("clock") + "Review</button>";
        } else if (record.latest) {
          actions += '<button type="button" class="admin-row-action" data-review-record="' + esc(record.title) + '">' + Z.icon("clock") + "History</button>";
        }
        actions += '<a class="admin-row-open" href="' + esc(record.href) + '" aria-label="Open ' + esc(record.tool) + '">' + Z.icon("arrowUpRight") + "</a>";
        var when = record.submittedAt || record.date;
        var via = record.latest
          ? "Last change " + actionLabel(record.latest.action) + " · " + formatDate(record.latest.at, true)
          : "Added via " + record.via;
        return '<div class="admin-record" data-key="' + esc(record.key) + '" data-label="' + esc(record.title) + '">' +
          '<div class="admin-record-main">' +
          '<span class="admin-record-icon" data-tool="' + esc(record.page) + '">' + Z.icon(record.icon) + "</span>" +
          '<div><strong>' + esc(record.title) + '</strong><span>' + esc(record.meta || record.preview || "") + "</span>" +
          '<span class="admin-record-via">' + esc(via) + "</span></div></div>" +
          '<div class="admin-record-tool" data-label="Tool">' + toolChip(page, record.tool) + "</div>" +
          '<div class="admin-record-date" data-label="Last change"><strong>' + esc(relDate(when)) + "</strong><span>" + esc(formatDate(when)) + "</span></div>" +
          '<div class="admin-record-status" data-label="Status">' + statusBadge(record.status, record.latest) + "</div>" +
          '<div class="admin-record-actions" data-label="Actions">' + actions + "</div></div>";
      }).join("");

    if (emptyNote) emptyNote.textContent = "Showing " + visible.length + " of " + all.length + " matching records.";
    if (loadMore) {
      loadMore.hidden = visible.length >= all.length;
      loadMore.textContent = "Load " + Math.min(20, all.length - visible.length) + " more";
    }
  }

  /* ------------------------------------------------------------------------
     Rendering — activity
     ------------------------------------------------------------------------ */

  function filteredAuditEvents() {
    var query = state.aq.trim().toLowerCase();
    return auditEvents().filter(function (event) {
      if (state.atool !== "all" && event.page !== state.atool) return false;
      if (state.aaction !== "all" && actionBucket(event.action) !== state.aaction) return false;
      if (state.astatus !== "all" && event.status !== state.astatus) return false;
      if (!query) return true;
      return eventSearchText(event).indexOf(query) !== -1;
    });
  }

  function fieldDiffMarkup(before, after) {
    var changes = recordFieldDiff(before, after);
    if (!changes.length) {
      return '<div class="admin-field-diff"><span>record</span><code>' + esc(compactValue(after, 180)) + "</code></div>";
    }
    var shown = changes.slice(0, 8);
    return shown.map(function (diff) {
      return '<div class="admin-field-diff"><span>' + esc(diff.key) + "</span><code>" +
        esc(compactValue(diff.before, 160)) + "</code><i>→</i><code>" +
        esc(compactValue(diff.after, 160)) + "</code></div>";
    }).join("") + (changes.length > shown.length
      ? '<div class="admin-field-more">+' + (changes.length - shown.length) + " more fields</div>"
      : "");
  }

  function changeItemMarkup(item) {
    var patch = item.patch;
    var field = item.field;
    var change = item.change;
    if (!change) {
      return '<div class="admin-change-item">' +
        '<div class="admin-change-item-head"><span class="admin-op op-edit">Edited</span>' +
        "<strong>" + esc(field.label || field.name || patch.label) + "</strong>" +
        '<span class="admin-change-section">' + esc(patch.label) + "</span></div>" +
        '<div class="admin-field-diff"><span>before</span><code>' + esc(compactValue(field.before, 220)) + "</code><i>→</i><code>" +
        esc(compactValue(field.after, 220)) + "</code></div></div>";
    }
    var opLabel = change.op === "add" ? "Added" : change.op === "remove" ? "Removed" : "Edited";
    var opClass = change.op === "add" ? "add" : change.op === "remove" ? "remove" : "edit";
    var diff;
    if (change.op === "edit") {
      diff = fieldDiffMarkup(change.before, change.after);
    } else {
      diff = '<div class="admin-field-diff"><span>' + (change.op === "add" ? "after" : "before") + "</span><code>" +
        esc(compactValue(change.op === "add" ? change.after : change.before, 320)) + "</code></div>";
    }
    return '<div class="admin-change-item">' +
      '<div class="admin-change-item-head"><span class="admin-op op-' + opClass + '">' + opLabel + "</span>" +
      "<strong>" + esc(change.title || "Untitled record") + "</strong>" +
      '<span class="admin-change-section">' + esc(patch.label) + "</span></div>" + diff + "</div>";
  }

  function eventDetailsMarkup(event) {
    var changes = eventChanges(event);
    if (!changes.length) return "";
    var shown = changes.slice(0, 10);
    return '<details class="admin-change-details">' +
      "<summary>Inspect " + (changes.length === 1 ? "the change" : changes.length + " changes") + "</summary>" +
      '<div class="admin-change-list">' + shown.map(changeItemMarkup).join("") +
      (changes.length > shown.length
        ? '<div class="admin-field-more">+' + (changes.length - shown.length) + " more changes in this event</div>"
        : "") +
      "</div></details>";
  }

  function eventButtons(event) {
    var buttons = "";
    var hasData = event.patches && event.patches.length;
    if (event.status === "pending" && hasData) {
      buttons += '<button type="button" class="btn btn-sm admin-accept" data-audit-action="approve" data-event-id="' + esc(event.id) + '">' + Z.icon("check") + "Accept</button>";
      buttons += '<button type="button" class="btn btn-sm admin-decline" data-audit-action="restore" data-event-id="' + esc(event.id) + '">' + Z.icon("close") + "Reject &amp; restore</button>";
    } else if (event.status === "approved" && hasData) {
      buttons += '<button type="button" class="btn btn-sm" data-audit-action="restore" data-event-id="' + esc(event.id) + '">' + Z.icon("refresh") + "Roll back</button>";
    } else if ((event.status === "rejected" || event.status === "rolledback") && hasData && !isReapplied(event)) {
      buttons += '<button type="button" class="btn btn-sm" data-audit-action="reapply" data-event-id="' + esc(event.id) + '">' + Z.icon("refresh") + "Reapply</button>";
    }
    return buttons;
  }

  function auditEventMarkup(event) {
    var page = toolPage(event.page);
    var reapplied = isReapplied(event);
    return '<article class="admin-audit-event action-' + esc(actionBucket(event.action)) + '" data-event-id="' + esc(event.id) + '">' +
      '<div class="admin-audit-rail"><span class="admin-audit-icon">' + Z.icon(actionIcon(event.action)) + "</span></div>" +
      '<div class="admin-audit-main">' +
      '<div class="admin-audit-top">' +
      toolChip(page, event.tool, event.icon) +
      actionPill(event.action) +
      statusBadge(reapplied ? "approved" : event.status, event, reapplied ? "Reapplied" : "") +
      '<time class="admin-audit-time" datetime="' + esc(event.at) + '">' + esc(formatDate(event.at, true)) + "</time>" +
      "</div>" +
      '<h3 class="admin-audit-title">' + esc(event.title) + "</h3>" +
      '<p class="admin-audit-detail">' + esc(event.detail || "No further detail.") + "</p>" +
      '<p class="admin-audit-preview">' + esc(eventPreview(event)) + "</p>" +
      '<div class="admin-audit-foot">' +
      '<span class="admin-audit-source">' + esc(event.source === "admin" ? "Admin action" : "Workspace user") + "</span>" +
      '<span class="admin-audit-age">' + esc(relDate(event.at)) + "</span>" +
      '<div class="admin-audit-actions">' + eventButtons(event) + "</div>" +
      "</div>" +
      eventDetailsMarkup(event) +
      "</div></article>";
  }

  function renderActivity() {
    var host = $("admin-activity");
    var note = $("admin-activity-note");
    var more = $("admin-activity-more");
    if (!host) return;
    var all = filteredAuditEvents();
    var visible = all.slice(0, state.alimit);
    if (!all.length) {
      host.innerHTML = emptyState("No activity matches.", "Try a different tool, action, status, or search phrase.", "search");
      if (note) note.textContent = "No changes match these filters.";
      if (more) more.hidden = true;
      return;
    }
    host.innerHTML = visible.map(auditEventMarkup).join("");
    var pending = all.filter(function (event) { return event.status === "pending"; }).length;
    if (note) {
      note.textContent = "Showing " + visible.length + " of " + all.length + " changes" +
        (pending ? " · " + pending + " pending" : " · nothing pending");
    }
    if (more) {
      more.hidden = visible.length >= all.length;
      more.textContent = "Load " + Math.min(20, all.length - visible.length) + " more";
    }
  }

  /* ------------------------------------------------------------------------
     Rendering — setup
     ------------------------------------------------------------------------ */

  function renderSetup(records, pending) {
    renderStorageSummary();
    if (!autoApproveInput) return;
    autoApproveInput.checked = !!admin.settings.autoApprove;
    var policyNote = $("admin-policy-note");
    if (policyNote) {
      policyNote.textContent = admin.settings.autoApprove
        ? "Auto-approval is on. Changes go live and arrive approved; the full activity trail remains."
        : "Manual review is on. Changes go live immediately and wait in Activity for a decision.";
    }
    var approveAll = $("admin-approve-all");
    if (approveAll) approveAll.disabled = !pending.length;

    var toolsHost = $("admin-tools");
    if (toolsHost) {
      var events = auditEvents();
      var tools = Z.PAGES.filter(function (page) {
        return ["home", "settings", "admin"].indexOf(page.id) === -1;
      });
      toolsHost.innerHTML = tools.map(function (page) {
        var inTool = records.filter(function (record) { return record.page === page.id; });
        var pendingCount = events.filter(function (event) {
          return event.page === page.id && event.status === "pending";
        }).length;
        return '<a class="admin-registry-row" href="' + esc(page.href) + '">' +
          '<span class="admin-registry-icon">' + Z.icon(page.icon) + "</span>" +
          '<span class="admin-registry-copy"><strong>' + esc(page.label) + "</strong><small>" + inTool.length +
          " records · " + (pendingCount ? pendingCount + " pending" : "all clear") + "</small></span>" +
          '<span class="admin-registry-status"><i></i>Active</span>' +
          '<span class="admin-registry-arrow">' + Z.icon("arrowUpRight") + "</span></a>";
      }).join("");
    }
  }

  function updateSync(records, pending) {
    var sync = $("admin-sync");
    if (!sync) return;
    var time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    sync.textContent = "Synced " + time + " · " + records.length + " records · " + pending.length + " pending";
  }

  function renderAll(records) {
    var latest = records || collectRecords();
    lastRecords = latest;
    var pending = pendingChanges();
    renderStats(latest, pending);
    renderQueue(pending);
    renderBreakdown();
    renderRecentActivity();
    renderSubmissions(latest);
    renderSetup(latest, pending);
    renderActivity();
    updateSync(latest, pending);
    var recordCount = document.querySelector('[data-tab-count="submissions"]');
    if (recordCount) recordCount.textContent = String(latest.length);
    var activityCount = document.querySelector('[data-tab-count="activity"]');
    if (activityCount) activityCount.textContent = String(auditEvents().length);
  }

  /* ------------------------------------------------------------------------
     Rendering — tool filters
     ------------------------------------------------------------------------ */

  function renderToolOptions() {
    var recordSelect = $("admin-tool-filter");
    var activitySelect = $("admin-activity-tool-filter");
    var tools = Z.PAGES.filter(function (page) {
      return ["home", "settings", "admin"].indexOf(page.id) === -1;
    });
    if (recordSelect && recordSelect.options.length <= 1) {
      tools.forEach(function (page) {
        var option = document.createElement("option");
        option.value = page.id;
        option.textContent = page.label;
        recordSelect.appendChild(option);
      });
    }
    if (activitySelect && activitySelect.options.length <= 1) {
      tools.forEach(function (page) {
        var option = document.createElement("option");
        option.value = page.id;
        option.textContent = page.label;
        activitySelect.appendChild(option);
      });
      var adminOption = document.createElement("option");
      adminOption.value = "admin";
      adminOption.textContent = "Admin";
      activitySelect.appendChild(adminOption);
    }
  }

  /* ------------------------------------------------------------------------
     Actions
     ------------------------------------------------------------------------ */

  function focusActivity(query, tool, status) {
    state.aq = query || "";
    state.atool = tool || "all";
    state.aaction = "all";
    state.astatus = status || "all";
    state.alimit = 20;
    var search = $("admin-activity-search");
    if (search) search.value = state.aq;
    var toolSelect = $("admin-activity-tool-filter");
    if (toolSelect) toolSelect.value = state.atool;
    var actionSelect = $("admin-activity-action-filter");
    if (actionSelect) actionSelect.value = "all";
    var statusSelect = $("admin-activity-status-filter");
    if (statusSelect) statusSelect.value = state.astatus;
    setTab("activity");
    renderActivity();
  }

  function approveEvent(id) {
    var event = Z.audit.approve(id);
    if (!event) {
      Z.toast("That change has already moved.", "error");
      return;
    }
    renderAll();
    Z.toast("Approved “" + event.title + "”");
  }

  function conflictWarning(event) {
    var conflicts = Z.audit.conflicts(event.id);
    if (!conflicts.length) return "";
    var names = conflicts.slice(0, 3).map(function (item) {
      return "“" + esc(item.title) + "”";
    }).join(", ");
    return "<br><br><strong>Heads up:</strong> " + conflicts.length + " newer " +
      (conflicts.length === 1 ? "change touches" : "changes touch") +
      " the same records (" + names + "). Restoring this will override " +
      (conflicts.length === 1 ? "that later change" : "those later changes") + " too.";
  }

  function restoreEvent(id) {
    var event = findAuditEvent(id);
    if (!event) {
      Z.toast("That change is no longer in the log.", "error");
      return;
    }
    var wasPending = event.status === "pending";
    Z.confirm({
      kicker: wasPending ? "Reject & restore" : "Roll back",
      title: wasPending ? "Send this change back?" : "Restore the previous version?",
      message: "<strong>" + esc(event.title) + "</strong> will be " +
        (wasPending ? "removed from the review queue and " : "") +
        "written back to the state before it. The change stays in the activity trail as a restore." +
        conflictWarning(event),
      label: wasPending ? "Reject & restore" : "Roll back"
    }).then(function (ok) {
      if (!ok) return;
      var result = Z.audit.revert(id);
      if (!result.ok) {
        Z.toast(result.message || "Could not restore that change.", "error");
        return;
      }
      renderAll();
      Z.toast(wasPending ? "Change rejected and previous data restored" : "Previous version restored");
    });
  }

  function reapplyEvent(id) {
    var event = findAuditEvent(id);
    if (!event) {
      Z.toast("That change is no longer in the log.", "error");
      return;
    }
    Z.confirm({
      kicker: "Reapply change",
      title: "Apply this change again?",
      message: "<strong>" + esc(event.title) + "</strong> will be written back to the desk. It will be logged as a new reapply event." +
        conflictWarning(event),
      label: "Reapply"
    }).then(function (ok) {
      if (!ok) return;
      var result = Z.audit.reapply(id);
      if (!result.ok) {
        Z.toast(result.message || "Could not reapply that change.", "error");
        return;
      }
      renderAll();
      Z.toast("Change reapplied");
    });
  }

  function approveAllPending() {
    var count = Z.audit.pendingCount();
    if (!count) return;
    Z.audit.approveAll();
    renderAll();
    Z.toast("Approved " + count + " " + (count === 1 ? "change" : "changes"));
  }

  function setTab(tab) {
    var valid = ["overview", "submissions", "activity", "setup"];
    if (valid.indexOf(tab) === -1) tab = "overview";
    state.tab = tab;
    document.querySelectorAll(".admin-tab").forEach(function (button) {
      var active = button.dataset.tab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll(".admin-panel").forEach(function (panel) {
      panel.hidden = panel.dataset.panel !== tab;
    });
    if (tab === "submissions") renderSubmissions(lastRecords);
    if (tab === "activity") renderActivity();
    if (tab === "setup") renderSetup(lastRecords, pendingChanges());
    if (history.replaceState) history.replaceState(null, "", "#" + tab);
  }

  function unlockApp() {
    gate.hidden = true;
    app.hidden = false;
    if (lockButton) lockButton.hidden = false;
    admin = loadAdmin();
    renderAll();
    var hash = (window.location.hash || "").replace("#", "");
    setTab(["overview", "submissions", "activity", "setup"].indexOf(hash) !== -1 ? hash : "overview");
    var sync = $("admin-sync");
    if (sync) sync.title = "Synced with Cloudflare D1";
  }

  function lockApp() {
    if (window.ZCloud && typeof ZCloud.clearSession === "function") ZCloud.clearSession();
    app.hidden = true;
    gate.hidden = false;
    if (lockButton) lockButton.hidden = true;
    setTab("overview");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(function () { if (codeInput) codeInput.focus(); }, 250);
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = codeInput ? codeInput.value.trim() : "";
      var submit = loginForm.querySelector('button[type="submit"]');
      var showError = function (message) {
        if (loginError) {
          loginError.textContent = message;
          loginError.classList.add("visible");
        }
        if (codeInput) {
          codeInput.setAttribute("aria-invalid", "true");
          codeInput.focus();
          codeInput.select();
        }
        loginForm.classList.remove("shake");
        void loginForm.offsetWidth;
        loginForm.classList.add("shake");
      };

      if (!value) {
        showError("Enter the admin password.");
        return;
      }
      if (!window.ZCloud || typeof ZCloud.login !== "function") {
        showError("The admin API is not available on this deployment.");
        return;
      }

      if (submit) submit.disabled = true;
      if (loginError) {
        loginError.textContent = "Checking the secret…";
        loginError.classList.add("visible");
      }
      ZCloud.login(value).then(function () {
        if (loginError) {
          loginError.textContent = "";
          loginError.classList.remove("visible");
        }
        if (codeInput) {
          codeInput.value = "";
          codeInput.removeAttribute("aria-invalid");
        }
        unlockApp();
      }).catch(function (err) {
        var message = "Could not reach the admin API. Check the deployment and try again.";
        if (err && err.status === 401) message = "That admin password did not match.";
        else if (err && err.status === 503) message = err.message || "ADMIN_PASSWORD is not configured in Cloudflare Pages.";
        showError(message);
      }).then(function () {
        if (submit) submit.disabled = false;
      });
    });
  }

  if (lockButton) lockButton.addEventListener("click", lockApp);
  var inlineLock = $("admin-lock-inline");
  if (inlineLock) inlineLock.addEventListener("click", lockApp);

  var refreshButton = $("admin-refresh");
  if (refreshButton) {
    refreshButton.addEventListener("click", function () {
      if (!window.ZCloud || typeof ZCloud.syncNow !== "function") {
        admin = loadAdmin();
        renderAll();
        Z.toast("Workspace rescanned · " + Z.audit.list().length + " changes on file");
        return;
      }
      refreshButton.disabled = true;
      var sync = $("admin-sync");
      if (sync) sync.textContent = "Syncing with D1…";
      ZCloud.syncNow().then(function () {
        Z.toast("Workspace synced. Reloading.");
        window.location.reload();
      }).catch(function (err) {
        refreshButton.disabled = false;
        if (sync) sync.textContent = "D1 sync failed";
        Z.toast((err && err.message) || "Could not sync the workspace.", "error");
      });
    });
  }

  document.querySelectorAll(".admin-tab").forEach(function (button) {
    button.addEventListener("click", function () { setTab(button.dataset.tab); });
  });

  document.querySelectorAll("[data-jump]").forEach(function (button) {
    button.addEventListener("click", function () { setTab(button.dataset.jump); });
  });

  if (app) {
    app.addEventListener("click", function (event) {
      var auditButton = event.target.closest("[data-audit-action]");
      if (auditButton) {
        var id = auditButton.dataset.eventId;
        var action = auditButton.dataset.auditAction;
        if (action === "approve") approveEvent(id);
        else if (action === "restore") restoreEvent(id);
        else if (action === "reapply") reapplyEvent(id);
        return;
      }
      var reviewButton = event.target.closest("[data-review-record]");
      if (reviewButton) {
        focusActivity(reviewButton.dataset.reviewRecord, "all");
        return;
      }
      var toolJump = event.target.closest("[data-tool-jump]");
      if (toolJump) {
        focusActivity("", toolJump.dataset.toolJump);
        return;
      }
      var pendingJump = event.target.closest("[data-pending-jump]");
      if (pendingJump) {
        focusActivity("", "all", "pending");
        return;
      }
      var jump = event.target.closest("[data-jump]");
      if (jump) setTab(jump.dataset.jump);
    });
  }

  var search = $("admin-search");
  if (search) {
    search.addEventListener("input", Z.debounce(function () {
      state.q = search.value;
      state.limit = 20;
      renderSubmissions(lastRecords);
    }, 130));
  }

  var toolFilter = $("admin-tool-filter");
  if (toolFilter) {
    toolFilter.addEventListener("change", function () {
      state.tool = toolFilter.value;
      state.limit = 20;
      renderSubmissions(lastRecords);
    });
  }

  var statusFilter = $("admin-status-filter");
  if (statusFilter) {
    statusFilter.addEventListener("change", function () {
      state.status = statusFilter.value;
      state.limit = 20;
      renderSubmissions(lastRecords);
    });
  }

  var loadMore = $("admin-load-more");
  if (loadMore) {
    loadMore.addEventListener("click", function () {
      state.limit += 20;
      renderSubmissions(lastRecords);
    });
  }

  var activitySearch = $("admin-activity-search");
  if (activitySearch) {
    activitySearch.addEventListener("input", Z.debounce(function () {
      state.aq = activitySearch.value;
      state.alimit = 20;
      renderActivity();
    }, 130));
  }

  var activityToolFilter = $("admin-activity-tool-filter");
  if (activityToolFilter) {
    activityToolFilter.addEventListener("change", function () {
      state.atool = activityToolFilter.value;
      state.alimit = 20;
      renderActivity();
    });
  }

  var activityActionFilter = $("admin-activity-action-filter");
  if (activityActionFilter) {
    activityActionFilter.addEventListener("change", function () {
      state.aaction = activityActionFilter.value;
      state.alimit = 20;
      renderActivity();
    });
  }

  var activityStatusFilter = $("admin-activity-status-filter");
  if (activityStatusFilter) {
    activityStatusFilter.addEventListener("change", function () {
      state.astatus = activityStatusFilter.value;
      state.alimit = 20;
      renderActivity();
    });
  }

  var activityMore = $("admin-activity-more");
  if (activityMore) {
    activityMore.addEventListener("click", function () {
      state.alimit += 20;
      renderActivity();
    });
  }

  var approveAll = $("admin-approve-all");
  if (approveAll) {
    approveAll.addEventListener("click", function () {
      if (!Z.audit.pendingCount()) return;
      Z.confirm({
        kicker: "Clear the queue",
        title: "Accept everything pending?",
        message: "Every change waiting for review will be marked approved. The data itself stays exactly as it is, and each change keeps its line in the activity trail.",
        label: "Accept all"
      }).then(function (ok) {
        if (ok) approveAllPending();
      });
    });
  }

  var clearActivity = $("admin-clear-activity");
  if (clearActivity) {
    clearActivity.addEventListener("click", function () {
      var resolved = Z.audit.list().filter(function (event) { return event.status !== "pending"; }).length;
      if (!resolved) return;
      Z.confirm({
        kicker: "Activity trail",
        title: "Clear resolved activity?",
        message: "This removes " + resolved + " resolved " + (resolved === 1 ? "change" : "changes") + " from the trail. Pending changes are kept. Resolved changes that are gone can no longer be rolled back from this screen.",
        label: "Clear resolved"
      }).then(function (ok) {
        if (!ok) return;
        var removed = Z.audit.clearResolved();
        renderAll();
        Z.toast("Cleared " + removed + " resolved " + (removed === 1 ? "change" : "changes"));
      });
    });
  }

  if (autoApproveInput) {
    autoApproveInput.addEventListener("change", function () {
      var turnOn = autoApproveInput.checked;
      if (!turnOn) {
        admin.settings.autoApprove = false;
        saveAdmin();
        Z.audit.system("policy", "Manual review enabled", "New changes go live immediately and wait in Activity for a decision.", "Admin");
        renderAll();
        Z.toast("Manual review is on");
        return;
      }
      Z.confirm({
        kicker: "Approval policy",
        title: "Auto-approve every new change?",
        message: "Future changes will arrive approved. Anything already pending will be accepted now, and every change still keeps its line in the activity trail.",
        label: "Turn on"
      }).then(function (ok) {
        if (!ok) {
          autoApproveInput.checked = false;
          return;
        }
        admin.settings.autoApprove = true;
        saveAdmin();
        var count = Z.audit.approveAll();
        Z.audit.system(
          "policy",
          "Auto-approval enabled",
          "New changes arrive approved. The full activity trail remains." +
            (count ? " " + count + " pending " + (count === 1 ? "change was" : "changes were") + " accepted." : ""),
          "Admin"
        );
        renderAll();
        Z.toast("Auto-approval is on" + (count ? " · " + count + " pending accepted" : ""));
      });
    });
  }

  var exportButton = $("admin-export");
  if (exportButton) {
    exportButton.addEventListener("click", function () {
      var records = collectRecords();
      var events = auditEvents();
      var pending = events.filter(function (event) { return event.status === "pending"; });
      var report = {
        app: "Zone",
        type: "admin-report",
        exportedAt: nowISO(),
        policy: admin.settings.autoApprove ? "auto-approve" : "manual-review",
        summary: {
          records: records.length,
          pendingChanges: pending.length,
          approvedChanges: events.filter(function (event) { return event.status === "approved"; }).length,
          rejectedChanges: events.filter(function (event) { return event.status === "rejected"; }).length,
          rolledBackChanges: events.filter(function (event) { return event.status === "rolledback"; }).length,
          totalChanges: events.length
        },
        records: records.map(function (record) {
          return {
            tool: record.tool,
            kind: record.kind,
            title: record.title,
            meta: record.meta,
            status: record.status,
            lastChange: record.latest ? {
              id: record.latest.id,
              action: record.latest.action,
              at: record.latest.at,
              status: record.latest.status
            } : null,
            arrivedVia: record.via
          };
        }),
        changes: events
      };
      Z.download("zone-admin-report-" + Z.todayISO() + ".json", JSON.stringify(report, null, 2), "application/json");
      Z.toast("Admin report exported");
    });
  }

  var exportDataButton = $("admin-export-data");
  var importDataButton = $("admin-import-data");
  var importFile = $("admin-import-file");
  var importStatus = $("admin-import-status");

  if (exportDataButton) {
    exportDataButton.addEventListener("click", function () {
      var payload = {
        app: "Zone",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: Z.store.exportAll()
      };
      Z.download("zone-backup-" + Z.todayISO() + ".json", JSON.stringify(payload, null, 2), "application/json");
      if (importStatus) {
        importStatus.textContent = "Backup exported · " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      Z.toast("Backup exported");
      renderStorageSummary();
    });
  }

  if (importDataButton && importFile) {
    importDataButton.addEventListener("click", function () {
      importFile.click();
    });
    importFile.addEventListener("change", function () {
      var file = importFile.files && importFile.files[0];
      if (!file) return;
      if (importStatus) importStatus.textContent = "Reading " + file.name + "…";
      var reader = new FileReader();
      reader.onload = function () {
        var prepared;
        try {
          prepared = validateBackup(String(reader.result || ""));
        } catch (err) {
          if (importStatus) importStatus.textContent = "Import failed · " + err.message;
          Z.toast(err.message || "Could not read that backup.", "error");
          importFile.value = "";
          return;
        }
        var names = Object.keys(prepared).map(function (key) { return BACKUP_SECTIONS[key].label; });
        Z.confirm({
          kicker: "Import backup",
          title: "Replace these sections?",
          message: "This workspace will take the backup's <strong>" + esc(names.join(", ")) + "</strong>. Any current data in those sections is replaced. Everything else stays.",
          label: "Import data"
        }).then(function (ok) {
          if (!ok) {
            if (importStatus) importStatus.textContent = "Import cancelled.";
            importFile.value = "";
            return;
          }
          var apply = function () {
            Object.keys(prepared).forEach(function (key) {
              Z.store.set(key, prepared[key]);
            });
          };
          var auditable = Object.keys(prepared).filter(function (key) { return !!Z.audit.sections[key]; });
          if (auditable.length) {
            Z.audit.transaction({
              keys: auditable,
              action: "import",
              title: "Imported workspace backup",
              detail: "Imported " + names.join(", ") + " from a local backup.",
              tool: "Admin",
              page: "admin",
              icon: "upload"
            }, apply);
          } else {
            Z.audit.suppress(apply);
            Z.audit.system("import", "Imported workspace settings", "Imported " + names.join(", ") + " from a local backup.", "Admin");
          }
          if (importStatus) importStatus.textContent = "Imported " + names.length + " " + (names.length === 1 ? "section" : "sections") + " · syncing…";
          Z.toast("Backup imported. Syncing and reloading.");
          var finish = function () { window.location.reload(); };
          if (window.ZCloud && typeof ZCloud.flush === "function") {
            ZCloud.flush().then(finish).catch(finish);
          } else {
            setTimeout(finish, 700);
          }
        });
        importFile.value = "";
      };
      reader.onerror = function () {
        if (importStatus) importStatus.textContent = "Import failed · the file could not be read.";
        Z.toast("Could not read that file.", "error");
        importFile.value = "";
      };
      reader.readAsText(file);
    });
  }

  var refreshTimer = null;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      admin = loadAdmin();
      renderAll();
    }, 180);
  }

  window.addEventListener("storage", function (event) {
    if (!event.key || event.key.indexOf("zone.v1.") !== 0) return;
    scheduleRefresh();
  });
  document.addEventListener("zone:audit", scheduleRefresh);

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  renderToolOptions();

  var showGate = function () {
    if (gate) gate.hidden = false;
    if (app) app.hidden = true;
    if (lockButton) lockButton.hidden = true;
    setTimeout(function () { if (codeInput) codeInput.focus(); }, 220);
  };

  if (window.ZCloud && typeof ZCloud.verify === "function") {
    ZCloud.verify().then(function (ok) {
      if (ok) unlockApp();
      else showGate();
    }).catch(showGate);
  } else {
    showGate();
  }
})();
