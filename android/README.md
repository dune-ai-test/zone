# Zone for Android

A native Android companion for **Zone**, the personal-utilities desk. It is a
full-screen rewrite of the 41 HTML designs in `../html/` and talks to the same
Cloudflare Pages Functions + D1 workspace the web app already uses.

The app is deliberately local-first: every screen reads and writes a Room cache
immediately, then the sync engine pushes the changed JSON documents to D1 and
pulls the shared snapshot back when a network is available.

---

## What is inside

- **Kotlin + Jetpack Compose + Material 3**, one activity, one navigation graph.
- **Room** cache that stores the same `zone.v1.*` JSON documents as the web app.
- **DataStore** preferences for the workspace URL, admin session and last sync.
- **Cloudflare Pages Functions API** client for `/api/bootstrap`, `/api/data`,
  `/api/audit`, `/api/admin/login` and `/api/admin/session`.
- **WorkManager** periodic sync (15 minutes) plus immediate sync after writes.
- **Audit trail** with the web app's approve / reject-and-restore flow.
- Warm-paper visual language: serif display, sans prose, mono system labels,
  light/dark/system themes, and no bundled font files.

### Requirements

| Tool | Version |
| --- | --- |
| Android Studio | Ladybug or newer (or a command-line SDK) |
| JDK | 17 |
| Android SDK | API 35 |
| Gradle | 8.9 (wrapper included) |
| Min / target SDK | 26 / 35 |

The wrapper (`gradlew`, `gradlew.bat`, `gradle/wrapper/gradle-wrapper.jar`) is
checked in so Android Studio can sync without extra setup. A JDK 17 and the
Android SDK are still required.

### Build

From this `android/` directory:

```powershell
.\gradlew.bat assembleDebug
```

The debug APK lands in `app/build/outputs/apk/debug/app-debug.apk`. No build is
run in this repository checkout; the source is ready for Android Studio.

---

## Connect the Cloudflare workspace

The app starts **local-only** with an empty workspace URL.

1. Deploy the Zone Pages project with its D1 binding and `functions/api` routes.
2. Open **Settings → Workspace** in the app.
3. Enter the Pages origin, for example `https://zone.example.pages.dev`.
   The app normalizes the value and appends `/api` when needed. A full `/api`
   URL is also accepted.
4. Tap **Save workspace**, then **Sync now**.
5. For the back office, open **Settings → Back office → Unlock the desk** and
   enter the password configured in the Pages project as `ADMIN_PASSWORD`.

The API contract expected by the app is the existing one in
`../functions/api/[[path]].js`:

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/health` | D1/schema readiness |
| GET | `/api/bootstrap` | `{ ok, data, audit: { events } }` |
| PUT | `/api/data` | `{ items: [{ key, value }] }`; `null` deletes |
| POST | `/api/audit` | push events / queued audit deletions |
| POST | `/api/admin/login` | `{ password }` → `{ token, expiresAt }` |
| GET | `/api/admin/session` | verify the bearer session |

Workspace documents use the same keys as the web app: `diary`, `lists`,
`habits`, `notes`, `money`, `passbook`, `split`, `trips`, `vehicles`,
`mileage_currency`, `watchlist`, `links`, `linksView`, `subscriptions`,
`settings`, `admin` and `audit`. This is what makes the Android app, the web
app and D1 interchangeable.

### Offline and conflict rules

- Every edit writes to Room with `dirty = 1` and refreshes the UI from the
  local flow. There is no network wait in the editor.
- The sync engine pushes dirty documents first, in this order:
  `diary → lists → habits → notes → money → passbook → split → mileage →
  watchlist → subscriptions → links → settings → admin`.
- On a pull, **sections changed locally while offline keep the local value**.
  Clean sections follow the D1 snapshot. Dirty writes are retried next sync.
- Audit events queue locally too. They are uploaded with the same "old value"
  patches the web app uses, so **Reject & restore** can write the previous
  document back.
- Offline, failed or unconfigured states are surfaced in Settings; nothing is
  silently dropped.

### Backups

**Settings → Backups** can share the whole workspace as one JSON document and
restore matching sections from the clipboard. The backup shape is:

```json
{
  "app": "Zone",
  "version": 1,
  "exportedAt": "2026-11-15T00:00:00Z",
  "data": { "diary": [], "lists": [], "...": "..." }
}
```

Restores skip the audit trail and leave local changes marked dirty for the next
sync.

---

## Screen map

Every HTML design page is represented by a Compose destination. Root tabs are
pushed with saved state; detail and editor screens sit in the same graph.

| HTML design | Android destination | Route |
| --- | --- | --- |
| 1 — Home | `HomeScreen` | `home` |
| 2 — Personal | `PersonalScreen` | `personal` |
| 3 — Diary | `DiaryListScreen` | `diary` |
| 3a — Write | `DiaryEditorScreen` | `diary/new`, `diary/edit/{id}` |
| 3b — Entry | `DiaryReaderScreen` | `diary/read/{id}` |
| 4 — Lists | `ListsScreen` | `lists` |
| 4a — New List | `ListNewScreen` | `lists/new` |
| 4b — Goa Packing | `ListDetailScreen` | `lists/detail/{id}` |
| 5 — Habits | `HabitsScreen` | `habits` |
| 5a — New Habit | `HabitNewScreen` | `habits/new` |
| 5b — Morning Walk | `HabitDetailScreen` | `habits/detail/{id}` |
| 6 — Notes | `NotesScreen` | `notes` |
| 6a — New Note | `NoteEditorScreen` | `notes/new`, `notes/edit/{id}` |
| 6b — Reader | `NoteReaderScreen` | `notes/read/{id}` |
| 7 — Money | `MoneyHubScreen` | `money` |
| 7a — New Transaction | `TxnEditorScreen` | `money/txn/new`, `money/txn/edit/{id}` |
| 7b — Where It Went | `SpendingScreen` | `money/spending` |
| 8 — Ledger | `LedgerScreen` | `money/ledger` |
| 9 — Passbook | `PassbookScreen` | `passbook` |
| 9a — Add Entry | `PassbookAddScreen` | `passbook/add?account={account}` |
| 9b — Statement | `AccountStatementScreen` | `passbook/account/{id}` |
| 10 — Split | `SplitScreen` | `split` |
| 10a — Start a Table | `SplitNewScreen` | `split/new` |
| 10b — Goa in February | `SplitDetailScreen` | `split/detail/{id}` |
| 11 — Mileage | `MileageScreen` | `mileage` |
| 11a — Log a Fill | `MileageNewScreen` | `mileage/new?vehicle={vehicle}` |
| 11b — Swift | `VehicleScreen` | `mileage/vehicle/{name}` |
| 12 — Library | `LibraryScreen` | `library` |
| 13 — Watchlist | `WatchlistScreen` | `watchlist` |
| 13a — A New Arrival | `WatchFormScreen` | `watchlist/new?id={id}` |
| 13b — The Bear | `WatchDetailScreen` | `watchlist/detail/{id}` |
| 14 — Subscriptions | `SubscriptionsScreen` | `subscriptions` |
| 14a — Add a Subscription | `SubscriptionFormScreen` | `subscriptions/new?id={id}` |
| 14b — The Calendar | `SubscriptionCalendarScreen` | `subscriptions/calendar` |
| 15 — Links | `LinksScreen` | `links` |
| 15a — A Good Corner | `LinkFormScreen` | `links/new?id={id}` |
| 15b — Uses of Uselessness | `LinkDetailScreen` | `links/detail/{id}` |
| 16 — Settings | `SettingsScreen` | `settings` |
| 17 — Admin | `AdminScreen` | `admin` |
| 17a — Unlock the Desk | `UnlockScreen` | `unlock` |
| 17b — Activity Trail | `ActivityScreen` | `activity` |

Five root tabs: **Home · Personal · Money · Library · Settings**. Personal,
Money and Library are hubs that open their tool screens; every screen has a
back path to the hub and the shared snackbar.

---

## Project layout

```
android/
  app/src/main/java/com/zone/desk/
    MainActivity.kt              single Compose activity
    ZoneApplication.kt           manual DI container + sync bootstrap
    data/
      model/Models.kt            serializable workspace records and API DTOs
      local/ZoneDatabase.kt      Room entities/DAOs for cache + audit
      remote/ZoneApi.kt          OkHttp client for the Pages API
      repo/WorkspaceRepository.kt local reads/writes, audit, restore
      sync/ZoneSync.kt           push/pull engine and conflict rule
      sync/ZoneSyncWorker.kt     WorkManager periodic/immediate sync
      prefs/ZonePreferences.kt   DataStore workspace + admin session
      audit/AuditEngine.kt       web-compatible audit patches
    domain/
      Summaries.kt               statistics and derived values
      ListTemplates.kt           list starter templates
    ui/
      ZoneApp.kt                 NavHost and root-tab navigation
      ZoneViewModel.kt           shared state and every workspace action
      navigation/Routes.kt       routes and safe argument helpers
      components/                shared chrome, fields, rows, charts
      theme/Theme.kt             palette, type, light/dark schemes
      screens/                   41-design screen implementations
  gradle/wrapper/                Gradle 8.9 wrapper
```

### Notes

- Only platform fonts (serif/sans/mono) are used; no font assets are bundled.
- Ids are generated locally with the `ZoneIds` helper. Dates are `YYYY-MM-DD`.
- The Split tool treats the member named `You` as the personal net; settlement
  entries are expenses with `category = "settlement"`.
- Mileage valid fills require distance, price and paid all greater than zero;
  litres and mileage are derived, never stored separately.
- Subscription monthly normalization: yearly ÷ 12, weekly × 52 ÷ 12.
- `local.properties` is intentionally absent; Android Studio creates it with
  your SDK path.
- The reference HTML designs in `../html/` are ignored by git; `android/` is the
  application source of truth.

### Debug builds from GitHub Actions

`.github/workflows/android-debug.yml` builds the debug APK on every push to an
`android-app-*` branch and can also be started manually. It stages the APK as
`Zone-debug.apk` and publishes it directly to the pre-release
`android-debug-latest` on the repository's Releases page. No Actions artifact
upload is used, and no local Android build is required.
