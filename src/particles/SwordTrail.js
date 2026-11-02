import * as THREE from 'three';

export class SwordTrail {
  constructor(particleSystem, sword) {
    this.particleSystem = particleSystem;
    this.sword = sword;
    this.tip = new THREE.Vector3(0, 1.55, 0);
    this.worldTip = new THREE.Vector3();
    this.previousTip = new THREE.Vector3();
    this.sampleTimer = 0;
    this.initialized = false;
  }

  update(delta, combatSnapshot) {
    if (!combatSnapshot.attacking) {
      this.initialized = false;
      this.sampleTimer = 0;
      return;
    }
    if (!this.sword) return;
    this.sword.updateWorldMatrix(true, false);
    this.worldTip.copy(this.tip).applyMatrix4(this.sword.matrixWorld);
    if (!this.initialized) {
      this.previousTip.copy(this.worldTip);
      this.initialized = true;
    }
    this.sampleTimer += delta;
    if (this.sampleTimer < 1 / 90) return;
    this.sampleTimer = 0;
    const color = combatSnapshot.comboIndex === 2 ? 0xff9b59 : combatSnapshot.comboIndex === 1 ? 0xb78cff : 0x67edff;
    for (let i = 0; i < 3; i += 1) {
      const position = this.previousTip.clone().lerp(this.worldTip, (i + 1) / 3);
      this.particleSystem.spawn({
        position,
        velocity: new THREE.Vector3(0, 0.08, 0),
        color,
        lifetime: 0.18 + i * 0.025,
        size: 0.1 - i * 0.012,
        endSize: 0.018,
        drag: 2,
        rotation: i,
        rotationSpeed: 4,
        shape: 1,
      });
    }
    this.previousTip.copy(this.worldTip);
  }
}
