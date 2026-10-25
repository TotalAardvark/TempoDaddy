import React from 'react';
import { Save, Trash2, X, TrendingUp } from 'lucide-react';
import type { PracticeSessionLog } from '../types';
import { TealProgressGraph } from './TealProgressGraph';
import { StickingDisplay } from './StickingDisplay';

interface ExitPromptModalProps {
  isOpen: boolean;
  skillTitle: string;
  sticking?: string;
  currentBpm: number;
  personalBestBpm: number;
  history: PracticeSessionLog[];
  startingBpm?: number;
  onLogAndExit: () => void;
  onDiscardAndExit: () => void;
  onCancel: () => void;
}

export const ExitPromptModal: React.FC<ExitPromptModalProps> = ({
  isOpen,
  skillTitle,
  sticking,
  currentBpm,
  personalBestBpm,
  history,
  startingBpm,
  onLogAndExit,
  onDiscardAndExit,
  onCancel,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDiscardAndExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDiscardAndExit]);

  if (!isOpen) return null;

  const isNewPb = currentBpm > personalBestBpm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-5 flex flex-col shadow-2xl text-center">
        {/* Current Exercise Summary Card */}
        <div className="w-full bg-neutral-950/70 border border-neutral-800/90 rounded-2xl p-3.5 mb-5 text-left">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
            <span className="uppercase font-semibold tracking-wider text-neutral-500">Current Exercise</span>
            <span className="text-amber-400 font-bold">PB: {personalBestBpm} BPM</span>
          </div>

          <div className="text-sm font-bold text-white mb-1 truncate">{skillTitle}</div>

          {sticking && (
            <div className="mb-2">
              <StickingDisplay sticking={sticking} className="py-0.5 px-2 text-[10px]" />
            </div>
          )}

          {/* Tempo & Cyan Progress Graph */}
          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-neutral-400 font-mono uppercase">Current Tempo</div>
              <div className="text-base font-black font-mono text-white flex items-center gap-1.5">
                <span>{currentBpm} BPM</span>
                {isNewPb && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-sans font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    New PB!
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <TealProgressGraph
                history={history}
                personalBestBpm={personalBestBpm}
                currentBpm={currentBpm}
                startingBpm={startingBpm}
                skillTitle={skillTitle}
                sticking={sticking}
                width={120}
                height={32}
                showLabels={true}
              />
            </div>
          </div>
        </div>

        {/* 3 Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {/* Option 1: Log & Exit */}
          <button
            type="button"
            onClick={onLogAndExit}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>Log & Exit ({currentBpm} BPM)</span>
          </button>

          {/* Option 2: Discard & Exit */}
          <button
            type="button"
            onClick={onDiscardAndExit}
            className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 border border-neutral-700 text-neutral-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Discard & Exit</span>
          </button>

          {/* Option 3: Cancel (Keep Practicing) */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/60 font-medium text-xs flex items-center justify-center gap-1.5 transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel (Keep Practicing)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

