import React, { useState, useEffect, useRef } from 'react';
import { Cloud, CloudLightning, RefreshCw, Check, Copy, ArrowRight, AlertCircle, X } from 'lucide-react';
import {
  getStoredProfileId,
  createCloudProfile,
  loadCloudProfile,
  syncLocalToCloud,
  setStoredProfileId,
} from '../storage/cloudSync';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, onDataChanged }) => {
  const [profileId, setProfileId] = useState<string | null>(() => getStoredProfileId());
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [showLoadInput, setShowLoadInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setProfileId(getStoredProfileId());
      setErrorMessage(null);
      setSuccessMessage(null);
      setShowLoadInput(false);
      setInputCode('');
    }
  }, [isOpen]);

  // Focus input when loading existing profile input opens
  useEffect(() => {
    if (showLoadInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showLoadInput]);

  // ESC key listener & state blocking - returns to Skills Queue and intercepts other keys
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Stop all other key events from leaking to background practice hotkeys or window listeners
      e.stopPropagation();

      // Prevent Space outside of inputs from triggering page scroll or metronome
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateProfile = async () => {
    setIsCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await createCloudProfile();
      setIsCreating(false);

      if (result.success && result.profileId) {
        setProfileId(result.profileId);
        setSuccessMessage(`New profile created! Linked as "${result.profileId}".`);
        onDataChanged();
      } else {
        setErrorMessage(result.error || 'Failed to create cloud profile.');
      }
    } catch (err) {
      setIsCreating(false);
      const msg = err instanceof Error ? err.message : 'Failed to connect to Firebase.';
      setErrorMessage(msg);
    }
  };

  const handleLoadProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setIsLoadingExisting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await loadCloudProfile(inputCode.trim());
      setIsLoadingExisting(false);

      if (result.success && result.profileId) {
        setProfileId(result.profileId);
        setShowLoadInput(false);
        setInputCode('');
        setSuccessMessage(`Profile "${result.profileId}" loaded successfully!`);
        onDataChanged();
      } else {
        setErrorMessage(result.error || 'Failed to load profile.');
      }
    } catch (err) {
      setIsLoadingExisting(false);
      const msg = err instanceof Error ? err.message : 'Failed to connect to Firebase.';
      setErrorMessage(msg);
    }
  };

  const handleManualSyncNow = async () => {
    if (!profileId) return;
    setIsManualSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await syncLocalToCloud();
      setIsManualSyncing(false);

      if (result.success) {
        setSuccessMessage('Cloud sync completed!');
        onDataChanged();
      } else {
        setErrorMessage(result.error || 'Failed to sync to cloud.');
      }
    } catch (err) {
      setIsManualSyncing(false);
      const msg = err instanceof Error ? err.message : 'Failed to sync to cloud.';
      setErrorMessage(msg);
    }
  };

  const handleCopyCode = () => {
    if (!profileId) return;
    navigator.clipboard.writeText(profileId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = () => {
    if (confirm('Unlink this device from cloud sync? Your local data will remain intact.')) {
      setStoredProfileId(null);
      setProfileId(null);
      setSuccessMessage('Device unlinked from cloud profile.');
    }
  };

  const isLinked = Boolean(profileId);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Cloud Sync</h2>
              <p className="text-xs text-neutral-400">Sync profile & history across your devices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Close (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Field 1: Profile ID Status */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300">Profile ID</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  isLinked
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-neutral-800 text-neutral-500'
                }`}
              >
                {isLinked ? 'LINKED' : 'UNLINKED'}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                isLinked
                  ? 'bg-amber-950/20 border-amber-500/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate font-mono">
                <CloudLightning
                  className={`w-4 h-4 shrink-0 ${isLinked ? 'text-amber-400 animate-pulse' : 'text-neutral-600'}`}
                />
                <span className={`text-sm font-semibold tracking-wider truncate ${isLinked ? 'text-amber-200' : 'text-neutral-500'}`}>
                  {profileId ? profileId : '— No Profile Linked —'}
                </span>
              </div>

              {isLinked && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                    title="Copy Profile ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleManualSyncNow}
                    disabled={isManualSyncing}
                    className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                    title="Sync Now"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {isLinked && (
              <div className="flex items-center justify-between text-[11px] text-neutral-500 px-1 pt-0.5">
                <span>Auto-syncs local data periodically</span>
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="hover:text-rose-400 underline transition"
                >
                  Unlink device
                </button>
              </div>
            )}
          </div>

          {/* Field 2: Create New Profile */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleCreateProfile}
              disabled={isCreating}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Code & Syncing...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span>{isLinked ? 'Generate New Profile ID' : 'Create New Profile'}</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-neutral-500 text-center mt-1.5">
              Generates a simple 2-word code and pushes your local skills & history to the cloud.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-neutral-800"></div>
            <span className="flex-shrink mx-3 text-neutral-600 text-[11px] font-medium uppercase tracking-wider">or</span>
            <div className="flex-grow border-t border-neutral-800"></div>
          </div>

          {/* Field 3: Load Existing Profile */}
          <div>
            {!showLoadInput ? (
              <button
                type="button"
                onClick={() => setShowLoadInput(true)}
                className="w-full py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700/60 transition active:scale-[0.98]"
              >
                <span>Load Existing Profile</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            ) : (
              <form onSubmit={handleLoadProfileSubmit} className="space-y-2 bg-neutral-950/70 p-3 rounded-2xl border border-neutral-800">
                <label className="text-[11px] font-semibold text-neutral-400 block">
                  Enter 2-Word Profile Code:
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toLowerCase())}
                    placeholder="e.g. funky-badger"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="flex-1 bg-neutral-900 border border-neutral-750 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isLoadingExisting || !inputCode.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 rounded-xl font-bold text-xs transition flex items-center gap-1.5"
                  >
                    {isLoadingExisting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Load'}
                  </button>
                </div>
                <div className="flex justify-between items-center text-[10px] text-neutral-500 pt-0.5">
                  <span>Enter the code from your other device</span>
                  <button
                    type="button"
                    onClick={() => setShowLoadInput(false)}
                    className="text-neutral-400 hover:text-white underline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <p className="text-[11px] text-neutral-500 text-center mt-1.5">
              Connect this device to a profile created on another phone or computer.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-neutral-950/60 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500">
          <span className="text-[11px] font-mono">Press ESC to return to Queue</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
