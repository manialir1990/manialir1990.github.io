/* ==========================================================================
   login-page.js — صفحه‌ی اول: ورود
   ========================================================================== */

import { qs } from './dom.js';
import { ROUTES, CONFIG } from './config.js';
import { mountPublicShell } from './layout.js';
import { redirectIfAuthed, signIn, resendConfirmation, mapAuthError } from './auth.js';
import { runValidators, validateEmail, validatePassword, setFieldError } from './validators.js';
import { hydrateIcons, bindPasswordToggles, showFormMessage, hideFormMessage, startCooldown } from './auth-ui.js';
import { setBusy } from './modal.js';
import { MSG } from './messages.js';

mountPublicShell();
hydrateIcons();
bindPasswordToggles();

const form = qs('#login-form');
const emailInput = qs('#email');
const passwordInput = qs('#password');
const remember = qs('#remember');
const submitBtn = qs('#login-submit');
const message = qs('#login-message');
const resendBtn = qs('#resend-confirmation');

try {
  const saved = localStorage.getItem(CONFIG.STORAGE.LAST_EMAIL);
  if (saved) {
    emailInput.value = saved;
    remember.checked = true;
    passwordInput.focus();
  } else {
    emailInput.focus();
  }
} catch (_) { emailInput.focus(); }

redirectIfAuthed();

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener('input', () => {
    setFieldError(input, '');
    hideFormMessage(message);
    resendBtn.hidden = true;
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormMessage(message);
  resendBtn.hidden = true;

  const ok = runValidators([
    { input: emailInput, check: () => validateEmail(emailInput.value) },
    { input: passwordInput, check: () => (passwordInput.value ? '' : MSG.required) },
  ]);
  if (!ok) return;

  setBusy(submitBtn, true, 'در حال ورود…');
  try {
    await signIn({ email: emailInput.value, password: passwordInput.value });
    try {
      if (remember.checked) localStorage.setItem(CONFIG.STORAGE.LAST_EMAIL, emailInput.value.trim());
      else localStorage.removeItem(CONFIG.STORAGE.LAST_EMAIL);
    } catch (_) { /* ignore */ }
    location.replace(ROUTES.dashboard);
  } catch (error) {
    const text = mapAuthError(error);
    showFormMessage(message, 'error', text);
    if (text === MSG.emailNotConfirmed) resendBtn.hidden = false;
    setBusy(submitBtn, false);
  }
});

resendBtn.addEventListener('click', async () => {
  const emailError = validateEmail(emailInput.value);
  if (emailError) { setFieldError(emailInput, emailError); return; }
  try {
    await resendConfirmation(emailInput.value);
    showFormMessage(message, 'success', MSG.resendOk);
    startCooldown(resendBtn, 60, 'ارسال دوباره ایمیل تأیید');
  } catch (error) {
    showFormMessage(message, 'error', mapAuthError(error));
  }
});
