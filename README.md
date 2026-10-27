# Zone

A private set of everyday tools — diary, lists, habits, notes, money, passbook, shared expenses, mileage, watchlist, links, and subscriptions — with an admin review desk. Static HTML, CSS, and JavaScript on **Cloudflare Pages**, with **Pages Functions** and a **Cloudflare D1** database.

The UI keeps its existing local-first feel: every page reads and writes a browser cache synchronously, then mirrors changes to D1. The admin password is a Pages secret (`ADMIN_PASSWORD`), never a value in the source code.

## What changed for hosting

- `assets/js/cloud.js` hydrates the local cache from `/api/bootstrap` before the page scripts run. It also queues writes while offline and flushes them to D1.
- `functions/api/[[path]].js` is the small JSON API: bootstrap, data writes, audit writes, admin login, and session verification.
- D1 stores one row per workspace key (`zone_data`) and one row per audit event (`zone_audit`). The tables are created automatically on first use.
- The old demo seed has been removed. A fresh deployment starts empty.
- The old hardcoded demo passcode has been removed. Admin login is checked server-side against `ADMIN_PASSWORD` and returns a 12-hour signed session token.
- All existing localStorage keys, record shapes, calculation logic, CSV exports, and backup formats are unchanged. `zone.v1.audit` remains the audit format; it is now mirrored to D1.

## Cloudflare Pages setup (dashboard only)

No `wrangler.toml` is required. Bindings and secrets are configured in the Pages project.

### 1. Connect the repository

1. Open **Cloudflare dashboard → Workers & Pages → Create application → Pages → Connect to Git**.
2. Select the GitHub repository **`zone`**.
3. Project name: **`zone`**.
4. Build settings:
   - **Framework preset:** None
   - **Build command:** leave empty
   - **Build output directory:** `.` (a single dot — the repository root)
   - **Root directory:** leave empty
5. Click **Save and Deploy**. The first deploy serves the static site. The API will not work until the D1 binding is added.

### 2. Create the D1 database

1. Open **Cloudflare dashboard → Storage & Databases → D1 SQL Database → Create**.
2. Name it **`zone-db`** (any name works; the Pages binding variable must be `DB`).
3. Leave the default location unless you have a reason to change it.

The Pages Function creates its tables automatically on the first request. If you prefer to create them yourself, open the D1 database's **Console** and run the SQL in [`d1/schema.sql`](d1/schema.sql).

### 3. Bind D1 to the Pages project

1. Open the Pages project → **Settings → Functions → D1 database bindings**.
2. Click **Add binding**.
3. **Variable name:** `DB`
4. **D1 database:** `zone-db`
5. Save. If the dashboard offers separate Production and Preview settings, add the binding to both.

### 4. Add the admin password as a secret

1. Open the Pages project → **Settings → Environment variables** (older dashboards call this **Variables and Secrets**).
2. Add a variable:
   - **Name:** `ADMIN_PASSWORD`
   - **Value:** a long, unique password of your choosing
   - **Type:** Secret / Encrypt
3. Save it for **Production** (and **Preview** if you use preview deployments).

`ADMIN_PASSWORD` is read only inside the Pages Function. It is never shipped to the browser and there is no fallback password.

### 5. Redeploy so bindings and secrets apply

Pages applies bindings and secrets to a **new deployment**. Either:

- Open **Deployments**, open the latest deployment's menu, and choose **Retry deployment**, or
- Push any new commit to the repository.

### 6. Verify the deployment

Open:

```text
https://<project>.pages.dev/api/health
```

A healthy deployment returns:

```json
{ "ok": true, "db": true, "schema": true, "adminSecretSet": true }
```

If `db` is false, the `DB` binding is missing or points at the wrong database. If `adminSecretSet` is false, the `ADMIN_PASSWORD` secret has not been applied to the active deployment.

Then open `https://<project>.pages.dev/admin.html` and enter the password you configured.

## How the data works

- D1 is the source of truth for the hosted site. `localStorage` is a fast cache so the existing synchronous page scripts keep working unchanged.
- On page load, `/api/bootstrap` returns every workspace key and the latest 400 audit events. A queued local write is flushed before the bootstrap request.
- Every `Z.store.set` / `Z.store.remove` writes the browser cache immediately, then queues a small `PUT /api/data` request.
- Audit events are written by the existing audit engine and mirrored with `POST /api/audit`.
- Admin approvals, rollbacks, reapplies, imports, and policy changes update the same data and audit records, so the trail stays consistent across devices.
- The previous app version's demo seed is detected by the old `zone.v1.seeded` flag. If a browser still has the seeded demo and D1 is empty, that local demo copy is cleared on first hydration. Non-demo local data is migrated into D1 on first hydration.
- A one-time copy of pre-cloud browser data is kept under `zone.cloud.precloud` on that device. It is not synced.
- Existing backups still work: **Admin → Setup → Export backup** and **Import a backup**. Imports are logged as approved admin transactions and are pushed to D1 before the page reloads.
- Mileage keeps its backdated fill chaining, dark instrument-panel design, local currency preference, CSV export, and backup dialog. Its records are ordinary D1-backed workspace keys.

## Security notes

- Admin access is real server-side authentication: the password is compared to the Pages secret, and the returned token is an HMAC-signed 12-hour session.
- The tool API (`/api/data`, `/api/bootstrap`, `/api/audit`) is intentionally unauthenticated, matching the original single-user local-first design. **Anyone who can reach the site URL can read or change the workspace data.** For a private diary or money workspace, put the site behind **Cloudflare Access** (Zero Trust), ideally on a custom domain, or add your own access layer before sharing the URL.
- D1 and Pages secrets are configured in the Cloudflare dashboard, not in this repository.
- Never commit `.dev.vars` or `.env` files. They are ignored by `.gitignore`.

## Local preview

The plain static UI can still be opened with any static server:

```sh
python -m http.server 8765
```

The Cloudflare API and admin login require Pages Functions. To run the full stack locally, use Wrangler with a local D1 binding and a temporary admin secret (do not commit these):

```sh
npx wrangler pages dev . --d1=DB=zone-db --binding ADMIN_PASSWORD=local-test-password
```

The deployed site does **not** use a `wrangler.toml`; the Pages dashboard bindings are the production configuration.

## Pages

| Page | URL |
| --- | --- |
| Overview | `index.html` |
| Diary | `diary.html` |
| Lists | `lists.html` |
| Habits | `habits.html` |
| Notes | `notes.html` |
| Money | `money.html` |
| Passbook | `passbook.html` |
| Split | `split.html` |
| Mileage | `mileage.html` |
| Watchlist | `watchlist.html` |
| Links | `links.html` |
| Subscriptions | `subscriptions.html` |
| Admin | `admin.html` |
| Settings | `settings.html` |

## Files

```text
assets/
  css/                 design tokens, page layouts, admin console
  js/cloud.js          D1 hydration, write queues, admin session bridge
  js/core.js           storage, audit engine, shell, theme, palette, dialogs
  js/pages/*.js        one script per tool
functions/api/
  [[path]].js          Pages Functions JSON API
d1/schema.sql          optional manual D1 schema
_headers               basic security headers
_routes.json           routes /api/* through Pages Functions
*.html                 one page per tool, plus admin.html
```

No demo records are included. The workspace is yours from the first load.
