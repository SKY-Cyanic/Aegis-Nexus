
import Phaser from 'phaser';
import { gameBus } from '../../bridge/eventBus';
import { GameEvent, GameEventPayload, StoreItem, PowerPayload, ShieldPayload, SelectTurretPayload, PlayerUpgrade, XpPayload, EnemyStats, EnemyType, GameOverPayload, TurretStats, CrateReward } from '../../types';
import { storeItems, getItem } from '../data/storeItems';
import { playerUpgrades, getUpgrade } from '../data/playerUpgrades';
import { specializations, getSpecialization } from '../data/turretSpecializations';
import { enemyData } from '../data/enemyData';
import { metaUpgradesData } from '../data/metaUpgrades';

const PLAYER_BASE_FIRE_RATE = 250; // ms between shots
const PLACEMENT_VALID_COLOR = 0x22c55e; // green-500
const PLACEMENT_INVALID_COLOR = 0xef4444; // red-500
const REPAIR_RATE = 2.5; // health per second
const SHIELD_REGEN_RATE = 5; // shield points per second
const SHIELD_REGEN_DELAY = 3000; // ms after last hit

// FIX: Extracted TurretData to its own type to resolve a circular dependency between PowerConsumer and Turret.
type TurretData = {
    id: number;
    level: number;
    stats: TurretStats;
    upgradeCost: number;
    lastFired: number;
    target: Phaser.GameObjects.Sprite | null;
    laserBeam?: Phaser.GameObjects.Graphics;
    slowField?: Phaser.GameObjects.Graphics;
    disabledUntil: number;
};

type PowerConsumer = Phaser.GameObjects.Sprite & {
    powerCost: number;
    isActive: boolean;
    turretData?: TurretData;
    extractorData?: {
        generationTimer: Phaser.Time.TimerEvent;
    };
};

type Turret = PowerConsumer & {
    turretData: TurretData
};

type Enemy = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
    stats: EnemyStats;
    health: number;
    healthBar: Phaser.GameObjects.Graphics;
    lastFired?: number;
    lastHealed?: number;
    targetTurret?: Turret;
};

type PlayerProjectile = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  pierceCount?: number;
  isCrit?: boolean;
};

export default class GameScene extends Phaser.Scene {
  public add!: Phaser.GameObjects.GameObjectFactory;
  public cameras!: Phaser.Cameras.Scene2D.CameraManager;
  public events!: Phaser.Events.EventEmitter;
  public input!: Phaser.Input.InputPlugin;
  public physics!: Phaser.Physics.Arcade.ArcadePhysics;
  public scene!: Phaser.Scenes.ScenePlugin;
  public time!: Phaser.Time.Clock;
  public tweens!: Phaser.Tweens.TweenManager;
  public textures!: Phaser.Textures.TextureManager;

  private scrap: number = 0;
  private aetherium: number = 0;
  private core!: Phaser.GameObjects.Zone & { body: Phaser.Physics.Arcade.Body; health: number };
  private coreGraphics!: Phaser.GameObjects.Graphics;
  private coreShieldGraphics!: Phaser.GameObjects.Graphics;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private enemies!: Phaser.Physics.Arcade.Group;
  private turrets!: Phaser.Physics.Arcade.Group;
  private turretProjectiles!: Phaser.Physics.Arcade.Group;
  private missileProjectiles!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private resourceCaches!: Phaser.Physics.Arcade.Group;
  private xpFragments!: Phaser.Physics.Arcade.Group;
  private aetheriumVeins!: Phaser.Physics.Arcade.Group;
  private buildings!: Phaser.Physics.Arcade.Group;
  private supplyCrates!: Phaser.Physics.Arcade.Group;

  private eventListeners: (() => void)[] = [];
  private lastPlayerFire: number = 0;
  private mainSpawner!: Phaser.Time.TimerEvent;
  private bossSpawner!: Phaser.Time.TimerEvent;
  private turretIdCounter: number = 0;
  private gameStartTime: number = 0;

  // Power Grid
  private maxPower: number = 20;
  private powerUsage: number = 0;
  private powerConsumers: PowerConsumer[] = [];

  // Core Modules & Buffs
  private hasRepairBots: boolean = false;
  private hasShieldGenerator: boolean = false;
  private coreShield: number = 0;
  private maxCoreShield: number = 50;
  private lastCoreHitTime: number = 0;
  private coreInvulnEndTime: number = 0;

  // Placement mode
  private isPlacingItem: boolean = false;
  private currentItemToPlace: StoreItem | null = null;
  private placementIndicator!: Phaser.GameObjects.Graphics;
  private placementGhost!: Phaser.GameObjects.Sprite;
  private isPlacementValid: boolean = false;
  
  // Turret Selection
  private selectedTurret: Turret | null = null;
  private selectionCircle!: Phaser.GameObjects.Graphics;

  // Player Progression
  private playerLevel: number = 1;
  private playerXP: number = 0;
  private xpToNextLevel: number = 100;
  private playerUpgrades: Set<string> = new Set();
  private playerFireRate: number = PLAYER_BASE_FIRE_RATE;
  
  // Buffs
  private turretAttackSpeedBuff: { multiplier: number, endTime: number } | null = null;

  // Meta Progression
  private metaUpgrades: { [key: string]: number } = {};
  private CORE_MAX_HEALTH: number = 100;

  constructor() {
    super('GameScene');
  }

  createProceduralTextures() {
    const createTexture = (key: string, drawCallback: (g: Phaser.GameObjects.Graphics) => void, width: number, height: number) => {
        if (this.textures.exists(key)) return;
        const g = this.add.graphics();
        drawCallback(g);
        g.generateTexture(key, width, height);
        g.destroy();
    };
    createTexture('player_texture', g => { g.fillStyle(0x22d3ee); g.beginPath(); g.moveTo(12, 0); g.lineTo(23, 29); g.lineTo(12, 25); g.lineTo(0, 29); g.closePath(); g.fillPath(); g.fillStyle(0xffffff); g.fillCircle(12, 17, 3); }, 24, 30);
    createTexture('enemy_basic_texture', g => { g.fillStyle(0xe879f9); g.beginPath(); g.moveTo(12, 0); g.lineTo(23, 23); g.lineTo(12, 17); g.lineTo(0, 23); g.closePath(); g.fillPath(); }, 24, 24);
    createTexture('enemy_rusher_texture', g => { g.fillStyle(0xf43f5e); g.beginPath(); g.moveTo(8,0); g.lineTo(15,19); g.lineTo(8,16); g.lineTo(0,19); g.closePath(); g.fillPath();}, 16,20);
    createTexture('enemy_artillery_texture', g => { g.fillStyle(0xa3e635); g.fillCircle(14,14,13.9); g.fillStyle(0x581c87); g.fillRect(4, 4, 20, 20); g.fillStyle(0x1e293b); g.fillCircle(14,14,5);}, 28,28);
    createTexture('enemy_healer_texture', g => { g.fillStyle(0x7e22ce); g.fillCircle(14,14,13.9); g.fillStyle(0x4ade80); g.fillRect(6, 12, 16, 4); g.fillRect(12, 6, 4, 16);}, 28, 28);
    createTexture('enemy_bomber_texture', g => { g.fillStyle(0xf97316); g.fillCircle(12,12,11.9); g.fillStyle(0xef4444); g.fillCircle(12,12,8); g.fillStyle(0xfde047); g.fillCircle(12,12,4);}, 24, 24);
    createTexture('enemy_titan_texture', g => { g.fillStyle(0x475569); g.fillCircle(40,40,39.9); g.fillStyle(0xef4444); g.fillCircle(40,40,25); g.fillStyle(0xfcbf49); g.beginPath(); g.moveTo(40,0);g.lineTo(60,40);g.lineTo(40,79);g.lineTo(20,40); g.closePath();g.fillPath();}, 80, 80);
    createTexture('enemy_saboteur_texture', g => { g.fillStyle(0x0ea5e9); g.beginPath(); g.moveTo(0, 0); g.lineTo(10, 19); g.lineTo(19, 0); g.lineTo(10, 6); g.closePath(); g.fillPath(); g.fillStyle(0xffffff); g.fillCircle(10, 8, 3);}, 20, 20);
    createTexture('turret_texture', g => { g.fillStyle(0x94a3b8); g.fillRect(0, 16, 24, 24); g.fillStyle(0x22c55e); g.fillRect(8, 0, 8, 16); }, 24, 40);
    createTexture('turret_laser_texture', g => { g.fillStyle(0x94a3b8); g.fillCircle(18, 18, 17.9); g.fillStyle(0xef4444); g.fillCircle(18, 18, 8); }, 36, 36);
    createTexture('turret_missile_texture', g => { g.fillStyle(0x94a3b8); g.fillRect(0, 16, 36, 24); g.fillStyle(0xf97316); g.fillRect(12, 0, 12, 16); }, 36, 40);
    createTexture('turret_slow_texture', g => { g.fillStyle(0x94a3b8); g.beginPath(); g.moveTo(18,0); g.lineTo(35,30); g.lineTo(0,30); g.closePath(); g.fillPath(); g.fillStyle(0x38bdf8); g.fillCircle(18,12,8); }, 36, 36);
    createTexture('generator_texture', g => { g.fillStyle(0x94a3b8); g.fillRect(0,0,32,32); g.fillStyle(0xfde047); g.fillRect(8,8,16,16); g.lineStyle(2, 0xfde047); g.strokeRect(3,3,26,26); }, 32,32);
    createTexture('extractor_texture', g => { g.fillStyle(0x94a3b8); g.fillCircle(20,20,19.9); g.fillStyle(0x7c3aed); g.fillRect(14,0,12,20);}, 40, 40);
    createTexture('aetherium_vein_texture', g => { g.fillStyle(0x7c3aed, 0.4); g.fillCircle(25,25,24.9); g.fillStyle(0xc4b5fd, 0.8); g.fillCircle(25,25,10);}, 50,50);
    createTexture('player_bullet_texture', g => { g.fillStyle(0x67e8f9); g.fillCircle(4, 4, 3.9); }, 8, 8);
    createTexture('turret_bullet_texture', g => { g.fillStyle(0xfacc15); g.fillRect(0, 0, 4, 16); }, 4, 16);
    createTexture('flak_bullet_texture', g => { g.fillStyle(0xfde047); g.fillCircle(6,6,5.9); g.fillStyle(0xfb923c); g.fillCircle(6,6,3);}, 12, 12);
    createTexture('missile_texture', g => { g.fillStyle(0xf97316); g.fillEllipse(8,6,6,12); g.fillStyle(0x475569); g.fillEllipse(8,13,8,4); }, 16, 16);
    createTexture('enemy_acid_projectile_texture', g => { g.fillStyle(0xa3e635, 0.9); g.fillCircle(6,6,5.9); g.fillStyle(0x4a7810, 0.7); g.fillCircle(6,6,3);}, 12,12);
    createTexture('resource_cache_texture', g => { g.fillStyle(0xfb923c); g.fillRect(0, 0, 24, 24); g.fillStyle(0x1e293b); g.fillRect(4, 4, 16, 16); g.fillStyle(0xfde047); g.fillCircle(12, 12, 4); }, 24, 24);
    createTexture('xp_fragment_texture', g => { g.fillStyle(0x22d3ee, 0.8); g.fillCircle(5, 5, 4.5); g.lineStyle(1, 0xffffff, 0.9); g.strokeCircle(5, 5, 4.0); }, 10, 10);
    
    // FIX: Replaced texture generation for crates to correctly render text using a RenderTexture.
    const createCrateTexture = (key: string, bgColor: number, innerColor: number) => {
        if (this.textures.exists(key)) return;
        // Use a RenderTexture to combine graphics and text objects
        const rt = this.add.renderTexture(0, 0, 32, 32).setVisible(false);

        // Draw the crate box using a graphics object
        const g = this.add.graphics();
        g.fillStyle(bgColor);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(innerColor);
        g.fillRect(4, 4, 24, 24);

        // Create a text object for the question mark
        const text = this.add.text(10, 6, '?', {
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '20px',
            color: '#fde047',
        });

        // Draw both the graphics and text to the render texture
        rt.draw(g);
        rt.draw(text);

        // Save the render texture as a new texture in the texture manager
        rt.saveTexture(key);
        
        // Clean up temporary game objects
        rt.destroy();
        g.destroy();
        text.destroy();
    };

    createCrateTexture('supply_crate_common_texture', 0x94a3b8, 0x475569);
    createCrateTexture('supply_crate_rare_texture', 0x7c3aed, 0x1e293b);
  }

  init(data: { metaUpgrades?: { [key: string]: number } } = {}) {
    this.metaUpgrades = data.metaUpgrades || {};

    // Reset game state variables
    this.scrap = 0;
    this.aetherium = 0;
    this.powerUsage = 0;
    this.maxPower = 20;
    this.hasRepairBots = false;
    this.hasShieldGenerator = false;
    this.coreShield = 0;
    this.coreInvulnEndTime = 0;
    this.turretAttackSpeedBuff = null;
    this.isPlacingItem = false;
    this.currentItemToPlace = null;
    this.selectedTurret = null;
    this.turretIdCounter = 0;
    this.playerLevel = 1;
    this.playerXP = 0;
    this.xpToNextLevel = 100;
    this.playerUpgrades = new Set();
    this.playerFireRate = PLAYER_BASE_FIRE_RATE;
    this.powerConsumers = [];
    this.gameStartTime = this.time ? this.time.now : Date.now();
  }

  create() {
    // Apply Meta Upgrades at the very beginning
    const startingScrapLevel = this.metaUpgrades['STARTING_SCRAP'] || 0;
    if (startingScrapLevel > 0) {
      this.scrap = metaUpgradesData['STARTING_SCRAP'].effects[startingScrapLevel - 1];
    }
    const coreHealthLevel = this.metaUpgrades['CORE_HEALTH'] || 0;
    this.CORE_MAX_HEALTH = 100; // Start with base health
    if (coreHealthLevel > 0) {
      this.CORE_MAX_HEALTH += metaUpgradesData['CORE_HEALTH'].effects[coreHealthLevel - 1];
    }
    this.gameStartTime = this.time.now;
    
    this.createProceduralTextures();

    // FIX: Create particle texture once, to be used by one-shot emitters.
    if(!this.textures.exists('particle')) {
        const g = this.add.graphics();
        g.fillStyle(0xffffff); g.fillRect(0,0,2,2); g.generateTexture('particle', 2, 2); g.destroy();
    }
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.core = this.add.zone(centerX, centerY, 80, 80) as any;
    this.physics.world.enable(this.core);
    this.core.body.setImmovable(true);
    this.core.health = this.CORE_MAX_HEALTH;
    this.coreGraphics = this.add.graphics();
    this.coreShieldGraphics = this.add.graphics();
    this.updateCoreGraphics(this.coreGraphics, this.core.health);

    this.tweens.add({ targets: this.coreGraphics, alpha: 0.7, ease: 'Sine.easeInOut', duration: 1000, yoyo: true, repeat: -1 });

    this.player = this.physics.add.sprite(centerX + 150, centerY, 'player_texture');
    this.player.setCollideWorldBounds(true);
    
    this.enemies = this.physics.add.group();
    this.turrets = this.physics.add.group();
    this.turretProjectiles = this.physics.add.group();
    this.missileProjectiles = this.physics.add.group();
    this.playerProjectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.resourceCaches = this.physics.add.group();
    this.xpFragments = this.physics.add.group();
    this.aetheriumVeins = this.physics.add.group();
    this.buildings = this.physics.add.group();
    this.supplyCrates = this.physics.add.group();
    
    this.selectionCircle = this.add.graphics();
    this.selectionCircle.setVisible(false);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.keyboard?.on('keydown-ESC', () => { this.isPlacingItem ? this.cancelPlacementMode() : this.deselectTurret(); }, this);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => p.rightButtonDown() && (this.isPlacingItem ? this.cancelPlacementMode() : this.deselectTurret()));
    
    // Add zoom functionality with mouse wheel
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
        if (this.isPlacingItem) return;
        let newZoom;
        if (deltaY > 0) {
            newZoom = this.cameras.main.zoom - 0.05;
        } else {
            newZoom = this.cameras.main.zoom + 0.05;
        }
        this.cameras.main.zoom = Phaser.Math.Clamp(newZoom, 0.6, 1.5);
    });

    this.setupColliders();
    this.setupTimers();
    this.setupEventBusListeners();

    gameBus.emit(GameEvent.UPDATE_SCRAP, this.scrap);
    gameBus.emit(GameEvent.UPDATE_AETHERIUM, this.aetherium);
    gameBus.emit(GameEvent.UPDATE_CORE_HEALTH, this.core.health);
    gameBus.emit(GameEvent.UPDATE_POWER, { usage: this.powerUsage, max: this.maxPower } as PowerPayload);
    gameBus.emit(GameEvent.UPDATE_CORE_SHIELD, { current: this.coreShield, max: this.maxCoreShield } as ShieldPayload);
    gameBus.emit(GameEvent.PLAYER_XP_UPDATE, { current: this.playerXP, required: this.xpToNextLevel } as XpPayload);
  }
  
  setupColliders() {
      // FIX: Corrected callback signatures for physics colliders and overlaps.
      this.physics.add.collider(this.enemies, this.core, this.enemyHitCore, undefined, this);
      this.physics.add.overlap(this.turretProjectiles, this.enemies, this.projectileHitEnemy, undefined, this);
      this.physics.add.overlap(this.playerProjectiles, this.enemies, this.playerProjectileHitEnemy, undefined, this);
      this.physics.add.collider(this.enemyProjectiles, this.core, this.enemyProjectileHitCore, undefined, this);
      this.physics.add.overlap(this.player, this.resourceCaches, this.collectResourceCache, undefined, this);
      this.physics.add.overlap(this.player, this.xpFragments, this.collectXpFragment, undefined, this);
      this.physics.add.overlap(this.player, this.supplyCrates, this.collectSupplyCrate, undefined, this);
      this.physics.add.overlap(this.missileProjectiles, this.enemies, this.missileHit, undefined, this);
      this.physics.add.overlap(this.enemies, this.turrets, this.saboteurHitTurret, undefined, this);
  }
  
  setupTimers() {
      this.mainSpawner = this.time.addEvent({ delay: 2000, callback: this.spawnEnemy, callbackScope: this, loop: true });
      this.time.addEvent({ delay: 25000, callback: this.triggerRandomEvent, callbackScope: this, loop: true });
      this.time.addEvent({ delay: 15000, callback: this.spawnAetheriumVein, callbackScope: this, loop: true });
      this.bossSpawner = this.time.addEvent({ delay: 180000, callback: this.spawnBoss, callbackScope: this, loop: true }); // Spawn boss every 3 minutes
  }

  setupEventBusListeners() {
    const subs = [
        gameBus.on(GameEvent.ENTER_PLACEMENT_MODE, this.enterPlacementMode.bind(this)),
        gameBus.on(GameEvent.BUY_UPGRADE, this.handleBuyUpgrade.bind(this)),
        gameBus.on(GameEvent.UPGRADE_TURRET, this.handleUpgradeTurret.bind(this)),
        gameBus.on(GameEvent.APPLY_PLAYER_UPGRADE, this.handleApplyPlayerUpgrade.bind(this)),
        gameBus.on(GameEvent.APPLY_TURRET_SPECIALIZATION, this.handleApplyTurretSpecialization.bind(this)),
        gameBus.on(GameEvent.APPLY_CRATE_REWARD, this.handleApplyCrateReward.bind(this)),
    ];
    this.eventListeners.push(...subs);
    
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.eventListeners.forEach(unsub => unsub());
        this.eventListeners = [];
    });
  }

  updateCoreGraphics(graphics: Phaser.GameObjects.Graphics, health: number) {
    graphics.clear();
    const x = this.core.x;
    const y = this.core.y;
    const radius = 40;
    const healthPercentage = health / this.CORE_MAX_HEALTH;

    let coreColor = 0x22c55e; // green-500
    if (healthPercentage <= 0.3) {
      coreColor = 0xef4444; // red-500
    } else if (healthPercentage <= 0.6) {
      coreColor = 0xeab308; // yellow-500
    }

    graphics.fillStyle(0x475569, 1);
    graphics.fillCircle(x, y, radius);
    graphics.fillStyle(coreColor, 1);
    graphics.fillCircle(x, y, radius * 0.85);

    if (this.time.now < this.coreInvulnEndTime) {
        graphics.lineStyle(4, 0xfde047, 1);
        graphics.strokeCircle(x, y, radius * 1.1);
    }

    graphics.lineStyle(2, 0x94a3b8, 1);
    graphics.strokeCircle(x, y, radius * 0.9);
    graphics.strokeCircle(x, y, radius * 0.5);
  }

  updateCoreShieldGraphics() {
    this.coreShieldGraphics.clear();
    if (this.hasShieldGenerator && this.coreShield > 0) {
      const x = this.core.x;
      const y = this.core.y;
      const radius = 55;
      const alpha = 0.3 + (this.coreShield / this.maxCoreShield) * 0.4;

      this.coreShieldGraphics.fillStyle(0x06b6d4, alpha);
      this.coreShieldGraphics.fillCircle(x, y, radius);
      this.coreShieldGraphics.lineStyle(2, 0x67e8f9, 0.8);
      this.coreShieldGraphics.strokeCircle(x, y, radius);
    }
  }

  spawnAetheriumVein() {
      if (this.aetheriumVeins.countActive(true) >= 5) return;
      const angle = Phaser.Math.FloatBetween(0, 2 * Math.PI);
      const distance = Phaser.Math.FloatBetween(250, this.cameras.main.width / 2 - 150);
      const x = this.core.x + Math.cos(angle) * distance;
      const y = this.core.y + Math.sin(angle) * distance;
      const vein = this.aetheriumVeins.create(x, y, 'aetherium_vein_texture');
      (vein as any).isMined = false;
  }
  
  spawnEnemy() {
    const elapsedSeconds = (this.time.now - this.gameStartTime) / 1000;

    let availableEnemies: EnemyType[] = ['BASIC'];
    if (elapsedSeconds > 30) availableEnemies.push('RUSHER');
    if (elapsedSeconds > 60) availableEnemies.push('ARTILLERY');
    if (elapsedSeconds > 90) availableEnemies.push('HEALER');
    if (elapsedSeconds > 120) availableEnemies.push('BOMBER');
    if (elapsedSeconds > 150) availableEnemies.push('SABOTEUR');

    const typeToSpawn = Phaser.Utils.Array.GetRandom(availableEnemies);
    // FIX: The 'type' property was missing from the stats object.
    const stats: EnemyStats = { type: typeToSpawn, ...enemyData[typeToSpawn] };
    
    const healthScale = 0.25 + (elapsedSeconds / 120); // Start at 25% health, then scales up.
    stats.health *= healthScale;
    
    // FIX: The 'delay' property on a TimerEvent is readonly in the typings. Cast to 'any' to modify it.
    (this.mainSpawner as any).delay = Math.max(400, 2000 * Math.pow(0.995, elapsedSeconds));

    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const { width, height } = this.cameras.main;
    switch (edge) {
      case 0: x = Phaser.Math.Between(0, width); y = -50; break;
      case 1: x = width + 50; y = Phaser.Math.Between(0, height); break;
      case 2: x = Phaser.Math.Between(0, width); y = height + 50; break;
      default: x = -50; y = Phaser.Math.Between(0, height); break;
    }
    const enemy = this.enemies.create(x, y, stats.texture) as Enemy;
    enemy.stats = stats;
    enemy.health = stats.health;
    enemy.lastFired = 0;
    enemy.lastHealed = 0;
    enemy.healthBar = this.add.graphics();
    this.updateEnemyHealthBar(enemy);
    
    if (enemy.stats.type !== 'ARTILLERY' && enemy.stats.type !== 'TITAN' && enemy.stats.type !== 'SABOTEUR') {
        this.physics.moveToObject(enemy, this.core, stats.speed);
    }
  }

  spawnBoss() {
      gameBus.emit(GameEvent.GAME_EVENT_START, { title: '거대 개체 접근', message: '고위협 목표 \'타이탄\'이 전장에 나타났습니다!' });

      const elapsedSeconds = (this.time.now - this.gameStartTime) / 1000;
      const typeToSpawn = 'TITAN';
      const stats: EnemyStats = { type: typeToSpawn, ...enemyData[typeToSpawn] };
      const healthScale = 1 + (elapsedSeconds / 180);
      stats.health *= healthScale;

      const edge = Math.floor(Math.random() * 4);
      let x, y;
      const { width, height } = this.cameras.main;
      switch (edge) {
        case 0: x = Phaser.Math.Between(0, width); y = -80; break;
        case 1: x = width + 80; y = Phaser.Math.Between(0, height); break;
        case 2: x = Phaser.Math.Between(0, width); y = height + 80; break;
        default: x = -80; y = Phaser.Math.Between(0, height); break;
      }

      const enemy = this.enemies.create(x, y, stats.texture) as Enemy;
      enemy.stats = stats;
      enemy.health = stats.health;
      enemy.lastFired = 0;
      enemy.healthBar = this.add.graphics();
      this.updateEnemyHealthBar(enemy);
  }
  
  updateEnemyHealthBar(enemy: Enemy) {
      if (!enemy.active || !enemy.healthBar) return;
      
      const healthPercentage = Math.max(0, enemy.health / enemy.stats.health);
      const barWidth = enemy.width * 0.8;
      const barHeight = enemy.stats.type === 'TITAN' ? 8 : 4;
      
      enemy.healthBar.clear();
      enemy.healthBar.fillStyle(0x333333);
      enemy.healthBar.fillRect(0, 0, barWidth, barHeight);
      enemy.healthBar.fillStyle(0xef4444);
      enemy.healthBar.fillRect(0, 0, barWidth * healthPercentage, barHeight);
  }

  enemyHitCore(core: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, enemyGO: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    const enemy = enemyGO as Enemy;
    if (enemy.stats.type === 'SABOTEUR') return; // Saboteurs don't damage the core

    const damage = enemy.stats.damage;

    if (enemy.stats.type === 'BOMBER') {
        this.explode(enemy.x, enemy.y, enemy.stats.aoeRadius!, enemy.stats.aoeDamage!, 0xf97316);
    }

    enemy.healthBar.destroy();
    enemy.destroy();
    
    this.takeCoreDamage(damage);
  }
  
  enemyProjectileHitCore(core: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    // FIX: Cast projectile to GameObject to safely access data and destroy it.
    const projGO = projectile as Phaser.GameObjects.GameObject;
    const damage = (projGO.getData('damage') || 15);
    projGO.destroy();
    this.takeCoreDamage(damage); 
  }

  takeCoreDamage(damage: number) {
    if (this.time.now < this.coreInvulnEndTime) return;

    this.lastCoreHitTime = this.time.now;
    if (this.coreShield > 0) {
      this.coreShield = Math.max(0, this.coreShield - damage);
      gameBus.emit(GameEvent.UPDATE_CORE_SHIELD, { current: this.coreShield, max: this.maxCoreShield });
    } else {
      this.core.health -= damage;
      gameBus.emit(GameEvent.UPDATE_CORE_HEALTH, this.core.health);
    }
    
    this.updateCoreGraphics(this.coreGraphics, this.core.health);
    this.cameras.main.shake(100, 0.01);

    if (this.core.health <= 0) {
      this.mainSpawner.destroy();
      const survivalTime = (this.time.now - this.gameStartTime) / 1000;
      gameBus.emit(GameEvent.GAME_OVER, { survivalTime } as GameOverPayload);
    }
  }

  projectileHitEnemy(projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    // FIX: The projectile was cast to a generic GameObject, losing type info. Cast to Sprite for type safety and consistency.
    const projGO = projectile as Phaser.Physics.Arcade.Sprite;
    const enemyGO = enemy as Enemy;

    if (projGO.getData('attackType') === 'FLAK') {
        // FIX: The projectile's body property is not reliably typed. Use the sprite's x/y coordinates for position, which is consistent with other explosion calls.
        this.explode(projGO.x, projGO.y, projGO.getData('aoeRadius'), projGO.getData('damage'), 0xfde047);
    } else {
        const damage = projGO.getData('damage') || 10;
        this.damageEnemy(enemyGO, damage, 0xfacc15, false);
    }
    
    projGO.destroy();
  }

  playerProjectileHitEnemy(projectile: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    const proj = projectile as PlayerProjectile;
    const enemyHit = enemy as Enemy;

    const baseDamageUpgradeLevel = this.metaUpgrades['AGENT_BASE_DAMAGE'] || 0;
    const baseDamageBonus = baseDamageUpgradeLevel > 0 ? metaUpgradesData['AGENT_BASE_DAMAGE'].effects[baseDamageUpgradeLevel - 1] : 0;
    let damage = 5 + baseDamageBonus;

    if (this.playerUpgrades.has('CRITICAL_HITS') && Math.random() < 0.2) { // 20% crit chance
        damage *= 2;
        proj.isCrit = true;
    }

    if (this.playerUpgrades.has('CHAIN_LIGHTNING') && Math.random() < 0.25) { // 25% chain chance
        this.createChainLightning(enemyHit.x, enemyHit.y, 3, damage * 0.75); // 3 targets, 75% damage
    }

    if (this.playerUpgrades.has('AGENT_PIERCING_SHOTS_1')) {
      if (!proj.pierceCount) proj.pierceCount = 0;
      proj.pierceCount++;
      if (proj.pierceCount > 1) {
        proj.destroy();
      }
    } else {
      proj.destroy();
    }
    this.damageEnemy(enemyHit, damage, proj.isCrit ? 0xffde08 : 0x67e8f9, true);
  }
  
  collectResourceCache(player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, cache: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    const cacheSprite = cache as Phaser.GameObjects.Sprite;
    // FIX: The call to this.add.particles was incorrect. Changed to use the overload that returns a ParticleEmitter.
    const emitter = this.add.particles(0, 0, 'particle', {
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 400,
        gravityY: 0,
        tint: 0xfde047,
        emitting: false
    });
    emitter.explode(30, cacheSprite.x, cacheSprite.y);
    this.time.delayedCall(1000, () => emitter.destroy());
    
    cache.destroy();
    this.scrap += 50;
    gameBus.emit(GameEvent.UPDATE_SCRAP, this.scrap);
  }
  
  collectXpFragment(player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, fragment: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    const fragmentSprite = fragment as Phaser.GameObjects.Sprite;
    // FIX: The call to this.add.particles was incorrect. Changed to use the overload that returns a ParticleEmitter.
    const emitter = this.add.particles(0, 0, 'particle', {
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 400,
        gravityY: 0,
        tint: 0x22d3ee,
        emitting: false
    });
    emitter.explode(10, fragmentSprite.x, fragmentSprite.y);
    this.time.delayedCall(1000, () => emitter.destroy());

    fragment.destroy();
    this.playerXP += 20;
    gameBus.emit(GameEvent.PLAYER_XP_UPDATE, { current: this.playerXP, required: this.xpToNextLevel } as XpPayload);
    if (this.playerXP >= this.xpToNextLevel) {
      this.levelUp();
    }
  }

  collectSupplyCrate(player: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, crate: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    const crateSprite = crate as Phaser.GameObjects.Sprite;
    const type = crateSprite.getData('type');
    gameBus.emit(GameEvent.SUPPLY_CRATE_ACQUIRED, { type });
    
    // FIX: The call to this.add.particles was incorrect. Changed to use the overload that returns a ParticleEmitter.
    const emitter = this.add.particles(0, 0, 'particle', {
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 400,
        gravityY: 0,
        tint: type === 'rare' ? 0x7c3aed : 0xfde047,
        emitting: false
    });
    emitter.explode(20, crateSprite.x, crateSprite.y);
    this.time.delayedCall(1000, () => emitter.destroy());
    
    crate.destroy();
  }

  missileHit(missile: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    const missileGO = missile as Phaser.GameObjects.GameObject;
    if (!missileGO.active) return;
    this.explodeMissile(missileGO, enemy as Enemy);
  }

  explodeMissile(missile: Phaser.GameObjects.GameObject, initialTarget: Enemy) {
    const missileData = (missile as any).missileData;
    if (!missileData) { missile.destroy(); return; }
    
    // FIX: The call to this.add.particles was incorrect. Changed to use the overload that returns a ParticleEmitter.
    const emitter = this.add.particles(0, 0, 'particle', {
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 400,
        gravityY: 0,
        tint: 0xf97316,
        emitting: false
    });
    emitter.explode(50, (missile as any).x, (missile as any).y);
    this.time.delayedCall(1000, () => emitter.destroy());
    
    this.enemies.getChildren().forEach(e => {
        const enemy = e as Enemy;
        if (Phaser.Math.Distance.Between((missile as any).x, (missile as any).y, enemy.x, enemy.y) <= missileData.aoeRadius) {
            this.damageEnemy(enemy, missileData.damage, 0xf97316, false);
        }
    });
    missile.destroy();
  }

  explode(x: number, y: number, radius: number, damage: number, particleColor: number) {
    // FIX: The call to this.add.particles was incorrect. Changed to use the overload that returns a ParticleEmitter.
    const emitter = this.add.particles(0, 0, 'particle', {
        tint: particleColor,
        speed: {min: 100, max: 300},
        scale: {start: 1.5, end: 0},
        angle: { min: 0, max: 360 },
        blendMode: 'ADD',
        lifespan: 400,
        gravityY: 0,
        emitting: false
    });
    emitter.explode(100, x, y);
    this.time.delayedCall(1000, () => emitter.destroy());
    
    const explosionCircle = this.add.graphics();
    explosionCircle.fillStyle(particleColor, 0.5);
    explosionCircle.fillCircle(x, y, radius);
    this.tweens.add({
        targets: explosionCircle,
        alpha: 0,
        duration: 250,
        onComplete: () => explosionCircle.destroy()
    });

    this.enemies.getChildren().forEach(e => {
        const enemy = e as Enemy;
        if (enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius) {
            this.damageEnemy(enemy, damage, particleColor, false);
        }
    });
  }

  damageEnemy(enemy: Enemy, amount: number, particleColor: number, fromPlayer: boolean) {
      if (!enemy.active) return;
      // FIX: The call to this.add.particles was incorrect. Changed to use the overload that returns a ParticleEmitter.
      const emitter = this.add.particles(0, 0, 'particle', {
        tint: particleColor,
        speed: { min: 50, max: 200 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 400,
        gravityY: 0,
        emitting: false
      });
      emitter.explode(15, enemy.x, enemy.y);
      this.time.delayedCall(1000, () => emitter.destroy());
      
      enemy.health -= amount;
      this.updateEnemyHealthBar(enemy);

      if (enemy.health <= 0) {
        const enemyType = enemy.stats.type;
        const explosionX = enemy.x;
        const explosionY = enemy.y;
        const explosionStats = { ...enemy.stats };

        enemy.healthBar.destroy();
        enemy.destroy();
        
        if (enemyType === 'BOMBER') {
            this.explode(explosionX, explosionY, explosionStats.aoeRadius!, explosionStats.aoeDamage!, 0xf97316);
        }

        this.tryDropCrate(explosionX, explosionY, enemyType);

        if (enemyType === 'TITAN') {
            this.scrap += 500;
            this.aetherium += 50;
            for(let i = 0; i < 10; i++) {
                this.xpFragments.create(explosionX + Phaser.Math.Between(-50,50), explosionY + Phaser.Math.Between(-50,50), 'xp_fragment_texture');
            }
        } else {
            this.scrap += 10;
            if (Math.random() < 0.25) { // 25% chance to drop XP
                this.xpFragments.create(explosionX, explosionY, 'xp_fragment_texture');
            }
        }
        gameBus.emit(GameEvent.UPDATE_SCRAP, this.scrap);
        
        if (fromPlayer) {
            if (this.playerUpgrades.has('CORE_REPAIR_ON_KILL') && Math.random() < 0.05) { // 5% chance
                this.core.health = Math.min(this.CORE_MAX_HEALTH, this.core.health + 1);
                gameBus.emit(GameEvent.UPDATE_CORE_HEALTH, this.core.health);
                this.updateCoreGraphics(this.coreGraphics, this.core.health);
            }
            if (this.playerUpgrades.has('AETHERIUM_ON_KILL') && Math.random() < 0.02) { // 2% chance
                this.aetherium += 1;
                gameBus.emit(GameEvent.UPDATE_AETHERIUM, this.aetherium);
            }
        }
      }
  }

  tryDropCrate(x: number, y: number, enemyType: EnemyType) {
    if (enemyType === 'TITAN') {
        const crate = this.supplyCrates.create(x, y, 'supply_crate_rare_texture');
        crate.setData('type', 'rare');
        return;
    }

    const dropChance = 0.02; // 2% chance for normal enemies
    if (Math.random() < dropChance) {
        const crate = this.supplyCrates.create(x, y, 'supply_crate_common_texture');
        crate.setData('type', 'common');
    }
  }

  handlePointerDown(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) {
    if (pointer.leftButtonDown()) {
        if (this.isPlacingItem) {
            this.confirmPlacement();
        } else if (gameObjects.length === 0) {
            this.deselectTurret();
            this.firePlayerWeapon(pointer);
        } else {
            // Check if a building was clicked
            const clickedBuilding = gameObjects.find(go => this.buildings.contains(go));
            if (!clickedBuilding) {
                this.firePlayerWeapon(pointer);
            }
        }
    }
  }

  firePlayerWeapon(pointer: Phaser.Input.Pointer) {
    if (this.time.now > this.lastPlayerFire + this.playerFireRate) {
        const fire = (angleOffset = 0) => {
            const p = this.playerProjectiles.create(this.player.x, this.player.y, 'player_bullet_texture') as PlayerProjectile;
            p.isCrit = false;
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY) + angleOffset;
            this.physics.velocityFromRotation(angle, 700, p.body.velocity);
        };

        fire(); // Base projectile
        if (this.playerUpgrades.has('AGENT_MULTISHOT_1')) {
            fire(0.15); 
            fire(-0.15);
        }
      
      this.lastPlayerFire = this.time.now;
    }
  }

  updateTurrets(time: number, delta: number) {
    this.turrets.getChildren().forEach(t => {
      const turret = t as Turret;

      if (turret.turretData.disabledUntil > time) {
          if (turret.alpha === 1) { // Apply disabled effect once
              turret.setAlpha(0.5);
              turret.setTint(0x555555);
              if (turret.turretData.laserBeam) turret.turretData.laserBeam.clear();
          }
          return; // Skip update logic if disabled
      } else if (turret.alpha < 1) { // Re-enable
          turret.setAlpha(1);
          turret.clearTint();
      }
      
      if (!turret.isActive) return;

      const stats = turret.turretData.stats;
      
      if (turret.turretData.target && (
          !turret.turretData.target.active ||
          Phaser.Math.Distance.Between(turret.x, turret.y, turret.turretData.target.x, turret.turretData.target.y) > stats.range
      )) {
          turret.turretData.target = null;
          if (stats.attackType === 'LASER') turret.turretData.laserBeam?.clear();
      }
      
      if (!turret.turretData.target) {
        let bestTarget: Enemy | null = null;
        let highestHealth = 0;
        let titanTarget: Enemy | null = null;

        this.enemies.getChildren().forEach(e => {
            const enemy = e as Enemy;
            const distance = Phaser.Math.Distance.Between(turret.x, turret.y, enemy.x, enemy.y);
            if (distance <= stats.range) {
                if (enemy.stats.type === 'TITAN') {
                    titanTarget = enemy;
                    return; // Prioritize Titan
                }
                if (enemy.health > highestHealth) {
                    highestHealth = enemy.health;
                    bestTarget = enemy;
                }
            }
        });
        turret.turretData.target = titanTarget || bestTarget;
      }

      if (turret.turretData.target) {
          const angle = Phaser.Math.Angle.Between(turret.x, turret.y, turret.turretData.target.x, turret.turretData.target.y);
          if (stats.attackType !== 'LASER' && stats.attackType !== 'SLOW') {
              turret.rotation = angle + Math.PI / 2;
          }
          
          switch(stats.attackType) {
              case 'PROJECTILE': this.fireProjectileTurret(turret, time); break;
              case 'LASER': this.fireLaserTurret(turret, delta); break;
              case 'MISSILE': this.fireMissileTurret(turret, time); break;
              case 'FLAK': this.fireFlakTurret(turret, time); break;
          }
      }

      if (stats.attackType === 'SLOW') this.applySlowField(turret);
    });
  }

  fireProjectileTurret(turret: Turret, time: number) {
      let fireRate = turret.turretData.stats.fireRate;
      if (this.turretAttackSpeedBuff && time < this.turretAttackSpeedBuff.endTime) {
        fireRate *= (1 - this.turretAttackSpeedBuff.multiplier);
      }
      if (time > turret.turretData.lastFired + fireRate) {
          const p = this.turretProjectiles.create(turret.x, turret.y, 'turret_bullet_texture');
          p.setData('damage', turret.turretData.stats.damage);
          const angle = Phaser.Math.Angle.Between(turret.x, turret.y, turret.turretData.target!.x, turret.turretData.target!.y);
          p.rotation = angle + Math.PI / 2;
          this.physics.moveToObject(p, turret.turretData.target!, 500);
          turret.turretData.lastFired = time;
      }
  }

  fireFlakTurret(turret: Turret, time: number) {
    let fireRate = turret.turretData.stats.fireRate;
    if (this.turretAttackSpeedBuff && time < this.turretAttackSpeedBuff.endTime) {
        fireRate *= (1 - this.turretAttackSpeedBuff.multiplier);
    }
    if (time > turret.turretData.lastFired + fireRate) {
        const p = this.turretProjectiles.create(turret.x, turret.y, 'flak_bullet_texture');
        p.setData('damage', turret.turretData.stats.damage);
        p.setData('aoeRadius', turret.turretData.stats.aoeRadius);
        p.setData('attackType', 'FLAK');
        const angle = Phaser.Math.Angle.Between(turret.x, turret.y, turret.turretData.target!.x, turret.turretData.target!.y);
        p.rotation = angle + Math.PI / 2;
        this.physics.moveToObject(p, turret.turretData.target!, 400);
        turret.turretData.lastFired = time;
    }
  }

  fireLaserTurret(turret: Turret, delta: number) {
      const beam = turret.turretData.laserBeam!;
      const target = turret.turretData.target! as Enemy;

      const SYNERGY_RADIUS = 200;
      let isBoosted = false;
      let finalDamage = turret.turretData.stats.damage;

      if (this.turretAttackSpeedBuff && this.time.now < this.turretAttackSpeedBuff.endTime) {
          finalDamage *= (1 + this.turretAttackSpeedBuff.multiplier);
      }

      // Synergy Check: Boosted by nearby Slow Fields?
      for (const t of this.turrets.getChildren()) {
          const otherTurret = t as Turret;
          if (otherTurret.active && otherTurret.turretData?.stats.attackType === 'SLOW') {
              if (Phaser.Math.Distance.Between(turret.x, turret.y, otherTurret.x, otherTurret.y) <= SYNERGY_RADIUS) {
                  isBoosted = true;
                  break;
              }
          }
      }

      if (isBoosted) {
          finalDamage *= 1.5; // 50% damage boost
          beam.clear().lineStyle(5, 0xff7777, 1.0).beginPath().moveTo(turret.x, turret.y).lineTo(target.x, target.y).strokePath();
          this.damageEnemy(target, finalDamage * (delta / 1000), 0xff7777, false);
      } else {
          beam.clear().lineStyle(3, 0xef4444, 1.0).beginPath().moveTo(turret.x, turret.y).lineTo(target.x, target.y).strokePath();
          this.damageEnemy(target, finalDamage * (delta / 1000), 0xef4444, false);
      }
  }

  fireMissileTurret(turret: Turret, time: number) {
      const SYNERGY_RADIUS = 200;
      let isBoosted = false;
      // Synergy Check: Boosted by nearby Auto Turrets?
      for (const t of this.turrets.getChildren()) {
          const otherTurret = t as Turret;
          if (otherTurret.active && otherTurret.turretData?.stats.attackType === 'PROJECTILE') {
              if (Phaser.Math.Distance.Between(turret.x, turret.y, otherTurret.x, otherTurret.y) <= SYNERGY_RADIUS) {
                  isBoosted = true;
                  break;
              }
          }
      }

      let fireRate = isBoosted ? turret.turretData.stats.fireRate * 0.7 : turret.turretData.stats.fireRate; // 30% faster
      if (this.turretAttackSpeedBuff && time < this.turretAttackSpeedBuff.endTime) {
        fireRate *= (1 - this.turretAttackSpeedBuff.multiplier);
      }


      if (time > turret.turretData.lastFired + fireRate) {
          const p = this.missileProjectiles.create(turret.x, turret.y, 'missile_texture');
          (p as any).missileData = { damage: turret.turretData.stats.damage, aoeRadius: turret.turretData.stats.aoeRadius };
          this.physics.moveToObject(p, turret.turretData.target!, 200);
          turret.turretData.lastFired = time;
          if (isBoosted) {
              // FIX: The call to this.add.particles was incorrect. Changed to use the overload that returns a ParticleEmitter.
              const emitter = this.add.particles(0, 0, 'particle', {
                tint: 0xfde047,
                speed: 80,
                scale: { start: 1, end: 0 },
                lifespan: 200,
                angle: { min: 0, max: 360 },
                blendMode: 'ADD',
                gravityY: 0,
                emitting: false
              });
              emitter.explode(15, turret.x, turret.y);
              this.time.delayedCall(1000, () => emitter.destroy());
          }
      }
  }

  applySlowField(turret: Turret) {
      const { range, slowAmount } = turret.turretData.stats;
      turret.turretData.slowField?.clear().fillStyle(0x38bdf8, 0.15).fillCircle(0, 0, range);
      this.enemies.getChildren().forEach(e => {
          const enemy = e as Enemy;
          if (enemy.stats.type === 'TITAN') return; // Titans are immune to slow
          if (Phaser.Math.Distance.Between(turret.x, turret.y, enemy.x, enemy.y) <= range) {
              const baseSpeed = enemy.stats.speed;
              const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.core.x, this.core.y);
              this.physics.velocityFromRotation(angle, baseSpeed * (1 - slowAmount!), enemy.body.velocity);
          }
      });
  }
  
  private getCostMultiplier(): number {
    const buildCostLevel = this.metaUpgrades['BUILD_COST'] || 0;
    if (buildCostLevel > 0) {
      return 1 - metaUpgradesData['BUILD_COST'].effects[buildCostLevel - 1];
    }
    return 1;
  }

  handleBuyUpgrade(itemId: string) {
    const item = getItem(itemId);
    if (!item) return;
    const finalCost = item.cost;
    if (this.scrap < finalCost) return;

    this.scrap -= finalCost;
    gameBus.emit(GameEvent.UPDATE_SCRAP, this.scrap);
    gameBus.emit(GameEvent.UPGRADE_PURCHASED, itemId);

    switch (itemId) {
      case 'UPGRADE_REPAIR_BOTS':
        this.hasRepairBots = true;
        break;
      case 'UPGRADE_SHIELD_GENERATOR':
        this.hasShieldGenerator = true;
        this.coreShield = this.maxCoreShield;
        gameBus.emit(GameEvent.UPDATE_CORE_SHIELD, { current: this.coreShield, max: this.maxCoreShield });
        break;
    }
  }

  enterPlacementMode(itemId: string) {
    if (this.isPlacingItem) this.cancelPlacementMode();
    
    this.currentItemToPlace = getItem(itemId)!;
    const finalScrapCost = Math.round(this.currentItemToPlace.cost * this.getCostMultiplier());
    if (this.scrap < finalScrapCost || this.aetherium < (this.currentItemToPlace.aetheriumCost || 0) || this.powerUsage + (this.currentItemToPlace.powerCost || 0) > this.maxPower) {
        this.currentItemToPlace = null;
        return;
    }
    
    this.isPlacingItem = true;
    this.deselectTurret();
    
    this.placementIndicator = this.add.graphics();
    this.placementGhost = this.add.sprite(0, 0, this.currentItemToPlace.texture).setAlpha(0.7);
  }

  cancelPlacementMode() {
    this.isPlacingItem = false;
    this.currentItemToPlace = null;
    this.placementIndicator?.destroy();
    this.placementGhost?.destroy();
  }
  
  confirmPlacement() {
    if (!this.isPlacingItem || !this.currentItemToPlace || !this.isPlacementValid) return;

    const { x, y } = this.placementGhost;
    const item = this.currentItemToPlace;

    const finalScrapCost = Math.round(item.cost * this.getCostMultiplier());
    this.scrap -= finalScrapCost;
    this.aetherium -= item.aetheriumCost || 0;

    gameBus.emit(GameEvent.UPDATE_SCRAP, this.scrap);
    gameBus.emit(GameEvent.UPDATE_AETHERIUM, this.aetherium);

    const newBuilding = this.buildings.create(x, y, item.texture) as PowerConsumer;
    newBuilding.setInteractive({ useHandCursor: true });
    
    if (item.stats) { // It's a turret
        const newTurret = newBuilding as Turret;
        this.turrets.add(newTurret);
        newTurret.turretData = {
            id: this.turretIdCounter++,
            level: 1,
            stats: { ...item.stats } as TurretStats,
            upgradeCost: Math.floor(item.cost * 0.75),
            lastFired: 0,
            target: null,
            disabledUntil: 0,
        };
        newTurret.on('pointerdown', (p: any, lx: any, ly: any, e: any) => { e.stopPropagation(); this.selectTurret(newTurret); });
        
        if (newTurret.turretData.stats.attackType === 'LASER') newTurret.turretData.laserBeam = this.add.graphics();
        else if (newTurret.turretData.stats.attackType === 'SLOW') newTurret.turretData.slowField = this.add.graphics().setDepth(-1).setPosition(x, y);
    }
    
    if (item.id === 'BUILDING_EXTRACTOR') {
        // FIX: this.physics.getObjectsAt does not exist. Find the overlapping vein by checking bounds.
        const veinToDestroy = this.aetheriumVeins.getChildren().find(v => {
            const sprite = v as Phaser.GameObjects.Sprite;
            return sprite.getBounds().contains(x, y);
        });

        if (veinToDestroy) {
            veinToDestroy.destroy();
        }

        newBuilding.extractorData = {
            generationTimer: this.time.addEvent({
                delay: 5000,
                callback: () => {
                    if (newBuilding.isActive) {
                        this.aetherium += 5;
                        gameBus.emit(GameEvent.UPDATE_AETHERIUM, this.aetherium);
                    }
                },
                loop: true,
            })
        };
    }

    if (item.powerGeneration) {
        this.maxPower += item.powerGeneration;
    }

    if (item.powerCost) {
        newBuilding.powerCost = item.powerCost;
        newBuilding.isActive = true;
        this.powerConsumers.push(newBuilding);
    }

    this.updatePowerGrid();
    this.cancelPlacementMode();
  }
  
  checkPlacementValidity() {
    if (!this.isPlacingItem || !this.currentItemToPlace) return;

    const pointer = this.input.activePointer;
    this.placementGhost.setPosition(pointer.worldX, pointer.worldY);
    this.placementIndicator.clear();

    const item = this.currentItemToPlace;
    let color = PLACEMENT_VALID_COLOR;
    this.isPlacementValid = true;

    const distanceFromCore = Phaser.Math.Distance.Between(this.core.x, this.core.y, pointer.worldX, pointer.worldY);
    if (item.validBuildRadius && distanceFromCore > item.validBuildRadius) {
      this.isPlacementValid = false;
    }
    this.placementIndicator.lineStyle(2, 0x94a3b8, 0.5).strokeCircle(this.core.x, this.core.y, item.validBuildRadius || 0);
    
    let tooClose = false;
    this.buildings.getChildren().forEach(b => {
        if (Phaser.Math.Distance.Between((b as any).x, (b as any).y, pointer.worldX, pointer.worldY) < item.placementRadius!) {
            tooClose = true;
        }
    });
    if(Phaser.Math.Distance.Between(this.core.x, this.core.y, pointer.worldX, pointer.worldY) < (item.placementRadius! + 40)) {
        tooClose = true;
    }
    
    // FIX: Changed placement validation to correctly detect overlap with Aetherium Veins.
    if (item.id === 'BUILDING_EXTRACTOR') {
        let onVein = false;
        this.aetheriumVeins.getChildren().forEach(vein => {
            const veinSprite = vein as Phaser.GameObjects.Sprite;
            // Check if the placement ghost's bounds intersect with the vein's bounds
            if (veinSprite.active && Phaser.Geom.Intersects.RectangleToRectangle(this.placementGhost.getBounds(), veinSprite.getBounds())) {
                onVein = true;
            }
        });
        if (!onVein) {
            this.isPlacementValid = false;
        }
    }
    
    if (tooClose) this.isPlacementValid = false;
    if (!this.isPlacementValid) color = PLACEMENT_INVALID_COLOR;

    this.placementIndicator.lineStyle(2, color, 0.8).strokeCircle(pointer.worldX, pointer.worldY, item.placementRadius || 0);
  }
  
  updatePowerGrid() {
    this.powerUsage = this.powerConsumers.reduce((sum, consumer) => sum + (consumer.isActive ? consumer.powerCost : 0), 0);

    const powerDeficit = this.powerUsage - this.maxPower;

    if (powerDeficit > 0) {
        const activeConsumers = this.powerConsumers.filter(c => c.isActive);
        activeConsumers.sort((a, b) => 
            Phaser.Math.Distance.Between(b.x, b.y, this.core.x, this.core.y) - 
            Phaser.Math.Distance.Between(a.x, a.y, this.core.x, this.core.y)
        );

        let deficit = powerDeficit;
        for (const consumer of activeConsumers) {
            if (deficit <= 0) break;
            consumer.isActive = false;
            consumer.setTint(0x555555);
            deficit -= consumer.powerCost;
        }
    } else {
        const inactiveConsumers = this.powerConsumers.filter(c => !c.isActive);
        if (inactiveConsumers.length > 0) {
            inactiveConsumers.sort((a, b) => 
                Phaser.Math.Distance.Between(a.x, a.y, this.core.x, this.core.y) - 
                Phaser.Math.Distance.Between(b.x, b.y, this.core.x, this.core.y)
            );
            
            let availablePower = this.maxPower - this.powerUsage;
            for (const consumer of inactiveConsumers) {
                if (availablePower < consumer.powerCost) break;
                consumer.isActive = true;
                consumer.clearTint();
                availablePower -= consumer.powerCost;
            }
        }
    }
    
    this.powerUsage = this.powerConsumers.reduce((sum, consumer) => sum + (consumer.isActive ? consumer.powerCost : 0), 0);
    gameBus.emit(GameEvent.UPDATE_POWER, { usage: this.powerUsage, max: this.maxPower });
  }
  
  triggerRandomEvent() {
    const events = [
      { id: 'ENEMY_RUSH', title: '적 증원 감지', message: '대규모 적 웨이브가 접근합니다. 대비하십시오!' },
      { id: 'RESOURCE_CACHE', title: '자원 매장지 발견', message: '근처에서 고밀도 자원 캐시가 발견되었습니다.' }
    ];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    gameBus.emit(GameEvent.GAME_EVENT_START, randomEvent as GameEventPayload);
    
    if (randomEvent.id === 'ENEMY_RUSH') this.startEnemyRush();
    else if (randomEvent.id === 'RESOURCE_CACHE') this.spawnResourceCache();
  }

  startEnemyRush() {
    this.time.addEvent({
        delay: 200,
        repeat: 15,
        callback: () => this.spawnEnemy()
    });
  }

  spawnResourceCache() {
    const angle = Phaser.Math.FloatBetween(0, 2 * Math.PI);
    const distance = Phaser.Math.FloatBetween(200, this.cameras.main.width / 2 - 100);
    const x = this.core.x + Math.cos(angle) * distance;
    const y = this.core.y + Math.sin(angle) * distance;
    this.resourceCaches.create(x, y, 'resource_cache_texture');
  }
  
  selectTurret(turret: Turret) {
    if (this.isPlacingItem) return;
    this.selectedTurret = turret;
    this.selectionCircle.clear().lineStyle(2, 0x67e8f9).strokeCircle(0, 0, 40).setVisible(true).setPosition(turret.x, turret.y);
    
    const payload: SelectTurretPayload = {
      id: turret.turretData.id,
      level: turret.turretData.level,
      stats: turret.turretData.stats,
      upgradeCost: Math.round(turret.turretData.upgradeCost * this.getCostMultiplier()),
      x: turret.x,
      y: turret.y,
      specialization: turret.turretData.stats.specialization,
    };
    gameBus.emit(GameEvent.SELECT_TURRET, payload);
  }

  deselectTurret() {
    if (!this.selectedTurret) return;
    this.selectedTurret = null;
    this.selectionCircle.setVisible(false);
    gameBus.emit(GameEvent.DESELECT_TURRET);
  }

  handleUpgradeTurret(turretId: number) {
    const turret = this.turrets.getChildren().find(t => (t as Turret).turretData.id === turretId) as Turret | undefined;
    if (!turret) return;

    // Specialization check for Auto Turret at level 2
    if (turret.turretData.level === 2 && turret.turretData.stats.name === '자동 터렛') {
        const upgradeCost = Math.round(turret.turretData.upgradeCost * this.getCostMultiplier());
        if (this.scrap < upgradeCost) return;
        
        this.scene.pause();
        gameBus.emit(GameEvent.PROMPT_SPECIALIZATION, { 
            turretId: turret.turretData.id, 
            choices: specializations 
        });
        return;
    }

    const upgradeCost = Math.round(turret.turretData.upgradeCost * this.getCostMultiplier());
    if (this.scrap < upgradeCost || turret.turretData.stats.specialization) return;


    this.scrap -= upgradeCost;
    gameBus.emit(GameEvent.UPDATE_SCRAP, this.scrap);
    
    turret.turretData.level++;
    turret.turretData.upgradeCost = Math.floor(turret.turretData.upgradeCost * 1.5);
    
    turret.turretData.stats.damage *= 1.2;
    turret.turretData.stats.range *= 1.05;
    turret.turretData.stats.fireRate *= 0.95;
    
    this.selectTurret(turret);
  }
  
  levelUp() {
    this.playerXP -= this.xpToNextLevel;
    this.playerLevel++;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
    gameBus.emit(GameEvent.PLAYER_XP_UPDATE, { current: this.playerXP, required: this.xpToNextLevel });
    
    this.scene.pause();
    
    const availableUpgrades = playerUpgrades.filter(u => !this.playerUpgrades.has(u.id));
    const choices = Phaser.Utils.Array.Shuffle(availableUpgrades).slice(0, 3);
    
    gameBus.emit(GameEvent.PLAYER_LEVEL_UP, { level: this.playerLevel, choices });
  }

  handleApplyPlayerUpgrade(upgradeId: string) {
    this.playerUpgrades.add(upgradeId);
    
    switch(upgradeId) {
        case 'AGENT_FIRE_RATE_1':
            this.playerFireRate *= 0.8; // 20% faster
            break;
    }
    
    this.scene.resume();
  }

  handleApplyTurretSpecialization({ turretId, choiceId }: { turretId: number, choiceId: string }) {
      const turret = this.turrets.getChildren().find(t => (t as Turret).turretData.id === turretId) as Turret | undefined;
      const specialization = getSpecialization(choiceId);
      if (!turret || !specialization) {
          this.scene.resume();
          return;
      }

      const upgradeCost = Math.round(turret.turretData.upgradeCost * this.getCostMultiplier());
      this.scrap -= upgradeCost;
      gameBus.emit(GameEvent.UPDATE_SCRAP, this.scrap);
      
      turret.turretData.level++;
      turret.turretData.stats = {
          ...turret.turretData.stats,
          ...specialization.stats,
          name: specialization.name,
          specialization: specialization.id,
      };
      
      this.deselectTurret();
      this.selectTurret(turret);
      this.scene.resume();
  }

  handleApplyCrateReward(reward: CrateReward) {
    switch (reward.type) {
      case 'scrap':
        this.scrap += reward.amount;
        gameBus.emit(GameEvent.UPDATE_SCRAP, this.scrap);
        break;
      case 'aetherium':
        this.aetherium += reward.amount;
        gameBus.emit(GameEvent.UPDATE_AETHERIUM, this.aetherium);
        break;
      case 'buff_turret_as':
        this.turretAttackSpeedBuff = {
            multiplier: reward.amount,
            endTime: this.time.now + (reward.duration || 0)
        };
        break;
      case 'buff_core_invuln':
        this.coreInvulnEndTime = this.time.now + (reward.duration || 0);
        break;
    }
  }

  updateEnemies(time: number, delta: number) {
    this.enemies.getChildren().forEach(e => {
        const enemy = e as Enemy;
        if (!enemy.active) return;
        
        enemy.healthBar.setPosition(enemy.x - enemy.width * 0.4, enemy.y - enemy.height * 0.5 - 8);
        
        if (enemy.body.velocity.length() > 0) {
            enemy.rotation = enemy.body.velocity.angle() + Math.PI / 2;
        }

        const { type, range, speed, fireRate, volleySize, volleyDelay } = enemy.stats;
        
        let target: any = this.core;
        
        if (type === 'SABOTEUR') {
            if (!enemy.targetTurret || !enemy.targetTurret.active || enemy.targetTurret.turretData.disabledUntil > time) {
                // Find a new target
                let closestTurret: Turret | null = null;
                let minDistance = Infinity;
                this.turrets.getChildren().forEach(t => {
                    const turret = t as Turret;
                    if (turret.active && turret.turretData.disabledUntil <= time) {
                        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, turret.x, turret.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestTurret = turret;
                        }
                    }
                });
                enemy.targetTurret = closestTurret || undefined;
            }
            if (enemy.targetTurret) {
                target = enemy.targetTurret;
                this.physics.moveToObject(enemy, target, speed);
            } else { // No valid turret targets, move towards core as fallback
                this.physics.moveToObject(enemy, this.core, speed);
            }

        } else if (type === 'ARTILLERY' || type === 'TITAN') {
            const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, target.x, target.y);
            if (distance > range!) {
                this.physics.moveToObject(enemy, target, speed);
            } else {
                enemy.body.setVelocity(0, 0);
                if (time > (enemy.lastFired ?? 0) + fireRate!) {
                    if (type === 'TITAN') {
                        // Volley fire for Titan
                        for (let i = 0; i < volleySize!; i++) {
                            this.time.delayedCall(i * volleyDelay!, () => {
                                if (enemy.active) {
                                    const p = this.enemyProjectiles.create(enemy.x, enemy.y, 'enemy_acid_projectile_texture');
                                    p.setData('damage', 20); // Titan projectile damage
                                    p.setScale(1.5);
                                    this.physics.moveToObject(p, target, 300);
                                }
                            });
                        }
                    } else {
                        // Single shot for Artillery
                        const p = this.enemyProjectiles.create(enemy.x, enemy.y, 'enemy_acid_projectile_texture');
                        p.setData('damage', 15);
                        this.physics.moveToObject(p, target, 250);
                    }
                    enemy.lastFired = time;
                }
            }
        }

        if (type === 'HEALER') {
            if (time > (enemy.lastHealed ?? 0) + enemy.stats.healRate!) {
                // FIX: The call to this.add.particles was incorrect. Changed to use the overload that returns a ParticleEmitter.
                const emitter = this.add.particles(0, 0, 'particle', {
                    tint: 0x4ade80,
                    speed: { min: 20, max: 80 },
                    scale: { start: 1, end: 0 },
                    lifespan: 600,
                    angle: { min: 0, max: 360 },
                    blendMode: 'ADD',
                    gravityY: 0,
                    emitting: false
                });
                emitter.explode(50, enemy.x, enemy.y);
                this.time.delayedCall(1000, () => emitter.destroy());

                this.enemies.getChildren().forEach(eo => {
                    const otherEnemy = eo as Enemy;
                    if (otherEnemy !== enemy && otherEnemy.active && otherEnemy.health < otherEnemy.stats.health) {
                        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, otherEnemy.x, otherEnemy.y) <= enemy.stats.healRadius!) {
                            otherEnemy.health = Math.min(otherEnemy.stats.health, otherEnemy.health + enemy.stats.healAmount!);
                            this.updateEnemyHealthBar(otherEnemy);
                        }
                    }
                });
                enemy.lastHealed = time;
            }
        }
    });
  }
  
  saboteurHitTurret(enemyGO: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, turretGO: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    const enemy = enemyGO as Enemy;
    const turret = turretGO as Turret;
    if (enemy.stats.type !== 'SABOTEUR') return;

    // Disable the turret
    turret.turretData.disabledUntil = this.time.now + enemy.stats.disableDuration!;
    
    // Saboteur explodes and is destroyed
    const emitter = this.add.particles(0, 0, 'particle', {
        tint: 0x0ea5e9,
        speed: {min: 100, max: 300},
        scale: {start: 1.0, end: 0},
        blendMode: 'ADD',
        lifespan: 300,
        emitting: false
    });
    emitter.explode(40, enemy.x, enemy.y);
    this.time.delayedCall(1000, () => emitter.destroy());
    
    enemy.healthBar.destroy();
    enemy.destroy();
  }

  createChainLightning(x: number, y: number, chainCount: number, damage: number) {
      let currentTarget = {x, y};
      let chainedEnemies: Enemy[] = [];

      for(let i=0; i<chainCount; i++) {
          let bestTarget: Enemy | null = null;
          let minDistance = 200; // Max chain distance

          this.enemies.getChildren().forEach(e => {
              const enemy = e as Enemy;
              if (enemy.active && !chainedEnemies.includes(enemy)) {
                  const distance = Phaser.Math.Distance.Between(currentTarget.x, currentTarget.y, enemy.x, enemy.y);
                  if (distance < minDistance) {
                      minDistance = distance;
                      bestTarget = enemy;
                  }
              }
          });

          if (bestTarget) {
              const lightningGfx = this.add.graphics();
              lightningGfx.lineStyle(2, 0xadd8e6, 0.8);
              lightningGfx.lineBetween(currentTarget.x, currentTarget.y, bestTarget.x, bestTarget.y);
              this.tweens.add({
                  targets: lightningGfx,
                  alpha: 0,
                  duration: 200,
                  onComplete: () => lightningGfx.destroy()
              });

              this.damageEnemy(bestTarget, damage, 0xadd8e6, true);
              chainedEnemies.push(bestTarget);
              currentTarget = {x: bestTarget.x, y: bestTarget.y};
          } else {
              break; // No more targets in range
          }
      }
  }

  update(time: number, delta: number) {
    if (!this.player || !this.player.body) return;
    
    if (this.isPlacingItem) this.checkPlacementValidity();

    if (this.hasRepairBots && this.core.health < this.CORE_MAX_HEALTH) {
      this.core.health = Math.min(this.CORE_MAX_HEALTH, this.core.health + REPAIR_RATE * (delta / 1000));
      gameBus.emit(GameEvent.UPDATE_CORE_HEALTH, this.core.health);
    }
    this.updateCoreGraphics(this.coreGraphics, this.core.health);

    if (this.hasShieldGenerator && this.coreShield < this.maxCoreShield && time > this.lastCoreHitTime + SHIELD_REGEN_DELAY) {
      this.coreShield = Math.min(this.maxCoreShield, this.coreShield + SHIELD_REGEN_RATE * (delta / 1000));
      gameBus.emit(GameEvent.UPDATE_CORE_SHIELD, { current: this.coreShield, max: this.maxCoreShield });
    }
    this.updateCoreShieldGraphics();

    this.player.body.setVelocity(0);
    let speed = 200;
    if (this.playerUpgrades.has('AGENT_SPEED_1')) speed *= 1.15;

    const moveVector = new Phaser.Math.Vector2(0, 0);
    const keys = this.input.keyboard?.addKeys('W,A,S,D') as { [key: string]: Phaser.Input.Keyboard.Key };
    if (this.cursors.left.isDown || keys.A.isDown) moveVector.x = -1;
    else if (this.cursors.right.isDown || keys.D.isDown) moveVector.x = 1;
    if (this.cursors.up.isDown || keys.W.isDown) moveVector.y = -1;
    else if (this.cursors.down.isDown || keys.S.isDown) moveVector.y = 1;
    moveVector.normalize().scale(speed);
    this.player.body.setVelocity(moveVector.x, moveVector.y);
    if (moveVector.length() > 0) this.player.rotation = moveVector.angle() + Math.PI / 2;

    this.updateTurrets(time, delta);
    this.updateEnemies(time, delta);
    
    if (this.playerUpgrades.has('SCRAP_MAGNET_1')) {
        const magnetRadius = 100;
        const pullables = [...this.resourceCaches.getChildren(), ...this.xpFragments.getChildren(), ...this.supplyCrates.getChildren()];
        pullables.forEach(p => {
            const pullable = p as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, pullable.x, pullable.y) < magnetRadius) {
                this.physics.moveToObject(pullable, this.player, 500);
            }
        });
    }

    if (this.selectedTurret && this.selectedTurret.active) {
        this.selectionCircle.setPosition(this.selectedTurret.x, this.selectedTurret.y);
    } else if (this.selectedTurret && !this.selectedTurret.active) {
        this.deselectTurret();
    }
  }
}