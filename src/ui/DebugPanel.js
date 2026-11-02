export class DebugPanel {
  constructor(root, { eventTarget = window, onCollisionToggle = null } = {}) {
    this.root = root;
    this.onCollisionToggle = onCollisionToggle;
    this.visible = false;
    this.collisionsVisible = false;
    this.fields = Object.fromEntries(
      [...root.querySelectorAll('[data-debug]')].map((element) => [element.dataset.debug, element]),
    );
    eventTarget.addEventListener?.('keydown', (event) => this.handleKey(event));
  }

  handleKey(event) {
    if (event.repeat) return;
    if (event.code === 'F1') {
      event.preventDefault?.();
      this.visible = !this.visible;
      this.root.classList.toggle('is-visible', this.visible);
    } else if (event.code === 'F2') {
      event.preventDefault?.();
      this.collisionsVisible = !this.collisionsVisible;
      this.onCollisionToggle?.(this.collisionsVisible);
    }
  }

  update({ performance, playerPosition, gameState, enemyStates, particleCount }) {
    if (!this.visible) return;
    this.fields.fps.textContent = performance.fps;
    this.fields.drawCalls.textContent = performance.drawCalls;
    this.fields.triangles.textContent = performance.triangles.toLocaleString();
    this.fields.quality.textContent = `${Math.round(performance.qualityScale * 100)}%`;
    this.fields.position.textContent = `${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)}`;
    this.fields.state.textContent = gameState;
    this.fields.enemies.textContent = enemyStates.join(' / ') || 'none';
    this.fields.particles.textContent = particleCount;
    this.fields.collisions.textContent = this.collisionsVisible ? 'ON' : 'OFF';
  }
}
