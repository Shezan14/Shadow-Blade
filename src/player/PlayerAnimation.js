import * as THREE from 'three';
import { PlayerRiggedAnimator } from '../characters/RiggedCharacter.js';

function smooth(current, target, rate, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * delta));
}

export class PlayerAnimation {
  constructor(player) {
    this.rigged = new PlayerRiggedAnimator(player);
    this.parts = player.userData.parts;
    this.cycle = 0;
    this.baseTorsoY = this.parts.torso.position.y;
    this.baseHoodY = this.parts.hood.position.y;
    this.baseSwordPosition = this.parts.sword.position.clone();
  }

  update(snapshot, combat, elapsed, delta) {
    this.rigged.update(snapshot, combat, delta);
    if (this.rigged.rig.ready) return;
    const { torso, hood, cape, leftArm, rightArm, leftLeg, rightLeg, sword } = this.parts;
    const moving = snapshot.state === 'walk' || snapshot.state === 'run';
    const pace = snapshot.state === 'run' ? 11 : 7;
    this.cycle += delta * pace * (moving ? 1 : 0.35);
    const stride = moving ? Math.sin(this.cycle) * (snapshot.state === 'run' ? 0.72 : 0.45) : 0;
    const idleBreath = Math.sin(elapsed * 1.8) * 0.025;

    let leftLegX = stride;
    let rightLegX = -stride;
    let leftArmX = -stride * 0.65;
    let rightArmX = -0.22 + stride * 0.18;
    let torsoZ = moving ? -stride * 0.045 : 0;
    let torsoX = snapshot.state === 'run' ? 0.13 : 0;
    let capeX = snapshot.state === 'run' ? 0.25 + Math.abs(stride) * 0.12 : 0.06 + idleBreath;
    let rightArmZ = 0.12;
    let swordX = -0.16 + rightArmX * 0.15;
    let swordZ = -0.24;
    let swordOffsetX = 0;
    let swordOffsetY = 0;

    if (snapshot.state === 'jump') {
      leftLegX = -0.48;
      rightLegX = -0.28;
      leftArmX = -0.38;
      rightArmX = -0.52;
      torsoX = -0.08;
      capeX = 0.42;
    } else if (snapshot.state === 'fall') {
      leftLegX = 0.22;
      rightLegX = 0.38;
      leftArmX = 0.38;
      rightArmX = 0.12;
      capeX = 0.5;
    } else if (snapshot.state === 'dodge') {
      const roll = (1 - snapshot.dodgeProgress) * Math.PI * 2;
      torsoX = 0.55;
      torsoZ = Math.sin(roll) * 0.18;
      leftLegX = -0.7;
      rightLegX = 0.48;
      leftArmX = 0.52;
      rightArmX = -0.65;
      capeX = 0.65;
    }

    if (combat.blocking) {
      rightArmX = -0.85;
      rightArmZ = -0.55;
      leftArmX = -0.5;
      swordX = -0.35;
      swordZ = 1.18;
      swordOffsetX = -0.34;
      swordOffsetY = 0.38;
      torsoX = 0.08;
    } else if (combat.attacking) {
      const p = combat.attackProgress;
      const eased = p * p * (3 - 2 * p);
      if (combat.comboIndex === 0) {
        swordZ = -1.25 + eased * 2.55;
        swordX = -0.3 + Math.sin(p * Math.PI) * 0.55;
        rightArmZ = -0.65 + eased * 1.15;
        torsoZ = -0.18 + eased * 0.34;
      } else if (combat.comboIndex === 1) {
        swordZ = 1.25 - eased * 2.7;
        swordX = -0.2 + Math.sin(p * Math.PI) * 0.48;
        rightArmZ = 0.62 - eased * 1.2;
        torsoZ = 0.2 - eased * 0.38;
      } else {
        swordZ = 0.12;
        swordX = -1.5 + eased * 2.45;
        swordOffsetY = 0.42 - eased * 0.25;
        rightArmX = -1.05 + eased * 1.15;
        leftArmX = -0.62 + eased * 0.3;
        torsoX = -0.18 + eased * 0.38;
      }
      capeX = 0.35 + Math.sin(p * Math.PI) * 0.18;
    }

    leftLeg.rotation.x = smooth(leftLeg.rotation.x, leftLegX, 14, delta);
    rightLeg.rotation.x = smooth(rightLeg.rotation.x, rightLegX, 14, delta);
    leftArm.rotation.x = smooth(leftArm.rotation.x, leftArmX, 13, delta);
    rightArm.rotation.x = smooth(rightArm.rotation.x, rightArmX, 13, delta);
    rightArm.rotation.z = smooth(rightArm.rotation.z, rightArmZ, 15, delta);
    torso.rotation.x = smooth(torso.rotation.x, torsoX, 12, delta);
    torso.rotation.z = smooth(torso.rotation.z, torsoZ, 12, delta);
    cape.rotation.x = smooth(cape.rotation.x, capeX, 9, delta);
    hood.rotation.z = smooth(hood.rotation.z, moving ? -stride * 0.025 : 0, 8, delta);
    sword.rotation.x = smooth(sword.rotation.x, swordX, 18, delta);
    sword.rotation.z = smooth(sword.rotation.z, swordZ, 18, delta);
    sword.position.x = smooth(sword.position.x, this.baseSwordPosition.x + swordOffsetX, 16, delta);
    sword.position.y = smooth(sword.position.y, this.baseSwordPosition.y + swordOffsetY, 16, delta);

    const stepBob = moving ? Math.abs(Math.sin(this.cycle)) * 0.055 : idleBreath;
    torso.position.y = smooth(torso.position.y, this.baseTorsoY + stepBob, 10, delta);
    hood.position.y = smooth(hood.position.y, this.baseHoodY + stepBob + idleBreath * 0.3, 10, delta);
  }
}
