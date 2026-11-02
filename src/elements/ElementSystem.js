import * as THREE from 'three';
import { ElementEffects } from './ElementEffects.js';
import { FIRE, FireProjectile } from './Fire.js';
import { ICE, castIce } from './Ice.js';
import { LIGHTNING, castLightning } from './Lightning.js';
import { WIND, castWind } from './Wind.js';
import { getForwardFromRotation } from '../combat/Hitbox.js';
import { CONFIG } from '../core/Config.js';

export const ELEMENTS = Object.freeze([FIRE, ICE, LIGHTNING, WIND]);

export class ElementSystem {
  constructor({ parent, particleSystem = null, player, targets, playerController, playerCombat = null, cameraRig, canvas, eventTarget = window, documentTarget = document }) {
    this.player = player;
    this.targets = targets;
    this.playerController = playerController;
    this.playerCombat = playerCombat;
    this.cameraRig = cameraRig;
    this.canvas = canvas;
    this.documentTarget = documentTarget;
    this.effects = new ElementEffects(parent, particleSystem);
    this.cooldowns = Object.fromEntries(ELEMENTS.map((element) => [element.id, 0]));
    this.projectiles = [];
    this.current = FIRE.id;
    this.unlocked = new Set(ELEMENTS.map((element) => element.id));
    this.enabled = false;
    this.castFlash = 0;
    this.castTimer = 0;
    this.castSerial = 0;
    this.forward = new THREE.Vector3();
    this.origin = new THREE.Vector3();
    this.handleKeyDown = this.handleKeyDown.bind(this);
    eventTarget.addEventListener?.('keydown', this.handleKeyDown);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setUnlocked(ids) {
    this.unlocked = new Set(ids);
    if (!this.unlocked.has(this.current)) {
      this.current = ELEMENTS.find((element) => this.unlocked.has(element.id))?.id ?? FIRE.id;
    }
  }

  handleKeyDown(event) {
    if (!this.enabled || event.repeat || this.documentTarget.pointerLockElement !== this.canvas) return;
    const element = ELEMENTS.find((candidate) => CONFIG.controls.elements[candidate.id] === event.code);
    if (!element) return;
    event.preventDefault?.();
    this.activate(element.id);
  }

  activate(id) {
    const element = ELEMENTS.find((candidate) => candidate.id === id);
    if (
      !this.enabled
      || !element
      || !this.unlocked.has(id)
      || this.cooldowns[id] > 0
      || this.playerCombat?.attacking
      || this.playerCombat?.blocking
    ) return false;
    this.current = id;
    this.cooldowns[id] = element.cooldown;
    this.castFlash = 0.22;
    this.castTimer = 0.42;
    this.castSerial += 1;
    getForwardFromRotation(this.player.rotation.y, this.forward);
    this.origin.copy(this.player.position);
    this.origin.y += 0.72;

    if (id === FIRE.id) {
      const projectileOrigin = this.origin.clone().addScaledVector(this.forward, 0.8);
      this.projectiles.push(new FireProjectile(projectileOrigin, this.forward, this.effects));
      this.cameraRig.addShake(0.045, 0.12);
    } else if (id === ICE.id) {
      castIce(this.origin, this.forward, this.targets, this.effects);
      this.cameraRig.addShake(0.035, 0.12);
    } else if (id === LIGHTNING.id) {
      castLightning(this.origin, this.forward, this.targets, this.effects);
      this.cameraRig.addShake(0.09, 0.18);
    } else if (id === WIND.id) {
      castWind(this.player.position, this.forward, this.targets, this.effects, this.playerController);
      this.cameraRig.addShake(0.065, 0.16);
    }
    return true;
  }

  update(delta) {
    ELEMENTS.forEach((element) => {
      this.cooldowns[element.id] = Math.max(0, this.cooldowns[element.id] - delta);
    });
    this.castFlash = Math.max(0, this.castFlash - delta);
    this.castTimer = Math.max(0, this.castTimer - delta);
    this.projectiles = this.projectiles.filter((projectile) => projectile.update(delta, this.targets));
    this.effects.update(delta);
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      current: this.current,
      castFlash: this.castFlash,
      casting: this.castTimer > 0,
      castElement: this.current,
      castSerial: this.castSerial,
      elements: Object.fromEntries(ELEMENTS.map((element) => [element.id, {
        remaining: this.cooldowns[element.id],
        ratio: this.cooldowns[element.id] / element.cooldown,
        ready: this.cooldowns[element.id] <= 0,
        unlocked: this.unlocked.has(element.id),
      }])),
    };
  }
}
