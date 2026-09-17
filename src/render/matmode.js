// matmode.js — how every lit surface in the game is shaded.
//
// A leaf module on purpose: it imports three and nothing else, so every file that
// builds a material can import it without any risk of the import cycles the
// single-file bundler treats as fatal.
//
// WHY THIS EXISTS
//
// Measured on the shipped build at 'potato', already the cheapest preset: a frame
// carried 353 draw calls, 547k triangles, 111 textures and 594 materials — and
// every one of those 594 ran a full per-fragment PBR lighting loop over fourteen
// lights plus an image-based lighting sample. CPU update time was 2.8 ms, so the
// frame was never CPU-bound. It was bound on shading. Dropping pedestrians, cars
// and draw distance — everything the presets already did — could not touch that,
// which is why 'potato' was not meaningfully faster than 'low'.
//
// So the minimal mode attacks the shading instead. Standard and Physical become
// Lambert: a GGX specular lobe per light (a distribution term, a correlated Smith
// visibility term and a Fresnel term, three.module.js's BRDF_GGX) collapses to a
// clamped dot product, and the IBL sample goes away entirely.
//
// THE RULE THAT MAKES IT SAFE
//
// A material's type is fixed when it is constructed. Switching the whole city
// between Lambert and Standard mid-play would mean rebuilding and recompiling
// every material in it — a far worse stall than anything the adaptive governor is
// trying to avoid. So the mode is latched once, before the first material is
// built, and never written again; Settings.ladder keeps a minimal session inside
// the presets that assume it.
import * as THREE from 'three';

let MINIMAL = false;
let latched = false;

/**
 * Decide how this session shades. Call once, before anything builds a material.
 * Later calls are ignored rather than obeyed, because obeying one would leave the
 * scene holding a mixture of types that no preset describes.
 */
export function setShadingMode(mode) {
  if (latched) return MINIMAL;
  MINIMAL = mode === 'minimal';
  latched = true;
  return MINIMAL;
}

export function isMinimal() { return MINIMAL; }

// Only what decides how a surface reads survives the trip. The PBR-only keys are
// dropped rather than passed through: Lambert ignores some and warns about
// others, and dropping normalMap and roughnessMap is itself worth 37 of the
// texture library's 66 MiB.
const KEEP = ['name', 'color', 'map', 'emissive', 'emissiveMap', 'emissiveIntensity',
  'transparent', 'opacity', 'side', 'alphaTest', 'alphaMap', 'depthWrite', 'depthTest',
  'toneMapped', 'vertexColors', 'flatShading', 'fog', 'wireframe', 'visible', 'blending',
  'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'premultipliedAlpha'];

export function lambertOpts(o) {
  const out = {};
  for (const k of KEEP) if (o[k] !== undefined) out[k] = o[k];
  // A surface that was mostly specular in PBR — chrome, a rim, a headlight lens —
  // has nothing left to say once the specular is gone and would read as flat grey.
  // Give it back a little of its own colour as emissive so it still catches the
  // eye, which is the only job it had.
  if (o.metalness > 0.7 && out.color !== undefined && o.emissive === undefined) {
    out.emissive = out.color;
    out.emissiveIntensity = 0.22;
  }
  return out;
}

/** A lit surface. Standard normally; Lambert in minimal. */
export function stdMat(opts = {}) {
  return MINIMAL ? new THREE.MeshLambertMaterial(lambertOpts(opts))
    : new THREE.MeshStandardMaterial(opts);
}

/** A lit surface that wanted clearcoat, transmission or an ior. Lambert in minimal. */
export function physMat(opts = {}) {
  return MINIMAL ? new THREE.MeshLambertMaterial(lambertOpts(opts))
    : new THREE.MeshPhysicalMaterial(opts);
}
