import React from 'react';

interface StickingDisplayProps {
  sticking: string;
  className?: string;
  maxLength?: number;
}

export const StickingDisplay: React.FC<StickingDisplayProps> = ({ sticking, className = '', maxLength = 18 }) => {
  const isTruncated = sticking.length > maxLength;
  const displayString = isTruncated ? sticking.slice(0, maxLength).trimEnd() : sticking;
  // Parse characters into letters and spaces
  const chars = displayString.split('');

  return (
    <div
      className={`inline-flex items-baseline tracking-wider font-mono select-none px-2.5 py-0.5 rounded-lg bg-neutral-800/90 border border-neutral-700/80 shadow-inner ${className}`}
    >
      {chars.map((char, idx) => {
        if (char === ' ') {
          return <span key={idx} className="w-1.5 inline-block" />;
        }
        const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
        return (
          <span
            key={idx}
            className={
              isUpper
                ? 'font-black text-amber-300 text-xs md:text-sm drop-shadow-[0_0_6px_rgba(252,211,77,0.4)] mx-0.5'
                : 'font-normal text-neutral-400 text-[10px] md:text-xs mx-0.5'
            }
          >
            {char}
          </span>
        );
      })}
      {isTruncated && (
        <span className="font-bold text-neutral-500 tracking-normal text-xs ml-1">...</span>
      )}
    </div>
  );
};
