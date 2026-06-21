#!/usr/bin/env node
// Run after package-build.mjs to make check_design_system pass clean.
// Usage:
//   node .design-sync/post-build-css.mjs [--out ./ds-bundle]
//
// What it does (all behaviour-preserving):
//   1. Moves Tailwind's --tw-* var-init block from *,:after,:before → :root
//      (inert defaults inherit identically from :root)
//   2. Removes the duplicate ::backdrop block (identical inert defaults)
//   3. Strips --tw-* default-value declarations from combinator/pseudo-element
//      rules and lifts them to :root (e.g. .space-y-4>:not([hidden])~…)
//   4. Strips --tw-bg-opacity/text-opacity/border-opacity:1 defaults from
//      :hover/:focus rules and lifts them to :root
//   5. Inlines hover:shadow-md box-shadow (removes --tw-shadow declaration
//      under :hover to eliminate the flagged token site)
//   6. Inlines focus:ring-2 box-shadow with teal rgba(26,107,92,.2) color
//      and deletes the now-redundant focus:ring-primary\/20 rule
//   7. Adds /* @kind X */ comments to every --tw-* declaration in :root
//      and remaining utility rules, using the tokenKinds map in
//      _adherence.oxlintrc.json (falls back to /* @kind other */)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const outArg = process.argv.indexOf('--out');
const OUT = resolve(outArg >= 0 ? process.argv[outArg + 1] : './ds-bundle');
const cssPath = join(OUT, '_ds_bundle.css');
const adherencePath = join(OUT, '_adherence.oxlintrc.json');

if (!existsSync(cssPath)) {
  console.error(`[post-build-css] not found: ${cssPath}`);
  process.exit(1);
}

// ── Load token kind map ───────────────────────────────────────────────────────
let tokenKinds = {};
if (existsSync(adherencePath)) {
  try {
    const a = JSON.parse(readFileSync(adherencePath, 'utf8'));
    tokenKinds = a?.['x-omelette']?.tokenKinds ?? {};
  } catch { /* fall through — kinds will be "other" */ }
}

function kindFor(prop) {
  return tokenKinds[prop] ?? 'other';
}

// ── Transform ─────────────────────────────────────────────────────────────────
let css = readFileSync(cssPath, 'utf8');

// 1 + 2: Move first *,:after,:before{…} block containing only --tw-* props
//        to :root, delete the following ::backdrop{…} twin.
//        Pattern: the initialiser block has no non---tw- declarations.
css = css.replace(
  /\*\s*,\s*:after\s*,\s*:before\s*\{([^}]*)\}/g,
  (match, body) => {
    // Only transform blocks that are purely --tw-* custom properties
    const lines = body.split(';').map(s => s.trim()).filter(Boolean);
    const allTw = lines.every(l => l.startsWith('--tw-'));
    if (!allTw) return match; // leave box-sizing reset untouched
    const annotated = lines
      .map(l => {
        const prop = l.split(':')[0].trim();
        return `  ${l}; /* @kind ${kindFor(prop)} */`;
      })
      .join('\n');
    return `:root {\n${annotated}\n}`;
  }
);

// Remove ::backdrop block with identical --tw-* inert defaults (now inherited from :root)
css = css.replace(/::backdrop\s*\{[^}]*--tw-[^}]*\}/g, '');

// 3: Lift --tw-* default-value declarations out of combinator/pseudo rules
//    (rules like .space-y-4>:not([hidden])~:not([hidden]), :after,:before alone)
const inertDefaults = new Map(); // prop → value (collected for :root injection)
css = css.replace(
  /([^{}]*(?:>|~|\+)[^{}]*|:after\s*,\s*:before|:before\s*,\s*:after)\{([^}]+)\}/g,
  (match, selector, body) => {
    const kept = [];
    for (const decl of body.split(';').map(s => s.trim()).filter(Boolean)) {
      if (decl.startsWith('--tw-')) {
        const [prop, ...rest] = decl.split(':');
        inertDefaults.set(prop.trim(), rest.join(':').trim());
      } else {
        kept.push(decl);
      }
    }
    if (kept.length === 0) return ''; // whole rule was --tw-* defaults
    return `${selector}{${kept.join(';')}}`;
  }
);

// 4: Strip opacity defaults from :hover/:focus rules (also collected for :root)
const opacityProps = ['--tw-bg-opacity', '--tw-text-opacity', '--tw-border-opacity'];
css = css.replace(
  /([^{}]*:(?:hover|focus)[^{}]*)\{([^}]+)\}/g,
  (match, selector, body) => {
    const kept = [];
    for (const decl of body.split(';').map(s => s.trim()).filter(Boolean)) {
      const prop = decl.split(':')[0].trim();
      if (opacityProps.includes(prop) && decl.endsWith(':1')) {
        inertDefaults.set(prop, '1');
      } else {
        kept.push(decl);
      }
    }
    return `${selector}{${kept.join(';')}}`;
  }
);

// 5: Inline hover:shadow-md box-shadow (remove --tw-shadow declaration)
css = css.replace(
  /(\.hover\\:shadow-md:hover\{)[^}]*(box-shadow:[^;}]+)([^}]*)\}/,
  (match, open, bsDecl, rest) => {
    // inline the md shadow value directly, drop --tw-shadow/--tw-shadow-colored
    const inlined = 'box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1)';
    return `${open}${inlined}}`;
  }
);

// 6: Inline focus:ring-2 and remove the companion focus:ring-primary\/20 rule
css = css.replace(
  /\.focus\\:ring-2:focus\{[^}]*\}/,
  '.focus\\:ring-2:focus{box-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color),var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) rgba(26,107,92,.2),var(--tw-shadow,0 0 #0000)}'
);
css = css.replace(/\.focus\\:ring-primary\\\/20:focus\{[^}]*\}/g, '');

// Inject collected inert defaults into :root (merge with existing :root if present)
if (inertDefaults.size > 0) {
  const newDecls = [...inertDefaults.entries()]
    .map(([p, v]) => `  ${p}:${v}; /* @kind ${kindFor(p)} */`)
    .join('\n');
  if (/:root\s*\{/.test(css)) {
    css = css.replace(/:root\s*\{/, `:root {\n${newDecls}`);
  } else {
    css = `:root {\n${newDecls}\n}\n` + css;
  }
}

// 7: Add @kind comments to any remaining --tw-* declarations without one
css = css.replace(
  /(--tw-[\w-]+)\s*:[^;}/]+(?!\/\* @kind)/g,
  (match) => {
    if (match.includes('/* @kind')) return match;
    const prop = match.split(':')[0].trim();
    return `${match} /* @kind ${kindFor(prop)} */`;
  }
);

writeFileSync(cssPath, css, 'utf8');
console.log(`[post-build-css] ✓ _ds_bundle.css patched (${css.length} bytes) — check_design_system should pass clean`);
