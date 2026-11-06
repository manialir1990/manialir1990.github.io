/* ==========================================================================
   selection.js — حالت انتخاب با نگه‌داشتن انگشت (long-press)
   ۱) نگه‌داشتن روی یک ردیف → ورود به حالت انتخاب و انتخاب همان ردیف
   ۲) در حالت انتخاب، لمس هر ردیف آن را انتخاب (یا لغو انتخاب) می‌کند
   ۳) خروج فقط با دکمه‌ی ✕ بالای سمت چپ صفحه (یا کلید Escape)
   ========================================================================== */

import { CONFIG } from './config.js';
import { vibrate } from './dom.js';

export function createSelection({ root, rowSelector = '.entry-row', onChange = () => {} }) {
  const selected = new Set();
  let active = false;
  let timer = null;
  let longPressFired = false;
  let pressRow = null;
  let startX = 0;
  let startY = 0;

  function rowFrom(target) {
    return target && target.closest ? target.closest(rowSelector) : null;
  }

  function paint() {
    root.querySelectorAll(rowSelector).forEach((row) => {
      const isOn = selected.has(row.dataset.id);
      row.classList.toggle('is-selected', isOn);
      row.setAttribute('aria-selected', String(isOn));
    });
    root.classList.toggle('is-selecting', active);
    document.body.classList.toggle('is-selecting', active);
  }

  function emit() {
    paint();
    onChange(new Set(selected), active);
  }

  function enter() {
    if (active) return;
    active = true;
  }

  function toggle(id) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    emit();
  }

  function clear() {
    selected.clear();
    active = false;
    emit();
  }

  function selectMany(ids, on = true) {
    ids.forEach((id) => (on ? selected.add(id) : selected.delete(id)));
    emit();
  }

  function cancelTimer() {
    clearTimeout(timer);
    timer = null;
  }

  root.addEventListener('pointerdown', (event) => {
    const row = rowFrom(event.target);
    if (!row) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pressRow = row;
    longPressFired = false;
    startX = event.clientX;
    startY = event.clientY;
    cancelTimer();
    if (!active) {
      timer = setTimeout(() => {
        longPressFired = true;
        enter();
        selected.add(row.dataset.id);
        vibrate(25);
        emit();
      }, CONFIG.LONG_PRESS_MS);
    }
  });

  root.addEventListener('pointermove', (event) => {
    if (!timer) return;
    const dx = Math.abs(event.clientX - startX);
    const dy = Math.abs(event.clientY - startY);
    if (dx > CONFIG.LONG_PRESS_MOVE_TOLERANCE || dy > CONFIG.LONG_PRESS_MOVE_TOLERANCE) cancelTimer();
  });

  root.addEventListener('pointerup', (event) => {
    cancelTimer();
    const row = rowFrom(event.target);
    if (longPressFired) {
      longPressFired = false;
      pressRow = null;
      return;
    }
    if (active && row && row === pressRow) {
      vibrate(10);
      toggle(row.dataset.id);
    }
    pressRow = null;
  });

  ['pointercancel', 'pointerleave'].forEach((type) => {
    root.addEventListener(type, () => { cancelTimer(); pressRow = null; });
  });

  /* منوی راست‌کلیک/نگه‌داشتن مرورگر روی ردیف‌ها نمایش داده نشود */
  root.addEventListener('contextmenu', (event) => {
    if (rowFrom(event.target)) event.preventDefault();
  });

  root.addEventListener('keydown', (event) => {
    const row = rowFrom(event.target);
    if (!row) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      enter();
      toggle(row.dataset.id);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active) clear();
  });

  return {
    start() { enter(); emit(); },
    get active() { return active; },
    get size() { return selected.size; },
    ids: () => [...selected],
    has: (id) => selected.has(id),
    toggle,
    clear,
    selectMany,
    refresh: paint,
    prune(validIds) {
      let changed = false;
      for (const id of [...selected]) {
        if (!validIds.has(id)) { selected.delete(id); changed = true; }
      }
      if (changed) emit(); else paint();
    },
  };
}
