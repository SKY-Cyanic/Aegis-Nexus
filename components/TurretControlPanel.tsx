import React from 'react';
import { SelectTurretPayload } from '../types';
import { gameBus } from '../bridge/eventBus';
import { GameEvent } from '../types';

interface TurretControlPanelProps {
  turret: SelectTurretPayload;
  currentScrap: number;
}

const TurretControlPanel: React.FC<TurretControlPanelProps> = ({ turret, currentScrap }) => {
  const { id, level, stats, upgradeCost, specialization } = turret;

  const handleUpgrade = () => {
    if (currentScrap >= upgradeCost && !specialization) {
      gameBus.emit(GameEvent.UPGRADE_TURRET, id);
    }
  };
  
  const canAffordUpgrade = currentScrap >= upgradeCost;
  const isMaxLevel = !!specialization || level >= 3;

  const getStatName = (key: string): string => {
    switch(key) {
      case 'damage': return '공격력';
      case 'range': return '사거리';
      case 'fireRate': return '연사 속도';
      case 'aoeRadius': return '폭발 반경';
      case 'slowAmount': return '감속 효과';
      default: return key;
    }
  };

  const formatStatValue = (key: string, value: number): string => {
    if (key === 'fireRate') return `${(1000 / value).toFixed(2)}/초`;
    if (key === 'slowAmount') return `${value * 100}%`;
    return `${Math.round(value)}`;
  }

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 p-4 bg-slate-900/80 border-2 border-cyan-500 rounded-lg w-72 shadow-lg shadow-cyan-500/20">
      <h3 className="text-lg font-bold text-cyan-400">{stats.name} {specialization ? '' : `(레벨 ${level})`}</h3>
      <div className="mt-3 space-y-2 text-sm">
        {Object.entries(stats)
            .filter(([key, value]) => typeof value === 'number' && value > 0 && !['name', 'specialization'].includes(key))
            .map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-slate-400">{getStatName(key)}:</span>
            <span className="font-bold text-slate-200">{formatStatValue(key, value as number)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <button
          onClick={handleUpgrade}
          disabled={!canAffordUpgrade || isMaxLevel}
          className={`w-full px-4 py-2 rounded-md font-bold text-slate-900 transition-all duration-200 border-b-4 ${
            isMaxLevel
              ? 'bg-slate-700 text-slate-500 border-slate-800 cursor-not-allowed'
              : canAffordUpgrade
              ? 'bg-green-500 hover:bg-green-400 border-green-700'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed border-slate-700'
          }`}
        >
          {isMaxLevel ? (specialization ? '전문화 완료' : '최대 레벨') : `업그레이드 (${upgradeCost} 스크랩)`}
        </button>
      </div>
    </div>
  );
};

export default TurretControlPanel;
