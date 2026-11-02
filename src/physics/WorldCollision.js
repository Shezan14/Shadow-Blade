function stopAxis(velocity, axis, position, boundary) {
  if (!velocity) return;
  const movingOutward = (position[axis] > boundary && velocity[axis] > 0)
    || (position[axis] < boundary && velocity[axis] < 0);
  if (movingOutward) velocity[axis] = 0;
}

export function resolveWorldCollision(position, velocity, layout, radius = 0.48) {
  if (!layout) return position;
  if (layout.bounds.type === 'circle') {
    const limit = layout.bounds.radius - radius;
    const length = Math.hypot(position.x, position.z);
    if (length > limit) {
      const nx = position.x / length;
      const nz = position.z / length;
      position.x = nx * limit;
      position.z = nz * limit;
      if (velocity) {
        const outward = velocity.x * nx + velocity.z * nz;
        if (outward > 0) {
          velocity.x -= nx * outward;
          velocity.z -= nz * outward;
        }
      }
    }
  } else {
    const maxX = layout.bounds.halfWidth - radius;
    const maxZ = layout.bounds.halfDepth - radius;
    stopAxis(velocity, 'x', position, maxX);
    stopAxis(velocity, 'z', position, maxZ);
    position.x = Math.max(-maxX, Math.min(maxX, position.x));
    position.z = Math.max(-maxZ, Math.min(maxZ, position.z));
  }

  for (const obstacle of layout.obstacles ?? []) {
    const dx = position.x - obstacle.x;
    const dz = position.z - obstacle.z;
    const hx = obstacle.halfWidth + radius;
    const hz = obstacle.halfDepth + radius;
    if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) continue;
    const pushX = hx - Math.abs(dx);
    const pushZ = hz - Math.abs(dz);
    if (pushX < pushZ) {
      const side = dx >= 0 ? 1 : -1;
      position.x = obstacle.x + side * hx;
      if (velocity && velocity.x * side < 0) velocity.x = 0;
    } else {
      const side = dz >= 0 ? 1 : -1;
      position.z = obstacle.z + side * hz;
      if (velocity && velocity.z * side < 0) velocity.z = 0;
    }
  }
  return position;
}
