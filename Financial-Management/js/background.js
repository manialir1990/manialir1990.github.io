/* ==========================================================================
   background.js — پس‌زمینه‌ی چندلایه: تصویر دلار، آجر، رد نور، نمادهای شناور
   ========================================================================== */

import { el, prefersReducedMotion } from './dom.js';
import { ASSETS } from './config.js';

const GLYPHS = ['$', '₮', '﷼', '$', '¢', '$'];

export function mountBackground() {
  if (document.querySelector('.bg-stack')) return;

  const photo = el('div', { class: 'bg-photo' });
  photo.style.backgroundImage = `url("${ASSETS.dollarBackground}")`;

  const stack = el('div', { class: 'bg-stack', 'aria-hidden': 'true' }, [
    photo,
    el('div', { class: 'bg-bricks' }),
    el('div', { class: 'bg-trail' }),
    el('div', { class: 'bg-vignette' }),
  ]);

  if (!prefersReducedMotion()) {
    const floaters = el('div', { class: 'bg-floaters' });
    const count = window.innerWidth < 700 ? 9 : 16;
    for (let i = 0; i < count; i += 1) {
      const glyph = el('span', { class: 'bg-floater', text: GLYPHS[i % GLYPHS.length] });
      const size = 18 + Math.random() * 40;
      glyph.style.setProperty('--x', `${Math.random() * 100}%`);
      glyph.style.setProperty('--size', `${size}px`);
      glyph.style.setProperty('--dur', `${18 + Math.random() * 22}s`);
      glyph.style.setProperty('--delay', `${-Math.random() * 30}s`);
      glyph.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
      glyph.style.setProperty('--alpha', String(0.06 + Math.random() * 0.1));
      floaters.append(glyph);
    }
    stack.append(floaters);
  }

  document.body.prepend(stack);
}
