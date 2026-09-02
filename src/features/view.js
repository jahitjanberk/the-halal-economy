/**
 * Switches between the dashboard and story views.
 *
 * Story mode is built lazily the first time it is opened. The initialiser is
 * registered by main.js rather than imported, so this module stays free of a
 * cycle with story.js.
 */
import { state, writeURL } from '../core/state.js';
import { reduceMotion } from '../core/dom.js';

let storyInit = () => {};

/** Called once by main.js with story.js's initStory. */
export function registerStoryInit(fn){ storyInit = fn; }

export function setView(v){
  state.view = v;
  document.body.classList.toggle('story-mode', v === 'story');
  document.querySelectorAll('.viewseg button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  document.getElementById('tourStart').style.display = v === 'story' ? 'none' : '';
  if(v === 'story') storyInit();
  else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  writeURL();
}

export function initViewToggle(){
  document.querySelectorAll('.viewseg button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
}
