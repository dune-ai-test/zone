/* Zone — shared expenses */

(function () {
  "use strict";

  var KINDS = {
    home: { label: "Home", icon: "home" },
    trip: { label: "Trip", icon: "suitcase" },
    work: { label: "Work", icon: "briefcase" },
    other: { label: "Other", icon: "spark" }
  };

  var CATEGORIES = {
    home: { label: "Home", icon: "home" },
    food: { label: "Food", icon: "food" },
    travel: { label: "Travel", icon: "suitcase" },
    bills: { label: "Bills", icon: "bolt" },
    fun: { label: "Fun", icon: "ticket" },
    other: { label: "Other", icon: "receipt" },
    settlement: { label: "Settlement", icon: "refresh" }
  };

  var CATEGORY_ORDER = ["home", "food", "travel", "bills", "fun", "other", "settlement"];
  var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  var SP_ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    suitcase: '<path d="M9 6V4h6v2"/><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M9 20v2M15 20v2"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/><path d="M3 12h18"/>',
    receipt: '<path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    food: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10"/><path d="M16 3v18"/><path d="M16 3c2.5 1 4 3.5 4 6h-4"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    ticket: '<path d="M3 9V5h18v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6z"/><path d="M13 5v14"/>'
  };

  function icon(name, cls) {
    var path = SP_ICONS[name];
    if (!path) return Z.icon(name, cls);
    return '<svg' + (cls ? ' class="' + cls + '"' : "") + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
  }

  function avatar(name, size) {
    return '<span class="avatar sp-avatar-' + (size || "sm") + ' tone-' + Z.toneFor(name) + '">' + Z.esc(Z.initials(name)) + "</span>";
  }

  function moneyShort(value) {
    var amount = Number(value) || 0;
    return Z.money(amount, Math.abs(amount - Math.round(amount)) > 0.004 ? 2 : 0);
  }

  function signedMoney(value) {
    var amount = Math.abs(Number(value) || 0);
    return (Number(value) > 0 ? "+" : "−") + moneyShort(amount);
  }

  function netClass(value) {
    var net = Number(value) || 0;
    if (Math.abs(net) < 0.005) return "";
    return net > 0 ? "pos" : "neg";
  }

  function plural(count, one, many) {
    return count + " " + (count === 1 ? one : (many || one + "s"));
  }

  function dateStamp(iso) {
    var date = Z.parseISO(iso);
    if (isNaN(date.getTime())) date = new Date();
    return {
      day: String(date.getDate()).padStart(2, "0"),
      month: MONTHS[date.getMonth()] || ""
    };
  }

  function isLater(a, b) {
    if (!b) return true;
    var left = String(a && a.date || "");
    var right = String(b && b.date || "");
    if (left !== right) return left > right;
    return String(a && a.id || "") > String(b && b.id || "");
  }

  /* ------------------------------------------------------------------------
     Data
     ------------------------------------------------------------------------ */

  var split = Z.store.get("split", { groups: [] });
  if (!split || typeof split !== "object") split = { groups: [] };
  if (!Array.isArray(split.groups)) split.groups = [];

  var groups = split.groups.filter(function (group) {
    return group && typeof group === "object";
  });

  groups.forEach(function (group) {
    if (group.id == null) group.id = Z.uid("group");
    group.id = String(group.id);
    group.name = String(group.name || "Untitled table");
    if (!Array.isArray(group.members)) group.members = [];
    if (!Array.isArray(group.expenses)) group.expenses = [];
    group.members = group.members.filter(function (member) {
      return member && typeof member === "object";
    }).map(function (member) {
      if (member.id == null) member.id = Z.uid("sm");
      member.id = String(member.id);
      member.name = String(member.name || "Unnamed");
      return member;
    });
    group.expenses = group.expenses.filter(function (expense) {
      return expense && typeof expense === "object";
    }).map(function (expense) {
      if (expense.id == null) expense.id = Z.uid("gx");
      expense.id = String(expense.id);
      expense.description = String(expense.description || "Shared cost");
      expense.amount = Number(expense.amount) || 0;
      expense.date = String(expense.date || Z.todayISO()).slice(0, 10);
      if (isNaN(Z.parseISO(expense.date).getTime())) expense.date = Z.todayISO();
      if (!Array.isArray(expense.sharedWith)) expense.sharedWith = [];
      return expense;
    });
  });

  split.groups = groups;

  var activeId = groups.length ? groups[0].id : null;
  var expenseQuery = "";
  var expenseCategory = "all";
  var expenseSort = "newest";
  var expandedId = null;

  var $ = function (id) { return document.getElementById(id); };
  var groupList = $("group-list");
  var groupCount = $("group-count");
  var detailHost = $("split-detail");
  var ticketHost = $("split-ticket");
  var statsHost = $("split-stats");
  var heroMeta = $("split-hero-meta");
  var exportButton = $("export-ledger");

  var groupDialog = $("group-dialog");
  var groupForm = $("group-form");
  var groupName = $("group-name");
  var groupMembers = $("group-members");
  var groupMemberCount = $("group-member-count");
  var groupMemberPreview = $("group-member-preview");

  var memberDialog = $("member-dialog");
  var memberForm = $("member-form");
  var memberNameField = $("member-name");
  var memberKicker = $("member-kicker");

  var expenseDialog = $("expense-dialog");
  var expenseForm = $("expense-form");
  var expenseId = $("expense-id");
  var expenseDesc = $("expense-desc");
  var expenseAmount = $("expense-amount");
  var expenseDate = $("expense-date");
  var expensePayer = $("expense-payer");
  var expenseMembers = $("expense-members");
  var expenseHint = $("expense-share-hint");
  var expenseTitle = $("expense-title");
  var expenseKicker = $("expense-kicker");
  var expenseSave = $("expense-save");
  var currentExpenseCategory = "other";

  expenseDate.max = Z.todayISO();
  $("expense-currency").textContent = Z.money(0).replace(/[\d.,\s]/g, "");

  /* ------------------------------------------------------------------------
     Classification
     ------------------------------------------------------------------------ */

  function inferCategory(description) {
    var text = String(description || "").toLowerCase();
    if (!text) return "other";
    if (/settle|payment|paid back|transfer/.test(text)) return "settlement";
    if (/rent|grocery|groceries|clean|supplies|furniture|repair|household|laundry|home/.test(text)) return "home";
    if (/flight|villa|taxi|train|fuel|hotel|trip|travel|airbnb|cab|parking|toll|vacation/.test(text)) return "travel";
    if (/electric|water|wifi|internet|bill|deposit|phone|subscription|insurance|utility|gas bill/.test(text)) return "bills";
    if (/lunch|dinner|brunch|coffee|breakfast|restaurant|food|pizza|meal|drink|bar|snack|kitchen/.test(text)) return "food";
    if (/movie|ticket|game|party|concert|museum|event/.test(text)) return "fun";
    return "other";
  }

  function categoryOf(expense) {
    var category = expense && expense.category;
    if (category && CATEGORIES[category]) return category;
    return inferCategory(expense && expense.description);
  }

  function groupKind(group) {
    var kind = group && group.kind;
    if (kind && KINDS[kind]) return kind;
    var name = String(group && group.name || "").toLowerCase();
    if (/flat|home|house|apartment|rent|roommate|4b/.test(name)) return "home";
    if (/trip|travel|goa|weekend|holiday|cabin|vacation|villa|flight/.test(name)) return "trip";
    if (/office|work|team|lunch|studio|colleague|friday/.test(name)) return "work";
    return "other";
  }

  function defaultCategoryForGroup(group) {
    var kind = groupKind(group);
    if (kind === "home") return "home";
    if (kind === "trip") return "travel";
    if (kind === "work") return "food";
    return "other";
  }

  /* ------------------------------------------------------------------------
     Arithmetic
     ------------------------------------------------------------------------ */

  function findGroup(id) {
    return groups.filter(function (group) { return group.id === id; })[0];
  }

  function activeGroup() {
    return findGroup(activeId) || groups[0] || null;
  }

  function memberOf(group, id) {
    return (group && group.members || []).filter(function (member) { return member.id === id; })[0];
  }

  function memberName(group, id) {
    var member = memberOf(group, id);
    return member ? member.name : "Unknown";
  }

  function validShared(group, expense) {
    var seen = Object.create(null);
    return (expense && expense.sharedWith || []).filter(function (id) {
      if (seen[id] || !memberOf(group, id)) return false;
      seen[id] = true;
      return true;
    });
  }

  function compute(group) {
    var paid = {};
    var share = {};
    var total = 0;
    (group.members || []).forEach(function (member) {
      paid[member.id] = 0;
      share[member.id] = 0;
    });

    (group.expenses || []).forEach(function (expense) {
      var amount = Number(expense.amount) || 0;
      if (!(amount > 0)) return;
      var shared = validShared(group, expense);
      if (!shared.length) return;
      if (categoryOf(expense) !== "settlement") total += amount;
      if (paid[expense.paidBy] != null) paid[expense.paidBy] += amount;
      shared.forEach(function (id) {
        share[id] = (share[id] || 0) + amount / shared.length;
      });
    });

    var net = {};
    (group.members || []).forEach(function (member) {
      net[member.id] = (paid[member.id] || 0) - (share[member.id] || 0);
    });

    return { total: total, paid: paid, share: share, net: net };
  }

  function planFor(group, calc) {
    var creditors = (group.members || []).filter(function (member) {
      return calc.net[member.id] > 0.005;
    }).map(function (member) {
      return { id: member.id, amount: calc.net[member.id] };
    }).sort(function (a, b) { return b.amount - a.amount; });

    var debtors = (group.members || []).filter(function (member) {
      return calc.net[member.id] < -0.005;
    }).map(function (member) {
      return { id: member.id, amount: -calc.net[member.id] };
    }).sort(function (a, b) { return b.amount - a.amount; });

    var transfers = [];
    var i = 0;
    var j = 0;
    while (i < debtors.length && j < creditors.length) {
      var amount = Math.min(debtors[i].amount, creditors[j].amount);
      if (amount > 0.005) {
        transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: amount });
      }
      debtors[i].amount -= amount;
      creditors[j].amount -= amount;
      if (debtors[i].amount < 0.005) i += 1;
      if (creditors[j].amount < 0.005) j += 1;
    }
    return transfers;
  }

  function yourNetIn(group, calc) {
    var total = 0;
    var found = false;
    (group.members || []).forEach(function (member) {
      if (String(member.name).trim().toLowerCase() === "you") {
        total += calc.net[member.id] || 0;
        found = true;
      }
    });
    return found ? total : null;
  }

  function persist() {
    split.groups = groups;
    Z.store.set("split", split);
  }

  function summary() {
    var data = {
      total: 0,
      monthTotal: 0,
      entries: 0,
      people: 0,
      memberAppearances: 0,
      yourNet: 0,
      hasYou: false,
      owedTables: 0,
      oweTables: 0,
      openTransfers: 0,
      openAmount: 0,
      openGroups: 0,
      latest: null
    };
    var people = Object.create(null);
    var month = Z.monthKey(Z.todayISO());

    groups.forEach(function (group) {
      var calc = compute(group);
      data.total += calc.total;
      data.entries += (group.expenses || []).length;
      data.memberAppearances += (group.members || []).length;

      (group.members || []).forEach(function (member) {
        var key = String(member.name || "").trim().toLowerCase();
        people[key] = true;
      });

      var transfers = planFor(group, calc);
      if (transfers.length) {
        data.openGroups += 1;
        transfers.forEach(function (transfer) {
          data.openTransfers += 1;
          data.openAmount += transfer.amount;
        });
      }

      var yourNet = yourNetIn(group, calc);
      if (yourNet != null) {
        data.hasYou = true;
        data.yourNet += yourNet;
        if (yourNet > 0.005) data.owedTables += 1;
        if (yourNet < -0.005) data.oweTables += 1;
      }

      (group.expenses || []).forEach(function (expense) {
        if (categoryOf(expense) !== "settlement" && Z.monthKey(expense.date) === month) {
          data.monthTotal += Number(expense.amount) || 0;
        }
        if (isLater(expense, data.latest && data.latest.expense)) {
          data.latest = { expense: expense, group: group };
        }
      });
    });

    data.people = Object.keys(people).length;
    return data;
  }

  /* ------------------------------------------------------------------------
     Overall statement
     ------------------------------------------------------------------------ */

  function renderTicket() {
    if (!ticketHost) return;
    var data = summary();
    var value = "—";
    var valueClass = "";
    var status = "Start a table and the statement will fill itself in.";

    if (groups.length) {
      if (!data.hasYou) {
        status = "Add yourself to a table to see where you stand.";
      } else if (Math.abs(data.yourNet) < 0.005) {
        value = "Square";
        valueClass = "is-square";
        status = "You are even across every table on this ledger.";
      } else {
        value = signedMoney(data.yourNet);
        valueClass = data.yourNet > 0 ? "pos" : "neg";
        var bits = [];
        if (data.owedTables) bits.push("owed on " + plural(data.owedTables, "table"));
        if (data.oweTables) bits.push("owing on " + plural(data.oweTables, "table"));
        status = (data.yourNet > 0 ? "The table owes you" : "You owe the table") + (bits.length ? " — " + bits.join(", ") + "." : ".");
      }
    }

    var latestMarkup;
    if (data.latest) {
      var latest = data.latest;
      latestMarkup = '<div class="sp-ticket-latest">' +
        '<span class="sp-ticket-latest-mark">' + icon(CATEGORIES[categoryOf(latest.expense)].icon) + "</span>" +
        '<span class="sp-ticket-latest-copy"><span>' + Z.esc(latest.group.name) + " · " + Z.esc(Z.relDate(latest.expense.date)) + "</span>" +
        "<strong>" + Z.esc(latest.expense.description) + "</strong>" +
        "<small>" + Z.esc(CATEGORIES[categoryOf(latest.expense)].label) + " · paid by " + Z.esc(memberName(latest.group, latest.expense.paidBy)) + "</small></span>" +
        '<span class="sp-ticket-latest-amount">' + moneyShort(latest.expense.amount) + "</span></div>";
    } else {
      latestMarkup = '<div class="sp-ticket-latest is-empty">The ledger is quiet. Add the first shared cost when something comes up.</div>';
    }

    ticketHost.innerHTML =
      '<div class="sp-ticket-top"><span>Statement / all tables</span><span>' + Z.esc(Z.dateMedium(Z.todayISO()).toUpperCase()) + "</span></div>" +
      '<div class="sp-ticket-main"><span class="sp-ticket-label">Your position</span>' +
      '<strong class="sp-ticket-value ' + valueClass + '">' + value + "</strong>" +
      '<span class="sp-ticket-status">' + status + "</span></div>" +
      '<div class="sp-ticket-rule"></div>' +
      '<div class="sp-ticket-pair">' +
      "<div><span>Open to settle</span><strong>" + moneyShort(data.openAmount) + "</strong></div>" +
      "<div><span>On the ledger</span><strong>" + plural(groups.length, "table") + "</strong></div>" +
      "</div>" +
      latestMarkup +
      '<div class="sp-ticket-foot"><span class="sp-ticket-barcode" aria-hidden="true"></span><span>Local ledger / ' +
      (data.entries ? plural(data.entries, "entry", "entries") : "no entries yet") + "</span></div>";
  }

  function renderStats() {
    if (!statsHost) return;
    var data = summary();
    var monthName = Z.monthLabel(Z.monthKey(Z.todayISO()));
    var figures = [
      {
        label: "Shared across tables",
        value: moneyShort(data.total),
        note: groups.length ? plural(groups.length, "table") + " · " + plural(data.entries, "entry", "entries") : "No tables yet",
        icon: "wallet",
        tone: 0
      },
      {
        label: "This month",
        value: moneyShort(data.monthTotal),
        note: monthName,
        icon: "calendar",
        tone: 1
      },
      {
        label: "Waiting to settle",
        value: moneyShort(data.openAmount),
        note: data.openTransfers ? plural(data.openTransfers, "move") + " across " + plural(data.openGroups, "table") : "Everything is square",
        icon: "refresh",
        tone: 2
      },
      {
        label: "People at the table",
        value: String(data.people),
        note: data.memberAppearances ? plural(data.memberAppearances, "seat") + " across all tables" : "No one seated yet",
        icon: "users",
        tone: 3
      }
    ];

    statsHost.innerHTML = figures.map(function (figure) {
      return '<div class="sp-figure">' +
        '<div class="sp-figure-head"><span class="sp-figure-label">' + figure.label + "</span>" +
        '<span class="sp-figure-icon">' + Z.icon(figure.icon) + "</span></div>" +
        '<div class="sp-figure-value">' + figure.value + "</div>" +
        '<div class="sp-figure-note">' + figure.note + "</div></div>";
    }).join("");
  }

  function renderHeroMeta() {
    if (!heroMeta) return;
    var data = summary();
    var pieces = [];

    if (!groups.length) {
      pieces.push("No tables yet");
      pieces.push("The ledger is ready");
    } else {
      pieces.push(plural(groups.length, "table"));
      pieces.push(plural(data.people, "person", "people"));
      pieces.push(plural(data.entries, "entry", "entries"));
      if (data.latest) pieces.push("Last entry " + Z.relDate(data.latest.expense.date).toLowerCase());
    }

    var markup = pieces.map(function (piece) {
      return "<span>" + Z.esc(piece) + "</span>";
    }).join('<span class="sp-meta-dot" aria-hidden="true"></span>');

    heroMeta.innerHTML = markup + '<span class="sp-meta-local">D1 synced</span>';
  }

  /* ------------------------------------------------------------------------
     Table index
     ------------------------------------------------------------------------ */

  function renderGroups() {
    if (!groupList || !groupCount) return;
    groupCount.textContent = groups.length ? plural(groups.length, "table") : "No tables";

    if (!groups.length) {
      groupList.innerHTML = '<div class="sp-group-empty">' +
        '<span class="sp-group-empty-mark">' + Z.icon("plus") + "</span>" +
        "No tables on the ledger yet.<br>" +
        '<button type="button" class="text-link" data-empty-new-group>Start the first</button></div>';
      return;
    }

    groupList.innerHTML = groups.map(function (group) {
      var calc = compute(group);
      var kind = groupKind(group);
      var yourNet = yourNetIn(group, calc);
      var active = group.id === activeId;
      var netText = "not seated";
      var netClassname = "";
      if (yourNet != null) {
        if (Math.abs(yourNet) < 0.005) {
          netText = "square";
        } else {
          netText = signedMoney(yourNet);
          netClassname = yourNet > 0 ? "pos" : "neg";
        }
      }

      return '<button type="button" class="sp-group-card sp-kind-' + kind + (active ? " is-active" : "") + '" data-group="' + Z.esc(group.id) + '" aria-pressed="' + active + '">' +
        '<span class="sp-group-mark">' + icon(KINDS[kind].icon) + "</span>" +
        '<span class="sp-group-main"><span class="sp-group-name">' + Z.esc(group.name) + "</span>" +
        '<span class="sp-group-sub">' + KINDS[kind].label + " · " + plural((group.members || []).length, "person", "people") + " · " + plural((group.expenses || []).length, "entry", "entries") + "</span></span>" +
        '<span class="sp-group-side"><span class="sp-group-total">' + moneyShort(calc.total) + "</span>" +
        '<span class="sp-group-net ' + netClassname + '">' + netText + "</span></span></button>";
    }).join("");
  }

  /* ------------------------------------------------------------------------
     Ledger filtering
     ------------------------------------------------------------------------ */

  function availableCategories(group) {
    var seen = {};
    (group.expenses || []).forEach(function (expense) {
      seen[categoryOf(expense)] = true;
    });
    return CATEGORY_ORDER.filter(function (category) { return seen[category]; });
  }

  function ensureExpenseFilter(group) {
    if (expenseCategory === "all") return;
    if (availableCategories(group).indexOf(expenseCategory) === -1) expenseCategory = "all";
  }

  function filterExpenses(group) {
    var query = expenseQuery.trim().toLowerCase();
    var list = (group.expenses || []).filter(function (expense) {
      var category = categoryOf(expense);
      if (expenseCategory !== "all" && category !== expenseCategory) return false;
      if (!query) return true;
      var haystack = [
        expense.description,
        memberName(group, expense.paidBy),
        CATEGORIES[category].label,
        expense.date,
        Z.dateMedium(expense.date),
        String(expense.amount)
      ].join(" ").toLowerCase();
      return haystack.indexOf(query) !== -1;
    });

    return list.sort(function (a, b) {
      var cmp;
      if (expenseSort === "largest") {
        cmp = (Number(b.amount) || 0) - (Number(a.amount) || 0);
        if (cmp) return cmp;
      } else if (expenseSort === "oldest") {
        cmp = String(a.date).localeCompare(String(b.date));
        if (cmp) return cmp;
      } else {
        cmp = String(b.date).localeCompare(String(a.date));
        if (cmp) return cmp;
      }
      return String(b.id).localeCompare(String(a.id));
    });
  }

  function monthGroups(list) {
    if (expenseSort === "largest") {
      return [{
        key: "largest",
        label: "Largest entries",
        items: list,
        amount: list.reduce(function (sum, expense) { return sum + (Number(expense.amount) || 0); }, 0)
      }];
    }

    var blocks = [];
    var index = {};
    list.forEach(function (expense) {
      var key = Z.monthKey(expense.date) || "undated";
      if (!index[key]) {
        index[key] = { key: key, label: key === "undated" ? "Undated" : Z.monthLabel(key), items: [], amount: 0 };
        blocks.push(index[key]);
      }
      index[key].items.push(expense);
      index[key].amount += Number(expense.amount) || 0;
    });
    return blocks;
  }

  /* ------------------------------------------------------------------------
     Group detail blocks
     ------------------------------------------------------------------------ */

  function settlementMarkup(group, calc, transfers) {
    var amountToMove = transfers.reduce(function (sum, transfer) { return sum + transfer.amount; }, 0);
    var head = '<div class="sp-board-head"><div><p class="sp-board-kicker">Route back to even</p>' +
      '<h3 class="sp-board-title">Settle up</h3></div>' +
      '<span class="sp-board-badge">' + (transfers.length ? plural(transfers.length, "move") : "All square") + "</span></div>";

    if (!transfers.length) {
      var hasCosts = (group.expenses || []).length > 0;
      return '<section class="sp-settle-board">' + head +
        '<div class="sp-square-state"><span class="sp-square-mark">' + Z.icon("check") + "</span>" +
        '<span class="sp-square-copy"><strong>' + (hasCosts ? "The table is square." : "Everyone starts even.") + "</strong>" +
        "<span>" + (hasCosts ? "No money needs to move between anyone." : "Add a shared cost and the ledger will do the arithmetic.") + "</span></span></div>" +
        '<div class="sp-board-foot"><p>Balances are calculated from paid minus share.</p></div></section>';
    }

    var rows = transfers.map(function (transfer) {
      var from = memberOf(group, transfer.from);
      var to = memberOf(group, transfer.to);
      if (!from || !to) return "";
      return '<div class="sp-transfer">' +
        '<div class="sp-transfer-people">' + avatar(from.name, "sm") +
        '<span class="sp-transfer-name"><strong>' + Z.esc(from.name) + "</strong><small>pays</small></span>" +
        '<span class="sp-transfer-route" aria-hidden="true">' + Z.icon("arrowRight") + "</span>" +
        avatar(to.name, "sm") +
        '<span class="sp-transfer-name"><strong>' + Z.esc(to.name) + "</strong><small>receives</small></span></div>" +
        '<div class="sp-transfer-side"><span class="sp-transfer-amount">' + moneyShort(transfer.amount) + "</span>" +
        '<button type="button" class="sp-settle-button" data-settle-from="' + Z.esc(transfer.from) + '" data-settle-to="' + Z.esc(transfer.to) + '" data-settle-amount="' + transfer.amount.toFixed(2) + '">Settle</button></div></div>';
    }).join("");

    return '<section class="sp-settle-board">' + head +
      '<div class="sp-board-total"><strong>' + moneyShort(amountToMove) + "</strong><span>to move · " + plural(transfers.length, "payment") + "</span></div>" +
      '<div class="sp-transfer-list">' + rows + "</div>" +
      '<div class="sp-board-foot"><p>The minimum-transfer plan, calculated from paid minus share.</p>' +
      '<button type="button" class="sp-board-action" data-settle-all>Record all payments</button></div></section>';
  }

  function balancesMarkup(group, calc) {
    var members = (group.members || []).slice().sort(function (a, b) {
      return (calc.net[b.id] || 0) - (calc.net[a.id] || 0);
    });
    var maxAbs = members.reduce(function (max, member) {
      return Math.max(max, Math.abs(calc.net[member.id] || 0));
    }, 0);

    var rows = members.map(function (member) {
      var net = calc.net[member.id] || 0;
      var cls = Math.abs(net) < 0.005 ? "" : net > 0 ? "pos" : "neg";
      var isYou = String(member.name).trim().toLowerCase() === "you";
      var width = maxAbs > 0.005 ? Math.max(2.5, Math.abs(net) / maxAbs * 48).toFixed(1) : 0;
      var netText = Math.abs(net) < 0.005 ? "—" : signedMoney(net);

      return '<div class="sp-balance-row' + (isYou ? " is-you" : "") + '" title="' +
        Z.esc("Paid " + moneyShort(calc.paid[member.id]) + " · share " + moneyShort(calc.share[member.id])) + '">' +
        '<div class="sp-balance-top">' + avatar(member.name, "md") +
        '<span class="sp-balance-name"><strong>' + Z.esc(member.name) + "</strong>" +
        "<span>paid " + moneyShort(calc.paid[member.id]) + " · share " + moneyShort(calc.share[member.id]) + "</span></span>" +
        '<span class="sp-balance-net ' + cls + '">' + netText + "</span></div>" +
        '<div class="sp-balance-track"><span class="sp-balance-center"></span>' +
        '<span class="sp-balance-fill ' + cls + (Math.abs(net) < 0.005 ? " neutral" : "") + '" style="--sp-net-width:' + width + '%"></span></div></div>';
    }).join("");

    if (!members.length) {
      rows = '<div class="sp-ledger-empty"><p>No people at this table yet.</p></div>';
    }

    return '<section class="sp-balance-card">' +
      '<div class="sp-block-head"><div><p class="sp-block-kicker">Paid minus share</p>' +
      '<h3 class="sp-block-title">Balance sheet</h3></div>' +
      '<span class="sp-block-meta">' + plural(members.length, "person", "people") + "</span></div>" +
      '<div class="sp-balance-list">' + rows + "</div>" +
      '<p class="sp-balance-foot">Green is owed to them. Red is owed by them. Bars are scaled to the largest balance.</p></section>';
  }

  function insightsMarkup(group, calc) {
    var spendExpenses = (group.expenses || []).filter(function (expense) {
      return categoryOf(expense) !== "settlement" && (Number(expense.amount) || 0) > 0;
    });

    if (!spendExpenses.length) {
      return '<aside class="sp-insights"><div class="sp-insights-head"><p class="sp-insights-kicker">Reading the table</p>' +
        '<h3 class="sp-insights-title">What the numbers say</h3></div>' +
        '<div class="sp-insights-empty"><strong>Nothing to read yet.</strong>Once a few costs are on the table, this card will show who paid the most, the largest entry, and where the money went.</div></aside>';
    }

    var spendTotal = spendExpenses.reduce(function (sum, expense) { return sum + (Number(expense.amount) || 0); }, 0);
    var average = spendTotal / spendExpenses.length;
    var largest = spendExpenses.slice().sort(function (a, b) { return (Number(b.amount) || 0) - (Number(a.amount) || 0); })[0];

    var spendPaid = {};
    spendExpenses.forEach(function (expense) {
      spendPaid[expense.paidBy] = (spendPaid[expense.paidBy] || 0) + (Number(expense.amount) || 0);
    });

    var topMember = (group.members || []).map(function (member) {
      return { member: member, amount: spendPaid[member.id] || 0 };
    }).sort(function (a, b) { return b.amount - a.amount; })[0];

    var categoryTotals = {};
    spendExpenses.forEach(function (expense) {
      var category = categoryOf(expense);
      categoryTotals[category] = (categoryTotals[category] || 0) + (Number(expense.amount) || 0);
    });

    var categories = Object.keys(categoryTotals).map(function (category) {
      return { category: category, amount: categoryTotals[category], share: spendTotal ? categoryTotals[category] / spendTotal : 0 };
    }).sort(function (a, b) { return b.amount - a.amount; }).slice(0, 4);

    var catRows = categories.map(function (entry) {
      var category = CATEGORIES[entry.category];
      return '<div class="sp-cat-row sp-cat-' + entry.category + '">' + icon(category.icon) +
        '<div class="sp-cat-main"><div class="sp-cat-name-row"><span>' + category.label + "</span><em>" + Math.round(entry.share * 100) + "%</em></div>" +
        '<div class="sp-cat-bar"><span style="--sp-cat-width:' + Math.round(entry.share * 100) + '%"></span></div></div>' +
        '<span class="sp-cat-amount">' + moneyShort(entry.amount) + "</span></div>";
    }).join("");

    var topMarkup = topMember && topMember.amount > 0.005
      ? '<div class="sp-insight-top">' + avatar(topMember.member.name, "sm") +
        '<span class="sp-insight-top-copy"><small>Paid the most</small><strong>' + Z.esc(topMember.member.name) + "</strong></span>" +
        '<span class="sp-insight-top-amount">' + moneyShort(topMember.amount) + "</span></div>"
      : '<div class="sp-insight-top"><span class="sp-insight-top-copy"><small>Paid the most</small><strong>No payments yet</strong></span></div>';

    return '<aside class="sp-insights">' +
      '<div class="sp-insights-head"><p class="sp-insights-kicker">Reading the table</p>' +
      '<h3 class="sp-insights-title">What the numbers say</h3></div>' +
      topMarkup +
      '<div class="sp-insight-pairs">' +
      '<div class="sp-insight-pair"><span>Largest entry</span><strong>' + moneyShort(largest.amount) + "</strong><small>" + Z.esc(largest.description) + "</small></div>" +
      '<div class="sp-insight-pair"><span>Average entry</span><strong>' + moneyShort(average) + "</strong><small>" + plural(spendExpenses.length, "cost") + " in total</small></div>" +
      "</div>" +
      '<div class="sp-cat-breakdown"><p class="sp-insight-label">Where it went</p>' + catRows + "</div>" +
      '<p class="sp-insights-note">Categories are inferred from each description when none was chosen. Settlements are left out of spending totals.</p></aside>';
  }

  /* ------------------------------------------------------------------------
     Ledger rows
     ------------------------------------------------------------------------ */

  function expenseEntryMarkup(group, expense) {
    var category = categoryOf(expense);
    var categoryMeta = CATEGORIES[category];
    var isSettlement = category === "settlement";
    var shared = validShared(group, expense);
    var amount = Number(expense.amount) || 0;
    var each = shared.length ? amount / shared.length : 0;
    var stamp = dateStamp(expense.date);
    var payer = memberName(group, expense.paidBy);
    var isOpen = String(expense.id) === String(expandedId);
    var description = expense.description || "Shared cost";

    var shareChips = shared.length
      ? shared.map(function (id) {
        var member = memberOf(group, id);
        return '<span class="sp-share-chip">' + avatar(member ? member.name : "?", "xs") +
          "<span>" + Z.esc(member ? member.name : "Unknown") + "</span>" +
          '<span class="sp-share-amount">' + moneyShort(each) + "</span></span>";
      }).join("")
      : '<span class="sp-share-amount">No one selected</span>';

    return '<article class="sp-entry sp-cat-' + category + (isOpen ? " is-open" : "") + '" data-expense="' + Z.esc(expense.id) + '">' +
      '<button type="button" class="sp-entry-main" data-expense-toggle aria-expanded="' + isOpen + '">' +
      '<span class="sp-entry-date"><strong>' + stamp.day + "</strong><small>" + stamp.month + "</small></span>" +
      '<span class="sp-entry-mark">' + icon(categoryMeta.icon) + "</span>" +
      '<span class="sp-entry-info"><span class="sp-entry-name">' + Z.esc(description) + "</span>" +
      '<span class="sp-entry-meta"><span>' + categoryMeta.label + '</span><span class="sp-meta-dot"></span><span>Paid by ' + Z.esc(payer) + '</span><span class="sp-meta-dot"></span><span>' + (isSettlement ? "balance entry" : plural(shared.length, "way")) + "</span></span></span>" +
      '<span class="sp-entry-chevron">' + Z.icon("chevronDown") + "</span></button>" +
      '<aside class="sp-entry-side"><span class="sp-entry-amount">' + moneyShort(amount) + "</span>" +
      '<span class="sp-entry-actions">' +
      '<button type="button" class="icon-btn small" data-edit-expense="' + Z.esc(expense.id) + '" aria-label="Edit ' + Z.esc(description) + '" title="Edit expense">' + Z.icon("pencil") + "</button>" +
      '<button type="button" class="icon-btn small danger" data-delete-expense="' + Z.esc(expense.id) + '" aria-label="Delete ' + Z.esc(description) + '" title="Delete expense">' + Z.icon("trash") + "</button>" +
      "</span></aside>" +
      '<div class="sp-entry-detail"><div class="sp-entry-detail-head"><span class="sp-detail-label">' + (isSettlement ? "Recorded payment" : "Split equally") + '</span>' +
      '<span class="sp-detail-each">' + (isSettlement ? "balance only" : (shared.length ? moneyShort(each) + " each" : "No split")) + "</span></div>" +
      '<div class="sp-share-chips">' + shareChips + "</div>" +
      '<div class="sp-entry-facts"><span>Paid by <strong>' + Z.esc(payer) + "</strong></span>" +
      "<span>Date <strong>" + Z.esc(Z.dateMedium(expense.date)) + "</strong></span>" +
      "<span>Category <strong>" + categoryMeta.label + "</strong></span></div></div></article>";
  }

  function syncFilterButtons() {
    if (!detailHost) return;
    Array.prototype.forEach.call(detailHost.querySelectorAll("[data-cat-filter]"), function (button) {
      var active = button.getAttribute("data-cat-filter") === expenseCategory;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderExpenseList() {
    var group = activeGroup();
    var listHost = $("expense-list");
    if (!group || !listHost) return;

    ensureExpenseFilter(group);
    var totalCount = (group.expenses || []).length;
    var list = filterExpenses(group);
    var filteredTotal = list.reduce(function (sum, expense) { return sum + (Number(expense.amount) || 0); }, 0);
    var filtering = expenseQuery.trim() !== "" || expenseCategory !== "all";

    var countHost = $("expense-count");
    if (countHost) {
      countHost.textContent = totalCount === 0
        ? "No entries"
        : filtering
          ? list.length + " of " + totalCount
          : plural(totalCount, "entry", "entries");
    }

    var totalHost = $("expense-filter-total");
    if (totalHost) {
      totalHost.textContent = list.length ? moneyShort(filteredTotal) + " in view" : "Nothing in view";
    }

    syncFilterButtons();

    if (!list.length) {
      if (!totalCount) {
        listHost.innerHTML = '<div class="sp-ledger-empty"><span class="sp-ledger-empty-mark">' + icon("receipt") + "</span>" +
          "<h4>An empty ledger.</h4><p>Add the first cost this table shares and the arithmetic starts here.</p>" +
          '<button type="button" class="btn btn-primary btn-sm" data-add-expense>' + Z.icon("plus") + " Add the first expense</button></div>";
      } else {
        listHost.innerHTML = '<div class="sp-ledger-empty"><span class="sp-ledger-empty-mark">' + Z.icon("search") + "</span>" +
          "<h4>No matching entries.</h4><p>Try a different name, payer, category, or amount.</p>" +
          '<button type="button" class="text-link" data-clear-filters>Clear the filters</button></div>';
      }
      return;
    }

    var blocks = monthGroups(list);
    listHost.innerHTML = blocks.map(function (block) {
      return '<div class="sp-month"><div class="sp-month-head"><span class="sp-month-label">' +
        Z.esc(block.label) + '</span><span class="sp-month-rule"></span><span class="sp-month-sum">' +
        plural(block.items.length, "entry", "entries") + " · " + moneyShort(block.amount) + "</span></div>" +
        block.items.map(function (expense) { return expenseEntryMarkup(group, expense); }).join("") + "</div>";
    }).join("");
  }

  function ledgerShellMarkup(group) {
    var categories = availableCategories(group);
    var filterButtons = '<button type="button" class="sp-filter' + (expenseCategory === "all" ? " is-active" : "") +
      '" data-cat-filter="all" aria-pressed="' + (expenseCategory === "all") + '">All</button>' +
      categories.map(function (category) {
        return '<button type="button" class="sp-filter' + (expenseCategory === category ? " is-active" : "") +
          '" data-cat-filter="' + category + '" aria-pressed="' + (expenseCategory === category) + '">' +
          CATEGORIES[category].label + "</button>";
      }).join("");

    var sortOption = function (value, label) {
      return '<option value="' + value + '"' + (expenseSort === value ? " selected" : "") + ">" + label + "</option>";
    };

    var canBill = (group.expenses || []).length > 0;

    return '<section class="sp-ledger-card">' +
      '<div class="sp-ledger-head"><div><p class="sp-block-kicker">Every cost and payment</p>' +
      '<div class="sp-ledger-title-row"><h3 class="sp-block-title">Cost ledger</h3>' +
      '<span class="sp-ledger-count" id="expense-count"></span></div></div>' +
      '<div class="sp-ledger-tools"><label class="sp-search"><span class="sr-only">Search expenses</span>' +
      Z.icon("search") + '<input type="search" id="expense-search" value="' + Z.esc(expenseQuery) + '" placeholder="Search the ledger…" autocomplete="off"></label>' +
      '<label><span class="sr-only">Sort expenses</span><select class="select sp-sort" id="expense-sort">' +
      sortOption("newest", "Newest") + sortOption("oldest", "Oldest") + sortOption("largest", "Largest") +
      "</select></label>" +
      '<button type="button" class="sp-bill-button" data-download-bill title="Download the full ledger as a shareable bill image" aria-label="Download the full ledger as a shareable bill image"' +
      (canBill ? "" : " disabled") + ">" + Z.icon("download") + "<span>Bill</span></button>" +
      "</div></div>" +
      '<div class="sp-filter-bar"><div class="sp-filter-chips" id="expense-filters">' + filterButtons + "</div>" +
      '<span class="sp-filter-total" id="expense-filter-total"></span></div>' +
      '<div class="sp-ledger-list" id="expense-list"></div></section>';
  }

  /* ------------------------------------------------------------------------
     Group detail
     ------------------------------------------------------------------------ */

  function emptyDetailMarkup() {
    return '<section class="sp-empty-table">' +
      '<div class="sp-empty-visual"><span class="sp-empty-ring"></span><span class="sp-empty-ring"></span><span class="sp-empty-glyph">' +
      icon("receipt") + "</span></div>" +
      '<p class="sp-empty-kicker">No table, no arithmetic</p>' +
      "<h2>Start with the people.</h2>" +
      "<p>A flat, a trip, a Friday lunch order. Add the table and the ledger keeps the rest straight.</p>" +
      '<button type="button" class="btn btn-primary" data-empty-new-group data-empty-detail>' + Z.icon("plus") + " Start a table</button></section>";
  }

  function renderDetail() {
    if (!detailHost) return;
    var group = activeGroup();

    if (!group) {
      detailHost.innerHTML = emptyDetailMarkup();
      return;
    }

    ensureExpenseFilter(group);
    var calc = compute(group);
    var transfers = planFor(group, calc);
    var kind = groupKind(group);
    var yourNet = yourNetIn(group, calc);
    var members = group.members || [];
    var expenses = group.expenses || [];
    var groupIndex = groups.indexOf(group) + 1;
    var latest = null;
    expenses.forEach(function (expense) {
      if (isLater(expense, latest)) latest = expense;
    });
    var costCount = expenses.filter(function (expense) { return categoryOf(expense) !== "settlement"; }).length;

    var initial = String(group.name || "?").trim().charAt(0).toUpperCase() || "?";
    var amountToMove = transfers.reduce(function (sum, transfer) { return sum + transfer.amount; }, 0);

    var yourValue = "—";
    var yourClass = "";
    var yourNote = "You are not on this table";
    if (yourNet != null) {
      if (Math.abs(yourNet) < 0.005) {
        yourValue = "Even";
        yourNote = "No balance either way";
      } else {
        yourValue = signedMoney(yourNet);
        yourClass = yourNet > 0 ? "pos" : "neg";
        yourNote = yourNet > 0 ? "The table owes you" : "You owe the table";
      }
    }

    var openValue = transfers.length ? moneyShort(amountToMove) : (expenses.length ? "Square" : "—");
    var openNote = transfers.length
      ? plural(transfers.length, "payment") + " to clear"
      : expenses.length
        ? "No money needs to move"
        : "No costs recorded";

    var memberChips = members.map(function (member) {
      var net = calc.net[member.id] || 0;
      var netText = Math.abs(net) < 0.005 ? "even" : signedMoney(net);
      var title = "Paid " + moneyShort(calc.paid[member.id]) + " · share " + moneyShort(calc.share[member.id]) + " · " + netText;
      return '<span class="sp-member-chip" title="' + Z.esc(title) + '">' + avatar(member.name, "xs") +
        "<span>" + Z.esc(member.name) + "</span></span>";
    }).join("");

    var groupMeta = KINDS[kind].label + " table · " + plural(members.length, "person", "people") + " · " +
      plural(expenses.length, "entry", "entries") + (latest ? " · last entry " + Z.relDate(latest.date).toLowerCase() : "");

    var sheet = '<section class="sp-sheet sp-kind-' + kind + '">' +
      '<div class="sp-sheet-main"><span class="sp-sheet-watermark" aria-hidden="true">' + Z.esc(initial) + "</span>" +
      '<div class="sp-sheet-head"><div class="sp-sheet-id"><div class="sp-sheet-kicker">' +
      '<span class="sp-kind-chip">' + icon(KINDS[kind].icon) + KINDS[kind].label + "</span>" +
      '<span class="sp-sheet-number">Table ' + String(groupIndex).padStart(2, "0") + "</span></div>" +
      '<h2 class="sp-sheet-name">' + Z.esc(group.name) + "</h2>" +
      '<p class="sp-sheet-sub">' + groupMeta + "</p></div>" +
      '<div class="sp-sheet-actions">' +
      '<button type="button" class="sp-sheet-tool" data-copy-summary aria-label="Copy group summary" title="Copy summary">' + Z.icon("copy") + "</button>" +
      '<button type="button" class="btn btn-sm" data-add-member>' + Z.icon("plus") + " Add person</button>" +
      '<button type="button" class="btn btn-sm btn-primary" data-add-expense>' + Z.icon("plus") + " Add expense</button>" +
      '<button type="button" class="sp-sheet-tool danger" data-delete-group aria-label="Delete table" title="Delete table">' + Z.icon("trash") + "</button>" +
      "</div></div>" +
      '<div class="sp-member-strip">' + memberChips +
      '<button type="button" class="sp-member-add" data-add-member>' + Z.icon("plus") + " Add person</button></div></div>" +
      '<div class="sp-sheet-figures">' +
      "<div class=\"sp-sheet-figure\"><span>Total shared</span><strong>" + moneyShort(calc.total) + "</strong><small>" + plural(costCount, "cost") + " recorded</small></div>" +
      '<div class="sp-sheet-figure"><span>Your position</span><strong class="' + yourClass + '">' + yourValue + "</strong><small>" + yourNote + "</small></div>" +
      '<div class="sp-sheet-figure"><span>Open to settle</span><strong>' + openValue + "</strong><small>" + openNote + "</small></div>" +
      "</div></section>";

    detailHost.innerHTML = sheet +
      '<div class="sp-desk">' + settlementMarkup(group, calc, transfers) + balancesMarkup(group, calc) + "</div>" +
      '<div class="sp-lower">' + ledgerShellMarkup(group) + insightsMarkup(group, calc) + "</div>";

    renderExpenseList();
  }

  function renderAll() {
    renderTicket();
    renderStats();
    renderHeroMeta();
    renderGroups();
    renderDetail();
    if (exportButton) {
      exportButton.disabled = !groups.some(function (group) { return (group.expenses || []).length > 0; });
    }
  }

  /* ------------------------------------------------------------------------
     Dialog helpers
     ------------------------------------------------------------------------ */

  function parseNames(text) {
    var seen = Object.create(null);
    var names = [];
    String(text || "").split(/[\n,]+/).forEach(function (part) {
      var name = part.trim().replace(/\s+/g, " ");
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      names.push(name);
    });
    return names;
  }

  function updateGroupMemberPreview() {
    var names = parseNames(groupMembers.value);
    groupMemberCount.textContent = plural(names.length, "person", "people");
    var shown = names.slice(0, 9).map(function (name) { return avatar(name, "sm"); }).join("");
    if (names.length > 9) shown += '<span class="sp-member-preview-more">+' + (names.length - 9) + "</span>";
    groupMemberPreview.innerHTML = shown;
  }

  function openGroupDialog() {
    groupForm.reset();
    groupName.value = "";
    groupMembers.value = "";
    updateGroupMemberPreview();
    groupDialog.showModal();
    setTimeout(function () { groupName.focus(); }, 30);
  }

  function openMemberDialog() {
    var group = activeGroup();
    if (!group) return;
    memberNameField.value = "";
    memberKicker.textContent = "Add to " + group.name;
    memberDialog.showModal();
    setTimeout(function () { memberNameField.focus(); }, 30);
  }

  function buildPayerSelect(selectedId) {
    var group = activeGroup();
    var members = group ? group.members || [] : [];
    expensePayer.innerHTML = members.map(function (member) {
      return '<option value="' + Z.esc(member.id) + '"' + (member.id === selectedId ? " selected" : "") + ">" + Z.esc(member.name) + "</option>";
    }).join("");
  }

  function buildExpenseMembers(selectedIds) {
    var group = activeGroup();
    var members = group ? group.members || [] : [];
    var selected = {};
    (selectedIds || []).forEach(function (id) { selected[id] = true; });

    expenseMembers.innerHTML = members.map(function (member) {
      var checked = selected[member.id] ? " checked" : "";
      return '<label class="sp-person-check"><input type="checkbox" name="expense-share" value="' + Z.esc(member.id) + '"' + checked + ">" +
        '<span class="sp-check-card">' + avatar(member.name, "xs") +
        '<span class="sp-check-name">' + Z.esc(member.name) + "</span>" +
        '<span class="sp-check-tick">' + Z.icon("check") + "</span></span></label>";
    }).join("");
  }

  function setCategorySelection(category) {
    currentExpenseCategory = CATEGORIES[category] ? category : "other";
    Array.prototype.forEach.call(expenseForm.querySelectorAll('input[name="expense-category"]'), function (radio) {
      radio.checked = radio.value === currentExpenseCategory;
    });
  }

  function selectedCategory() {
    var checked = expenseForm.querySelector('input[name="expense-category"]:checked');
    return checked ? checked.value : currentExpenseCategory || "other";
  }

  function updateShareHint() {
    if (!expenseHint) return;
    var checked = expenseMembers.querySelectorAll('input[type="checkbox"]:checked');
    var amount = Number(expenseAmount.value) || 0;
    if (!checked.length) {
      expenseHint.textContent = "Pick at least one person";
      return;
    }
    if (amount > 0) {
      expenseHint.textContent = moneyShort(amount / checked.length) + " each";
    } else {
      expenseHint.textContent = plural(checked.length, "person", "people");
    }
  }

  function openExpenseDialog(expense) {
    var group = activeGroup();
    if (!group) return;
    if (!(group.members || []).length) {
      Z.toast("Add someone to the table first", "error");
      return;
    }

    expenseForm.reset();
    var editing = Boolean(expense && expense.id);
    var groupMembersList = group.members || [];
    var selectedIds = editing ? validShared(group, expense) : groupMembersList.map(function (member) { return member.id; });
    var payerId = editing && memberOf(group, expense.paidBy) ? expense.paidBy : groupMembersList[0].id;

    expenseId.value = editing ? expense.id : "";
    expenseDesc.value = editing ? expense.description : "";
    expenseAmount.value = editing ? expense.amount : "";
    expenseDate.value = editing ? expense.date : Z.todayISO();
    expenseTitle.textContent = editing ? "Edit expense" : "Add an expense";
    expenseKicker.textContent = editing ? "Adjust the ledger" : "A shared cost";
    expenseSave.textContent = editing ? "Save changes" : "Add expense";

    buildPayerSelect(payerId);
    buildExpenseMembers(selectedIds);
    setCategorySelection(editing ? categoryOf(expense) : defaultCategoryForGroup(group));
    updateShareHint();

    expenseDialog.showModal();
    setTimeout(function () { expenseDesc.focus(); }, 30);
  }

  /* ------------------------------------------------------------------------
     Actions
     ------------------------------------------------------------------------ */

  function settlementEntry(from, to, amount) {
    var value = Number(amount) || 0;
    if (!from || !to || !(value > 0.005)) return null;
    return {
      id: Z.uid("gx"),
      description: "Settlement — " + from.name + " to " + to.name,
      amount: Number(value.toFixed(2)),
      paidBy: from.id,
      date: Z.todayISO(),
      sharedWith: [to.id],
      category: "settlement"
    };
  }

  function recordSettlements(transfers) {
    var group = activeGroup();
    if (!group) return;
    var entries = [];
    transfers.forEach(function (transfer) {
      var from = memberOf(group, transfer.from);
      var to = memberOf(group, transfer.to);
      var entry = settlementEntry(from, to, transfer.amount);
      if (entry) entries.push(entry);
    });
    if (!entries.length) return;
    group.expenses = (group.expenses || []).concat(entries);
    expandedId = entries[entries.length - 1].id;
    persist();
    renderAll();
  }

  function settleOne(fromId, toId, amount) {
    var group = activeGroup();
    if (!group) return;
    var from = memberOf(group, fromId);
    var to = memberOf(group, toId);
    if (!from || !to) return;

    Z.confirm({
      kicker: "Record a payment",
      title: "Mark this settled?",
      message: "<strong>" + Z.esc(from.name) + "</strong> pays <strong>" + Z.esc(to.name) + "</strong> " + moneyShort(amount) + ". This adds a settlement entry, so the table stays balanced without changing the shared total.",
      label: "Record payment"
    }).then(function (ok) {
      if (!ok) return;
      recordSettlements([{ from: fromId, to: toId, amount: amount }]);
      Z.toast("Payment recorded");
    });
  }

  function settleAll() {
    var group = activeGroup();
    if (!group) return;
    var calc = compute(group);
    var transfers = planFor(group, calc);
    if (!transfers.length) {
      Z.toast("Nothing left to settle");
      return;
    }
    var total = transfers.reduce(function (sum, transfer) { return sum + transfer.amount; }, 0);

    Z.confirm({
      kicker: "Clear the table",
      title: "Record every payment?",
      message: "This adds <strong>" + plural(transfers.length, "settlement entry", "settlement entries") + "</strong> totalling <strong>" + moneyShort(total) + "</strong>. Every balance at this table will return to zero.",
      label: "Record all"
    }).then(function (ok) {
      if (!ok) return;
      recordSettlements(transfers);
      Z.toast("The table is square");
    });
  }

  function copySummary() {
    var group = activeGroup();
    if (!group) return;
    var calc = compute(group);
    var transfers = planFor(group, calc);
    var yourNet = yourNetIn(group, calc);
    var lines = [];
    lines.push(group.name + " — shared ledger");
    lines.push("Total shared: " + moneyShort(calc.total));
    if (yourNet == null) {
      lines.push("Your position: not on this table");
    } else if (Math.abs(yourNet) < 0.005) {
      lines.push("Your position: square");
    } else {
      lines.push("Your position: " + signedMoney(yourNet));
    }
    lines.push("Members: " + (group.members || []).map(function (member) { return member.name; }).join(", "));
    lines.push("");
    if (transfers.length) {
      lines.push("To settle:");
      transfers.forEach(function (transfer) {
        lines.push("  " + memberName(group, transfer.from) + " → " + memberName(group, transfer.to) + "  " + moneyShort(transfer.amount));
      });
    } else {
      lines.push("Everyone is square. No payments needed.");
    }
    lines.push("");
    lines.push("Recorded in Zone · " + Z.dateLong(Z.todayISO()));
    Z.copy(lines.join("\n"));
  }

  function exportLedger() {
    var rows = [["Table", "Kind", "Date", "Description", "Category", "Paid by", "Amount", "Shared with", "Each share"]];
    var entries = [];

    groups.forEach(function (group) {
      (group.expenses || []).forEach(function (expense) {
        entries.push({ group: group, expense: expense });
      });
    });

    entries.sort(function (a, b) {
      var cmp = String(b.expense.date).localeCompare(String(a.expense.date));
      if (cmp) return cmp;
      return String(a.group.name).localeCompare(String(b.group.name));
    });

    entries.forEach(function (item) {
      var group = item.group;
      var expense = item.expense;
      var shared = validShared(group, expense);
      var amount = Number(expense.amount) || 0;
      rows.push([
        group.name,
        KINDS[groupKind(group)].label,
        expense.date,
        expense.description,
        CATEGORIES[categoryOf(expense)].label,
        memberName(group, expense.paidBy),
        amount,
        shared.map(function (id) { return memberName(group, id); }).join("; "),
        shared.length ? (amount / shared.length).toFixed(2) : "0.00"
      ]);
    });

    if (rows.length === 1) {
      Z.toast("There is nothing to export yet", "error");
      return;
    }

    Z.download("zone-split-ledger-" + Z.todayISO() + ".csv", "\ufeff" + Z.csv(rows), "text/csv;charset=utf-8");
    Z.toast("Ledger exported");
  }

  /* ------------------------------------------------------------------------
     Shareable bill image
     ------------------------------------------------------------------------ */

  var BILL_WIDTH = 1080;
  var BILL_PAD = 64;
  var BILL_CONTENT = BILL_WIDTH - BILL_PAD * 2;
  var BILL_COLORS = {
    paper: "#fbf7ef",
    paperEdge: "rgba(83, 66, 48, 0.18)",
    ink: "#211b15",
    inkSoft: "#40352b",
    muted: "#776b5f",
    faint: "#9c8f80",
    line: "#d8cfc1",
    lineSoft: "#e9e2d6",
    accent: "#aa5740",
    accentSoft: "#f3e3d9",
    dark: "#1d1914",
    dark2: "#2d2419",
    boardInk: "#f8f1e6",
    boardMuted: "#bbad9c",
    boardFaint: "#8f8170",
    boardLine: "rgba(248, 241, 230, 0.13)",
    green: "#4f735b",
    greenSoft: "#e6eee5",
    white: "#fffdf8"
  };
  var BILL_FONTS = {
    serif: '"Instrument Serif", "Iowan Old Style", "Palatino Linotype", Georgia, serif',
    sans: '"Inter Tight", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  };
  var BILL_TONES = ["#aa5740", "#6f7d5c", "#5b7486", "#8b6a84", "#a57b38", "#68708d"];
  var BILL_KIND_COLORS = {
    home: "#a45c3e",
    trip: "#567487",
    work: "#6e744c",
    other: "#8d7355"
  };
  var BILL_CATEGORY_COLORS = {
    home: "#9c5f42",
    food: "#a57b38",
    travel: "#547286",
    bills: "#68708d",
    fun: "#946273",
    other: "#8a806e",
    settlement: "#4f735b"
  };

  function billFont(weight, size, family) {
    return weight + " " + size + "px " + BILL_FONTS[family];
  }

  function billHex(value) {
    return ("00000000" + (value >>> 0).toString(16)).slice(-8).toUpperCase();
  }

  function billFingerprint(group) {
    var members = (group.members || []).map(function (member) {
      return { id: member.id, name: member.name };
    }).sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });

    var expenses = (group.expenses || []).map(function (expense) {
      return {
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount) || 0,
        paidBy: expense.paidBy,
        date: expense.date,
        category: categoryOf(expense),
        sharedWith: validShared(group, expense).slice().sort()
      };
    }).sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });

    var text = JSON.stringify({
      name: group.name,
      kind: groupKind(group),
      members: members,
      expenses: expenses
    });

    var h1 = 2166136261;
    var h2 = 5381;
    for (var i = 0; i < text.length; i += 1) {
      var code = text.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 16777619);
      h2 = (Math.imul(h2, 33) + code) >>> 0;
    }

    var a = billHex(h1);
    var b = billHex(h2);
    return a.slice(0, 4) + "-" + a.slice(4) + "-" + b.slice(0, 4) + "-" + b.slice(4);
  }

  function billFileSlug(name) {
    return String(name || "ledger")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42) || "ledger";
  }

  function billBuildModel(group) {
    var calc = compute(group);
    var transfers = planFor(group, calc);
    var entries = (group.expenses || []).slice().sort(function (a, b) {
      var cmp = String(b.date).localeCompare(String(a.date));
      if (cmp) return cmp;
      return String(b.id).localeCompare(String(a.id));
    });

    var months = [];
    var monthIndex = {};
    entries.forEach(function (expense) {
      var key = Z.monthKey(expense.date) || "undated";
      if (!monthIndex[key]) {
        monthIndex[key] = {
          key: key,
          label: key === "undated" ? "Undated" : Z.monthLabel(key, true),
          items: []
        };
        months.push(monthIndex[key]);
      }
      monthIndex[key].items.push(expense);
    });

    var costEntries = entries.filter(function (expense) { return categoryOf(expense) !== "settlement"; });
    var settlements = entries.filter(function (expense) { return categoryOf(expense) === "settlement"; });
    var settlementTotal = settlements.reduce(function (sum, expense) { return sum + (Number(expense.amount) || 0); }, 0);
    var transferTotal = transfers.reduce(function (sum, transfer) { return sum + transfer.amount; }, 0);
    var kind = groupKind(group);
    var now = new Date();
    var time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    var generated = Z.dateMedium(Z.todayISO()) + ", " + time;

    return {
      group: group,
      calc: calc,
      transfers: transfers,
      expenses: entries,
      months: months,
      costCount: costEntries.length,
      settlementCount: settlements.length,
      settlementTotal: settlementTotal,
      transferTotal: transferTotal,
      kind: kind,
      kindLabel: KINDS[kind].label,
      kindColor: BILL_KIND_COLORS[kind] || BILL_COLORS.accent,
      tableNumber: String(groups.indexOf(group) + 1).padStart(2, "0"),
      fingerprint: billFingerprint(group),
      generated: generated,
      issued: Z.dateMedium(Z.todayISO()).toUpperCase(),
      fileName: "zone-bill-" + billFileSlug(group.name) + "-" + Z.todayISO() + ".png"
    };
  }

  function billText(ctx, text, x, y, font, color, align) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(String(text == null ? "" : text), x, y);
  }

  function billLine(ctx, x1, y1, x2, y2, color, width, dashed) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    if (dashed) ctx.setLineDash(dashed);
    ctx.stroke();
    ctx.restore();
  }

  function billRoundRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius || 0, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function billFillRoundRect(ctx, x, y, width, height, radius, fill) {
    billRoundRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function billSplitWord(ctx, word, maxWidth) {
    var parts = [];
    var current = "";
    for (var i = 0; i < word.length; i += 1) {
      var test = current + word.charAt(i);
      if (current && ctx.measureText(test).width > maxWidth) {
        parts.push(current);
        current = word.charAt(i);
      } else {
        current = test;
      }
    }
    if (current) parts.push(current);
    return parts.length ? parts : [""];
  }

  function billWrap(ctx, text, font, maxWidth) {
    ctx.font = font;
    var words = String(text == null ? "" : text).split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    var lines = [];
    var line = "";

    words.forEach(function (word) {
      var test = line ? line + " " + word : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
        return;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        return;
      }
      var parts = billSplitWord(ctx, word, maxWidth);
      parts.forEach(function (part, index) {
        if (index < parts.length - 1) lines.push(part);
        else line = part;
      });
    });

    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function billEllipsis(ctx, text, font, maxWidth) {
    ctx.font = font;
    var value = String(text == null ? "" : text);
    if (ctx.measureText(value).width <= maxWidth) return value;
    var suffix = "…";
    var low = 0;
    var high = value.length;
    while (low < high) {
      var mid = Math.ceil((low + high) / 2);
      if (ctx.measureText(value.slice(0, mid) + suffix).width <= maxWidth) low = mid;
      else high = mid - 1;
    }
    if (low <= 0) return suffix;
    return value.slice(0, low) + suffix;
  }

  function billFitFont(ctx, text, family, weight, maxSize, minSize, maxWidth) {
    var size = maxSize;
    var font;
    do {
      font = billFont(weight, size, family);
      ctx.font = font;
      if (ctx.measureText(String(text)).width <= maxWidth) return font;
      size -= 0.5;
    } while (size >= minSize);
    return font;
  }

  function billSigned(value) {
    var amount = Number(value) || 0;
    if (Math.abs(amount) < 0.005) return "—";
    return (amount > 0 ? "+" : "-") + moneyShort(Math.abs(amount));
  }

  function billAvatar(ctx, name, x, y, radius) {
    var color = BILL_TONES[Z.toneFor(name) % BILL_TONES.length];
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = billFont("600", radius * 0.78, "sans");
    ctx.fillStyle = BILL_COLORS.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Z.initials(name), x + radius, y + radius + 0.5);
    ctx.restore();
  }

  function billArrow(ctx, x, y, length, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.moveTo(x + length - 5, y - 4);
    ctx.lineTo(x + length, y);
    ctx.lineTo(x + length - 5, y + 4);
    ctx.stroke();
    ctx.restore();
  }

  function billCheck(ctx, x, y, radius, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + radius * 0.58, y + radius);
    ctx.lineTo(x + radius * 0.88, y + radius * 1.3);
    ctx.lineTo(x + radius * 1.43, y + radius * 0.67);
    ctx.stroke();
    ctx.restore();
  }

  function drawBillBackdrop(ctx, height) {
    var bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#efe9df");
    bg.addColorStop(1, "#e7dfd2");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, BILL_WIDTH, height);

    var glow = ctx.createRadialGradient(BILL_WIDTH - 150, 80, 20, BILL_WIDTH - 150, 80, 440);
    glow.addColorStop(0, "rgba(170, 87, 64, 0.13)");
    glow.addColorStop(1, "rgba(170, 87, 64, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, BILL_WIDTH, 520);

    var px = 26;
    var py = 26;
    var pw = BILL_WIDTH - 52;
    var ph = height - 52;

    ctx.save();
    ctx.shadowColor = "rgba(42, 31, 20, 0.28)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 12;
    billRoundRect(ctx, px, py, pw, ph, 14);
    ctx.fillStyle = BILL_COLORS.paper;
    ctx.fill();
    ctx.restore();

    billRoundRect(ctx, px, py, pw, ph, 14);
    ctx.strokeStyle = BILL_COLORS.paperEdge;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.save();
    billRoundRect(ctx, px, py, pw, ph, 14);
    ctx.clip();
    ctx.fillStyle = BILL_COLORS.accent;
    ctx.fillRect(px, py, pw, 3);
    var wash = ctx.createLinearGradient(0, py, 0, py + ph);
    wash.addColorStop(0, "rgba(170, 87, 64, 0.035)");
    wash.addColorStop(0.45, "rgba(170, 87, 64, 0)");
    ctx.fillStyle = wash;
    ctx.fillRect(px, py + 3, pw, ph - 3);
    ctx.restore();
  }

  function drawBillSection(ctx, x, right, y, kicker, title, note) {
    ctx.fillStyle = BILL_COLORS.accent;
    ctx.fillRect(x, y + 5, 14, 2);
    billText(ctx, kicker.toUpperCase(), x + 22, y, billFont("500", 10.2, "mono"), BILL_COLORS.accent);
    billText(ctx, title, x, y + 17, billFont("400", 29, "serif"), BILL_COLORS.ink);
    if (note) billText(ctx, note, right, y + 35, billFont("500", 10.2, "mono"), BILL_COLORS.faint, "right");
    billLine(ctx, x, y + 59, right, y + 59, BILL_COLORS.line, 1);
    return y + 73;
  }

  function drawBillEntry(ctx, group, expense, x, right, y) {
    var category = categoryOf(expense);
    var color = BILL_CATEGORY_COLORS[category] || BILL_COLORS.muted;
    var categoryLabel = CATEGORIES[category] ? CATEGORIES[category].label : "Other";
    var shared = validShared(group, expense);
    var amount = Number(expense.amount) || 0;
    var isSettlement = category === "settlement";
    var date = Z.dateMedium(expense.date).toUpperCase();
    var dateFont = billFont("500", 10.2, "mono");

    billText(ctx, date, x, y, dateFont, BILL_COLORS.faint);
    ctx.font = dateFont;
    var dateWidth = ctx.measureText(date).width;
    var catX = x + Math.max(102, dateWidth + 14);
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(catX + 3, y + 5.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    billText(ctx, categoryLabel.toUpperCase(), catX + 10, y, billFont("500", 10.2, "mono"), color);
    billText(ctx, moneyShort(amount), right, y - 3, billFont("500", 15, "mono"), BILL_COLORS.ink, "right");

    var descFont = billFont("500", 17, "sans");
    var descLines = billWrap(ctx, expense.description || "Untitled entry", descFont, BILL_CONTENT - 10);
    var descY = y + 24;
    descLines.forEach(function (line, index) {
      billText(ctx, line, x, descY + index * 22, descFont, BILL_COLORS.inkSoft);
    });

    var payer = memberName(group, expense.paidBy);
    var payerLine = "PAID BY " + payer.toUpperCase() + (isSettlement ? "  ·  BALANCE ENTRY" : "  ·  " + shared.length + "-WAY SPLIT");
    var payerY = descY + descLines.length * 22 + 8;
    billText(ctx, payerLine, x, payerY, billFont("500", 10.2, "mono"), BILL_COLORS.muted);

    var sharedNames = shared.map(function (id) { return memberName(group, id); });
    var splitText;
    if (isSettlement) {
      splitText = "Moves " + payer + " → " + (sharedNames.join(", ") || "Unknown") + " · excluded from shared spending";
    } else if (shared.length) {
      splitText = "Split with " + sharedNames.join(" · ") + " · " + Z.money(amount / shared.length, 2) + " each";
    } else {
      splitText = "No people are included in this split · excluded from totals";
    }
    var splitFont = billFont("400", 12.8, "sans");
    var splitLines = billWrap(ctx, splitText, splitFont, BILL_CONTENT - 6);
    var splitY = payerY + 20;
    splitLines.forEach(function (line, index) {
      billText(ctx, line, x, splitY + index * 18, splitFont, BILL_COLORS.muted);
    });

    var bottom = splitY + splitLines.length * 18 + 15;
    billLine(ctx, x, bottom - 7, right, bottom - 7, BILL_COLORS.lineSoft, 1);
    return bottom;
  }

  function drawBillStamp(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.13);
    ctx.strokeStyle = "rgba(170, 87, 64, 0.58)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(170, 87, 64, 0.68)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = billFont("600", 8.8, "mono");
    ctx.fillText("LOCAL", 0, -11);
    ctx.font = billFont("400", 14, "serif");
    ctx.fillText("Ledger", 0, 0);
    ctx.font = billFont("500", 7.8, "mono");
    ctx.fillText("SNAPSHOT", 0, 12);
    ctx.restore();
  }

  function drawBillContent(ctx, group, model) {
    var x = BILL_PAD;
    var right = BILL_WIDTH - BILL_PAD;
    var contentW = BILL_CONTENT;
    var y = 58;

    ctx.textBaseline = "top";

    ctx.save();
    billFillRoundRect(ctx, x, y, 27, 27, 6, BILL_COLORS.accent);
    ctx.font = billFont("400", 23, "serif");
    ctx.fillStyle = BILL_COLORS.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Z", x + 13.5, y + 14);
    ctx.restore();

    var brandFont = billFont("600", 17, "sans");
    billText(ctx, "ZONE", x + 38, y + 2, brandFont, BILL_COLORS.ink);
    ctx.font = brandFont;
    var brandWidth = ctx.measureText("ZONE").width;
    billText(ctx, "SHARED EXPENSE LEDGER", x + 38 + brandWidth + 10, y + 7, billFont("500", 10.2, "mono"), BILL_COLORS.faint);
    billText(ctx, "BILL / " + model.issued, right, y + 7, billFont("500", 10.2, "mono"), BILL_COLORS.muted, "right");
    billLine(ctx, x, y + 42, right, y + 42, BILL_COLORS.line, 1, [2, 4]);
    y += 70;

    var stampWidth = 178;
    var titleFont = billFont("400", 56, "serif");
    var titleLines = billWrap(ctx, group.name, titleFont, contentW - stampWidth - 20);
    titleLines.forEach(function (line, index) {
      billText(ctx, line, x, y + index * 56, titleFont, BILL_COLORS.ink);
    });

    billLine(ctx, right - stampWidth, y - 4, right - stampWidth, y + 86, BILL_COLORS.lineSoft, 1);
    billText(ctx, "TABLE", right, y + 1, billFont("500", 10, "mono"), BILL_COLORS.faint, "right");
    billText(ctx, model.tableNumber, right, y + 14, billFont("400", 42, "serif"), BILL_COLORS.ink, "right");
    billText(ctx, model.kindLabel.toUpperCase() + " TABLE", right, y + 62, billFont("500", 10.2, "mono"), model.kindColor, "right");

    y += Math.max(titleLines.length * 56, 88) + 12;

    var meta = plural((group.members || []).length, "person", "people").toUpperCase() +
      "   ·   " + plural(model.expenses.length, "entry", "entries").toUpperCase() +
      "   ·   " + plural(model.costCount, "cost", "costs").toUpperCase();
    billText(ctx, meta, x, y + 3, billFont("500", 10.2, "mono"), BILL_COLORS.muted);
    billText(ctx, "FULL LEDGER", right, y + 3, billFont("500", 10.2, "mono"), BILL_COLORS.faint, "right");
    y += 32;

    var summaryY = y + 12;
    var summaryH = 116;
    var panel = ctx.createLinearGradient(x, summaryY, right, summaryY + summaryH);
    panel.addColorStop(0, BILL_COLORS.dark);
    panel.addColorStop(1, BILL_COLORS.dark2);
    billFillRoundRect(ctx, x, summaryY, contentW, summaryH, 8, panel);

    ctx.save();
    billRoundRect(ctx, x, summaryY, contentW, summaryH, 8);
    ctx.clip();
    ctx.fillStyle = BILL_COLORS.accent;
    ctx.fillRect(x, summaryY, 3, summaryH);
    ctx.restore();

    var stats = [
      {
        label: "TOTAL SHARED",
        value: moneyShort(model.calc.total),
        sub: plural(model.costCount, "cost", "costs")
      },
      {
        label: "OPEN TO SETTLE",
        value: model.transfers.length ? moneyShort(model.transferTotal) : "Square",
        sub: model.transfers.length ? plural(model.transfers.length, "transfer", "transfers") : "All settled"
      },
      {
        label: "MEMBERS",
        value: String((group.members || []).length),
        sub: "At this table"
      },
      {
        label: "LEDGER ENTRIES",
        value: String(model.expenses.length),
        sub: model.settlementCount ? plural(model.settlementCount, "settlement", "settlements") : "No settlements"
      }
    ];
    var cellW = contentW / 4;
    stats.forEach(function (stat, index) {
      var cx = x + index * cellW;
      if (index) billLine(ctx, cx, summaryY + 20, cx, summaryY + summaryH - 20, BILL_COLORS.boardLine, 1);
      billText(ctx, stat.label, cx + 18, summaryY + 18, billFont("500", 10, "mono"), BILL_COLORS.boardMuted);
      var valueFont = billFitFont(ctx, stat.value, "serif", "400", 28, 20, cellW - 36);
      billText(ctx, stat.value, cx + 18, summaryY + 36, valueFont, BILL_COLORS.boardInk);
      billText(ctx, stat.sub, cx + 18, summaryY + 86, billFont("500", 9.8, "mono"), BILL_COLORS.boardFaint);
    });

    y = summaryY + summaryH + 42;

    y = drawBillSection(ctx, x, right, y, "ITEMISED LEDGER", "Costs & payments", plural(model.expenses.length, "entry", "entries"));
    if (!model.expenses.length) {
      billText(ctx, "No entries yet.", x, y, billFont("400", 11, "sans"), BILL_COLORS.muted);
      y += 34;
    } else {
      model.months.forEach(function (month) {
        billText(ctx, month.label.toUpperCase(), x, y, billFont("500", 10.2, "mono"), BILL_COLORS.accent);
        billText(ctx, plural(month.items.length, "entry", "entries"), right, y, billFont("500", 9.8, "mono"), BILL_COLORS.faint, "right");
        y += 19;
        billLine(ctx, x, y, right, y, BILL_COLORS.line, 1);
        y += 14;
        month.items.forEach(function (expense) {
          y = drawBillEntry(ctx, group, expense, x, right, y);
        });
        y += 12;
      });
    }

    y += 2;
    billLine(ctx, x, y, right, y, BILL_COLORS.ink, 1.2);
    y += 14;
    billText(ctx, "TOTAL SHARED", x, y, billFont("500", 10, "mono"), BILL_COLORS.muted);
    billText(ctx, moneyShort(model.calc.total), right, y - 10, billFont("400", 32, "serif"), BILL_COLORS.ink, "right");
    var totalNote = model.settlementCount
      ? plural(model.settlementCount, "settlement", "settlements") + " (" + moneyShort(model.settlementTotal) + ") adjust balances only and are excluded from shared spending."
      : "No settlement entries. The balances below reflect costs only.";
    var totalNoteFont = billFont("400", 10.5, "sans");
    var totalNoteLines = billWrap(ctx, totalNote, totalNoteFont, contentW - 280);
    var totalNoteY = y + 22;
    totalNoteLines.forEach(function (line, index) {
      billText(ctx, line, x, totalNoteY + index * 14, totalNoteFont, BILL_COLORS.faint);
    });
    y = totalNoteY + totalNoteLines.length * 14 + 26;

    y += 30;
    y = drawBillSection(ctx, x, right, y, "BALANCE SHEET", "Who stands where", plural((group.members || []).length, "person", "people"));

    var paidRight = x + Math.round(contentW * 0.62);
    var shareRight = x + Math.round(contentW * 0.8);
    billText(ctx, "MEMBER", x, y, billFont("500", 10.2, "mono"), BILL_COLORS.faint);
    billText(ctx, "PAID", paidRight, y, billFont("500", 10.2, "mono"), BILL_COLORS.faint, "right");
    billText(ctx, "SHARE", shareRight, y, billFont("500", 10.2, "mono"), BILL_COLORS.faint, "right");
    billText(ctx, "NET", right, y, billFont("500", 10.2, "mono"), BILL_COLORS.faint, "right");
    billLine(ctx, x, y + 18, right, y + 18, BILL_COLORS.line, 1);
    y += 26;

    var members = group.members || [];
    if (!members.length) {
      billText(ctx, "No people at this table.", x, y + 4, billFont("400", 11.5, "sans"), BILL_COLORS.muted);
      y += 36;
    } else {
      var memberFont = billFont("500", 14, "sans");
      members.forEach(function (member) {
        var net = model.calc.net[member.id] || 0;
        var netColor = net > 0.005 ? BILL_COLORS.green : (net < -0.005 ? BILL_COLORS.accent : BILL_COLORS.faint);
        billAvatar(ctx, member.name, x, y + 4, 18);
        billText(ctx, billEllipsis(ctx, member.name, memberFont, contentW * 0.46), x + 50, y + 12, memberFont, BILL_COLORS.ink);
        billText(ctx, moneyShort(model.calc.paid[member.id]), paidRight, y + 13, billFont("500", 11, "mono"), BILL_COLORS.muted, "right");
        billText(ctx, moneyShort(model.calc.share[member.id]), shareRight, y + 13, billFont("500", 11, "mono"), BILL_COLORS.muted, "right");
        billText(ctx, billSigned(net), right, y + 12, billFont("500", 12, "mono"), netColor, "right");
        billLine(ctx, x, y + 42, right, y + 42, BILL_COLORS.lineSoft, 1);
        y += 46;
      });
    }
    billText(ctx, "Green is owed to them by the table. Red is owed by them." +
      (model.settlementCount ? " Paid and share include settlements." : ""),
      x, y + 8, billFont("400", 10.2, "sans"), BILL_COLORS.faint);
    y += 28;

    y += 30;
    y = drawBillSection(ctx, x, right, y, "SETTLE UP", "The shortest way back to even",
      model.transfers.length ? moneyShort(model.transferTotal) + " to move" : "All square");

    if (!model.transfers.length) {
      billFillRoundRect(ctx, x, y, contentW, 70, 8, BILL_COLORS.greenSoft);
      billCheck(ctx, x + 20, y + 23, 13, BILL_COLORS.green);
      billText(ctx, "Everyone is square.", x + 52, y + 15, billFont("600", 13.5, "sans"), BILL_COLORS.green);
      billText(ctx, "No further payments are needed to settle this ledger.", x + 52, y + 36, billFont("400", 10.5, "sans"), BILL_COLORS.muted);
      y += 74;
    } else {
      var transferFont = billFont("500", 13.5, "sans");
      model.transfers.forEach(function (transfer) {
        var fromName = memberName(group, transfer.from);
        var toName = memberName(group, transfer.to);
        billAvatar(ctx, fromName, x, y + 11, 13);
        billText(ctx, billEllipsis(ctx, fromName, transferFont, 240), x + 38, y + 15, transferFont, BILL_COLORS.ink);
        billText(ctx, "pays", x + 330, y + 17, billFont("500", 9.8, "mono"), BILL_COLORS.faint);
        billArrow(ctx, x + 370, y + 25, 26, BILL_COLORS.accent);
        billAvatar(ctx, toName, x + 414, y + 11, 13);
        billText(ctx, billEllipsis(ctx, toName, transferFont, 230), x + 452, y + 15, transferFont, BILL_COLORS.ink);
        billText(ctx, moneyShort(transfer.amount), right, y + 15, billFont("500", 13, "mono"), BILL_COLORS.accent, "right");
        billLine(ctx, x, y + 46, right, y + 46, BILL_COLORS.lineSoft, 1);
        y += 50;
      });
      billText(ctx, "Minimum-transfer plan, computed from the balances above.", x, y + 9, billFont("400", 10.2, "sans"), BILL_COLORS.faint);
      y += 28;
    }

    y += 22;
    billLine(ctx, x, y, right, y, BILL_COLORS.line, 1, [2, 4]);
    y += 24;

    billText(ctx, "LEDGER FINGERPRINT", x, y, billFont("500", 10.2, "mono"), BILL_COLORS.accent);
    billText(ctx, model.fingerprint, x, y + 18, billFont("500", 18, "mono"), BILL_COLORS.ink);
    billText(ctx, "Generated " + model.generated, x, y + 44, billFont("400", 10.5, "sans"), BILL_COLORS.muted);

    drawBillStamp(ctx, right - 56, y + 44, 40);

    var finePrint = "This bill is a snapshot of the ledger stored in your workspace. Settlement entries adjust balances only and are excluded from shared spending. Amounts are rounded for display. Match the fingerprint before relying on a shared copy.";
    var fineFont = billFont("400", 10.2, "sans");
    var fineLines = billWrap(ctx, finePrint, fineFont, contentW - 150);
    var fineY = y + 72;
    fineLines.forEach(function (line, index) {
      billText(ctx, line, x, fineY + index * 14.5, fineFont, BILL_COLORS.faint);
    });
    y = fineY + fineLines.length * 14.5 + 24;

    billLine(ctx, x, y, right, y, BILL_COLORS.lineSoft, 1);
    y += 12;
    billText(ctx, "ZONE / SPLIT", x, y, billFont("500", 9.8, "mono"), BILL_COLORS.faint);
    billText(ctx, "LOCAL-FIRST LEDGER", right, y, billFont("500", 9.8, "mono"), BILL_COLORS.faint, "right");

    return y + 24;
  }

  function drawBillImage(group) {
    var model = billBuildModel(group);

    var measureCanvas = document.createElement("canvas");
    measureCanvas.width = BILL_WIDTH;
    measureCanvas.height = 20;
    var measureCtx = measureCanvas.getContext("2d");
    var contentBottom = drawBillContent(measureCtx, group, model);
    var height = Math.ceil(contentBottom + 26);

    var scale = 2;
    if (height > 9000) scale = 1;
    else if (height > 5200) scale = 1.5;

    var canvas = document.createElement("canvas");
    canvas.width = Math.round(BILL_WIDTH * scale);
    canvas.height = Math.round(height * scale);
    var ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    drawBillBackdrop(ctx, height);
    drawBillContent(ctx, group, model);
    return { canvas: canvas, model: model, scale: scale, height: height };
  }

  function billSaveBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1600);
  }

  function billSaveDataUrl(data, filename) {
    var link = document.createElement("a");
    link.href = data;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function setBillBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    button.classList.toggle("is-busy", busy);
    if (busy) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
  }

  function billFontsReady() {
    if (!document.fonts) return Promise.resolve();
    var waits = [];
    try {
      if (document.fonts.load) {
        waits.push(document.fonts.load('400 56px "Instrument Serif"'));
        waits.push(document.fonts.load('500 16px "Inter Tight"'));
        waits.push(document.fonts.load('600 16px "Inter Tight"'));
        waits.push(document.fonts.load('400 16px "JetBrains Mono"'));
        waits.push(document.fonts.load('500 16px "JetBrains Mono"'));
      }
      if (document.fonts.ready) waits.push(document.fonts.ready);
    } catch (error) {
      return Promise.resolve();
    }
    return Promise.all(waits).catch(function () { return []; });
  }

  function downloadBillImage() {
    var group = activeGroup();
    if (!group) {
      Z.toast("Choose a table first", "error");
      return;
    }
    if (!(group.expenses || []).length) {
      Z.toast("Add an entry before downloading a bill", "error");
      return;
    }

    var button = detailHost.querySelector("[data-download-bill]");
    if (button && button.classList.contains("is-busy")) return;
    setBillBusy(button, true);

    billFontsReady().then(function () {
      var result = drawBillImage(group);

      if (result.canvas.toBlob) {
        result.canvas.toBlob(function (blob) {
          setBillBusy(button, false);
          if (!blob) {
            Z.toast("Could not create the bill image", "error");
            return;
          }
          billSaveBlob(blob, result.model.fileName);
          Z.toast("Bill image downloaded");
        }, "image/png");
      } else {
        billSaveDataUrl(result.canvas.toDataURL("image/png"), result.model.fileName);
        setBillBusy(button, false);
        Z.toast("Bill image downloaded");
      }
    }).catch(function (error) {
      setBillBusy(button, false);
      if (window.console && console.error) console.error(error);
      Z.toast("Could not create the bill image", "error");
    });
  }

  /* ------------------------------------------------------------------------
     Actions: group, member, expense
     ------------------------------------------------------------------------ */

  function resetFilters() {
    expenseQuery = "";
    expenseCategory = "all";
    expandedId = null;
  }

  function switchGroup(id) {
    if (id === activeId || !findGroup(id)) return;
    activeId = id;
    resetFilters();
    renderGroups();
    renderDetail();
  }

  function deleteExpense(id) {
    var group = activeGroup();
    if (!group) return;
    var expense = (group.expenses || []).filter(function (item) { return item.id === id; })[0];
    if (!expense) return;

    Z.confirm({
      kicker: "Remove an entry",
      title: "Delete this expense?",
      message: "<strong>" + Z.esc(expense.description) + "</strong> for <strong>" + moneyShort(expense.amount) + "</strong> will be removed from the ledger. The balances will update immediately.",
      label: "Delete expense"
    }).then(function (ok) {
      if (!ok) return;
      group.expenses = group.expenses.filter(function (item) { return item.id !== id; });
      if (expandedId === id) expandedId = null;
      persist();
      renderAll();
      Z.toast("Expense deleted");
    });
  }

  function deleteGroup() {
    var group = activeGroup();
    if (!group) return;
    Z.confirm({
      kicker: "Remove a table",
      title: "Delete this table?",
      message: "<strong>" + Z.esc(group.name) + "</strong>, its people, and its <strong>" + plural((group.expenses || []).length, "entry", "entries") + "</strong> will be removed from your workspace. This cannot be undone.",
      label: "Delete table"
    }).then(function (ok) {
      if (!ok) return;
      groups = groups.filter(function (item) { return item.id !== group.id; });
      activeId = groups.length ? groups[0].id : null;
      resetFilters();
      persist();
      renderAll();
      Z.toast("Table deleted");
    });
  }

  function findExpenseInGroup(group, id) {
    return (group.expenses || []).filter(function (expense) { return expense.id === id; })[0];
  }

  function toggleExpense(button) {
    var article = button.closest(".sp-entry");
    if (!article) return;
    var willOpen = !article.classList.contains("is-open");

    Array.prototype.forEach.call(detailHost.querySelectorAll(".sp-entry.is-open"), function (entry) {
      entry.classList.remove("is-open");
      var toggle = entry.querySelector("[data-expense-toggle]");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });

    if (willOpen) {
      article.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      expandedId = article.getAttribute("data-expense");
    } else {
      button.setAttribute("aria-expanded", "false");
      expandedId = null;
    }
  }

  /* ------------------------------------------------------------------------
     Events
     ------------------------------------------------------------------------ */

  $("new-group").addEventListener("click", openGroupDialog);
  $("new-group-side").addEventListener("click", openGroupDialog);
  if (exportButton) exportButton.addEventListener("click", exportLedger);

  Array.prototype.forEach.call(document.querySelectorAll("[data-close-group]"), function (button) {
    button.addEventListener("click", function () { groupDialog.close(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-close-member]"), function (button) {
    button.addEventListener("click", function () { memberDialog.close(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-close-expense]"), function (button) {
    button.addEventListener("click", function () { expenseDialog.close(); });
  });

  groupMembers.addEventListener("input", updateGroupMemberPreview);

  groupForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = groupName.value.trim();
    var names = parseNames(groupMembers.value);

    if (name.length < 2) {
      Z.toast("Give the table a name", "error");
      groupName.focus();
      return;
    }
    if (names.length < 2) {
      Z.toast("Add at least two people", "error");
      groupMembers.focus();
      return;
    }
    if (names.length > 12) {
      Z.toast("Tables are limited to twelve people", "error");
      groupMembers.focus();
      return;
    }

    var kindInput = groupForm.querySelector('input[name="group-kind"]:checked');
    var kind = kindInput && KINDS[kindInput.value] ? kindInput.value : "home";
    var group = {
      id: Z.uid("group"),
      name: name,
      kind: kind,
      members: names.map(function (memberName) {
        return { id: Z.uid("sm"), name: memberName };
      }),
      expenses: []
    };

    groups.push(group);
    activeId = group.id;
    resetFilters();
    persist();
    groupDialog.close();
    renderAll();
    Z.toast("Table started");
  });

  memberForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var group = activeGroup();
    if (!group) {
      memberDialog.close();
      return;
    }
    var name = memberNameField.value.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      Z.toast("Enter a name", "error");
      memberNameField.focus();
      return;
    }
    if ((group.members || []).length >= 12) {
      Z.toast("This table already has twelve people", "error");
      return;
    }
    var duplicate = (group.members || []).some(function (member) {
      return String(member.name).trim().toLowerCase() === name.toLowerCase();
    });
    if (duplicate) {
      Z.toast("That person is already at the table", "error");
      memberNameField.focus();
      return;
    }

    group.members.push({ id: Z.uid("sm"), name: name });
    persist();
    memberDialog.close();
    renderAll();
    Z.toast(name + " joined the table");
  });

  expenseMembers.addEventListener("change", updateShareHint);
  expenseAmount.addEventListener("input", updateShareHint);

  expenseForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var group = activeGroup();
    if (!group) {
      expenseDialog.close();
      return;
    }

    var description = expenseDesc.value.trim();
    var amount = Number(expenseAmount.value);
    var payer = expensePayer.value;
    var shared = Array.prototype.map.call(
      expenseMembers.querySelectorAll('input[type="checkbox"]:checked'),
      function (input) { return input.value; }
    );

    if (description.length < 2) {
      Z.toast("Describe the expense", "error");
      expenseDesc.focus();
      return;
    }
    if (!isFinite(amount) || amount <= 0) {
      Z.toast("Enter an amount above zero", "error");
      expenseAmount.focus();
      return;
    }
    if (!memberOf(group, payer)) {
      Z.toast("Choose who paid", "error");
      expensePayer.focus();
      return;
    }
    if (!shared.length) {
      Z.toast("Choose at least one person to split with", "error");
      return;
    }

    var editingId = expenseId.value;
    var category = selectedCategory();
    var payload = {
      id: editingId || Z.uid("gx"),
      description: description,
      amount: Number(amount.toFixed(2)),
      paidBy: payer,
      date: expenseDate.value || Z.todayISO(),
      sharedWith: shared,
      category: CATEGORIES[category] ? category : "other"
    };

    if (editingId) {
      var target = findExpenseInGroup(group, editingId);
      if (target) {
        Object.keys(payload).forEach(function (key) { target[key] = payload[key]; });
      } else {
        group.expenses.push(payload);
      }
      if (expenseCategory !== "all" && expenseCategory !== payload.category) expenseCategory = "all";
    } else {
      group.expenses.push(payload);
      expenseQuery = "";
      expenseCategory = "all";
    }

    expandedId = payload.id;
    persist();
    expenseDialog.close();
    renderAll();
    Z.toast(editingId ? "Expense updated" : "Expense added");
  });

  groupList.addEventListener("click", function (event) {
    var emptyAction = event.target.closest("[data-empty-new-group]");
    if (emptyAction) {
      openGroupDialog();
      return;
    }
    var card = event.target.closest("[data-group]");
    if (card) switchGroup(card.getAttribute("data-group"));
  });

  detailHost.addEventListener("input", function (event) {
    if (event.target && event.target.id === "expense-search") {
      expenseQuery = event.target.value;
      renderExpenseList();
    }
  });

  detailHost.addEventListener("change", function (event) {
    if (event.target && event.target.id === "expense-sort") {
      expenseSort = event.target.value;
      renderExpenseList();
    }
  });

  detailHost.addEventListener("click", function (event) {
    var target = event.target;
    var button;

    if ((button = target.closest("[data-empty-new-group]"))) {
      openGroupDialog();
      return;
    }
    if ((button = target.closest("[data-add-expense]"))) {
      openExpenseDialog(null);
      return;
    }
    if ((button = target.closest("[data-add-member]"))) {
      openMemberDialog();
      return;
    }
    if ((button = target.closest("[data-copy-summary]"))) {
      copySummary();
      return;
    }
    if ((button = target.closest("[data-download-bill]"))) {
      downloadBillImage();
      return;
    }
    if ((button = target.closest("[data-delete-group]"))) {
      deleteGroup();
      return;
    }
    if ((button = target.closest("[data-edit-expense]"))) {
      var group = activeGroup();
      var expense = group ? findExpenseInGroup(group, button.getAttribute("data-edit-expense")) : null;
      if (expense) openExpenseDialog(expense);
      return;
    }
    if ((button = target.closest("[data-delete-expense]"))) {
      deleteExpense(button.getAttribute("data-delete-expense"));
      return;
    }
    if ((button = target.closest("[data-cat-filter]"))) {
      expenseCategory = button.getAttribute("data-cat-filter");
      renderExpenseList();
      return;
    }
    if ((button = target.closest("[data-clear-filters]"))) {
      resetFilters();
      var search = $("expense-search");
      if (search) search.value = "";
      renderExpenseList();
      return;
    }
    if ((button = target.closest("[data-settle-from]"))) {
      settleOne(button.getAttribute("data-settle-from"), button.getAttribute("data-settle-to"), Number(button.getAttribute("data-settle-amount")));
      return;
    }
    if ((button = target.closest("[data-settle-all]"))) {
      settleAll();
      return;
    }
    if ((button = target.closest("[data-expense-toggle]"))) {
      toggleExpense(button);
    }
  });

  updateGroupMemberPreview();
  renderAll();
})();
