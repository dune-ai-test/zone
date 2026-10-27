/* Zone — passbook */

(function () {
  "use strict";

  var esc = Z.esc;
  var today = Z.todayISO();
  var currentMonth = Z.monthKey(today);
  var EXPENSE_CATS = ["Rent", "Groceries", "Food", "Transport", "Utilities", "Shopping", "Health", "Entertainment", "Travel", "Education", "Gifts", "Transfer", "Other"];
  var INCOME_CATS = ["Salary", "Freelance", "Investments", "Refund", "Transfer", "Other"];

  var book = Z.store.get("passbook", { accounts: [], transactions: [] });
  if (!book || typeof book !== "object") book = { accounts: [], transactions: [] };
  if (!Array.isArray(book.accounts)) book.accounts = [];
  if (!Array.isArray(book.transactions)) book.transactions = [];

  book.accounts = book.accounts.filter(function (account) {
    return account && typeof account === "object";
  });
  book.accounts.forEach(function (account) {
    account.opening = Number(account.opening) || 0;
  });
  book.transactions = book.transactions.filter(function (txn) {
    return txn && typeof txn === "object" && /^\d{4}-\d{2}-\d{2}$/.test(String(txn.date || ""));
  });
  book.transactions.forEach(function (txn) {
    txn.amount = Number(txn.amount) || 0;
  });

  var state = {
    account: "all",
    month: "all",
    type: "all",
    search: ""
  };

  var $ = function (id) { return document.getElementById(id); };
  var symbol = Z.money(0).replace(/[\d.,\s]/g, "");
  $("account-currency").textContent = symbol;
  $("entry-currency").textContent = symbol;

  var accountDialog = $("account-dialog");
  var accountForm = $("account-form");
  var accountId = $("account-id");
  var accountName = $("account-name");
  var accountType = $("account-type");
  var accountNumber = $("account-number");
  var accountOpening = $("account-opening");
  var accountDelete = $("account-delete");

  var entryDialog = $("entry-dialog");
  var entryForm = $("entry-form");
  var entryId = $("entry-id");
  var entryType = $("entry-type");
  var entryAmount = $("entry-amount");
  var entryDate = $("entry-date");
  var entryAccount = $("entry-account");
  var entryCategory = $("entry-category");
  var entryDescription = $("entry-description");

  var searchField = $("pb-search");
  var searchClear = $("pb-search-clear");
  var searchBox = searchField.closest(".pk-search");
  var monthField = $("pb-month");
  var typeHost = $("pb-type");
  var tableBody = $("pb-body");

  entryDate.max = today;

  function findAccount(id) {
    return book.accounts.filter(function (account) { return account.id === id; })[0];
  }

  function txnBalance(txn) {
    return txn.type === "deposit" ? txn.amount : -txn.amount;
  }

  function accountBalance(id) {
    var account = findAccount(id);
    if (!account) return 0;
    return book.transactions.reduce(function (balance, txn) {
      if (txn.accountId !== id) return balance;
      return balance + txnBalance(txn);
    }, account.opening);
  }

  function totalBalance() {
    return book.accounts.reduce(function (sum, account) {
      return sum + accountBalance(account.id);
    }, 0);
  }

  function totalOpening() {
    return book.accounts.reduce(function (sum, account) { return sum + account.opening; }, 0);
  }

  function monthTxns(key) {
    return book.transactions.filter(function (txn) { return Z.monthKey(txn.date) === key; });
  }

  function flow(list) {
    var moneyIn = list.filter(function (txn) { return txn.type === "deposit"; })
      .reduce(function (sum, txn) { return sum + txn.amount; }, 0);
    var moneyOut = list.filter(function (txn) { return txn.type === "withdraw"; })
      .reduce(function (sum, txn) { return sum + txn.amount; }, 0);
    return {
      moneyIn: moneyIn,
      moneyOut: moneyOut,
      net: moneyIn - moneyOut,
      deposits: list.filter(function (txn) { return txn.type === "deposit"; }).length,
      withdrawals: list.filter(function (txn) { return txn.type === "withdraw"; }).length
    };
  }

  function accountMonthNet(accountIdValue) {
    var list = monthTxns(currentMonth).filter(function (txn) {
      return accountIdValue === "all" || txn.accountId === accountIdValue;
    });
    return flow(list).net;
  }

  function inMonth(monthKey) {
    return function (txn) {
      return monthKey === "all" || Z.monthKey(txn.date) === monthKey;
    };
  }

  function inAccount(id) {
    return function (txn) {
      return id === "all" || txn.accountId === id;
    };
  }

  function scopedTxns(includeTypeAndSearch) {
    var query = state.search.trim().toLowerCase();
    return book.transactions.filter(function (txn) {
      if (!inAccount(state.account)(txn)) return false;
      if (!inMonth(state.month)(txn)) return false;
      if (includeTypeAndSearch) {
        if (state.type !== "all" && txn.type !== state.type) return false;
        if (query) {
          var account = findAccount(txn.accountId);
          var haystack = [txn.description, txn.category, txn.type, account ? account.name : ""].join(" ").toLowerCase();
          if (haystack.indexOf(query) === -1) return false;
        }
      }
      return true;
    });
  }

  function sortDesc(list) {
    return list.slice().sort(function (a, b) {
      if (a.date === b.date) return String(b.id).localeCompare(String(a.id));
      return String(b.date).localeCompare(String(a.date));
    });
  }

  function runningBalances() {
    var opening = 0;
    var list;
    if (state.account === "all") {
      opening = totalOpening();
      list = book.transactions.slice();
    } else {
      var account = findAccount(state.account);
      opening = account ? account.opening : 0;
      list = book.transactions.filter(function (txn) { return txn.accountId === state.account; });
    }
    list = list.slice().sort(function (a, b) {
      if (a.date === b.date) return String(a.id).localeCompare(String(b.id));
      return String(a.date).localeCompare(String(b.date));
    });
    var balance = opening;
    var map = {};
    list.forEach(function (txn) {
      balance += txnBalance(txn);
      map[txn.id] = balance;
    });
    return map;
  }

  function monthShort(key) {
    return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(Z.parseISO(key + "-01"));
  }

  function monthsBack(key, offset) {
    var date = Z.parseISO(key + "-01");
    date.setMonth(date.getMonth() + offset);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function monthEnd(key) {
    var date = Z.parseISO(key + "-01");
    var last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return Z.toISO(last);
  }

  function balanceAt(cutoff) {
    return book.transactions.reduce(function (sum, txn) {
      return txn.date <= cutoff ? sum + txnBalance(txn) : sum;
    }, totalOpening());
  }

  function syncSearch() {
    var hasValue = Boolean(searchField.value.trim());
    searchClear.hidden = !hasValue;
    searchBox.classList.toggle("has-value", hasValue);
  }

  function syncTypeButtons() {
    typeHost.querySelectorAll("[data-entry-filter]").forEach(function (button) {
      var active = button.dataset.entryFilter === state.type;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderHero() {
    var current = flow(monthTxns(currentMonth));
    var count = book.accounts.length;
    $("passbook-hero-count").textContent = count + (count === 1 ? " account" : " accounts");
    $("passbook-hero-total").textContent = Z.money(totalBalance());
    $("passbook-hero-in").textContent = Z.money(current.moneyIn);
    $("passbook-hero-out").textContent = Z.money(current.moneyOut);

    var latest = sortDesc(book.transactions)[0];
    $("passbook-hero-note").textContent = latest
      ? "Last entry " + Z.relDate(latest.date).toLowerCase() + " · six-month balance"
      : "Balance at the end of each month.";

    $("passbook-hero-meta").innerHTML =
      '<span class="pk-meta-item"><span class="pk-local-dot" aria-hidden="true"></span>Local passbook</span>' +
      '<span class="pk-meta-item">' + count + (count === 1 ? " account" : " accounts") + "</span>" +
      '<span class="pk-meta-item">' + book.transactions.length + (book.transactions.length === 1 ? " entry" : " entries") + "</span>" +
      '<span class="pk-meta-item">' + Z.settings().currency + "</span>";

    renderSpark();
  }

  function renderSpark() {
    var host = $("passbook-hero-chart");
    if (!book.accounts.length) {
      host.innerHTML = '<div class="pk-spark-empty">Add an account to begin the running balance.</div>';
      return;
    }

    var keys = [];
    for (var offset = -5; offset <= 0; offset += 1) keys.push(monthsBack(currentMonth, offset));
    var values = keys.map(function (key) {
      return balanceAt(key === currentMonth ? today : monthEnd(key));
    });
    var W = 300;
    var H = 82;
    var left = 5;
    var right = 8;
    var top = 8;
    var bottom = 17;
    var plotW = W - left - right;
    var plotH = H - top - bottom;
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    if (max === min) {
      var pad = Math.max(Math.abs(max) * 0.05, 100);
      min -= pad;
      max += pad;
    }
    var points = values.map(function (value, index) {
      var x = left + (plotW * index) / (values.length - 1);
      var y = top + plotH - ((value - min) / (max - min)) * plotH;
      return { x: x, y: y, value: value, key: keys[index] };
    });
    var line = points.map(function (point, index) {
      return (index === 0 ? "M" : "L") + point.x.toFixed(1) + " " + point.y.toFixed(1);
    }).join(" ");
    var area = line + " L" + points[points.length - 1].x.toFixed(1) + " " + (top + plotH) + " L" + points[0].x.toFixed(1) + " " + (top + plotH) + " Z";
    var labels = points.map(function (point, index) {
      return '<text class="pk-spark-label" x="' + point.x.toFixed(1) + '" y="' + (H - 4) + '" text-anchor="' + (index === 0 ? "start" : index === points.length - 1 ? "end" : "middle") + '">' + monthShort(point.key) + "</text>";
    }).join("");
    var dots = points.map(function (point, index) {
      return '<circle class="pk-spark-dot" cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="' + (index === points.length - 1 ? "2.3" : "1.5") + '"><title>' + esc(Z.monthLabel(point.key, true)) + " · " + esc(Z.money(point.value)) + "</title></circle>";
    }).join("");

    host.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Combined balance over the last six months">' +
      '<path class="pk-spark-area" d="' + area + '"></path>' +
      '<path class="pk-spark-line" d="' + line + '"></path>' +
      dots + labels + "</svg>";
  }

  function renderStats() {
    var list = monthTxns(currentMonth);
    var current = flow(list);
    var monthName = Z.monthLabel(currentMonth);
    var stats = [
      {
        label: "In · " + monthName,
        value: Z.money(current.moneyIn),
        hint: current.deposits + (current.deposits === 1 ? " deposit" : " deposits")
      },
      {
        label: "Out · " + monthName,
        value: Z.money(current.moneyOut),
        hint: current.withdrawals + (current.withdrawals === 1 ? " withdrawal" : " withdrawals")
      },
      {
        label: "Kept this month",
        value: Z.money(current.net),
        valueClass: current.net < 0 ? "neg" : current.net > 0 ? "pos" : "",
        hint: current.moneyIn > 0 ? Math.max(0, Math.round((current.net / current.moneyIn) * 100)) + "% of what came in" : "Nothing in yet"
      },
      {
        label: "Entries this month",
        value: Z.num(list.length),
        hint: list.length ? "Across " + book.accounts.length + (book.accounts.length === 1 ? " account" : " accounts") : "The book is quiet"
      }
    ];

    $("passbook-stats").innerHTML = stats.map(function (stat, index) {
      return '<article class="pk-stat">' +
        '<span class="pk-stat-index">0' + (index + 1) + "</span>" +
        '<span class="pk-stat-label">' + esc(stat.label) + "</span>" +
        '<p class="pk-stat-value' + (stat.valueClass ? " " + stat.valueClass : "") + '">' + stat.value + "</p>" +
        '<p class="pk-stat-foot">' + esc(stat.hint) + "</p>" +
      "</article>";
    }).join("");
  }

  function renderAccounts() {
    var allActive = state.account === "all";
    var allNet = accountMonthNet("all");
    var html = '<button type="button" class="pk-account' + (allActive ? " is-active" : "") + '" data-account-id="all" aria-pressed="' + allActive + '">' +
      '<span class="pk-account-top"><span class="pk-account-type">Combined</span>' +
        '<span class="pk-account-net' + (allNet > 0 ? " is-pos" : allNet < 0 ? " is-neg" : "") + '">' + (allNet > 0 ? "+" : allNet < 0 ? "−" : "") + Z.money(Math.abs(allNet)) + "</span></span>" +
      '<span class="pk-account-name">All accounts</span>' +
      '<span class="pk-account-balance">' + Z.money(totalBalance()) + "</span>" +
      '<span class="pk-account-foot"><span>' + book.accounts.length + (book.accounts.length === 1 ? " account" : " accounts") + "</span><span>" + book.transactions.length + " entries</span></span>" +
    "</button>";

    html += book.accounts.map(function (account) {
      var active = state.account === account.id;
      var entries = book.transactions.filter(function (txn) { return txn.accountId === account.id; }).length;
      var net = accountMonthNet(account.id);
      return '<button type="button" class="pk-account' + (active ? " is-active" : "") + '" data-account-id="' + esc(account.id) + '" aria-pressed="' + active + '">' +
        '<span class="pk-account-top"><span class="pk-account-type">' + esc(account.type || "Account") + "</span>" +
          '<span class="pk-account-net' + (net > 0 ? " is-pos" : net < 0 ? " is-neg" : "") + '">' + (net > 0 ? "+" : net < 0 ? "−" : "") + Z.money(Math.abs(net)) + "</span></span>" +
        '<span class="pk-account-name">' + esc(account.name) + "</span>" +
        '<span class="pk-account-balance">' + Z.money(accountBalance(account.id)) + "</span>" +
        '<span class="pk-account-foot"><span>' + esc(account.number || "No number") + "</span><span>" + entries + (entries === 1 ? " entry" : " entries") + "</span></span>" +
      "</button>";
    }).join("");

    html += '<button type="button" class="pk-account-add" data-add-account aria-label="Add account">' + Z.icon("plus") + "<span>Add account</span></button>";
    $("account-row").innerHTML = html;
  }

  function renderStatementHead() {
    var title = $("statement-title");
    var sub = $("statement-sub");
    var balance = $("statement-balance");
    var note = $("statement-balance-note");
    var edit = $("pb-edit-account");

    if (!book.accounts.length) {
      title.textContent = "An empty book";
      sub.textContent = "Add an account to begin.";
      balance.textContent = "—";
      note.textContent = "Opening balances become the first line.";
      edit.hidden = true;
      return;
    }

    if (state.account === "all") {
      title.textContent = "All accounts";
      sub.textContent = book.accounts.length + " accounts · combined statement";
      balance.textContent = Z.money(totalBalance());
      note.textContent = "Opening " + Z.money(totalOpening()) + " · " + book.transactions.length + (book.transactions.length === 1 ? " entry" : " entries") + " in the book";
      edit.hidden = true;
      return;
    }

    var account = findAccount(state.account);
    if (!account) {
      state.account = "all";
      renderStatementHead();
      return;
    }
    var entries = book.transactions.filter(function (txn) { return txn.accountId === account.id; }).length;
    title.textContent = account.name;
    sub.textContent = (account.type || "Account") + " · " + (account.number || "no number on file");
    balance.textContent = Z.money(accountBalance(account.id));
    note.textContent = "Opening " + Z.money(account.opening) + " · " + entries + (entries === 1 ? " entry" : " entries");
    edit.hidden = false;
  }

  function renderSummary() {
    var scoped = scopedTxns(false);
    var current = flow(scoped);
    var totalFlow = current.moneyIn + current.moneyOut;
    var inWidth = totalFlow > 0 ? (current.moneyIn / totalFlow) * 100 : 0;

    var withdrawals = scoped.filter(function (txn) { return txn.type === "withdraw"; });
    var largest = withdrawals.slice().sort(function (a, b) { return b.amount - a.amount; })[0];
    var byCategory = {};
    withdrawals.forEach(function (txn) {
      byCategory[txn.category] = (byCategory[txn.category] || 0) + txn.amount;
    });
    var top = Object.keys(byCategory).map(function (name) {
      return { name: name, amount: byCategory[name] };
    }).sort(function (a, b) { return b.amount - a.amount; })[0];

    var netClass = current.net < 0 ? "neg" : current.net > 0 ? "pos" : "";
    var netText = (current.net > 0 ? "+" : current.net < 0 ? "−" : "") + Z.money(Math.abs(current.net));

    $("pb-summary").innerHTML =
      '<div class="pk-summary-grid">' +
        '<div class="pk-summary-item"><span>Money in</span><strong class="pos">+' + Z.money(current.moneyIn) + "</strong><small>" + current.deposits + (current.deposits === 1 ? " deposit" : " deposits") + "</small></div>" +
        '<div class="pk-summary-item"><span>Money out</span><strong class="neg">−' + Z.money(current.moneyOut) + "</strong><small>" + current.withdrawals + (current.withdrawals === 1 ? " withdrawal" : " withdrawals") + "</small></div>" +
        '<div class="pk-summary-item"><span>Net</span><strong class="' + netClass + '">' + netText + "</strong><small>" + (state.month === "all" ? "All time" : esc(Z.monthLabel(state.month, true))) + "</small></div>" +
      "</div>" +
      '<div class="pk-summary-bar" aria-hidden="true"><i class="is-in" style="width:' + inWidth.toFixed(2) + '%"></i><i class="is-out" style="width:' + (100 - inWidth).toFixed(2) + '%"></i></div>' +
      '<div class="pk-summary-note"><span>Largest out: <strong>' + (largest ? esc(largest.description || largest.category) + " · " + Z.money(largest.amount) : "—") + "</strong></span>" +
        "<span>Top category: <strong>" + (top ? esc(top.name) + " · " + Z.money(top.amount) : "—") + "</strong></span></div>";
  }

  function monthOptions() {
    var months = {};
    book.transactions.forEach(function (txn) {
      if (state.account !== "all" && txn.accountId !== state.account) return;
      if (txn.date) months[Z.monthKey(txn.date)] = true;
    });
    months[currentMonth] = true;
    return Object.keys(months).sort(function (a, b) { return b.localeCompare(a); });
  }

  function renderMonthFilter() {
    var months = monthOptions();
    if (state.month !== "all" && months.indexOf(state.month) === -1) state.month = "all";
    monthField.innerHTML = '<option value="all">All time</option>' + months.map(function (key) {
      var label = Z.monthLabel(key, true);
      if (key === currentMonth) label = "This month · " + label;
      return '<option value="' + esc(key) + '">' + esc(label) + "</option>";
    }).join("");
    monthField.value = state.month;
  }

  function renderRows() {
    var all = scopedTxns(false);
    var rows = sortDesc(scopedTxns(true));
    var scopeLabel = state.month === "all" ? "all time" : Z.monthLabel(state.month, true);
    $("pb-count").textContent = rows.length + " of " + all.length + " entries · " + scopeLabel;

    if (!book.accounts.length) {
      tableBody.innerHTML = '<tr><td colspan="7"><div class="pk-empty"><div class="pk-empty-mark">' + Z.icon("ledger") + "</div>" +
        "<h3>A new book.</h3><p>Add an account, then record the first deposit or withdrawal.</p>" +
        '<button type="button" class="btn" data-empty-add-account>Add an account</button></div></td></tr>';
      return;
    }

    if (!all.length) {
      var inBook = book.transactions.length > 0;
      tableBody.innerHTML = '<tr><td colspan="7"><div class="pk-empty"><div class="pk-empty-mark">' + Z.icon("ledger") + "</div>" +
        "<h3>" + (inBook ? "Nothing in this view." : "No entries yet.") + "</h3>" +
        "<p>" + (inBook ? "There are no entries for this account and month." : "The account is open. Record the first deposit or withdrawal.") + "</p>" +
        (state.month !== "all"
          ? '<button type="button" class="btn btn-sm" data-clear-entry-filters>Show all time</button>'
          : '<button type="button" class="btn" data-empty-add-entry>Add an entry</button>') +
        "</div></td></tr>";
      return;
    }

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="7"><div class="pk-empty"><h3>Nothing matches.</h3>' +
        "<p>Try another type or search term.</p>" +
        '<button type="button" class="btn btn-sm" data-clear-entry-filters>Clear filters</button></div></td></tr>';
      return;
    }

    var balances = runningBalances();

    tableBody.innerHTML = rows.map(function (txn) {
      var account = findAccount(txn.accountId);
      var isDeposit = txn.type === "deposit";
      var running = Number(balances[txn.id] || 0);
      return '<tr class="pk-entry-row" data-entry="' + esc(txn.id) + '">' +
        '<td class="pk-date"><span>' + esc(Z.dateMedium(txn.date)) + "</span><small>" + esc(Z.relDate(txn.date)) + "</small></td>" +
        '<td><div class="pk-detail"><span class="pk-detail-dot" style="background:' + Z.categoryColor(txn.category) + '"></span>' +
          '<div class="pk-detail-copy"><span class="pk-detail-name">' + esc(txn.description || txn.category) + "</span>" +
          '<span class="pk-detail-type">' + (isDeposit ? "Deposit" : "Withdrawal") + " · " + esc(txn.category) + "</span></div></div></td>" +
        '<td><span class="pk-account-pill">' + esc(account ? account.name : "Unknown") + "</span></td>" +
        '<td class="num">' + (isDeposit ? '<span class="pk-amount-in">+' + Z.money(txn.amount) + "</span>" : '<span class="pk-faint">—</span>') + "</td>" +
        '<td class="num">' + (isDeposit ? '<span class="pk-faint">—</span>' : '<span class="pk-amount-out">−' + Z.money(txn.amount) + "</span>") + "</td>" +
        '<td class="num"><span class="pk-running' + (running < 0 ? " neg" : "") + '">' + Z.money(running) + "</span></td>" +
        '<td><div class="pk-row-actions">' +
          '<button type="button" class="icon-btn small" data-edit-entry="' + esc(txn.id) + '" aria-label="Edit entry" title="Edit">' + Z.icon("pencil") + "</button>" +
          '<button type="button" class="icon-btn small danger" data-delete-entry="' + esc(txn.id) + '" aria-label="Delete entry" title="Delete">' + Z.icon("trash") + "</button>" +
        "</div></td></tr>";
    }).join("");
  }

  function renderAll() {
    if (state.account !== "all" && !findAccount(state.account)) state.account = "all";
    renderHero();
    renderStats();
    renderAccounts();
    renderStatementHead();
    renderMonthFilter();
    renderSummary();
    syncSearch();
    syncTypeButtons();
    renderRows();
  }

  function clearFilters() {
    state.type = "all";
    state.search = "";
    state.month = "all";
    searchField.value = "";
    syncSearch();
    syncTypeButtons();
    renderAll();
  }

  /* Accounts -------------------------------------------------------------- */

  function openAccount(account) {
    accountForm.reset();
    accountId.value = account ? account.id : "";
    $("account-kicker").textContent = account ? "Edit the details" : "A place for money";
    $("account-title").textContent = account ? "Account details" : "Add an account";
    $("account-save").textContent = account ? "Save changes" : "Add account";
    accountName.value = account ? account.name : "";
    accountType.value = account ? (account.type || "Bank") : "Bank";
    accountNumber.value = account ? (account.number || "") : "";
    accountOpening.value = account ? account.opening : "";
    accountDelete.hidden = !account;
    accountDialog.showModal();
    setTimeout(function () { accountName.focus(); accountName.select(); }, 40);
  }

  function closeAccount() {
    if (accountDialog.open) accountDialog.close();
  }

  accountForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = accountName.value.trim();
    if (!name) {
      Z.toast("Give the account a name.", "error");
      accountName.focus();
      return;
    }
    var opening = Number(accountOpening.value);
    if (!isFinite(opening)) opening = 0;

    var editing = accountId.value;
    if (editing) {
      book.accounts = book.accounts.map(function (account) {
        if (account.id !== editing) return account;
        return {
          id: account.id,
          name: name,
          type: accountType.value,
          number: accountNumber.value.trim(),
          opening: opening
        };
      });
      Z.toast("Account updated.");
    } else {
      var account = {
        id: Z.uid("acc"),
        name: name,
        type: accountType.value,
        number: accountNumber.value.trim(),
        opening: opening
      };
      book.accounts.push(account);
      state.account = account.id;
      Z.toast("Account opened.");
    }
    Z.store.set("passbook", book);
    closeAccount();
    renderAll();
  });

  accountDelete.addEventListener("click", function () {
    var id = accountId.value;
    var account = findAccount(id);
    if (!account) return;
    var linked = book.transactions.filter(function (txn) { return txn.accountId === id; }).length;
    closeAccount();
    Z.confirm({
      kicker: "Close account",
      title: "Remove " + esc(account.name) + "?",
      message: "This removes the account and " + linked + " " + (linked === 1 ? "entry" : "entries") + " from the passbook. The rest of the book is untouched.",
      label: "Remove account"
    }).then(function (ok) {
      if (!ok) return;
      book.accounts = book.accounts.filter(function (item) { return item.id !== id; });
      book.transactions = book.transactions.filter(function (txn) { return txn.accountId !== id; });
      if (state.account === id) state.account = "all";
      Z.store.set("passbook", book);
      renderAll();
      Z.toast("Account removed.");
    });
  });

  /* Entries --------------------------------------------------------------- */

  function categoryOptions(type, selected) {
    var defaults = type === "deposit" ? INCOME_CATS : EXPENSE_CATS;
    var existing = book.transactions
      .filter(function (txn) { return txn.type === type; })
      .map(function (txn) { return txn.category; });
    var names = [];
    defaults.concat(existing).forEach(function (name) {
      if (name && names.indexOf(name) === -1) names.push(name);
    });
    if (selected && names.indexOf(selected) === -1) names.push(selected);
    if (!selected) selected = type === "deposit" ? "Salary" : "Groceries";
    entryCategory.innerHTML = names.map(function (name) {
      return '<option value="' + esc(name) + '">' + esc(name) + "</option>";
    }).join("");
    entryCategory.value = names.indexOf(selected) !== -1 ? selected : names[0];
  }

  function setEntryType(type, selectedCategory) {
    var safe = type === "withdraw" ? "withdraw" : "deposit";
    entryType.value = safe;
    document.querySelectorAll("#entry-types [data-entry-type]").forEach(function (button) {
      var active = button.dataset.entryType === safe;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    categoryOptions(safe, selectedCategory);
  }

  function accountOptions(selected) {
    entryAccount.innerHTML = book.accounts.map(function (account) {
      return '<option value="' + esc(account.id) + '">' + esc(account.name) + " · " + esc(account.type || "Account") + "</option>";
    }).join("");
    if (selected && findAccount(selected)) entryAccount.value = selected;
  }

  function openEntry(txn, presetType) {
    if (!book.accounts.length) {
      Z.toast("Add an account first.", "error");
      openAccount(null);
      return;
    }
    entryForm.reset();
    entryId.value = txn ? txn.id : "";
    $("entry-kicker").textContent = txn ? "Edit the line" : "A line in the book";
    $("entry-title").textContent = txn ? "An existing entry" : "Add an entry";
    $("entry-save").textContent = txn ? "Save changes" : "Save entry";

    var defaultAccount = state.account === "all" ? book.accounts[0].id : state.account;
    accountOptions(txn ? txn.accountId : defaultAccount);
    entryAmount.value = txn ? txn.amount : "";
    entryDate.value = txn ? txn.date : today;
    entryDescription.value = txn ? txn.description || "" : "";

    var type = txn ? txn.type : (presetType || "deposit");
    setEntryType(type, txn ? txn.category : null);
    entryDialog.showModal();
    setTimeout(function () { entryAmount.focus(); entryAmount.select(); }, 40);
  }

  function closeEntry() {
    if (entryDialog.open) entryDialog.close();
  }

  $("add-entry").addEventListener("click", function () { openEntry(null, "deposit"); });
  $("pb-deposit").addEventListener("click", function () { openEntry(null, "deposit"); });
  $("pb-withdraw").addEventListener("click", function () { openEntry(null, "withdraw"); });
  $("add-account").addEventListener("click", function () { openAccount(null); });

  document.querySelectorAll("[data-close-account]").forEach(function (button) {
    button.addEventListener("click", closeAccount);
  });
  document.querySelectorAll("[data-close-entry]").forEach(function (button) {
    button.addEventListener("click", closeEntry);
  });
  document.querySelectorAll("#entry-types [data-entry-type]").forEach(function (button) {
    button.addEventListener("click", function () { setEntryType(button.dataset.entryType); });
  });

  accountDialog.addEventListener("click", function (event) {
    if (event.target === accountDialog) closeAccount();
  });

  entryDialog.addEventListener("click", function (event) {
    if (event.target === entryDialog) closeEntry();
  });

  entryForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var amount = Number(entryAmount.value);
    var date = entryDate.value;
    var account = entryAccount.value;
    var description = entryDescription.value.trim();
    var category = entryCategory.value;

    if (!(amount > 0) || !entryAmount.value) {
      Z.toast("Enter an amount greater than zero.", "error");
      entryAmount.focus();
      return;
    }
    if (!date) {
      Z.toast("Add a date.", "error");
      entryDate.focus();
      return;
    }
    if (date > today) {
      Z.toast("Choose today or an earlier date.", "error");
      entryDate.focus();
      return;
    }
    if (!findAccount(account)) {
      Z.toast("Choose an account.", "error");
      entryAccount.focus();
      return;
    }
    if (!description) {
      Z.toast("Write a short description.", "error");
      entryDescription.focus();
      return;
    }
    if (!category) {
      Z.toast("Choose a category.", "error");
      entryCategory.focus();
      return;
    }

    var editing = entryId.value;
    var payload = {
      id: editing || Z.uid("pb"),
      accountId: account,
      type: entryType.value === "withdraw" ? "withdraw" : "deposit",
      amount: amount,
      category: category,
      description: description,
      date: date
    };

    if (editing) {
      book.transactions = book.transactions.map(function (txn) { return txn.id === editing ? payload : txn; });
      Z.toast("Entry updated.");
    } else {
      book.transactions.push(payload);
      Z.toast(payload.type === "deposit" ? "Deposit recorded." : "Withdrawal recorded.");
    }

    state.account = account;
    state.month = Z.monthKey(date);
    state.type = "all";
    state.search = "";
    searchField.value = "";
    Z.store.set("passbook", book);
    closeEntry();
    renderAll();
  });

  /* Table interactions ---------------------------------------------------- */

  tableBody.addEventListener("click", function (event) {
    if (event.target.closest("[data-empty-add-account]")) {
      openAccount(null);
      return;
    }
    if (event.target.closest("[data-empty-add-entry]")) {
      openEntry(null, "deposit");
      return;
    }
    if (event.target.closest("[data-clear-entry-filters]")) {
      clearFilters();
      return;
    }
    var edit = event.target.closest("[data-edit-entry]");
    if (edit) {
      var txn = book.transactions.filter(function (item) { return item.id === edit.dataset.editEntry; })[0];
      if (txn) openEntry(txn);
      return;
    }
    var del = event.target.closest("[data-delete-entry]");
    if (!del) return;
    var victim = book.transactions.filter(function (item) { return item.id === del.dataset.deleteEntry; })[0];
    if (!victim) return;
    Z.confirm({
      kicker: "Delete entry",
      title: "Remove this line?",
      message: "Delete <strong>" + esc(victim.description || victim.category) + "</strong> for " + Z.money(victim.amount) + " on " + esc(Z.dateMedium(victim.date)) + "?",
      label: "Delete entry"
    }).then(function (ok) {
      if (!ok) return;
      book.transactions = book.transactions.filter(function (item) { return item.id !== victim.id; });
      Z.store.set("passbook", book);
      renderAll();
      Z.toast("Entry deleted.");
    });
  });

  $("account-row").addEventListener("click", function (event) {
    if (event.target.closest("[data-add-account]")) {
      openAccount(null);
      return;
    }
    var card = event.target.closest("[data-account-id]");
    if (!card) return;
    state.account = card.dataset.accountId;
    renderAll();
  });

  $("pb-edit-account").addEventListener("click", function () {
    if (state.account === "all") return;
    var account = findAccount(state.account);
    if (account) openAccount(account);
  });

  monthField.addEventListener("change", function () {
    state.month = monthField.value || "all";
    renderSummary();
    renderRows();
  });

  searchField.addEventListener("input", function () {
    state.search = searchField.value;
    syncSearch();
    renderSearch();
  });

  searchField.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && searchField.value) {
      searchField.value = "";
      state.search = "";
      syncSearch();
      renderRows();
    }
  });

  searchClear.addEventListener("click", function () {
    searchField.value = "";
    state.search = "";
    syncSearch();
    renderRows();
    searchField.focus();
  });

  typeHost.addEventListener("click", function (event) {
    var button = event.target.closest("[data-entry-filter]");
    if (!button) return;
    state.type = button.dataset.entryFilter;
    syncTypeButtons();
    renderRows();
  });

  $("pb-export").addEventListener("click", function () {
    var rows = sortDesc(scopedTxns(true)).reverse();
    if (!rows.length) {
      Z.toast("Nothing to export in this view.", "error");
      return;
    }
    var balances = runningBalances();
    var data = [["Date", "Account", "Description", "Category", "Type", "Amount", "Currency", "Balance"]];
    rows.forEach(function (txn) {
      var account = findAccount(txn.accountId);
      data.push([
        txn.date,
        account ? account.name : "",
        txn.description || "",
        txn.category,
        txn.type,
        txn.amount.toFixed(2),
        Z.settings().currency,
        Number(balances[txn.id] || 0).toFixed(2)
      ]);
    });
    var suffix = state.month === "all" ? "all-time" : state.month;
    Z.download("zone-passbook-" + suffix + ".csv", Z.csv(data), "text/csv;charset=utf-8");
    Z.toast("Exported " + rows.length + " entries.");
  });

  var renderSearch = Z.debounce(renderRows, 120);

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var target = event.target;
    var typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    if (event.key === "/" && !typing && !accountDialog.open && !entryDialog.open) {
      event.preventDefault();
      searchField.focus();
      return;
    }
    if ((event.key === "n" || event.key === "N") && !typing && !accountDialog.open && !entryDialog.open) {
      event.preventDefault();
      openEntry(null, "deposit");
    }
  });

  renderAll();
})();
