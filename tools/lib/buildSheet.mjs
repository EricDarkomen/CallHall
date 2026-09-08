'use strict';
/* Turns one sheet's declared sprite sources into a packed PNG plus the rects
   and licence data that describe it. A sheet is ONE work, from one place, on
   one set of terms — same rule the pinned sheets already follow — so this
   refuses to mix origins within a single sheet rather than silently allowing
   drift nobody would notice in the credits.

   "One place" now means one of two things, because upstream comes in two
   shapes (see tools/lib/source.mjs):

     a REPO source — repo + commit + path, with the project's own Credits.txt
     re-read and re-checked on every build. The town and the faces are these.

     a FILE source — url + sha256 + the credits written out in the sheet,
     for somewhere with no Credits.txt to read and no commit to pin. An
     OpenGameArt submission is this: a page, some attachments, and a licence
     stated beside them. What is re-checked every build is the file's bytes.

   A sprite says which by whether its source names a `repo` or a `url`, and a
   sheet may not contain both — a bullet in art/CREDITS.md names one source per
   sheet and has to be able to stay true. */
import { fetchBytes, fetchText, fetchPinnedFile, parseCreditsBlock, verifyLicence } from './source.mjs';
import { decodePng, encodePng, blankCanvas, blit } from './png.mjs';
import { shelfPack } from './pack.mjs';
import { shortHash } from './hash.mjs';

/* What a sprite's source IS, and everything downstream that differs because of
   it, decided once and in one place. `origin` is the thing every sprite in a
   sheet has to agree on; `key` is what two sprites cropped from the same file
   share, so it is fetched and licence-checked once. */
function classify(src) {
  if (src.url && src.repo) {
    throw new Error(`a source names both a repo (${src.repo}) and a url (${src.url}) — it is one or the other`);
  }
  if (src.url) {
    if (!src.sha256) throw new Error(`the file source ${src.url} declares no sha256 to pin it by`);
    if (!src.page) throw new Error(`the file source ${src.url} declares no page it came from`);
    return { kind: 'file', origin: src.page, key: src.url };
  }
  if (!src.repo) throw new Error('a source names neither a repo nor a url');
  return { kind: 'repo', origin: `${src.repo}@${src.commit}`, key: src.path };
}

/* The licence data for one upstream asset. A repo source has it read off
   upstream's own Credits.txt every build; a file source has it written into
   the sheet, because there is nothing at the other end to read. Both come back
   in the same shape, so nothing past here knows which it was. */
async function creditsFor(src, kind) {
  if (kind === 'repo') {
    return parseCreditsBlock(await fetchText(src.repo, src.commit, src.creditsPath), src.assetName);
  }
  return {
    name: src.assetName,
    artists: (src.artists || []).slice(),
    sources: [src.page],
    licences: (src.licences || []).slice(),
    details: (src.details || '').trim(),
  };
}

export async function buildManagedSheet(def) {
  const { id, sprites, cell } = def;
  const part = def.part || 2;
  if (!sprites.length) throw new Error(`sheet "${id}" declares no sprites`);

  const first = classify(sprites[0].source);
  for (const s of sprites) {
    const c = classify(s.source);
    if (c.kind !== first.kind || c.origin !== first.origin) {
      throw new Error(`sheet "${id}": every sprite must come from one source ` +
        `(${s.name} names ${c.origin}, expected ${first.origin})`);
    }
  }

  const items = [];
  /* One fetch and one licence lookup per upstream asset, even when several
     sprites in this sheet are cropped from the same file. */
  const byAsset = new Map();
  const byFile = new Map();
  for (const s of sprites) {
    const src = s.source;
    const { kind, key } = classify(src);
    if (!byFile.has(key)) {
      byFile.set(key, decodePng(kind === 'repo'
        ? await fetchBytes(src.repo, src.commit, src.path)
        : await fetchPinnedFile(src.url, src.sha256)));
    }
    const decoded = byFile.get(key);
    const [rx, ry, rw, rh] = src.rect;
    if (rx < 0 || ry < 0 || rx + rw > decoded.width || ry + rh > decoded.height) {
      throw new Error(`sheet "${id}": rect [${src.rect}] for "${s.name}" falls outside ` +
        `${key} (${decoded.width}x${decoded.height})`);
    }
    if (!byAsset.has(src.assetName)) {
      const entry = await creditsFor(src, kind);
      verifyLicence(entry, part);
      byAsset.set(src.assetName, { entry, kind, page: src.page || null, spriteNames: [] });
    }
    byAsset.get(src.assetName).spriteNames.push(s.name);
    items.push({ name: s.name, w: rw, h: rh, anchor: s.anchor || 'flat', decoded, rect: src.rect });
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

  const src0 = sprites[0].source;
  const sheetBullet = first.kind === 'repo'
    ? `- \`art/sprites/${id}.png\` — [${src0.repo}](https://github.com/${src0.repo}), commit \`${src0.commit}\``
    : `- \`art/sprites/${id}.png\` — [${def.title || src0.assetName}](${src0.page}), each file pinned by sha256`;

  const artistNames = new Set();
  const assetChunks = [];
  const licencesTaken = [];
  for (const [assetName, { entry, kind, page, spriteNames }] of byAsset) {
    entry.artists.forEach(a => artistNames.add(a));
    const usedUnder = verifyLicence(entry, part);
    licencesTaken.push(usedUnder);
    const lines = [
      `### \`${assetName}\``, '',
      `- **Used for:** ${spriteNames.join(', ')}`,
      `- **Sheets:** ${id}`,
      `- **Authors:** ${entry.artists.join(', ')}`,
      `- **Licences offered:** ${entry.licences.join(', ')} — used here under ${usedUnder}`,
    ];
    if (entry.details) lines.push(`- **Notes:** ${entry.details}`);
    /* Where the licence was not read by the build, say so in the credits
       rather than only in the commit that added it. Same standing, and the
       same wording, as LICENSE part 3 already gives the sanitary sheet. */
    if (kind === 'file') {
      lines.push(`- **Source:** <${page}>`);
      lines.push(`- **Standing:** authors and licence reported from that page by hand, ` +
        `not read by the build; the file itself is pinned by checksum.`);
    }
    assetChunks.push(lines.join('\n'));
  }

  return { sheet, part, licencesTaken, outPath, pngBytes, sheetBullet, artistNames: [...artistNames], assetChunks };
}
