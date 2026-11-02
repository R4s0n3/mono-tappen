# PLAY TAPPEN APP

[PLAY TAPPEN APP](https://play.tappen.app/)

Prisma schema for hub, landing, and play is identical. Migration history is in this app only.

Production rollout (backup, mark `20250226000000_baseline` applied, then `migrate deploy`) is in [docs/migrations.md](docs/migrations.md). Do not run `prisma db push` against production.