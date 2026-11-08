/* ==========================================================================
   toast.js — پیام‌های کوتاه گوشه‌ی صفحه
   ========================================================================== */

import { el, icon } from './dom.js';

let host = null;

function ensureHost() {
  if (host && document.body.contains(host)) return host;
  host = el('div', { class: 'toast-host', role: 'region', 'aria-live': 'polite', 'aria-label': 'اعلان‌ها' });
  document.body.append(host);
  return host;
}

const TYPE_ICON = { success: 'check', error: 'warning', info: 'info', warning: 'warning' };

export function toast(message, type = 'info', duration = 4200) {
  const root = ensureHost();
  const node = el('div', { class: `toast toast--${type}`, role: type === 'error' ? 'alert' : 'status' }, [
    icon(TYPE_ICON[type] || 'info', 20),
    el('span', { class: 'toast__text', text: message }),
    el('button', {
      class: 'toast__close',
      type: 'button',
      'aria-label': 'بستن',
      onclick: () => dismiss(node),
    }, [icon('close', 16)]),
  ]);
  root.append(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  if (duration > 0) setTimeout(() => dismiss(node), duration);
  return node;
}

function dismiss(node) {
  if (!node.isConnected) return;
  node.classList.remove('is-visible');
  node.classList.add('is-leaving');
  setTimeout(() => node.remove(), 320);
}

export const toastSuccess = (m) => toast(m, 'success');
export const toastError = (m) => toast(m, 'error', 6000);
export const toastInfo = (m) => toast(m, 'info');
export const toastWarning = (m) => toast(m, 'warning', 5500);
