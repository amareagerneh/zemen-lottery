import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

export default function AdminDeposits() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [screenshots, setScreenshots] = useState({}); // id -> blob url
  const [notes, setNotes] = useState({}); // id -> note text
  const [busyId, setBusyId] = useState(null);

  const [smsMethod, setSmsMethod] = useState("CBE");
  const [smsText, setSmsText] = useState("");
  const [smsSubmitting, setSmsSubmitting] = useState(false);

  function refresh() {
    api.listAdminDepositRequests(statusFilter).then((d) => setRequests(d.requests));
  }

  useEffect(refresh, [statusFilter]);

  // Revoke blob URLs on unmount to avoid leaking memory.
  useEffect(() => {
    return () => Object.values(screenshots).forEach((url) => URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadScreenshot(id) {
    if (screenshots[id]) return; // already loaded
    try {
      const url = await api.getDepositScreenshotUrl(id);
      setScreenshots((prev) => ({ ...prev, [id]: url }));
    } catch {
      showToast("Could not load screenshot.", "error");
    }
  }

  async function handleApprove(id) {
    setBusyId(id);
    try {
      await api.approveDeposit(id);
      showToast(`Deposit #${id} approved — wallet credited.`, "success");
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    try {
      await api.rejectDeposit(id, notes[id] || "");
      showToast(`Deposit #${id} rejected.`, "success");
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePasteSms(e) {
    e.preventDefault();
    if (!smsText.trim()) return;
    setSmsSubmitting(true);
    try {
      const result = await api.ingestBankMessage(smsMethod, smsText.trim());
      if (result.autoApproved) {
        showToast("Matched a pending deposit — it's been auto-approved!", "success");
      } else if (!result.parsed.transactionId) {
        showToast(
          "Message saved, but no transaction ID could be extracted from it. It'll match automatically once a deposit references it, or you can approve manually.",
          "error"
        );
      } else {
        showToast("Message saved — no pending deposit matches it yet.", "success");
      }
      setSmsText("");
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSmsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 font-display text-3xl tracking-widest text-paper">DEPOSIT REVIEW</h1>

      <details className="mb-6 rounded-lg bg-surface p-5">
        <summary className="cursor-pointer font-display tracking-widest text-mist">
          PASTE BANK SMS (auto-verification)
        </summary>
        <form onSubmit={handlePasteSms} className="mt-4 space-y-3">
          <p className="text-xs text-mist">
            Paste the raw CBE/Telebirr SMS text here. It'll be matched against pending deposits
            automatically — this is a manual stand-in until you set up a phone that forwards
            these automatically (see backend README).
          </p>
          <div className="flex gap-2">
            {["CBE", "TELEBIRR"].map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setSmsMethod(m)}
                className={`rounded px-4 py-1 text-sm font-semibold ${
                  smsMethod === m ? "bg-gold text-ink" : "bg-ink text-mist"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <textarea
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            rows={3}
            placeholder="e.g. Dear Customer, your Account has been credited with ETB 500.00 from ABEBE KEBEDE. Transaction Number FT24123ABCDE..."
            className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={smsSubmitting}
            className="rounded bg-gold px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {smsSubmitting ? "…" : "Submit"}
          </button>
        </form>
      </details>

      <div className="mb-6 flex gap-2">
        {["PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded px-4 py-1.5 font-display text-sm tracking-widest ${
              statusFilter === s ? "bg-gold text-ink" : "bg-surface text-mist"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {requests.length === 0 && <p className="text-mist">Nothing here.</p>}

      <div className="space-y-4">
        {requests.map((r) => (
          <div key={r.id} className="rounded-lg bg-surface p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="font-mono text-lg font-bold text-gold">{r.amount} ETB</div>
                <div className="text-sm text-paper">
                  {r.user_name} · {r.user_phone}
                </div>
                <div className="text-xs text-mist">
                  {r.method} · {new Date(r.created_at).toLocaleString()}
                  {r.ocr_transaction_id && (
                    <span className="ml-2 text-mist">OCR ref: {r.ocr_transaction_id}</span>
                  )}
                </div>
                {r.status === "APPROVED" && (
                  <span
                    className={`text-xs font-semibold ${
                      r.verification_source === "AUTO" ? "text-teal" : "text-mist"
                    }`}
                  >
                    {r.verification_source === "AUTO" ? "⚡ auto-verified" : "reviewed manually"}
                  </span>
                )}
              </div>
              <span className="font-display text-xs tracking-widest text-mist">#{r.id}</span>
            </div>

            {screenshots[r.id] ? (
              <img
                src={screenshots[r.id]}
                alt={`Deposit proof #${r.id}`}
                className="mb-3 max-h-80 rounded border border-surfaceRaised object-contain"
              />
            ) : (
              <button
                onClick={() => loadScreenshot(r.id)}
                className="mb-3 rounded border border-dashed border-mist/50 px-4 py-2 text-sm text-mist hover:text-gold"
              >
                View screenshot
              </button>
            )}

            {r.status === "PENDING" ? (
              <div className="flex items-center gap-2">
                <input
                  placeholder="Rejection note (optional)"
                  value={notes[r.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  className="flex-1 rounded border border-surfaceRaised bg-ink px-3 py-1.5 text-sm text-paper outline-none focus:border-gold"
                />
                <button
                  disabled={busyId === r.id}
                  onClick={() => handleApprove(r.id)}
                  className="rounded bg-teal px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => handleReject(r.id)}
                  className="rounded bg-brick px-3 py-1.5 text-sm font-semibold text-paper disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="text-sm text-mist">
                Reviewed — status: <span className="font-semibold">{r.status}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
