import React, { useEffect, useState } from 'react';
import { Play, Flame, Music, ListMusic, Trophy } from 'lucide-react';
import type { Skill, PracticeSessionLog } from '../types';
import { TealProgressGraph } from './TealProgressGraph';
import { PersonalBestsTooltip } from './PersonalBestsTooltip';
import { StreakCalendarTooltip } from './StreakCalendarTooltip';

interface ColdStartScreenProps {
  firstSkill: Skill | null;
  history?: PracticeSessionLog[];
  streak: number;
  practicedDates?: string[];
  weeklyPbCount?: number;
  pbStats?: {
    thisWeek: number;
    thisMonth: number;
    allTime: number;
    sinceReset: number;
    resetDate: string | null;
  };
  isRandomOrder?: boolean;
  onToggleRandomOrder?: (random: boolean) => void;
  onResetPbCounter?: () => void;
  onStart: () => void;
  onOpenLibrary: () => void;
}

export const ColdStartScreen: React.FC<ColdStartScreenProps> = ({
  firstSkill,
  history = [],
  streak,
  practicedDates = [],
  weeklyPbCount = 0,
  pbStats,
  isRandomOrder = false,
  onToggleRandomOrder,
  onResetPbCounter,
  onStart,
  onOpenLibrary,
}) => {
  const [isPbTooltipOpen, setIsPbTooltipOpen] = useState(false);
  const [isStreakTooltipOpen, setIsStreakTooltipOpen] = useState(false);

  // Pressing ANY key on the keyboard starts the exercise immediately (excluding Escape & modifiers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is interacting with an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      // If a tooltip is open, handle closing it on Escape and do not start practice mode
      if (e.key === 'Escape') {
        if (isPbTooltipOpen) {
          setIsPbTooltipOpen(false);
        }
        if (isStreakTooltipOpen) {
          setIsStreakTooltipOpen(false);
        }
        return;
      }
      // Ignore bare modifier keys so users don't accidentally trigger when switching windows
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
        return;
      }
      e.preventDefault();
      onStart();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart, isPbTooltipOpen, isStreakTooltipOpen]);

  return (
    <div
      onClick={onStart}
      style={{ paddingTop: 'var(--app-header-padding-top)' }}
      className="h-[100dvh] max-h-[100dvh] overflow-hidden w-full flex flex-col justify-between items-center px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-b from-neutral-950 via-neutral-900 to-black text-white cursor-pointer select-none transition-colors"
    >
      {/* Top Header Navigation: matches practice screen styling */}
      <div className="w-full max-w-md flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-neutral-400">
          <Music className="w-4 h-4 text-amber-400" />
          <span>TEMPO DADDY</span>
        </div>

        {/* Right: Three badges (PBs, Streak, Skill Queue/Library) matching practice screen */}
        <div className="flex items-center gap-2">
          {/* Cyan Trophy Badge for Personal Bests */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setIsPbTooltipOpen((prev) => !prev);
                setIsStreakTooltipOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/50 rounded-full text-cyan-300 text-xs font-bold shadow-sm shadow-cyan-500/15 transition cursor-pointer"
              title="Personal Bests stats (click to expand)"
            >
              <Trophy className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400 shrink-0" strokeWidth={2.25} />
              <span>{weeklyPbCount}</span>
            </button>

            <PersonalBestsTooltip
              isOpen={isPbTooltipOpen}
              onClose={() => setIsPbTooltipOpen(false)}
              stats={pbStats}
              onResetCounter={onResetPbCounter || (() => {})}
            />
          </div>

          {/* Yellow Flame Streak Badge with Calendar Tooltip */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setIsStreakTooltipOpen((prev) => !prev);
                setIsPbTooltipOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 border border-amber-500/25 hover:border-amber-500/40 rounded-full text-amber-400 text-xs font-bold transition cursor-pointer"
              title="Practice streak calendar (click to expand)"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{streak}d</span>
            </button>

            <StreakCalendarTooltip
              isOpen={isStreakTooltipOpen}
              onClose={() => setIsStreakTooltipOpen(false)}
              streak={streak}
              practicedDates={practicedDates}
            />
          </div>

          {/* Skill Queue / Library Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLibrary();
            }}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 hover:text-white transition cursor-pointer"
            title="Open Skills Library & Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Center Callout */}
      <div className="flex flex-col items-center text-center max-w-sm my-auto px-4 w-full">
        {/* Enticing Glowing & Pulsing Play Button */}
        <div className="relative mb-6 group flex items-center justify-center">
          {/* Outer ambient glow ripple */}
          <div className="absolute -inset-6 rounded-full bg-amber-400/35 blur-2xl animate-pulse pointer-events-none" />
          <div className="absolute -inset-3 rounded-full border-2 border-amber-400/70 animate-ping opacity-85 pointer-events-none" />

          {/* Main button orb */}
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.6)] group-hover:scale-105 active:scale-95 transition-transform duration-200">
            {/* Perfectly centered play triangle */}
            <Play className="w-11 h-11 text-neutral-950 fill-neutral-950 stroke-neutral-950 ml-1" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-6">
          Daily Routine Ready
        </h1>

        {/* Up First Preview Card */}
        {firstSkill && (
          <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 text-left shadow-lg backdrop-blur">
            <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
              UP FIRST
            </div>

            <div className="flex items-center justify-between gap-3">
              {/* Left: Title & Personal Best */}
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-white truncate mb-1">
                  {firstSkill.title}
                </div>
                <div className="text-xs font-mono font-bold text-amber-400">
                  Personal Best: {history.length > 0 ? firstSkill.personalBestBpm : '???'}
                </div>
              </div>

              {/* Right: Cyan Progress Graph with subtle grey axis */}
              <div className="shrink-0">
                <TealProgressGraph
                  history={history}
                  personalBestBpm={firstSkill.personalBestBpm}
                  skillTitle={firstSkill.title}
                  sticking={firstSkill.sticking}
                  width={110}
                  height={34}
                  showLabels={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Unobtrusive "Random Order" Toggle below Up First Card */}
        <div className="w-full flex justify-end mt-2 px-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRandomOrder?.(!isRandomOrder);
            }}
            className="flex items-center gap-2 group cursor-pointer select-none py-1"
            title="Randomize queue order on start"
          >
            <span
              className={`text-xs font-mono transition-colors ${
                isRandomOrder ? 'text-amber-400 font-semibold' : 'text-neutral-500 group-hover:text-neutral-400'
              }`}
            >
              Random Order
            </span>
            {/* Toggle switch pill */}
            <div
              className={`w-7 h-4 rounded-full transition-colors flex items-center px-0.5 ${
                isRandomOrder ? 'bg-amber-400' : 'bg-neutral-800 border border-neutral-700/80'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full transition-transform ${
                  isRandomOrder ? 'translate-x-3 bg-neutral-950' : 'translate-x-0 bg-neutral-500'
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Footer Controls */}
      <div className="w-full max-w-md pb-2 flex flex-col items-center gap-2">
        <span className="text-xs font-mono text-neutral-400 animate-bounce tracking-widest uppercase">
          ✦ Touch anything to begin ✦
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenLibrary();
          }}
          className="text-xs text-neutral-400 hover:text-white underline underline-offset-4 py-1"
        >
          View All Skills & Settings
        </button>
      </div>
    </div>
  );
};
