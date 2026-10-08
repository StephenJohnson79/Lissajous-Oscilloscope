# 李萨如示波器 · Lissajous Oscilloscope

[在线部署方法](#在线部署html) · [Deploy the HTML online](#deploy-the-html-online)

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

下载仓库中的 `index.html` 后，直接用现代浏览器打开。界面、脚本、样式和鸟鸣音频均已内置，无需安装依赖或联网加载资源。麦克风需浏览器授权；在线使用时请通过 HTTPS 访问。

### 在线部署（HTML）

仓库根目录的 `index.html` 是可直接发布的独立 HTML 文件。将它上传到支持 HTTPS 的静态网站托管服务，即可通过网址在线浏览，无需运行 Node.js、安装依赖或重新构建。

以 GitHub Pages 为例：

1. 新建一个用于部署的 GitHub 公开仓库，将本项目的 `index.html` 上传到该仓库根目录，保留文件名。
2. 打开该仓库的 **Settings → Pages**，在 **Build and deployment → Source** 中选择 **Deploy from a branch**。
3. 选择存放 `index.html` 的分支（通常为 `main`）和 **/ (root)** 目录，点击 **Save**。
4. 等待部署完成，打开 Pages 设置页显示的 HTTPS 网址。麦克风输入仍需在浏览器中授予权限。

更新时，用新版 `index.html` 替换部署仓库中的同名文件并提交，GitHub Pages 会重新发布。详细设置见 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

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

Download `index.html` from this repository and open it in a modern browser. The interface, scripts, styles, and birdsong audio are included in the file, with no installation or external resource downloads required. Microphone access needs browser permission; use HTTPS when accessing the app online.

### Deploy the HTML online

The root-level `index.html` is a standalone HTML file ready to publish. Upload it to a static website host that supports HTTPS to access the app online. No Node.js runtime, dependency installation, or rebuild is required.

For example, with GitHub Pages:

1. Create a public GitHub repository for deployment and upload this project's `index.html` to its root, keeping the filename.
2. Open that repository's **Settings → Pages** and select **Deploy from a branch** under **Build and deployment → Source**.
3. Select the branch containing `index.html` (usually `main`) and the **/ (root)** folder, then click **Save**.
4. Wait for deployment to finish and open the HTTPS URL shown in the Pages settings. Microphone input still requires browser permission.

To update the app, replace `index.html` in the deployment repository with the latest version and commit it; GitHub Pages will republish it. See the [official GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) for detailed settings.

### Built with

HTML · React · TypeScript · Vite · Canvas 2D · Web Audio API · AudioWorklet

## 参考资料 · References

- [Lissajous Curve — Wolfram MathWorld](https://mathworld.wolfram.com/LissajousCurve.html)
- [Web Audio API — W3C](https://www.w3.org/TR/webaudio-1.0/)
- [Silkscreen](https://github.com/google/fonts/tree/main/ofl/silkscreen) · [SIL Open Font License](public/pixel-font-license.txt)
