# Production database rollout

Hub, landing, and play share one MySQL database. The Prisma schema is the same file in each app (`hub/prisma/schema.prisma`, `landing/prisma/schema.prisma`, `play/prisma/schema.prisma`). Migration history lives only under `play/prisma/migrations`. Run every Prisma migrate command from `play/`.

Production was created with `prisma db push`. It has no `_prisma_migrations` table and no `Room`, `Player`, or `Turn` tables. `Room.hostId` is optional in the schema and in the migration: a room row is inserted before its host player exists.

## Migrations

| Migration | What it does on production |
| --- | --- |
| `20250226000000_baseline` | Records the schema that is already in production. **Mark it applied. Do not execute `migration.sql`.** It `CREATE`s every existing table and will fail if it is run. |
| `20261102000000_phase1_rooms` | Additive only. Creates `Room`, `Player`, and `Turn` (MySQL `ENUM` columns inline), indexes, and foreign keys. Does not alter or delete existing tables or rows. |
| `20261102120000_payment_status_expired_cancelled` | Additive only. Appends `CANCELLED` and `EXPIRED` to `Payment.status` and adds nullable `Payment.productId`. |
| `20261102153000_add_home_order` | Additive only. Creates `HomeOrder` for the Tappen Home preorder. Does not alter existing tables. |

`20260815023708_phase1_rooms` was removed. It recreated the whole schema and cannot be deployed onto production.

## Rollout

Do this only against production after an explicit go-ahead. These steps do not belong in CI.

1. **Back up the production database** and confirm the backup can be restored. Stop here if the backup is missing or untested.
2. Deploy this revision of the repo first so the migration files on the server match what you resolve and deploy. Do not run `prisma db push` from hub, landing, or play against production.
3. From `play/`, mark the baseline applied. This writes a row to `_prisma_migrations` and does not run the baseline SQL:

   ```bash
   cd play
   DATABASE_URL="<production DATABASE_URL>" npx prisma migrate resolve --applied 20250226000000_baseline
   ```

4. Apply every migration that is not the baseline:

   ```bash
   DATABASE_URL="<production DATABASE_URL>" npx prisma migrate deploy
   ```

   `migrate deploy` creates `_prisma_migrations` if needed, sees the baseline as already applied, and runs the later folders in order: `20261102000000_phase1_rooms`, `20261102120000_payment_status_expired_cancelled`, and `20261102153000_add_home_order`. Do not execute `20250226000000_baseline`.

5. Start play with `npm start` (`NODE_ENV=production node server.js`).

After this, schema changes go through a new migration in `play/prisma/migrations`, then `prisma migrate deploy` from `play/`. Do not run `prisma db push` from hub or landing against this database; that is what left production without a migration history.

## Local databases

A local database that already applied `20260815023708_phase1_rooms` is not on this history. Reset it locally (`npx prisma migrate reset` from `play/`) or recreate it. Do not run `migrate reset` against production.
