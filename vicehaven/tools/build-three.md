# Rebuilding `js/lib/three.min.js`

You only need this to **upgrade three.js**. Playing the game needs nothing
but Edge.

## Why the game ships its own copy

Since r160, three.js is published only as ES modules. Edge (like every
Chromium browser) refuses to load ES module files from a `file://` page, so a
game built on `import` statements can't be started by double-clicking
`index.html`. Vicehaven's files are classic scripts instead, and three.js is
bundled once into a classic script that defines the global `THREE`.

If `js/lib/three.min.js` is ever missing, `main.js` falls back to importing
three.js r186 from the jsDelivr CDN (which needs an internet connection), and
shows a clear error if that fails too.

## Rebuild (needs Node.js 18+, once)

```bash
mkdir three-build && cd three-build
npm init -y
npm install three@0.186.0 esbuild
echo "export * from 'three';" > entry.js
npx esbuild entry.js --bundle --format=iife --global-name=THREE \
  --minify --legal-comments=none --target=es2020 --outfile=three.min.js
```

Then put the licence header back on top and copy it into the game:

```bash
{ printf '/**\n * three.js r186 — https://threejs.org\n * Copyright 2010-2026 Three.js Authors\n * SPDX-License-Identifier: MIT\n */\n'; cat three.min.js; } \
  > ../vicehaven/js/lib/three.min.js
```

If you change the version, also update `CDN_THREE` in `js/main.js` so the
fallback matches, and run `node vicehaven/tools/smoke.mjs` to check nothing
in the renderer changed underneath the game.
