/* ==========================================================================
   entry-page.js — ورود اطلاعات مالی + جدول‌های روزبه‌روز درآمد و بدهی
   ========================================================================== */

import { qs, qsa } from './dom.js';
import { CONFIG } from './config.js';
import { requireAuth } from './auth.js';
import { mountAppShell } from './layout.js';
import { fetchEntries, insertEntries } from './api.js';
import { syncWithTimeIr, todayIso as getToday } from './timeir.js';
import { createDateSelect } from './date-select.js';
import { buildRows, previewDates } from './recurrence.js';
import { parseAmount, toFa, toEn, formatAmount, sum } from './digits.js';
import {
  runValidators, validateTitle, validateAmount, validateJalaliDate, validateRepeatCount, setFieldError,
} from './validators.js';
import { setBusy } from './modal.js';
import { toastSuccess, toastError } from './toast.js';
import { MSG, UNIT_LABEL } from './messages.js';
import { initialPeriod, stepPeriod, computeRange, MODES } from './period.js';
import { renderDayTable } from './day-table.js';
import { split } from './stats.js';
import { formatMedium, jalaliToIso } from './jalali.js';
import { hydrateIcons, showFormMessage, hideFormMessage } from './auth-ui.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const user = await requireAuth();
  if (!user) return;
  mountAppShell({ active: 'entry', user });
  hydrateIcons();
  await Promise.race([syncWithTimeIr(), delay(1500)]);

  const today = getToday();
  const form = qs('#entry-form');
  const card = qs('#entry-card');
  const kindInputs = qsa('input[name="kind"]', form);
  const titleInput = qs('#title');
  const amountInput = qs('#amount');
  const repeatBox = qs('#repeat');
  const repeatPanel = qs('#repeat-panel');
  const unitInputs = qsa('input[name="unit"]', form);
  const countInput = qs('#repeat-count');
  const previewNode = qs('#repeat-preview');
  const submitBtn = qs('#entry-submit');
  const message = qs('#form-message');
  const dateSlot = qs('#date-slot');
  const amountWords = qs('#amount-hint');

  const dateSelect = createDateSelect({ idPrefix: 'due', initialIso: today, onChange: updatePreview });
  dateSlot.append(dateSelect.root);

  const getKind = () => (kindInputs.find((i) => i.checked) || {}).value || 'debt';
  const getUnit = () => (unitInputs.find((i) => i.checked) || {}).value || 'monthly';

  /* ---------------- پیش‌نمایش تکرار ---------------- */
  function updatePreview() {
    if (!repeatBox.checked) { previewNode.textContent = ''; return; }
    if (validateRepeatCount(countInput.value)) { previewNode.textContent = ''; return; }
    const d = dateSelect.getValue();
    if (validateJalaliDate(d)) return;
    const preview = previewDates({
      kind: getKind(), title: 'x', amount: 1, ...d,
      recurring: true, unit: getUnit(), count: Number(toEn(countInput.value)),
    });
    previewNode.textContent =
      `در مجموع ${toFa(preview.total)} مورد ثبت می‌شود؛ از ${formatMedium(jalaliToIso(d.jy, d.jm, d.jd))} تا ${formatMedium(preview.last)}.`;
  }

  function updateAmountHint() {
    const n = parseAmount(amountInput.value);
    if (Number.isNaN(n) || n <= 0) { amountWords.textContent = ''; return; }
    amountWords.textContent = `${formatAmount(n * 1000000)} تومان`.replace('میلیون ', '');
  }

  repeatBox.addEventListener('change', () => {
    repeatPanel.hidden = !repeatBox.checked;
    repeatPanel.classList.toggle('is-open', repeatBox.checked);
    if (repeatBox.checked) countInput.focus();
    updatePreview();
  });
  unitInputs.forEach((i) => i.addEventListener('change', () => {
    qs('#count-unit').textContent = UNIT_LABEL[getUnit()] === 'ماهانه' ? 'ماه' : 'سال';
    updatePreview();
  }));
  countInput.addEventListener('input', () => { setFieldError(countInput, ''); updatePreview(); });
  kindInputs.forEach((i) => i.addEventListener('change', () => {
    card.dataset.kind = getKind();
    qs('#title-label').textContent = getKind() === 'income' ? 'علت درآمد' : 'علت بدهی';
  }));
  amountInput.addEventListener('input', () => { setFieldError(amountInput, ''); updateAmountHint(); });
  titleInput.addEventListener('input', () => setFieldError(titleInput, ''));
  card.dataset.kind = getKind();

  /* ---------------- جدول‌ها ---------------- */
  let period = initialPeriod();
  let loadToken = 0;

  async function loadTables() {
    const token = ++loadToken;
    const range = computeRange(period, today);
    qs('#period-label').textContent = range.label;
    qs('#tables').classList.add('is-loading');
    qsa('[data-period]').forEach((b) => b.classList.toggle('is-active', b.dataset.period === period.mode));
    qs('#btn-prev').hidden = period.mode === MODES.ROLLING;
    qs('#btn-prev').textContent = period.mode === MODES.MONTH ? 'ماه قبل' : 'سال قبل';
    qs('#btn-next').hidden = period.mode === MODES.ROLLING;
    qs('#btn-next').textContent = period.mode === MODES.MONTH ? 'ماه بعد' : 'سال بعد';

    try {
      const entries = await fetchEntries({ from: range.from, to: range.to });
      if (token !== loadToken) return;
      const { incomes, debts } = split(entries);
      renderDayTable(qs('#income-table'), { kind: 'income', entries: incomes, range, todayIso: today });
      renderDayTable(qs('#debt-table'), { kind: 'debt', entries: debts, range, todayIso: today });
      const inc = sum(incomes, (e) => e.amount);
      const dbt = sum(debts, (e) => e.amount);
      qs('#period-income').textContent = formatAmount(inc);
      qs('#period-debt').textContent = formatAmount(dbt);
      qs('#period-balance').textContent = formatAmount(inc - dbt, { sign: true });
      qs('#period-balance-box').dataset.sign = inc - dbt > 0 ? 'positive' : inc - dbt < 0 ? 'negative' : 'zero';
    } catch (error) {
      if (token === loadToken) toastError(MSG.loadFailed);
    } finally {
      if (token === loadToken) qs('#tables').classList.remove('is-loading');
    }
  }

  qs('#btn-rolling').addEventListener('click', () => { period = stepPeriod(period, MODES.ROLLING); loadTables(); });
  qs('#btn-next-month').addEventListener('click', () => { period = stepPeriod(period, MODES.MONTH, 1); loadTables(); });
  qs('#btn-next-year').addEventListener('click', () => { period = stepPeriod(period, MODES.YEAR, 1); loadTables(); });
  qs('#btn-next').addEventListener('click', () => { period = stepPeriod(period, period.mode, 1); loadTables(); });
  qs('#btn-prev').addEventListener('click', () => {
    if (period.offset <= 0) return;
    period = { mode: period.mode, offset: period.offset - 1 };
    if (period.offset === 0) period = initialPeriod();
    loadTables();
  });

  /* ---------------- ثبت ---------------- */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideFormMessage(message);

    const ok = runValidators([
      { input: dateSelect.root.querySelector('select'), check: () => validateJalaliDate(dateSelect.getValue()) },
      { input: titleInput, check: () => validateTitle(titleInput.value) },
      { input: amountInput, check: () => validateAmount(amountInput.value) },
      ...(repeatBox.checked ? [{ input: countInput, check: () => validateRepeatCount(countInput.value) }] : []),
    ]);
    if (!ok) return;

    const d = dateSelect.getValue();
    let rows;
    try {
      rows = buildRows({
        userId: user.id,
        kind: getKind(),
        title: titleInput.value,
        amount: parseAmount(amountInput.value),
        ...d,
        recurring: repeatBox.checked,
        unit: getUnit(),
        count: Number(toEn(countInput.value)),
      });
    } catch (_) {
      showFormMessage(message, 'error', MSG.dateInvalid);
      return;
    }

    setBusy(submitBtn, true, 'در حال ذخیره…');
    try {
      await insertEntries(rows);
      rows.length > 1 ? toastSuccess(MSG.savedMany(toFa(rows.length))) : toastSuccess(MSG.saved);
      titleInput.value = '';
      amountInput.value = '';
      amountWords.textContent = '';
      titleInput.focus();
      loadTables();
    } catch (error) {
      showFormMessage(message, 'error', MSG.saveFailed);
      toastError(MSG.saveFailed);
    } finally {
      setBusy(submitBtn, false);
    }
  });

  void CONFIG;
  loadTables();
}

init();
