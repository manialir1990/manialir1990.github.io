/* ==========================================================================
   stats.js — محاسبات مالی (جمع، نسبت، وضعیت، گروه‌بندی روزانه)
   ========================================================================== */

import { sum, clamp, toFa } from './digits.js';
import { CONFIG } from './config.js';
import { addDaysIso, diffDaysIso } from './jalali.js';

export function split(entries) {
  const incomes = [];
  const debts = [];
  for (const e of entries) (e.kind === 'income' ? incomes : debts).push(e);
  return { incomes, debts };
}

export function totals(entries) {
  const { incomes, debts } = split(entries);
  const income = sum(incomes, (e) => e.amount);
  const debt = sum(debts, (e) => e.amount);
  return { income, debt, balance: Math.round((income - debt) * 1000) / 1000, incomeCount: incomes.length, debtCount: debts.length };
}

/* نسبت درآمد به بدهی؛ بدون بدهی و با درآمد → سقف نمودار */
export function ratio(income, debt) {
  if (debt <= 0) return income > 0 ? CONFIG.GAUGE_MAX : 0;
  return clamp(income / debt, CONFIG.GAUGE_MIN, CONFIG.GAUGE_MAX);
}

export function rawRatio(income, debt) {
  if (debt <= 0) return income > 0 ? Infinity : 0;
  return income / debt;
}

export const STATUS_LEVELS = [
  { max: 0.5, key: 'critical', label: 'بحرانی', hint: 'درآمد پوشش‌دهنده‌ی نیمی از بدهی‌ها هم نیست.' },
  { max: 1, key: 'warning', label: 'نیازمند توجه', hint: 'بدهی‌ها از درآمد بیشتر است؛ سررسیدها را بازبینی کنید.' },
  { max: 1.5, key: 'good', label: 'مناسب', hint: 'درآمد بدهی‌ها را پوشش می‌دهد و مازاد کوچکی می‌ماند.' },
  { max: Infinity, key: 'excellent', label: 'عالی', hint: 'درآمد دست‌کم ۱٫۵ برابر بدهی‌های ماه آینده است.' },
];

export function statusFor(value, hasData = true) {
  if (!hasData) return { key: 'empty', label: 'بدون داده', hint: 'برای ماه آینده درآمد یا بدهی ثبت نشده است.' };
  return STATUS_LEVELS.find((level) => value < level.max) || STATUS_LEVELS[STATUS_LEVELS.length - 1];
}

export function windowRange(todayIso, days) {
  return { from: todayIso, to: addDaysIso(todayIso, days - 1) };
}

export function groupByDate(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.due_date)) map.set(e.due_date, []);
    map.get(e.due_date).push(e);
  }
  return map;
}

export function daysUntil(todayIso, dueIso) {
  return diffDaysIso(todayIso, dueIso);
}

export function nearest(entries, kind, todayIso) {
  return entries
    .filter((e) => e.kind === kind && e.due_date >= todayIso)
    .sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0))[0] || null;
}

export function describeDistance(days) {
  if (days === 0) return 'امروز';
  if (days === 1) return 'فردا';
  if (days === 2) return 'پس‌فردا';
  return `${toFa(days)} روز دیگر`;
}

export function toCsv(entries, formatDate, ownerOf = null) {
  const head = ['نوع', 'تاریخ', 'علت', 'مبلغ (میلیون تومان)', 'تکرار'];
  if (ownerOf) head.push('صاحب');
  const lines = [head.join(',')];
  for (const e of entries) {
    const cells = [
      e.kind === 'income' ? 'درآمد' : 'بدهی',
      formatDate(e.due_date),
      `"${String(e.title).replace(/"/g, '""')}"`,
      String(e.amount),
      e.is_recurring ? (e.recur_unit === 'yearly' ? 'سالانه' : 'ماهانه') : '—',
    ];
    if (ownerOf) cells.push(`"${String(ownerOf(e)).replace(/"/g, '""')}"`);
    lines.push(cells.join(','));
  }
  return lines.join('\r\n');
}
