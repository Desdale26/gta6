// bundle.mjs — flattens the whole game into one self-contained HTML file.
//
// The project has no build step: it runs from source as ES modules with an
// import map. That is the right way to work on it, and the wrong way to hand
// somebody a copy — a single file you can double-click has no server, no CORS
// and no missing vendor directory.
//
// This walks the module graph from the entry script, rewrites each module into
// a small registry function, inlines the stylesheet, and writes one HTML file.
// There is no minifier and no transpiler: the output is the same source, in a
// different envelope.
//
//   node tools/bundle.mjs [out.html]
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] || join(ROOT, 'vice-coast.html'));

// --- import map ------------------------------------------------------------
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const mapMatch = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
const imports = mapMatch ? JSON.parse(mapMatch[1]).imports : {};

/** Resolves a specifier the way the browser's import map would. */
function resolveSpec(spec, fromFile) {
  if (spec.startsWith('.') || spec.startsWith('/')) return resolve(dirname(fromFile), spec);
  if (imports[spec]) return resolve(ROOT, imports[spec]);
  for (const prefix of Object.keys(imports)) {
    if (prefix.endsWith('/') && spec.startsWith(prefix)) {
      return resolve(ROOT, imports[prefix] + spec.slice(prefix.length));
    }
  }
  throw new Error(`cannot resolve "${spec}" from ${relative(ROOT, fromFile)}`);
}

// --- module parsing --------------------------------------------------------
// Every file in this project (and in three's distribution) puts its import and
// export statements at column zero, so a line-oriented scanner is enough and
// avoids dragging in a parser for a build that is meant to stay dependency-free.
const RE_FROM = /from\s+['"]([^'"]+)['"]/;

function transform(src, file) {
  const lines = src.split('\n');
  const out = [];
  const deps = [];
  const named = new Map();        // local name -> exported name
  let defaultExpr = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ---- imports ----
    if (/^import[\s{*'"]/.test(line)) {
      let stmt = line;
      while (!RE_FROM.test(stmt) && !/^import\s+['"]/.test(stmt) && i + 1 < lines.length) {
        stmt += '\n' + lines[++i];
      }
      const m = stmt.match(RE_FROM);
      if (!m) {                                  // bare side-effect import
        const bare = stmt.match(/^import\s+['"]([^'"]+)['"]/);
        if (bare) { deps.push(bare[1]); out.push(`__req(${JSON.stringify(bare[1])});`); }
        continue;
      }
      const spec = m[1];
      deps.push(spec);
      const clause = stmt.slice(stmt.indexOf('import') + 6, stmt.lastIndexOf('from')).trim();
      const req = `__req(${JSON.stringify(spec)})`;
      const parts = [];
      const ns = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (ns) {
        parts.push(`const ${ns[1]} = ${req};`);
      } else {
        // default, then a braced list, in either combination
        const braceAt = clause.indexOf('{');
        const head = (braceAt >= 0 ? clause.slice(0, braceAt) : clause).replace(/,\s*$/, '').trim();
        if (head) parts.push(`const ${head} = ${req}.default;`);
        if (braceAt >= 0) {
          const body = clause.slice(braceAt + 1, clause.lastIndexOf('}'));
          const pairs = body.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
            const as = s.split(/\s+as\s+/);
            return as.length === 2 ? `${as[0].trim()}: ${as[1].trim()}` : s;
          });
          if (pairs.length) parts.push(`const { ${pairs.join(', ')} } = ${req};`);
        }
      }
      out.push(parts.join(' '));
      continue;
    }

    // ---- exports ----
    if (/^export\s/.test(line)) {
      // export { a, b as c };  /  export { a } from './x.js';
      // three's addons spread these over many lines, so gather the whole list.
      let exportStmt = line;
      if (/^export\s*\{/.test(line) && !line.includes('}')) {
        while (i + 1 < lines.length && !exportStmt.includes('}')) exportStmt += '\n' + lines[++i];
        // The `from '...'` can sit on the closing line or the next one.
        if (!/\}\s*(?:;|$)/.test(exportStmt.trimEnd()) && i + 1 < lines.length
            && /^\s*from\s+['"]/.test(lines[i + 1])) exportStmt += '\n' + lines[++i];
      }
      const listed = exportStmt.replace(/\n/g, ' ').match(/^export\s*\{([^}]*)\}\s*(?:from\s+['"]([^'"]+)['"])?\s*;?\s*$/);
      if (listed) {
        const from = listed[2];
        if (from) {
          deps.push(from);
          const req = `__req(${JSON.stringify(from)})`;
          for (const raw of listed[1].split(',').map((s) => s.trim()).filter(Boolean)) {
            const as = raw.split(/\s+as\s+/).map((s) => s.trim());
            const local = as[0], exported = as[1] || as[0];
            out.push(`__exp[${JSON.stringify(exported)}] = ${req}[${JSON.stringify(local)}];`);
          }
        } else {
          for (const raw of listed[1].split(',').map((s) => s.trim()).filter(Boolean)) {
            const as = raw.split(/\s+as\s+/).map((s) => s.trim());
            named.set(as[0], as[1] || as[0]);
          }
        }
        continue;
      }
      // export * from './x.js';
      const star = line.match(/^export\s*\*\s*from\s+['"]([^'"]+)['"]\s*;?\s*$/);
      if (star) {
        deps.push(star[1]);
        out.push(`Object.assign(__exp, __req(${JSON.stringify(star[1])}));`);
        continue;
      }
      // export default ...
      const def = line.match(/^export\s+default\s+(.*)$/);
      if (def) {
        const rest = def[1];
        const namedDefault = rest.match(/^(class|function|async function)\s+([A-Za-z_$][\w$]*)/);
        if (namedDefault) {
          out.push(line.replace(/^export\s+default\s+/, ''));
          defaultExpr = namedDefault[2];
        } else {
          out.push(`__exp.default = ${rest}`);
        }
        continue;
      }
      // export const/let/var/function/class/async function
      const decl = line.match(/^export\s+(const|let|var|function\*?|class|async\s+function\*?)\s+([A-Za-z_$][\w$]*)/);
      if (decl) {
        named.set(decl[2], decl[2]);
        // `export const a = 1, b = 2;` also declares b.
        if (decl[1] === 'const' || decl[1] === 'let' || decl[1] === 'var') {
          const after = line.slice(line.indexOf(decl[2]) + decl[2].length);
          for (const extra of after.matchAll(/,\s*([A-Za-z_$][\w$]*)\s*=/g)) named.set(extra[1], extra[1]);
        }
        out.push(line.replace(/^export\s+/, ''));
        continue;
      }
    }
    out.push(line);
  }

  const bindings = [...named.entries()].map(([local, exported]) =>
    `  ${JSON.stringify(exported)}: { get: () => ${local}, enumerable: true },`).join('\n');
  const tail = [];
  if (bindings) tail.push(`Object.defineProperties(__exp, {\n${bindings}\n});`);
  if (defaultExpr) tail.push(`__exp.default = ${defaultExpr};`);
  return { code: out.join('\n') + (tail.length ? '\n' + tail.join('\n') : ''), deps };
}

// --- walk ------------------------------------------------------------------
const modules = new Map();        // id -> { code, deps: Map(spec -> id) }
const idOf = (file) => relative(ROOT, file).split('\\').join('/');

function load(file) {
  const id = idOf(file);
  if (modules.has(id)) return id;
  modules.set(id, null);                       // placeholder, breaks cycles
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { throw new Error(`missing module ${id}`); }
  const { code, deps } = transform(src, file);
  const map = {};
  for (const spec of new Set(deps)) map[spec] = load(resolveSpec(spec, file));
  modules.set(id, { code, deps: map });
  return id;
}

const entry = load(resolve(ROOT, 'src/main.js'));

// --- cycle report ----------------------------------------------------------
// Named imports are captured when a module body runs, so a cycle would hand one
// side an undefined binding. Nothing in this project has one; say so loudly if
// that ever changes.
const cycles = [];
(function findCycles() {
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { cycles.push([...stack.slice(stack.indexOf(id)), id].join(' -> ')); return; }
    state.set(id, 1); stack.push(id);
    for (const dep of Object.values(modules.get(id).deps)) visit(dep);
    stack.pop(); state.set(id, 2);
  };
  visit(entry);
})();

// --- emit ------------------------------------------------------------------
const css = readFileSync(join(ROOT, 'styles/game.css'), 'utf8');

let bundle = `// Vice Coast: Leonida — single-file build, generated by tools/bundle.mjs.
const __mods = {};
const __cache = {};
function __define(id, deps, fn) { __mods[id] = { deps, fn }; }
function __load(id) {
  if (__cache[id]) return __cache[id];
  const mod = __mods[id];
  if (!mod) throw new Error('module not bundled: ' + id);
  const exp = __cache[id] = {};
  mod.fn(exp, (spec) => __load(mod.deps[spec] || spec));
  return exp;
}
`;
for (const [id, m] of modules) {
  bundle += `\n__define(${JSON.stringify(id)}, ${JSON.stringify(m.deps)}, function (__exp, __req) {\n${m.code}\n});\n`;
}
bundle += `\n__load(${JSON.stringify(entry)});\n`;

// Replacements go through functions, never replacement strings: the bundle
// contains things like `+ '$'` (three's own source does), and in a replacement
// string `$'` means "everything after the match", which silently eats the file.
const sub = (text, re, value) => text.replace(re, () => value);

// Every substitution below MUST match. A regex that quietly matches nothing is
// how this tool shipped a build with no stylesheet in it: the pattern required a
// "./" prefix and the tag is written href="styles/game.css", so the <link>
// survived, `.hidden{display:none}` never loaded, and every overlay in the game
// stayed on screen forever. Silence is the failure mode, so it is now an error.
const subOnce = (text, re, value, what) => {
  const hits = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
  if (!hits || hits.length !== 1) {
    throw new Error(`bundle: expected exactly one ${what} in index.html, found ${hits ? hits.length : 0}`);
  }
  return sub(text, re, value);
};

let outHtml = html;
outHtml = subOnce(outHtml, /<script type="importmap">[\s\S]*?<\/script>\s*/, '', 'import map');
outHtml = subOnce(outHtml, /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/i,
  `<style>\n${css}\n</style>`, 'stylesheet link');
outHtml = subOnce(outHtml, /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/i,
  `<script type="module">\n${bundle}\n</script>`, 'entry module script');

// Anything still pointing at a file on disk breaks a standalone copy. Absolute
// URLs are fine (nothing here uses them, but a favicon or font would be); any
// remaining relative src/href is not, with or without a leading "./".
const leftovers = [...outHtml.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((m) => m[1])
  .filter((u) => !/^(?:[a-z]+:|\/\/|#|data:)/i.test(u));

// The stylesheet is the one asset whose absence is invisible at runtime: no
// console error, no failed request once inlined, just a game whose UI never
// hides. Prove it actually landed.
const cssLanded = outHtml.includes('.hidden{display:none !important}');

writeFileSync(OUT, outHtml);
const kb = (statSync(OUT).size / 1024).toFixed(0);
console.log(`bundled ${modules.size} modules into ${relative(ROOT, OUT)} (${kb} KB)`);
if (cycles.length) { console.log(`WARNING: ${cycles.length} import cycle(s):`); cycles.slice(0, 5).forEach((c) => console.log('  ' + c)); }

const fatal = [];
if (leftovers.length) fatal.push(`still references files on disk: ${[...new Set(leftovers)].join(', ')}`);
if (!cssLanded) fatal.push('stylesheet did not make it into the bundle');
if (fatal.length) {
  for (const f of fatal) console.error('ERROR: ' + f);
  process.exit(1);
}
console.log('stylesheet inlined, no external references');
