/**
 * The guided tour: ten steps that drive the real dashboard controls rather
 * than a mock-up, so the viewer ends up with the state each step describes.
 *
 * Each step names a section to spotlight and a `set` that puts the dashboard
 * into the matching state. Exiting resets to the default view.
 */
import { state } from '../core/state.js';
import { reduceMotion } from '../core/dom.js';
import { setMainLayer, pinCountry } from './map-panel.js';
import { setYear } from '../charts/sector-bars.js';
import { renderCompare } from './compare.js';
import { setView } from './view.js';
import { lendFocus } from '../core/dialog.js';

const tourSteps=[
  {target:'#map-section',set:()=>{ setMainLayer('pop'); pinCountry('Indonesia'); },text:'<b>Start with demand.</b> This layer shows where Muslims live. Indonesia alone has 236 million — the world\'s largest Muslim population and its largest halal food market.'},
  {target:'#map-section',set:()=>{ setMainLayer('giei'); pinCountry('Malaysia'); },text:'<b>Now switch the lens to infrastructure.</b> Malaysia has a tenth of Indonesia\'s Muslims but has topped the ecosystem ranking for twelve years. Demand and capability live in different places.'},
  {target:'#sectors',set:()=>{ setYear(2029); },text:'<b>Six sectors, one anchor.</b> Food is nearly 60% of the $2.6 trillion. The bars show the 2029 forecast — travel, in gold, grows at 11% a year while food grows at 6%. Below, the heatmap shows who leads each sector.'},
  {target:'#growth',set:()=>{},text:'<b>Two curves, two speeds.</b> Consumer spend has risen steadily through a pandemic and inflation. Islamic finance assets, in gold, added a trillion dollars in one year and are forecast to reach $9.7T by 2029.'},
  {target:'#finance',set:()=>{},text:'<b>Inside the $6 trillion.</b> Three-quarters is banking, but sukuk issuance grew fastest in 2024. Saudi Arabia, Iran and Malaysia hold about 70% of everything.'},
  {target:'#countries',set:()=>{},text:'<b>Who leads, who moves.</b> The GIEI rewards coordination over size. Watch the UAE climb from 4th to 2nd in the bump chart; Pakistan just entered the top ten; the UK ranks 14th.'},
  {target:'#compare',set:()=>{ state.cmp=['Indonesia','Malaysia','']; renderCompare(); },text:'<b>Compare any countries side by side.</b> Green marks the strongest value in each row. Indonesia wins on people; Malaysia wins on almost everything else.'},
  {target:'#trade',set:()=>{},text:'<b>Follow the goods.</b> $421B of halal imports into OIC countries, mostly from Brazil, India, Russia and the US. The certification directory on the right is the gate every shipment passes through.'},
  {target:'#business',set:()=>{},text:'<b>Try the entry helper.</b> Three questions produce a shortlist scored on this page\'s data, with the relevant certifier and financing note for each market.'},
  {target:'#takeaways',set:()=>{},text:'<b>Make it yours.</b> The perspective switcher at the top reframes every chart for the public, investors, policymakers or business owners. Then copy the link — it preserves your exact view — or download the data.'}
];

let tourI = -1;
let tourFocusEl = null;
let releaseFocus = null;

function tourGo(i){
  if(i < 0 || i >= tourSteps.length){ tourEnd(); return; }
  tourI = i;
  const s = tourSteps[i];
  if(tourFocusEl) tourFocusEl.classList.remove('tour-focus');
  const e = document.querySelector(s.target);
  tourFocusEl = e;
  e.classList.add('tour-focus');
  s.set();
  e.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  document.getElementById('tourStep').textContent = `Step ${i + 1} of ${tourSteps.length}`;
  document.getElementById('tourText').innerHTML = s.text;
  document.getElementById('tourBack').disabled = i === 0;
  document.getElementById('tourNext').textContent = i === tourSteps.length - 1 ? 'Finish' : 'Next';
}

function tourStart(){
  setView('dashboard');
  document.getElementById('tour').classList.add('show');
  tourGo(0);
  /* Lend, don't trap: the tour is about the page behind it. */
  releaseFocus = lendFocus(document.getElementById('tour'), document.getElementById('tourNext'), document.getElementById('tourStart'));
}

function tourEnd(){
  document.getElementById('tour').classList.remove('show');
  if(tourFocusEl) tourFocusEl.classList.remove('tour-focus');
  tourFocusEl = null;
  tourI = -1;
  pinCountry(null);
  setYear(2024);
  setMainLayer('pop');
  if(releaseFocus){ releaseFocus(); releaseFocus = null; }
}

/** Typing in a field must not drive the tour. */
const isTyping = el => el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);

export function initTour(){
  document.getElementById('tourStart').addEventListener('click', tourStart);
  document.getElementById('tourNext').addEventListener('click', () => tourGo(tourI + 1));
  document.getElementById('tourBack').addEventListener('click', () => tourGo(tourI - 1));
  document.getElementById('tourExit').addEventListener('click', tourEnd);
  document.addEventListener('keydown', e => {
    if(tourI < 0) return;
    if(e.key === 'Escape'){ tourEnd(); return; }
    if(isTyping(e.target)) return;
    if(e.key === 'ArrowRight' || e.key === 'Enter') tourGo(tourI + 1);
    else if(e.key === 'ArrowLeft') tourGo(tourI - 1);
  });
}
