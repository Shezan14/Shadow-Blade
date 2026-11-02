import * as THREE from 'three';
import { Damageable } from '../combat/DamageSystem.js';
import { emissiveMaterial, materials } from '../graphics/Materials.js';
import { attachBossRig, resolveBossClip } from '../characters/RiggedCharacter.js';

const BOSS_CONFIG = Object.freeze({
  mini: {
    name: 'Abyss Vanguard', maxHealth: 320, color: 0xd252ff, scale: 1.42,
    speed: 1.8, attackRange: 2.35, damage: 24, cooldown: 1.5,
    patterns: ['slam', 'charge'], knockbackResistance: 0.62,
  },
  final: {
    name: 'Elemental Overlord', maxHealth: 620, color: 0xffd36a, scale: 1.72,
    speed: 1.38, attackRange: 5.8, damage: 28, cooldown: 1.35,
    patterns: ['fire', 'ice', 'lightning', 'wind'], knockbackResistance: 0.82,
  },
});

function smooth(current, target, rate, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * delta));
}

export class Boss {
  constructor(type = 'mini') {
    this.type = type;
    this.config = BOSS_CONFIG[type];
    this.group = new THREE.Group();
    this.group.name = this.config.name;
    this.group.visible = false;
    this.group.scale.setScalar(this.config.scale);
    this.damageable = new Damageable(this.config.maxHealth);
    this.velocity = new THREE.Vector3();
    this.moveVelocity = new THREE.Vector3();
    this.hitRadius = 0.82 * this.config.scale;
    this.externallyManaged = true;
    this.active = false;
    this.state = 'dormant';
    this.stateTime = 0;
    this.attackCooldown = 0;
    this.attackIndex = 0;
    this.attackTriggered = false;
    this.currentPattern = this.config.patterns[0];
    this.hitFlash = 0;
    this.deathTimer = 0;
    this.phase = 1;
    this.status = { burnTime: 0, burnDamage: 0, burnTick: 0, slowTime: 0, slowFactor: 1, stunTime: 0 };
    this.buildModel();
    attachBossRig(this);
  }

  buildModel() {
    const armor = materials.armor.clone();
    armor.color.setHex(this.type === 'final' ? 0x292039 : 0x24162f);
    this.armorMaterial = armor;
    this.proceduralVisual = new THREE.Group();
    this.proceduralVisual.name = 'procedural-boss-fallback';
    this.group.add(this.proceduralVisual);
    this.bodyPivot = new THREE.Group();
    this.bodyPivot.position.y = 0.72;
    this.proceduralVisual.add(this.bodyPivot);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 1.35, 8), armor);
    torso.position.y = 0.72;
    torso.scale.z = 0.78;
    this.bodyPivot.add(torso);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), emissiveMaterial(this.config.color, 2));
    core.position.set(0, 0.75, 0.5);
    core.scale.z = 0.52;
    this.bodyPivot.add(core);

    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.43, 0), emissiveMaterial(this.config.color, 1.1));
    head.position.y = 1.58;
    this.bodyPivot.add(head);
    this.head = head;

    for (let i = 0; i < (this.type === 'final' ? 6 : 4); i += 1) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.7, 5), materials.steel);
      const angle = (i / (this.type === 'final' ? 6 : 4)) * Math.PI * 2;
      horn.position.set(Math.cos(angle) * 0.4, 1.9, Math.sin(angle) * 0.4);
      horn.rotation.z = Math.cos(angle) * 0.55;
      horn.rotation.x = Math.sin(angle) * 0.55;
      this.bodyPivot.add(horn);
    }

    this.leftArm = new THREE.Group();
    this.rightArm = new THREE.Group();
    [-1, 1].forEach((side, index) => {
      const arm = index === 0 ? this.leftArm : this.rightArm;
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 5), armor);
      shoulder.scale.set(1.25, 0.8, 1);
      arm.add(shoulder);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.05, 7), armor);
      limb.position.y = -0.55;
      arm.add(limb);
      arm.position.set(side * 0.75, 1.25, 0);
      arm.rotation.z = side * 0.18;
      this.bodyPivot.add(arm);
    });

    const weapon = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.65, 7), materials.steel);
    shaft.position.y = -0.62;
    weapon.add(shaft);
    const weaponHead = new THREE.Mesh(
      this.type === 'final' ? new THREE.OctahedronGeometry(0.42, 0) : new THREE.BoxGeometry(0.95, 0.45, 0.48),
      emissiveMaterial(this.config.color, 0.85),
    );
    weaponHead.position.y = 0.18;
    weapon.add(weaponHead);
    weapon.position.y = -0.78;
    this.rightArm.add(weapon);

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.92, 7), armor);
      leg.position.set(side * 0.3, 0.38, 0);
      this.proceduralVisual.add(leg);
    }

    this.orbitals = new THREE.Group();
    if (this.type === 'final') {
      [0xff582d, 0x54dcff, 0xb48aff, 0x4df0c5].forEach((color, index) => {
        const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), emissiveMaterial(color, 1.5));
        orb.userData.angle = index * Math.PI / 2;
        this.orbitals.add(orb);
      });
      this.orbitals.position.y = 2.55;
      this.group.add(this.orbitals);
    }

    this.group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  get dead() {
    return this.damageable.dead;
  }

  get healthRatio() {
    return this.damageable.ratio;
  }

  activate(position) {
    this.group.position.copy(position);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.setScalar(this.config.scale);
    this.bodyPivot.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.moveVelocity.set(0, 0, 0);
    this.group.visible = true;
    this.active = true;
    this.state = 'intro';
    this.stateTime = 0;
    this.damageable.reset();
    this.phase = 1;
    this.deathTimer = 0;
    if (this.riggedAnimator) this.riggedAnimator.currentName = '';
  }

  getHitCenter(target) {
    return target.copy(this.group.position).add(new THREE.Vector3(0, 1.55 * this.config.scale, 0));
  }

  applyHit(amount, knockback) {
    if (!this.active || this.dead) return 0;
    const applied = this.damageable.damage(amount);
    if (applied <= 0) return 0;
    this.velocity.addScaledVector(knockback, (1 - this.config.knockbackResistance) / this.config.scale);
    this.hitFlash = 0.18;
    if (this.dead) {
      this.state = 'dead';
      this.stateTime = 0;
      this.deathTimer = 2.4;
    }
    return applied;
  }

  applyElementEffect(effect) {
    const resistance = this.type === 'final' ? 0.68 : 0.82;
    const applied = this.applyHit(effect.damage * resistance, effect.knockback ?? new THREE.Vector3());
    if (applied <= 0 || this.dead) return applied;
    if (effect.type === 'fire') {
      this.status.burnTime = Math.max(this.status.burnTime, (effect.burnDuration ?? 0) * 0.45);
      this.status.burnDamage = (effect.burnDamage ?? 0) * resistance;
    } else if (effect.type === 'ice') {
      this.status.slowTime = Math.max(this.status.slowTime, (effect.slowDuration ?? 0) * 0.4);
      this.status.slowFactor = Math.max(0.55, effect.slowFactor ?? 1);
    } else if (effect.type === 'lightning') {
      this.status.stunTime = Math.max(this.status.stunTime, (effect.stunDuration ?? 0) * 0.28);
    }
    return applied;
  }

  updateStatus(delta) {
    if (this.status.burnTime > 0 && !this.dead) {
      this.status.burnTime = Math.max(0, this.status.burnTime - delta);
      this.status.burnTick += delta;
      if (this.status.burnTick >= 0.5) {
        this.status.burnTick = 0;
        this.applyHit(this.status.burnDamage * 0.5, new THREE.Vector3());
      }
    }
    this.status.slowTime = Math.max(0, this.status.slowTime - delta);
    if (this.status.slowTime <= 0) this.status.slowFactor = 1;
    this.status.stunTime = Math.max(0, this.status.stunTime - delta);
  }

  choosePattern() {
    let patterns = this.config.patterns;
    if (this.type === 'final' && this.phase === 1) patterns = ['fire', 'ice'];
    if (this.type === 'final' && this.phase === 2) patterns = ['lightning', 'wind'];
    this.currentPattern = patterns[this.attackIndex % patterns.length];
    this.attackIndex += 1;
  }

  update(delta, elapsed, playerPosition, enabled = true) {
    if (!this.active) return null;
    this.stateTime += delta;
    this.hitFlash = Math.max(0, this.hitFlash - delta);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.updateStatus(delta);

    const toPlayer = playerPosition.clone().sub(this.group.position).setY(0);
    const distance = toPlayer.length();
    const direction = distance > 0.001 ? toPlayer.normalize() : new THREE.Vector3(0, 0, 1);
    let event = null;

    if (this.type === 'final') {
      this.phase = this.healthRatio > 0.66 ? 1 : this.healthRatio > 0.33 ? 2 : 3;
    } else {
      this.phase = this.healthRatio > 0.5 ? 1 : 2;
    }

    if (this.state === 'intro') {
      if (this.stateTime >= 1) {
        this.state = 'chase';
        this.stateTime = 0;
      }
    } else if (this.state === 'dead') {
      this.deathTimer -= delta;
      if (!this.riggedAnimator?.ready) {
        this.bodyPivot.rotation.z = smooth(this.bodyPivot.rotation.z, 1.45, 5, delta);
        this.group.scale.y = smooth(this.group.scale.y, this.config.scale * 0.5, 3.5, delta);
      }
    } else if (enabled && this.status.stunTime <= 0) {
      if (this.state === 'chase') {
        if (distance > this.config.attackRange) {
          const speed = this.config.speed * this.status.slowFactor * (this.phase === 3 ? 1.25 : 1);
          this.moveVelocity.lerp(direction.clone().multiplyScalar(speed), 1 - Math.exp(-5 * delta));
        } else if (this.attackCooldown <= 0) {
          this.choosePattern();
          this.state = 'attack';
          this.stateTime = 0;
          this.attackTriggered = false;
        }
      } else if (this.state === 'attack') {
        this.moveVelocity.multiplyScalar(Math.exp(-8 * delta));
        const windup = this.currentPattern === 'slam' ? 0.72 : this.currentPattern === 'charge' ? 0.42 : 0.58;
        if (!this.attackTriggered && this.stateTime >= windup) {
          this.attackTriggered = true;
          event = {
            type: this.currentPattern,
            damage: this.config.damage + (this.phase - 1) * 4,
            origin: this.group.position.clone(),
            direction: direction.clone(),
            color: this.config.color,
          };
        }
        const recovery = this.type === 'final' ? 0.62 : 0.75;
        if (this.stateTime >= windup + recovery) {
          this.state = 'chase';
          this.stateTime = 0;
          this.attackCooldown = this.config.cooldown * (this.phase === 3 ? 0.68 : this.phase === 2 ? 0.84 : 1);
        }
      }
    }

    this.group.position.addScaledVector(this.moveVelocity, delta);
    this.group.position.addScaledVector(this.velocity, delta);
    this.velocity.multiplyScalar(Math.exp(-6 * delta));
    if (!this.dead && direction.lengthSq() > 0) {
      const targetYaw = Math.atan2(direction.x, direction.z);
      const angle = Math.atan2(Math.sin(targetYaw - this.group.rotation.y), Math.cos(targetYaw - this.group.rotation.y));
      this.group.rotation.y += angle * (1 - Math.exp(-7 * delta));
    }
    this.animate(delta, elapsed);
    return event;
  }

  animate(delta, elapsed) {
    if (this.riggedAnimator?.ready) {
      const clip = resolveBossClip(this);
      const oneShot = this.state === 'intro' || this.state === 'attack' || this.state === 'dead' || clip === 'Hit_B';
      this.riggedAnimator.update(delta, clip, { oneShot, timeScale: this.state === 'attack' ? 1.18 : 1 });
      this.riggedAnimator.model.traverse((child) => {
        if (child.material?.emissive) {
          child.material.emissive.setHex(this.hitFlash > 0 ? this.config.color : 0x000000);
          child.material.emissiveIntensity = this.hitFlash > 0 ? 0.62 : 0;
        }
      });
      if (this.type === 'final') {
        this.orbitals.rotation.y += delta * (0.75 + this.phase * 0.3);
        this.orbitals.children.forEach((orb, index) => {
          const angle = orb.userData.angle + elapsed * (0.8 + this.phase * 0.2);
          orb.position.set(Math.cos(angle) * 1.05, Math.sin(angle * 2 + index) * 0.18, Math.sin(angle) * 1.05);
        });
      }
      return;
    }
    const attacking = this.state === 'attack';
    const attackArc = attacking ? Math.sin(Math.min(1, this.stateTime / 0.7) * Math.PI) : 0;
    this.rightArm.rotation.x = smooth(this.rightArm.rotation.x, attacking ? -1.35 + attackArc * 2.4 : 0, 10, delta);
    this.leftArm.rotation.x = smooth(this.leftArm.rotation.x, attacking ? -0.55 : 0, 8, delta);
    this.bodyPivot.rotation.x = smooth(this.bodyPivot.rotation.x, attacking ? attackArc * 0.28 : 0, 8, delta);
    this.head.rotation.y = Math.sin(elapsed * 1.1) * 0.12;
    this.armorMaterial.emissive.setHex(this.hitFlash > 0 ? this.config.color : 0x000000);
    this.armorMaterial.emissiveIntensity = this.hitFlash > 0 ? 1.1 : 0;
    if (this.type === 'final') {
      this.orbitals.rotation.y += delta * (0.75 + this.phase * 0.3);
      this.orbitals.children.forEach((orb, index) => {
        const angle = orb.userData.angle + elapsed * (0.8 + this.phase * 0.2);
        orb.position.set(Math.cos(angle) * 1.05, Math.sin(angle * 2 + index) * 0.18, Math.sin(angle) * 1.05);
      });
    }
  }
}

export function createBosses() {
  return {
    miniBoss: new Boss('mini'),
    finalBoss: new Boss('final'),
  };
}
