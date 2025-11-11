import React from 'react';
import { AcquiredCrate } from '../types';

interface CrateDisplayProps {
  crates: AcquiredCrate[];
  onOpen: () => void;
}

const CrateDisplay: React.FC<CrateDisplayProps> = ({ crates, onOpen }) => {
  const crateCount = crates.length;
  if (crateCount === 0) {
    return null;
  }

  const nextCrateType = crates[0]?.type;

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      <button
        onClick={onOpen}
        className={`relative w-20 h-20 rounded-lg border-2 flex items-center justify-center
                   transition-all duration-300 transform hover:scale-110 hover:shadow-2xl
                   ${nextCrateType === 'rare' ? 'bg-slate-800 border-violet-500 hover:shadow-violet-500/50' : 'bg-slate-700 border-slate-500 hover:shadow-amber-500/50'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 ${nextCrateType === 'rare' ? 'text-violet-400' : 'text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12l8 4 8-4" />
        </svg>

        <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-slate-900">
          {crateCount}
        </div>
      </button>
      <div className="text-center text-sm font-bold text-slate-300 bg-slate-900/70 px-2 py-1 rounded">상자 열기</div>
    </div>
  );
};

export default CrateDisplay;
