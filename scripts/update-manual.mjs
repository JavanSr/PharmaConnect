#!/usr/bin/env node
/**
 * update-manual.mjs
 *
 * Patches docs/user-manual.md:
 *   1. Updates the "Generated" date at the top (or adds one if missing)
 *   2. Verifies all screenshot references in the manual exist in docs/screenshots/
 *   3. Outputs a summary of which screenshots are present vs missing
 *
 * This script does NOT rewrite the manual — it only touches the date header
 * and reports missing screenshots. It won't break anything if screenshots
 * are missing (they may still be placeholders).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const manualPath = path.join(rootDir, 'docs', 'user-manual.md');
const screenshotsDir = path.join(rootDir, 'docs', 'screenshots');

async function main() {
  console.log('📄 Updating user manual...');

  let content = await fs.readFile(manualPath, 'utf-8');

  // Format today's date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Update or insert "Last updated" line after the first H1
  const updatedLine = `_Last updated: ${dateStr}_`;
  const lastUpdatedRe = /^_Last updated:.*_$/m;

  if (lastUpdatedRe.test(content)) {
    content = content.replace(lastUpdatedRe, updatedLine);
    console.log(`  ✓ Date updated to ${dateStr}`);
  } else {
    // Insert after first H1
    content = content.replace(/^(# .+)$/m, `$1\n\n${updatedLine}`);
    console.log(`  ✓ Date inserted: ${dateStr}`);
  }

  await fs.writeFile(manualPath, content, 'utf-8');

  // Check screenshot references
  const imgRe = /!\[.*?\]\(\.\.\/screenshots\/([\w.-]+\.png)\)/g;
  const altRe = /!\[.*?\]\(screenshots\/([\w.-]+\.png)\)/g;
  const referenced = new Set();

  for (const match of content.matchAll(imgRe)) referenced.add(match[1]);
  for (const match of content.matchAll(altRe)) referenced.add(match[1]);

  // Check which screenshots exist
  let existing;
  try {
    const files = await fs.readdir(screenshotsDir);
    existing = new Set(files.filter(f => f.endsWith('.png')));
  } catch {
    existing = new Set();
  }

  const present = [...referenced].filter(f => existing.has(f));
  const missing = [...referenced].filter(f => !existing.has(f));
  const extra = [...existing].filter(f => !referenced.has(f));

  console.log(`\n  Screenshots referenced in manual: ${referenced.size}`);
  console.log(`  Present:   ${present.length}`);
  if (missing.length > 0) {
    console.log(`  Missing:   ${missing.length}`);
    for (const f of missing) console.log(`    - ${f}`);
  }
  if (extra.length > 0) {
    console.log(`  Extra (not in manual): ${extra.length}`);
    for (const f of extra) console.log(`    + ${f}`);
  }

  console.log('\n✅ Manual update complete.');
}

main().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
