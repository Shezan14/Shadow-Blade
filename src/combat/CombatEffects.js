import * as THREE from 'three';
import { glowMaterial } from '../graphics/Materials.js';
import { emitHitSparks, emitSmoke } from '../particles/CombatParticles.js';

export class CombatEffects {
  constructor(scene, particleSystem = null) {
    this.group = new THREE.Group();
    this.group.name = 'Combat Effects';
    scene.add(this.group);
    this.effects = [];
    this.particleSystem = particleSystem;
  }

  spawnSlash(position, rotationY, comboIndex) {
    const geometry = new THREE.RingGeometry(0.95, 1.18, 28, 1, 0.15, Math.PI * 1.15);
    const colors = [0x75eaff, 0xa37cff, 0xff8b52];
    const mesh = new THREE.Mesh(geometry, glowMaterial(colors[comboIndex] ?? colors[0], 0.72));
    mesh.position.copy(position).add(new THREE.Vector3(0, 0.85, 0));
    mesh.rotation.set(0.18, rotationY, comboIndex === 1 ? 2.3 : -0.75);
    mesh.scale.setScalar(0.7);
    this.group.add(mesh);
    this.effects.push({ type: 'slash', object: mesh, age: 0, lifetime: 0.24 });
  }

  spawnImpact(position, color = 0xb9efff) {
    if (this.particleSystem) {
      emitHitSparks(this.particleSystem, position, color);
      emitSmoke(this.particleSystem, position, 5);
      return;
    }
    const count = 14;
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const lift = ((i * 7) % 5) * 0.16 - 0.18;
      velocities.push(new THREE.Vector3(Math.cos(angle), lift, Math.sin(angle)).normalize().multiplyScalar(2.5 + (i % 4)));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color, size: 0.11, transparent: true, opacity: 1, depthWrite: false }),
    );
    points.position.copy(position);
    this.group.add(points);
    this.effects.push({ type: 'impact', object: points, velocities, age: 0, lifetime: 0.42 });
  }

  update(delta) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.age += delta;
      const t = Math.min(1, effect.age / effect.lifetime);
      effect.object.material.opacity = 1 - t;
      if (effect.type === 'slash') {
        effect.object.scale.setScalar(0.7 + t * 0.65);
        effect.object.rotation.z += delta * 2.4;
      } else {
        const attribute = effect.object.geometry.attributes.position;
        effect.velocities.forEach((velocity, index) => {
          attribute.array[index * 3] += velocity.x * delta;
          attribute.array[index * 3 + 1] += velocity.y * delta;
          attribute.array[index * 3 + 2] += velocity.z * delta;
          velocity.y -= 5.5 * delta;
        });
        attribute.needsUpdate = true;
      }
      if (t >= 1) {
        this.group.remove(effect.object);
        effect.object.geometry.dispose();
        effect.object.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }
}
