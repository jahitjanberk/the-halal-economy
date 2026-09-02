/**
 * Serve the world-atlas TopoJSON from a local fixture during tests.
 *
 * The map fetches its outlines from a CDN. Under jsdom that request comes back
 * compressed and undecoded — `r.json()` throws on the raw bytes — and map.js
 * swallows the error in its `onFail` path and quietly shows the fallback. The
 * result was three checks that had been red for so long they read as network
 * flakiness, while the map they cover went genuinely untested.
 *
 * Stubbing the atlas fixes both halves: the map renders under test, and it
 * renders from a pinned file rather than whatever the CDN serves today, so a
 * failure means our code broke rather than someone else's deploy.
 *
 * Call this BEFORE importing src/main.js — map.js fetches at module scope.
 */
import { readFileSync } from 'fs';

export const ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const fixture = readFileSync(new URL('fixtures/countries-110m.json', import.meta.url), 'utf8');

/**
 * Returns `{ requested() }` so a test can still assert the map asked for the
 * atlas at all — the thing smoke.test.mjs was checking before.
 */
export function stubAtlas(){
  const nativeFetch = globalThis.fetch;
  let requested = false;

  globalThis.fetch = (url, ...rest) => {
    if(String(url) === ATLAS){
      requested = true;
      return Promise.resolve(new Response(fixture, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    return nativeFetch(url, ...rest);
  };

  return { requested: () => requested };
}
