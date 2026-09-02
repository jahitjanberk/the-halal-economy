/**
 * The nav's overflow menu, holding the controls you set once and forget
 * (language, copy link) so the bar stops wrapping to two rows at tablet widths.
 *
 * Not a modal — clicking away or pressing Escape closes it, and focus returns
 * to the button so keyboard users don't lose their place.
 */

export function initNavMenu(){
  const btn = document.getElementById('moreBtn');
  const panel = document.getElementById('morePanel');
  if(!btn || !panel) return;

  function setOpen(open){
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const willOpen = panel.hidden;
    setOpen(willOpen);
    if(willOpen){
      const first = panel.querySelector('select,button,a');
      if(first) first.focus();
    }
  });

  document.addEventListener('click', e => {
    if(!panel.hidden && !panel.contains(e.target) && e.target !== btn) setOpen(false);
  });

  panel.addEventListener('keydown', e => {
    if(e.key === 'Escape'){ setOpen(false); btn.focus(); }
  });

  /* Copying a link is a one-shot action; leaving the menu open afterwards is noise. */
  const copy = document.getElementById('copyLink');
  if(copy) copy.addEventListener('click', () => setOpen(false));
}
