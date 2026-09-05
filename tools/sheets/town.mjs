'use strict';
/* The town's own atlas — separate from world.png because that one is the
   building's interior kit, pinned and no longer rebuildable (see
   tools/lib/pinned.mjs); this one is street/exterior art and grows as the
   town does. One entry so far: proof that fetch → crop → licence-check →
   pack → manifest actually works end to end. More sprites are just more
   entries here, each with its own hand-picked crop rect — see the note in
   engine/render.js about never taking a floor cell off a contact sheet
   without checking it for a seam. */
const repo = 'ElizaWy/LPC';
const commit = 'f07f7f5892e67c932c68f70bb04472f2c64e46bc';

export default {
  id: 'town',
  cell: 32,
  sprites: [
    {
      name: 'sign.board',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Structure/Signs/Sign Backgrounds A.png',
        creditsPath: 'Structure/Signs/Credits.txt',
        assetName: 'Sign Backgrounds A',
        /* Top-left of a 2x2 grid of colour variants, each a whole hanging
           sign board — not a tileable texture, so no seam to check. */
        rect: [0, 0, 32, 32],
      },
    },
    {
      /* Reused for both the forecourt and the road, tinted apart by each
         zone's own colour exactly as floor.carpet is reused across the
         office's rooms — see render.js's floorTile(). One flagstone,
         two towns' worth of ground. */
      name: 'terrain.flag',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Structure/Floor/Tile C.png',
        creditsPath: 'Structure/Floor/Credits.txt',
        assetName: 'Tile C',
        /* Every cell in this sheet is already a complete, self-contained
           swatch — a preview grid of finished tiles, not a single texture
           sliced up — so any one cell is safe to crop without tiling it
           first to hunt for a seam. */
        rect: [32, 32, 32, 32],
      },
    },
    {
      name: 'wall.brick',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Structure/Walls/Brick Wall A.png',
        creditsPath: 'Structure/Walls/Credits.txt',
        assetName: 'Brick Wall A',
        /* Inside one colour swatch, clear of the striped trim at its edges —
           checked by eye against a 2x2 tiling before picking this cell. */
        rect: [32, 32, 32, 32],
      },
    },
    {
      name: 'obj.lamppost',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Objects/Furniture/Lighting, Outdoors.png',
        creditsPath: 'Objects/Furniture/Credits.txt',
        assetName: 'Lighting, Outdoors',
        rect: [0, 0, 32, 96],
      },
    },
    {
      name: 'obj.wheeliebin',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Objects/Furniture/Bin.png',
        creditsPath: 'Objects/Furniture/Credits.txt',
        assetName: 'Bin',
        rect: [0, 32, 32, 32],
      },
    },
    {
      name: 'shop.awning',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Structure/Windows/Window Awnings A.png',
        creditsPath: 'Structure/Windows/Credits.txt',
        assetName: 'Window Awnings A',
        rect: [0, 0, 72, 96],
      },
    },
  ],
};
