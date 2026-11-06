/* ==========================================================================
   config.js — تنظیمات مرکزی برنامه
   همه‌ی مقادیر قابل تغییر (آدرس دیتابیس، مسیرها، زمان‌بندی‌ها) فقط اینجا هستند.
   ========================================================================== */

export const CONFIG = Object.freeze({
  APP_NAME: 'مدیریت هزینه‌ها و اقساط',
  APP_SHORT_NAME: 'هزینه و قسط',

  SUPABASE_URL: 'https://wujjcktkrmnvgrfstcyl.supabase.co',
  /* همه‌ی اشیای دیتابیس این سایت با پیشوند fin_ ساخته می‌شوند تا با Money Coin تداخل نکنند */
  TABLE_ENTRIES: 'fin_entries',
  TABLE_PROFILES: 'fin_profiles',

  SUPABASE_KEY: 'sb_publishable_JfyJ9dhXOcoqgS2ExGQ02Q_-8FB3Q9n',

  /* منبع زمان */
  TIME_SOURCE_URL: 'https://www.time.ir/',
  TIME_SOURCE_TIMEOUT_MS: 4000,
  TIME_ZONE: 'Asia/Tehran',

  /* نمودار عقربه‌ای */
  GAUGE_MIN: 0,
  GAUGE_MAX: 2,
  GAUGE_DURATION_MS: 2000,

  /* افق‌های زمانی */
  DAYS_MONTH: 30,
  DAYS_SHORT: 10,

  /* ورود اطلاعات */
  REPEAT_MAX: 120,
  TITLE_MAX: 200,
  AMOUNT_MAX: 999999,
  YEARS_BEFORE: 1,
  YEARS_AFTER: 12,

  /* رفتار لمس */
  LONG_PRESS_MS: 450,
  LONG_PRESS_MOVE_TOLERANCE: 10,

  /* رمز عبور */
  PASSWORD_MIN: 8,

  /* کلیدهای ذخیره‌سازی محلی */
  STORAGE: Object.freeze({
    TIME_FAIL: 'fin.timeSourceFailed',
    LAST_EMAIL: 'fin.lastEmail',
    DETAILS_FILTERS: 'fin.detailsFilters',
  }),
});

/* مسیرها نسبت به صفحه‌ای که اسکریپت در آن اجرا می‌شود ساخته می‌شوند
   تا پروژه روی GitHub Pages (با نام مخزن در آدرس) درست کار کند. */
const inHtmlFolder = /\/html\/[^/]*$/.test(location.pathname);
const prefix = inHtmlFolder ? '' : 'html/';

export const ROUTES = Object.freeze({
  login: inHtmlFolder ? '../index.html' : 'index.html',
  register: prefix + 'register.html',
  verified: prefix + 'verified.html',
  forgot: prefix + 'forgot.html',
  reset: prefix + 'reset-password.html',
  dashboard: prefix + 'dashboard.html',
  entry: prefix + 'entry.html',
  details: prefix + 'details.html',
});

export const ASSETS = Object.freeze({
  dollarBackground: (inHtmlFolder ? '../' : '') + 'data/dollar-bg.svg',
});

export function absoluteUrl(route) {
  return new URL(route, location.href).href;
}
