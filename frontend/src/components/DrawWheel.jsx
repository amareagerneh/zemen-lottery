import React, { useMemo, useState } from "react";
import SpinWheel from "./SpinWheel.jsx";

/**
 * Purely presentational, same contract as before: the backend already
 * picked `winnerTicketNumber` with crypto.randomInt before the game
 * reached COMPLETED. This just auto-plays the wheel landing on it once,
 * on mount.
 */
export default function DrawWheel({ maxTickets, winnerTicketNumber }) {
  const [spin, setSpin] = useState(true);
  const [settled, setSettled] = useState(false);

  const segments = useMemo(
    () => Array.from({ length: maxTickets }, (_, i) => ({ label: i + 1, value: i + 1 })),
    [maxTickets]
  );
  const winningIndex = winnerTicketNumber - 1;

  return (
    <div>
      <SpinWheel
        segments={segments}
        winningIndex={winningIndex}
        spin={spin}
        onSettled={() => {
          setSpin(false);
          setSettled(true);
        }}
      />
      {settled && (
        <p className="mt-4 text-center font-display text-xl tracking-widest text-gold">
          #{winnerTicketNumber}
        </p>
      )}
    </div>
  );
}
