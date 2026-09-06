import React, { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

const CONFETTI_COLORS = ["#E3B341", "#2FA88F", "#C4432E", "#F2E9D8", "#5B6478"];

function ConfettiPiece({ delay, left, color, rotate }) {
  return (
    <div
      className="pointer-events-none absolute top-[-20px] h-2.5 w-2.5 rounded-sm"
      style={{
        left: `${left}%`,
        backgroundColor: color,
        animation: `win-confetti-fall 2.6s ${delay}s cubic-bezier(0.4,0,0.6,1) forwards`,
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
}

/**
 * Shows one win at a time from a queue, so a user who missed several
 * congratulation popups (e.g. was offline when multiple draws finished)
 * sees them one after another instead of all overlapping.
 */
export default function WinCelebrationModal({ wins, onAcknowledge }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const win = wins[0];

  useEffect(() => {
    if (win) {
      setVisible(false);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [win?.ticket_id]);

  if (!win) return null;

  const confetti = Array.from({ length: 36 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotate: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
      <style>{`
        @keyframes win-confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(540deg); opacity: 0; }
        }
        @keyframes win-modal-pop {
          0% { transform: scale(0.85); opacity: 0; }
          60% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes win-glow {
          0%, 100% { box-shadow: 0 0 30px 4px rgba(227,179,65,0.35); }
          50% { box-shadow: 0 0 55px 12px rgba(227,179,65,0.6); }
        }
      `}</style>

      <div className="relative w-full max-w-sm overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confetti.map((c, i) => (
            <ConfettiPiece key={i} {...c} />
          ))}
        </div>

        <div
          className="relative rounded-xl border-2 border-gold bg-gradient-to-b from-surface to-ink p-8 text-center"
          style={{
            animation: visible
              ? "win-modal-pop 0.5s cubic-bezier(0.17,0.67,0.16,1), win-glow 2.2s ease-in-out infinite"
              : "none",
          }}
        >
          <div className="mb-2 text-5xl">🎉</div>
          <h2 className="mb-1 font-display text-3xl tracking-widest text-gold">
            {t("congratulations").toUpperCase()}
          </h2>
          <p className="mb-4 text-sm text-mist">{win.game_name}</p>

          <div className="mb-5 rounded-lg bg-ink/60 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-mist">{t("youWon")}</p>
            <p className="font-display text-4xl text-gold">{win.prize_amount} ETB</p>
            <p className="mt-1 text-xs text-mist">
              {t("winningTicket")} #{win.ticket_number}
            </p>
          </div>

          <button
            onClick={() => onAcknowledge(win.ticket_id)}
            className="w-full rounded bg-gold py-3 font-display text-lg tracking-widest text-ink transition-transform hover:scale-[1.02] hover:opacity-90"
          >
            {t("awesome").toUpperCase()} 🎊
          </button>

          {wins.length > 1 && (
            <p className="mt-3 text-xs text-mist">
              +{wins.length - 1} {t("moreWins")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
