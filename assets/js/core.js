/* ==========================================================================
   Zone — core
   Private helpers, shared shell, command palette, theme, dialogs.
   ========================================================================== */

(function () {
  "use strict";

  var PREFIX = "zone.v1.";

  var PAGES = [
    { id: "home", label: "Overview", href: "index.html", icon: "grid", group: "Workspace", desc: "The whole desk at a glance" },
    { id: "diary", label: "Diary", href: "diary.html", icon: "book", group: "Personal", desc: "A daily record of what happened" },
    { id: "lists", label: "Lists", href: "lists.html", icon: "list", group: "Personal", desc: "Nested checklists for things with steps" },
    { id: "habits", label: "Habits", href: "habits.html", icon: "repeat", group: "Personal", desc: "Small repetitions, made visible" },
    { id: "notes", label: "Notes", href: "notes.html", icon: "note", group: "Personal", desc: "A scratchpad with a memory" },
    { id: "money", label: "Money", href: "money.html", icon: "wallet", group: "Money", desc: "Where the month goes" },
    { id: "passbook", label: "Passbook", href: "passbook.html", icon: "ledger", group: "Money", desc: "Every account, one statement" },
    { id: "split", label: "Split", href: "split.html", icon: "split", group: "Money", desc: "Shared costs, without the arithmetic" },
    { id: "mileage", label: "Mileage", href: "mileage.html", icon: "car", group: "Money", desc: "Distance, fuel, and cost per kilometre" },
    { id: "watchlist", label: "Watchlist", href: "watchlist.html", icon: "film", group: "Library", desc: "What to watch, and what was worth it" },
    { id: "links", label: "Links", href: "links.html", icon: "link", group: "Library", desc: "A shelf for the good corners of the web" },
    { id: "subscriptions", label: "Subscriptions", href: "subscriptions.html", icon: "card", group: "Library", desc: "The quiet monthly cost of it all" },
    { id: "settings", label: "Settings", href: "settings.html", icon: "gear", group: "System", desc: "Appearance and display currency" },
    { id: "admin", label: "Admin", href: "admin.html", icon: "shield", group: "System", desc: "Approvals, audit trail, backups, and workspace controls" }
  ];

  var ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    note: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
    wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7H5a2 2 0 0 0-2 2"/><path d="M16 13h.01"/>',
    ledger: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 3l-7.5 7.5"/><path d="M3 3l7.5 7.5"/><path d="M12 12v9"/>',
    car: '<path d="M3 17h18"/><path d="M5 17l1-6 2-4h8l2 4 1 6"/><path d="M9 7h6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    film: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 9h5M2 15h5M17 9h5M17 15h5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    gear: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.42-1.42"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5.5-4-7.5-.8 2-2 3-3 3 0-3-1.5-6-4-8 .2 3-3 5.5-3 10.5 0 4.5 3 9 7 9z"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M7 17 17 7M7 7h10v10"/>',
    star: '<path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    tag: '<path d="M20.6 13.4 12 22l-9-9 8.6-8.6a2 2 0 0 1 1.4-.4H20a2 2 0 0 1 2 2v6.6a2 2 0 0 1-.6 1.4z"/><path d="M7.5 7.5h.01"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'
  };

  function icon(name, cls) {
    var d = ICONS[name] || ICONS.spark;
    return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function readRaw(key) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw == null ? undefined : JSON.parse(raw);
    } catch (err) {
      return undefined;
    }
  }

  function cloudPushData(key, value) {
    try {
      if (window.ZCloud && typeof window.ZCloud.pushData === "function") {
        window.ZCloud.pushData(key, value);
      }
    } catch (err) { /* the local cache remains authoritative for this page */ }
  }

  function cloudPushAudit(events, deleted) {
    try {
      if (window.ZCloud && typeof window.ZCloud.pushAudit === "function") {
        window.ZCloud.pushAudit(events, deleted);
      }
    } catch (err) { /* the local cache remains authoritative for this page */ }
  }

  function writeRaw(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      cloudPushData(key, value);
      return true;
    } catch (err) {
      toast("Could not save. Your browser storage may be full.", "error");
      return false;
    }
  }

  /* ------------------------------------------------------------------------
     Live change log
     Every content write lands here first: a compact before/after patch that
     admin can approve, reject, roll back, or reapply. It intentionally does
     not gate the write; the app stays fast and the desk follows behind it.
     ------------------------------------------------------------------------ */

  var AUDIT_KEY = "audit";
  var AUDIT_LIMIT = 400;
  var AUDIT_SECTIONS = {
    diary: {
      tool: "Diary", page: "diary", icon: "book", label: "Diary", kind: "array",
      noun: "diary entry", plural: "diary entries", titleFields: ["title"]
    },
    lists: {
      tool: "Lists", page: "lists", icon: "list", label: "Lists", kind: "array",
      noun: "list", plural: "lists", titleFields: ["title"]
    },
    habits: {
      tool: "Habits", page: "habits", icon: "repeat", label: "Habits", kind: "object",
      fields: [
        { name: "habits", kind: "array", noun: "habit", plural: "habits", titleFields: ["name"] }
      ]
    },
    notes: {
      tool: "Notes", page: "notes", icon: "note", label: "Notes", kind: "array",
      noun: "note", plural: "notes", titleFields: ["title"]
    },
    money: {
      tool: "Money", page: "money", icon: "wallet", label: "Money", kind: "object",
      fields: [
        { name: "transactions", kind: "array", noun: "transaction", plural: "transactions", titleFields: ["note", "category"] },
        { name: "budget", kind: "scalar", label: "Monthly budget" }
      ]
    },
    passbook: {
      tool: "Passbook", page: "passbook", icon: "ledger", label: "Passbook", kind: "object",
      fields: [
        { name: "accounts", kind: "array", noun: "account", plural: "accounts", titleFields: ["name"] },
        { name: "transactions", kind: "array", noun: "entry", plural: "entries", titleFields: ["description", "category"] }
      ]
    },
    split: {
      tool: "Split", page: "split", icon: "split", label: "Split", kind: "object",
      fields: [
        { name: "groups", kind: "array", noun: "split group", plural: "split groups", titleFields: ["name"] }
      ]
    },
    trips: {
      tool: "Mileage", page: "mileage", icon: "car", label: "Mileage", kind: "array",
      noun: "fill-up", plural: "fill-ups", titleFields: ["vehicle", "note"]
    },
    vehicles: {
      tool: "Mileage", page: "mileage", icon: "car", label: "Mileage", kind: "array",
      noun: "vehicle", plural: "vehicles", titleFields: ["name"]
    },
    watchlist: {
      tool: "Watchlist", page: "watchlist", icon: "film", label: "Watchlist", kind: "array",
      noun: "title", plural: "titles", titleFields: ["title"]
    },
    links: {
      tool: "Links", page: "links", icon: "link", label: "Links", kind: "array",
      noun: "link", plural: "links", titleFields: ["title", "url"]
    },
    subscriptions: {
      tool: "Subscriptions", page: "subscriptions", icon: "card", label: "Subscriptions", kind: "array",
      noun: "subscription", plural: "subscriptions", titleFields: ["name"]
    }
  };

  var auditBuffer = {};
  var auditFlushQueued = false;
  var auditSuppressed = 0;

  function cloneValue(value) {
    if (value === undefined) return undefined;
    try { return JSON.parse(JSON.stringify(value)); } catch (err) { return value; }
  }

  function sameJSON(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (err) { return a === b; }
  }

  function isRecordObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function recordIdOf(record) {
    if (!record || typeof record !== "object" || record.id == null) return "";
    return String(record.id);
  }

  function clipText(value, max) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    return text.length > max ? text.slice(0, max - 1) + "…" : text;
  }

  function auditRecordTitle(section, field, record) {
    var noun = (field && field.noun) || section.noun || "record";
    if (!record || typeof record !== "object") return "Untitled " + noun;
    var fields = (field && field.titleFields) || section.titleFields || ["title", "name", "description", "note"];
    for (var i = 0; i < fields.length; i += 1) {
      var text = record[fields[i]];
      if (text != null && String(text).trim()) return clipText(text, 72);
    }
    return "Untitled " + noun;
  }

  function diffAuditArray(beforeValue, afterValue, section, field) {
    var before = Array.isArray(beforeValue) ? beforeValue : [];
    var after = Array.isArray(afterValue) ? afterValue : [];
    if (sameJSON(before, after)) return null;

    var beforeMap = {};
    var afterMap = {};
    var unkeyed = false;

    before.forEach(function (record, index) {
      var id = recordIdOf(record);
      if (!id) unkeyed = true;
      else beforeMap[id] = { record: record, index: index };
    });
    after.forEach(function (record, index) {
      var id = recordIdOf(record);
      if (!id) unkeyed = true;
      else afterMap[id] = { record: record, index: index };
    });

    if (unkeyed) {
      return {
        name: field.name,
        kind: "value",
        noun: field.noun,
        plural: field.plural,
        before: cloneValue(before),
        after: cloneValue(after)
      };
    }

    var changes = [];
    after.forEach(function (record, index) {
      var id = recordIdOf(record);
      var previous = beforeMap[id];
      if (!previous) {
        changes.push({
          id: id,
          op: "add",
          index: index,
          title: auditRecordTitle(section, field, record),
          after: cloneValue(record)
        });
      } else if (!sameJSON(previous.record, record)) {
        changes.push({
          id: id,
          op: "edit",
          index: index,
          title: auditRecordTitle(section, field, record),
          before: cloneValue(previous.record),
          after: cloneValue(record)
        });
      }
    });
    before.forEach(function (record, index) {
      var id = recordIdOf(record);
      if (afterMap[id]) return;
      changes.push({
        id: id,
        op: "remove",
        index: index,
        title: auditRecordTitle(section, field, record),
        before: cloneValue(record)
      });
    });

    if (!changes.length) return null;
    return {
      name: field.name,
      kind: "array",
      noun: field.noun,
      plural: field.plural,
      changes: changes
    };
  }

  function diffAuditSection(key, beforeValue, afterValue) {
    var section = AUDIT_SECTIONS[key];
    if (!section) return null;
    var fields = [];

    if (section.kind === "array") {
      var arrayField = diffAuditArray(beforeValue, afterValue, section, {
        name: null,
        noun: section.noun,
        plural: section.plural,
        titleFields: section.titleFields
      });
      if (arrayField) fields.push(arrayField);
    } else {
      var before = isRecordObject(beforeValue) ? beforeValue : {};
      var after = isRecordObject(afterValue) ? afterValue : {};
      (section.fields || []).forEach(function (field) {
        if (field.kind === "array") {
          var patch = diffAuditArray(before[field.name], after[field.name], section, field);
          if (patch) fields.push(patch);
        } else if (field.kind === "scalar" && !sameJSON(before[field.name], after[field.name])) {
          fields.push({
            name: field.name,
            kind: "scalar",
            label: field.label,
            before: cloneValue(before[field.name]),
            after: cloneValue(after[field.name])
          });
        }
      });
    }

    if (!fields.length) return null;
    return {
      key: key,
      tool: section.tool,
      page: section.page,
      icon: section.icon,
      label: section.label,
      fields: fields
    };
  }

  function auditChanges(patches) {
    var changes = [];
    (patches || []).forEach(function (patch) {
      (patch.fields || []).forEach(function (field) {
        if (field.kind === "array") {
          (field.changes || []).forEach(function (change) {
            changes.push({
              key: patch.key,
              field: field.name,
              id: change.id,
              op: change.op,
              index: change.index,
              title: change.title,
              before: change.before,
              after: change.after,
              noun: field.noun,
              plural: field.plural,
              tool: patch.tool,
              page: patch.page,
              label: patch.label
            });
          });
        } else {
          changes.push({
            key: patch.key,
            field: field.name,
            id: "",
            op: "edit",
            index: 0,
            title: field.label || field.name || patch.label,
            before: field.before,
            after: field.after,
            noun: "value",
            plural: "values",
            scalar: field.kind === "scalar",
            value: field.kind === "value",
            tool: patch.tool,
            page: patch.page,
            label: patch.label
          });
        }
      });
    });
    return changes;
  }

  function inferAuditAction(patches) {
    var ops = { add: 0, edit: 0, remove: 0 };
    auditChanges(patches).forEach(function (change) {
      ops[change.op] = (ops[change.op] || 0) + 1;
    });
    if (ops.add && !ops.edit && !ops.remove) return "add";
    if (ops.remove && !ops.edit && !ops.add) return "delete";
    if (ops.edit && !ops.add && !ops.remove) return "edit";
    return "mixed";
  }

  function auditPlural(value, one, many) {
    return value + " " + (value === 1 ? one : many);
  }

  function auditEventCopy(patches) {
    var changes = auditChanges(patches);
    var tools = [];
    var pages = [];
    changes.forEach(function (change) {
      if (tools.indexOf(change.tool) === -1) tools.push(change.tool);
      if (pages.indexOf(change.page) === -1) pages.push(change.page);
    });
    var tool = tools.length === 1 ? tools[0] : "Workspace";
    var page = pages.length === 1 ? pages[0] : "admin";
    var icon = page === "admin" ? "shield" : ((PAGES.filter(function (p) { return p.id === page; })[0] || {}).icon || "spark");
    var action = inferAuditAction(patches);
    var records = changes.filter(function (change) { return !change.scalar && !change.value; });
    var title = "";
    var detail = "";

    if (records.length === 1 && changes.length === 1) {
      var record = records[0];
      if (action === "add") title = "Added “" + record.title + "”";
      else if (action === "delete") title = "Deleted “" + record.title + "”";
      else if (action === "mixed") title = "Updated “" + record.title + "”";
      else title = "Edited “" + record.title + "”";
    } else if (records.length) {
      var noun = records[0].plural || "records";
      var sameNoun = records.every(function (record) { return record.plural === noun; });
      if (action === "add") {
        title = sameNoun
          ? "Added " + auditPlural(records.length, records[0].noun || "record", noun)
          : "Added " + auditPlural(records.length, "record", "records");
      } else if (action === "delete") {
        title = sameNoun
          ? "Deleted " + auditPlural(records.length, records[0].noun || "record", noun)
          : "Deleted " + auditPlural(records.length, "record", "records");
      } else {
        title = "Updated " + auditPlural(records.length, "record", "records") + " in " + tool;
      }
    } else {
      var labels = changes.map(function (change) { return change.title; }).filter(Boolean);
      title = "Updated " + (labels.length ? labels.join(", ") : (tool + " data"));
    }

    var recordCount = records.length;
    detail = tool + " · " + auditPlural(changes.length, "change", "changes") +
      (recordCount && changes.length !== recordCount ? " across " + auditPlural(recordCount, "record", "records") : "");

    return {
      action: action,
      tool: tool,
      page: page,
      icon: icon,
      title: clipText(title, 96),
      detail: detail,
      count: changes.length,
      recordCount: recordCount
    };
  }

  function readAuditData() {
    var data;
    try {
      data = JSON.parse(localStorage.getItem(PREFIX + AUDIT_KEY) || "null");
    } catch (err) {
      data = null;
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) data = {};
    if (!Array.isArray(data.events)) data.events = [];
    data.events = data.events.filter(function (event) {
      return event && typeof event === "object" && event.id && event.at;
    });
    return data;
  }

  function trimResolvedEvents(events, keep) {
    var pending = events.filter(function (event) { return event.status === "pending"; });
    var resolved = events.filter(function (event) { return event.status !== "pending"; });
    var room = Math.max(0, keep - pending.length);
    return pending.concat(resolved.slice(0, room)).sort(function (a, b) {
      return String(b.at).localeCompare(String(a.at));
    }).slice(0, keep);
  }

  function writeAuditData(data, options) {
    if (!data || !Array.isArray(data.events)) return false;
    if (data.events.length > AUDIT_LIMIT) data.events = trimResolvedEvents(data.events, AUDIT_LIMIT);
    var deleted = options && Array.isArray(options.deleted) ? options.deleted : [];
    var previousEvents = [];
    try {
      var previous = JSON.parse(localStorage.getItem(PREFIX + AUDIT_KEY) || "{}");
      if (previous && Array.isArray(previous.events)) previousEvents = previous.events;
    } catch (err) {
      previousEvents = [];
    }
    var saved = false;
    var text;
    try { text = JSON.stringify(data); } catch (err) { return false; }
    try {
      localStorage.setItem(PREFIX + AUDIT_KEY, text);
      saved = true;
    } catch (err) {
      var keep = Math.min(AUDIT_LIMIT, Math.max(80, Math.floor(data.events.length * 0.6)));
      data.events = trimResolvedEvents(data.events, keep);
      try {
        localStorage.setItem(PREFIX + AUDIT_KEY, JSON.stringify(data));
        saved = true;
      } catch (again) {
        saved = false;
      }
    }
    if (saved) {
      var before = {};
      var after = {};
      var changed = [];
      var removed = deleted.slice();
      previousEvents.forEach(function (event) {
        if (event && event.id) before[event.id] = JSON.stringify(event);
      });
      data.events.forEach(function (event) {
        if (!event || !event.id) return;
        after[event.id] = true;
        if (before[event.id] !== JSON.stringify(event)) changed.push(event);
      });
      previousEvents.forEach(function (event) {
        if (event && event.id && !after[event.id]) removed.push(event.id);
      });
      var seenRemoved = {};
      removed = removed.filter(function (id) {
        if (!id || seenRemoved[id]) return false;
        seenRemoved[id] = true;
        return true;
      });
      if (changed.length || removed.length) cloudPushAudit(changed, removed);
    }
    return saved;
  }

  function addAuditEvent(data, patches, options) {
    var opts = options || {};
    var copy = auditEventCopy(patches);
    var now = opts.at || new Date().toISOString();
    var status = opts.status || (auditAutoApprove() ? "approved" : "pending");
    var event = {
      id: uid("chg"),
      at: now,
      tool: opts.tool || copy.tool,
      page: opts.page || copy.page,
      icon: opts.icon || copy.icon,
      action: opts.action || copy.action,
      title: opts.title || copy.title,
      detail: opts.detail || copy.detail,
      status: status,
      source: opts.source || "user",
      patches: patches || [],
      count: typeof opts.count === "number" ? opts.count : copy.count,
      restoredFrom: opts.restoredFrom || "",
      reviewedAt: status === "approved" ? now : "",
      auto: opts.auto !== undefined ? !!opts.auto : (!opts.status && status === "approved")
    };
    if (opts.note) event.reviewNote = String(opts.note);
    data.events.unshift(event);
    return event;
  }

  function auditAutoApprove() {
    var data = store.get("admin", {});
    return !!(data && data.settings && data.settings.autoApprove);
  }

  function queueAuditChange(key, before, after) {
    if (auditSuppressed) return;
    if (!AUDIT_SECTIONS[key]) return;
    if (sameJSON(before, after)) return;
    var entry = auditBuffer[key];
    if (!entry) {
      auditBuffer[key] = { before: cloneValue(before), after: cloneValue(after) };
    } else {
      entry.after = cloneValue(after);
    }
    if (auditFlushQueued) return;
    auditFlushQueued = true;
    var run = function () {
      auditFlushQueued = false;
      flushAudit();
    };
    if (typeof queueMicrotask === "function") queueMicrotask(run);
    else setTimeout(run, 0);
  }

  function flushAudit() {
    var buffer = auditBuffer;
    auditBuffer = {};
    var patches = [];
    Object.keys(buffer).forEach(function (key) {
      var patch = diffAuditSection(key, buffer[key].before, buffer[key].after);
      if (patch) patches.push(patch);
    });
    if (!patches.length) return;
    var data = readAuditData();
    var event = addAuditEvent(data, patches, { source: "user" });
    if (writeAuditData(data)) fireAudit(event);
  }

  function fireAudit(event) {
    refreshAuditBadges();
    try {
      document.dispatchEvent(new CustomEvent("zone:audit", { detail: event }));
    } catch (err) { /* no-op */ }
  }

  function auditEvents() {
    return readAuditData().events.slice();
  }

  function auditFind(id) {
    return readAuditData().events.filter(function (event) { return event.id === id; })[0] || null;
  }

  function auditPendingCount() {
    return readAuditData().events.filter(function (event) { return event.status === "pending"; }).length;
  }

  function auditApprove(id, note) {
    var data = readAuditData();
    var event = data.events.filter(function (item) { return item.id === id; })[0];
    if (!event || event.status !== "pending") return null;
    event.status = "approved";
    event.reviewedAt = new Date().toISOString();
    event.auto = false;
    event.reviewNote = note || "Approved by admin.";
    if (writeAuditData(data)) fireAudit(event);
    return event;
  }

  function auditApproveAll() {
    var data = readAuditData();
    var count = 0;
    var now = new Date().toISOString();
    data.events.forEach(function (event) {
      if (event.status !== "pending") return;
      event.status = "approved";
      event.reviewedAt = now;
      event.auto = false;
      event.reviewNote = "Approved in a batch.";
      count += 1;
    });
    if (count && writeAuditData(data)) fireAudit(null);
    return count;
  }

  function applyAuditArray(list, field, mode) {
    var next = Array.isArray(list) ? cloneValue(list) : [];
    (field.changes || []).forEach(function (change) {
      var id = change.id == null ? "" : String(change.id);
      var index = -1;
      if (id) {
        for (var i = 0; i < next.length; i += 1) {
          if (next[i] && String(next[i].id) === id) { index = i; break; }
        }
      }
      var value = mode === "revert" ? cloneValue(change.before) : cloneValue(change.after);
      if (mode === "revert") {
        if (change.op === "add") {
          if (index !== -1) next.splice(index, 1);
        } else if (change.op === "remove") {
          if (index !== -1) next[index] = value;
          else next.splice(Math.min(Math.max(Number(change.index) || 0, 0), next.length), 0, value);
        } else {
          if (index !== -1) next[index] = value;
          else next.splice(Math.min(Math.max(Number(change.index) || 0, 0), next.length), 0, value);
        }
      } else if (change.op === "add") {
        if (index !== -1) next[index] = value;
        else next.splice(Math.min(Math.max(Number(change.index) || 0, 0), next.length), 0, value);
      } else if (change.op === "remove") {
        if (index !== -1) next.splice(index, 1);
      } else if (index !== -1) {
        next[index] = value;
      } else {
        next.splice(Math.min(Math.max(Number(change.index) || 0, 0), next.length), 0, value);
      }
    });
    return next;
  }

  function applyAuditPatch(patch, current, mode) {
    var section = AUDIT_SECTIONS[patch.key];
    if (!section) return cloneValue(current);
    var value = current === undefined
      ? (section.kind === "array" ? [] : {})
      : cloneValue(current);

    if (section.kind === "array") {
      var field = (patch.fields || [])[0];
      if (!field) return value;
      if (field.kind === "array") return applyAuditArray(value, field, mode);
      if (field.kind === "value") return cloneValue(mode === "revert" ? field.before : field.after);
      return cloneValue(mode === "revert" ? field.before : field.after);
    }

    var object = isRecordObject(value) ? value : {};
    (patch.fields || []).forEach(function (field) {
      if (field.kind === "array") {
        object[field.name] = applyAuditArray(object[field.name], field, mode);
      } else if (field.kind === "value") {
        object[field.name] = cloneValue(mode === "revert" ? field.before : field.after);
      } else {
        object[field.name] = cloneValue(mode === "revert" ? field.before : field.after);
      }
    });
    return object;
  }

  function auditAffectedValues(event, mode) {
    var current = {};
    var target = {};
    (event.patches || []).forEach(function (patch) {
      if (!Object.prototype.hasOwnProperty.call(current, patch.key)) {
        current[patch.key] = cloneValue(readRaw(patch.key));
      }
      target[patch.key] = applyAuditPatch(patch, current[patch.key], mode);
    });
    return { current: current, target: target };
  }

  function auditWriteValues(values) {
    auditSuppressed += 1;
    try {
      Object.keys(values).forEach(function (key) {
        var value = values[key];
        if (value === undefined) {
          try { localStorage.removeItem(PREFIX + key); } catch (err) { /* no-op */ }
        } else {
          writeRaw(key, value);
        }
      });
    } finally {
      auditSuppressed -= 1;
    }
  }

  function auditPatchesBetween(beforeValues, afterValues) {
    var patches = [];
    Object.keys(beforeValues).forEach(function (key) {
      var patch = diffAuditSection(key, beforeValues[key], afterValues[key]);
      if (patch) patches.push(patch);
    });
    return patches;
  }

  function auditRevert(id, note) {
    var data = readAuditData();
    var event = data.events.filter(function (item) { return item.id === id; })[0];
    if (!event) return { ok: false, message: "That change is no longer in the log." };
    if (event.status !== "pending" && event.status !== "approved") {
      return { ok: false, message: "This change has already been restored." };
    }
    var wasPending = event.status === "pending";
    var values = auditAffectedValues(event, "revert");
    var patches = auditPatchesBetween(values.current, values.target);
    auditWriteValues(values.target);

    var now = new Date().toISOString();
    event.status = wasPending ? "rejected" : "rolledback";
    event.reviewedAt = now;
    event.restoreNote = note || (wasPending ? "Rejected and restored." : "Rolled back by admin.");
    event.restoredAt = now;
    var restoreEvent = addAuditEvent(data, patches, {
      at: now,
      action: "restore",
      status: "approved",
      source: "admin",
      tool: event.tool,
      page: event.page,
      icon: event.icon,
      title: (wasPending ? "Rejected “" : "Rolled back “") + event.title + "”",
      detail: "Data restored to the state before this change.",
      restoredFrom: event.id,
      note: note || ""
    });
    event.restoreEventId = restoreEvent.id;
    if (writeAuditData(data)) fireAudit(restoreEvent);
    return { ok: true, event: event, restoreEvent: restoreEvent };
  }

  function auditReapply(id) {
    var data = readAuditData();
    var event = data.events.filter(function (item) { return item.id === id; })[0];
    if (!event) return { ok: false, message: "That change is no longer in the log." };
    if (event.status !== "rejected" && event.status !== "rolledback") {
      return { ok: false, message: "Only a restored change can be reapplied." };
    }
    var values = auditAffectedValues(event, "apply");
    var patches = auditPatchesBetween(values.current, values.target);
    auditWriteValues(values.target);

    var now = new Date().toISOString();
    var reapplyEvent = addAuditEvent(data, patches, {
      at: now,
      action: "reapply",
      status: "approved",
      source: "admin",
      tool: event.tool,
      page: event.page,
      icon: event.icon,
      title: "Reapplied “" + event.title + "”",
      detail: "The original change was applied again.",
      restoredFrom: event.id
    });
    event.reappliedAt = now;
    event.reapplyEventId = reapplyEvent.id;
    if (writeAuditData(data)) fireAudit(reapplyEvent);
    return { ok: true, event: event, reapplyEvent: reapplyEvent };
  }

  function auditTouchMap(event) {
    var touches = {};
    (event.patches || []).forEach(function (patch) {
      (patch.fields || []).forEach(function (field) {
        if (field.kind === "array") {
          (field.changes || []).forEach(function (change) {
            touches[patch.key + "|" + (field.name || "") + "|" + String(change.id)] = true;
          });
        } else {
          touches[patch.key + "|" + (field.name || "") + "|*"] = true;
        }
      });
    });
    return touches;
  }

  function auditConflicts(id) {
    var data = readAuditData();
    var index = -1;
    for (var i = 0; i < data.events.length; i += 1) {
      if (data.events[i].id === id) { index = i; break; }
    }
    if (index < 0) return [];
    var target = auditTouchMap(data.events[index]);
    return data.events.slice(0, index).filter(function (event) {
      if (event.status === "rejected" || event.status === "rolledback") return false;
      var touches = auditTouchMap(event);
      return Object.keys(touches).some(function (key) { return target[key]; });
    });
  }

  function auditRecordStatus(collection, id) {
    var parts = String(collection || "").split(".");
    var key = parts[0];
    var field = parts[1] || null;
    var recordId = String(id);
    var events = readAuditData().events;
    for (var i = 0; i < events.length; i += 1) {
      var event = events[i];
      var patches = event.patches || [];
      for (var j = 0; j < patches.length; j += 1) {
        var patch = patches[j];
        if (patch.key !== key) continue;
        var fields = patch.fields || [];
        for (var k = 0; k < fields.length; k += 1) {
          var item = fields[k];
          if ((item.name || null) !== field) continue;
          if (item.kind !== "array") continue;
          var hit = (item.changes || []).some(function (change) {
            return String(change.id) === recordId;
          });
          if (hit) return { status: event.status, event: event };
        }
      }
    }
    return null;
  }

  function auditSystem(action, title, detail, tool, page, icon) {
    var data = readAuditData();
    var now = new Date().toISOString();
    var event = {
      id: uid("chg"),
      at: now,
      tool: tool || "Admin",
      page: page || "admin",
      icon: icon || "shield",
      action: action || "system",
      title: title || "Admin action",
      detail: detail || "",
      status: "approved",
      source: "admin",
      patches: [],
      count: 0,
      restoredFrom: "",
      reviewedAt: now,
      auto: false
    };
    data.events.unshift(event);
    if (writeAuditData(data)) fireAudit(event);
    return event;
  }

  function auditTransaction(options, run) {
    var opts = options || {};
    var keys = (opts.keys && opts.keys.length ? opts.keys : Object.keys(AUDIT_SECTIONS)).filter(function (key) {
      return !!AUDIT_SECTIONS[key];
    });
    var before = {};
    keys.forEach(function (key) { before[key] = cloneValue(readRaw(key)); });
    var result;
    auditSuppressed += 1;
    try {
      result = run();
    } catch (err) {
      auditSuppressed -= 1;
      throw err;
    }
    auditSuppressed -= 1;
    var after = {};
    keys.forEach(function (key) { after[key] = cloneValue(readRaw(key)); });
    var patches = auditPatchesBetween(before, after);
    if (patches.length) {
      var data = readAuditData();
      var event = addAuditEvent(data, patches, {
        at: new Date().toISOString(),
        status: "approved",
        source: "admin",
        action: opts.action || "import",
        tool: opts.tool || "Admin",
        page: opts.page || "admin",
        icon: opts.icon || "upload",
        title: opts.title || "Imported workspace data",
        detail: opts.detail || "Applied from the admin desk.",
        note: opts.note || ""
      });
      if (writeAuditData(data)) fireAudit(event);
    }
    return result;
  }

  function auditClearResolved() {
    var data = readAuditData();
    var pending = data.events.filter(function (event) { return event.status === "pending"; });
    var removedEvents = data.events.filter(function (event) { return event.status !== "pending"; });
    var removed = removedEvents.length;
    if (!removed) return 0;
    data.events = pending;
    var now = new Date().toISOString();
    data.events.unshift({
      id: uid("chg"),
      at: now,
      tool: "Admin",
      page: "admin",
      icon: "shield",
      action: "clear",
      title: "Resolved activity cleared",
      detail: removed + " resolved " + (removed === 1 ? "change was" : "changes were") + " removed from the visible trail.",
      status: "approved",
      source: "admin",
      patches: [],
      count: 0,
      restoredFrom: "",
      reviewedAt: now,
      auto: false
    });
    if (writeAuditData(data, { deleted: removedEvents.map(function (event) { return event.id; }) })) fireAudit(null);
    return removed;
  }

  var audit = {
    sections: AUDIT_SECTIONS,
    list: auditEvents,
    find: auditFind,
    pendingCount: auditPendingCount,
    approve: auditApprove,
    approveAll: auditApproveAll,
    revert: auditRevert,
    reapply: auditReapply,
    conflicts: auditConflicts,
    recordStatus: auditRecordStatus,
    system: auditSystem,
    transaction: auditTransaction,
    clearResolved: auditClearResolved,
    suppress: function (run) {
      auditSuppressed += 1;
      try { return run(); } finally { auditSuppressed -= 1; }
    }
  };

  var store = {
    get: function (key, fallback) {
      var value = readRaw(key);
      return value === undefined ? fallback : value;
    },
    set: function (key, value) {
      var before = readRaw(key);
      var ok = writeRaw(key, value);
      if (ok) queueAuditChange(key, before, cloneValue(value));
      return ok;
    },
    remove: function (key) {
      var before = readRaw(key);
      try {
        localStorage.removeItem(PREFIX + key);
      } catch (err) { /* no-op */ }
      cloudPushData(key, null);
      queueAuditChange(key, before, undefined);
    },
    keys: function () {
      var keys = [];
      try {
        for (var i = 0; i < localStorage.length; i += 1) {
          var k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) keys.push(k.slice(PREFIX.length));
        }
      } catch (err) { /* no-op */ }
      return keys;
    },
    size: function () {
      var total = 0;
      try {
        store.keys().forEach(function (key) {
          var raw = localStorage.getItem(PREFIX + key) || "";
          total += raw.length * 2;
        });
      } catch (err) { /* no-op */ }
      return total;
    },
    clear: function () {
      store.keys().forEach(function (key) {
        try { localStorage.removeItem(PREFIX + key); } catch (err) { /* no-op */ }
        cloudPushData(key, null);
      });
    },
    exportAll: function () {
      var data = {};
      store.keys().forEach(function (key) { data[key] = readRaw(key); });
      return data;
    }
  };

  var CURRENCIES = {
    INR: { locale: "en-IN" },
    USD: { locale: "en-US" },
    EUR: { locale: "de-DE" },
    GBP: { locale: "en-GB" },
    AED: { locale: "en-AE" },
    AUD: { locale: "en-AU" },
    CAD: { locale: "en-CA" },
    SGD: { locale: "en-SG" }
  };

  var DEFAULT_SETTINGS = { currency: "INR", theme: "system" };

  function settings() {
    var saved = store.get("settings", {});
    var merged = Object.assign({}, DEFAULT_SETTINGS, saved || {});
    if (!CURRENCIES[merged.currency]) merged.currency = "INR";
    if (["light", "dark", "system"].indexOf(merged.theme) === -1) merged.theme = "system";
    return merged;
  }

  function saveSettings(patch) {
    var next = Object.assign({}, settings(), patch || {});
    store.set("settings", next);
    return next;
  }

  function money(value, digits) {
    var amount = Number(value);
    if (!isFinite(amount)) amount = 0;
    var c = settings().currency;
    var info = CURRENCIES[c] || CURRENCIES.INR;
    var places = typeof digits === "number" ? digits : 0;
    try {
      return new Intl.NumberFormat(info.locale, {
        style: "currency",
        currency: c,
        minimumFractionDigits: places,
        maximumFractionDigits: places
      }).format(amount);
    } catch (err) {
      return c + " " + amount.toFixed(places);
    }
  }

  function num(value, digits) {
    var amount = Number(value);
    if (!isFinite(amount)) amount = 0;
    var places = typeof digits === "number" ? digits : 0;
    return new Intl.NumberFormat(settings().currency === "INR" ? "en-IN" : "en-US", {
      minimumFractionDigits: places,
      maximumFractionDigits: places
    }).format(amount);
  }

  function parseISO(iso) {
    if (!iso) return new Date();
    var parts = String(iso).split("-").map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function toISO(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function todayISO() {
    return toISO(new Date());
  }

  function addDays(iso, days) {
    var d = parseISO(iso);
    d.setDate(d.getDate() + days);
    return toISO(d);
  }

  function daysBetween(a, b) {
    return Math.round((parseISO(b) - parseISO(a)) / 86400000);
  }

  function dateLong(iso) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(parseISO(iso));
  }

  function dateMedium(iso) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", year: "numeric"
    }).format(parseISO(iso));
  }

  function dateShort(iso) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short"
    }).format(parseISO(iso));
  }

  function dateWeekday(iso) {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short", day: "numeric", month: "short"
    }).format(parseISO(iso));
  }

  function relDate(iso) {
    var diff = daysBetween(iso, todayISO());
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff === 2) return "2 days ago";
    if (diff === -1) return "Tomorrow";
    if (diff > 2 && diff < 7) return diff + " days ago";
    if (diff < -1 && diff > -7) return "In " + Math.abs(diff) + " days";
    return dateMedium(iso);
  }

  function monthLabel(monthKey, long) {
    if (!monthKey) return "";
    var d = parseISO(monthKey + "-01");
    return new Intl.DateTimeFormat("en-GB", {
      month: long ? "long" : "short", year: "numeric"
    }).format(d);
  }

  function monthKey(iso) {
    return String(iso || "").slice(0, 7);
  }

  function daysUntil(iso) {
    return daysBetween(todayISO(), iso);
  }

  function startOfWeek(base) {
    var d = base ? parseISO(base) : new Date();
    var day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7));
    return toISO(d);
  }

  function weekDates(offsetWeeks) {
    var start = startOfWeek();
    var out = [];
    for (var i = 0; i < 7; i += 1) out.push(addDays(start, (offsetWeeks || 0) * 7 + i));
    return out;
  }

  var CATEGORY_COLORS = {
    Rent: "#c95b3d",
    Groceries: "#7c8b6e",
    Transport: "#7b8795",
    Food: "#c19a50",
    Utilities: "#667d87",
    Health: "#a87463",
    Shopping: "#8a785e",
    Entertainment: "#907080",
    Travel: "#5f7a74",
    Education: "#72828f",
    Gifts: "#b38961",
    "Other": "#a49c8c",
    Salary: "#557257",
    Freelance: "#6b7f8c",
    Investments: "#9a875b",
    Refund: "#788d75",
    Transfer: "#8e887a",
    Settlement: "#8e887a"
  };

  function categoryColor(name) {
    return CATEGORY_COLORS[name] || "#a49c8c";
  }

  function initials(text, count) {
    var parts = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, count || 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function toneFor(text) {
    var sum = 0;
    var str = String(text || "");
    for (var i = 0; i < str.length; i += 1) sum = (sum + str.charCodeAt(i)) % 997;
    return sum % 6;
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms || 180);
    };
  }

  function toast(message, kind) {
    var stack = document.getElementById("toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toast-stack";
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = icon(kind === "error" ? "alert" : "check") + "<span>" + esc(message) + "</span>";
    stack.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 200);
    }, 2900);
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () {
        toast("Copied to clipboard");
      }).catch(function () {
        toast("Could not copy", "error");
      });
    }
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      toast("Copied to clipboard");
    } catch (err) {
      toast("Could not copy", "error");
    }
    area.remove();
    return Promise.resolve();
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function csv(rows) {
    return rows.map(function (row) {
      return row.map(function (cell) {
        var text = String(cell == null ? "" : cell);
        return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
      }).join(",");
    }).join("\r\n");
  }

  var confirmState = { dlg: null };

  function confirmAction(opts) {
    var options = opts || {};
    var dlg = confirmState.dlg;
    if (!dlg) return Promise.resolve(window.confirm(options.message || "Are you sure?"));
    dlg.querySelector("[data-confirm-kicker]").textContent = options.kicker || "Please confirm";
    dlg.querySelector("[data-confirm-title]").textContent = options.title || "Are you sure?";
    dlg.querySelector("[data-confirm-msg]").innerHTML = options.message || "This action cannot be undone.";
    dlg.querySelector("[data-confirm-ok]").textContent = options.label || "Delete";
    dlg.returnValue = "";
    return new Promise(function (resolve) {
      function onClose() {
        dlg.removeEventListener("close", onClose);
        resolve(dlg.returnValue === "confirm");
      }
      dlg.addEventListener("close", onClose);
      dlg.showModal();
    });
  }

  /* ------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */

  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  function resolvedTheme() {
    var theme = settings().theme;
    if (theme === "system") return mq.matches ? "dark" : "light";
    return theme;
  }

  function paintTheme() {
    var value = resolvedTheme();
    document.documentElement.dataset.theme = value;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", value === "dark" ? "#12110f" : "#f3f0e8");
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.innerHTML = icon(value === "dark" ? "sun" : "moon");
      btn.title = value === "dark" ? "Switch to light theme" : "Switch to dark theme";
    });
  }

  function setTheme(theme) {
    saveSettings({ theme: theme });
    paintTheme();
  }

  function toggleTheme() {
    setTheme(resolvedTheme() === "dark" ? "light" : "dark");
  }

  if (mq.addEventListener) {
    mq.addEventListener("change", function () {
      if (settings().theme === "system") paintTheme();
    });
  }

  /* ------------------------------------------------------------------------
     Shell
     ------------------------------------------------------------------------ */

  var pageId = document.body.dataset.page || "home";
  var currentPage = PAGES.filter(function (p) { return p.id === pageId; })[0] || PAGES[0];

  /* A pending review only counts while its record still exists. Deleting a
     record or cascading a passbook account can leave a stale review behind. */
  var RECORD_PATHS = {
    habits: ["habits", "habits"],
    "money.transactions": ["money", "transactions"],
    "passbook.accounts": ["passbook", "accounts"],
    "passbook.transactions": ["passbook", "transactions"],
    "split.groups": ["split", "groups"]
  };

  function reviewRecordExists(key) {
    var cut = String(key).indexOf(":");
    if (cut < 1) return false;
    var collection = key.slice(0, cut);
    var id = key.slice(cut + 1);
    var list;
    var path = RECORD_PATHS[collection];
    if (path) {
      var root = store.get(path[0], {});
      list = root && root[path[1]];
    } else {
      list = store.get(collection, []);
    }
    if (!Array.isArray(list)) return false;
    return list.some(function (item) { return item && String(item.id) === id; });
  }

  function adminPendingCount() {
    return auditPendingCount();
  }

  function refreshAuditBadges() {
    var count = adminPendingCount();
    document.querySelectorAll(".admin-nav-link").forEach(function (link) {
      var badge = link.querySelector(".nav-count");
      if (count) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "nav-count";
          link.appendChild(badge);
        }
        badge.textContent = String(count);
      } else if (badge) {
        badge.remove();
      }
    });
    var railLink = document.querySelector('.rail-link[href="admin.html"]');
    if (!railLink) return;
    var label = "Admin" + (count ? " · " + count + " pending" : "");
    railLink.setAttribute("data-rail-label", label);
    railLink.setAttribute("aria-label", label);
    var dot = railLink.querySelector(".rail-dot");
    if (count && !dot) {
      dot = document.createElement("span");
      dot.className = "rail-dot";
      dot.setAttribute("aria-hidden", "true");
      railLink.appendChild(dot);
    } else if (!count && dot) {
      dot.remove();
    }
    var tip = document.getElementById("rail-tip");
    if (tip && tip.classList.contains("visible")) tip.textContent = label;
  }

  function navGroup(group) {
    var items = PAGES.filter(function (p) { return p.group === group; });
    if (!items.length) return "";
    return '<div class="nav-group"><p class="nav-label">' + esc(group) + "</p>" +
      items.map(function (p) {
        var active = p.id === pageId;
        return '<a class="nav-link' + (active ? " active" : "") + '" href="' + p.href + '"' +
          (active ? ' aria-current="page"' : "") + ">" + icon(p.icon) + "<span>" + esc(p.label) + "</span></a>";
      }).join("") + "</div>";
  }

  function brandMark(size) {
    var s = size || 29;
    return '<svg class="brand-mark" width="' + s + '" height="' + s + '" viewBox="0 0 28 28" fill="none" aria-hidden="true">' +
      '<rect x="1" y="1" width="26" height="26" stroke="currentColor" stroke-width="1.3"/>' +
      '<path d="M1 21.5 21.5 1" stroke="currentColor" stroke-width="1.3"/>' +
      '<rect x="17.5" y="17.5" width="6.5" height="6.5" fill="var(--accent)"/>' +
      "</svg>";
  }

  function hideRailTip() {
    var tip = document.getElementById("rail-tip");
    if (tip) tip.classList.remove("visible");
  }

  function buildNavRail() {
    if (document.querySelector(".nav-rail")) return;
    var pending = adminPendingCount();
    var railPages = PAGES.filter(function (p) { return p.group !== "System"; });
    ["admin", "settings"].forEach(function (id) {
      var page = PAGES.filter(function (p) { return p.id === id; })[0];
      if (page) railPages.push(page);
    });
    var rail = document.createElement("nav");
    rail.className = "nav-rail";
    rail.setAttribute("aria-label", "Quick navigation");
    rail.innerHTML = railPages.map(function (p) {
      var active = p.id === pageId;
      var count = p.id === "admin" ? pending : 0;
      var label = p.label + (count ? " · " + count + " pending" : "");
      return (p.id === "admin" ? '<span class="rail-sep" aria-hidden="true"></span>' : "") +
        '<a class="rail-link' + (active ? " active" : "") + '" href="' + p.href + '"' +
        ' data-rail-label="' + esc(label) + '" aria-label="' + esc(label) + '"' +
        (active ? ' aria-current="page"' : "") + ">" +
        '<span class="rail-icon">' + icon(p.icon) + "</span>" +
        (count ? '<span class="rail-dot" aria-hidden="true"></span>' : "") +
        "</a>";
    }).join("");
    var backdrop = document.querySelector(".sidebar-backdrop");
    if (backdrop) document.body.insertBefore(rail, backdrop);
    else document.body.appendChild(rail);

    var tip = document.createElement("span");
    tip.className = "rail-tip";
    tip.id = "rail-tip";
    tip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tip);

    function showTip(link) {
      if (!window.matchMedia || !window.matchMedia("(min-width: 901px)").matches) return;
      var label = link.getAttribute("data-rail-label");
      if (!label) return;
      var box = link.getBoundingClientRect();
      tip.textContent = label;
      tip.style.top = Math.round(box.top + box.height / 2) + "px";
      tip.classList.add("visible");
    }

    rail.querySelectorAll(".rail-link").forEach(function (link) {
      link.addEventListener("pointerenter", function () { showTip(link); });
      link.addEventListener("pointerleave", hideRailTip);
      link.addEventListener("focus", function () { showTip(link); });
      link.addEventListener("blur", hideRailTip);
      link.addEventListener("click", hideRailTip);
    });
    rail.addEventListener("scroll", hideRailTip);
    window.addEventListener("resize", hideRailTip);
  }

  function buildShell() {
    var sidebar = document.getElementById("sidebar");
    if (sidebar) {
      sidebar.innerHTML =
        '<div class="brand"><a class="brand-link" href="index.html" aria-label="Zone home">' +
        brandMark() + '<span class="brand-word">Zone</span></a>' +
        '<p class="brand-sub">Personal utilities</p></div>' +
        '<nav class="nav" aria-label="Primary">' +
        navGroup("Workspace") + navGroup("Personal") + navGroup("Money") + navGroup("Library") +
        "</nav>" +
        '<div class="sidebar-foot">' +
        '<a class="nav-link admin-nav-link' + (pageId === "admin" ? " active" : "") + '" href="admin.html"' +
        (pageId === "admin" ? ' aria-current="page"' : "") + ">" + icon("shield") + "<span>Admin</span>" +
        (adminPendingCount() ? '<span class="nav-count">' + adminPendingCount() + "</span>" : "") + "</a>" +
        '<a class="nav-link' + (pageId === "settings" ? " active" : "") + '" href="settings.html"' +
        (pageId === "settings" ? ' aria-current="page"' : "") + ">" + icon("gear") + "<span>Settings</span></a>" +
        '<div class="local-chip"><span class="dot"></span>D1 synced<span class="ver">v2.0</span></div>' +
        "</div>";
    }

    var topbar = document.getElementById("topbar");
    if (topbar) {
      var now = new Date();
      var stamp = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" })
        .format(now).toUpperCase();
      var isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
      topbar.innerHTML =
        '<div class="topbar-left">' +
        '<a class="topbar-brand" href="index.html" aria-label="Zone home">' +
        brandMark(21) + '<span class="topbar-brand-word">Zone</span></a>' +
        '<span class="topbar-divider" aria-hidden="true"></span>' +
        '<div class="crumb"><span class="current">' + esc(currentPage.label) + "</span></div>" +
        "</div>" +
        '<div class="topbar-right">' +
        '<span class="top-date">' + esc(stamp) + "</span>" +
        '<button type="button" class="palette-trigger" data-palette-open aria-label="Open command palette">' +
        icon("search") + '<span class="trigger-text">Jump to</span><kbd class="kbd">' + (isMac ? "⌘K" : "Ctrl K") + "</kbd></button>" +
        '<button type="button" class="icon-btn" data-theme-toggle aria-label="Toggle theme">' + icon("moon") + "</button>" +
        '<button type="button" class="icon-btn mobile-menu" data-nav-open aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">' + icon("menu") + "</button>" +
        "</div>";
    }

    buildNavRail();

    if (!document.querySelector("[data-nav-toggle]")) {
      var navHandle = document.createElement("button");
      navHandle.type = "button";
      navHandle.className = "nav-handle";
      navHandle.setAttribute("data-nav-toggle", "");
      navHandle.setAttribute("aria-controls", "sidebar");
      navHandle.setAttribute("aria-expanded", "false");
      navHandle.setAttribute("aria-label", "Show navigation");
      navHandle.setAttribute("title", "Show navigation");
      navHandle.innerHTML =
        '<span class="nav-handle-icon nav-handle-open">' + icon("chevronRight") + "</span>" +
        '<span class="nav-handle-icon nav-handle-close">' + icon("chevronLeft") + "</span>";
      var backdrop = document.querySelector(".sidebar-backdrop");
      document.body.insertBefore(navHandle, backdrop ? backdrop.nextSibling : document.body.firstChild);
    }
  }

  /* ------------------------------------------------------------------------
     Command palette
     ------------------------------------------------------------------------ */

  var palette = { dlg: null, input: null, results: null, items: [], index: 0 };

  function buildPalette() {
    var dlg = document.createElement("dialog");
    dlg.className = "palette";
    dlg.id = "zone-palette";
    dlg.setAttribute("aria-label", "Jump to a page");
    dlg.innerHTML =
      '<div class="palette-input-wrap">' + icon("search") +
      '<input class="palette-input" type="text" placeholder="Where to? Search the desk…" autocomplete="off" spellcheck="false" aria-label="Search pages"></div>' +
      '<div class="palette-results" role="listbox" aria-label="Pages"></div>' +
      '<div class="palette-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> to move</span>' +
      '<span><span class="kbd">↵</span> to open</span><span><span class="kbd">esc</span> to close</span></div>';
    document.body.appendChild(dlg);
    palette.dlg = dlg;
    palette.input = dlg.querySelector(".palette-input");
    palette.results = dlg.querySelector(".palette-results");

    palette.input.addEventListener("input", function () {
      palette.index = 0;
      renderPalette();
    });

    palette.input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        palette.index = Math.min(palette.items.length - 1, palette.index + 1);
        paintPaletteActive();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        palette.index = Math.max(0, palette.index - 1);
        paintPaletteActive();
      } else if (event.key === "Enter") {
        event.preventDefault();
        var chosen = palette.items[palette.index];
        if (chosen) {
          dlg.close();
          window.location.href = chosen.href;
        }
      }
    });

    palette.results.addEventListener("mousemove", function (event) {
      var item = event.target.closest("[data-palette-index]");
      if (!item) return;
      var idx = Number(item.dataset.paletteIndex);
      if (idx !== palette.index) {
        palette.index = idx;
        paintPaletteActive();
      }
    });

    palette.results.addEventListener("click", function (event) {
      var item = event.target.closest("[data-palette-index]");
      if (!item) return;
      dlg.close();
      window.location.href = palette.items[Number(item.dataset.paletteIndex)].href;
    });

    dlg.addEventListener("click", function (event) {
      if (event.target === dlg) {
        var rect = dlg.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
          dlg.close();
        }
      }
    });

    dlg.addEventListener("close", function () {
      palette.input.value = "";
    });
  }

  function paletteMatches() {
    var q = palette.input.value.trim().toLowerCase();
    if (!q) return PAGES.slice();
    return PAGES.filter(function (p) {
      return (p.label + " " + p.desc + " " + p.group).toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderPalette() {
    palette.items = paletteMatches();
    if (!palette.items.length) {
      palette.results.innerHTML = '<div class="empty empty-sm"><h3>Nothing here.</h3><p>Try a different word — "money", "diary", "habit".</p></div>';
      return;
    }
    var lastGroup = "";
    palette.results.innerHTML = palette.items.map(function (p, i) {
      var groupHead = p.group !== lastGroup ? '<div class="palette-group">' + esc(p.group) + "</div>" : "";
      lastGroup = p.group;
      return groupHead +
        '<button type="button" class="palette-item' + (i === palette.index ? " active" : "") + '" data-palette-index="' + i + '" role="option" aria-selected="' + (i === palette.index) + '">' +
        '<span class="palette-icon">' + icon(p.icon) + "</span>" +
        '<span class="palette-text"><span class="palette-name">' + esc(p.label) + '</span><span class="palette-desc">' + esc(p.desc) + "</span></span>" +
        '<span class="kbd">↵</span></button>';
    }).join("");
  }

  function paintPaletteActive() {
    var nodes = palette.results.querySelectorAll("[data-palette-index]");
    nodes.forEach(function (node, i) {
      node.classList.toggle("active", i === palette.index);
      node.setAttribute("aria-selected", String(i === palette.index));
    });
    var active = nodes[palette.index];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
  }

  function openPalette() {
    if (!palette.dlg) return;
    palette.index = 0;
    renderPalette();
    if (!palette.dlg.open) palette.dlg.showModal();
    setTimeout(function () { palette.input.focus(); }, 30);
  }

  function togglePalette() {
    if (!palette.dlg) return;
    if (palette.dlg.open) palette.dlg.close();
    else openPalette();
  }

  /* ------------------------------------------------------------------------
     Confirm dialog
     ------------------------------------------------------------------------ */

  function buildConfirm() {
    var dlg = document.createElement("dialog");
    dlg.className = "dialog small";
    dlg.id = "zone-confirm";
    dlg.innerHTML =
      '<form method="dialog">' +
      '<div class="dialog-head"><div><p class="dialog-kicker" data-confirm-kicker>Please confirm</p>' +
      '<h2 class="dialog-title" data-confirm-title>Are you sure?</h2></div>' +
      '<button type="submit" class="dialog-close" value="cancel" aria-label="Close">' + icon("close") + "</button></div>" +
      '<div class="dialog-body"><p class="confirm-msg" data-confirm-msg></p></div>' +
      '<div class="dialog-foot"><button type="submit" class="btn" value="cancel">Keep it</button>' +
      '<button type="submit" class="btn btn-danger" value="confirm" data-confirm-ok>Delete</button></div></form>';
    document.body.appendChild(dlg);
    confirmState.dlg = dlg;
  }

  /* ------------------------------------------------------------------------
     Global events
     ------------------------------------------------------------------------ */

  function setNavOpen(open) {
    var next = !!open;
    hideRailTip();
    document.body.classList.toggle("nav-open", next);
    Array.prototype.forEach.call(document.querySelectorAll("[data-nav-open]"), function (button) {
      button.setAttribute("aria-expanded", String(next));
    });
    var handle = document.querySelector("[data-nav-toggle]");
    if (handle) {
      handle.setAttribute("aria-expanded", String(next));
      handle.setAttribute("aria-label", next ? "Hide navigation" : "Show navigation");
      handle.setAttribute("title", next ? "Hide navigation" : "Show navigation");
    }
    var sidebar = document.getElementById("sidebar");
    if (next) {
      var firstLink = sidebar && sidebar.querySelector(".brand-link, .nav-link");
      if (firstLink) firstLink.focus();
    } else if (sidebar && sidebar.contains(document.activeElement)) {
      var fallback = window.matchMedia && window.matchMedia("(max-width: 900px)").matches
        ? document.querySelector(".mobile-menu")
        : handle;
      if (fallback) fallback.focus();
    }
  }

  function bindGlobal() {
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-palette-open]")) {
        event.preventDefault();
        openPalette();
        return;
      }
      if (event.target.closest("[data-theme-toggle]")) {
        event.preventDefault();
        toggleTheme();
        return;
      }
      if (event.target.closest("[data-nav-open]")) {
        setNavOpen(true);
        return;
      }
      if (event.target.closest("[data-nav-toggle]")) {
        setNavOpen(!document.body.classList.contains("nav-open"));
        return;
      }
      if (event.target.closest("[data-nav-close]")) {
        setNavOpen(false);
        return;
      }
      if (event.target.closest(".sidebar .nav-link")) {
        setNavOpen(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      var key = (event.key || "").toLowerCase();
      if (key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        togglePalette();
        return;
      }
      if (key === "escape") {
        setNavOpen(false);
      }
    });

    window.addEventListener("pageshow", function (event) {
      if (event.persisted) setNavOpen(false);
    });
  }

  function bindAmbientPointer() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return;
    var frame = 0;
    var nextX = 0;
    var nextY = 0;
    document.addEventListener("pointermove", function (event) {
      nextX = event.clientX;
      nextY = event.clientY;
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        document.documentElement.style.setProperty("--cursor-x", nextX + "px");
        document.documentElement.style.setProperty("--cursor-y", nextY + "px");
        frame = 0;
      });
    }, { passive: true });
  }

  function init() {
    paintTheme();
    buildShell();
    buildPalette();
    buildConfirm();
    bindGlobal();
    bindAmbientPointer();
    window.addEventListener("storage", function (event) {
      if (event.key === PREFIX + "audit") refreshAuditBadges();
    });
    if (!document.getElementById("toast-stack")) {
      var stack = document.createElement("div");
      stack.id = "toast-stack";
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
  }

  window.Z = {
    PREFIX: PREFIX,
    PAGES: PAGES,
    CURRENCIES: CURRENCIES,
    CATEGORY_COLORS: CATEGORY_COLORS,
    icon: icon,
    esc: esc,
    uid: uid,
    store: store,
    audit: audit,
    settings: settings,
    saveSettings: saveSettings,
    money: money,
    num: num,
    parseISO: parseISO,
    toISO: toISO,
    todayISO: todayISO,
    addDays: addDays,
    daysBetween: daysBetween,
    dateLong: dateLong,
    dateMedium: dateMedium,
    dateShort: dateShort,
    dateWeekday: dateWeekday,
    relDate: relDate,
    monthLabel: monthLabel,
    monthKey: monthKey,
    daysUntil: daysUntil,
    startOfWeek: startOfWeek,
    weekDates: weekDates,
    categoryColor: categoryColor,
    initials: initials,
    toneFor: toneFor,
    debounce: debounce,
    toast: toast,
    copy: copy,
    download: download,
    csv: csv,
    confirm: confirmAction,
    resolvedTheme: resolvedTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    openPalette: openPalette,
    paintTheme: paintTheme,
    brandMark: brandMark,
    adminPendingCount: adminPendingCount,
    clearWorkspace: function () {
      store.clear();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
