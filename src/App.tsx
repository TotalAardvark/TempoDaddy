import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  ListMusic,
  Check,
  Flame,
  LogOut,
  Volume2,
  Trophy,
} from 'lucide-react';
import type { Skill, Subdivision, PracticeSessionLog, TempoRampSettings, MetronomeTimbre, PbDisplayRange } from './types';
import { MetronomeEngine, type MetronomeTickEvent } from './audio/metronomeEngine';
import { storageManager } from './storage/storageManager';
import {
  triggerDebouncedCloudSync,
  forceCloudSync,
  loadCloudProfile,
  getStoredProfileId,
} from './storage/cloudSync';
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

const TIMBRE_CONFIG: Record<MetronomeTimbre, { name: string; description: string }> = {
  woodblock: { name: 'Woodblock', description: 'Warm acoustic woodblock with 2kHz transient' },
  beep: { name: 'Beep', description: 'Crisp digital beep with high-frequency cut' },
  loud: { name: 'Loud', description: 'Piercing loud click with white noise transient' },
};

export default function App() {
  // Persistence state
  const [skills, setSkills] = useState<Skill[]>(() => storageManager.getSkills());
  const [activeSkillIndex, setActiveSkillIndex] = useState<number>(0);
  const [todaySessions, setTodaySessions] = useState<PracticeSessionLog[]>(() =>
    storageManager.getSessions().filter((s) => s.date.slice(0, 10) === new Date().toISOString().slice(0, 10))
  );
  const [streak, setStreak] = useState<number>(() => storageManager.calculateStreak());
  const [pbStats, setPbStats] = useState(() => storageManager.getPbStats());
  const [pbDisplayRange, setPbDisplayRange] = useState<PbDisplayRange>(() => storageManager.getPbDisplayRange());
  const [isPbTooltipOpen, setIsPbTooltipOpen] = useState<boolean>(false);
  const [isStreakTooltipOpen, setIsStreakTooltipOpen] = useState<boolean>(false);
  const [timbre, setTimbre] = useState<MetronomeTimbre>(() => storageManager.getMetronomeTimbre());

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
  const [completedSkillIds, setCompletedSkillIds] = useState<Set<string>>(() => new Set());
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
    const engine = new MetronomeEngine(bpm, subdivision, isTriplet, timbre);
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

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTimbre(timbre);
    }
  }, [timbre]);

  // Keep screen awake while metronome is actively playing (Screen Wake Lock API)
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let isCancelled = false;

    const acquireLock = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      } catch (err) {
        // May fail if tab is in background or low battery mode
        console.warn('Wake Lock request error:', err);
      }
    };

    const releaseLock = async () => {
      if (wakeLock) {
        try {
          await wakeLock.release();
        } catch {
          // Ignore release errors
        }
        wakeLock = null;
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isPlaying && !wakeLock && !isCancelled) {
        await acquireLock();
      }
    };

    if (isPlaying) {
      acquireLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      releaseLock();
    }

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [isPlaying]);

  // Cycle metronome timbre between woodblock, digital beep, and loud
  const handleCycleTimbre = () => {
    const timbres: MetronomeTimbre[] = ['woodblock', 'beep', 'loud'];
    const nextIdx = (timbres.indexOf(timbre) + 1) % timbres.length;
    const nextTimbre = timbres[nextIdx];
    setTimbre(nextTimbre);
    storageManager.saveMetronomeTimbre(nextTimbre);
    triggerDebouncedCloudSync();
    if (engineRef.current) {
      engineRef.current.setTimbre(nextTimbre);
      if (!isPlaying) {
        engineRef.current.playPreview(nextTimbre);
      }
    }
  };

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
    triggerDebouncedCloudSync();
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
    setCompletedSkillIds(new Set());

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
      const hasPreviousRuns = storageManager.getSkillHistory(currentSkill.id).length > 0;
      const isFirstRun = !hasPreviousRuns;
      const isPersonalBest = isFirstRun || bpm > currentSkill.personalBestBpm;

      const newSession: PracticeSessionLog = {
        id: 'session-' + Date.now(),
        skillId: currentSkill.id,
        date: new Date().toISOString(),
        bpm,
        durationSeconds,
        isPersonalBest,
      };

      storageManager.addSession(newSession);
      const updatedSkills = storageManager.getSkills();
      setSkills(updatedSkills);
      setTodaySessions((prev) => [...prev, newSession]);
      setStreak(storageManager.calculateStreak());
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

  // Keyboard controls on practice screen:
  // Space: single-tap (waits 250ms) -> pause/resume; double-tap (<250ms) -> Done (Log Performance)
  // Enter: Done (Log Performance)
  // +/- or arrows: BPM adjustment with rapid-3 logic
  const lastBpmKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const spaceDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending space delay timer on unmount or screen state changes
  useEffect(() => {
    return () => {
      if (spaceDelayTimerRef.current) {
        clearTimeout(spaceDelayTimerRef.current);
        spaceDelayTimerRef.current = null;
      }
    };
  }, [isColdStart, isRoutineFinished, isLibraryOpen, isConfirmModalOpen, isExitModalOpen]);

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
        if (spaceDelayTimerRef.current) {
          // Double-tap Space detected within 250ms -> Trigger Done / Log Performance
          clearTimeout(spaceDelayTimerRef.current);
          spaceDelayTimerRef.current = null;
          handleDoneClick();
        } else {
          // First tap -> Wait 250ms standard delay to confirm if it's a single or double tap
          spaceDelayTimerRef.current = setTimeout(() => {
            spaceDelayTimerRef.current = null;
            handleTogglePlay();
          }, 250);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (spaceDelayTimerRef.current) {
          clearTimeout(spaceDelayTimerRef.current);
          spaceDelayTimerRef.current = null;
        }
        handleDoneClick();
      } else if (e.key === '+' || e.key === '=' || e.key === 'ArrowRight') {
        e.preventDefault();
        const now = Date.now();
        // Hold-to-repeat or fast bursts switch to faster/larger increments (step = 3),
        // while normal deliberate taps (< 200 BPM or >= 120ms) increment strictly by 1.
        const isRapid = e.repeat || (lastBpmKeyRef.current.key === '+' && now - lastBpmKeyRef.current.time < 120);
        lastBpmKeyRef.current = { key: '+', time: now };
        const step = isRapid ? 3 : 1;
        handleUserBpmChange((prev: number) => Math.min(260, prev + step));
      } else if (e.key === '-' || e.key === '_' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const now = Date.now();
        const isRapid = e.repeat || (lastBpmKeyRef.current.key === '-' && now - lastBpmKeyRef.current.time < 120);
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

    setCompletedSkillIds((prev) => new Set(prev).add(currentSkill.id));

    const durationSeconds = Math.max(10, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
    const hasPreviousRuns = storageManager.getSkillHistory(currentSkill.id).length > 0;
    const isFirstRun = !hasPreviousRuns;
    const isPersonalBest = isFirstRun || finalBpm > currentSkill.personalBestBpm;

    const newSession: PracticeSessionLog = {
      id: 'session-' + Date.now(),
      skillId: currentSkill.id,
      date: new Date().toISOString(),
      bpm: finalBpm,
      durationSeconds,
      isPersonalBest,
    };

    // Store session and update PB in storage
    storageManager.addSession(newSession);
    triggerDebouncedCloudSync();

    // Refresh skills and sessions state
    const updatedSkills = storageManager.getSkills();
    const updatedActive = updatedSkills.filter((s) => !s.isHibernated);
    setSkills(updatedSkills);
    setTodaySessions((prev) => [...prev, newSession]);
    setStreak(storageManager.calculateStreak());
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
    triggerDebouncedCloudSync();
  };

  const handleUpdateSkill = (id: string, updatedFields: Partial<Skill>) => {
    const updated = skills.map((s) => (s.id === id ? { ...s, ...updatedFields } : s));
    setSkills(updated);
    storageManager.saveSkills(updated);
    triggerDebouncedCloudSync();

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
    triggerDebouncedCloudSync();
    if (activeSkillIndex >= updatedActive.length) {
      setActiveSkillIndex(Math.max(0, updatedActive.length - 1));
    }
  };

  const handleHibernateSkill = (id: string) => {
    const updated = storageManager.toggleHibernate(id);
    const updatedActive = updated.filter((s) => !s.isHibernated);
    setSkills(updated);
    triggerDebouncedCloudSync();
    if (activeSkillIndex >= updatedActive.length) {
      setActiveSkillIndex(Math.max(0, updatedActive.length - 1));
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (!currentSkill) return;
    const updated = skills.map((s) => (s.id === currentSkill.id ? { ...s, notes } : s));
    setSkills(updated);
    storageManager.saveSkills(updated);
    triggerDebouncedCloudSync();
  };

  const handleSubdivisionChange = (newSub: Subdivision) => {
    setSubdivision(newSub);
    if (currentSkill) {
      handleUpdateSkill(currentSkill.id, { subdivision: newSub });
    }
  };

  const handleTripletToggle = () => {
    const nextTriplet = !isTriplet;
    setIsTriplet(nextTriplet);
    if (currentSkill) {
      handleUpdateSkill(currentSkill.id, { isTriplet: nextTriplet });
    }
  };

  const handlePbDisplayRangeChange = (range: PbDisplayRange) => {
    setPbDisplayRange(range);
    storageManager.setPbDisplayRange(range);
  };

  const pbDisplayCount = useMemo(() => {
    switch (pbDisplayRange) {
      case 'thisWeek':
        return pbStats.thisWeek;
      case 'thisMonth':
        return pbStats.thisMonth;
      case 'allTime':
      default:
        return pbStats.allTime;
    }
  }, [pbDisplayRange, pbStats]);

  const handleReorderSkill = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= skills.length) return;
    const copy = [...skills];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    setSkills(copy);
    storageManager.saveSkills(copy);
    triggerDebouncedCloudSync();
  };

  const handleSelectSkillToPractice = (globalIndex: number) => {
    const selectedSkill = skills[globalIndex];
    if (!selectedSkill) return;
    const activeIdx = activeSkills.findIndex((s) => s.id === selectedSkill.id);
    setActiveSkillIndex(activeIdx !== -1 ? activeIdx : 0);
    setCompletedSkillIds(new Set());
    setIsLibraryOpen(false);
    setIsRoutineFinished(false);
    setIsColdStart(false);
    loadSkill(selectedSkill, true);
  };

  const handleRestartRoutine = () => {
    setIsRoutineFinished(false);
    setCompletedSkillIds(new Set());
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
        handleReloadAllData();
        triggerDebouncedCloudSync();
        alert('Data imported successfully!');
      } else {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleReloadAllData = () => {
    const freshSkills = storageManager.getSkills();
    setSkills(freshSkills);
    setTodaySessions(
      storageManager.getSessions().filter((s) => s.date.slice(0, 10) === new Date().toISOString().slice(0, 10))
    );
    setStreak(storageManager.calculateStreak());
    setPbStats(storageManager.getPbStats());
    setTimbre(storageManager.getMetronomeTimbre());
    setTempoRampSettings(storageManager.getTempoRampSettings());
    const active = freshSkills.filter((s) => !s.isHibernated);
    if (active.length > 0) {
      setActiveSkillIndex(0);
      loadSkill(active[0], false);
    }
  };

  // Sync cloud profile on app startup if linked, and force sync before window unloads
  useEffect(() => {
    const profileId = getStoredProfileId();
    if (profileId) {
      loadCloudProfile(profileId).then((res) => {
        if (res.success) {
          handleReloadAllData();
        }
      }).catch((err) => {
        console.warn('Initial cloud profile fetch warning:', err);
      });
    }

    const handleBeforeUnload = () => {
      forceCloudSync();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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
          pbDisplayCount={pbDisplayCount}
          pbStats={pbStats}
          pbDisplayRange={pbDisplayRange}
          onPbDisplayRangeChange={handlePbDisplayRangeChange}
          isRandomOrder={isRandomOrder}
          onToggleRandomOrder={(val) => {
            setIsRandomOrder(val);
            localStorage.setItem('tempo_coach_random_order', String(val));
          }}
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
          onDataReloaded={handleReloadAllData}
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
          completedSkillIds={completedSkillIds}
          streak={streak}
          pbStats={pbStats}
          pbDisplayRange={pbDisplayRange}
          onPbDisplayRangeChange={handlePbDisplayRangeChange}
          onRestartRoutine={handleRestartRoutine}
          onReturnToStart={() => {
            setIsRoutineFinished(false);
            setIsColdStart(true);
          }}
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
          onDataReloaded={handleReloadAllData}
        />
      </>
    );
  }

  // SCREEN 3: Active Interactive Practice View
  return (
    <div
      style={{ paddingTop: 'var(--app-header-padding-top)' }}
      className="h-[100dvh] max-h-[100dvh] overflow-hidden w-full flex flex-col items-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-black text-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] select-none"
    >
      {/* Top Header Navigation */}
      <header className="w-full max-w-md flex items-center justify-between shrink-0 pb-2">
        {/* Routine Queue Progress Indicator & Sound Timbre Selector */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-xs font-mono font-bold text-neutral-300">
            {activeSkillIndex + 1} / {activeSkills.length}
          </span>

          {/* Sound Timbre Toggle Button */}
          <button
            type="button"
            onClick={handleCycleTimbre}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800/80 hover:bg-neutral-800 active:bg-neutral-700 border border-neutral-700/60 hover:border-amber-500/40 text-xs font-mono font-medium text-neutral-300 transition cursor-pointer"
            title={`Metronome Sound: ${TIMBRE_CONFIG[timbre].name} (${TIMBRE_CONFIG[timbre].description}) - click to change`}
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold">{TIMBRE_CONFIG[timbre].name}</span>
          </button>
        </div>

        {/* Streak, Weekly PB Badge & Library Button */}
        <div className="flex items-center gap-2">
          {/* Cyan Trophy Badge for Personal Bests */}
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
              <Trophy className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400 shrink-0" strokeWidth={2.25} />
              <span>{pbDisplayCount}</span>
            </button>

            <PersonalBestsTooltip
              isOpen={isPbTooltipOpen}
              onClose={() => setIsPbTooltipOpen(false)}
              stats={pbStats}
              displayRange={pbDisplayRange}
              onDisplayRangeChange={handlePbDisplayRangeChange}
            />
          </div>

          {/* Yellow Flame Streak Badge with Calendar Tooltip */}
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

      {/* Main Core Area: Proportional distribution without chasms */}
      <div className="flex-1 w-full max-w-md flex flex-col items-center justify-between min-h-0 py-1">
        {/* Upper Info Section: Title, Sticking & Progress Card grouped naturally */}
        <div className="shrink-0 flex flex-col items-center w-full pt-1.5 sm:pt-2">
          <div className="w-full text-center mb-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-1.5 sm:mb-2">
              {currentSkill?.title}
            </h1>

            {currentSkill?.sticking ? (
              <div className="mb-1">
                <StickingDisplay sticking={currentSkill.sticking} />
              </div>
            ) : (
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                {currentSkill?.category}
              </span>
            )}
          </div>

          {/* Hero Personal Best Target & Progress Graph */}
          <div className="w-full flex justify-center mt-2.5 sm:mt-3">
            {currentSkill && (
              <ProgressSparkline
                personalBestBpm={currentSkill.personalBestBpm}
                history={currentSkillHistory}
                startingBpm={startingBpm}
                skillTitle={currentSkill.title}
                sticking={currentSkill.sticking}
              />
            )}
          </div>
        </div>

        {/* Circular Dial Metronome: optical center */}
        <div className="flex flex-col items-center shrink-0 my-auto py-1">
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
              onSubdivisionChange={handleSubdivisionChange}
              onTripletToggle={handleTripletToggle}
            />
          </div>
        </div>

        {/* Rehearsal Notes Field */}
        <div className="shrink-0 flex flex-col items-center justify-center w-full max-w-md pt-1 pb-1">
          <SkillNotesDialog
            notes={currentSkill?.notes}
            onSaveNotes={handleUpdateNotes}
          />
        </div>

        {/* Done Button: Centered with comfortable spacing from footer */}
        <div className="shrink-0 w-full flex flex-col items-center justify-center pt-2 pb-3.5">
          <button
            type="button"
            onClick={handleDoneClick}
            className="w-[95%] max-w-[323px] py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-98 transition transform cursor-pointer"
          >
            <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
            <span>DONE (LOG PERFORMANCE)</span>
          </button>
        </div>
      </div>

      {/* Auxiliary Controls (Exit, Play/Pause, Skip) */}
      <footer className="w-full max-w-[340px] shrink-0 pt-2 pb-1.5">
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
          isFirstRun={storageManager.getSkillHistory(currentSkill.id).length === 0}
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
        onDataReloaded={handleReloadAllData}
      />
    </div>
  );
}
