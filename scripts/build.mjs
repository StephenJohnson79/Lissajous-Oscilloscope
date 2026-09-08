import { readFile, writeFile, unlink } from 'node:fs/promises';
import { build } from 'vite';

await build();
const script = (await readFile('dist/app.js', 'utf8')).replace(/<\/script/gi, '<\\/script');
const style = (await readFile('dist/app.css', 'utf8')).replace(/<\/style/gi, '<\\/style');
const icon = await readFile('public/favicon.svg');
const fontLicense = (await readFile('public/pixel-font-license.txt', 'utf8')).replaceAll('--', '—');
const html = `<!doctype html>
<!-- Embedded Silkscreen font license:\n${fontLicense}\n-->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="An interactive audio oscilloscope with Lissajous curves, time-domain waveforms, and English and Chinese controls.">
  <title>Lissajous Oscilloscope · 李萨如示波器</title>
  <link rel="icon" href="data:image/svg+xml;base64,${icon.toString('base64')}">
  <style>${style}</style>
</head>
<body>
  <div id="root"></div>
  <noscript>请启用 JavaScript 以使用示波器。 Enable JavaScript to use the oscilloscope.</noscript>
  <script>${script}</script>
</body>
</html>
`;
await writeFile('index.html', html);
await writeFile('dist/index.html', html);
await Promise.all(['dist/app.js', 'dist/app.css'].map((path) => unlink(path)));
console.log('Built self-contained index.html: scripts, styles, audio and worklet included.');
