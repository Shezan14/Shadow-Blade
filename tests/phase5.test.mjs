import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EnemyAI, ENEMY_STATES } from '../src/enemies/EnemyAI.js';
import { Enemy } from '../src/enemies/Enemy.js';
import { ENEMY_TYPES } from '../src/enemies/EnemyTypes.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { CombatEffects } from '../src/combat/CombatEffects.js';

const farPlayer = new THREE.Vector3(30, 0, 30);

{
  const stats = ENEMY_TYPES.NORMAL;
  const position = new THREE.Vector3();
  const ai = new EnemyAI(stats, position);
  assert.equal(ai.state, ENEMY_STATES.IDLE);
  ai.update(stats.idleDuration + 0.01, position, farPlayer, 1, true);
  assert.equal(ai.state, ENEMY_STATES.PATROL);

  const nearPlayer = new THREE.Vector3(1, 0, 0);
  ai.update(0.02, position, nearPlayer, 1, true);
  assert.equal(ai.state, ENEMY_STATES.DETECT);
  ai.update(stats.detectDelay + 0.01, position, nearPlayer, 1, true);
  assert.equal(ai.state, ENEMY_STATES.CHASE);
  ai.update(0.02, position, nearPlayer, 1, true);
  assert.equal(ai.state, ENEMY_STATES.ATTACK);
  const strike = ai.update(stats.attackWindup + 0.01, position, nearPlayer, 1, true);
  assert.equal(strike.attack, true);
  const duplicate = ai.update(0.01, position, nearPlayer, 1, true);
  assert.equal(duplicate.attack, false, 'an attack state emits damage once');

  ai.onHit(false);
  assert.equal(ai.state, ENEMY_STATES.HIT);
  ai.update(stats.hitRecovery + 0.01, position, nearPlayer, 0.7, true);
  assert.equal(ai.state, ENEMY_STATES.CHASE);

  ai.update(0.01, position, nearPlayer, 0.1, true);
  assert.equal(ai.state, ENEMY_STATES.RETREAT);
  ai.onHit(true);
  assert.equal(ai.state, ENEMY_STATES.DEAD);
}

{
  assert.ok(ENEMY_TYPES.FAST.moveSpeed > ENEMY_TYPES.NORMAL.moveSpeed);
  assert.ok(ENEMY_TYPES.HEAVY.maxHealth > ENEMY_TYPES.NORMAL.maxHealth);
  assert.ok(ENEMY_TYPES.HEAVY.damage > ENEMY_TYPES.NORMAL.damage);
  assert.ok(ENEMY_TYPES.HEAVY.knockbackResistance > ENEMY_TYPES.NORMAL.knockbackResistance);
}

{
  const enemy = new Enemy(ENEMY_TYPES.FAST, new THREE.Vector3());
  const playerPosition = new THREE.Vector3(0.5, 0, 0);
  let attack = null;
  for (let i = 0; i < 180 && !attack; i += 1) {
    attack = enemy.update(1 / 60, i / 60, null, { aiEnabled: true, playerPosition });
  }
  assert.ok(attack, 'enemy detects, chases, and attacks the player');
  assert.equal(attack.damage, ENEMY_TYPES.FAST.damage);

  enemy.applyHit(999, new THREE.Vector3(1, 0, 0));
  assert.equal(enemy.dead, true);
  enemy.deathTimer = 0.001;
  enemy.update(0.02, 4, null, { aiEnabled: false, playerPosition });
  assert.equal(enemy.dead, false, 'defeated arena enemies reset for repeatable demonstration');
}

{
  const scene = new THREE.Scene();
  const effects = new CombatEffects(scene);
  const player = new THREE.Object3D();
  player.position.set(0, 1.2, 0);
  const attackSource = new THREE.Vector3(0, 0, -1);
  const target = {
    dead: false,
    hitRadius: 0.5,
    update() { return { damage: 20, knockback: 4, origin: attackSource, color: 0xff4422 }; },
    getHitCenter(out) { return out.set(20, 0, 20); },
    applyHit() { return 0; },
  };
  const playerCombat = { damage: 0, receiveDamage(amount) { this.damage += amount; return amount; } };
  const playerController = { force: 0, applyKnockback(_direction, force) { this.force += force; } };
  const cameraRig = { shakes: 0, addShake() { this.shakes += 1; } };
  const camera = new THREE.PerspectiveCamera();
  const system = new CombatSystem(player, [target], effects, cameraRig, camera, playerCombat, playerController);
  system.setEnabled(true);
  system.update({ attackSerial: 0, hitActive: false, blocking: false }, 1 / 60, 0, { state: 'idle' });
  assert.equal(playerCombat.damage, 20);
  assert.equal(playerController.force, 4);
  assert.equal(cameraRig.shakes, 1);

  system.update({ attackSerial: 0, hitActive: false, blocking: false }, 1 / 60, 0, { state: 'dodge' });
  assert.equal(playerCombat.damage, 20, 'dodge state grants attack invulnerability');
}

console.log('Phase 5 tests passed: AI states, archetypes, attacks, retreat, death, reset, player damage.');
