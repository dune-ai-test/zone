/* Zone — subscriptions */

(function () {
  "use strict";

  var esc = Z.esc;
  var today = Z.todayISO();
  var CYCLES = ["Monthly", "Yearly", "Weekly"];
  var CATEGORIES = ["Design", "Music", "Storage", "Health", "Reading", "Web", "Software", "Video", "News", "Other"];

  var subs = Z.store.get("subscriptions", []);
  if (!Array.isArray(subs)) subs = [];
  subs = subs.filter(function (sub) { return sub && typeof sub === "object"; });
  subs.forEach(function (sub) {
    sub.amount = Number(sub.amount) || 0;
    if (CYCLES.indexOf(sub.cycle) === -1) sub.cycle = "Monthly";
    if (sub.status !== "Paused") sub.status = "Active";
    if (!sub.next) sub.next = today;
    if (!sub.category) sub.category = "Other";
  });

  var state = { search: "", status: "all", category: "all", sort: "next" };

  var $ = function (id) { return document.getElementById(id); };
  var dialog = $("sub-dialog");
  var form = $("sub-form");
  var idField = $("sub-id");
  var nameField = $("sub-name");
  var amountField = $("sub-amount");
  var cycleField = $("sub-cycle");
  var nextField = $("sub-next");
  var categoryField = $("sub-category");
  var statusField = $("sub-state");
  var searchField = $("sub-search");
  var searchClear = $("sub-search-clear");

  $("sub-currency").textContent = Z.money(0).replace(/[\d.,\s]/g, "");

  function save() {
    Z.store.set("subscriptions", subs);
  }

  function findSub(id) {
    return subs.filter(function (sub) { return sub.id === id; })[0];
  }

  function monthlyOf(sub) {
    var amount = Number(sub.amount) || 0;
    if (sub.cycle === "Yearly") return amount / 12;
    if (sub.cycle === "Weekly") return (amount * 52) / 12;
    return amount;
  }

  function activeSubs() {
    return subs.filter(function (sub) { return sub.status !== "Paused"; });
  }

  function monthlyBurn() {
    return activeSubs().reduce(function (sum, sub) { return sum + monthlyOf(sub); }, 0);
  }

  function cycleLabel(cycle) {
    if (cycle === "Yearly") return "year";
    if (cycle === "Weekly") return "week";
    return "month";
  }

  function cycleLower(cycle) {
    if (cycle === "Yearly") return "yearly";
    if (cycle === "Weekly") return "weekly";
    return "monthly";
  }

  function dueInfo(sub) {
    if (sub.status === "Paused") return { label: "paused", className: "is-paused" };
    var days = Z.daysUntil(sub.next);
    if (days < 0) return { label: Math.abs(days) + "d late", className: "is-overdue" };
    if (days === 0) return { label: "today", className: "is-soon" };
    if (days <= 7) return { label: "in " + days + "d", className: "is-soon" };
    return { label: "in " + days + "d", className: "" };
  }

  function dueChip(sub) {
    var info = dueInfo(sub);
    return '<span class="sb-due ' + info.className + '">' + esc(info.label) + "</span>";
  }

  function sortedByNext(list) {
    return list.slice().sort(function (a, b) {
      if (a.next === b.next) return String(a.name).localeCompare(String(b.name));
      return String(a.next).localeCompare(String(b.next));
    });
  }

  function nextActive() {
    return sortedByNext(activeSubs())[0];
  }

  function upcomingIn(days) {
    var end = Z.addDays(today, days);
    return activeSubs().filter(function (sub) {
      return sub.next >= today && sub.next <= end;
    });
  }

  function categoryTotals(list) {
    var totals = {};
    list.forEach(function (sub) {
      var name = sub.category || "Other";
      totals[name] = (totals[name] || 0) + monthlyOf(sub);
    });
    return Object.keys(totals).map(function (name) {
      return { name: name, amount: totals[name] };
    }).sort(function (a, b) {
      return b.amount - a.amount;
    });
  }

  function syncSearch() {
    var hasValue = Boolean(searchField.value.trim());
    searchClear.hidden = !hasValue;
  }

  function renderCategories(selected) {
    var names = CATEGORIES.slice();
    subs.forEach(function (sub) {
      if (sub.category && names.indexOf(sub.category) === -1) names.push(sub.category);
    });
    if (selected && names.indexOf(selected) === -1) names.push(selected);
    categoryField.innerHTML = names.map(function (name) {
      return '<option value="' + esc(name) + '">' + esc(name) + "</option>";
    }).join("");
    categoryField.value = selected && names.indexOf(selected) !== -1 ? selected : "Software";
  }

  function renderCategoryFilter() {
    var names = [];
    subs.forEach(function (sub) {
      var name = sub.category || "Other";
      if (names.indexOf(name) === -1) names.push(name);
    });
    names.sort(function (a, b) { return a.localeCompare(b); });
    if (state.category !== "all" && names.indexOf(state.category) === -1) state.category = "all";
    $("sub-category-filter").innerHTML = '<option value="all">All categories</option>' + names.map(function (name) {
      return '<option value="' + esc(name) + '">' + esc(name) + "</option>";
    }).join("");
    $("sub-category-filter").value = state.category;
  }

  function renderHero() {
    var active = activeSubs();
    var monthly = monthlyBurn();
    var next = nextActive();
    var paused = subs.length - active.length;

    $("burn-total").innerHTML = Z.money(monthly) + "<span> / month</span>";
    $("burn-note").textContent = active.length
      ? "Across " + active.length + " active " + (active.length === 1 ? "plan" : "plans") + (paused ? ", with " + paused + " paused." : ".")
      : "Nothing active. A rare and pleasant state.";
    $("sub-hero-active").textContent = active.length + " active";
    $("sub-hero-annual").textContent = Z.money(monthly * 12);
    $("sub-hero-next").textContent = next ? next.name : "Nothing scheduled";
    $("sub-hero-next-meta").textContent = next ? Z.dateMedium(next.next) + " · " + dueInfo(next).label : "All quiet";

    $("sub-hero-meta").innerHTML =
      '<span class="sb-meta-item"><span class="sb-local-dot" aria-hidden="true"></span>Local list</span>' +
      '<span class="sb-meta-item">' + subs.length + (subs.length === 1 ? " subscription" : " subscriptions") + "</span>" +
      '<span class="sb-meta-item">' + active.length + " active</span>" +
      '<span class="sb-meta-item">' + Z.settings().currency + "</span>";

    var groups = [
      {
        key: "Monthly",
        className: "is-monthly",
        amount: active.filter(function (sub) { return sub.cycle === "Monthly"; })
          .reduce(function (sum, sub) { return sum + monthlyOf(sub); }, 0)
      },
      {
        key: "Yearly",
        className: "is-yearly",
        amount: active.filter(function (sub) { return sub.cycle === "Yearly"; })
          .reduce(function (sum, sub) { return sum + monthlyOf(sub); }, 0)
      },
      {
        key: "Weekly",
        className: "is-weekly",
        amount: active.filter(function (sub) { return sub.cycle === "Weekly"; })
          .reduce(function (sum, sub) { return sum + monthlyOf(sub); }, 0)
      }
    ];

    $("sub-hero-cycle").innerHTML =
      '<div class="sb-cycle-bar" aria-hidden="true">' + groups.map(function (group) {
        var width = monthly > 0 ? (group.amount / monthly) * 100 : 0;
        return width > 0 ? '<i class="' + group.className + '" style="width:' + width.toFixed(2) + '%"></i>' : "";
      }).join("") + "</div>" +
      '<div class="sb-cycle-key">' + groups.map(function (group) {
        return '<span><i class="' + group.className + '" aria-hidden="true"></i>' + group.key + " <strong>" + Z.money(group.amount) + "</strong></span>";
      }).join("") + "</div>";
  }

  function renderStats() {
    var active = activeSubs();
    var monthly = monthlyBurn();
    var paused = subs.length - active.length;
    var dueSeven = upcomingIn(7);
    var dueSevenTotal = dueSeven.reduce(function (sum, sub) { return sum + Number(sub.amount); }, 0);
    var average = active.length ? monthly / active.length : 0;
    var categories = categoryTotals(active);
    var biggest = categories[0];

    var stats = [
      {
        label: "Active plans",
        value: String(active.length),
        hint: paused ? paused + " paused and left out of the burn" : "Nothing paused"
      },
      {
        label: "Due in 7 days",
        value: Z.money(dueSevenTotal),
        hint: dueSeven.length + (dueSeven.length === 1 ? " charge on the calendar" : " charges on the calendar")
      },
      {
        label: "Average plan",
        value: Z.money(average),
        hint: active.length ? "Normalised across active plans" : "No active plans to average"
      },
      {
        label: "Biggest category",
        value: biggest ? biggest.name : "—",
        text: true,
        hint: biggest ? Z.money(biggest.amount) + " / month" : "Nothing to divide yet"
      }
    ];

    $("sub-stats").innerHTML = stats.map(function (stat, index) {
      return '<article class="sb-stat">' +
        '<span class="sb-stat-index">0' + (index + 1) + "</span>" +
        '<span class="sb-stat-label">' + esc(stat.label) + "</span>" +
        '<p class="sb-stat-value' + (stat.text ? " is-text" : "") + '">' + esc(stat.value) + "</p>" +
        '<p class="sb-stat-hint">' + esc(stat.hint) + "</p>" +
      "</article>";
    }).join("");
  }

  function filtered() {
    var query = state.search.trim().toLowerCase();
    var rows = subs.filter(function (sub) {
      if (state.status === "active" && sub.status === "Paused") return false;
      if (state.status === "paused" && sub.status !== "Paused") return false;
      if (state.category !== "all" && (sub.category || "Other") !== state.category) return false;
      if (!query) return true;
      return (String(sub.name) + " " + String(sub.category || "") + " " + String(sub.cycle)).toLowerCase().indexOf(query) !== -1;
    });

    rows.sort(function (a, b) {
      if (state.sort === "name") return String(a.name).localeCompare(String(b.name));
      if (state.sort === "monthly") return monthlyOf(b) - monthlyOf(a);
      var aPaused = a.status === "Paused" ? 1 : 0;
      var bPaused = b.status === "Paused" ? 1 : 0;
      if (aPaused !== bPaused) return aPaused - bPaused;
      if (a.next === b.next) return String(a.name).localeCompare(String(b.name));
      return String(a.next).localeCompare(String(b.next));
    });
    return rows;
  }

  function renderShelf() {
    var rows = filtered();
    var body = $("sub-body");
    var active = activeSubs();
    var paused = subs.length - active.length;
    $("sub-count").textContent = rows.length + " of " + subs.length + " on the shelf";
    $("sub-panel-meta").textContent = active.length + " active · " + paused + " paused";

    if (!subs.length) {
      body.innerHTML = '<div class="sb-empty"><div class="sb-empty-mark">' + Z.icon("card") + "</div>" +
        "<h3>Nothing on the shelf.</h3><p>Add the first subscription, even the small one. They are easier to see together.</p>" +
        '<button type="button" class="btn" data-empty-add-sub>Add a subscription</button></div>';
      return;
    }

    if (!rows.length) {
      body.innerHTML = '<div class="sb-empty"><h3>Nothing matches.</h3>' +
        "<p>Try another status, category, or search term.</p>" +
        '<button type="button" class="btn btn-sm" data-clear-sub-filters>Clear filters</button></div>';
      return;
    }

    body.innerHTML = rows.map(function (sub) {
      var pausedSub = sub.status === "Paused";
      var tone = Z.toneFor(sub.name);
      var toggleIcon = pausedSub ? Z.icon("play") : Z.icon("pause");
      var due = dueChip(sub);
      return '<article class="sb-card' + (pausedSub ? " is-paused" : "") + '" data-sub-id="' + esc(sub.id) + '">' +
        '<div class="sb-card-top">' +
          '<span class="sb-card-mark tone-' + tone + '">' + esc(Z.initials(sub.name)) + "</span>" +
          '<div class="sb-card-id"><h3 class="sb-card-name">' + esc(sub.name) + "</h3>" +
            '<span class="sb-card-meta">' + esc(sub.category || "Other") + " · " + esc(sub.cycle) + "</span></div>" +
          '<span class="sb-status ' + (pausedSub ? "is-paused" : "is-active") + '"><i aria-hidden="true"></i>' + (pausedSub ? "Paused" : "Active") + "</span>" +
        "</div>" +
        '<div class="sb-card-money">' +
          "<div><span>Per charge</span><strong>" + Z.money(sub.amount) + "</strong><small>every " + cycleLabel(sub.cycle) + "</small></div>" +
          '<div class="is-share"><span>Monthly share</span><strong>' + Z.money(monthlyOf(sub)) + "</strong><small>" + (pausedSub ? "not in the burn" : "in the burn") + "</small></div>" +
        "</div>" +
        '<div class="sb-card-next"><div><span>Next charge</span><strong>' + esc(Z.dateMedium(sub.next)) + "</strong></div>" + due + "</div>" +
        '<div class="sb-card-actions">' +
          '<button type="button" class="sb-card-action" data-toggle-sub="' + esc(sub.id) + '" aria-label="' + (pausedSub ? "Resume" : "Pause") + " subscription\" title=\"" + (pausedSub ? "Resume" : "Pause") + '">' + toggleIcon + "<span>" + (pausedSub ? "Resume" : "Pause") + "</span></button>" +
          '<button type="button" class="sb-card-action" data-edit-sub="' + esc(sub.id) + '" aria-label="Edit subscription" title="Edit">' + Z.icon("pencil") + "<span>Edit</span></button>" +
          '<button type="button" class="sb-card-action is-danger" data-delete-sub="' + esc(sub.id) + '" aria-label="Delete subscription" title="Delete">' + Z.icon("trash") + "</button>" +
        "</div>" +
      "</article>";
    }).join("");
  }

  function renderRenewals() {
    var active = activeSubs();
    var list = sortedByNext(active).slice(0, 6);
    var host = $("renewal-list");
    $("sub-renewal-meta").textContent = active.length + " active";

    if (!list.length) {
      host.innerHTML = '<div class="sb-side-empty"><h3>All quiet.</h3><p>No active renewals to think about.</p></div>';
    } else {
      host.innerHTML = list.map(function (sub) {
        var date = Z.parseISO(sub.next);
        var month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date).toUpperCase();
        return '<div class="sb-renewal" data-sub-id="' + esc(sub.id) + '">' +
          '<div class="sb-renewal-date"><strong>' + String(date.getDate()).padStart(2, "0") + "</strong><span>" + month + "</span></div>" +
          '<div class="sb-renewal-info"><div class="sb-renewal-name">' + esc(sub.name) + "</div>" +
          '<div class="sb-renewal-cycle">' + esc(sub.cycle) + " · " + esc(sub.category || "Other") + "</div></div>" +
          '<div class="sb-renewal-price"><strong>' + Z.money(sub.amount) + "</strong>" + dueChip(sub) + "</div>" +
        "</div>";
      }).join("");
    }

    var upcoming = upcomingIn(30);
    var total = upcoming.reduce(function (sum, sub) { return sum + Number(sub.amount); }, 0);
    $("due-summary").innerHTML = Z.icon("calendar") + "<span>" +
      (upcoming.length
        ? upcoming.length + " " + (upcoming.length === 1 ? "charge" : "charges") + " in the next 30 days · <strong>" + Z.money(total) + "</strong>"
        : "Nothing renews in the next 30 days.") + "</span>";
  }

  function renderMix() {
    var active = activeSubs();
    var categories = categoryTotals(active);
    var total = categories.reduce(function (sum, item) { return sum + item.amount; }, 0);
    var host = $("sub-mix");

    if (!categories.length) {
      host.innerHTML = '<div class="sb-side-empty"><h3>No split yet.</h3><p>Add an active plan to see where the monthly money goes.</p></div>';
      return;
    }

    host.innerHTML = categories.map(function (item) {
      var width = total > 0 ? (item.amount / total) * 100 : 0;
      return '<div class="sb-mix-row">' +
        '<div class="sb-mix-top"><span class="sb-mix-label"><i style="background:' + Z.categoryColor(item.name) + '" aria-hidden="true"></i><span>' + esc(item.name) + "</span></span>" +
        '<span class="sb-mix-value"><strong>' + Z.money(item.amount) + "</strong><small>" + Math.round(width) + "%</small></span></div>" +
        '<div class="sb-mix-track" aria-hidden="true"><i style="width:' + width.toFixed(2) + "%;background:" + Z.categoryColor(item.name) + '"></i></div>' +
      "</div>";
    }).join("");
  }

  function renderAll() {
    renderCategoryFilter();
    renderHero();
    renderStats();
    renderShelf();
    renderRenewals();
    renderMix();
    $("sub-status").value = state.status;
    $("sub-sort").value = state.sort;
    syncSearch();
  }

  function clearFilters() {
    state.search = "";
    state.status = "all";
    state.category = "all";
    searchField.value = "";
    $("sub-status").value = "all";
    renderAll();
  }

  function normalised(amount, cycle) {
    if (cycle === "Yearly") return amount / 12;
    if (cycle === "Weekly") return (amount * 52) / 12;
    return amount;
  }

  function updatePreview() {
    var amount = Number(amountField.value) || 0;
    $("sub-preview").textContent = amount > 0 ? Z.money(normalised(amount, cycleField.value)) : "—";
  }

  function openSub(sub) {
    form.reset();
    idField.value = sub ? sub.id : "";
    $("sub-kicker").textContent = sub ? "Change the plan" : "Another monthly line";
    $("sub-title").textContent = sub ? "Edit subscription" : "Add a subscription";
    $("sub-save").textContent = sub ? "Save changes" : "Add subscription";
    nameField.value = sub ? sub.name : "";
    amountField.value = sub ? sub.amount : "";
    cycleField.value = sub ? sub.cycle : "Monthly";
    nextField.value = sub ? sub.next : Z.addDays(today, 7);
    statusField.value = sub ? sub.status : "Active";
    renderCategories(sub ? sub.category : "Software");
    updatePreview();
    dialog.showModal();
    setTimeout(function () { nameField.focus(); nameField.select(); }, 40);
  }

  $("add-sub").addEventListener("click", function () { openSub(null); });

  document.querySelectorAll("[data-close-sub]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (dialog.open) dialog.close();
    });
  });

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });

  amountField.addEventListener("input", updatePreview);
  cycleField.addEventListener("change", updatePreview);

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = nameField.value.trim();
    var amount = Number(amountField.value);
    var next = nextField.value;

    if (!name) {
      Z.toast("Name the service.", "error");
      nameField.focus();
      return;
    }
    if (!(amount > 0) || !amountField.value) {
      Z.toast("Enter an amount greater than zero.", "error");
      amountField.focus();
      return;
    }
    if (!next) {
      Z.toast("Choose the next charge date.", "error");
      nextField.focus();
      return;
    }

    var editing = idField.value;
    var payload = {
      id: editing || Z.uid("sub"),
      name: name,
      amount: amount,
      cycle: cycleField.value,
      next: next,
      category: categoryField.value,
      status: statusField.value
    };

    if (editing) {
      subs = subs.map(function (sub) { return sub.id === editing ? payload : sub; });
      Z.toast("Subscription updated.");
    } else {
      subs.push(payload);
      Z.toast("Subscription added.");
    }

    save();
    state.search = "";
    state.status = "all";
    state.category = "all";
    searchField.value = "";
    dialog.close();
    renderAll();
  });

  function renderSearchResults() {
    renderShelf();
  }

  $("sub-body").addEventListener("click", function (event) {
    if (event.target.closest("[data-empty-add-sub]")) {
      openSub(null);
      return;
    }
    if (event.target.closest("[data-clear-sub-filters]")) {
      clearFilters();
      return;
    }

    var toggle = event.target.closest("[data-toggle-sub]");
    if (toggle) {
      var sub = findSub(toggle.dataset.toggleSub);
      if (!sub) return;
      sub.status = sub.status === "Paused" ? "Active" : "Paused";
      save();
      renderAll();
      Z.toast(sub.status === "Paused" ? "Subscription paused." : "Subscription resumed.");
      return;
    }

    var edit = event.target.closest("[data-edit-sub]");
    if (edit) {
      var target = findSub(edit.dataset.editSub);
      if (target) openSub(target);
      return;
    }

    var del = event.target.closest("[data-delete-sub]");
    if (!del) return;
    var victim = findSub(del.dataset.deleteSub);
    if (!victim) return;
    Z.confirm({
      kicker: "Delete subscription",
      title: "Remove " + esc(victim.name) + "?",
      message: "This deletes the record only. It does not cancel anything with the service itself. " +
        esc(victim.name) + " costs " + Z.money(victim.amount) + " per " + cycleLabel(victim.cycle) + ".",
      label: "Delete record"
    }).then(function (ok) {
      if (!ok) return;
      subs = subs.filter(function (sub) { return sub.id !== victim.id; });
      save();
      renderAll();
      Z.toast("Subscription removed.");
    });
  });

  var renderSearch = Z.debounce(renderSearchResults, 120);

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
      renderShelf();
    }
  });

  searchClear.addEventListener("click", function () {
    searchField.value = "";
    state.search = "";
    syncSearch();
    renderShelf();
    searchField.focus();
  });

  $("sub-status").addEventListener("change", function () {
    state.status = $("sub-status").value;
    renderShelf();
  });

  $("sub-category-filter").addEventListener("change", function () {
    state.category = $("sub-category-filter").value;
    renderShelf();
  });

  $("sub-sort").addEventListener("change", function () {
    state.sort = $("sub-sort").value;
    renderShelf();
  });

  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var target = event.target;
    var typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    if (event.key === "/" && !typing && !dialog.open) {
      event.preventDefault();
      searchField.focus();
      return;
    }
    if ((event.key === "n" || event.key === "N") && !typing && !dialog.open) {
      event.preventDefault();
      openSub(null);
    }
  });

  renderAll();
})();
