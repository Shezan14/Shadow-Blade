import * as THREE from 'three';
import { Damageable } from '../combat/DamageSystem.js';
import { emissiveMaterial, materials } from '../graphics/Materials.js';

const UP = new THREE.Vector3(0, 1, 0);

export class TrainingSentinel {
  constructor(position, accent = 0x7a62ff) {
    this.group = new THREE.Group();
    this.group.name = 'Training Sentinel';
    this.group.position.copy(position);
    this.spawnPosition = position.clone();
    this.damageable = new Damageable(85);
    this.velocity = new THREE.Vector3();
    this.hitRadius = 0.68;
    this.hitTimer = 0;
    this.deathTimer = 0;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.72, 0.34, 8), materials.darkStone);
    base.position.y = 0.17;
    this.group.add(base);

    const bodyMaterial = materials.armor.clone();
    this.bodyMaterial = bodyMaterial;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 1.45, 7), bodyMaterial);
    body.position.y = 1.03;
    this.group.add(body);

    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 0.38), materials.steel);
    shoulders.position.y = 1.62;
    this.group.add(shoulders);

    const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), emissiveMaterial(accent, 1.5));
    head.position.y = 2.02;
    head.scale.y = 1.25;
    this.group.add(head);

    const healthBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(1.18, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x070910, depthTest: false }),
    );
    healthBackdrop.position.y = 2.65;
    healthBackdrop.renderOrder = 4;
    this.group.add(healthBackdrop);

    this.healthBar = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.055),
      new THREE.MeshBasicMaterial({ color: accent, depthTest: false }),
    );
    this.healthBar.position.set(0, 2.65, 0.008);
    this.healthBar.renderOrder = 5;
    this.group.add(this.healthBar);

    this.group.traverse((child) => {
      if (child.isMesh && child !== this.healthBar && child !== healthBackdrop) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  get dead() {
    return this.damageable.dead;
  }

  getHitCenter(target) {
    return target.copy(this.group.position).addScaledVector(UP, 1.15);
  }

  applyHit(amount, knockback) {
    const applied = this.damageable.damage(amount);
    if (applied <= 0) return 0;
    this.velocity.add(knockback);
    this.hitTimer = 0.2;
    if (this.dead) this.deathTimer = 3.2;
    return applied;
  }

  reset() {
    this.damageable.reset();
    this.group.position.copy(this.spawnPosition);
    this.group.rotation.set(0, 0, 0);
    this.group.scale.setScalar(1);
    this.velocity.set(0, 0, 0);
    this.hitTimer = 0;
    this.deathTimer = 0;
    this.group.visible = true;
  }

  update(delta, elapsed, camera) {
    this.hitTimer = Math.max(0, this.hitTimer - delta);
    this.bodyMaterial.emissive.setHex(this.hitTimer > 0 ? 0x6f2858 : 0x000000);
    this.bodyMaterial.emissiveIntensity = this.hitTimer > 0 ? 1.2 : 0;

    this.group.position.x += this.velocity.x * delta;
    this.group.position.z += this.velocity.z * delta;
    this.velocity.multiplyScalar(Math.exp(-5.5 * delta));
    this.healthBar.scale.x = Math.max(0.001, this.damageable.ratio);
    this.healthBar.position.x = -(1.1 - 1.1 * this.damageable.ratio) / 2;

    if (camera) {
      const yaw = Math.atan2(
        camera.position.x - this.group.position.x,
        camera.position.z - this.group.position.z,
      );
      this.healthBar.rotation.y = yaw;
    }

    if (this.dead) {
      this.deathTimer -= delta;
      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, 1.35, 1 - Math.exp(-7 * delta));
      this.group.scale.y = THREE.MathUtils.lerp(this.group.scale.y, 0.72, 1 - Math.exp(-5 * delta));
      if (this.deathTimer <= 0) this.reset();
    } else {
      this.group.rotation.y = Math.sin(elapsed * 0.75 + this.spawnPosition.x) * 0.08;
    }
  }
}

export function createTrainingSentinels() {
  return [
    new TrainingSentinel(new THREE.Vector3(0.85, 0, 0.25), 0xff6c42),
    new TrainingSentinel(new THREE.Vector3(-2.8, 0, -2.1), 0x53dfff),
    new TrainingSentinel(new THREE.Vector3(3.4, 0, -2.4), 0xa878ff),
  ];
}
