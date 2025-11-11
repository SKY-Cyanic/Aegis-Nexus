import { CrateReward, CrateType, CrateRewardType } from '../../types';

interface LootTableItem {
  type: CrateRewardType;
  min: number;
  max: number;
  weight: number;
  duration?: number; // for buffs
  description: (amount: number, duration?: number) => string;
}

const commonLootTable: LootTableItem[] = [
  { type: 'scrap', min: 50, max: 150, weight: 40, description: (amount) => `스크랩 x${amount}` },
  { type: 'aetherium', min: 5, max: 20, weight: 20, description: (amount) => `에테리움 x${amount}` },
  { type: 'data_cores', min: 1, max: 5, weight: 15, description: (amount) => `데이터 코어 x${amount}` },
  { type: 'buff_turret_as', min: 0.5, max: 0.5, weight: 5, duration: 60000, description: (_, duration) => `오버클럭 모듈 (${(duration || 0)/1000}초간 터렛 공속 +50%)` },
  { type: 'buff_core_invuln', min: 1, max: 1, weight: 2, duration: 30000, description: (_, duration) => `재생성 코팅 (${(duration || 0)/1000}초간 코어 무적)` },
];

const rareLootTable: LootTableItem[] = [
  { type: 'scrap', min: 200, max: 500, weight: 25, description: (amount) => `스크랩 x${amount}` },
  { type: 'aetherium', min: 25, max: 75, weight: 30, description: (amount) => `에테리움 x${amount}` },
  { type: 'data_cores', min: 10, max: 25, weight: 30, description: (amount) => `데이터 코어 x${amount}` },
  { type: 'buff_turret_as', min: 0.5, max: 0.5, weight: 10, duration: 60000, description: (_, duration) => `오버클럭 모듈 (${(duration || 0)/1000}초간 터렛 공속 +50%)` },
  { type: 'buff_core_invuln', min: 1, max: 1, weight: 5, duration: 30000, description: (_, duration) => `재생성 코팅 (${(duration || 0)/1000}초간 코어 무적)` },
];

function chooseFromTable(table: LootTableItem[]): LootTableItem {
  const totalWeight = table.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of table) {
    if (random < item.weight) {
      return item;
    }
    random -= item.weight;
  }
  // Fallback to the first item
  return table[0];
}

export function openCrate(type: CrateType): CrateReward[] {
  const table = type === 'rare' ? rareLootTable : commonLootTable;
  const numberOfItems = type === 'rare' ? 3 : 1;
  const rewards: CrateReward[] = [];

  for (let i = 0; i < numberOfItems; i++) {
    const chosenItem = chooseFromTable(table);
    const amount = chosenItem.type === 'buff_turret_as' 
        ? chosenItem.min 
        : Math.floor(Math.random() * (chosenItem.max - chosenItem.min + 1)) + chosenItem.min;
    
    rewards.push({
      type: chosenItem.type,
      amount: amount,
      duration: chosenItem.duration,
      description: chosenItem.description(amount, chosenItem.duration),
    });
  }

  return rewards;
}
