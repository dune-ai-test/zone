/* Zone — home */

(function () {
  "use strict";

  var esc = Z.esc;

  function arr(key) {
    var value = Z.store.get(key, []);
    return Array.isArray(value) ? value : [];
  }

  function diaryStreak(entries) {
    var days = new Set(entries.map(function (e) { return e.date; }));
    var cursor = Z.todayISO();
    if (!days.has(cursor)) cursor = Z.addDays(cursor, -1);
    var count = 0;
    while (days.has(cursor)) {
      count += 1;
      cursor = Z.addDays(cursor, -1);
    }
    return count;
  }

  function habitDoneToday(habits) {
    var today = Z.todayISO();
    return habits.filter(function (h) { return h.checks && h.checks[today]; }).length;
  }

  function listCounts(lists) {
    var open = 0;
    var done = 0;
    lists.forEach(function (list) {
      (list.items || []).forEach(function (item) {
        if (item.done) done += 1; else open += 1;
        (item.children || []).forEach(function (child) {
          if (child.done) done += 1; else open += 1;
        });
      });
    });
    return { open: open, done: done };
  }

  function accountBalance(book, account) {
    var balance = Number(account.opening) || 0;
    (book.transactions || []).forEach(function (txn) {
      if (txn.accountId !== account.id) return;
      balance += txn.type === "deposit" ? Number(txn.amount) : -Number(txn.amount);
    });
    return balance;
  }

  function passbookTotal(book) {
    return (book.accounts || []).reduce(function (sum, account) {
      return sum + accountBalance(book, account);
    }, 0);
  }

  function groupBalances(group) {
    var net = {};
    (group.members || []).forEach(function (m) { net[m.id] = 0; });
    (group.expenses || []).forEach(function (expense) {
      var shared = expense.sharedWith || [];
      if (!shared.length) return;
      var share = Number(expense.amount) / shared.length;
      if (net[expense.paidBy] != null) net[expense.paidBy] += Number(expense.amount);
      shared.forEach(function (id) {
        if (net[id] != null) net[id] -= share;
      });
    });
    return net;
  }

  function settleTotal(groups) {
    var total = 0;
    groups.forEach(function (group) {
      var net = groupBalances(group);
      Object.keys(net).forEach(function (id) {
        if (net[id] > 0.5) total += net[id];
      });
    });
    return total;
  }

  function groupTotal(group) {
    return (group.expenses || []).reduce(function (sum, expense) {
      return sum + (Number(expense.amount) || 0);
    }, 0);
  }

  function subMonthly(subs) {
    return subs.filter(function (s) { return s.status !== "Paused"; }).reduce(function (sum, s) {
      var amount = Number(s.amount) || 0;
      if (s.cycle === "Yearly") return sum + amount / 12;
      if (s.cycle === "Weekly") return sum + (amount * 52) / 12;
      return sum + amount;
    }, 0);
  }

  function mileageStats(trips) {
    var distance = 0;
    var litres = 0;
    trips.forEach(function (trip) {
      var d = Number(trip.end) - Number(trip.start);
      var price = Number(trip.price);
      var paid = Number(trip.paid);
      if (d > 0 && price > 0 && paid > 0) {
        distance += d;
        litres += paid / price;
      }
    });
    return {
      avg: litres > 0 ? distance / litres : 0,
      distance: distance
    };
  }

  function weekNumber(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function excerpt(text, limit) {
    var clean = String(text || "").replace(/\s+/g, " ").trim();
    if (clean.length <= limit) return clean;
    return clean.slice(0, limit).replace(/\s+\S*$/, "") + "…";
  }

  function domainOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (err) {
      return String(url || "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    }
  }

  function openListItems(lists) {
    var rows = [];
    lists.forEach(function (list) {
      (list.items || []).forEach(function (item) {
        if (!item.done) rows.push({ text: item.text, meta: list.title });
        (item.children || []).forEach(function (child) {
          if (!child.done) rows.push({ text: child.text, meta: list.title });
        });
      });
    });
    return rows;
  }

  function weekChecks(habits) {
    var week = Z.weekDates(0);
    var total = 0;
    var done = 0;
    habits.forEach(function (habit) {
      week.forEach(function (date) {
        total += 1;
        if (habit.checks && habit.checks[date]) done += 1;
      });
    });
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function sparkline(trips) {
    var pointsSource = trips.slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date));
    }).slice(-7).map(function (trip) {
      var distance = Number(trip.end) - Number(trip.start);
      var price = Number(trip.price);
      var paid = Number(trip.paid);
      if (distance <= 0 || price <= 0 || paid <= 0) return null;
      return distance / (paid / price);
    }).filter(function (value) { return value && isFinite(value); });
    if (pointsSource.length < 2) return "";
    var min = Math.min.apply(null, pointsSource);
    var max = Math.max.apply(null, pointsSource);
    var span = max - min || 1;
    var points = pointsSource.map(function (value, i) {
      var x = (i / (pointsSource.length - 1)) * 100;
      var y = 27 - ((value - min) / span) * 21;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var last = points.split(" ").slice(-1)[0].split(",");
    return '<svg class="bento-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline points="' + points + '" fill="none" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.2" fill="currentColor"/></svg>';
  }

  var diary = arr("diary");
  var lists = arr("lists");
  var habits = (Z.store.get("habits", { habits: [] }) || {}).habits || [];
  var notes = arr("notes");
  var trips = arr("trips");
  var money = Z.store.get("money", { budget: 0, transactions: [] }) || { budget: 0, transactions: [] };
  var passbook = Z.store.get("passbook", { accounts: [], transactions: [] }) || { accounts: [], transactions: [] };
  var split = Z.store.get("split", { groups: [] }) || { groups: [] };
  var watchlist = arr("watchlist");
  var links = arr("links");
  var subs = arr("subscriptions");
  var pendingCount = Z.adminPendingCount();

  var today = Z.todayISO();
  var thisMonth = Z.monthKey(today);
  var monthTxns = (money.transactions || []).filter(function (t) { return Z.monthKey(t.date) === thisMonth; });
  var spent = monthTxns.filter(function (t) { return t.type === "expense"; }).reduce(function (s, t) { return s + Number(t.amount); }, 0);
  var earned = monthTxns.filter(function (t) { return t.type === "income"; }).reduce(function (s, t) { return s + Number(t.amount); }, 0);
  var budget = Number(money.budget) || 0;
  var budgetPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  var counts = listCounts(lists);
  var habitDone = habitDoneToday(habits);
  var habitWeek = weekChecks(habits);
  var mileage = mileageStats(trips);
  var streak = diaryStreak(diary);
  var words = diary.reduce(function (sum, entry) { return sum + String(entry.body || "").trim().split(/\s+/).filter(Boolean).length; }, 0);
  var totalPassbook = passbookTotal(passbook);
  var totalSplit = settleTotal(split.groups || []);
  var activeSubs = subs.filter(function (s) { return s.status !== "Paused"; });
  var monthlyBurn = subMonthly(subs);
  var watching = watchlist.filter(function (w) { return w.status === "Watching"; });
  var queued = watchlist.filter(function (w) { return w.status === "Queued"; });
  var watched = watchlist.filter(function (w) { return w.status === "Watched"; });
  var openItems = openListItems(lists);
  var pinnedNotes = notes.filter(function (note) { return note.pinned; });

  /* Greeting and clock ---------------------------------------------------- */

  var eyebrow = document.getElementById("home-eyebrow");
  if (eyebrow) {
    var hour = new Date().getHours();
    var greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    eyebrow.textContent = greeting + " · " + Z.dateLong(today) + " · Week " + weekNumber(new Date());
  }

  var nowTime = document.getElementById("now-time");
  var nowDate = document.getElementById("now-date");

  function paintClock() {
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, "0");
    var mm = String(now.getMinutes()).padStart(2, "0");
    var ss = String(now.getSeconds()).padStart(2, "0");
    if (nowTime) nowTime.innerHTML = hh + ":" + mm + '<span class="sec">' + ss + "</span>";
    if (nowDate) nowDate.textContent = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(now);
  }

  paintClock();
  setInterval(paintClock, 1000);

  var nextSub = activeSubs
    .filter(function (s) { return Z.daysUntil(s.next) >= 0; })
    .sort(function (a, b) { return a.next.localeCompare(b.next); })[0];
  var latestDiary = diary.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0];
  var recentMoney = (money.transactions || []).slice().sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  }).slice(0, 3);

  var nowList = document.getElementById("now-list");
  if (nowList) {
    var nowLines = [
      { label: "Awaiting review", href: "admin.html", value: pendingCount ? pendingCount + " in the queue" : "Queue clear" },
      { label: "Open items", href: "lists.html", value: counts.open + " across " + lists.length + " lists" },
      { label: "Next renewal", href: "subscriptions.html", value: nextSub ? esc(nextSub.name) + " · " + Z.daysUntil(nextSub.next) + "d" : "Nothing due" },
      { label: "Today's habits", href: "habits.html", value: habitDone + " of " + habits.length }
    ];
    nowList.innerHTML = nowLines.map(function (line) {
      return '<div class="now-line"><span class="now-label">' + line.label + '</span>' +
        '<a href="' + line.href + '">' + line.value + "</a></div>";
    }).join("");
  }

  /* Stats ----------------------------------------------------------------- */

  var stats = [
    {
      label: "Spent · " + Z.monthLabel(thisMonth),
      value: Z.money(spent),
      hint: budget > 0 ? budgetPct + "% of " + Z.money(budget) + " budget" : "No budget set"
    },
    {
      label: "Diary streak",
      value: streak + '<span class="unit"> days</span>',
      hint: diary.length + " entries · " + Z.num(words) + " words"
    },
    {
      label: "Open list items",
      value: String(counts.open),
      hint: counts.done + " done across " + lists.length + " lists"
    },
    {
      label: "Average mileage",
      value: (mileage.avg || 0).toFixed(1) + '<span class="unit"> km/l</span>',
      hint: Z.num(mileage.distance) + " km across " + trips.length + " fills"
    }
  ];

  var statsHost = document.getElementById("home-stats");
  if (statsHost) {
    statsHost.innerHTML = stats.map(function (stat, index) {
      return '<div class="stat stat-tone-' + index + '"><div class="stat-label"><span>' + esc(stat.label) + '</span><span class="stat-index">0' + (index + 1) + "</span></div>" +
        '<div class="stat-value">' + stat.value + "</div>" +
        '<div class="stat-hint">' + stat.hint + "</div></div>";
    }).join("");
  }

  /* Bento ---------------------------------------------------------------- */

  function smallPill(text) {
    return '<span class="bento-pill">' + esc(text) + "</span>";
  }

  function card(id, group, label, iconName, href, number, content, foot, extraClass) {
    return '<a class="bento-card bento-' + id + (extraClass ? " " + extraClass : "") + '" href="' + href +
      '" data-group="' + esc(group) + '" aria-label="' + esc(label) + '">' +
      '<span class="bento-glow" aria-hidden="true"></span>' +
      '<span class="bento-no" aria-hidden="true">' + number + "</span>" +
      '<div class="bento-top"><span class="bento-tool">' + Z.icon(iconName) + "<span>" + esc(label) + "</span></span>" +
      '<span class="bento-arrow">' + Z.icon("arrowUpRight") + "</span></div>" +
      '<div class="bento-content">' + content + "</div>" +
      '<div class="bento-foot">' + foot + '<span class="bento-cta">Open ' + Z.icon("arrowRight") + "</span></div>" +
      "</a>";
  }

  var diaryTags = latestDiary ? (latestDiary.tags || []).slice(0, 3).map(function (tag) {
    return '<span class="bento-tag">' + esc(tag) + "</span>";
  }).join("") : "";

  var diaryContent =
    '<p class="bento-kicker">' + (latestDiary ? esc(Z.relDate(latestDiary.date)) + " · " + esc(latestDiary.mood) : "A fresh page") + "</p>" +
    '<h3 class="bento-display">' + esc(latestDiary ? latestDiary.title : "Begin with one line.") + "</h3>" +
    '<p class="bento-copy">' + esc(latestDiary ? excerpt(latestDiary.body, 172) : "The diary is waiting for the first sentence. A line a day is enough to remember a month.") + "</p>" +
    (diaryTags ? '<div class="bento-tagrow">' + diaryTags + "</div>" : "");

  var moneyRecent = recentMoney.length ? recentMoney.slice(0, 2).map(function (txn) {
    var income = txn.type === "income";
    return '<span class="bento-txn"><i style="background:' + Z.categoryColor(txn.category) + '"></i>' +
      '<span>' + esc(txn.note || txn.category) + '</span><strong class="' + (income ? "pos" : "") + '">' +
      (income ? "+" : "−") + Z.money(txn.amount) + "</strong></span>";
  }).join("") : '<span class="bento-muted">No transactions this month yet.</span>';

  var moneyContent =
    '<p class="bento-kicker">' + esc(Z.monthLabel(thisMonth)) + " · spent</p>" +
    '<div class="bento-big">' + Z.money(spent) + "</div>" +
    '<div class="bento-progress"><span style="width:' + Math.min(100, Math.max(budget ? 2 : 0, budgetPct)) + '%"></span></div>' +
    '<div class="bento-row"><span>' + (budget > 0 ? budgetPct + "% of " + Z.money(budget) : "No budget set") + "</span>" +
    '<span class="bento-income">+' + Z.money(earned) + " in</span></div>" +
    '<div class="bento-txn-list">' + moneyRecent + "</div>";

  var openPreview = openItems.slice(0, 3).map(function (item) {
    return '<span class="bento-check-row"><i class="bento-check"></i><span>' + esc(excerpt(item.text, 34)) +
      '</span><em>' + esc(excerpt(item.meta, 18)) + "</em></span>";
  }).join("");
  var listContent =
    '<div class="bento-big">' + counts.open + '<span>open</span></div>' +
    '<div class="bento-check-list">' + (openPreview || '<span class="bento-muted">Everything is crossed off.</span>') + "</div>";

  var week = Z.weekDates(0);
  var habitRows = habits.slice(0, 4).map(function (habit) {
    var dots = week.map(function (date) {
      var done = habit.checks && habit.checks[date];
      return '<i class="' + (done ? "done" : "") + (date === today ? " today" : "") + '"></i>';
    }).join("");
    return '<div class="bento-habit-row"><span>' + esc(habit.name) + '</span><span class="bento-habit-dots">' + dots + "</span></div>";
  }).join("");
  var habitContent =
    '<div class="bento-habit-summary"><strong>' + habitDone + '<span>/' + habits.length + '</span></strong><span>checked today</span></div>' +
    '<div class="bento-habit-week">' + (habitRows || '<span class="bento-muted">No habits yet.</span>') + "</div>" +
    '<div class="bento-row"><span>This week</span><strong>' + habitWeek.pct + "% rhythm</strong></div>";

  var notePreview = pinnedNotes[0] || notes[0];
  var noteContent =
    '<div class="bento-big">' + notes.length + '<span>notes</span></div>' +
    (notePreview ? '<div class="bento-note"><span class="bento-note-kicker">' + (notePreview.pinned ? "Pinned · " : "") +
      esc(Z.relDate(notePreview.updated)) + '</span><p>“' + esc(excerpt(notePreview.body, 76)) + '”</p></div>' : '<span class="bento-muted">No notes yet.</span>');

  var accountLines = (passbook.accounts || []).slice(0, 3).map(function (account) {
    return '<span class="bento-account"><i></i><span>' + esc(account.name) + '</span><strong>' + Z.money(accountBalance(passbook, account)) + "</strong></span>";
  }).join("");
  var passbookContent =
    '<p class="bento-kicker">Across ' + (passbook.accounts || []).length + " accounts</p>" +
    '<div class="bento-big">' + Z.money(totalPassbook) + "</div>" +
    '<div class="bento-account-list">' + (accountLines || '<span class="bento-muted">No accounts yet.</span>') + "</div>";

  var people = (split.groups || []).slice(0, 3).map(function (group) {
    var members = (group.members || []).slice(0, 3);
    var avatars = members.map(function (member, index) {
      return '<i class="bento-avatar tone-' + ((index + members.length) % 5) + '">' + esc(Z.initials(member.name)) + "</i>";
    }).join("");
    return '<div class="bento-group-row"><span class="bento-avatars">' + avatars + '</span><span class="bento-group-name">' + esc(group.name) +
      '</span><strong>' + Z.money(groupTotal(group)) + "</strong></div>";
  }).join("");
  var splitContent =
    '<p class="bento-kicker">Shared costs</p>' +
    '<div class="bento-big">' + (totalSplit > 0.5 ? Z.money(totalSplit) : "All settled") + "</div>" +
    '<div class="bento-group-list">' + (people || '<span class="bento-muted">No groups yet.</span>') + "</div>";

  var mileageContent =
    '<div class="bento-big">' + (mileage.avg || 0).toFixed(1) + '<span>km/l</span></div>' +
    '<div class="bento-spark-wrap">' + sparkline(trips) + "</div>" +
    '<div class="bento-row"><span>' + Z.num(mileage.distance) + ' km logged</span><strong>' + trips.length + " fills</strong></div>";

  var watchContent =
    '<div class="bento-big">' + watching.length + '<span>watching</span></div>' +
    (watching[0] ? '<div class="bento-watch"><span class="bento-live-dot"></span><span>' + esc(watching[0].title) + "</span></div>" : '<span class="bento-muted">Nothing in the player.</span>') +
    '<div class="bento-pillrow">' + smallPill(queued.length + " queued") + smallPill(watched.length + " watched") + "</div>";

  var domainChips = links.slice(0, 4).map(function (link) {
    return '<span class="bento-domain">' + esc(domainOf(link.url)) + "</span>";
  }).join("");
  var linkContent =
    '<div class="bento-big">' + links.length + '<span>saved</span></div>' +
    '<div class="bento-domains">' + (domainChips || '<span class="bento-muted">The shelf is empty.</span>') + "</div>";

  var subsContent =
    '<p class="bento-kicker">Monthly burn</p>' +
    '<div class="bento-big">' + Z.money(monthlyBurn) + '<span>/mo</span></div>' +
    '<div class="bento-renewal"><span>Next renewal</span><strong>' + (nextSub ? esc(nextSub.name) + " · " + Z.daysUntil(nextSub.next) + "d" : "Nothing due") + "</strong></div>" +
    '<div class="bento-pillrow">' + smallPill(activeSubs.length + " active") + smallPill((subs.length - activeSubs.length) + " paused") + "</div>";

  var adminContent =
    '<div class="bento-admin-mark">' + Z.icon("shield") + "</div>" +
    '<p class="bento-kicker">System / restricted</p>' +
    '<h3 class="bento-display">Back office.</h3>' +
    '<p class="bento-copy">Review every workspace change, trace how each record arrived, and set the rules for the desk.</p>' +
    '<div class="bento-admin-status"><span class="bento-live-dot"></span>' +
    (pendingCount ? pendingCount + " awaiting review" : "Queue clear") + "</div>";

  var cards = [
    card("diary", "Personal", "Diary", "book", "diary.html", "01", diaryContent,
      smallPill(diary.length + " entries") + smallPill(streak + " day streak")),
    card("money", "Money", "Money", "wallet", "money.html", "02", moneyContent,
      smallPill(monthTxns.length + " entries") + smallPill("this month")),
    card("lists", "Personal", "Lists", "list", "lists.html", "03", listContent,
      smallPill(counts.done + " done") + smallPill(lists.length + " lists")),
    card("habits", "Personal", "Habits", "repeat", "habits.html", "04", habitContent,
      smallPill(habits.length + " habits") + smallPill(habitWeek.done + " checks")),
    card("notes", "Personal", "Notes", "note", "notes.html", "05", noteContent,
      smallPill(notes.length + " notes") + smallPill(pinnedNotes.length + " pinned")),
    card("passbook", "Money", "Passbook", "ledger", "passbook.html", "06", passbookContent,
      smallPill((passbook.transactions || []).length + " entries") + smallPill("all accounts")),
    card("split", "Money", "Split", "split", "split.html", "07", splitContent,
      smallPill((split.groups || []).length + " groups") + smallPill(totalSplit > 0.5 ? "to settle" : "settled")),
    card("mileage", "Money", "Mileage", "car", "mileage.html", "08", mileageContent,
      smallPill(trips.length + " trips") + smallPill("live calc")),
    card("watchlist", "Library", "Watchlist", "film", "watchlist.html", "09", watchContent,
      smallPill(watchlist.length + " titles") + smallPill(queued.length + " queued")),
    card("links", "Library", "Links", "link", "links.html", "10", linkContent,
      smallPill(links.length + " links") + smallPill("read later")),
    card("subscriptions", "Library", "Subscriptions", "card", "subscriptions.html", "11", subsContent,
      smallPill(activeSubs.length + " active") + smallPill("monthly burn")),
    card("admin", "System", "Admin", "shield", "admin.html", "12", adminContent,
      smallPill("Review queue") + smallPill("D1 synced"), "bento-admin")
  ];

  var bentoHost = document.getElementById("home-bento");
  if (bentoHost) {
    bentoHost.innerHTML = cards.join("");
    bentoHost.addEventListener("pointermove", function (event) {
      var tile = event.target.closest(".bento-card");
      if (!tile) return;
      var rect = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", (event.clientX - rect.left) + "px");
      tile.style.setProperty("--my", (event.clientY - rect.top) + "px");
    });
  }

  var filterHost = document.getElementById("desk-filter");
  var deskCount = document.getElementById("desk-count");
  if (filterHost && bentoHost) {
    var filterButtons = Array.prototype.slice.call(filterHost.querySelectorAll("[data-filter]"));
    var tileGroups = {};
    bentoHost.querySelectorAll(".bento-card").forEach(function (tile) {
      tileGroups[tile.dataset.group] = (tileGroups[tile.dataset.group] || 0) + 1;
    });
    filterButtons.forEach(function (button) {
      var filter = button.dataset.filter;
      var count = filter === "all" ? cards.length : (tileGroups[filter] || 0);
      var badge = button.querySelector("span");
      if (badge) badge.textContent = count;
    });

    filterHost.addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) return;
      var filter = button.dataset.filter;
      filterButtons.forEach(function (item) {
        item.classList.toggle("active", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });
      var visible = 0;
      bentoHost.classList.toggle("is-filtering", filter !== "all");
      bentoHost.querySelectorAll(".bento-card").forEach(function (tile) {
        var show = filter === "all" || tile.dataset.group === filter;
        tile.classList.toggle("is-hidden", !show);
        if (show) visible += 1;
      });
      if (deskCount) deskCount.textContent = filter === "all" ? "Showing all " + visible + " tools" : "Showing " + visible + " " + filter.toLowerCase() + " tools";
    });
  }
})();
