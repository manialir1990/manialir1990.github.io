/* ==========================================================================
   clipboard.js — کپی متن در کلیپ‌بورد (با راه‌حل جایگزین برای مرورگرهای قدیمی)
   ========================================================================== */

export async function copyText(text) {
  const value = String(text ?? '');
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (_) { /* به راه‌حل جایگزین می‌رویم */ }

  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.append(area);
  area.select();
  area.setSelectionRange(0, value.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  area.remove();
  return ok;
}
