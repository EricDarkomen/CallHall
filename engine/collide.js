'use strict';
/* ---------------- Collision ----------------
   What can be where, and what to do about it when something already is not.

   This engine has always had exactly one answer to "can I go there": is the
   TILE solid. That is the right question for a wall, because a wall is made of
   tiles, and the wrong question for everything else. A wheelie bin drawn 20
   pixels across took a 32-pixel square out of the world; a lamppost with an
   eight-pixel post took the same; and a car two tiles long could not thread a
   gap it visibly fitted through. It also has no answer at all to "I am already
   inside something" — every candidate move is rejected, including the ones
   heading out — which is how a car wedged against a wall at an angle became a
   car nobody could move again.

   So: three shapes and one rule.

   FEET are what decide where you can stand. A small box on the GROUND — a
   person's is about the size of their shoes, a car's is its body — tested
   against walls (which really are tiles) and against other things' feet, which
   are the size of the thing that is DRAWN and not of the square it stands in.
   Strictly smaller than the tile, always: every footprint here is a subset of
   the tile it used to claim, so nothing that was walkable has stopped being
   walkable and nothing reachable has become unreachable. That is deliberate —
   it is what lets this go in without re-verifying every route in the building.

   BODIES are what decide what you can touch. A capsule standing on the feet,
   with a radius that also comes from the drawn size, and the reach for an
   event — an interaction now, a shove or a swing later — is measured surface
   to surface rather than centre to centre. Which is why you can reach a copier
   from further away than a mug: it is bigger.

   And DEPENETRATION, which is the rule the old one was missing. If something
   is already overlapping something else, this returns the shortest way out and
   the mover applies it. Being stuck is a state the collision system is
   responsible for ending, not a state it is allowed to enforce.

   WHAT THIS DOES NOT TOUCH. World.isSolid is exactly what it was, and remains
   the answer for everything that thinks in tiles: colleagues' pathfinding, the
   waypoint checks, and the editor's flood fill. Two questions, two answers, on
   purpose — a route planned on tiles is still a route a walker can follow,
   because the fine shape is always inside the coarse one. */
const Collide = {
  /* A person, in pixels. The feet are wider than they are deep and sit a
     little BELOW the point the sprite is anchored at, because you stand in the
     tile you are on and your head may overlap the one above.

     These are, to the pixel, the box walking has always used. Deliberately:
     the point of this file is to change what counts as an obstacle, not how
     big anybody is, and keeping the shape identical is what makes the whole
     change provably one-way — every footprint below is smaller than the tile
     it replaced, so ground that was walkable stays walkable and no route in
     the building can have quietly closed.
     The body is the capsule the reach is measured from, and it is a separate
     number because reaching for something is not standing on it. */
  FEET_RX: TILE * 0.30, FEET_RY: 7.4, FEET_OY: 2.2,
  BODY_R: TILE * 0.30,

  /* ---- an object's own shapes ----
     Worked out once per object and hung on it, because `fdef` is already the
     merged answer to "how is this furnished" and this is one more thing that
     follows from it. See FURN in data/world.js: `ground` is the override, in
     fractions of a tile, for the things whose drawn size lies about their
     footprint — a lamppost is a post, not a bollard the width of the pavement. */
  foot(o) {
    if (o._foot !== undefined) return o._foot;
    const f = o.fdef || FURN[o.kind] || {};
    /* Nothing you can walk into is nothing to collide with. */
    if (!o.solid) return (o._foot = null);
    let rx, ry;
    if (f.ground) {
      rx = TILE * f.ground[0] / 2;
      ry = TILE * (f.ground.length > 1 ? f.ground[1] : f.ground[0]) / 2;
    } else if (f.mount === 'wall') {
      /* Flat against the wall it hangs on, and the wall is the tile next door.
         A slab rather than a square: you can walk along in front of a
         noticeboard, which you could not before and always should have been
         able to. Pushed to the wall side so the free half is the side you
         approach from. */
      const s = o.wallSide;
      const d = TILE * 0.30;
      if (s === 'n' || s === 's') return (o._foot = { ox: 0, oy: (s === 'n' ? -1 : 1) * (TILE - d) / 2, rx: TILE / 2, ry: d / 2 });
      if (s === 'w' || s === 'e') return (o._foot = { ox: (s === 'w' ? -1 : 1) * (TILE - d) / 2, oy: 0, rx: d / 2, ry: TILE / 2 });
      rx = ry = TILE / 2;
    } else if (f.mount === 'surface' || o.onTable || o.onCounter) {
      /* Standing on a worktop, a counter or a table. What stops you is the run
         it is standing on, which is waist height and is the whole tile — the
         kettle is not the obstacle, the kitchen unit under it is. */
      rx = ry = TILE / 2;
    } else {
      /* THE DEFAULT IS THE WHOLE TILE, exactly as it has always been. `ground`
         is opt-in, kind by kind, in data/world.js, and that is deliberate:
         shrinking everything to its drawn size at a stroke would quietly let
         you stand half inside two hundred pieces of office furniture that were
         drawn to fill their square anyway. The things that needed it are the
         ones you can see are wrong — a lamppost, a bollard, a bin — and they
         are named there rather than guessed at here. */
      rx = ry = TILE / 2;
    }
    return (o._foot = { ox: 0, oy: 0, rx: Math.max(3, rx), ry: Math.max(3, ry) });
  },
  /* Where that footprint actually is, in world pixels. */
  footBox(o) {
    const f = this.foot(o);
    if (!f) return null;
    return { x: (o.x + .5) * TILE + f.ox, y: (o.y + .5) * TILE + f.oy, rx: f.rx, ry: f.ry };
  },
  /* The radius of an object's body, for reach. Bigger than its feet, because
     what you are reaching for is the whole thing rather than the bit of it
     touching the floor, and never smaller than a hand's width or a drawing pin
     would be unreachable. */
  bodyR(o) {
    const f = o.fdef || FURN[o.kind] || {};
    return Math.max(TILE * 0.22, Math.min(TILE * 0.6, (f.size || TILE) * 0.5));
  },

  /* ---- the tests ----
     Everything below takes a box as (x, y, rx, ry) in world pixels, because
     that is what a foot is, and because two boxes are a comparison rather than
     a solver. */

  /* Walls, and the waist-height runs of counter that are not walls but stop
     you all the same. Exact rather than sampled: a foot box is smaller than a
     tile, so it covers at most two tiles in each direction and asking all of
     them is cheaper than deciding which corners to trust. */
  tiles(x, y, rx, ry) {
    const tx0 = Math.floor((x - rx) / TILE), tx1 = Math.floor((x + rx - 0.01) / TILE);
    const ty0 = Math.floor((y - ry) / TILE), ty1 = Math.floor((y + ry - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return true;
        if (World.solid[ty][tx]) return true;
        if (World.blocked && World.blocked.has(tx + ',' + ty)) return true;
      }
    }
    return false;
  },
  /* The furniture, at the size it is drawn. Only the objects on the tiles the
     box touches can matter, so this is a walk of the 3x3 neighbourhood rather
     than of every object on the floor. */
  objects(x, y, rx, ry, hit) {
    const tx0 = Math.floor((x - rx) / TILE) - 1, tx1 = Math.floor((x + rx) / TILE) + 1;
    const ty0 = Math.floor((y - ry) / TILE) - 1, ty1 = Math.floor((y + ry) / TILE) + 1;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const here = World.at(tx, ty);
        for (let i = 0; i < here.length; i++) {
          const b = this.footBox(here[i]);
          if (!b) continue;
          if (Math.abs(b.x - x) < b.rx + rx && Math.abs(b.y - y) < b.ry + ry) {
            if (hit(b, here[i])) return true;
          }
        }
      }
    }
    return false;
  },
  /* Cars, as the boxes they are rather than as the tiles they happen to cover.
     `ignore` is the one you are inside. */
  cars(x, y, rx, ry, ignore, hit) {
    const list = World.cars || [];
    for (const car of list) {
      if (car === ignore) continue;
      /* The box in the car's own frame, grown by the box's own half-extents
         projected onto the car's axes — the standard cheap OBB-vs-AABB. */
      const c = Math.cos(car.a), s = Math.sin(car.a);
      const dx = x - car.x, dy = y - car.y;
      const u = dx * c + dy * s, v = -dx * s + dy * c;
      const gu = car.def.len / 2 + Math.abs(c) * rx + Math.abs(s) * ry;
      const gv = car.def.wid / 2 + Math.abs(s) * rx + Math.abs(c) * ry;
      if (Math.abs(u) < gu && Math.abs(v) < gv) {
        if (hit(car, u, v, gu, gv, c, s)) return true;
      }
    }
    return false;
  },

  /* Can a foot box be here? The one question walking asks. */
  free(x, y, rx, ry, opts) {
    opts = opts || {};
    if (this.tiles(x, y, rx, ry)) return false;
    if (this.objects(x, y, rx, ry, () => true)) return false;
    if (!opts.noCars && this.cars(x, y, rx, ry, opts.ignore, () => true)) return false;
    return true;
  },

  /* The shortest way OUT of everything this box is currently inside, as a
     vector, or null if it is inside nothing. This is the half the old system
     did not have, and the half that makes being stuck impossible: whatever
     went wrong — a car parked on you, a spawn inside a wall, a wedge at an
     angle no axis-separated step could undo — the way out is a direction, and
     a direction can be applied.

     The smallest push per obstacle, summed. Summing rather than taking the
     largest is what gets a thing out of a CORNER: two walls each push it one
     way and the diagonal is the way out of both. */
  pushOut(x, y, rx, ry, opts) {
    opts = opts || {};
    let px = 0, py = 0;
    /* Out of solid tiles. */
    const tx0 = Math.floor((x - rx) / TILE), tx1 = Math.floor((x + rx - 0.01) / TILE);
    const ty0 = Math.floor((y - ry) / TILE), ty1 = Math.floor((y + ry - 0.01) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const bad = (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) || World.solid[ty][tx]
          || (World.blocked && World.blocked.has(tx + ',' + ty));
        if (!bad) continue;
        const p = this.mtv(x, y, rx, ry, (tx + .5) * TILE, (ty + .5) * TILE, TILE / 2, TILE / 2);
        px += p[0]; py += p[1];
      }
    }
    /* Out of furniture. */
    this.objects(x, y, rx, ry, b => {
      const p = this.mtv(x, y, rx, ry, b.x, b.y, b.rx, b.ry);
      px += p[0]; py += p[1];
      return false;
    });
    /* Out of cars, along the car's own axes — pushed sideways out of a car you
       are lying against rather than along the map's grid. */
    if (!opts.noCars) {
      this.cars(x, y, rx, ry, opts.ignore, (car, u, v, gu, gv, c, s) => {
        const ou = gu - Math.abs(u), ov = gv - Math.abs(v);
        let du = 0, dv = 0;
        if (ou < ov) du = (u < 0 ? -ou : ou); else dv = (v < 0 ? -ov : ov);
        px += du * c - dv * s;
        py += du * s + dv * c;
        return false;
      });
    }
    if (!px && !py) return null;
    return [px, py];
  },
  /* The shortest push that separates two boxes: along whichever axis they
     overlap least. */
  mtv(ax, ay, arx, ary, bx, by, brx, bry) {
    const ox = arx + brx - Math.abs(ax - bx);
    const oy = ary + bry - Math.abs(ay - by);
    if (ox <= 0 || oy <= 0) return [0, 0];
    if (ox < oy) return [ax < bx ? -ox : ox, 0];
    return [0, ay < by ? -oy : oy];
  },

  /* ---- people ----
     Two calls, so that nothing outside has to know how big a person is. */
  walk(x, y, opts) { return this.free(x, y + this.FEET_OY, this.FEET_RX, this.FEET_RY, opts); },
  unstick(x, y, opts) { return this.pushOut(x, y + this.FEET_OY, this.FEET_RX, this.FEET_RY, opts); },

  /* ---- events ----
     Surface to surface, not centre to centre. A capsule reach: how far apart
     two BODIES are once their own sizes are taken off, which is what makes
     reaching a copier from a step further back than a mug correct rather than
     generous. Everything that is a physical interaction between two things
     standing on the floor is this function — an E press today, and whatever a
     shove or a swing turns out to be. */
  gap(ax, ay, ar, bx, by, br) {
    return Math.hypot(ax - bx, ay - by) - ar - br;
  },
  /* The gap between the player and an object, in pixels; negative is touching. */
  reach(o) {
    return this.gap(P.x, P.y, this.BODY_R, (o.x + .5) * TILE, (o.y + .5) * TILE, this.bodyR(o));
  },

  /* ---- cars ----
     A car's feet are its body: the whole rectangle is on the ground. Tested as
     a rotated box against the same three things everything else is tested
     against, which is why a car can now pass a lamppost it visibly clears. */
  carFits(car, x, y) {
    const d = car.def, c = Math.cos(car.a), s = Math.sin(car.a);
    const hl = d.len / 2 - 1, hw = d.wid / 2 - 1;
    /* Its own corners and side midpoints against the tiles. Eight of them, not
       six: a car is nearly two tiles long and a bollard can sit between two
       samples 28 pixels apart. */
    for (const [u, v] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw],
      [0, hw], [0, -hw], [hl * .5, hw], [hl * .5, -hw], [-hl * .5, hw], [-hl * .5, -hw]]) {
      const px = x + u * c - v * s, py = y + u * s + v * c;
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      if (tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH) return false;
      if (World.solid[ty][tx]) return false;
      if (World.blocked && World.blocked.has(tx + ',' + ty)) return false;
    }
    /* Furniture, at its drawn size, tested as box against box in the car's own
       frame. This is the half that gives a car back the room it always looked
       like it had. */
    const tx0 = Math.floor((x - d.len / 2) / TILE) - 1, tx1 = Math.floor((x + d.len / 2) / TILE) + 1;
    const ty0 = Math.floor((y - d.len / 2) / TILE) - 1, ty1 = Math.floor((y + d.len / 2) / TILE) + 1;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const here = World.at(tx, ty);
        for (let i = 0; i < here.length; i++) {
          const b = this.footBox(here[i]);
          if (!b) continue;
          const dx = b.x - x, dy = b.y - y;
          const u = dx * c + dy * s, v = -dx * s + dy * c;
          const gu = d.len / 2 + Math.abs(c) * b.rx + Math.abs(s) * b.ry;
          const gv = d.wid / 2 + Math.abs(s) * b.rx + Math.abs(c) * b.ry;
          if (Math.abs(u) < gu && Math.abs(v) < gv) return false;
        }
      }
    }
    /* And the other cars. */
    for (const other of (World.cars || [])) {
      if (other === car) continue;
      const dx = other.x - x, dy = other.y - y;
      const u = dx * c + dy * s, v = -dx * s + dy * c;
      const ol = (d.len + other.def.len) / 2 - 6, ow = (d.wid + other.def.wid) / 2 - 4;
      if (Math.abs(u) < ol * 0.78 && Math.abs(v) < ow * 0.86) return false;
    }
    return true;
  },
  /* Which way is out, for a car that is inside something. Same rule as for a
     person and for the same reason: a car wedged at an angle used to be a car
     nobody could move again, because every axis-separated step was rejected
     including the ones going the right way. */
  carPush(car) {
    const d = car.def, c = Math.cos(car.a), s = Math.sin(car.a);
    let px = 0, py = 0;
    const hl = d.len / 2, hw = d.wid / 2;
    /* Approximated by the car's bounding box, which is all an escape needs: it
       is a direction to shuffle in, not a resting place. */
    const rx = Math.abs(c) * hl + Math.abs(s) * hw;
    const ry = Math.abs(s) * hl + Math.abs(c) * hw;
    const p = this.pushOut(car.x, car.y, rx, ry, { ignore: car });
    if (p) { px += p[0]; py += p[1]; }
    /* And out of the other cars, along their axes. */
    for (const other of (World.cars || [])) {
      if (other === car) continue;
      const oc = Math.cos(other.a), os = Math.sin(other.a);
      const dx = car.x - other.x, dy = car.y - other.y;
      const u = dx * oc + dy * os, v = -dx * os + dy * oc;
      const gu = (d.len + other.def.len) / 2 - 6, gv = (d.wid + other.def.wid) / 2 - 4;
      if (Math.abs(u) >= gu * 0.78 || Math.abs(v) >= gv * 0.86) continue;
      const ou = gu * 0.78 - Math.abs(u), ov = gv * 0.86 - Math.abs(v);
      let du = 0, dv = 0;
      if (ou < ov) du = (u < 0 ? -ou : ou); else dv = (v < 0 ? -ov : ov);
      px += du * oc - dv * os;
      py += du * os + dv * oc;
    }
    return (px || py) ? [px, py] : null;
  }
};
