/**
 * Story mode: a scrollytelling view where a sticky graphic responds to the
 * step scrolled into the middle of the viewport.
 *
 * Two stories share the machinery. "gap" drives the map (layer + highlight
 * per step); "hajj" drives a line chart revealed year by year. Everything is
 * built lazily on first entry, because most visitors never open this view.
 *
 * Scroll is the primary way through, but never the only way: a rail of step
 * markers, previous/next buttons and arrow keys all move the same state, and
 * the step index lives in the URL so any moment can be linked to.
 */
import { state, writeURL } from '../core/state.js';
import { reduceMotion, showTip, hideTip, toast } from '../core/dom.js';
import { stories } from '../content/stories.js';
import { storyStats } from '../content/story-stats.js';
import { createMap, layers } from './map.js';
import { setAudience } from './audience.js';
import { setView } from './view.js';
import { pinCountry } from './map-panel.js';
import { addToCompare } from './compare.js';
import { applyVerificationMarks } from './provenance.js';
import { buildStoryChart } from '../charts/story-chart.js';

const AUDIENCE_LABELS = { public: 'General public', investor: 'Investor', policy: 'Policymaker', business: 'Business owner' };

let storyMap = null;
let storyBuilt = false;
let storyObserver = null;
let storyChartApi = null;
let step = 0;

/** Let main.js repaint the story map when the colour-blind ramp is toggled. */
export function repaintStoryMap(){ if(storyMap) storyMap.repaint(); }

const currentStory = () => stories[state.story];
const scrollOpts = { behavior: reduceMotion ? 'auto' : 'smooth' };

/* ---------- the sticky graphic ---------- */

/** The map layer the active step is showing, so hover readouts match it. */
function activeLayer(){
  const s = currentStory();
  return (s.graphic === 'map' && s.steps[step] && s.steps[step].layer) || 'pop';
}

function mapTip(c){
  const L = layers[activeLayer()];
  const v = L.get(c);
  return `<b>${c.label}</b><br>${L.hint.split(',')[0]}: ${v != null ? L.fmt(v) : 'no data'}`;
}

/* ---------- step actions: the bridge back to the dashboard ---------- */

function runAction(act, args){
  if(act === 'compare'){
    args.forEach(addToCompare);
    setView('dashboard');
    return;
  }
  if(act === 'pin'){
    setView('dashboard');
    pinCountry(args[0], true);
    return;
  }
  if(act === 'section'){
    setView('dashboard');
    const target = document.getElementById(args[0]);
    if(target) setTimeout(() => target.scrollIntoView(scrollOpts), 80);
  }
}

/* ---------- navigation ---------- */

export function goToStep(i){
  const s = currentStory();
  const clamped = Math.max(0, Math.min(s.steps.length - 1, i));
  const el = document.querySelector(`.step[data-i="${clamped}"]`);
  if(el) el.scrollIntoView({ ...scrollOpts, block: 'center' });
  activateStep(clamped);
}

function renderRail(){
  const s = currentStory();
  const rail = document.getElementById('storyRail');
  rail.innerHTML = s.steps.map((st, i) =>
    `<li><button data-step="${i}" aria-label="Step ${i + 1} of ${s.steps.length}: ${st.title.replace(/"/g, '&quot;')}"></button></li>`
  ).join('');
  rail.querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => goToStep(+b.dataset.step)));
}

function markRail(){
  const s = currentStory();
  document.querySelectorAll('#storyRail button').forEach((b, i) => {
    b.classList.toggle('done', i < step);
    b.classList.toggle('active', i === step);
    if(i === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  document.getElementById('stepPrev').disabled = step === 0;
  document.getElementById('stepNext').disabled = step === s.steps.length - 1;
  document.getElementById('storyCount').textContent = `${step + 1} / ${s.steps.length}`;
}

/* ---------- rendering ---------- */

function stepActions(st){
  const parts = [];
  if(st.acts) parts.push(...st.acts.map((a, i) =>
    `<button class="chip act" data-act-i="${i}">${a.label}</button>`));
  if(st.cta) parts.push(...Object.keys(AUDIENCE_LABELS).map(a =>
    `<button class="chip" data-go="${a}">${AUDIENCE_LABELS[a]}</button>`));
  return parts.length ? `<div class="ctas">${parts.join('')}</div>` : '';
}

function renderEnd(){
  const otherKey = Object.keys(stories).find(k => k !== state.story);
  const other = stories[otherKey];
  document.getElementById('storyEnd').innerHTML =
    `<p class="story-end-kicker">End of the story</p>` +
    `<h3>Now go and argue with the numbers.</h3>` +
    `<p>Every figure here is on the dashboard with its source, and marked for whether it has been checked.</p>` +
    `<div class="story-end-actions">` +
      `<button class="chip primary" data-end="dashboard">Explore the dashboard</button>` +
      `<button class="chip" data-end="other">Read “${other.title.replace(/[.:]$/, '')}”</button>` +
    `</div>`;

  document.querySelector('[data-end="dashboard"]').addEventListener('click', () => setView('dashboard'));
  document.querySelector('[data-end="other"]').addEventListener('click', () => setStory(otherKey));
}

export function setStory(key, atStep = 0){
  state.story = key;
  step = 0;
  state.step = atStep;
  const s = stories[key];
  document.querySelectorAll('.story-pick button').forEach(b => b.classList.toggle('active', b.dataset.story === key));

  document.getElementById('siKicker').textContent = s.kicker;
  document.getElementById('siTitle').textContent = s.title;
  document.getElementById('siBody').textContent = s.body;
  document.getElementById('storyMap').style.display = s.graphic === 'map' ? '' : 'none';
  document.getElementById('storyChart').style.display = s.graphic === 'chart' ? '' : 'none';

  const wrap = document.getElementById('steps');
  wrap.innerHTML = s.steps.map((st, i) =>
    `<div class="step" data-i="${i}"><div class="step-inner">` +
    `<div class="snum">${i + 1} / ${s.steps.length}</div><h3>${st.title}</h3><p>${st.body}</p>` +
    stepActions(st) +
    `</div></div>`
  ).join('');

  /* Mid-story hooks: act on what the step just described, without waiting for the end. */
  wrap.querySelectorAll('[data-act-i]').forEach(b => b.addEventListener('click', () => {
    const st = s.steps[+b.closest('.step').dataset.i];
    const a = st.acts[+b.dataset.actI];
    runAction(a.act, a.args);
  }));

  /* The closing step hands the reader back to the dashboard in their own voice. */
  wrap.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    setAudience(b.dataset.go);
    setView('dashboard');
    setTimeout(() => document.getElementById('takeaways').scrollIntoView(scrollOpts), 80);
  }));

  renderRail();
  renderEnd();

  /* Fire when a step reaches the middle band of the viewport. */
  if(storyObserver) storyObserver.disconnect();
  storyObserver = new IntersectionObserver(entries => {
    entries.forEach(en => { if(en.isIntersecting) activateStep(+en.target.dataset.i); });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  wrap.querySelectorAll('.step').forEach(e => storyObserver.observe(e));

  if(s.graphic === 'chart') storyChartApi = buildStoryChart();

  const pending = atStep;
  activateStep(0);
  writeURL();

  if(pending > 0 && pending < s.steps.length) setTimeout(() => goToStep(pending), 60);
  else window.scrollTo({ top: 0, ...scrollOpts });
}

function activateStep(i){
  const s = currentStory();
  const st = s.steps[i];
  if(!st) return;
  step = i;
  state.step = i;

  document.querySelectorAll('.step').forEach(e => e.classList.toggle('active', +e.dataset.i === i));
  markRail();

  if(s.graphic === 'map' && storyMap){
    storyMap.setLayer(st.layer);
    storyMap.setHighlight(st.hl);
    document.getElementById('storyLayer').textContent = 'Map layer: ' + layers[st.layer].hint;
  }
  if(s.graphic === 'chart' && storyChartApi){
    storyChartApi.show(st.upto);
    document.getElementById('storyLayer').textContent = 'Source: Saudi General Authority for Statistics';
  }

  const n = document.getElementById('storyN');
  const stat = st.stat ? storyStats[st.stat] : null;
  n.style.opacity = 0;
  setTimeout(() => {
    n.innerHTML = stat ? stat.html() : '';
    document.getElementById('storyL').textContent = st.l || '';
    n.style.opacity = 1;

    /* Same provenance treatment the charts get, pointed at this step's figures. */
    const marker = document.getElementById('storySrc');
    marker.hidden = !stat;
    if(stat){
      marker.dataset.s = stat.src;
      marker.dataset.k = stat.kind;
      marker.dataset.fig = stat.figs.join(' ');
      applyVerificationMarks();
    }
  }, reduceMotion ? 0 : 150);

  writeURL();
}

/** Built on first entry into story mode; a no-op afterwards. */
export function initStory(){
  if(storyBuilt) return;
  storyBuilt = true;

  storyMap = createMap('#storyMap', {
    /* Readers should be able to interrogate the map the story is talking about. */
    interactive: true,
    onHover: (c, e) => { if(e) showTip(mapTip(c), e.clientX, e.clientY); },
    onLeave: hideTip,
    onClick: c => {
      pinCountry(c.label);
      toast(`${c.label} pinned — it will be selected on the dashboard.`);
    },
    onFail: () => {
      document.getElementById('storyMap').outerHTML =
        '<div class="map-fallback" style="display:block">The map outlines couldn\'t load here; the story still works with the figures below.</div>';
    },
  });

  setStory(state.story, state.step || 0);
}

export function initStoryPicker(){
  document.querySelectorAll('.story-pick button').forEach(b =>
    b.addEventListener('click', () => setStory(b.dataset.story)));

  document.getElementById('stepPrev').addEventListener('click', () => goToStep(step - 1));
  document.getElementById('stepNext').addEventListener('click', () => goToStep(step + 1));

  document.addEventListener('keydown', e => {
    if(state.view !== 'story') return;
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); goToStep(step + 1); }
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); goToStep(step - 1); }
  });
}
