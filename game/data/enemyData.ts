import { EnemyStats, EnemyType } from '../../types';

export const enemyData: { [key in EnemyType]: Omit<EnemyStats, 'type'> } = {
  BASIC: {
    health: 20,
    speed: 100,
    damage: 10,
    texture: 'enemy_basic_texture',
  },
  RUSHER: {
    health: 15,
    speed: 180,
    damage: 8,
    texture: 'enemy_rusher_texture',
  },
  ARTILLERY: {
    health: 30,
    speed: 60,
    damage: 0, // Deals damage via projectiles
    fireRate: 2500,
    range: 400,
    texture: 'enemy_artillery_texture',
  },
  HEALER: {
    health: 50,
    speed: 70,
    damage: 5,
    healAmount: 10,
    healRadius: 100,
    healRate: 3000,
    texture: 'enemy_healer_texture',
  },
  BOMBER: {
    health: 25,
    speed: 90,
    damage: 75, // High damage to core on impact
    texture: 'enemy_bomber_texture',
    aoeDamage: 30, // Damage to other enemies on death
    aoeRadius: 80,
  },
  TITAN: {
    health: 5000,
    speed: 30,
    damage: 100, // High damage to core on impact
    fireRate: 8000,
    range: 500,
    texture: 'enemy_titan_texture',
    volleySize: 8,
    volleyDelay: 100,
  },
  SABOTEUR: {
      health: 40,
      speed: 160,
      damage: 0,
      texture: 'enemy_saboteur_texture',
      disableDuration: 5000, // ms
  }
};
