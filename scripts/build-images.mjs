/**
 * Generate the page's raster images: the share card and the touch icon.
 *
 * The card is authored as SVG in the page's own palette and rasterised, so it
 * stays in step with the design rather than being a screenshot that goes stale.
 * Brand fonts are fetched as TrueType (Google serves TTF to a user agent that
 * predates woff2) and handed to the renderer, otherwise it would fall back to
 * whatever the build machine happens to have installed.
 *
 *   npm run images
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { consumerSpend, islamicFinance } from '../src/data/series.js';
import { statusFor, datasets } from '../src/data/verification.js';

const OUT = new URL('../assets/og-image.png', import.meta.url);
const W = 1200, H = 630;

/* Google serves woff2 to modern agents and TrueType to anything older. */
const LEGACY_UA = { 'User-Agent': 'Mozilla/4.0' };

const cacheDir = join(tmpdir(), 'halal-economy-og-fonts');
mkdirSync(cacheDir, { recursive: true });

/**
 * The name a font answers to is not the name you asked Google for: the
 * Fraunces static instance calls itself "Fraunces SemiBold". Referencing the
 * requested name silently falls through to the default family and renders the
 * whole card in one face, so read the name the font actually declares.
 */
function declaredFamily(buf){
  const numTables = buf.readUInt16BE(4);
  let nameOff = null;
  for(let i = 0; i < numTables; i++){
    const p = 12 + i * 16;
    if(buf.toString('ascii', p, p + 4) === 'name') nameOff = buf.readUInt32BE(p + 8);
  }
  if(nameOff == null) throw new Error('font has no name table');

  const count = buf.readUInt16BE(nameOff + 2);
  const strOff = nameOff + buf.readUInt16BE(nameOff + 4);
  const found = {};
  for(let i = 0; i < count; i++){
    const r = nameOff + 6 + i * 12;
    const nameId = buf.readUInt16BE(r + 6);
    if(nameId !== 1 && nameId !== 16) continue;
    const platform = buf.readUInt16BE(r);
    const off = strOff + buf.readUInt16BE(r + 10);
    const raw = buf.slice(off, off + buf.readUInt16BE(r + 8));
    found[nameId] = platform === 3 ? Buffer.from(raw).swap16().toString('utf16le') : raw.toString('latin1');
  }

  /*
   * Prefer the typographic family (16) over the legacy one (1), which is what
   * the renderer matches on. Fraunces ships nameID 1 as "Fraunces SemiBold" and
   * nameID 16 as "Fraunces"; using the former silently falls back to the
   * default family and renders the headline in the wrong face.
   */
  const family = found[16] || found[1];
  if(!family) throw new Error('font declares no family name');
  return family;
}

async function loadFont(request){
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${request}`, { headers: LEGACY_UA })).text();
  const url = (css.match(/url\((https:[^)]+\.ttf)\)/) || [])[1];
  if(!url) throw new Error('no TrueType for ' + request);
  const buffer = Buffer.from(await (await fetch(url, { headers: LEGACY_UA })).arrayBuffer());
  /* resvg 2.x loads fonts from paths, not buffers, so stage them on disk. */
  const file = join(cacheDir, request.replace(/[^a-z0-9]/gi, '_') + '.ttf');
  writeFileSync(file, buffer);
  return { file, family: declaredFamily(buffer) };
}

const spend = consumerSpend.find(d => d.y === 2024).v;
const finance = islamicFinance.find(d => d.y === 2024).v;

let confirmed = 0, total = 0;
for(const k of Object.keys(datasets)){ const r = statusFor([k]); confirmed += r.confirmed; total += r.total; }

const [serif, sans, sansBold] = await Promise.all([
  loadFont('Fraunces:wght@600'),
  loadFont('Scoutie+Sans:wght@400'),
  loadFont('Scoutie+Sans:wght@700'),
]);

const stat = (x, value, label) => `
  <text x="${x}" y="446" font-family="${serif.family}" font-size="62" font-weight="600" fill="#132D28">${value}</text>
  <text x="${x}" y="486" font-family="${sans.family}" font-size="21" fill="#6E837D">${label}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FBFAF6"/>
  <rect x="0" y="0" width="${W}" height="10" fill="#1F7A63"/>

  <text x="80" y="118" font-family="${sansBold.family}" font-size="24" font-weight="700"
        letter-spacing="-0.5" fill="#132D28">The Halal Economy</text>

  <text x="80" y="228" font-family="${serif.family}" font-size="76" font-weight="600" fill="#132D28">A $9 trillion economy,</text>
  <text x="80" y="312" font-family="${serif.family}" font-size="76" font-weight="600" fill="#132D28">mapped country by country.</text>

  <text x="80" y="368" font-family="${sans.family}" font-size="24" fill="#3C5450">Consumer spend, Islamic finance, trade, deals and certification — with every figure sourced.</text>

  ${stat(80, '$' + spend.toFixed(2) + 'T', 'consumer spend, 2024')}
  ${stat(430, '$' + finance.toFixed(2) + 'T', 'Islamic finance assets')}
  ${stat(780, confirmed + '/' + total, 'figures checked against a source')}

  <rect x="80" y="540" width="1040" height="1" fill="#D9E2DD"/>
  <text x="80" y="580" font-family="${sans.family}" font-size="20" fill="#6E837D">Built on DinarStandard SGIE 2025/26, IFSB 2025 and GASTAT</text>
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: {
    fontFiles: [serif.file, sans.file, sansBold.file],
    loadSystemFonts: false,          /* keep the card identical on every machine */
    defaultFontFamily: sans.family,
  },
}).render().asPng();

mkdirSync(new URL('../assets/', import.meta.url), { recursive: true });
writeFileSync(OUT, png);
console.log(`wrote assets/og-image.png — ${W}x${H}, ${(png.length / 1024).toFixed(0)} KB, showing ${confirmed}/${total} figures checked`);

/* Safari ignores SVG favicons, so rasterise the same mark for the touch icon. */
const icon = readFileSync(new URL('../assets/favicon.svg', import.meta.url), 'utf8');
const iconPng = new Resvg(icon, { fitTo: { mode: 'width', value: 180 } }).render().asPng();
writeFileSync(new URL('../assets/apple-touch-icon.png', import.meta.url), iconPng);
console.log(`wrote assets/apple-touch-icon.png — 180x180, ${(iconPng.length / 1024).toFixed(0)} KB`);
