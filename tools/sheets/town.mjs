'use strict';
/* The town's own atlas — separate from world.png because that one is the
   building's interior kit, pinned and no longer rebuildable (see
   tools/lib/pinned.mjs); this one is street/exterior art and grows as the
   town does. One entry so far: proof that fetch → crop → licence-check →
   pack → manifest actually works end to end. More sprites are just more
   entries here, each with its own hand-picked crop rect — see the note in
   engine/render.js about never taking a floor cell off a contact sheet
   without checking it for a seam. */
export default {
  id: 'town',
  cell: 32,
  sprites: [
    {
      name: 'sign.board',
      anchor: 'wall',
      source: {
        repo: 'ElizaWy/LPC',
        commit: 'f07f7f5892e67c932c68f70bb04472f2c64e46bc',
        path: 'Structure/Signs/Sign Backgrounds A.png',
        creditsPath: 'Structure/Signs/Credits.txt',
        assetName: 'Sign Backgrounds A',
        /* Top-left of a 2x2 grid of colour variants, each a whole hanging
           sign board — not a tileable texture, so no seam to check. */
        rect: [0, 0, 32, 32],
      },
    },
  ],
};
