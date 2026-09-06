# Zemen Lottery

**Bot-first**: the player-facing app runs entirely through a Telegram bot —
see `telegram-bot/README.md`. The React frontend still exists for the
admin back-office and an optional richer "Open full app" view, but
regular players never need to visit a website at all.

```
zemen-lottery-fullstack/
├── backend/         Express API — see backend/README.md
├── frontend/        React app (admin + optional Mini App view)
├── telegram-bot/    The player-facing bot — see telegram-bot/README.md
└── render.yaml       Render deploy config for the backend
```

## What's included

- Wallet ledger, ticket-pool games, secure server-side draw (`crypto.randomInt`)
- **Pick-your-ticket**: buy any open number in a pool, not just the next one
- **Deposits**: user pays a sample CBE/Telebirr account, uploads a screenshot
  (stored on **Cloudinary**, not local disk — safe for Render's ephemeral
  filesystem), admin approves/rejects before the wallet is credited
- **Withdrawals**: payout profile (bank or Telebirr), **10% fee**, **100 ETB
  minimum** — both configurable via env vars. Funds are held on request,
  refunded automatically if rejected
- **Points, levels, and a wheel spin**: 1 point per 100 ETB deposited; at 50
  points, spend them on a spin of a circular prize wheel for a 5–50 ETB
  bonus; level is derived from lifetime points. The same wheel component
  also drives the ticket-draw reveal for pools with 20 or fewer tickets
- **Invite & earn**: every user gets a unique referral code/link. When an
  invited friend's deposit is approved and it's at least 100 ETB (both
  configurable), the inviter is instantly paid 10 ETB + 5 points
- **Auto-verified deposits via SMS bridge**: users enter the transaction
  reference from their bank/Telebirr receipt when depositing. An Android
  phone forwards the admin's incoming CBE/Telebirr SMS notifications to the
  backend, which parses and matches them against pending deposits — a match
  auto-approves instantly; anything else stays pending for manual review.
  See "Auto-verifying deposits" below
- **Bottom tab navigation** (Games / Tickets / Wallet / Profile) — mobile-app
  style, built with `lucide-react` icons
- **Amharic + English**, Amharic by default, toggle in Profile, persisted
  in `localStorage`
- Live toasts on ticket purchase / deposit / withdrawal actions, with a
  friendly message (not a raw HTTP error) if you're rate-limited
- Winner announcement banner: recently completed draws shown to every
  logged-in user, dismissible per-win

## Local setup

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env   # fill in Postgres + JWT_SECRET + Cloudinary creds
npm run migrate         # applies all migrations
npm run dev              # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000/api
npm run dev              # http://localhost:5173
```

## Making your first admin

```sql
UPDATE users SET role = 'ADMIN' WHERE phone = '+2519XXXXXXXX';
```
Log out and back in afterward — the role is baked into the JWT at login time.

## The Telegram bot (player-facing app)

See `telegram-bot/README.md` for full setup. Once it's running, that's the
whole app for regular players — buying tickets, depositing, withdrawing,
spinning, and inviting friends all happen as chat commands and menu
buttons, no website visit required. The frontend's consumer pages
(Games, Wallet, Deposit, etc.) still exist and still work, mainly for the
optional "🌐 Open full app" Mini App view the bot can offer.

## Auto-verifying deposits

Users type in the transaction reference/ID from their bank or Telebirr
receipt when submitting a deposit. To have matching deposits approved
automatically instead of always waiting on an admin, set up the Android
SMS bridge — see `android-sms-bridge/README.md` for the full walkthrough.
Two setup options are documented there: **MacroDroid** (no-code, a free
Android automation app — recommended) or a small **Termux script**. Until
you set `BANK_SMS_API_KEY` in the backend `.env`, every deposit just goes
to the normal manual admin review queue, exactly as before.

## Deploying for free: Vercel + Render + Supabase

**1. Supabase — Postgres**
Create a project at supabase.com. Under Settings → Database, copy the
connection details (host, user, password, database) — use the **pooler**
connection (port 6543) if you want, both work. Postgres from Supabase
requires SSL, which `backend/src/config/db.js` already handles by default.

Run migrations against it from your own machine (Render's free tier has no
shell/pre-deploy step):
```bash
cd backend
# .env pointed at your Supabase credentials
npm run migrate
```

**2. Cloudinary — deposit screenshot storage**
Create a free account at cloudinary.com. From the dashboard, copy your
Cloud name, API key, and API secret — these go into `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. No bucket/folder setup
needed — the app creates assets under a folder automatically on first
upload.

**3. Render — backend**
New Web Service → connect your repo → Root Directory `backend` (or use the
included `render.yaml` via "New → Blueprint" for one-click env var
scaffolding). Build command `npm install`, start command `npm start`,
health check path `/health`. Add all the env vars from `backend/.env.example`
in the Render dashboard (Supabase Postgres creds, `JWT_SECRET`, Cloudinary
keys, `FRONTEND_URL` once you know your Vercel domain).

Render's free tier sleeps after ~15 minutes of no traffic; the first
request after that takes 30–50s to wake up. A free uptime pinger (e.g.
cron-job.org hitting `/health` every 10 min) avoids this for a live app.

**4. Vercel — frontend**
Import the repo → Root Directory `frontend` → framework preset Vite
(build command and output directory are auto-detected). Add one env var:
`VITE_API_URL=https://your-render-service.onrender.com/api`. The included
`vercel.json` handles client-side routing so refreshing `/wallet` etc.
doesn't 404.

Once both are live, go back to Render and set `FRONTEND_URL` to your exact
Vercel URL (e.g. `https://zemen-lottery.vercel.app`) so CORS allows it.

Each folder's own README has the full API reference and design notes.
