export class Time {
  constructor(maxDelta = 1 / 30) {
    this.maxDelta = maxDelta;
    this.elapsed = 0;
    this.lastTime = null;
  }

  tick(timestampMs, paused = false) {
    if (this.lastTime === null) {
      this.lastTime = timestampMs;
      return 0;
    }
    const delta = paused ? 0 : Math.min((timestampMs - this.lastTime) / 1000, this.maxDelta);
    this.lastTime = timestampMs;
    this.elapsed += delta;
    return delta;
  }
}
