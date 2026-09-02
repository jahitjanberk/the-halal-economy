/**
 * Focus handling for the page's two dialogs.
 *
 * The changelog declares `aria-modal="true"`, which tells assistive tech the
 * rest of the page is inert — so focus has to actually be held inside it,
 * Escape has to close it, and focus has to return to whatever opened it.
 *
 * The tour is a coach mark rather than a modal: it talks about the page behind
 * it, so it takes focus but does not trap it.
 */

const FOCUSABLE = 'a[href],button:not([disabled]),select,input,textarea,[tabindex]:not([tabindex="-1"])';

/*
 * Visibility is judged from attributes rather than `offsetParent`, which needs
 * a layout engine — so this behaves the same in a browser and under test.
 */
const isHidden = e => e.hasAttribute('hidden') || e.closest('[hidden]') || e.getAttribute('aria-hidden') === 'true';

const focusable = root => [...root.querySelectorAll(FOCUSABLE)].filter(e => !isHidden(e));

/**
 * Hold Tab inside `el` and close on Escape. Returns a release function that
 * also restores focus.
 *
 * `returnTo` is passed explicitly rather than read from `document.activeElement`
 * because Safari and Firefox do not focus a button when it is clicked — relying
 * on the active element would send the reader back to the top of the document
 * instead of to the control they opened this with.
 */
export function captureFocus(el, onClose, returnTo){
  const previous = returnTo || document.activeElement;

  function onKey(e){
    if(e.key === 'Escape'){ e.preventDefault(); onClose(); return; }
    if(e.key !== 'Tab') return;

    const items = focusable(el);
    if(!items.length) return;
    const first = items[0], last = items[items.length - 1];

    /* Wrap at both ends so focus never leaves the dialog. */
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  el.addEventListener('keydown', onKey);
  const first = focusable(el)[0];
  if(first) first.focus();

  return () => {
    el.removeEventListener('keydown', onKey);
    if(previous && previous.isConnected) previous.focus();
  };
}

/**
 * Move focus into `el` and give it back on release, without trapping. For
 * non-modal panels the reader must stay free to move around the page.
 */
export function lendFocus(el, target, returnTo){
  const previous = returnTo || document.activeElement;
  const first = target || focusable(el)[0];
  if(first) first.focus();
  return () => { if(previous && previous.isConnected) previous.focus(); };
}
