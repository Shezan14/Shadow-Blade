import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const TARGET_OFFSET = new THREE.Vector3(0, 1.18, 0);

export class ThirdPersonCamera {
  constructor(camera, canvas, documentTarget = document) {
    this.camera = camera;
    this.canvas = canvas;
    this.documentTarget = documentTarget;
    this.yaw = 0;
    this.pitch = 0.3;
    this.distance = 5.9;
    this.minDistance = 3.4;
    this.maxDistance = 8.6;
    this.shoulderOffset = 0.68;
    this.mode = 'third-person';
    this.sensitivity = 1;
    this.firstPersonLook = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.smoothedTarget = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.smoothedPosition = new THREE.Vector3();
    this.shakeOffset = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, -1);
    this.right = new THREE.Vector3(1, 0, 0);
    this.initialized = false;
    this.enabled = false;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeSeed = 0;
    this.collisionProvider = null;
    this.raycaster = new THREE.Raycaster();
    this.cameraRay = new THREE.Vector3();

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onWheel = this.onWheel.bind(this);
    documentTarget.addEventListener?.('mousemove', this.onMouseMove);
    canvas.addEventListener?.('wheel', this.onWheel, { passive: false });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setCollisionProvider(provider) {
    this.collisionProvider = provider;
  }

  setMode(mode) {
    this.mode = mode === 'first-person' ? 'first-person' : 'third-person';
    this.initialized = false;
    return this.mode;
  }

  toggleMode() {
    return this.setMode(this.mode === 'third-person' ? 'first-person' : 'third-person');
  }

  setSensitivity(value) {
    this.sensitivity = THREE.MathUtils.clamp(Number(value) || 1, 0.35, 2.4);
    return this.sensitivity;
  }

  requestPointerLock() {
    this.canvas.requestPointerLock?.();
  }

  onMouseMove(event) {
    if (!this.enabled || this.documentTarget.pointerLockElement !== this.canvas) return;
    this.yaw -= event.movementX * 0.0024 * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch + event.movementY * 0.0019 * this.sensitivity, 0.08, 0.62);
  }

  onWheel(event) {
    if (!this.enabled) return;
    event.preventDefault?.();
    this.distance = THREE.MathUtils.clamp(
      this.distance + Math.sign(event.deltaY) * 0.65,
      this.minDistance,
      this.maxDistance,
    );
  }

  getMovementAxes() {
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this.right.crossVectors(this.forward, UP).normalize();
    return { forward: this.forward, right: this.right };
  }

  addShake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTime = this.shakeDuration;
    this.shakeSeed += 1.73;
  }

  update(playerPosition, delta) {
    if (this.mode === 'first-person') {
      this.desiredPosition.copy(playerPosition).add(new THREE.Vector3(0, 1.62, 0));
      this.target.copy(this.desiredPosition);
      this.firstPersonLook.set(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        -Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      this.target.addScaledVector(this.firstPersonLook, 6);
      if (!this.initialized) {
        this.smoothedPosition.copy(this.desiredPosition);
        this.smoothedTarget.copy(this.target);
        this.initialized = true;
      } else {
        this.smoothedPosition.lerp(this.desiredPosition, 1 - Math.exp(-18 * delta));
        this.smoothedTarget.lerp(this.target, 1 - Math.exp(-24 * delta));
      }
      this.camera.position.copy(this.smoothedPosition);
      this.camera.lookAt(this.smoothedTarget);
      return;
    }
    this.target.copy(playerPosition).add(TARGET_OFFSET);
    const horizontalDistance = Math.cos(this.pitch) * this.distance;
    this.desiredPosition.set(
      this.target.x + Math.sin(this.yaw) * horizontalDistance + Math.cos(this.yaw) * this.shoulderOffset,
      this.target.y + Math.sin(this.pitch) * this.distance + 0.22,
      this.target.z + Math.cos(this.yaw) * horizontalDistance - Math.sin(this.yaw) * this.shoulderOffset,
    );
    this.desiredPosition.y = Math.max(this.desiredPosition.y, 1.65);

    const blockers = this.collisionProvider?.() ?? [];
    this.cameraRay.copy(this.desiredPosition).sub(this.target);
    const desiredDistance = this.cameraRay.length();
    if (blockers.length && desiredDistance > 0.01) {
      this.raycaster.set(this.target, this.cameraRay.normalize());
      this.raycaster.far = desiredDistance;
      const hit = this.raycaster.intersectObjects(blockers, true).find((candidate) => {
        let current = candidate.object;
        while (current) {
          if (current.visible === false) return false;
          current = current.parent;
        }
        return candidate.object.userData.cameraBlocker;
      });
      if (hit) {
        const safeDistance = Math.max(0.8, hit.distance - 0.28);
        this.desiredPosition.copy(this.target).addScaledVector(this.cameraRay, safeDistance);
      }
    }

    if (!this.initialized) {
      this.smoothedPosition.copy(this.desiredPosition);
      this.smoothedTarget.copy(this.target);
      this.initialized = true;
    } else {
      this.smoothedPosition.lerp(this.desiredPosition, 1 - Math.exp(-8 * delta));
      this.smoothedTarget.lerp(this.target, 1 - Math.exp(-12 * delta));
    }
    this.camera.position.copy(this.smoothedPosition);
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - delta);
      const falloff = this.shakeDuration > 0 ? this.shakeTime / this.shakeDuration : 0;
      const phase = this.shakeSeed + this.shakeTime * 73;
      this.shakeOffset.set(Math.sin(phase), Math.cos(phase * 1.37), Math.sin(phase * 0.73));
      this.shakeOffset.multiplyScalar(this.shakeIntensity * falloff);
      this.camera.position.add(this.shakeOffset);
      if (this.shakeTime <= 0) this.shakeIntensity = 0;
    }
    this.camera.lookAt(this.smoothedTarget);
  }
}
