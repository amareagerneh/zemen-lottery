#!/data/data/com.termux/files/usr/bin/bash
#
# Zemen Lottery — SMS bridge
#
# Runs on a dedicated Android phone (the one whose SIM receives your CBE /
# Telebirr "money received" SMS notifications). Polls the inbox for new
# messages and forwards each one to the backend's /api/bank-sms endpoint,
# which parses it and auto-approves any matching pending deposit.
#
# Requires Termux + the Termux:API app (both from F-Droid — see the
# README in this folder for why not the Play Store versions), plus the
# `curl`, `jq`, and `termux-api` packages inside Termux.
#
# Usage:
#   API_URL="https://your-domain.com/api/bank-sms" \
#   BRIDGE_KEY="the-same-value-as-BANK_SMS_API_KEY-in-backend/.env" \
#   ./sms-bridge.sh

set -euo pipefail

API_URL="${API_URL:?Set API_URL, e.g. https://your-domain.com/api/bank-sms}"
BRIDGE_KEY="${BRIDGE_KEY:?Set BRIDGE_KEY to match BANK_SMS_API_KEY in the backend .env}"
POLL_SECONDS="${POLL_SECONDS:-15}"
STATE_FILE="${STATE_FILE:-$HOME/.zemen_sms_bridge_last_id}"

touch "$STATE_FILE"
last_id="$(cat "$STATE_FILE" 2>/dev/null || true)"
[ -z "$last_id" ] && last_id=0

echo "Zemen SMS bridge started."
echo "  Forwarding to: $API_URL"
echo "  Polling every: ${POLL_SECONDS}s"
echo "  Last processed message id: $last_id"

while true; do
  messages="$(termux-sms-list -l 20 -t inbox 2>/dev/null || echo '[]')"

  # Oldest-first, so the state file always advances monotonically even if
  # several new messages arrived between polls.
  echo "$messages" | jq -c 'sort_by(._id) | .[]' | while read -r msg; do
    id="$(echo "$msg" | jq -r '._id')"

    case "$id" in
      ''|*[!0-9]*) continue ;;  # skip anything that isn't a plain integer
    esac

    if [ "$id" -gt "$last_id" ]; then
      number="$(echo "$msg" | jq -r '.number // .address // ""')"
      body="$(echo "$msg" | jq -r '.body // ""')"

      payload="$(jq -n --arg text "$body" --arg sender "$number" '{text: $text, sender: $sender}')"

      http_status="$(curl -s -o /tmp/zemen_sms_bridge_response.json -w '%{http_code}' \
        -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "X-Bridge-Key: $BRIDGE_KEY" \
        -d "$payload")"

      if [ "$http_status" = "201" ]; then
        echo "[$(date '+%H:%M:%S')] forwarded message #$id from $number -> $(cat /tmp/zemen_sms_bridge_response.json)"
      else
        echo "[$(date '+%H:%M:%S')] WARNING: message #$id got HTTP $http_status -> $(cat /tmp/zemen_sms_bridge_response.json)"
      fi

      echo "$id" > "$STATE_FILE.tmp" && mv "$STATE_FILE.tmp" "$STATE_FILE"
    fi
  done

  # Re-read from disk: the while-read loop above runs in a subshell (it's
  # piped), so its variable updates don't survive to here — the state
  # file is the source of truth, not the shell variable.
  last_id="$(cat "$STATE_FILE")"

  sleep "$POLL_SECONDS"
done
