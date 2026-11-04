import React from 'react';
import { X, ListMusic, Download } from 'lucide-react';
import { DEFAULT_IMPORTED_BPM, type SharedPlaylistBundle } from '../utils/playlistShare';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  bundle: SharedPlaylistBundle | null;
  onConfirmImport: (bundle: SharedPlaylistBundle) => void;
  onCancel: () => void;
}

export const ImportPlaylistModal: React.FC<ImportPlaylistModalProps> = ({
  isOpen,
  bundle,
  onConfirmImport,
  onCancel,
}) => {
  if (!isOpen || !bundle) return null;

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Import Playlist
              </h2>
              <p className="text-xs text-amber-400 font-semibold truncate max-w-[240px]">
                {bundle.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Skills Preview List */}
        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
            <span>Included Skills ({bundle.skills.length})</span>
            <span>Starts at {DEFAULT_IMPORTED_BPM} BPM</span>
          </div>

          {bundle.skills.map((skill, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/90 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-neutral-500">
                    {idx + 1}.
                  </span>
                  <span className="text-xs font-semibold text-white truncate">
                    {skill.t}
                  </span>
                </div>
                {skill.s && (
                  <p className="text-[11px] font-mono text-amber-400/90 mt-0.5 truncate">
                    {skill.s}
                  </p>
                )}
                {skill.n && (
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                    {skill.n}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-semibold text-neutral-300">
                  {skill.d}{skill.tr === 1 ? 'T' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-2 bg-neutral-900/95">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmImport(bundle)}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Add to My Playlists</span>
          </button>
        </div>
      </div>
    </div>
  );
};
