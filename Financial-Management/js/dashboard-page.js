/* ==========================================================================
   dashboard-page.js — داشبورد وضعیت مالی
   ========================================================================== */

import { qs, clear, el, icon } from './dom.js';
import { CONFIG } from './config.js';
import { requireAuth, getProfileName } from './auth.js';
import { mountAppShell } from './layout.js';
import { fetchEntries } from './api.js';
import { syncWithTimeIr, todayIso as getToday } from './timeir.js';
import { formatAmount, formatRatio, toFa, sum } from './digits.js';
import { formatLong, addDaysIso, formatShort } from './jalali.js';
import { totals, ratio, rawRatio, statusFor, nearest, daysUntil, describeDistance } from './stats.js';
import { createGauge } from './gauge.js';
import { createCompactRow } from './entry-row.js';
import { toastError } from './toast.js';
import { MSG } from './messages.js';
import { hydrateIcons } from './auth-ui.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fillList(listNode, entries, emptyText, todayIso) {
  clear(listNode);
  if (!entries.length) {
    listNode.append(el('li', { class: 'compact-empty', text: emptyText }));
    return;
  }
  entries.forEach((entry) => listNode.append(createCompactRow(entry, todayIso)));
}

function renderNearest(node, entry, todayIso, emptyText) {
  clear(node);
  if (!entry) {
    node.append(el('span', { class: 'nearest__empty', text: emptyText }));
    return;
  }
  node.append(
    el('strong', { class: 'nearest__title', text: entry.title }),
    el('span', { class: 'nearest__meta', text: `${formatShort(entry.due_date)} · ${describeDistance(daysUntil(todayIso, entry.due_date))}` }),
    el('span', { class: 'nearest__amount', text: `${formatAmount(entry.amount)} میلیون تومان` }),
  );
}

function setStatus(box, level) {
  box.dataset.status = level.key;
  qs('.status__label', box).textContent = level.label;
  qs('.status__hint', box).textContent = level.hint;
}

async function init() {
  const user = await requireAuth();
  if (!user) return;
  mountAppShell({ active: 'dashboard', user });
  hydrateIcons();

  await Promise.race([syncWithTimeIr(), delay(1500)]);
  const today = getToday();

  getProfileName(user).then((name) => {
    qs('#greeting').textContent = `سلام ${name || 'کاربر'}`;
  });
  qs('#today-long').textContent = formatLong(today);

  const gaugeMount = qs('#gauge-mount');
  const gauge = createGauge(gaugeMount);
  const valueNode = qs('#gauge-value');
  const statusBox = qs('#gauge-status');

  let entries = [];
  try {
    entries = await fetchEntries({ from: today, to: addDaysIso(today, CONFIG.DAYS_MONTH - 1) });
  } catch (error) {
    toastError(MSG.loadFailed);
    qs('#dash-error').hidden = false;
  }

  /* ---- آمار ۳۰ روز آینده ---- */
  const month = totals(entries);
  qs('#stat-income').textContent = formatAmount(month.income);
  qs('#stat-debt').textContent = formatAmount(month.debt);
  qs('#stat-balance').textContent = formatAmount(month.balance, { sign: true });
  qs('#stat-income-count').textContent = `${toFa(month.incomeCount)} مورد`;
  qs('#stat-debt-count').textContent = `${toFa(month.debtCount)} مورد`;
  const balanceCard = qs('#stat-balance-card');
  balanceCard.dataset.sign = month.balance > 0 ? 'positive' : month.balance < 0 ? 'negative' : 'zero';
  qs('#stat-balance-note').textContent =
    month.balance > 0 ? 'مازاد درآمد بر بدهی‌ها' : month.balance < 0 ? 'کسری: بدهی‌ها بیشتر از درآمد است' : 'درآمد و بدهی برابر است';

  /* ---- نمودار عقربه‌ای ---- */
  const hasData = month.income > 0 || month.debt > 0;
  const target = ratio(month.income, month.debt);
  const raw = rawRatio(month.income, month.debt);
  const level = statusFor(Number.isFinite(raw) ? raw : CONFIG.GAUGE_MAX, hasData);
  setStatus(statusBox, level);
  qs('#gauge-caption').textContent = hasData
    ? (month.debt > 0 ? `${formatAmount(month.income)} درآمد در برابر ${formatAmount(month.debt)} بدهی` : 'بدهی‌ای برای ماه آینده ثبت نشده است')
    : 'برای نمایش نمودار از منوی «ورود اطلاعات مالی» درآمد و بدهی ثبت کنید.';

  /* ---- ۱۰ روز آینده ---- */
  const shortTo = addDaysIso(today, CONFIG.DAYS_SHORT - 1);
  const shortEntries = entries.filter((e) => e.due_date <= shortTo);
  const shortIncomes = shortEntries.filter((e) => e.kind === 'income');
  const shortDebts = shortEntries.filter((e) => e.kind === 'debt');
  fillList(qs('#short-incomes'), shortIncomes, MSG.noIncome, today);
  fillList(qs('#short-debts'), shortDebts, MSG.noDebt, today);
  qs('#short-income-total').textContent = `${formatAmount(sum(shortIncomes, (e) => e.amount))} م.ت`;
  qs('#short-debt-total').textContent = `${formatAmount(sum(shortDebts, (e) => e.amount))} م.ت`;
  qs('#short-balance').textContent = formatAmount(
    sum(shortIncomes, (e) => e.amount) - sum(shortDebts, (e) => e.amount), { sign: true });
  qs('#short-range').textContent = `${formatShort(today)} تا ${formatShort(shortTo)}`;

  /* ---- نزدیک‌ترین سررسیدها ---- */
  renderNearest(qs('#nearest-debt'), nearest(entries, 'debt', today), today, 'بدهی نزدیکی ثبت نشده است');
  renderNearest(qs('#nearest-income'), nearest(entries, 'income', today), today, 'درآمد نزدیکی ثبت نشده است');

  qs('#dashboard-content').classList.add('is-ready');

  /* انیمیشن عقربه پس از نمایان‌شدن باکس شروع می‌شود */
  const start = () => gauge.animateTo(target, {
    duration: CONFIG.GAUGE_DURATION_MS,
    onFrame: (v) => { valueNode.textContent = formatRatio(v); },
  });
  const box = qs('#gauge-box');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((items) => {
      if (items.some((i) => i.isIntersecting)) { observer.disconnect(); start(); }
    }, { threshold: 0.45 });
    observer.observe(box);
  } else start();

  /* وقتی کاربر برگه را دوباره باز می‌کند نمودار بازپخش نمی‌شود، فقط مقدار نهایی ثابت می‌ماند */
  void icon;
}

init();
