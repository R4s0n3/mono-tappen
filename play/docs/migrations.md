# Database

Hub, landing, and play share one PostgreSQL database. The Prisma schema is the same file in each app (`hub/prisma/schema.prisma`, `landing/prisma/schema.prisma`, `play/prisma/schema.prisma`). Migration history lives only under `play/prisma/migrations`. Run every Prisma migrate command from `play/`.

The provider is `postgresql`. Do not run `prisma db push` against production.

## Cutover from MySQL

Production today is MySQL 8. The Postgres baseline `0_init_postgres` creates the same tables, columns, and foreign keys. It does not copy rows. Copy the data with `scripts/migrate-mysql-to-postgres.ts` after the empty schema exists. Do not use pgloader: 3.6.10 fails on MySQL 8.4 collation metadata (`76 fell through ECASE expression`).

Do this only with an explicit go-ahead. These steps do not belong in CI.

1. Stop play, hub, and landing so MySQL receives no more writes.
2. Back up the MySQL database and confirm the backup can be restored. Stop here if the backup is missing or untested.
3. Create an empty PostgreSQL database on Coolify. The role that runs migrations needs permission to create types and tables in that database. No extension is required.
4. Deploy this revision so the server has `play/prisma/migrations/0_init_postgres` and does not still have the MySQL migration folders.
5. Apply the baseline to the empty database. From `play/`:

   ```bash
   cd play
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB" npx prisma migrate deploy
   ```

   `migrate deploy` creates every table and writes `_prisma_migrations`. It does not copy application rows. Do not run `prisma db push`, `prisma migrate dev`, or `prisma migrate reset` against production.

6. Copy the rows. From `scripts/`, after `npm install`. Pass the URLs in the environment, never as arguments. Percent-encode passwords. The script does not print the URLs.

   ```bash
   cd scripts
   npm install
   SOURCE_MYSQL_URL="mysql://USER:PASSWORD@HOST:3306/DB" \
   TARGET_POSTGRES_URL="postgresql://USER:PASSWORD@HOST:5432/DB" \
   npx tsx migrate-mysql-to-postgres.ts
   ```

   The target data tables must be empty. `_prisma_migrations` is skipped. The script copies every other table in foreign-key order inside one transaction, turns MySQL `tinyint(1)` into boolean, keeps `datetime(3)` clock times as `timestamp(3)` without a timezone shift, and sets sequences so the next `Card.idx` and `Subscription.id` are `max(id) + 1`. It prints `source=` and `target=` counts and exits non-zero if any table differs. A mismatch rolls the copy back.

   A copy of production data checked out at `Card.idx` next = 118 and `Subscription.id` next = 2. Confirm the script's `sequence ... next=` lines match `MAX(column) + 1` before starting the apps. If rows were added after that check, the script follows the new maximum.

7. Point `DATABASE_URL` on play, hub, and landing at the Postgres database and start the apps. Keep the MySQL backup until the new database has been checked in production.

Re-running the copy against tables that already contain rows fails on purpose. `--truncate` replaces those rows and still leaves `_prisma_migrations` in place. Use it only when you intend to discard the Postgres copy and load MySQL again.

After this, schema changes go through a new migration in `play/prisma/migrations`, then `prisma migrate deploy` from `play/`.

## What changed from MySQL

- String columns are Postgres `text`, which is Prisma's PostgreSQL mapping for `String`. `@db.Text` columns stay `text`. Existing values fit. Postgres does not enforce the old `varchar(191)` cap.
- Index names that used to match a foreign-key constraint (`Card_authorId_fkey` and the other `@@index` maps ending in `_fkey`) are now `*_idx`. Postgres cannot give an index and a constraint the same name (`Prisma P1012`). The foreign-key constraints keep the `*_fkey` names.
- `User.email`, `Tag.name`, skin names, product names, and the built-in Tappen account lookup compare with Prisma `mode: "insensitive"`, which is how `utf8mb4_unicode_ci` behaved. Room codes are stored and queried in uppercase. There is no `contains` filter in the apps. The unique index on `User.email` is case-sensitive; production currently has no two emails that differ only by case. NextAuth still looks up the exact stored address.
- Raw `SELECT … FOR UPDATE` statements quote `"Payment"`, `"HomeBoxCode"`, `"HomeOrder"`, and `"codeHash"`. Unquoted identifiers would fold to lowercase and miss the Prisma tables.

## Local databases

```bash
cd play
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/tappen" npx prisma migrate deploy
```

A local database created from the old MySQL migration history is not on this history. Create a new Postgres database and deploy `0_init_postgres`. Do not run `migrate reset` against production.
