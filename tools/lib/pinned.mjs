'use strict';
/* The sheets this tool did not build and cannot rebuild: the character parts
   and world.png went through a compositing/curation pass — layers stacked,
   recoloured, cropped, hand-picked seamless crops — that predates this tool
   and was never committed as code. Reprocessing them from scratch here would
   risk drifting pixels nobody asked to change.
   So they're PINNED instead: read verbatim out of the committed manifest and
   passed straight through, `v` untouched. The sha256 below is a tripwire —
   if a pinned PNG's bytes ever change on disk, that's either a deliberate
   replacement (update the checksum once you've confirmed it) or a mistake
   (something wrote to it that shouldn't have) — either way, silently
   re-cropping it would be the wrong move. */
import fs from 'node:fs';
import { sha256hex } from './hash.mjs';

export const PINNED_SHEETS = [
  { id: 'sanitary', file: 'art/sprites/sanitary.png', sha256: 'efa343b0bd5d6dbfe313d411d80e8e1d9937bdb996206a338336223bcff2d274' },
  { id: 'world', file: 'art/sprites/world.png', sha256: '4d0454f60273c4cbdfe80480d59f2263f8ddd5bb9479bfa68412d0be38bd0b18' },
  { id: 'revised', file: 'art/sprites/revised.png', sha256: '6296c5dbb0d3b95a9efffb99c088206de73682959896d0950e7135c71c356b35' },
  { id: 'parts-base', file: 'art/sprites/parts-base.png', sha256: '6c589b8c36079ca5e0386affda37b86f27143fa3d59e8de6030b578a55b960cf' },
  { id: 'parts-eyes', file: 'art/sprites/parts-eyes.png', sha256: 'c2b063fa16b451a9330db3903fb8d0031fda152c831aceaded2ea7476ff53682' },
  { id: 'parts-legs', file: 'art/sprites/parts-legs.png', sha256: 'edb9b25e91515f58b623716ff922692ec9d92ea68d5f6c8d7b7760eaced35338' },
  { id: 'parts-feet', file: 'art/sprites/parts-feet.png', sha256: '5064dbeb3749b97c4deb33bafcc66ca9b0615b29999d0d7a569522f811dfaced' },
  { id: 'parts-torso', file: 'art/sprites/parts-torso.png', sha256: '30697452654b62a7cef088ec5fc1f9cc6f3a6066079a250f8fbbd677db0f75cb' },
  { id: 'parts-hair', file: 'art/sprites/parts-hair.png', sha256: '714738dc4959679a506cfecd5fb83bce1c384cc4401a699f11f7547e6faa6aa9' },
  { id: 'parts-beard', file: 'art/sprites/parts-beard.png', sha256: 'fe70daee5baacf23ed5e2ceaff0972a10b1768e226d9faa4e07d75902f778dc5' },
];

/* Pulls each pinned sheet's own object straight out of the manifest that is
   currently committed — the one thing that will not exist the very first
   time this file is ever written by hand, which is why it reads the OLD file
   before build-sprites.mjs writes the new one. */
export function loadPinnedSheets(root) {
  const manifestPath = root + '/art/sprites/manifest.js';
  const text = fs.readFileSync(manifestPath, 'utf8');
  const m = text.match(/const SPRITE_ATLAS = (\{[\s\S]*\});/);
  if (!m) throw new Error('could not find "const SPRITE_ATLAS = ...;" in ' + manifestPath);
  const atlas = JSON.parse(m[1]);
  const byId = new Map(atlas.sheets.map(s => [s.id, s]));
  return PINNED_SHEETS.map(p => {
    const sheet = byId.get(p.id);
    if (!sheet) throw new Error(`pinned sheet "${p.id}" is not in the committed manifest — has it been renamed?`);
    const buf = fs.readFileSync(root + '/' + p.file);
    const hash = sha256hex(buf);
    if (hash !== p.sha256) {
      throw new Error(
        `pinned sheet "${p.id}" (${p.file}) has changed on disk.\n` +
        `  recorded sha256: ${p.sha256}\n` +
        `  on-disk sha256:  ${hash}\n` +
        `This tool has no recipe to rebuild it from source, so it will not silently adopt new\n` +
        `pixels under the old rects. If this change is deliberate, update its checksum in\n` +
        `tools/lib/pinned.mjs once you've confirmed the new bytes are what you meant to ship.`
      );
    }
    return sheet;
  });
}
