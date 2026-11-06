/* ==========================================================================
   jalali.js — تقویم هجری شمسی (جلالی)
   تبدیل تاریخ‌ها، طول ماه‌ها، جمع/تفریق روز و ماه و سال و قالب‌بندی.
   تاریخ‌های میلادی به‌صورت رشته‌ی ISO (YYYY-MM-DD) نگه‌داری می‌شوند.
   ========================================================================== */

import { toFa, pad2 } from './digits.js';

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/* هفته از شنبه شروع می‌شود */
export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const DAY_MS = 86400000;

/* ------------------------------------------------------------------ */
/* تبدیل میلادی ⇄ جلالی                                               */
/* ------------------------------------------------------------------ */

export function gregorianToJalali(gy, gm, gd) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days =
    -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const months = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    if (gd <= months[gm]) break;
    gd -= months[gm];
  }
  return { gy, gm, gd };
}

/* ------------------------------------------------------------------ */
/* سال کبیسه و طول ماه                                                 */
/* ------------------------------------------------------------------ */

export function isJalaliLeap(jy) {
  const g = jalaliToGregorian(jy, 12, 30);
  const back = gregorianToJalali(g.gy, g.gm, g.gd);
  return back.jy === jy && back.jm === 12 && back.jd === 30;
}

export function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

export function isValidJalali(jy, jm, jd) {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) return false;
  if (jm < 1 || jm > 12 || jd < 1) return false;
  return jd <= jalaliMonthLength(jy, jm);
}

/* ------------------------------------------------------------------ */
/* رشته‌ی ISO و محاسبات روز                                            */
/* ------------------------------------------------------------------ */

export function toIso(gy, gm, gd) {
  return `${String(gy).padStart(4, '0')}-${pad2(gm)}-${pad2(gd)}`;
}

export function parseIso(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return { gy: y, gm: m, gd: d };
}

function isoToUtcMs(iso) {
  const { gy, gm, gd } = parseIso(iso);
  return Date.UTC(gy, gm - 1, gd);
}

export function addDaysIso(iso, days) {
  const d = new Date(isoToUtcMs(iso) + days * DAY_MS);
  return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function diffDaysIso(fromIso, toIsoStr) {
  return Math.round((isoToUtcMs(toIsoStr) - isoToUtcMs(fromIso)) / DAY_MS);
}

export function compareIso(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/* روز هفته: ۰ = شنبه … ۶ = جمعه */
export function weekdayIndex(iso) {
  const d = new Date(isoToUtcMs(iso));
  return (d.getUTCDay() + 1) % 7;
}

export function isoToJalali(iso) {
  const { gy, gm, gd } = parseIso(iso);
  return gregorianToJalali(gy, gm, gd);
}

export function jalaliToIso(jy, jm, jd) {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return toIso(gy, gm, gd);
}

/* ------------------------------------------------------------------ */
/* جمع ماه و سال (برای تکرار ماهانه/سالانه)                            */
/* اگر روز در ماه مقصد وجود نداشته باشد به آخرین روز همان ماه می‌رود.   */
/* ------------------------------------------------------------------ */

export function addJalaliMonths(jy, jm, jd, months) {
  const index = jy * 12 + (jm - 1) + months;
  const ny = Math.floor(index / 12);
  const nm = (index % 12 + 12) % 12 + 1;
  const nd = Math.min(jd, jalaliMonthLength(ny, nm));
  return { jy: ny, jm: nm, jd: nd };
}

export function addJalaliYears(jy, jm, jd, years) {
  const ny = jy + years;
  const nd = Math.min(jd, jalaliMonthLength(ny, jm));
  return { jy: ny, jm, jd: nd };
}

export function jalaliMonthRangeIso(jy, jm) {
  return {
    start: jalaliToIso(jy, jm, 1),
    end: jalaliToIso(jy, jm, jalaliMonthLength(jy, jm)),
  };
}

export function jalaliYearRangeIso(jy) {
  return {
    start: jalaliToIso(jy, 1, 1),
    end: jalaliToIso(jy, 12, jalaliMonthLength(jy, 12)),
  };
}

/* ------------------------------------------------------------------ */
/* قالب‌بندی                                                            */
/* ------------------------------------------------------------------ */

export function jalaliParts(iso) {
  const { jy, jm, jd } = isoToJalali(iso);
  return { jy, jm, jd, weekday: weekdayIndex(iso), monthName: JALALI_MONTHS[jm - 1] };
}

/* ۱۴۰۵/۰۸/۱۴ */
export function formatNumeric(iso) {
  const { jy, jm, jd } = isoToJalali(iso);
  return toFa(`${jy}/${pad2(jm)}/${pad2(jd)}`);
}

/* ۱۴ آبان */
export function formatShort(iso) {
  const { jm, jd } = isoToJalali(iso);
  return `${toFa(jd)} ${JALALI_MONTHS[jm - 1]}`;
}

/* ۱۴ آبان ۱۴۰۵ */
export function formatMedium(iso) {
  const { jy, jm, jd } = isoToJalali(iso);
  return `${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
}

/* پنجشنبه ۱۴ آبان ۱۴۰۵ */
export function formatLong(iso) {
  return `${WEEKDAYS[weekdayIndex(iso)]} ${formatMedium(iso)}`;
}

export function formatMonthYear(jy, jm) {
  return `${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
}

/* ------------------------------------------------------------------ */
/* زمان فعلی به وقت تهران (مستقل از ساعت‌منطقه‌ی دستگاه)               */
/* ------------------------------------------------------------------ */

const tehranFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

export function tehranParts(date = new Date()) {
  const map = {};
  for (const part of tehranFormatter.formatToParts(date)) map[part.type] = part.value;
  const gy = Number(map.year);
  const gm = Number(map.month);
  const gd = Number(map.day);
  const iso = toIso(gy, gm, gd);
  const j = gregorianToJalali(gy, gm, gd);
  return {
    iso,
    gy, gm, gd,
    ...j,
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: weekdayIndex(iso),
  };
}

export function formatClock(parts) {
  return toFa(`${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`);
}

export function formatClockDate(parts) {
  return `${WEEKDAYS[parts.weekday]} ${toFa(parts.jd)} ${JALALI_MONTHS[parts.jm - 1]} ${toFa(parts.jy)}`;
}
