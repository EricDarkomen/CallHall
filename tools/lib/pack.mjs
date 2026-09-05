'use strict';
/* A simple shelf packer: sort tallest-first, lay left to right, wrap to a new
   shelf when a row would exceed maxWidth. Good enough for a few dozen sprites
   at a handful of common sizes — the world atlas is not thousands of items,
   and a byte-optimal packer is not worth the complexity here. */
export function shelfPack(items, maxWidth = 512) {
  const order = items.slice().sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0, y = 0, shelfH = 0, width = 0;
  for (const it of order) {
    if (x > 0 && x + it.w > maxWidth) { x = 0; y += shelfH; shelfH = 0; }
    it.x = x; it.y = y;
    x += it.w;
    shelfH = Math.max(shelfH, it.h);
    width = Math.max(width, x);
  }
  return { width, height: y + shelfH };
}
