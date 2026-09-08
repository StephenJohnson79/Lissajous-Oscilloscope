'use client';
import { useEffect, useRef, useState } from 'react';
import {
  AudioLines,
  Bird,
  Mic,
  Play,
  Pause,
  RotateCcw,
  Power,
  Volume2,
  VolumeX,
  ArrowUpRight,
  Snowflake,
  Info,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

import { messages, type Language, type MessageKey } from './messages';
import birdsong from '../public/birdsong.m4a?url';
// oxlint-disable-next-line import/default -- Vite's raw loader provides the source as a default string export.
import processorSource from '../public/scope-processor.js?raw';
// oxlint-disable-next-line import/default -- Vite's raw loader provides the source as a default string export.
import signalMathSource from '../public/signal-math.js?raw';

type Source = 'synth' | 'bird' | 'mic';
type Settings = {
  source: Source;
  ratio: string;
  base: number;
  phase: number;
  gx: number;
  gy: number;
  intensity: number;
  persistence: number;
  time: number;
  delay: number;
  px: number;
  py: number;
  view: string;
  mapping: string;
  coupling: string;
  power: boolean;
  frozen: boolean;
};
const defaults: Settings = {
  source: 'synth',
  ratio: '3:2',
  base: 110,
  phase: 0,
  gx: 1,
  gy: 1,
  intensity: 75,
  persistence: 30,
  time: 2,
  delay: 0.7,
  px: 0,
  py: 0,
  view: 'xy',
  mapping: 'delay',
  coupling: 'DC',
  power: true,
  frozen: false,
};
const ratios = ['1:1', '1:2', '2:3', '3:2', '3:4', '4:5'];
const formatTime = (v: number) =>
  `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`;
function Dial({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const start = useRef<{ y: number; v: number } | null>(null);
  const set = (n: number) =>
    onChange(Math.max(min, Math.min(max, Math.round(n / step) * step)));
  return (
    <div className={`dial ${disabled ? 'disabled' : ''}`}>
      <span className="dial-label">{label}</span>
      <div
        className="dial-ring"
        onPointerDown={(e) => {
          if (disabled) return;
          start.current = { y: e.clientY, v: value };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current)
            set(
              start.current.v +
                ((start.current.y - e.clientY) * (max - min)) / 160,
            );
        }}
        onPointerUp={() => (start.current = null)}
        onPointerCancel={() => (start.current = null)}
        aria-hidden="true"
      >
        <span className="dial-markings" />
        <span className="knob">
          <span
            className="knob-face"
            style={{
              transform: `rotate(${-135 + (270 * (value - min)) / (max - min)}deg)`,
            }}
          >
            <i />
          </span>
        </span>
      </div>
      <output>
        {Number(value.toFixed(2))}
        <small> {unit}</small>
      </output>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const t = (key: MessageKey) => messages[language][key];
  useEffect(() => {
    try {
      const saved = localStorage.getItem('oscilloscope-language');
      if (saved === 'zh' || saved === 'en') setLanguage(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = messages[language].pageTitle;
  }, [language]);
  function selectLanguage(value: Language) {
    setLanguage(value);
    try {
      localStorage.setItem('oscilloscope-language', value);
    } catch {}
  }

  const [s, setS] = useState<Settings>(defaults),
    [playing, setPlaying] = useState(false),
    [busy, setBusy] = useState(false),
    [muted, setMuted] = useState(false),
    [volume, setVolume] = useState(15),
    [error, setError] = useState<MessageKey | ''>(''),
    [sampleRate, setSampleRate] = useState(0),
    [rms, setRms] = useState<number | null>(null),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(257.46),
    [devices, setDevices] = useState<MediaDeviceInfo[]>([]),
    [device, setDevice] = useState(''),
    [micName, setMicName] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null),
    trace = useRef<HTMLCanvasElement | null>(null),
    settings = useRef(s),
    active = useRef(false),
    context = useRef<AudioContext | null>(null),
    worklet = useRef<AudioWorkletNode | null>(null),
    gain = useRef<GainNode | null>(null),
    stream = useRef<MediaStream | null>(null),
    mediaSource = useRef<MediaElementAudioSourceNode | null>(null),
    micSource = useRef<MediaStreamAudioSourceNode | null>(null),
    audio = useRef<HTMLAudioElement | null>(null),
    samples = useRef<{
      l: Float32Array;
      r: Float32Array;
      sampleRate: number;
    } | null>(null),
    requestId = useRef(0),
    clearTrace = useRef(true),
    drawState = useRef('');
  const change = (key: keyof Settings, value: Settings[keyof Settings]) =>
    setS((old) => ({ ...old, [key]: value }));
  const [rx, ry] = s.ratio.split(':').map(Number),
    fx = s.base * rx,
    fy = s.base * ry;
  useEffect(() => {
    settings.current = s;
    clearTrace.current = true;
    worklet.current?.port.postMessage({
      source: s.source,
      fx,
      fy,
      phase: s.phase,
    });
  }, [s, fx, fy]);
  useEffect(() => {
    if (gain.current && context.current)
      gain.current.gain.setTargetAtTime(
        muted ? 0 : volume / 100,
        context.current.currentTime,
        0.03,
      );
  }, [volume, muted]);
  function stop() {
    requestId.current++;
    active.current = false;
    setPlaying(false);
    audio.current?.pause();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    micSource.current?.disconnect();
    micSource.current = null;
    void context.current?.suspend();
  }
  async function initAudio() {
    if (!context.current) {
      const ctx = new AudioContext({ sampleRate: 48000 });
      context.current = ctx;
      const processorUrl = URL.createObjectURL(
        new Blob([
          signalMathSource.replaceAll('export function ', 'function '),
          '\n',
          processorSource.replace("import { sinePair } from './signal-math.js';", ''),
        ], { type: 'text/javascript' }),
      );
      try {
        await ctx.audioWorklet.addModule(processorUrl);
      } catch (e) {
        await ctx.close();
        context.current = null;
        throw e;
      } finally {
        URL.revokeObjectURL(processorUrl);
      }
      const node = new AudioWorkletNode(ctx, 'scope-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        channelCountMode: 'max',
      });
      worklet.current = node;
      node.port.onmessage = (e) => {
        if (active.current) samples.current = e.data;
      };
      const g = ctx.createGain();
      g.gain.value = muted ? 0 : volume / 100;
      gain.current = g;
      node.connect(g);
      g.connect(ctx.destination);
    }
    const a = settings.current;
    const [x, y] = a.ratio.split(':').map(Number);
    worklet.current!.port.postMessage({
      source: a.source,
      fx: a.base * x,
      fy: a.base * y,
      phase: a.phase,
    });
    setSampleRate(context.current!.sampleRate);
    await context.current!.resume();
  }
  async function start() {
    if (busy || !s.power) return;
    setBusy(true);
    setError('');
    const ticket = ++requestId.current;
    try {
      await initAudio();
      if (ticket !== requestId.current) return;
      mediaSource.current?.disconnect();
      samples.current = null;
      if (s.source === 'bird') {
        if (!audio.current) {
          const el = new Audio(birdsong);
          el.preload = 'metadata';
          audio.current = el;
          el.onloadedmetadata = () => setDuration(el.duration);
          el.ontimeupdate = () => setPosition(el.currentTime);
          el.onended = () => {
            active.current = false;
            setPlaying(false);
            void context.current?.suspend();
          };
          mediaSource.current = context.current!.createMediaElementSource(el);
        }
        mediaSource.current!.connect(worklet.current!);
        await audio.current.play();
      } else if (s.source === 'mic') {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error('secureContext');
        const input = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: device ? { exact: device } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });
        if (ticket !== requestId.current) {
          input.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = input;
        const track = input.getAudioTracks()[0];
        setMicName(track.label);
        track.onended = () => {
          stop();
          setError('micDisconnected');
        };
        micSource.current = context.current!.createMediaStreamSource(input);
        micSource.current.connect(worklet.current!);
        setDevices(
          (await navigator.mediaDevices.enumerateDevices()).filter(
            (d) => d.kind === 'audioinput',
          ),
        );
      }
      if (ticket !== requestId.current) {
        audio.current?.pause();
        return;
      }
      active.current = true;
      setPlaying(true);
      clearTrace.current = true;
    } catch (e) {
      stop();
      const err = e as Error;
      setError(
        err.message === 'secureContext'
          ? 'secureContext'
          : err.name === 'NotAllowedError'
            ? 'permissionDenied'
            : err.name === 'NotFoundError'
              ? 'deviceMissing'
              : err.name === 'NotReadableError'
                ? 'deviceBusy'
                : 'audioFailed',
      );
    } finally {
      setBusy(false);
    }
  }
  function switchSource(source: Source) {
    stop();
    samples.current = null;
    setSampleRate(0);
    setRms(null);
    setError('');
    setS((old) => ({ ...old, source, frozen: false }));
  }
  function reset() {
    stop();
    samples.current = null;
    setS(defaults);
    setError('');
    setRms(null);
    setSampleRate(0);
    if (audio.current) {
      audio.current.currentTime = 0;
      setPosition(0);
    }
    setVolume(15);
    setMuted(false);
  }
  useEffect(
    () => () => {
      requestId.current++;
      audio.current?.pause();
      stream.current?.getTracks().forEach((t) => t.stop());
      void context.current?.close();
    },
    [],
  );
  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    trace.current = document.createElement('canvas');
    const layer = trace.current;
    const ink = layer.getContext('2d')!;
    let raf = 0,
      lastMeter = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const a = settings.current;
      const rect = c.getBoundingClientRect();
      const dpr = 1;
      const w = Math.round(rect.width * dpr),
        h = Math.round(rect.height * dpr);
      if (!w || !h) return;
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
        layer.width = w;
        layer.height = h;
        clearTrace.current = true;
      }
      const state = JSON.stringify(a);
      if (state !== drawState.current) {
        clearTrace.current = true;
        drawState.current = state;
      }
      if (clearTrace.current && !a.frozen) {
        ink.clearRect(0, 0, w, h);
        clearTrace.current = false;
      }
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = a.power ? '#fff' : '#000';
      ctx.fillRect(0, 0, w, h);
      if (!a.power) return;
      const dx = w / 10,
        dy = h / 8;
      ctx.strokeStyle = 'rgba(0,0,0,.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 5]);
      ctx.beginPath();
      for (let i = 1; i < 10; i++) {
        ctx.moveTo(i * dx, 0);
        ctx.lineTo(i * dx, h);
      }
      for (let i = 1; i < 8; i++) {
        ctx.moveTo(0, i * dy);
        ctx.lineTo(w, i * dy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      for (let i = 1; i < 50; i++) {
        ctx.moveTo((i * w) / 50, h / 2 - 3 * dpr);
        ctx.lineTo((i * w) / 50, h / 2 + 3 * dpr);
      }
      for (let i = 1; i < 40; i++) {
        ctx.moveTo(w / 2 - 3 * dpr, (i * h) / 40);
        ctx.lineTo(w / 2 + 3 * dpr, (i * h) / 40);
      }
      ctx.stroke();
      if (!a.frozen) {
        ink.globalCompositeOperation = 'destination-out';
        ink.fillStyle = `rgba(0,0,0,${a.persistence === 0 ? 1 : Math.max(0.08, 1 - a.persistence / 105)})`;
        ink.fillRect(0, 0, w, h);
        ink.globalCompositeOperation = 'source-over';
        let l: Float32Array, r: Float32Array, rate: number;
        if (a.source === 'synth' && !active.current) {
          rate = 48000;
          l = new Float32Array(8192);
          r = new Float32Array(8192);
          const [x, y] = a.ratio.split(':').map(Number);
          for (let i = 0; i < 8192; i++) {
            l[i] = Math.sin((2 * Math.PI * a.base * x * i) / rate);
            r[i] = Math.sin(
              (2 * Math.PI * a.base * y * i) / rate + (a.phase * Math.PI) / 180,
            );
          }
        } else if (samples.current) {
          ({ l, r, sampleRate: rate } = samples.current);
        } else {
          rate = 48000;
          l = new Float32Array(8192);
          r = l;
        }
        const delay = Math.max(1, Math.round((a.delay * rate) / 1000));
        let mx = 0,
          my = 0;
        if (a.coupling === 'AC') {
          for (let i = 0; i < l.length; i++) {
            mx += l[i];
            my += r[i];
          }
          mx /= l.length;
          my /= r.length;
        }
        let start = Math.max(
          delay,
          l.length -
            Math.min(l.length - delay, Math.round((a.time * 10 * rate) / 1000)),
        );
        let end = l.length;
        if (a.view === 'time') {
          const size = Math.min(
            l.length - delay - 1,
            Math.round((a.time * 10 * rate) / 1000),
          );
          // Rising zero-crossing trigger, only when enough measured samples remain.
          for (let i = delay + 1; i < l.length - size; i++) {
            if (l[i - 1] <= mx && l[i] > mx) {
              start = i;
              end = i + size;
              break;
            }
          }
        }
        function path(channel: number) {
          ink.beginPath();
          for (let i = start; i < end; i++) {
            let x: number, y: number;
            if (a.view === 'xy') {
              x = (l[i] - mx) * a.gx;
              y =
                (a.source !== 'synth' && a.mapping === 'delay'
                  ? l[i - delay] - mx
                  : r[i] - my) * a.gy;
              x = w / 2 + x * dx * 3 + a.px * dx;
              y = h / 2 - y * dy * 3 - a.py * dy;
            } else {
              x = ((i - start) / (end - start - 1)) * w + a.px * dx;
              y =
                h / 2 -
                (channel === 0 ? l[i] - mx : r[i] - my) *
                  (channel === 0 ? a.gx : a.gy) *
                  dy *
                  2.5 -
                a.py * dy;
            }
            if (i === start) ink.moveTo(Math.round(x) + .5, Math.round(y) + .5);
            else ink.lineTo(Math.round(x) + .5, Math.round(y) + .5);
          }
        }
        ink.globalAlpha = a.intensity / 100;
        ink.lineJoin = 'miter';
        ink.lineWidth = 1;
        ink.strokeStyle = '#000';
        ink.shadowBlur = 0;
        ink.setLineDash([]);
        path(0);
        ink.stroke();
        if (a.view === 'time') {
          ink.setLineDash([5, 4]);
          path(1);
          ink.stroke();
          ink.setLineDash([]);
        }
        ink.globalAlpha = 1;
        if (now - lastMeter > 250) {
          lastMeter = now;
          if (active.current) {
            let sum = 0;
            for (let i = 0; i < l.length; i++) sum += l[i] * l[i];
            setRms(Math.sqrt(sum / l.length));
          } else setRms(null);
        }
      }
      ctx.drawImage(layer, 0, 0);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  const dial = (
    key:
      | 'base'
      | 'phase'
      | 'gx'
      | 'gy'
      | 'time'
      | 'delay'
      | 'intensity'
      | 'persistence'
      | 'px'
      | 'py',
    label: MessageKey,
    min: number,
    max: number,
    step: number,
    unit: string,
    disabled = false,
  ) => (
    <Dial
      label={t(label)}
      value={s[key]}
      min={min}
      max={max}
      step={step}
      unit={unit}
      onChange={(v) => change(key, v)}
      disabled={disabled}
    />
  );
  const sourceName = t(s.source);
  return (
    <Sheet>
      <main>
        <header className="page-header">
          <div
            className="language-switch"
            role="group"
            aria-label={t('language')}
          >
            <button
              lang="zh-CN"
              aria-pressed={language === 'zh'}
              onClick={() => selectLanguage('zh')}
            >
              中
            </button>
            <button
              lang="en"
              aria-pressed={language === 'en'}
              onClick={() => selectLanguage('en')}
            >
              EN
            </button>
          </div>
          <SheetTrigger
            className="info-button"
            aria-label={t('settings')}
            title={t('settings')}
          >
            <Info size={20} />
          </SheetTrigger>
        </header>
        <div className="instrument-stage">
          <div className="instrument-assembly">
            <section className="instrument" aria-label={t('instrument')}>
              <div className="window-title"><span>{t('instrument')}</span></div>
              <span className="screw tl" />
              <span className="screw tr" />
              <span className="screw bl" />
              <span className="screw br" />
              <div className="instrument-body">
                <div className="display-section">
                  <div className={`screen-bezel ${!s.power ? 'off' : ''}`}>
                    <div className="screen">
                      <canvas
                        ref={canvas}
                        aria-label={t(
                          s.view === 'xy' ? 'xyImage' : 'timeImage',
                        )}
                        role="img"
                      />
                      {s.power && (
                        <>
                          <div className="screen-top">
                            <span>
                              <i
                                className={playing ? 'live-dot' : 'idle-dot'}
                              />
                              {t(
                                s.frozen
                                  ? 'hold'
                                  : playing
                                    ? 'live'
                                    : s.source === 'synth'
                                      ? 'formula'
                                      : 'ready',
                              )}
                            </span>
                            <span>
                              {t(s.view === 'xy' ? 'xyMode' : 'timeMode')}
                            </span>
                          </div>
                          <div className="screen-bottom">
                            <span>
                              {s.source === 'synth'
                                ? `X ${fx} Hz · Y ${fy} Hz`
                                : s.mapping === 'delay' && s.view === 'xy'
                                  ? `X s(t) · Y s(t − ${s.delay.toFixed(2)} ms)`
                                  : s.view === 'time' ? 'CH1 L ━ · CH2 R ┄' : 'CH1 L · CH2 R'}
                            </span>
                            <span>
                              {s.view === 'xy'
                                ? s.source === 'synth'
                                  ? `${s.ratio} / ${s.phase}°`
                                  : 'PCM'
                                : `${s.time} ms/div`}
                            </span>
                          </div>
                          {!playing &&
                            s.source !== 'synth' &&
                            !samples.current && (
                              <div className="screen-hint">
                                {t(
                                  s.source === 'bird' ? 'birdHint' : 'micHint',
                                )}
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="screen-caption">
                    <span>{t('divisions')}</span>
                  </div>
                  <div className="lower-controls">
                    <div className="power-group">
                      <span className="engraved">{t('power')}</span>
                      <button
                        className={`power-button ${s.power ? 'on' : ''}`}
                        aria-label={t(s.power ? 'powerOff' : 'powerOn')}
                        aria-pressed={s.power}
                        onClick={() => {
                          if (s.power) stop();
                          change('power', !s.power);
                        }}
                      >
                        <Power size={19} />
                      </button>
                      <span className="power-status">
                        <i className={s.power ? 'live-dot' : 'idle-dot'} />
                        {t(s.power ? 'on' : 'off')}
                      </span>
                    </div>
                    <div className="action-group">
                      <button
                        className={`hardware-button ${s.frozen ? 'selected' : ''}`}
                        disabled={!s.power}
                        aria-pressed={s.frozen}
                        onClick={() => change('frozen', !s.frozen)}
                      >
                        <Snowflake size={15} />
                        {t(s.frozen ? 'resume' : 'freeze')}
                      </button>
                      <button className="hardware-button" onClick={reset}>
                        <RotateCcw size={15} />
                        {t('reset')}
                      </button>
                    </div>
                  </div>
                </div>
                <aside className="control-panel">
                  <div className="panel-heading">
                    <span>{t('displayMode')}</span>
                  </div>
                  <Tabs
                    value={s.view}
                    onValueChange={(v) => change('view', String(v))}
                  >
                    <TabsList className="machine-tabs">
                      <TabsTrigger value="xy">{t('xyTab')}</TabsTrigger>
                      <TabsTrigger value="time">{t('timeTab')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="channel-controls">
                    <div className="dial-row">
                      {dial('gx', 'xGain', 0.1, 3, 0.05, '×')}
                      {dial('gy', 'yGain', 0.1, 3, 0.05, '×')}
                    </div>
                  </div>
                  <div className="panel-heading small-heading">
                    <span>
                      {t(s.source === 'synth' ? 'generator' : 'sampling')}
                    </span>
                  </div>
                  <div className="dial-row">
                    {s.source === 'synth' ? (
                      <>
                        {dial('base', 'frequency', 20, 500, 1, 'Hz')}
                        {dial('phase', 'phase', 0, 360, 1, '°')}
                      </>
                    ) : (
                      <>
                        {dial(
                          'delay',
                          'delay',
                          0.02,
                          5,
                          0.01,
                          'ms',
                          s.mapping === 'stereo' || s.view === 'time',
                        )}
                        {dial('time', 'timebase', 0.1, 10, 0.1, 'ms')}
                      </>
                    )}
                  </div>
                  {s.source === 'synth' ? (
                    <div className="ratio-section">
                      <div className="panel-heading">
                        <span>{t('ratio')}</span>
                      </div>
                      <div className="ratio-buttons">
                        {ratios.map((r) => (
                          <button
                            key={r}
                            className={`hardware-button ${s.ratio === r ? 'selected' : ''}`}
                            aria-pressed={s.ratio === r}
                            onClick={() => change('ratio', r)}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="ratio-section">
                      <div className="panel-heading">
                        <span>{t('mapping')}</span>
                      </div>
                      <Tabs
                        value={s.mapping}
                        onValueChange={(v) => change('mapping', String(v))}
                      >
                        <TabsList className="machine-tabs">
                          <TabsTrigger value="delay">
                            {t('delayMapping')}
                          </TabsTrigger>
                          <TabsTrigger value="stereo">
                            {t('stereoMapping')}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  )}
                  <div className="connection-strip" aria-hidden="true">
                    <div>
                      <span className="socket" />
                      <span>CH 1 · X</span>
                    </div>
                    <div>
                      <span className="socket" />
                      <span>CH 2 · Y</span>
                    </div>
                  </div>
                </aside>
              </div>
              <div className="machine-footer">
                <span>
                  <i className={playing ? 'live-dot' : 'idle-dot'} />
                  {s.power
                    ? playing
                      ? `${sourceName} · ${t('capturing')}`
                      : t(s.source === 'synth' ? 'preview' : 'waiting')
                    : t('poweredOff')}
                </span>
                <span>
                  {sampleRate
                    ? `${(sampleRate / 1000).toFixed(1)} kHz`
                    : '— kHz'}{' '}
                  <b>·</b> RMS {rms === null ? '—' : rms.toFixed(3)} FS
                </span>
              </div>
            </section>
            <div className="bench-feet">
              <i />
              <i />
            </div>
            <section className="workbench" aria-label={t('sourceControls')}>
              <div className="input-card">
                <Tabs
                  value={s.source}
                  onValueChange={(v) => switchSource(v as Source)}
                >
                  <TabsList className="source-tabs">
                    <TabsTrigger value="synth">
                      <AudioLines size={16} />
                      {t('synth')}
                    </TabsTrigger>
                    <TabsTrigger value="bird">
                      <Bird size={16} />
                      {t('bird')}
                    </TabsTrigger>
                    <TabsTrigger value="mic">
                      <Mic size={16} />
                      {t('mic')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {s.source === 'bird' && (
                  <div className="transport">
                    <Slider
                      aria-label={t('seek')}
                      min={0}
                      max={duration}
                      step={0.1}
                      value={[position]}
                      onValueChange={(v) => {
                        const n = Array.isArray(v) ? v[0] : v;
                        if (audio.current) {
                          audio.current.currentTime = n;
                          setPosition(n);
                          samples.current = null;
                          clearTrace.current = true;
                        }
                      }}
                    />
                    <div>
                      <span>{formatTime(position)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}
                {s.source === 'mic' && (
                  <label className="device-label">
                    {t('inputDevice')}
                    <select
                      value={device}
                      onChange={(e) => {
                        stop();
                        setDevice(e.target.value);
                      }}
                    >
                      <option value="">{t('defaultDevice')}</option>
                      {devices.map((d) => (
                        <option value={d.deviceId} key={d.deviceId}>
                          {d.label || t('audioDevice')}
                        </option>
                      ))}
                    </select>
                    <span>
                      {playing ? micName || t('mic') : t('deviceHint')}
                    </span>
                  </label>
                )}
                <div className="play-row">
                  <button
                    className="play-button"
                    disabled={!s.power || busy}
                    onClick={() => (playing ? stop() : void start())}
                  >
                    {playing ? (
                      <Pause size={16} />
                    ) : s.source === 'mic' ? (
                      <Mic size={16} />
                    ) : (
                      <Play size={16} />
                    )}{' '}
                    {t(
                      busy
                        ? 'connecting'
                        : playing
                          ? s.source === 'mic'
                            ? 'disconnect'
                            : 'pause'
                          : s.source === 'mic'
                            ? 'connect'
                            : s.source === 'bird'
                              ? 'playBird'
                              : 'playSynth',
                    )}
                  </button>
                  {s.source !== 'mic' && (
                    <div className="volume">
                      <button
                        aria-label={t(muted ? 'unmute' : 'mute')}
                        onClick={() => setMuted(!muted)}
                      >
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <Slider
                        aria-label={t('volume')}
                        value={[volume]}
                        min={0}
                        max={50}
                        step={1}
                        onValueChange={(v) =>
                          setVolume(Array.isArray(v) ? v[0] : v)
                        }
                      />
                      <span>{muted ? 0 : volume}%</span>
                    </div>
                  )}
                </div>
                {error && (
                  <p className="error" role="alert">
                    {t(error)}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <SheetContent className="information-sheet" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t('manual')}</SheetTitle>
          <SheetClose className="sheet-done">{t('close')}</SheetClose>
        </SheetHeader>
        <div className="information-scroll">
          <div className="source-description">
            <strong>{t('input')}</strong>
            <p>{t('inputHelp')}</p>
            <p>
              {t(
                s.source === 'synth'
                  ? 'synthHelp'
                  : s.source === 'bird'
                    ? 'birdHelp'
                    : 'micHelp',
              )}
            </p>
          </div>
          <div className="formula-card">
            <div className="section-title">
              <h2>{t('equations')}</h2>
            </div>
            <div className="formulas">
              {s.view === 'time' ? (
                <>
                  <p>
                    <em>x</em> = t
                  </p>
                  <p>
                    <em>y₁</em> = Gₓ · L(t)
                  </p>
                  <p>
                    <em>y₂</em> = Gᵧ · R(t)
                  </p>
                </>
              ) : s.source === 'synth' ? (
                <>
                  <p>
                    <em>x(t)</em> = Aₓ sin(2πfₓt)
                  </p>
                  <p>
                    <em>y(t)</em> = Aᵧ sin(2πfᵧt + φ)
                  </p>
                </>
              ) : s.mapping === 'delay' ? (
                <>
                  <p>
                    <em>x[n]</em> = Gₓ · s[n]
                  </p>
                  <p>
                    <em>y[n]</em> = Gᵧ · s[n − k]
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <em>x[n]</em> = Gₓ · L[n]
                  </p>
                  <p>
                    <em>y[n]</em> = Gᵧ · R[n]
                  </p>
                </>
              )}
            </div>
            <p className="formula-note">
              {t(
                s.view === 'time'
                  ? 'readingHelp'
                  : s.source === 'synth'
                    ? 'synthNote'
                    : s.mapping === 'delay'
                      ? 'delayNote'
                      : 'stereoNote',
              )}
            </p>
          </div>
          <details className="fine-controls">
            <summary>
              {t('fine')}
              <span>{t('fineHint')} ＋</span>
            </summary>
            <div className="fine-content">
              <div className="fine-dials">
                {dial('intensity', 'intensity', 15, 100, 1, '%')}
                {dial('persistence', 'persistence', 0, 95, 1, '%')}
                {dial('px', 'xPosition', -2, 2, 0.1, 'div')}
                {dial('py', 'yPosition', -2, 2, 0.1, 'div')}
                {s.source === 'synth' &&
                  dial('time', 'timebase', 0.1, 10, 0.1, 'ms')}
                <div className="coupling">
                  <p>{t('coupling')}</p>
                  <Tabs
                    value={s.coupling}
                    onValueChange={(v) => change('coupling', String(v))}
                  >
                    <TabsList>
                      <TabsTrigger value="DC">DC</TabsTrigger>
                      <TabsTrigger value="AC">AC</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </div>
          </details>
          <div className="notes">
            {(['operation', 'reading', 'samples', 'scale'] as const).map(
              (key) => (
                <p key={key}>
                  <strong>{t(key)}</strong>
                  <br />
                  {t(`${key}Help`)}
                </p>
              ),
            )}
            <p>{t('micRequirement')}</p>
            <a
              href="https://www.w3.org/TR/webaudio-1.0/"
              target="_blank"
              rel="noreferrer"
            >
              {t('reference')} <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
