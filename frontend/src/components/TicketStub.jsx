import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

const STAMP_STYLES = {
  OPEN: "bg-teal text-ink",
  FULL: "bg-gold text-ink",
  DRAWING: "bg-gold text-ink animate-pulse",
  COMPLETED: "bg-mist text-ink",
  CANCELLED: "bg-brick text-paper",
};

export default function TicketStub({ game }) {
  const { t } = useLanguage();
  const sold = Number(game.tickets_sold ?? 0);
  const remaining = game.max_tickets - sold;
  const topPrize = game.top_prize ?? game.prize_amount;
  const isMultiWinner = Number(topPrize) < Number(game.prize_amount);

  return (
    <Link
      to={`/games/${game.id}`}
      className="ticket-stub grid grid-cols-[1fr_auto] overflow-hidden shadow-lg shadow-black/30 transition-transform hover:-translate-y-0.5"
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-display text-2xl leading-none tracking-wide">
            {game.name}
          </h3>
          <span className={`ticket-stamp ${STAMP_STYLES[game.status] || "bg-mist text-ink"}`}>
            {game.status}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm text-ink/80">
          <dt>{t("ticketPrice")}</dt>
          <dd className="text-right font-semibold">{game.ticket_price} ETB</dd>
          <dt>{isMultiWinner ? "Top prize" : t("prize")}</dt>
          <dd className="text-right font-semibold text-goldDim">{topPrize} ETB</dd>
          <dt>{t("ticketsLeft")}</dt>
          <dd className="text-right font-semibold">
            {remaining} / {game.max_tickets}
          </dd>
        </dl>
        {isMultiWinner && (
          <div className="mt-2 text-xs font-semibold text-goldDim">
            🏆 {game.prize_amount} ETB total pool — multiple winners
          </div>
        )}
      </div>

      <div className="ticket-tear flex w-24 flex-col items-center justify-center border-l-0 px-2 py-5 sm:border-l">
        <span className="font-display text-xs tracking-widest text-ink/60">POOL</span>
        <span className="font-mono text-2xl font-bold">
          {sold}/{game.max_tickets}
        </span>
      </div>
    </Link>
  );
}
