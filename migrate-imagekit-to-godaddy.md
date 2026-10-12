 # Migration: ImageKit → GoDaddy FTP (`hamptworthstays.com/uploads`)

> Companion to `asset-storage-audit.md` (§6.4–6.5 hold the hosting evidence).
> This file is the **execution spec + runbook**. Source code was changed per this spec in build mode;
> secret values are never stored in this repo (placeholders only).

## 0. Frozen decisions (locked with account holder)

| # | Decision | Value |
|---|---|---|
| 1 | Serving base | `https://hamptworthstays.com/uploads` (test file live-verified over HTTPS) |
| 2 | Transport | FTP with explicit TLS (FTPS-first, port 21). `basic-ftp` (only new dep; no Sharp) |
| 3 | FTP scope | Scoped account `hamptworthStay` jailed to `public_html/hamptworthstays.com/uploads` (FTP root = uploads/) |
| 4 | Asset scope | Media library **+** user avatars |
| 5 | Old files | Full backfill to GoDaddy, then decommission ImageKit |
| 6 | Cutover style | `STORAGE_PROVIDER` env switch (`imagekit` \| `ftp`, default `imagekit`) → zero-risk deploy, then config flip. Deletes branch on the **row's** `storageProvider`, never the global switch (coexistence-safe) |
| 7 | Credentials | Temp FTP credential shared in chat for testing only; **rotate after Phase 3 green** (Phase 4 gate). Never committed |

## 1. Key scheme (FTP-root relative; root-jail enforced in code)

- Media: `media/<yyyy>/<mm>/<uuid>-<slug>.<ext>`
- Avatars: `avatars/<userId>-<ts>-<uuid>.<ext>`
- Public URL = `ASSETS_BASE_URL + "/" + key`
- Extension derived from validated MIME (not the client filename):
  `image/jpeg→.jpg, image/png→.png, image/webp→.webp, image/avif→.avif, video/mp4→.mp4, video/webm→.webm`
- Jail rule: key must match `^(media|avatars)/[A-Za-z0-9._/-]+$`, no `..`, no backslash, no leading `/`.
  Violation throws before any FTP command (mandatory — the FTP account has full home access).

## 2. Environment

| Var | Example | Notes |
|---|---|---|
| `STORAGE_PROVIDER` | `ftp` | `imagekit` (default) keeps old behaviour; `ftp` cuts over |
| `GODADDY_FTP_HOST` | FTP host from cPanel → *Configure FTP Client* | Not the website URL |
| `GODADDY_FTP_PORT` | `21` | |
| `GODADDY_FTP_USER` | `hamptworthStay` | Scoped, jailed to `uploads/` |
| `GODADDY_FTP_PASSWORD` | *(Render/cPanel env only — never in git)* | Temp value rotates in Phase 4 |
| `GODADDY_FTP_SECURE` | `true` | Explicit TLS; `false` only for debugging |
| `ASSETS_BASE_URL` | `https://hamptworthstays.com/uploads` | No trailing slash (code tolerates one) |

Boot validation: `STORAGE_PROVIDER=ftp` **requires** HOST/USER/PASSWORD/ASSETS_BASE_URL or the
process fails fast with a clear message. `IMAGEKIT_*` stay until Phase 4.

## 3. Phase 1 — implementation checklist

- [x] `server/package.json` — add `basic-ftp`
- [x] `server/src/config/env.ts` — 6 new vars + fail-fast check
- [x] NEW `server/src/integrations/storage/storage-keys.ts` — pure key builders, jail assert, URL join
- [x] NEW `server/src/integrations/storage/godaddy-storage.ts` — FTPS upload/remove/verify
- [x] `server/src/modules/media/media.service.ts` — dual-driver upload/delete, DB-fail→FTP-cleanup,
      extended ref-check (pages/blogs/offers **+ roomTypes/settings/amenities**)
- [x] `server/src/integrations/imagekit/imagekit.service.ts` — avatar dual-driver (same signatures,
      `auth.service.ts` untouched except provider-aware old-file cleanup)
- [x] `server/src/modules/users/user.repository.ts` — `findUserDocById` selects `+avatarFileId`
      (fixes latent bug: replaced avatars were never cleaned up because `select:false` hid the field)
- [x] Schemas (additive only): `Media.storageProvider/legacyUrl/legacyStorageKey`,
      `User.avatarStorageProvider/legacyAvatarUrl/legacyAvatarFileId` (defaults = `imagekit`)
- [x] `server/scripts/migrate-media-to-godaddy.ts` — idempotent backfill (dry-run default)
- [x] `server/scripts/bulk-media-replace.ts` — DO-NOT-RUN warning header (destructive by design)
- [x] `admin/.../ckeditor-upload-adapter.ts` — comment fix (no functional change)
- [x] `server/.env.example`, `server/.env.production.example` — new vars (placeholders)
- [x] NEW `server/tests/storage-keys.test.ts` — `bun test` green; `tsc --noEmit` + `oxlint` clean

API contract unchanged: same routes, same `{ id, url }` shapes, same error codes
(`502 MEDIA_UPLOAD_FAILED`, `409 MEDIA_IN_USE`). Admin/client need no changes.
`width/height` are `null` for FTP-stored files (schema already allows it; no Sharp).

## 4. Phase 2 — backfill runbook (staging first, then prod; backups first)

```bash
# 0. Backups:
#    - DB: bun run backup:db (dumps canonical EJSON to server/backups/backup-<ts>/)
#    - Restore drill: bun run restore:db [--apply] [--drop]
#    - Web files: GoDaddy cPanel Backup (web files). Record backup references.
# 1. Inventory (no writes):
bun run scripts/migrate-media-to-godaddy.ts --kind all
# 2. Dry-run first 5 media rows:
bun run scripts/migrate-media-to-godaddy.ts --kind media --limit 5
#    → verify each new https URL loads in a browser, old ik.* URL still untouched.
# 3. Apply in batches (script skips rows already on local → safe to re-run):
bun run scripts/migrate-media-to-godaddy.ts --kind media --apply --limit 50
bun run scripts/migrate-media-to-godaddy.ts --kind avatars --apply
# 4. RTE HTML rewrite (uses url-map.json written by the script; per-doc logged, review diff):
bun run scripts/migrate-media-to-godaddy.ts --kind html --apply --limit 20
# 5. Re-run with no --limit until counts read 0 remaining.
```

Cutover (only after backfill + acceptance green): set `STORAGE_PROVIDER=ftp` on the API host,
restart, upload one probe image via admin, confirm URL origin is GoDaddy. Rollback = flip back to
`imagekit` (old files untouched until Phase 4) + rows carry `legacyUrl` for per-row revert.

## 5. Phase 3 — acceptance (all must pass before Phase 4)

1. Admin upload (image + video + avatar) → `201` with GoDaddy URL.
2. Each new URL loads over HTTPS with correct `Content-Type` (browser check).
3. Mongo row: `storageProvider:"local"`, `storageKey` = relative key, `size` matches bytes.
4. Update (alt/caption/folder) + in-place binary replace + delete; `409` while referenced.
5. Fault test (staging): DB write killed → no orphan file on FTP; error logged.
6. Old `ik.*` + new local URLs co-live during migration; business pages (rooms, CMS, offers,
   amenities, settings logo/favicon, RTE renders) show zero new 404s.
7. Negative tests: 401 unauthenticated, 403 non-admin, bad MIME → 400, oversize → 400,
   `../../` filename contained, upload flood rate-limited.
8. `grep -rn "getImageKit" server/src` shows only the coexistence branch + scripts.

## 6. Phase 4 — decommission (only after §5 all-green)

1. Delete ImageKit files (per migrated `legacyStorageKey`), then close/cancel the account.
2. Remove `IMAGEKIT_*` from all envs; uninstall `imagekit`; delete `src/integrations/imagekit/`;
   collapse the provider branch (FTP becomes the only path).
3. **Rotate the FTP password** (cPanel → FTP Accounts) + update API env + restart + probe upload.
4. Update `asset-storage-audit.md`, `FLOW.md`, `PROJECT_STATUS.md`; final grep gate.

## 7. Risks & mitigations

- Main-FTP credential in backend → root-jail in code + rotation gate + scoped account already jailed.
- Plain-FTP fallback (`SECURE=false`) → debugging only; production stays `true`.
- Partial failure (FTP ok, DB fail) → service deletes the just-uploaded file, throws; sweeper via
  backfill script's orphan report (`--kind orphans`, future if needed).
- Multi-instance divergence → N/A: single Render instance + FTP is the shared store.
- WordPress root `.htaccess` → verified servable by the live favicon test; re-verify if WP rules change.
