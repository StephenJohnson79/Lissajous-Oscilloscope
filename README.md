# 李萨如示波器 · Lissajous Oscilloscope

[在线体验 · Live demo](https://lissajous-sound-lab.jixiaomian20000103.chatgpt.site)

[中文](#中文) · [English](#english)

## 中文

一个采用黑白像素界面的浏览器双通道音频示波器。通过正弦信号、鸟鸣录音或麦克风输入，探索频率、相位与波形之间的关系。

### 功能

- **两种视图**：X–Y 模式呈现李萨如曲线，Y–T 模式显示双通道时域波形。
- **实时调节**：频率比、基频、相位、增益、延迟与时基，以及辉度、余辉、位置、AC/DC 耦合和画面冻结。
- **三种音源**：合成正弦信号、可播放和定位的内置鸟鸣录音、麦克风实时输入。麦克风音频在浏览器内处理，不上传、不保存，也不回放到扬声器。
- **像素界面**：纯白背景、黑白波形、像素字体和网点阴影；旋钮可拖动，滑条支持触摸和键盘，中英文界面可切换。时域模式用实线和虚线区分两个通道。

### 原理

正弦信号的 X–Y 轨迹由李萨如参数方程描述：

```text
x(t) = Ax · sin(2π · fx · t)
y(t) = Ay · sin(2π · fy · t + φ)
```

其中，Ax、Ay 为振幅，fx、fy 为频率，φ 为相位差。频率比为有理数时，理想轨迹闭合。音频输入可映射为左右声道，或同一信号与其延迟副本；后者适合观察单声道声音。

电平以数字满幅 FS 为单位，不代表物理电压。冻结只暂停画面，不暂停声音。

### 使用

下载仓库中的 `index.html` 后，直接用现代浏览器打开。界面、脚本、样式和鸟鸣音频均已内置，无需安装依赖或联网加载资源。麦克风需浏览器授权；建议在上方的 HTTPS 在线演示中使用。

### 技术

HTML · React · TypeScript · Vite · Canvas 2D · Web Audio API · AudioWorklet

---

## English

A browser-based, dual-channel audio oscilloscope with a monochrome pixel interface. Use synthesized sine waves, a birdsong recording, or your microphone to see how frequency, phase, and waveform relate.

### Features

- **Two views:** Lissajous curves in X–Y mode and dual-channel time-domain waveforms in Y–T mode.
- **Live controls:** Frequency ratio, base frequency, phase, gain, delay, and timebase, plus intensity, persistence, position, AC/DC coupling, and display freeze.
- **Three sources:** Synthesized sine waves, a built-in birdsong recording with playback and seeking, and live microphone input. Microphone audio is processed in the browser without uploading, recording, or speaker playback.
- **Pixel interface:** A pure white background, monochrome traces, bitmap lettering, and dithered shadows. Draggable knobs, touch- and keyboard-accessible sliders, and switchable Chinese and English text. Solid and dashed lines distinguish the channels in time-domain mode.

### How it works

The X–Y trace of two sine waves follows the Lissajous parametric equations:

```text
x(t) = Ax · sin(2π · fx · t)
y(t) = Ay · sin(2π · fy · t + φ)
```

Ax and Ay are amplitudes, fx and fy are frequencies, and φ is the phase difference. An ideal trace closes when the frequency ratio is rational. Audio can be mapped from the left and right channels, or from one signal and a delayed copy—the latter is useful for mono sources.

Levels are expressed relative to digital full scale (FS), not physical voltage. Freeze pauses the display while audio continues.

### Use

Download `index.html` from this repository and open it in a modern browser. The interface, scripts, styles, and birdsong audio are included in the file, with no installation or external resource downloads required. Microphone access needs browser permission; the HTTPS live demo above is recommended for this feature.

### Built with

HTML · React · TypeScript · Vite · Canvas 2D · Web Audio API · AudioWorklet

## 参考资料 · References

- [Lissajous Curve — Wolfram MathWorld](https://mathworld.wolfram.com/LissajousCurve.html)
- [Web Audio API — W3C](https://www.w3.org/TR/webaudio-1.0/)
- [Silkscreen](https://github.com/google/fonts/tree/main/ofl/silkscreen) · [SIL Open Font License](public/pixel-font-license.txt)
