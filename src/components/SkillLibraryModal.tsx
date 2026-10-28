import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  BookOpen,
  Sun,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Check,
  Pencil,
  Cloud,
} from 'lucide-react';
import type { Skill, PresetSkill, Subdivision } from '../types';
import { PRESET_SKILLS } from '../data/initialSkills';
import { storageManager } from '../storage/storageManager';
import { TealProgressGraph } from './TealProgressGraph';
import { SyncModal } from './SyncModal';

interface SkillLibraryModalProps {
  isOpen: boolean;
  skills: Skill[];
  onClose: () => void;
  onSelectSkillToPractice: (index: number) => void;
  onAddSkill: (newSkill: Omit<Skill, 'id' | 'createdAt' | 'order'>) => void;
  onUpdateSkill?: (id: string, updatedFields: Partial<Skill>) => void;
  onDeleteSkill: (id: string) => void;
  onReorderSkill: (fromIndex: number, toIndex: number) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHibernateSkill: (id: string) => void;
  onDataReloaded?: () => void;
}

export const SkillLibraryModal: React.FC<SkillLibraryModalProps> = ({
  isOpen,
  skills,
  onClose,
  onSelectSkillToPractice,
  onAddSkill,
  onUpdateSkill,
  onDeleteSkill,
  onReorderSkill,
  onExportData,
  onImportData,
  onHibernateSkill,
  onDataReloaded,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [hibernatedExpanded, setHibernatedExpanded] = useState(false);
  const [isReorderingMode, setIsReorderingMode] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Edit skill dialog state
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSticking, setEditSticking] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPb, setEditPb] = useState(100);
  const [editSubdivision, setEditSubdivision] = useState<Subdivision>('1/16');
  const [editIsTriplet, setEditIsTriplet] = useState(false);

  // Custom skill form state
  const [customTitle, setCustomTitle] = useState('');
  const [customSticking, setCustomSticking] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [customPb, setCustomPb] = useState<number | ''>(40);
  const [customSubdivision, setCustomSubdivision] = useState<Subdivision>('1/8');
  const [customIsTriplet, setCustomIsTriplet] = useState(false);

  // Tap tempo handling
  const customTapTimesRef = useRef<number[]>([]);
  const editTapTimesRef = useRef<number[]>([]);

  const handleCustomTap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = performance.now();
    const times = customTapTimesRef.current;
    if (times.length > 0 && now - times[times.length - 1] > 2500) {
      times.length = 0;
    }
    times.push(now);
    if (times.length > 5) {
      times.shift();
    }
    if (times.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.max(30, Math.min(300, calculatedBpm));
      setCustomPb(clampedBpm);
    }
  };

  const handleEditTap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = performance.now();
    const times = editTapTimesRef.current;
    if (times.length > 0 && now - times[times.length - 1] > 2500) {
      times.length = 0;
    }
    times.push(now);
    if (times.length > 5) {
      times.shift();
    }
    if (times.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.max(30, Math.min(300, calculatedBpm));
      setEditPb(clampedBpm);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (isSyncModalOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isAdding) {
          setIsAdding(false);
        } else if (editingSkill) {
          setEditingSkill(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isAdding, editingSkill, isSyncModalOpen, onClose]);

  if (!isOpen) return null;

  const handleAddPreset = (preset: PresetSkill) => {
    onAddSkill({
      title: preset.title,
      category: preset.category,
      sticking: preset.sticking,
      personalBestBpm: preset.defaultPb,
      subdivision: preset.subdivision,
      isTriplet: preset.isTriplet,
    });
    setIsAdding(false);
  };

  const handleOpenEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setEditTitle(skill.title);
    setEditSticking(skill.sticking || '');
    setEditNotes(skill.notes || '');
    setEditPb(skill.personalBestBpm || 80);
    setEditSubdivision(skill.subdivision || '1/16');
    setEditIsTriplet(!!skill.isTriplet);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill || !editTitle.trim()) return;

    if (onUpdateSkill) {
      onUpdateSkill(editingSkill.id, {
        title: editTitle.trim(),
        sticking: editSticking.trim() || undefined,
        notes: editNotes.trim() || undefined,
        personalBestBpm: editPb,
        subdivision: editSubdivision,
        isTriplet: editIsTriplet,
      });
    }

    setEditingSkill(null);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const tempo = typeof customPb === 'number' && !isNaN(customPb) ? customPb : 40;

    onAddSkill({
      title: customTitle.trim(),
      category: 'drumming',
      sticking: customSticking.trim() || undefined,
      notes: customNotes.trim() || undefined,
      personalBestBpm: tempo,
      subdivision: customSubdivision,
      isTriplet: customIsTriplet,
    });

    // Reset
    setCustomTitle('');
    setCustomSticking('');
    setCustomNotes('');
    setCustomPb(40);
    setCustomSubdivision('1/8');
    setCustomIsTriplet(false);
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Skills & Routine Queue</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Active Skills Queue List */}
          {(() => {
            const activeSkills = skills.filter((s) => !s.isHibernated);
            const hibernatedSkills = skills.filter((s) => s.isHibernated);

            return (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
                      Current Practice Queue ({activeSkills.length})
                    </span>

                    {/* Interactive Practice Order toggle */}
                    <button
                      type="button"
                      onClick={() => setIsReorderingMode((prev) => !prev)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 ${
                        isReorderingMode
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
                          : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700/80'
                      }`}
                      title={isReorderingMode ? 'Finish arranging practice order' : 'Change practice sequence'}
                    >
                      {isReorderingMode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-amber-400" />
                          <span>Done Reordering</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Practice Order</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeSkills.map((skill, index) => {
                      const globalIndex = skills.indexOf(skill);
                      const history = storageManager.getSkillHistory(skill.id);
                      const isEditingThisSkill = editingSkill?.id === skill.id;

                      if (isEditingThisSkill) {
                        return (
                          <div
                            key={skill.id}
                            className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 animate-in fade-in"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs uppercase font-mono font-bold text-neutral-300 flex items-center gap-1.5">
                                <Pencil className="w-3.5 h-3.5 text-amber-400" />
                                Practice Settings
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingSkill(null)}
                                className="text-xs text-neutral-500 hover:text-neutral-300"
                              >
                                Cancel
                              </button>
                            </div>

                            <form onSubmit={handleSaveEdit} className="space-y-3">
                              <div>
                                <label className="text-[11px] text-neutral-400 block mb-1">
                                  Skill or Fill Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. Single Stroke Roll"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] text-neutral-400 block mb-1">
                                  Sticking Pattern / Notation (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. R l r r L r ll (capital letters for accents)"
                                  value={editSticking}
                                  onChange={(e) => setEditSticking(e.target.value)}
                                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] text-neutral-400 block mb-1">
                                  Performance Notes (Optional)
                                </label>
                                <textarea
                                  rows={2}
                                  placeholder="e.g. Focus on even dynamic rebound..."
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-amber-400"
                                />
                              </div>

                              {/* Practice Tempo, Default Subdivision, and Triplets on the same row */}
                              <div className="grid grid-cols-12 gap-2.5 items-end">
                                <div className="col-span-5">
                                  <label className="text-[11px] text-neutral-400 block mb-1 truncate">
                                    Practice Tempo
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="30"
                                      max="300"
                                      value={editPb}
                                      onChange={(e) => setEditPb(parseInt(e.target.value) || 80)}
                                      className="w-full min-w-0 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleEditTap}
                                      title="Tap tempo"
                                      className="h-[34px] px-2.5 sm:px-3 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-neutral-950 active:border-amber-400 border border-neutral-700/80 text-white font-semibold text-xs rounded-xl transition-all duration-75 flex items-center justify-center shrink-0 shadow-sm active:scale-95 select-none"
                                    >
                                      Tap
                                    </button>
                                  </div>
                                </div>

                                <div className="col-span-5">
                                  <label className="text-[11px] text-neutral-400 block mb-1">
                                    Default Subdivision
                                  </label>
                                  <select
                                    value={editSubdivision}
                                    onChange={(e) => setEditSubdivision(e.target.value as Subdivision)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-2 text-xs text-white bg-transparent focus:outline-none focus:border-amber-400"
                                  >
                                    <option value="1/4" className="bg-neutral-900">1/4 Note</option>
                                    <option value="1/8" className="bg-neutral-900">1/8 Note</option>
                                    <option value="1/16" className="bg-neutral-900">1/16 Note</option>
                                  </select>
                                </div>

                                <div className="col-span-2 flex flex-col items-end justify-end">
                                  <label className="text-[11px] text-neutral-400 block mb-1 w-full text-right">
                                    Triplets
                                  </label>
                                  <div className="h-[34px] flex items-center justify-end w-full">
                                    <input
                                      type="checkbox"
                                      checked={editIsTriplet}
                                      onChange={(e) => setEditIsTriplet(e.target.checked)}
                                      className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingSkill(null)}
                                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-bold text-xs transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-bold text-xs transition"
                                >
                                  Save Settings
                                </button>
                              </div>
                            </form>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={skill.id}
                          className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-3 flex items-center justify-between gap-3 group hover:border-neutral-700 transition"
                        >
                          {/* Left: Pencil button to edit, Title & PB in yellow underneath */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(skill)}
                              className="w-7 h-7 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-amber-400 flex items-center justify-center shrink-0 transition"
                              title="Edit Practice Settings"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <div className="min-w-0 pr-2">
                              <div className="text-sm font-bold text-white truncate">{skill.title}</div>
                              <div className="text-xs font-mono font-bold text-amber-400">
                                Personal Best: {history.length > 0 ? skill.personalBestBpm : '???'}
                              </div>
                            </div>
                          </div>

                          {/* Middle: Cyan Progress Graph */}
                          <div className="shrink-0 hidden sm:block">
                            <TealProgressGraph
                              history={history}
                              personalBestBpm={skill.personalBestBpm}
                              skillTitle={skill.title}
                              sticking={skill.sticking}
                              width={95}
                              height={28}
                              showLabels={false}
                            />
                          </div>

                          {/* Right Controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Popped out Reorder Controls when Practice Order mode is on */}
                            {isReorderingMode && (
                              <div className="flex items-center gap-0.5 bg-neutral-900 border border-neutral-700/80 rounded-xl p-0.5 animate-in fade-in zoom-in-95 mr-1">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => {
                                    const prevActive = activeSkills[index - 1];
                                    if (prevActive) {
                                      const prevGlobalIndex = skills.indexOf(prevActive);
                                      onReorderSkill(globalIndex, prevGlobalIndex);
                                    }
                                  }}
                                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-20"
                                  title="Move earlier in queue"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === activeSkills.length - 1}
                                  onClick={() => {
                                    const nextActive = activeSkills[index + 1];
                                    if (nextActive) {
                                      const nextGlobalIndex = skills.indexOf(nextActive);
                                      onReorderSkill(globalIndex, nextGlobalIndex);
                                    }
                                  }}
                                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-20"
                                  title="Move later in queue"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Small Circular Yellow Play Button */}
                            <button
                              type="button"
                              onClick={() => onSelectSkillToPractice(globalIndex)}
                              className="w-7 h-7 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-neutral-950 flex items-center justify-center shadow-md shadow-amber-400/25 transition shrink-0"
                              title="Start Practice"
                            >
                              <Play className="w-3.5 h-3.5 fill-neutral-950 stroke-neutral-950" />
                            </button>

                            {/* Hibernate (zZz) */}
                            <button
                              type="button"
                              onClick={() => onHibernateSkill(skill.id)}
                              className="px-1.5 py-1 rounded-lg text-neutral-500 hover:text-indigo-300 hover:bg-indigo-500/10 font-mono text-[11px] font-bold tracking-tighter transition"
                              title="Hibernate Skill (pause from daily routine)"
                            >
                              zZz
                            </button>

                            {/* Delete */}
                            {skills.length > 1 && (
                              <button
                                type="button"
                                onClick={() => onDeleteSkill(skill.id)}
                                className="p-1 text-neutral-500 hover:text-red-400 transition"
                                title="Delete Skill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hibernated Skills Section */}
                {hibernatedSkills.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setHibernatedExpanded((v) => !v)}
                      className="flex items-center gap-2 w-full text-left mb-2 group"
                    >
                      {hibernatedExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                      <span className="text-xs uppercase font-mono tracking-wider text-indigo-400/80 group-hover:text-indigo-300 transition">
                        Hibernated Skills ({hibernatedSkills.length})
                      </span>
                      <span className="text-[10px] font-mono font-bold text-indigo-400/70 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        zZz
                      </span>
                    </button>

                    {hibernatedExpanded && (
                      <div className="space-y-2">
                        {hibernatedSkills.map((skill) => {
                          const history = storageManager.getSkillHistory(skill.id);
                          const isEditingThisSkill = editingSkill?.id === skill.id;

                          if (isEditingThisSkill) {
                            return (
                              <div
                                key={skill.id}
                                className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 animate-in fade-in"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs uppercase font-mono font-bold text-neutral-300 flex items-center gap-1.5">
                                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                                    Practice Settings
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSkill(null)}
                                    className="text-xs text-neutral-500 hover:text-neutral-300"
                                  >
                                    Cancel
                                  </button>
                                </div>

                                <form onSubmit={handleSaveEdit} className="space-y-3">
                                  <div>
                                    <label className="text-[11px] text-neutral-400 block mb-1">
                                      Skill or Fill Name *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. Single Stroke Roll"
                                      value={editTitle}
                                      onChange={(e) => setEditTitle(e.target.value)}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] text-neutral-400 block mb-1">
                                      Sticking Pattern / Notation (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. R l r r L r ll (capital letters for accents)"
                                      value={editSticking}
                                      onChange={(e) => setEditSticking(e.target.value)}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] text-neutral-400 block mb-1">
                                      Performance Notes (Optional)
                                    </label>
                                    <textarea
                                      rows={2}
                                      placeholder="e.g. Focus on even dynamic rebound..."
                                      value={editNotes}
                                      onChange={(e) => setEditNotes(e.target.value)}
                                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-amber-400"
                                    />
                                  </div>

                                  {/* Practice Tempo, Default Subdivision, and Triplets on the same row */}
                                  <div className="grid grid-cols-12 gap-2.5 items-end">
                                    <div className="col-span-5">
                                      <label className="text-[11px] text-neutral-400 block mb-1 truncate">
                                        Practice Tempo
                                      </label>
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          min="30"
                                          max="300"
                                          value={editPb}
                                          onChange={(e) => setEditPb(parseInt(e.target.value) || 80)}
                                          className="w-full min-w-0 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                                        />
                                        <button
                                          type="button"
                                          onClick={handleEditTap}
                                          title="Tap tempo"
                                          className="h-[34px] px-2.5 sm:px-3 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-neutral-950 active:border-amber-400 border border-neutral-700/80 text-white font-semibold text-xs rounded-xl transition-all duration-75 flex items-center justify-center shrink-0 shadow-sm active:scale-95 select-none"
                                        >
                                          Tap
                                        </button>
                                      </div>
                                    </div>

                                    <div className="col-span-5">
                                      <label className="text-[11px] text-neutral-400 block mb-1">
                                        Default Subdivision
                                      </label>
                                      <select
                                        value={editSubdivision}
                                        onChange={(e) => setEditSubdivision(e.target.value as Subdivision)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-2 text-xs text-white bg-transparent focus:outline-none focus:border-amber-400"
                                      >
                                        <option value="1/4" className="bg-neutral-900">1/4 Note</option>
                                        <option value="1/8" className="bg-neutral-900">1/8 Note</option>
                                        <option value="1/16" className="bg-neutral-900">1/16 Note</option>
                                      </select>
                                    </div>

                                    <div className="col-span-2 flex flex-col items-end justify-end">
                                      <label className="text-[11px] text-neutral-400 block mb-1 w-full text-right">
                                        Triplets
                                      </label>
                                      <div className="h-[34px] flex items-center justify-end w-full">
                                        <input
                                          type="checkbox"
                                          checked={editIsTriplet}
                                          onChange={(e) => setEditIsTriplet(e.target.checked)}
                                          className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingSkill(null)}
                                      className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-bold text-xs transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-bold text-xs transition"
                                    >
                                      Save Settings
                                    </button>
                                  </div>
                                </form>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={skill.id}
                              className="bg-neutral-950/40 border border-neutral-800/50 rounded-2xl p-3 flex items-center justify-between gap-3 opacity-75 hover:opacity-100 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(skill)}
                                  className="w-7 h-7 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-amber-400 flex items-center justify-center shrink-0 transition"
                                  title="Edit Practice Settings"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <div className="min-w-0 pr-2">
                                  <div className="text-sm font-bold text-neutral-300 truncate">{skill.title}</div>
                                  <div className="text-xs font-mono font-bold text-amber-400/80">
                                    Personal Best: {history.length > 0 ? skill.personalBestBpm : '???'}
                                  </div>
                                </div>
                              </div>

                            <div className="flex items-center gap-1">
                              {/* Wake Up */}
                              <button
                                type="button"
                                onClick={() => onHibernateSkill(skill.id)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1 border border-indigo-500/30"
                                title="Wake Up — return to active queue"
                              >
                                <Sun className="w-3 h-3" />
                                <span>Wake</span>
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => onDeleteSkill(skill.id)}
                                className="p-1 text-neutral-600 hover:text-red-400 ml-1"
                                title="Delete Skill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Add New Skill Section */}
          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full py-3.5 border-2 border-dashed border-neutral-700 hover:border-amber-400/60 rounded-2xl text-neutral-300 hover:text-white flex items-center justify-center gap-2 text-sm font-semibold transition group bg-neutral-900/40"
            >
              <Plus className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Add New Skill to Routine</span>
            </button>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-mono font-bold text-neutral-300">
                  Add New Practice Skill
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-neutral-500 hover:text-neutral-300"
                >
                  Cancel
                </button>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-900 rounded-xl mb-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className={`py-1.5 rounded-lg transition ${
                    activeTab === 'presets'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Rudiment Presets
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('custom')}
                  className={`py-1.5 rounded-lg transition ${
                    activeTab === 'custom'
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Custom Skill / Fill
                </button>
              </div>

              {/* Presets List */}
              {activeTab === 'presets' ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {PRESET_SKILLS.map((preset) => (
                    <div
                      key={preset.title}
                      className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-2.5 flex items-center justify-between hover:border-neutral-700 transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{preset.title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                            {preset.subdivision} {preset.isTriplet ? '3' : ''}
                          </span>
                        </div>
                        {preset.sticking && (
                          <div className="text-[10px] font-mono text-amber-400">
                            {preset.sticking}
                          </div>
                        )}
                        {preset.description && (
                          <div className="text-[10px] text-neutral-500">
                            {preset.description}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddPreset(preset)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-white text-xs font-semibold transition shrink-0 ml-2"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                /* Custom Skill Form */
                <form onSubmit={handleSaveCustom} className="space-y-3">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Skill or Fill Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Herta Quad Fill, Swiss Triplet Drill"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Sticking Pattern / Notation (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. R l r r L r ll (capital letters for accents)"
                      value={customSticking}
                      onChange={(e) => setCustomSticking(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Performance Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Keep left hand relaxed, focus on rebound..."
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Practice Tempo, Default Subdivision, and Triplets on the same row */}
                  <div className="grid grid-cols-12 gap-2.5 items-end">
                    <div className="col-span-5">
                      <label className="text-[11px] text-neutral-400 block mb-1 truncate">
                        Practice Tempo
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="30"
                          max="300"
                          placeholder="40"
                          value={customPb}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setCustomPb('');
                            } else {
                              const parsed = parseInt(val, 10);
                              setCustomPb(isNaN(parsed) ? '' : parsed);
                            }
                          }}
                          className="w-full min-w-0 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={handleCustomTap}
                          title="Tap tempo"
                          className="h-[34px] px-2.5 sm:px-3 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-neutral-950 active:border-amber-400 border border-neutral-700/80 text-white font-semibold text-xs rounded-xl transition-all duration-75 flex items-center justify-center shrink-0 shadow-sm active:scale-95 select-none"
                        >
                          Tap
                        </button>
                      </div>
                    </div>

                    <div className="col-span-5">
                      <label className="text-[11px] text-neutral-400 block mb-1">
                        Default Subdivision
                      </label>
                      <select
                        value={customSubdivision}
                        onChange={(e) => setCustomSubdivision(e.target.value as Subdivision)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-2 text-xs text-white bg-transparent focus:outline-none focus:border-amber-400"
                      >
                        <option value="1/4" className="bg-neutral-900">1/4 Note</option>
                        <option value="1/8" className="bg-neutral-900">1/8 Note</option>
                        <option value="1/16" className="bg-neutral-900">1/16 Note</option>
                      </select>
                    </div>

                    <div className="col-span-2 flex flex-col items-end justify-end">
                      <label className="text-[11px] text-neutral-400 block mb-1 w-full text-right">
                        Triplets
                      </label>
                      <div className="h-[34px] flex items-center justify-end w-full">
                        <input
                          type="checkbox"
                          checked={customIsTriplet}
                          onChange={(e) => setCustomIsTriplet(e.target.checked)}
                          className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-bold text-xs transition"
                  >
                    Save & Add to Queue
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer: Data Backup / Import / Cloud Sync */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onExportData}
              className="flex items-center gap-1 hover:text-white transition"
              title="Backup your practice history"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>

            <span className="text-neutral-700">•</span>

            <label className="flex items-center gap-1 hover:text-white cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportData}
                className="hidden"
              />
            </label>

            <span className="text-neutral-700">•</span>

            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition"
              title="Cloud Sync"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Profile & Sync</span>
            </button>
          </div>
        </div>
      </div>

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onDataChanged={() => {
          onDataReloaded?.();
        }}
      />
    </div>
  );
};
