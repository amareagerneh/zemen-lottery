# Zemen Lottery — Frontend

React + Vite + Tailwind, talking to the Express backend.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your backend
npm run dev
```

Runs on http://localhost:5173 by default; expects the API at
http://localhost:4000/api unless VITE_API_URL is overridden.

## Design notes

- **`TicketStub`** (game cards) and the **ticket board / draw reel** on the
  game detail page are the visual signature: real raffle-ticket styling
  (perforated edges, torn divider) instead of a generic casino/slot look.
- **`TicketBoard`** is now an interactive picker — clicking any open (dashed
  border) slot selects that exact ticket number, which is what gets sent to
  `POST /games/:gameId/tickets`. Sold slots show teal (yours) or grey
  (someone else's) and aren't clickable.
- **`DrawReel`** is purely presentational. The backend already picked the
  winner with `crypto.randomInt` before the game reaches `COMPLETED` — this
  component just animates a strip landing on that number. It never
  determines an outcome itself.
- **Toasts** (`ToastContext`) confirm actions like buying a ticket or
  submitting a deposit/withdrawal request — stacked, auto-dismissing,
  top-of-screen.
- **`WinnerAnnouncement`** is the "ad-like" banner under the navbar. It
  fetches `/games/recent-winners` on load and rotates through undismissed
  wins every 5s. Dismissal is tracked per-game-id in `localStorage`, so a
  closed banner won't reappear, but a genuinely new win always will —
  there's no server-side "seen" tracking, which keeps this simple but means
  dismissal doesn't sync across devices for the same user.
- **Deposit/Withdraw are separate pages from Wallet**, which is now just a
  balance + ledger view with two buttons. Deposit shows the sample CBE/
  Telebirr account and takes a screenshot upload (multipart `FormData` —
  see the `isFormData` branch in `services/api.js`, since you can't
  `JSON.stringify` a file). Withdraw combines a one-time payout-profile
  form with the actual withdrawal request form.
- **Admin screenshot viewing** (`AdminDeposits`) can't use a plain
  `<img src="...">` because the endpoint requires a Bearer token that an
  `<img>` tag can't send. Instead it fetches the image as a blob via
  `fetch()` and hands the resulting object URL to `<img>` — see
  `fetchImageBlobUrl` in `services/api.js`. Object URLs are revoked on
  unmount to avoid leaking memory.
- **Polling, not websockets.** `GameDetail` polls every 4s while a pool is
  still `OPEN`/`FULL`/`DRAWING` so other buyers see the pool fill and the
  draw land without a manual refresh. Swap for websockets/SSE if you want
  a more real-time feel later — the polling is isolated to one `useEffect`.
- **Admin routes** are gated by `role === "ADMIN"` from the JWT payload the
  backend issues; there's no self-serve way to become admin (matches the
  backend, which requires a manual `UPDATE users SET role = 'ADMIN' ...`).

## Known gaps

- No withdrawal notification to the user once an admin marks it paid — they
  have to check the Withdraw page's request list to see the status change.
  Same for deposits: no push notification, just poll-on-visit.
- Ticket board's "taken" styling doesn't distinguish *who* took a ticket
  beyond "yours vs. not yours" — by design, since exposing other users'
  identities per ticket isn't necessary for the UI to work.
- No pagination on admin deposit/withdrawal lists — capped at 200 rows
  server-side (see `listForAdmin` in the respective backend services).
