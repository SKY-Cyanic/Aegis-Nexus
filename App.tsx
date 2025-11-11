import React, { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { launch } from './game/main';
import { gameBus } from './bridge/eventBus';
import { GameEvent, PowerPayload, ShieldPayload, SelectTurretPayload, XpPayload, PlayerUpgrade, GameOverPayload, TurretSpecialization, CrateType, AcquiredCrate, CrateReward } from './types';
import HUD from './components/HUD';
import GameOverModal from './components/GameOverModal';
import Store from './components/Store';
import EventNotifier from './components/EventNotifier';
import TurretControlPanel from './components/TurretControlPanel';
import LevelUpModal from './components/LevelUpModal';
import LaboratoryModal from './components/ArsenalModal';
import SpecializationModal from './components/SpecializationModal';
import CrateDisplay from './components/CrateDisplay';
import SupplyCrateModal from './components/SupplyCrateModal';
import { loadGameData, saveGameData, GameData } from './util/localStorageManager';
import { getMetaUpgrade } from './game/data/metaUpgrades';

const App: React.FC = () => {
  const [scrap, setScrap] = useState(0);
  const [aetherium, setAetherium] = useState(0);
  const [coreHealth, setCoreHealth] = useState(100);
  const [power, setPower] = useState<PowerPayload>({ usage: 0, max: 0 });
  const [shield, setShield] = useState<ShieldPayload>({ current: 0, max: 0 });
  const [purchasedUpgrades, setPurchasedUpgrades] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [selectedTurret, setSelectedTurret] = useState<SelectTurretPayload | null>(null);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [playerXp, setPlayerXp] = useState<XpPayload>({ current: 0, required: 100 });
  const [isLevelUp, setIsLevelUp] = useState(false);
  const [upgradeChoices, setUpgradeChoices] = useState<PlayerUpgrade[]>([]);
  const gameInstance = useRef<Phaser.Game | null>(null);
  
  // Meta Progression State
  const [gameData, setGameData] = useState<GameData>({ dataCores: 0, metaUpgrades: {} });
  const [isLaboratoryOpen, setIsLaboratoryOpen] = useState(false);
  const [lastRunDataCores, setLastRunDataCores] = useState(0);

  // Turret Specialization State
  const [isSpecializing, setIsSpecializing] = useState(false);
  const [specializationChoices, setSpecializationChoices] = useState<TurretSpecialization[]>([]);
  const [targetTurretId, setTargetTurretId] = useState<number | null>(null);

  // Supply Crate State
  const [acquiredCrates, setAcquiredCrates] = useState<AcquiredCrate[]>([]);
  const [isCrateModalOpen, setIsCrateModalOpen] = useState(false);
  const [crateToOpen, setCrateToOpen] = useState<AcquiredCrate | null>(null);


  useEffect(() => {
    setGameData(loadGameData());

    const metaUpgradePayload = { metaUpgrades: loadGameData().metaUpgrades };
    gameInstance.current = launch('game-container', metaUpgradePayload);

    const handleUpdateScrap = (newScrap: number) => setScrap(newScrap);
    const handleUpdateAetherium = (newAetherium: number) => setAetherium(newAetherium);
    const handleUpdateCoreHealth = (newHealth: number) => setCoreHealth(newHealth);
    const handleUpdatePower = (newPower: PowerPayload) => setPower(newPower);
    const handleUpdateShield = (newShield: ShieldPayload) => setShield(newShield);
    const handleUpgradePurchased = (upgradeId: string) => {
      setPurchasedUpgrades(prev => [...prev, upgradeId]);
    };
    const handleGameOver = (payload: GameOverPayload) => {
        const dataCoresEarned = Math.floor(payload.survivalTime / 10); // 1 DC per 10 seconds
        setLastRunDataCores(dataCoresEarned);
        setGameData(prevData => {
            const newData = {
                ...prevData,
                dataCores: prevData.dataCores + dataCoresEarned
            };
            saveGameData(newData);
            return newData;
        });
        setIsGameOver(true);
    };
    const handleSelectTurret = (payload: SelectTurretPayload) => setSelectedTurret(payload);
    const handleDeselectTurret = () => setSelectedTurret(null);
    const handleXpUpdate = (payload: XpPayload) => setPlayerXp(payload);
    const handleLevelUp = ({ level, choices }: { level: number; choices: PlayerUpgrade[] }) => {
      setPlayerLevel(level);
      setUpgradeChoices(choices);
      setIsLevelUp(true);
    };
    const handlePromptSpecialization = ({ turretId, choices }: { turretId: number, choices: TurretSpecialization[] }) => {
        setTargetTurretId(turretId);
        setSpecializationChoices(choices);
        setIsSpecializing(true);
    };
    const handleAcquireCrate = ({ type }: { type: CrateType }) => {
      setAcquiredCrates(prev => [...prev, { id: Date.now() + Math.random(), type }]);
    };
    const handleAddDataCores = (amount: number) => {
        setGameData(prevData => {
            const newData = {
                ...prevData,
                dataCores: prevData.dataCores + amount
            };
            saveGameData(newData);
            return newData;
        });
    }

    const subs = [
      gameBus.on(GameEvent.UPDATE_SCRAP, handleUpdateScrap),
      gameBus.on(GameEvent.UPDATE_AETHERIUM, handleUpdateAetherium),
      gameBus.on(GameEvent.UPDATE_CORE_HEALTH, handleUpdateCoreHealth),
      gameBus.on(GameEvent.UPDATE_POWER, handleUpdatePower),
      gameBus.on(GameEvent.UPDATE_CORE_SHIELD, handleUpdateShield),
      gameBus.on(GameEvent.UPGRADE_PURCHASED, handleUpgradePurchased),
      gameBus.on(GameEvent.GAME_OVER, handleGameOver),
      gameBus.on(GameEvent.SELECT_TURRET, handleSelectTurret),
      gameBus.on(GameEvent.DESELECT_TURRET, handleDeselectTurret),
      gameBus.on(GameEvent.PLAYER_XP_UPDATE, handleXpUpdate),
      gameBus.on(GameEvent.PLAYER_LEVEL_UP, handleLevelUp),
      gameBus.on(GameEvent.PROMPT_SPECIALIZATION, handlePromptSpecialization),
      gameBus.on(GameEvent.SUPPLY_CRATE_ACQUIRED, handleAcquireCrate),
      gameBus.on(GameEvent.ADD_DATA_CORES, handleAddDataCores),
    ];

    return () => {
      subs.forEach(unsub => unsub());
      gameInstance.current?.destroy(true);
      gameInstance.current = null;
    };
  }, []);

  const handleRestart = () => {
    setIsGameOver(false);
    setIsLaboratoryOpen(false);
    setScrap(0);
    setAetherium(0);
    setCoreHealth(100);
    setPower({ usage: 0, max: 0 });
    setShield({ current: 0, max: 0 });
    setPurchasedUpgrades([]);
    setSelectedTurret(null);
    setPlayerLevel(1);
    setPlayerXp({ current: 0, required: 100 });
    setIsLevelUp(false);
    setUpgradeChoices([]);
    setAcquiredCrates([]);
    const metaUpgradePayload = { metaUpgrades: gameData.metaUpgrades };
    gameInstance.current?.scene.getScene('GameScene').scene.restart(metaUpgradePayload);
  };
  
  const handleUpgradeSelected = (upgradeId: string) => {
    gameBus.emit(GameEvent.APPLY_PLAYER_UPGRADE, upgradeId);
    setIsLevelUp(false);
    setUpgradeChoices([]);
  };

  const handleSpecializationSelected = (choiceId: string) => {
    if (targetTurretId !== null) {
      gameBus.emit(GameEvent.APPLY_TURRET_SPECIALIZATION, { turretId: targetTurretId, choiceId });
    }
    setIsSpecializing(false);
    setSpecializationChoices([]);
    setTargetTurretId(null);
  };

  const handleOpenLaboratory = () => {
    setIsGameOver(false);
    setIsLaboratoryOpen(true);
  };

  const handleUpgradePurchase = (newData: GameData) => {
    setGameData(newData);
    saveGameData(newData);
  };
  
  const handleOpenCrate = () => {
    if (acquiredCrates.length === 0 || isCrateModalOpen) return;
    const [firstCrate, ...rest] = acquiredCrates;
    setCrateToOpen(firstCrate);
    setAcquiredCrates(rest);
    setIsCrateModalOpen(true);
  };

  const handleClaimCrateRewards = (rewards: CrateReward[]) => {
    rewards.forEach(reward => {
      switch (reward.type) {
        case 'scrap':
        case 'aetherium':
        case 'buff_turret_as':
        case 'buff_core_invuln':
          gameBus.emit(GameEvent.APPLY_CRATE_REWARD, reward);
          break;
        case 'data_cores':
          gameBus.emit(GameEvent.ADD_DATA_CORES, reward.amount);
          break;
      }
    });
  };

  const handleCloseCrateModal = () => {
    setIsCrateModalOpen(false);
    setCrateToOpen(null);
  };

  const costMultiplier = 1 - (getMetaUpgrade('BUILD_COST')?.effects[(gameData.metaUpgrades['BUILD_COST'] || 1) - 1] || 0);

  return (
    <div className="relative w-screen h-screen">
      <div id="game-container" className="absolute top-0 left-0 w-full h-full"></div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none text-white">
        <EventNotifier />
        <HUD scrap={scrap} coreHealth={coreHealth} power={power} shield={shield} level={playerLevel} xp={playerXp} aetherium={aetherium} />
        {selectedTurret && <TurretControlPanel turret={selectedTurret} currentScrap={scrap} />}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Store 
              currentScrap={scrap} 
              currentAetherium={aetherium}
              currentPowerUsage={power.usage}
              maxPower={power.max}
              purchasedUpgrades={purchasedUpgrades}
              costMultiplier={costMultiplier}
              metaUpgrades={gameData.metaUpgrades}
            />
        </div>
        <div className="absolute bottom-4 right-4">
          <CrateDisplay crates={acquiredCrates} onOpen={handleOpenCrate} />
        </div>
      </div>
      {isGameOver && <GameOverModal onRestart={handleRestart} onOpenLaboratory={handleOpenLaboratory} dataCoresEarned={lastRunDataCores} />}
      {isLaboratoryOpen && <LaboratoryModal dataCores={gameData.dataCores} metaUpgrades={gameData.metaUpgrades} onUpgrade={handleUpgradePurchase} onRestart={handleRestart} />}
      {isLevelUp && <LevelUpModal choices={upgradeChoices} onSelect={handleUpgradeSelected} />}
      {isSpecializing && <SpecializationModal choices={specializationChoices} onSelect={handleSpecializationSelected} />}
      {isCrateModalOpen && crateToOpen && (
        <SupplyCrateModal
          crate={crateToOpen}
          onClaim={handleClaimCrateRewards}
          onClose={handleCloseCrateModal}
        />
      )}
    </div>
  );
};

export default App;