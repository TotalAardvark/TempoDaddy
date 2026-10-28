import React, { useEffect, useRef } from 'react';
import { X, Trophy } from 'lucide-react';
import type { PbDisplayRange } from '../types';

interface PersonalBestsTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: {
    thisWeek: number;
    thisMonth: number;
    allTime: number;
    sinceReset: number;
    resetDate: string | null;
  };
  displayRange: PbDisplayRange;
  onDisplayRangeChange: (range: PbDisplayRange) => void;
}

export const PersonalBestsTooltip: React.FC<PersonalBestsTooltipProps> = ({
  isOpen,
  onClose,
  stats,
  displayRange,
  onDisplayRangeChange,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentStats = stats ?? {
    thisWeek: 0,
    thisMonth: 0,
    allTime: 0,
    sinceReset: 0,
    resetDate: null,
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Slight delay to prevent immediate closing from trigger click
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-full mt-2 right-0 z-50 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 fill-cyan-400 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]" strokeWidth={2.25} />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            Personal Bests
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stats List */}
      <div className="flex flex-col gap-2 font-mono text-xs">
        <div
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition ${
            displayRange === 'thisWeek'
              ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300'
              : 'bg-neutral-950/50 text-neutral-400'
          }`}
        >
          <span>This Week:</span>
          <span className="font-bold text-cyan-300 text-sm">{currentStats.thisWeek}</span>
        </div>
        <div
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition ${
            displayRange === 'thisMonth'
              ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300'
              : 'bg-neutral-950/50 text-neutral-400'
          }`}
        >
          <span>This Month:</span>
          <span className="font-bold text-cyan-300 text-sm">{currentStats.thisMonth}</span>
        </div>
        <div
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition ${
            displayRange === 'allTime'
              ? 'bg-amber-950/50 border border-amber-500/40 text-amber-300'
              : 'bg-neutral-950/50 text-neutral-400'
          }`}
        >
          <span>All Time:</span>
          <span className="font-bold text-amber-400 text-sm">{currentStats.allTime}</span>
        </div>
      </div>

      {/* Show: Dropdown selector */}
      <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between">
        <label htmlFor="pb-range-select" className="text-xs text-neutral-400 font-medium">
          Show:
        </label>
        <select
          id="pb-range-select"
          value={displayRange}
          onChange={(e) => onDisplayRangeChange(e.target.value as PbDisplayRange)}
          className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg px-2 py-1.5 border border-neutral-700 focus:outline-none focus:border-cyan-400 cursor-pointer"
        >
          <option value="thisWeek">This Week</option>
          <option value="thisMonth">This Month</option>
          <option value="allTime">All Time</option>
        </select>
      </div>
    </div>
  );
};
