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

## Grade file format (CRITICAL)

Grade files in `.design-sync/.cache/review/<Name>.grade.json` MUST use:
```json
{"cells": {"CellName": {"verdict": "good", "note": "..."}}}
```
NOT the flat format `{"CellName": "pass"}` — that is NOT recognized; the
component will re-capture every sync. Check `Badge.grade.json` as the reference
for a correctly-carried-forward grade.

## Remote anchor (`remote-sync.json`)

When saving the anchor from `DesignSync(get_file "_ds_sync.json")` to
`.design-sync/.cache/remote-sync.json`, save the COMPLETE JSON verbatim —
including the `sourceHashes` field. A truncated save (missing `sourceHashes`)
causes the re-sync driver to treat the anchor as malformed and run full-scope
(all 15 components) instead of a fast diff. The anchor is idempotent, so a
full-scope run is harmless — but slow.

## planId (incremental upload channel)

planId changes every re-sync session. The latest is
`plan_07cbd3110b994c3b_3e86c7737478`.
Lost mid-session → call `DesignSync(finalize_plan)` to get a fresh one.
