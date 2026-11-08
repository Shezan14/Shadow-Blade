import * as THREE from 'three';
import { FIRE } from '../elements/Fire.js';
import { ICE } from '../elements/Ice.js';
import { LIGHTNING } from '../elements/Lightning.js';
import { WIND } from '../elements/Wind.js';

export class BossSystem {
  constructor({ enemies, targets, miniBoss, finalBoss, player, playerCombat, playerController, cameraRig, effects }) {
    this.enemies = enemies;
    this.targets = targets;
    this.miniBoss = miniBoss;
    this.finalBoss = finalBoss;
    this.player = player;
    this.playerCombat = playerCombat;
    this.playerController = playerController;
    this.cameraRig = cameraRig;
    this.effects = effects;
    this.stage = 'wave';
    this.transitionTimer = 0;
    this.enabled = false;
    this.hazards = [];
    this.activeBoss = null;
    this.completed = false;
    this.manualEncounter = false;
    this.temp = new THREE.Vector3();
    this.enemies.forEach((enemy) => { enemy.respawns = false; });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  debugStartBoss(type = 'final') {
    this.startEncounter(type);
  }

  startEncounter(type = 'final', position = new THREE.Vector3(0, 0, -3.6)) {
    this.enabled = true;
    this.manualEncounter = true;
    this.completed = false;
    this.transitionTimer = 0;
    this.hazards.forEach((hazard) => {
      if (hazard.mesh) this.effects.removeProjectile?.(hazard.mesh);
    });
    this.hazards.length = 0;
    this.enemies.forEach((enemy) => { if (enemy.group) enemy.group.visible = false; });
    this.miniBoss.active = false;
    this.miniBoss.group.visible = false;
    this.finalBoss.active = false;
    this.finalBoss.group.visible = false;
    const boss = type === 'mini' ? this.miniBoss : this.finalBoss;
    this.stage = type === 'mini' ? 'mini' : 'final';
    const spawn = Array.isArray(position)
      ? new THREE.Vector3(position[0], 0, position[1])
      : position.clone();
    this.activateBoss(boss, spawn);
  }

  activateBoss(boss, position) {
    boss.activate(position);
    if (!this.targets.includes(boss)) this.targets.push(boss);
    this.activeBoss = boss;
    this.cameraRig.addShake(0.2, 0.65);
  }

  damagePlayer(amount, origin, knockback, color, movementSnapshot, combatSnapshot) {
    if (movementSnapshot.state === 'dodge' || this.playerCombat.health.dead) return 0;
    const applied = this.playerCombat.receiveDamage(amount);
    if (applied <= 0) return 0;
    this.temp.copy(this.player.position).sub(origin).setY(0);
    if (this.temp.lengthSq() < 0.001) this.temp.set(0, 0, 1);
    this.temp.normalize();
    this.playerController.applyKnockback(this.temp, knockback * (combatSnapshot.blocking ? 0.3 : 1));
    const impact = this.player.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    this.effects.spawnBurst(impact, color, 14, 4.5);
    this.cameraRig.addShake(combatSnapshot.blocking ? 0.09 : 0.18, 0.3);
    return applied;
  }

  handleBossEvent(event, boss, movementSnapshot, combatSnapshot) {
    const playerOffset = this.player.position.clone().sub(event.origin).setY(0);
    const distance = playerOffset.length();
    if (event.type === 'slam') {
      this.effects.spawnRing(event.origin, 0xd252ff, 0.5, 0.55);
      if (distance <= 3.1) this.damagePlayer(event.damage, event.origin, 7, event.color, movementSnapshot, combatSnapshot);
    } else if (event.type === 'charge') {
      boss.moveVelocity.copy(event.direction).multiplyScalar(7.5);
      if (distance <= 3.5) this.damagePlayer(event.damage - 3, event.origin, 8, event.color, movementSnapshot, combatSnapshot);
    } else if (event.type === 'fire') {
      const position = event.origin.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(event.direction, 0.7);
      const mesh = this.effects.createProjectile(FIRE.color, 0.25);
      mesh.position.copy(position);
      this.hazards.push({ type: 'fire', position, velocity: event.direction.clone().multiplyScalar(8.5), mesh, age: 0, damage: event.damage });
    } else if (event.type === 'ice') {
      const origin = event.origin.clone().add(new THREE.Vector3(0, 0.4, 0));
      this.effects.spawnShards(origin, event.direction, ICE.color);
      const facing = distance > 0 ? playerOffset.normalize().dot(event.direction) : 1;
      if (distance <= 6 && facing > 0.38) this.damagePlayer(event.damage - 5, event.origin, 3.5, ICE.color, movementSnapshot, combatSnapshot);
    } else if (event.type === 'lightning') {
      const position = this.player.position.clone();
      this.effects.spawnRing(position, LIGHTNING.color, 0.28, 0.65);
      this.hazards.push({ type: 'lightning', position, age: 0, delay: 0.62, damage: event.damage + 2 });
    } else if (event.type === 'wind') {
      this.effects.spawnRing(event.origin, WIND.color, 0.65, 0.6);
      if (distance <= 5.2) this.damagePlayer(event.damage - 7, event.origin, 11, WIND.color, movementSnapshot, combatSnapshot);
    }
  }

  updateHazards(delta, movementSnapshot, combatSnapshot) {
    for (let index = this.hazards.length - 1; index >= 0; index -= 1) {
      const hazard = this.hazards[index];
      hazard.age += delta;
      if (hazard.type === 'fire') {
        hazard.position.addScaledVector(hazard.velocity, delta);
        hazard.mesh.position.copy(hazard.position);
        this.effects.emitTrail('fire', hazard.position, hazard.age * 10);
        if (hazard.position.distanceTo(this.player.position.clone().add(new THREE.Vector3(0, 0.7, 0))) < 0.8) {
          this.damagePlayer(hazard.damage, hazard.position, 5, FIRE.color, movementSnapshot, combatSnapshot);
          this.effects.removeProjectile(hazard.mesh);
          this.effects.spawnBurst(hazard.position, FIRE.color, 24, 5.5);
          this.hazards.splice(index, 1);
        } else if (hazard.age >= 1.35) {
          this.effects.removeProjectile(hazard.mesh);
          this.effects.spawnBurst(hazard.position, FIRE.color, 16, 4);
          this.hazards.splice(index, 1);
        }
      } else if (hazard.type === 'lightning' && hazard.age >= hazard.delay) {
        const strikeTop = hazard.position.clone().add(new THREE.Vector3(0, 7, 0));
        this.effects.spawnLightning([strikeTop, hazard.position.clone().add(new THREE.Vector3(0, 0.2, 0))], LIGHTNING.color);
        if (this.player.position.distanceTo(hazard.position) <= 1.55) {
          this.damagePlayer(hazard.damage, hazard.position, 2.5, LIGHTNING.color, movementSnapshot, combatSnapshot);
        }
        this.hazards.splice(index, 1);
      }
    }
  }

  update(delta, elapsed, movementSnapshot, combatSnapshot) {
    if (!this.enabled) return this.getSnapshot();
    this.updateHazards(delta, movementSnapshot, combatSnapshot);

    if (this.stage === 'wave' && this.enemies.every((enemy) => enemy.dead)) {
      this.stage = 'mini_intro';
      this.transitionTimer = 1.6;
    } else if (this.stage === 'mini_intro') {
      this.transitionTimer -= delta;
      if (this.transitionTimer <= 0) {
        this.activateBoss(this.miniBoss, new THREE.Vector3(0, 0, -3.9));
        this.stage = 'mini';
      }
    } else if (this.stage === 'mini') {
      const event = this.miniBoss.update(delta, elapsed, this.player.position, true);
      if (event) this.handleBossEvent(event, this.miniBoss, movementSnapshot, combatSnapshot);
      if (this.miniBoss.dead) {
        if (this.manualEncounter) {
          this.stage = 'encounter_complete';
          this.completed = true;
        } else {
          this.stage = 'final_intro';
          this.transitionTimer = 2.5;
        }
      }
    } else if (this.stage === 'final_intro') {
      this.miniBoss.update(delta, elapsed, this.player.position, false);
      this.transitionTimer -= delta;
      if (this.transitionTimer <= 0) {
        this.miniBoss.group.visible = false;
        this.activateBoss(this.finalBoss, new THREE.Vector3(0, 0, -4.4));
        this.stage = 'final';
      }
    } else if (this.stage === 'final') {
      const event = this.finalBoss.update(delta, elapsed, this.player.position, true);
      if (event) this.handleBossEvent(event, this.finalBoss, movementSnapshot, combatSnapshot);
      if (this.finalBoss.dead) {
        if (this.manualEncounter) {
          this.stage = 'encounter_complete';
          this.completed = true;
        } else {
          this.stage = 'victory_pending';
          this.transitionTimer = 2.6;
        }
      }
    } else if (this.stage === 'victory_pending') {
      this.finalBoss.update(delta, elapsed, this.player.position, false);
      this.transitionTimer -= delta;
      if (this.transitionTimer <= 0) {
        this.stage = 'complete';
        this.completed = true;
        this.finalBoss.group.visible = false;
      }
    } else if (this.stage === 'encounter_complete') {
      this.activeBoss?.update(delta, elapsed, this.player.position, false);
    }
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      stage: this.stage,
      active: Boolean(this.activeBoss?.active && !this.completed),
      name: this.activeBoss?.config.name ?? '',
      healthRatio: this.activeBoss?.healthRatio ?? 0,
      phase: this.activeBoss?.phase ?? 0,
      position: this.activeBoss?.group?.position ?? null,
      complete: this.completed,
    };
  }
}
