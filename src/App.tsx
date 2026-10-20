import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  ListMusic,
  Check,
  Flame,
  LogOut,
} from 'lucide-react';
import type { Skill, Subdivision, PracticeSessionLog, TempoRampSettings } from './types';
import { MetronomeEngine, type MetronomeTickEvent } from './audio/metronomeEngine';
import { storageManager } from './storage/storageManager';
import { CircularDial } from './components/CircularDial';
import { SubdivisionControls } from './components/SubdivisionControls';
import { ProgressSparkline } from './components/ProgressSparkline';
import { ConfirmSessionModal } from './components/ConfirmSessionModal';
import { ColdStartScreen } from './components/ColdStartScreen';
import { RoutineCompleteScreen } from './components/RoutineCompleteScreen';
import { SkillLibraryModal } from './components/SkillLibraryModal';
import { StickingDisplay } from './components/StickingDisplay';
import { ExitPromptModal } from './components/ExitPromptModal';
import { SkillNotesDialog } from './components/SkillNotesDialog';
import { PersonalBestsTooltip } from './components/PersonalBestsTooltip';
import { StreakCalendarTooltip } from './components/StreakCalendarTooltip';
import { TempoRampModal } from './components/TempoRampModal';

export default function App() {
  // Persistence state
  const [skills, setSkills] = useState<Skill[]>(() => storageManager.getSkills());
  const [activeSkillIndex, setActiveSkillIndex] = useState<number>(0);
  const [todaySessions, setTodaySessions] = useState<PracticeSessionLog[]>(() =>
    storageManager.getSessions().filter((s) => s.date.slice(0, 10) === new Date().toISOString().slice(0, 10))
  );
  const [streak, setStreak] = useState<number>(() => storageManager.calculateStreak());
  const [weeklyPbCount, setWeeklyPbCount] = useState<number>(() => storageManager.getWeeklyPbCount());
  const [pbStats, setPbStats] = useState(() => storageManager.getPbStats());
  const [isPbTooltipOpen, setIsPbTooltipOpen] = useState<boolean>(false);
  const [isStreakTooltipOpen, setIsStreakTooltipOpen] = useState<boolean>(false);

  // Global Tempo Ramp settings
  const [tempoRampSettings, setTempoRampSettings] = useState<TempoRampSettings>(() =>
    storageManager.getTempoRampSettings()
  );
  const [isTempoRampModalOpen, setIsTempoRampModalOpen] = useState<boolean>(false);

  const practicedDates = useMemo(() => storageManager.getPracticedDates(), [todaySessions, skills]);

  // App screen flow state
  const [isColdStart, setIsColdStart] = useState<boolean>(true);
  const [isRoutineFinished, setIsRoutineFinished] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isRandomOrder, setIsRandomOrder] = useState<boolean>(() => {
    return localStorage.getItem('tempo_coach_random_order') === 'true';
  });

  // Active (non-hibernated) skills for the daily practice queue
  const [sessionSkillOrder, setSessionSkillOrder] = useState<string[]>([]);

  const activeSkills = useMemo(() => {
    const nonHibernated = skills.filter((s) => !s.isHibernated);
    if (sessionSkillOrder.length > 0) {
      const map = new Map(nonHibernated.map((s) => [s.id, s]));
      const ordered: Skill[] = [];
      sessionSkillOrder.forEach((id) => {
        const found = map.get(id);
        if (found) {
          ordered.push(found);
          map.delete(id);
        }
      });
      // Append any remaining non-hibernated skills
      map.forEach((s) => ordered.push(s));
      return ordered;
    }
    return nonHibernated;
  }, [skills, sessionSkillOrder]);

  // Active skill in view
  const currentSkill: Skill | undefined = activeSkills[activeSkillIndex] || activeSkills[0] || skills[0];

  // Metronome state
  const [bpm, setBpm] = useState<number>(() => {
    const settings = storageManager.getTempoRampSettings();
    return currentSkill ? Math.round(currentSkill.personalBestBpm * (settings.startPercent / 100)) : 80;
  });
  const [startingBpm, setStartingBpm] = useState<number>(() => {
    const settings = storageManager.getTempoRampSettings();
    return currentSkill ? Math.round(currentSkill.personalBestBpm * (settings.startPercent / 100)) : 80;
  });
  const [subdivision, setSubdivision] = useState<Subdivision>(() => currentSkill?.subdivision || '1/16');
  const [isTriplet, setIsTriplet] = useState<boolean>(() => currentSkill?.isTriplet || false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [lastTick, setLastTick] = useState<MetronomeTickEvent | null>(null);

  // Audio Engine instance (persists across renders)
  const engineRef = useRef<MetronomeEngine | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Automatic warmup ramp state: configured from tempoRampSettings
  const rampStateRef = useRef<{
    active: boolean;
    startBpm: number;
    targetBpm: number;
    totalBeats: number;
    completedBeats: number;
  }>({
    active: false,
    startBpm: 0,
    targetBpm: 0,
    totalBeats: 64, // 16 measures * 4 beats
    completedBeats: 0,
  });

  // Initialize engine once
  useEffect(() => {
    const engine = new MetronomeEngine(bpm, subdivision, isTriplet);
    engine.setOnTick((event) => {
      setLastTick(event);

      // Advance automatic warmup ramp on quarter beat ticks
      if (event.isQuarterBeat && rampStateRef.current.active) {
        const ramp = rampStateRef.current;
        ramp.completedBeats += 1;
        const progress = Math.min(1, ramp.completedBeats / ramp.totalBeats);
        const nextBpm = Math.round(ramp.startBpm + (ramp.targetBpm - ramp.startBpm) * progress);

        setBpm(nextBpm);

        if (progress >= 1) {
          ramp.active = false;
        }
      }
    });
    engineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  // Sync engine parameters when BPM, subdivision, or triplet change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setBpm(bpm);
    }
  }, [bpm]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSubdivision(subdivision, isTriplet);
    }
  }, [subdivision, isTriplet]);

  // User manual tempo adjustment handler (cancels active tempo ramp)
  const handleUserBpmChange = useCallback((newBpm: number | ((prev: number) => number)) => {
    if (rampStateRef.current.active) {
      rampStateRef.current.active = false;
    }
    setBpm(newBpm);
  }, []);
  // Load a skill into the metronome player & initiate configurable tempo ramp
  const loadSkill = (skill: Skill, autoPlay = true) => {
    const warmup = Math.round(skill.personalBestBpm * (tempoRampSettings.startPercent / 100));
    const rampTarget = Math.round(skill.personalBestBpm * (tempoRampSettings.targetPercent / 100));
    const totalBeats = Math.max(4, Math.round(tempoRampSettings.measures * 4));

    setBpm(warmup);
    setStartingBpm(warmup);
    setSubdivision(skill.subdivision);
    setIsTriplet(skill.isTriplet);
    sessionStartTimeRef.current = Date.now();

    // Configure automatic ramp (16 measures = 64 beats by default)
    rampStateRef.current = {
      active: tempoRampSettings.enabled && rampTarget > warmup,
      startBpm: warmup,
      targetBpm: rampTarget,
      totalBeats,
      completedBeats: 0,
    };

    if (engineRef.current) {
      engineRef.current.setBpm(warmup);
      engineRef.current.setSubdivision(skill.subdivision, skill.isTriplet);

      if (autoPlay) {
        engineRef.current.start();
        setIsPlaying(true);
      } else {
        engineRef.current.stop();
        setIsPlaying(false);
      }
    }
  };

  const handleSaveTempoRampSettings = (newSettings: TempoRampSettings) => {
    storageManager.saveTempoRampSettings(newSettings);
    setTempoRampSettings(newSettings);
    setIsTempoRampModalOpen(false);

    // If currently practicing and not actively playing, optionally recalculate starting target
    if (currentSkill && !isPlaying) {
      const warmup = Math.round(currentSkill.personalBestBpm * (newSettings.startPercent / 100));
      setBpm(warmup);
      setStartingBpm(warmup);
    }
  };

  // 1. Cold Start tap -> begins routine on the top of the list (Skill 0) at 80% PB
  const handleColdStart = async () => {
    setIsColdStart(false);

    let currentActiveList = skills.filter((s) => !s.isHibernated);
    if (isRandomOrder && currentActiveList.length > 1) {
      // Fisher-Yates shuffle
      const shuffled = [...currentActiveList];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      currentActiveList = shuffled;
      setSessionSkillOrder(shuffled.map((s) => s.id));
    } else {
      setSessionSkillOrder([]);
    }

    const topSkill = currentActiveList[0] || skills[0];
    if (!topSkill) return;

    setActiveSkillIndex(0);

    if (engineRef.current) {
      await engineRef.current.unlockAudio();
    }
    loadSkill(topSkill, true);
  };

  // Play / Pause toggle
  const handleTogglePlay = async () => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    } else {
      await engineRef.current.unlockAudio();
      engineRef.current.start();
      setIsPlaying(true);
    }
  };

  // Open Exit Confirmation Modal (pause audio)
  const handleExitClick = () => {
    if (engineRef.current && isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    }
    setIsExitModalOpen(true);
  };

  // Exit Option 1: Log & Exit
  const handleLogAndExit = () => {
    if (currentSkill) {
      const durationSeconds = Math.max(10, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
      const newSession: PracticeSessionLog = {
        id: 'session-' + Date.now(),
        skillId: currentSkill.id,
        date: new Date().toISOString(),
        bpm,
        durationSeconds,
        isPersonalBest: bpm > currentSkill.personalBestBpm,
      };

      storageManager.addSession(newSession);
      const updatedSkills = storageManager.getSkills();
      setSkills(updatedSkills);
      setTodaySessions((prev) => [...prev, newSession]);
      setStreak(storageManager.calculateStreak());
      setWeeklyPbCount(storageManager.getWeeklyPbCount());
      setPbStats(storageManager.getPbStats());
    }

    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsPlaying(false);
    setIsExitModalOpen(false);
    setIsColdStart(true);
  };

  // Exit Option 2: Discard & Exit
  const handleDiscardAndExit = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsPlaying(false);
    setIsExitModalOpen(false);
    setIsColdStart(true);
  };

  // Exit Option 3: Cancel (Keep Practicing)
  const handleCancelExit = () => {
    setIsExitModalOpen(false);
    if (engineRef.current) {
      engineRef.current.start();
      setIsPlaying(true);
    }
  };

  // Skip current skill without logging
  const handleSkipSkill = () => {
    if (activeSkillIndex < activeSkills.length - 1) {
      const nextIndex = activeSkillIndex + 1;
      setActiveSkillIndex(nextIndex);
      loadSkill(activeSkills[nextIndex], isPlaying);
    } else {
      // Completed all skills
      engineRef.current?.stop();
      setIsPlaying(false);
      setIsRoutineFinished(true);
    }
  };

  // "DONE" button clicked -> pause audio and open quick 1-second confirmation modal
  const handleDoneClick = () => {
    if (engineRef.current && isPlaying) {
      engineRef.current.stop();
      setIsPlaying(false);
    }
    setIsConfirmModalOpen(true);
  };

  // Keyboard controls on practice screen (Space: play/pause, Enter: Done, +/-: BPM with rapid-3 logic)
  const lastBpmKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  useEffect(() => {
    if (isColdStart || isRoutineFinished || isLibraryOpen || isConfirmModalOpen || isExitModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleDoneClick();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const now = Date.now();
        const isRapid = lastBpmKeyRef.current.key === '+' && now - lastBpmKeyRef.current.time < 380;
        lastBpmKeyRef.current = { key: '+', time: now };
        const step = isRapid ? 3 : 1;
        handleUserBpmChange((prev: number) => Math.min(260, prev + step));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const now = Date.now();
        const isRapid = lastBpmKeyRef.current.key === '-' && now - lastBpmKeyRef.current.time < 380;
        lastBpmKeyRef.current = { key: '-', time: now };
        const step = isRapid ? 3 : 1;
        handleUserBpmChange((prev: number) => Math.max(40, prev - step));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleExitClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isColdStart, isRoutineFinished, isLibraryOpen, isConfirmModalOpen, isExitModalOpen, isPlaying]);

  // Confirming session from modal -> save log and immediately auto-advance to next skill
  const handleConfirmSession = (finalBpm: number) => {
    if (!currentSkill) return;

    const durationSeconds = Math.max(10, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
    const newSession: PracticeSessionLog = {
      id: 'session-' + Date.now(),
      skillId: currentSkill.id,
      date: new Date().toISOString(),
      bpm: finalBpm,
      durationSeconds,
      isPersonalBest: finalBpm > currentSkill.personalBestBpm,
    };

    // Store session and update PB in storage
    storageManager.addSession(newSession);

    // Refresh skills and sessions state
    const updatedSkills = storageManager.getSkills();
    const updatedActive = updatedSkills.filter((s) => !s.isHibernated);
    setSkills(updatedSkills);
    setTodaySessions((prev) => [...prev, newSession]);
    setStreak(storageManager.calculateStreak());
    setWeeklyPbCount(storageManager.getWeeklyPbCount());
    setPbStats(storageManager.getPbStats());

    setIsConfirmModalOpen(false);

    // Friction-free auto loop: Advance immediately to next active skill
    if (activeSkillIndex < updatedActive.length - 1) {
      const nextIndex = activeSkillIndex + 1;
      setActiveSkillIndex(nextIndex);
      // Next skill automatically starts at 80% of its PB!
      loadSkill(updatedActive[nextIndex], true);
    } else {
      // Reached the end of the daily routine!
      setIsRoutineFinished(true);
    }
  };

  // Skill Library management actions
  const handleAddSkill = (newSkillData: Omit<Skill, 'id' | 'createdAt' | 'order'>) => {
    const newSkill: Skill = {
      ...newSkillData,
      id: 'skill-' + Date.now(),
      order: skills.length,
      createdAt: new Date().toISOString(),
    };
    const updated = [...skills, newSkill];
    setSkills(updated);
    storageManager.saveSkills(updated);
  };

  const handleUpdateSkill = (id: string, updatedFields: Partial<Skill>) => {
    const updated = skills.map((s) => (s.id === id ? { ...s, ...updatedFields } : s));
    setSkills(updated);
    storageManager.saveSkills(updated);

    // If active skill was updated, update engine if needed
    if (currentSkill && currentSkill.id === id) {
      if (updatedFields.subdivision !== undefined || updatedFields.isTriplet !== undefined) {
        setSubdivision(updatedFields.subdivision ?? currentSkill.subdivision);
        setIsTriplet(updatedFields.isTriplet ?? currentSkill.isTriplet);
      }
    }
  };

  const handleDeleteSkill = (id: string) => {
    const updated = skills.filter((s) => s.id !== id);
    const updatedActive = updated.filter((s) => !s.isHibernated);
    setSkills(updated);
    storageManager.saveSkills(updated);
    if (activeSkillIndex >= updatedActive.length) {
      setActiveSkillIndex(Math.max(0, updatedActive.length - 1));
    }
  };

  const handleHibernateSkill = (id: string) => {
    const updated = storageManager.toggleHibernate(id);
    const updatedActive = updated.filter((s) => !s.isHibernated);
    setSkills(updated);
    if (activeSkillIndex >= updatedActive.length) {
      setActiveSkillIndex(Math.max(0, updatedActive.length - 1));
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (!currentSkill) return;
    const updated = skills.map((s) => (s.id === currentSkill.id ? { ...s, notes } : s));
    setSkills(updated);
    storageManager.saveSkills(updated);
  };

  const handleResetPbCounter = () => {
    storageManager.resetPbCounter();
    setPbStats(storageManager.getPbStats());
  };

  const handleReorderSkill = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= skills.length) return;
    const copy = [...skills];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    setSkills(copy);
    storageManager.saveSkills(copy);
  };

  const handleSelectSkillToPractice = (globalIndex: number) => {
    const selectedSkill = skills[globalIndex];
    if (!selectedSkill) return;
    const activeIdx = activeSkills.findIndex((s) => s.id === selectedSkill.id);
    setActiveSkillIndex(activeIdx !== -1 ? activeIdx : 0);
    setIsLibraryOpen(false);
    setIsRoutineFinished(false);
    setIsColdStart(false);
    loadSkill(selectedSkill, true);
  };

  const handleRestartRoutine = () => {
    setIsRoutineFinished(false);
    setActiveSkillIndex(0);
    const firstActive = activeSkills[0] || skills[0];
    if (firstActive) {
      loadSkill(firstActive, true);
    }
  };

  // Data export / import
  const handleExportData = () => {
    const jsonStr = storageManager.exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tempo-coach-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (storageManager.importDataJson(content)) {
        setSkills(storageManager.getSkills());
        setTodaySessions(storageManager.getSessions());
        setStreak(storageManager.calculateStreak());
        alert('Data imported successfully!');
      } else {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // History for active skill
  const currentSkillHistory = useMemo(() => {
    return currentSkill ? storageManager.getSkillHistory(currentSkill.id) : [];
  }, [currentSkill, todaySessions]);

  // Top skill in active routine (always Up First)
  const topSkill = (skills.filter((s) => !s.isHibernated))[0] || skills[0] || null;
  const topSkillHistory = useMemo(() => {
    return topSkill ? storageManager.getSkillHistory(topSkill.id) : [];
  }, [topSkill, todaySessions]);

  // SCREEN 1: Cold start screen on first visit
  if (isColdStart) {
    return (
      <>
        <ColdStartScreen
          firstSkill={topSkill}
          history={topSkillHistory}
          streak={streak}
          practicedDates={practicedDates}
          weeklyPbCount={weeklyPbCount}
          pbStats={pbStats}
          isRandomOrder={isRandomOrder}
          onToggleRandomOrder={(val) => {
            setIsRandomOrder(val);
            localStorage.setItem('tempo_coach_random_order', String(val));
          }}
          onResetPbCounter={handleResetPbCounter}
          onStart={handleColdStart}
          onOpenLibrary={() => setIsLibraryOpen(true)}
        />
        <SkillLibraryModal
          isOpen={isLibraryOpen}
          skills={skills}
          onClose={() => setIsLibraryOpen(false)}
          onSelectSkillToPractice={(skill) => {
            setIsColdStart(false);
            handleSelectSkillToPractice(skill);
          }}
          onAddSkill={handleAddSkill}
          onUpdateSkill={handleUpdateSkill}
          onDeleteSkill={handleDeleteSkill}
          onReorderSkill={handleReorderSkill}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onHibernateSkill={handleHibernateSkill}
        />
      </>
    );
  }

  // SCREEN 2: Routine complete screen
  if (isRoutineFinished) {
    return (
      <>
        <RoutineCompleteScreen
          skills={skills}
          todaySessions={todaySessions}
          streak={streak}
          onRestartRoutine={handleRestartRoutine}
          onReturnToTitle={() => {
            setIsRoutineFinished(false);
            setIsColdStart(true);
          }}
          onOpenLibrary={() => setIsLibraryOpen(true)}
          onHibernateSkill={handleHibernateSkill}
          onDeleteSkill={handleDeleteSkill}
        />
        <SkillLibraryModal
          isOpen={isLibraryOpen}
          skills={skills}
          onClose={() => setIsLibraryOpen(false)}
          onSelectSkillToPractice={handleSelectSkillToPractice}
          onAddSkill={handleAddSkill}
          onUpdateSkill={handleUpdateSkill}
          onDeleteSkill={handleDeleteSkill}
          onReorderSkill={handleReorderSkill}
          onExportData={handleExportData}
          onImportData={handleImportData}
          onHibernateSkill={handleHibernateSkill}
        />
      </>
    );
  }

  // SCREEN 3: Active Interactive Practice View
  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-black text-white px-4 pt-2 pb-1.5 select-none touch-none">
      {/* Top Header Navigation */}
      <header className="w-full max-w-md flex items-center justify-between shrink-0">
        {/* Routine Queue Progress Indicator */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-xs font-mono font-bold text-neutral-300">
            {activeSkillIndex + 1} / {activeSkills.length}
          </span>
          <span className="text-xs text-neutral-400 font-medium">Daily Routine</span>
        </div>

        {/* Streak, Weekly PB Badge & Library Button */}
        <div className="flex items-center gap-2">
          {/* Cyan Ascending Comet Badge for Personal Bests */}
          {(weeklyPbCount > 0 || pbStats.allTime > 0) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsPbTooltipOpen((prev) => !prev);
                  setIsStreakTooltipOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/30 border border-cyan-500/30 hover:border-cyan-500/50 rounded-full text-cyan-300 text-xs font-bold shadow-sm shadow-cyan-500/15 transition cursor-pointer"
                title="Personal Bests stats (click to expand)"
              >
                {/* Ascending Comet Icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 fill-none stroke-current stroke-2 drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]"
                >
                  <circle cx="17.5" cy="6.5" r="3" fill="#22d3ee" stroke="#0891b2" strokeWidth="1" />
                  <path
                    d="M15 9L6 18M11 13L4 20M13 7L9 11"
                    strokeLinecap="round"
                    strokeWidth="1.75"
                    className="text-cyan-400"
                  />
                </svg>
                <span>{weeklyPbCount}</span>
              </button>

              <PersonalBestsTooltip
                isOpen={isPbTooltipOpen}
                onClose={() => setIsPbTooltipOpen(false)}
                stats={pbStats}
                onResetCounter={handleResetPbCounter}
              />
            </div>
          )}

          {streak > 0 && (
            <div className="relative">
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
          )}

          <button
            type="button"
            onClick={() => {
              if (isPlaying) engineRef.current?.stop();
              setIsPlaying(false);
              setIsLibraryOpen(true);
            }}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 hover:text-white transition"
            title="Open Skills Library"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Upper Info Section: Title, Sticking & Progress Card (Vertically Centered) */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full max-w-md py-1">
        <div className="w-full text-center mb-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
            {currentSkill?.title}
          </h1>

          {currentSkill?.sticking ? (
            <StickingDisplay sticking={currentSkill.sticking} />
          ) : (
            <span className="text-xs text-neutral-500 uppercase tracking-wider">
              {currentSkill?.category}
            </span>
          )}
        </div>

        {/* Hero Personal Best Target & Progress Graph */}
        <div className="w-full flex justify-center mt-7">
          {currentSkill && (
            <ProgressSparkline
              personalBestBpm={currentSkill.personalBestBpm}
              history={currentSkillHistory}
              startingBpm={startingBpm}
            />
          )}
        </div>
      </div>

      {/* Circular Dial Metronome with swipe & Tempo Ramp button (lifted ~25px) */}
      <div className="flex flex-col items-center shrink-0 -mt-6">
        <CircularDial
          bpm={bpm}
          minBpm={40}
          maxBpm={260}
          onBpmChange={handleUserBpmChange}
          lastTick={lastTick}
          isPlaying={isPlaying}
          onOpenTempoRamp={() => setIsTempoRampModalOpen(true)}
        />

        {/* Compact, unobtrusive concentric subdivision pill ring right under the wheel */}
        <div className="-mt-1 z-10">
          <SubdivisionControls
            subdivision={subdivision}
            isTriplet={isTriplet}
            onSubdivisionChange={setSubdivision}
            onTripletToggle={() => setIsTriplet((prev) => !prev)}
          />
        </div>
      </div>

      {/* Lower Section: Adaptive, Inobtrusive Rehearsal Notes Field */}
      <div className="shrink-0 flex flex-col items-center justify-center w-full max-w-md pt-[15px] pb-1">
        <SkillNotesDialog
          notes={currentSkill?.notes}
          onSaveNotes={handleUpdateNotes}
        />
      </div>

      {/* Done Button: Vertically centered in the remaining space between Rehearsal Notes and Auxiliary Controls */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
        <button
          type="button"
          onClick={handleDoneClick}
          className="w-[95%] max-w-[323px] py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-98 transition transform cursor-pointer"
        >
          <Check className="w-6 h-6 stroke-[3]" />
          <span>DONE (LOG PERFORMANCE)</span>
        </button>
      </div>

      {/* Auxiliary Controls (Exit, Play/Pause, Skip) */}
      <footer className="w-full max-w-[340px] shrink-0 pb-1">
        <div className="flex items-center justify-between px-2 text-neutral-400">
          {/* Exit Button */}
          <button
            type="button"
            onClick={handleExitClick}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-300 transition py-1 px-2 rounded-lg hover:bg-neutral-800/60 cursor-pointer"
            title="Exit practice"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-500" />
            <span>Exit</span>
          </button>

          {/* Central Play / Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`px-5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-md cursor-pointer ${
              isPlaying
                ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </>
            )}
          </button>

          {/* Skip to Next */}
          <button
            type="button"
            onClick={handleSkipSkill}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition py-1 px-2 rounded-lg hover:bg-neutral-800/60 cursor-pointer"
            title="Skip this skill"
          >
            <span>Skip</span>
            <SkipForward className="w-3.5 h-3.5 text-neutral-500" />
          </button>
        </div>
      </footer>

      {/* Tempo Ramp Settings Modal */}
      <TempoRampModal
        isOpen={isTempoRampModalOpen}
        onClose={() => setIsTempoRampModalOpen(false)}
        settings={tempoRampSettings}
        onSave={handleSaveTempoRampSettings}
      />

      {/* Exit Prompt Modal */}
      {currentSkill && (
        <ExitPromptModal
          isOpen={isExitModalOpen}
          skillTitle={currentSkill.title}
          sticking={currentSkill.sticking}
          currentBpm={bpm}
          personalBestBpm={currentSkill.personalBestBpm}
          history={currentSkillHistory}
          startingBpm={startingBpm}
          onLogAndExit={handleLogAndExit}
          onDiscardAndExit={handleDiscardAndExit}
          onCancel={handleCancelExit}
        />
      )}

      {/* 1-Second Confirmation Modal */}
      {currentSkill && (
        <ConfirmSessionModal
          isOpen={isConfirmModalOpen}
          skillTitle={currentSkill.title}
          sticking={currentSkill.sticking}
          initialBpm={bpm}
          personalBestBpm={currentSkill.personalBestBpm}
          onConfirm={handleConfirmSession}
          onCancel={() => {
            setIsConfirmModalOpen(false);
            engineRef.current?.start();
            setIsPlaying(true);
          }}
        />
      )}

      {/* Skills Library & Routine Management Modal */}
      <SkillLibraryModal
        isOpen={isLibraryOpen}
        skills={skills}
        onClose={() => setIsLibraryOpen(false)}
        onSelectSkillToPractice={handleSelectSkillToPractice}
        onAddSkill={handleAddSkill}
        onUpdateSkill={handleUpdateSkill}
        onDeleteSkill={handleDeleteSkill}
        onReorderSkill={handleReorderSkill}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onHibernateSkill={handleHibernateSkill}
      />
    </div>
  );
}
