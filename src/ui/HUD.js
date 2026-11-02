import * as THREE from 'three';

export class HUD {
  constructor(root = document) {
    this.healthFill = root.querySelector('#health-fill');
    this.staminaFill = root.querySelector('#stamina-fill');
    this.comboReadout = root.querySelector('#combo-readout');
    this.hitMarker = root.querySelector('#hit-marker');
    this.abilitySlots = [...root.querySelectorAll('.ability-slot')];
    this.bossHud = root.querySelector('#boss-hud');
    this.bossName = root.querySelector('#boss-name');
    this.bossPhase = root.querySelector('#boss-phase');
    this.bossHealthFill = root.querySelector('#boss-health-fill');
    this.particleCount = root.querySelector('#particle-count');
    this.damageFlash = root.querySelector('#damage-flash');
    this.healthDisplay = 1;
    this.staminaDisplay = 1;
    this.bossDisplay = 1;
    this.wasHit = false;
  }

  registerHit() {
    this.hitMarker.classList.remove('is-hit');
    void this.hitMarker.offsetWidth;
    this.hitMarker.classList.add('is-hit');
  }

  update(combat, elements, boss, particleCount, delta) {
    const blend = 1 - Math.exp(-10 * delta);
    this.healthDisplay = THREE.MathUtils.lerp(this.healthDisplay, combat.healthRatio, blend);
    this.staminaDisplay = THREE.MathUtils.lerp(this.staminaDisplay, combat.staminaRatio, blend);
    this.bossDisplay = THREE.MathUtils.lerp(this.bossDisplay, boss.healthRatio, blend);
    this.healthFill.style.transform = `scaleX(${this.healthDisplay})`;
    this.staminaFill.style.transform = `scaleX(${this.staminaDisplay})`;
    this.comboReadout.textContent = combat.comboCount > 1 ? `${combat.comboCount} HIT CHAIN` : '';
    this.comboReadout.classList.toggle('is-visible', combat.comboCount > 1);
    this.damageFlash.classList.toggle('is-visible', combat.hitFlash > 0);

    this.abilitySlots.forEach((slot) => {
      const ability = elements.elements[slot.dataset.element];
      slot.style.setProperty('--cooldown', ability.ratio);
      slot.classList.toggle('is-active', elements.current === slot.dataset.element);
      slot.classList.toggle('is-cooling', !ability.ready);
      slot.classList.toggle('is-locked', !ability.unlocked);
      slot.querySelector('small').textContent = !ability.unlocked ? 'LOCKED' : ability.ready ? 'READY' : ability.remaining.toFixed(1);
    });

    const showBoss = boss.active && !['wave', 'mini_intro', 'final_intro'].includes(boss.stage);
    this.bossHud.classList.toggle('is-visible', showBoss);
    this.bossName.textContent = boss.name;
    this.bossPhase.textContent = boss.phase ? `PHASE ${boss.phase}` : '';
    this.bossHealthFill.style.transform = `scaleX(${this.bossDisplay})`;
    this.particleCount.textContent = `Particles ${particleCount}`;
  }
}
