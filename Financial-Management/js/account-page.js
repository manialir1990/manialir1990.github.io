/* ==========================================================================
   account-page.js — مشخصات حساب کاربری؛ هر مقدار قابل کپی است
   ========================================================================== */

import { qs, el, clear, icon } from './dom.js';
import { requireAuth, getProfileName } from './auth.js';
import { mountAppShell } from './layout.js';
import { countEntries } from './api.js';
import { getMergeSummary } from './api-merge.js';
import { copyText } from './clipboard.js';
import { toastSuccess, toastError } from './toast.js';
import { hydrateIcons } from './auth-ui.js';
import { tehranParts, formatMedium } from './jalali.js';
import { toFa, pad2 } from './digits.js';

function dateTime(timestamp) {
  if (!timestamp) return '—';
  const parts = tehranParts(new Date(timestamp));
  return `${formatMedium(parts.iso)} ساعت ${toFa(`${pad2(parts.hour)}:${pad2(parts.minute)}`)}`;
}

function copyButton(getText, label) {
  const button = el('button', {
    class: 'copy-btn',
    type: 'button',
    'aria-label': `کپی ${label}`,
    title: 'کپی',
  }, [icon('copy', 18)]);
  button.addEventListener('click', async (event) => {
    event.stopPropagation();
    const ok = await copyText(getText());
    if (ok) {
      button.classList.add('is-done');
      button.replaceChildren(icon('check', 18));
      toastSuccess(`${label} کپی شد.`);
      setTimeout(() => {
        button.classList.remove('is-done');
        button.replaceChildren(icon('copy', 18));
      }, 1600);
    } else {
      toastError('کپی انجام نشد؛ متن را دستی انتخاب کنید.');
    }
  });
  return button;
}

function fieldRow({ label, value, copy = value, ltr = false, mono = false }) {
  const valueNode = el('span', {
    class: `info-row__value${ltr ? ' is-ltr' : ''}${mono ? ' is-mono' : ''}`,
    text: value,
  });
  /* لمس خودِ مقدار هم آن را انتخاب می‌کند */
  valueNode.addEventListener('click', () => {
    const range = document.createRange();
    range.selectNodeContents(valueNode);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  return el('div', { class: 'info-row', role: 'listitem' }, [
    el('span', { class: 'info-row__label', text: label }),
    valueNode,
    copyButton(() => copy, label),
  ]);
}

async function init() {
  const user = await requireAuth();
  if (!user) return;
  mountAppShell({ active: 'account', user });
  hydrateIcons();

  const name = (await getProfileName(user).catch(() => '')) || '—';
  qs('#acc-name').textContent = name;
  qs('#acc-email').textContent = user.email || '';

  const summary = await getMergeSummary();
  let mergeText = 'بدون ادغام';
  if (summary.active) mergeText = `ادغام فعال با ${summary.active.partner_name}`;
  else if (summary.incoming.length) mergeText = `${toFa(summary.incoming.length)} درخواست ادغام در انتظار پاسخ شما`;

  let entriesText = '—';
  try { entriesText = toFa(await countEntries()); } catch (_) { /* ignore */ }

  const provider = (user.app_metadata && user.app_metadata.provider) || 'email';
  const confirmed = user.email_confirmed_at || user.confirmed_at;

  const fields = [
    { label: 'نام و نام خانوادگی', value: name },
    { label: 'ایمیل', value: user.email || '—', ltr: true },
    { label: 'وضعیت ایمیل', value: confirmed ? `تأیید شده در ${dateTime(confirmed)}` : 'تأیید نشده' },
    { label: 'شناسه‌ی کاربری', value: user.id, ltr: true, mono: true },
    { label: 'تاریخ ثبت نام', value: dateTime(user.created_at) },
    { label: 'آخرین ورود', value: dateTime(user.last_sign_in_at) },
    { label: 'روش ورود', value: provider === 'email' ? 'ایمیل و رمز عبور' : provider },
    { label: 'وضعیت ادغام', value: mergeText },
    { label: 'تعداد موارد مالی ثبت‌شده', value: entriesText },
  ];

  const list = qs('#account-fields');
  clear(list);
  fields.forEach((field) => list.append(fieldRow(field)));

  qs('#copy-all').addEventListener('click', async () => {
    const text = fields.map((f) => `${f.label}: ${f.value}`).join('\n');
    if (await copyText(text)) toastSuccess('همه‌ی مشخصات کپی شد.');
    else toastError('کپی انجام نشد.');
  });
}

init();
