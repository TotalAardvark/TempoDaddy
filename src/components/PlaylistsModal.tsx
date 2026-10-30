import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Pencil,
  Copy,
  ListMusic,
  MoreVertical,
  Clock,
} from 'lucide-react';
import type { Playlist, Skill } from '../types';
import { storageManager } from '../storage/storageManager';

interface PlaylistsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  activePlaylistId: string;
  skills?: Skill[];
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (id: string, newName: string) => void;
  onDuplicatePlaylist: (id: string) => void;
  onDeletePlaylist: (id: string) => void;
}

export const PlaylistsModal: React.FC<PlaylistsModalProps> = ({
  isOpen,
  onClose,
  playlists,
  activePlaylistId,
  skills = [],
  onSelectPlaylist,
  onCreatePlaylist,
  onRenamePlaylist,
  onDuplicatePlaylist,
  onDeletePlaylist,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const validSkillsMap = new Map(skills.map((s) => [s.id, s]));
  const allSessions = storageManager.getSessions();

  // Helper to get the most recent practice session timestamp for a playlist
  const getLatestSessionTime = (pl: Playlist): number => {
    const validSkillIdSet = new Set(pl.skillIds.filter((id) => validSkillsMap.has(id)));
    if (validSkillIdSet.size === 0) return 0;

    let latest = 0;
    allSessions.forEach((s) => {
      if (validSkillIdSet.has(s.skillId)) {
        const t = new Date(s.date).getTime();
        if (!isNaN(t) && t > latest) {
          latest = t;
        }
      }
    });
    return latest;
  };

  // Sort playlists by most recently practiced session, falling back to playlist creation time
  const sortedPlaylists = [...playlists].sort((a, b) => {
    const sessionTimeA = getLatestSessionTime(a);
    const sessionTimeB = getLatestSessionTime(b);

    if (sessionTimeA !== sessionTimeB) {
      return sessionTimeB - sessionTimeA;
    }

    const createTimeA = new Date(a.createdAt).getTime();
    const createTimeB = new Date(b.createdAt).getTime();
    return createTimeB - createTimeA;
  });

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewPlaylistName('');
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim());
    setIsCreating(false);
    setNewPlaylistName('');
    onClose();
  };

  const handleStartRename = (pl: Playlist) => {
    setRenamingId(pl.id);
    setRenameText(pl.name);
    setActiveMenuId(null);
  };

  const handleConfirmRename = (id: string) => {
    if (renameText.trim()) {
      onRenamePlaylist(id, renameText.trim());
    }
    setRenamingId(null);
  };

  const formatLastPlayed = (pl: Playlist) => {
    const validSkillIdSet = new Set(pl.skillIds.filter((id) => validSkillsMap.has(id)));
    if (validSkillIdSet.size === 0) {
      return 'No Sessions Logged';
    }

    const playlistSessions = allSessions.filter((s) => validSkillIdSet.has(s.skillId));
    if (playlistSessions.length === 0) {
      return 'No Sessions Logged';
    }

    let latestTimestamp = 0;
    playlistSessions.forEach((s) => {
      const t = new Date(s.date).getTime();
      if (!isNaN(t) && t > latestTimestamp) {
        latestTimestamp = t;
      }
    });

    if (latestTimestamp === 0) {
      return 'No Sessions Logged';
    }

    const latestDate = new Date(latestTimestamp);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfSessionDay = new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate()).getTime();
    const diffDays = Math.round((startOfToday - startOfSessionDay) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Last practiced today';
    }

    if (diffDays === 1) {
      return 'Last practiced 1 day ago';
    }

    if (diffDays >= 2 && diffDays <= 13) {
      return `Last practiced ${diffDays} days ago`;
    }

    if (diffDays >= 14 && diffDays < 42) {
      const weeks = Math.floor(diffDays / 7);
      return `Last practiced ${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }

    // >= 42 days (6 weeks) -> switch to months
    const months = Math.max(1, Math.floor(diffDays / 30));
    return `Last practiced ${months} ${months === 1 ? 'month' : 'months'} ago`;
  };

  const playlistToDelete = confirmDeleteId ? playlists.find((p) => p.id === confirmDeleteId) : null;

  // Calculate tracks exclusively inside this playlist for delete warning
  const exclusiveTrackCount = playlistToDelete
    ? playlistToDelete.skillIds.filter((skillId) => {
        const otherPlaylists = playlists.filter((p) => p.id !== playlistToDelete.id);
        return !otherPlaylists.some((op) => op.skillIds.includes(skillId));
      }).length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Playlists & Setlists</h2>
              <p className="text-[11px] text-neutral-400">Switch, organize, or create new practice queues</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* New Playlist Action */}
          {!isCreating ? (
            <button
              type="button"
              onClick={handleStartCreate}
              className="w-full py-2.5 px-4 bg-neutral-800/80 hover:bg-neutral-800 active:bg-neutral-700 border border-dashed border-neutral-700 hover:border-amber-400/50 rounded-2xl text-xs font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition shadow-sm group"
            >
              <Plus className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Create New Playlist</span>
            </button>
          ) : (
            <form onSubmit={handleConfirmCreate} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in">
              <label className="text-[11px] text-neutral-400 block font-medium">New Playlist Name</label>
              <input
                type="text"
                autoFocus
                required
                placeholder="e.g. Gig Setlist, Weak Hand Drills..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition shadow-sm"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* List of Playlists */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] uppercase font-mono tracking-wider text-neutral-400 block mb-1">
              Your Playlists ({playlists.length})
            </span>

            {sortedPlaylists.map((pl, index) => {
              const isActive = pl.id === activePlaylistId;
              const isRenaming = renamingId === pl.id;
              const skillCount = pl.skillIds.filter((id) => validSkillsMap.has(id)).length;
              // Open menu upward for the last 2 items so it doesn't get clipped by the modal boundary
              const openUpward = sortedPlaylists.length > 2 && index >= sortedPlaylists.length - 2;

              return (
                <div
                  key={pl.id}
                  className={`relative rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-neutral-950 border-amber-500/50 shadow-md shadow-amber-500/5'
                      : 'bg-neutral-950/70 hover:bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  {isRenaming ? (
                    <div className="p-3.5 flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(pl.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmRename(pl.id)}
                        className="p-1.5 rounded-xl bg-amber-500 text-neutral-950 hover:bg-amber-400 transition"
                        title="Save name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      {/* Left: Click to Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPlaylist(pl.id);
                          onClose();
                        }}
                        className="flex-1 flex items-start gap-3 text-left group"
                      >
                        <div
                          className={`p-2 rounded-xl mt-0.5 transition ${
                            isActive
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-neutral-900 text-neutral-400 group-hover:text-amber-400 group-hover:bg-neutral-800'
                          }`}
                        >
                          <ListMusic className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white truncate group-hover:text-amber-300 transition">
                              {pl.name}
                            </span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
                            <span>{skillCount} {skillCount === 1 ? 'skill' : 'skills'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-neutral-500" />
                              {formatLastPlayed(pl)}
                            </span>
                          </div>
                        </div>
                      </button>

                      {/* Right: Menu button */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === pl.id ? null : pl.id)}
                          className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
                          title="Playlist options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === pl.id && (
                          <div
                            className={`absolute right-0 ${
                              openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                            } z-20 w-44 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-1.5 space-y-1 animate-in fade-in`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleStartRename(pl)}
                              className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2 transition"
                            >
                              <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Rename</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDuplicatePlaylist(pl.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-2 transition"
                            >
                              <Copy className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Duplicate</span>
                            </button>
                            {playlists.length > 1 && (
                              <>
                                <div className="h-[1px] bg-neutral-800 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeleteId(pl.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Delete Playlist</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Playlist Confirmation Modal */}
      {playlistToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <Trash2 className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Delete "{playlistToDelete.name}"?</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {exclusiveTrackCount > 0 ? (
                <>
                  Warning: <strong className="text-amber-400">{exclusiveTrackCount} {exclusiveTrackCount === 1 ? 'skill' : 'skills'}</strong> exist solely in this playlist and will also be deleted from your practice queue.
                </>
              ) : (
                'All skills in this playlist also exist in other playlists and will remain safely preserved.'
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePlaylist(playlistToDelete.id);
                  setConfirmDeleteId(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition shadow-sm"
              >
                Delete Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
