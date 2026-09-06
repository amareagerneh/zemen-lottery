import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const STATUS_COLOR = {
  OPEN: "text-teal",
  FULL: "text-gold",
  DRAWING: "text-gold",
  COMPLETED: "text-mist",
  CANCELLED: "text-brick",
};

export default function MyTickets() {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState(null);

  useEffect(() => {
    api.myTickets().then((d) => setTickets(d.tickets));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl tracking-widest text-paper">
        {t("myTickets").toUpperCase()}
      </h1>

      {tickets === null && <p className="text-mist">{t("loading")}</p>}
      {tickets?.length === 0 && (
        <div className="rounded-lg border border-dashed border-surfaceRaised p-8 text-center text-mist">
          {t("noTickets")}{" "}
          <Link to="/" className="text-gold hover:underline">
            {t("browseOpenPools")}
          </Link>
          .
        </div>
      )}

      <div className="space-y-3">
        {tickets?.map((tk) => {
          const isWinner = tk.won_rank != null;
          return (
            <Link
              key={tk.id}
              to={`/games/${tk.game_id}`}
              className={`ticket-stub grid grid-cols-[1fr_auto] overflow-hidden shadow-md shadow-black/20 ${
                isWinner ? "ring-2 ring-gold" : ""
              }`}
            >
              <div className="p-4">
                <div className="font-display text-xl tracking-wide">{tk.game_name}</div>
                <div className={`text-xs font-semibold ${STATUS_COLOR[tk.game_status]}`}>
                  {isWinner
                    ? `${t("youWon").toUpperCase()} — #${tk.won_rank} PLACE — ${tk.won_amount} ETB`
                    : tk.game_status}
                </div>
              </div>
              <div className="ticket-tear flex w-20 flex-col items-center justify-center border-l px-2">
                <span className="font-display text-[10px] tracking-widest text-ink/60">
                  TICKET
                </span>
                <span className="font-mono text-xl font-bold">#{tk.ticket_number}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
