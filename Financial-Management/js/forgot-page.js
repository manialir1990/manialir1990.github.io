/* ==========================================================================
   forgot-page.js — درخواست لینک بازیابی رمز عبور
   ========================================================================== */

import { qs } from './dom.js';
import { mountPublicShell } from './layout.js';
import { sendPasswordReset, mapAuthError } from './auth.js';
import { runValidators, validateEmail, setFieldError } from './validators.js';
import { hydrateIcons, showFormMessage, hideFormMessage, startCooldown } from './auth-ui.js';
import { setBusy } from './modal.js';
import { MSG } from './messages.js';

mountPublicShell();
hydrateIcons();

const form = qs('#forgot-form');
const emailInput = qs('#email');
const submitBtn = qs('#forgot-submit');
const message = qs('#forgot-message');

emailInput.focus();
emailInput.addEventListener('input', () => { setFieldError(emailInput, ''); hideFormMessage(message); });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormMessage(message);
  if (!runValidators([{ input: emailInput, check: () => validateEmail(emailInput.value) }])) return;

  setBusy(submitBtn, true, 'در حال ارسال…');
  try {
    await sendPasswordReset(emailInput.value);
    showFormMessage(message, 'success', MSG.resetSent);
    setBusy(submitBtn, false);
    startCooldown(submitBtn, 60, 'ارسال دوباره‌ی لینک');
  } catch (error) {
    showFormMessage(message, 'error', mapAuthError(error));
    setBusy(submitBtn, false);
  }
});
