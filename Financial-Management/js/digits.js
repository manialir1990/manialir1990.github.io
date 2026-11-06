/* ==========================================================================
   digits.js — تبدیل ارقام و قالب‌بندی اعداد فارسی
   ========================================================================== */

const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

export function toFa(value) {
  return String(value ?? '').replace(/[0-9]/g, (d) => FA[Number(d)]);
}

export function toEn(value) {
  return String(value ?? '')
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
    .replace(/[٫,]/g, '.')
    .replace(/[٬،]/g, '');
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatInt(n) {
  const v = Math.trunc(Number(n) || 0);
  return toFa(Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));
}

/* مبلغ بر حسب میلیون تومان: حداکثر سه رقم اعشار، بدون صفرهای اضافه */
export function formatAmount(n, { sign = false } = {}) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  let text = abs.toFixed(3).replace(/\.?0+$/, '');
  const [intPart, frac] = text.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  text = frac ? `${grouped}.${frac}` : grouped;
  text = toFa(text).replace(/,/g, '٬').replace('.', '٫');
  if (v < 0) return `−${text}`;
  if (sign && v > 0) return `+${text}`;
  return text;
}

export function formatAmountUnit(n, opts) {
  return `${formatAmount(n, opts)} میلیون تومان`;
}

export function formatRatio(r) {
  if (!Number.isFinite(r)) return '—';
  return toFa((Math.round(r * 100) / 100).toFixed(2)).replace('.', '٫');
}

export function formatPercent(r) {
  return toFa(Math.round(r * 100)) + '٪';
}

/* ورودی کاربر را (با ارقام فارسی/عربی) به عدد تبدیل می‌کند؛ نامعتبر → NaN */
export function parseAmount(text) {
  const clean = toEn(text).trim();
  if (!/^\d+(\.\d{1,3})?$/.test(clean)) return NaN;
  return Number(clean);
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function sum(list, pick = (x) => x) {
  let total = 0;
  for (const item of list) total += Number(pick(item)) || 0;
  return Math.round(total * 1000) / 1000;
}
