import { MetaUpgrade } from '../../types';

export const metaUpgradesData: { [key: string]: MetaUpgrade } = {
  STARTING_SCRAP: {
    id: 'STARTING_SCRAP',
    name: '초기 자원 증폭',
    description: '게임 시작 시 더 많은 스크랩을 가지고 시작합니다.',
    costs: [20, 40, 70, 110, 160], // Costs for level 1, 2, 3, 4, 5
    effects: [100, 150, 200, 250, 300],
    category: 'core',
  },
  CORE_HEALTH: {
    id: 'CORE_HEALTH',
    name: '코어 내구성 강화',
    description: '코어의 최대 체력을 영구적으로 증가시킵니다.',
    costs: [30, 60, 100, 150, 220],
    effects: [20, 40, 60, 80, 100],
    category: 'core',
  },
  BUILD_COST: {
    id: 'BUILD_COST',
    name: '건설 비용 절감',
    description: '모든 건물의 스크랩 건설 비용을 영구적으로 감소시킵니다.',
    costs: [50, 100, 180, 280, 400],
    effects: [0.05, 0.10, 0.15, 0.20, 0.25], // 5% discount, 10%, etc.
    category: 'core',
  },
  UNLOCK_TURRET_LASER: {
    id: 'UNLOCK_TURRET_LASER',
    name: '레이저 포탑 설계도',
    description: '레이저 포탑을 건설할 수 있게 됩니다. 단일 대상에게 지속적인 피해를 줍니다.',
    costs: [50],
    effects: [1],
    category: 'tower',
  },
  UNLOCK_TURRET_MISSILE: {
    id: 'UNLOCK_TURRET_MISSILE',
    name: '미사일 포대 설계도',
    description: '미사일 포대를 건설할 수 있게 됩니다. 강력한 광역 피해를 입힙니다.',
    costs: [100],
    effects: [1],
    category: 'tower',
  },
  UNLOCK_TURRET_SLOW: {
    id: 'UNLOCK_TURRET_SLOW',
    name: '감속 필드 생성기 설계도',
    description: '감속 필드 생성기를 건설할 수 있게 됩니다. 적의 이동 속도를 늦춥니다.',
    costs: [75],
    effects: [1],
    category: 'tower',
  },
  AGENT_BASE_DAMAGE: {
    id: 'AGENT_BASE_DAMAGE',
    name: '에이전트 화력 증강',
    description: '에이전트의 기본 공격력을 영구적으로 증가시킵니다.',
    costs: [40, 80, 130, 200, 300],
    effects: [1, 2, 3, 4, 5], // +1 damage per level
    category: 'agent',
  },
};

export const metaUpgrades: MetaUpgrade[] = Object.values(metaUpgradesData);

export const getMetaUpgrade = (id: string): MetaUpgrade | undefined => metaUpgradesData[id];