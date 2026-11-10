import React, { useEffect, useRef, useState } from 'react';
import { MIN_BPM, MAX_BPM } from '../types';

interface HorizontalThumbDialProps {
  bpm: number;
  onChange: (newBpm: number | ((prev: number) => number)) => void;
}

/**
 * Skeuomorphic machined horizontal thumbwheel for adjusting BPM.
 * Isolates all pointer/touch events so horizontal thumb-rolling never triggers
 * parent carousel swipes.
 */
export const HorizontalThumbDial: React.FC<HorizontalThumbDialProps> = ({ bpm, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startBpm: number;
  }>({
    active: false,
    startX: 0,
    startBpm: bpm,
  });

  const clampBpm = (val: number) => Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(val)));

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowPointerUp = () => {
      if (!dragStateRef.current.active) return;
      dragStateRef.current.active = false;
      setIsDragging(false);
    };

    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore in synthetic test environments where pointerId is not active
      }
    }
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startBpm: bpm,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!dragStateRef.current.active) return;
    const deltaX = e.clientX - dragStateRef.current.startX;
    // 4px of horizontal thumb roll = 1 BPM
    const bpmDelta = Math.round(deltaX / 4);
    const nextBpm = clampBpm(dragStateRef.current.startBpm + bpmDelta);
    onChange(nextBpm);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rawDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : -e.deltaY;
    if (rawDelta === 0) return;
    const step = rawDelta > 0 ? 1 : -1;
    onChange((prev) => clampBpm(prev + step));
  };

  // Visual ridge phase shift based on current BPM so the knurling visibly rolls
  const ridgeOffsetPx = ((bpm * 6) % 24 + 24) % 24;

  return (
    <div
      className="flex flex-col items-center select-none touch-none py-2 -my-2"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Recessed Bezel Slot Housing (1/3rd height: h-4, 1/2 width: w-28 sm:w-32) */}
      <div
        data-testid="horizontal-thumb-dial"
        role="slider"
        aria-label="Horizontal Tempo Thumbdial"
        aria-valuemin={MIN_BPM}
        aria-valuemax={MAX_BPM}
        aria-valuenow={bpm}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onWheel={handleWheel}
        className={`relative w-28 sm:w-32 h-4 rounded-full p-0.5 bg-neutral-950 border transition-shadow cursor-ew-resize ${
          isDragging
            ? 'border-amber-400/70 shadow-[0_0_16px_rgba(251,191,36,0.32),inset_0_1px_4px_rgba(0,0,0,0.95)]'
            : 'border-neutral-800/90 hover:border-neutral-700 shadow-[0_4px_12px_rgba(0,0,0,0.7),inset_0_1px_4px_rgba(0,0,0,0.95)]'
        }`}
      >
        {/* Top Center Amber Index Triangle */}
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4.5px] border-t-amber-400 z-20 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)] pointer-events-none"
          aria-hidden="true"
        />

        {/* Cylindrical Knurled Wheel */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
          style={{
            background:
              'linear-gradient(90deg, #07080a 0%, #1c2029 18%, #343b4a 42%, #4a5368 50%, #343b4a 58%, #1c2029 82%, #07080a 100%)',
            boxShadow:
              'inset 0 1px 2px rgba(255,255,255,0.18), inset 0 -1px 3px rgba(0,0,0,0.85)',
          }}
        >
          {/* Rolling Knurled Ridges */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1.5px, rgba(0,0,0,0.68) 1.5px, rgba(0,0,0,0.68) 4px, transparent 4px, transparent 8px)',
              backgroundPositionX: `${ridgeOffsetPx}px`,
            }}
          />

          {/* Major Gold Accent Tick Marks that roll across the wheel */}
          <div
            className="absolute inset-y-0.5 inset-x-0 pointer-events-none opacity-70"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(251,191,36,0.8) 0px, rgba(251,191,36,0.8) 1.5px, transparent 1.5px, transparent 16px)',
              backgroundPositionX: `${ridgeOffsetPx}px`,
            }}
          />

          {/* Cylindrical Edge Vignette Overlay (gives 3D barrel curvature) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(5,5,7,0.92) 0%, rgba(5,5,7,0.35) 20%, transparent 40%, transparent 60%, rgba(5,5,7,0.35) 80%, rgba(5,5,7,0.92) 100%)',
            }}
          />

          {/* Subtle Center Hairline Glow */}
          <div className="w-[1.5px] h-full bg-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.8)] z-10 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
