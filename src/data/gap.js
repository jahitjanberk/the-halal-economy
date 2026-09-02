/**
 * The demand-versus-infrastructure gap, per country.
 *
 * Every other figure on the page is something a publisher printed. This one is
 * not: it is arithmetic over three figures already carried here, and it is the
 * only place the page says something none of its sources say.
 *
 * For each country it puts two shares of the same world total side by side:
 *
 *   peopleShare  its Muslim population as a share of the world's ~2bn Muslims
 *   assetShare   its share of global Islamic finance assets (as published)
 *
 * Both are percentages of a global total, so they sit on one scale and the
 * distance between them is readable directly. A country to the right of its own
 * population share holds more of the industry than its population would imply;
 * to the left, less.
 *
 * Deliberately NOT "spend per head": the page holds no country-level consumer
 * spend — sector spend is worldwide only — so that figure cannot be derived
 * without inventing it.
 *
 * Provenance, and why this is worth having: `fin` comes from Global Finance /
 * LSEG, `pop` from Pew, the asset total from the IFSB. No DinarStandard input,
 * so the one original analysis here does not inherit the page's dependence on a
 * single publisher.
 */
import { countries } from './countries.js';

/**
 * World Muslim population, millions. Pew, rounded — the same "two billion"
 * already cited in the hero. Rounded input, so every figure derived from it is
 * an approximation and is labelled as one.
 */
export const WORLD_MUSLIMS = 2000;

/** Global Islamic finance assets, USD billions, 2024. IFSB. */
export const GLOBAL_ASSETS = 5990;

/** Assets per Muslim worldwide — the line a country is measured against. */
export const WORLD_PER_MUSLIM = (GLOBAL_ASSETS * 1e9) / (WORLD_MUSLIMS * 1e6);

/**
 * One row per country that publishes both an asset share and a population,
 * widest surplus first. `ratio` is how far the country sits from the world
 * average of roughly $3,000 of Islamic finance assets per Muslim.
 */
export function gapRows(){
  return countries
    .filter(c => c.fin != null && c.pop != null)
    .map(c => {
      const peopleShare = c.pop / WORLD_MUSLIMS * 100;
      const perMuslim = (c.fin / 100 * GLOBAL_ASSETS * 1e9) / (c.pop * 1e6);
      return {
        label: c.label,
        peopleShare,
        assetShare: c.fin,
        pop: c.pop,
        perMuslim,
        ratio: perMuslim / WORLD_PER_MUSLIM,
        /* Derived from two reported figures, so it is only as confirmed as
           the weaker of them. `pop` is confirmed nowhere in the country table,
           which is why no row here claims to be. */
        verified: false,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
