# Reservation API: MongoDB → MySQL Migration Plan

**Status:** Draft — gated discovery. No schema or code rewrite may start until Phase 0 gates pass.
**Application:** `reservation-server`
**Target runtime:** GoDaddy Node.js Hosting (Node.js 22, persistent process)
**Target database:** MySQL 8.x / InnoDB — exact product and version must be confirmed in Phase 0
**ORM:** Prisma (CLI and client pinned to the same version)
**Migration branch:** `feature/mysql-migration`
**Last reviewed:** 2026-10-25

---

## Review notes — what this revision improves

This revision keeps the original plan's structure and adds the items that were missing or too vague:

1. **Data safety is now a first-class gate** with exact backup, checksum, restore-drill and reconciliation steps.
2. **Two new mandatory gates:** G5 (prove how migrations will actually be executed on GoDaddy) and G6 (prove Prisma builds and runs on the GoDaddy runtime).
3. **GoDaddy/Prisma deployment specifics:** Prisma CLI must be a production dependency, `prisma generate` must run during the GoDaddy build, Linux engine targets must be correct, and migrations must not run from the build or every app start.
4. **A concrete booking-lock design** (date-lock table + ordered `SELECT ... FOR UPDATE`) instead of a generic "use transactions" instruction.
5. **Notification queue details:** claim token, stale-claim reaper, retry/backoff and multi-worker tests.
6. **API compatibility checklist:** `_id` vs `id`, `__v`, `select: false` sensitive fields, Decimal/BigInt/Date JSON serialization and ObjectId validation.
7. **Secret handling is resolved explicitly** for the current `deploy.env` fallback, including the fact that the deployment ZIP then contains secrets.
8. **Timeline, ownership, Definition of Done, open questions and command appendices** were added so the plan can be executed and signed off, not just read.

---

## 0. How to use this document

- Treat this as a **gated runbook**, not a wish list. A failed gate stops the migration until it is resolved or the project is deliberately cancelled.
- Phase 0 must produce evidence. Record evidence links/IDs in the decision log; never record passwords or full connection strings.
- The public REST API and the client/admin frontends must remain unchanged. Any contract change requires explicit approval.
- Keep the original MongoDB implementation on `main` or a tagged release for the entire migration and observation window.
- The Atlas cluster, its backup and its credentials are not deleted until sign-off.

---

## 1. Executive summary

The API currently uses MongoDB/Mongoose. GoDaddy Node.js Hosting cannot reach MongoDB Atlas because outbound TCP connections to port `27017` fail with `EACCES`. The proposed fix is to replace the persistence layer with Prisma + MySQL, using the MySQL resource available to the GoDaddy Node.js app.

**The critical unknown is not the ORM.** It is whether the GoDaddy Node.js runtime can actually reach the target MySQL on port `3306`, and whether a migration can be executed safely on that platform. Those two facts must be proven before any of the 28 models are rewritten.

**Decision checkpoint:** after Phase 0, compare the verified migration path against the alternative of running the API on Render/VPS with MongoDB Atlas and using the paid Deluxe plan for the frontends. The Deluxe plan is not wasted in that option; it includes Node.js Hosting for client/admin apps. A sunk hosting cost is not a reason to accept a high-risk rewrite without evidence.

---

## 2. Objectives and non-goals

### Objectives

- Replace Mongoose persistence with Prisma + MySQL.
- Preserve existing REST endpoints, request/response shapes, status codes and frontend behavior.
- Preserve existing 24-character ObjectId strings as identifiers where the API exposes them.
- Preserve booking inventory correctness, payment/webhook idempotency, notification retries and CMS behavior.
- Migrate Atlas data without losing records or relationships.
- Deploy and operate the API on a verified GoDaddy Node.js Hosting + MySQL configuration.
- Leave a tested rollback path.

### Non-goals

- Redesigning the client or admin frontend.
- Changing payment, email or FTP-storage provider behavior.
- Rewriting the API contract unless a documented incompatibility makes it unavoidable.
- Deleting the Atlas cluster during migration.
- Assuming a cPanel MySQL database is automatically reachable from Node.js Hosting.
- Zero-downtime cutover. The safe default is a short maintenance window.

---

## 3. Current codebase inventory — revalidate before implementation

The initial exploration reported these **baseline** figures. They are not guaranteed current counts; Phase 0 must rescan the migration branch.

| Item | Baseline |
|---|---:|
| Mongoose models | 28 |
| Model files | 24 |
| Service files | 27 |
| Repository files | 10 |
| Route files | 28 |
| Files importing Mongoose/models | 76 / 226 |
| `.populate()` usages | 0 |
| `.aggregate()` call sites | 10 |
| `startSession` / `withTransaction` | 1 booking flow |
| `findOneAndUpdate` | 11 |
| `findByIdAndUpdate` | 20 |
| `updateMany` | 3 |
| `bulkWrite` | 1 |
| `$lookup` / `$unwind` / `$group` | 1 / 1 / 7 |

High-risk areas reported in the initial scan:

- `src/modules/bookings/booking.service.ts` (booking transaction, inventory, coupon quota)
- `src/modules/bookings/booking.repository.ts` (date-overlap queries)
- `src/modules/cms/cms.service.ts` (745 lines, optimistic concurrency, dynamic sections)
- `src/modules/dashboard/sales.service.ts` (aggregations, `$lookup`/`$unwind`)
- `src/modules/notifications/notification.*` (queue claim, retries, worker)
- `src/modules/coupons/coupon.repository.ts` (`$expr` atomic quota increment)
- `src/modules/ratePlans/daily-price.service.ts` (`bulkWrite` upserts)
- `src/modules/media/media.*` (`distinct`, regex folder subtree, media references)

---

## 4. Data safety protocol — non-negotiable

The migration must not start until this section is complete. The goal is **zero data loss**, not "we can probably restore it."

### 4.1 Full MongoDB backup before any migration work

- Use MongoDB Database Tools compatible with the Atlas server version.
- Take a consistent backup of the entire `reservation` database.
- Atlas free/shared tiers may not provide continuous backups; `mongodump` is then the primary backup. If the tier provides snapshots, record the snapshot ID as well, but still perform a restore test.
- Uploaded media lives on GoDaddy FTP, not in MongoDB. Take a separate FTP backup of the `media/` and `avatars/` trees if they are not already covered by the hosting backup.
- Prefer `mongodump --oplog` against the Atlas replica set for a point-in-time-consistent archive **if the installed Database Tools and Atlas tier support it**. If `--oplog` is unavailable, use an Atlas snapshot/backup or a quiesced logical dump during a write freeze.
- Store the archive outside the repository, outside the deployment ZIP and outside the GoDaddy app directory.
- Encrypt the archive at rest and record a SHA-256 checksum.
- Record the timestamp, tool version, source cluster and per-collection document counts.

Example (placeholders only; use a secure shell/history and never paste credentials into chat or source control):

```bash
mongodump \
  --uri="$MONGODB_URI" \
  --oplog \
  --gzip \
  --archive="atlas-reservation-$(date +%Y%m%d-%H%M%S).archive.gz"

sha256sum atlas-reservation-*.archive.gz > atlas-reservation.sha256
```

Collection counts:

```bash
mongosh "$MONGODB_URI" --quiet --eval '
  db.getCollectionNames().sort().forEach(c => {
    print(c, db.getCollection(c).countDocuments({}));
  });
'
```

### 4.2 Restore drill

A backup is not verified until it has been restored.

- Restore the archive into a **separate** test cluster or a separate database name. For a namespace-remapped drill (`--nsFrom`/`--nsTo`), use a logical dump; use an oplog archive for point-in-time recovery in a separate cluster.
- Do not restore over production.
- Compare per-collection counts between the source and the restored copy.
- Spot-check critical records: bookings, booking items, payments, refunds, users, properties, room types, CMS pages, media metadata.
- Verify that ObjectId strings, dates, decimal amounts and references survived.

Example restore to a separate database:

```bash
mongorestore \
  --uri="$RESTORE_MONGODB_URI" \
  --gzip \
  --archive="atlas-reservation.archive.gz" \
  --nsFrom='reservation.*' \
  --nsTo='reservation_restore_test.*'
```

Record the restore result and counts in the migration decision log.

### 4.3 Migration rehearsal

- Rehearse the full export → transform → import against a copy of production data.
- Never use the live production database for the first rehearsal.
- Produce a per-collection report: read, inserted, updated, skipped, rejected.
- Validate row counts, foreign keys, unique values, booking totals, payment totals, CMS/media references and date/time values.
- Keep the rehearsal report with the sign-off.

### 4.4 Final cutover protection

- Take a final Atlas snapshot/backup immediately before the maintenance window.
- Freeze writes during the final export and import.
- Export a final delta only if writes cannot be frozen; prove the delta logic with a rehearsal.
- After import, reconcile counts and financial totals before switching traffic.
- Do not delete or modify Atlas until the agreed observation window has passed.

### 4.5 Data-safety gate

**G4 passes only when:** backup checksum recorded, restore drill succeeded, counts match, and the rehearsal report has no unexplained missing records.

---

## 5. Phase 0 — Discovery, gates, backup and connectivity

Phase 0 is the only phase that may run before the migration branch is created. Its purpose is to prevent a multi-week rewrite that cannot deploy.

### 5.1 Mandatory go/no-go gates

| Gate | Required evidence | If it fails |
|---|---|---|
| **G0 — Identify the target DB** | Confirm whether the app uses its built-in/attached managed MySQL or a separate cPanel Web Hosting database. Record host, port, database name and product name. | Stop and clarify the product/hosting boundary with GoDaddy. Do not guess. |
| **G1 — Network connectivity** | A temporary diagnostic running in the **same runtime/network as production** resolves the DB host, opens TCP `3306`, authenticates and runs `SELECT VERSION(), DATABASE(), CURRENT_USER()`. | Ask GoDaddy which DB endpoint is supported. Do not migrate yet. |
| **G2 — MySQL compatibility** | Exact product/version, InnoDB, `JSON`, `CHECK` constraints, `SKIP LOCKED`, `utf8mb4`, SQL mode, `max_allowed_packet` and transaction behavior recorded. | Adjust schema/queries or choose a different DB resource. |
| **G3 — Capacity** | Storage quota, connection limit, idle timeout, backup/restore method and expected workload recorded. | Reconsider the DB tier or hosting. |
| **G4 — Data safety** | Full Atlas backup + checksum + successful restore drill + counts. | Do not start data migration. |
| **G5 — Migration execution mechanism** | Prove how `prisma migrate deploy` (or generated SQL) will be executed against the target DB. Create and remove a harmless `migration_probe` table as proof. | Choose another mechanism before schema work. |
| **G6 — Prisma runtime** | `prisma generate` and `@prisma/client` work on the GoDaddy build/runtime; the correct Linux engine binary loads; the app can run a `SELECT 1`. | Fix engine targets/mirror or use generated SQL + `mysql2` for the data layer. |

### 5.2 Preview vs published environment

GoDaddy advertises managed MySQL with published apps. The database may **not** exist in Preview. If that is the case:

- Use the app's published variant, or a temporary published diagnostic app, for G1/G5.
- Do not assume that a database visible in cPanel/phpMyAdmin is reachable from Node.js Hosting.
- cPanel "Remote MySQL" allowlists control access to the cPanel database server; they do not prove that the Node.js Hosting network can reach it.

### 5.3 Freeze and branch

- Freeze feature work on `main`.
- Create `feature/mysql-migration`.
- Record the exact deployed commit and environment-variable names (never values).
- Keep `main` as the MongoDB rollback branch.

### 5.4 Full codebase rescan

Search the entire server codebase for:

- Mongoose imports, model usage, `ObjectId`, `Types.ObjectId`, `Mixed`, schema hooks, validators, virtuals.
- `aggregate`, `$lookup`, `$unwind`, `$group`, `$expr`, `$regex`, `$in`, `$nin`, `$or`, `distinct`.
- `findOneAndUpdate`, `findByIdAndUpdate`, `updateMany`, `bulkWrite`, `deleteOne`, `deleteMany`.
- sessions, transactions, indexes, TTL indexes, unique/sparse indexes.
- implicit defaults, timestamps, middleware, `toJSON`/serialization transforms.
- document methods: `save`, `toObject`, `lean`, `_id.toString()`, sorting by `_id`.
- routes/controllers that call models directly instead of repositories.
- seed, backup, restore and migration scripts.
- `media` reference checks against CMS arrays (`sections.mediaIds`, `images.mediaId`, etc.).

Deliver a file-by-file migration matrix with:

- source file and model;
- operations used;
- proposed Prisma/SQL replacement;
- transaction requirement;
- test requirement;
- owner/status.

**Exit criteria for Phase 0:** all gates pass, backup/restore verified, rescan matrix complete, branch created.

---

## 6. Architecture and technical decisions

### 6.1 Persistence architecture

```text
React Client ─┐
              ├── Existing REST API ── Prisma Client ── MySQL / InnoDB
React Admin ──┘
```

Keep controllers and routes thin. Put database-specific behavior in repositories/data-access modules. Services express business rules and use repository methods or Prisma transactions.

### 6.2 Prisma on GoDaddy — build and runtime rules

These are deployment-critical:

- **Prisma CLI must be in `dependencies`, not `devDependencies`.** GoDaddy installs production dependencies before running the build. If `prisma generate` is part of `npm run build`, the CLI must be present.
- Add an explicit build step. In this repo, `compile` currently runs `tsc` + postbuild and `build` runs only the postbuild step for GoDaddy. Update them so `prisma generate` runs before compilation and also in the GoDaddy `build` step (for example: `compile` = `prisma generate && tsc -p tsconfig.build.json && node scripts/postbuild-node.cjs`; `build` = `prisma generate && node scripts/postbuild-node.cjs`). Keep `deploy:zip` calling `compile`.
- Keep `prisma/schema.prisma` and `prisma/migrations/` in the deployment ZIP; exclude `node_modules`.
- Do **not** run `prisma migrate deploy` from the build command or from every app startup. Migrations are a separate, controlled release step (G5).
- Pin `prisma` and `@prisma/client` to exactly the same version.
- Set engine targets for the GoDaddy Linux runtime. Confirm the base image/OpenSSL version in G6. A safe starting point:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

- If GoDaddy's build network blocks Prisma engine downloads, configure an approved `PRISMA_ENGINES_MIRROR` or use `prisma migrate diff` to generate SQL and apply it through the DB console. Test this in G6 before the real migration.
- Use one Prisma Client instance with a bounded connection pool. Set `connection_limit` and `pool_timeout` in `DATABASE_URL` based on the GoDaddy connection limit recorded in G3.
- `prisma migrate dev` is local-only. Production uses `prisma migrate deploy` or reviewed SQL.
- Never use `prisma db push` against production.
- Use `$queryRaw`/`$executeRaw` only with parameterized `Prisma.sql`; never concatenate user input. Raw SQL is expected for `SELECT ... FOR UPDATE SKIP LOCKED`, complex reporting and bulk loading.
- Prisma's `update` returns the updated record; it internally performs the update and a read. If strict atomic read-after-write is required, wrap the update and read in `prisma.$transaction` or use reviewed SQL.
- Map Prisma errors to the existing API error format; replace Mongo duplicate-key `11000` with Prisma `P2002`/MySQL `ER_DUP_ENTRY` handling.

### 6.3 Identifiers

- Preserve existing MongoDB ObjectId values as 24-character lowercase hex strings.
- Use `CHAR(24)` with a binary/ASCII collation for migrated IDs and foreign keys. All FK columns must use the same charset/collation or MySQL will reject the constraint.
- Generate new IDs with the `bson` package's `ObjectId` (add `bson` to `dependencies`) or an equivalent 12-byte hex generator, not `AUTO_INCREMENT`, for API-visible entities.
- Preserve ObjectId timestamp semantics if any code sorts by `_id`.
- Replace `mongoose.Types.ObjectId.isValid` with a shared `/^[a-f0-9]{24}$/i` validator and return the same API error shape.
- Keep an explicit ID mapper so Prisma's `id` field is serialized as `_id` where the existing API expects `_id`.

### 6.4 Data types and embedded documents

| MongoDB/BSON | MySQL | Prisma | Notes |
|---|---|---|---|
| ObjectId | `CHAR(24)` ASCII/binary | `String @db.Char(24)` | Preserve hex; same collation on FKs |
| String | `VARCHAR(n)` / `TEXT` | `String @db.VarChar(n)` / `@db.Text` | Choose lengths from real data |
| Int32 | `INT` | `Int` | |
| Int64 | `BIGINT` | `BigInt` | JSON serialization needs a string mapper |
| Double | `DOUBLE` | `Float` | Never use for money |
| Decimal128 | `DECIMAL(p,s)` | `Decimal` | Money and rates; never float |
| Boolean | `TINYINT(1)` | `Boolean` | |
| Date | `DATETIME(3)` | `DateTime` | Store UTC; document conversion |
| Array | Join table or `JSON` | Relation or `Json` | Decide per field |
| Embedded document | Columns or `JSON` | Relation or `Json` | Decide per field |
| Binary | `VARBINARY` / `BLOB` | `Bytes` | |
| Missing field | `NULL` or default | Optional/default | Match existing API behavior |

Decision rules:

- Normalize high-cardinality or independently queried collections into tables.
- Use `JSON` only for bounded document-like data that is not central to joins, filtering, uniqueness or reporting.
- Validate JSON at the application boundary with the existing schema/Zod validation.
- Do not use `JSON` for CMS `sections` if media/room-type references must be queried; add join tables or generated columns and indexes.
- Define money precision explicitly (`DECIMAL(12,2)` or `DECIMAL(14,4)`); never floating point.
- Define `ON DELETE` behavior (`RESTRICT`, `CASCADE`, `SET NULL`) for every FK.

### 6.5 MySQL behavior corrections

- MySQL 8 does **not** support PostgreSQL-style `UPDATE ... RETURNING`. Prisma's `update` abstracts this, but strict read-after-write must be transactional; raw SQL must use update-then-select inside a transaction.
- MySQL queue claiming must use `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction, followed by an update, then commit. Do not write `UPDATE ... SKIP LOCKED`.
- Verify `SKIP LOCKED` support before relying on it. MySQL 8.0.1+ supports it; MariaDB support differs. If unsupported, use a conditional atomic claim with a unique claim token and bounded retries.
- Use InnoDB for all transactional/locking tables.
- Store and interpret timestamps as UTC. Document how `DATETIME(3)`, Prisma and the application convert values.
- Define collations intentionally. `utf8mb4_0900_ai_ci` (MySQL 8) is case-insensitive; use binary collation for IDs and exact-match keys.
- MySQL unique indexes commonly allow multiple `NULL`s; verify sparse/partial-index behavior per field.
- MySQL 8.0.16+ enforces `CHECK` constraints; verify the target version.
- Avoid `SELECT *` in hot paths; select only required columns, especially to preserve Mongoose `select: false` behavior.

### 6.6 Booking and inventory concurrency (highest risk)

The current availability check is a date-overlap query over booking items. Rows that do not exist cannot be locked, so a pure `SELECT ... FOR UPDATE` on existing bookings can still allow phantom double-bookings.

Recommended design:

1. Add a `booking_date_locks` table with a unique key on `(room_type_id, date)`.
2. In the booking transaction, for every night in the requested range:
   - `INSERT IGNORE` the lock rows in ascending date order;
   - `SELECT ... FOR UPDATE` the same rows in the same order;
   - re-run the availability query and proceed only if inventory is available.
3. Keep lock ordering consistent (sort by `room_type_id`, then `date`) to reduce deadlocks.
4. Use a single InnoDB transaction for availability check, hold/reservation creation, coupon quota consumption and booking state transition.
5. Enforce invariants with constraints where possible:
   - unique `booking_number`;
   - unique webhook event ID;
   - unique coupon usage keys;
   - `CHECK` constraints for non-negative counters if counters are added.
6. Coupon quota: lock the coupon row, then conditionally increment:

```sql
UPDATE coupons
SET usage_count = usage_count + 1
WHERE id = ?
  AND (usage_limit IS NULL OR usage_count < usage_limit);
```

   Check the affected row count and roll back if it is zero.
7. Retry only known transient deadlock/lock-timeout errors (MySQL 1213/1205) with bounded attempts and jitter.
8. Integration-test with real MySQL and real concurrent requests; mock-only tests are insufficient.

If adding a date-lock table is rejected, the alternative is a per-date inventory ledger with `total_units`, `held_units`, `booked_units`, `CHECK` constraints and row locks. Do not rely on application-only checks.

### 6.7 Notification queue design

- Add `claimed_at`, `claim_token` and `claim_expires_at` (or equivalent) to the notification table.
- Claim with a transaction:

```sql
START TRANSACTION;

SELECT id
FROM notifications
WHERE status = 'pending'
  AND next_attempt_at <= UTC_TIMESTAMP(3)
ORDER BY next_attempt_at, id
LIMIT 1
FOR UPDATE SKIP LOCKED;

UPDATE notifications
SET status = 'processing',
    claimed_at = UTC_TIMESTAMP(3),
    claim_token = ?,
    attempts = attempts + 1
WHERE id = ?;

COMMIT;
```

- Process outside the claim transaction.
- On success: mark `sent` with provider message ID and `sent_at`.
- On failure: set `pending` with exponential backoff or `failed` after `max_attempts`.
- Add a reaper that returns stale `processing` rows to `pending` after the claim expires.
- Ensure workers do not start before the DB is connected, and stop claiming on shutdown.
- Test with multiple workers and a queue of jobs; prove one claim per job and no lost/duplicated sends.

### 6.8 API compatibility checklist

- `_id` vs `id`: keep the public JSON shape; map explicitly.
- `__v`: if the API currently exposes it, preserve or remove deliberately with a contract test.
- `createdAt`/`updatedAt`: preserve names and serialization.
- Sensitive fields with `select: false` (`passwordHash`, reset-token fields, legacy avatar fields): Prisma returns all scalars by default. Add repository-level public selects; test that secrets never appear.
- `lean()`/plain objects: Prisma returns plain objects; verify no document methods are relied on.
- Mongoose validators/enums/defaults/trim/lowercase: reimplement at the DTO/service boundary and in the DB schema.
- Decimal/BigInt/Date JSON serialization: convert in DTOs; test response bodies.
- Case-insensitive search and regex queries: test exact behavior, including special characters.
- Pagination/sorting stability: add deterministic tie-breakers; Mongo and MySQL may order ties differently.
- Error codes/status: preserve the existing API error contract.

### 6.9 Security

- Prefer GoDaddy environment/secrets for production values.
- If the `deploy.env` fallback is retained, treat the ZIP as a secret-bearing artifact: never commit it, never share it, transfer it over HTTPS, delete local copies after upload and rotate secrets if it leaks.
- Use TLS for the MySQL connection if the target supports it; do not disable certificate validation in production.
- Use a least-privilege runtime DB user (DML only) and a separate migration user (DDL) if the platform allows it.
- Never log `DATABASE_URL`, passwords or tokens. Add redaction to database error logging.
- Encrypt database backups; restrict access and define retention.
- Review raw SQL for injection; parameterize everything.
- Re-check CORS, JWT, Stripe webhook and FTP credentials after the API domain changes.

---

## 7. Phase plan

### Phase 0 — Discovery, gates, backup and rescan (3–4 days)

- Execute G0–G6.
- Take and verify the full Atlas backup (Section 4).
- Rescan the codebase and produce the file-by-file matrix.
- Freeze `main`, create `feature/mysql-migration`.
- Document the target DB, connection limits, MySQL version and migration mechanism.

**Exit criteria:** all gates pass; backup restored and verified; matrix complete; no unanswered platform question blocks schema design.

### Phase 1 — Relational schema design (3–4 days)

- Build an ERD for every model and relationship.
- Create a data dictionary: Mongo collection → table → PK → FKs → unique indexes → JSON fields → nullability/defaults.
- Decide every embedded array individually (join table vs JSON).
- Define `ON DELETE` behavior, money precision, enum values and legacy-value handling.
- Add indexes for real filters, sort orders and joins.
- Preserve API-facing ID strings.
- Generate the Prisma schema and migrations locally against a compatible MySQL version.
- Review the booking date-lock/inventory design before implementation.

**Exit criteria:** ERD/data dictionary reviewed; `prisma validate` passes; migrations apply cleanly to a local MySQL database.

### Phase 2 — Data-access layer and shared infrastructure (5–7 days)

- Introduce one Prisma Client instance with controlled pooling and graceful shutdown.
- Replace repositories incrementally; keep service signatures stable.
- Implement Prisma error mapping, duplicate-key handling, pagination, sorting, filtering and case-insensitive search.
- Reimplement upserts and update-return semantics with transactions where required.
- Replace `distinct`, regex subtree queries and dotted-array reference checks.
- Add repository integration tests against MySQL.
- Remove Mongoose only after all references are migrated.

**Exit criteria:** repository tests pass; API error/response contracts unchanged; no Mongoose import in migrated code.

### Phase 3 — Booking and inventory transaction (7–9 days)

- Implement the date-lock/inventory design from Section 6.6.
- Test: availability across date boundaries, concurrent last-room requests, duplicate booking numbers, coupon quota, payment linkage, hold expiry/release, cancellation/refund, late payment success, webhook idempotency, deadlock retry.
- Use real MySQL integration tests and a dedicated concurrency suite.

**Exit criteria:** concurrent tests prove no overselling, duplicate allocation, quota overrun or lost hold release.

### Phase 4 — CMS, media and dynamic JSON (3–4 days)

- Migrate CMS collections and page sections.
- Preserve slug uniqueness and preview-token semantics.
- Reimplement optimistic concurrency with a version column and conditional update.
- Reimplement upserts explicitly.
- Validate JSON at read/write boundaries.
- Add join tables/generated columns if sections are queried by media or room-type references.
- Preserve media metadata/storage keys; do not move FTP assets as part of the DB migration.
- Test upload metadata, deletion, folder subtree queries and references.

**Exit criteria:** CMS CRUD, preview, version conflict, media reference and folder query tests pass.

### Phase 5 — Dashboard and reporting queries (2–3 days)

- Translate every aggregation pipeline into reviewed SQL (`$queryRaw`/`Prisma.sql` where needed).
- Match filters, date boundaries, grouping, currency handling and null behavior.
- Compare MongoDB and MySQL results on the same fixture dataset.
- Add indexes based on `EXPLAIN`; do not load entire tables into memory.

**Exit criteria:** dashboard metrics match the MongoDB baseline; accepted differences documented.

### Phase 6 — Notifications, background jobs and webhooks (3–4 days)

- Implement the queue claim, claim token, stale-claim reaper and retry schedule.
- Confirm `SKIP LOCKED` support; otherwise implement the conditional atomic fallback.
- Preserve `idempotencyKey`, attempts, max attempts, retry schedule and error state.
- Make shutdown stop polling and release/complete in-flight work.
- Ensure workers start only after a successful DB connection.
- Test multi-worker correctness and webhook idempotency.

**Exit criteria:** one claim per job, safe retries, no lost notifications, no duplicate sends.

### Phase 7 — Remaining models, indexes and seed data (4–5 days)

- Migrate all remaining models and operations.
- Convert bulk upserts to `INSERT ... ON DUPLICATE KEY UPDATE` only after confirming semantics.
- Rebuild indexes and foreign keys.
- Rewrite seed scripts to be repeatable; separate dev/demo data from production bootstrap.
- Ensure production startup does not create or overwrite administrator credentials.
- Add a CI guard that fails if `mongoose` is imported.

**Exit criteria:** every inventory item has a mapping/test; no runtime Mongoose import remains; seed runs cleanly.

### Phase 8 — Data migration rehearsal (5–6 days)

Build a standalone script (`scripts/migrate-mongo-to-mysql.ts` or equivalent) that runs locally or in a controlled one-off environment. Never run it automatically on web-app startup.

Process:

1. Read from a consistent Atlas snapshot/archive.
2. Convert BSON types to the approved SQL representation.
3. Preserve ObjectId strings and references.
4. Convert dates to UTC `DATETIME(3)`.
5. Insert parents before dependents; insert join rows and JSON documents.
6. Use bounded batches and transactions.
7. Record per-collection inserted/updated/skipped/rejected counts.
8. Make reruns idempotent with stable IDs and explicit upsert rules.
9. Record a `migration_runs` row with source timestamp, script version and counts.
10. Emit a report with row counts, invalid references and rejected records.

Validate:

- collection/document counts vs table/row counts;
- foreign-key integrity and orphan references;
- duplicate IDs/unique values;
- booking totals, statuses and nights;
- room availability, blocks and rate plans;
- CMS pages and media references;
- payment/refund/webhook idempotency records;
- dates, time zones and monetary values.

Run against a copy of production data first. Do not use live production for the first rehearsal.

**Exit criteria:** rehearsal report approved; no unexplained missing records or relationship violations.

### Phase 9 — Application verification (5–7 days)

- Typecheck, lint, unit tests, repository integration tests.
- Booking concurrency tests, notification multi-worker tests, webhook idempotency tests.
- CMS CRUD/version tests, dashboard parity tests.
- API contract tests against existing client/admin expectations.
- Data parity tests comparing MongoDB and MySQL API responses on a fixture dataset.
- Load test with realistic pool size and query patterns.

Smoke tests:

- `/` and `/health`;
- `/ready` returns non-ready when the DB is down and ready only after a successful query;
- login/admin bootstrap;
- property/room listing and availability search;
- booking creation and hold expiry;
- payment/webhook flow in test mode;
- CMS read/write;
- notification enqueue/processing;
- media metadata operations.

**Exit criteria:** all required tests pass; no contract regressions; pool/query limits acceptable.

### Phase 10 — Deployment and cutover (3–5 days including rehearsal)

- Follow the deployment rules in Section 8.
- Run the migration via the proven G5 mechanism.
- Verify `/ready` and all smoke tests on the GoDaddy Preview/published variant.
- Execute the cutover runbook in Section 9.
- Monitor and keep Atlas read-only for the observation window.

**Exit criteria:** production `/ready` confirms MySQL; booking/payment/notification smoke tests pass; data reconciliation signed off.

---

## 8. Deployment and migration execution on GoDaddy

### 8.1 Build and start

- `package.json` must define `build` and `start`.
- `build` runs `prisma generate` and the TypeScript build; `prisma` must therefore be in `dependencies`.
- `start` is `node dist/server.js`; do not run migrations here.
- Include `prisma/schema.prisma`, `prisma/migrations/` and `dist/` in the ZIP.
- Exclude `node_modules`, `.env`, SQL dumps and local test databases.
- Keep the app's `PORT` binding as `process.env.PORT`.

### 8.2 Migration execution options (ranked)

G5 must prove one of these before Phase 1:

1. **Run `prisma migrate deploy` from a controlled local/CI environment with direct network access to the target MySQL.** Simplest, but only if port `3306` is reachable from that environment. Test it; do not assume.
2. **Use a guarded one-off migration app/endpoint on GoDaddy.** Separate app slot or temporary route, protected by a strong one-time secret, deleted/disabled after use; runs the CLI once, logs the result, and exits. It must not be publicly discoverable.
3. **Generate SQL with `prisma migrate diff` and apply it through GoDaddy's DB console/SQL editor.** Works when the platform provides an SQL console but no command execution. Keep the generated SQL reviewed and versioned.
4. **Use GoDaddy support/terminal if available.** Verify in writing that the command runs against the correct database.

Do not start schema work until the chosen mechanism has applied and removed a harmless `migration_probe` table.

### 8.3 Environment variables

Use `DATABASE_URL` for the app. Also verify:

- `NODE_ENV=production`
- `PORT`
- `CLIENT_URL` and `ADMIN_URL`
- `JWT_SECRET` and expiration
- FTP/storage configuration
- Stripe keys and webhook configuration
- Resend configuration
- CORS allowlist and trusted proxy settings

Never commit `.env`, `deploy.env` with real credentials, SQL dumps or database passwords. If the fallback ZIP contains secrets, treat the ZIP as a secret.

### 8.4 ZIP checklist

- [ ] `package.json` has `build` and `start`.
- [ ] `prisma` is in `dependencies`; versions match `@prisma/client`.
- [ ] `prisma/schema.prisma` and `prisma/migrations/` included.
- [ ] `dist/` built from the current commit.
- [ ] `node_modules` excluded.
- [ ] No raw `.env`; `deploy.env` only if the fallback is intentionally used and handled as a secret.
- [ ] Correct engine target for GoDaddy Linux.
- [ ] ZIP tested locally in production mode with a real MySQL connection.

---

## 9. Cutover runbook

### 9.1 Pre-flight (T−48 to T−1 hours)

- [ ] Atlas backup verified; restore drill passed.
- [ ] Migration rehearsal passed; reconciliation report approved.
- [ ] GoDaddy MySQL connectivity and migration mechanism proven.
- [ ] Change freeze announced; maintenance window approved.
- [ ] Frontend API URL/CORS changes prepared if the API domain changes.
- [ ] DNS TTL lowered if a DNS switch is involved.
- [ ] Rollback owner and decision criteria confirmed.
- [ ] Monitoring/alerts ready.

### 9.2 Maintenance window

1. Put the app in read-only/maintenance mode if supported; otherwise announce the freeze.
2. Take a final Atlas backup/snapshot.
3. Freeze writes; stop background workers.
4. Export/import the final data or the validated delta.
5. Run reconciliation:
   - collection vs table counts;
   - booking/payment/refund totals;
   - FK/orphan checks;
   - CMS/media reference checks.
6. Apply schema migrations once via the proven G5 mechanism.
7. Deploy the MySQL API.
8. Verify `/health`, `/ready`, login, property/room listing, availability, booking creation, CMS, notifications, payment webhook test mode.
9. Switch frontend traffic/API domain.
10. Remove maintenance mode.
11. Monitor errors, DB connections, query latency, queue lag, booking success rate and payment webhook failures.

### 9.3 Go/no-go criteria

Proceed only if:

- backup and restore are verified;
- data counts/totals reconcile;
- booking concurrency tests pass;
- `/ready` returns 200;
- critical smoke tests pass;
- rollback path is ready.

### 9.4 Rollback and point of no return

- **Before MySQL accepts production writes:** switch traffic back to the MongoDB API; restore the Atlas backup if needed.
- **After MySQL accepts production writes:** do not blindly switch back. New bookings/payments would be missing from Atlas. Use a documented reverse-sync/reconciliation procedure or forward-fix the MySQL deployment.
- Define the exact point of no return before cutover: the first production write to MySQL.
- Keep Atlas read-only and retained for the agreed observation window.
- Test the rollback path in the rehearsal; do not discover it during an incident.

---

## 10. Testing strategy

### 10.1 Test database

- Use a dedicated MySQL schema/database for tests.
- Provision MySQL 8 locally with Docker Compose or a local service.
- Apply migrations with `prisma migrate deploy`.
- Seed deterministic fixtures.
- Truncate/reset between tests or wrap each test in a transaction.
- Never point tests at production or the GoDaddy managed DB.

### 10.2 Test layers

| Layer | Purpose |
|---|---|
| Unit | Pure business rules; existing 188 tests must pass |
| Repository integration | Prisma queries, constraints, errors, pagination, search |
| Booking concurrency | Parallel requests for the same room/date range |
| Notification multi-worker | One claim per job; retries; stale claims |
| Webhook idempotency | Duplicate provider events do not double-process |
| CMS/version | Optimistic concurrency and JSON validation |
| Dashboard parity | Mongo vs MySQL results on fixtures |
| API contract | Status codes, body shapes, auth, errors |
| Data migration | Counts, FKs, orphans, values |
| Load | Pool limits, query latency, booking throughput |
| Security | Sensitive fields never leak; raw SQL is parameterized |

### 10.3 CI

- Add a MySQL service to CI.
- Run migrations, seed, unit tests, integration tests and contract tests.
- Add a schema drift check (`prisma migrate diff`) and a Mongoose-import guard.
- Fail the build if `prisma/schema.prisma` and migrations are out of sync.

---

## 11. Timeline and ownership

Estimates assume one experienced engineer with AI assistance, a review loop and a real data rehearsal. They are not a commitment until Phase 0 passes.

| Phase | Work | Engineer-days |
|---|---|---:|
| 0 | Gates, backup, restore drill, rescan | 3–4 |
| 1 | ERD, data dictionary, Prisma schema | 3–4 |
| 2 | Repositories, Prisma infrastructure | 5–7 |
| 3 | Booking/inventory transaction + concurrency tests | 7–9 |
| 4 | CMS/media/dynamic JSON | 3–4 |
| 5 | Dashboard/reporting SQL | 2–3 |
| 6 | Notifications/webhooks/workers | 3–4 |
| 7 | Remaining models/seed | 4–5 |
| 8 | Data migration rehearsal | 5–6 |
| 9 | Verification/contract/load tests | 5–7 |
| 10 | Deployment/cutover/rehearsal | 3–5 |
| **Total** | | **43–58 engineer-days** |

**Calendar guidance:** roughly **8–12 weeks end-to-end** for one engineer with review/QA and contingency. With full-time focus and AI assistance, implementation may compress to **5–7 weeks**, but data migration and booking concurrency remain the critical path. Do not promise a launch date before Phase 0.

### Ownership

| Role | Responsibility |
|---|---|
| Migration owner | Plan, execution, evidence, sign-off |
| Backend reviewer | Schema, queries, transactions, API contract |
| QA | Contract, concurrency, data parity, smoke tests |
| Data owner | Backup, restore drill, reconciliation sign-off |
| Release owner | Cutover and rollback decision |
| GoDaddy liaison | DB resource, network route, migration mechanism |

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Node.js app cannot reach the MySQL resource | G1; test from the same runtime before any rewrite |
| cPanel DB differs from the app's managed DB | G0; use the app-attached resource, not a lookalike |
| No way to run migrations on GoDaddy | G5; prove a mechanism with a harmless probe |
| Prisma CLI/engine missing at build/runtime | `prisma` in `dependencies`; explicit generate; Linux engine targets; G6 |
| Prisma engine download blocked | Mirror or generated-SQL fallback; test in G6 |
| Booking double-booking | Date-lock table, ordered row locks, constraints, concurrency tests |
| Deadlocks under load | Consistent lock ordering; bounded retries with jitter |
| Coupon quota overrun | Row lock + conditional update + affected-row check |
| Notification duplicate/lost sends | Claim token, stale-claim reaper, idempotency tests |
| JSON shape drift | Application validation and fixture tests |
| MySQL version lacks required syntax | G2; verify exact version and test SQL there |
| Data loss during migration | Backup, restore drill, rehearsal, counts, final freeze, reconciliation |
| Migration runs twice | Separate controlled release step; never on startup |
| Rollback after new writes | Define point of no return; reverse-sync or forward-fix |
| API behavior changes | Contract/parity tests against existing frontends |
| Connection exhaustion | Bounded pool sized to G3 limits; load test |
| Secrets in deployment ZIP | Prefer platform env; treat ZIP as secret; rotate on leak |
| Sunk-cost pressure causes a rushed migration | Phase 0 decision checkpoint; compare with Render + Atlas option |

---

## 13. Deliverables and Definition of Done

### Deliverables

1. Updated migration inventory and file-by-file matrix.
2. ERD and data dictionary.
3. Prisma schema and versioned SQL migrations.
4. Rewritten repositories/services and database bootstrap.
5. MongoDB-to-MySQL migration/export script.
6. Rehearsal report and data-validation report.
7. Integration, concurrency, contract and parity tests.
8. Deployment/migration runbook for GoDaddy.
9. Environment-variable reference (names only, no secrets).
10. Go-live and rollback checklists.

### Definition of Done

- [ ] G0–G6 passed with evidence.
- [ ] Atlas backup + restore drill passed.
- [ ] No runtime Mongoose imports remain.
- [ ] `prisma validate` and schema/migration drift check pass.
- [ ] All unit, integration, concurrency, contract and parity tests pass.
- [ ] Data rehearsal reconciliation signed off.
- [ ] GoDaddy `/ready` returns 200 with MySQL connected.
- [ ] Booking, payment, notification, CMS and media smoke tests pass.
- [ ] Rollback drill passed; point of no return documented.
- [ ] Atlas retained for the agreed observation window.
- [ ] Frontend API URL/CORS updated if the API domain changed.
- [ ] Monitoring and alerts active.

---

## 14. Open questions and decision log

Record answers with dates and evidence links; do not record secrets.

- [ ] Which exact MySQL product/resource is attached to the GoDaddy Node.js app? Is it the built-in managed MySQL or a cPanel database?
- [ ] Does the managed MySQL exist in Preview, or only after publish?
- [ ] Can the GoDaddy Node.js runtime reach the MySQL host on `3306`? (G1)
- [ ] What is the exact MySQL/MariaDB version, and does it support `JSON`, `CHECK`, `SKIP LOCKED` and `utf8mb4`? (G2)
- [ ] What are the storage, connection and idle-timeout limits? (G3)
- [ ] How will migrations be executed on GoDaddy? (G5)
- [ ] Does Prisma build/run on the GoDaddy Linux runtime, and which engine target/OpenSSL version is required? (G6)
- [ ] Is remote MySQL access available from the developer/CI environment?
- [ ] What is the approved maintenance window and rollback owner?
- [ ] Will the API domain change, requiring frontend/CORS updates?
- [ ] What is the data-retention/PII policy for backups?
- [ ] Is the business comfortable with the 8–12 week end-to-end estimate, or should we evaluate the Render + Atlas option at the Phase 0 checkpoint?

---

## Appendix A — Prisma example (illustrative only)

The final schema must follow Phase 1. This example shows the key mappings:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Booking {
  id            String        @id @db.Char(24)
  bookingNumber String        @unique @db.VarChar(32)
  total         Decimal       @db.Decimal(12, 2)
  pricing       Json?
  createdAt     DateTime      @default(now()) @db.DateTime(3)
  updatedAt     DateTime      @updatedAt @db.DateTime(3)
  items         BookingItem[]

  @@map("bookings")
}

model BookingItem {
  id          String  @id @db.Char(24)
  bookingId   String  @db.Char(24)
  roomTypeId  String  @db.Char(24)
  checkIn     DateTime @db.DateTime(3)
  checkOut    DateTime @db.DateTime(3)
  booking     Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([roomTypeId, checkIn, checkOut])
  @@map("booking_items")
}
```

Notes:

- Use `@@map`/`@map` for stable SQL names if the team prefers snake_case.
- Add column collations for IDs via a custom SQL migration if Prisma cannot express them.
- Convert `Decimal` and `BigInt` to API-safe values in DTOs; test JSON output.

---

## Appendix B — Command runbook (placeholders only)

### B.1 Backup and verify

```bash
# 1. Dump
mongodump --uri="$MONGODB_URI" --oplog --gzip --archive=atlas-reservation.archive.gz

# 2. Checksum
sha256sum atlas-reservation.archive.gz > atlas-reservation.sha256

# 3. Count source collections
mongosh "$MONGODB_URI" --quiet --eval '
  db.getCollectionNames().sort().forEach(c => print(c, db.getCollection(c).countDocuments({})));
'

# 4. Restore to a separate DB/cluster
mongorestore --uri="$RESTORE_MONGODB_URI" --gzip --archive=atlas-reservation.archive.gz \
  --nsFrom='reservation.*' --nsTo='reservation_restore_test.*'

# 5. Count restored collections and compare
mongosh "$RESTORE_MONGODB_URI" --quiet --eval '
  db.getCollectionNames().sort().forEach(c => print(c, db.getCollection(c).countDocuments({})));
'
```

### B.2 Local MySQL + Prisma

```bash
# Local MySQL 8 via Docker (example)
docker run --name reservation-mysql -e MYSQL_ROOT_PASSWORD=localonly \
  -e MYSQL_DATABASE=reservation -p 3306:3306 -d mysql:8

# Prisma
npx prisma validate
npx prisma migrate dev --name init
npx prisma generate
```

### B.3 Migration rehearsal

```bash
# Use the project's TS runner (`bun` or `tsx`).

# Dry run: read and report only
bun scripts/migrate-mongo-to-mysql.ts --dry-run

# Full rehearsal against the test MySQL database
DATABASE_URL="$TEST_MYSQL_URL" bun scripts/migrate-mongo-to-mysql.ts --verify

# Re-run is safe: stable IDs + explicit upserts
DATABASE_URL="$TEST_MYSQL_URL" bun scripts/migrate-mongo-to-mysql.ts --resume
```

### B.4 Production migration (after G5 is proven)

```bash
# Confirm the migration mechanism chosen in Phase 0. Examples:
npx prisma migrate deploy
# or apply reviewed SQL generated by:
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

### B.5 Post-deploy smoke tests

```bash
curl -fsS "https://$API_HOST/" 
curl -fsS "https://$API_HOST/health"
curl -fsS "https://$API_HOST/ready"
```

Do not put real URLs, passwords or tokens in this document.

---

## Appendix C — File-by-file migration matrix template

| Source file | Model(s) | Mongo operations | Prisma/SQL replacement | Transaction? | Test required | Status |
|---|---|---|---|---|---|---|
| `src/modules/bookings/booking.service.ts` | Booking, BookingItem | `startSession`, `withTransaction`, overlap query, coupon update | `$transaction` + date-lock rows + conditional coupon update | Yes | Concurrency, hold expiry, coupon quota | Pending |
| `src/modules/bookings/booking.repository.ts` | Booking, BookingItem | `$in`, `$lt`/`$gt`, `$or`, `$nin` | SQL joins/date ranges with indexes | Sometimes | Date-overlap, pagination | Pending |
| `src/modules/cms/cms.service.ts` | CmsPage, CmsBlogPost, CmsFaq, CmsOffer, CmsPolicyDoc | `findOneAndUpdate`, CAS `version`, upserts | Prisma update/upsert + version check | Yes for CAS | CMS CRUD/version | Pending |
| `src/modules/dashboard/sales.service.ts` | Booking, BookingItem, RoomType | `$group`, `$lookup`, `$unwind` | SQL `GROUP BY`/joins | No | Dashboard parity | Pending |
| `src/modules/notifications/notification.*` | Notification | Queue claim, retries | `FOR UPDATE SKIP LOCKED` + claim token | Yes | Multi-worker | Pending |
| `src/modules/coupons/coupon.repository.ts` | Coupon | `$expr` conditional increment | Row lock + conditional update | Yes | Quota concurrency | Pending |
| `src/modules/ratePlans/daily-price.service.ts` | DailyPrice | `bulkWrite` upserts | `INSERT ... ON DUPLICATE KEY UPDATE` | Batch | Upsert parity | Pending |
| `src/modules/media/media.*` | Media | `distinct`, regex subtree | `SELECT DISTINCT`, `LIKE`/collation | No | Folder/reference queries | Pending |

This matrix must be completed during Phase 0 for every file, not only the high-risk ones above.
