import React from "react";

/**
 * Grid of numbered ticket slots. When `onSelect` is provided and the game
 * is still OPEN, unsold slots are clickable — the parent (GameDetail)
 * tracks which number is selected and buys that exact number. Sold slots
 * are shown filled but not clickable; the winner slot (once drawn) is
 * highlighted separately.
 */
export default function TicketBoard({
  maxTickets,
  soldNumbers, // Set<number> of taken ticket numbers
  ownedNumbers = new Set(), // ticket numbers this user owns
  winnerTicketNumber,
  selectedNumber,
  onSelect,
}) {
  const slots = Array.from({ length: maxTickets }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
      {slots.map((n) => {
        const isSold = soldNumbers.has(n);
        const isMine = ownedNumbers.has(n);
        const isWinner = winnerTicketNumber === n;
        const isSelected = selectedNumber === n;
        const clickable = !isSold && typeof onSelect === "function";

        return (
          <button
            key={n}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onSelect(n)}
            title={
              isWinner
                ? `Ticket #${n} — winner`
                : isMine
                ? `Ticket #${n} — yours`
                : isSold
                ? `Ticket #${n} — taken`
                : `Ticket #${n} — available`
            }
            className={`flex aspect-square items-center justify-center rounded font-mono text-sm font-semibold transition-colors ${
              isWinner
                ? "bg-gold text-ink ring-2 ring-gold ring-offset-2 ring-offset-surface"
                : isMine
                ? "bg-teal text-ink"
                : isSelected
                ? "bg-paper text-ink ring-2 ring-gold"
                : isSold
                ? "cursor-not-allowed bg-surfaceRaised text-mist"
                : clickable
                ? "border border-dashed border-mist/50 text-mist hover:border-gold hover:text-gold"
                : "border border-dashed border-mist/40 text-mist/50"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
