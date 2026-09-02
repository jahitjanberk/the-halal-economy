/**
 * Write the dataset to assets/data/ as static files.
 *
 * A hub has to be fetchable without running its JavaScript: crawlers, other
 * researchers' scripts and the noscript fallback all need a plain URL. These
 * are generated from the same builders the download buttons use, so the file a
 * crawler fetches and the file a reader downloads cannot diverge.
 *
 *   npm run data
 */
import { writeFileSync, mkdirSync } from 'fs';
import { FILES } from '../src/data/bundle.js';

const dir = new URL('../assets/data/', import.meta.url);
mkdirSync(dir, { recursive: true });

for(const [name, build] of Object.entries(FILES)){
  const body = build();
  writeFileSync(new URL(name, dir), body);
  console.log(`  ${name.padEnd(34)} ${(body.length / 1024).toFixed(1)} KB`);
}
