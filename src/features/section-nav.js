/**
 * Tells you where you are: marks the nav link for whichever section currently
 * occupies the middle of the viewport, and provides the back-to-top control.
 *
 * Ten sections behind a sticky nav is too many to hold in your head.
 */
import { reduceMotion } from '../core/dom.js';
import { setView } from './view.js';

const TOP_AFTER = 700;   // px scrolled before the back-to-top button earns its place

export function initSectionNav(){
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  if(!links.length) return;

  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const sections = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);

  let current = null;
  function mark(id){
    if(id === current) return;
    current = id;
    links.forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('active', on);
      if(on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  /*
   * Track the section nearest the middle of the viewport rather than the first
   * one intersecting — with sections this tall, several are in view at once and
   * "first intersecting" flickers between them.
   */
  const observer = new IntersectionObserver(() => {
    /* Story mode hides #dashboardView, leaving every section a zero-size rect —
       without this the nav would still light one up. */
    if(document.body.classList.contains('story-mode')){ mark(null); return; }

    const mid = window.innerHeight / 2;
    let best = null, bestDist = Infinity;
    for(const s of sections){
      const r = s.getBoundingClientRect();
      if(!r.height) continue;
      if(r.bottom < 0 || r.top > window.innerHeight) continue;
      const dist = Math.abs(r.top + r.height / 2 - mid);
      if(dist < bestDist){ bestDist = dist; best = s; }
    }
    if(best) mark(best.id);
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

  sections.forEach(s => observer.observe(s));

  /* A section link pressed from story mode has nothing to scroll to, so bring
     the dashboard back first and then jump. */
  links.forEach(a => a.addEventListener('click', e => {
    if(!document.body.classList.contains('story-mode')) return;
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    setView('dashboard');
    const target = document.getElementById(id);
    if(target) setTimeout(() => target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }), 60);
  }));
}

/**
 * The nav is sticky and its height changes with the viewport — on a phone the
 * section list drops onto its own row. Anything that has to clear it (anchor
 * scroll offsets, story mode's sticky panel) reads --navh rather than guessing.
 */
export function initNavOffset(){
  const nav = document.querySelector('.nav');
  if(!nav) return;
  const apply = () => {
    const h = Math.round(nav.getBoundingClientRect().height);
    if(h) document.documentElement.style.setProperty('--navh', h + 'px');
  };
  apply();
  if(typeof ResizeObserver === 'function') new ResizeObserver(apply).observe(nav);
  else window.addEventListener('resize', apply);
}

export function initBackToTop(){
  const btn = document.getElementById('toTop');
  if(!btn) return;

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    /* Send focus back to the top of the document, not just the pixels. */
    const main = document.getElementById('main');
    if(main) main.focus({ preventScroll: true });
  });

  let shown = false;
  const update = () => {
    const should = window.scrollY > TOP_AFTER && !document.body.classList.contains('story-mode');
    if(should === shown) return;
    shown = should;
    btn.hidden = !should;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}
