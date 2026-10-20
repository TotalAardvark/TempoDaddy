import type { Subdivision } from '../types';

interface SubdivisionControlsProps {
  subdivision: Subdivision;
  isTriplet: boolean;
  onSubdivisionChange: (sub: Subdivision) => void;
  onTripletToggle: () => void;
}

export const SubdivisionControls: React.FC<SubdivisionControlsProps> = ({
  subdivision,
  isTriplet,
  onSubdivisionChange,
  onTripletToggle,
}) => {
  const options: { value: Subdivision; label: string; desc: string }[] = [
    { value: '1/4', label: '1/4', desc: 'Quarter' },
    { value: '1/8', label: '1/8', desc: 'Eighth' },
    { value: '1/16', label: '1/16', desc: 'Sixteenth' },
  ];

  return (
    <div className="flex items-center justify-center gap-1 p-0.5 bg-neutral-900/80 border border-neutral-800/80 rounded-full backdrop-blur-sm shadow-inner">
      {/* Subdivisions Segmented Control */}
      <div className="inline-flex items-center gap-0.5">
        {options.map((opt) => {
          const isActive = subdivision === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSubdivisionChange(opt.value)}
              className={`px-2 py-0.5 text-[9.5px] font-mono font-bold rounded-full transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-neutral-950 shadow-sm shadow-amber-400/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="w-px h-2.5 bg-neutral-800" />

      {/* Triplet Toggle Button */}
      <button
        type="button"
        onClick={onTripletToggle}
        className={`px-2 py-0.5 text-[9.5px] font-mono font-bold rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
          isTriplet
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
            : 'text-neutral-400 border-transparent hover:text-white hover:bg-neutral-800/60'
        }`}
        title="Toggle Triplets"
      >
        {/* Musical Triplet Icon (three beamed notes with '3' on top) */}
        <svg
          viewBox="0 0 24 16"
          className="w-4 h-3 fill-current"
          aria-hidden="true"
        >
          {/* Triplet numeral '3' */}
          <text
            x="12"
            y="5"
            fontSize="5.5"
            fontWeight="900"
            textAnchor="middle"
            fill="currentColor"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            3
          </text>
          {/* Connecting top beam */}
          <rect x="3" y="6.5" width="18" height="1.6" rx="0.4" fill="currentColor" />
          {/* Note stems */}
          <rect x="4.2" y="7.5" width="1.3" height="6" fill="currentColor" />
          <rect x="11.3" y="7.5" width="1.3" height="6" fill="currentColor" />
          <rect x="18.5" y="7.5" width="1.3" height="6" fill="currentColor" />
          {/* Noteheads */}
          <ellipse cx="3.8" cy="13.2" rx="2" ry="1.4" transform="rotate(-20 3.8 13.2)" fill="currentColor" />
          <ellipse cx="10.9" cy="13.2" rx="2" ry="1.4" transform="rotate(-20 10.9 13.2)" fill="currentColor" />
          <ellipse cx="18.1" cy="13.2" rx="2" ry="1.4" transform="rotate(-20 18.1 13.2)" fill="currentColor" />
        </svg>
        {isTriplet && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        )}
      </button>
    </div>
  );
};
