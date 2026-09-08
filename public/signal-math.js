export function sinePair(t, fx, fy, phase) {
  return [
    Math.sin(2 * Math.PI * fx * t),
    Math.sin(2 * Math.PI * fy * t + (phase * Math.PI) / 180),
  ];
}
export function delaySamples(ms, sampleRate) {
  return Math.max(1, Math.round((ms * sampleRate) / 1000));
}
export function rms(values) {
  return Math.sqrt(
    values.reduce((sum, v) => sum + v * v, 0) / Math.max(1, values.length),
  );
}
export function acCouple(values) {
  const mean = values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
  return values.map((v) => v - mean);
}
