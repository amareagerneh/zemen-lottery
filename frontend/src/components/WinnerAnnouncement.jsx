import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";

const DISMISSED_KEY = "zemen_dismissed_winners";

function getDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function persistDismissed(set) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
}

const RANK_BADGE = { 1: "🥇", 2: "🥈", 3: "🥉" };
function rankKey(w) {
  return `${w.game_id}:${w.rank}`;
}
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
function ordinal(rank) {
  return ORDINALS[rank - 1] || `${rank}th`;
}

/**
 * Fetches recently completed draws and shows them as a rotating,
 * dismissible banner — announcement-style, like the design brief asked
 * for ("notify for every user on each pool like an ad"). Dismissal is
 * tracked per-game-id in localStorage so a closed banner doesn't come
 * back on the next login, but a new win always does.
 */
export default function WinnerAnnouncement() {
  const [winners, setWinners] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api
      .recentWinners()
      .then((data) => {
        const dismissed = getDismissed();
        const fresh = data.winners.filter((w) => !dismissed.has(rankKey(w)));
        setWinners(fresh);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (winners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % winners.length), 5000);
    return () => clearInterval(t);
  }, [winners.length]);

  if (winners.length === 0) return null;

  const current = winners[index];

  function dismissCurrent() {
    const dismissed = getDismissed();
    dismissed.add(rankKey(current));
    persistDismissed(dismissed);
    setWinners((prev) => prev.filter((w) => rankKey(w) !== rankKey(current)));
    setIndex(0);
  }

  return (
    <div className="border-b border-goldDim bg-gradient-to-r from-surface via-surfaceRaised to-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <p className="font-mono text-sm text-paper">
          <span className="mr-2 font-display tracking-widest text-gold">
            {RANK_BADGE[current.rank] || "WINNER"}
          </span>
          <span className="font-semibold">{current.winner_name}</span> won{" "}
          <span className="text-gold">{current.prize_amount} ETB</span> ({ordinal(current.rank)}{" "}
          place) on <span className="text-mist">{current.game_name}</span> — ticket #
          {current.winner_ticket_number}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {winners.length > 1 && (
            <button
              onClick={() => setIndex((i) => (i + 1) % winners.length)}
              className="text-xs text-mist hover:text-paper"
              aria-label="Next winner"
            >
              NEXT
            </button>
          )}
          <button
            onClick={dismissCurrent}
            className="text-mist hover:text-brick"
            aria-label="Dismiss this announcement"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
