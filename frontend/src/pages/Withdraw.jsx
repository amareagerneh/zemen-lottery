import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

const STATUS_COLOR = {
  PENDING: "text-gold",
  COMPLETED: "text-teal",
  REJECTED: "text-brick",
};

export default function Withdraw() {
  const { showToast } = useToast();
  const [balance, setBalance] = useState(null);
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [terms, setTerms] = useState({ feePercent: 10, minimumAmount: 100 });

  const [profileForm, setProfileForm] = useState({
    accountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
    telebirrPhone: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const [amount, setAmount] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState(null);

  function refresh() {
    api.getWallet().then((d) => setBalance(d.balance));
    api.listMyWithdrawalRequests().then((d) => setRequests(d.requests));
    api.getWithdrawalTerms().then(setTerms);
    api.getPayoutProfile().then((d) => {
      setProfile(d.profile);
      if (d.profile) {
        setProfileForm({
          accountHolderName: d.profile.account_holder_name || "",
          bankName: d.profile.bank_name || "",
          bankAccountNumber: d.profile.bank_account_number || "",
          telebirrPhone: d.profile.telebirr_phone || "",
        });
      }
    });
  }

  useEffect(refresh, []);

  function updateField(field) {
    return (e) => setProfileForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileError(null);
    setSavingProfile(true);
    try {
      await api.upsertPayoutProfile(profileForm);
      showToast("Payout details saved.", "success");
      refresh();
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRequestWithdrawal(e) {
    e.preventDefault();
    setRequestError(null);

    const parsed = parseInt(amount, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setRequestError("Enter a whole number of ETB greater than 0.");
      return;
    }
    if (parsed < terms.minimumAmount) {
      setRequestError(`Minimum withdrawal is ${terms.minimumAmount} ETB.`);
      return;
    }
    if (!profile) {
      setRequestError("Save your payout details first.");
      return;
    }

    setRequesting(true);
    try {
      await api.createWithdrawalRequest({ amount: parsed });
      showToast("Withdrawal requested — funds are held pending admin review.", "success");
      setAmount("");
      refresh();
    } catch (err) {
      setRequestError(err.message);
    } finally {
      setRequesting(false);
    }
  }

  const parsedAmount = parseInt(amount, 10);
  const showPreview = Number.isInteger(parsedAmount) && parsedAmount > 0;
  const previewFee = showPreview ? Math.round((parsedAmount * terms.feePercent) / 100) : 0;
  const previewNet = showPreview ? parsedAmount - previewFee : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 font-display text-3xl tracking-widest text-paper">WITHDRAW</h1>
      <p className="mb-6 text-sm text-mist">
        Requested amounts are held from your balance immediately and paid out manually once an
        admin approves. Rejected requests are refunded automatically.
      </p>

      <div className="mb-6 rounded-lg bg-surface p-6 text-center">
        <div className="text-sm text-mist">Available balance</div>
        <div className="font-mono text-4xl font-bold text-gold">
          {balance !== null ? `${balance} ETB` : "…"}
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="mb-6 space-y-4 rounded-lg bg-surface p-6">
        <h2 className="font-display tracking-widest text-mist">PAYOUT DETAILS</h2>

        <div>
          <label className="mb-1 block text-sm text-mist">Account holder name</label>
          <input
            value={profileForm.accountHolderName}
            onChange={updateField("accountHolderName")}
            className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
          />
        </div>

        <p className="text-xs text-mist">Fill in bank details OR a Telebirr number — at least one.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-mist">Bank name</label>
            <input
              value={profileForm.bankName}
              onChange={updateField("bankName")}
              placeholder="e.g. CBE, Awash Bank"
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-mist">Bank account number</label>
            <input
              value={profileForm.bankAccountNumber}
              onChange={updateField("bankAccountNumber")}
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-mist">Telebirr number</label>
          <input
            value={profileForm.telebirrPhone}
            onChange={updateField("telebirrPhone")}
            placeholder="09XXXXXXXX"
            className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
          />
        </div>

        {profileError && <p className="text-sm text-brick">{profileError}</p>}

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full rounded bg-surfaceRaised py-2 font-display tracking-widest text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {savingProfile ? "SAVING…" : "SAVE PAYOUT DETAILS"}
        </button>
      </form>

      <form onSubmit={handleRequestWithdrawal} className="mb-8 rounded-lg bg-surface p-6">
        <h2 className="mb-1 font-display tracking-widest text-mist">REQUEST WITHDRAWAL</h2>
        <p className="mb-3 text-xs text-mist">
          A {terms.feePercent}% fee applies. Minimum withdrawal is {terms.minimumAmount} ETB.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min={terms.minimumAmount}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount in ETB (min ${terms.minimumAmount})`}
            className="flex-1 rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={requesting}
            className="rounded bg-gold px-5 font-display tracking-widest text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {requesting ? "…" : "REQUEST"}
          </button>
        </div>

        {showPreview && (
          <div className="mt-3 rounded border border-surfaceRaised p-3 font-mono text-sm text-mist">
            <div className="flex justify-between">
              <span>Requested</span>
              <span>{parsedAmount} ETB</span>
            </div>
            <div className="flex justify-between">
              <span>Fee ({terms.feePercent}%)</span>
              <span className="text-brick">-{previewFee} ETB</span>
            </div>
            <div className="flex justify-between font-semibold text-teal">
              <span>You'll receive</span>
              <span>{previewNet} ETB</span>
            </div>
          </div>
        )}

        {requestError && <p className="mt-2 text-sm text-brick">{requestError}</p>}
      </form>

      <h2 className="mb-3 font-display tracking-widest text-mist">YOUR REQUESTS</h2>
      {requests.length === 0 ? (
        <p className="text-mist">No withdrawal requests yet.</p>
      ) : (
        <ul className="divide-y divide-surfaceRaised rounded-lg bg-surface">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-mono font-semibold">
                  {r.amount} ETB <span className="text-xs text-mist">(net {r.net_amount})</span>
                </div>
                <div className="text-xs text-mist">
                  {r.method} · {new Date(r.created_at).toLocaleString()}
                </div>
                {r.admin_note && <div className="text-xs text-brick">Note: {r.admin_note}</div>}
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
