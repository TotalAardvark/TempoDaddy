import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Trophy, Flame, CheckCircle, ListMusic, Trash2, Sun, ChevronDown, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';
import type { Skill, PracticeSessionLog, PbDisplayRange } from '../types';
import { storageManager } from '../storage/storageManager';
import { TealProgressGraph } from './TealProgressGraph';
import { StickingDisplay } from './StickingDisplay';
import { PersonalBestsTooltip } from './PersonalBestsTooltip';
import confetti from 'canvas-confetti';

interface RoutineCompleteScreenProps {
  skills: Skill[];
  todaySessions: PracticeSessionLog[];
  completedSkillIds?: Set<string>;
  streak: number;
  pbStats?: {
    thisWeek: number;
    thisMonth: number;
    allTime: number;
    sinceReset: number;
    resetDate: string | null;
  };
  pbDisplayRange?: PbDisplayRange;
  onPbDisplayRangeChange?: (range: PbDisplayRange) => void;
  onRestartRoutine?: () => void;
  onReturnToStart?: () => void;
  onReturnToTitle: () => void;
  onOpenLibrary: () => void;
  onHibernateSkill: (id: string) => void;
  onDeleteSkill: (id: string) => void;
}

export const RoutineCompleteScreen: React.FC<RoutineCompleteScreenProps> = ({
  skills,
  todaySessions,
  completedSkillIds,
  streak,
  pbStats,
  pbDisplayRange = 'allTime',
  onPbDisplayRangeChange,
  onReturnToStart,
  onReturnToTitle,
  onOpenLibrary,
  onHibernateSkill,
  onDeleteSkill,
}) => {
  const [showHibernated, setShowHibernated] = useState(false);
  const [isPbTooltipOpen, setIsPbTooltipOpen] = useState(false);

  // Calculate active skills and newly achieved PBs in this session
  const activeSkills = useMemo(() => skills.filter((s) => !s.isHibernated), [skills]);
  const hibernatedSkills = useMemo(() => skills.filter((s) => s.isHibernated), [skills]);

  // Compute session metrics: number of new PBs achieved during this session
  const sessionPbCount = useMemo(() => {
    let count = 0;
    activeSkills.forEach((skill) => {
      const isCompleted = completedSkillIds ? completedSkillIds.has(skill.id) : true;
      if (!isCompleted) return;
      const history = storageManager.getSkillHistory(skill.id);
      const mostRecent = [...todaySessions].reverse().find((s) => s.skillId === skill.id) ||
        (history.length > 0 ? history[history.length - 1] : null);
      if (mostRecent) {
        const latestBpm = mostRecent.bpm;
        if (mostRecent.isPersonalBest || latestBpm >= skill.personalBestBpm) {
          count++;
        }
      }
    });
    return count;
  }, [activeSkills, completedSkillIds, todaySessions]);

  // Total Lifetime PB count
  const totalPbCount = pbStats?.allTime ?? storageManager.getPbStats().allTime;
  const prevTotalPbCount = Math.max(0, totalPbCount - sessionPbCount);

  // Script-based animated counter from previous total to current total
  const [animatedPbCount, setAnimatedPbCount] = useState<number>(prevTotalPbCount);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (sessionPbCount <= 0) {
      setAnimatedPbCount(totalPbCount);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();
    const startVal = prevTotalPbCount;
    const endVal = totalPbCount;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setAnimatedPbCount(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [prevTotalPbCount, totalPbCount, sessionPbCount]);

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 },
    });
  }, []);

  // Listen for Escape key to return to title screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPbTooltipOpen) {
          setIsPbTooltipOpen(false);
          return;
        }
        e.preventDefault();
        onReturnToTitle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReturnToTitle, isPbTooltipOpen]);

  return (
    <div
      style={{ paddingTop: 'var(--app-header-padding-top)' }}
      className="min-h-[100dvh] w-full flex flex-col justify-between items-center px-4 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-b from-neutral-950 via-neutral-900 to-black text-white"
    >
      {/* Top Bar */}
      <div className="w-full max-w-md flex items-center justify-between">
        {/* Cyan Trophy Badge for Lifetime PBs with +X animation */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setIsPbTooltipOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/50 rounded-full text-cyan-300 text-xs font-bold shadow-sm shadow-cyan-500/15 transition cursor-pointer"
            title="Personal Bests stats (click to expand)"
          >
            <Trophy className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400 shrink-0" strokeWidth={2.25} />
            <span className="font-mono text-sm tracking-tight">{animatedPbCount}</span>
            {sessionPbCount > 0 && (
              <span className="text-[11px] font-mono font-black text-cyan-200 bg-cyan-500/20 px-1.5 py-0.2 rounded-full border border-cyan-400/40 animate-pulse">
                +{sessionPbCount}
              </span>
            )}
          </button>

          <PersonalBestsTooltip
            isOpen={isPbTooltipOpen}
            onClose={() => setIsPbTooltipOpen(false)}
            stats={pbStats}
            displayRange={pbDisplayRange}
            onDisplayRangeChange={onPbDisplayRangeChange || (() => {})}
          />
        </div>

        {/* Flame Streak Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold">
          <Flame className="w-3.5 h-3.5 fill-amber-400" />
          <span>{streak} Day Streak!</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md my-auto flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mb-4 shadow-xl shadow-amber-500/20">
          <Trophy className="w-10 h-10 text-amber-400" />
        </div>

        <h2 className="text-3xl font-extrabold text-white mb-2">Great Session!</h2>
        
        {/* Dynamic Summary of Personal Bests Achieved in this session */}
        <div className="mb-6 max-w-xs">
          {sessionPbCount > 0 ? (
            <p className="text-sm text-cyan-300 font-medium">
              You smashed <span className="font-bold text-white underline decoration-cyan-400 decoration-2">{sessionPbCount}</span> new {sessionPbCount === 1 ? 'personal best' : 'personal bests'} today!
            </p>
          ) : (
            <p className="text-sm text-neutral-400">
              Completed all exercises in today's routine. Consistent reps build mastery!
            </p>
          )}
        </div>

        {/* Practiced Skills List with Teal Progress Graphs */}
        <div className="w-full space-y-3 mb-8">
          {activeSkills.map((skill) => {
            const isCompletedInSession = completedSkillIds ? completedSkillIds.has(skill.id) : true;
            const isSkipped = !isCompletedInSession;

            const history = storageManager.getSkillHistory(skill.id);
            // If completed in this session, retrieve the most recent session from today or history
            const mostRecentSession = isSkipped
              ? null
              : ([...todaySessions].reverse().find((s) => s.skillId === skill.id) ||
                (history.length > 0 ? history[history.length - 1] : null));

            const latestBpm = mostRecentSession ? mostRecentSession.bpm : skill.personalBestBpm;
            const isNewPb = !isSkipped && (mostRecentSession?.isPersonalBest || latestBpm >= skill.personalBestBpm);

            return (
              <div
                key={skill.id}
                className={`w-full bg-neutral-900/80 border rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-md transition-all ${
                  isSkipped
                    ? 'border-neutral-800/80 opacity-80'
                    : isNewPb
                    ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.18)]'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Header row: Checkmark/Skip, Title, Sticking, BPM stats, and Hibernate/Trash actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-left min-w-0 flex-1">
                    {isSkipped ? (
                      <span className="w-4 h-4 rounded-full border border-neutral-600 flex items-center justify-center shrink-0 text-neutral-500 font-mono text-[10px]">
                        –
                      </span>
                    ) : (
                      <CheckCircle className={`w-4 h-4 shrink-0 ${isNewPb ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]' : 'text-emerald-400'}`} />
                    )}
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-bold text-white truncate">{skill.title}</div>
                      {skill.sticking && (
                        <div className="mt-0.5">
                          <StickingDisplay sticking={skill.sticking} maxLength={16} className="py-0.5 px-2 text-[10px]" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-base font-black font-mono transition-colors ${
                          isSkipped
                            ? 'text-white'
                            : isNewPb
                            ? 'text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]'
                            : 'text-white'
                        }`}
                      >
                        {isSkipped ? '--- BPM' : `${latestBpm} BPM`}
                      </div>
                      <div className="text-[10px] text-amber-400 font-semibold uppercase">
                        Best: {skill.personalBestBpm}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 pl-1 border-l border-neutral-800">
                      {/* Hibernate (zZz) button to the left of Trash Can */}
                      <button
                        type="button"
                        onClick={() => onHibernateSkill(skill.id)}
                        className="px-1.5 py-1 rounded-lg text-neutral-500 hover:text-indigo-300 hover:bg-indigo-500/10 font-mono text-[11px] font-bold tracking-tighter transition"
                        title="Hibernate Skill (pause from daily routine)"
                      >
                        zZz
                      </button>

                      {/* Delete */}
                      {skills.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteSkill(skill.id)}
                          className="p-1 text-neutral-500 hover:text-red-400 transition"
                          title="Delete Skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Graph & Dynamic Session Result Area */}
                <div className="pt-2 border-t border-neutral-800/70 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    {isSkipped ? (
                      <span className="flex items-center gap-1.5 text-neutral-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                        <span>Skipped</span>
                      </span>
                    ) : isNewPb ? (
                      <span className="flex items-center gap-1.5 text-cyan-300 font-bold drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                        <span>New Personal Best!</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-neutral-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>

                  {isSkipped ? (
                    <div className="text-[10px] font-mono text-neutral-600 pr-1 select-none">
                      Skipped in session
                    </div>
                  ) : (
                    <TealProgressGraph
                      history={history}
                      personalBestBpm={skill.personalBestBpm}
                      currentBpm={latestBpm}
                      skillTitle={skill.title}
                      sticking={skill.sticking}
                      width={120}
                      height={28}
                      showLabels={true}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Hibernated Skills in Review Pane */}
          {hibernatedSkills.length > 0 && (
            <div className="pt-2 text-left">
              <button
                type="button"
                onClick={() => setShowHibernated((v) => !v)}
                className="flex items-center gap-2 w-full text-left mb-2 group"
              >
                {showHibernated ? (
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                )}
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-400/80 group-hover:text-indigo-300 transition">
                  Hibernated Skills ({hibernatedSkills.length})
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-400/70 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  zZz
                </span>
              </button>

              {showHibernated && (
                <div className="space-y-2">
                  {hibernatedSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="w-full bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-3 flex items-center justify-between gap-3 opacity-70 hover:opacity-95 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold shrink-0">
                          zZz
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-neutral-300 truncate">{skill.title}</div>
                          <div className="text-[11px] font-mono text-amber-400/70 font-semibold">
                            PB: {skill.personalBestBpm} BPM
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onHibernateSkill(skill.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1 border border-indigo-500/30"
                          title="Wake Up — return to active queue"
                        >
                          <Sun className="w-3 h-3" />
                          <span>Wake</span>
                        </button>
                        {skills.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteSkill(skill.id)}
                            className="p-1 text-neutral-600 hover:text-red-400 ml-1"
                            title="Delete Skill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            onClick={onReturnToStart || onReturnToTitle}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return to Start</span>
          </button>

          <button
            type="button"
            onClick={onOpenLibrary}
            className="w-full py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
          >
            <ListMusic className="w-4 h-4 text-neutral-400" />
            <span>Manage Skills Library</span>
          </button>
        </div>
      </div>

      <div className="pb-4 text-xs text-neutral-400 font-mono">
        Consistency builds velocity. See you tomorrow!
      </div>
    </div>
  );
};
