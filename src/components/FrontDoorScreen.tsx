import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MIN_BPM, MAX_BPM } from '../types';
import { MetronomeDaddyIcon } from './MetronomeDaddyIcon';
import { HorizontalThumbDial } from './HorizontalThumbDial';

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
  renderVisual?: () => React.ReactNode;
}

const TOUR_CARDS: TourCardDef[] = [
  {
    id: 'cognitive-gym',
    badge: 'BEAT 01/07',
    shortLabel: 'Brain Gym',
    headline: 'Your Nervous System’s Favorite Weight Room.',
    quote:
      '“Hey champion. Let me let you in on a little secret: getting ridiculously good isn\'t magic. It\'s just progressive cognitive conditioning, and it feels damn good when you do it right.”',
    subtext:
      'You bring the curiosity; Daddy handles the planning and note taking.',
  },
  {
    id: 'gym-notebook',
    badge: 'BEAT 02/07',
    shortLabel: 'Gym Logbook',
    headline: 'Leave the Crumpled Notebook in Your Bag.',
    quote:
      '“What BPM did you leave off on last Tuesday? Who cares—Daddy already wrote it down. Just press start.”',
    subtext:
      'Every exercise remembers your stats and preferences so you can jump right in.',
  },
  {
    id: 'progress-charts',
    badge: 'BEAT 03/07',
    shortLabel: 'Progress Charts',
    headline: 'Progress Charts That Freaking Rule.',
    quote:
      '“Day-to-day progress is hard to feel. Seeing your neural velocity graphed out for you? Pure magic, baby.”',
    subtext:
      'Our signature Progress Charts turns progress into an undeniable upward climb.',
  },
  {
    id: 'plus-one-trophy',
    badge: 'BEAT 04/07',
    shortLabel: '+1 Trophies',
    headline: '+1 BPM Gets a Trophy. Every Single Time.',
    quote:
      '“Even a 1 bpm improvement gets a trophy—because THAT is what we reward ourselves for if we want durable long-term change.”',
    subtext:
      'Your brain wires habits around immediate positive reinforcement. Celebrating micro-PRs turns discipline into an addictive game.',
  },
  {
    id: 'streak-calendar',
    badge: 'BEAT 05/07',
    shortLabel: '1-Min Streaks',
    headline: 'One Minute Counts. Showing Up Is What Matters.',
    quote:
      '“Don’t have an hour today? Don’t sweat it, tiger - one minute is fine. Showing up is the whole damn game.”',
    subtext:
      'Keep your chain unbroken on busy days with a quick one-minute warmup set. Zero guilt, 100% momentum.',
  },
  {
    id: 'playlists-notes-share',
    badge: 'BEAT 06/07',
    shortLabel: 'Playlists & Share',
    headline: 'Playlists, Sticky Notes & 1-Link Sharing.',
    quote:
      '“Create custom playlists, pin notes, and share your workouts to students, bandmates, and disinterested strangers!”',
    subtext:
      'Switch between morning warmups, speed sets, or teaching plans; with instant QR and URL playlist sharing.',
  },
  {
    id: 'keyboard-shortcuts',
    badge: 'BEAT 07/07',
    shortLabel: 'Shortcuts',
    headline: 'Hands on your instrument, not your phone.',
    quote:
      '“Don\'t stop the groove. Move quickly with fast keyboard shortcuts and easy tap commands.”',
    subtext:
      'Tap Space to start or pause, Double-Space to log your set and auto-advance, and Left/Right arrows or +/- to nudge BPM (hold for turbo steps).',
    renderVisual: () => (
      <div className="w-full bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-3.5">
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
const CAROUSEL_WHEEL_COOLDOWN_MS = 400;

export const FrontDoorScreen: React.FC<FrontDoorScreenProps> = ({
  bpm,
  isPlaying,
  onBpmChange,
  onTogglePlay,
  onEnterGym,
  isModalOpen = false,
}) => {
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [isIconBouncing, setIsIconBouncing] = useState<boolean>(false);
  const [isHintDismissed, setIsHintDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(METRONOME_HINT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isPhoneAspect, setIsPhoneAspect] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth && window.innerWidth < 640;
  });

  const lastBpmKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const lastCarouselWheelTimeRef = useRef<number>(0);
  const bounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsPhoneAspect(window.innerHeight > window.innerWidth && window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
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
    setSlideDirection('next');
    setActiveCardIndex((prev) => (prev + 1) % TOTAL_CARDS);
  }, []);

  const goToPrevCard = useCallback(() => {
    setSlideDirection('prev');
    setActiveCardIndex((prev) => (prev - 1 + TOTAL_CARDS) % TOTAL_CARDS);
  }, []);

  const handleToggleMetronomeDaddy = useCallback(() => {
    setIsIconBouncing(true);
    if (bounceTimeoutRef.current) clearTimeout(bounceTimeoutRef.current);
    bounceTimeoutRef.current = window.setTimeout(() => {
      setIsIconBouncing(false);
      bounceTimeoutRef.current = null;
    }, 420);

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

  const handleApparatusWheel = useCallback(
    (e: React.WheelEvent) => {
      e.stopPropagation();
      const rawDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : -e.deltaX;
      if (rawDelta === 0) return;
      const step = rawDelta < 0 ? 1 : -1;
      onBpmChange((prev) => Math.max(MIN_BPM, Math.min(MAX_BPM, prev + step)));
    },
    [onBpmChange]
  );

  const handleCarouselWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isModalOpen) return;

      const dominantDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(dominantDelta) < 15) return;

      const now = Date.now();
      if (now - lastCarouselWheelTimeRef.current < CAROUSEL_WHEEL_COOLDOWN_MS) {
        return;
      }
      lastCarouselWheelTimeRef.current = now;

      if (dominantDelta > 0) {
        goToNextCard();
      } else {
        goToPrevCard();
      }
    },
    [isModalOpen, goToNextCard, goToPrevCard]
  );

  // Smart Context Keyboard Shortcuts on Front Door
  useEffect(() => {
    if (isModalOpen) return;

    const getBpmStep = (directionKey: '+' | '-', repeat: boolean): number => {
      const now = Date.now();
      const isRapid =
        repeat ||
        (lastBpmKeyRef.current.key === directionKey && now - lastBpmKeyRef.current.time < 120);
      lastBpmKeyRef.current = { key: directionKey, time: now };
      return isRapid ? 3 : 1;
    };

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
        const step = getBpmStep('+', e.repeat);
        onBpmChange((prev) => Math.min(MAX_BPM, prev + step));
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const step = getBpmStep('-', e.repeat);
        onBpmChange((prev) => Math.max(MIN_BPM, prev - step));
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isPlaying) {
          const step = getBpmStep('+', e.repeat);
          onBpmChange((prev) => Math.min(MAX_BPM, prev + step));
        } else {
          goToNextCard();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isPlaying) {
          const step = getBpmStep('-', e.repeat);
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

  // Determine whether side peeking paddles should show in the stage margins
  // On phone aspect ratio, side paddles are hidden on tour cards (activeCardIndex !== 0)
  // to eliminate edge bleed-through and give tour text full breathing room.
  const showSidePaddles = activeCardIndex === 0 || !isPhoneAspect;

  return (
    <div
      data-testid="front-door-screen"
      style={{ paddingTop: 'var(--app-header-padding-top)' }}
      className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col justify-between items-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-black text-white select-none relative"
      onTouchStart={handleStageTouchStart}
      onTouchEnd={handleStageTouchEnd}
      onWheel={handleCarouselWheel}
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
        {/* Left Peeking Neighbor Card: Always visible on tablet/desktop and on Metronome card; hidden on phone tour cards */}
        {showSidePaddles && (
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
            className="group absolute -left-6 sm:-left-8 top-1/2 -translate-y-1/2 w-28 sm:w-56 landscape:w-64 h-80 sm:h-96 landscape:h-72 rounded-3xl bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800/90 hover:border-amber-500/45 backdrop-blur-md flex flex-col justify-between items-end pl-8 pr-3.5 sm:pl-12 sm:pr-5 py-6 transition-all duration-300 opacity-75 hover:opacity-100 hover:translate-x-1 cursor-pointer z-10 shadow-xl"
          >
            <div className="flex items-center gap-1 text-amber-400/80 group-hover:text-amber-300 transition">
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-mono uppercase tracking-wider">Prev</span>
            </div>
            {renderPeekCardContent(prevCardIndex, 'left')}
            <div className="w-6 h-0.5 rounded-full bg-neutral-700 group-hover:bg-amber-400/60 transition" />
          </button>
        )}

        {/* Active Center Stage Card */}
        <div
          key={activeCardIndex}
          className={`w-full flex items-center justify-center z-20 my-auto pointer-events-none ${
            slideDirection === 'next' ? 'animate-card-shuffle-next' : 'animate-card-shuffle-prev'
          }`}
        >
          {activeCardIndex === 0 ? (
            /* CARD 0: METRONOME DADDY (Substantial landscape depth, rich opacity, no bleed-through) */
            <div
              data-testid="metronome-daddy-card"
              className="pointer-events-auto w-[82%] sm:w-[76%] md:w-[68%] max-w-md landscape:max-w-3xl landscape:w-[88%] min-h-[530px] sm:min-h-[620px] landscape:min-h-[520px] bg-neutral-900/95 border border-neutral-800/95 rounded-3xl p-6 sm:p-10 landscape:py-10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col items-center justify-between overflow-hidden"
            >
              {/* Layered Metronome Icon + Giant Background BPM + Glowing Amber Ring */}
              <div className="relative w-full flex flex-col items-center justify-center my-auto pt-6 sm:pt-10 landscape:pt-6">
                {/* 1. Glowing Amber Confirmation Ring (Fades in when active) */}
                <div
                  data-testid="metronome-amber-ring"
                  aria-hidden="true"
                  onWheel={handleApparatusWheel}
                  className={`absolute top-1/2 -translate-y-1/2 w-[22rem] h-[22rem] sm:w-[28rem] sm:h-[28rem] landscape:w-[26rem] landscape:h-[26rem] rounded-full border-[3px] border-amber-400/90 shadow-[0_0_55px_rgba(251,191,36,0.55),inset_0_0_35px_rgba(251,191,36,0.3)] transition-all duration-500 pointer-events-auto ${
                    isPlaying ? 'opacity-100 scale-100 animate-pulse' : 'opacity-0 scale-90'
                  }`}
                />

                {/* 2. Giant Beautiful Number Font BEHIND the metronome: matches full inner width of metronome card without cutoff */}
                <div
                  className="absolute inset-x-0 -top-14 sm:-top-20 landscape:-top-16 flex items-center justify-center pointer-events-none select-none z-0"
                >
                  <span
                    data-testid="hero-bpm-display"
                    aria-label={`${bpm} BPM`}
                    onWheel={handleApparatusWheel}
                    className="pointer-events-auto text-center text-[clamp(11.25rem,36vw,21rem)] landscape:text-[clamp(9.75rem,27vw,17.25rem)] leading-none font-black font-mono tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100/90 to-neutral-600/20 drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]"
                  >
                    {bpm}
                  </span>
                </div>

                {/* 3. Transparent Metronome w/ Golden Mustache (Tap directly to toggle) */}
                <button
                  type="button"
                  data-testid="metronome-daddy-trigger"
                  onClick={handleToggleMetronomeDaddy}
                  onWheel={handleApparatusWheel}
                  onAnimationEnd={() => setIsIconBouncing(false)}
                  aria-label={isPlaying ? 'Stop Metronome Daddy' : 'Start Metronome Daddy'}
                  aria-pressed={isPlaying}
                  className={`relative z-10 mt-6 sm:mt-8 landscape:mt-6 rounded-3xl p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer group transition-transform ${
                    isIconBouncing ? 'animate-metronome-bounce' : 'active:scale-95'
                  }`}
                >
                  <MetronomeDaddyIcon
                    isPlaying={isPlaying}
                    bpm={bpm}
                    className="w-[17.5rem] h-[17.5rem] sm:w-[22.75rem] sm:h-[22.75rem] landscape:w-[21rem] landscape:h-[21rem] drop-shadow-[0_14px_28px_rgba(0,0,0,0.85)] group-hover:scale-[1.06] transition-transform duration-200 ease-out"
                  />
                </button>
              </div>

              <div className="w-full flex flex-col items-center pt-4 pb-2">
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
            /* CARDS 1–7: TOUR GUIDE DADDY (Clean hierarchy, solid background opacity, no bleed-through) */
            (() => {
              const card = TOUR_CARDS[activeCardIndex - 1];
              return (
                <article
                  key={card.id}
                  data-testid="active-tour-card"
                  className="pointer-events-auto w-[84%] max-w-[350px] sm:max-w-lg landscape:max-w-2xl bg-neutral-900/95 border border-neutral-800/95 rounded-3xl p-6 sm:p-8 landscape:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col text-left space-y-4"
                >
                  {/* Position Indicator Badge e.g. "BEAT 01/07" */}
                  <div className="inline-flex items-center text-[11px] font-mono font-bold uppercase tracking-widest text-amber-400">
                    <span>{card.badge}</span>
                  </div>

                  {/* Headline: #1 Primary */}
                  <h2 className="text-xl sm:text-2xl landscape:text-2xl font-extrabold tracking-tight text-white leading-snug">
                    {card.headline}
                  </h2>

                  {/* Yellow Quote: #2 Second Biggest, prominent and readable */}
                  <blockquote className="text-base sm:text-lg text-amber-300/95 font-medium italic leading-relaxed border-l-2 border-amber-400 pl-3.5 py-0.5">
                    {card.quote}
                  </blockquote>

                  {/* Subtext: #3 Smaller grey description */}
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    {card.subtext}
                  </p>

                  {/* Optional Example block: rendered only when present (Card 07 shortcuts) */}
                  {card.renderVisual && (
                    <div className="w-full pt-1">
                      {card.renderVisual()}
                    </div>
                  )}
                </article>
              );
            })()
          )}
        </div>

        {/* Right Peeking Neighbor Card: Always visible on tablet/desktop and on Metronome card; hidden on phone tour cards */}
        {showSidePaddles && (
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
            className="group absolute -right-6 sm:-right-8 top-1/2 -translate-y-1/2 w-28 sm:w-56 landscape:w-64 h-80 sm:h-96 landscape:h-72 rounded-3xl bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800/90 hover:border-amber-500/45 backdrop-blur-md flex flex-col justify-between items-start pl-3.5 pr-8 sm:pl-5 sm:pr-12 py-6 transition-all duration-300 opacity-75 hover:opacity-100 hover:-translate-x-1 cursor-pointer z-10 shadow-xl"
          >
            <div className="flex items-center gap-1 text-amber-400/80 group-hover:text-amber-300 transition">
              <span className="text-[10px] font-mono uppercase tracking-wider">Next</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </div>
            {renderPeekCardContent(nextCardIndex, 'right')}
            <div className="w-6 h-0.5 rounded-full bg-neutral-700 group-hover:bg-amber-400/60 transition" />
          </button>
        )}

        {/* Bottom Nav Area for Phone Aspect Tour Cards: "< Prev [Title]" and "[Title] Next >" */}
        {!showSidePaddles && (
          <div className="w-full max-w-[350px] flex items-center justify-between px-2 pt-3 pb-1 z-20">
            <button
              type="button"
              data-testid="bottom-nav-prev-card"
              onClick={goToPrevCard}
              className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-amber-400 active:text-amber-300 transition cursor-pointer max-w-[48%] truncate py-1.5"
              title={`Previous: ${getCardShortTitle(prevCardIndex)}`}
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">{getCardShortTitle(prevCardIndex)}</span>
            </button>

            <button
              type="button"
              data-testid="bottom-nav-next-card"
              onClick={goToNextCard}
              className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-amber-400 active:text-amber-300 transition cursor-pointer max-w-[48%] truncate py-1.5 justify-end"
              title={`Next: ${getCardShortTitle(nextCardIndex)}`}
            >
              <span className="truncate">{getCardShortTitle(nextCardIndex)}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            </button>
          </div>
        )}

        {/* Glowing Carousel Position Pill: Spaced halfway between the card/dial and START TEMPO DADDY drawer */}
        <nav
          aria-label="Tour Carousel Pagination"
          className="flex items-center gap-1.5 my-auto z-20 py-2"
        >
          {Array.from({ length: TOTAL_CARDS }).map((_, idx) => {
            const isActive = idx === activeCardIndex;
            const isMetronomeCard = idx === 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSlideDirection(idx > activeCardIndex ? 'next' : 'prev');
                  setActiveCardIndex(idx);
                }}
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

      {/* Bottom Centered Drawer Tab: "START TEMPO DADDY [space]" styled to match main Tempo Daddy gold glow button */}
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
          className="group relative flex flex-col items-center justify-center w-72 sm:w-80 max-w-[92vw] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] rounded-t-3xl bg-gradient-to-t from-amber-500/25 via-neutral-900/95 to-neutral-900/90 hover:from-amber-500/35 hover:to-neutral-850 border-t-2 border-x-2 border-amber-400/75 hover:border-amber-300 shadow-[0_-12px_36px_rgba(251,191,36,0.32)] transition-all duration-200 cursor-pointer active:translate-y-0.5"
        >
          {/* Subtle Top Golden Glow Bar */}
          <div className="absolute top-0 inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

          <ChevronUp className="w-4 h-4 text-amber-400 group-hover:-translate-y-0.5 transition-transform -mb-0.5" />
          <span className="text-xs sm:text-sm font-black tracking-widest uppercase text-white group-hover:text-amber-200 transition">
            START TEMPO DADDY
          </span>
          <span className="mt-0.5 text-[11px] font-mono tracking-wider text-amber-300/80 group-hover:text-amber-200 transition">
            [space]
          </span>
        </button>
      </footer>
    </div>
  );
};
