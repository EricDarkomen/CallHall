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
      /* The pavement. Reused the whole length of the street, tinted by each
         surface's own colour exactly as floor.carpet is reused across the
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
      /* The road. "Gritty Dirt" is four recolours of one grit texture and the
         fourth of them is a cold blue-grey — which, multiplied through a grey
         surface tint, is tarmac: loose chippings, no pattern, no direction.
         The name upstream gives it is about where Sharm first used it and not
         about what it looks like, so it is worth ignoring: what it looks like
         is a road.

         Every marking painted over it — the centre dashes, the double yellows,
         the bays, the crossing — is drawn by render.js's roadPaint() rather
         than cropped, because a marking is position-dependent and a tile is
         not: one dash in the atlas would still need the renderer to know which
         tiles get one, which way round, and where the line stops. */
      name: 'terrain.tarmac',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Structure/Floor/Gritty Dirt.png',
        creditsPath: 'Structure/Floor/Credits.txt',
        assetName: 'Gritty Dirt',
        /* Bottom-right of a 2x2 of colour variants. Tiled 3x3 and looked at
           before it was picked: the grit runs off every edge and back on the
           other side with no seam and no repeating landmark, which is the one
           thing a surface covering half a level has to get right. */
        rect: [32, 32, 32, 32],
      },
    },
    {
      /* A gully in the kerb. The bottom cell of a four-cell sheet whose other
         three are the same drain with weeds and water coming out of it — this
         one is just the grating, which is what a road has in it. */
      name: 'obj.drain',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Structure/Misc/Drain A.png',
        creditsPath: 'Structure/Misc/Credits.txt',
        assetName: 'Drain A',
        rect: [0, 96, 32, 32],
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
      /* Not `obj.trolley` — the world atlas already claims that name for the
         tea trolley on the fourth floor, and first to claim a name wins (see
         Tiles.adopt). This is the supermarket one, and the reason it is in a
         street sheet at all is that the place a supermarket trolley is most
         often found is nowhere near a supermarket. */
      name: 'obj.shoptrolley',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Objects/Moveable/Shopping Cart.png',
        creditsPath: 'Objects/Moveable/Credits.txt',
        assetName: 'Shopping Cart',
        rect: [0, 0, 32, 32],
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
    /* THE SEASONS, and they are one crop taken four times.

       Upstream ships `Terrain/terrain_<season>.png`, four sheets laid out
       identically — the same tile is at the same pixel in all four — so a
       single rect gives the same square of grass in spring, summer, autumn and
       winter without anybody having to pick four crops and hope they match.
       That is the whole reason a verge outside the building can change colour
       between one fortnight and the next for the cost of a lookup: see
       SURFACES.grass in data/world.js, which carries `tiles` rather than
       `tile`, and Sky.season(), which says which one today is.

       [128,64] is the middle of the plain-fill block of the autotile — not an
       edge piece, and tiled 3x3 and looked at in all four seasons before it was
       picked, which is the rule for anything that covers more than one square.
       Its one tuft repeats on a 32px pitch, which is visible on a field and is
       not, on a two-tile strip of council grass that nobody has cut. */
    {
      name: 'terrain.grass.spring',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Terrain/terrain_spring.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Terrain (all seasons)',
        rect: [128, 64, 32, 32],
      },
    },
    {
      name: 'terrain.grass.summer',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Terrain/terrain_summer.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Terrain (all seasons)',
        rect: [128, 64, 32, 32],
      },
    },
    {
      name: 'terrain.grass.autumn',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Terrain/terrain_autumn.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Terrain (all seasons)',
        rect: [128, 64, 32, 32],
      },
    },
    {
      /* Upstream's winter grass is grass with snow ON it, which is exactly
         right: the verge is white in January before a single flake has been
         drawn by the weather, and the weather's own lying snow goes over the
         top of it. */
      name: 'terrain.grass.winter',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Terrain/terrain_winter.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Terrain (all seasons)',
        rect: [128, 64, 32, 32],
      },
    },
    /* THE TREE, and it is the seasons trick again — one crop taken four times.

       `Terrain/trees_<season>.png` is laid out exactly as `terrain_<season>.png`
       is: the same tree at the same pixel in all four sheets, so a single rect
       gives the same tree in blossom, in leaf, in red, and bare with snow lying
       along its branches. That is the whole reason the verge outside the
       building can grow a tree that knows what month it is for the cost of a
       lookup — see FURN.tree in data/world.js, which carries `sprites` rather
       than `sprite`, the same way SURFACES.grass carries `tiles`.

       [417,112] is the one broadleaf on the sheet that stands COMPLETE and
       alone: every other tree in the leafy rows touches its neighbour, and a
       rect that clips a neighbouring canopy would put half of somebody else's
       tree in the sky above this one. Measured off the sheet's own islands
       rather than counted in cells, because this art is not on the 32px grid —
       94x125 is three tiles across and four tall, which is what a tree that a
       person can stand under has to be.

       The trunk is 11px wide at the foot and centred in the crop, which is why
       FURN.tree takes the lamppost's footprint and not a canopy-sized one: what
       is in your way is a trunk. */
    {
      name: 'obj.tree.spring',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Terrain/trees_spring.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Trees (all seasons)',
        rect: [417, 112, 94, 125],
      },
    },
    {
      name: 'obj.tree.summer',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Terrain/trees_summer.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Trees (all seasons)',
        rect: [417, 112, 94, 125],
      },
    },
    {
      name: 'obj.tree.autumn',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Terrain/trees_autumn.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Trees (all seasons)',
        rect: [417, 112, 94, 125],
      },
    },
    {
      /* Bare, with snow on the branches — the same courtesy the winter grass
         does the verge, and for the same reason: the tree is already in winter
         before the weather has drawn a single flake over the top of it. */
      name: 'obj.tree.winter',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Terrain/trees_winter.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Trees (all seasons)',
        rect: [417, 112, 94, 125],
      },
    },
    /* THREE TAGS, one per street wall. The writing has always said those
       walls were covered in this; until now they drew a biro scrawl, which is
       the right instrument for a cubicle door in the building and the wrong
       one for the side of a parade.

       Cut-outs only. Half of this sheet's tags are painted onto a chunk of
       their own brickwork — the "DANGER AREA" one carries a dark striped panel,
       the green one a whole dark wall — and pasted onto the game's brick that
       reads as a patch of somebody else's wall rather than as paint on ours.
       These three are drawn on nothing, checked against the sheet's own alpha
       before they were picked. They are wider than a tile on purpose: a
       tag that stops at the tile boundary is a poster. */
    {
      name: 'wall.graf.nice',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Objects/Wall Items/Graffiti.png',
        creditsPath: 'Objects/Wall Items/Credits.txt',
        assetName: 'Graffiti & Graffiti Elements',
        rect: [0, 32, 62, 47],
      },
    },
    {
      name: 'wall.graf.squad',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Objects/Wall Items/Graffiti.png',
        creditsPath: 'Objects/Wall Items/Credits.txt',
        assetName: 'Graffiti & Graffiti Elements',
        rect: [260, 12, 87, 40],
      },
    },
    {
      name: 'wall.graf.sport',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Objects/Wall Items/Graffiti.png',
        creditsPath: 'Objects/Wall Items/Credits.txt',
        assetName: 'Graffiti & Graffiti Elements',
        rect: [273, 104, 65, 35],
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
    /* Shop awnings, three colours, so a parade of six units is not the same
       shop six times.

       This sheet is laid out as six colour blocks of three views each — a
       left-hand side view, a right-hand one, and the one you want, which is
       the awning seen face-on. The rect used to be [0,0,72,96], which is the
       top-left CORNER of the whole thing: two side views and the top halves of
       the two beneath them, cropped across four cells at once. It read on the
       parade as a pair of blank white panels, which is close enough to a shop
       canopy from above that it went unnoticed until there were six of them.
       These are the face-on cell of three of the blocks, trimmed to the awning
       and its two support arms. */
    {
      name: 'shop.awning',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Structure/Windows/Window Awnings A.png',
        creditsPath: 'Structure/Windows/Credits.txt',
        assetName: 'Window Awnings A',
        rect: [64, 14, 32, 26],
      },
    },
    {
      name: 'shop.awning.amber',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Structure/Windows/Window Awnings A.png',
        creditsPath: 'Structure/Windows/Credits.txt',
        assetName: 'Window Awnings A',
        rect: [160, 14, 32, 26],
      },
    },
    {
      name: 'shop.awning.green',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Structure/Windows/Window Awnings A.png',
        creditsPath: 'Structure/Windows/Credits.txt',
        assetName: 'Window Awnings A',
        rect: [256, 110, 32, 26],
      },
    },
  ],
};
