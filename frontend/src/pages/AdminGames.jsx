import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

const STATUS_COLOR = {
  OPEN: "text-teal",
  FULL: "text-gold",
  DRAWING: "text-gold",
  COMPLETED: "text-mist",
  CANCELLED: "text-brick",
};

export default function AdminGames() {
  const { showToast } = useToast();
  const [games, setGames] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function refresh() {
    api.listAllGamesAdmin().then((d) => setGames(d.games));
  }

  useEffect(refresh, []);

  async function handleDelete(game) {
    const sold = Number(game.tickets_sold);
    const confirmMsg =
      sold > 0
        ? `This pool has ${sold} ticket(s) sold. Deleting will CANCEL it and refund every buyer their ticket price. Continue?`
        : `Delete "${game.name}"? No tickets have been sold, so this is permanent and instant.`;
    if (!window.confirm(confirmMsg)) return;

    setBusyId(game.id);
    try {
      const { result } = await api.deleteGame(game.id);
      if (result.cancelled) {
        showToast(`Pool cancelled — ${result.refundedTickets} ticket(s) refunded.`, "success");
      } else {
        showToast("Pool deleted.", "success");
      }
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl tracking-widest text-paper">MANAGE POOLS</h1>
        <Link
          to="/admin"
          className="rounded bg-gold px-4 py-2 font-display text-sm tracking-widest text-ink hover:opacity-90"
        >
          + NEW POOL
        </Link>
      </div>

      {games === null && <p className="text-mist">Loading…</p>}
      {games?.length === 0 && <p className="text-mist">No pools yet.</p>}

      <div className="space-y-3">
        {games?.map((g) => {
          const sold = Number(g.tickets_sold);
          const canEdit = g.status === "OPEN" && sold === 0;
          const canDelete = g.status !== "COMPLETED" && g.status !== "CANCELLED";

          return (
            <div key={g.id} className="rounded-lg bg-surface p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <Link
                    to={`/games/${g.id}`}
                    className="font-display text-lg tracking-wide text-paper hover:text-gold"
                  >
                    {g.name}
                  </Link>
                  <div className={`text-xs font-semibold ${STATUS_COLOR[g.status]}`}>
                    {g.status}
                  </div>
                </div>
                <span className="font-mono text-xs text-mist">#{g.id}</span>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 font-mono text-sm text-mist">
                <div>
                  Price <span className="text-paper">{g.ticket_price} ETB</span>
                </div>
                <div>
                  Sold <span className="text-paper">{sold}/{g.max_tickets}</span>
                </div>
                <div>
                  Prize pool <span className="text-gold">{g.prize_amount} ETB</span>
                </div>
              </div>

              <div className="flex gap-2">
                {canEdit && (
                  <Link
                    to={`/admin/edit/${g.id}`}
                    className="rounded bg-surfaceRaised px-3 py-1.5 text-sm text-paper hover:text-gold"
                  >
                    Edit
                  </Link>
                )}
                {canDelete && (
                  <button
                    disabled={busyId === g.id}
                    onClick={() => handleDelete(g)}
                    className="rounded bg-brick px-3 py-1.5 text-sm font-semibold text-paper disabled:opacity-50"
                  >
                    {sold > 0 ? "Cancel & refund" : "Delete"}
                  </button>
                )}
                {!canEdit && g.status === "OPEN" && (
                  <span className="px-1 py-1.5 text-xs text-mist">
                    Can't edit — tickets already sold
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
