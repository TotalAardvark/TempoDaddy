import React, { useState, useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, TrendingUp, Calendar, Clock, Sparkles } from 'lucide-react';
import type { PracticeSessionLog } from '../types';
import { StickingDisplay } from './StickingDisplay';

interface LifetimeProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: PracticeSessionLog[];
  personalBestBpm: number;
  startingBpm?: number;
  skillTitle?: string;
  sticking?: string;
}

export const LifetimeProgressionModal: React.FC<LifetimeProgressionModalProps> = ({
  isOpen,
  onClose,
  history,
  personalBestBpm,
  startingBpm,
  skillTitle = 'Exercise Progression',
  sticking,
}) => {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showSessionList, setShowSessionList] = useState<boolean>(false);

  // Close on Escape key without affecting underlying screen state
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      } else if (e.code === 'Space' || e.key === 'Enter') {
        // Prevent background actions (e.g. metronome toggle or routine advance) while modal is open
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  // Compute lifetime metrics and chart coordinates
  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      const baseTempo = startingBpm || personalBestBpm || 80;
      return {
        points: [],
        minBpm: baseTempo - 10,
        maxBpm: baseTempo + 10,
        gain: 0,
        firstBpm: baseTempo,
        latestBpm: baseTempo,
        peakBpm: personalBestBpm || baseTempo,
        totalPracticeSeconds: 0,
        yTicks: [baseTempo - 10, baseTempo, baseTempo + 10],
      };
    }

    const bpms = history.map((h) => h.bpm);
    const firstBpm = bpms[0];
    const latestBpm = bpms[bpms.length - 1];
    const peakBpm = Math.max(...bpms, personalBestBpm || 0);
    const minVal = Math.min(...bpms, startingBpm || bpms[0]);
    const maxVal = Math.max(...bpms, peakBpm);

    const gain = latestBpm - firstBpm;
    const totalPracticeSeconds = history.reduce((acc, h) => acc + (h.durationSeconds || 0), 0);

    // Provide comfortable padding for Y axis
    const bpmRange = maxVal - minVal;
    const yPad = bpmRange < 15 ? 10 : Math.ceil(bpmRange * 0.12);
    const yMin = Math.max(30, Math.floor((minVal - yPad) / 5) * 5);
    const yMax = Math.ceil((maxVal + yPad) / 5) * 5;

    // Generate 4-5 nice round Y-axis ticks
    const tickCount = 4;
    const step = (yMax - yMin) / tickCount;
    const yTicks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      yTicks.push(Math.round(yMin + i * step));
    }

    return {
      points: history,
      minBpm: yMin,
      maxBpm: yMax,
      gain,
      firstBpm,
      latestBpm,
      peakBpm,
      totalPracticeSeconds,
      yTicks,
    };
  }, [history, personalBestBpm, startingBpm]);

  if (!isOpen) return null;

  // Chart layout dimensions
  const svgWidth = 600;
  const svgHeight = 250;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;

  const chartInnerWidth = svgWidth - padLeft - padRight;
  const chartInnerHeight = svgHeight - padTop - padBottom;
  const bpmRangeTotal = Math.max(1, chartData.maxBpm - chartData.minBpm);

  // Map data points to SVG coordinates
  const coords = chartData.points.map((session, index) => {
    const x =
      chartData.points.length <= 1
        ? padLeft + chartInnerWidth / 2
        : padLeft + (index / (chartData.points.length - 1)) * chartInnerWidth;
    const y =
      padTop +
      chartInnerHeight -
      ((session.bpm - chartData.minBpm) / bpmRangeTotal) * chartInnerHeight;
    return { x, y, session, index };
  });

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPoints =
    coords.length > 0
      ? `${polylinePoints} ${coords[coords.length - 1].x.toFixed(1)},${padTop + chartInnerHeight} ${coords[0].x.toFixed(1)},${padTop + chartInnerHeight}`
      : '';

  // Calculate nicely spaced X-axis date labels
  const xLabels: { x: number; label: string }[] = [];
  if (coords.length === 1) {
    const d = new Date(coords[0].session.date);
    xLabels.push({
      x: coords[0].x,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    });
  } else if (coords.length > 1) {
    const targetCount = Math.min(5, coords.length);
    const step = (coords.length - 1) / (targetCount - 1);
    const addedIndices = new Set<number>();

    for (let i = 0; i < targetCount; i++) {
      const idx = Math.round(i * step);
      if (!addedIndices.has(idx) && coords[idx]) {
        addedIndices.add(idx);
        const d = new Date(coords[idx].session.date);
        xLabels.push({
          x: coords[idx].x,
          label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        });
      }
    }
  }

  const formatDuration = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '0m';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const activePoint = hoveredIndex !== null ? coords[hoveredIndex] : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-800/80 pb-3.5">
          <div className="flex flex-col gap-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                <Sparkles className="w-3 h-3" />
                Lifetime Progression
              </span>
              {sticking && (
                <StickingDisplay sticking={sticking} className="py-0.5 px-2 text-[11px]" />
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
              {skillTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* High Score */}
          <div className="bg-neutral-950/60 border border-neutral-800/90 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              High Score
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-white">
                {chartData.peakBpm}
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-400">BPM</span>
            </div>
          </div>

          {/* First / Starting */}
          <div className="bg-neutral-950/60 border border-neutral-800/90 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-neutral-500" />
              First Logged
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono text-neutral-200">
                {chartData.points.length > 0 ? chartData.firstBpm : startingBpm || '—'}
              </span>
              <span className="text-[10px] font-mono font-bold text-neutral-500">BPM</span>
            </div>
          </div>

          {/* Net Lifetime Gain */}
          <div className="bg-neutral-950/60 border border-neutral-800/90 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Net Gain
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-2xl font-black font-mono ${
                  chartData.gain > 0
                    ? 'text-emerald-400'
                    : chartData.gain < 0
                    ? 'text-rose-400'
                    : 'text-neutral-400'
                }`}
              >
                {chartData.gain > 0 ? `+${chartData.gain}` : chartData.gain}
              </span>
              <span className="text-[10px] font-mono font-bold text-neutral-500">BPM</span>
            </div>
          </div>

          {/* Sessions & Time */}
          <div className="bg-neutral-950/60 border border-neutral-800/90 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              Total Logged
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black font-mono text-cyan-400">
                {chartData.points.length}
              </span>
              <span className="text-[10px] font-mono text-neutral-500">
                ({formatDuration(chartData.totalPracticeSeconds)})
              </span>
            </div>
          </div>
        </div>

        {/* Full-Scale SVG Progression Chart */}
        <div className="relative bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-2.5 sm:p-3 overflow-hidden flex flex-col">
          {chartData.points.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center text-neutral-500">
              <Trophy className="w-8 h-8 text-neutral-600 mb-2 stroke-1" />
              <p className="text-sm font-medium text-neutral-400">No sessions recorded yet</p>
              <p className="text-xs text-neutral-600 mt-1">
                Complete your first practice session to begin tracing your lifetime speed progression!
              </p>
            </div>
          ) : (
            <>
              {/* Interactive Hover Tooltip */}
              {activePoint && (
                <div
                  className="absolute z-20 pointer-events-none bg-neutral-900/95 border border-cyan-500/40 rounded-xl px-2.5 py-1.5 shadow-xl shadow-black/60 text-xs font-mono transform -translate-x-1/2 -translate-y-full transition-all duration-75"
                  style={{
                    left: `${(activePoint.x / svgWidth) * 100}%`,
                    top: `${(activePoint.y / svgHeight) * 100 - 4}%`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-black text-cyan-300 text-sm">
                      {activePoint.session.bpm} BPM
                    </span>
                    {activePoint.session.isPersonalBest && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                        HIGH SCORE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span>Session #{activePoint.index + 1}</span>
                    <span>•</span>
                    <span>
                      {new Date(activePoint.session.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )}

              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto max-h-[260px] overflow-visible select-none"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {chartData.yTicks.map((tickVal) => {
                  const y =
                    padTop +
                    chartInnerHeight -
                    ((tickVal - chartData.minBpm) / bpmRangeTotal) * chartInnerHeight;
                  return (
                    <g key={tickVal}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="#262626"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[10px] font-mono fill-neutral-500 select-none font-medium"
                      >
                        {tickVal}
                      </text>
                    </g>
                  );
                })}

                {/* Y-Axis Label */}
                <text
                  x={14}
                  y={padTop - 6}
                  textAnchor="start"
                  className="text-[9px] font-mono font-bold uppercase fill-neutral-500 tracking-wider"
                >
                  BPM
                </text>

                {/* X-Axis Horizontal Base Line */}
                <line
                  x1={padLeft}
                  y1={padTop + chartInnerHeight}
                  x2={svgWidth - padRight}
                  y2={padTop + chartInnerHeight}
                  stroke="#404040"
                  strokeWidth="1"
                />

                {/* X-Axis Date Ticks & Labels */}
                {xLabels.map((item, idx) => (
                  <g key={idx}>
                    <line
                      x1={item.x}
                      y1={padTop + chartInnerHeight}
                      x2={item.x}
                      y2={padTop + chartInnerHeight + 5}
                      stroke="#525252"
                      strokeWidth="1"
                    />
                    <text
                      x={item.x}
                      y={padTop + chartInnerHeight + 17}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-neutral-400 select-none"
                    >
                      {item.label}
                    </text>
                  </g>
                ))}

                {/* Gradient area fill */}
                {areaPoints && <polygon fill={`url(#${gradientId})`} points={areaPoints} />}

                {/* Polyline connecting all points */}
                {polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(6, 182, 212, 0.4))' }}
                  />
                )}

                {/* Active crosshair vertical line on hover */}
                {activePoint && (
                  <line
                    x1={activePoint.x}
                    y1={padTop}
                    x2={activePoint.x}
                    y2={padTop + chartInnerHeight}
                    stroke="#22d3ee"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                    strokeOpacity="0.75"
                  />
                )}

                {/* Data points */}
                {coords.map((c) => {
                  const isHovered = hoveredIndex === c.index;
                  const isPb = c.session.isPersonalBest;

                  return (
                    <g
                      key={c.session.id || c.index}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(c.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Invisible larger hover target for easy touch/mouse hovering */}
                      <circle cx={c.x} cy={c.y} r="14" fill="transparent" />

                      {/* PB Glowing Halo */}
                      {isPb && (
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={isHovered ? '9' : '7'}
                          fill="#f59e0b"
                          fillOpacity="0.3"
                          className="transition-all duration-150"
                        />
                      )}

                      {/* Main Node */}
                      <circle
                        cx={c.x}
                        cy={c.y}
                        r={isHovered ? '5.5' : isPb ? '4.5' : '3.5'}
                        fill={isPb ? '#fbbf24' : '#22d3ee'}
                        stroke={isPb ? '#78350f' : '#083344'}
                        strokeWidth="1.5"
                        className="transition-all duration-150"
                      />
                    </g>
                  );
                })}
              </svg>
            </>
          )}
        </div>

        {/* Toggleable Detailed Session History Table */}
        {chartData.points.length > 0 && (
          <div className="flex flex-col gap-2 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSessionList((prev) => !prev)}
              className="text-xs font-mono text-neutral-400 hover:text-cyan-400 transition flex items-center justify-between px-1 py-1"
            >
              <span>{showSessionList ? 'Hide Session History' : 'View All Logged Sessions'}</span>
              <span className="text-[11px] text-neutral-500">
                {showSessionList ? '▲' : '▼'} {chartData.points.length} entries
              </span>
            </button>

            {showSessionList && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950/70 p-2 divide-y divide-neutral-800/60 font-mono text-xs">
                {[...chartData.points].reverse().map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className="py-1.5 px-2 flex items-center justify-between hover:bg-neutral-800/40 rounded transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500 text-[10px]">
                        #{chartData.points.length - idx}
                      </span>
                      <span className="text-neutral-300">
                        {new Date(s.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {s.durationSeconds ? (
                        <span className="text-[10px] text-neutral-500">
                          ({formatDuration(s.durationSeconds)})
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{s.bpm} BPM</span>
                      {s.isPersonalBest && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                          HIGH SCORE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
