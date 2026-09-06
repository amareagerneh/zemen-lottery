import React, { useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const RANK_BADGE = { 1: "🥇", 2: "🥈", 3: "🥉" };
const CONFETTI_COLORS = ["#E3B341", "#2FA88F", "#C4432E", "#F2E9D8", "#B08A2E"];

/**
 * Fetches this user's not-yet-seen wins and shows them one at a time as a
 * celebratory modal right after login. Each win is marked acknowledged as
 * soon as it's shown, so it never pops up again on a later login — even
 * if the user closes the tab before clicking through all of them, only
 * the ones actually displayed get marked seen.
 */
export default function WinPopup() {
  const { t } = useLanguage();
  const [wins, setWins] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    api
      .getMyUnseenWins()
      .then((data) => setWins(data.wins || []))
      .catch(() => {});
  }, []);

  const current = wins[index];

  useEffect(() => {
    if (!current) return;
    // Mark seen as soon as it's actually shown to the person, not before.
    api.acknowledgeWin(current.id).catch(() => {});
  }, [current?.id]);

  if (!current) return null;

  function handleNext() {
    if (index + 1 < wins.length) {
      setIndex(index + 1);
    } else {
      setWins([]);
    }
  }

  const isLast = index + 1 >= wins.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-lg bg-gradient-to-b from-surfaceRaised to-surface p-8 text-center shadow-[0_0_60px_rgba(227,179,65,0.25)]">
        <Confetti />

        <div className="relative">
          <div className="mb-2 text-6xl">{RANK_BADGE[current.rank] || "🎉"}</div>

          <h2 className="mb-1 font-display text-3xl tracking-widest text-gold">
            {t("congratulations")}
          </h2>

          <p className="mb-4 text-paper">
            {t("youWonPopupLine")}{" "}
            <span className="font-display text-2xl text-gold">{current.prize_amount} ETB</span>
          </p>

          <div className="mb-6 rounded bg-ink/60 p-3 font-mono text-sm text-mist">
            <div className="text-paper">{current.game_name}</div>
            <div>
              {t("ticketNumberLabel")}: <span className="text-gold">#{current.ticket_number}</span>
            </div>
          </div>

          <button
            onClick={handleNext}
            className="w-full rounded bg-gold py-3 font-display text-lg tracking-widest text-ink transition-opacity hover:opacity-90"
          >
            {isLast ? t("claimAwesome").toUpperCase() : t("nextWin").toUpperCase()}
          </button>

          {wins.length > 1 && (
            <p className="mt-3 text-xs text-mist">
              {index + 1} / {wins.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Lightweight CSS-only confetti burst — no extra dependency needed. */
function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-10%",
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.4,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `winpopup-fall ${p.duration}s ease-in ${p.delay}s 1 both`,
          }}
        />
      ))}
      <style>{`
        @keyframes winpopup-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(340px) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
