import * as THREE from 'three';

const targetCenter = new THREE.Vector3();

export class SphereHitbox {
  constructor(radius = 1) {
    this.sphere = new THREE.Sphere(new THREE.Vector3(), radius);
  }

  set(center, radius = this.sphere.radius) {
    this.sphere.center.copy(center);
    this.sphere.radius = radius;
    return this;
  }

  intersectsTarget(target) {
    target.getHitCenter(targetCenter);
    const combinedRadius = this.sphere.radius + target.hitRadius;
    return this.sphere.center.distanceToSquared(targetCenter) <= combinedRadius * combinedRadius;
  }
}

export function getForwardFromRotation(rotationY, target = new THREE.Vector3()) {
  return target.set(Math.sin(rotationY), 0, Math.cos(rotationY)).normalize();
}
