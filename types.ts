export const GameEvent = {
  UPDATE_SCRAP: 'UPDATE_SCRAP',
  UPDATE_AETHERIUM: 'UPDATE_AETHERIUM',
  UPDATE_CORE_HEALTH: 'UPDATE_CORE_HEALTH',
  UPDATE_POWER: 'UPDATE_POWER',
  UPDATE_CORE_SHIELD: 'UPDATE_CORE_SHIELD',
  GAME_OVER: 'GAME_OVER',
  ENTER_PLACEMENT_MODE: 'ENTER_PLACEMENT_MODE',
  CANCEL_PLACEMENT_MODE: 'CANCEL_PLACEMENT_MODE',
  BUY_UPGRADE: 'BUY_UPGRADE',
  UPGRADE_PURCHASED: 'UPGRADE_PURCHASED',
  GAME_EVENT_START: 'GAME_EVENT_START',
  SELECT_TURRET: 'SELECT_TURRET',
  UPGRADE_TURRET: 'UPGRADE_TURRET',
  DESELECT_TURRET: 'DESELECT_TURRET',
  PLAYER_XP_UPDATE: 'PLAYER_XP_UPDATE',
  PLAYER_LEVEL_UP: 'PLAYER_LEVEL_UP',
  APPLY_PLAYER_UPGRADE: 'APPLY_PLAYER_UPGRADE',
  PROMPT_SPECIALIZATION: 'PROMPT_SPECIALIZATION',
  APPLY_TURRET_SPECIALIZATION: 'APPLY_TURRET_SPECIALIZATION',
  SUPPLY_CRATE_ACQUIRED: 'SUPPLY_CRATE_ACQUIRED',
  APPLY_CRATE_REWARD: 'APPLY_CRATE_REWARD',
  ADD_DATA_CORES: 'ADD_DATA_CORES',
} as const;

export type PlayerUpgrade = {
  id: string;
  name: string;
  description: string;
};

export type MetaUpgrade = {
  id:string;
  name: string;
  description: string;
  costs: number[]; // cost for each level
  effects: number[]; // effect value for each level
  category: 'core' | 'tower' | 'agent';
};

export type TurretSpecialization = {
    id: string;
    name: string;
    description: string;
    stats: Partial<TurretStats>;
};

export type TurretStats = {
  name: string;
  damage: number;
  range: number;
  fireRate: number; // ms between shots
  attackType: 'PROJECTILE' | 'LASER' | 'MISSILE' | 'SLOW' | 'FLAK';
  aoeRadius?: number; // for missiles
  slowAmount?: number; // for slow fields
  specialization?: string;
};

export type EnemyType = 'BASIC' | 'RUSHER' | 'ARTILLERY' | 'HEALER' | 'BOMBER' | 'TITAN' | 'SABOTEUR';

export type EnemyStats = {
  type: EnemyType;
  health: number;
  speed: number;
  damage: number; // Damage dealt to core
  fireRate?: number; // For ranged enemies
  range?: number; // For ranged enemies
  texture: string;
  healAmount?: number; // for healers
  healRadius?: number; // for healers
  healRate?: number; // for healers
  aoeDamage?: number; // for bombers
  aoeRadius?: number; // for bombers
  volleySize?: number; // for titan
  volleyDelay?: number; // for titan
  disableDuration?: number; // for saboteur
};


export type StoreItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  aetheriumCost?: number;
  texture: string;
  itemType: 'building' | 'upgrade';
  powerCost?: number;
  powerGeneration?: number;
  placementRadius?: number; // Min distance from other objects
  validBuildRadius?: number; // Range within which it can be built from the core
  stats?: Partial<TurretStats>;
};

export type SelectTurretPayload = {
  id: number;
  level: number;
  stats: TurretStats;
  upgradeCost: number;
  x: number;
  y: number;
  specialization?: string;
};


export type GameEventPayload = {
  title: string;
  message: string;
};

export type PowerPayload = {
  usage: number;
  max: number;
};

export type ShieldPayload = {
  current: number;
  max: number;
};

export type XpPayload = {
  current: number;
  required: number;
};

export type GameOverPayload = {
    survivalTime: number; // in seconds
};

// --- Supply Crate System Types ---
export type CrateType = 'common' | 'rare';

export type AcquiredCrate = {
  id: number;
  type: CrateType;
};

export type CrateRewardType = 'scrap' | 'aetherium' | 'data_cores' | 'buff_turret_as' | 'buff_core_invuln';

export type CrateReward = {
  type: CrateRewardType;
  amount: number;
  duration?: number; // in milliseconds for buffs
  description: string;
};
