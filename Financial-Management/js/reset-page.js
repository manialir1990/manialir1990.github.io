/* ==========================================================================
   reset-page.js — تعیین رمز عبور جدید پس از کلیک روی لینک ایمیل
   ========================================================================== */

import { qs } from './dom.js';
import { ROUTES } from './config.js';
import { mountPublicShell } from './layout.js';
import { getSession, onAuthChange, updatePassword, signOut, mapAuthError } from './auth.js';
import {
  runValidators, validatePassword, validatePasswordMatch, setFieldError,
} from './validators.js';
import {
  hydrateIcons, bindPasswordToggles, bindStrengthMeter, showFormMessage, hideFormMessage,
} from './auth-ui.js';
import { setBusy } from './modal.js';
import { MSG } from './messages.js';

mountPublicShell();
hydrateIcons();
bindPasswordToggles();

const form = qs('#reset-form');
const passwordInput = qs('#password');
const confirmInput = qs('#password-confirm');
const submitBtn = qs('#reset-submit');
const message = qs('#reset-message');
const invalidBox = qs('#reset-invalid');

bindStrengthMeter(passwordInput, qs('#strength'));

let ready = false;
function enable() {
  ready = true;
  form.hidden = false;
  invalidBox.hidden = true;
  passwordInput.focus();
}

onAuthChange((event) => {
  if (event === 'PASSWORD_RECOVERY') enable();
});

(async () => {
  const hash = location.hash;
  const hasRecoveryToken = /type=recovery/.test(hash) || /access_token=/.test(hash);
  const session = await getSession();
  if (session && hasRecoveryToken) enable();
  else setTimeout(() => {
    if (!ready) { form.hidden = true; invalidBox.hidden = false; }
  }, 2500);
})();

[passwordInput, confirmInput].forEach((input) => {
  input.addEventListener('input', () => { setFieldError(input, ''); hideFormMessage(message); });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideFormMessage(message);
  const ok = runValidators([
    { input: passwordInput, check: () => validatePassword(passwordInput.value) },
    { input: confirmInput, check: () => validatePasswordMatch(passwordInput.value, confirmInput.value) },
  ]);
  if (!ok) return;

  setBusy(submitBtn, true, 'در حال ذخیره…');
  try {
    await updatePassword(passwordInput.value);
    showFormMessage(message, 'success', MSG.resetDone);
    setTimeout(() => signOut(), 1600);
  } catch (error) {
    const text = mapAuthError(error);
    showFormMessage(message, 'error', text === MSG.unknown ? MSG.resetNoSession : text);
    setBusy(submitBtn, false);
  }
});

void ROUTES;
