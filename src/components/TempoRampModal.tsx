import React, { useState, useEffect } from 'react';
import { X, Check, TrendingUp, RotateCcw } from 'lucide-react';
import type { TempoRampSettings } from '../types';
import { DEFAULT_RAMP_SETTINGS } from '../storage/storageManager';

interface TempoRampModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TempoRampSettings;
  onSave: (newSettings: TempoRampSettings) => void;
}

interface DraftRampState {
  startPercent: number | '';
  targetPercent: number | '';
  measures: number | '';
  enabled: boolean;
}

export const TempoRampModal: React.FC<TempoRampModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [draft, setDraft] = useState<DraftRampState>({
    startPercent: settings.startPercent,
    targetPercent: settings.targetPercent,
    measures: settings.measures,
    enabled: settings.enabled,
  });

  useEffect(() => {
    if (isOpen) {
      setDraft({
        startPercent: settings.startPercent,
        targetPercent: settings.targetPercent,
        measures: settings.measures,
        enabled: settings.enabled,
      });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalStart = draft.startPercent === '' ? 100 : Number(draft.startPercent);
    const finalTarget = draft.targetPercent === '' ? 100 : Number(draft.targetPercent);
    const finalMeasures = draft.measures === '' ? 16 : Number(draft.measures);

    onSave({
      startPercent: Math.max(30, Math.min(150, isNaN(finalStart) ? 100 : finalStart)),
      targetPercent: Math.max(30, Math.min(150, isNaN(finalTarget) ? 100 : finalTarget)),
      measures: Math.max(1, Math.min(128, isNaN(finalMeasures) ? 16 : finalMeasures)),
      enabled: draft.enabled,
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setDraft({ ...DEFAULT_RAMP_SETTINGS });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Tempo Ramp
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-neutral-400 leading-relaxed font-sans">
          Automatically starts each exercise at a comfortable speed, then smoothly ramps up to push your tempo.
        </p>

        {/* Adjustable Variables */}
        <div className="flex flex-col gap-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5 font-mono">
          {/* Start Percentage */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300">From</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={30}
                max={150}
                placeholder="100"
                value={draft.startPercent}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    startPercent: val === '' ? '' : Number(val),
                  }));
                }}
                className="w-16 px-2 py-1 bg-neutral-900 border border-neutral-700/80 focus:border-amber-400 placeholder:text-neutral-500 text-center text-sm font-bold text-white rounded-lg outline-none"
              />
              <span className="text-xs text-amber-400 font-bold">% PB</span>
            </div>
          </div>

          {/* Target Percentage */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300">To</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={30}
                max={150}
                placeholder="100"
                value={draft.targetPercent}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    targetPercent: val === '' ? '' : Number(val),
                  }));
                }}
                className="w-16 px-2 py-1 bg-neutral-900 border border-neutral-700/80 focus:border-cyan-400 placeholder:text-neutral-500 text-center text-sm font-bold text-white rounded-lg outline-none"
              />
              <span className="text-xs text-cyan-400 font-bold">% PB</span>
            </div>
          </div>

          {/* Measures */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300">In</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={128}
                placeholder="16"
                value={draft.measures}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    measures: val === '' ? '' : Number(val),
                  }));
                }}
                className="w-16 px-2 py-1 bg-neutral-900 border border-neutral-700/80 focus:border-neutral-500 placeholder:text-neutral-500 text-center text-sm font-bold text-white rounded-lg outline-none"
              />
              <span className="text-xs text-neutral-400 font-bold">measures</span>
            </div>
          </div>
        </div>

        {/* Note on global setting & beats calculation */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <span>{((draft.measures === '' ? 16 : Number(draft.measures)) || 16) * 4} quarter beats ramp</span>
          <span>Applied globally</span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1 text-[11px] font-mono text-neutral-500 hover:text-neutral-300 transition"
            title="Reset to 80% to 90% in 16 measures"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 flex items-center gap-1.5 shadow-md shadow-amber-400/20 active:scale-95 transition"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
