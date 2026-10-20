import React from 'react';
import type { PracticeSessionLog } from '../types';

interface TealProgressGraphProps {
  history: PracticeSessionLog[];
  personalBestBpm: number;
  startingBpm?: number;
  currentBpm?: number;
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export const TealProgressGraph: React.FC<TealProgressGraphProps> = ({
  history,
  personalBestBpm,
  startingBpm,
  width = 135,
  height = 40,
  showLabels = false,
}) => {
  const paddingX = 6;
  const paddingY = 6;

  // Build the data array of numeric BPM points
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

  // Calculate coordinates: if 0 or 1 session logged, render a clean flat baseline at the bottom of the graph
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
  const firstCoord = coords[0];
  const bpmDelta = latestCoord.val - firstCoord.val;
  const uniqueId = `teal-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="flex flex-col items-end">
      {/* Graph with right-side Y-axis labels */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <svg
            width={width}
            height={height}
            className="overflow-visible"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(6, 182, 212, 0.25))' }}
          >
            <defs>
              <linearGradient id={uniqueId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background area fill */}
            <polygon fill={`url(#${uniqueId})`} points={areaPoints} />

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

            {/* Latest Point: Glowing Teal Node (clean stationary halo) */}
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
        </div>

        {/* Small inobtrusive Y-axis labels in grey on the rightmost side */}
        <div
          className="flex flex-col justify-between text-[9px] font-mono text-neutral-500 leading-none select-none pl-0.5 border-l border-neutral-800/80"
          style={{ height: `${height - 4}px` }}
        >
          <span className="text-right text-neutral-400 font-semibold" title="Peak / PB BPM">
            {hasMultiplePoints ? maxBpm : '—'}
          </span>
          <span className="text-right text-neutral-600" title="Warmup / Base BPM">
            {hasMultiplePoints ? minBpm : '—'}
          </span>
        </div>
      </div>

      {showLabels && (
        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-cyan-400/80">
          {recentLogs.length >= 2 ? (
            <>
              {bpmDelta !== 0 && (
                <span className={bpmDelta > 0 ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                  {bpmDelta > 0 ? `+${bpmDelta}` : bpmDelta} BPM
                </span>
              )}
              <span>({recentLogs.length} logged)</span>
            </>
          ) : recentLogs.length === 1 ? (
            <span>1 session logged</span>
          ) : (
            <span>No sessions yet</span>
          )}
        </div>
      )}
    </div>
  );
};
