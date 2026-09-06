# MacroDroid setup — automatic deposit verification

This is a no-code alternative to the Termux script in this folder. Instead
of a script, [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid)
(a free Android automation app) watches for incoming SMS and forwards each
one straight to the backend as an HTTP request — no app to build, no
script to keep running in a terminal.

```
CBE / Telebirr
      │  incoming SMS
      ▼
📱 Admin's Android phone
      │  MacroDroid: "SMS Received" trigger
      ▼
HTTPS POST  →  https://your-domain.com/api/bank-sms
      │
      ▼
Backend: parse → match pending deposit → approve or leave PENDING
```

MacroDroid's only job is "read the SMS, forward it exactly as-is." All the
parsing and verification logic stays in the backend (`smsParser.js` +
`bankSmsService.js`), which is easier to maintain than trying to teach an
automation app to understand bank SMS formats.

## 1. Set the shared secret (same as the Termux option)

In `backend/.env`:

```
BANK_SMS_API_KEY=<a long random string>
```

Generate one with:

```
node -e "console.log(require('crypto').randomUUID())"
```

Restart the backend after setting it.

## 2. Install MacroDroid on the bridge phone

Install it from the Play Store, open it, and grant it SMS permission when
prompted (Android will ask when you create the SMS trigger below).

## 3. Create the macro

**Add Macro → Trigger → Connectivity → SMS Received.**
Leave the sender filter blank at first — test with everything coming
through before you narrow it down, since the sender ID Android reports
isn't always the same as what's shown in the Messages app.

**Add Action → Connectivity → HTTP Request**, and set:

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `https://your-domain.com/api/bank-sms` |
| Headers | `Content-Type: application/json` and `X-Bridge-Key: <your BANK_SMS_API_KEY value>` |
| Body | see below |

For the body, use MacroDroid's **Magic Text** picker (don't hand-type
variable names — they vary slightly by MacroDroid/Android version) and
insert the SMS trigger's **sender** and **message body** variables into
this JSON shape:

```json
{
  "text": "{sms_body_magic_text}",
  "sender": "{sms_sender_magic_text}"
}
```

(`{sms_body_magic_text}` and `{sms_sender_magic_text}` are placeholders —
replace them with whatever the Magic Text picker actually inserts for
"SMS message" and "SMS sender" on your device.)

That's it — save the macro and enable it.

## 4. Test it

1. Send yourself a test SMS with realistic CBE or Telebirr-style wording,
   or just wait for a real transfer.
2. Check MacroDroid's own run log (long-press the macro → "View Log") to
   confirm the HTTP request fired and got a `201` response.
3. Check the `bank_sms_messages` table (or the admin "Bank SMS log" view)
   to see what got parsed and whether it matched a pending deposit.

## How matching works (so you know what to expect)

- If the SMS has a clear transaction reference (Telebirr almost always
  does; CBE sometimes does), the backend matches on **reference + amount
  + method**, and auto-approves only when that's an exact, unambiguous
  match.
- If there's no reference (common for CBE), it falls back to **amount +
  the sender's name** (matched loosely against whatever name the user
  typed into the deposit form) — but only auto-approves when that narrows
  it down to exactly one pending deposit. If two people happened to
  deposit the same amount around the same time, it deliberately does
  **not** guess — both stay PENDING for manual review.
- A transaction reference can only be used once (unique database
  constraint), and a deposit can only be approved once (row-locked status
  check), so a duplicate or retried SMS can never double-credit anyone.

## MacroDroid vs. the Termux script

Both post to the exact same endpoint, so pick whichever is easier for
you:

- **MacroDroid** — no terminal, easier to set up and monitor visually,
  free tier is enough for this. Recommended for most people.
- **Termux script** (`sms-bridge.sh` in this folder) — fully scriptable,
  no reliance on a third-party app's automation engine staying free/
  available long-term.
