/**
 * The handful of design tokens that chart code has to name in JavaScript.
 *
 * D3 sets `fill` and `stroke` as presentation attributes, so charts cannot
 * reach the CSS custom properties in base.css and have historically pasted the
 * hex values instead. That duplication is how a single token change misses a
 * dozen labels: darkening --muted fixed the page and left every chart caption
 * at the old, failing value.
 *
 * These are the contrast-critical ones — the values whose exact shade is what
 * makes small text and thin marks legible. Keep them identical to base.css.
 */

/** Chart captions, axis titles and annotations. 4.5:1 on paper, panel and #fff. */
export const MUTED = '#5E706B';

/** The primary series colour. */
export const EMERALD = '#1F7A63';

/**
 * The second series colour. Ink rather than gold wherever two series have to be
 * told apart: emerald against gold-ink separates by only dE 13 for a normal-
 * vision reader, where emerald against ink separates by 25.
 */
export const INK = '#132D28';

/**
 * Gold for a chart fill a reader has to resolve — a bar, an arc, a ramp end.
 * 3.5:1 on the white card, and dE 17.8 from --emerald for a normal-vision
 * reader (the pair the charts actually put side by side).
 */
export const GOLD_FILL = '#A88429';

/** Gold that carries meaning: series lines, reference rules, labels. 4.6:1+. */
export const GOLD_INK = '#886A20';

/** Hairline rules inside charts. Decorative: it separates, it never encodes. */
export const HAIR = '#D9E2DD';

/** Secondary label ink, for a chart's own direct labels. */
export const INK_2 = '#3C5450';
