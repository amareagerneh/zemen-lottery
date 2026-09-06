import React, { useMemo, useState } from "react";
import { api } from "../services/api.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import SpinWheel from "./SpinWheel.jsx";

const REWARD_POOL = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

export default function SpinModal({ onClose, onSpun }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("idle"); // idle | spinning | done | error
  const [reward, setReward] = useState(null);
  const [error, setError] = useState(null);

  const segments = useMemo(() => REWARD_POOL.map((v) => ({ label: v, value: v })), []);
  const winningIndex = reward !== null ? REWARD_POOL.indexOf(reward) : null;

  async function handleSpin() {
    setError(null);
    try {
      const { result } = await api.spin();
      setReward(result.reward);
      setPhase("spinning");
    } catch (err) {
      setError(err.message);
      setPhase("error");
    }
  }

  function handleClose() {
    if (phase === "done") onSpun();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-6 text-center">
        <h2 className="mb-4 font-display text-2xl tracking-widest text-gold">
          {t("spin").toUpperCase()}
        </h2>

        <div className="mb-4">
          <SpinWheel
            segments={segments}
            winningIndex={winningIndex}
            spin={phase === "spinning"}
            onSettled={() => setPhase("done")}
          />
        </div>

        {phase === "idle" && (
          <>
            <p className="mb-6 text-sm text-mist">{t("spinCostLabel")}</p>
            <button
              onClick={handleSpin}
              className="w-full rounded bg-gold py-3 font-display text-lg tracking-widest text-ink transition-opacity hover:opacity-90"
            >
              {t("spinNow").toUpperCase()}
            </button>
          </>
        )}

        {phase === "spinning" && (
          <p className="font-display tracking-widest text-mist">…</p>
        )}

        {phase === "done" && (
          <>
            <p className="mb-4 font-display text-xl tracking-wide text-teal">
              {t("youWonBonus")} {reward} ETB!
            </p>
            <button
              onClick={handleClose}
              className="w-full rounded bg-teal py-2.5 font-display tracking-widest text-ink"
            >
              OK
            </button>
          </>
        )}

        {phase === "error" && (
          <>
            <p className="mb-4 text-sm text-brick">{error}</p>
            <button
              onClick={onClose}
              className="w-full rounded bg-surfaceRaised py-2.5 font-display tracking-widest text-paper"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
