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
import { partOf } from './lib/source.mjs';
import { loadCreditsSkeleton, renderCredits } from './lib/creditsText.mjs';
import { renderManifest } from './lib/manifestText.mjs';
import { buildManagedSheet } from './lib/buildSheet.mjs';
import { buildFacesSheet } from './lib/buildFaces.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MANAGED_SHEET_MODULES = [
  './sheets/town.mjs',
  './sheets/streets.mjs',
  './sheets/faces.mjs',
];

/* Two kinds of managed sheet. A sheet of THINGS is a set of crops off upstream
   contact sheets, packed and named — that is buildSheet.mjs, and it is what a
   sheet declares by saying nothing. A sheet of FACES is the expressions layer,
   which is measured against the pinned character sheets rather than cropped,
   and says so with `kind: 'faces'`. Adding a third kind means adding a line
   here and nothing else: everything downstream takes the same five things
   back, whichever built them. */
const BUILDERS = {
  tiles: (def) => buildManagedSheet(def),
  faces: (def, ctx) => buildFacesSheet(def, ctx),
};

async function loadManagedDefs() {
  return Promise.all(MANAGED_SHEET_MODULES.map(async m => (await import(m)).default));
}

/* THE CHECK LICENSE HAS BEEN PROMISING.

   LICENSE parts 2 and 3 both say this file refuses to pack ShareAlike art into
   an OGA-BY sheet, and name this function while doing it. For a long while
   that was true only by omission: no ShareAlike licence was accepted anywhere,
   so none could get in. Now that a sheet may declare itself part 3 and take
   CC-BY-SA art, "true by omission" is not true enough, and the assertion the
   licence file describes has to actually exist.

   What it enforces is one sentence: a sheet is all one part. Not because
   mixing would be untidy — because a ShareAlike crop packed in among OGA-BY
   ones would make the whole PNG an Adaptation of a ShareAlike work and force
   every other artist in it into a licence they did not choose. That is the
   reason art/sprites/sanitary.png is a file by itself, and it is the reason
   the next ShareAlike thing will be too.

   It runs over what was BUILT, from the licence each asset was actually taken
   under rather than from what the sheet said about itself. In the ordinary way
   of things it never fires: verifyLicence() has already refused the wrong
   licence for the sheet's part, one asset at a time, while the sheet was being
   built. This is the outer gate, and it is here because the inner one lives in
   the builders and there is a list of them at the top of this file that is
   meant to grow — a third kind that forgets to pass its sheet's part along
   would sail straight past verifyLicence and straight into this. The claim
   LICENSE makes is about the file you are reading, so the check it names is in
   the file you are reading.

   Pinned sheets are not checked here and do not need to be: they are
   byte-for-byte the file that was licensed, and pinned.mjs refuses them if
   that stops being so. */
function assertOnePart(built) {
  for (const b of built) {
    const parts = new Map();
    for (const licence of b.licencesTaken || []) {
      const part = partOf(licence);
      if (!part) throw new Error(`sheet "${b.sheet.id}" took "${licence}", which belongs to no licence part`);
      if (!parts.has(part)) parts.set(part, []);
      parts.get(part).push(licence);
    }
    if (parts.size > 1) {
      const shown = [...parts].map(([part, ls]) => `part ${part} (${[...new Set(ls)].join(', ')})`).join(' and ');
      throw new Error(
        `refusing to write art/sprites/${b.sheet.id}.png: it mixes ${shown}.\n` +
        `A sheet is one work on one set of terms. Packing ShareAlike art in with OGA-BY art ` +
        `would make the whole sheet an Adaptation of a ShareAlike work and drag every other ` +
        `contribution in it into a licence its artist never chose — see LICENSE parts 2 and 3. ` +
        `Give the ShareAlike art a sheet of its own, as art/sprites/sanitary.png has.`
      );
    }
    const [only] = [...parts.keys()];
    if (only !== undefined && only !== b.part) {
      throw new Error(
        `sheet "${b.sheet.id}" declares part ${b.part} but its art is licensed part ${only} — ` +
        `fix whichever of the two is wrong before this is written.`
      );
    }
  }
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
    const build = BUILDERS[def.kind || 'tiles'];
    if (!build) throw new Error(`sheet "${def.id}" declares kind "${def.kind}", which nothing here builds`);
    built.push(await build(def, { root, atlas: committedAtlas }));
  }
  assertOnePart(built);

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
