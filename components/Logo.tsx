"use client";

/**
 * Stellar mark — a quiet horizon line with a star above it.
 * Replaces the orbiting-orb mark which read demo-ish; this version
 * leans on negative space and one bright pinpoint.
 */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden
    >
      <defs>
        <radialGradient id="stellar-dot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff5d6" />
          <stop offset="40%" stopColor="#e8c982" />
          <stop offset="100%" stopColor="#9a7f4d" />
        </radialGradient>
      </defs>
      {/* horizon arc */}
      <path
        d="M 4 22 Q 16 14 28 22"
        stroke="rgba(236, 232, 223, 0.32)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
      {/* faint earth shadow under arc */}
      <path
        d="M 4 22 Q 16 14 28 22 L 28 28 L 4 28 Z"
        fill="rgba(236, 232, 223, 0.04)"
      />
      {/* the star */}
      <circle
        cx="16"
        cy="11"
        r="2.6"
        fill="url(#stellar-dot)"
      />
      <circle
        cx="16"
        cy="11"
        r="5"
        fill="none"
        stroke="rgba(232, 201, 130, 0.18)"
        strokeWidth="0.5"
      />
    </svg>
  );
}
