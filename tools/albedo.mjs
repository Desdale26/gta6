// albedo.mjs — checks the procedural ground surfaces against real-world albedo.
//
// Every one of these covers a large part of the screen, and a surface that is
// half a stop too bright reads as white plastic no matter how good the lighting
// is. The bands below are measured sRGB reflectance for the real material, with
// enough slack for a game that wants a sunny coast rather than a documentary.
//
//   node tools/albedo.mjs
import * as THREE from '../vendor/three/build/three.module.js';
import { initProcTex } from '../src/render/proctex.js';

const BANDS = {
  asphalt:      [0.16, 0.32],   // fresh tarmac is near-black, worn is grey
  concrete:     [0.34, 0.50],
  sidewalk:     [0.34, 0.50],
  kerb:         [0.40, 0.58],   // kerbs are usually lighter, often painted
  groundDetail: [0.36, 0.52],   // multiplies the per-district terrain tint
  grass:        [0.22, 0.40],
  sand:         [0.42, 0.60],
  dirt:         [0.28, 0.44],
  gravel:       [0.24, 0.44],
  brick:        [0.18, 0.40],
  woodPlank:    [0.16, 0.40],
};

const noop = () => {};
const grad = () => ({ addColorStop: noop });
let captured = null;
function stubContext(w, h) {
  return {
    canvas: null, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    font: '10px sans-serif', textAlign: 'left', textBaseline: 'top', lineCap: 'butt',
    lineJoin: 'miter', shadowBlur: 0, shadowColor: '#000',
    globalCompositeOperation: 'source-over', filter: 'none',
    fillRect: noop, strokeRect: noop, clearRect: noop, beginPath: noop, closePath: noop,
    moveTo: noop, lineTo: noop, arc: noop, arcTo: noop, ellipse: noop, rect: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, fill: noop, stroke: noop, clip: noop,
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop, transform: noop,
    setTransform: noop, fillText: noop, strokeText: noop, drawImage: noop, setLineDash: noop,
    measureText: () => ({ width: 10 }),
    createLinearGradient: grad, createRadialGradient: grad, createPattern: () => null,
    getImageData: (x, y, w2, h2) => ({ data: new Uint8ClampedArray(w2 * h2 * 4).fill(128), width: w2, height: h2 }),
    createImageData: (a, b) => {
      const W = a.width ?? a, H = b ?? a.height;
      return { data: new Uint8ClampedArray(W * H * 4), width: W, height: H };
    },
    putImageData: (img) => { captured = img; },
  };
}

initProcTex(THREE, {
  canvasFactory: (w, h) => ({ width: w, height: h, getContext: () => stubContext(w, h) }),
});
const { tex } = await import('../src/render/proctex.js');

let bad = 0;
console.log('surface          albedo    band          range');
for (const [name, [lo, hi]] of Object.entries(BANDS)) {
  captured = null;
  try { tex(name, { size: 128 }); } catch (e) {
    console.log(`${name.padEnd(15)} ERROR ${e.message}`); bad++; continue;
  }
  if (!captured) { console.log(`${name.padEnd(15)} produced no pixels`); bad++; continue; }
  const d = captured.data;
  let sum = 0, n = 0, min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    sum += l; n++; if (l < min) min = l; if (l > max) max = l;
  }
  const mean = sum / n / 255;
  const ok = mean >= lo && mean <= hi;
  if (!ok) bad++;
  console.log(`${name.padEnd(15)} ${mean.toFixed(3).padStart(6)}  ${ok ? ' ok ' : 'OUT '} ${lo.toFixed(2)}..${hi.toFixed(2)}   ${(min / 255).toFixed(2)}..${(max / 255).toFixed(2)}`);
}
console.log(bad ? `\n${bad} surface(s) outside their band` : '\nevery surface is inside its real-world band');
process.exit(bad ? 1 : 0);
