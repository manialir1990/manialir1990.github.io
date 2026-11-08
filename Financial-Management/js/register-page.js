/* ==========================================================================
   register-page.js — ثبت نام با تأیید ایمیل
   ========================================================================== */

import { qs } from './dom.js';
import { ROUTES } from './config.js';
import { mountPublicShell } from './layout.js';
import { redirectIfAuthed, signUp, resendConfirmation, mapAuthError } from './auth.js';
import {
  runValidators, validateEmail, validatePassword, validatePasswordMatch, validateName, setFieldError,
} from './validators.js';
import {
  hydrateIcons, bindPasswordToggles, bindStrengthMeter, showFormMessage, hideFormMessage, startCooldown,
} from './auth-ui.js';
import { setBusy } from './modal.js';
import { MSG } from './messages.js';

mountPublicShell();
hydrateIcons();
bindPasswordToggles();

const form = qs('#register-form');
const nameInput = qs('#full-name');
const emailInput = qs('#email');
const passwordInput = qs('#password');
const confirmInput = qs('#password-confirm');
const submitBtn = qs('#register-submit');
const message = qs('#register-message');
const formPanel = qs('#register-panel');
const sentPanel = qs('#sent-panel');
const sentEmail = qs('#sent-email');
const resendBtn = qs('#resend-btn');

bindStrengthMeter(passwordInput, qs('#strength'));
redirectIfAuthed();
nameInput.focus();

[nameInput, emailInput, passwordInput, confirmInput].forEach((input) => {
  input.addEventListener('input', () => {
    setFieldError(input, '');
    hideFormMessage(message);
  });
});

confirmInput.addEventListener('blur', () => {
  if (confirmInput.value) setFieldError(confirmInput, validatePasswordMatch(passwordInput.value, confirmInput.value));
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormMessage(message);

  const ok = runValidators([
    { input: nameInput, check: () => validateName(nameInput.value) },
    { input: emailInput, check: () => validateEmail(emailInput.value) },
    { input: passwordInput, check: () => validatePassword(passwordInput.value) },
    { input: confirmInput, check: () => validatePasswordMatch(passwordInput.value, confirmInput.value) },
  ]);
  if (!ok) return;

  setBusy(submitBtn, true, 'در حال ثبت نام…');
  try {
    const data = await signUp({
      email: emailInput.value,
      password: passwordInput.value,
      fullName: nameInput.value,
    });
    /* اگر تأیید ایمیل در Supabase خاموش باشد نشست بلافاصله ساخته می‌شود */
    if (data.session) {
      location.replace(ROUTES.dashboard);
      return;
    }
    sentEmail.textContent = emailInput.value.trim();
    formPanel.hidden = true;
    sentPanel.hidden = false;
    startCooldown(resendBtn, 60, 'ارسال دوباره');
  } catch (error) {
    showFormMessage(message, 'error', mapAuthError(error));
    setBusy(submitBtn, false);
  }
});

resendBtn.addEventListener('click', async () => {
  try {
    await resendConfirmation(emailInput.value);
    showFormMessage(qs('#sent-message'), 'success', MSG.resendOk);
    startCooldown(resendBtn, 60, 'ارسال دوباره');
  } catch (error) {
    showFormMessage(qs('#sent-message'), 'error', mapAuthError(error));
  }
});
