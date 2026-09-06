import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api.js";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
function ordinal(rank) {
  return ORDINALS[rank - 1] || `${rank}th`;
}

export default function Admin() {
  const navigate = useNavigate();
  const { id: editId } = useParams(); // present when editing an existing pool
  const isEditing = Boolean(editId);

  const [form, setForm] = useState({ name: "", ticketPrice: "", maxTickets: "" });
  const [tiers, setTiers] = useState([{ rank: 1, prizeAmount: "" }]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(!isEditing);

  useEffect(() => {
    if (!isEditing) return;
    api.getGame(editId).then((d) => {
      const g = d.game;
      setForm({
        name: g.name,
        ticketPrice: String(g.ticket_price),
        maxTickets: String(g.max_tickets),
      });
      setTiers(
        g.prize_tiers.map((t) => ({ rank: t.rank, prizeAmount: String(t.prize_amount) }))
      );
      setLoaded(true);
    });
  }, [isEditing, editId]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function updateTierAmount(rank, value) {
    setTiers((prev) => prev.map((t) => (t.rank === rank ? { ...t, prizeAmount: value } : t)));
  }

  function addTier() {
    setTiers((prev) => [...prev, { rank: prev.length + 1, prizeAmount: "" }]);
  }

  function removeTier(rank) {
    setTiers((prev) =>
      prev.filter((t) => t.rank !== rank).map((t, i) => ({ ...t, rank: i + 1 }))
    );
  }

  const totalPool = Number(form.ticketPrice || 0) * Number(form.maxTickets || 0);
  const totalPrizes = tiers.reduce((sum, t) => sum + (Number(t.prizeAmount) || 0), 0);
  const margin = totalPool - totalPrizes;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: form.name.trim(),
      ticketPrice: parseInt(form.ticketPrice, 10),
      maxTickets: parseInt(form.maxTickets, 10),
      prizeTiers: tiers.map((t) => ({ rank: t.rank, prizeAmount: parseInt(t.prizeAmount, 10) })),
    };

    if (!payload.name || !Number.isInteger(payload.ticketPrice) || !Number.isInteger(payload.maxTickets)) {
      setError("Fill in the pool name, ticket price, and ticket count.");
      return;
    }
    if (payload.prizeTiers.some((t) => !Number.isInteger(t.prizeAmount) || t.prizeAmount <= 0)) {
      setError("Every prize tier needs a positive whole-number amount.");
      return;
    }
    if (payload.prizeTiers.length > payload.maxTickets) {
      setError("Can't have more prize winners than tickets.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await api.updateGame(editId, payload);
        navigate(`/games/${editId}`);
      } else {
        const { game } = await api.createGame(payload);
        navigate(`/games/${game.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <div className="mx-auto max-w-lg px-4 py-8 text-mist">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl tracking-widest text-paper">
        {isEditing ? "EDIT POOL" : "CREATE POOL"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-surface p-6">
        <div>
          <label className="mb-1 block text-sm text-mist">Pool name</label>
          <input
            value={form.name}
            onChange={update("name")}
            placeholder="10 Birr Lucky Draw"
            className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 text-paper outline-none focus:border-gold"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-mist">Ticket price (ETB)</label>
            <input
              type="number"
              min="1"
              value={form.ticketPrice}
              onChange={update("ticketPrice")}
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-mist">Number of tickets</label>
            <input
              type="number"
              min="2"
              value={form.maxTickets}
              onChange={update("maxTickets")}
              className="w-full rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-mist">Prize tiers</label>
          <div className="space-y-2">
            {tiers.map((tier) => (
              <div key={tier.rank} className="flex items-center gap-2">
                <span className="w-10 flex-shrink-0 font-display text-sm text-goldDim">
                  {ordinal(tier.rank)}
                </span>
                <input
                  type="number"
                  min="1"
                  value={tier.prizeAmount}
                  onChange={(e) => updateTierAmount(tier.rank, e.target.value)}
                  placeholder="ETB"
                  className="flex-1 rounded border border-surfaceRaised bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-gold"
                />
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTier(tier.rank)}
                    className="px-2 text-brick hover:opacity-80"
                    aria-label="Remove tier"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTier}
            className="mt-2 text-sm text-gold hover:underline"
          >
            + Add another prize tier
          </button>
        </div>

        {totalPool > 0 && (
          <div className="rounded border border-surfaceRaised p-3 font-mono text-sm text-mist">
            <div className="flex justify-between">
              <span>Total collected (if sold out)</span>
              <span>{totalPool} ETB</span>
            </div>
            <div className="flex justify-between">
              <span>Total prize payout ({tiers.length} winner{tiers.length > 1 ? "s" : ""})</span>
              <span>{totalPrizes} ETB</span>
            </div>
            <div className={`flex justify-between font-semibold ${margin < 0 ? "text-brick" : "text-teal"}`}>
              <span>Margin before fees</span>
              <span>{margin} ETB</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-brick">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-gold py-2 font-display tracking-widest text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "SAVING…" : isEditing ? "SAVE CHANGES" : "CREATE POOL"}
        </button>
      </form>
    </div>
  );
}
