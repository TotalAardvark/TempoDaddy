import React, { useState } from 'react';
import { FileText, X, Check } from 'lucide-react';

interface SkillNotesDialogProps {
  notes?: string;
  onSaveNotes: (notes: string) => void;
}

export const SkillNotesDialog: React.FC<SkillNotesDialogProps> = ({
  notes = '',
  onSaveNotes,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(notes);

  const handleOpen = () => {
    setDraft(notes || '');
    setIsOpen(true);
  };

  const handleSave = () => {
    onSaveNotes(draft);
    setIsOpen(false);
  };

  return (
    <>
      {/* Inobtrusive Trigger Box */}
      <div
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        className="w-[90%] max-w-[400px] bg-neutral-900/60 hover:bg-neutral-900/90 border border-neutral-800/80 hover:border-neutral-700 rounded-xl px-3 py-2 flex items-center justify-between gap-3 text-left cursor-pointer transition shadow-sm group"
        title="Click to view or edit rehearsal notes"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400 shrink-0 transition-colors" />
          {notes && notes.trim() ? (
            <span className="text-xs text-neutral-300 truncate font-mono">
              {notes}
            </span>
          ) : (
            <span className="text-xs text-neutral-500 italic">
              + Add rehearsal or performance notes...
            </span>
          )}
        </div>
      </div>

      {/* Smooth Layer-on-Top Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-[90%] max-w-[400px] bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Rehearsal Notes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsOpen(false);
                }
              }}
              placeholder="E.g., Keep wrists relaxed on accents, watch left hand rebound, smooth transition on bar 4..."
              rows={4}
              className="w-full p-3 bg-neutral-950/80 border border-neutral-800 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/30 rounded-xl text-xs md:text-sm text-neutral-200 placeholder:text-neutral-600 outline-none resize-none font-mono"
              autoFocus
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-500 font-mono">
                ⌘+Enter to save
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
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
                  <span>Save Notes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
