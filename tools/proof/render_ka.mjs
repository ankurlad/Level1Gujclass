// Build an HTML page that renders the app's exact ka guide glyph + dots
// (committed data, same CSS classes, same 380x320 container) and let headless
// Edge --screenshot it. Then we crop the dot-1 neighborhood and stack the
// phone's dot-1 next to it for a decisive shape comparison.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const fontBuf = fs.readFileSync(new URL('../../public/fonts/noto-sans-gujarati-gujarati.woff2', import.meta.url));
const fontB64 = fontBuf.toString('base64');

// Read waypoints from curriculum.js directly (parse, since it's ESM with exports we can't require)
import { readFileSync } from 'node:fs';
const curriculumSrc = readFileSync(new URL('../../src/curriculum.js', import.meta.url), 'utf8');
// ka entry regex
const m = curriculumSrc.match(/id:\s*['"]ka['"][\s\S]*?waypoints:\s*\[((?:\{[\s\S]*?\}[\s\S]*?)+) *\]/);
if (!m) { console.error('no ka'); process.exit(1); }
const wps = [...m[1].matchAll(/\{[^}]*\}/g)].map(x => x[0])
  .map(str => {
    const xv = str.match(/x:\s*([\d.]+)/)?.[1];
    const yv = str.match(/y:\s*([\d.]+)/)?.[1];
    const mv = /moveTo:\s*true/.test(str);
    return { x: +xv, y: +yv, moveTo: mv };
  });

// Load the app's real CSS for the dot styling (or inline the classes we know)
const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8');
const jsx = readFileSync(new URL('../../src/views/TraceView.jsx', import.meta.url), 'utf8');

const STARS = [
  { x: 210.0,  y: 86.0 },   // committed 55.26, 26.88 -> already known
  // We'll render from the parsed waypoints
];

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'NSG';
    font-weight: 400;
    src: url(data:font/woff2;base64,${fontB64}) format('woff2');
  }
  :root {
    /* pull the app's tokens (subset we need) */
    --color-primary: #4f46e5;
    --color-primary-shade: #3730a3;
    --color-danger: #f43f5e;
    --color-ink: #0f172a;
  }
  html,body{margin:0;padding:0;background:#f8fafc}
  .card{
    position:relative;
    width:380px;height:320px;       /* THE APP'S EXACT CANVAS, not aspect-ratio */
    background:#f1f5f9;             /* slate-100 */
    overflow:hidden;
    margin:20px;
  }
  .card canvas{position:absolute;inset:0;width:100%;height:100%}
  .dot{
    position:absolute;
    width:20px;height:20px;         /* w-5 = 20px, the shipped size */
    border-radius:50%;
    display:flex;justify-content:center;align-items:center;
    border:2px solid #3730a3;       /* primary-shade */
    background: rgba(79,70,229,0.38);   /* next-state fill */
    color:#0f172a;font:bold 10px/1 system-ui,sans-serif;
    transform:translate(-50%,-50%);
    box-shadow: 0 1px 3px rgba(15,23,42,0.15);
  }
  .dot.next{width:20px;height:20px;border-width:3px;border-style:dashed}
  .dot.done{background: rgba(79,70,229,0.22);border-width:3px}
</style></head>
<body>
  <div class="card" id="card">
    <canvas id="cv" width="380" height="320"></canvas>
  </div>
<script>
  const WPS = ${JSON.stringify(wps)};
  const canvas = document.getElementById('cv');
  const ctx = canvas.getContext('2d');
  // Wait for NSG to load, THEN draw the glyph with the exact fill the app uses
  document.fonts.load('220px "NSG"', '\u0a95')
    .then(()=>document.fonts.ready)
    .catch(()=>{})
    .finally(()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save();
      ctx.font = '220px "NSG"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(148,163,184,0.75)';
      ctx.fillText('\u0a95', canvas.width/2, canvas.height/2 + 10);
      ctx.restore();
    });
  // Place all 13 dots
  const card = document.getElementById('card');
  let si = 0;
  WPS.forEach((wp,i)=>{
    if (wp.moveTo) si++;
    const el = document.createElement('div');
    el.className = 'dot ' + (i===0 ? 'next' : 'done');
    el.style.left = wp.x + '%';
    el.style.top  = wp.y + '%';
    el.textContent = i+1;
    card.appendChild(el);
  });
</script>
</body></html>`;

fs.writeFileSync(path.join(import.meta.dirname, 'render_ka.html'), html);
console.log('wrote render_ka.html', (html.length/1024|0), 'KB');
