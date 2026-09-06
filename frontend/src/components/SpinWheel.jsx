import React, { useEffect, useState } from "react";

const COLORS = ["#E3B341", "#14171F", "#2FA88F", "#1B1F2B"];

/**
 * A real pie-segment wheel, not a scrolling reel. The winning segment is
 * decided by the backend BEFORE this component ever spins — `winningIndex`
 * is just where the animation is told to land. For wheels with many
 * segments (the ticket draw can have up to 50+ tickets), per-segment
 * number labels get too cramped to read, so labels are only rendered when
 * there are 24 or fewer segments; the result is still shown clearly below
 * the wheel either way.
 */
export default function SpinWheel({ segments, winningIndex, spin, onSettled, size = 260 }) {
  const [rotation, setRotation] = useState(0);
  const anglePer = 360 / segments.length;
  const showLabels = segments.length <= 24;

  useEffect(() => {
    if (!spin || winningIndex === null || winningIndex === undefined) return;
    const extraSpins = 5;
    const targetCenterAngle = winningIndex * anglePer + anglePer / 2;
    const finalRotation = 360 * extraSpins + (360 - targetCenterAngle);
    // Reset to 0 first (no transition) so repeated spins always animate
    // from a clean start rather than accumulating rotation forever.
    setRotation(0);
    const raf = requestAnimationFrame(() => setRotation(finalRotation));
    const timer = setTimeout(() => onSettled && onSettled(), 3300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin, winningIndex]);

  const gradientStops = segments
    .map((_, i) => {
      const start = i * anglePer;
      const end = start + anglePer;
      const color = COLORS[i % COLORS.length];
      return `${color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "18px solid #E3B341",
          }}
        />
      </div>

      <div
        className="relative h-full w-full rounded-full border-4 border-surfaceRaised shadow-lg shadow-black/40"
        style={{
          background: `conic-gradient(${gradientStops})`,
          transform: `rotate(${rotation}deg)`,
          transition: spin ? "transform 3200ms cubic-bezier(0.15,0.65,0.25,1)" : "none",
        }}
      >
        {showLabels &&
          segments.map((seg, i) => {
            const angle = i * anglePer + anglePer / 2;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-top font-mono text-xs font-bold text-paper"
                style={{
                  transform: `rotate(${angle}deg) translateY(-${size / 2 - 20}px) rotate(-${angle}deg)`,
                }}
              >
                {seg.label}
              </div>
            );
          })}
      </div>

      <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-gold" />
    </div>
  );
}
