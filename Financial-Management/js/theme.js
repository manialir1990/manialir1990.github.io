/* ==========================================================================
   theme.js — هماهنگی حالت تیره/روشن با تنظیمات سیستم
   ظاهر اصلی با CSS و prefers-color-scheme اعمال می‌شود؛ اینجا فقط
   رنگ نوار مرورگر و کلاس‌های کمکی همگام می‌شوند.
   ========================================================================== */

const query = window.matchMedia('(prefers-color-scheme: light)');
const BAR_COLORS = { dark: '#0b1120', light: '#eef2f9' };

export function currentScheme() {
  return query.matches ? 'light' : 'dark';
}

function apply() {
  const scheme = currentScheme();
  const root = document.documentElement;
  root.dataset.scheme = scheme;
  root.style.colorScheme = scheme;
  document.querySelectorAll('meta[name="theme-color"]:not([media])').forEach((m) => {
    m.setAttribute('content', BAR_COLORS[scheme]);
  });
  window.dispatchEvent(new CustomEvent('schemechange', { detail: { scheme } }));
}

export function initTheme() {
  apply();
  if (query.addEventListener) query.addEventListener('change', apply);
  else if (query.addListener) query.addListener(apply);
}
