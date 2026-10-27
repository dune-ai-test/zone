/* Zone — money tracker */

(function () {
  "use strict";

  var esc = Z.esc;
  var EXPENSE_CATS = ["Rent", "Groceries", "Food", "Transport", "Utilities", "Shopping", "Health", "Entertainment", "Travel", "Education", "Gifts", "Other"];
  var INCOME_CATS = ["Salary", "Freelance", "Investments", "Refund", "Other"];
  var today = Z.todayISO();
  var currentMonth = Z.monthKey(today);

  var money = Z.store.get("money", { budget: 65000, transactions: [] });
  if (!money || typeof money !== "object") money = { budget: 0, transactions: [] };
  if (!Array.isArray(money.transactions)) money.transactions = [];
  money.transactions = money.transactions.filter(function (txn) {
    return txn && typeof txn === "object" && /^\d{4}-\d{2}-\d{2}$/.test(String(txn.date || ""));
  });
  money.budget = Number(money.budget) || 0;

  var selectedMonth = currentMonth;
  var categoryFilter = "all";
  var typeFilter = "all";
  var $ = function (id) { return document.getElementById(id); };
  var dialog = $("txn-dialog");
  var form = $("txn-form");
  var idField = $("txn-id");
  var typeField = $("txn-type");
  var amountField = $("txn-amount");
  var dateField = $("txn-date");
  var categorySelect = $("txn-category");
  var noteField = $("txn-note");
  var dialogTitle = $("txn-title");
  var dialogKicker = $("txn-kicker");
  var saveTxn = $("txn-save");
  var budgetDialog = $("budget-dialog");
  var budgetForm = $("budget-form");
  var budgetField = $("budget-amount");
  var monthField = $("money-month");
  var searchField = $("money-search");
  var searchClear = $("money-search-clear");
  var searchBox = searchField.closest(".my-search");
  var categoryField = $("money-category");
  var typeFilterHost = $("money-type-filter");
  var tableBody = $("money-body");
  var chartHost = $("money-chart");
  var donutHost = $("money-donut");
  var prevMonthButton = $("money-prev-month");
  var nextMonthButton = $("money-next-month");
  var thisMonthButton = $("money-this-month");

  dateField.max = today;
  monthField.max = currentMonth;

  var symbol = Z.money(0).replace(/[\d.,\s]/g, "");
  $("txn-currency").textContent = symbol;
  $("budget-currency").textContent = symbol;

  function txnsForMonth(key) {
    return money.transactions.filter(function (txn) { return Z.monthKey(txn.date) === key; });
  }

  function sumTxns(list, type) {
    return list.filter(function (txn) { return txn.type === type; })
      .reduce(function (sum, txn) { return sum + Number(txn.amount || 0); }, 0);
  }

  function daysInMonth(key) {
    var date = Z.parseISO(key + "-01");
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function monthsBack(key, offset) {
    var date = Z.parseISO(key + "-01");
    date.setMonth(date.getMonth() + offset);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function axisAmount(value) {
    if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (value >= 1000) return Math.round(value / 1000) + "k";
    return String(Math.round(value));
  }

  function monthShort(key) {
    return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(Z.parseISO(key + "-01"));
  }

  function monthStats(key) {
    var list = txnsForMonth(key);
    var spent = sumTxns(list, "expense");
    var income = sumTxns(list, "income");
    return {
      list: list,
      spent: spent,
      income: income,
      net: income - spent,
      expenses: list.filter(function (txn) { return txn.type === "expense"; }).length,
      incomes: list.filter(function (txn) { return txn.type === "income"; }).length
    };
  }

  function elapsedDays(key) {
    return key === currentMonth ? new Date().getDate() : daysInMonth(key);
  }

  function budgetPct(spent) {
    return money.budget > 0 ? Math.round((spent / money.budget) * 100) : 0;
  }

  function syncSearch() {
    var hasValue = Boolean(searchField.value.trim());
    searchClear.hidden = !hasValue;
    searchBox.classList.toggle("has-value", hasValue);
  }

  function renderHero() {
    var stats = monthStats(selectedMonth);
    var isCurrent = selectedMonth === currentMonth;
    var pct = budgetPct(stats.spent);
    var remaining = money.budget - stats.spent;
    var net = $("money-hero-net");
    var status;
    var fill = $("money-hero-budget-fill");

    monthField.value = selectedMonth;
    monthField.max = currentMonth;
    nextMonthButton.disabled = selectedMonth >= currentMonth;
    thisMonthButton.hidden = isCurrent;

    net.textContent = Z.money(stats.net);
    net.classList.toggle("is-neg", stats.net < 0);
    net.classList.toggle("is-pos", stats.net > 0);

    if (!stats.list.length) {
      status = isCurrent ? "The month is still open." : "No entries were recorded.";
    } else if (stats.net < 0) {
      status = "Spent " + Z.money(Math.abs(stats.net)) + (stats.income > 0 ? " more than came in." : " with no income recorded.");
    } else if (stats.net === 0) {
      status = "Income and spending are level.";
    } else {
      var saved = stats.income > 0 ? Math.round((stats.net / stats.income) * 100) : 0;
      status = (saved ? saved + "% of income kept" : "Kept") + (isCurrent ? " · " + Math.max(0, daysInMonth(selectedMonth) - new Date().getDate()) + " days left" : ".");
    }
    $("money-hero-status").textContent = status;
    $("money-hero-income").textContent = Z.money(stats.income);
    $("money-hero-spent").textContent = Z.money(stats.spent);
    $("money-hero-budget-meta").textContent = money.budget > 0 ? pct + "% used" : "No envelope";
    fill.style.width = Math.min(100, pct) + "%";
    fill.classList.toggle("is-over", pct > 100);
    $("money-hero-meta").innerHTML =
      '<span class="my-meta-item"><span class="my-local-dot" aria-hidden="true"></span>Local ledger</span>' +
      '<span class="my-meta-item">' + stats.list.length + (stats.list.length === 1 ? " entry" : " entries") + " in " + esc(Z.monthLabel(selectedMonth, true)) + "</span>" +
      '<span class="my-meta-item">' + Z.settings().currency + " · " + (money.budget > 0 ? "budget set" : "no budget") + "</span>";
  }

  function renderStats() {
    var stats = monthStats(selectedMonth);
    var isCurrent = selectedMonth === currentMonth;
    var pct = budgetPct(stats.spent);
    var remaining = money.budget - stats.spent;
    var days = Math.max(1, elapsedDays(selectedMonth));
    var avg = stats.spent / days;
    var monthName = Z.monthLabel(selectedMonth);
    var budgetHint = money.budget > 0
      ? (remaining < 0 ? Z.money(Math.abs(remaining)) + " over" : Z.money(remaining) + " left")
      : "Set a monthly envelope";

    $("money-stats").innerHTML =
      '<article class="my-stat">' +
        '<div class="my-stat-head"><span class="my-stat-label">Spent · ' + esc(monthName) + '</span><span class="my-stat-index">01</span></div>' +
        '<p class="my-stat-value">' + Z.money(stats.spent) + "</p>" +
        '<p class="my-stat-foot">' + stats.expenses + " entries · " + Z.money(avg) + " a day</p>" +
      "</article>" +
      '<article class="my-stat">' +
        '<div class="my-stat-head"><span class="my-stat-label">Income · ' + esc(monthName) + '</span><span class="my-stat-index">02</span></div>' +
        '<p class="my-stat-value">' + Z.money(stats.income) + "</p>" +
        '<p class="my-stat-foot">' + stats.incomes + (stats.incomes === 1 ? " deposit" : " deposits") + " received</p>" +
      "</article>" +
      '<article class="my-stat">' +
        '<div class="my-stat-head"><span class="my-stat-label">Kept this month</span><span class="my-stat-index">03</span></div>' +
        '<p class="my-stat-value' + (stats.net < 0 ? " is-neg" : stats.net > 0 ? " is-pos" : "") + '">' + Z.money(stats.net) + "</p>" +
        '<p class="my-stat-foot">' + (stats.income > 0 ? Math.round((stats.net / stats.income) * 100) + "% of income" : "No income recorded") + "</p>" +
      "</article>" +
      '<article class="my-stat is-budget">' +
        '<div class="my-stat-head"><span class="my-stat-label">Budget remaining</span>' +
          (money.budget > 0 ? '<button type="button" class="my-stat-edit" data-edit-budget>Edit</button>' : '<span class="my-stat-index">04</span>') +
        "</div>" +
        '<p class="my-stat-value' + (remaining < 0 ? " is-neg" : "") + '">' + (money.budget > 0 ? Z.money(remaining) : "—") + "</p>" +
        '<p class="my-stat-foot">' + (money.budget > 0 ? pct + "% used · " + budgetHint : "Set a monthly envelope") + "</p>" +
        '<span class="my-stat-meter" aria-hidden="true"><i class="' + (pct > 100 ? "is-over" : "") + '" style="width:' + Math.min(100, pct) + '%"></i></span>' +
      "</article>";
  }

  function renderBudget() {
    var stats = monthStats(selectedMonth);
    var pct = budgetPct(stats.spent);
    var remaining = money.budget - stats.spent;
    var fill = $("money-budget-fill");
    var pace = $("money-budget-pace");
    var isCurrent = selectedMonth === currentMonth;
    var days = daysInMonth(selectedMonth);
    var elapsed = elapsedDays(selectedMonth);
    var daysLeft = isCurrent ? Math.max(0, days - new Date().getDate()) : 0;

    $("money-budget-total").textContent = money.budget > 0 ? Z.money(money.budget) : "Not set";
    fill.style.width = Math.min(100, pct) + "%";
    fill.classList.toggle("is-over", pct > 100);
    $("money-budget-pct").textContent = money.budget > 0 ? pct + "% used" : "No budget";
    $("money-budget-left").textContent = money.budget > 0
      ? (remaining < 0 ? Z.money(Math.abs(remaining)) + " over" : Z.money(remaining) + " left")
      : "Add an envelope";

    pace.classList.remove("is-over", "is-ahead");
    if (!money.budget) {
      pace.textContent = "Set a monthly envelope to read the pace of spending.";
    } else if (!stats.spent) {
      pace.textContent = "Nothing spent yet. " + Z.money(money.budget) + " is still available.";
    } else if (remaining < 0) {
      pace.textContent = "The envelope is over by " + Z.money(Math.abs(remaining)) + ". The rest of the month is outside the plan.";
      pace.classList.add("is-over");
    } else {
      var expected = money.budget * (elapsed / days);
      var diff = stats.spent - expected;
      if (diff > 0) {
        pace.textContent = "Running " + Z.money(diff) + " ahead of a steady pace.";
        pace.classList.add("is-over");
      } else {
        var daily = daysLeft > 0 ? remaining / daysLeft : 0;
        pace.textContent = "Running " + Z.money(-diff) + " under pace." + (daysLeft > 0 ? " About " + Z.money(daily) + " a day remains." : "");
        pace.classList.add("is-ahead");
      }
    }
  }

  function renderChart() {
    var months = [];
    for (var i = -5; i <= 0; i += 1) months.push(monthsBack(selectedMonth, i));
    var rows = months.map(function (key) {
      var stats = monthStats(key);
      return { key: key, income: stats.income, spent: stats.spent };
    });
    var peak = Math.max.apply(null, rows.map(function (row) {
      return Math.max(row.income, row.spent);
    }).concat([1000]));
    var magnitude = Math.pow(10, Math.floor(Math.log(peak) / Math.LN10));
    var normalized = peak / magnitude;
    var step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    var niceMax = step * magnitude;

    var W = 700;
    var H = 242;
    var left = 44;
    var right = 10;
    var top = 16;
    var bottom = 30;
    var plotW = W - left - right;
    var plotH = H - top - bottom;
    var groupW = plotW / rows.length;
    var barW = Math.min(20, groupW * 0.21);

    var grid = "";
    for (var g = 0; g < 4; g += 1) {
      var y = top + (plotH * g) / 3;
      var val = niceMax - (niceMax * g) / 3;
      grid += '<line class="my-chart-grid" x1="' + left + '" y1="' + y.toFixed(1) + '" x2="' + (W - right) + '" y2="' + y.toFixed(1) + '"></line>';
      grid += '<text class="my-chart-axis" x="' + (left - 7) + '" y="' + (y + 2.5).toFixed(1) + '" text-anchor="end">' + axisAmount(val) + "</text>";
    }

    var columns = rows.map(function (row, index) {
      var center = left + groupW * (index + 0.5);
      var incomeH = (row.income / niceMax) * plotH;
      var spentH = (row.spent / niceMax) * plotH;
      var incomeY = top + plotH - incomeH;
      var spentY = top + plotH - spentH;
      var selected = row.key === selectedMonth;
      var aria = Z.monthLabel(row.key, true) + ": income " + Z.money(row.income) + ", expenses " + Z.money(row.spent) + ". Open this month.";
      return '<g class="my-flow-month' + (selected ? " is-selected" : "") + '" data-flow-month="' + esc(row.key) + '" tabindex="0" role="button" aria-label="' + esc(aria) + '">' +
        '<title>' + esc(aria) + "</title>" +
        '<rect class="my-flow-band" x="' + (left + groupW * index + 1).toFixed(1) + '" y="' + top + '" width="' + (groupW - 2).toFixed(1) + '" height="' + plotH + '" rx="3"></rect>' +
        (row.income > 0 ? '<rect class="my-bar-income" x="' + (center - barW - 2).toFixed(1) + '" y="' + incomeY.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + incomeH.toFixed(1) + '" rx="1.5"></rect>' : "") +
        (row.spent > 0 ? '<rect class="my-bar-expense" x="' + (center + 2).toFixed(1) + '" y="' + spentY.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + spentH.toFixed(1) + '" rx="1.5"></rect>' : "") +
        '<text class="my-chart-month-label" x="' + center.toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle">' + monthShort(row.key) + "</text>" +
        '<rect class="my-flow-hit" x="' + (left + groupW * index).toFixed(1) + '" y="' + top + '" width="' + groupW.toFixed(1) + '" height="' + plotH + '"></rect>' +
      "</g>";
    }).join("");

    chartHost.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="Income and expenses over the last six months. Use Tab and Enter to open a month.">' +
      grid + columns + "</svg>";
  }

  function renderDonut() {
    var list = txnsForMonth(selectedMonth);
    var expenses = list.filter(function (txn) { return txn.type === "expense"; });
    var total = sumTxns(list, "expense");
    $("donut-month").textContent = Z.monthLabel(selectedMonth, true);

    if (!expenses.length) {
      donutHost.innerHTML = '<div class="my-donut"><div class="my-donut-center"><strong>' + Z.money(0) + "</strong><span>Spent</span></div></div>" +
        '<div class="my-donut-legend"><p class="my-donut-empty">Nothing recorded this month. The page is clean.</p></div>';
      return;
    }

    var totals = {};
    expenses.forEach(function (txn) {
      totals[txn.category] = (totals[txn.category] || 0) + Number(txn.amount);
    });
    var items = Object.keys(totals).map(function (name) {
      return { name: name, amount: totals[name], color: Z.categoryColor(name) };
    }).sort(function (a, b) { return b.amount - a.amount; });

    if (items.length > 5) {
      var rest = items.slice(5).reduce(function (sum, item) { return sum + item.amount; }, 0);
      items = items.slice(0, 5);
      items.push({ name: "Everything else", amount: rest, color: "#a49c8c", other: true });
    }

    var acc = 0;
    var stops = items.map(function (item) {
      var start = acc;
      acc += (item.amount / total) * 100;
      return item.color + " " + start.toFixed(2) + "% " + acc.toFixed(2) + "%";
    }).join(", ");

    var legend = items.map(function (item) {
      var pct = Math.round((item.amount / total) * 100);
      var content = '<span class="my-donut-dot" style="background:' + item.color + '"></span>' +
        '<span class="my-donut-name">' + esc(item.name) + "<small>" + pct + "%</small></span>" +
        '<span class="my-donut-val">' + Z.money(item.amount) + "</span>";
      if (item.other) return '<span class="my-donut-key">' + content + "</span>";
      return '<button type="button" class="my-donut-key" data-donut-cat="' + esc(item.name) + '" aria-label="Filter ledger by ' + esc(item.name) + '">' + content + "</button>";
    }).join("");

    donutHost.innerHTML = '<div class="my-donut" style="background:conic-gradient(' + stops + ')" title="Spending by category">' +
        '<div class="my-donut-center"><strong>' + Z.money(total) + "</strong><span>Spent</span></div>" +
      "</div>" +
      '<div class="my-donut-legend">' + legend + "</div>";
  }

  function renderTypeFilter() {
    var list = txnsForMonth(selectedMonth);
    var counts = {
      all: list.length,
      expense: list.filter(function (txn) { return txn.type === "expense"; }).length,
      income: list.filter(function (txn) { return txn.type === "income"; }).length
    };
    var items = [
      { value: "all", label: "All" },
      { value: "expense", label: "Expenses" },
      { value: "income", label: "Income" }
    ];
    typeFilterHost.innerHTML = items.map(function (item) {
      var active = typeFilter === item.value;
      return '<button type="button" class="my-filter' + (active ? " is-active" : "") + '" data-type-filter="' + item.value + '" aria-pressed="' + active + '" aria-label="' + item.label + ", " + counts[item.value] + ' entries">' + item.label + "</button>";
    }).join("");
  }

  function renderCategoryFilter() {
    var previous = categoryFilter;
    var categories = {};
    money.transactions.forEach(function (txn) { categories[txn.category] = true; });
    EXPENSE_CATS.concat(INCOME_CATS).forEach(function (cat) { categories[cat] = true; });
    var names = Object.keys(categories).filter(Boolean).sort();
    categoryField.innerHTML = '<option value="all">All categories</option>' + names.map(function (name) {
      return '<option value="' + esc(name) + '">' + esc(name) + "</option>";
    }).join("");
    categoryFilter = previous !== "all" && names.indexOf(previous) === -1 ? "all" : previous;
    categoryField.value = categoryFilter;
  }

  function filteredTxns() {
    var query = searchField.value.trim().toLowerCase();
    return txnsForMonth(selectedMonth).filter(function (txn) {
      if (categoryFilter !== "all" && txn.category !== categoryFilter) return false;
      if (typeFilter !== "all" && txn.type !== typeFilter) return false;
      if (!query) return true;
      return (String(txn.note || "") + " " + txn.category + " " + txn.type).toLowerCase().indexOf(query) !== -1;
    }).sort(function (a, b) {
      if (a.date === b.date) return String(b.id).localeCompare(String(a.id));
      return b.date.localeCompare(a.date);
    });
  }

  function renderLedger() {
    var all = txnsForMonth(selectedMonth);
    var rows = filteredTxns();
    $("money-ledger-month").textContent = Z.monthLabel(selectedMonth, true);
    $("money-count").textContent = rows.length + " of " + all.length + " entries";

    if (!all.length) {
      tableBody.innerHTML = '<tr><td colspan="4"><div class="my-empty"><div class="my-empty-mark">' + Z.icon("wallet") + "</div>" +
        "<h3>A clean month.</h3><p>No income or expenses recorded for " + esc(Z.monthLabel(selectedMonth, true)) + ".</p>" +
        '<button type="button" class="btn" data-empty-add>Add a transaction</button></div></td></tr>';
      return;
    }

    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="4"><div class="my-empty"><h3>No entries match.</h3>' +
        "<p>Try another category, type, or search term.</p>" +
        '<button type="button" class="btn btn-sm" data-clear-filters>Clear filters</button></div></td></tr>';
      return;
    }

    var groups = {};
    rows.forEach(function (txn) {
      if (!groups[txn.date]) groups[txn.date] = [];
      groups[txn.date].push(txn);
    });
    var dates = Object.keys(groups).sort(function (a, b) { return b.localeCompare(a); });

    tableBody.innerHTML = dates.map(function (date) {
      var label = Z.relDate(date);
      var full = Z.dateMedium(date);
      var header = label === full ? full : label + " · " + Z.dateShort(date);
      var dayRows = groups[date].map(function (txn) {
        var isIncome = txn.type === "income";
        var note = txn.note || txn.category;
        return '<tr class="my-txn-row" data-id="' + esc(txn.id) + '">' +
          '<td><div class="my-entry"><span class="my-cat-dot" style="background:' + Z.categoryColor(txn.category) + '"></span>' +
            '<span class="my-entry-copy"><span class="my-entry-name">' + esc(note) + '</span><span class="my-entry-type">' + (isIncome ? "Income" : "Expense") + "</span></span></div></td>" +
          '<td><span class="my-cat">' + esc(txn.category) + "</span></td>" +
          '<td class="num"><span class="my-amount ' + (isIncome ? "is-income" : "is-expense") + '">' + (isIncome ? "+" : "−") + Z.money(txn.amount) + "</span></td>" +
          '<td><div class="my-row-actions">' +
            '<button type="button" class="icon-btn small" data-edit="' + esc(txn.id) + '" aria-label="Edit ' + esc(note) + '" title="Edit">' + Z.icon("pencil") + "</button>" +
            '<button type="button" class="icon-btn small danger" data-delete="' + esc(txn.id) + '" aria-label="Delete ' + esc(note) + '" title="Delete">' + Z.icon("trash") + "</button>" +
          "</div></td></tr>";
      }).join("");
      return '<tr class="my-date-row"><td colspan="4">' + esc(header) + "</td></tr>" + dayRows;
    }).join("");
  }

  function renderSummary() {
    var monthTxns = txnsForMonth(selectedMonth);
    var expenses = monthTxns.filter(function (txn) { return txn.type === "expense"; });
    var spent = sumTxns(monthTxns, "expense");
    var income = sumTxns(monthTxns, "income");
    var net = income - spent;
    var isCurrent = selectedMonth === currentMonth;
    var days = elapsedDays(selectedMonth);
    var avg = spent / Math.max(1, days);

    var byCategory = {};
    expenses.forEach(function (txn) {
      byCategory[txn.category] = (byCategory[txn.category] || 0) + Number(txn.amount);
    });
    var top = Object.keys(byCategory).map(function (name) {
      return { name: name, amount: byCategory[name] };
    }).sort(function (a, b) { return b.amount - a.amount; })[0];
    var largest = expenses.slice().sort(function (a, b) { return b.amount - a.amount; })[0];

    var paceValue = "No budget set";
    var paceClass = "";
    if (money.budget > 0) {
      var expected = money.budget * (days / daysInMonth(selectedMonth));
      var diff = spent - expected;
      if (diff > 0) {
        paceValue = "Over by " + Z.money(diff);
        paceClass = "neg";
      } else {
        paceValue = "Ahead by " + Z.money(-diff);
        paceClass = "pos";
      }
    }

    var rows = [
      ["Transactions", String(monthTxns.length), ""],
      ["Income", Z.money(income), ""],
      ["Expenses", Z.money(spent), ""],
      ["Kept", Z.money(net), net < 0 ? "neg" : net > 0 ? "pos" : ""],
      ["Daily average", Z.money(avg), ""],
      ["Largest expense", largest ? esc(largest.note || largest.category) + " · " + Z.money(largest.amount) : "—", ""],
      ["Top category", top ? esc(top.name) + " · " + Z.money(top.amount) : "—", ""],
      ["Budget pace", paceValue, paceClass]
    ];

    $("money-summary").innerHTML = rows.map(function (row) {
      return '<div class="my-summary-row"><span>' + row[0] + "</span>" +
        '<strong class="' + row[2] + '">' + row[1] + "</strong></div>";
    }).join("") +
      '<p class="my-summary-note">' + (isCurrent
        ? Math.max(0, daysInMonth(selectedMonth) - new Date().getDate()) + " days left in " + esc(Z.monthLabel(selectedMonth, true)) + "."
        : "A closed month. The numbers will not change unless you edit them.") + "</p>";
  }

  function renderAll() {
    renderCategoryFilter();
    renderTypeFilter();
    renderHero();
    renderStats();
    renderBudget();
    renderChart();
    renderDonut();
    renderSummary();
    renderLedger();
    syncSearch();
  }

  function selectMonth(key) {
    var safe = String(key || "");
    if (!/^\d{4}-\d{2}$/.test(safe)) safe = currentMonth;
    if (safe > currentMonth) safe = currentMonth;
    selectedMonth = safe;
    categoryFilter = "all";
    typeFilter = "all";
    renderAll();
  }

  function shiftMonth(delta) {
    var next = monthsBack(selectedMonth, delta);
    if (next > currentMonth) next = currentMonth;
    if (next === selectedMonth) return;
    selectMonth(next);
  }

  function categoryOptionsFor(type, selected) {
    var existing = money.transactions.filter(function (txn) { return txn.type === type; }).map(function (txn) { return txn.category; });
    var defaults = type === "income" ? INCOME_CATS : EXPENSE_CATS;
    var names = [];
    defaults.concat(existing).forEach(function (name) {
      if (name && names.indexOf(name) === -1) names.push(name);
    });
    if (selected && names.indexOf(selected) === -1) names.push(selected);
    categorySelect.innerHTML = names.map(function (name) {
      return '<option value="' + esc(name) + '">' + esc(name) + "</option>";
    }).join("");
    categorySelect.value = selected && names.indexOf(selected) !== -1 ? selected : names[0];
  }

  function setType(type, selectedCategory) {
    var safe = type === "income" ? "income" : "expense";
    typeField.value = safe;
    document.querySelectorAll("#txn-types [data-type]").forEach(function (button) {
      var active = button.dataset.type === safe;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    categoryOptionsFor(safe, selectedCategory);
  }

  function openTransaction(txn) {
    form.reset();
    idField.value = txn ? txn.id : "";
    dialogKicker.textContent = txn ? "Edit the entry" : "Add to the ledger";
    dialogTitle.textContent = txn ? "An existing transaction" : "A transaction";
    saveTxn.textContent = txn ? "Save changes" : "Save transaction";
    amountField.value = txn ? txn.amount : "";
    dateField.value = txn ? txn.date : (selectedMonth === currentMonth ? today : selectedMonth + "-01");
    noteField.value = txn ? txn.note || "" : "";
    setType(txn ? txn.type : "expense", txn ? txn.category : "Groceries");
    dialog.showModal();
    setTimeout(function () { amountField.focus(); amountField.select(); }, 40);
  }

  function closeTransaction() {
    if (dialog.open) dialog.close();
  }

  function openBudget() {
    budgetField.value = money.budget || "";
    budgetDialog.showModal();
    setTimeout(function () { budgetField.focus(); budgetField.select(); }, 40);
  }

  function closeBudget() {
    if (budgetDialog.open) budgetDialog.close();
  }

  function clearFilters() {
    searchField.value = "";
    categoryFilter = "all";
    typeFilter = "all";
    categoryField.value = "all";
    syncSearch();
    renderTypeFilter();
    renderLedger();
  }

  function exportMoney() {
    var rows = filteredTxns();
    if (!rows.length) {
      Z.toast("Nothing to export in this view.", "error");
      return;
    }
    var data = [["Date", "Type", "Category", "Amount", "Currency", "Note"]];
    rows.slice().reverse().forEach(function (txn) {
      data.push([txn.date, txn.type, txn.category, Number(txn.amount).toFixed(2), Z.settings().currency, txn.note || ""]);
    });
    Z.download("zone-money-" + selectedMonth + ".csv", Z.csv(data), "text/csv;charset=utf-8");
    Z.toast("Exported " + rows.length + " entries.");
  }

  var renderSearch = Z.debounce(renderLedger, 120);

  $("add-txn").addEventListener("click", function () { openTransaction(null); });
  $("money-prev-month").addEventListener("click", function () { shiftMonth(-1); });
  $("money-next-month").addEventListener("click", function () { shiftMonth(1); });
  $("money-this-month").addEventListener("click", function () { selectMonth(currentMonth); });

  monthField.addEventListener("change", function () {
    if (!monthField.value) {
      monthField.value = selectedMonth;
      return;
    }
    selectMonth(monthField.value);
  });

  document.querySelectorAll("[data-edit-budget]").forEach(function (button) {
    button.addEventListener("click", openBudget);
  });

  $("money-stats").addEventListener("click", function (event) {
    if (event.target.closest("[data-edit-budget]")) openBudget();
  });

  $("money-budget-edit").addEventListener("click", openBudget);

  chartHost.addEventListener("click", function (event) {
    var column = event.target.closest("[data-flow-month]");
    if (column) selectMonth(column.dataset.flowMonth);
  });

  chartHost.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var column = event.target.closest("[data-flow-month]");
    if (!column) return;
    event.preventDefault();
    selectMonth(column.dataset.flowMonth);
  });

  typeFilterHost.addEventListener("click", function (event) {
    var button = event.target.closest("[data-type-filter]");
    if (!button) return;
    typeFilter = button.dataset.typeFilter;
    renderTypeFilter();
    renderLedger();
  });

  donutHost.addEventListener("click", function (event) {
    var key = event.target.closest("[data-donut-cat]");
    if (!key) return;
    categoryFilter = key.dataset.donutCat;
    categoryField.value = categoryFilter;
    typeFilter = "all";
    renderTypeFilter();
    renderLedger();
    if (window.innerWidth < 1180) {
      document.querySelector(".my-ledger").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  searchField.addEventListener("input", function () {
    syncSearch();
    renderSearch();
  });

  searchField.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && searchField.value) {
      searchField.value = "";
      syncSearch();
      renderLedger();
    }
  });

  searchClear.addEventListener("click", function () {
    searchField.value = "";
    syncSearch();
    renderLedger();
    searchField.focus();
  });

  categoryField.addEventListener("change", function () {
    categoryFilter = categoryField.value;
    renderLedger();
  });

  $("export-money").addEventListener("click", exportMoney);

  tableBody.addEventListener("click", function (event) {
    if (event.target.closest("[data-empty-add]")) {
      openTransaction(null);
      return;
    }
    if (event.target.closest("[data-clear-filters]")) {
      clearFilters();
      return;
    }
    var edit = event.target.closest("[data-edit]");
    if (edit) {
      var txn = money.transactions.filter(function (item) { return item.id === edit.dataset.edit; })[0];
      if (txn) openTransaction(txn);
      return;
    }
    var del = event.target.closest("[data-delete]");
    if (!del) return;
    var victim = money.transactions.filter(function (item) { return item.id === del.dataset.delete; })[0];
    if (!victim) return;
    Z.confirm({
      kicker: "Delete transaction",
      title: "Remove this entry?",
      message: "Delete <strong>" + esc(victim.note || victim.category) + "</strong> for " + Z.money(victim.amount) + " on " + esc(Z.dateMedium(victim.date)) + "?",
      label: "Delete entry"
    }).then(function (ok) {
      if (!ok) return;
      money.transactions = money.transactions.filter(function (item) { return item.id !== victim.id; });
      Z.store.set("money", money);
      renderAll();
      Z.toast("Transaction deleted.");
    });
  });

  document.querySelectorAll("[data-close-txn]").forEach(function (button) {
    button.addEventListener("click", closeTransaction);
  });

  document.querySelectorAll("[data-close-budget]").forEach(function (button) {
    button.addEventListener("click", closeBudget);
  });

  document.querySelectorAll("#txn-types [data-type]").forEach(function (button) {
    button.addEventListener("click", function () { setType(button.dataset.type); });
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeTransaction();
  });

  budgetDialog.addEventListener("click", function (event) {
    if (event.target === budgetDialog) closeBudget();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var amount = Number(amountField.value);
    var date = dateField.value;
    var category = categorySelect.value;
    if (!(amount > 0) || !amountField.value) {
      Z.toast("Enter an amount greater than zero.", "error");
      amountField.focus();
      return;
    }
    if (!date) {
      Z.toast("Add a date.", "error");
      dateField.focus();
      return;
    }
    if (date > today) {
      Z.toast("Choose today or an earlier date.", "error");
      dateField.focus();
      return;
    }
    if (!category) {
      Z.toast("Choose a category.", "error");
      categorySelect.focus();
      return;
    }

    var editingId = idField.value;
    var payload = {
      id: editingId || Z.uid("txn"),
      type: typeField.value === "income" ? "income" : "expense",
      amount: amount,
      category: category,
      date: date,
      note: noteField.value.trim()
    };

    if (editingId) {
      money.transactions = money.transactions.map(function (txn) { return txn.id === editingId ? payload : txn; });
      Z.toast("Transaction updated.");
    } else {
      money.transactions.push(payload);
      Z.toast("Transaction recorded.");
    }

    Z.store.set("money", money);
    selectedMonth = Z.monthKey(date);
    categoryFilter = "all";
    typeFilter = "all";
    searchField.value = "";
    syncSearch();
    closeTransaction();
    renderAll();
  });

  form.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  budgetForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var amount = Number(budgetField.value);
    if (!isFinite(amount) || amount < 0) {
      Z.toast("Enter a valid budget.", "error");
      budgetField.focus();
      return;
    }
    money.budget = amount;
    Z.store.set("money", money);
    closeBudget();
    renderAll();
    Z.toast(amount > 0 ? "Monthly budget set." : "Budget cleared.");
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
    if ((event.key === "n" || event.key === "N") && !typing && !dialog.open && !budgetDialog.open) {
      event.preventDefault();
      openTransaction(null);
    }
  });

  renderAll();
})();
