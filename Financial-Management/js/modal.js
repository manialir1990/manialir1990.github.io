/* ==========================================================================
   modal.js — پنجره‌ی تأیید و بارگذاری تمام‌صفحه
   ========================================================================== */

import { el, icon } from './dom.js';

export function confirmDialog({
  title = 'تأیید',
  message = '',
  confirmText = 'تأیید',
  cancelText = 'انصراف',
  danger = false,
  extra = null,
} = {}) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;
    const titleId = 'dlg-title-' + Math.random().toString(36).slice(2, 8);

    const confirmBtn = el('button', {
      class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
      type: 'button',
      text: confirmText,
    });
    const cancelBtn = el('button', { class: 'btn btn--ghost', type: 'button', text: cancelText });

    const dialog = el('div', {
      class: 'modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
    }, [
      el('div', { class: 'modal__head' }, [
        icon(danger ? 'warning' : 'info', 24),
        el('h2', { id: titleId, class: 'modal__title', text: title }),
      ]),
      el('p', { class: 'modal__message', text: message }),
      extra,
      el('div', { class: 'modal__actions' }, [confirmBtn, cancelBtn]),
    ]);

    const overlay = el('div', { class: 'modal-overlay' }, [dialog]);

    function close(result) {
      document.removeEventListener('keydown', onKey);
      overlay.classList.remove('is-visible');
      setTimeout(() => overlay.remove(), 220);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(result);
    }

    function onKey(event) {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Tab') {
        const focusable = [confirmBtn, cancelBtn];
        const index = focusable.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
        else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0].focus(); }
      }
    }

    confirmBtn.addEventListener('click', () => close(true));
    cancelBtn.addEventListener('click', () => close(false));
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKey);

    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    (danger ? cancelBtn : confirmBtn).focus();
  });
}

let loaderNode = null;
let loaderCount = 0;

export function showLoader(text = 'در حال بارگذاری…') {
  loaderCount += 1;
  if (loaderNode) return;
  loaderNode = el('div', { class: 'loader-overlay', role: 'status', 'aria-live': 'polite' }, [
    el('div', { class: 'loader' }, [
      el('div', { class: 'loader__ring' }),
      el('div', { class: 'loader__coin', text: '$' }),
    ]),
    el('p', { class: 'loader__text', text }),
  ]);
  document.body.append(loaderNode);
  requestAnimationFrame(() => loaderNode && loaderNode.classList.add('is-visible'));
}

export function hideLoader() {
  loaderCount = Math.max(0, loaderCount - 1);
  if (loaderCount > 0 || !loaderNode) return;
  const node = loaderNode;
  loaderNode = null;
  node.classList.remove('is-visible');
  setTimeout(() => node.remove(), 240);
}

export async function withLoader(promise, text) {
  showLoader(text);
  try {
    return await promise;
  } finally {
    hideLoader();
  }
}

export function setBusy(button, busy, busyText) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.classList.add('is-busy');
    if (busyText) button.textContent = busyText;
  } else {
    button.disabled = false;
    button.classList.remove('is-busy');
    if (button.dataset.label) button.textContent = button.dataset.label;
  }
}
