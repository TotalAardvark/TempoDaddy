import React, { useState, useEffect, useRef } from 'react';
import { Minus, Plus, Check, Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StickingDisplay } from './StickingDisplay';

interface ConfirmSessionModalProps {
  isOpen: boolean;
  skillTitle: string;
  sticking?: string;
  initialBpm: number;
  personalBestBpm: number;
  onConfirm: (finalBpm: number) => void;
  onCancel: () => void;
}

export const ConfirmSessionModal: React.FC<ConfirmSessionModalProps> = ({
  isOpen,
  skillTitle,
  sticking,
  initialBpm,
  personalBestBpm,
  onConfirm,
  onCancel,
}) => {
  const [loggedBpm, setLoggedBpm] = useState(initialBpm);
  const lastModalBpmKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  useEffect(() => {
    if (isOpen) {
      setLoggedBpm(initialBpm);
      if (initialBpm > personalBestBpm) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    }
  }, [isOpen, initialBpm, personalBestBpm]);

  // Handle Enter/Space (single-tap to confirm), Escape to cancel, and +/- keys
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        onConfirm(loggedBpm);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const now = Date.now();
        const isRapid = lastModalBpmKeyRef.current.key === '+' && now - lastModalBpmKeyRef.current.time < 380;
        lastModalBpmKeyRef.current = { key: '+', time: now };
        const step = isRapid ? 3 : 1;
        setLoggedBpm((prev) => Math.min(320, prev + step));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const now = Date.now();
        const isRapid = lastModalBpmKeyRef.current.key === '-' && now - lastModalBpmKeyRef.current.time < 380;
        lastModalBpmKeyRef.current = { key: '-', time: now };
        const step = isRapid ? 3 : 1;
        setLoggedBpm((prev) => Math.max(30, prev - step));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loggedBpm, onConfirm, onCancel]);

  if (!isOpen) return null;

  const isNewPb = loggedBpm > personalBestBpm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center relative flex flex-col items-center">
        {/* Close / Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Skill Title */}
        <h3 className="text-lg font-bold text-white mb-0.5">{skillTitle}</h3>
        {sticking && (
          <div className="mb-4">
            <StickingDisplay sticking={sticking} className="py-0.5 px-2.5 text-xs" />
          </div>
        )}

        {/* New PB Callout */}
        {isNewPb && (
          <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded-full text-cyan-300 text-xs font-bold animate-bounce drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            <span>NEW PERSONAL BEST!</span>
          </div>
        )}

        {/* Final BPM Adjustment */}
        <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-2">
          Confirm Clean BPM Achieved
        </p>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            type="button"
            onClick={() => setLoggedBpm((prev) => Math.max(30, prev - 1))}
            className="w-12 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white flex items-center justify-center shadow-md active:scale-95 transition"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center min-w-[110px]">
            <span className="text-5xl font-black font-mono text-white tracking-tight">
              {loggedBpm}
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              Prev PB: {personalBestBpm}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setLoggedBpm((prev) => Math.min(320, prev + 1))}
            className="w-12 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white flex items-center justify-center shadow-md active:scale-95 transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={() => onConfirm(loggedBpm)}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-98 transition"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>Confirm & Next Skill</span>
        </button>

        <span className="text-[10px] text-neutral-500 mt-2 font-mono">
          Press Enter ↵ or Space to confirm • Esc to return • +/- to adjust
        </span>
      </div>
    </div>
  );
};
