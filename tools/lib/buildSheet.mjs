'use strict';
/* Turns one sheet's declared sprite sources into a packed PNG plus the rects
   and licence data that describe it. A sheet is one source project pinned at
   one commit — same rule the pinned sheets already follow — so this refuses
   to mix repos or commits within a single sheet rather than silently allowing
   drift nobody would notice in the credits. */
import { fetchBytes, fetchText, parseCreditsBlock, verifyLicence } from './source.mjs';
import { decodePng, encodePng, blankCanvas, blit } from './png.mjs';
import { shelfPack } from './pack.mjs';
import { shortHash } from './hash.mjs';

export async function buildManagedSheet(def) {
  const { id, sprites, cell } = def;
  if (!sprites.length) throw new Error(`sheet "${id}" declares no sprites`);
  const repo = sprites[0].source.repo, commit = sprites[0].source.commit;
  for (const s of sprites) {
    if (s.source.repo !== repo || s.source.commit !== commit) {
      throw new Error(`sheet "${id}": every sprite must share one repo+commit ` +
        `(${s.name} names ${s.source.repo}@${s.source.commit}, expected ${repo}@${commit})`);
    }
  }

  const items = [];
  /* One licence lookup per upstream asset name, even when several sprites in
     this sheet are cropped from the same source file. */
  const byAsset = new Map();
  for (const s of sprites) {
    const { path, rect, creditsPath, assetName } = s.source;
    const decoded = decodePng(await fetchBytes(repo, commit, path));
    const [rx, ry, rw, rh] = rect;
    if (rx < 0 || ry < 0 || rx + rw > decoded.width || ry + rh > decoded.height) {
      throw new Error(`sheet "${id}": rect [${rect}] for "${s.name}" falls outside ` +
        `${path} (${decoded.width}x${decoded.height})`);
    }
    if (!byAsset.has(assetName)) {
      const entry = parseCreditsBlock(await fetchText(repo, commit, creditsPath), assetName);
      verifyLicence(entry);
      byAsset.set(assetName, { entry, spriteNames: [] });
    }
    byAsset.get(assetName).spriteNames.push(s.name);
    items.push({ name: s.name, w: rw, h: rh, anchor: s.anchor || 'flat', decoded, rect });
  }

  const { width, height } = shelfPack(items);
  const canvas = blankCanvas(width, height);
  const rects = {}, anchors = {};
  for (const it of items) {
    const [rx, ry, rw, rh] = it.rect;
    blit(canvas, it.decoded, rx, ry, rw, rh, it.x, it.y);
    rects[it.name] = [it.x, it.y, rw, rh];
    anchors[it.name] = it.anchor;
  }

  const pngBytes = encodePng(canvas);
  const outPath = `art/sprites/${id}.png`;
  const sheet = { id, src: outPath, cell: cell || 32, w: width, h: height, v: shortHash(pngBytes), sprites: rects, anchors };

  const sheetBullet = `- \`art/sprites/${id}.png\` — [${repo}](https://github.com/${repo}), commit \`${commit}\``;
  const artistNames = new Set();
  const assetChunks = [];
  for (const [assetName, { entry, spriteNames }] of byAsset) {
    entry.artists.forEach(a => artistNames.add(a));
    const usedUnder = verifyLicence(entry);
    const lines = [
      `### \`${assetName}\``, '',
      `- **Used for:** ${spriteNames.join(', ')}`,
      `- **Sheets:** ${id}`,
      `- **Authors:** ${entry.artists.join(', ')}`,
      `- **Licences offered:** ${entry.licences.join(', ')} — used here under ${usedUnder}`,
    ];
    if (entry.details) lines.push(`- **Notes:** ${entry.details}`);
    assetChunks.push(lines.join('\n'));
  }

  return { sheet, outPath, pngBytes, sheetBullet, artistNames: [...artistNames], assetChunks };
}
