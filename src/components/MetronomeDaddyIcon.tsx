import React, { useId } from 'react';

interface MetronomeDaddyIconProps {
  isPlaying: boolean;
  bpm: number;
  className?: string;
}

/**
 * Transparent-background vector rendering of the Tempo Daddy metronome:
 * brushed gunmetal pyramid casing, side wind-up key, glowing golden pendulum
 * arm (swings at current BPM when playing), and sculpted 3D golden handlebar mustache.
 */
export const MetronomeDaddyIcon: React.FC<MetronomeDaddyIconProps> = ({
  isPlaying,
  bpm,
  className = 'w-48 h-48',
}) => {
  const uid = useId().replace(/:/g, '');
  // Half-cycle duration in seconds (one beat = 60 / bpm seconds)
  const beatDurationSec = Math.max(0.18, Math.min(2.0, 60 / Math.max(30, bpm)));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Brushed Gunmetal Casing Gradient */}
        <linearGradient id={`casing-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B4252" />
          <stop offset="45%" stopColor="#1E222A" />
          <stop offset="100%" stopColor="#0F1115" />
        </linearGradient>

        {/* Metallic Rim Bevel Highlight */}
        <linearGradient id={`rim-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>

        {/* Inner Cavity Recessed Shadow */}
        <linearGradient id={`cavity-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#050608" />
          <stop offset="100%" stopColor="#12151C" />
        </linearGradient>

        {/* Lower Base Apron Gradient */}
        <linearGradient id={`apron-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2A303C" />
          <stop offset="100%" stopColor="#12141A" />
        </linearGradient>

        {/* 3D Sculpted Golden Mustache Gradient */}
        <linearGradient id={`gold-stache-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="38%" stopColor="#FBBF24" />
          <stop offset="75%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Glowing Golden Pendulum Arm Gradient */}
        <linearGradient id={`pendulum-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* Soft Amber Glow Filter for Pendulum */}
        <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Top Apex Crown Cap */}
      <path
        d="M 226,56 L 256,40 L 286,56 Z"
        fill={`url(#rim-${uid})`}
        stroke="#94A3B8"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Side Wind-Up Key */}
      <path
        d="M 384, 388 L 416, 392 C 424, 393 430, 399 430, 408 C 430, 417 424, 422 416, 423 L 380, 427 Z"
        fill={`url(#rim-${uid})`}
        stroke="#475569"
        strokeWidth="3"
      />

      {/* Main Metronome Pyramid Body */}
      <path
        d="M 218, 72 C 228, 60 240, 56 256, 56 C 272, 56 284, 60 294, 72 L 398, 444 C 402, 454 394, 462 382, 462 L 130, 462 C 118, 462 110, 454 114, 444 Z"
        fill={`url(#casing-${uid})`}
        stroke={`url(#rim-${uid})`}
        strokeWidth="12"
        strokeLinejoin="round"
      />

      {/* Recessed Inner Cavity */}
      <path
        d="M 228, 96 C 238, 89 246, 86 256, 86 C 266, 86 274, 89 284, 96 L 352, 336 L 160, 336 Z"
        fill={`url(#cavity-${uid})`}
        stroke="#0F172A"
        strokeWidth="4"
      />

      {/* Brushed Steel Vertical Tempo Scale Track inside Cavity */}
      <rect x="242" y="98" width="28" height="236" rx="4" fill="#1E2430" stroke="#334155" strokeWidth="2" />
      <line x1="256" y1="104" x2="256" y2="332" stroke="#090B0E" strokeWidth="5" strokeLinecap="round" />

      {/* Pendulum Group (pivots around base of cavity at 256, 334) */}
      <g
        style={{
          transformOrigin: '256px 334px',
          transform: isPlaying ? undefined : 'rotate(23deg)',
          animation: isPlaying
            ? `metronome-daddy-swing-${uid} ${beatDurationSec * 2}s ease-in-out infinite`
            : 'none',
        }}
      >
        {/* Subtle motion blur fan behind needle */}
        <path
          d="M 256,334 L 222,116 L 288,116 Z"
          fill="#F59E0B"
          opacity={isPlaying ? 0.22 : 0.14}
        />
        {/* Glowing Golden Needle */}
        <line
          x1="256"
          y1="334"
          x2="256"
          y2="104"
          stroke={`url(#pendulum-${uid})`}
          strokeWidth="13"
          strokeLinecap="round"
          filter={`url(#glow-${uid})`}
        />
        {/* Counterweight slide on needle */}
        <rect
          x="245"
          y="168"
          width="22"
          height="16"
          rx="4"
          fill="#FDE047"
          stroke="#B45309"
          strokeWidth="2"
        />
      </g>

      {/* Lower Trapezoid Front Apron (behind the Golden Mustache) */}
      <path
        d="M 148, 336 L 364, 336 L 392, 444 C 394, 452 388, 456 378, 456 L 134, 456 C 124, 456 118, 452 120, 444 Z"
        fill={`url(#apron-${uid})`}
      />
      {/* Beveled Horizontal Divider Line */}
      <line x1="149" y1="336" x2="363" y2="336" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />

      {/* Drop Shadow under Golden Mustache */}
      <path
        d="M 226.8,376.9 L 237.7,376.9 L 244.6,378.9 L 251.6,383.3 L 255.5,388.3 L 262.4,381.3 L 270.8,377.4 L 286.6,377.4 L 293.6,379.8 L 298.5,382.8 L 308.9,391.2 L 322.2,404.1 L 328.2,408.0 L 335.6,411.0 L 345.0,410.5 L 350.4,405.6 L 351.4,398.1 L 349.9,394.2 L 345.5,390.2 L 338.1,389.7 L 343.5,386.3 L 349.9,386.3 L 357.8,390.7 L 362.3,397.6 L 363.8,402.6 L 363.8,413.0 L 362.3,418.4 L 357.3,427.3 L 350.9,433.7 L 346.5,436.7 L 338.1,440.2 L 325.7,442.6 L 307.4,442.1 L 298.0,440.2 L 286.6,436.2 L 277.7,431.7 L 268.9,425.8 L 258.5,415.9 L 256.0,412.5 L 245.1,423.8 L 240.7,427.3 L 233.3,432.2 L 221.4,437.7 L 210.0,441.1 L 201.1,442.6 L 185.8,442.6 L 174.9,440.6 L 164.6,436.2 L 159.1,432.2 L 153.7,426.3 L 150.2,420.4 L 147.8,413.0 L 147.8,403.1 L 149.2,397.6 L 151.7,393.2 L 155.7,389.2 L 162.1,386.3 L 168.0,386.3 L 173.0,388.7 L 173.5,390.2 L 166.5,390.2 L 161.6,394.2 L 160.1,397.6 L 160.1,402.6 L 161.1,405.6 L 164.1,409.0 L 168.5,411.0 L 175.9,411.0 L 185.3,407.0 L 190.8,403.1 L 202.1,391.7 L 213.0,382.8 L 226.8,376.9 Z"
        fill="#000000"
        opacity="0.55"
      />

      {/* Sculpted 3D Golden Handlebar Mustache */}
      <path
        d="M 226.8,370.9 L 237.7,370.9 L 244.6,372.9 L 251.6,377.3 L 255.5,382.3 L 262.4,375.3 L 270.8,371.4 L 286.6,371.4 L 293.6,373.8 L 298.5,376.8 L 308.9,385.2 L 322.2,398.1 L 328.2,402.0 L 335.6,405.0 L 345.0,404.5 L 350.4,399.6 L 351.4,392.1 L 349.9,388.2 L 345.5,384.2 L 338.1,383.7 L 343.5,380.3 L 349.9,380.3 L 357.8,384.7 L 362.3,391.6 L 363.8,396.6 L 363.8,407.0 L 362.3,412.4 L 357.3,421.3 L 350.9,427.7 L 346.5,430.7 L 338.1,434.2 L 325.7,436.6 L 307.4,436.1 L 298.0,434.2 L 286.6,430.2 L 277.7,425.7 L 268.9,419.8 L 258.5,409.9 L 256.0,406.5 L 245.1,417.8 L 240.7,421.3 L 233.3,426.2 L 221.4,431.7 L 210.0,435.1 L 201.1,436.6 L 185.8,436.6 L 174.9,434.6 L 164.6,430.2 L 159.1,426.2 L 153.7,420.3 L 150.2,414.4 L 147.8,407.0 L 147.8,397.1 L 149.2,391.6 L 151.7,387.2 L 155.7,383.2 L 162.1,380.3 L 168.0,380.3 L 173.0,382.7 L 173.5,384.2 L 166.5,384.2 L 161.6,388.2 L 160.1,391.6 L 160.1,396.6 L 161.1,399.6 L 164.1,403.0 L 168.5,405.0 L 175.9,405.0 L 185.3,401.0 L 190.8,397.1 L 202.1,385.7 L 213.0,376.8 L 226.8,370.9 Z"
        fill={`url(#gold-stache-${uid})`}
        stroke="#FDE047"
        strokeWidth="2.5"
      />

      <style>{`
        @keyframes metronome-daddy-swing-${uid} {
          0%, 100% { transform: rotate(24deg); }
          50% { transform: rotate(-24deg); }
        }
      `}</style>
    </svg>
  );
};
