import assert from 'node:assert/strict';
import { AudioManager } from '../src/audio/AudioManager.js';
import { PerformanceMonitor, chooseQualityScale } from '../src/core/PerformanceMonitor.js';

assert.equal(chooseQualityScale(1, 30), 0.85);
assert.equal(chooseQualityScale(0.7, 30), 0.65, 'quality has a stable lower bound');
assert.equal(chooseQualityScale(0.85, 60), 0.9);
assert.equal(chooseQualityScale(1, 60), 1, 'quality never exceeds native target');
assert.equal(chooseQualityScale(0.85, 52), 0.85, 'stable frame rates do not cause quality churn');

const changes = [];
const monitor = new PerformanceMonitor({ sampleInterval: 0.1, onQualityChange: (scale) => changes.push(scale) });
const rendererInfo = { render: { calls: 42, triangles: 12345 } };
for (let sample = 0; sample < 3; sample += 1) monitor.update(0.1, rendererInfo);
assert.equal(monitor.qualityScale, 0.85, 'three sustained low-FPS samples reduce render resolution');
assert.deepEqual(changes, [0.85]);
assert.equal(monitor.getSnapshot().drawCalls, 42);
assert.equal(monitor.getSnapshot().triangles, 12345);

for (let sample = 0; sample < 8; sample += 1) {
  for (let frame = 0; frame < 7; frame += 1) monitor.update(0.016, rendererInfo);
}
assert.equal(monitor.qualityScale, 0.9, 'sustained recovery gradually restores render quality');

const silentAudio = new AudioManager(null);
assert.equal(silentAudio.available, false);
assert.equal(await silentAudio.unlock(), false, 'audio gracefully degrades when Web Audio is unavailable');
assert.equal(silentAudio.tone({}), false);
assert.equal(silentAudio.toggleMuted(), true);
assert.equal(silentAudio.toggleMuted(), false);

console.log('Phase 10 polish tests passed: adaptive quality, telemetry, and audio fallback.');
