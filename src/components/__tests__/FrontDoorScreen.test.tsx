import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { FrontDoorScreen, METRONOME_HINT_STORAGE_KEY } from '../FrontDoorScreen';
import { ColdStartScreen } from '../ColdStartScreen';
import App from '../../App';
import type { Skill } from '../../types';

describe('FrontDoorScreen & Unified Front Door (AC1–AC8)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('AC1 & AC2 & AC3: renders Card 0 (Metronome Daddy), BPM behind icon, non-clickable hint that disappears permanently on first activation, and glowing amber ring', () => {
    const TestHarness = () => {
      const [isPlaying, setIsPlaying] = useState(false);
      const [bpm, setBpm] = useState(120);
      return (
        <FrontDoorScreen
          bpm={bpm}
          isPlaying={isPlaying}
          onBpmChange={(next) => setBpm((prev) => (typeof next === 'function' ? next(prev) : next))}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onEnterGym={vi.fn()}
        />
      );
    };

    const { unmount } = render(<TestHarness />);

    // Giant BPM readout behind icon
    expect(screen.getByTestId('hero-bpm-display').textContent).toBe('120');

    // Bottom drawer button shows START TEMPO DADDY and floating [space]
    const enterBtn = screen.getByTestId('enter-gym-drawer-tab');
    expect(enterBtn.textContent).toContain('START TEMPO DADDY');
    expect(enterBtn.textContent).toContain('[space]');
    expect(enterBtn.className).toContain('w-72');
    expect(enterBtn.className).toContain('sm:w-80');

    // Hint text is visible initially and non-clickable (pointer-events-none)
    const hint = screen.getByTestId('tap-to-start-hint');
    expect(hint.textContent).toMatch(/tap to start metronome/i);
    expect(hint.className).toContain('pointer-events-none');

    // Amber ring is initially hidden (opacity-0)
    const amberRing = screen.getByTestId('metronome-amber-ring');
    expect(amberRing.className).toContain('opacity-0');

    // Click Metronome Daddy icon
    const metronomeBtn = screen.getByTestId('metronome-daddy-trigger');
    fireEvent.click(metronomeBtn);

    // Amber ring fades in
    expect(screen.getByTestId('metronome-amber-ring').className).toContain('opacity-100');

    // Hint text disappears and persists in localStorage
    expect(screen.queryByTestId('tap-to-start-hint')).toBeNull();
    expect(localStorage.getItem(METRONOME_HINT_STORAGE_KEY)).toBe('true');

    // Stop metronome -> hint remains gone
    fireEvent.click(metronomeBtn);
    expect(screen.queryByTestId('tap-to-start-hint')).toBeNull();

    // Unmount and remount -> hint is still gone on subsequent visits
    unmount();
    render(<TestHarness />);
    expect(screen.queryByTestId('tap-to-start-hint')).toBeNull();
  });

  it('AC4: skeuomorphic HorizontalThumbDial adjusts BPM on horizontal drag without triggering carousel swipe', () => {
    const TestHarness = () => {
      const [bpm, setBpm] = useState(120);
      return (
        <FrontDoorScreen
          bpm={bpm}
          isPlaying={false}
          onBpmChange={(next) => setBpm((prev) => (typeof next === 'function' ? next(prev) : next))}
          onTogglePlay={vi.fn()}
          onEnterGym={vi.fn()}
        />
      );
    };

    render(<TestHarness />);

    const thumbDial = screen.getByTestId('horizontal-thumb-dial');
    expect(screen.getByTestId('active-card-index').getAttribute('data-index')).toBe('0');

    // Drag thumbdial right by 50px
    fireEvent.pointerDown(thumbDial, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(thumbDial, { clientX: 150, pointerId: 1 });
    fireEvent.pointerUp(thumbDial, { clientX: 150, pointerId: 1 });

    // BPM should have increased from 120
    const updatedBpm = Number(screen.getByTestId('hero-bpm-display').textContent);
    expect(updatedBpm).toBeGreaterThan(120);

    // Carousel must still be on Card 0 (no accidental swipe leak)
    expect(screen.getByTestId('active-card-index').getAttribute('data-index')).toBe('0');
  });

  it('AC5 & AC6: loops seamlessly across all 8 cards (Card 0 Metronome + Cards 1–7 Tour Guide including Progress Charts and Keyboard Shortcuts)', () => {
    render(
      <FrontDoorScreen
        bpm={120}
        isPlaying={false}
        onBpmChange={vi.fn()}
        onTogglePlay={vi.fn()}
        onEnterGym={vi.fn()}
      />
    );

    const getIndex = () => Number(screen.getByTestId('active-card-index').getAttribute('data-index'));
    expect(getIndex()).toBe(0);

    // Navigate left from 0 -> wraps to 7 (Keyboard Shortcuts card)
    fireEvent.click(screen.getByTestId('peek-prev-card'));
    expect(getIndex()).toBe(7);
    expect(screen.getByTestId('active-tour-card').textContent).toMatch(/chops god|space/i);

    // Navigate right from 7 -> wraps back to 0
    fireEvent.click(screen.getByTestId('peek-next-card'));
    expect(getIndex()).toBe(0);

    // Step through 1..7 and verify each beat
    // Card 1: Universal Cognitive Gym
    fireEvent.click(screen.getByTestId('peek-next-card'));
    expect(getIndex()).toBe(1);
    expect(screen.getByTestId('active-tour-card').textContent).toMatch(/progressive cognitive conditioning/i);

    // Card 2: Zero Initiation Fatigue / Automatic Logbook
    fireEvent.click(screen.getByTestId('peek-next-card'));
    expect(getIndex()).toBe(2);
    expect(screen.getByTestId('active-tour-card').textContent).toMatch(/notebook/i);

    // Card 3: Dedicated Progress Charts beat
    fireEvent.click(screen.getByTestId('peek-next-card'));
    expect(getIndex()).toBe(3);
    expect(screen.getByTestId('active-tour-card').textContent).toMatch(/chart|graph|rewire/i);

    // Card 4: +1 BPM Trophy Dopamine Engine
    fireEvent.click(screen.getByTestId('peek-next-card'));
    expect(getIndex()).toBe(4);
    expect(screen.getByTestId('active-tour-card').textContent).toMatch(/\+1 BPM/i);

    // Card 5: 2-Minute Streak Calendar
    fireEvent.click(screen.getByTestId('peek-next-card'));
    expect(getIndex()).toBe(5);
    expect(screen.getByTestId('active-tour-card').textContent).toMatch(/two minutes|2 minutes|showing up/i);

    // Card 6: Playlists, Notes & Sharing
    fireEvent.click(screen.getByTestId('peek-next-card'));
    expect(getIndex()).toBe(6);
    expect(screen.getByTestId('active-tour-card').textContent).toMatch(/playlist|disinterested strangers/i);

    // Card 7: Keyboard Shortcuts
    fireEvent.click(screen.getByTestId('peek-next-card'));
    expect(getIndex()).toBe(7);
    expect(screen.getByTestId('active-tour-card').textContent).toMatch(/double-space|space/i);
  });

  it('AC7: Smart Context Keyboard Shortcuts (Space enters gym, Arrows cycle when paused and adjust BPM when playing, +/- always adjusts BPM)', () => {
    const onEnterGym = vi.fn();

    const TestHarness = ({ initialPlaying = false }: { initialPlaying?: boolean }) => {
      const [isPlaying, setIsPlaying] = useState(initialPlaying);
      const [bpm, setBpm] = useState(120);
      return (
        <FrontDoorScreen
          bpm={bpm}
          isPlaying={isPlaying}
          onBpmChange={(next) => setBpm((prev) => (typeof next === 'function' ? next(prev) : next))}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onEnterGym={onEnterGym}
        />
      );
    };

    render(<TestHarness initialPlaying={false} />);

    // 1. When paused: ArrowRight advances carousel to Card 1, ArrowLeft returns to Card 0
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('active-card-index').getAttribute('data-index')).toBe('1');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('active-card-index').getAttribute('data-index')).toBe('0');

    // 2. When paused: '+' and '-' still adjust BPM
    fireEvent.keyDown(window, { key: '+' });
    expect(screen.getByTestId('hero-bpm-display').textContent).toBe('121');
    fireEvent.keyDown(window, { key: '-' });
    expect(screen.getByTestId('hero-bpm-display').textContent).toBe('120');

    // 3. Start Metronome Daddy ticking -> ArrowRight and ArrowLeft now adjust BPM instead of cycling cards
    fireEvent.click(screen.getByTestId('metronome-daddy-trigger'));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('active-card-index').getAttribute('data-index')).toBe('0');
    expect(screen.getByTestId('hero-bpm-display').textContent).toBe('121');

    // Hold repeat ArrowRight -> increments by 3
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true });
    expect(screen.getByTestId('hero-bpm-display').textContent).toBe('124');

    // 4. Space key triggers onEnterGym
    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    expect(onEnterGym).toHaveBeenCalledTimes(1);
  });

  it('AC8: ColdStartScreen respects isActive guard and allows returning to Front Door via Escape or top handle', () => {
    const onStart = vi.fn();
    const onReturnToFrontDoor = vi.fn();
    const mockSkill: Skill = {
      id: 's1',
      title: 'Single Paradiddle',
      category: 'drumming',
      personalBestBpm: 120,
      subdivision: '1/16',
      isTriplet: false,
      order: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    const { rerender } = render(
      <ColdStartScreen
        firstSkill={mockSkill}
        streak={3}
        pbDisplayRange="allTime"
        onPbDisplayRangeChange={vi.fn()}
        onStart={onStart}
        onOpenLibrary={vi.fn()}
        isActive={false}
        onReturnToFrontDoor={onReturnToFrontDoor}
      />
    );

    // When isActive is false (Front Door is open), pressing Space does NOT fire ColdStartScreen.onStart
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(onStart).not.toHaveBeenCalled();

    // When isActive is true (Gym drawer is open):
    rerender(
      <ColdStartScreen
        firstSkill={mockSkill}
        streak={3}
        pbDisplayRange="allTime"
        onPbDisplayRangeChange={vi.fn()}
        onStart={onStart}
        onOpenLibrary={vi.fn()}
        isActive={true}
        onReturnToFrontDoor={onReturnToFrontDoor}
      />
    );

    // Pressing Escape calls onReturnToFrontDoor and does NOT start workout
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onReturnToFrontDoor).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();

    // Clicking top drawer return handle calls onReturnToFrontDoor and does NOT start workout
    fireEvent.click(screen.getByTestId('return-to-front-door'));
    expect(onReturnToFrontDoor).toHaveBeenCalledTimes(2);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('App Integration: starts on Front Door with default 67 BPM, centered header, Metronome Daddy card, pagination below card, and slides Gym drawer up on Space', () => {
    render(<App />);

    // Default Front Door BPM is 67
    expect(screen.getByTestId('hero-bpm-display').textContent).toBe('67');

    // Metronome Daddy is enclosed in a taller, narrower styled grey card so it doesn't crowd side drawers
    const metronomeCard = screen.getByTestId('metronome-daddy-card');
    expect(metronomeCard.className).toContain('bg-neutral-900/80');
    expect(metronomeCard.className).toContain('border-neutral-800/90');
    expect(metronomeCard.className).toContain('rounded-3xl');
    expect(metronomeCard.className).toContain('min-h-[420px]');
    expect(metronomeCard.className).toContain('max-w-[300px]');

    // Left and right peeking cards display actual preview headlines fading in from the sides
    const prevPeek = screen.getByTestId('peek-prev-card');
    const nextPeek = screen.getByTestId('peek-next-card');
    expect(prevPeek.textContent).toMatch(/Barely Touch Your Device/i);
    expect(nextPeek.textContent).toMatch(/Weight Room/i);

    // Compact skeuomorphic dial dimensions (1/3 height -> h-4, 1/2 width -> w-28 sm:w-32)
    const thumbDial = screen.getByTestId('horizontal-thumb-dial');
    expect(thumbDial.className).toContain('h-4');
    expect(thumbDial.className).toContain('w-28');

    // Header centers TEMPO DADDY and does not contain pagination nav
    const header = screen.getByTestId('front-door-header');
    expect(header.className).toContain('justify-center');
    const pagination = screen.getByRole('navigation', { name: /tour carousel pagination/i });
    expect(header.contains(pagination)).toBe(false);

    const drawer = screen.getByTestId('gym-drawer-container');
    expect(drawer.getAttribute('aria-hidden')).toBe('true');
    expect(drawer.className).toContain('translate-y-full');

    // Press Space on Front Door -> opens Gym drawer without skipping ColdStartScreen
    fireEvent.keyDown(window, { code: 'Space', key: ' ' });
    expect(drawer.getAttribute('aria-hidden')).toBe('false');
    expect(drawer.className).toContain('translate-y-0');
    expect(screen.getByText('Daily Routine Ready')).toBeTruthy();

    // Press Escape -> closes Gym drawer back to Front Door
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(drawer.getAttribute('aria-hidden')).toBe('true');
    expect(drawer.className).toContain('translate-y-full');
  });
});
