import { Damageable, calculateBlockedDamage } from '../combat/DamageSystem.js';
import { CONFIG } from '../core/Config.js';

export const ATTACKS = Object.freeze([
  { duration: 0.42, activeStart: 0.22, activeEnd: 0.58, damage: 22, knockback: 4.2, stamina: 12 },
  { duration: 0.46, activeStart: 0.2, activeEnd: 0.6, damage: 27, knockback: 5.1, stamina: 14 },
  { duration: 0.58, activeStart: 0.3, activeEnd: 0.68, damage: 38, knockback: 7.5, stamina: 20 },
]);

export class PlayerCombat {
  constructor(canvas, eventTarget = window, documentTarget = document) {
    this.canvas = canvas;
    this.documentTarget = documentTarget;
    this.health = new Damageable(100);
    this.maxStamina = 100;
    this.stamina = this.maxStamina;
    this.enabled = false;
    this.blocking = false;
    this.attacking = false;
    this.attackQueued = false;
    this.comboIndex = 0;
    this.comboCount = 0;
    this.attackElapsed = 0;
    this.attackSerial = 0;
    this.comboResetTimer = 0;
    this.hitFlash = 0;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.preventContextMenu = this.preventContextMenu.bind(this);
    eventTarget.addEventListener?.('mousedown', this.handleMouseDown);
    eventTarget.addEventListener?.('mouseup', this.handleMouseUp);
    eventTarget.addEventListener?.('blur', () => this.clearInput());
    canvas.addEventListener?.('contextmenu', this.preventContextMenu);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.clearInput();
  }

  preventContextMenu(event) {
    event.preventDefault?.();
  }

  handleMouseDown(event) {
    if (!this.enabled || this.documentTarget.pointerLockElement !== this.canvas) return;
    if (event.button === CONFIG.controls.attackButton) this.queueAttack();
    if (event.button === CONFIG.controls.blockButton && !this.attacking) this.blocking = this.stamina > 0;
  }

  handleMouseUp(event) {
    if (event.button === CONFIG.controls.blockButton) this.blocking = false;
  }

  clearInput() {
    this.blocking = false;
    this.attackQueued = false;
  }

  queueAttack() {
    if (!this.enabled || this.blocking) return false;
    if (this.attacking) {
      this.attackQueued = true;
      return true;
    }
    return this.startAttack(this.comboResetTimer > 0 ? this.comboIndex : 0);
  }

  startAttack(index) {
    const attack = ATTACKS[index];
    if (!attack || this.stamina < attack.stamina) return false;
    this.stamina -= attack.stamina;
    this.comboIndex = index;
    this.comboCount = index + 1;
    this.attacking = true;
    this.blocking = false;
    this.attackElapsed = 0;
    this.attackSerial += 1;
    this.comboResetTimer = 0.82;
    return true;
  }

  receiveDamage(amount) {
    const applied = this.health.damage(calculateBlockedDamage(amount, this.blocking));
    if (applied > 0) {
      this.hitFlash = 0.22;
      if (this.blocking) this.stamina = Math.max(0, this.stamina - amount * 0.35);
    }
    return applied;
  }

  update(delta) {
    this.comboResetTimer = Math.max(0, this.comboResetTimer - delta);
    this.hitFlash = Math.max(0, this.hitFlash - delta);

    if (this.blocking) {
      this.stamina = Math.max(0, this.stamina - 7 * delta);
      if (this.stamina <= 0) this.blocking = false;
    } else if (!this.attacking) {
      this.stamina = Math.min(this.maxStamina, this.stamina + 25 * delta);
    }

    if (this.attacking) {
      const attack = ATTACKS[this.comboIndex];
      this.attackElapsed += delta;
      if (this.attackElapsed >= attack.duration) {
        this.attacking = false;
        if (this.attackQueued) {
          this.attackQueued = false;
          const nextIndex = (this.comboIndex + 1) % ATTACKS.length;
          if (!this.startAttack(nextIndex)) this.comboCount = 0;
        }
      }
    } else if (this.comboResetTimer <= 0) {
      this.comboIndex = 0;
      this.comboCount = 0;
      this.attackQueued = false;
    }

    const attack = ATTACKS[this.comboIndex];
    const progress = this.attacking ? Math.min(1, this.attackElapsed / attack.duration) : 0;
    return {
      attacking: this.attacking,
      blocking: this.blocking,
      comboIndex: this.comboIndex,
      comboCount: this.comboCount,
      attackSerial: this.attackSerial,
      attackProgress: progress,
      hitActive: this.attacking && progress >= attack.activeStart && progress <= attack.activeEnd,
      damage: attack.damage,
      knockback: attack.knockback,
      movementScale: this.attacking ? 0.32 : this.blocking ? 0.45 : 1,
      health: this.health.health,
      healthRatio: this.health.ratio,
      stamina: this.stamina,
      staminaRatio: this.stamina / this.maxStamina,
      hitFlash: this.hitFlash,
    };
  }
}
