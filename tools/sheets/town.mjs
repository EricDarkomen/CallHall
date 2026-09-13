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
    /* The pavement and the carriageway used to be here: a mediaeval flagstone
       and a recoloured patch of grit, both picked because they were the
       closest thing to a modern street in a kit that has no streets in it.
       They are now in tools/sheets/streets.mjs, drawn for the job, and these
       two came out rather than sit in the atlas unused. */
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
    /* SHOPFRONTS. Three sash windows off one sheet, the same window in three
       states: daylight, dark, and lit from inside. The parade's units were a
       wall with an emoji hung on it; they are now a wall with a window in it,
       and the window knows what time it is — FURN.shop carries `lit`, which
       R.spriteOf() swaps in when the streetlights come on. Walk back up the
       High Street at half four in December and the shops are lit.

       The dark one is not a spare: it is the unit that is always being
       refitted and the one with TO LET in it, which are the two frontages on
       that parade that should stay black when everything either side of them
       comes on. */
    {
      name: 'shop.window',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Structure/Windows/Ornamental Windows A.png',
        creditsPath: 'Structure/Windows/Credits.txt',
        assetName: 'Ornamental Windows A',
        rect: [32, 36, 32, 52],
      },
    },
    {
      name: 'shop.window.lit',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Structure/Windows/Ornamental Windows A.png',
        creditsPath: 'Structure/Windows/Credits.txt',
        assetName: 'Ornamental Windows A',
        rect: [64, 36, 32, 52],
      },
    },
    {
      name: 'shop.window.dark',
      anchor: 'wall',
      source: {
        repo, commit,
        path: 'Structure/Windows/Ornamental Windows A.png',
        creditsPath: 'Structure/Windows/Credits.txt',
        assetName: 'Ornamental Windows A',
        rect: [0, 36, 32, 52],
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
    /* ---- THE OLD TOWN, THE RAILWAY AND THE WATER ----
       Everything below arrived with the half of the map south of the line. The
       rule at the top of this file still holds and was applied to every one of
       them: nothing that covers more than one square went in without being
       tiled three by three and looked at. Three of these are ground, and all
       three were. */
    {
      /* THE WATER, and it is one cell off the same four-season terrain sheet
         the verge and the tree come from — [384,512] is the plain-fill middle
         of the deep-water block, no edge piece and no ripple mark in it, which
         is what a surface covering the bottom of the map has to be. The ripple
         cells beside it repeat as a landmark every metre of a river that runs
         the width of the town, which is the fault the streets sheet's own note
         is about.

         One season, not four, and that is a decision rather than an oversight:
         upstream's winter water is ICE, and the thing at the bottom of this
         town is a tidal river with a working quay on it. It does not freeze,
         it has never frozen, and a January that turned it white would be the
         one lie on a map that otherwise knows exactly what month it is.

         SURFACES.water is what makes it water rather than a blue floor: it
         carries `open`, which is the flag that tells the renderer this is
         ground you can see and cannot stand on — see World.open(). */
      name: 'terrain.water',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Terrain/terrain_summer.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Terrain (all seasons)',
        rect: [384, 512, 32, 32],
      },
    },
    {
      /* THREE STEPS TO THE TILE. Upstream ships this as a band of treads on a
         transparent cell — one, two and three risers, seven colours — and the
         three-riser cell is 24 pixels tall rather than 32, which is why the
         rect is 24 and not a whole square: a surface tile is drawn stretched to
         fill its tile, so a 24-pixel band of three treads becomes a 32-pixel
         band of three treads and the next one down starts exactly where this
         one stopped. Crop the whole cell instead and every tile of the flight
         carries eight pixels of nothing, which on a stepped lane reads as a
         missing step every third one.

         Laid down the lane between the old town and the water, which is the one
         place on this map where the ground is not flat and the only reason a
         set of steps exists in a game with no height in it: what the steps
         tell you is that the town is UP and the river is DOWN, and they tell
         you that without the camera having to move an inch. */
      name: 'terrain.steps',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Structure/Stairs/Short Steps A.png',
        creditsPath: 'Structure/Stairs/Credits.txt',
        assetName: 'Short Steps A',
        rect: [96, 64, 32, 24],
      },
    },
    {
      /* THE WALL THE TOWN IS INSIDE. Random-coursed rubble in the red of the
         stone this part of the country is actually built out of — six colour
         blocks on the sheet and this is the warm one, picked over the grey and
         the cream because a city wall that reads as granite reads as a castle
         in a different county.

         [128,128] is the middle cell of that block, clear of the coping course
         along its top and bottom edge, tiled three by three and checked. It is
         a `wtile` rather than a `tile` — see the old town's zones in
         data/world.js — so what it covers is the mass between the streets, and
         the whole of what makes the lanes in there read as lanes cut through
         something old rather than as gaps between office blocks. */
      name: 'wall.stone',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Structure/Walls/Jagged Stone Walls.png',
        creditsPath: 'Structure/Walls/Credits.txt',
        assetName: 'Jagged Stone Walls',
        rect: [128, 128, 32, 32],
      },
    },
    {
      /* The pale one off the same sheet, and it has one job: the minster. A
         cathedral is not built out of the same stone as the wall round the town
         — it is built out of the stone somebody paid to bring in — and the one
         building on this map that everybody in it can see from anywhere gets to
         say so. Same block position, three blocks along. */
      name: 'wall.stone.pale',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Structure/Walls/Jagged Stone Walls.png',
        creditsPath: 'Structure/Walls/Credits.txt',
        assetName: 'Jagged Stone Walls',
        rect: [32, 32, 32, 32],
      },
    },
    {
      /* A drinking fountain on a market square, which is what this becomes the
         moment it is standing on paving with a bench beside it: the ornate
         basin a corporation put up for somebody in 1887 and nobody has turned
         the water on in since. Two tiles across and three tall, cropped to its
         own alpha — the 14 rows below it on the sheet are empty. */
      name: 'obj.fountain',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Structure/Misc/Fountain A.png',
        creditsPath: 'Structure/Misc/Credits.txt',
        assetName: 'Fountain A',
        rect: [0, 0, 64, 82],
      },
    },
    {
      /* Three barrels, stacked, for the quay. Upstream ships four single
         barrels and this one group; the group is the one that reads at a
         glance as goods waiting to go somewhere rather than as a prop. */
      name: 'obj.barrels',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Objects/Furniture/Barrel.png',
        creditsPath: 'Objects/Furniture/Credits.txt',
        assetName: 'Barrel',
        rect: [96, 2, 48, 61],
      },
    },
    {
      /* A crate, and not the world atlas's `obj.boxes` — that is the stack of
         cardboard in the archive, and cardboard on a wharf in the rain is a
         thing that would not be there in the morning. This is the timber one,
         seen from the corner. */
      name: 'obj.crate',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Objects/Furniture/Crate.png',
        creditsPath: 'Objects/Furniture/Credits.txt',
        assetName: 'Crate',
        rect: [0, 32, 32, 32],
      },
    },
    {
      /* The municipal trough: a timber planter with something green in it,
         which is what a town centre puts down the middle of a street the day it
         stops letting cars up it. Column 0 of the sheet — the other four are a
         tree in an urn and a tree in a trough, both of which are trees, and
         this game already has a tree that knows what month it is. */
      name: 'obj.trough',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Objects/Furniture/Planter.png',
        creditsPath: 'Objects/Furniture/Credits.txt',
        assetName: 'Planter',
        rect: [0, 32, 32, 52],
      },
    },
    {
      /* Post and rail, one bay of it between two posts, for the riverside and
         the top of the steps. A tile wide on purpose: a fence is a thing you
         put a run of, and a run of this is a run of fence. */
      name: 'obj.fence',
      anchor: 'floor',
      source: {
        repo, commit,
        path: 'Structure/Fences/Plain Fence A.png',
        creditsPath: 'Structure/Fences/Credits.txt',
        assetName: 'Plain Fence A',
        rect: [32, 64, 32, 32],
      },
    },
    {
      /* THE BALLAST. The plain-fill middle of the stone block on the same
         terrain sheet the grass comes off — a bed of small round stones with
         no pattern in it, tiled three by three and checked. It is brown on the
         sheet and grey on the map, because SURFACES.rail multiplies it through
         a tint the way every other surface in this game is: granite chippings
         and a hundred years of brake dust.

         It is `open`, like the water, and for the same reason — a railway is
         ground you can stand and look at and cannot walk on. The two running
         lines are painted over the top of it by R.roadPaint(); see the `rails`
         entry in its vocabulary. */
      name: 'terrain.ballast',
      anchor: 'flat',
      source: {
        repo, commit,
        path: 'Terrain/terrain_summer.png',
        creditsPath: 'Terrain/Credits.txt',
        assetName: 'Terrain (all seasons)',
        rect: [128, 128, 32, 32],
      },
    },
  ],
};
