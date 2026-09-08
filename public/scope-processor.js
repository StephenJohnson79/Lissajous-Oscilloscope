import { sinePair } from './signal-math.js';
class ScopeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.p = { source: 'synth', fx: 330, fy: 220, phase: 0 };
    this.n = 0;
    this.cursor = 0;
    this.count = 0;
    this.left = new Float32Array(8192);
    this.right = new Float32Array(8192);
    this.port.onmessage = (e) => {
      if (e.data.source && e.data.source !== this.p.source) {
        this.left.fill(0);
        this.right.fill(0);
        this.cursor = 0;
        this.count = 0;
      }
      this.p = { ...this.p, ...e.data };
    };
  }
  process(inputs, outputs) {
    const input = inputs[0],
      out = outputs[0];
    for (let i = 0; i < out[0].length; i++) {
      const pair =
        this.p.source === 'synth'
          ? sinePair(this.n / sampleRate, this.p.fx, this.p.fy, this.p.phase)
          : [input[0]?.[i] || 0, input[1]?.[i] ?? input[0]?.[i] ?? 0];
      this.n++;
      this.left[this.cursor] = pair[0];
      this.right[this.cursor] = pair[1];
      this.cursor = (this.cursor + 1) % 8192;
      out[0][i] = this.p.source === 'mic' ? 0 : pair[0];
      out[1][i] = this.p.source === 'mic' ? 0 : pair[1];
    }
    this.count += out[0].length;
    if (this.count >= sampleRate / 30) {
      this.count = 0;
      const l = new Float32Array(8192),
        r = new Float32Array(8192);
      for (let i = 0; i < 8192; i++) {
        const j = (this.cursor + i) % 8192;
        l[i] = this.left[j];
        r[i] = this.right[j];
      }
      this.port.postMessage({ l, r, sampleRate }, [l.buffer, r.buffer]);
    }
    return true;
  }
}
registerProcessor('scope-processor', ScopeProcessor);
