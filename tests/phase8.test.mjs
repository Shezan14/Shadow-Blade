import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Boss, createBosses } from '../src/enemies/Boss.js';
import { BossSystem } from '../src/core/BossSystem.js';

{
  const mini = new Boss('mini');
  mini.activate(new THREE.Vector3());
  mini.applyHit(170, new THREE.Vector3());
  mini.update(0.01, 0, new THREE.Vector3(1, 0, 0), true);
  assert.equal(mini.phase, 2, 'mini-boss enters phase two below half health');
  assert.ok(mini.healthRatio < 0.5);
  mini.applyHit(999, new THREE.Vector3());
  assert.equal(mini.dead, true);
  assert.equal(mini.state, 'dead');
}

{
  const boss = new Boss('final');
  boss.activate(new THREE.Vector3());
  const player = new THREE.Vector3(0, 0, 2);
  boss.update(1.01, 0, player, true);
  assert.equal(boss.state, 'chase');

  const patterns = [];
  for (let attack = 0; attack < 2; attack += 1) {
    boss.attackCooldown = 0;
    boss.state = 'chase';
    boss.update(0.01, attack, player, true);
    const event = boss.update(0.7, attack + 0.1, player, true);
    patterns.push(event.type);
  }
  assert.deepEqual(patterns, ['fire', 'ice']);

  boss.damageable.health = boss.damageable.maxHealth * 0.5;
  boss.attackCooldown = 0;
  boss.state = 'chase';
  boss.update(0.01, 2, player, true);
  const lightning = boss.update(0.7, 2.1, player, true);
  assert.equal(boss.phase, 2);
  assert.equal(lightning.type, 'lightning');

  boss.attackCooldown = 0;
  boss.state = 'chase';
  boss.update(0.01, 3, player, true);
  const wind = boss.update(0.7, 3.1, player, true);
  assert.equal(wind.type, 'wind');

  boss.damageable.health = boss.damageable.maxHealth * 0.2;
  boss.update(0.01, 4, player, true);
  assert.equal(boss.phase, 3, 'final boss enters its fastest phase below one-third health');
}

{
  const { miniBoss, finalBoss } = createBosses();
  const enemies = [{ dead: true, respawns: true }, { dead: true, respawns: true }, { dead: true, respawns: true }];
  const targets = [];
  const player = new THREE.Object3D();
  player.position.set(0, 1.2, 2);
  const cameraRig = { shakes: 0, addShake() { this.shakes += 1; } };
  const playerCombat = {
    health: { dead: false }, blocking: false, damage: 0,
    receiveDamage(amount) { this.damage += amount; return amount; },
  };
  const playerController = { force: 0, applyKnockback(_direction, force) { this.force += force; } };
  const effects = {
    spawnBurst() {}, spawnRing() {}, spawnShards() {}, spawnLightning() {}, emitTrail() {},
    createProjectile() { return new THREE.Object3D(); }, removeProjectile() {},
  };
  const system = new BossSystem({
    enemies, targets, miniBoss, finalBoss, player, playerCombat, playerController, cameraRig, effects,
  });
  assert.ok(enemies.every((enemy) => enemy.respawns === false));
  system.setEnabled(true);
  let snapshot = system.update(0.01, 0, { state: 'idle' }, { blocking: false });
  assert.equal(snapshot.stage, 'mini_intro');
  snapshot = system.update(1.7, 1.7, { state: 'idle' }, { blocking: false });
  assert.equal(snapshot.stage, 'mini');
  assert.ok(targets.includes(miniBoss));

  miniBoss.applyHit(9999, new THREE.Vector3());
  snapshot = system.update(0.01, 2, { state: 'idle' }, { blocking: false });
  assert.equal(snapshot.stage, 'final_intro');
  snapshot = system.update(2.6, 4.6, { state: 'idle' }, { blocking: false });
  assert.equal(snapshot.stage, 'final');
  assert.ok(targets.includes(finalBoss));

  finalBoss.applyHit(9999, new THREE.Vector3());
  snapshot = system.update(0.01, 5, { state: 'idle' }, { blocking: false });
  assert.equal(snapshot.stage, 'victory_pending');
  snapshot = system.update(2.7, 7.7, { state: 'idle' }, { blocking: false });
  assert.equal(snapshot.stage, 'complete');
  assert.equal(snapshot.complete, true);
}

{
  const { miniBoss, finalBoss } = createBosses();
  const player = new THREE.Object3D();
  const playerCombat = {
    health: { dead: false }, damage: 0,
    receiveDamage(amount) { this.damage += amount; return amount; },
  };
  const system = new BossSystem({
    enemies: [], targets: [], miniBoss, finalBoss, player, playerCombat,
    playerController: { applyKnockback() {} }, cameraRig: { addShake() {} },
    effects: { spawnBurst() {} },
  });
  system.damagePlayer(20, new THREE.Vector3(0, 0, -1), 3, 0xff0000, { state: 'dodge' }, { blocking: false });
  assert.equal(playerCombat.damage, 0, 'dodging avoids boss damage');
  system.damagePlayer(20, new THREE.Vector3(0, 0, -1), 3, 0xff0000, { state: 'idle' }, { blocking: false });
  assert.equal(playerCombat.damage, 20);
}

console.log('Phase 8 tests passed: boss phases, elemental patterns, progression, damage, death, victory state.');
