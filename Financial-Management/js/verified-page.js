/* ==========================================================================
   verified-page.js — بازگشت از لینک تأیید ایمیل
   ========================================================================== */

import { qs } from './dom.js';
import { ROUTES } from './config.js';
import { mountPublicShell } from './layout.js';
import { getSession, onAuthChange } from './auth.js';
import { hydrateIcons } from './auth-ui.js';
import { toFa } from './digits.js';

mountPublicShell();
hydrateIcons();

const working = qs('#state-working');
const success = qs('#state-success');
const failure = qs('#state-failure');
const failureText = qs('#failure-text');
const countdown = qs('#countdown');
const goBtn = qs('#go-dashboard');

function show(panel) {
  [working, success, failure].forEach((p) => { p.hidden = p !== panel; });
}

function startCountdown() {
  let left = 6;
  const tick = () => {
    countdown.textContent = toFa(left);
    if (left <= 0) { location.replace(ROUTES.dashboard); return; }
    left -= 1;
    setTimeout(tick, 1000);
  };
  tick();
}

function readHashError() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(location.search);
  const description = params.get('error_description') || query.get('error_description');
  const code = params.get('error_code') || query.get('error_code');
  if (!description && !code) return '';
  if (code === 'otp_expired') return 'لینک تأیید منقضی شده یا قبلاً استفاده شده است. از صفحه‌ی ورود ایمیل تأیید را دوباره بفرستید.';
  return 'تأیید ایمیل انجام نشد. از صفحه‌ی ورود ایمیل تأیید را دوباره بفرستید.';
}

goBtn.addEventListener('click', () => location.replace(ROUTES.dashboard));

(async () => {
  const error = readHashError();
  if (error) {
    failureText.textContent = error;
    show(failure);
    return;
  }

  let settled = false;
  const finish = (ok) => {
    if (settled) return;
    settled = true;
    if (ok) { show(success); startCountdown(); }
    else {
      failureText.textContent = 'تأیید ایمیل کامل نشد. اگر قبلاً تأیید کرده‌اید، وارد حساب خود شوید.';
      show(failure);
    }
  };

  const off = onAuthChange((event, session) => {
    if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) finish(true);
  });

  const session = await getSession();
  if (session) finish(true);
  else setTimeout(() => { finish(false); off(); }, 4000);
})();
