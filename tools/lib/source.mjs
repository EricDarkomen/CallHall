'use strict';
/* Talks to upstream. Two ways, because upstream comes in two shapes.

   A REPO source is a file in a project pinned at a commit, and that project
   ships its OWN Credits.txt saying what licence it currently offers an asset
   under. Nothing is cached to disk on purpose — the whole point of checking on
   every build is that upstream's licence data might have changed since the
   last one.

   A FILE source is a single file at a URL, from somewhere that has no
   Credits.txt to read and no commit to pin — an OpenGameArt submission, which
   is a page with attachments on it and a licence stated in a form field beside
   them. There is nothing there to re-parse, so what is re-checked every build
   is the BYTES: the sheet declares the sha256 of the file it was built from
   and this refuses the download if it no longer matches. A re-upload under
   different terms therefore stops the build rather than slipping through it,
   which is the same guarantee the repo sources get, arrived at from the other
   end. The licence itself is declared in the sheet, read off the source page
   by a human — see "Standing of this attribution" in LICENSE part 3, which is
   how this project already records a fact it cannot verify from in here. */
import { sha256hex } from './hash.mjs';

const RAW = (repo, commit, path) =>
  `https://raw.githubusercontent.com/${repo}/${commit}/` +
  path.split('/').map(encodeURIComponent).join('/');

export async function fetchBytes(repo, commit, path) {
  const url = RAW(repo, commit, path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function fetchText(repo, commit, path) {
  return (await fetchBytes(repo, commit, path)).toString('utf8');
}

/* One file, by URL, verified against the checksum the sheet declares for it.
   Throws rather than warning: a file that came back different is not a sprite
   to crop and hope about. */
export async function fetchPinnedFile(url, sha256) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed (${res.status}) for ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const got = sha256hex(bytes);
  if (got !== sha256) {
    throw new Error(
      `refusing to build: ${url} is not the file this sheet was written against.\n` +
      `  declared sha256: ${sha256}\n` +
      `  downloaded:      ${got}\n` +
      `The file changed at the source. Re-read the source page's licence and its ` +
      `credits before updating the checksum — a re-upload can change the terms, ` +
      `and the crop rects are measured against the old pixels either way.`
    );
  }
  return bytes;
}

/* WHICH LICENCES ARE ACCEPTABLE, AND IN WHICH SHEET.

   This used to be one list of two — OGA-BY 3.0 and CC0, the two that cost
   attribution and nothing else. It is now two lists, because the answer is not
   a property of the project, it is a property of the SHEET.

   A part-2 sheet is the OGA-BY art: the characters, the office kit, the town.
   ShareAlike is refused there and always will be. Not out of taste — packing a
   ShareAlike crop into world.png would make that whole sheet an Adaptation of
   a ShareAlike work and drag every OGA-BY contribution in it into a licence
   its artists never chose. That is not ours to do. See LICENSE part 2.

   A part-3 sheet is a ShareAlike sheet, and it is allowed to exist as long as
   it is a sheet of its OWN. art/sprites/sanitary.png has been exactly that
   since long before this list had two halves: one CC-BY-SA 3.0 tileset, in a
   file nothing else is packed into, under its own terms in LICENSE part 3.
   Anything else arriving under ShareAlike gets the same treatment — its own
   sheet, its own entry, never mixed.

   GPL 3.0 is deliberately NOT here, and its absence is not an oversight. Most
   ShareAlike LPC art is offered as CC-BY-SA 3.0 *or* GPL 3.0 at the licensee's
   option, and LICENSE part 3 already says which of the two this project takes
   and why: the GPL's "preferred form for making modifications" would reach the
   build inputs, and tools/ is not published. Leaving it out of this table is
   that choice made once rather than per sheet, and it means art offered ONLY
   under the GPL stops the build instead of being quietly taken on terms the
   project has already decided it does not want.

   The sheet says which part it is with `part:`, and says nothing to mean 2.

   Matched case-insensitively, and that is not a loosening: Credits.txt is
   prose typed by hand, and upstream's own files do not agree with themselves
   about it — Objects/Wall Items writes "OGA-by 3.0" where Terrain writes
   "OGA-BY 3.0". They are the same licence, and refusing one of them would be
   refusing a typo rather than a term. What is compared is still the licence's
   NAME from its first character on, so "OGA-BY-NC" would still not pass for
   OGA-BY. */
const LICENCES_BY_PART = {
  2: ['OGA-BY 3.0', 'CC0'],
  3: ['CC-BY-SA 3.0'],
};
export const PARTS = Object.keys(LICENCES_BY_PART).map(Number);
export function licencesFor(part) {
  const allowed = LICENCES_BY_PART[part];
  if (!allowed) throw new Error(`no such licence part "${part}" (known: ${PARTS.join(', ')})`);
  return allowed;
}
const offers = (licence, allowed) => licence.toLowerCase().startsWith(allowed.toLowerCase());
/* Which part a licence belongs to, or null for one no sheet may take. The
   inverse of the table above, and what assertOnePart() in build-sprites.mjs
   asks once a sheet is built. */
export function partOf(licence) {
  for (const part of PARTS) {
    if (LICENCES_BY_PART[part].some(a => offers(licence, a))) return part;
  }
  return null;
}

/* Credits.txt is prose, not data: blocks separated by a blank line, each
   headed by the asset's display name, then `KEY: value` fields — SOURCE and
   the odd all-caps field may repeat or run on to further indented lines
   (DETAILS, mostly). Lenient on purpose: this format was written for humans
   and drifts asset to asset (see e.g. "Structure/Walls/Credits.txt"). */
export function parseCreditsBlock(text, assetName) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const lines = block.split('\n');
    const name = lines[0].trim();
    if (name !== assetName) continue;
    const fields = {};
    let cur = null;
    for (const raw of lines.slice(1)) {
      const line = raw.trim();
      if (!line || /^-+$/.test(line)) continue;
      const m = line.match(/^(ARTIST\(S\)|SOURCE|LICENSE|DETAILS)\s*:\s*(.*)$/);
      if (m) {
        cur = m[1];
        if (cur === 'SOURCE') (fields.SOURCE ||= []).push(m[2].trim());
        else fields[cur] = m[2] ? m[2].trim() : '';
      } else if (cur === 'SOURCE') {
        fields.SOURCE.push(line.replace(/^SOURCE:\s*/, ''));
      } else if (cur) {
        fields[cur] = fields[cur] ? fields[cur] + ' ' + line : line;
      }
    }
    return {
      name,
      artists: (fields['ARTIST(S)'] || '').split(',').map(s => s.trim()).filter(Boolean),
      sources: fields.SOURCE || [],
      licences: (fields.LICENSE || '').split(',').map(s => s.trim()).filter(Boolean),
      details: (fields.DETAILS || '').trim(),
    };
  }
  throw new Error(`no entry named "${assetName}" in that Credits.txt`);
}

/* Throws rather than returning false: a licence that stopped qualifying is not
   a sprite to skip quietly, it's a reason to stop the whole build — see
   README's "re-checks that against upstream's own licence data on every
   build and refuses to produce a sheet if it stops being true."

   Returns the licence actually TAKEN, which is not always the first one
   offered: an asset listing "CC-BY-SA 3.0, GPL 3.0" is taken as CC-BY-SA, and
   an asset offering OGA-BY alongside something heavier is taken as OGA-BY. The
   sheet's part decides, and what comes back is what art/CREDITS.md prints. */
export function verifyLicence(entry, part = 2) {
  const allowed = licencesFor(part);
  const ok = entry.licences.find(l => allowed.some(a => offers(l, a)));
  if (!ok) {
    /* Two different mistakes, and telling them apart is most of the value of
       the message: art that changed terms under a sheet that was right about
       it, versus art put in the wrong sheet in the first place. */
    const elsewhere = entry.licences.map(partOf).find(p => p && p !== part);
    const misfiled = elsewhere
      ? `\nIt is offered under a licence this project does accept, but in a part-${elsewhere} ` +
        `sheet rather than a part-${part} one. ShareAlike art belongs in a sheet of its own — ` +
        `see LICENSE part 3 and the note above LICENCES_BY_PART.`
      : '';
    throw new Error(
      `refusing to build: "${entry.name}" does not offer ${allowed.join(' or ')} ` +
      `(currently listed: ${entry.licences.join(', ') || '(nothing)'})` + misfiled
    );
  }
  /* Spelled the licence's way rather than the typist's, keeping anything
     upstream added after the name. art/CREDITS.md is this project's statement
     of what it is using, and "OGA-by 3.0" in it reads as our mistake. */
  const canonical = allowed.find(a => offers(ok, a));
  return canonical + ok.slice(canonical.length);
}
