/* ==========================================================================
   period.js — بازه‌های نمایش: ۳۰ روز آینده، ماه بعدی، سال بعد
   ========================================================================== */

import { CONFIG } from './config.js';
import {
  addDaysIso, isoToJalali, jalaliMonthRangeIso, jalaliYearRangeIso, formatMedium,
  formatMonthYear, JALALI_MONTHS,
} from './jalali.js';
import { toFa } from './digits.js';

export const MODES = Object.freeze({ ROLLING: 'rolling', MONTH: 'month', YEAR: 'year' });

export function initialPeriod() {
  return { mode: MODES.ROLLING, offset: 0 };
}

export function stepPeriod(state, target, direction = 1) {
  if (target === MODES.ROLLING) return initialPeriod();
  if (state.mode === target) return { mode: target, offset: state.offset + direction };
  return { mode: target, offset: direction };
}

export function computeRange(state, todayIso) {
  const today = isoToJalali(todayIso);

  if (state.mode === MODES.MONTH) {
    const index = today.jy * 12 + (today.jm - 1) + state.offset;
    const jy = Math.floor(index / 12);
    const jm = ((index % 12) + 12) % 12 + 1;
    const range = jalaliMonthRangeIso(jy, jm);
    return { from: range.start, to: range.end, jy, jm, mode: state.mode, label: `ماه ${formatMonthYear(jy, jm)}`, listEveryDay: true };
  }

  if (state.mode === MODES.YEAR) {
    const jy = today.jy + state.offset;
    const range = jalaliYearRangeIso(jy);
    return { from: range.start, to: range.end, jy, mode: state.mode, label: `سال ${toFa(jy)}`, listEveryDay: false };
  }

  const from = todayIso;
  const to = addDaysIso(todayIso, CONFIG.DAYS_MONTH - 1);
  return {
    from, to, mode: MODES.ROLLING,
    label: `${toFa(CONFIG.DAYS_MONTH)} روز آینده: ${formatMedium(from)} تا ${formatMedium(to)}`,
    listEveryDay: true,
  };
}

export function listDays(from, to) {
  const days = [];
  for (let d = from; d <= to; d = addDaysIso(d, 1)) days.push(d);
  return days;
}

export function monthName(jm) {
  return JALALI_MONTHS[jm - 1];
}
