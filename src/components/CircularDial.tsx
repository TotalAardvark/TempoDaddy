import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { MetronomeTickEvent } from '../audio/metronomeEngine';
import { MIN_BPM, MAX_BPM } from '../types';

interface CircularDialProps {
  bpm: number;
  minBpm?: number;
  maxBpm?: number;
  onBpmChange: (newBpm: number | ((prev: number) => number)) => void;
  lastTick: MetronomeTickEvent | null;
  isPlaying: boolean;
  isRampActive?: boolean;
  onOpenTempoRamp?: () => void;
}

export const CircularDial: React.FC<CircularDialProps> = ({
  bpm,
  minBpm = MIN_BPM,
  maxBpm = MAX_BPM,
  onBpmChange,
  lastTick,
  isPlaying,
  isRampActive = false,
  onOpenTempoRamp,
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTracking = useRef<{
    lastAngle: number;
    accumulatedAngle: number;
    currentBpm: number;
  } | null>(null);

  // Normalize BPM to an angle between -135deg and +135deg (270 degree arc)
  const bpmRatio = (bpm - minBpm) / (maxBpm - minBpm);

  const handleBpmStep = (delta: number) => {
    onBpmChange((prev) => Math.max(minBpm, Math.min(maxBpm, prev + delta)));
  };

  // Calculate angle from center of dial to point (x, y)
  // Top is 0°, clockwise is positive (0° to 360°)
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
    dragTracking.current = {
      lastAngle: initialAngle,
      accumulatedAngle: 0,
      currentBpm: bpm,
    };
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragTracking.current) return;

      const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
      let deltaAngle = currentAngle - dragTracking.current.lastAngle;

      // Handle wrap-around across 0° / 360° boundary
      if (deltaAngle > 180) deltaAngle -= 360;
      else if (deltaAngle < -180) deltaAngle += 360;

      dragTracking.current.lastAngle = currentAngle;
      dragTracking.current.accumulatedAngle += deltaAngle;

      // 4 degrees of circular swipe = 1 BPM (90 BPM per full 360° rotation)
      const DEGREES_PER_BPM = 4;
      const bpmDelta = Math.trunc(dragTracking.current.accumulatedAngle / DEGREES_PER_BPM);

      if (bpmDelta !== 0) {
        dragTracking.current.accumulatedAngle -= bpmDelta * DEGREES_PER_BPM;
        dragTracking.current.currentBpm = Math.max(
          minBpm,
          Math.min(maxBpm, dragTracking.current.currentBpm + bpmDelta)
        );
        const nextBpm = dragTracking.current.currentBpm;
        onBpmChange(nextBpm);
      }
    },
    [isDragging, maxBpm, minBpm, onBpmChange]
  );

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      dialRef.current?.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      dragTracking.current = null;
    }
  };

  // Wheel listener for mouse wheel fine-tuning
  useEffect(() => {
    const el = dialRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      onBpmChange((prev) => Math.max(minBpm, Math.min(maxBpm, prev + delta)));
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

          {/* Outlined Tempo Ramp Button - glows amber when active */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenTempoRamp?.();
            }}
            className={`mt-1 px-2.5 py-0.5 text-[9px] uppercase font-mono font-semibold tracking-wider rounded-full transition active:scale-95 cursor-pointer ${
              isRampActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400 shadow-md shadow-amber-500/40 ring-1 ring-amber-400/50 animate-pulse'
                : 'text-neutral-500 hover:text-neutral-300 border border-neutral-700/80 hover:border-neutral-500 bg-neutral-900/60'
            }`}
            title={isRampActive ? 'Tempo Ramp Active - Tap to Configure' : 'Configure Automatic Tempo Ramp'}
          >
            Tempo Ramp
          </button>
        </div>

        {/* Left Side Controls: -1 and -3 Buttons */}
        <div className="absolute left-0 -translate-x-5 sm:-translate-x-6 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleBpmStep(-1)}
            aria-label="Decrease BPM by 1"
            title="Decrease by 1 BPM"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-neutral-800/95 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 touch-manipulation cursor-pointer"
          >
            <Minus className="w-7 h-7 sm:w-8 sm:h-8 text-neutral-200 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => handleBpmStep(-3)}
            aria-label="Decrease BPM by 3"
            title="Decrease by 3 BPM"
            className="w-14 h-10 sm:w-16 sm:h-12 rounded-2xl bg-neutral-800/90 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700/80 text-neutral-300 hover:text-white flex items-center justify-center text-base sm:text-lg font-mono font-black shadow-lg transition-transform active:scale-95 touch-manipulation cursor-pointer"
          >
            -3
          </button>
        </div>

        {/* Right Side Controls: +1 and +3 Buttons */}
        <div className="absolute right-0 translate-x-5 sm:translate-x-6 flex flex-col items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleBpmStep(1)}
            aria-label="Increase BPM by 1"
            title="Increase by 1 BPM"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-neutral-800/95 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 touch-manipulation cursor-pointer"
          >
            <Plus className="w-7 h-7 sm:w-8 sm:h-8 text-neutral-200 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => handleBpmStep(3)}
            aria-label="Increase BPM by 3"
            title="Increase by 3 BPM"
            className="w-14 h-10 sm:w-16 sm:h-12 rounded-2xl bg-neutral-800/90 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700/80 text-neutral-300 hover:text-white flex items-center justify-center text-base sm:text-lg font-mono font-black shadow-lg transition-transform active:scale-95 touch-manipulation cursor-pointer"
          >
            +3
          </button>
        </div>
      </div>
    </div>
  );
};
