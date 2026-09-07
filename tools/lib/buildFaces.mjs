'use strict';
/* Builds art/sprites/faces.png: the expression patches, the table that says
   where a face IS in every frame of every direction, and the row each person
   wears. See tools/sheets/faces.mjs for what the inputs mean.

   Everything in here is a measurement or a refusal. The sheet definition says
   what it believes — this head, this skin, this window, this crop — and each
   step below either proves it against upstream's pixels and the pinned sheets,
   or throws. A face drawn one pixel out is worse than no face at all: it reads
   as a person with something wrong with them. */
import fs from 'node:fs';
import path from 'node:path';
import { fetchBytes, fetchText, parseCreditsBlock, verifyLicence } from './source.mjs';
import { decodePng, encodePng, blankCanvas } from './png.mjs';
import { shortHash } from './hash.mjs';

const CELL = 64;                 /* upstream's frame */
const DIRS = 4;                  /* up, left, down, right — LPC's own order */
const FACE_DIRS = [1, 2, 3];     /* the ones with a face on them */

/* ---- pixel plumbing ----
   pngjs hands back one flat RGBA byte array. Nothing here is hot enough to
   deserve anything cleverer than reading four bytes and comparing them.

   A transparent pixel is ONE value here, whatever colour it is carrying
   underneath. Upstream's PNGs are full of fully-transparent pixels that still
   hold the colour they were painted with, and the pinned sheets are not — so
   without this, every comparison in this file finds hundreds of differences
   nobody can see, and the expression deltas would carry invisible pixels. */
function at(img, x, y) {
  const i = (y * img.width + x) * 4;
  if (img.data[i + 3] === 0) return 0;
  return (img.data[i] << 24 >>> 0) + (img.data[i + 1] << 16) + (img.data[i + 2] << 8) + img.data[i + 3];
}
function opaque(img, x, y) { return img.data[(y * img.width + x) * 4 + 3] !== 0; }
function put(dst, dx, dy, src, sx, sy) {
  const s = (sy * src.width + sx) * 4, d = (dy * dst.width + dx) * 4;
  for (let k = 0; k < 4; k++) dst.data[d + k] = src.data[s + k];
}
/* A cell's origin inside one of upstream's sheets: column across, row down. */
function cellX(col) { return col * CELL; }
function cellY(row) { return row * CELL; }

export async function buildFacesSheet(def, ctx) {
  const { repo, commit, creditsPath } = def.source;
  const cache = new Map();
  const png = async p => {
    if (!cache.has(p)) cache.set(p, decodePng(await fetchBytes(repo, commit, p)));
    return cache.get(p);
  };

  /* ---- 1. the licence, as always, from upstream's own file ---- */
  const creditsTxt = await fetchText(repo, commit, creditsPath);
  const byAsset = new Map();
  for (const key of Object.keys(def.heads)) {
    const h = def.heads[key];
    if (byAsset.has(h.asset)) continue;
    const entry = parseCreditsBlock(creditsTxt, h.asset);
    verifyLicence(entry);
    byAsset.set(h.asset, { entry, heads: [] });
  }

  /* ---- 2. every (head, skin) this sheet needs a row for ---- */
  const baseIds = [];
  for (const fit of Object.keys(def.bases.fits)) {
    for (const skin of def.bases.skins) {
      baseIds.push({ id: `${def.bases.prefix}${def.bases.fits[fit]}/${skin}`, head: fit, skin, masked: false });
    }
  }
  const castSheet = ctx.atlas.sheets.find(s => s.id === def.castSheet);
  if (!castSheet) throw new Error(`faces: no "${def.castSheet}" sheet in the committed manifest`);
  const castIds = [];
  for (const [id, [head, skin]] of Object.entries(def.cast)) {
    const row = castSheet.ids.indexOf(id);
    if (row < 0) throw new Error(`faces: "${id}" is in the roster but not on the ${def.castSheet} sheet`);
    if (!def.heads[head]) throw new Error(`faces: "${id}" claims head "${head}", which is not one of ${Object.keys(def.heads).join(', ')}`);
    castIds.push({ id, head, skin, row, masked: true });
  }
  const rows = [...castIds, ...baseIds];

  const exprCols = def.columns.map(([up, name], i) => ({ up, name, col: i })).filter(c => c.name);
  const [bx, by, bw, bh] = def.box;
  const [cx, cy] = def.crop;

  /* ---- 3. the crop this whole sheet is placed against ----
     Everything below positions a patch by subtracting `crop` from an upstream
     cell coordinate. That number came off the pinned character sheets, which
     no tool here can rebuild — so prove it instead: composite the body and
     head upstream still ships, crop them the way the definition claims, and
     require the result to be the pinned sheet's own pixels, exactly. */
  {
    const p = def.cropProof;
    const body = await png(`${p.body}/${p.skin}/Idle.png`);
    const head = await png(`${def.heads[p.head].path}/${p.skin}/Idle.png`);
    const sheet = ctx.atlas.sheets.find(s => s.id === p.sheet);
    if (!sheet) throw new Error(`faces: no "${p.sheet}" sheet in the committed manifest to check the crop against`);
    const row = sheet.ids.indexOf(p.id);
    if (row < 0) throw new Error(`faces: "${p.id}" is not on the ${p.sheet} sheet`);
    const pinned = decodePng(fs.readFileSync(path.join(ctx.root, sheet.src)));
    const dir = 2, frame = 0;                       /* facing the camera, standing */
    let bad = 0;
    for (let y = 0; y < sheet.fh; y++) {
      for (let x = 0; x < sheet.fw; x++) {
        const sx = cellX(frame) + cx + x, sy = cellY(dir) + cy + y;
        /* head over body, exactly as the composite was made */
        const want = opaque(head, sx, sy) ? at(head, sx, sy) : at(body, sx, sy);
        const got = at(pinned, (dir * sheet.frames + frame) * sheet.fw + x, row * sheet.fh + y);
        if (want !== got) bad++;
      }
    }
    if (bad) {
      throw new Error(
        `faces: the crop [${cx}, ${cy}] does not reproduce ${p.sheet}'s "${p.id}" (${bad} pixels differ).\n` +
        `Either upstream's art moved under the pinned sheets, or the crop in tools/sheets/faces.mjs is wrong.\n` +
        `Every patch this sheet places is positioned by that number, so nothing here is safe until it is right.`
      );
    }
  }

  /* ---- 4. where the head IS, frame by frame ----
     A head is drawn in its own sheet already in position, and it moves: it
     bobs through the walk, drops when somebody sits, and rides four pixels
     high through the run. So measure the offset from the standing frame for
     every frame of every direction, by finding the shift that puts the
     standing head back on top of this one. Measured on each head separately
     and required to agree — one head bobbing differently from another would
     mean this table cannot be one table. */
  const headOffsets = [];
  let offsetsFrom = null;
  for (const key of Object.keys(def.heads)) {
    const skin = def.bases.skins[0];
    const anims = new Map();
    for (const [anim] of def.frames) {
      if (!anims.has(anim)) anims.set(anim, await png(`${def.heads[key].path}/${skin}/${anim}.png`));
    }
    const table = [];
    for (let dir = 0; dir < DIRS; dir++) {
      const [refAnim, refCol] = def.frames[0];
      const ref = anims.get(refAnim);
      const row = [];
      for (const [anim, col] of def.frames) {
        const img = anims.get(anim);
        let best = null;
        for (let dy = -6; dy <= 6; dy++) {
          for (let dx = -6; dx <= 6; dx++) {
            let miss = 0;
            for (let y = 16; y < 48; y++) {
              for (let x = 12; x < 52; x++) {
                const a = at(ref, cellX(refCol) + x, cellY(dir) + y);
                const nx = x + dx, ny = y + dy;
                const b = (nx >= 0 && nx < CELL && ny >= 0 && ny < CELL) ? at(img, cellX(col) + nx, cellY(dir) + ny) : 0;
                if (a !== b) miss++;
              }
            }
            if (!best || miss < best[0]) best = [miss, dx, dy];
          }
        }
        row.push([best[1], best[2]]);
      }
      table.push(row);
    }
    if (!offsetsFrom) { headOffsets.push(...table); offsetsFrom = key; continue; }
    const same = JSON.stringify(table) === JSON.stringify(headOffsets);
    if (!same) {
      throw new Error(
        `faces: the "${key}" head does not move with the body the way "${offsetsFrom}" does.\n` +
        `One offset table cannot describe both, and the game only carries one.`
      );
    }
  }

  /* ---- 5. the eyes, as a mask ---- */
  const eyeSheet = await png(`${def.eyes}/Idle.png`);
  const isEye = (dir, x, y) => opaque(eyeSheet, cellX(0) + x, cellY(dir) + y);

  /* ---- 6. the patches ---- */
  const fw = bw, fh = bh;
  const width = exprCols.length * FACE_DIRS.length * fw;
  const height = rows.length * fh;
  const canvas = blankCanvas(width, height);
  const pinnedCast = decodePng(fs.readFileSync(path.join(ctx.root, castSheet.src)));

  /* The roster is proved rather than believed: whoever is claimed for a face
     has to fit it better than anybody else's face on the sheet does. */
  const pairs = [...new Set(castIds.map(r => r.head + '/' + r.skin))].map(k => k.split('/'));
  const faceScore = async (r, head, skin) => {
    const hd = await png(`${def.heads[head].path}/${skin}/Idle.png`);
    let hit = 0, tot = 0;
    for (const dir of FACE_DIRS) {
      for (let y = by + 1; y < by + bh; y++) {
        for (let x = bx + 1; x < bx + bw - 1; x++) {
          if (!opaque(hd, cellX(0) + x, cellY(dir) + y)) continue;
          tot++;
          const gx = (dir * castSheet.frames) * castSheet.fw + x - cx;
          const gy = r.row * castSheet.fh + y - cy;
          if (at(hd, cellX(0) + x, cellY(dir) + y) === at(pinnedCast, gx, gy)) hit++;
        }
      }
    }
    return tot ? hit / tot : 0;
  };
  for (const r of castIds) {
    const scored = [];
    for (const [head, skin] of pairs) scored.push([await faceScore(r, head, skin), head + '/' + skin]);
    scored.sort((a, b) => b[0] - a[0]);
    const mine = r.head + '/' + r.skin;
    if (scored[0][1] !== mine || (scored[1] && scored[1][0] >= scored[0][0]) || scored[0][0] < 0.5) {
      throw new Error(
        `faces: "${r.id}" is down as ${mine}, but that is not the face on the ${def.castSheet} sheet ` +
        `(best fit ${scored[0][1]} at ${scored[0][0].toFixed(3)}, ${mine} at ${(scored.find(s => s[1] === mine) || [0])[0].toFixed(3)}).\n` +
        `Either the roster in tools/sheets/faces.mjs is wrong, or somebody's sprite changed.`
      );
    }
  }

  let placed = 0;
  for (let ri = 0; ri < rows.length; ri++) {
    const r = rows[ri];
    const ex = await png(`${def.heads[r.head].path}/${r.skin}/Expressions.png`);
    const head = r.masked ? await png(`${def.heads[r.head].path}/${r.skin}/Idle.png`) : null;
    for (let ei = 0; ei < exprCols.length; ei++) {
      const e = exprCols[ei];
      for (let di = 0; di < FACE_DIRS.length; di++) {
        const dir = FACE_DIRS[di];
        for (let y = 0; y < bh; y++) {
          for (let x = 0; x < bw; x++) {
            const sx = cellX(e.col) + bx + x, sy = cellY(dir) + by + y;
            const zx = cellX(0) + bx + x;
            if (at(ex, sx, sy) === at(ex, zx, sy)) continue;   /* the face they already have */
            if (r.masked) {
              /* Only what this person actually shows. Their own pixel has to
                 be their head, or the face upstream draws over it, or one of
                 the eyes — anything else is hair in front of it. */
              const gx = (dir * castSheet.frames) * castSheet.fw + bx + x - cx;
              const gy = r.row * castSheet.fh + by + y - cy;
              const theirs = at(pinnedCast, gx, gy);
              const visible = theirs === at(head, zx, sy) || theirs === at(ex, zx, sy) || isEye(dir, bx + x, by + y);
              if (!visible) continue;
            }
            put(canvas, (ei * FACE_DIRS.length + di) * fw + x, ri * fh + y, ex, sx, sy);
            placed++;
          }
        }
      }
    }
    /* Every expression has to fit the window, or it is being clipped. */
    for (const e of exprCols) {
      for (const dir of FACE_DIRS) {
        for (let y = 0; y < CELL; y++) {
          for (let x = 0; x < CELL; x++) {
            if (x >= bx && x < bx + bw && y >= by && y < by + bh) continue;
            if (at(ex, cellX(e.col) + x, cellY(dir) + y) !== at(ex, cellX(0) + x, cellY(dir) + y)) {
              throw new Error(
                `faces: "${e.up}" on ${r.head}/${r.skin} changes pixel (${x}, ${y}), which is outside ` +
                `the window [${def.box}]. Widen the box in tools/sheets/faces.mjs — do not clip a face.`
              );
            }
          }
        }
      }
    }
  }
  if (!placed) throw new Error('faces: every patch came out empty — nothing would ever show');

  const pngBytes = encodePng(canvas);
  const outPath = `art/sprites/${def.id}.png`;
  const sheet = {
    id: def.id, src: outPath, w: width, h: height,
    fw, fh,
    /* Where the patch goes in a 38x56 frame with the head at rest. */
    at: [bx - cx, by - cy],
    exprs: exprCols.map(e => e.name),
    /* [dir][frame] -> [dx, dy]: how far the head has moved from standing. */
    head: headOffsets,
    rows: Object.fromEntries(rows.map((r, i) => [r.id, i])),
    v: shortHash(pngBytes),
  };

  const sheetBullet = `- \`${outPath}\` — [${repo}](https://github.com/${repo}), commit \`${commit}\``;
  const artistNames = new Set();
  const assetChunks = [];
  for (const [assetName, { entry }] of byAsset) {
    entry.artists.forEach(a => artistNames.add(a));
    const usedUnder = verifyLicence(entry);
    const lines = [
      `### \`${assetName}\``, '',
      `- **Used for:** facial expressions`,
      `- **Sheets:** ${def.id}`,
      `- **Authors:** ${entry.artists.join(', ')}`,
      `- **Licences offered:** ${entry.licences.join(', ')} — used here under ${usedUnder}`,
    ];
    if (entry.details) lines.push(`- **Notes:** ${entry.details}`);
    assetChunks.push(lines.join('\n'));
  }

  return { sheet, outPath, pngBytes, sheetBullet, artistNames: [...artistNames], assetChunks };
}
