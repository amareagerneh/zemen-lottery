import React, { useEffect, useRef, useState } from "react";

// Alternating wedge colors, cycling through the theme palette so any
// number of segments still reads as clearly distinct wedges.
const PALETTE = ["#E3B341", "#2FA88F", "#C4432E", "#232838"];
const TEXT_ON = {
  "#E3B341": "#14171F",
  "#2FA88F": "#14171F",
  "#C4432E": "#F2E9D8",
  "#232838": "#F2E9D8",
};

/**
 * A circular prize wheel. Purely presentational — the winning segment is
 * always decided by the backend first; this component just animates the
 * wheel spinning and decelerating onto `targetIndex`, so the visual can
 * never show a different result than what was actually awarded.
 *
 * Props:
 *  - segments: array of labels (string|number) to show in each wedge
 *  - targetIndex: index into `segments` to land on, or null while idle
 *  - spinning: boolean — set true to trigger the spin animation
 *  - onSpinEnd: called once the animation finishes settling
 *  - size: pixel diameter (default 260)
 */
export default function Wheel({ segments, targetIndex, spinning, onSpinEnd, size = 260 }) {
  const [rotation, setRotation] = useState(0);
  const spunRef = useRef(false);
  const n = segments.length;
  const segmentAngle = 360 / n;
  const radius = size / 2;

  useEffect(() => {
    if (!spinning || targetIndex === null || targetIndex === undefined) return;
    if (spunRef.current) return;
    spunRef.current = true;

    // Land the pointer (fixed at the top / 12 o'clock) on the middle of
    // the target wedge, plus several full spins for a satisfying animation.
    const targetCenter = targetIndex * segmentAngle + segmentAngle / 2;
    const extraSpins = 5 * 360;
    const finalRotation = extraSpins + (360 - targetCenter);

    const raf = requestAnimationFrame(() => setRotation(finalRotation));
    const timeout = setTimeout(() => onSpinEnd?.(), 3400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [spinning, targetIndex, segmentAngle, onSpinEnd]);

  useEffect(() => {
    if (!spinning) {
      spunRef.current = false;
      setRotation(0);
    }
  }, [spinning]);

  function wedgePath(i) {
    const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);
    const largeArc = segmentAngle > 180 ? 1 : 0;
    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Pointer */}
      <div
        className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: "16px solid #E3B341",
        }}
      />
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 3.2s cubic-bezier(0.17, 0.67, 0.16, 1)" : "none",
        }}
        className="rounded-full drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
      >
        <circle cx={radius} cy={radius} r={radius} fill="#14171F" />
        {segments.map((label, i) => {
          const color = PALETTE[i % PALETTE.length];
          const midAngle = ((i + 0.5) * segmentAngle - 90) * (Math.PI / 180);
          const labelRadius = radius * 0.62;
          const lx = radius + labelRadius * Math.cos(midAngle);
          const ly = radius + labelRadius * Math.sin(midAngle);
          return (
            <g key={i}>
              <path d={wedgePath(i)} fill={color} stroke="#14171F" strokeWidth="1.5" />
              <text
                x={lx}
                y={ly}
                fill={TEXT_ON[color]}
                fontSize={size * 0.075}
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${(i + 0.5) * segmentAngle}, ${lx}, ${ly})`}
              >
                {label}
              </text>
            </g>
          );
        })}
        <circle cx={radius} cy={radius} r={radius * 0.14} fill="#F2E9D8" stroke="#14171F" strokeWidth="2" />
      </svg>
    </div>
  );
}
