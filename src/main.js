/**
 * Entry point. Every other module exports functions and wires nothing on
 * import, so this file alone decides what happens and in what order.
 *
 * Two phases:
 *   wire()  — bind listeners and draw the static charts
 *   boot()  — restore state from the URL and render everything that depends on it
 *
 * URL writes stay suppressed until boot() finishes, so restoring a link never
 * rewrites the link that was opened.
 */
import { state, readURL, writeURL, enableURLWrites, initCopyLink } from './core/state.js';
import { captureDefaults, setLang, initLanguageSwitcher } from './core/i18n.js';

import { initProvenance } from './features/provenance.js';
import { initReferences } from './features/references.js';
import { initCite } from './features/cite.js';
import { initAudience, applyAudience } from './features/audience.js';
import { initKpiCounters } from './features/kpi.js';
import { initMapPanel, setMainLayer, pinCountry } from './features/map-panel.js';
import { initSearch } from './features/search.js';
import { initExports } from './features/exports.js';
import { initCompare, renderCompare, addToCompare } from './features/compare.js';
import { initCertifiers } from './features/certifiers.js';
import { initDeals } from './features/deals.js';
import { initEntryHelper } from './features/entry-helper.js';
import { initStory, initStoryPicker, repaintStoryMap } from './features/story.js';
import { initViewToggle, setView, registerStoryInit } from './features/view.js';
import { initTour } from './features/tour.js';
import { initChangelogModal } from './features/modal.js';
import { initNavMenu } from './features/nav-menu.js';
import { initSectionNav, initBackToTop, initNavOffset } from './features/section-nav.js';
import { initDownloads } from './features/downloads.js';

import { NARROW } from './core/dom.js';
import { setYear, initYearSwitcher, drawSectorBars } from './charts/sector-bars.js';
import { drawGrowthScatter } from './charts/growth-scatter.js';
import { drawHeatmap } from './charts/heatmap.js';
import { drawTrajectory } from './charts/trajectory.js';
import { drawFinanceCharts } from './charts/finance.js';
import { drawRankings } from './charts/rankings.js';
import { drawImportsChart } from './charts/imports.js';
import { drawGapChart } from './charts/gap.js';
import { drawSukukChart } from './charts/sukuk.js';

/**
 * Rendered markup asks for cross-feature actions through data attributes
 * rather than inline handlers, which modules cannot expose. One listener
 * here is the only place those two features meet.
 */
function initActions(){
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if(!b) return;
    if(b.dataset.act === 'compare') addToCompare(b.dataset.c);
    if(b.dataset.act === 'pin') pinCountry(b.dataset.c, b.dataset.scroll === '1');
  });
}

/**
 * Charts pick their layout from the viewport width, so crossing that
 * breakpoint — a rotation, a resized window — has to redraw them. Each of
 * these clears its own SVG first, so calling them again is safe.
 */
function initResponsiveCharts(){
  const q = matchMedia(NARROW);
  const redraw = () => { drawSectorBars(); drawGrowthScatter(); drawTrajectory(); drawRankings(); drawImportsChart(); drawGapChart(); drawSukukChart(); };
  if(q.addEventListener) q.addEventListener('change', redraw);
}

function wire(){
  initCopyLink();
  captureDefaults();          /* must precede any setLang call */
  initLanguageSwitcher();
  initProvenance();
  initReferences();
  initCite();
  initAudience();
  initKpiCounters();

  initMapPanel();
  initSearch();
  document.getElementById('cb').addEventListener('change', e => {
    state.cb = e.target.checked;
    setMainLayer(state.layer);
    repaintStoryMap();
  });

  initExports();
  initYearSwitcher();

  drawGrowthScatter();
  drawHeatmap();
  drawTrajectory();
  drawFinanceCharts();
  drawSukukChart();
  drawGapChart();
  drawRankings();
  drawImportsChart();

  initCompare();
  initCertifiers();
  initDeals();
  initEntryHelper();

  registerStoryInit(initStory);
  initStoryPicker();
  initViewToggle();
  initTour();
  initChangelogModal();
  initDownloads();
  initNavMenu();
  initNavOffset();
  initSectionNav();
  initBackToTop();
  initActions();
  initResponsiveCharts();
}

function boot(){
  readURL();
  setLang(state.lang);
  document.getElementById('cb').checked = state.cb;

  setMainLayer(state.layer);
  setYear(state.year);
  applyAudience();
  renderCompare();
  if(state.pin) pinCountry(state.pin);
  if(state.view === 'story') setView('story');

  enableURLWrites();
  writeURL();

  /* Deep links to a section need the charts laid out first. */
  if(location.hash){
    const t = document.querySelector(location.hash);
    if(t) setTimeout(() => t.scrollIntoView(), 200);
  }
}

wire();
boot();
