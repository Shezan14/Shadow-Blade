import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CampaignSystem } from '../src/core/CampaignSystem.js';

function createEnemy(id) {
  return {
    stats: { maxHealth: 80 + id * 20 },
    group: { visible: true, position: new THREE.Vector3() },
    spawnPosition: new THREE.Vector3(),
    damageable: {
      health: 100, maxHealth: 100, dead: false,
      reset() { this.health = this.maxHealth; this.dead = false; },
    },
    ai: { onHit(dead) { this.dead = dead; } },
    reset() { this.damageable.reset(); },
    respawns: true,
    dead: false,
    get dead() { return this.damageable.dead; },
  };
}

const data = new Map();
const storage = {
  getItem(key) { return data.get(key) ?? null; },
  setItem(key, value) { data.set(key, value); },
  removeItem(key) { data.delete(key); },
};
const enemies = [createEnemy(0), createEnemy(1), createEnemy(2)];
const miniBoss = { group: { visible: false }, active: false, dead: false };
const finalBoss = { group: { visible: false }, active: false, dead: false };
const maps = {
  shard: { position: new THREE.Vector3(0, 1.25, 0) },
  portal: { position: new THREE.Vector3(0, 1.35, -5.7) },
  level: -1, shardShown: false, portalShown: false, activated: 0, gateOpened: false,
  setLevel(index) { this.level = index; },
  startObjectives() { this.activated = 0; return this.level === 0 ? 3 : 0; },
  activateNearbySeal() { this.activated += 1; return true; },
  openGate() { this.gateOpened = true; },
  getBossTrigger() { return [0, -2]; },
  getBossSpawn() { return [0, -4]; },
  showShard() { this.shardShown = true; },
  hideShard() { this.shardShown = false; },
  showPortal() { this.portalShown = true; },
  hidePortal() { this.portalShown = false; },
};
const elementSystem = { unlocked: [], setUnlocked(ids) { this.unlocked = [...new Set(ids)]; } };
const bossSystem = {
  activeBoss: null, completed: false,
  startEncounter(type, position) {
    this.started = type;
    this.position = position;
    this.completed = false;
    this.activeBoss = type === 'mini' ? miniBoss : finalBoss;
    this.activeBoss.dead = false;
  },
};
const player = new THREE.Object3D();
const playerCombat = {
  maxStamina: 100, stamina: 10,
  health: { resetCalled: 0, reset() { this.resetCalled += 1; } },
};

const campaign = new CampaignSystem({
  enemies, bosses: { miniBoss, finalBoss }, bossSystem, maps, elementSystem, player, playerCombat, storage,
});
campaign.startNew();
assert.equal(campaign.phase, 'story');
assert.equal(campaign.blocked, true);
assert.equal(maps.level, 0);
assert.deepEqual(elementSystem.unlocked, ['fire']);
assert.equal(campaign.beginLevel(), true);
assert.equal(campaign.phase, 'explore');
assert.equal(campaign.activeEnemies.length, 0);
for (let index = 0; index < 3; index += 1) {
  campaign.interactQueued = true;
  campaign.update(0.01);
}
assert.equal(campaign.phase, 'transition');
campaign.update(1);
assert.equal(campaign.phase, 'combat');
assert.equal(campaign.activeEnemies.length, 2);
assert.ok(campaign.activeEnemies.every((enemy) => enemy.group.visible));

campaign.activeEnemies.forEach((enemy) => { enemy.damageable.dead = true; });
campaign.update(0.01);
assert.equal(campaign.phase, 'transition');
campaign.update(2);
assert.equal(campaign.phase, 'combat', 'the second guard wave must be cleared');
assert.equal(campaign.activeEnemies.length, 3);
campaign.activeEnemies.forEach((enemy) => { enemy.damageable.dead = true; });
campaign.update(0.01);
campaign.update(2);
assert.equal(campaign.phase, 'boss_gate');
assert.equal(maps.gateOpened, true);
assert.equal(maps.portalShown, false, 'portal stays locked before the boss');
player.position.set(0, 0, -2);
campaign.update(0.01);
assert.equal(campaign.phase, 'boss');
assert.equal(bossSystem.started, 'mini');
bossSystem.completed = true;
campaign.update(0.01);
assert.equal(campaign.phase, 'transition');
campaign.update(3.3);
assert.equal(campaign.phase, 'reward');
assert.equal(maps.shardShown, true);

player.position.copy(maps.shard.position);
campaign.update(0.01);
assert.equal(campaign.phase, 'portal');
assert.equal(campaign.shards, 1);
assert.deepEqual(elementSystem.unlocked, ['fire', 'ice']);
assert.ok(storage.getItem('shadowBladeCheckpoint'));

player.position.copy(maps.portal.position);
campaign.update(0.01);
assert.equal(campaign.phase, 'level_complete');
assert.equal(campaign.advanceLevel(), true);
assert.equal(campaign.levelIndex, 1);
assert.equal(campaign.phase, 'story');
assert.equal(maps.level, 1);

const resumed = new CampaignSystem({
  enemies: [createEnemy(0), createEnemy(1), createEnemy(2)],
  bosses: { miniBoss: { group: { visible: false }, active: false }, finalBoss: { group: { visible: false }, active: false } },
  bossSystem, maps, elementSystem, player, playerCombat, storage,
});
resumed.continueFromCheckpoint();
assert.equal(resumed.levelIndex, 1, 'checkpoint resumes at the next unlocked chapter');
assert.equal(resumed.shards, 1);
assert.deepEqual(elementSystem.unlocked, ['fire', 'ice']);

resumed.levelIndex = 3;
resumed.prepareLevel();
resumed.beginLevel();
player.position.set(0, 0, -2);
resumed.update(0.01);
assert.equal(bossSystem.started, 'mini', 'the fourth chapter launches the mini-boss encounter');
bossSystem.completed = true;
resumed.update(0.01);
resumed.update(3.3);
assert.equal(resumed.phase, 'reward', 'the mini-boss chapter awards its portal shard instead of launching the final boss');

resumed.levelIndex = 4;
resumed.prepareLevel();
resumed.beginLevel();
player.position.set(0, 0, -2);
resumed.update(0.01);
assert.equal(bossSystem.started, 'final', 'the fifth chapter launches the final boss');
bossSystem.completed = true;
resumed.update(0.01);
resumed.update(3.3);
assert.equal(resumed.complete, true, 'the final boss completes the campaign');

console.log('Campaign tests passed: chapters, waves, shards, portals, unlocks, scaling, and checkpoints.');
