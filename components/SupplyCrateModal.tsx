import React, { useState, useEffect } from 'react';
import { AcquiredCrate, CrateReward } from '../types';
import { openCrate } from '../game/data/lootTables';
import './SupplyCrateModal.css';

interface SupplyCrateModalProps {
  crate: AcquiredCrate;
  onClaim: (rewards: CrateReward[]) => void;
  onClose: () => void;
}

const SupplyCrateModal: React.FC<SupplyCrateModalProps> = ({ crate, onClaim, onClose }) => {
  const [rewards, setRewards] = useState<CrateReward[]>([]);
  const [animationState, setAnimationState] = useState<'opening' | 'revealed'>('opening');

  useEffect(() => {
    const calculatedRewards = openCrate(crate.type);
    setRewards(calculatedRewards);
    onClaim(calculatedRewards);

    const timer = setTimeout(() => {
      setAnimationState('revealed');
    }, 2000); // Animation duration

    return () => clearTimeout(timer);
  }, [crate, onClaim]);

  const crateColorClass = crate.type === 'rare' ? 'crate-rare' : 'crate-common';
  const borderColorClass = crate.type === 'rare' ? 'border-violet-500 shadow-violet-500/40' : 'border-amber-500 shadow-amber-500/40';

  return (
    <div className="pointer-events-auto absolute inset-0 bg-black/80 flex justify-center items-center backdrop-blur-sm z-50">
      <div className={`bg-slate-900/90 border-2 ${borderColorClass} rounded-lg p-10 text-center flex flex-col items-center gap-6 shadow-2xl w-full max-w-md`}>
        {animationState === 'opening' ? (
          <>
            <h1 className="text-4xl font-bold text-slate-200">보급 상자 개봉 중...</h1>
            <div className={`crate-animation-container ${crateColorClass}`}>
              <div className="crate-shaker">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-40 w-40 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 12l8 4 8-4" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400">보급품을 확인하고 있습니다.</p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold text-green-400">보급품 획득!</h1>
            <div className="w-full mt-4 space-y-3">
              {rewards.map((reward, index) => (
                <div key={index} className="bg-slate-800 p-3 rounded-lg text-left flex items-center gap-4 border border-slate-700">
                    <span className="text-2xl">
                        {reward.type === 'scrap' ? '⚙️' :
                         reward.type === 'aetherium' ? '💠' :
                         reward.type === 'data_cores' ? '💾' : '⚡️'}
                    </span>
                  <p className="text-lg text-slate-200">{reward.description}</p>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-6 px-10 py-3 bg-cyan-500 text-slate-900 font-bold rounded-lg text-xl
                         hover:bg-cyan-400 transition-all duration-300 transform hover:scale-105"
            >
              확인
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplyCrateModal;
