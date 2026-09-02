/**
 * Regenerate tests/confirmed-figures.json from the current `verified` flags.
 *
 * Run this ONLY after genuinely re-checking a figure against its source. The
 * pin file is what stops an edited figure from carrying an old confirmation
 * forward, so regenerating it to silence a failing test defeats the point.
 */
import { writeFileSync } from 'fs';
import { enumerateConfirmed } from '../src/data/verification.js';

const out = new URL('../tests/confirmed-figures.json', import.meta.url);
const confirmed = enumerateConfirmed();

writeFileSync(out, JSON.stringify(confirmed, null, 2) + '\n');
console.log(`pinned ${confirmed.length} confirmed figures to tests/confirmed-figures.json`);
