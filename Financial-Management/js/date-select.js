/* ==========================================================================
   date-select.js — انتخاب تاریخ شمسی با سه لیست کشویی (سال / ماه / روز)
   ========================================================================== */

import { el } from './dom.js';
import { CONFIG } from './config.js';
import { JALALI_MONTHS, jalaliMonthLength, isValidJalali } from './jalali.js';
import { toFa } from './digits.js';
import { todayIso } from './timeir.js';
import { isoToJalali } from './jalali.js';

export function createDateSelect({ idPrefix = 'date', initialIso = todayIso(), onChange = () => {} } = {}) {
  const today = isoToJalali(todayIso());
  const initial = isoToJalali(initialIso);

  const yearSelect = el('select', { id: `${idPrefix}-year`, class: 'select', 'aria-label': 'سال' });
  const monthSelect = el('select', { id: `${idPrefix}-month`, class: 'select', 'aria-label': 'ماه' });
  const daySelect = el('select', { id: `${idPrefix}-day`, class: 'select', 'aria-label': 'روز' });

  for (let y = today.jy - CONFIG.YEARS_BEFORE; y <= today.jy + CONFIG.YEARS_AFTER; y += 1) {
    yearSelect.append(el('option', { value: y, text: toFa(y) }));
  }
  JALALI_MONTHS.forEach((name, i) => monthSelect.append(el('option', { value: i + 1, text: name })));

  function fillDays(keep) {
    const jy = Number(yearSelect.value);
    const jm = Number(monthSelect.value);
    const length = jalaliMonthLength(jy, jm);
    const wanted = Math.min(keep || Number(daySelect.value) || 1, length);
    daySelect.innerHTML = '';
    for (let d = 1; d <= length; d += 1) daySelect.append(el('option', { value: d, text: toFa(d) }));
    daySelect.value = String(wanted);
  }

  function emit() {
    onChange(getValue());
  }

  function getValue() {
    return { jy: Number(yearSelect.value), jm: Number(monthSelect.value), jd: Number(daySelect.value) };
  }

  function setValue({ jy, jm, jd }) {
    yearSelect.value = String(jy);
    monthSelect.value = String(jm);
    fillDays(jd);
  }

  yearSelect.addEventListener('change', () => { fillDays(); emit(); });
  monthSelect.addEventListener('change', () => { fillDays(); emit(); });
  daySelect.addEventListener('change', emit);

  setValue(initial);

  const root = el('div', { class: 'date-select', role: 'group', 'aria-label': 'تاریخ شمسی' }, [
    el('div', { class: 'date-select__cell date-select__cell--day' }, [daySelect]),
    el('div', { class: 'date-select__cell date-select__cell--month' }, [monthSelect]),
    el('div', { class: 'date-select__cell date-select__cell--year' }, [yearSelect]),
  ]);

  return {
    root,
    getValue,
    setValue,
    isValid: () => {
      const v = getValue();
      return isValidJalali(v.jy, v.jm, v.jd);
    },
    focus: () => daySelect.focus(),
  };
}
