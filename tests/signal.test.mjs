import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sinePair,
  delaySamples,
  rms,
  acCouple,
} from '../public/signal-math.js';
let Processor;
globalThis.sampleRate = 48000;
globalThis.AudioWorkletProcessor = class {
  constructor() {
    this.messages = [];
    this.port = { postMessage: (m) => this.messages.push(m) };
  }
};
globalThis.registerProcessor = (_name, ctor) => {
  Processor = ctor;
};
await import('../public/scope-processor.js');
const block = () => [[new Float32Array(128), new Float32Array(128)]];
test('quadrature creates a unit circle; rational frequency ratio closes', () => {
  for (let i = 0; i < 100; i++) {
    const [x, y] = sinePair(i / 48000, 220, 220, 90);
    assert.ok(Math.abs(x * x + y * y - 1) < 1e-12);
  }
  const a = sinePair(0.001, 330, 220, 45),
    b = sinePair(0.001 + 1 / 110, 330, 220, 45);
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-12));
});
test('normalized RMS and AC centering retain amplitude', () => {
  const signal = Float32Array.from({ length: 48000 }, (_, i) =>
    Math.sin((2 * Math.PI * 220 * i) / 48000),
  );
  assert.ok(Math.abs(rms(signal) - Math.SQRT1_2) < 1e-7);
  assert.deepEqual([...acCouple(new Float32Array([1, 2, 3]))], [-1, 0, 1]);
  assert.equal(delaySamples(0.7, 48000), 34);
});
test('processor emits precisely the formula samples to each audio channel', () => {
  const p = new Processor();
  p.port.onmessage({ data: { source: 'synth', fx: 330, fy: 220, phase: 90 } });
  const out = block();
  p.process([[]], out);
  for (let i = 0; i < 128; i++) {
    const expected = sinePair(i / 48000, 330, 220, 90);
    assert.ok(Math.abs(out[0][0][i] - expected[0]) < 1e-7);
    assert.ok(Math.abs(out[0][1][i] - expected[1]) < 1e-7);
  }
});
test('stereo PCM capture is ordered and synchronous across ring buffer wrap', () => {
  const p = new Processor();
  p.port.onmessage({ data: { source: 'bird' } });
  for (let b = 0; b < 91; b++) {
    const l = Float32Array.from(
        { length: 128 },
        (_, i) => (b * 128 + i) / 20000,
      ),
      r = Float32Array.from(l, (v) => -v);
    const out = block();
    p.process([[l, r]], out);
    assert.deepEqual(out[0][0], l);
    assert.deepEqual(out[0][1], r);
  }
  const m = p.messages.at(-1);
  assert.equal(m.l.length, 8192);
  for (let i = 1; i < 8192; i++) {
    assert.ok(m.l[i] > m.l[i - 1]);
    assert.equal(m.r[i], -m.l[i]);
  }
  const k = delaySamples(0.7, 48000);
  assert.ok(Math.abs(m.l[8191] - m.l[8191 - k] - k / 20000) < 1e-7);
});
test('microphone capture never reaches speakers; mono is duplicated truthfully', () => {
  const p = new Processor();
  p.port.onmessage({ data: { source: 'mic' } });
  const input = new Float32Array(128).fill(0.25);
  for (let b = 0; b < 13; b++) {
    const out = block();
    p.process([[input]], out);
    assert.ok(out[0].every((ch) => ch.every((v) => v === 0)));
  }
  const m = p.messages.at(-1);
  assert.equal(m.l.at(-1), 0.25);
  assert.equal(m.r.at(-1), 0.25);
});
