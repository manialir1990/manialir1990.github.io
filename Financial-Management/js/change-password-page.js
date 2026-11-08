/* ==========================================================================
   change-password-page.js — تغییر رمز عبور کاربر واردشده
   ========================================================================== */

import { qs } from './dom.js';
import { requireAuth, signIn, updatePassword, signOutOtherSessions, mapAuthError } from './auth.js';
import { mountAppShell } from './layout.js';
import {
  runValidators, validatePassword, validatePasswordMatch, setFieldError,
} from './validators.js';
import { hydrateIcons, bindPasswordToggles, bindStrengthMeter, showFormMessage, hideFormMessage } from './auth-ui.js';
import { setBusy } from './modal.js';
import { toastSuccess } from './toast.js';
import { MSG } from './messages.js';

async function init() {
  const user = await requireAuth();
  if (!user) return;
  mountAppShell({ active: 'password', user });
  hydrateIcons();
  bindPasswordToggles();

  const form = qs('#password-form');
  const currentInput = qs('#current-password');
  const newInput = qs('#new-password');
  const confirmInput = qs('#new-password-confirm');
  const submitBtn = qs('#password-submit');
  const message = qs('#password-message');

  bindStrengthMeter(newInput, qs('#strength'));
  qs('#account-email').textContent = user.email || '';
  currentInput.focus();

  [currentInput, newInput, confirmInput].forEach((input) => {
    input.addEventListener('input', () => { setFieldError(input, ''); hideFormMessage(message); });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormMessage(message);

    const ok = runValidators([
      { input: currentInput, check: () => (currentInput.value ? '' : MSG.required) },
      { input: newInput, check: () => validatePassword(newInput.value) || (newInput.value === currentInput.value ? 'رمز جدید باید با رمز فعلی متفاوت باشد.' : '') },
      { input: confirmInput, check: () => validatePasswordMatch(newInput.value, confirmInput.value) },
    ]);
    if (!ok) return;

    setBusy(submitBtn, true, 'در حال بررسی…');
    try {
      /* تأیید هویت دوباره با رمز فعلی */
      try {
        await signIn({ email: user.email, password: currentInput.value });
      } catch (_) {
        setFieldError(currentInput, 'رمز عبور فعلی درست نیست.');
        currentInput.focus();
        setBusy(submitBtn, false);
        return;
      }
      await updatePassword(newInput.value);
      await signOutOtherSessions();
      form.reset();
      newInput.dispatchEvent(new Event('input'));
      showFormMessage(message, 'success', MSG.resetDone + ' نشست‌های دیگر شما بسته شد.');
      toastSuccess(MSG.resetDone);
    } catch (error) {
      showFormMessage(message, 'error', mapAuthError(error));
    } finally {
      setBusy(submitBtn, false);
    }
  });
}

init();
