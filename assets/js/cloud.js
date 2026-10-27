/* ==========================================================================
   Zone — Cloudflare D1 bridge
   Runs before core.js. It hydrates the local cache from /api/bootstrap so the
   page scripts can keep their existing synchronous storage API, then mirrors
   every write back to Cloudflare Pages Functions and D1.
   ========================================================================== */

(function () {
  "use strict";

  var PREFIX = "zone.v1.";
  var DATA_QUEUE_KEY = "zone.cloud.queue.data";
  var AUDIT_QUEUE_KEY = "zone.cloud.queue.audit";
  var ENABLED_KEY = "zone.cloud.enabled";
  var HYDRATED_KEY = "zone.cloud.hydrated";
  var PRE_CLOUD_KEY = "zone.cloud.precloud";
  var ADMIN_KEY = "zone.admin.session";
  var API_ROOT = "/api";
  var AUDIT_LIMIT = 400;

  var boot = {
    available: false,
    migrated: false,
    seededCleared: false,
    status: 0,
    error: "",
    dataCount: 0,
    auditCount: 0
  };

  var flushingData = null;
  var flushingAudit = null;
  var dataTimer = null;
  var auditTimer = null;

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (err) { /* no-op */ }
  }

  function isHttp() {
    return location.protocol === "http:" || location.protocol === "https:";
  }

  function cloudEnabled() {
    try { return localStorage.getItem(ENABLED_KEY) === "1"; } catch (err) { return false; }
  }

  function markEnabled() {
    try { localStorage.setItem(ENABLED_KEY, "1"); } catch (err) { /* no-op */ }
  }

  function readSession() {
    var session = null;
    try {
      var raw = sessionStorage.getItem(ADMIN_KEY);
      session = raw ? JSON.parse(raw) : null;
    } catch (err) {
      session = null;
    }
    if (!session || typeof session !== "object" || !session.token || !session.expiresAt) return null;
    if (Number(session.expiresAt) <= Date.now()) {
      clearSession();
      return null;
    }
    return session;
  }

  function clearSession() {
    try { sessionStorage.removeItem(ADMIN_KEY); } catch (err) { /* no-op */ }
  }

  function authHeaders() {
    var session = readSession();
    return session ? { Authorization: "Bearer " + session.token } : {};
  }

  function request(path, options) {
    options = options || {};
    var headers = Object.assign({ Accept: "application/json" }, authHeaders(), options.headers || {});
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    return fetch(API_ROOT + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      credentials: "same-origin",
      keepalive: !!options.keepalive
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        try { data = text ? JSON.parse(text) : {}; } catch (err) { data = {}; }
        if (!response.ok) {
          var error = new Error((data && data.error) || ("Workspace request failed (" + response.status + ")."));
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data;
      });
    });
  }

  function xhrJSON(method, path, body) {
    var xhr = new XMLHttpRequest();
    var headers = Object.assign({ Accept: "application/json" }, authHeaders());
    if (body !== undefined) headers["Content-Type"] = "application/json";
    try {
      xhr.open(method, API_ROOT + path, false);
      Object.keys(headers).forEach(function (name) { xhr.setRequestHeader(name, headers[name]); });
      xhr.send(body === undefined ? null : JSON.stringify(body));
    } catch (err) {
      return { ok: false, status: 0, error: String(err && err.message ? err.message : err), data: null };
    }
    var data = null;
    try { data = JSON.parse(xhr.responseText || "{}"); } catch (err) { data = null; }
    return {
      ok: xhr.status >= 200 && xhr.status < 300,
      status: xhr.status,
      data: data,
      error: (data && data.error) || (xhr.status ? "Workspace API returned " + xhr.status + "." : "Workspace API is unreachable.")
    };
  }

  /* ------------------------------------------------------------------------
     Local cache helpers
     ------------------------------------------------------------------------ */

  function contentKeys() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (key && key.indexOf(PREFIX) === 0) keys.push(key);
      }
    } catch (err) { /* no-op */ }
    return keys;
  }

  function snapshotLocal() {
    var data = {};
    var audit = { events: [] };
    contentKeys().forEach(function (fullKey) {
      var key = fullKey.slice(PREFIX.length);
      var value = readJSON(fullKey, undefined);
      if (value === undefined) return;
      if (key === "audit") {
        if (value && Array.isArray(value.events)) audit = value;
        return;
      }
      if (key === "seeded") return;
      data[key] = value;
    });
    return { data: data, audit: audit.events || [] };
  }

  function backupLocalOnce() {
    if (readJSON(PRE_CLOUD_KEY, null)) return;
    try { if (localStorage.getItem(HYDRATED_KEY) === "1") return; } catch (err) { /* no-op */ }
    var local = snapshotLocal();
    if (!Object.keys(local.data).length && !local.audit.length) return;
    writeJSON(PRE_CLOUD_KEY, {
      at: new Date().toISOString(),
      data: local.data,
      audit: local.audit
    });
  }

  function clearContentKeys() {
    contentKeys().forEach(removeKey);
  }

  function applyPayload(payload) {
    if (!payload || !payload.ok || !payload.data || typeof payload.data !== "object") return false;
    backupLocalOnce();
    clearContentKeys();
    Object.keys(payload.data).forEach(function (key) {
      if (!key || key === "audit" || key === "seeded") return;
      try { localStorage.setItem(PREFIX + key, JSON.stringify(payload.data[key])); } catch (err) { /* no-op */ }
    });
    var audit = payload.audit && Array.isArray(payload.audit.events)
      ? { events: payload.audit.events.slice(0, AUDIT_LIMIT) }
      : { events: [] };
    try { localStorage.setItem(PREFIX + "audit", JSON.stringify(audit)); } catch (err) { /* no-op */ }
    try { localStorage.setItem(HYDRATED_KEY, "1"); } catch (err) { /* no-op */ }
    markEnabled();
    return true;
  }

  /* ------------------------------------------------------------------------
     Queues
     ------------------------------------------------------------------------ */

  function dataItems(queue) {
    return Object.keys(queue || {}).map(function (key) {
      return { key: key, value: queue[key].value, at: queue[key].at };
    });
  }

  function flushQueuesSync() {
    var dataQueue = readJSON(DATA_QUEUE_KEY, null);
    if (dataQueue && Object.keys(dataQueue).length) {
      var dataItemsNow = dataItems(dataQueue).map(function (item) {
        return { key: item.key, value: item.value };
      });
      var dataResult = xhrJSON("PUT", "/data", { items: dataItemsNow });
      if (dataResult.ok) {
        var currentData = readJSON(DATA_QUEUE_KEY, {}) || {};
        Object.keys(dataQueue).forEach(function (key) {
          if (currentData[key] && currentData[key].at === dataQueue[key].at) delete currentData[key];
        });
        writeJSON(DATA_QUEUE_KEY, currentData);
        markEnabled();
      }
    }

    var auditQueue = readJSON(AUDIT_QUEUE_KEY, null);
    if (auditQueue && ((auditQueue.events && auditQueue.events.length) || (auditQueue.deleted && auditQueue.deleted.length))) {
      var auditResult = xhrJSON("POST", "/audit", {
        events: auditQueue.events || [],
        deleted: auditQueue.deleted || []
      });
      if (auditResult.ok) {
        writeJSON(AUDIT_QUEUE_KEY, { events: [], deleted: [], at: 0 });
        markEnabled();
      }
    }
  }

  function queueData(key, value) {
    if (!key || key === "audit" || key === "seeded") return;
    var queue = readJSON(DATA_QUEUE_KEY, {}) || {};
    queue[key] = { value: value === undefined ? null : value, at: Date.now() };
    writeJSON(DATA_QUEUE_KEY, queue);
  }

  function queueAudit(events, deleted) {
    var queue = readJSON(AUDIT_QUEUE_KEY, null) || { events: [], deleted: [], at: 0 };
    var eventMap = {};
    (Array.isArray(queue.events) ? queue.events : []).forEach(function (event) {
      if (event && event.id) eventMap[event.id] = event;
    });
    (Array.isArray(events) ? events : []).forEach(function (event) {
      if (event && event.id) eventMap[event.id] = event;
    });
    var deletedMap = {};
    (Array.isArray(queue.deleted) ? queue.deleted : []).concat(Array.isArray(deleted) ? deleted : []).forEach(function (id) {
      if (id) deletedMap[String(id)] = true;
    });
    var deletedIds = Object.keys(deletedMap);
    deletedIds.forEach(function (id) { delete eventMap[id]; });
    queue.events = Object.keys(eventMap).map(function (id) { return eventMap[id]; })
      .sort(function (left, right) { return String(right.at || "").localeCompare(String(left.at || "")); })
      .slice(0, AUDIT_LIMIT);
    queue.deleted = deletedIds.slice(-AUDIT_LIMIT);
    queue.at = Date.now();
    writeJSON(AUDIT_QUEUE_KEY, queue);
  }

  function scheduleDataFlush(delay) {
    clearTimeout(dataTimer);
    dataTimer = setTimeout(function () { flushData(); }, delay);
  }

  function scheduleAuditFlush(delay) {
    clearTimeout(auditTimer);
    auditTimer = setTimeout(function () { flushAudit(); }, delay);
  }

  function flushData(keepalive) {
    if (flushingData) return flushingData;
    var queue = readJSON(DATA_QUEUE_KEY, null);
    if (!queue || !Object.keys(queue).length) return Promise.resolve();
    var entries = dataItems(queue);
    var payload = entries.map(function (item) { return { key: item.key, value: item.value }; });
    flushingData = request("/data", {
      method: "PUT",
      body: { items: payload },
      keepalive: !!keepalive
    }).then(function () {
      var current = readJSON(DATA_QUEUE_KEY, {}) || {};
      entries.forEach(function (item) {
        if (current[item.key] && current[item.key].at === item.at) delete current[item.key];
      });
      writeJSON(DATA_QUEUE_KEY, current);
      markEnabled();
    }).catch(function (error) {
      if (error && error.status === 401) {
        var current = readJSON(DATA_QUEUE_KEY, {}) || {};
        if (current.admin) {
          delete current.admin;
          writeJSON(DATA_QUEUE_KEY, current);
        }
      }
      scheduleDataFlush(3000);
    }).then(function () {
      flushingData = null;
      var remaining = readJSON(DATA_QUEUE_KEY, null);
      if (remaining && Object.keys(remaining).length) scheduleDataFlush(3000);
    });
    return flushingData;
  }

  function flushAudit(keepalive) {
    if (flushingAudit) return flushingAudit;
    var queue = readJSON(AUDIT_QUEUE_KEY, null);
    if (!queue) return Promise.resolve();
    if (!Array.isArray(queue.events)) queue.events = [];
    if (!Array.isArray(queue.deleted)) queue.deleted = [];
    if (!queue.events.length && !queue.deleted.length) return Promise.resolve();
    var sentEvents = queue.events.slice();
    var sentDeleted = queue.deleted.slice();
    var at = queue.at;
    flushingAudit = request("/audit", {
      method: "POST",
      body: { events: sentEvents, deleted: sentDeleted },
      keepalive: !!keepalive
    }).then(function () {
      var current = readJSON(AUDIT_QUEUE_KEY, null) || { events: [], deleted: [], at: 0 };
      if (!Array.isArray(current.events)) current.events = [];
      if (!Array.isArray(current.deleted)) current.deleted = [];
      if (current.at === at) {
        writeJSON(AUDIT_QUEUE_KEY, { events: [], deleted: [], at: 0 });
      } else {
        var sentMap = {};
        sentEvents.forEach(function (event) { if (event && event.id) sentMap[event.id] = JSON.stringify(event); });
        var sentDeleteMap = {};
        sentDeleted.forEach(function (id) { sentDeleteMap[id] = true; });
        current.events = current.events.filter(function (event) {
          if (!event || !event.id) return false;
          var sent = sentMap[event.id];
          return sent === undefined || sent !== JSON.stringify(event);
        });
        current.deleted = current.deleted.filter(function (id) { return !sentDeleteMap[id]; });
        writeJSON(AUDIT_QUEUE_KEY, current);
      }
      markEnabled();
    }).catch(function () {
      scheduleAuditFlush(3000);
    }).then(function () {
      flushingAudit = null;
      var remaining = readJSON(AUDIT_QUEUE_KEY, null);
      if (remaining && ((Array.isArray(remaining.events) && remaining.events.length) ||
        (Array.isArray(remaining.deleted) && remaining.deleted.length))) {
        scheduleAuditFlush(3000);
      }
    });
    return flushingAudit;
  }

  function flushAll(keepalive) {
    return Promise.all([flushData(keepalive), flushAudit(keepalive)]);
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  function migrateLocal(local) {
    var items = [];
    Object.keys(local.data).forEach(function (key) {
      if (key === "admin" && !readSession()) return;
      items.push({ key: key, value: local.data[key] });
    });
    if (items.length) {
      var dataResult = xhrJSON("PUT", "/data", { items: items });
      if (!dataResult.ok) return false;
    }
    if (local.audit.length) {
      markEnabled();
      queueAudit(local.audit, []);
      scheduleAuditFlush(120);
    }
    return true;
  }

  function bootstrap() {
    if (!isHttp()) return;
    flushQueuesSync();
    var result = xhrJSON("GET", "/bootstrap?t=" + Date.now());
    boot.status = result.status;
    if (!result.ok) {
      boot.error = result.error || "Workspace API is unreachable.";
      return;
    }
    boot.available = true;
    markEnabled();
    var payload = result.data || {};
    if (!payload.data || typeof payload.data !== "object") {
      boot.error = "Workspace API returned an unexpected response.";
      return;
    }
    var remoteEvents = payload.audit && Array.isArray(payload.audit.events) ? payload.audit.events : [];
    var remoteEmpty = !Object.keys(payload.data).length && !remoteEvents.length;
    var hydrated = false;
    try { hydrated = localStorage.getItem(HYDRATED_KEY) === "1"; } catch (err) { hydrated = false; }

    if (!hydrated && remoteEmpty) {
      var local = snapshotLocal();
      var hadSeed = false;
      try { hadSeed = localStorage.getItem(PREFIX + "seeded") === "1"; } catch (err) { hadSeed = false; }

      if (hadSeed) {
        backupLocalOnce();
        clearContentKeys();
        try {
          localStorage.setItem(HYDRATED_KEY, "1");
          localStorage.setItem(ENABLED_KEY, "1");
        } catch (err) { /* no-op */ }
        boot.seededCleared = true;
        boot.dataCount = 0;
        boot.auditCount = 0;
        return;
      }

      if (Object.keys(local.data).length || local.audit.length) {
        if (migrateLocal(local)) {
          try { localStorage.setItem(HYDRATED_KEY, "1"); } catch (err) { /* no-op */ }
          boot.migrated = true;
          boot.dataCount = Object.keys(local.data).length;
          boot.auditCount = local.audit.length;
          return;
        }
        boot.error = "Local data could not be migrated yet. It has been kept and will retry.";
        return;
      }
    }

    if (applyPayload(payload)) {
      boot.dataCount = Object.keys(payload.data).length;
      boot.auditCount = remoteEvents.length;
    }
  }

  /* ------------------------------------------------------------------------
     Public bridge
     ------------------------------------------------------------------------ */

  function pushData(key, value) {
    if (!isHttp() || (!boot.available && !cloudEnabled())) return;
    queueData(key, value);
    scheduleDataFlush(220);
  }

  function pushAudit(events, deleted) {
    if (!isHttp() || (!boot.available && !cloudEnabled())) return;
    if (!Array.isArray(events)) return;
    queueAudit(events, deleted || []);
    scheduleAuditFlush(260);
  }

  function login(password) {
    return request("/admin/login", {
      method: "POST",
      body: { password: String(password == null ? "" : password) }
    }).then(function (data) {
      if (!data || !data.ok || !data.token) throw new Error("Admin login did not return a session.");
      try {
        sessionStorage.setItem(ADMIN_KEY, JSON.stringify({
          token: data.token,
          expiresAt: data.expiresAt
        }));
      } catch (err) { /* no-op */ }
      markEnabled();
      return data;
    });
  }

  function verify() {
    var session = readSession();
    if (!session) return Promise.resolve(false);
    return request("/admin/session").then(function (data) {
      return !!(data && data.ok);
    }).catch(function (error) {
      if (error && error.status === 401) clearSession();
      return false;
    });
  }

  function syncNow() {
    if (!isHttp()) return Promise.reject(new Error("Cloud sync is only available on the hosted site."));
    return flushAll().then(function () {
      return request("/bootstrap?t=" + Date.now());
    }).then(function (payload) {
      if (!applyPayload(payload)) throw new Error("The workspace returned an unexpected response.");
      return true;
    });
  }

  window.ZCloud = {
    boot: boot,
    available: function () { return boot.available; },
    pushData: pushData,
    pushAudit: pushAudit,
    flush: flushAll,
    login: login,
    verify: verify,
    session: readSession,
    clearSession: clearSession,
    syncNow: syncNow,
    request: request,
    precloudSnapshot: function () { return readJSON(PRE_CLOUD_KEY, null); }
  };

  window.addEventListener("online", function () { flushAll(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flushAll(true);
  });
  window.addEventListener("pagehide", function () { flushAll(true); });

  bootstrap();
})();
