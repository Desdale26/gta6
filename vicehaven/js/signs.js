/*
 * signs.js — paints sign faces (text and artwork) onto canvases.
 *
 * A sign spec is { w, h (metres), lines: [...], style }. The first line is
 * the headline; later lines are smaller. Styles give each kind of sign its
 * own look: bronze plaques, wayfinding boards, neon, the city welcome sign.
 */
(function () {
  'use strict';

  const VH = window.VH;
  const FONT = "'Bahnschrift', 'Segoe UI', 'Arial Narrow', Arial, sans-serif";
  const SERIF = "Georgia, 'Times New Roman', serif";

  const STYLES = {
    plaque: { bg: ['#5e4526', '#8d6c3c'], fg: '#f3e7c9', font: SERIF, border: '#c9a45c', weight: '700' },
    info: { bg: ['#132338', '#1c3350'], fg: '#ffffff', font: FONT, bar: '#35e0d0', weight: '700' },
    welcome: { bg: ['#ffb347', '#ff4f8b', '#5b2a86'], fg: '#ffffff', font: FONT, weight: '800', shadow: 'rgba(40,0,40,0.55)' },
    brand: { bg: ['#d93a33', '#a8231f'], fg: '#ffffff', font: FONT, weight: '800', italic: true },
    park: { bg: ['#2c4a31', '#36583b'], fg: '#f1e8cf', font: SERIF, border: '#e9dcb8', weight: '700' },
    monolith: { bg: ['#1d2126', '#2b3037'], fg: '#dfe5ea', font: FONT, weight: '600', spacing: 0.22 },
    neon: { bg: ['#0b0d18', '#141729'], fg: '#ff5c95', font: FONT, weight: '700', glow: '#ff2d78', outline: '#48f0e0' },
  };

  function fitFont(ctx, text, family, weight, italic, maxWidth, maxSize) {
    let size = maxSize;
    for (let i = 0; i < 20; i++) {
      ctx.font = (italic ? 'italic ' : '') + weight + ' ' + size + 'px ' + family;
      if (ctx.measureText(text).width <= maxWidth) break;
      size *= 0.92;
    }
    return size;
  }

  function paint(spec, anisotropy) {
    const style = STYLES[spec.style] || STYLES.info;
    const ppm = 120;
    let W = Math.round(spec.w * ppm);
    let H = Math.round(spec.h * ppm);
    const scale = Math.min(1, 1024 / W, 512 / H);
    W = Math.max(64, Math.round(W * scale));
    H = Math.max(32, Math.round(H * scale));
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');

    // Background.
    const grad = g.createLinearGradient(0, 0, spec.style === 'welcome' ? W : 0, spec.style === 'welcome' ? 0 : H);
    style.bg.forEach((c, i) => grad.addColorStop(style.bg.length === 1 ? 0 : i / (style.bg.length - 1), c));
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    const pad = Math.round(Math.min(W, H) * 0.08);
    if (style.border) {
      g.strokeStyle = style.border;
      g.lineWidth = Math.max(2, H * 0.03);
      g.strokeRect(pad * 0.5, pad * 0.5, W - pad, H - pad);
    }
    if (style.bar) {
      g.fillStyle = style.bar;
      g.fillRect(0, 0, W, Math.max(4, H * 0.06));
    }
    if (spec.style === 'welcome') {
      // A sun setting into the sea behind the lettering.
      g.fillStyle = 'rgba(255, 236, 170, 0.55)';
      g.beginPath();
      g.arc(W * 0.5, H * 0.95, H * 0.62, Math.PI, 0);
      g.fill();
      g.fillStyle = 'rgba(40, 10, 60, 0.35)';
      for (let i = 0; i < 5; i++) g.fillRect(0, H * (0.78 + i * 0.045), W, H * 0.018);
    }

    // Text.
    const lines = spec.lines;
    const head = lines[0];
    const rest = lines.slice(1);
    const textW = W - pad * 2.4;
    const headShare = rest.length ? 0.5 : 0.72;
    const headSize = fitFont(g, head, style.font, style.weight, style.italic, textW, H * headShare);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const drawText = (text, size, y, weight) => {
      g.font = (style.italic ? 'italic ' : '') + weight + ' ' + size + 'px ' + style.font;
      if (style.spacing && 'letterSpacing' in g) g.letterSpacing = Math.round(size * style.spacing) + 'px';
      if (style.glow) {
        g.shadowColor = style.glow;
        g.shadowBlur = size * 0.35;
      } else if (style.shadow) {
        g.shadowColor = style.shadow;
        g.shadowBlur = size * 0.12;
        g.shadowOffsetY = size * 0.06;
      }
      if (style.outline) {
        g.strokeStyle = style.outline;
        g.lineWidth = Math.max(1.5, size * 0.05);
        g.strokeText(text, W / 2, y);
      }
      g.fillStyle = style.fg;
      g.fillText(text, W / 2, y);
      g.shadowBlur = 0;
      g.shadowOffsetY = 0;
    };

    if (spec.style === 'welcome' && rest.length === 0 && lines.length === 1) {
      drawText(head, headSize, H / 2, style.weight);
    } else if (spec.style === 'welcome') {
      // "WELCOME TO" small above a huge "VICEHAVEN".
      const small = fitFont(g, head, style.font, '600', false, textW * 0.6, H * 0.2);
      drawText(head, small, H * 0.24, '600');
      const big = fitFont(g, rest[0], style.font, style.weight, false, textW, H * 0.55);
      drawText(rest[0], big, H * 0.6, style.weight);
    } else {
      const restSize = rest.length ? Math.min(headSize * 0.52, (H * (1 - headShare) - pad) / rest.length) : 0;
      const block = headSize + rest.length * restSize * 1.25;
      let y = (H - block) / 2 + headSize / 2 + (style.bar ? H * 0.03 : 0);
      drawText(head, headSize, y, style.weight);
      y += headSize / 2 + restSize * 0.8;
      for (const line of rest) {
        const s = fitFont(g, line, style.font, '500', style.italic, textW, restSize);
        drawText(line, s, y, '500');
        y += restSize * 1.25;
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy || 4;
    tex.needsUpdate = true;
    return tex;
  }

  VH.Signs = { paint, STYLES };
})();
