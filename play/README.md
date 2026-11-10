# PLAY TAPPEN APP

[PLAY TAPPEN APP](https://play.tappen.app/)

Prisma schema for hub, landing, and play is identical. Migration history is in this app only.

The database is PostgreSQL. Production cutover from MySQL (empty `prisma migrate deploy`, then `scripts/migrate-mysql-to-postgres.ts`) is in [docs/migrations.md](docs/migrations.md). Do not run `prisma db push` against production.