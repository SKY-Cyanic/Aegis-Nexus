import React from 'react';
import { gameBus } from '../bridge/eventBus';
import { GameEvent, StoreItem } from '../types';
import { storeItems } from '../game/data/storeItems';

interface StoreProps {
  currentScrap: number;
  currentAetherium: number;
  currentPowerUsage: number;
  maxPower: number;
  purchasedUpgrades: string[];
  costMultiplier: number;
  metaUpgrades: { [key: string]: number };
}

const Store: React.FC<StoreProps> = ({ currentScrap, currentAetherium, currentPowerUsage, maxPower, purchasedUpgrades, costMultiplier, metaUpgrades }) => {

  const handleSelectItem = (item: StoreItem) => {
    const finalCost = item.itemType === 'upgrade' ? item.cost : Math.round(item.cost * costMultiplier);
    if (currentScrap >= finalCost && currentAetherium >= (item.aetheriumCost || 0)) {
      if (item.itemType === 'building') {
        if ((item.powerCost || 0) + currentPowerUsage <= maxPower) {
          gameBus.emit(GameEvent.ENTER_PLACEMENT_MODE, item.id);
        }
      } else if (item.itemType === 'upgrade') {
        gameBus.emit(GameEvent.BUY_UPGRADE, item.id);
      }
    }
  };
  
  const unlockedTowers = {
    'TURRET_LASER': !!metaUpgrades['UNLOCK_TURRET_LASER'],
    'TURRET_MISSILE': !!metaUpgrades['UNLOCK_TURRET_MISSILE'],
    'TURRET_SLOW': !!metaUpgrades['UNLOCK_TURRET_SLOW'],
  };

  const buildings = storeItems.filter(i => {
    if (i.itemType !== 'building') return false;
    // Default buildings are always available
    if (['TURRET_AUTO_BASIC', 'BUILDING_GENERATOR', 'BUILDING_EXTRACTOR'].includes(i.id)) {
      return true;
    }
    // Check if unlockable tower is unlocked
    return unlockedTowers[i.id as keyof typeof unlockedTowers] || false;
  });

  const upgrades = storeItems.filter(i => i.itemType === 'upgrade');

  const renderItemButton = (item: StoreItem) => {
    const finalCost = item.itemType === 'upgrade' ? item.cost : Math.round(item.cost * costMultiplier);
    const canAffordScrap = currentScrap >= finalCost;
    const canAffordAetherium = currentAetherium >= (item.aetheriumCost || 0);
    const hasEnoughPower = item.itemType === 'building' ? (item.powerCost || 0) + currentPowerUsage <= maxPower : true;
    const isPurchased = item.itemType === 'upgrade' ? purchasedUpgrades.includes(item.id) : false;
    const isDisabled = !canAffordScrap || !canAffordAetherium || !hasEnoughPower || isPurchased;

    let buttonClass = 'bg-slate-600 text-slate-400 cursor-not-allowed border-slate-700';
    if (!isDisabled) {
        buttonClass = 'bg-green-500 hover:bg-green-400 border-green-700 text-slate-900';
    }
    if (isPurchased) {
        buttonClass = 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-900 text-slate-500';
    }


    return (
      <div key={item.id} className="text-center w-36 flex flex-col items-center">
        <button
          onClick={() => handleSelectItem(item)}
          disabled={isDisabled}
          className={`w-full px-3 py-2 rounded-md font-bold transition-all duration-200 border-b-4 ${buttonClass}`}
        >
          {isPurchased ? '구매 완료' : (item.itemType === 'building' ? `건설`: `구매`)}
        </button>
        <div className="text-sm font-bold text-slate-200 mt-1">{item.name}</div>
        <div className="text-xs text-slate-400 mt-1 h-10">{item.description}</div>
        <div className="flex items-center justify-center space-x-2 mt-1">
          <div className="flex items-center space-x-1">
            <span className={`font-bold ${canAffordScrap ? 'text-amber-400' : 'text-red-500'}`}>
              {finalCost}
            </span>
            <span className="text-xs text-slate-400">S</span>
          </div>
          {item.aetheriumCost !== undefined && item.aetheriumCost > 0 && (
             <div className="flex items-center space-x-1">
               <span className={`font-bold ${canAffordAetherium ? 'text-violet-400' : 'text-red-500'}`}>
                  {item.aetheriumCost}
               </span>
               <span className="text-xs text-slate-400">A</span>
            </div>
          )}
          {item.powerCost !== undefined && item.powerCost > 0 && (
            <div className="flex items-center space-x-1">
               <span className={`font-bold ${hasEnoughPower ? 'text-fuchsia-400' : 'text-red-500'}`}>
                  {item.powerCost}
               </span>
               <span className="text-xs text-slate-400">P</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto p-3 bg-slate-800/80 rounded-lg flex items-start space-x-4 border-2 border-slate-600 shadow-lg divide-x divide-slate-600">
      <div className="pr-4">
        <h3 className="text-center text-lg font-bold text-slate-300 mb-2">방어 및 유틸</h3>
        <div className="flex items-start space-x-2">
            {buildings.map(renderItemButton)}
        </div>
      </div>
      <div className="pl-4">
        <h3 className="text-center text-lg font-bold text-slate-300 mb-2">코어 업그레이드</h3>
        <div className="flex items-start space-x-2">
            {upgrades.map(renderItemButton)}
        </div>
      </div>
    </div>
  );
};

export default Store;