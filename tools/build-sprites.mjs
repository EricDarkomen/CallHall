#!/usr/bin/env node
'use strict';
/* Rebuilds art/sprites/manifest.js and art/CREDITS.md from two kinds of
   input: PINNED sheets (art/sprites/*.png this tool cannot rebuild — see
   tools/lib/pinned.mjs) and MANAGED sheets (declared in tools/sheets/*.mjs,
   fetched fresh from a pinned upstream commit and packed every run, licence
   re-checked every run).

     node tools/build-sprites.mjs            rebuild every managed sheet, write everything
     node tools/build-sprites.mjs town        rebuild just the "town" sheet
     node tools/build-sprites.mjs --check     build in memory, fail if committed output is stale

   Adding a sheet means adding a file to tools/sheets/ and this file's MANAGED
   list — nothing else here needs to change. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPinnedSheets } from './lib/pinned.mjs';
import { loadCreditsSkeleton, renderCredits } from './lib/creditsText.mjs';
import { renderManifest } from './lib/manifestText.mjs';
import { buildManagedSheet } from './lib/buildSheet.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MANAGED_SHEET_MODULES = [
  './sheets/town.mjs',
];

async function loadManagedDefs() {
  return Promise.all(MANAGED_SHEET_MODULES.map(async m => (await import(m)).default));
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.find(a => !a.startsWith('--'));

  const pinnedSheets = loadPinnedSheets(root);
  const managedDefs = await loadManagedDefs();

  const manifestPath = path.join(root, 'art/sprites/manifest.js');
  const creditsPath = path.join(root, 'art/CREDITS.md');
  const committedManifestText = fs.readFileSync(manifestPath, 'utf8');
  const committedAtlas = JSON.parse(committedManifestText.match(/const SPRITE_ATLAS = (\{[\s\S]*\});/)[1]);

  if (only && !managedDefs.some(d => d.id === only) && !pinnedSheets.some(s => s.id === only)) {
    throw new Error(`no such sheet "${only}" (known: ${[...pinnedSheets.map(s => s.id), ...managedDefs.map(d => d.id)].join(', ')})`);
  }
  const toBuild = managedDefs.filter(d => !only || d.id === only);

  const built = [];
  for (const def of toBuild) {
    process.stderr.write(`building ${def.id}...\n`);
    built.push(await buildManagedSheet(def));
  }

  /* A managed sheet not asked for this run isn't dropped — it keeps whatever
     is already committed for it, same as a pinned sheet does. */
  const untouchedIds = new Set(managedDefs.map(d => d.id).filter(id => !toBuild.some(d => d.id === id)));
  const untouchedSheets = committedAtlas.sheets.filter(s => untouchedIds.has(s.id));

  const allSheets = [...pinnedSheets, ...untouchedSheets, ...built.map(b => b.sheet)];
  const manifestOut = renderManifest(allSheets);

  const skeleton = loadCreditsSkeleton(root);
  const creditsOut = renderCredits(
    skeleton,
    new Map(built.map(b => [b.sheet.id, b.sheetBullet])),
    built.flatMap(b => b.artistNames),
    built.flatMap(b => b.assetChunks),
    new Set(built.map(b => b.sheet.id)),
  );

  if (check) {
    const problems = [];
    if (manifestOut !== committedManifestText) problems.push('art/sprites/manifest.js is stale');
    const committedCredits = fs.readFileSync(creditsPath, 'utf8');
    if (creditsOut !== committedCredits) problems.push('art/CREDITS.md is stale');
    for (const b of built) {
      const p = path.join(root, b.outPath);
      const committed = fs.existsSync(p) ? fs.readFileSync(p) : null;
      if (!committed || !committed.equals(b.pngBytes)) problems.push(`${b.outPath} is stale`);
    }
    if (problems.length) {
      process.stderr.write('stale:\n' + problems.map(p => '  - ' + p).join('\n') + '\n');
      process.exitCode = 1;
      return;
    }
    process.stderr.write('up to date.\n');
    return;
  }

  fs.writeFileSync(manifestPath, manifestOut);
  fs.writeFileSync(creditsPath, creditsOut);
  for (const b of built) fs.writeFileSync(path.join(root, b.outPath), b.pngBytes);
  process.stderr.write(`wrote manifest.js, CREDITS.md, and ${built.length} sheet(s) (${built.map(b => b.sheet.id).join(', ') || 'none rebuilt'}).\n`);
}

main().catch(err => {
  console.error(err && err.stack || err);
  process.exitCode = 1;
});
