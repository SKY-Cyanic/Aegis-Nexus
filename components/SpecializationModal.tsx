import React from 'react';
import { TurretSpecialization } from '../types';

interface SpecializationModalProps {
  choices: TurretSpecialization[];
  onSelect: (choiceId: string) => void;
}

const SpecializationModal: React.FC<SpecializationModalProps> = ({ choices, onSelect }) => {
  return (
    <div className="pointer-events-auto absolute inset-0 bg-black/80 flex justify-center items-center backdrop-blur-sm z-50">
      <div className="bg-slate-900/80 border-2 border-cyan-500 rounded-lg p-10 text-center flex flex-col items-center gap-6 shadow-2xl shadow-cyan-500/20">
        <h1 className="text-5xl font-bold text-cyan-400" style={{ textShadow: '0 0 10px #22d3ee' }}>
          터렛 전문화
        </h1>
        <p className="text-slate-300 text-lg">터렛을 강화할 고유 경로를 선택하십시오. 이 선택은 영구적입니다.</p>
        <div className="mt-4 flex justify-center items-stretch gap-6">
          {choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => onSelect(choice.id)}
              className="w-72 p-6 bg-slate-800 border-2 border-slate-600 rounded-lg 
                         flex flex-col items-center text-left hover:bg-slate-700 hover:border-cyan-400 
                         transition-all duration-200 transform hover:-translate-y-2"
            >
              <h2 className="text-2xl font-bold text-cyan-300 mb-3">{choice.name}</h2>
              <p className="text-slate-400 text-sm flex-grow">{choice.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpecializationModal;
