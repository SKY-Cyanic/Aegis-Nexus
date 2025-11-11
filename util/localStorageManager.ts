import { MetaUpgrade } from '../types';

const DATA_CORE_KEY = 'aegis-nexus-data-cores';
const META_UPGRADES_KEY = 'aegis-nexus-meta-upgrades';

export interface GameData {
  dataCores: number;
  metaUpgrades: { [key: string]: number }; // id: level
}

export const loadGameData = (): GameData => {
  try {
    const dataCores = parseInt(localStorage.getItem(DATA_CORE_KEY) || '0', 10);
    const metaUpgrades = JSON.parse(localStorage.getItem(META_UPGRADES_KEY) || '{}');
    return { dataCores, metaUpgrades };
  } catch (error) {
    console.error("Failed to load game data from localStorage", error);
    return { dataCores: 0, metaUpgrades: {} };
  }
};

export const saveGameData = (data: GameData) => {
  try {
    localStorage.setItem(DATA_CORE_KEY, data.dataCores.toString());
    localStorage.setItem(META_UPGRADES_KEY, JSON.stringify(data.metaUpgrades));
  } catch (error) {
    console.error("Failed to save game data to localStorage", error);
  }
};
