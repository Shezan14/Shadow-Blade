import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';
import { applyGravity, applyHorizontalFriction, constrainToArena } from '../physics/Physics.js';

function dampAngle(current, target, smoothing, delta) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * (1 - Math.exp(-smoothing * delta));
}

export function resolveContextAction(hasMovement, grounded) {
  if (!grounded) return 'none';
  return hasMovement ? 'dodge' : 'jump';
}

export class PlayerController {
  constructor(player, cameraRig, eventTarget = window) {
    this.player = player;
    this.cameraRig = cameraRig;
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.dodgeDirection = new THREE.Vector3(0, 0, -1);
    this.state = 'idle';
    this.enabled = false;
    this.grounded = true;
    this.groundHeight = CONFIG.player.groundHeight;
    this.actionQueued = false;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.movementScale = 1;
    this.walkSpeed = CONFIG.player.walkSpeed;
    this.runSpeed = CONFIG.player.runSpeed;
    this.worldCollider = null;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.clearInput = this.clearInput.bind(this);
    eventTarget.addEventListener?.('keydown', this.handleKeyDown);
    eventTarget.addEventListener?.('keyup', this.handleKeyUp);
    eventTarget.addEventListener?.('blur', this.clearInput);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.clearInput();
  }

  handleKeyDown(event) {
    if (!this.enabled) return;
    if (event.code === CONFIG.controls.action && !event.repeat) {
      event.preventDefault?.();
      this.actionQueued = true;
    }
    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  clearInput() {
    this.keys.clear();
    this.actionQueued = false;
  }

  setInput(code, pressed) {
    if (pressed) this.keys.add(code);
    else this.keys.delete(code);
  }

  queueAction() {
    this.actionQueued = true;
  }

  setMovementScale(scale) {
    this.movementScale = THREE.MathUtils.clamp(scale, 0, 1);
  }

  setSpeedSettings({ walkSpeed = this.walkSpeed, runSpeed = this.runSpeed } = {}) {
    this.walkSpeed = THREE.MathUtils.clamp(Number(walkSpeed) || CONFIG.player.walkSpeed, 4, 16);
    this.runSpeed = THREE.MathUtils.clamp(Number(runSpeed) || CONFIG.player.runSpeed, this.walkSpeed + 1, 24);
    return { walkSpeed: this.walkSpeed, runSpeed: this.runSpeed };
  }

  setWorldCollider(collider) {
    this.worldCollider = collider;
  }

  resetMotion() {
    this.velocity.set(0, 0, 0);
    this.moveDirection.set(0, 0, 0);
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.movementScale = 1;
  }

  applyKnockback(direction, strength) {
    this.velocity.x += direction.x * strength;
    this.velocity.z += direction.z * strength;
  }

  getInputVector() {
    const x = Number(this.keys.has(CONFIG.controls.right)) - Number(this.keys.has(CONFIG.controls.left));
    const z = Number(this.keys.has(CONFIG.controls.forward)) - Number(this.keys.has(CONFIG.controls.backward));
    return new THREE.Vector2(x, z).normalize();
  }

  update(delta) {
    if (!this.enabled || delta <= 0) return this.getSnapshot();
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    const input = this.getInputVector();
    const hasMovement = input.lengthSq() > 0;
    const { forward, right } = this.cameraRig.getMovementAxes();
    this.moveDirection.set(0, 0, 0)
      .addScaledVector(right, input.x)
      .addScaledVector(forward, input.y);
    if (this.moveDirection.lengthSq() > 0) this.moveDirection.normalize();

    if (this.actionQueued) {
      const action = resolveContextAction(hasMovement, this.grounded);
      if (action === 'jump') {
        this.velocity.y = CONFIG.player.jumpVelocity;
        this.grounded = false;
      } else if (action === 'dodge' && this.dodgeCooldown <= 0) {
        this.dodgeTimer = CONFIG.player.dodgeDuration;
        this.dodgeCooldown = CONFIG.player.dodgeCooldown;
        this.dodgeDirection.copy(this.moveDirection);
      }
      this.actionQueued = false;
    }

    if (this.dodgeTimer > 0) {
      this.dodgeTimer = Math.max(0, this.dodgeTimer - delta);
      this.velocity.x = this.dodgeDirection.x * CONFIG.player.dodgeSpeed;
      this.velocity.z = this.dodgeDirection.z * CONFIG.player.dodgeSpeed;
      this.state = 'dodge';
    } else {
      const running = hasMovement && this.keys.has(CONFIG.controls.run);
      const targetSpeed = (running ? this.runSpeed : this.walkSpeed) * this.movementScale;
      const desiredX = this.moveDirection.x * targetSpeed;
      const desiredZ = this.moveDirection.z * targetSpeed;
      if (hasMovement) {
        this.velocity.x = desiredX;
        this.velocity.z = desiredZ;
      } else {
        applyHorizontalFriction(this.velocity, CONFIG.player.friction, delta);
      }
      this.state = running ? 'run' : hasMovement ? 'walk' : 'idle';
    }

    if (this.dodgeTimer <= 0) {
      const strictLimit = hasMovement && this.keys.has(CONFIG.controls.run)
        ? this.runSpeed * this.movementScale
        : this.walkSpeed * this.movementScale;
      const actualSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (actualSpeed > strictLimit && strictLimit >= 0) {
        const scale = strictLimit / actualSpeed;
        this.velocity.x *= scale;
        this.velocity.z *= scale;
      }
    }

    this.player.position.x += this.velocity.x * delta;
    this.player.position.z += this.velocity.z * delta;
    this.grounded = applyGravity(this.player.position, this.velocity, delta, this.groundHeight);
    if (this.worldCollider) this.worldCollider(this.player.position, this.velocity);
    else constrainToArena(this.player.position, this.velocity, CONFIG.player.arenaRadius);

    if (!this.grounded && this.state !== 'dodge') this.state = this.velocity.y > 0 ? 'jump' : 'fall';

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (hasMovement && this.moveDirection.lengthSq() > 0.01) {
      const targetYaw = Math.atan2(this.moveDirection.x, this.moveDirection.z);
      this.player.rotation.y = dampAngle(this.player.rotation.y, targetYaw, 24, delta);
    }
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      state: this.state,
      speed: Math.hypot(this.velocity.x, this.velocity.z),
      verticalVelocity: this.velocity.y,
      grounded: this.grounded,
      dodgeProgress: this.dodgeTimer > 0 ? this.dodgeTimer / CONFIG.player.dodgeDuration : 0,
    };
  }
}
