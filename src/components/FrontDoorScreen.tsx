import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Flame,
  ListMusic,
  StickyNote,
  Share2,
  Sparkles,
  BookOpenCheck,
  TrendingUp,
  Keyboard,
} from 'lucide-react';
import { MIN_BPM, MAX_BPM, type PracticeSessionLog } from '../types';
import { MetronomeDaddyIcon } from './MetronomeDaddyIcon';
import { HorizontalThumbDial } from './HorizontalThumbDial';
import { TealProgressGraph } from './TealProgressGraph';

export const METRONOME_HINT_STORAGE_KEY = 'tempo_daddy_metronome_hint_dismissed';

interface FrontDoorScreenProps {
  bpm: number;
  isPlaying: boolean;
  onBpmChange: (newBpm: number | ((prev: number) => number)) => void;
  onTogglePlay: () => void;
  onEnterGym: () => void;
  isModalOpen?: boolean;
}

interface TourCardDef {
  id: string;
  badge: string;
  shortLabel: string;
  headline: string;
  quote: string;
  subtext: string;
  renderVisual: () => React.ReactNode;
}

const DEMO_GRAPH_HISTORY: PracticeSessionLog[] = [
  { id: 'd1', skillId: 'demo', date: '2026-10-20T10:00:00.000Z', bpm: 94, durationSeconds: 180, isPersonalBest: true },
  { id: 'd2', skillId: 'demo', date: '2026-10-22T10:00:00.000Z', bpm: 98, durationSeconds: 210, isPersonalBest: true },
  { id: 'd3', skillId: 'demo', date: '2026-10-25T10:00:00.000Z', bpm: 102, durationSeconds: 150, isPersonalBest: true },
  { id: 'd4', skillId: 'demo', date: '2026-10-28T10:00:00.000Z', bpm: 105, durationSeconds: 240, isPersonalBest: true },
  { id: 'd5', skillId: 'demo', date: '2026-11-01T10:00:00.000Z', bpm: 111, durationSeconds: 190, isPersonalBest: true },
  { id: 'd6', skillId: 'demo', date: '2026-11-04T10:00:00.000Z', bpm: 116, durationSeconds: 300, isPersonalBest: true },
  { id: 'd7', skillId: 'demo', date: '2026-11-07T10:00:00.000Z', bpm: 122, durationSeconds: 220, isPersonalBest: true },
  { id: 'd8', skillId: 'demo', date: '2026-11-09T10:00:00.000Z', bpm: 128, durationSeconds: 260, isPersonalBest: true },
];

const TOUR_CARDS: TourCardDef[] = [
  {
    id: 'cognitive-gym',
    badge: 'BEAT 01 • THE BRAIN GYM',
    shortLabel: 'Brain Gym',
    headline: 'Your Nervous System’s Favorite Weight Room.',
    quote:
      '“Hey champion. Let Daddy let you in on a little secret: getting ridiculously good at complex motor skills isn’t a mystical gift—it’s progressive cognitive conditioning, and it feels damn good when you do it right.”',
    subtext:
      'Backed by motor-learning research and pro musicians, Tempo Daddy turns intimidating barriers into relaxing, effortless flow states. You bring the curiosity; Daddy handles the cognitive load.',
    renderVisual: () => (
      <div className="w-full bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-4 shadow-inner">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-3">
          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Progressive Cognitive Loading
          </span>
          <span className="text-emerald-400">Relaxed Flow State</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs bg-neutral-900/90 border border-neutral-800 rounded-xl px-3 py-2">
            <span className="text-neutral-400">Old Metronomes</span>
            <span className="font-mono text-rose-400">Cold Parole Officer 😤</span>
          </div>
          <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
            <span className="text-amber-200 font-semibold">The Tempo Daddy Method</span>
            <span className="font-mono text-amber-400 font-bold">80% Warmup → PR Flow 🧠⚡</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'gym-notebook',
    badge: 'BEAT 02 • ZERO INITIATION FATIGUE',
    shortLabel: 'Gym Logbook',
    headline: 'Leave the Crumpled Notebook in Your Bag.',
    quote:
      '“What BPM did you leave off on last Tuesday? Who cares—Daddy already wrote it down. No hunting for a pencil, no setup dread, no mental math. Just press start and go.”',
    subtext:
      'Every exercise remembers your exact Personal Best, subdivision, and warmup ramp automatically so starting a session takes zero willpower.',
    renderVisual: () => (
      <div className="w-full bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-4 shadow-inner space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 uppercase">
          <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <BookOpenCheck className="w-3.5 h-3.5" /> Auto-Logged Setbook
          </span>
          <span className="text-amber-400">Ready in 1 Tap</span>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">6-Stroke Roll Inversions</div>
            <div className="text-xs font-mono text-neutral-400 mt-0.5">
              Auto-Warmup: <span className="text-amber-400 font-bold">102 BPM</span> → Target{' '}
              <span className="text-cyan-300 font-bold">128 BPM</span>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-amber-400 text-neutral-950 font-extrabold text-xs">
            GO
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'progress-charts',
    badge: 'BEAT 03 • VISUAL VELOCITY',
    shortLabel: 'Progress Charts',
    headline: 'Progress Charts That Freaking Rule.',
    quote:
      '“Day-to-day progress is almost impossible to feel when you’re in the trenches. Seeing your neural velocity graphed out across weeks of micro-sessions? Pure magic, baby.”',
    subtext:
      'Our signature Teal Progress Charts turn invisible nervous-system adaptation into an undeniable upward climb you can inspect anytime.',
    renderVisual: () => (
      <div className="w-full bg-neutral-950/90 border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(34,211,238,0.1)]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
              <TrendingUp className="w-3.5 h-3.5" /> Lifetime Velocity Graph
            </div>
            <div className="text-sm font-extrabold text-white mt-0.5">Herta Sweep Arpeggio</div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-bold">
            +34 BPM Gain
          </span>
        </div>
        <div className="flex justify-center pt-1">
          <TealProgressGraph
            history={DEMO_GRAPH_HISTORY}
            personalBestBpm={128}
            startingBpm={94}
            width={220}
            height={68}
            showLabels={true}
            interactive={false}
          />
        </div>
      </div>
    ),
  },
  {
    id: 'plus-one-trophy',
    badge: 'BEAT 04 • THE DOPAMINE ENGINE',
    shortLabel: '+1 Trophies',
    headline: '+1 BPM Gets a Trophy. Every Single Time.',
    quote:
      '“Nudge your personal best up by a single beat per minute and Daddy pops the gold hardware—because THAT is what we reward ourselves for if we want durable, persistent long-term change.”',
    subtext:
      'Your brain wires habits around immediate positive reinforcement. Celebrating micro-PRs turns discipline into an addictive game.',
    renderVisual: () => (
      <div className="w-full bg-neutral-950/90 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-[0_0_24px_rgba(251,191,36,0.12)]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
            <Trophy className="w-6 h-6 text-neutral-950 fill-neutral-950" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
              NEW PERSONAL BEST!
            </div>
            <div className="text-base font-extrabold text-white">120 → 121 BPM (+1)</div>
            <div className="text-[11px] text-neutral-400">Micro-gains compound into mastery</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'streak-calendar',
    badge: 'BEAT 05 • CONSISTENCY OVER BURNOUT',
    shortLabel: '2-Min Streaks',
    headline: 'Two Minutes Counts. Showing Up Is What Matters.',
    quote:
      '“Don’t have an hour today? Don’t sweat it, tiger. Our compact streak calendar lights up even if you lock in for just 2 minutes. Showing up is the whole damn game.”',
    subtext:
      'Keep your chain unbroken on busy days with a quick two-minute warmup set. Zero guilt, 100% momentum.',
    renderVisual: () => (
      <div className="w-full bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" /> 14-Day Momentum Streak
          </span>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            2 min = ✓
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }).map((_, idx) => (
            <div
              key={idx}
              className="h-6 rounded-md bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-[10px] font-mono font-bold text-amber-300"
            >
              ✓
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'playlists-notes-share',
    badge: 'BEAT 06 • CURATE & SHARE THE GAINS',
    shortLabel: 'Playlists & Share',
    headline: 'Playlists, Sticky Notes & 1-Link Sharing.',
    quote:
      '“Split your routines into custom playlists, pin coaching cues right onto specific exercises, and beam your workouts to students, bandmates, and disinterested strangers!”',
    subtext:
      'Switch effortlessly between morning warmups, speed sets, or teaching curricula—with instant QR and URL routine sharing.',
    renderVisual: () => (
      <div className="w-full bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-neutral-950 text-[11px] font-extrabold">
            <ListMusic className="w-3 h-3" /> Morning Chops
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-[11px] font-semibold">
            Legato Gym
          </span>
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
            <Share2 className="w-3 h-3" /> QR / Link
          </span>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 flex items-start gap-2">
          <StickyNote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-100/90">
            <span className="font-bold text-amber-300">Exercise Note:</span> Keep Pinky relaxed on beat 3 turnaround; breathe out on downbeat.
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'keyboard-shortcuts',
    badge: 'BEAT 07 • HANDS-FREE CHOPS GOD MODE',
    shortLabel: 'Shortcuts',
    headline: 'Barely Touch Your Device. Just Shred.',
    quote:
      '“Taking your hands off your instrument to poke at a glass screen kills the groove. Daddy wired every control to fast tactile hotkeys so you can focus on turning into a chops god.”',
    subtext:
      'Tap Space to start or pause, Double-Space to log your set and auto-advance, and Left/Right arrows or +/- to nudge BPM (hold for turbo steps).',
    renderVisual: () => (
      <div className="w-full bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-2.5">
          <Keyboard className="w-3.5 h-3.5" /> Zero-Look Hotkeys
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-xl p-2 shadow-sm">
            <kbd className="inline-block px-2 py-0.5 rounded bg-neutral-800 border border-neutral-600 text-[11px] font-mono font-bold text-white mb-1">
              Space
            </kbd>
            <div className="text-[11px] text-neutral-300 font-semibold">Start / Go</div>
          </div>
          <div className="bg-neutral-900 border border-amber-500/40 rounded-xl p-2 shadow-sm">
            <kbd className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[11px] font-mono font-bold text-amber-300 mb-1">
              2× Space
            </kbd>
            <div className="text-[11px] text-amber-200 font-semibold">Confirm Set</div>
          </div>
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-xl p-2 shadow-sm">
            <kbd className="inline-block px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-600 text-[11px] font-mono font-bold text-cyan-300 mb-1">
              ← → / ±
            </kbd>
            <div className="text-[11px] text-neutral-300 font-semibold">BPM (Hold ×3)</div>
          </div>
        </div>
      </div>
    ),
  },
];

const TOTAL_CARDS = 1 + TOUR_CARDS.length; // Card 0 (Metronome Daddy) + 7 Tour Guide cards = 8

export const FrontDoorScreen: React.FC<FrontDoorScreenProps> = ({
  bpm,
  isPlaying,
  onBpmChange,
  onTogglePlay,
  onEnterGym,
  isModalOpen = false,
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isHintDismissed, setIsHintDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(METRONOME_HINT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const lastBpmKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const stageSwipeRef = useRef<{ startX: number; startY: number; active: boolean }>({
    startX: 0,
    startY: 0,
    active: false,
  });
  const drawerSwipeRef = useRef<{ startY: number; active: boolean }>({
    startY: 0,
    active: false,
  });

  const goToNextCard = useCallback(() => {
    setActiveCardIndex((prev) => (prev + 1) % TOTAL_CARDS);
  }, []);

  const goToPrevCard = useCallback(() => {
    setActiveCardIndex((prev) => (prev - 1 + TOTAL_CARDS) % TOTAL_CARDS);
  }, []);

  const handleToggleMetronomeDaddy = useCallback(() => {
    if (!isHintDismissed) {
      setIsHintDismissed(true);
      try {
        localStorage.setItem(METRONOME_HINT_STORAGE_KEY, 'true');
      } catch {
        // Ignore storage write errors in private browsing
      }
    }
    onTogglePlay();
  }, [isHintDismissed, onTogglePlay]);

  // Smart Context Keyboard Shortcuts on Front Door
  useEffect(() => {
    if (isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onEnterGym();
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const now = Date.now();
        const isRapid =
          e.repeat || (lastBpmKeyRef.current.key === '+' && now - lastBpmKeyRef.current.time < 120);
        lastBpmKeyRef.current = { key: '+', time: now };
        const step = isRapid ? 3 : 1;
        onBpmChange((prev) => Math.min(MAX_BPM, prev + step));
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const now = Date.now();
        const isRapid =
          e.repeat || (lastBpmKeyRef.current.key === '-' && now - lastBpmKeyRef.current.time < 120);
        lastBpmKeyRef.current = { key: '-', time: now };
        const step = isRapid ? 3 : 1;
        onBpmChange((prev) => Math.max(MIN_BPM, prev - step));
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isPlaying) {
          const now = Date.now();
          const isRapid =
            e.repeat || (lastBpmKeyRef.current.key === '+' && now - lastBpmKeyRef.current.time < 120);
          lastBpmKeyRef.current = { key: '+', time: now };
          const step = isRapid ? 3 : 1;
          onBpmChange((prev) => Math.min(MAX_BPM, prev + step));
        } else {
          goToNextCard();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isPlaying) {
          const now = Date.now();
          const isRapid =
            e.repeat || (lastBpmKeyRef.current.key === '-' && now - lastBpmKeyRef.current.time < 120);
          lastBpmKeyRef.current = { key: '-', time: now };
          const step = isRapid ? 3 : 1;
          onBpmChange((prev) => Math.max(MIN_BPM, prev - step));
        } else {
          goToPrevCard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isPlaying, onBpmChange, onEnterGym, goToNextCard, goToPrevCard]);

  // Carousel stage swipe handlers (outside thumbdial)
  const handleStageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    stageSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      active: true,
    };
  };

  const handleStageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!stageSwipeRef.current.active) return;
    stageSwipeRef.current.active = false;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - stageSwipeRef.current.startX;
    const deltaY = touch.clientY - stageSwipeRef.current.startY;

    // Horizontal swipe takes precedence if wider than vertical motion
    if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        goToNextCard();
      } else {
        goToPrevCard();
      }
    } else if (deltaY < -55 && Math.abs(deltaY) > Math.abs(deltaX)) {
      // Strong upward swipe opens the Gym drawer
      onEnterGym();
    }
  };

  const prevCardIndex = (activeCardIndex - 1 + TOTAL_CARDS) % TOTAL_CARDS;
  const nextCardIndex = (activeCardIndex + 1) % TOTAL_CARDS;

  const getCardShortTitle = (idx: number) => {
    if (idx === 0) return 'Metronome Daddy';
    return TOUR_CARDS[idx - 1]?.shortLabel || 'Tour';
  };

  const renderPeekCardContent = (idx: number, align: 'left' | 'right') => {
    const isLeft = align === 'left';
    if (idx === 0) {
      return (
        <div
          className={`flex flex-col ${
            isLeft ? 'items-end text-right' : 'items-start text-left'
          } space-y-1.5 w-full`}
        >
          <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400/90">
            QUICK METRONOME
          </span>
          <div className="text-sm sm:text-base font-extrabold text-white/90 leading-tight">
            Metronome Daddy
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-300/80 tabular-nums">
            {bpm} <span className="text-[10px] font-normal text-neutral-400">BPM</span>
          </div>
        </div>
      );
    }

    const card = TOUR_CARDS[idx - 1];
    return (
      <div
        className={`flex flex-col ${
          isLeft ? 'items-end text-right' : 'items-start text-left'
        } space-y-1.5 w-full`}
      >
        <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400/90 line-clamp-1">
          {card.shortLabel}
        </span>
        <div className="text-xs sm:text-sm font-extrabold text-white/90 leading-snug line-clamp-3">
          {card.headline}
        </div>
        <p className="hidden sm:block text-[11px] text-neutral-400/90 italic line-clamp-2 leading-relaxed">
          {card.quote}
        </p>
      </div>
    );
  };

  return (
    <div
      style={{ paddingTop: 'var(--app-header-padding-top)' }}
      className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col justify-between items-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-black text-white select-none relative"
      onTouchStart={handleStageTouchStart}
      onTouchEnd={handleStageTouchEnd}
    >
      {/* Hidden state tracker for deterministic tests */}
      <div
        data-testid="active-card-index"
        data-index={activeCardIndex}
        className="sr-only"
      />

      {/* Top Bar: Centered Minimal Brand Title */}
      <header
        data-testid="front-door-header"
        className="w-full max-w-4xl px-5 pt-2 flex items-center justify-center z-20 shrink-0"
      >
        <button
          type="button"
          onClick={() => setActiveCardIndex(0)}
          className="flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase text-neutral-300 hover:text-amber-400 transition cursor-pointer"
          title="Return to Metronome Daddy"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          <span>TEMPO DADDY</span>
        </button>
      </header>

      {/* Center Wide Carousel Stage with Peeking Left & Right Neighbor Cards + Below-Card Pagination Pill */}
      <main className="relative w-full flex-1 flex flex-col items-center justify-center px-4 sm:px-12 overflow-hidden">
        {/* Left Peeking Neighbor Card (fades in from left edge with real content preview) */}
        <button
          type="button"
          data-testid="peek-prev-card"
          onClick={goToPrevCard}
          aria-label={`Previous card: ${getCardShortTitle(prevCardIndex)}`}
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 48%, rgba(0,0,0,1) 100%)',
            maskImage:
              'linear-gradient(to right, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 48%, rgba(0,0,0,1) 100%)',
          }}
          className="group absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 w-28 sm:w-56 landscape:w-64 h-80 sm:h-96 landscape:h-72 rounded-3xl bg-neutral-900/75 hover:bg-neutral-800/85 border border-neutral-800/90 hover:border-amber-500/45 backdrop-blur-sm flex flex-col justify-between items-end pl-8 pr-3.5 sm:pl-12 sm:pr-5 py-6 transition-all duration-300 opacity-75 hover:opacity-100 hover:translate-x-1 cursor-pointer z-10 shadow-xl"
        >
          <div className="flex items-center gap-1 text-amber-400/80 group-hover:text-amber-300 transition">
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Prev</span>
          </div>
          {renderPeekCardContent(prevCardIndex, 'left')}
          <div className="w-6 h-0.5 rounded-full bg-neutral-700 group-hover:bg-amber-400/60 transition" />
        </button>

        {/* Active Center Stage Card */}
        <div className="w-full flex items-center justify-center z-20 my-auto pointer-events-none">
          {activeCardIndex === 0 ? (
            /* CARD 0: METRONOME DADDY (50% taller, narrower card so side drawers peek clearly) */
            <div
              data-testid="metronome-daddy-card"
              className="pointer-events-auto w-[74%] max-w-[300px] sm:max-w-[340px] landscape:max-w-[310px] min-h-[420px] sm:min-h-[500px] landscape:min-h-[350px] bg-neutral-900/80 border border-neutral-800/90 rounded-3xl px-6 py-12 sm:px-10 sm:py-16 landscape:px-8 landscape:py-8 shadow-[0_20px_50px_rgba(0,0,0,0.75)] backdrop-blur-md flex flex-col items-center justify-between"
            >
              {/* Layered Metronome Icon + Giant Background BPM + Glowing Amber Ring */}
              <div className="relative flex flex-col items-center justify-center my-auto pt-4 sm:pt-6 landscape:pt-3">
                {/* 1. Glowing Amber Confirmation Ring (Fades in when active) */}
                <div
                  data-testid="metronome-amber-ring"
                  aria-hidden="true"
                  className={`absolute w-52 h-52 sm:w-60 sm:h-60 landscape:w-48 landscape:h-48 rounded-full border-[3px] border-amber-400/90 shadow-[0_0_55px_rgba(251,191,36,0.55),inset_0_0_35px_rgba(251,191,36,0.3)] transition-all duration-500 pointer-events-none ${
                    isPlaying ? 'opacity-100 scale-100 animate-pulse' : 'opacity-0 scale-90'
                  }`}
                />

                {/* 2. Giant Beautiful Number Font BEHIND the metronome (lowered slightly & doubled in scale) */}
                <div
                  data-testid="hero-bpm-display"
                  aria-label={`${bpm} BPM`}
                  className="absolute -top-2 sm:-top-3 landscape:-top-2 text-[10.5rem] sm:text-[13rem] landscape:text-[10rem] leading-none font-black font-mono tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100/90 to-neutral-600/20 drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] pointer-events-none select-none z-0"
                >
                  {bpm}
                </div>

                {/* 3. Transparent Metronome w/ Golden Mustache (Tap directly to toggle) */}
                <button
                  type="button"
                  data-testid="metronome-daddy-trigger"
                  onClick={handleToggleMetronomeDaddy}
                  aria-label={isPlaying ? 'Stop Metronome Daddy' : 'Start Metronome Daddy'}
                  aria-pressed={isPlaying}
                  className="relative z-10 mt-6 sm:mt-8 landscape:mt-5 rounded-3xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-95 transition-transform cursor-pointer group"
                >
                  <MetronomeDaddyIcon
                    isPlaying={isPlaying}
                    bpm={bpm}
                    className="w-40 h-40 sm:w-48 sm:h-48 landscape:w-36 landscape:h-36 drop-shadow-[0_14px_28px_rgba(0,0,0,0.85)] group-hover:scale-[1.02] transition-transform"
                  />
                </button>
              </div>

              <div className="w-full flex flex-col items-center pt-2">
                {/* Non-clickable "Tap to start metronome" hint (fades & disappears forever after 1st tap) */}
                <div className="h-5 flex items-center justify-center mb-3 pointer-events-none">
                  {!isHintDismissed && !isPlaying && (
                    <span
                      data-testid="tap-to-start-hint"
                      className="text-xs font-mono tracking-widest uppercase text-amber-300/85 pointer-events-none animate-pulse"
                    >
                      Tap to start metronome
                    </span>
                  )}
                </div>

                {/* Skeuomorphic Horizontal Thumbdial with isolated touch boundaries */}
                <HorizontalThumbDial bpm={bpm} onChange={onBpmChange} />
              </div>
            </div>
          ) : (
            /* CARDS 1–7: TOUR GUIDE DADDY (Adaptive 1-Col Portrait / 2-Col Landscape) */
            (() => {
              const card = TOUR_CARDS[activeCardIndex - 1];
              return (
                <article
                  key={card.id}
                  data-testid="active-tour-card"
                  className="pointer-events-auto w-[78%] max-w-[340px] sm:max-w-lg landscape:max-w-2xl bg-neutral-900/85 border border-neutral-800/90 rounded-3xl p-5 sm:p-7 landscape:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.75)] backdrop-blur-md grid grid-cols-1 landscape:grid-cols-12 gap-4 landscape:gap-6 items-center"
                >
                  {/* Left Column in Landscape / Top in Portrait: Coach Pitch */}
                  <div className="landscape:col-span-7 flex flex-col text-left space-y-2.5">
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
                      <span>{card.badge}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl landscape:text-xl font-extrabold tracking-tight text-white leading-snug">
                      {card.headline}
                    </h2>

                    <blockquote className="text-xs sm:text-sm text-amber-100/95 font-medium italic leading-relaxed border-l-2 border-amber-400/70 pl-3 py-0.5">
                      {card.quote}
                    </blockquote>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {card.subtext}
                    </p>
                  </div>

                  {/* Right Column in Landscape / Bottom in Portrait: Feature Visual Showcase */}
                  <div className="landscape:col-span-5 w-full flex items-center justify-center">
                    {card.renderVisual()}
                  </div>
                </article>
              );
            })()
          )}
        </div>

        {/* Right Peeking Neighbor Card (fades in from right edge with real content preview) */}
        <button
          type="button"
          data-testid="peek-next-card"
          onClick={goToNextCard}
          aria-label={`Next card: ${getCardShortTitle(nextCardIndex)}`}
          style={{
            WebkitMaskImage:
              'linear-gradient(to left, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 48%, rgba(0,0,0,1) 100%)',
            maskImage:
              'linear-gradient(to left, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 48%, rgba(0,0,0,1) 100%)',
          }}
          className="group absolute -right-6 sm:-right-8 top-1/2 -translate-y-1/2 w-28 sm:w-56 landscape:w-64 h-80 sm:h-96 landscape:h-72 rounded-3xl bg-neutral-900/75 hover:bg-neutral-800/85 border border-neutral-800/90 hover:border-amber-500/45 backdrop-blur-sm flex flex-col justify-between items-start pl-3.5 pr-8 sm:pl-5 sm:pr-12 py-6 transition-all duration-300 opacity-75 hover:opacity-100 hover:-translate-x-1 cursor-pointer z-10 shadow-xl"
        >
          <div className="flex items-center gap-1 text-amber-400/80 group-hover:text-amber-300 transition">
            <span className="text-[10px] font-mono uppercase tracking-wider">Next</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </div>
          {renderPeekCardContent(nextCardIndex, 'right')}
          <div className="w-6 h-0.5 rounded-full bg-neutral-700 group-hover:bg-amber-400/60 transition" />
        </button>

        {/* Glowing Carousel Position Pill: Spaced halfway between the card/dial and START TEMPO DADDY drawer */}
        <nav
          aria-label="Tour Carousel Pagination"
          className="flex items-center gap-1.5 my-auto z-20"
        >
          {Array.from({ length: TOTAL_CARDS }).map((_, idx) => {
            const isActive = idx === activeCardIndex;
            const isMetronomeCard = idx === 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveCardIndex(idx)}
                aria-label={`Go to ${getCardShortTitle(idx)}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? isMetronomeCard
                      ? 'w-6 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                      : 'w-6 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]'
                    : isMetronomeCard
                    ? 'w-2 bg-amber-400/40 hover:bg-amber-400/70'
                    : 'w-2 bg-neutral-700 hover:bg-neutral-500'
                }`}
              />
            );
          })}
        </nav>
      </main>

      {/* Bottom Centered (Non-Full-Width) Drawer Tab: "START TEMPO DADDY [space]" */}
      <footer className="w-full flex justify-center shrink-0 z-20 px-4">
        <button
          type="button"
          data-testid="enter-gym-drawer-tab"
          onClick={onEnterGym}
          onTouchStart={(e) => {
            e.stopPropagation();
            const t = e.touches[0];
            if (t) drawerSwipeRef.current = { startY: t.clientY, active: true };
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (!drawerSwipeRef.current.active) return;
            drawerSwipeRef.current.active = false;
            const t = e.changedTouches[0];
            if (t && t.clientY - drawerSwipeRef.current.startY < -20) {
              onEnterGym();
            }
          }}
          className="group relative flex flex-col items-center justify-center w-72 sm:w-80 max-w-[92vw] pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] rounded-t-2xl bg-gradient-to-t from-neutral-900 via-neutral-900/95 to-neutral-800/95 hover:from-neutral-800 hover:to-neutral-700 border-t border-x border-amber-400/45 hover:border-amber-400 shadow-[0_-8px_30px_rgba(251,191,36,0.18)] transition-all duration-200 cursor-pointer active:translate-y-0.5"
        >
          <ChevronUp className="w-4 h-4 text-amber-400 group-hover:-translate-y-0.5 transition-transform -mb-0.5" />
          <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-white group-hover:text-amber-300 transition">
            START TEMPO DADDY
          </span>
          <span className="mt-0.5 text-[11px] font-mono tracking-wider text-neutral-400 group-hover:text-amber-300 transition">
            [space]
          </span>
        </button>
      </footer>
    </div>
  );
};
