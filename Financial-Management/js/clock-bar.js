/* ==========================================================================
   clock-bar.js — نوار تاریخ و ساعت بالای همه‌ی صفحه‌ها
   ========================================================================== */

import { el, icon } from './dom.js';
import { onTick, startTicking, syncWithTimeIr, getSource } from './timeir.js';
import { formatClock, formatClockDate } from './jalali.js';

export function buildClockBar() {
  const dateNode = el('span', { class: 'clockbar__date', text: '…' });
  const timeNode = el('span', { class: 'clockbar__time', text: '…' });

  const bar = el('div', { class: 'clockbar', role: 'timer', 'aria-label': 'تاریخ و ساعت امروز' }, [
    el('span', { class: 'clockbar__item' }, [icon('calendar', 16), dateNode]),
    el('span', { class: 'clockbar__sep', 'aria-hidden': 'true' }),
    el('span', { class: 'clockbar__item' }, [icon('clock', 16), timeNode]),
  ]);

  onTick((parts) => {
    dateNode.textContent = formatClockDate(parts);
    timeNode.textContent = formatClock(parts);
    bar.title = getSource() === 'time.ir' ? 'هم‌گام با time.ir' : 'ساعت دستگاه به وقت تهران';
  });

  syncWithTimeIr().finally(startTicking);
  startTicking();
  return bar;
}
