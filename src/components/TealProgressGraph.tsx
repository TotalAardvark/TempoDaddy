import React, { useState, useId } from 'react';
import { Maximize2 } from 'lucide-react';
import type { PracticeSessionLog } from '../types';
import { LifetimeProgressionModal } from './LifetimeProgressionModal';

interface TealProgressGraphProps {
  history: PracticeSessionLog[];
  personalBestBpm: number;
  startingBpm?: number;
  currentBpm?: number;
  width?: number;
  height?: number;
  showLabels?: boolean;
  skillTitle?: string;
  sticking?: string;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const TealProgressGraph: React.FC<TealProgressGraphProps> = ({
  history,
  personalBestBpm,
  startingBpm,
  width = 135,
  height = 40,
  showLabels = false,
  skillTitle,
  sticking,
  interactive = true,
  onClick,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const gradientId = useId();

  const paddingX = 6;
  const paddingY = 6;

  // Build the data array of numeric BPM points (last 8 logged sessions)
  const recentLogs = history.slice(-8);
  const hasMultiplePoints = recentLogs.length >= 2;

  let dataPoints: number[] = [];
  if (hasMultiplePoints) {
    dataPoints = recentLogs.map((l) => l.bpm);
  } else if (recentLogs.length === 1) {
    // 1 logged point: flat line across the chart at the recorded BPM
    dataPoints = [recentLogs[0].bpm, recentLogs[0].bpm];
  } else {
    // 0 sessions logged: flat baseline at starting/practice tempo
    const baseTempo = startingBpm || personalBestBpm || 80;
    dataPoints = [baseTempo, baseTempo];
  }

  const minBpm = Math.min(...dataPoints);
  const maxBpm = Math.max(...dataPoints, personalBestBpm || dataPoints[0]);
  const range = maxBpm - minBpm || 10;

  // Calculate coordinates
  const coords = dataPoints.map((val, idx) => {
    const x = paddingX + (idx / Math.max(1, dataPoints.length - 1)) * (width - 2 * paddingX);
    const y = hasMultiplePoints
      ? height - paddingY - ((val - minBpm) / range) * (height - 2 * paddingY)
      : height - paddingY; // flat along the bottom
    return { x, y, val };
  });

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  // Closed polygon for the gradient area under the curve
  const areaPoints = `${polylinePoints} ${coords[coords.length - 1].x.toFixed(1)},${height} ${coords[0].x.toFixed(1)},${height}`;

  const latestCoord = coords[coords.length - 1];

  // Calculate lifetime net gain when there are at least 2 sessions:
  // Personal Best BPM minus the initial session's BPM.
  const netGain =
    history.length >= 2
      ? personalBestBpm - history[0].bpm
      : null;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (interactive) {
      e.stopPropagation();
      setIsModalOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div
        className={`flex flex-col items-end ${
          interactive
            ? 'group cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-lg'
            : ''
        }`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        title={interactive ? 'Click to view lifetime progression chart' : undefined}
        aria-label={interactive ? 'View lifetime progression chart' : undefined}
      >
        {/* Graph with right-side Y-axis labels */}
        <div className="flex items-center gap-1.5 relative">
          <div className="relative">
            <svg
              width={width}
              height={height}
              className="overflow-visible transition-transform duration-150 group-hover:scale-[1.02]"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(6, 182, 212, 0.25))' }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background area fill */}
              <polygon fill={`url(#${gradientId})`} points={areaPoints} />

              {/* Dotted target baseline if only 0/1 session */}
              {recentLogs.length < 2 && (
                <line
                  x1={paddingX}
                  y1={paddingY}
                  x2={width - paddingX}
                  y2={paddingY}
                  stroke="#0891b2"
                  strokeWidth="1"
                  strokeDasharray="2,3"
                  strokeOpacity="0.4"
                />
              )}

              {/* Main glowing teal polyline */}
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {/* Intermediate data points */}
              {coords.map((c, i) => {
                if (i === coords.length - 1) return null;
                return (
                  <circle
                    key={i}
                    cx={c.x}
                    cy={c.y}
                    r="2"
                    fill="#06b6d4"
                    className="opacity-75"
                  />
                );
              })}

              {/* Latest Point: Glowing Teal Node */}
              <circle
                cx={latestCoord.x}
                cy={latestCoord.y}
                r="6"
                fill="#06b6d4"
                fillOpacity="0.25"
              />
              <circle
                cx={latestCoord.x}
                cy={latestCoord.y}
                r="3.5"
                fill="#22d3ee"
                stroke="#0e7490"
                strokeWidth="1.5"
              />
            </svg>

            {/* Expand cue icon to clearly indicate clickable/expandable */}
            {interactive && (
              <div className="absolute -top-1 -right-1 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition bg-neutral-900/90 rounded-md p-0.5 border border-cyan-500/50 shadow-sm shadow-cyan-500/20 pointer-events-none">
                <Maximize2 className="w-2.5 h-2.5 text-cyan-300" />
              </div>
            )}
          </div>

          {/* Small inobtrusive Y-axis labels in grey on the rightmost side */}
          <div
            className="flex flex-col justify-between text-[9px] font-mono text-neutral-500 leading-none select-none pl-0.5 border-l border-neutral-800/80"
            style={{ height: `${height - 4}px` }}
          >
            <span className="text-right text-neutral-400 font-semibold" title="Peak / High Score BPM">
              {hasMultiplePoints ? maxBpm : '—'}
            </span>
            <span className="text-right text-neutral-600" title="Warmup / Base BPM">
              {hasMultiplePoints ? minBpm : '—'}
            </span>
          </div>
        </div>

        {showLabels && (
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-cyan-400/80 group-hover:text-cyan-300 transition-colors">
            {history.length >= 2 ? (
              <>
                {netGain !== null && netGain !== 0 && (
                  <span className={netGain > 0 ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                    {netGain > 0 ? `+${netGain}` : netGain} BPM
                  </span>
                )}
                <span>({history.length} logged)</span>
              </>
            ) : history.length === 1 ? (
              <span>1 session logged</span>
            ) : (
              <span>No sessions yet</span>
            )}
            {interactive && (
              <Maximize2 className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity ml-0.5" />
            )}
          </div>
        )}
      </div>

      {/* Full-Scale Lifetime Progression Chart Modal */}
      {interactive && isModalOpen && (
        <LifetimeProgressionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          history={history}
          personalBestBpm={personalBestBpm}
          startingBpm={startingBpm}
          skillTitle={skillTitle}
          sticking={sticking}
        />
      )}
    </>
  );
};
