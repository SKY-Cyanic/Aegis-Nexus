import React from 'react';
import { PlayerUpgrade } from '../types';

interface LevelUpModalProps {
  choices: PlayerUpgrade[];
  onSelect: (upgradeId: string) => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ choices, onSelect }) => {
  return (
    <div className="pointer-events-auto absolute inset-0 bg-black/80 flex justify-center items-center backdrop-blur-sm z-50">
      <div className="bg-slate-900/80 border-2 border-cyan-500 rounded-lg p-10 text-center flex flex-col items-center gap-6 shadow-2xl shadow-cyan-500/20">
        <h1 className="text-5xl font-bold text-cyan-400" style={{ textShadow: '0 0 10px #22d3ee' }}>
          에이전트 진화
        </h1>
        <p className="text-slate-300 text-lg">새로운 프로토콜을 선택하여 전투 효율을 증대시키십시오.</p>
        <div className="mt-4 flex justify-center items-stretch gap-6">
          {choices.map((upgrade) => (
            <button
              key={upgrade.id}
              onClick={() => onSelect(upgrade.id)}
              className="w-64 p-6 bg-slate-800 border-2 border-slate-600 rounded-lg 
                         flex flex-col items-center text-left hover:bg-slate-700 hover:border-cyan-400 
                         transition-all duration-200 transform hover:-translate-y-2"
            >
              <h2 className="text-xl font-bold text-cyan-300 mb-3">{upgrade.name}</h2>
              <p className="text-slate-400 text-sm flex-grow">{upgrade.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LevelUpModal;
