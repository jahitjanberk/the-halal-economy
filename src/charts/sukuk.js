/**
 * IIFM sukuk issuance, 2023 to 2024.
 *
 * A slope chart: two years, two series, and the whole point is that they moved
 * in opposite directions — international issuance to its highest level on
 * record while short-term issuance fell. A grouped bar would put four bars in a
 * row and leave the reader to work out the crossing.
 *
 * Emerald and ink for the same reason as the gap chart: they are the pair that
 * clears the separation checks.
 */
import { showTip, hideTip, isNarrow, reduceMotion } from '../core/dom.js';
import { MUTED, EMERALD, INK, INK_2 } from '../core/palette.js';
import { sukukIssuance } from '../data/series.js';

const SERIES = [
  { key: 'intl',  label: 'International', colour: EMERALD },
  { key: 'short', label: 'Short-term',    colour: INK },
];

export function drawSukukChart(){
  const svg = d3.select('#sukuk');
  if(svg.empty()) return;
  svg.selectAll('*').remove();

  const narrow = isNarrow();
  const W = 320, H = 260, mL = 34, mR = narrow ? 74 : 84, mT = 26, mB = 34;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const years = sukukIssuance.map(d => d.y);
  const x = d3.scalePoint().domain(years).range([mL + 18, W - mR]);
  const y = d3.scaleLinear().domain([0, 80]).range([H - mB, mT]);

  svg.append('g').attr('class', 'grid').selectAll('line').data(y.ticks(4)).join('line')
    .attr('x1', mL).attr('x2', W - mR + 10).attr('y1', d => y(d)).attr('y2', d => y(d));

  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - mB})`)
    .call(d3.axisBottom(x).tickFormat(d3.format('d')).tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${mL},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(d => '$' + d + 'B').tickSize(0)).select('.domain').remove();

  const line = d3.line().x(d => x(d.y)).y(d => y(d.v));

  const ends = [];

  for(const s of SERIES){
    const pts = sukukIssuance.map(d => ({ y: d.y, v: d[s.key] }));
    const path = svg.append('path').attr('d', line(pts)).attr('fill', 'none')
      .attr('stroke', s.colour).attr('stroke-width', 2.5).attr('stroke-linecap', 'round');

    if(!reduceMotion){
      const len = path.node().getTotalLength?.() || 0;
      if(len) path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
        .transition().duration(700).ease(d3.easeCubicOut).attr('stroke-dashoffset', 0);
    }

    svg.append('g').selectAll('circle').data(pts).join('circle')
      .attr('cx', d => x(d.y)).attr('cy', d => y(d.v)).attr('r', 5)
      .attr('fill', s.colour).attr('stroke', '#fff').attr('stroke-width', 2)
      .attr('tabindex', 0).attr('aria-label', d => `${s.label} sukuk ${d.y}: $${d.v} billion`)
      .on('mousemove focus', (e, d) => {
        const b = e.target.getBoundingClientRect();
        showTip(`<b>${s.label} sukuk, ${d.y}</b><br>$${d.v}B issued`, b.left + b.width / 2, b.top);
      }).on('mouseleave blur', hideTip);

    ends.push({ label: s.label, v: pts[pts.length - 1].v, at: y(pts[pts.length - 1].v) });
  }

  /*
   * Direct labels, so identity never rests on colour alone — but the two 2024
   * values are close enough that their two-line blocks would overlap. Place
   * them from their own endpoints, then push apart to a legible gap.
   */
  const GAP = 30;
  ends.sort((a, b) => a.at - b.at);
  if(ends[1].at - ends[0].at < GAP){
    const mid = (ends[0].at + ends[1].at) / 2;
    ends[0].at = mid - GAP / 2;
    ends[1].at = mid + GAP / 2;
  }
  for(const e of ends){
    svg.append('text').attr('x', x(2024) + 10).attr('y', e.at - 2)
      .attr('font-size', 11.5).attr('font-weight', 600).attr('fill', INK_2).text(e.label);
    svg.append('text').attr('x', x(2024) + 10).attr('y', e.at + 12)
      .attr('font-size', 11.5).attr('fill', MUTED).text('$' + e.v + 'B');
  }

  svg.append('text').attr('x', 0).attr('y', H - 6).attr('font-size', 10.5).attr('fill', MUTED)
    .text('IIFM Sukuk Report, 14th edition. $205B issued in total in 2024.');

  svg.attr('aria-label',
    'Slope chart of sukuk issuance. International issuance rose from $52.7B in 2023 to $65.6B in 2024, ' +
    'its highest on record, while short-term issuance fell from $72.7B to $59.1B.');
}
