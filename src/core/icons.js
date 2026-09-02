/**
 * The verification marker icons.
 *
 * Confirmed uses the scalloped-rosette "verified" badge: a many-sided polygon
 * whose vertices alternate between two close radii, which is what gives the
 * petalled edge. Drawn from geometry rather than a hand-tuned path so the point
 * count and depth stay adjustable.
 *
 * Shape carries the category and colour carries the emphasis:
 *   ok    rosette + tick   — every figure checked
 *   part  rosette + dash   — some checked (a tick here would overclaim)
 *   no    circle  + query  — a different shape, because nothing was checked
 */

/** Vertices alternating between `outer` and `inner`, as an SVG points list. */
export function rosettePoints(points = 12, outer = 11.4, inner = 9.4, cx = 12, cy = 12){
  const step = Math.PI / points;
  const out = [];
  for(let i = 0; i < points * 2; i++){
    const r = i % 2 ? inner : outer;
    const a = i * step - Math.PI / 2;
    out.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(' ');
}

const MARK = {
  ok:   '<path d="M7.7 12.2 L10.6 15.1 L16.5 8.9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  part: '<path d="M8.2 12 H15.8" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>',
  no:   '<text x="12" y="12.6" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700" fill="#fff">?</text>',
};

/**
 * Icon markup for a verification level. `currentColor` fills the body, so the
 * colour is set by CSS on the marker rather than baked in here.
 */
export function verificationIcon(level){
  const body = level === 'no'
    ? '<circle cx="12" cy="12" r="10.6" fill="currentColor"/>'
    : `<polygon points="${rosettePoints()}" fill="currentColor"/>`;

  return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">${body}${MARK[level] || ''}</svg>`;
}
