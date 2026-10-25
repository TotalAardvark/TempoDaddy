import React from 'react';
import type { PracticeSessionLog } from '../types';
import { Trophy } from 'lucide-react';
import { TealProgressGraph } from './TealProgressGraph';

interface ProgressSparklineProps {
  personalBestBpm: number;
  history: PracticeSessionLog[];
  startingBpm: number;
  skillTitle?: string;
  sticking?: string;
}

export const ProgressSparkline: React.FC<ProgressSparklineProps> = ({
  personalBestBpm,
  history,
  startingBpm,
  skillTitle,
  sticking,
}) => {
  return (
    <div className="w-full max-w-[340px] bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/30 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-xl backdrop-blur transition-all">
      {/* Prominent Motivating High Score Target */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 text-xs uppercase font-mono font-bold tracking-wider text-amber-400/90">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>High Score</span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          {history.length > 0 ? (
            <>
              <span className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
                {personalBestBpm}
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-400">
                BPM
              </span>
            </>
          ) : (
            <span className="text-2xl md:text-3xl font-black font-mono tracking-tight text-neutral-400">
              ???
            </span>
          )}
        </div>
      </div>

      {/* Expanded Cyan Progress Graph */}
      <div className="shrink-0">
        <TealProgressGraph
          history={history}
          personalBestBpm={personalBestBpm}
          startingBpm={startingBpm}
          width={130}
          height={42}
          showLabels={true}
          skillTitle={skillTitle}
          sticking={sticking}
        />
      </div>
    </div>
  );
};
