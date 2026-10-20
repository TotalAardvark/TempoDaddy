import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { MetronomeTickEvent } from '../audio/metronomeEngine';

interface CircularDialProps {
  bpm: number;
  minBpm?: number;
  maxBpm?: number;
  onBpmChange: (newBpm: number) => void;
  lastTick: MetronomeTickEvent | null;
  isPlaying: boolean;
  onOpenTempoRamp?: () => void;
}

export const CircularDial: React.FC<CircularDialProps> = ({
  bpm,
  minBpm = 40,
  maxBpm = 260,
  onBpmChange,
  lastTick,
  isPlaying,
  onOpenTempoRamp,
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startDragInfo = useRef<{ startY: number; startBpm: number; startAngle: number } | null>(null);

  // Normalize BPM to an angle between -135deg and +135deg (270 degree arc)
  const bpmRatio = (bpm - minBpm) / (maxBpm - minBpm);

  const handleBpmStep = (delta: number) => {
    const nextBpm = Math.max(minBpm, Math.min(maxBpm, bpm + delta));
    onBpmChange(nextBpm);
  };

  // Calculate angle from center of dial to point (x, y)
  const getAngleFromCenter = (clientX: number, clientY: number): number => {
    if (!dialRef.current) return 0;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    // Angle in degrees (-180 to 180, 0 is right, 90 is down)
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    // Convert so top is 0, clockwise positive
    deg = (deg + 90) % 360;
    if (deg < 0) deg += 360;
    return deg;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dialRef.current?.setPointerCapture(e.pointerId);
    setIsDragging(true);

    const initialAngle = getAngleFromCenter(e.clientX, e.clientY);
    startDragInfo.current = {
      startY: e.clientY,
      startBpm: bpm,
      startAngle: initialAngle,
    };
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !startDragInfo.current) return;

      // Vertical drag delta allows rapid scrub
      const deltaY = startDragInfo.current.startY - e.clientY;
      const bpmDelta = Math.round(deltaY / 2.5); // scrub sensitivity

      let targetBpm = startDragInfo.current.startBpm + bpmDelta;
      targetBpm = Math.max(minBpm, Math.min(maxBpm, targetBpm));

      onBpmChange(targetBpm);
    },
    [isDragging, maxBpm, minBpm, onBpmChange]
  );

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      dialRef.current?.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      startDragInfo.current = null;
    }
  };

  // Wheel listener for mouse wheel fine-tuning
  useEffect(() => {
    const el = dialRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      onBpmChange(Math.max(minBpm, Math.min(maxBpm, bpm + delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [bpm, maxBpm, minBpm, onBpmChange]);

  // Tick visual styling
  const isAccent = lastTick?.isDownbeat && isPlaying;
  const isBeat = lastTick?.isQuarterBeat && !lastTick?.isDownbeat && isPlaying;
  const isSub = !lastTick?.isQuarterBeat && isPlaying;

  // Arc path constants
  const size = 260;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 270 deg is 75% of circumference
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - bpmRatio * arcLength;

  return (
    <div className="flex flex-col items-center select-none touch-none">
      {/* Metronome Dial Container */}
      <div
        ref={dialRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-72 h-72 flex items-center justify-center rounded-full cursor-grab active:cursor-grabbing transition-all ${
          isDragging ? 'scale-102 shadow-2xl shadow-amber-500/10' : ''
        }`}
      >
        {/* Glow backdrop on downbeat accent */}
        <div
          className={`absolute inset-4 rounded-full transition-opacity duration-100 pointer-events-none ${
            isAccent
              ? 'opacity-100 bg-amber-500/20 blur-xl'
              : isBeat
              ? 'opacity-40 bg-cyan-500/15 blur-lg'
              : 'opacity-0'
          }`}
        />

        {/* SVG Circular Track & Progress Arc */}
        <svg
          width={size}
          height={size}
          className="absolute -rotate-[135deg] pointer-events-none overflow-visible"
        >
          {/* Background Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            className="text-neutral-800"
          />

          {/* Active Colored Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#dialGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-75"
          />

          <defs>
            <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" /> {/* cyan-500 */}
              <stop offset="70%" stopColor="#f59e0b" /> {/* amber-500 */}
              <stop offset="100%" stopColor="#ef4444" /> {/* red-500 */}
            </linearGradient>
          </defs>
        </svg>

        {/* Inner Knob Wheel */}
        <div
          className={`w-52 h-52 rounded-full bg-neutral-900 border-2 flex flex-col items-center justify-center shadow-inner relative transition-colors ${
            isAccent
              ? 'border-amber-400 shadow-amber-500/30'
              : isBeat
              ? 'border-cyan-400/80 shadow-cyan-500/20'
              : 'border-neutral-700'
          }`}
        >
          {/* Sub visual pulse dots */}
          <div className="flex gap-1.5 mb-1.5 items-center">
            <span
              className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${
                isAccent
                  ? 'bg-amber-400 scale-135 shadow-sm shadow-amber-400'
                  : isBeat
                  ? 'bg-cyan-400 scale-110'
                  : isSub
                  ? 'bg-neutral-500 scale-90'
                  : 'bg-neutral-800'
              }`}
            />
          </div>

          {/* Main BPM Display without 'BPM' text */}
          <span className="text-5xl font-black tracking-tight text-white font-mono leading-none">
            {bpm}
          </span>

          {/* Moved 'swipe to adjust' up into BPM's place, slightly darker for less visual noise */}
          <span className="text-[10px] uppercase font-semibold tracking-wider text-neutral-600 mt-1 select-none pointer-events-none">
            Swipe to adjust
          </span>

          {/* Outlined Tempo Ramp Button */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenTempoRamp?.();
            }}
            className="mt-1 px-2.5 py-0.5 text-[9px] uppercase font-mono font-semibold tracking-wider text-neutral-500 hover:text-neutral-300 border border-neutral-700/80 hover:border-neutral-500 rounded-full transition active:scale-95 cursor-pointer bg-neutral-900/60"
            title="Configure Automatic Tempo Ramp"
          >
            Tempo Ramp
          </button>
        </div>

        {/* Left Side Controls: -1 and -5 Buttons */}
        <div className="absolute left-0 -translate-x-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => handleBpmStep(-1)}
            aria-label="Decrease BPM by 1"
            title="Decrease by 1 BPM"
            className="w-11 h-11 rounded-full bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
          >
            <Minus className="w-5 h-5 text-neutral-200" />
          </button>
          <button
            type="button"
            onClick={() => handleBpmStep(-3)}
            aria-label="Decrease BPM by 3"
            title="Decrease by 3 BPM"
            className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-800/90 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700/80 text-neutral-300 hover:text-white shadow transition-transform active:scale-90"
          >
            -3
          </button>
        </div>

        {/* Right Side Controls: +1 and +3 Buttons */}
        <div className="absolute right-0 translate-x-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => handleBpmStep(1)}
            aria-label="Increase BPM by 1"
            title="Increase by 1 BPM"
            className="w-11 h-11 rounded-full bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
          >
            <Plus className="w-5 h-5 text-neutral-200" />
          </button>
          <button
            type="button"
            onClick={() => handleBpmStep(3)}
            aria-label="Increase BPM by 3"
            title="Increase by 3 BPM"
            className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-neutral-800/90 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700/80 text-neutral-300 hover:text-white shadow transition-transform active:scale-90"
          >
            +3
          </button>
        </div>
      </div>
    </div>
  );
};
