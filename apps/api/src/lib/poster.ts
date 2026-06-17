import sharp from 'sharp';
import type { BirdProfileDocument } from '../models/BirdProfile.js';
import { logger } from '../config/logger.js';

export type PosterMode = 'registered' | 'lost';

const W = 800;
const H = 1130;

function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Fetch the primary photo and inline it as a data URI so librsvg (via sharp) can
// render it. Best-effort: on any failure we fall back to a placeholder.
async function fetchPhotoDataUri(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Re-encode through sharp to a known-good JPEG (handles odd formats/orientation).
    const jpeg = await sharp(buf).resize(720, 470, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}

function buildSvg(
  bird: BirdProfileDocument,
  opts: { mode: PosterMode; contact: string; photoDataUri: string | null },
): string {
  const isLost = opts.mode === 'lost';
  const band = isLost ? '#dc2626' : '#0f766e';
  const title = isLost ? 'LOST PET' : 'PET PASSPORT';
  const ring = bird.legRing?.normalized ?? '—';
  const species = bird.species.replace(/_/g, ' ');
  const marks = bird.distinguishingMarks ?? '';

  const photoBlock = opts.photoDataUri
    ? `<image x="40" y="160" width="720" height="470" href="${opts.photoDataUri}"
         preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>`
    : `<rect x="40" y="160" width="720" height="470" rx="16" fill="#e2e8f0"/>
       <text x="${W / 2}" y="410" text-anchor="middle" font-size="40" fill="#94a3b8"
         font-family="sans-serif">no photo</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="photoClip"><rect x="40" y="160" width="720" height="470" rx="16"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="130" fill="${band}"/>
  <text x="${W / 2}" y="85" text-anchor="middle" font-size="64" font-weight="700"
    fill="#ffffff" font-family="sans-serif" letter-spacing="2">${title}</text>

  ${photoBlock}

  <text x="40" y="710" font-size="56" font-weight="700" fill="#0f172a"
    font-family="sans-serif">${xml(bird.name)}</text>
  <text x="40" y="752" font-size="30" fill="#64748b" font-family="sans-serif">${xml(species)}</text>

  <rect x="40" y="790" width="720" height="96" rx="12" fill="#f1f5f9" stroke="#cbd5e1"/>
  <text x="64" y="828" font-size="22" fill="#64748b" font-family="sans-serif">LEG RING</text>
  <text x="64" y="868" font-size="40" font-weight="700" fill="${band}"
    font-family="monospace" letter-spacing="2">${xml(ring)}</text>

  ${
    marks
      ? `<text x="40" y="940" font-size="24" fill="#334155" font-family="sans-serif">Marks: ${xml(
          marks.slice(0, 60),
        )}</text>`
      : ''
  }

  <rect x="40" y="980" width="720" height="80" rx="12" fill="${band}"/>
  <text x="${W / 2}" y="1015" text-anchor="middle" font-size="22" fill="#ffffff"
    font-family="sans-serif">IF FOUND, PLEASE CONTACT</text>
  <text x="${W / 2}" y="1046" text-anchor="middle" font-size="28" font-weight="700"
    fill="#ffffff" font-family="sans-serif">${xml(opts.contact)}</text>

  <text x="${W / 2}" y="1100" text-anchor="middle" font-size="20" fill="#94a3b8"
    font-family="sans-serif">Homeward — lost pet recovery network</text>
</svg>`;
}

export async function generatePosterPng(
  bird: BirdProfileDocument,
  opts: { mode?: PosterMode; contact: string },
): Promise<Buffer> {
  const mode = opts.mode ?? (bird.status === 'lost' ? 'lost' : 'registered');
  const photoDataUri = await fetchPhotoDataUri(bird.photos?.[0]);
  const svg = buildSvg(bird, { mode, contact: opts.contact, photoDataUri });
  try {
    return await sharp(Buffer.from(svg)).png().toBuffer();
  } catch (err) {
    logger.error({ err }, 'poster render failed');
    throw err;
  }
}
