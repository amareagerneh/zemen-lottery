import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

export default function Invite() {
  const { showToast } = useToast();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.getReferralInfo().then(setInfo).catch(() => setInfo({ error: true }));
  }, []);

  if (!info) return <div className="mx-auto max-w-2xl px-4 py-8 text-mist">Loading…</div>;
  if (info.error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-brick">
        Couldn't load your referral info. Please try again.
      </div>
    );
  }

  const shareLink = `${window.location.origin}/register?ref=${info.referralCode}`;

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => showToast("Link copied!", "success"));
  }

  function copyCode() {
    navigator.clipboard
      .writeText(info.referralCode)
      .then(() => showToast("Code copied!", "success"));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 font-display text-3xl tracking-widest text-paper">INVITE FRIENDS</h1>
      <p className="mb-6 text-sm text-mist">
        Earn {info.bonusAmount} ETB and {info.bonusPoints} points when someone you invite
        deposits at least {info.minDeposit} ETB.
      </p>

      <div className="mb-6 rounded-lg bg-surface p-6 text-center">
        <div className="mb-2 text-sm text-mist">Your referral code</div>
        <button
          onClick={copyCode}
          className="mb-4 font-mono text-3xl font-bold tracking-widest text-gold"
        >
          {info.referralCode}
        </button>
        <button
          onClick={copyLink}
          className="w-full rounded bg-gold py-2.5 font-display tracking-widest text-ink transition-opacity hover:opacity-90"
        >
          COPY INVITE LINK
        </button>
      </div>

      <h2 className="mb-3 font-display tracking-widest text-mist">YOUR INVITES</h2>
      {info.referrals.length === 0 ? (
        <p className="text-mist">No invitations yet — share your link to start earning.</p>
      ) : (
        <ul className="divide-y divide-surfaceRaised rounded-lg bg-surface">
          {info.referrals.map((r, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-semibold text-paper">{r.invitee_name}</div>
                <div className="text-xs text-mist">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              {r.status === "COMPLETED" ? (
                <div className="text-right">
                  <div className="font-mono font-semibold text-teal">+{r.reward_amount} ETB</div>
                  <div className="text-xs text-gold">+{r.reward_points} pts</div>
                </div>
              ) : (
                <span className="font-display text-xs tracking-widest text-mist">PENDING</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}