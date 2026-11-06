/* ==========================================================================
   recurrence.js — ساخت ردیف‌های تکرارشونده
   هر تکرار به‌صورت یک ردیف مستقل در دیتابیس ذخیره می‌شود و همه‌ی ردیف‌های
   یک مجموعه series_id مشترک دارند. تکرار «تا چند بازه‌ی دیگر» یعنی علاوه بر
   خودِ ردیف اول، همان تعداد بازه‌ی بعدی هم ساخته می‌شود.
   ========================================================================== */

import { addJalaliMonths, addJalaliYears, jalaliToIso, isValidJalali } from './jalali.js';
import { CONFIG } from './config.js';

function makeId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

export function buildRows({ userId, kind, title, amount, jy, jm, jd, recurring, unit, count }) {
  if (!isValidJalali(jy, jm, jd)) throw new Error('invalid-date');
  const extra = recurring ? Math.min(Math.max(Number(count) || 0, 1), CONFIG.REPEAT_MAX) : 0;
  const seriesId = recurring ? makeId() : null;
  const rows = [];

  for (let i = 0; i <= extra; i += 1) {
    const d = unit === 'yearly' ? addJalaliYears(jy, jm, jd, i) : addJalaliMonths(jy, jm, jd, i);
    rows.push({
      user_id: userId,
      kind,
      title: title.trim(),
      amount,
      due_date: jalaliToIso(d.jy, d.jm, d.jd),
      jalali_year: d.jy,
      jalali_month: d.jm,
      jalali_day: d.jd,
      is_recurring: Boolean(recurring),
      recur_unit: recurring ? unit : null,
      recur_total: recurring ? extra : null,
      series_id: seriesId,
      series_index: i,
    });
  }
  return rows;
}

/* برای نمایش پیش‌نمایش قبل از ذخیره */
export function previewDates(input, limit = 4) {
  const rows = buildRows({ ...input, userId: 'preview' });
  return {
    total: rows.length,
    first: rows.slice(0, limit).map((r) => r.due_date),
    last: rows[rows.length - 1].due_date,
  };
}
