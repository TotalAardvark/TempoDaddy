import React, { useEffect, useRef, useMemo } from 'react';
import { Flame, X } from 'lucide-react';

interface StreakCalendarTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  practicedDates: string[];
}

export const StreakCalendarTooltip: React.FC<StreakCalendarTooltipProps> = ({
  isOpen,
  onClose,
  streak,
  practicedDates,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

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
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  // Compute 4 weeks of days (3 weeks into past + current week = 28 days)
  const daysGrid = useMemo(() => {
    const set = new Set(practicedDates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sunday as start of week (0: Sun, ..., 6: Sat)
    const dayOfWeek = today.getDay();
    const currentWeekSun = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);
    // 3 weeks into the past
    const startSun = new Date(currentWeekSun.getFullYear(), currentWeekSun.getMonth(), currentWeekSun.getDate() - 21);

    const formatYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const todayStr = formatYmd(today);
    const grid: {
      dateNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isPracticed: boolean;
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < 28; i++) {
      const d = new Date(startSun.getFullYear(), startSun.getMonth(), startSun.getDate() + i);
      const dateStr = formatYmd(d);
      grid.push({
        dateNumber: d.getDate(),
        dateStr,
        isCurrentMonth: d.getMonth() === today.getMonth(),
        isPracticed: set.has(dateStr),
        isToday: dateStr === todayStr,
      });
    }

    return grid;
  }, [practicedDates]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-full mt-2 right-0 z-50 w-60 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            {streak > 0 ? `${streak}-Day Streak` : 'Daily Streak'}
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

      {/* Weekday indicators */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[9px] font-mono font-medium text-neutral-600">
        <span>S</span>
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
      </div>

      {/* Minimalist Numbers-Only 4-Week Grid (28 days) */}
      <div className="grid grid-cols-7 gap-1.5 text-center font-mono">
        {daysGrid.map((day) => {
          return (
            <div
              key={day.dateStr}
              title={`${day.dateStr}${day.isPracticed ? ' (Practiced)' : ''}`}
              className={`h-6.5 w-6.5 mx-auto flex items-center justify-center rounded-lg text-xs transition-colors ${
                day.isPracticed
                  ? 'bg-amber-500 text-neutral-950 font-black shadow-sm shadow-amber-500/30'
                  : day.isToday
                  ? 'border border-amber-500/50 text-white font-bold bg-neutral-800/60'
                  : day.isCurrentMonth
                  ? 'text-neutral-300 hover:bg-neutral-800/50'
                  : 'text-neutral-600 hover:bg-neutral-800/30'
              }`}
            >
              {day.dateNumber}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-500">
        <span>Past 4 weeks</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />
          <span>Practiced</span>
        </div>
      </div>
    </div>
  );
};
