import React, { useState } from 'react';
import { GameData } from '../util/localStorageManager';
import { metaUpgrades, getMetaUpgrade } from '../game/data/metaUpgrades';
import { MetaUpgrade } from '../types';

interface LaboratoryModalProps {
  dataCores: number;
  metaUpgrades: { [key: string]: number };
  onUpgrade: (newData: GameData) => void;
  onRestart: () => void;
}

const LaboratoryModal: React.FC<LaboratoryModalProps> = ({ dataCores, metaUpgrades: currentLevels, onUpgrade, onRestart }) => {
  const [activeTab, setActiveTab] = useState<'core' | 'tower' | 'agent'>('core');

  const handleBuyUpgrade = (upgradeId: string) => {
    const upgrade = getMetaUpgrade(upgradeId);
    if (!upgrade) return;

    const currentLevel = currentLevels[upgradeId] || 0;
    if (currentLevel >= upgrade.costs.length) return; // Max level

    const cost = upgrade.costs[currentLevel];
    if (dataCores >= cost) {
      const newData = {
        dataCores: dataCores - cost,
        metaUpgrades: {
          ...currentLevels,
          [upgradeId]: currentLevel + 1,
        }
      };
      onUpgrade(newData);
    }
  };

  const renderUpgradeCard = (upgrade: MetaUpgrade) => {
    const currentLevel = currentLevels[upgrade.id] || 0;
    const isMaxLevel = currentLevel >= upgrade.costs.length;
    const cost = isMaxLevel ? 0 : upgrade.costs[currentLevel];
    const canAfford = dataCores >= cost;
    const isUnlockable = upgrade.category === 'tower';
    
    const getEffectText = (level: number) => {
      if (level === 0) return "없음";
      const effect = upgrade.effects[level - 1];
      if (upgrade.id === 'BUILD_COST') {
        return `${(effect * 100).toFixed(0)}% 감소`;
      }
      return `+${effect}`;
    };

    return (
      <div key={upgrade.id} className="w-72 p-4 bg-slate-800 border-2 border-slate-600 rounded-lg flex flex-col">
        <h3 className="text-xl font-bold text-cyan-300">{upgrade.name}</h3>
        <p className="text-sm text-slate-400 mt-2 flex-grow">{upgrade.description}</p>
        
        {!isUnlockable && (
          <div className="mt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">현재 레벨:</span>
              <span className="font-bold text-slate-200">{currentLevel} / {upgrade.costs.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">현재 효과:</span>
              <span className="font-bold text-green-400">{getEffectText(currentLevel)}</span>
            </div>
             {!isMaxLevel && (
              <div className="flex justify-between">
                  <span className="text-slate-400">다음 효과:</span>
                  <span className="font-bold text-green-400">{getEffectText(currentLevel + 1)}</span>
              </div>
             )}
          </div>
        )}

        <button
          onClick={() => handleBuyUpgrade(upgrade.id)}
          disabled={isMaxLevel || !canAfford}
          className={`w-full mt-4 px-4 py-2 rounded-md font-bold text-slate-900 transition-all duration-200 border-b-4 ${
            isMaxLevel ? 'bg-slate-700 text-slate-500 border-slate-800 cursor-not-allowed' :
            canAfford ? 'bg-green-500 hover:bg-green-400 border-green-700' :
            'bg-slate-600 text-slate-400 cursor-not-allowed border-slate-700'
          }`}
        >
          {isMaxLevel ? (isUnlockable ? '해금 완료' : '최대 레벨') : (isUnlockable ? `해금 (${cost} DC)`: `업그레이드 (${cost} DC)`)}
        </button>
      </div>
    );
  };

  const TABS: { id: 'core' | 'tower' | 'agent', name: string }[] = [
    { id: 'core', name: '코어 시스템' },
    { id: 'tower', name: '타워 설계도' },
    { id: 'agent', name: '에이전트 강화' },
  ];

  const upgradesForTab = metaUpgrades.filter(u => u.category === activeTab);

  return (
    <div className="pointer-events-auto absolute inset-0 bg-black/80 flex justify-center items-center backdrop-blur-sm z-50">
      <div className="bg-slate-900/80 border-2 border-cyan-500 rounded-lg p-8 text-center flex flex-col items-center gap-6 shadow-2xl shadow-cyan-500/20 max-w-5xl">
        <h1 className="text-5xl font-bold text-cyan-400" style={{ textShadow: '0 0 10px #22d3ee' }}>
          연구소
        </h1>
        <p className="text-slate-300 text-lg">획득한 데이터 코어를 사용하여 영구적인 강화를 잠금 해제하십시오.</p>
        <div className="p-2 bg-slate-800 rounded-md">
            보유 데이터 코어: <span className="font-bold text-xl text-amber-400">{dataCores}</span>
        </div>

        <div className="w-full flex justify-center border-b-2 border-slate-700 mb-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-2 text-lg font-bold transition-colors duration-200 focus:outline-none ${
                activeTab === tab.id 
                  ? 'border-b-4 border-cyan-400 text-cyan-300' 
                  : 'text-slate-400 hover:text-cyan-400 border-b-4 border-transparent'
              }`}>
              {tab.name}
            </button>
          ))}
        </div>
        
        <div className="flex justify-center items-stretch gap-6 h-72">
            {upgradesForTab.map(renderUpgradeCard)}
        </div>

        <button
          onClick={onRestart}
          className="mt-6 px-10 py-4 bg-cyan-500 text-slate-900 font-bold rounded-lg text-2xl 
                     hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-400/50 
                     transition-all duration-300 transform hover:scale-105"
        >
          전투 재개
        </button>
      </div>
    </div>
  );
};

export default LaboratoryModal;