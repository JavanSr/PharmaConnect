# design-sync run notes

## Build command (full)

```powershell
node .ds-sync/package-build.mjs `
  --config .design-sync/config.json `
  --node-modules website/node_modules `
  --entry website/src/ds-entry.ts `
  --out ./ds-bundle
```

## After every build — run the CSS post-processor

`check_design_system` flags Tailwind's `--tw-*` internals (initialised
under `*,:after,:before` selectors) as unclassified / wrong-scope tokens.
The post-build script fixes this without touching source files:

```powershell
node .design-sync/post-build-css.mjs --out ./ds-bundle
```

Then re-run capture for any component whose preview changed:

```powershell
node .ds-sync/package-capture.mjs --out ./ds-bundle --components <Name> --force
```

## Nav component

Nav uses `usePathname()` from `next/navigation` which crashes Playwright
headless in standalone context. Nav falls back to its floor card — no
authored preview. Do not create `.design-sync/previews/Nav.tsx`.

## Logo SVG marks

SVG marks are inlined as base64 data URIs in `.design-sync/previews/Logo.tsx`.
This is intentional — `ds-bundle/assets/` is cleared on every rebuild and
`next/image` does not load from the preview server in the IIFE context.

## planId (incremental upload channel)

`plan_07cbd3110b994c3b_876159d312bc` — covers all uploads to project
`07cbd311-0b99-4c3b-98f7-50993fdecbe2` (APOTEKH Design System).
Lost mid-session → call `DesignSync(finalize_plan)` to get a fresh one.
