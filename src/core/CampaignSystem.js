import { CONFIG } from './Config.js';

export const CAMPAIGN_LEVELS = Object.freeze([
  {
    title: 'Ruined Fire Courtyard', chapter: 'Chapter I', element: 'fire', reward: 'ice',
    story: 'Explore the ruined keep, awaken its three seals, clear the guard halls, then breach the locked boss chamber.',
    waves: [[0, 1], [0, 1, 2]], boss: 'mini', difficulty: 1,
  },
  {
    title: 'Frozen Catacombs', chapter: 'Chapter II', element: 'ice', reward: 'lightning',
    story: 'Beneath the arena, corrupted ice seals the old crypt. Shatter its keepers.',
    waves: [[1, 2]], difficulty: 1.14,
  },
  {
    title: 'Storm Temple', chapter: 'Chapter III', element: 'lightning', reward: 'wind',
    story: 'The storm shrine answers with two converging waves. Survive and seize its living spark.',
    waves: [[0, 1], [0, 1, 2]], difficulty: 1.28,
  },
  {
    title: 'Wind Sanctum', chapter: 'Chapter IV', element: 'wind', reward: 'balance', boss: 'mini',
    story: 'The Abyss Vanguard waits where the air stands still. Defeat it to open the final gate.',
    difficulty: 1.38,
  },
  {
    title: 'Overlord Arena', chapter: 'Chapter V', element: 'balance', boss: 'final',
    story: 'All four elements converge. End the Overlord and restore the fractured veil.',
    difficulty: 1.5,
  },
]);

export class CampaignSystem {
  constructor({ enemies, bosses, bossSystem, maps, elementSystem, player, playerCombat, playerController = null, storage = undefined, eventTarget = globalThis.window }) {
    this.enemies = enemies;
    this.bosses = bosses;
    this.bossSystem = bossSystem;
    this.maps = maps;
    this.elementSystem = elementSystem;
    this.player = player;
    this.playerCombat = playerCombat;
    this.playerController = playerController;
    if (storage !== undefined) this.storage = storage;
    else {
      try { this.storage = globalThis.localStorage; } catch { this.storage = null; }
    }
    this.listeners = new Set();
    this.levelIndex = 0;
    this.waveIndex = 0;
    this.phase = 'idle';
    this.transitionTimer = 0;
    this.shards = 0;
    this.complete = false;
    this.activeEnemies = [];
    this.sealCount = 0;
    this.activatedSeals = 0;
    this.interactQueued = false;
    this.transitionTarget = '';
    this.onKeyDown = (event) => {
      if (event.code === CONFIG.controls.interact && !event.repeat) this.interactQueued = true;
    };
    eventTarget?.addEventListener?.('keydown', this.onKeyDown);
    this.deactivateAll();
  }

  get hasCheckpoint() {
    return this.readCheckpoint() !== null;
  }

  get blocked() {
    return this.phase === 'story' || this.phase === 'level_complete' || this.phase === 'idle';
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(type) {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(type, snapshot));
  }

  readCheckpoint() {
    try {
      const saved = JSON.parse(this.storage?.getItem('shadowBladeCheckpoint'));
      if (!saved || !Number.isInteger(saved.level) || saved.level < 1 || saved.level >= CAMPAIGN_LEVELS.length) return null;
      return saved;
    } catch {
      return null;
    }
  }

  saveCheckpoint() {
    try {
      this.storage?.setItem('shadowBladeCheckpoint', JSON.stringify({ level: Math.min(this.levelIndex + 1, 4), shards: this.shards }));
    } catch {
      // Storage can be unavailable in strict privacy modes; the active run still continues.
    }
  }

  startNew() {
    try { this.storage?.removeItem('shadowBladeCheckpoint'); } catch { /* no-op */ }
    this.levelIndex = 0;
    this.shards = 0;
    this.complete = false;
    this.prepareLevel();
  }

  continueFromCheckpoint() {
    const checkpoint = this.readCheckpoint();
    this.levelIndex = checkpoint?.level ?? 0;
    this.shards = checkpoint?.shards ?? this.levelIndex;
    this.complete = false;
    this.prepareLevel();
  }

  prepareLevel() {
    this.deactivateAll();
    this.waveIndex = 0;
    this.phase = 'story';
    this.transitionTimer = 0;
    this.transitionTarget = '';
    this.interactQueued = false;
    this.playerCombat.health.reset();
    this.playerCombat.stamina = this.playerCombat.maxStamina;
    this.maps.setLevel(this.levelIndex);
    const start = this.maps.getStart?.() ?? [0, 4.6];
    this.player.position.set(start[0], CONFIG.player.groundHeight, start[1]);
    this.playerController?.resetMotion?.();
    this.player.rotation.y = Math.PI;
    this.elementSystem.setUnlocked(this.unlockedElements());
    this.emit('story');
  }

  beginLevel() {
    if (this.phase !== 'story') return false;
    this.sealCount = this.maps.startObjectives?.() ?? 0;
    this.activatedSeals = 0;
    if (this.sealCount > 0) this.phase = 'explore';
    else this.startCombatStage();
    this.emit('combat');
    return true;
  }

  startCombatStage() {
    const level = CAMPAIGN_LEVELS[this.levelIndex];
    if (level.waves?.length) {
      this.phase = 'combat';
      this.spawnWave(level.waves[this.waveIndex]);
    } else if (level.boss) {
      this.openBossChamber();
    } else {
      this.finishEncounter();
    }
  }

  openBossChamber() {
    this.maps.openGate?.('boss-gate');
    this.phase = 'boss_gate';
    this.emit('boss_gate');
  }

  startBoss() {
    const level = CAMPAIGN_LEVELS[this.levelIndex];
    this.bossSystem.startEncounter(level.boss, this.maps.getBossSpawn?.());
    this.phase = 'boss';
    this.emit('boss');
  }

  unlockedElements() {
    const count = Math.min(4, this.levelIndex + 1);
    return ['fire', 'ice', 'lightning', 'wind'].slice(0, count);
  }

  deactivateAll() {
    this.enemies.forEach((enemy) => {
      enemy.group.visible = false;
      enemy.damageable.health = 0;
      enemy.damageable.dead = true;
      enemy.ai.onHit(true);
      enemy.respawns = false;
    });
    this.bosses.miniBoss.group.visible = false;
    this.bosses.finalBoss.group.visible = false;
    this.bosses.miniBoss.active = false;
    this.bosses.finalBoss.active = false;
    this.activeEnemies = [];
  }

  spawnWave(indices) {
    const difficulty = CAMPAIGN_LEVELS[this.levelIndex].difficulty;
    this.activeEnemies = indices.map((enemyIndex, spawnIndex) => {
      const enemy = this.enemies[enemyIndex];
      enemy.reset();
      enemy.respawns = false;
      enemy.damageScale = difficulty;
      enemy.speedScale = 1.35 + (difficulty - 1) * 0.55;
      enemy.damageable.maxHealth = Math.round(enemy.stats.maxHealth * difficulty);
      enemy.damageable.reset();
      const fallbackSpawns = [[-2.8, -2.5], [3.2, -2.2], [0.2, -4.8]];
      const spawn = this.maps.getSpawn?.(spawnIndex) ?? fallbackSpawns[spawnIndex];
      enemy.spawnPosition.set(spawn[0], 0, spawn[1]);
      enemy.group.position.copy(enemy.spawnPosition);
      if (this.maps.resolve) {
        enemy.worldCollider = (position, velocity, radius) => this.maps.resolve(position, velocity, radius);
      }
      enemy.group.visible = true;
      return enemy;
    });
  }

  finishEncounter() {
    if (this.levelIndex === CAMPAIGN_LEVELS.length - 1) {
      this.phase = 'complete';
      this.complete = true;
      try { this.storage?.removeItem('shadowBladeCheckpoint'); } catch { /* no-op */ }
      this.emit('complete');
      return;
    }
    this.phase = 'reward';
    const reward = CAMPAIGN_LEVELS[this.levelIndex].reward;
    const color = reward === 'balance' ? 0xffffff : CONFIG.colors[reward];
    this.maps.showShard(color);
    this.emit('reward');
  }

  collectShard() {
    if (this.phase !== 'reward') return;
    this.shards += 1;
    this.maps.hideShard();
    this.maps.showPortal();
    this.phase = 'portal';
    this.elementSystem.setUnlocked(this.unlockedElements().concat(CAMPAIGN_LEVELS[this.levelIndex].reward).filter((id) => id !== 'balance'));
    this.saveCheckpoint();
    this.emit('portal');
  }

  enterPortal() {
    if (this.phase !== 'portal') return;
    this.maps.hidePortal();
    this.levelIndex += 1;
    this.phase = 'level_complete';
    this.emit('level_complete');
  }

  advanceLevel() {
    if (this.phase !== 'level_complete') return false;
    this.prepareLevel();
    return true;
  }

  update(delta) {
    if (this.maps.collectHealthPickup?.(this.player.position)) {
      this.playerCombat.health.heal(35);
      this.emit('heal');
    }
    if (this.phase === 'explore') {
      if (this.interactQueued && this.maps.activateNearbySeal?.(this.player.position)) {
        this.activatedSeals += 1;
        this.emit('objective');
        if (this.activatedSeals >= this.sealCount) {
          this.phase = 'transition';
          this.transitionTimer = 0.8;
          this.transitionTarget = 'combat';
        }
      }
      this.interactQueued = false;
    } else if (this.phase === 'combat') {
      const cleared = this.activeEnemies.length > 0 && this.activeEnemies.every((enemy) => enemy.dead);
      if (cleared) {
        this.phase = 'transition';
        this.transitionTimer = 1.35;
        this.transitionTarget = 'wave';
      }
    } else if (this.phase === 'boss_gate') {
      const trigger = this.maps.getBossTrigger?.();
      if (trigger && Math.hypot(this.player.position.x - trigger[0], this.player.position.z - trigger[1]) < 2.2) this.startBoss();
    } else if (this.phase === 'boss' && this.bossSystem.completed) {
      this.phase = 'transition';
      this.transitionTimer = 3.2;
      this.transitionTarget = 'finish';
    } else if (this.phase === 'transition') {
      this.transitionTimer -= delta;
      if (this.transitionTimer <= 0) {
        const level = CAMPAIGN_LEVELS[this.levelIndex];
        if (this.transitionTarget === 'combat') {
          this.startCombatStage();
        } else if (this.transitionTarget === 'wave' && this.waveIndex < (level.waves?.length ?? 0) - 1) {
          this.waveIndex += 1;
          this.phase = 'combat';
          this.spawnWave(level.waves[this.waveIndex]);
          this.emit('wave');
        } else if (this.transitionTarget === 'wave' && level.boss) {
          this.openBossChamber();
        } else {
          this.finishEncounter();
        }
      }
    } else if (this.phase === 'reward' && this.player.position.distanceTo(this.maps.shard.position) < 1.25) {
      this.collectShard();
    } else if (this.phase === 'portal' && this.player.position.distanceTo(this.maps.portal.position) < 1.55) {
      this.enterPortal();
    }
    return this.getSnapshot();
  }

  getSnapshot() {
    const level = CAMPAIGN_LEVELS[this.levelIndex] ?? CAMPAIGN_LEVELS.at(-1);
    let objective = 'Enter the arena';
    if (this.phase === 'explore') objective = `Explore and activate elemental seals ${this.activatedSeals}/${this.sealCount} - press E nearby`;
    if (this.phase === 'combat') objective = `Clear guard wave ${this.waveIndex + 1} of ${level.waves.length}`;
    if (this.phase === 'boss_gate') objective = 'The boss gate is open - enter the inner chamber';
    if (this.phase === 'boss') objective = `Defeat ${level.boss === 'mini' ? 'the Abyss Vanguard' : 'the Elemental Overlord'}`;
    if (this.phase === 'transition') objective = 'The arena is changing…';
    if (this.phase === 'reward') objective = `Collect the ${level.reward} shard`;
    if (this.phase === 'portal') objective = 'Enter the portal to continue';
    if (this.phase === 'level_complete') objective = 'Chapter complete';
    return {
      level: this.levelIndex + 1,
      levelIndex: this.levelIndex,
      totalLevels: CAMPAIGN_LEVELS.length,
      title: level.title,
      chapter: level.chapter,
      story: level.story,
      element: level.element,
      reward: level.reward,
      phase: this.phase,
      objective,
      shards: this.shards,
      blocked: this.blocked,
      complete: this.complete,
      hasCheckpoint: this.hasCheckpoint,
    };
  }
}
