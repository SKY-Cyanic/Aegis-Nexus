import { TurretSpecialization } from '../../types';

export const specializationsData: { [key: string]: TurretSpecialization } = {
  VULCAN: {
    id: 'VULCAN',
    name: '벌컨 캐논',
    description: '연사 속도를 극대화하여 단일 대상을 빠르게 파괴합니다. 공격력은 약간 감소합니다.',
    stats: {
      damage: 7,
      fireRate: 200,
      attackType: 'PROJECTILE',
    },
  },
  FLAK: {
    id: 'FLAK',
    name: '플랙 캐논',
    description: '착탄 시 폭발하는 탄환을 발사하여 좁은 범위에 광역 피해를 줍니다. 연사 속도는 감소합니다.',
    stats: {
      damage: 15,
      fireRate: 1500,
      attackType: 'FLAK',
      aoeRadius: 50,
    },
  },
};

export const specializations: TurretSpecialization[] = Object.values(specializationsData);

export const getSpecialization = (id: string): TurretSpecialization | undefined => specializationsData[id];
