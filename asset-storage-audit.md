# Asset Storage Audit — ImageKit Removal, Replacement Architecture & Migration Strategy

> **Scope:** This report audits the actual ImageKit integration in this repository and plans its
> removal in favour of same-host local file storage served by the existing Express backend.
> **Constraint honoured:** No application source code was modified. Only this Markdown report
> was created/updated. No credentials or secret env values are exposed.
>
> **Date:** 2026-10-11 (UTC)
> **Repository inspected:** `server/`, `admin/`, `client/`, `docs/`, deployment scripts and env examples.
>
> **Terminology note (confirmed fact):** This codebase does not have an `Asset.js` / `assetController.js` /
> `assetRoutes.js` module. The equivalent is the **`media` domain**:
> `server/src/modules/media/media.model.ts`, `media.service.ts`, `media.controller.ts`,
> `media.routes.ts`, `media.schema.ts`, plus avatars on `UserModel`. Everywhere the task brief says
> "asset", read **"media library item (`MediaModel`) or user avatar (`UserModel`)"**. The task's
> illustrative `backend/uploads/assets/` structure is adapted to the real layout in §2.

## Legend

- **[CONFIRMED]** — Verified in the inspected codebase or in client requirements stated in the task.
- **[RECOMMENDATION]** — What the auditor proposes to do.
- **[ASSUMPTION — NEEDS CONFIRMATION]** — Believed true but not proven; must be confirmed before building.
- **[UNRESOLVED / BLOCKER]** — Must be resolved before local storage can be called production-safe.

---

## 0. Evidence index — where ImageKit actually lives

All paths are relative to the repo root. Line numbers refer to the inspected revision.

### Backend — provider boundary

| File | Role |
|---|---|
| `server/src/integrations/imagekit/imagekit.client.ts:1-22` | Lazy `imagekit@^6.0.0` singleton. Reads `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` from `server/src/config/env.ts:43-45`. Throws `503 MEDIA_NOT_CONFIGURED` when absent. Comment explicitly notes the private key never leaves the server. |
| `server/src/integrations/imagekit/imagekit.service.ts:1-40` | Avatar adapter. `uploadAvatar(buffer, fileName, userId)` uploads to folder `reservation/avatars` with name `${userId}-${Date.now()}-${fileName}`, returns `{ url, fileId }`, throws `502 MEDIA_UPLOAD_FAILED` on failure. `deleteAvatar(fileId)` is best-effort (warn + swallow). |
| `server/src/modules/media/media.service.ts:1-66` | Media-library adapter. `uploadMedia()` builds a slugified ImageKit folder `reservation/media/<folder…>` (human-readable folder stays in Mongo), calls `getImageKit().upload({ file: buffer, fileName: Date.now()-prefixed, folder })`, then `MediaModel.create()` with `url` + `storageKey = fileId`. `502 MEDIA_UPLOAD_FAILED` on provider error. |
| `server/src/modules/media/media.service.ts:128-147` | `deleteMedia()`: ref-check → `getImageKit().deleteFile(storageKey)` inside try/catch (warn `ImageKit media cleanup failed`, then continue) → `MediaModel.deleteOne()`. |
| `server/src/modules/auth/auth.service.ts:8,150-188` | `updateMe()` avatar flow imports `uploadAvatar`/`deleteAvatar`. Uploads new avatar, `$set`s `avatarUrl`/`avatarFileId`, then best-effort deletes the previous `avatarFileId`. |
| `server/package.json:27,31` | `imagekit@^6.0.0` **and** `multer@^2.4.0` are both installed today. Multer is currently used with `memoryStorage()` only (see below) — it does **not** persist files. |
| `server/src/config/env.ts:43-45`, `server/.env.example:33-35`, `server/.env.production.example:46-48` | `IMAGEKIT_*` are optional in schema, empty in both examples. No `UPLOAD_DIR` / `STORAGE_*` / volume variable exists today. |
| `server/scripts/upload-floorplan.ts:15` | One-off script uploads via `uploadMedia()` ("Uploading floorplan image to ImageKit…") and links the new media id into `RoomTypeModel.floorplanMediaIds`. |
| `server/scripts/bulk-media-replace.ts:1-36` | One-off library-replacement script. Deletes every `MediaModel` row + its ImageKit file via `getImageKit().deleteFile(doc.storageKey)`, then re-uploads local folders through `uploadMedia()`. Proof that `storageKey` is an ImageKit `fileId`. |

### Backend — reusable upload/route layer (no ImageKit in these files)

| File | What it already does (reuse as-is) |
|---|---|
| `server/src/middleware/upload.ts:1-155` | Multer `memoryStorage()` parsers: `avatarUpload` (single `avatar`, JPEG/PNG/WebP ≤ 5 MB) and `mediaUpload` / `mediaUploadMany` (fields `file`×1 / `files`×10; allow-list JPEG/PNG/WebP/AVIF + MP4/WebM; images ≤ 8 MB via `mediaFileSizeError()`, video ≤ 50 MB). Normalises Multer errors to `AppError`. |
| `server/src/modules/media/media.routes.ts:1-42` | `POST /api/v1/admin/media` (`authenticate + authorize("admin")` → `mediaUploadMany` → zod body → `adminUploadMediaHandler`); `GET /`, `GET /folders`, `GET /resolve`, `PATCH /:id`, `DELETE /:id`; public `POST /api/public/media/resolve`. |
| `server/src/modules/media/media.controller.ts:16-42` | Accepts `file` or `files`, builds `UploadMediaInput { data: buffer, fileName, mime, size, folder, createdBy }` from `requireUser(req).id`, returns `201 { success, data: Media[] }`. No provider-specific code in the controller — only the service calls ImageKit. |
| `server/src/modules/media/media.model.ts:1-177` | `MediaModel` schema + `toMedia()`, `normalizeFolderPath()`, `folderQuery()`, `listMedia()`, `findMediaById()`, `listMediaFolders()`. See §2 for full field list. |
| `server/src/modules/media/media.schema.ts:1-35` | Zod contracts for folder (≤ 3 levels, `A-Za-z0-9 _-`), list query, `alt`/`caption`/`folder` patch. Update schema deliberately has **no binary-replacement field** — replacement is upload-new + re-link + delete-old. |
| `server/src/app.ts:37-112` | No `express.static` mount today (verified by search — zero matches). All file delivery is via ImageKit URLs stored in Mongo. |
| `server/src/modules/auth/auth.routes.ts:49-55` | `PATCH /api/v1/auth/me` (`authenticate` → `avatarUpload` → `updateMeHandler`). Reusable auth + parse chain. |

### Data model — what references binaries

- `MediaModel` (`server/src/modules/media/media.model.ts:46-63`): `fileName*`, `url*` (ImageKit CDN URL), `storageKey* unique` (ImageKit `fileId`), `mime*`, `kind`, `folder`, `width`, `height`, `durationSec`, `alt`, `caption`, `size*`, `createdBy`, timestamps.
- `UserModel` (`server/src/modules/users/user.model.ts:35-36`): `avatarUrl`, `avatarFileId` (`select:false`). Exposed safe projection in `user.repository.ts:10` (`avatarUrl` only).
- Business records store **media ids, not URLs** (verified): CMS `PageModel`/`BlogPostModel`/`OfferModel` (`cms.model.ts:15,64,104,180` — `featuredImageMediaId`, `imageMediaId`, `sections.imageMediaId`, `sections.mediaIds`, `seo.ogImageMediaId`); room types (`room-type.model.ts:56-111` — `media[]`, `images[]`, `floorplanMediaIds[]`, `welcomeHamperImageMediaId`); settings singleton (`settings.model.ts:68-98` — `logoMediaId`, `faviconMediaId`, `defaultSeo.ogImageMediaId`); amenities (`amenity.model.ts:45` — `imageMediaId`). Ref-check in `media.service.ts:98-126` covers pages/blogs/offers; room-type/settings/amenity references rely on the same stable-id pattern but are **not** in the delete-block query (gap noted in §5).
- Raw URLs **are** embedded in CKEditor HTML saved in CMS/room-type/why-book content (`cms.types.ts` sanitizer; `admin/src/components/common/ckeditor-upload-adapter.ts:21-46` posts editor files to `/admin/media` and inserts the returned `url`).

### Frontends

- Admin (`admin/src/modules/media/hooks/use-media.ts:60-91`, `pages/MediaPage.tsx`): library list/search/filter, chunked multi-upload (`FormData` `files` + `folder`, 10 per request), `PATCH /admin/media/:id` (alt/folder), `DELETE /admin/media/:id` (toast on `MEDIA_IN_USE`), folder sidebar, `GET /admin/media/resolve?ids=`. Pickers: `MediaPicker.tsx`, `ImageField.tsx:19-28` (resolves one id to a preview `url`), `AmenitiesPage.tsx`, `SettingsPage.tsx`. RTE: `ckeditor-upload-adapter.ts:13` comment says "(ImageKit)" and `CkEditorField.tsx` wires the image button to the media API.
- Client (`client/src/modules/media/api/media.api.ts:11-17`, `hooks/use-media.ts`): `POST /public/media/resolve { ids: string[≤50] }` → `{ id, url, alt }`; used by `RoomDetailPage.tsx:160-161`, `RoomTypeCard.tsx:37`, `CmsSections.tsx:39-65`, `AmenityStrip.tsx:55-67`, `CmsPages.tsx`. Rendering is `<img src={resolved.url}>` via `RoomTypeImage.tsx`. No direct ImageKit SDK in either frontend — both go through the backend API **[CONFIRMED]**.

### Hosting (GoDaddy — note on the task's "Goodday" spelling)

- **[CONFIRMED]** Target host is GoDaddy Node hosting (cPanel/Passenger), Node 22: `server/.env.production.example:1-9`, `server/scripts/pack-deploy.cjs:1-11`, `server/scripts/postbuild-node.cjs:2`, `.github/workflows/ci.yml:2-20`, `server/src/app.ts:41-46` + `env.ts:24-32` (`TRUST_PROXY=true` behind the proxy), `tsconfig.build.json:3`.
- **[CONFIRMED]** Deploy artefact is `server-godaddy-deploy.zip` containing only `package.json`, `tsconfig*`, `.env.example*`, `src/`, `scripts/`, `dist/` (`pack-deploy.cjs:14-21`). **No `uploads/` directory is packed, referenced, or git-tracked; no volume/mount configuration exists anywhere in the repo.**
- **[CONFIRMED]** Frontend and API are separate services/origins: `CLIENT_URL=https://book.hamptworthstays.com`, `ADMIN_URL=https://admin.hamptworthstays.com` (`.env.production.example:22-25`), `admin/.env.production` points at a Render API URL. Single-domain shared-origin is mentioned only as a fallback comment (`env.ts:24-26`).
- **[CONFIRMED]** MongoDB is Atlas (`MONGODB_URI=mongodb+srv://…` in production example; `PROJECT_STATUS.md:66-69` pool fix). No Redis in production (holds use `node-cache`).

---

## 1. Why are we removing ImageKit?

### 1.1 Confirmed client requirements **[CONFIRMED]**

Per the task brief (the authoritative requirement source for this audit):

1. The client does not want to use third-party image/file storage services.
2. Images and assets should be stored on the same hosting infrastructure used by the deployed
   Express backend, **provided persistent storage is supported**.
3. The existing Vite admin panel must keep supporting dynamic asset uploads, updates, and deletions.
4. The existing MongoDB asset (media) model and asset management functionality should be reused
   wherever possible.
5. The migration should minimize changes to the existing application.

These five points are taken as given. Items 2 ("provided persistent storage is supported") and 5
("minimize changes") are load-bearing constraints that shape every recommendation below.

### 1.2 Technical benefits of local storage (honest, bounded claims)

- **One fewer external provider account, SDK, and secret set.** `IMAGEKIT_PUBLIC_KEY / PRIVATE_KEY /
  URL_ENDPOINT` disappear from server config; ImageKit outage/rotation/quota incidents stop being
  a booking-adjacent failure mode (today a provider failure surfaces as `502 MEDIA_UPLOAD_FAILED`
  in `media.service.ts:47` / `imagekit.service.ts:28`).
- **Data residency is trivially the hosting account.** Files live next to the Express process that
  already serves the API, which matches the client's stated preference.
- **High reuse, small diff.** Multer parsing (`upload.ts`), auth (`authenticate + authorize("admin")`),
  zod validation, `MediaModel`, the ref-check delete pattern, the `resolve` endpoints, and the entire
  admin/client UI can be kept. Only the *storage driver* inside `uploadMedia()` / `deleteMedia()` /
  `uploadAvatar()` / `deleteAvatar()` changes, plus one new file-serving route/mount.
- **No per-file egress/transform billing from a media vendor** — but see §1.3: the host's own
  disk/bandwidth/backup costs and operational burden replace it; this is a cost *transfer*, not an
  automatic saving.

### 1.3 Technical disadvantages and operational responsibilities

Removing ImageKit means **this project takes ownership of everything ImageKit used to do**:

| Responsibility | What changes |
|---|---|
| File storage + durability | ImageKit's replicated object store → a directory on the GoDaddy host. The team owns capacity, permissions, and survival across restarts/redeploys (currently **unverified** — §6 BLOCKER). |
| Public image delivery | ImageKit CDN URLs → Express-served URLs (`/uploads/...` or equivalent). The team owns caching headers, range requests, uptime, and bandwidth. |
| Backups + restore | Atlas backs up Mongo; **nothing backs up the files** unless the team configures host backups/snapshots and tests restores (§8). |
| File validation | Multer's MIME allow-list exists, but magic-byte/content sniffing, image-integrity checks, and video-container validation become the team's job (§8). |
| Storage capacity monitoring | No quota dashboard anymore; disk-full becomes an API outage. Monitoring + alerting must be built. |
| Abuse handling | Rate limiting exists globally (`rate-limit.ts`) but per-upload throttling, quota-per-admin, and hotlink policy must be designed. |
| Orphaned-file hygiene | Today's orphan risk (provider file without a Mongo row, or vice versa) becomes local-disk cruft; a reconciler/sweeper is required (§7). |
| Multi-instance coherence | If GoDaddy ever runs ≥ 2 Node processes, local disks diverge unless sticky routing or shared storage is verified (§6). |

### 1.4 Explicit non-claims (do not promise what local storage is not)

- **Not automatically cheaper.** Host disk, bandwidth overage, backup storage, and ops time replace
  the ImageKit bill. No cost comparison was performed; none is claimed.
- **Not automatically faster.** ImageKit serves from a CDN edge; a single-origin Express static mount
  has higher TTFB for distant visitors and no automatic edge caching unless the host provides one
  (none is configured today).
- **Not automatically more reliable.** ImageKit offers provider-grade replication; a single host
  directory is a single point of failure until backups + restore are proven.
- **Not automatically permanent.** Files on an unverified deployment filesystem may be wiped on
  redeploy, restart, or instance replacement. Permanence must be *demonstrated* (§10, criterion 9),
  never assumed.

### 1.5 Assumptions that still require confirmation **[ASSUMPTION — NEEDS CONFIRMATION]**

1. GoDaddy's Node offering for this account supports a **persistent writable directory** outside the
   deployed zip (or a documented persistent path) that survives redeploys — §6.
2. The Express process has **write + serve permission** on that path under the Passenger user.
3. One Node instance serves all traffic (no horizontal scale-out splitting uploads across disks) — §6.
4. The client accepts backend-origin image URLs (e.g. `https://api.<domain>/uploads/…`) in place of
   `https://ik.imagekit.io/…` URLs, including inside already-saved CKEditor HTML after migration.
5. The client accepts the loss of unused ImageKit features (transformations, auto-optimization, CDN)
   without replacement — §4 confirms none are used, but product sign-off is still needed.
6. Sharp (or any new dependency) is approved **only if** server-side resizing/optimization is later
   proven necessary; the default is to add nothing (§4, §9).

---

## 2. What will replace ImageKit?

### 2.1 Preferred architecture (subject to §6 verification) **[RECOMMENDATION]**

Keep every layer; swap only the storage driver:

```text
Vite admin / Client
  │  multipart FormData (unchanged) / resolve-by-id (unchanged)
  ▼
Existing Express routes (unchanged paths + auth + validation)
  │  server/src/modules/media/media.routes.ts
  │  server/src/modules/auth/auth.routes.ts  (avatar)
  ▼
Existing Multer parsers (unchanged: memoryStorage → buffer)
  │  server/src/middleware/upload.ts  (avatarUpload / mediaUploadMany)
  ▼
NEW: local storage driver (the only new writes-to-disk code)
  │  write buffer → persistent dir, safe random filename
  │  delete file on delete/replace; fsync/error handling
  ▼
Persistent server disk  +  Express file serving
  │  e.g. <PERSISTENT_ROOT>/uploads/avatars/ , .../media/
  ▼
Existing MongoDB models (same collections, minimal field evolution)
  │  MediaModel  +  UserModel.avatarUrl/avatarFileId
```

**Adaptation note:** The task's illustrative tree (`backend/src/middleware/upload.js`,
`controllers/assetController.js`, `models/Asset.js`, `routes/assetRoutes.js`, `backend/uploads/assets/`)
does not exist in this repo (it is Express-JS-style; this repo is TypeScript with domain modules).
The real mapping is:

| Illustrative module | Actual module to modify (do not duplicate) |
|---|---|
| `middleware/upload.js` | `server/src/middleware/upload.ts` — already exists; keep parsers, no new file needed |
| `controllers/assetController.js` | `server/src/modules/media/media.controller.ts` + `server/src/modules/auth/auth.controller.ts` — keep as-is |
| `models/Asset.js` | `server/src/modules/media/media.model.ts` (`MediaModel`) + `server/src/modules/users/user.model.ts` (avatar) — evolve fields, do not create `Asset.js` |
| `routes/assetRoutes.js` | `server/src/modules/media/media.routes.ts` + `server/src/modules/auth/auth.routes.ts` — keep paths |
| `backend/uploads/assets/` | A **persistent** directory **outside** the deploy zip, e.g. `$UPLOADS_ROOT/media/`, `$UPLOADS_ROOT/avatars/` (exact path = whatever GoDaddy confirms persistent; never `./dist/uploads` inside the zip) |
| New file-serving | One mount in `server/src/app.ts` (public `express.static` with cache headers) and/or one authenticated `GET` route for private assets (avatars are the candidate) |

### 2.2 Responsibility of each component

| Component | Responsibility | Why it is needed |
|---|---|---|
| **Multer** (`upload.ts`) | Receive `multipart/form-data`, enforce MIME allow-list + size caps, expose `req.file(s).buffer`. | HTTP parsing only. With `memoryStorage()` it never touches disk — that is why it is *not* a replacement on its own. |
| **Node.js `fs`/`path` driver** (new, small) | `mkdir -p`, generate collision-safe filename (`crypto.randomUUID()` + validated extension), `writeFile`, `unlink`, contain paths inside the storage root (`path.resolve` + prefix check). | The actual persistence step ImageKit used to perform. Must handle partial failures (§7). |
| **Express static middleware or file-serving route** | Serve public binaries (`Cache-Control: public, max-age=…`, `ETag`, correct `Content-Type`); optionally serve private binaries only after `authenticate` (+ ownership check). | Replaces the ImageKit `urlEndpoint` delivery. Public static URLs are fine for gallery/CMS images; avatars and any future non-public files need the authenticated route (§8). |
| **Existing MongoDB models** | Store metadata + the **relative file path / storage key** (e.g. `media/2026/10/<uuid>.webp`) and the **public URL** derived from it. Keep `fileName`, `mime`, `kind`, `folder`, `width/height`, `size`, `alt/caption`, `createdBy`. | Preserves every query the UI and ref-check rely on; enables coexistence of old `ik.imagekit.io` rows and new local rows during migration (§5). |
| **Existing Vite admin panel** | Unchanged UX: `MediaPage`, `MediaPicker`/`ImageField`, CKEditor adapter, `use-media.ts` chunked uploads. Only the *returned `url` origin* changes. | Satisfies "minimize changes" and requirement 3. |

Illustrative MongoDB record (adapted to the real `MediaModel`, not a mandatory schema):

```json
{
  "fileName": "homepage-banner.webp",
  "url": "https://api.example.com/uploads/media/2026/10/3f2a1c9e-homepage-banner.webp",
  "storageKey": "media/2026/10/3f2a1c9e-homepage-banner.webp",
  "storageProvider": "local",
  "mimeType": "image/webp",
  "kind": "image",
  "folder": "Pages/Home",
  "width": 1920,
  "height": 640,
  "size": 245760,
  "alt": "Hotel facade at dusk",
  "createdBy": "ObjectId(admin)"
}
```

Notes: `url` + `storageKey` + `mime` + `kind` + `folder` + `width/height` + `size` already exist in
`media.model.ts:46-63`. Only `storageProvider` (`"local" | "imagekit"`) is a proposed additive field
so old and new rows can coexist and be queried during migration. Whether to store `mimeType` vs the
existing `mime` name is a naming choice at implementation time — **no rename of `mime` is required**;
the example above uses `mimeType` only to mirror the task brief. `width/height` for local files need a
lightweight image-header reader (or be left `null`, as video already is) — do not add Sharp just for
dimensions (§4).

### 2.3 Why Multer alone is not a complete replacement for ImageKit

1. **Multer parses; it does not store durably.** Today it uses `memoryStorage()` — buffers live only
   for the request. Without the new `fs` driver, files vanish when the request ends.
2. **Multer does not serve.** Browsers need a URL. ImageKit's `urlEndpoint` is replaced by the new
   Express static/authenticated serving layer.
3. **Multer does not track.** Mongo metadata (`url`, `storageKey`, dimensions, refs) is what makes
   library search, pickers, `resolve` endpoints, and ref-checked deletes work. That stays in Mongo.
4. **Multer does not transform/optimize/CDN-serve.** Those ImageKit capabilities are unused here (§4)
   and are therefore dropped, not reimplemented.
5. **Multer does not clean up.** Orphan handling, ref-checks, best-effort deletes, and rollback on
   partial failure live in the service layer (§7), not in Multer.

---

## 3. Before vs. after architecture

### 3.1 Current flow (evidenced)

```text
Vite Admin (admin/src)                        Client (client/src)
  │  POST /api/v1/admin/media (multipart)       │  POST /api/public/media/resolve { ids }
  │  GET  /api/v1/admin/media                   │  <img src="https://ik.imagekit.io/...">
  │  GET  /api/v1/admin/media/resolve?ids=      │
  │  PATCH/DELETE /api/v1/admin/media/:id       │
  │  PATCH /api/v1/auth/me (avatar)             │
  ▼                                             ▼
Express Backend (server/src)
  │  authenticate + authorize("admin") / authenticate (me)
  │  Multer memoryStorage → Buffer (upload.ts)
  │  zod validation (media.schema.ts / auth.schema.ts)
  ▼
  ├────► ImageKit (stores actual binaries) ◄── THE ONLY WRITER/DELETER
  │        reservation/media/<slug-path>/…  •  reservation/avatars/…
  │        upload → { url, fileId }  •  deleteFile(fileId)
  │
  └────► MongoDB Atlas
           MediaModel { url: ik-URL, storageKey: fileId, … }
           UserModel  { avatarUrl: ik-URL, avatarFileId: fileId }
           Business records { *MediaId refs }  •  CKEditor HTML { embedded ik-URLs }
```

Key evidence: `media.service.ts:33-43` (upload → ImageKit → Mongo), `:140` (delete → ImageKit →
Mongo), `imagekit.service.ts:19-23` (avatar upload), `auth.service.ts:172-185` (avatar replace),
`media.controller.ts:29-40` (buffer handoff), `use-media.ts:80-86` (admin posts `FormData`),
`ckeditor-upload-adapter.ts:32-38` (RTE posts `files` + `folder`, inserts `url`),
`media.api.ts:11-17` (client resolves ids to `url`s).

### 3.2 Target flow (same API, local driver)

```text
Vite Admin (UNCHANGED UI + API calls)         Client (UNCHANGED resolve calls)
  │                                             │
  ▼                                             ▼
Existing Express Asset API (SAME paths/auth/validation)
  │  POST /api/v1/admin/media  •  DELETE /:id  •  PATCH /:id
  │  PATCH /api/v1/auth/me  •  GET /resolve  •  POST /public/media/resolve
  ▼
Multer upload middleware (SAME memoryStorage parsers)
  │  Buffer + validated mime/size
  ▼
NEW local storage driver (fs/path)
  │  safe filename → write → persistent disk
  ▼
Persistent Server Disk (VERIFIED persistent volume — §6 BLOCKER)
  │  <ROOT>/uploads/media/<yyyy>/<mm>/<uuid>-<slug>.<ext>
  │  <ROOT>/uploads/avatars/<userId>-<ts>-<uuid>.<ext>
  ▼
Express File Serving (NEW mount/route in app.ts)
  │  GET /uploads/media/…  (public, cached)  •  GET /uploads/avatars/… (auth-gated if private)
  │
  └────► Existing MongoDB Asset Model (SAME collections)
           MediaModel { url: backend-origin URL, storageKey: relative path, storageProvider: "local", … }
           Old rows keep { url: ik-URL, storageKey: fileId, storageProvider: "imagekit" } until migrated
           Business records UNCHANGED (still media ids; CKEditor HTML migrated by script)
```

### 3.3 How the frontend retrieves the resulting image URL and displays it

**Unchanged contract** (this is why the migration is small):

1. **Upload:** Admin `MediaPage` / `MediaPicker` / CKEditor posts `FormData` to `POST /api/v1/admin/media`
   (`use-media.ts:83`, `ckeditor-upload-adapter.ts:33`). Response is `201 { success, data: Media[] }`
   where each `Media` has `id` + `url` (`media.controller.ts:41`, `media.model.ts:77-96`). The UI shows
   the new item immediately (query invalidation `mediaKeys.all`, `use-media.ts:121`) and CKEditor inserts
   `url` as the `<img src>`. Only the URL *origin* changes (`ik.imagekit.io` → backend `/uploads/…`).
2. **Library/pickers:** `GET /api/v1/admin/media` and `GET /admin/media/resolve?ids=` return stored `url`s;
   `ImageField.tsx:19-28` previews via resolve.
3. **Public render:** Client calls `POST /api/public/media/resolve { ids ≤ 50 }`
   (`client/.../media.api.ts:13-15`) → `resolveMedia()` in `media.service.ts:162-175` returns
   `{ id, url, alt, mime, kind }` (unknown ids silently skipped) → components render
   `<img src={url}>` (`RoomTypeImage.tsx`, `RoomTypeCard.tsx:50`, `RoomDetailPage.tsx:677`).
4. **Avatars:** `AdminShell.tsx:267-268` renders `user.avatarUrl` in `AvatarImage`. After migration that
   URL is backend-served; if avatars become auth-gated, the shell must send credentials or use a
   signed short-lived URL (§8) — flagged as the one frontend-adjacent change that may be needed.

---

## 4. ImageKit features that must be replaced or evaluated

Searched the repo for transformation/CDN/optimization usage (`?tr=`, `ik-`, `w-`, `h-`, `sharp`,
`thumbnail`, `resize`, `cdn`, `urlEndpoint` manipulations): **zero hits outside SDK setup.**
The table below is the complete inventory.

| ImageKit functionality | Used by this project? (evidence) | Replacement | Functionality lost? | Extra code/infra? |
|---|---|---|---|---|
| Image upload | **YES** — `media.service.ts:33-37` (library), `imagekit.service.ts:19-23` (avatars), scripts | Multer (existing parsers) + new `fs`/`path` driver writing to persistent disk | No, if §6 verified | Yes — one small storage driver + `UPLOADS_ROOT` config + serving mount |
| Image/file deletion | **YES** — `media.service.ts:140`, `imagekit.service.ts:35`, `auth.service.ts:185`, scripts | `fs.unlink` + Mongo cleanup with the existing ref-check pattern | No | Yes — inside the same driver/service change; no new dep |
| File URL | **YES** — every render path consumes `Media.url` / `User.avatarUrl` | Backend URL + stored relative path (`{API_ORIGIN}/uploads/<storageKey>`) | Origin changes; old `ik.*` URLs keep working only while the ImageKit account/files exist (§5) | Yes — serving mount + `APP_PUBLIC_URL`/`API_ORIGIN` config |
| Transformations / resizing (`tr:w-…,h-…`, responsive variants, thumbnails) | **NOT USED** — no transformation params, variant URLs, or `width/height`-driven srcsets found in `server/`, `admin/`, `client/` | **None — mark unused, do not implement** | None (nothing to lose) | None. Do **not** add Sharp for this. If responsive images are later required, add Sharp + variant naming then, with client approval. |
| Automatic image optimization (compress, WebP/AVIF delivery) | **NOT USED** — allow-list includes WebP/AVIF as *upload* types (`upload.ts:49-56`); no server- or provider-side conversion/compression pipeline exists | **None — mark unused** | None. Uploads stay in the author's format. Optional future: Sharp conversion at upload (only with approval). | None by default |
| CDN delivery (edge cache, `urlEndpoint`) | **USED IMPLICITLY** — every stored `url` is an `ik.imagekit.io` edge URL, but no CDN *configuration* (rules, purging, custom domain) exists in the repo | Hosting-provided CDN if available, else direct backend delivery with cache headers | Yes — edge latency/caching is lost unless the host/CDN provides it. Do not claim parity. | Maybe — only if the host offers a CDN to front `/uploads`. No code change needed to add one later (URL origin stays the backend). |
| File metadata (name, mime, size, dimensions, folder, alt) | **YES** — full `MediaModel` + `UserModel` projection | Existing Mongo models, unchanged queries (additive `storageProvider` field only) | No | No new dep; one additive schema field + index if needed |
| Remote storage persistence / durability | **YES** — ImageKit is the durable binary store today; Mongo holds only references | Verified persistent disk or another client-approved store (§6) | Durability model changes from provider-replicated to host-disk + backups | Yes — host volume config + backup/restore procedure + monitoring |

**Dependency guidance [RECOMMENDATION]:** No new npm package is required for the migration itself
(`multer` + `express` + `mongoose` already cover it). Do **not** install `sharp` (or any processing
library) unless a later, separately approved step needs resizing/optimization/dimension-probing.
`width/height` may remain `null` for local files (the schema already allows it) or be filled by a
dependency-free header parser at implementation time.

**Why Multer alone is not a complete replacement** — see §2.3 (parse ≠ store ≠ serve ≠ track ≠ clean).

---

## 5. Existing assets and backward compatibility

### 5.1 How existing ImageKit-hosted assets are referenced (confirmed inventory)

1. **Mongo `Media.url` + `User.avatarUrl`** hold absolute `https://ik.imagekit.io/…` URLs;
   **`Media.storageKey` + `User.avatarFileId`** hold ImageKit `fileId`s (not paths).
2. **Business records hold ids, not binaries:** CMS pages/blogs/offers (`featuredImageMediaId`,
   `imageMediaId`, `mediaIds`, `sections.*`, `seo.ogImageMediaId`), room types (`media`, `images`,
   `floorplanMediaIds`, `welcomeHamperImageMediaId`), settings (`logoMediaId`, `faviconMediaId`,
   `defaultSeo.ogImageMediaId`), amenities (`imageMediaId`). These records never touch ImageKit
   directly — they resolve through `resolveMedia()` / public resolve.
3. **CKEditor HTML holds raw embedded `ik.*` URLs** (saved markup, not ids). These do not follow
   id-based migration automatically.
4. **Clients cache `url`s** in TanStack Query (`["media","resolve",…]` keys) and browsers cache
   image bytes; both tolerate origin change after invalidation.

### 5.2 Answers to the six migration questions

| Question | Answer |
|---|---|
| Will existing ImageKit URLs stop working if the integration code is removed? | **No — not immediately.** Removing SDK calls stops *new* uploads/deletes. Already-uploaded files remain served by ImageKit until the files/account are deleted. Breakage comes later: if the ImageKit account lapses, files are deleted, or URLs are rewritten before migration, old renders break. Keep the account + files until §10 is green. |
| Will old MongoDB records continue referencing ImageKit? | **Yes.** Every existing `Media`/`User` row keeps its `ik.*` `url` + ImageKit `storageKey`/`avatarFileId` until explicitly migrated. The API returns them verbatim. |
| Can old URLs coexist with new local URLs during migration? | **Yes — this is the recommended strategy.** Old rows (`storageProvider: "imagekit"`, `ik.*` URL) and new rows (`storageProvider: "local"`, backend URL) are the same shape to every consumer (`{ id, url, alt, … }`). No frontend branch is needed. |
| Is there a need to download and migrate existing ImageKit files? | **Yes, for full removal.** Coexistence is safe indefinitely, but declaring "ImageKit removed" (§10) requires either (a) downloading each referenced binary and re-storing it locally with the Mongo row updated, or (b) a conscious product decision to leave historical rows on ImageKit (then ImageKit is *not* fully removed). The repo's scale is unknown here — treat as a controlled batch job with verification, not a blind bulk replace (cf. the destructive pattern in `bulk-media-replace.ts`, which must **not** be rerun as-is). |
| Can assets be migrated without changing product/category/banner or other business records? | **Yes — for id-referenced records.** Migrating a `Media` row in place (same `_id`, new `url`/`storageKey`) leaves every `*MediaId` reference valid. Only **CKEditor HTML** (raw URLs) and any hardcoded URLs in seed/scripts need content rewriting. There is no product/category/banner collection in this repo; the equivalents are room types, CMS pages/blogs/offers, amenities, settings — all id-referenced except RTE markup. |
| Which references need updating if local paths are introduced? | `Media.url` + `Media.storageKey` (+ proposed `storageProvider`) per migrated row; `User.avatarUrl` + `User.avatarFileId` per avatar; embedded `ik.*` URLs inside CMS/room-type/why-book RTE HTML; seed/script constants (`upload-floorplan.ts` target folder); env examples + docs mentioning ImageKit. **Business-record `*MediaId` fields do not change** when row ids are preserved. |

### 5.3 Safe migration strategy [RECOMMENDATION]

1. **Freeze + inventory:** Record row counts (`Media`, `User` with avatars), list distinct `storageKey`s,
   snapshot which `_id`s are referenced by CMS/room-type/settings/amenity queries and which `ik.*`
   URLs appear in RTE HTML.
2. **Dual-read (coexistence):** Ship the local driver with old rows untouched. New uploads go local;
   old rows keep serving from ImageKit. No business-record change.
3. **Backfill in batches:** `download ik-file → verify bytes/MIME → write local path → update row
   (same `_id`, new `url`/`storageKey`/`storageProvider:"local"`, keep old values in a backup field
   until verified) → re-resolve + visually verify → next batch`. Keep the old ImageKit file until its
   batch is verified (rollback = flip the row back).
4. **RTE rewrite as a separate pass** with HTML-aware replacement + sanitizer re-run, reviewed diff per
   document (never regex-blind).
5. **Decommission only after §10:** delete ImageKit files, remove env keys, remove the SDK dep —
   in that order, each gated on the acceptance tests.

### 5.4 What must remain until migration is verified (do not delete early)

- ImageKit account + all hosted files.
- `IMAGEKIT_*` env vars on every environment (removing them trips `503 MEDIA_NOT_CONFIGURED` today).
- `Media.storageKey` / `User.avatarFileId` values and their `unique`/`select:false` semantics.
- `imagekit` dependency in `server/package.json` until the transition period explicitly ends.
- The destructive `bulk-media-replace.ts` script must **not** be reused without a rewrite (it deletes
  every row + file and breaks references by design).
- If the project has many existing assets: **controlled, verified, rollback-capable batches** —
  never an untested bulk replacement.

---

## 6. Local storage persistence and GoDaddy hosting — ❗ BLOCKER

> **BLOCKER: Local file storage cannot be considered production-safe until persistent storage is
> verified.** Nothing below is a guess about GoDaddy's filesystem — it is a list of what was searched,
> what was (not) found, and what must be proven.

### 6.1 What was investigated

- Repo hosting evidence: `server/.env.production.example` (GoDaddy Node/cPanel), `pack-deploy.cjs`
  (zip layout), `postbuild-node.cjs` (plain-Node output), `app.ts`/`env.ts` (proxy + CORS comments),
  `.github/workflows/ci.yml` (Node 22 to match GoDaddy), `PROJECT_STATUS.md` (Atlas pool note).
- Official GoDaddy docs: **not accessible from this environment** (no live-fetch performed; no vendored
  copy in the repo). No claim about GoDaddy persistent disks, volumes, quotas, or multi-instance
  behaviour is made here.
- Searched for `persistent`, `volume`, `disk`, `uploads`, `static`, `express.static`, `UPLOAD_DIR`,
  `STORAGE_*`: only hits are the ImageKit comment, an amenity mock comment, and Multer size guards.
  **There is no persistent-disk configuration, mount, or `uploads/` directory in the repo.**

### 6.2 Determinations (confirmed vs. unresolved)

| Question | Status |
|---|---|
| Does the Express service support persistent disks / mounted volumes? | **[UNRESOLVED]** No volume config found. Must be confirmed in the GoDaddy panel/docs for this exact plan (path, quota, whether it survives redeploy). |
| Do files survive application restarts and redeployments? | **[UNRESOLVED — assume NO until proven].** The deploy replaces the app directory from the zip; anything written inside it is expected to be lost. A persistent path *outside* the zip must be identified and tested (write → restart → redeploy → read). |
| Do multiple application instances share the same filesystem? | **[UNRESOLVED]** Single-instance assumed but not proven. Must confirm instance count + routing. If ≥ 2 writers, local disks diverge (§8 mitigation). |
| Are files accessible after a new deployment or instance replacement? | **[UNRESOLVED]** Same test as above; must pass before declaring complete (§10.9). |
| Do the Vite frontend and Express backend run on the same host or separate services? | **[CONFIRMED — separate].** Production env uses distinct `CLIENT_URL` / `ADMIN_URL` vs the API origin; `admin/.env.production` targets a Render API URL. Cross-origin image URLs + CORS/cache behaviour must be accounted for. |

### 6.3 Fallback choices (in order — no silent third-party substitution)

1. **[RECOMMENDATION — first]** Configure a supported persistent volume/path on the current host and
   point `UPLOADS_ROOT` at it. Re-run the §10 persistence tests. This satisfies the client requirement
   with minimal change.
2. **[RECOMMENDATION — second]** If the host cannot provide persistence, use **another explicitly
   client-approved storage mechanism** (e.g. a host-provided object store, a mounted NAS path, or a
   separately approved VPS directory). The driver boundary (§2) keeps this swap small.
3. **Explicitly forbidden:** silently falling back to ImageKit or introducing any other third-party
   service (S3-compatible, Cloudinary, etc.) without written client approval — that would violate the
   confirmed requirement in §1.1.

### 6.4 GoDaddy screenshot evidence (2026-10-11, provided by account holder) **[CONFIRMED observations]**

Screenshots of the live GoDaddy account / cPanel (temporary `.mytemp.website` domain) show:

- **Plan type is shared cPanel web hosting (PHP-centric), not Node hosting.** Server Settings shows a
  PHP version selector; the cPanel Software section offers *Setup Python App* / *Setup Ruby App* but
  **no "Setup Node.js App"** entry; SSH Access is **Off**. **[CONFIRMED]** Node.js cannot run on this
  plan as-is — a future Node deploy needs either a plan that supports it (VPS / Node-enabled hosting)
  or the API stays where it is today (Render, per `admin/.env.production`).
- **For assets-only use, Node on GoDaddy is NOT required.** cPanel disk is ordinary persistent hosting
  storage (Stats show ~50 GB disk quota, 250 000-file quota, currently < 2% used) — files written under
  the account (e.g. `public_html/uploads/…`) survive restarts/redeploys, unlike ephemeral container
  disks. Apache serves them directly as static files. **[CONFIRMED — persistence for the assets-only
  path does not depend on Node availability.]**
- **Resulting assets-only architecture [RECOMMENDATION]:** Vite admin → existing Express API (wherever
  it runs) → server-side FTP/SFTP upload into the GoDaddy account → public `https://<domain>/uploads/…`
  URL stored in the existing `Media.url` / `User.avatarUrl` fields. No PHP code and no Node process on
  GoDaddy needed; the only new server dependency is an FTP/SFTP client library used inside the storage
  driver boundary (§2). Deletion = FTP delete + existing Mongo cleanup.
- **Still required to confirm (see checklist in the chat response of the same date):** hosting plan
  name, File Manager document-root layout, Domains → document roots, FTP Accounts + connection info
  (host/port/TLS), SSH enablement possibility, SSL status of the serving domain, Hotlink Protection
  state, Backup inclusion of web files, and the final production domain (current screenshots show a
  temporary staging domain). The §6 BLOCKER is downgraded to **partially resolved**: disk persistence
  for static assets is confirmed by the nature of cPanel hosting + quota screenshots; the remaining
  items are configuration confirmations, not feasibility unknowns.

### 6.5 Second evidence batch (same date) — plan, document roots, FTP **[CONFIRMED observations]**

- **Plan: Web Hosting Deluxe** — 10 websites, 50 GB NVMe storage, cPanel ( renews Oct 2027 ).
  Deluxe is shared hosting: multi-site capable, but still **no Node.js runtime**. The earlier
  conclusion stands — Node stays on Render (or moves only with a plan change).
- **Document roots confirmed via Domains page:** `admin.hamptworthstays.com →
  /public_html/admin.hamptworthstays.com`, `api.hamptworthstays.com →
  /public_html/api.hamptworthstays.com`, `book.hamptworthstays.com →
  /public_html/book.hamptworthstays.com`, all with **Force HTTPS Redirect On**. The primary
  `hamptworthstays.com` row was cut off in the screenshot — its HTTPS/SSL state still needs one
  confirming glance. Real production domains (not the temporary staging domain) already exist on
  this account.
- **File Manager confirms standard cPanel layout** (`public_html/`, per-subdomain folders, `.htaccess`,
  WordPress files at the root). No `uploads/` directory exists yet — it must be created as part of
  Phase 0. Note: the web root also hosts WordPress, so the uploads path must not collide with WP
  paths and root `.htaccess` rules must leave it directly servable.
- **FTP is available and the mechanism is confirmed:** the FTP Accounts page supports creating scoped
  accounts (login + directory + quota); no scoped accounts exist yet; the main account FTP (full home
  access, ~0.8/50 GB used) is present with a *Configure FTP Client* helper that yields host/port/TLS
  settings. **[CONFIRMED — FTP upload from the Express backend is feasible on this account.]**
- **Remaining pre-migration checks (small, non-blocking for starting):** (1) create `uploads/` under
  the chosen document root + browser-load a test image over HTTPS; (2) create one FTP account scoped
  to that directory (never use the full-access main FTP credential from the backend); (3) read the
  *Configure FTP Client* values (host/port/TLS) and verify Render→GoDaddy FTP connectivity;
  (4) confirm primary-domain HTTPS/SSL row; (5) Hotlink Protection Off for the uploads path;
  (6) Backup inclusion of web files. **Verdict: migration Phase 0/1 may start — see the chat response
  of the same date for the ordered pre-flight list.**

### 6.6 Implementation record (build mode — code complete, live cutover pending)

- Execution spec: `migrate-imagekit-to-godaddy.md` (frozen: FTP root = `uploads/`,
  base `https://hamptworthstays.com/uploads`, FTPS-first, media + avatars, full backfill).
- Implemented: `basic-ftp` dep; `STORAGE_PROVIDER` switch (default `imagekit` = zero behaviour change
  on deploy); `integrations/storage/` driver (UUID keys, FTP-root jail, FTPS, size-verified uploads);
  dual-driver media upload/delete with DB-fail→FTP-cleanup; provider-aware avatar flow; extended
  delete ref-check (+roomTypes/settings/amenities); additive-only schema fields with `legacy*`
  rollback values; idempotent backfill script (dry-run default) incl. RTE-HTML pass; retired
  `bulk-media-replace.ts` via warning header. Fixed latent bug: replaced avatars were never deleted
  (`findUserDocById` omitted `select:false` `avatarFileId`).
- Verified locally: `tsc --noEmit` clean, `oxlint` clean, `bun test` 185/185 pass (9 new).
- **Not yet executed (need live env + explicit go-ahead):** backfill runs, cutover flip
  (`STORAGE_PROVIDER=ftp`), acceptance tests, ImageKit decommission + FTP password rotation.
  Runbook commands are in `migrate-imagekit-to-godaddy.md` §4–§6.

---

## 7. Upload and delete lifecycle

### 7.1 Upload (target — adapted to existing behaviour)

```text
1. Admin selects file(s) in the Vite panel (MediaPage / MediaPicker / CKEditor image button).
2. Frontend posts multipart FormData to the EXISTING Express API:
     POST /api/v1/admin/media  (fields: files[≤10] + folder)  or  PATCH /api/v1/auth/me (avatar).
3. Backend: authenticate → authorize("admin") [media] / authenticate [me] → Multer parse →
   MIME allow-list + per-file size guard (upload.ts) → zod body validation.
4. Storage driver: mkdir -p dated subdir → random safe filename → writeFile → stat/verify.
   On ANY write/verify failure: remove partial file, throw 502/500 AppError, create NO Mongo row.
5. Backend creates (media: MediaModel.create with url + storageKey + mime/kind/folder/dims/size;
   avatar: UserModel update with avatarUrl/avatarFileId) and returns the asset metadata + usable URL.
6. Frontend invalidates queries / inserts the returned url (CKEditor) — §3.3.
```

**Partial-failure rules [RECOMMENDATION]:**

- *File written but DB fails* → driver deletes the just-written file (best-effort, logged) and returns
  an error. Today the reverse order (ImageKit-then-Mongo in `media.service.ts:32-64`) can orphan a
  provider file; the local driver should order operations **write → DB → on-DB-failure remove file**,
  or run a sweeper (§8) for the crash-window remainder.
- *DB succeeds but a later step fails* (e.g. avatar old-file cleanup) → never fail the request for
  cleanup; log + queue for the sweeper (matches today's best-effort `deleteAvatar`).
- Concurrent uploads of the same original name must never collide: random UUID component is mandatory;
  never trust `originalname` for the disk name (sanitize to a slug suffix only).

### 7.2 Delete (target — adapted to existing behaviour)

```text
1. Admin requests DELETE /api/v1/admin/media/:id (or avatar replace via PATCH /me).
2. Backend verifies auth + admin role (media) / ownership (avatar: req.user.id).
3. Backend checks references: media → findMediaReferences() (pages/blogs/offers) + EXTENDED to
   room-type/settings/amenity id refs (gap fix, §5); avatar → no ref-check (single-owner).
   If referenced → 409 MEDIA_IN_USE, delete NOTHING (existing behaviour, media.service.ts:131-138).
4. Backend deletes the physical file (unlink) AND the Mongo record, tolerating partial failure:
     - file missing (ENOENT) → treat as already-gone, still remove the row, log at warn.
     - unlink fails (EPERM/EIO) → keep the row, throw 500, alert; retry path via admin re-delete.
     - Mongo delete fails after unlink → row remains pointing at a missing file; resolveMedia()
       will 404/skip it; sweeper + error log drive manual recovery (§8). Never silently succeed.
```

### 7.3 Update or replace (no orphaned files, no broken references)

- **Metadata-only update stays as-is:** `PATCH /:id` edits `alt`/`caption`/`folder` (logical move only;
  `media.service.ts:78-80` comment). No file I/O.
- **Binary replacement = upload-new + re-link + delete-old [RECOMMENDATION]:**
  1. Upload the new file as a new row (or avatar version) → get new `url`/`storageKey`.
  2. Update referencing records to the new `_id` (or for avatars, `$set` new URL/fileId) — for media,
     prefer updating the *same row in place* (same `_id`, new `url`/`storageKey`) so all `*MediaId`
     refs stay valid with zero business-record writes.
  3. Delete the old physical file only after the DB update commits; on delete failure, log + sweeper.
  4. For avatars, keep today's order (upload new → DB update → best-effort delete previous,
     `auth.service.ts:171-186`) with local `unlink` substituted for `deleteFile`.

---

## 8. Security and operational trade-offs

Removing ImageKit transfers these ten responsibilities to the project. Each row states the current
posture (confirmed) and what local storage additionally requires.

| # | Responsibility | Today (confirmed) | Required with local storage [RECOMMENDATION] |
|---|---|---|---|
| 1 | File type + actual content validation | Multer extension/MIME allow-list + per-type size caps (`upload.ts:6-7,49-56,76-84`); **no magic-byte check** — ImageKit re-validated server-side | Keep allow-list; **add** magic-number sniffing (dependency-free header check for JPEG/PNG/WebP/AVIF/MP4/WebM) + reject on mismatch (`INVALID_FILE_TYPE`); never execute or render uploads as code |
| 2 | File size limits + upload authorization | Images ≤ 8 MB / video ≤ 50 MB / avatar ≤ 5 MB enforced; media routes `authenticate + authorize("admin")`, avatar `authenticate` | Unchanged enforcement points; add disk-quota guard (reject with `507` when volume > threshold) so one upload cannot fill the disk |
| 3 | Safe filename generation + path traversal protection | ImageKit folder slugified (`media.service.ts:29`); disk traversal N/A today | `crypto.randomUUID()` disk names; `path.resolve(root, key)` must start with `root + sep` else reject; `normalizeFolderPath()` stays the *logical* grouping only — never a raw disk path |
| 4 | Storage capacity monitoring | Provider quota dashboard (external) | Host disk-usage check (periodic `df`/statfs or panel metric) + alert threshold + admin-visible warning; document retention/eviction policy with client sign-off |
| 5 | Backups + restoration | Atlas (Mongo) + ImageKit (files) are independently durable | File-level backup (host snapshots/rsync) on a schedule; **test restores** (file ↔ row consistency); include `uploads/` in the recovery runbook alongside Atlas restore |
| 6 | Protection against unauthorized file deletion | Ref-check blocks referenced deletes (`MEDIA_IN_USE`); admin-only route | Keep both; extend ref-check to room-type/settings/amenity refs; the file-serving layer must never expose a delete-by-path endpoint — deletes only by Mongo `_id` through the API |
| 7 | Rate limiting + abuse prevention | Global limiter (`rate-limit.ts`: 300/15 min) + auth limiter (20/15 min on credentials) | Add a stricter upload bucket (e.g. N uploads/min per admin IP+account) + max-files-per-day guard; consider hotlink policy (`Referer`/CORS) for `/uploads` if scraping appears |
| 8 | Cleanup of orphaned files | Orphans possible today (ImageKit file without row on DB failure); no sweeper exists | Scheduled reconciler: list disk files not referenced by any `storageKey`/`avatarFileId` (older than grace window) → quarantine → delete + log; and rows whose file is missing → report (never auto-delete rows) |
| 9 | Access control for private assets | Everything is effectively public-by-URL today (ImageKit URLs are unguessable but unauthenticated) | **Public static URLs only for public assets** (gallery/CMS). Avatars (and any future non-public file) go behind an authenticated `GET` route (`authenticate` + owner-or-admin check, short cache, `Content-Disposition: inline`); `AdminShell` avatar rendering must send credentials accordingly |
| 10 | Concurrent uploads + multiple backend instances | Single-process assumption; `Date.now()`-prefixed names mostly avoid collisions | UUID names eliminate collisions; if instances > 1 (§6 unresolved), add sticky routing or a shared volume — convergent local disks are a correctness bug, not a perf issue |

---

## 9. Final recommendation

### 9.1 Confirmed reason for removing ImageKit

Client directive: no third-party image/file storage; store on the Express host's infrastructure if
persistence is supported, reusing the Mongo media model and admin UI with minimal change (§1.1).
Cost/speed/reliability are **not** claimed motivations.

### 9.2 Exact replacement components and their responsibilities

1. **Multer (existing, unchanged)** — multipart parse + MIME/size guards (`middleware/upload.ts`).
2. **New `fs`/`path` storage driver (one small module)** — safe write/unlink/verify inside
   `UPLOADS_ROOT`; used by `media.service.ts uploadMedia/deleteMedia` and
   `imagekit.service.ts`-successor avatar functions (rename to a provider-neutral `storage/*` path;
   keep function signatures so callers barely change).
3. **Express file serving (one mount/route in `app.ts`)** — public `express.static(UPLOADS_ROOT,
   { maxAge, etag, dotfiles:"deny", index:false })` for `/uploads/media/…` + optional authenticated
   route for `/uploads/avatars/…`.
4. **Existing Mongo models (evolved, not replaced)** — `MediaModel` + `UserModel` gain additive
   `storageProvider` (+ keep `url`/`storageKey` semantics; values become relative paths for new rows).
5. **Existing Vite admin + client (unchanged calls)** — same endpoints, same `{ id, url }` contract;
   only URL origins change.

### 9.3 Existing modules that can be reused (no rewrite)

`middleware/upload.ts` (both parsers + size guards), `modules/media/*` (routes/controller/service
shape/schema/model helpers), `modules/auth/*` (me/avatar route + service shape), `middleware/auth.ts`,
`middleware/validate.ts`, `middleware/rate-limit.ts`, `utils/*` (slug, pagination, AppError),
`modules/cms/*` + `roomTypes/*` + `settings/*` + `amenities/*` reference patterns,
`admin/.../use-media.ts` + `MediaPage` + pickers + CKEditor adapter, `client/.../media.api.ts` +
`use-media.ts` + all render components.

### 9.4 Files that will need modification (real paths — no invented modules)

| Change | Files |
|---|---|
| New storage driver + config | NEW `server/src/integrations/storage/local-storage.ts` (or `storage/*`); `server/src/config/env.ts` (+ `UPLOADS_ROOT`, `APP_PUBLIC_URL`/`API_ORIGIN`); `server/.env.example`; `server/.env.production.example` |
| Service swap (ImageKit → local) | `server/src/modules/media/media.service.ts` (upload/delete bodies only); avatar service (rewrite of `server/src/integrations/imagekit/imagekit.service.ts` into provider-neutral storage; old path removed after transition) |
| Serving | `server/src/app.ts` (static mount / file route + headers) |
| Schema (additive) | `server/src/modules/media/media.model.ts` (`storageProvider` + optional `localPath` alias/back-compat); `server/src/modules/users/user.model.ts` (same for avatars) |
| Ref-check hardening | `server/src/modules/media/media.service.ts:98-126` (extend beyond pages/blogs/offers) |
| Deps/docs/scripts | `server/package.json` (remove `imagekit` only at the end); `server/scripts/upload-floorplan.ts`, `bulk-media-replace.ts` (rewrite or retire); `admin/src/components/common/ckeditor-upload-adapter.ts:13` (comment); `docs/*` + `FLOW.md` + `PROJECT_STATUS.md` media mentions; `server/.gitignore` (+ local `uploads/` exclusion if a dev path is used) |
| Tests | Extend `server/tests/media-folders.test.ts` family (driver unit tests: traversal, collision, partial-failure, ref-check) |

### 9.5 Required dependencies, if any

**None for the migration.** `multer`, `express`, `mongoose` already cover parse/serve/track.
`@types/multer`, `@types/express`, `@types/node` already present. **Do not add `sharp`** unless a
later approved step needs transforms/dimensions (§4).

### 9.6 Backward-compatibility requirements

Coexistence of `imagekit` and `local` rows (§5.2–5.3); stable `_id`s so business-record `*MediaId`
refs never rewrite; RTE HTML migrated in a separate reviewed pass; ImageKit account/files/env/keys
retained until §10 passes; no destructive bulk script.

### 9.7 Hosting questions that remain unresolved **[UNRESOLVED / BLOCKER]**

The five §6.2 rows — persistent path, restart/redeploy survival, instance count/shared FS,
post-deploy accessibility, and (confirmed separate) frontend/backend origins with their CORS/cache
implications. **No local-storage code is production-safe until the first four are answered by the
host panel/docs and proven by §10.9.**

### 9.8 Risks and mitigations

| Risk | Mitigation |
|---|---|
| Files wiped on redeploy (zip replaces app dir) | Store outside the zip on a verified persistent path; §10.9 gate |
| Disk-full outage | Quota guard + monitoring + alert (§8.2/8.4) |
| Orphaned/missing files after partial failures | Write→DB→cleanup ordering + sweeper + warn-level logging (§7/§8.8) |
| Referenced file deleted | Extended ref-check + delete-by-id-only (§7.2/§8.6) |
| RTE embeds break silently | Separate HTML migration pass with per-doc review (§5.3) |
| Multi-instance divergence | Confirm topology first; sticky/shared storage if needed (§6/§8.10) |
| Private-asset leak via public URLs | Auth-gated avatar route (§8.9) |
| Premature ImageKit teardown | Ordered decommission gated on §10 (§5.4) |

### 9.9 Phased migration plan

- **Phase 0 — Verify hosting (gate).** Resolve §6; record persistent path, quota, instance count.
  Abort to fallback §6.3(2) if persistence is unavailable. No code ships before this.
- **Phase 1 — Local driver + serving (dual-read).** Ship driver, config, serving mount, additive schema
  field. Old rows untouched; new uploads go local. Acceptance: §10.1–10.6 + 10.10 on staging.
- **Phase 2 — Backfill batches.** Migrate binaries + rows in verified batches with rollback (§5.3);
  RTE pass separately. Old ImageKit files retained per batch.
- **Phase 3 — Persistence + regression.** Restart/redeploy survival (§10.9), existing-asset
  accessibility (§10.7–10.8), orphan/validation checks.
- **Phase 4 — Decommission.** Delete ImageKit files → remove env keys → remove SDK dep + dead code.
  Final sweep: zero `getImageKit`/`deleteFile`/upload calls outside history (§10.11).

### 9.10 Acceptance criteria for declaring the migration complete

The eleven tests in §10 must all pass on production (or prod-like staging with the same host plan),
evidenced by logs/screenshots/disk listings, before ImageKit is decommissioned.

---

## 10. Migration acceptance criteria

Each criterion states the test and the evidence required. **[RECOMMENDATION]**

1. **Admin can upload an asset successfully.** Upload JPEG/PNG/WebP/AVIF (≤ 8 MB) and MP4/WebM
   (≤ 50 MB) via `MediaPage` + CKEditor adapter + avatar `PATCH /me`; expect `201` with `{ id, url }`.
   Evidence: response payloads + library entries.
2. **The uploaded file exists on the intended persistent disk.** `ls`/stat the derived path under
   `UPLOADS_ROOT` (outside the deploy zip); byte-size matches `Media.size`. Evidence: shell listing.
3. **MongoDB stores the correct file path and metadata.** Row has `storageProvider:"local"`,
   `storageKey` = relative path, `url` = backend URL resolving to (2), plus `mime/kind/folder/size`
   (and dims where available). Evidence: `db.media.findOne({_id})` output.
4. **The returned image URL loads correctly.** `GET <url>` → `200`, correct `Content-Type`,
   cache headers, bytes render in admin + client + direct browser load. Evidence: HTTP dump + screenshots.
5. **Admin can update and delete assets.** `PATCH /:id` (alt/caption/folder) + in-place binary replace +
   `DELETE /:id` (409 when referenced, 200 + file gone when not). Evidence: API transcripts + disk state.
6. **Failed database operations do not silently leave orphaned files.** Kill/rollback the DB write in a
   staging fault-injection run; assert the partial file is removed and an error is logged. Evidence:
   test log + disk diff. (Mirrors the current ImageKit-then-Mongo orphan window being closed.)
7. **Existing assets remain accessible during migration.** Sample of pre-migration `ik.*` URLs + new
   local URLs both resolve throughout Phases 1–2. Evidence: URL checklist with status codes.
8. **Existing business records and asset references are not unintentionally broken.** Room-type galleries,
   floorplans, CMS pages/blogs/offers, amenities, settings logo/favicon/SEO images, and RTE renders
   identical (modulo origin) before/after; zero new 404s in resolve endpoints. Evidence: page-by-page
   visual + `resolve` diff.
9. **Files survive a backend restart and a deployment test.** Write → restart → read → redeploy via
   `deploy:zip` flow → read again; bytes + Mongo rows intact. Evidence: before/after hashes.
   **[This is the §6 BLOCKER gate — failure here stops the migration.]**
10. **Upload authorization and file validation work correctly.** Unauthenticated upload → 401; non-admin
    → 403; disallowed MIME (e.g. `.svg`/`.exe`/renamed binary) → 400 `INVALID_FILE_TYPE`; oversize →
    400 `FILE_TOO_LARGE`; traversal filename (`../../x`) contained; rate-limit trips under flood.
    Evidence: negative-test transcript.
11. **No ImageKit upload/delete calls remain after migration, except during an explicitly planned
    transition period.** `grep -rn "getImageKit\|imagekit\|IMAGEKIT" server/src admin/src client/src`
    returns only historical docs/changelog mentions; `package.json` no longer lists `imagekit`;
    env examples carry no `IMAGEKIT_*`. Evidence: grep output + `package.json` diff. (Coexistence-period
    exceptions must be dated and tracked in this file.)

---

## Appendix A — Glossary of labels used

- Anything marked **[CONFIRMED]** cites a file/line or a task requirement above.
- Anything marked **[RECOMMENDATION]** is proposed and safe to challenge.
- Anything marked **[ASSUMPTION — NEEDS CONFIRMATION]** must be confirmed with the host/client.
- Anything marked **[UNRESOLVED / BLOCKER]** gates production readiness — §6 and §10.9 in particular.

## Appendix B — What was deliberately not recommended

- No new `Asset.*` modules (would duplicate `media.*`).
- No `sharp` install (no transformation/optimization usage found).
- No CDN configuration (none exists; direct delivery + headers suffice until the host offers one).
- No third-party fallback (violates the confirmed client requirement).
- No bulk delete-and-reupload (the existing `bulk-media-replace.ts` pattern breaks references by design).

---

*End of report. Source code untouched; no secrets disclosed. Next action: resolve the §6 BLOCKER with
the hosting provider/panel, then proceed Phase 0 → Phase 1.*
