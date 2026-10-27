/* ==========================================================================
   Zone — Cloudflare Pages Functions API
   D1 binding: DB (configured in Pages → Settings → Functions)
   Admin secret: ADMIN_PASSWORD (configured in Pages → Settings → Variables)
   ========================================================================== */

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff"
};

const AUDIT_LIMIT = 400;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_VALUE_BYTES = 512 * 1024;
const RESERVED_KEYS = new Set(["audit", "seeded", "cloud", "precloud"]);

let schemaPromise = null;

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 400;
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: JSON_HEADERS
  });
}

function pathSegments(context) {
  if (context.params && Array.isArray(context.params.path)) return context.params.path;
  if (context.params && typeof context.params.path === "string") {
    return context.params.path.split("/").filter(Boolean);
  }
  const pathname = new URL(context.request.url).pathname;
  return pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
}

async function readJSON(request) {
  const text = await request.text();
  if (!text) return {};
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new ApiError("That request is too large.", 413);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new ApiError("That request was not valid JSON.", 400);
  }
}

async function ensureSchema(DB) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await DB.prepare(
        "CREATE TABLE IF NOT EXISTS zone_data (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)"
      ).run();
      await DB.prepare(
        "CREATE TABLE IF NOT EXISTS zone_audit (id TEXT PRIMARY KEY, event TEXT NOT NULL, at TEXT NOT NULL, updated_at TEXT NOT NULL)"
      ).run();
      await DB.prepare(
        "CREATE INDEX IF NOT EXISTS zone_audit_at ON zone_audit(at DESC)"
      ).run();
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

function requireDB(env) {
  if (!env || !env.DB) {
    throw new ApiError('D1 binding "DB" is not configured. Add it in Cloudflare Pages → Settings → Functions.', 500);
  }
  return env.DB;
}

function requireAdminSecret(env) {
  if (!env || !env.ADMIN_PASSWORD) {
    throw new ApiError("ADMIN_PASSWORD is not configured. Add an encrypted variable in Cloudflare Pages → Settings.", 503);
  }
  return String(env.ADMIN_PASSWORD);
}

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const padded = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "===".slice((padded.length + 3) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function mintToken(secret) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("zone-admin:" + expiresAt));
  return { token: expiresAt + "." + toBase64Url(signature), expiresAt };
}

async function verifyToken(request, env) {
  const secret = requireAdminSecret(env);
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return { ok: false, reason: "missing" };
  const parts = match[1].split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const expiresAt = Number(parts[0]);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return { ok: false, reason: "expired" };
  let signature;
  try {
    signature = fromBase64Url(parts[1]);
  } catch (err) {
    return { ok: false, reason: "malformed" };
  }
  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode("zone-admin:" + expiresAt)
  );
  return valid ? { ok: true, expiresAt } : { ok: false, reason: "invalid" };
}

async function requireAdmin(request, env) {
  requireAdminSecret(env);
  const result = await verifyToken(request, env);
  if (!result.ok) throw new ApiError("Your admin session has expired. Unlock the desk again.", 401);
  return result;
}

function safeEqual(left, right) {
  const a = new TextEncoder().encode(String(left));
  const b = new TextEncoder().encode(String(right));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function validKey(key) {
  return typeof key === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(key) && !RESERVED_KEYS.has(key);
}

function validAuditEvent(event) {
  return !!(event && typeof event === "object" && typeof event.id === "string" && event.id &&
    typeof event.at === "string" && event.at && Array.isArray(event.patches));
}

async function health(env) {
  const DB = requireDB(env);
  await ensureSchema(DB);
  await DB.prepare("SELECT 1 AS ok").first();
  return json({
    ok: true,
    db: true,
    schema: true,
    adminSecretSet: !!env.ADMIN_PASSWORD
  });
}

async function bootstrap(env) {
  const DB = requireDB(env);
  await ensureSchema(DB);
  const results = await DB.batch([
    DB.prepare("SELECT key, value FROM zone_data ORDER BY key"),
    DB.prepare("SELECT event FROM zone_audit ORDER BY at DESC LIMIT ?").bind(AUDIT_LIMIT)
  ]);
  const data = {};
  const dataRows = (results && results[0] && results[0].results) || [];
  for (const row of dataRows) {
    if (!row || !validKey(row.key)) continue;
    try { data[row.key] = JSON.parse(row.value); } catch (err) { /* skip corrupt rows */ }
  }
  const auditRows = (results && results[1] && results[1].results) || [];
  const events = auditRows.map((row) => {
    try { return JSON.parse(row.event); } catch (err) { return null; }
  }).filter(Boolean);
  return json({ ok: true, data, audit: { events } });
}

async function saveData(request, env) {
  const DB = requireDB(env);
  await ensureSchema(DB);
  const body = await readJSON(request);
  const items = Array.isArray(body.items)
    ? body.items
    : (body && typeof body.key === "string" ? [{ key: body.key, value: body.value }] : []);
  if (!items.length) throw new ApiError("No workspace items were supplied.", 400);
  if (items.length > 200) throw new ApiError("Too many workspace items in one request.", 413);

  let adminChecked = false;
  const statements = [];
  const now = new Date().toISOString();

  for (const item of items) {
    if (!item || !validKey(item.key)) {
      throw new ApiError("That workspace key is not valid.", 400);
    }
    if (item.key === "admin" && !adminChecked) {
      await requireAdmin(request, env);
      adminChecked = true;
    }
    if (item.value === null || item.value === undefined) {
      statements.push(DB.prepare("DELETE FROM zone_data WHERE key = ?").bind(item.key));
      continue;
    }
    const value = JSON.stringify(item.value);
    if (new TextEncoder().encode(value).length > MAX_VALUE_BYTES) {
      throw new ApiError("One workspace section is too large to sync.", 413);
    }
    statements.push(
      DB.prepare(
        "INSERT INTO zone_data (key, value, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      ).bind(item.key, value, now)
    );
  }

  if (statements.length) await DB.batch(statements);
  return json({ ok: true, saved: statements.length });
}

async function saveAudit(request, env) {
  const DB = requireDB(env);
  await ensureSchema(DB);
  const body = await readJSON(request);
  const events = Array.isArray(body.events) ? body.events.filter(validAuditEvent).slice(0, AUDIT_LIMIT) : [];
  const deleted = Array.isArray(body.deleted)
    ? body.deleted.filter((id) => typeof id === "string" && id).slice(0, AUDIT_LIMIT)
    : [];

  if (deleted.length) await requireAdmin(request, env);

  const statements = [];
  const now = new Date().toISOString();
  for (const id of deleted) {
    statements.push(DB.prepare("DELETE FROM zone_audit WHERE id = ?").bind(id));
  }
  for (const event of events) {
    const text = JSON.stringify(event);
    if (new TextEncoder().encode(text).length > MAX_VALUE_BYTES) {
      throw new ApiError("One audit event is too large to sync.", 413);
    }
    statements.push(
      DB.prepare(
        "INSERT INTO zone_audit (id, event, at, updated_at) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET event = excluded.event, at = excluded.at, updated_at = excluded.updated_at"
      ).bind(event.id, text, String(event.at), now)
    );
  }

  if (statements.length) await DB.batch(statements);
  await DB.prepare(
    "DELETE FROM zone_audit WHERE id NOT IN (SELECT id FROM zone_audit ORDER BY at DESC LIMIT ?)"
  ).bind(AUDIT_LIMIT).run();

  return json({ ok: true, saved: events.length, deleted: deleted.length });
}

async function login(request, env) {
  const secret = requireAdminSecret(env);
  const body = await readJSON(request);
  const password = String(body.password == null ? "" : body.password);
  if (!safeEqual(password, secret)) {
    return json({ ok: false, error: "That admin password did not match." }, 401);
  }
  const session = await mintToken(secret);
  return json({ ok: true, token: session.token, expiresAt: session.expiresAt });
}

async function session(request, env) {
  const result = await requireAdmin(request, env);
  return json({ ok: true, expiresAt: result.expiresAt });
}

export async function onRequest(context) {
  const { request, env } = context;
  const route = pathSegments(context).join("/");
  const method = request.method.toUpperCase();

  try {
    if (route === "health" && method === "GET") return await health(env);
    if (route === "bootstrap" && method === "GET") return await bootstrap(env);
    if (route === "data" && method === "PUT") return await saveData(request, env);
    if (route === "audit" && method === "POST") return await saveAudit(request, env);
    if (route === "admin/login" && method === "POST") return await login(request, env);
    if (route === "admin/session" && method === "GET") return await session(request, env);
    return json({ ok: false, error: "Not found." }, 404);
  } catch (err) {
    if (err instanceof ApiError) return json({ ok: false, error: err.message }, err.status);
    console.error("Zone API error", err);
    return json({ ok: false, error: "The workspace API hit an unexpected error. Check the D1 binding and function logs." }, 500);
  }
}
