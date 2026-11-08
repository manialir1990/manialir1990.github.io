/* ==========================================================================
   entry-row.js — نمایش یک درآمد یا بدهی به‌صورت ردیف
   ========================================================================== */

import { el, icon } from './dom.js';
import { formatAmount } from './digits.js';
import { formatShort, formatNumeric, WEEKDAYS, weekdayIndex, diffDaysIso } from './jalali.js';
import { UNIT_LABEL } from './messages.js';
import { describeDistance } from './stats.js';
import { toFa } from './digits.js';

function repeatBadge(entry) {
  if (!entry.is_recurring) return null;
  const position = toFa((entry.series_index || 0) + 1);
  const total = toFa((entry.recur_total || 0) + 1);
  return el('span', { class: 'badge badge--repeat', title: 'تکرارشونده' }, [
    icon('repeat', 12),
    `${UNIT_LABEL[entry.recur_unit] || ''} ${position}/${total}`,
  ]);
}

function distanceBadge(entry, todayIso) {
  if (!todayIso) return null;
  const days = diffDaysIso(todayIso, entry.due_date);
  if (days < 0) return el('span', { class: 'badge badge--past', text: 'گذشته' });
  return el('span', { class: `badge ${days <= 3 ? 'badge--soon' : 'badge--dist'}`, text: describeDistance(days) });
}

/* ردیف کامل برای جدول ریز اطلاعات و باکس ۱۰ روز آینده */
export function createEntryRow(entry, { todayIso = '', selectable = false, showDistance = true } = {}) {
  const weekday = WEEKDAYS[weekdayIndex(entry.due_date)];
  const row = el('div', {
    class: `entry-row entry-row--${entry.kind}`,
    role: selectable ? 'option' : 'listitem',
    tabindex: selectable ? '0' : null,
    'aria-selected': selectable ? 'false' : null,
    dataset: { id: entry.id, kind: entry.kind },
  }, [
    selectable ? el('span', { class: 'entry-row__check', 'aria-hidden': 'true' }, [icon('check', 16)]) : null,
    el('div', { class: 'entry-row__date' }, [
      el('strong', { text: formatShort(entry.due_date) }),
      el('small', { text: `${weekday} · ${formatNumeric(entry.due_date)}` }),
    ]),
    el('div', { class: 'entry-row__body' }, [
      el('div', { class: 'entry-row__title', text: entry.title }),
      el('div', { class: 'entry-row__meta' }, [
        showDistance ? distanceBadge(entry, todayIso) : null,
        repeatBadge(entry),
      ]),
    ]),
    el('div', { class: 'entry-row__amount' }, [
      el('strong', { text: formatAmount(entry.amount) }),
      el('small', { text: 'میلیون تومان' }),
    ]),
  ]);
  return row;
}

/* ردیف فشرده برای داشبورد */
export function createCompactRow(entry, todayIso, owner = '') {
  const days = diffDaysIso(todayIso, entry.due_date);
  return el('li', { class: `compact-row compact-row--${entry.kind}` }, [
    el('div', { class: 'compact-row__when' }, [
      el('strong', { text: formatShort(entry.due_date) }),
      el('small', { text: describeDistance(Math.max(days, 0)) }),
    ]),
    el('div', { class: 'compact-row__title' }, [
      entry.title,
      owner ? el('span', { class: `owner-tag${owner === 'من' ? ' owner-tag--me' : ''}`, text: owner }) : null,
    ]),
    el('div', { class: 'compact-row__amount', text: formatAmount(entry.amount) }),
  ]);
}
