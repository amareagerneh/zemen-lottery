# Zemen Lottery — Backend

Express + PostgreSQL backend for a ticket-pool raffle platform.

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm run migrate        # applies SQL files in src/db/migrations in order
npm run dev
```

## Making a user an admin

There's no signup flow for admins on purpose. Promote a user manually:

```sql
UPDATE users SET role = 'ADMIN' WHERE phone = '+2519XXXXXXXX';
```

## API summary

| Method | Path                          | Auth  | Description                          |
|--------|-------------------------------|-------|---------------------------------------|
| POST   | /api/auth/register             | -     | Create user + wallet                  |
| POST   | /api/auth/login                | -     | Get JWT                               |
| GET    | /api/wallet/me                 | user  | Get balance                           |
| GET    | /api/wallet/me/transactions    | user  | Ledger history                        |
| GET    | /api/wallet/payment-methods    | user  | Sample CBE/Telebirr receiving accounts|
| POST   | /api/wallet/deposit-requests   | user  | Submit deposit + screenshot (multipart)|
| GET    | /api/wallet/deposit-requests   | user  | Your deposit request history          |
| GET    | /api/wallet/payout-profile     | user  | Your saved bank/Telebirr details      |
| PUT    | /api/wallet/payout-profile     | user  | Save bank/Telebirr details            |
| POST   | /api/wallet/withdrawal-requests| user  | Request withdrawal (holds funds)      |
| GET    | /api/wallet/withdrawal-requests| user  | Your withdrawal request history       |
| GET    | /api/games                     | user  | List OPEN games                       |
| GET    | /api/games/:gameId              | user  | Game details + tickets sold           |
| GET    | /api/games/:gameId/tickets       | user  | Sold ticket numbers (for the picker)  |
| POST   | /api/games/:gameId/tickets       | user  | Buy a ticket — body: `{ ticketNumber }` optional |
| GET    | /api/games/my-tickets           | user  | Tickets you own                       |
| GET    | /api/games/recent-winners       | user  | Recently completed draws (for banner) |
| POST   | /api/admin/games                | admin | Create a game                         |
| GET    | /api/admin/deposit-requests     | admin | List deposit requests (`?status=`)    |
| GET    | /api/admin/deposit-requests/:id/screenshot | admin | Stream the payment screenshot |
| POST   | /api/admin/deposit-requests/:id/approve | admin | Approve — credits wallet      |
| POST   | /api/admin/deposit-requests/:id/reject  | admin | Reject — body: `{ note }`     |
| GET    | /api/admin/withdrawal-requests  | admin | List withdrawal requests (`?status=`) |
| POST   | /api/admin/withdrawal-requests/:id/approve | admin | Mark as paid out           |
| POST   | /api/admin/withdrawal-requests/:id/reject  | admin | Reject — refunds held funds, body: `{ note }` |

## Deposit / withdrawal flow (admin-approval model)

Both flows are manual-review, matching a small-team operation without a
payment gateway integration yet:

- **Deposit**: user pays into a sample CBE/Telebirr account shown in the UI
  (`src/config/paymentMethods.js` — replace with your real accounts, or
  override via `CBE_ACCOUNT_NUMBER` / `TELEBIRR_PHONE_NUMBER` env vars),
  uploads a screenshot as proof, and the request sits `PENDING`. An admin
  reviews the screenshot at `GET /api/admin/deposit-requests` and approves
  or rejects it. The wallet is only credited on approval.
- **Withdrawal**: user saves payout details once (`payout_profiles`), then
  requests an amount. The amount is **debited immediately** as a hold — this
  matters, otherwise the same balance could be spent on tickets while a
  withdrawal is pending. An admin either marks it `COMPLETED` (money sent
  outside the system) or rejects it, which **refunds** the held amount via
  a `REFUND` ledger entry.
- **Screenshots are never public.** They're stored under `backend/uploads/`
  (gitignored) and only served through `GET /api/admin/deposit-requests/:id/screenshot`,
  which requires an admin JWT. There's no static file route for them.

## Ticket picking

`POST /api/games/:gameId/tickets` now accepts an optional `{ ticketNumber }`
in the body so a user can claim a specific number instead of always getting
the next sequential one. `GET /api/games/:gameId/tickets` returns the sold
numbers so the frontend can render which are taken. The existing
`UNIQUE (game_id, ticket_number)` constraint is what actually prevents two
people claiming the same number if requests race — the 409 response from
that constraint is caught and turned into a normal error message.

## Why it's structured this way

- **`withTransaction` helper** (`src/config/db.js`) is the only path to the DB for
  anything that mutates money or tickets. It guarantees `BEGIN`/`COMMIT`/`ROLLBACK`
  are always paired.
- **`gameService.buyTicket`** locks the `games` row with `SELECT ... FOR UPDATE`
  before checking ticket count, so two simultaneous buyers on the last ticket
  can't both succeed — the second waits for the first's transaction to finish,
  then sees the updated count and gets rejected if the game is now full.
- **`wallet_transactions`** is an append-only ledger; `wallets.balance` is a
  derived cache kept in sync inside the same transaction as each ledger write.
  You can always reconstruct a balance from the ledger to audit it.
- **`drawService.drawWinner`** uses `crypto.randomInt`, runs server-side only,
  and is idempotent — calling it twice on a completed game returns the
  existing result instead of drawing again or double-paying.
- Deposits and prize payouts are idempotent via a unique `(type, reference)`
  index on `wallet_transactions`, so a retried payment webhook can't double-credit.

## Known gaps to fill in before going to production

1. **Real payment provider integration.** Deposits are still manual
   (screenshot + admin approval) rather than an automated Chapa/Telebirr
   webhook. That's a deliberate simplification, not an oversight — swap
   `depositRequestService` for a webhook-driven flow when you're ready, and
   reuse `walletService.creditWithinTransaction` for the actual credit.
2. **Screenshot storage is local disk**, fine for one server, not for a
   multi-instance deployment. Move `UPLOAD_DIR` to S3/Cloud Storage (or a
   shared volume) before scaling horizontally.
3. **Regulatory compliance.** This is a real-money chance-based game. Confirm
   applicable licensing/gambling regulations in your jurisdiction before
   accepting real deposits — see the design notes this was scaffolded from.
4. **Admin dashboard aggregates** (totals, active/completed games) —
   straightforward queries on top of the existing tables, not yet added.
5. **Refresh tokens / logout** — current auth is a single long-lived JWT.
6. **Winner names are shown publicly** in `/api/games/recent-winners` (by
   design, for social-proof/trust — real lotteries do the same). If that's
   not appropriate for your audience, switch to first-name-only or an
   opt-in flag on the user.
