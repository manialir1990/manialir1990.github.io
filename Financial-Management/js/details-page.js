/* ==========================================================================
   details-page.js — ریز اطلاعات مالی: دو جدول درآمد و بدهی + انتخاب چندتایی
   ========================================================================== */

import { qs, qsa, clear, el, downloadText } from './dom.js';
import { CONFIG } from './config.js';
import { requireAuth } from './auth.js';
import { mountAppShell } from './layout.js';
import { fetchEntries, deleteEntries, deleteSeries } from './api.js';
import { syncWithTimeIr, todayIso as getToday } from './timeir.js';
import { formatAmount, sum, toFa } from './digits.js';
import { addDaysIso, isoToJalali, jalaliMonthRangeIso, formatNumeric } from './jalali.js';
import { split, toCsv } from './stats.js';
import { createEntryRow } from './entry-row.js';
import { createSelection } from './selection.js';
import { confirmDialog, setBusy } from './modal.js';
import { toastSuccess, toastError } from './toast.js';
import { MSG } from './messages.js';
import { hydrateIcons } from './auth-ui.js';
import { debounce } from './dom.js';

const PAGE_SIZE = 150;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadFilters() {
  try {
    const raw = JSON.parse(localStorage.getItem(CONFIG.STORAGE.DETAILS_FILTERS) || '{}');
    return { range: raw.range || 'upcoming', sort: raw.sort || 'date-asc' };
  } catch (_) {
    return { range: 'upcoming', sort: 'date-asc' };
  }
}

function saveFilters(filters) {
  try { localStorage.setItem(CONFIG.STORAGE.DETAILS_FILTERS, JSON.stringify(filters)); } catch (_) { /* ignore */ }
}

function inRange(entry, range, today) {
  const { jy, jm } = isoToJalali(today);
  switch (range) {
    case 'upcoming': return entry.due_date >= today;
    case 'month': return entry.due_date >= today && entry.due_date <= addDaysIso(today, CONFIG.DAYS_MONTH - 1);
    case 'thismonth': {
      const r = jalaliMonthRangeIso(jy, jm);
      return entry.due_date >= r.start && entry.due_date <= r.end;
    }
    case 'past': return entry.due_date < today;
    default: return true;
  }
}

function sorter(mode) {
  switch (mode) {
    case 'date-desc': return (a, b) => (a.due_date < b.due_date ? 1 : a.due_date > b.due_date ? -1 : 0);
    case 'amount-desc': return (a, b) => b.amount - a.amount;
    case 'amount-asc': return (a, b) => a.amount - b.amount;
    default: return (a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0);
  }
}

async function init() {
  const user = await requireAuth();
  if (!user) return;
  mountAppShell({ active: 'details', user });
  hydrateIcons();
  await Promise.race([syncWithTimeIr(), delay(1500)]);
  const today = getToday();

  const filters = loadFilters();
  const rangeSelect = qs('#filter-range');
  const sortSelect = qs('#filter-sort');
  const searchInput = qs('#filter-search');
  const listIncome = qs('#list-income');
  const listDebt = qs('#list-debt');
  const bar = qs('#select-bar');
  const exitBtn = qs('#exit-select');
  const deleteBtn = qs('#btn-delete-selected');
  const exportBtn = qs('#btn-export');

  rangeSelect.value = filters.range;
  sortSelect.value = filters.sort;

  let all = [];
  let byId = new Map();
  const limits = { income: PAGE_SIZE, debt: PAGE_SIZE };

  const selection = createSelection({
    root: qs('#lists'),
    onChange: (ids, active) => updateBar(ids, active),
  });

  /* ---------------- نوار پایین انتخاب ---------------- */
  function updateBar(ids, active) {
    const chosen = [...ids].map((id) => byId.get(id)).filter(Boolean);
    const debt = sum(chosen.filter((e) => e.kind === 'debt'), (e) => e.amount);
    const income = sum(chosen.filter((e) => e.kind === 'income'), (e) => e.amount);
    const balance = Math.round((income - debt) * 1000) / 1000;

    bar.classList.toggle('is-open', active);
    bar.setAttribute('aria-hidden', String(!active));
    exitBtn.classList.toggle('is-visible', active);
    qs('#sel-debt').textContent = formatAmount(debt);
    qs('#sel-income').textContent = formatAmount(income);
    qs('#sel-balance').textContent = formatAmount(balance, { sign: true });
    qs('#sel-balance-box').dataset.sign = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'zero';
    qs('#sel-count').textContent = `${toFa(chosen.length)} مورد انتخاب شده`;
    deleteBtn.disabled = chosen.length === 0;
  }

  /* ---------------- رندر لیست‌ها ---------------- */
  function visible() {
    const query = searchInput.value.trim();
    const compare = sorter(sortSelect.value);
    return all
      .filter((e) => inRange(e, rangeSelect.value, today))
      .filter((e) => !query || e.title.includes(query))
      .sort(compare);
  }

  function renderOne(listNode, entries, kind) {
    clear(listNode);
    const shown = entries.slice(0, limits[kind]);
    if (!entries.length) {
      listNode.append(el('div', { class: 'empty-note', text: kind === 'income' ? MSG.noIncome : MSG.noDebt }));
    }
    shown.forEach((entry) => listNode.append(createEntryRow(entry, { todayIso: today, selectable: true })));
    if (entries.length > shown.length) {
      listNode.append(el('button', {
        class: 'btn btn--ghost btn--block more-btn',
        type: 'button',
        text: `نمایش ${toFa(Math.min(PAGE_SIZE, entries.length - shown.length))} مورد بیشتر از ${toFa(entries.length - shown.length)}`,
        onclick: () => { limits[kind] += PAGE_SIZE; render(); },
      }));
    }
  }

  function render() {
    const entries = visible();
    const { incomes, debts } = split(entries);
    renderOne(listIncome, incomes, 'income');
    renderOne(listDebt, debts, 'debt');
    qs('#total-income').textContent = `${formatAmount(sum(incomes, (e) => e.amount))} م.ت`;
    qs('#total-debt').textContent = `${formatAmount(sum(debts, (e) => e.amount))} م.ت`;
    qs('#count-income').textContent = `${toFa(incomes.length)} مورد`;
    qs('#count-debt').textContent = `${toFa(debts.length)} مورد`;
    selection.refresh();
    updateBar(new Set(selection.ids()), selection.active);
  }

  async function load() {
    qs('#lists').classList.add('is-loading');
    try {
      all = await fetchEntries();
      byId = new Map(all.map((e) => [e.id, e]));
      selection.prune(new Set(all.map((e) => e.id)));
      render();
    } catch (error) {
      toastError(MSG.loadFailed);
    } finally {
      qs('#lists').classList.remove('is-loading');
    }
  }

  /* ---------------- فیلترها ---------------- */
  const onFilter = () => {
    limits.income = PAGE_SIZE;
    limits.debt = PAGE_SIZE;
    saveFilters({ range: rangeSelect.value, sort: sortSelect.value });
    render();
  };
  rangeSelect.addEventListener('change', onFilter);
  sortSelect.addEventListener('change', onFilter);
  searchInput.addEventListener('input', debounce(onFilter, 200));

  /* ---------------- انتخاب همه در هر جدول ---------------- */
  qsa('[data-select-all]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.selectAll;
      const ids = visible().filter((e) => e.kind === kind).map((e) => e.id);
      if (!ids.length) return;
      const allOn = ids.every((id) => selection.has(id));
      if (!selection.active) {
        selection.start();
        selection.selectMany(ids, true);
        return;
      }
      selection.selectMany(ids, !allOn);
    });
  });

  exitBtn.addEventListener('click', () => selection.clear());

  /* ---------------- حذف ---------------- */
  deleteBtn.addEventListener('click', async () => {
    const ids = selection.ids();
    if (!ids.length) return;
    const chosen = ids.map((id) => byId.get(id)).filter(Boolean);
    const seriesIds = [...new Set(chosen.filter((e) => e.series_id).map((e) => e.series_id))];

    let seriesBox = null;
    let extra = null;
    if (seriesIds.length) {
      seriesBox = el('input', { type: 'checkbox', id: 'delete-series' });
      extra = el('label', { class: 'check check--dialog', for: 'delete-series' }, [
        seriesBox, el('span', { text: MSG.deleteSeriesLabel }),
      ]);
    }

    const ok = await confirmDialog({
      title: MSG.deleteConfirmTitle,
      message: MSG.deleteConfirmText(toFa(ids.length)),
      confirmText: 'حذف',
      danger: true,
      extra,
    });
    if (!ok) return;

    setBusy(deleteBtn, true, 'در حال حذف…');
    try {
      const removed = (seriesBox && seriesBox.checked)
        ? await deleteSeries(seriesIds) + await deleteEntries(chosen.filter((e) => !e.series_id).map((e) => e.id))
        : await deleteEntries(ids);
      toastSuccess(MSG.deleted(toFa(removed)));
      selection.clear();
      await load();
    } catch (error) {
      toastError(MSG.deleteFailed);
    } finally {
      setBusy(deleteBtn, false);
    }
  });

  /* ---------------- خروجی CSV ---------------- */
  exportBtn.addEventListener('click', () => {
    const rows = visible();
    if (!rows.length) { toastError(MSG.noData); return; }
    downloadText(`financial-details-${today}.csv`, toCsv(rows, formatNumeric));
    toastSuccess(MSG.exportDone);
  });

  await load();
}

init();
