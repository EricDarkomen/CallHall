'use strict';
/* Reading one file out of a zip, because that is the shape some art arrives
   in: an OpenGameArt submission is a page with a single archive attached to
   it, and there is no URL for the sprite sheet inside it.

   This is deliberately not a zip library. It reads the central directory from
   the end of the buffer, finds the one entry asked for, and inflates it —
   stored and deflated entries, which is what every archive of PNGs in the
   world actually contains. Anything else it refuses by name rather than
   guessing. node:zlib does the only hard part.

   Kept dependency-free on purpose: tools/ has one dependency (pngjs) and the
   reason to add a second has to be better than sixty lines. */
import zlib from 'node:zlib';

const EOCD = 0x06054b50, CEN = 0x02014b50, LOC = 0x04034b50;

function findEndOfDirectory(buf) {
  /* The end record is last, but a zip comment can follow it — so scan back
     from the end rather than assuming it is the final 22 bytes. */
  const min = Math.max(0, buf.length - 0xffff - 22);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === EOCD) return i;
  }
  throw new Error('not a zip: no end-of-central-directory record');
}

/* Every entry's name, in the order the archive lists them. */
export function zipEntries(buf) {
  const eocd = findEndOfDirectory(buf);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== CEN) throw new Error('zip central directory is malformed');
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    out.push({
      name: buf.toString('utf8', p + 46, p + 46 + nameLen),
      method: buf.readUInt16LE(p + 10),
      compressed: buf.readUInt32LE(p + 20),
      size: buf.readUInt32LE(p + 24),
      offset: buf.readUInt32LE(p + 42),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/* One entry's bytes. Throws with the archive's own listing when the name is
   not in it, because a typo in a path inside a zip is otherwise a silent
   nothing three steps later. */
export function zipRead(buf, name) {
  const entry = zipEntries(buf).find(e => e.name === name);
  if (!entry) {
    throw new Error(`no entry "${name}" in that archive. It contains:\n  ` +
      zipEntries(buf).map(e => e.name).join('\n  '));
  }
  if (buf.readUInt32LE(entry.offset) !== LOC) throw new Error(`entry "${name}" does not start where the directory says`);
  /* The local header repeats the name and extra fields, and its extra field
     length is NOT always the one in the central directory — read the local
     one or the data starts in the wrong place. */
  const nameLen = buf.readUInt16LE(entry.offset + 26);
  const extraLen = buf.readUInt16LE(entry.offset + 28);
  const start = entry.offset + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.compressed);
  if (entry.method === 0) return Buffer.from(raw);
  if (entry.method === 8) return zlib.inflateRawSync(raw);
  throw new Error(`entry "${name}" uses compression method ${entry.method}, which this reads nothing of`);
}
