import React, { useEffect, useMemo, useState } from "react";
import Wheel from "./Wheel.jsx";

const SLOT_WIDTH = 72; // px, must match the fixed width class below
const WHEEL_MAX_TICKETS = 20; // above this, a wheel gets too crowded to read

/**
 * Purely presentational. The winning ticket number is already decided by
 * the backend (crypto.randomInt) — this component just animates the
 * reveal, so the outcome always matches what was actually drawn.
 *
 * Small pools (<= WHEEL_MAX_TICKETS) get the same circular Wheel used for
 * the points spin, one wedge per ticket number, for a consistent "spin to
 * reveal" feel across the app. Larger pools fall back to a scrolling reel,
 * since that many wedges stop being legible.
 */
export default function DrawReel({ maxTickets, winnerTicketNumber }) {
  if (maxTickets <= WHEEL_MAX_TICKETS) {
    return <WheelDraw maxTickets={maxTickets} winnerTicketNumber={winnerTicketNumber} />;
  }
  return <ReelDraw maxTickets={maxTickets} winnerTicketNumber={winnerTicketNumber} />;
}

function WheelDraw({ maxTickets, winnerTicketNumber }) {
  const segments = useMemo(
    () => Array.from({ length: maxTickets }, (_, i) => i + 1),
    [maxTickets]
  );
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSpinning(true), 150);
    return () => clearTimeout(t);
  }, []);

  const targetIndex = winnerTicketNumber - 1;

  return (
    <div className="py-2">
      <Wheel
        segments={segments}
        targetIndex={targetIndex}
        spinning={spinning}
        onSpinEnd={() => setDone(true)}
        size={260}
      />
      <p className="mt-3 text-center font-display text-xl tracking-widest text-gold">
        {done ? `#${winnerTicketNumber}` : ""}
      </p>
    </div>
  );
}

function ReelDraw({ maxTickets, winnerTicketNumber }) {
  const [settled, setSettled] = useState(false);

  // Build a strip: some random-ish filler numbers, ending on the winner.
  const strip = useMemo(() => {
    const filler = Array.from({ length: 24 }, () => 1 + Math.floor(Math.random() * maxTickets));
    return [...filler, winnerTicketNumber];
  }, [maxTickets, winnerTicketNumber]);

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 150);
    return () => clearTimeout(t);
  }, []);

  const offset = settled ? (strip.length - 1) * SLOT_WIDTH : 0;

  return (
    <div className="overflow-hidden rounded border border-surfaceRaised bg-ink py-4">
      <div className="relative mx-auto w-[72px]">
        {/* Center indicator */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 border-x-2 border-gold" />
        <div
          className="flex transition-transform ease-out"
          style={{
            transform: `translateX(-${offset}px)`,
            transitionDuration: settled ? "2400ms" : "0ms",
          }}
        >
          {strip.map((n, i) => (
            <div
              key={i}
              className="flex h-16 w-[72px] flex-shrink-0 items-center justify-center font-mono text-2xl font-bold text-paper"
            >
              {n}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center font-display tracking-widest text-mist">
        {settled ? "" : "DRAWING…"}
      </p>
    </div>
  );
}
