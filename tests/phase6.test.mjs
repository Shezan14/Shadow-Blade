import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ElementSystem } from '../src/elements/ElementSystem.js';
import { ENEMY_TYPES } from '../src/enemies/EnemyTypes.js';
import { Enemy } from '../src/enemies/Enemy.js';

class ElementTarget {
  constructor(x, z) {
    this.position = new THREE.Vector3(x, 1.2, z);
    this.hitRadius = 0.6;
    this.dead = false;
    this.effects = [];
  }

  getHitCenter(out) {
    return out.copy(this.position);
  }

  applyElementEffect(effect) {
    this.effects.push(effect);
    return effect.damage;
  }
}

function createSystem(targets) {
  const parent = new THREE.Group();
  const player = new THREE.Object3D();
  player.position.set(0, 1.2, 0);
  player.rotation.y = Math.PI;
  const controller = {
    dashForce: 0,
    applyKnockback(_direction, strength) { this.dashForce += strength; },
  };
  const cameraRig = { shakes: 0, addShake() { this.shakes += 1; } };
  const fakeTarget = { addEventListener() {} };
  const canvas = {};
  const system = new ElementSystem({
    parent,
    player,
    targets,
    playerController: controller,
    cameraRig,
    canvas,
    eventTarget: fakeTarget,
    documentTarget: { pointerLockElement: canvas },
  });
  system.setEnabled(true);
  return { system, controller, cameraRig };
}

{
  const target = new ElementTarget(0, -2.2);
  const { system } = createSystem([target]);
  system.playerCombat = { attacking: true, blocking: false };
  assert.equal(system.activate('ice'), false, 'abilities cannot interrupt sword attacks');
  system.playerCombat.attacking = false;
  assert.equal(system.activate('ice'), true);
  assert.equal(target.effects[0].type, 'ice');
  assert.equal(target.effects[0].slowFactor, 0, 'close ice targets are frozen');
  assert.equal(system.activate('ice'), false, 'cooldown prevents immediate recast');
  system.update(5.7);
  assert.equal(system.getSnapshot().elements.ice.ready, true);
}

{
  const targets = [0, 1, 2, 3].map((index) => new ElementTarget(index * 0.45 - 0.7, -2.5 - index * 0.4));
  const { system } = createSystem(targets);
  system.activate('lightning');
  assert.equal(targets.filter((target) => target.effects.length > 0).length, 3, 'lightning chains to at most three targets');
  assert.ok(targets[0].effects[0].stunDuration > 0);
}

{
  const target = new ElementTarget(0.4, -2);
  const { system, controller } = createSystem([target]);
  system.activate('wind');
  assert.equal(controller.dashForce, 8.5);
  assert.equal(target.effects[0].type, 'wind');
  assert.ok(target.effects[0].knockback.length() >= 10.9);
}

{
  const target = new ElementTarget(0, -2.35);
  const { system } = createSystem([target]);
  system.activate('fire');
  for (let i = 0; i < 20 && target.effects.length === 0; i += 1) system.update(1 / 30);
  assert.equal(target.effects[0].type, 'fire');
  assert.equal(target.effects[0].burnDuration, 3);
}

{
  const enemy = new Enemy(ENEMY_TYPES.NORMAL, new THREE.Vector3());
  const startHealth = enemy.damageable.health;
  enemy.applyElementEffect({
    type: 'fire', damage: 10, knockback: new THREE.Vector3(), burnDamage: 4, burnDuration: 1,
  });
  enemy.updateStatus(1.01);
  assert.equal(enemy.damageable.health, startHealth - 14, 'fire adds damage over time');

  enemy.reset();
  enemy.applyElementEffect({
    type: 'ice', damage: 1, knockback: new THREE.Vector3(), slowFactor: 0.35, slowDuration: 2,
  });
  assert.equal(enemy.status.slowFactor, 0.35);
  assert.ok(enemy.status.slowTime > 0);

  enemy.reset();
  enemy.applyElementEffect({
    type: 'lightning', damage: 1, knockback: new THREE.Vector3(), stunDuration: 1.2,
  });
  assert.equal(enemy.status.stunTime, 1.2);
}

console.log('Phase 6 tests passed: fire burn, ice freeze/slow, lightning chain/stun, wind dash/knockback, cooldowns.');
