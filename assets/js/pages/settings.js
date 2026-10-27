/* Zone — settings */

(function () {
  "use strict";

  var esc = Z.esc;

  var $ = function (id) { return document.getElementById(id); };
  var currencySelect = $("currency-select");

  function sizeLabel() {
    var size = Z.store.size();
    if (size < 1024) return size + " B";
    return (size / 1024).toFixed(1) + " KB";
  }

  function totalRecords() {
    function array(key) {
      var value = Z.store.get(key, []);
      return Array.isArray(value) ? value.length : 0;
    }
    var money = Z.store.get("money", { transactions: [] }) || { transactions: [] };
    var passbook = Z.store.get("passbook", { transactions: [] }) || { transactions: [] };
    var split = Z.store.get("split", { groups: [] }) || { groups: [] };
    var habits = Z.store.get("habits", { habits: [] }) || { habits: [] };
    return array("diary") + array("watchlist") + array("trips") + array("notes") +
      array("links") + array("subscriptions") + array("lists") +
      (Array.isArray(money.transactions) ? money.transactions.length : 0) +
      (Array.isArray(passbook.transactions) ? passbook.transactions.length : 0) +
      (Array.isArray(split.groups) ? split.groups.length : 0) +
      (Array.isArray(habits.habits) ? habits.habits.length : 0);
  }

  function themeLabel() {
    var settings = Z.settings();
    if (settings.theme === "system") return "System (" + Z.resolvedTheme() + ")";
    return settings.theme === "dark" ? "Dark" : "Light";
  }

  function renderThemeChoice() {
    var theme = Z.settings().theme;
    document.querySelectorAll("#theme-options [data-theme-choice]").forEach(function (button) {
      var active = button.dataset.themeChoice === theme;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function renderCurrency() {
    var settings = Z.settings();
    currencySelect.value = settings.currency;
    $("currency-sample").textContent = Z.money(128450, 0);
  }

  function renderAbout() {
    var settings = Z.settings();
    var host = $("about-mark");
    if (host && !host.querySelector(".brand-mark")) {
      host.insertAdjacentHTML("afterbegin", Z.brandMark(36));
    }
    var facts = [
      ["Version", "v2.0 · Living colour"],
      ["Currency", settings.currency],
      ["Theme", themeLabel()],
      ["Records", String(totalRecords())],
      ["Storage", sizeLabel()],
      ["Backups", "In Admin"]
    ];
    $("about-facts").innerHTML = facts.map(function (fact) {
      return "<div><span>" + esc(fact[0]) + "</span><strong>" + esc(fact[1]) + "</strong></div>";
    }).join("");
  }

  function renderAll() {
    renderThemeChoice();
    renderCurrency();
    renderAbout();
  }

  /* Appearance ------------------------------------------------------------ */

  $("theme-options").addEventListener("click", function (event) {
    var button = event.target.closest("[data-theme-choice]");
    if (!button) return;
    Z.setTheme(button.dataset.themeChoice);
    renderAll();
    var label = button.querySelector(".theme-option-name").textContent;
    Z.toast("Theme set to " + label.toLowerCase() + ".");
  });

  /* Currency -------------------------------------------------------------- */

  currencySelect.addEventListener("change", function () {
    Z.saveSettings({ currency: currencySelect.value });
    renderAll();
    Z.toast("Currency set to " + currencySelect.value + ".");
  });

  renderAll();
})();
