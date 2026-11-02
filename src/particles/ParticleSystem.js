import * as THREE from 'three';

const vertexShader = `
  attribute vec3 particleColor;
  attribute float particleSize;
  attribute float particleAlpha;
  attribute float particleRotation;
  attribute float particleShape;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRotation;
  varying float vShape;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp(particleSize * (220.0 / max(1.0, -mvPosition.z)), 1.0, 42.0);
    vColor = particleColor;
    vAlpha = particleAlpha;
    vRotation = particleRotation;
    vShape = particleShape;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRotation;
  varying float vShape;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vRotation);
    float s = sin(vRotation);
    p = mat2(c, -s, s, c) * p;
    float distanceField = vShape < 0.5 ? length(p) : abs(p.x) + abs(p.y);
    float mask = smoothstep(0.5, 0.28, distanceField);
    if (mask <= 0.01) discard;
    gl_FragColor = vec4(vColor, vAlpha * mask);
  }
`;

export class ParticleSystem {
  constructor(parent, capacity = 900) {
    this.capacity = capacity;
    this.activeCount = 0;
    this.active = new Uint8Array(capacity);
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    this.rotations = new Float32Array(capacity);
    this.shapes = new Float32Array(capacity);
    this.velocities = new Float32Array(capacity * 3);
    this.ages = new Float32Array(capacity);
    this.lifetimes = new Float32Array(capacity);
    this.startSizes = new Float32Array(capacity);
    this.endSizes = new Float32Array(capacity);
    this.gravities = new Float32Array(capacity);
    this.drags = new Float32Array(capacity);
    this.rotationSpeeds = new Float32Array(capacity);
    this.tempColor = new THREE.Color();
    this.free = Array.from({ length: capacity }, (_, index) => capacity - 1 - index);

    const geometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttribute = new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage);
    this.alphaAttribute = new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage);
    this.rotationAttribute = new THREE.BufferAttribute(this.rotations, 1).setUsage(THREE.DynamicDrawUsage);
    this.shapeAttribute = new THREE.BufferAttribute(this.shapes, 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', this.positionAttribute);
    geometry.setAttribute('particleColor', this.colorAttribute);
    geometry.setAttribute('particleSize', this.sizeAttribute);
    geometry.setAttribute('particleAlpha', this.alphaAttribute);
    geometry.setAttribute('particleRotation', this.rotationAttribute);
    geometry.setAttribute('particleShape', this.shapeAttribute);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.name = 'Pooled GPU Particles';
    this.points.frustumCulled = false;
    parent.add(this.points);
  }

  spawn({
    position,
    velocity = { x: 0, y: 0, z: 0 },
    color = 0xffffff,
    lifetime = 1,
    size = 0.12,
    endSize = size * 0.25,
    rotation = 0,
    rotationSpeed = 0,
    opacity = 1,
    gravity = 0,
    drag = 0,
    shape = 0,
  }) {
    const index = this.free.pop();
    if (index === undefined) return -1;
    const offset = index * 3;
    this.active[index] = 1;
    this.activeCount += 1;
    this.positions[offset] = position.x;
    this.positions[offset + 1] = position.y;
    this.positions[offset + 2] = position.z;
    this.velocities[offset] = velocity.x;
    this.velocities[offset + 1] = velocity.y;
    this.velocities[offset + 2] = velocity.z;
    const particleColor = this.tempColor.set(color);
    this.colors[offset] = particleColor.r;
    this.colors[offset + 1] = particleColor.g;
    this.colors[offset + 2] = particleColor.b;
    this.ages[index] = 0;
    this.lifetimes[index] = Math.max(0.01, lifetime);
    this.startSizes[index] = size;
    this.endSizes[index] = endSize;
    this.sizes[index] = size;
    this.alphas[index] = opacity;
    this.rotations[index] = rotation;
    this.rotationSpeeds[index] = rotationSpeed;
    this.gravities[index] = gravity;
    this.drags[index] = drag;
    this.shapes[index] = shape;
    return index;
  }

  release(index) {
    if (!this.active[index]) return;
    this.active[index] = 0;
    this.activeCount -= 1;
    this.alphas[index] = 0;
    this.sizes[index] = 0;
    this.positions[index * 3 + 1] = -999;
    this.free.push(index);
  }

  update(delta) {
    for (let index = 0; index < this.capacity; index += 1) {
      if (!this.active[index]) continue;
      this.ages[index] += delta;
      const t = this.ages[index] / this.lifetimes[index];
      if (t >= 1) {
        this.release(index);
        continue;
      }
      const offset = index * 3;
      const damping = Math.exp(-this.drags[index] * delta);
      this.velocities[offset] *= damping;
      this.velocities[offset + 1] = this.velocities[offset + 1] * damping + this.gravities[index] * delta;
      this.velocities[offset + 2] *= damping;
      this.positions[offset] += this.velocities[offset] * delta;
      this.positions[offset + 1] += this.velocities[offset + 1] * delta;
      this.positions[offset + 2] += this.velocities[offset + 2] * delta;
      this.sizes[index] = THREE.MathUtils.lerp(this.startSizes[index], this.endSizes[index], t);
      this.alphas[index] = (1 - t) * (1 - t);
      this.rotations[index] += this.rotationSpeeds[index] * delta;
    }
    this.positionAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.alphaAttribute.needsUpdate = true;
    this.rotationAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.shapeAttribute.needsUpdate = true;
  }
}
