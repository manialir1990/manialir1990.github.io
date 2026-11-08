/* ==========================================================================
   validators.js — اعتبارسنجی فرم‌ها
   ========================================================================== */

import { CONFIG } from './config.js';
import { MSG } from './messages.js';
import { parseAmount, toEn } from './digits.js';
import { isValidJalali } from './jalali.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value) {
  const v = String(value || '').trim();
  if (!v) return MSG.required;
  if (!EMAIL_RE.test(v)) return MSG.emailInvalid;
  return '';
}

export function validatePassword(value) {
  const v = String(value || '');
  if (!v) return MSG.required;
  if (v.length < CONFIG.PASSWORD_MIN) return MSG.passwordShort(CONFIG.PASSWORD_MIN);
  if (!/[A-Za-z\u0600-\u06FF]/.test(v) || !/\d/.test(v)) return MSG.passwordWeak;
  return '';
}

export function validatePasswordMatch(a, b) {
  return a === b ? '' : MSG.passwordMismatch;
}

export function validateName(value) {
  const v = String(value || '').trim();
  if (!v) return MSG.required;
  if (v.length < 2) return MSG.nameShort;
  return '';
}

export function validateTitle(value) {
  const v = String(value || '').trim();
  if (!v) return MSG.required;
  if (v.length > CONFIG.TITLE_MAX) return MSG.titleLong;
  return '';
}

export function validateAmount(value) {
  const raw = String(value || '').trim();
  if (!raw) return MSG.required;
  const n = parseAmount(raw);
  if (Number.isNaN(n)) return MSG.amountInvalid;
  if (n <= 0) return MSG.amountPositive;
  if (n > CONFIG.AMOUNT_MAX) return MSG.amountTooBig;
  return '';
}

export function validateJalaliDate({ jy, jm, jd }) {
  return isValidJalali(jy, jm, jd) ? '' : MSG.dateInvalid;
}

export function validateRepeatCount(value) {
  const n = Number(toEn(value));
  if (!Number.isInteger(n) || n < 1 || n > CONFIG.REPEAT_MAX) return MSG.repeatCountInvalid;
  return '';
}

/* قدرت رمز عبور از ۰ تا ۴ برای نوار نمایش */
export function passwordStrength(value) {
  const v = String(value || '');
  let score = 0;
  if (v.length >= CONFIG.PASSWORD_MIN) score += 1;
  if (v.length >= 12) score += 1;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score += 1;
  if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) score += 1;
  return Math.min(4, score);
}

export const STRENGTH_LABELS = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'خوب', 'عالی'];

/* نمایش/پاک‌کردن خطا زیر یک فیلد */
export function setFieldError(input, message) {
  const field = input.closest('.field');
  if (!field) return;
  let holder = field.querySelector('.field__error');
  if (!holder) {
    holder = document.createElement('div');
    holder.className = 'field__error';
    holder.setAttribute('role', 'alert');
    field.append(holder);
  }
  holder.textContent = message || '';
  field.classList.toggle('has-error', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

export function runValidators(rules) {
  let firstInvalid = null;
  for (const { input, check } of rules) {
    const message = check();
    setFieldError(input, message);
    if (message && !firstInvalid) firstInvalid = input;
  }
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}
