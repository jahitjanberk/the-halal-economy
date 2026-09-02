/**
 * The citation block.
 *
 * A hub that cannot be cited does not get used as one, so the page offers a
 * ready-made citation with today's access date filled in and a one-click copy.
 */
import { toast } from '../core/dom.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

export function initCite(){
  const dateEl = document.getElementById('citeDate');
  if(!dateEl) return;

  /* The access date is the reader's, not the compile date. */
  const now = new Date();
  dateEl.textContent = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const copy = document.getElementById('copyCite');
  const text = () => document.getElementById('citeText').textContent.replace(/\s+/g, ' ').trim();

  if(copy) copy.addEventListener('click', () => {
    navigator.clipboard.writeText(text())
      .then(() => toast('Citation copied.'))
      .catch(() => toast(text()));
  });

  /* The method notes point at the changelog; open the dialog rather than describe it. */
  const link = document.getElementById('methodChangelog');
  if(link) link.addEventListener('click', () => document.getElementById('changelog').click());
}
