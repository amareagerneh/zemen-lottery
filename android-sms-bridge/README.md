# Android SMS bridge — automatic deposit verification

This lets a dedicated Android phone read your incoming CBE/Telebirr "money
received" SMS notifications and forward them to the backend, which
auto-approves any deposit whose transaction reference (or amount + payer
name, when there's no reference) matches a pending one.

**Two ways to set this up — pick one:**

- **[MacroDroid](./MACRODROID_SETUP.md)** — no-code, a free Android
  automation app. Recommended for most people.
- **Termux script** (`sms-bridge.sh`, this file) — a small shell script,
  for anyone who'd rather not depend on a third-party automation app.

Both post the exact same JSON shape to the exact same backend endpoint,
so you can switch between them later without any backend changes.

---

## Termux script setup

### What you need


- An old/spare Android phone with the SIM card that receives your CBE and
  Telebirr SMS notifications. Keep it plugged in and connected to Wi-Fi.
- [Termux](https://f-droid.org/packages/com.termux/) and
  [Termux:API](https://f-droid.org/packages/com.termux.api/) — install
  **both from F-Droid**, not the Play Store. The Play Store builds of
  Termux are no longer updated and Termux:API won't work reliably with
  them.
- Your backend already deployed and reachable at some URL (e.g.
  `https://api.your-domain.com`).

### 1. Set the shared secret

In `backend/.env` on your server, set:

```
BANK_SMS_API_KEY=<a long random string>
```

Generate one with:

```
node -e "console.log(require('crypto').randomUUID())"
```

Restart the backend after setting it. This key is a password for the
bridge device — anyone with it can submit fake SMS text, so keep it
secret and only put it on the bridge phone.

### 2. Set up Termux on the bridge phone

Open Termux and run:

```
pkg update
pkg install curl jq termux-api
```

Then open the **Termux:API** app once (just to trigger Android's
permission prompt), and grant it **SMS** permission when asked. If it
doesn't ask automatically, go to Android Settings → Apps → Termux:API →
Permissions → SMS → Allow.

Test that SMS reading works:

```
termux-sms-list -l 3
```

You should see your 3 most recent text messages as JSON. If you get a
permission error, re-check the step above.

### 3. Copy the bridge script to the phone

The easiest way is to pull it straight from wherever you host this repo,
or copy-paste `sms-bridge.sh` into a file with Termux's built-in editor:

```
cd ~
nano sms-bridge.sh
# paste the contents of android-sms-bridge/sms-bridge.sh, save, exit
chmod +x sms-bridge.sh
```

### 4. Run it

```
API_URL="https://api.your-domain.com/api/bank-sms" \
BRIDGE_KEY="<the same value as BANK_SMS_API_KEY>" \
./sms-bridge.sh
```

Leave this running. It polls for new SMS every 15 seconds (configurable
with `POLL_SECONDS=...`) and posts each new one to the backend.

### 5. Keep it running in the background

- Run `termux-wake-lock` once so Android doesn't kill Termux to save
  battery.
- Install [Termux:Boot](https://f-droid.org/packages/com.termux.boot/)
  (also from F-Droid) and put a small script in
  `~/.termux/boot/start-sms-bridge.sh` that sets the env vars and calls
  `sms-bridge.sh`, so it restarts automatically after the phone reboots.
- Consider running it inside `tmux` or Termux's own background service
  support so it survives you closing the Termux app window.

### 6. Test it end to end

1. Make a small real (or test) transfer to your CBE/Telebirr account.
2. Watch the script's output — it should print
   `forwarded message #NNN from ... -> {"status":"MATCHED", ...}`.
3. Check `bank_sms_messages` in the database (or the admin "Bank SMS log"
   view) to confirm what was parsed.
4. If `status` comes back `"UNMATCHED"`, it means neither the reference
   nor the amount+payer-name fallback found exactly one matching pending
   deposit — the deposit stays PENDING for manual admin review, which is
   the safe default.
5. If `status` comes back `"UNPARSEABLE"`, the parser couldn't find an
   amount or reference at all — open an issue with the (redacted) raw
   text and adjust the regexes in `backend/src/utils/smsParser.js`. Bank
   and telecom SMS wording changes occasionally, so this may need the
   occasional tweak.

### Notes

- The script never approves anything itself — it only forwards raw SMS
  text. All matching/verification logic lives in the backend
  (`bankSmsService.js` + `smsParser.js`), so it's auditable and you don't
  need to trust the phone with any business logic.
- A transaction reference can only ever be used once (enforced by a
  unique database constraint), so a replayed or duplicate SMS can't
  double-credit a deposit.
- This complements, not replaces, manual admin review — anything that
  doesn't cleanly match still shows up in the normal admin deposit queue.
