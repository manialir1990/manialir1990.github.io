/* ==========================================================================
   auth-ui.js — اجزای مشترک صفحه‌های ورود، ثبت نام و بازیابی
   ========================================================================== */

import { qs, qsa, icon } from './dom.js';
import { passwordStrength, STRENGTH_LABELS } from './validators.js';

/* <span data-icon="mail"> → آیکن SVG */
export function hydrateIcons(root = document) {
  qsa('[data-icon]', root).forEach((node) => {
    if (node.dataset.hydrated) return;
    const size = Number(node.dataset.size) || 20;
    node.replaceChildren(icon(node.dataset.icon, size));
    node.dataset.hydrated = '1';
  });
}

/* دکمه‌ی نمایش/پنهان‌کردن رمز عبور */
export function bindPasswordToggles(root = document) {
  qsa('[data-toggle-password]', root).forEach((button) => {
    const input = qs(button.dataset.togglePassword, root);
    if (!input) return;
    const render = () => {
      const visible = input.type === 'text';
      button.replaceChildren(icon(visible ? 'eyeOff' : 'eye', 20));
      button.setAttribute('aria-label', visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور');
      button.setAttribute('aria-pressed', String(visible));
    };
    button.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      render();
      input.focus();
    });
    render();
  });
}

export function bindStrengthMeter(input, meter) {
  const bars = qsa('.strength__bar', meter);
  const label = qs('.strength__label', meter);
  const update = () => {
    const value = input.value;
    const score = value ? passwordStrength(value) : -1;
    meter.dataset.level = String(Math.max(score, 0));
    meter.classList.toggle('is-empty', !value);
    bars.forEach((bar, i) => bar.classList.toggle('is-on', score >= 0 && i <= Math.max(score - 1, 0) && value.length > 0));
    if (label) label.textContent = value ? STRENGTH_LABELS[score] : '';
  };
  input.addEventListener('input', update);
  update();
}

/* پیام وضعیت بالای فرم */
export function showFormMessage(box, type, text) {
  if (!box) return;
  box.className = `form-message form-message--${type}`;
  box.textContent = text;
  box.hidden = false;
}

export function hideFormMessage(box) {
  if (!box) return;
  box.hidden = true;
  box.textContent = '';
}

/* شمارنده‌ی معکوس برای دکمه‌ی ارسال دوباره */
export function startCooldown(button, seconds, idleText) {
  let left = seconds;
  button.disabled = true;
  const tick = () => {
    if (left <= 0) {
      button.disabled = false;
      button.textContent = idleText;
      return;
    }
    button.textContent = `${idleText} (${left})`.replace(/\d+/g, (d) => d.replace(/[0-9]/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[x]));
    left -= 1;
    setTimeout(tick, 1000);
  };
  tick();
}
