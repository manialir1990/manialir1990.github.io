/* ==========================================================================
   day-table.js — جدول روزبه‌روز درآمدها یا بدهی‌ها (صفحه‌ی ورود اطلاعات)
   ========================================================================== */

import { el, clear, icon } from './dom.js';
import { formatAmount, sum } from './digits.js';
import { WEEKDAYS, weekdayIndex, formatShort, isoToJalali, JALALI_MONTHS } from './jalali.js';
import { groupByDate } from './stats.js';
import { listDays } from './period.js';
import { toFa } from './digits.js';
import { MSG, KIND_LABEL_PLURAL } from './messages.js';

function dayHead(iso, todayIso) {
  const wd = weekdayIndex(iso);
  const isToday = iso === todayIso;
  return el('div', { class: `day-row__head${wd === 6 ? ' is-friday' : ''}${isToday ? ' is-today' : ''}` }, [
    el('strong', { text: formatShort(iso) }),
    el('small', { text: isToday ? 'امروز' : WEEKDAYS[wd] }),
  ]);
}

function itemNode(entry) {
  return el('div', { class: 'day-item' }, [
    el('span', { class: 'day-item__title', text: entry.title }),
    entry.is_recurring ? el('span', { class: 'day-item__repeat', title: 'تکرارشونده' }, [icon('repeat', 12)]) : null,
    el('span', { class: 'day-item__amount', text: formatAmount(entry.amount) }),
  ]);
}

export function renderDayTable(root, { kind, entries, range, todayIso }) {
  clear(root);
  const grouped = groupByDate(entries);
  const total = sum(entries, (e) => e.amount);

  const header = el('div', { class: `day-table__header day-table__header--${kind}` }, [
    icon(kind === 'income' ? 'income' : 'debt', 20),
    el('h3', { text: KIND_LABEL_PLURAL[kind] }),
    el('span', { class: 'day-table__total', text: `${formatAmount(total)} م.ت` }),
  ]);

  const body = el('div', { class: 'day-table__body', role: 'table', 'aria-label': KIND_LABEL_PLURAL[kind] });

  if (range.listEveryDay) {
    for (const iso of listDays(range.from, range.to)) {
      const items = grouped.get(iso) || [];
      const row = el('div', { class: `day-row${items.length ? ' has-items' : ''}`, role: 'row' }, [
        dayHead(iso, todayIso),
        el('div', { class: 'day-row__items' }, items.length
          ? [...items.map(itemNode), items.length > 1
            ? el('div', { class: 'day-row__sum', text: `جمع: ${formatAmount(sum(items, (e) => e.amount))}` })
            : null]
          : [el('span', { class: 'day-row__empty', text: '—' })]),
      ]);
      body.append(row);
    }
  } else {
    /* نمای سالانه: فقط روزهای دارای مورد، با عنوان ماه */
    const dates = [...grouped.keys()].sort();
    if (!dates.length) body.append(el('div', { class: 'empty-note', text: MSG.noData }));
    let lastMonth = 0;
    for (const iso of dates) {
      const { jm } = isoToJalali(iso);
      if (jm !== lastMonth) {
        lastMonth = jm;
        const monthTotal = sum(entries.filter((e) => isoToJalali(e.due_date).jm === jm), (e) => e.amount);
        body.append(el('div', { class: 'month-row', role: 'row' }, [
          el('strong', { text: JALALI_MONTHS[jm - 1] }),
          el('span', { text: `${formatAmount(monthTotal)} م.ت` }),
        ]));
      }
      const items = grouped.get(iso);
      body.append(el('div', { class: 'day-row has-items', role: 'row' }, [
        dayHead(iso, todayIso),
        el('div', { class: 'day-row__items' }, [
          ...items.map(itemNode),
          items.length > 1 ? el('div', { class: 'day-row__sum', text: `جمع: ${formatAmount(sum(items, (e) => e.amount))}` }) : null,
        ]),
      ]));
    }
  }

  const footer = el('div', { class: 'day-table__footer' }, [
    el('span', { text: `${toFa(entries.length)} مورد` }),
    el('strong', { text: `${formatAmount(total)} میلیون تومان` }),
  ]);

  root.append(header, body, footer);
}
