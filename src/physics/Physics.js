import * as THREE from 'three';

export const GRAVITY = -22;

export function applyGravity(position, velocity, delta, groundHeight) {
  velocity.y += GRAVITY * delta;
  position.y += velocity.y * delta;
  if (position.y <= groundHeight) {
    position.y = groundHeight;
    velocity.y = 0;
    return true;
  }
  return false;
}

export function applyHorizontalFriction(velocity, strength, delta) {
  const damping = Math.exp(-strength * delta);
  velocity.x *= damping;
  velocity.z *= damping;
}

export function constrainToArena(position, velocity, radius = 7.25) {
  const horizontal = new THREE.Vector2(position.x, position.z);
  if (horizontal.lengthSq() <= radius * radius) return false;
  horizontal.setLength(radius);
  position.x = horizontal.x;
  position.z = horizontal.y;
  const normal = new THREE.Vector2(position.x, position.z).normalize();
  const outwardSpeed = velocity.x * normal.x + velocity.z * normal.y;
  if (outwardSpeed > 0) {
    velocity.x -= normal.x * outwardSpeed;
    velocity.z -= normal.y * outwardSpeed;
  }
  return true;
}
