/**
 * Count-up animation on the hero KPI figures. Skipped entirely when the
 * viewer prefers reduced motion.
 */
import { reduceMotion } from '../core/dom.js';

export function initKpiCounters(){
  document.querySelectorAll('.kpi .num[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count), dec = +el.dataset.dec;
    /* Animate the bare text node so any markup around it (e.g. "$", "T") survives. */
    const node = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim().length);
    if(reduceMotion){ node.nodeValue = target.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1100;
    (function frame(now){
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      node.nodeValue = (target * e).toFixed(dec);
      if(t < 1) requestAnimationFrame(frame);
    })(t0);
  });
}
