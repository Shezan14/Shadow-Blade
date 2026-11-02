import * as THREE from 'three';
import { CONFIG } from '../core/Config.js';

export function addLighting(scene) {
  const ambient = new THREE.HemisphereLight(0x91a8e8, 0x20152a, 2.15);
  scene.add(ambient);

  const moon = new THREE.DirectionalLight(0xb8ccff, 4.4);
  moon.position.set(-5, 10, 4);
  moon.castShadow = true;
  moon.shadow.mapSize.setScalar(CONFIG.renderer.shadowMapSize);
  moon.shadow.camera.left = -12;
  moon.shadow.camera.right = 12;
  moon.shadow.camera.top = 12;
  moon.shadow.camera.bottom = -12;
  moon.shadow.bias = -0.00035;
  moon.shadow.normalBias = 0.035;
  scene.add(moon);

  const elementalLights = [
    [CONFIG.colors.fire, [-5.5, 1.2, -2]],
    [CONFIG.colors.ice, [5.5, 1.2, -2]],
    [CONFIG.colors.lightning, [-4, 1, 5]],
    [CONFIG.colors.wind, [4, 1, 5]],
  ];

  const pointLights = elementalLights.map(([color, position]) => {
    const light = new THREE.PointLight(color, 12, 8, 2);
    light.position.set(...position);
    scene.add(light);
    return light;
  });

  const elementIds = ['fire', 'ice', 'lightning', 'wind'];
  return {
    update(elapsed, activeElement = null, castFlash = 0) {
      ambient.intensity = 2.1 + Math.sin(elapsed * 0.22) * 0.06;
      moon.intensity = 4.3 + Math.sin(elapsed * 0.31) * 0.15;
      pointLights.forEach((light, index) => {
        const selected = activeElement === elementIds[index];
        const pulse = Math.sin(elapsed * (1.15 + index * 0.13) + index * 1.7) * 1.1;
        const castBoost = selected ? castFlash * 28 : 0;
        light.intensity = 11.5 + pulse + (selected ? 2.5 : 0) + castBoost;
      });
    },
  };
}
