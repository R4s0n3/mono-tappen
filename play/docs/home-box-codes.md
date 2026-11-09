# Tappen Home box codes

Each physical box gets one single-use code. Scanning the QR opens `https://play.tappen.app/box/redeem?code=…`. That GET does not claim the code. The person signs in, comes back to the same page, and confirms the account. The claim is a same-origin POST. It permanently unlocks Tappen Premium and the existing Premium card skin on that one account.

Premium is the existing `Subscription` row with `status` `"active"`. The Premium card skin is the first skin on the product named `Premium` with type `SUBSCRIPTION`, granted as a `UserSkin` row. That is the same skin the shop grants, and the hub skin picker equips a skin the account owns. The code does not create a second premium flag or a new skin, and it does not change cards that already exist.

## What checkout does

Paying for Tappen Home creates a `HomeOrder`. It does not create a code and it does not grant Premium. Guest checkout is unchanged: the order stores an email and a shipping address, and it has no user id. An unpaid, cancelled, or refunded order cannot be used to issue codes. The order id is not a redemption code.

## Issuing codes

There is no admin role on `User`, so there is no hub screen for this. Issuing is a local CLI in `play/`, run by someone who already has `DATABASE_URL` and `BOX_CODE_PEPPER`. Do not pass either value as an argument.

```bash
cd play
npx tsx scripts/home-box-codes.ts issue \
  --count 2 \
  --order <homeOrderId> \
  --export-printable /secure/order-codes.html
```

`--count` must be a whole number from 1 to 100. For an order, the count of issued plus redeemed codes cannot go above `HomeOrder.quantity` (one code per box). The order must be `PAID` or `SHIPPED`. The command writes a secret HTML file of QR codes and stores only HMAC-SHA256 hashes. It does not print the codes. The file is mode `0600`. Delete it after the printer has it.

A replacement that is not tied to an order has to be explicit:

```bash
npx tsx scripts/home-box-codes.ts issue \
  --count 1 \
  --unassigned \
  --export-printable /secure/replacement.html
```

Void unredeemed codes for an order (redeemed codes stay claimed):

```bash
npx tsx scripts/home-box-codes.ts void-issued --order <homeOrderId>
```

`--base-url` defaults to `https://play.tappen.app`. The only other origins accepted are `http://play.tappen.local:3001`, `http://localhost:3001`, and `http://127.0.0.1:3001`.

This change does not generate production codes. Do not run the CLI against production from a review environment.

## Claim

1. The QR is a GET. The page says the code has not been claimed yet and offers sign-in.
2. NextAuth returns to `/box/redeem?code=…` only. The return path is built from the code. It is not taken from a caller-supplied callback.
3. The signed-in page names the account and asks them to confirm. “Use a different account” signs out and returns to the same redeem path.
4. “Claim for this account” POSTs. The POST checks the session, the `Origin` host, and `Sec-Fetch-Site: same-origin` when that header is present.
5. The database row is locked with `SELECT … FOR UPDATE`, then updated only while `status` is `ISSUED`. One account wins. The same account can submit again and keeps Premium. Another account gets a conflict. The code is not moved.

Failed guesses are counted per HMAC of the client IP (8 failures in 15 minutes). The attempt row does not store the code. Application logs record an outcome and, once a row exists, its id. They do not record the code, the hash, or the pepper. The redeem response sends `Referrer-Policy: no-referrer` and `Cache-Control: no-store`.

`BOX_CODE_PEPPER` must be at least 32 characters and must be the same on every play process that claims codes. Rotating it makes unredeemed codes stop matching. Hub and landing do not need the pepper. They read the same `Subscription` and `UserSkin` rows.

Put play behind a proxy that overwrites `X-Forwarded-For` and `X-Forwarded-Host`. The rate limit uses the first forwarded address.

## Refunds and replacements

Shop refunds of Premium do not remove a box grant. `revokePurchase` keeps the active subscription and the Premium card skin when the account has a redeemed box code. A missing `HomeBoxCode` table (app deployed before this migration) leaves the old refund behaviour in place.

A Home order refund does **not** void unused codes and does **not** revoke a claim. That is intentional for this change: the buyer and the person who claims the code can be different people, and taking Premium away on a refund can also wipe a shop subscription that should stay. If a refunded order must not ship, void its unredeemed codes with the CLI before they are printed. Whether a redeemed code should be revoked when the box is returned is unresolved and is not done automatically.

`--unassigned` is outside the per-order quantity cap. Use it for a replacement after voiding the lost code, not for the original print run. The CLI will not stop an unassigned batch from exceeding the number of boxes you meant to print.

## Deploy

Do not run `prisma db push`, `prisma migrate dev`, or `prisma migrate reset` against production. From `play/`, after the backup and the baseline resolve described in `docs/migrations.md`:

```bash
DATABASE_URL="<production DATABASE_URL>" npx prisma migrate deploy
```

Set `BOX_CODE_PEPPER` on play before `/box/redeem` is served. No other new environment variable is required. Hub and landing schemas include the same models so `prisma generate` stays aligned. Migration history stays in `play/prisma/migrations` only.
