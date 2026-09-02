/**
 * The demand-versus-infrastructure gap, one row per country.
 *
 * A dumbbell rather than a bar chart of assets-per-head: that ratio spans 344x
 * between Bahrain and Indonesia, which no linear bar can show and no log bar
 * may (bar length has to stay proportional). Plotting the two shares instead
 * puts both quantities on one 0-30% scale, and the distance between the dots
 * is the gap itself.
 *
 * Emerald for people, ink for assets. Those two clear the CVD and normal-vision
 * separation checks comfortably; emerald against the page's gold does not, so
 * gold is not used here even though it is the page's usual second data colour.
 */
import { showTip, hideTip, isNarrow } from '../core/dom.js';
import { MUTED, EMERALD, INK, HAIR } from '../core/palette.js';
import { gapRows, WORLD_PER_MUSLIM } from '../data/gap.js';

const money = v => v >= 1000 ? '$' + Math.round(v / 1000) + 'k' : '$' + Math.round(v);

/** "58x the world average" / "a fifth of it", whichever way the ratio runs. */
const vsWorld = r => r >= 1
  ? r.toFixed(r >= 10 ? 0 : 1) + '× the world average'
  : '1/' + (1 / r).toFixed(1) + ' of the world average';

export function drawGapChart(){
  const svg = d3.select('#gapChart');
  if(svg.empty()) return;
  svg.selectAll('*').remove();

  const data = gapRows();
  const narrow = isNarrow();
  const W = narrow ? 340 : 700, mL = narrow ? 96 : 150, mR = narrow ? 68 : 124, mT = 34, rowH = 30;
  const H = mT + data.length * rowH + 34;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const x = d3.scaleLinear().domain([0, 28]).range([mL, W - mR]);

  svg.append('g').attr('class', 'grid').selectAll('line').data(x.ticks(narrow ? 4 : 7)).join('line')
    .attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', mT - 12).attr('y2', mT + data.length * rowH - 12);

  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${mT + data.length * rowH - 8})`)
    .call(d3.axisBottom(x).ticks(narrow ? 4 : 7).tickFormat(d => d + '%').tickSize(0))
    .select('.domain').remove();

  const rows = svg.append('g').selectAll('g').data(data, d => d.label).join('g')
    .attr('transform', (d, i) => `translate(0,${mT + i * rowH})`)
    .attr('tabindex', 0)
    .attr('aria-label', d => `${d.label}: ${d.peopleShare.toFixed(2)}% of the world's Muslims, ` +
      `${d.assetShare}% of Islamic finance assets, ${money(d.perMuslim)} per Muslim, ${vsWorld(d.ratio)}`);

  rows.append('text').attr('class', 'bar-label').attr('x', mL - 12).attr('y', 4).attr('text-anchor', 'end')
    .text(d => narrow && d.label === 'United Arab Emirates' ? 'UAE' : d.label);

  /* The connector is the measurement; it stays recessive so the dots read. */
  rows.append('line').attr('stroke', HAIR).attr('stroke-width', 3).attr('stroke-linecap', 'round')
    .attr('y1', 0).attr('y2', 0)
    .attr('x1', d => x(Math.min(d.peopleShare, d.assetShare)))
    .attr('x2', d => x(Math.max(d.peopleShare, d.assetShare)));

  /* A 2px surface ring keeps the two dots readable where they nearly touch. */
  const dot = (key, fill) => rows.append('circle').attr('r', 5.5).attr('cy', 0)
    .attr('fill', fill).attr('stroke', '#fff').attr('stroke-width', 2)
    .attr('cx', d => x(d[key]));

  dot('peopleShare', EMERALD);
  dot('assetShare', INK);

  rows.append('text').attr('class', 'bar-val').attr('x', W - mR + 8).attr('y', 4)
    .text(d => money(d.perMuslim));

  rows.on('mousemove focus', (e, d) => {
    const b = e.target.getBoundingClientRect();
    showTip(
      `<b>${d.label}</b><br>${d.pop}M Muslims — ${d.peopleShare.toFixed(2)}% of the world's` +
      `<br>${d.assetShare}% of global Islamic finance assets` +
      `<br><b>${money(d.perMuslim)}</b> per Muslim, ${vsWorld(d.ratio)}`,
      b.left + b.width / 2, b.top,
    );
  }).on('mouseleave blur', hideTip);

  svg.append('text').attr('x', narrow ? 0 : mL).attr('y', 16).attr('fill', MUTED).attr('font-size', 11)
    .text(narrow ? `World average ${money(WORLD_PER_MUSLIM)} per Muslim`
                 : `Share of a world total. World average: ${money(WORLD_PER_MUSLIM)} of Islamic finance assets per Muslim.`);

  svg.attr('aria-label',
    'Dumbbell chart comparing each country’s share of the world’s Muslims with its share of global ' +
    'Islamic finance assets. ' + data.map(d => `${d.label} ${d.peopleShare.toFixed(2)}% of people versus ` +
    `${d.assetShare}% of assets`).join('; ') + '.');
}
