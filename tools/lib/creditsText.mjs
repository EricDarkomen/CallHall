'use strict';
/* Reads the currently-committed art/CREDITS.md apart into the bits that never
   change (the prose) and the bits that are really just data (which sheet came
   from which repo+commit, the artist roll call, the per-asset entries) — then
   puts it back together with any newly-built sheets' data merged in.

   The pinned entries are kept as whole, untouched text chunks. That is the
   point: a sheet nobody rebuilt this run must not move a single character in
   its own entry, even if the file as a whole gets new ones. */
import fs from 'node:fs';

export function loadCreditsSkeleton(root) {
  const path = root + '/art/CREDITS.md';
  const lines = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n').split('\n');

  const bulletStart = lines.findIndex(l => l.startsWith('- `art/sprites/'));
  if (bulletStart < 0) throw new Error('CREDITS.md: could not find the sheet-source bullet list');
  let bulletEnd = bulletStart;
  while (lines[bulletEnd] && lines[bulletEnd].startsWith('- `art/sprites/')) bulletEnd++;

  const artistsIdx = lines.findIndex(l => /^## Artists/.test(l));
  if (artistsIdx < 0) throw new Error('CREDITS.md: could not find "## Artists"');
  const artistBulletStart = artistsIdx + 2; /* heading, then a blank line */
  let artistBulletEnd = artistBulletStart;
  while (lines[artistBulletEnd] && lines[artistBulletEnd].startsWith('- ')) artistBulletEnd++;

  const assetsIdx = lines.findIndex(l => l === '## Assets used');
  if (assetsIdx < 0) throw new Error('CREDITS.md: could not find "## Assets used"');

  const sheetBullets = new Map(); /* sheet id -> full bullet line, e.g. sanitary's own prose */
  for (const line of lines.slice(bulletStart, bulletEnd)) {
    const m = line.match(/^- `art\/sprites\/([^.]+)\.png`/);
    if (m) sheetBullets.set(m[1], line);
  }

  const artistNames = lines.slice(artistBulletStart, artistBulletEnd)
    .map(l => l.replace(/^- /, '').trim())
    .filter(Boolean);

  /* Everything after "## Assets used" and its blank line, split into whole
     "### `Name`\n...fields..." chunks on the blank line before each heading. */
  const assetsBody = lines.slice(assetsIdx + 2).join('\n').trim();
  const assetChunks = assetsBody.length
    ? assetsBody.split(/\n(?=### )/).map(s => s.trim())
    : [];

  return {
    headerPre: lines.slice(0, bulletStart),   // lines 1..6, prose before the bullet list
    headerPost: lines.slice(bulletEnd, artistsIdx), // prose between the bullet list and "## Artists"
    sheetBullets,      // Map<sheetId, bulletLineText>
    artistNames,       // string[]
    assetChunks,       // string[] of whole "### `Name`\n- ...\n" blocks, keyed by their own heading
  };
}

/* `name` here is the asset's display name (what "### `Name`" reads), used
   only to sort — never edits an existing chunk's text. */
function chunkName(chunk) {
  const m = chunk.match(/^### `(.*)`/);
  return m ? m[1] : chunk;
}

/* A chunk's own "**Sheets:** a, b" field, so a rebuilt sheet's stale entry
   can be told apart from one that still belongs untouched. */
function chunkSheets(chunk) {
  const m = chunk.match(/\*\*Sheets:\*\*\s*(.*)/);
  return m ? m[1].split(',').map(s => s.trim()) : [];
}

/* `rebuiltSheetIds`: the sheets actually rebuilt this run. Their OLD chunks
   (read back from the file this same skeleton came from) must not survive
   into the merge — otherwise a second run duplicates every entry the first
   run just added. Only drops a chunk whose sheets are entirely among those
   rebuilt; one that also credits a sheet not rebuilt this run is left alone,
   since dropping it would lose that other sheet's only credit for it. */
export function renderCredits(skeleton, newSheetBullets, newArtistNames, newAssetChunks, rebuiltSheetIds = new Set()) {
  const sheetBullets = new Map(skeleton.sheetBullets);
  for (const [id, line] of newSheetBullets) sheetBullets.set(id, line);

  const artistNames = Array.from(new Set([...skeleton.artistNames, ...newArtistNames]))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const survivingSkeletonChunks = skeleton.assetChunks.filter(c => {
    const sheets = chunkSheets(c);
    return !(sheets.length && sheets.every(s => rebuiltSheetIds.has(s)));
  });
  const assetChunks = [...survivingSkeletonChunks, ...newAssetChunks]
    .sort((a, b) => chunkName(a).toLowerCase().localeCompare(chunkName(b).toLowerCase()));

  const out = [];
  out.push(...skeleton.headerPre);
  out.push(...sheetBullets.values());
  out.push(...skeleton.headerPost);
  out.push(`## Artists (${artistNames.length})`, '');
  out.push(...artistNames.map(n => '- ' + n));
  out.push('');
  out.push('## Assets used', '');
  out.push(assetChunks.join('\n\n'));
  out.push('');
  return out.join('\n');
}
