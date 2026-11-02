import * as THREE from 'three';
import { Damageable } from '../combat/DamageSystem.js';
import { EnemyAI, ENEMY_STATES } from './EnemyAI.js';
import { emissiveMaterial, materials } from '../graphics/Materials.js';
import { attachEnemyRig, resolveEnemyClip } from '../characters/RiggedCharacter.js';

const ARENA_RADIUS = 7.05;

function smooth(current, target, rate, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * delta));
}

function createWeapon(type, color) {
  const weapon = new THREE.Group();
  if (type === 'heavy') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.15, 6), materials.steel);
    shaft.position.y = -0.25;
    weapon.add(shaft);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.38, 0.38), emissiveMaterial(color, 0.5));
    head.position.y = 0.32;
    weapon.add(head);
  } else if (type === 'fast') {
    [-0.11, 0.11].forEach((x) => {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.7, 5), emissiveMaterial(color, 1.1));
      claw.position.set(x, -0.25, 0.12);
      claw.rotation.x = Math.PI;
      weapon.add(claw);
    });
  } else {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.06), materials.steel);
    blade.position.y = -0.2;
    weapon.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 0.1), emissiveMaterial(color, 0.65));
    guard.position.y = 0.3;
    weapon.add(guard);
  }
  return weapon;
}

export class Enemy {
  constructor(stats, position) {
    this.stats = stats;
    this.group = new THREE.Group();
    this.group.name = stats.name;
    this.group.position.copy(position);
    this.group.scale.setScalar(stats.scale);
    this.spawnPosition = position.clone();
    this.damageable = new Damageable(stats.maxHealth);
    this.ai = new EnemyAI(stats, position);
    this.velocity = new THREE.Vector3();
    this.moveVelocity = new THREE.Vector3();
    this.hitRadius = 0.58 * stats.scale;
    this.deathTimer = 0;
    this.walkCycle = 0;
    this.respawns = true;
    this.damageScale = 1;
    this.speedScale = 1;
    this.permanentlyDefeated = false;
    this.worldCollider = null;
    this.status = {
      burnTime: 0,
      burnDamage: 0,
      burnAccumulator: 0,
      slowTime: 0,
      slowFactor: 1,
      stunTime: 0,
    };

    const bodyMaterial = materials.armor.clone();
    bodyMaterial.color.setHex(stats.id === 'heavy' ? 0x2b2940 : stats.id === 'fast' ? 0x102538 : 0x2c1c24);
    this.bodyMaterial = bodyMaterial;

    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    [-1, 1].forEach((side, index) => {
      const leg = index === 0 ? leftLeg : rightLeg;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.72, 6), bodyMaterial);
      mesh.position.y = -0.34;
      leg.add(mesh);
      leg.position.set(side * 0.2, 0.72, 0);
      this.group.add(leg);
    });

    this.bodyPivot = new THREE.Group();
    this.bodyPivot.position.y = 0.72;
    this.group.add(this.bodyPivot);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.92, 7), bodyMaterial);
    torso.position.y = 0.48;
    torso.scale.z = 0.76;
    this.bodyPivot.add(torso);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), emissiveMaterial(stats.color, 1.8));
    core.position.set(0, 0.52, 0.3);
    core.scale.z = 0.45;
    this.bodyPivot.add(core);

    const head = new THREE.Mesh(
      stats.id === 'fast' ? new THREE.ConeGeometry(0.3, 0.65, 6) : new THREE.OctahedronGeometry(0.31, 0),
      emissiveMaterial(stats.color, stats.id === 'heavy' ? 0.8 : 1.3),
    );
    head.position.y = 1.17;
    head.scale.y = stats.id === 'fast' ? 1 : 1.16;
    this.bodyPivot.add(head);

    this.leftArm = new THREE.Group();
    this.rightArm = new THREE.Group();
    [-1, 1].forEach((side, index) => {
      const arm = index === 0 ? this.leftArm : this.rightArm;
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.72, 6), bodyMaterial);
      limb.position.y = -0.33;
      arm.add(limb);
      arm.position.set(side * 0.48, 0.92, 0);
      arm.rotation.z = side * 0.15;
      this.bodyPivot.add(arm);
    });

    this.weapon = createWeapon(stats.id, stats.color);
    this.weapon.position.set(0, -0.66, 0.08);
    this.rightArm.add(this.weapon);

    const barGroup = new THREE.Group();
    barGroup.position.y = 2.45;
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x05070d, depthTest: false }),
    );
    backdrop.renderOrder = 6;
    barGroup.add(backdrop);
    this.healthBar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 0.052),
      new THREE.MeshBasicMaterial({ color: stats.color, depthTest: false }),
    );
    this.healthBar.position.z = 0.006;
    this.healthBar.renderOrder = 7;
    barGroup.add(this.healthBar);
    this.healthBarGroup = barGroup;
    this.group.add(barGroup);

    this.group.traverse((child) => {
      if (child.isMesh && child !== this.healthBar && child !== backdrop) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.parts = { leftLeg, rightLeg, torso, head };
    attachEnemyRig(this, stats.id === 'heavy' ? 'barbarian' : 'knight');
  }

  get dead() {
    return this.damageable.dead;
  }

  getHitCenter(target) {
    return target.copy(this.group.position).add(new THREE.Vector3(0, 1.15 * this.stats.scale, 0));
  }

  applyHit(amount, knockback) {
    const applied = this.damageable.damage(amount);
    if (applied <= 0) return 0;
    const resistance = 1 - this.stats.knockbackResistance;
    this.velocity.addScaledVector(knockback, resistance / this.stats.scale);
    this.ai.onHit(this.dead);
    if (this.dead) this.deathTimer = 4.5;
    return applied;
  }

  applyElementEffect(effect) {
    const applied = this.applyHit(effect.damage, effect.knockback ?? new THREE.Vector3());
    if (applied <= 0 || this.dead) return applied;
    if (effect.type === 'fire') {
      this.status.burnTime = Math.max(this.status.burnTime, effect.burnDuration ?? 0);
      this.status.burnDamage = Math.max(this.status.burnDamage, effect.burnDamage ?? 0);
      this.status.burnAccumulator = 0;
    } else if (effect.type === 'ice') {
      this.status.slowTime = Math.max(this.status.slowTime, effect.slowDuration ?? 0);
      this.status.slowFactor = Math.min(this.status.slowFactor, effect.slowFactor ?? 1);
    } else if (effect.type === 'lightning') {
      this.status.stunTime = Math.max(this.status.stunTime, effect.stunDuration ?? 0);
    }
    return applied;
  }

  updateStatus(delta) {
    if (this.status.burnTime > 0 && !this.dead) {
      this.status.burnTime = Math.max(0, this.status.burnTime - delta);
      this.status.burnAccumulator += delta;
      while (this.status.burnAccumulator >= 0.5) {
        this.status.burnAccumulator -= 0.5;
        this.damageable.damage(this.status.burnDamage * 0.5);
        if (this.dead) {
          this.ai.onHit(true);
          this.deathTimer = 4.5;
          break;
        }
      }
    }
    this.status.slowTime = Math.max(0, this.status.slowTime - delta);
    if (this.status.slowTime <= 0) this.status.slowFactor = 1;
    this.status.stunTime = Math.max(0, this.status.stunTime - delta);
  }

  reset() {
    this.damageable.reset();
    this.ai.reset();
    this.group.position.copy(this.spawnPosition);
    this.group.rotation.set(0, 0, 0);
    this.bodyPivot.rotation.set(0, 0, 0);
    this.group.scale.setScalar(this.stats.scale);
    this.velocity.set(0, 0, 0);
    this.moveVelocity.set(0, 0, 0);
    this.deathTimer = 0;
    this.permanentlyDefeated = false;
    this.status.burnTime = 0;
    this.status.burnDamage = 0;
    this.status.burnAccumulator = 0;
    this.status.slowTime = 0;
    this.status.slowFactor = 1;
    this.status.stunTime = 0;
  }

  update(delta, elapsed, camera, context = {}) {
    this.updateStatus(delta);
    const playerPosition = context.playerPosition ?? this.group.position;
    const command = this.ai.update(
      delta,
      this.group.position,
      playerPosition,
      this.damageable.ratio,
      context.aiEnabled && this.status.stunTime <= 0,
    );
    if (this.status.slowTime > 0) command.speed *= this.status.slowFactor;
    this.group.userData.aiState = command.state;

    const targetVelocity = command.direction.clone().multiplyScalar(command.speed * this.speedScale);
    this.moveVelocity.lerp(targetVelocity, 1 - Math.exp(-7 * delta));
    this.group.position.addScaledVector(this.moveVelocity, delta);
    this.group.position.addScaledVector(this.velocity, delta);
    this.velocity.multiplyScalar(Math.exp(-5 * delta));

    if (this.worldCollider) this.worldCollider(this.group.position, this.moveVelocity, this.hitRadius);
    else {
      const horizontal = new THREE.Vector2(this.group.position.x, this.group.position.z);
      if (horizontal.length() > ARENA_RADIUS) {
        horizontal.setLength(ARENA_RADIUS);
        this.group.position.x = horizontal.x;
        this.group.position.z = horizontal.y;
      }
    }

    if (command.direction.lengthSq() > 0.01) {
      const targetYaw = Math.atan2(command.direction.x, command.direction.z);
      const angle = Math.atan2(Math.sin(targetYaw - this.group.rotation.y), Math.cos(targetYaw - this.group.rotation.y));
      this.group.rotation.y += angle * (1 - Math.exp(-10 * delta));
    }

    this.animate(command.state, delta, elapsed);
    this.healthBar.scale.x = Math.max(0.001, this.damageable.ratio);
    this.healthBar.position.x = -(0.98 - 0.98 * this.damageable.ratio) / 2;
    if (camera) this.healthBarGroup.quaternion.copy(camera.quaternion);

    if (this.dead) {
      this.deathTimer -= delta;
      if (this.deathTimer <= 0) {
        if (this.respawns) this.reset();
        else {
          this.permanentlyDefeated = true;
          this.group.visible = false;
        }
      }
    }

    if (command.attack) {
      return {
        damage: this.stats.damage * this.damageScale,
        knockback: this.stats.id === 'heavy' ? 6.5 : this.stats.id === 'fast' ? 2.8 : 4.2,
        origin: this.group.position,
        color: this.stats.color,
      };
    }
    return null;
  }

  animate(state, delta, elapsed) {
    if (this.riggedAnimator?.ready) {
      const clip = resolveEnemyClip(state);
      const oneShot = state === ENEMY_STATES.ATTACK || state === ENEMY_STATES.HIT || state === ENEMY_STATES.DEAD;
      this.riggedAnimator.update(delta, clip, { oneShot, timeScale: this.stats.id === 'fast' ? 1.22 : 1 });
      let statusColor = 0x000000;
      if (this.status.burnTime > 0) statusColor = 0xff3d16;
      else if (this.status.slowTime > 0) statusColor = 0x36cfff;
      else if (this.status.stunTime > 0) statusColor = 0xa56dff;
      this.riggedAnimator.model.traverse((child) => {
        if (child.material?.emissive) {
          child.material.emissive.setHex(statusColor);
          child.material.emissiveIntensity = statusColor ? 0.38 : 0;
        }
      });
      return;
    }
    const moving = state === ENEMY_STATES.PATROL || state === ENEMY_STATES.CHASE || state === ENEMY_STATES.RETREAT;
    this.walkCycle += delta * (this.stats.id === 'fast' ? 11 : this.stats.id === 'heavy' ? 5 : 7);
    const stride = moving ? Math.sin(this.walkCycle) * (this.stats.id === 'heavy' ? 0.32 : 0.52) : 0;
    this.parts.leftLeg.rotation.x = smooth(this.parts.leftLeg.rotation.x, stride, 12, delta);
    this.parts.rightLeg.rotation.x = smooth(this.parts.rightLeg.rotation.x, -stride, 12, delta);
    this.leftArm.rotation.x = smooth(this.leftArm.rotation.x, -stride * 0.6, 11, delta);

    let rightArmX = stride * 0.25;
    let bodyX = 0;
    let bodyZ = 0;
    if (state === ENEMY_STATES.DETECT) {
      rightArmX = -0.55;
      bodyX = -0.08;
    } else if (state === ENEMY_STATES.ATTACK) {
      const p = Math.min(1, this.ai.stateTime / (this.stats.attackWindup + this.stats.attackRecovery));
      rightArmX = -1.35 + p * 2.25;
      bodyX = -0.2 + p * 0.42;
    } else if (state === ENEMY_STATES.HIT) {
      bodyX = -0.3;
      bodyZ = Math.sin(this.ai.stateTime * 28) * 0.12;
    } else if (state === ENEMY_STATES.DEAD) {
      bodyX = 0.45;
      bodyZ = 1.35;
      this.group.scale.y = smooth(this.group.scale.y, this.stats.scale * 0.68, 4, delta);
    }
    this.rightArm.rotation.x = smooth(this.rightArm.rotation.x, rightArmX, 14, delta);
    this.bodyPivot.rotation.x = smooth(this.bodyPivot.rotation.x, bodyX, 10, delta);
    this.bodyPivot.rotation.z = smooth(this.bodyPivot.rotation.z, bodyZ, 9, delta);
    this.parts.head.rotation.y = Math.sin(elapsed * 1.4 + this.spawnPosition.x) * 0.12;
    let statusColor = 0x000000;
    if (this.status.burnTime > 0) statusColor = 0xff3d16;
    else if (this.status.slowTime > 0) statusColor = 0x36cfff;
    else if (this.status.stunTime > 0) statusColor = 0xa56dff;
    if (state === ENEMY_STATES.HIT) statusColor = this.stats.color;
    this.bodyMaterial.emissive.setHex(statusColor);
    this.bodyMaterial.emissiveIntensity = statusColor ? 0.78 : 0;
  }
}
