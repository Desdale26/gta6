// deviceProbe.js — decide what this machine can do before asking it to do it.
//
// The game used to start every player on the same preset and let the adaptive
// system find its way down. That is the wrong way round. The first thirty
// seconds is when someone decides whether a game is broken, and it is also
// exactly the window the adaptive system needs to work out that it is drowning —
// so the player's first impression was reliably the worst the game would ever
// look and feel. Guessing right at boot is worth more than adapting well.
//
// Everything here is free: strings and numbers the browser already knows. No
// timed render, because a timed render on a cold GPU with nothing compiled
// measures compilation, not capability.

/** What we can find out about the machine, in plain terms. */
export function probeDevice(gl) {
  const out = {
    renderer: '', vendor: '', webgl2: false, software: false,
    cores: 0, memoryGB: 0, maxTexture: 0, pixels: 0, mobile: false, tier: 'unknown',
  };
  try {
    const ctx = gl && gl.getContext ? gl.getContext() : null;
    if (ctx) {
      out.webgl2 = typeof WebGL2RenderingContext !== 'undefined' && ctx instanceof WebGL2RenderingContext;
      const ext = ctx.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        out.renderer = String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
        out.vendor = String(ctx.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '');
      }
      out.maxTexture = ctx.getParameter(ctx.MAX_TEXTURE_SIZE) || 0;
    }
  } catch (e) { /* a locked-down browser tells you nothing, which is itself a hint */ }

  out.cores = navigator.hardwareConcurrency || 0;
  out.memoryGB = navigator.deviceMemory || 0;
  const dpr = window.devicePixelRatio || 1;
  out.pixels = (window.innerWidth || 1280) * (window.innerHeight || 720) * dpr * dpr;
  out.mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

  const r = (out.renderer + ' ' + out.vendor).toLowerCase();
  // A software rasteriser will never hold 60 at any setting worth having, so it
  // is worth naming rather than discovering.
  out.software = /swiftshader|llvmpipe|software|basic render|microsoft basic/.test(r);

  if (out.software) out.tier = 'software';
  else if (!r) {
    // No renderer string at all — privacy mode, or an old browser. Judge by the
    // things that are still readable and lean cautious.
    out.tier = out.mobile ? 'weak' : (out.cores >= 8 && out.memoryGB >= 8 ? 'mid' : 'low');
  } else if (/rtx|radeon rx (6|7|9)|rx 6[5-9]|rx 7|arc a7|m[1-4] (max|ultra)|geforce (gtx 16|rtx)/.test(r)) {
    out.tier = 'strong';
  } else if (/geforce|quadro|radeon (pro|r9|rx)|apple m[1-4]|arc a/.test(r)) {
    out.tier = 'mid';
  } else if (/mali|adreno|powervr|apple gpu|videocore/.test(r)) {
    out.tier = 'weak';       // a phone or a tablet
  } else if (/intel.*(hd|uhd) graphics|intel.*gma|iris (plus|graphics 5|graphics 6)/.test(r)) {
    out.tier = 'low';        // integrated, several generations back
  } else if (/intel|iris|vega|apple/.test(r)) {
    out.tier = 'mid-low';    // integrated, but recent enough
  } else {
    out.tier = out.cores >= 8 ? 'mid' : 'low';
  }
  return out;
}

/**
 * Which preset to open on.
 *
 * Deliberately one notch below what the machine could probably manage: the
 * adaptive governor will climb if there is room, and a game that starts smooth
 * and gets prettier reads far better than one that starts beautiful and
 * stutters. A big display costs the same as a slower GPU, so it pulls the
 * starting point down too.
 */
export function presetForDevice(p) {
  let start;
  switch (p.tier) {
    case 'strong': start = 'high'; break;
    case 'mid': start = 'medium'; break;
    case 'mid-low': start = 'medium'; break;
    case 'low': start = 'low'; break;
    case 'weak': start = 'low'; break;
    case 'software': start = 'potato'; break;
    default: start = 'medium';
  }
  const order = ['potato', 'low', 'medium', 'high', 'ultra'];
  let at = order.indexOf(start);
  // Four megapixels is a 4K-ish panel or a large hidpi laptop; eight is a real
  // 4K at full density. Both cost more than the GPU tier alone suggests.
  if (p.pixels > 8_000_000) at -= 2;
  else if (p.pixels > 4_000_000) at -= 1;
  if (p.cores && p.cores <= 4) at -= 1;
  if (p.memoryGB && p.memoryGB <= 4) at -= 1;
  if (p.mobile) at -= 1;
  return order[Math.max(0, Math.min(order.length - 1, at))];
}

/** One line, for the log and for the settings screen. */
export function describeDevice(p) {
  const bits = [p.renderer || 'unknown GPU'];
  if (p.cores) bits.push(`${p.cores} cores`);
  if (p.memoryGB) bits.push(`${p.memoryGB} GB`);
  bits.push(`${(p.pixels / 1e6).toFixed(1)} Mpx`);
  bits.push(p.tier);
  return bits.join(' · ');
}
