/* ==========================================================================
   timeir.js — ساعت و تاریخ روز
   ابتدا تلاش می‌شود اختلاف ساعت دستگاه با time.ir اندازه‌گیری شود؛
   اگر مرورگر اجازه‌ی دسترسی ندهد (CORS) از ساعت دستگاه به وقت تهران
   استفاده می‌شود. نتیجه‌ی ناموفق در همان نشست ذخیره می‌شود تا تکرار نشود.
   ========================================================================== */

import { CONFIG } from './config.js';
import { tehranParts } from './jalali.js';

let offsetMs = 0;
let source = 'device';
let syncPromise = null;
const listeners = new Set();

export function getSource() {
  return source;
}

export function nowDate() {
  return new Date(Date.now() + offsetMs);
}

export function now() {
  return tehranParts(nowDate());
}

export function todayIso() {
  return now().iso;
}

export function onTick(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

async function fetchServerTime() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.TIME_SOURCE_TIMEOUT_MS);
  try {
    const started = Date.now();
    const response = await fetch(CONFIG.TIME_SOURCE_URL, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    const finished = Date.now();
    const header = response.headers.get('date');
    if (!header) throw new Error('no-date-header');
    const server = new Date(header).getTime();
    if (!Number.isFinite(server)) throw new Error('bad-date-header');
    return server - Math.round((started + finished) / 2);
  } finally {
    clearTimeout(timer);
  }
}

export function syncWithTimeIr() {
  if (syncPromise) return syncPromise;
  let failed = false;
  try {
    failed = sessionStorage.getItem(CONFIG.STORAGE.TIME_FAIL) === '1';
  } catch (_) { /* ignore */ }
  if (failed) {
    syncPromise = Promise.resolve(false);
    return syncPromise;
  }
  syncPromise = fetchServerTime()
    .then((delta) => {
      offsetMs = delta;
      source = 'time.ir';
      return true;
    })
    .catch(() => {
      try { sessionStorage.setItem(CONFIG.STORAGE.TIME_FAIL, '1'); } catch (_) { /* ignore */ }
      source = 'device';
      return false;
    });
  return syncPromise;
}

let timerId = null;

export function startTicking() {
  if (timerId) return;
  const tick = () => {
    const parts = now();
    listeners.forEach((fn) => {
      try { fn(parts); } catch (_) { /* a listener must never break the clock */ }
    });
  };
  tick();
  timerId = setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
}
