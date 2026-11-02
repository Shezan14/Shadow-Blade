import * as THREE from 'three';
import { glowMaterial } from '../graphics/Materials.js';
import { emitFireBurst, emitFireTrail } from '../particles/FireParticles.js';
import { emitIceMist } from '../particles/IceParticles.js';
import { emitLightningSparks } from '../particles/LightningParticles.js';
import { emitWindSpiral } from '../particles/WindParticles.js';

export class ElementEffects {
  constructor(parent, particleSystem = null) {
    this.group = new THREE.Group();
    this.group.name = 'Element Effects';
    parent.add(this.group);
    this.effects = [];
    this.particleSystem = particleSystem;
  }

  createProjectile(color, radius = 0.18) {
    const projectile = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), glowMaterial(color, 0.95));
    projectile.add(core);
    const light = new THREE.PointLight(color, 7, 4, 2);
    projectile.add(light);
    this.group.add(projectile);
    return projectile;
  }

  removeProjectile(projectile) {
    this.group.remove(projectile);
    projectile.traverse((child) => {
      child.geometry?.dispose();
      child.material?.dispose();
    });
  }

  spawnBurst(position, color, count = 20, speed = 5) {
    if (this.particleSystem) {
      if (color === 0xff582d) emitFireBurst(this.particleSystem, position, count);
      else emitLightningSparks(this.particleSystem, position, count);
      return;
    }
    const positions = new Float32Array(count * 3);
    const velocities = [];
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399;
      const vertical = ((i * 11) % count) / count * 1.4 - 0.35;
      const velocity = new THREE.Vector3(Math.cos(angle), vertical, Math.sin(angle)).normalize();
      velocity.multiplyScalar(speed * (0.55 + (i % 5) * 0.11));
      velocities.push(velocity);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color, size: 0.13, transparent: true, opacity: 1, depthWrite: false }),
    );
    points.position.copy(position);
    this.group.add(points);
    this.effects.push({ object: points, type: 'particles', velocities, age: 0, lifetime: 0.62 });
  }

  spawnRing(position, color, startScale = 0.5, lifetime = 0.5) {
    if (this.particleSystem && color === 0x4df0c5) emitWindSpiral(this.particleSystem, position);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.92, 40), glowMaterial(color, 0.78));
    ring.position.copy(position);
    ring.position.y = Math.max(0.08, ring.position.y);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(startScale);
    this.group.add(ring);
    this.effects.push({ object: ring, type: 'ring', age: 0, lifetime });
  }

  spawnShards(origin, forward, color) {
    if (this.particleSystem) emitIceMist(this.particleSystem, origin, forward);
    const group = new THREE.Group();
    group.position.copy(origin);
    for (let i = -2; i <= 2; i += 1) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glowMaterial(color, 0.78));
      const side = new THREE.Vector3(forward.z, 0, -forward.x);
      shard.position.copy(forward).multiplyScalar(1.8 + Math.abs(i) * 0.25);
      shard.position.addScaledVector(side, i * 0.55);
      shard.position.y = 0.2 + (2 - Math.abs(i)) * 0.18;
      shard.scale.set(0.7, 1.8 + (i % 2) * 0.3, 0.7);
      group.add(shard);
    }
    this.group.add(group);
    this.effects.push({ object: group, type: 'shards', age: 0, lifetime: 0.72 });
  }

  spawnLightning(points, color) {
    if (this.particleSystem) {
      points.slice(1).forEach((point) => emitLightningSparks(this.particleSystem, point, 9));
    }
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), glowMaterial(0xffffff, 0.52));
    flash.position.copy(points[1] ?? points[0]);
    flash.scale.setScalar(0.35);
    this.group.add(flash);
    this.effects.push({ object: flash, type: 'flash', age: 0, lifetime: 0.14 });
    for (let segment = 0; segment < points.length - 1; segment += 1) {
      const start = points[segment];
      const end = points[segment + 1];
      const vertices = [];
      const steps = 8;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const point = start.clone().lerp(end, t);
        if (i > 0 && i < steps) {
          point.x += Math.sin(i * 7.3 + segment) * 0.12;
          point.y += Math.cos(i * 5.1) * 0.1;
          point.z += Math.sin(i * 3.7) * 0.1;
        }
        vertices.push(point.x, point.y, point.z);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }),
      );
      this.group.add(line);
      this.effects.push({ object: line, type: 'line', age: 0, lifetime: 0.2 });
    }
  }

  emitTrail(type, position, phase) {
    if (type === 'fire' && this.particleSystem) emitFireTrail(this.particleSystem, position, phase);
  }

  update(delta) {
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.age += delta;
      const t = Math.min(1, effect.age / effect.lifetime);
      if (effect.type === 'particles') {
        const attribute = effect.object.geometry.attributes.position;
        effect.velocities.forEach((velocity, index) => {
          attribute.array[index * 3] += velocity.x * delta;
          attribute.array[index * 3 + 1] += velocity.y * delta;
          attribute.array[index * 3 + 2] += velocity.z * delta;
          velocity.y -= 4.5 * delta;
        });
        attribute.needsUpdate = true;
        effect.object.material.opacity = 1 - t;
      } else if (effect.type === 'ring') {
        effect.object.scale.setScalar(0.5 + t * 4.2);
        effect.object.material.opacity = (1 - t) * 0.78;
      } else if (effect.type === 'shards') {
        effect.object.position.y += delta * 0.45;
        effect.object.children.forEach((child, index) => {
          child.rotation.y += delta * (2 + index * 0.25);
          child.material.opacity = 1 - t;
        });
      } else if (effect.type === 'flash') {
        effect.object.scale.setScalar(0.35 + t * 2.4);
        effect.object.material.opacity = (1 - t) * 0.52;
      } else {
        effect.object.material.opacity = 1 - t;
      }
      if (t >= 1) {
        this.group.remove(effect.object);
        effect.object.traverse((child) => {
          child.geometry?.dispose();
          child.material?.dispose();
        });
        effect.object.geometry?.dispose();
        effect.object.material?.dispose();
        this.effects.splice(i, 1);
      }
    }
  }
}
