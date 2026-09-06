import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

export default function AdminWithdrawals() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  function refresh() {
    api.listAdminWithdrawalRequests(statusFilter).then((d) => setRequests(d.requests));
  }

  useEffect(refresh, [statusFilter]);

  async function handleApprove(id) {
    setBusyId(id);
    try {
      await api.approveWithdrawal(id);
      showToast(`Withdrawal #${id} marked as paid.`, "success");
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
      await api.rejectWithdrawal(id, notes[id] || "");
      showToast(`Withdrawal #${id} rejected — funds refunded.`, "success");
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 font-display text-3xl tracking-widest text-paper">WITHDRAWAL REVIEW</h1>

      <div className="mb-6 flex gap-2">
        {["PENDING", "COMPLETED", "REJECTED"].map((s) => (
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
        {requests.map((r) => {
          const snap = r.account_snapshot;
          return (
            <div key={r.id} className="rounded-lg bg-surface p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-mono text-lg font-bold text-gold">
                    {r.amount} ETB <span className="text-sm text-mist">(fee {r.fee_amount})</span>
                  </div>
                  <div className="text-sm text-paper">
                    {r.user_name} · {r.user_phone}
                  </div>
                  <div className="text-xs text-mist">
                    {r.method} · {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="font-display text-xs tracking-widest text-mist">#{r.id}</span>
              </div>

              <div className="mb-3 rounded border border-surfaceRaised p-3 font-mono text-sm">
                <div className="mb-1 text-mist">Pay out to:</div>
                <div className="font-semibold text-paper">{snap.accountHolderName}</div>
                {r.method === "BANK" ? (
                  <>
                    <div>{snap.bankName}</div>
                    <div>{snap.bankAccountNumber}</div>
                  </>
                ) : (
                  <div>Telebirr: {snap.telebirrPhone}</div>
                )}
                <div className="mt-2 border-t border-surfaceRaised pt-2 text-base font-bold text-gold">
                  Send: {r.net_amount} ETB
                </div>
              </div>

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
                    Mark paid
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => handleReject(r.id)}
                    className="rounded bg-brick px-3 py-1.5 text-sm font-semibold text-paper disabled:opacity-50"
                  >
                    Reject &amp; refund
                  </button>
                </div>
              ) : (
                <div className="text-sm text-mist">
                  Reviewed — status: <span className="font-semibold">{r.status}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
