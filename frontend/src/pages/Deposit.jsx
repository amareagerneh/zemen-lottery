import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

const STATUS_COLOR = {
  PENDING: "text-gold",
  APPROVED: "text-teal",
  REJECTED: "text-brick",
};

// Helper to mask a string: show first N, then asterisks, then last M
function maskString(str, first = 3, last = 2, maskChar = "*") {
  if (!str) return "";
  if (str.length <= first + last) return str; // too short, show as-is
  const visibleStart = str.slice(0, first);
  const visibleEnd = str.slice(-last);
  const maskedLength = str.length - first - last;
  return visibleStart + maskChar.repeat(maskedLength) + visibleEnd;
}

export default function Deposit() {
  const { showToast } = useToast();
  const [methods, setMethods] = useState(null);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CBE");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function refreshRequests() {
    api.listMyDepositRequests().then((d) => setRequests(d.requests));
  }

  useEffect(() => {
    api.getPaymentMethods().then(setMethods);
    refreshRequests();
  }, []);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseInt(amount, 10);

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a whole number of ETB greater than 0.");
      return;
    }

    if (!file) {
      setError("Attach a screenshot of your payment.");
      return;
    }

    if (!reference.trim()) {
      setError("Enter the transaction ID/reference from your payment receipt.");
      return;
    }

    const formData = new FormData();
    formData.append("amount", parsedAmount);
    formData.append("method", method);
    formData.append("transactionRef", reference.trim());
    formData.append("screenshot", file);

    setSubmitting(true);

    try {
      const { request } = await api.createDepositRequest(formData);

      if (request.autoApproved) {
        showToast(
          "Payment verified automatically — your wallet has been credited! 🎉",
          "win"
        );
      } else {
        showToast(
          "Deposit request submitted — awaiting admin approval.",
          "success"
        );
      }

      setAmount("");
      setReference("");
      setFile(null);
      setPreview(null);
      e.target.reset();
      refreshRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const account = methods?.[method.toLowerCase()];

  // Copy handler
  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, "success");
    } catch {
      showToast("Failed to copy. Please copy manually.", "error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 font-display text-3xl tracking-widest text-paper">DEPOSIT</h1>
      <p className="mb-2 text-sm text-mist">
        Pay to the account below, then upload a screenshot as proof. An admin reviews every
        request before your wallet is credited.
      </p>
      <p className="mb-6 text-xs text-goldDim">
        🎁 Earn 10 loyalty point per 100 ETB deposited — collect 50 to spin for a bonus.
      </p>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-lg bg-surface p-6">
        <div>
          <label className="mb-1 block text-sm text-mist">Payment method</label>
          <div className="flex gap-2">
            {["CBE", "TELEBIRR"].map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 rounded py-2 font-display tracking-widest transition-colors ${
                  method === m ? "bg-gold text-ink" : "bg-ink text-mist"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {account && (
          <div className="ticket-stub rounded p-4 font-mono text-sm">
            <div className="mb-1 font-display text-lg tracking-wide">
              {method === "CBE" ? account.bankName : "Telebirr"}
            </div>
            <div className="flex justify-between">
              <span className="text-ink/60">Account name</span>
              <span className="font-semibold">{account.accountName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink/60">
                {method === "CBE" ? "Account number" : "Phone number"}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {method === "CBE"
                    ? maskString(account.accountNumber, 3, 2)
                    : maskString(account.phoneNumber, 4, 2)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      method === "CBE" ? account.accountNumber : account.phoneNumber,
                      method === "CBE" ? "Account number" : "Phone number"
                    )
                  }
                  className="text-mist hover:text-paper transition-colors"
                  aria-label="Copy to clipboard"
                >
                  {/* Simple inline SVG copy icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="amount" className="mb-1 block text-sm text-mist">
            Amount you paid (ETB)
          </label>
          <input
            id="amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
          />
        </div>

        <div>
          <label htmlFor="reference" className="mb-1 block text-sm text-mist">
            Transaction ID / Reference
          </label>
          <input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. FT24123ABCDE"
            className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
          />
        </div>

        <div>
          <label htmlFor="screenshot" className="mb-1 block text-sm text-mist">
            Payment screenshot
          </label>
          <input
            id="screenshot"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="w-full text-sm text-mist file:mr-3 file:rounded file:border-0 file:bg-surfaceRaised file:px-3 file:py-2 file:text-paper"
          />
          {preview && (
            <img
              src={preview}
              alt="Payment screenshot preview"
              className="mt-3 max-h-64 rounded border border-surfaceRaised object-contain"
            />
          )}
        </div>

        {error && <p className="text-sm text-brick">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-teal py-2 font-display tracking-widest text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "SUBMITTING…" : "SUBMIT DEPOSIT REQUEST"}
        </button>
      </form>

      <h2 className="mb-3 font-display tracking-widest text-mist">YOUR REQUESTS</h2>
      {requests.length === 0 ? (
        <p className="text-mist">No deposit requests yet.</p>
      ) : (
        <ul className="divide-y divide-surfaceRaised rounded-lg bg-surface">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-mono font-semibold">{r.amount} ETB</div>
                <div className="text-xs text-mist">
                  {r.method} · {new Date(r.created_at).toLocaleString()}
                  {r.status === "APPROVED" && r.verification_source === "AUTO" && (
                    <span className="ml-2 text-teal">⚡ auto-verified</span>
                  )}
                </div>
                {r.admin_note && (
                  <div className="text-xs text-brick">Note: {r.admin_note}</div>
                )}
              </div>
              <span className={`font-display text-sm tracking-widest ${STATUS_COLOR[r.status]}`}>
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}