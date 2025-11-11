import { PlayerUpgrade } from '../../types';

export const playerUpgradesData: { [key: string]: PlayerUpgrade } = {
  AGENT_MULTISHOT_1: {
    id: 'AGENT_MULTISHOT_1',
    name: '다중 사격',
    description: '전방으로 2개의 추가 탄환을 발사합니다.',
  },
  AGENT_PIERCING_SHOTS_1: {
    id: 'AGENT_PIERCING_SHOTS_1',
    name: '관통탄',
    description: '플레이어의 탄환이 적 1명을 관통합니다.',
  },
  AGENT_FIRE_RATE_1: {
    id: 'AGENT_FIRE_RATE_1',
    name: '연사 속도 강화',
    description: '플레이어의 공격 속도가 20% 증가합니다.',
  },
  AGENT_SPEED_1: {
    id: 'AGENT_SPEED_1',
    name: '기동성 향상',
    description: '플레이어의 이동 속도가 15% 증가합니다.',
  },
  SCRAP_MAGNET_1: {
    id: 'SCRAP_MAGNET_1',
    name: '자원 자석',
    description: '주변의 스크랩과 데이터 조각을 자동으로 수집합니다.',
  },
  CRITICAL_HITS: {
    id: 'CRITICAL_HITS',
    name: '치명타',
    description: '공격 시 20% 확률로 2배의 피해를 입힙니다.',
  },
  CHAIN_LIGHTNING: {
    id: 'CHAIN_LIGHTNING',
    name: '연쇄 번개',
    description: '공격이 적중하면 25% 확률로 주변의 다른 적에게 번개가 뻗어 나갑니다.',
  },
  CORE_REPAIR_ON_KILL: {
    id: 'CORE_REPAIR_ON_KILL',
    name: '코어 회복 프로토콜',
    description: '적 처치 시 5% 확률로 코어 내구도를 1 회복합니다.',
  },
  AETHERIUM_ON_KILL: {
    id: 'AETHERIUM_ON_KILL',
    name: '에테리움 확보',
    description: '적 처치 시 2% 확률로 에테리움을 1 획득합니다.',
  }
};

export const playerUpgrades: PlayerUpgrade[] = Object.values(playerUpgradesData);

export const getUpgrade = (id: string): PlayerUpgrade | undefined => playerUpgradesData[id];