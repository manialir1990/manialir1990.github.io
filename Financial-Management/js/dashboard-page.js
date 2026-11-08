/* ==========================================================================
   dashboard-page.js — داشبورد فردی و (در صورت ادغام فعال) داشبورد ادغامی
   ========================================================================== */

import { qs, qsa, clear, el } from './dom.js';
import { CONFIG } from './config.js';
import { requireAuth, getProfileName } from './auth.js';
import { mountAppShell } from './layout.js';
import { fetchEntries } from './api.js';
import { getMergeSummary } from './api-merge.js';
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

function fillList(listNode, entries, emptyText, todayIso, ownerOf) {
  clear(listNode);
  if (!entries.length) {
    listNode.append(el('li', { class: 'compact-empty', text: emptyText }));
    return;
  }
  entries.forEach((entry) => listNode.append(createCompactRow(entry, todayIso, ownerOf(entry))));
}

function renderNearest(node, entry, todayIso, emptyText, ownerOf) {
  clear(node);
  if (!entry) {
    node.append(el('span', { class: 'nearest__empty', text: emptyText }));
    return;
  }
  const owner = ownerOf(entry);
  node.append(
    el('strong', { class: 'nearest__title' }, [
      entry.title,
      owner ? el('span', { class: `owner-tag${owner === 'من' ? ' owner-tag--me' : ''}`, text: owner }) : null,
    ]),
    el('span', { class: 'nearest__meta', text: `${formatShort(entry.due_date)} · ${describeDistance(daysUntil(todayIso, entry.due_date))}` }),
    el('span', { class: 'nearest__amount', text: `${formatAmount(entry.amount)} میلیون تومان` }),
  );
}

function setStatus(box, level) {
  box.dataset.status = level.key;
  qs('.status__label', box).textContent = level.label;
  qs('.status__hint', box).textContent = level.hint;
}

/* سهم هر نفر در داشبورد ادغامی */
function renderSplit(grid, people, entries) {
  clear(grid);
  people.forEach((person) => {
    const t = totals(entries.filter((e) => e.user_id === person.id));
    const sign = t.balance > 0 ? 'positive' : t.balance < 0 ? 'negative' : 'zero';
    grid.append(el('div', { class: 'split-person' }, [
      el('div', { class: 'split-person__name' }, [
        el('span', { class: `owner-tag${person.me ? ' owner-tag--me' : ''}`, text: person.label }),
        el('strong', { text: person.fullName }),
      ]),
      el('dl', { class: 'split-person__rows' }, [
        el('div', {}, [el('dt', { text: 'درآمد' }), el('dd', { class: 'is-income', text: formatAmount(t.income) })]),
        el('div', {}, [el('dt', { text: 'بدهی' }), el('dd', { class: 'is-debt', text: formatAmount(t.debt) })]),
        el('div', {}, [el('dt', { text: 'برآیند' }), el('dd', { class: `is-${sign}`, text: formatAmount(t.balance, { sign: true }) })]),
      ]),
    ]));
  });
}

async function init() {
  const user = await requireAuth();
  if (!user) return;
  mountAppShell({ active: 'dashboard', user });
  hydrateIcons();

  await Promise.race([syncWithTimeIr(), delay(1500)]);
  const today = getToday();
  qs('#today-long').textContent = formatLong(today);

  const myName = (await getProfileName(user).catch(() => '')) || 'کاربر';
  qs('#greeting').textContent = `سلام ${myName}`;

  const summary = await getMergeSummary();
  const merge = summary.active;
  const people = merge
    ? [
      { id: user.id, label: 'من', fullName: myName, me: true },
      { id: merge.partner_id, label: merge.partner_name, fullName: merge.partner_name, me: false },
    ]
    : [{ id: user.id, label: 'من', fullName: myName, me: true }];
  const labelOf = new Map(people.map((p) => [p.id, p.label]));

  const gauge = createGauge(qs('#gauge-mount'));
  const valueNode = qs('#gauge-value');
  const statusBox = qs('#gauge-status');
  const tabsBox = qs('#dash-tabs');
  const cache = {};
  let mode = merge && location.hash === '#merged' ? 'merged' : 'personal';
  let gaugeStarted = false;
  let token = 0;

  async function loadScope(key) {
    if (cache[key]) return cache[key];
    const ids = key === 'merged' ? people.map((p) => p.id) : [user.id];
    cache[key] = await fetchEntries({ from: today, to: addDaysIso(today, CONFIG.DAYS_MONTH - 1), userIds: ids });
    return cache[key];
  }

  function animate(target) {
    const start = () => gauge.animateTo(target, {
      duration: CONFIG.GAUGE_DURATION_MS,
      onFrame: (v) => { valueNode.textContent = formatRatio(v); },
    });
    if (gaugeStarted) { start(); return; }
    gaugeStarted = true;
    const box = qs('#gauge-box');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((items) => {
        if (items.some((i) => i.isIntersecting)) { observer.disconnect(); start(); }
      }, { threshold: 0.45 });
      observer.observe(box);
    } else start();
  }

  function render(entries, key) {
    const merged = key === 'merged';
    const ownerOf = merged ? (e) => labelOf.get(e.user_id) || '' : () => '';

    qs('#dash-lead').textContent = merged
      ? `وضعیت مالی ترکیبی شما و ${merge.partner_name} در ۳۰ روز آینده`
      : 'وضعیت مالی ۳۰ روز آینده‌ی شما';
    qs('#gauge-title').textContent = merged
      ? 'نسبت درآمد به بدهی‌های ماه آینده (ادغامی)'
      : 'نسبت درآمد به بدهی‌های ماه آینده';
    document.body.dataset.dash = key;

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

    const hasData = month.income > 0 || month.debt > 0;
    const target = ratio(month.income, month.debt);
    const raw = rawRatio(month.income, month.debt);
    setStatus(statusBox, statusFor(Number.isFinite(raw) ? raw : CONFIG.GAUGE_MAX, hasData));
    qs('#gauge-caption').textContent = hasData
      ? (month.debt > 0 ? `${formatAmount(month.income)} درآمد در برابر ${formatAmount(month.debt)} بدهی` : 'بدهی‌ای برای ماه آینده ثبت نشده است')
      : 'برای نمایش نمودار از منوی «ورود اطلاعات مالی» درآمد و بدهی ثبت کنید.';

    const shortTo = addDaysIso(today, CONFIG.DAYS_SHORT - 1);
    const shortEntries = entries.filter((e) => e.due_date <= shortTo);
    const shortIncomes = shortEntries.filter((e) => e.kind === 'income');
    const shortDebts = shortEntries.filter((e) => e.kind === 'debt');
    fillList(qs('#short-incomes'), shortIncomes, MSG.noIncome, today, ownerOf);
    fillList(qs('#short-debts'), shortDebts, MSG.noDebt, today, ownerOf);
    qs('#short-income-total').textContent = `${formatAmount(sum(shortIncomes, (e) => e.amount))} م.ت`;
    qs('#short-debt-total').textContent = `${formatAmount(sum(shortDebts, (e) => e.amount))} م.ت`;
    qs('#short-balance').textContent = formatAmount(
      sum(shortIncomes, (e) => e.amount) - sum(shortDebts, (e) => e.amount), { sign: true });
    qs('#short-range').textContent = `${formatShort(today)} تا ${formatShort(shortTo)}`;

    renderNearest(qs('#nearest-debt'), nearest(entries, 'debt', today), today, 'بدهی نزدیکی ثبت نشده است', ownerOf);
    renderNearest(qs('#nearest-income'), nearest(entries, 'income', today), today, 'درآمد نزدیکی ثبت نشده است', ownerOf);

    const splitCard = qs('#split-card');
    splitCard.hidden = !merged;
    if (merged) renderSplit(qs('#split-grid'), people, entries);

    qs('#dashboard-content').classList.add('is-ready');
    animate(target);
  }

  async function show(key) {
    const mine = ++token;
    mode = key;
    qsa('[data-dash-tab]').forEach((b) => {
      const on = b.dataset.dashTab === key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    qs('#dashboard-content').classList.add('is-switching');
    try {
      const entries = await loadScope(key);
      if (mine !== token) return;
      render(entries, key);
    } catch (error) {
      if (mine === token) {
        toastError(MSG.loadFailed);
        qs('#dash-error').hidden = false;
        render([], key);
      }
    } finally {
      if (mine === token) qs('#dashboard-content').classList.remove('is-switching');
    }
  }

  if (merge) {
    tabsBox.hidden = false;
    qs('#tab-merged-label').textContent = `داشبورد ادغامی با ${merge.partner_name}`;
    qsa('[data-dash-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.dashTab;
        if (key === mode) return;
        history.replaceState(null, '', key === 'merged' ? '#merged' : location.pathname + location.search);
        show(key);
      });
    });
    window.addEventListener('hashchange', () => {
      const key = location.hash === '#merged' ? 'merged' : 'personal';
      if (key !== mode) show(key);
    });
  }

  await show(mode);
}

init();
