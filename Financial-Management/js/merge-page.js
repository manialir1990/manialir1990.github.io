/* ==========================================================================
   merge-page.js — درخواست ادغام، کارتابل ادغام و ادغام فعال
   ========================================================================== */

import { qs, el, clear, icon } from './dom.js';
import { requireAuth } from './auth.js';
import { mountAppShell } from './layout.js';
import {
  findUsers, requestMerge, respondMerge, cancelMerge, endMerge, listMerges,
  invalidateMergeCache, mapMergeError,
} from './api-merge.js';
import { confirmDialog, setBusy } from './modal.js';
import { toastSuccess, toastError } from './toast.js';
import { hydrateIcons, showFormMessage, hideFormMessage } from './auth-ui.js';
import { setFieldError } from './validators.js';
import { tehranParts, formatMedium } from './jalali.js';
import { toFa } from './digits.js';

const SHARING_NOTE =
  'پس از تأیید، درآمدها و بدهی‌های هر دو نفر برای طرف مقابل قابل مشاهده می‌شود (فقط مشاهده، نه تغییر). هر یک از شما می‌تواند هر زمان ادغام را پایان دهد.';

function dateText(timestamp) {
  if (!timestamp) return '';
  return formatMedium(tehranParts(new Date(timestamp)).iso);
}

function avatar() {
  return el('span', { class: 'merge-item__avatar', 'aria-hidden': 'true' }, [icon('user', 22)]);
}

async function init() {
  const user = await requireAuth();
  if (!user) return;
  mountAppShell({ active: 'merge', user });
  hydrateIcons();

  const form = qs('#merge-form');
  const nameInput = qs('#merge-name');
  const submitBtn = qs('#merge-submit');
  const message = qs('#merge-message');
  const candidates = qs('#candidates');
  const requestCard = qs('#request-card');
  const activeCard = qs('#active-card');
  const inboxList = qs('#inbox-list');
  const sentList = qs('#sent-list');
  const inboxCount = qs('#inbox-count');
  const blockedNote = qs('#request-blocked');

  qs('#sharing-note').textContent = SHARING_NOTE;
  nameInput.focus();
  nameInput.addEventListener('input', () => {
    setFieldError(nameInput, '');
    hideFormMessage(message);
    clear(candidates);
  });

  /* ---------------- بارگذاری و رندر ---------------- */

  async function load() {
    let rows = [];
    try {
      rows = await listMerges();
    } catch (error) {
      showFormMessage(message, 'error', mapMergeError(error));
      return;
    }
    render(rows);
  }

  function render(rows) {
    const active = rows.find((r) => r.status === 'accepted');
    const incoming = rows.filter((r) => r.status === 'pending' && r.direction === 'incoming');
    const sent = rows.filter((r) => r.direction === 'outgoing' && (r.status === 'pending' || r.status === 'rejected'));

    /* ادغام فعال */
    activeCard.hidden = !active;
    if (active) {
      qs('#active-name').textContent = active.partner_name;
      qs('#active-meta').textContent = `${active.partner_email} · از ${dateText(active.responded_at || active.created_at)}`;
      qs('#end-merge').onclick = () => onEnd(active);
    }

    /* فرم درخواست: با ادغام فعال بسته می‌شود */
    form.hidden = Boolean(active);
    blockedNote.hidden = !active;

    /* کارتابل ادغام */
    clear(inboxList);
    inboxCount.textContent = incoming.length ? toFa(incoming.length) : '';
    inboxCount.hidden = !incoming.length;
    if (!incoming.length) {
      inboxList.append(el('div', { class: 'empty-note', text: 'درخواست ادغامی در انتظار پاسخ شما نیست.' }));
    }
    incoming.forEach((row) => {
      const accept = el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'تأیید' });
      const reject = el('button', { class: 'btn btn--ghost btn--sm btn--reject', type: 'button', text: 'رد' });
      accept.addEventListener('click', () => onRespond(row, true, accept, reject));
      reject.addEventListener('click', () => onRespond(row, false, accept, reject));
      inboxList.append(el('div', { class: 'merge-item merge-item--incoming' }, [
        avatar(),
        el('div', { class: 'merge-item__body' }, [
          el('strong', { class: 'merge-item__name', text: row.partner_name }),
          el('span', { class: 'merge-item__meta', text: `${row.partner_email} · ${dateText(row.created_at)}` }),
          el('span', { class: 'merge-item__text', text: 'درخواست ادغام داده است.' }),
        ]),
        el('div', { class: 'merge-item__actions' }, [accept, reject]),
      ]));
    });

    /* درخواست‌های ارسال‌شده */
    clear(sentList);
    if (!sent.length) {
      sentList.append(el('div', { class: 'empty-note', text: 'درخواست ارسال‌شده‌ای وجود ندارد.' }));
    }
    sent.forEach((row) => {
      const isPending = row.status === 'pending';
      const actions = [];
      if (isPending) {
        const cancel = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'لغو درخواست' });
        cancel.addEventListener('click', () => onCancel(row, cancel));
        actions.push(cancel);
      }
      sentList.append(el('div', { class: 'merge-item' }, [
        avatar(),
        el('div', { class: 'merge-item__body' }, [
          el('strong', { class: 'merge-item__name', text: row.partner_name }),
          el('span', { class: 'merge-item__meta', text: `${row.partner_email} · ${dateText(row.created_at)}` }),
        ]),
        el('span', {
          class: `badge ${isPending ? 'badge--soon' : 'badge--past'}`,
          text: isPending ? 'در انتظار پاسخ' : 'رد شد',
        }),
        el('div', { class: 'merge-item__actions' }, actions),
      ]));
    });
  }

  /* ---------------- عملیات ---------------- */

  async function sendRequest(candidate) {
    const ok = await confirmDialog({
      title: 'ارسال درخواست ادغام',
      message: `درخواست ادغام برای «${candidate.name}» (${candidate.email}) ارسال شود؟ ${SHARING_NOTE}`,
      confirmText: 'ارسال درخواست',
    });
    if (!ok) return;
    try {
      await requestMerge(candidate.id);
      toastSuccess('درخواست ادغام ارسال شد. منتظر تأیید کاربر مقابل باشید.');
      nameInput.value = '';
      clear(candidates);
      await load();
    } catch (error) {
      showFormMessage(message, 'error', mapMergeError(error));
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormMessage(message);
    clear(candidates);
    const query = nameInput.value.trim();
    if (query.length < 3) {
      setFieldError(nameInput, 'نام کاربر را کامل (حداقل ۳ نویسه) وارد کنید.');
      nameInput.focus();
      return;
    }
    setBusy(submitBtn, true, 'در حال جستجو…');
    try {
      const found = await findUsers(query);
      if (!found.length) {
        showFormMessage(message, 'error', 'کاربری با این نام پیدا نشد. نام را دقیقاً مثل ثبت نام او (نام و نام خانوادگی) بنویسید و مطمئن شوید او قبلاً وارد این سایت شده است.');
        return;
      }
      if (found.length === 1) {
        await sendRequest(found[0]);
        return;
      }
      showFormMessage(message, 'info', 'چند کاربر با این نام وجود دارد؛ از روی ایمیل پنهان‌شده، فرد مورد نظر را انتخاب کنید.');
      found.forEach((candidate) => {
        const pick = el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'درخواست ادغام' });
        pick.addEventListener('click', () => sendRequest(candidate));
        candidates.append(el('div', { class: 'merge-item' }, [
          avatar(),
          el('div', { class: 'merge-item__body' }, [
            el('strong', { class: 'merge-item__name', text: candidate.name }),
            el('span', { class: 'merge-item__meta', text: candidate.email }),
          ]),
          el('div', { class: 'merge-item__actions' }, [pick]),
        ]));
      });
    } catch (error) {
      showFormMessage(message, 'error', mapMergeError(error));
    } finally {
      setBusy(submitBtn, false);
    }
  });

  async function onRespond(row, accept, acceptBtn, rejectBtn) {
    const ok = await confirmDialog({
      title: accept ? 'تأیید ادغام' : 'رد درخواست ادغام',
      message: accept
        ? `با «${row.partner_name}» ادغام می‌شوید. ${SHARING_NOTE}`
        : `درخواست ادغام «${row.partner_name}» رد شود؟`,
      confirmText: accept ? 'تأیید ادغام' : 'رد درخواست',
      danger: !accept,
    });
    if (!ok) return;
    setBusy(acceptBtn, true);
    setBusy(rejectBtn, true);
    try {
      await respondMerge(row.id, accept);
      toastSuccess(accept ? 'ادغام تأیید شد؛ حالا داشبورد ادغامی در منو فعال است.' : 'درخواست رد شد.');
      invalidateMergeCache();
      if (accept) { setTimeout(() => location.reload(), 900); return; }
      await load();
    } catch (error) {
      toastError(mapMergeError(error));
      setBusy(acceptBtn, false);
      setBusy(rejectBtn, false);
    }
  }

  async function onCancel(row, button) {
    setBusy(button, true);
    try {
      await cancelMerge(row.id);
      toastSuccess('درخواست لغو شد.');
      await load();
    } catch (error) {
      toastError(mapMergeError(error));
      setBusy(button, false);
    }
  }

  async function onEnd(active) {
    const ok = await confirmDialog({
      title: 'پایان ادغام',
      message: `ادغام با «${active.partner_name}» پایان می‌یابد و داشبورد ادغامی برای هر دو نفر بسته می‌شود. اطلاعات مالی شخصی هیچ‌کدام حذف نمی‌شود.`,
      confirmText: 'پایان ادغام',
      danger: true,
    });
    if (!ok) return;
    try {
      await endMerge(active.id);
      toastSuccess('ادغام پایان یافت.');
      setTimeout(() => location.reload(), 700);
    } catch (error) {
      toastError(mapMergeError(error));
    }
  }

  void requestCard;
  await load();
}

init();
