export function chooseQualityScale(scale, fps, lowThreshold = 45, highThreshold = 57) {
  if (fps < lowThreshold) return Math.max(0.65, Number((scale - 0.15).toFixed(2)));
  if (fps > highThreshold) return Math.min(1, Number((scale + 0.05).toFixed(2)));
  return scale;
}

export class PerformanceMonitor {
  constructor({ sampleInterval = 0.5, onQualityChange = null } = {}) {
    this.sampleInterval = sampleInterval;
    this.onQualityChange = onQualityChange;
    this.elapsed = 0;
    this.frames = 0;
    this.fps = 60;
    this.drawCalls = 0;
    this.triangles = 0;
    this.qualityScale = 1;
    this.lowSamples = 0;
    this.highSamples = 0;
  }

  update(delta, rendererInfo) {
    if (delta <= 0) return false;
    this.elapsed += delta;
    this.frames += 1;
    this.drawCalls = rendererInfo?.render?.calls ?? 0;
    this.triangles = rendererInfo?.render?.triangles ?? 0;
    if (this.elapsed < this.sampleInterval) return false;

    this.fps = Math.round(this.frames / this.elapsed);
    this.lowSamples = this.fps < 45 ? this.lowSamples + 1 : 0;
    this.highSamples = this.fps > 57 ? this.highSamples + 1 : 0;
    const shouldAdjust = this.lowSamples >= 3 || this.highSamples >= 8;
    if (shouldAdjust) {
      const nextScale = chooseQualityScale(this.qualityScale, this.fps);
      if (nextScale !== this.qualityScale) {
        this.qualityScale = nextScale;
        this.onQualityChange?.(nextScale);
      }
      this.lowSamples = 0;
      this.highSamples = 0;
    }
    this.elapsed = 0;
    this.frames = 0;
    return true;
  }

  getSnapshot() {
    return {
      fps: this.fps,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      qualityScale: this.qualityScale,
    };
  }
}
