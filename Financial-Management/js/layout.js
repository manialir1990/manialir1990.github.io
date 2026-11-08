/* ==========================================================================
   layout.js — قالب مشترک صفحه‌ها: نوار بالا، منوی همبرگری، نوار کناری
   ========================================================================== */

import { el, icon, qs } from './dom.js';
import { ROUTES, CONFIG } from './config.js';
import { buildClockBar } from './clock-bar.js';
import { signOut, getProfileName } from './auth.js';
import { confirmDialog } from './modal.js';
import { initTheme } from './theme.js';
import { mountBackground } from './background.js';
import { ensureProfile, getMergeSummary } from './api-merge.js';
import { toFa } from './digits.js';

const MENU = [
  { key: 'dashboard', label: 'داشبورد وضعیت مالی', icon: 'dashboard', href: ROUTES.dashboard },
  { key: 'entry', label: 'ورود اطلاعات مالی', icon: 'plus', href: ROUTES.entry },
  { key: 'details', label: 'مشاهده ریز اطلاعات مالی', icon: 'list', href: ROUTES.details },
];

const ACCOUNT_MENU = [
  { key: 'account', label: 'حساب کاربری', icon: 'user', href: ROUTES.account },
  { key: 'merge', label: 'ادغام', icon: 'users', href: ROUTES.merge },
  { key: 'password', label: 'تغییر رمز عبور', icon: 'lock', href: ROUTES.changePassword },
];

function menuLink(item, active) {
  return el('a', {
    class: `drawer__link${item.key === active ? ' is-active' : ''}`,
    href: item.href,
    dataset: { key: item.key },
    'aria-current': item.key === active ? 'page' : null,
  }, [icon(item.icon, 22), el('span', { class: 'drawer__label', text: item.label })]);
}

function brand() {
  return el('a', { class: 'brand', href: ROUTES.dashboard, 'aria-label': CONFIG.APP_NAME }, [
    el('span', { class: 'brand__mark', text: '$' }),
    el('span', { class: 'brand__name', text: CONFIG.APP_NAME }),
  ]);
}

/* صفحه‌های عمومی (ورود، ثبت نام، …) فقط نوار تاریخ و ساعت دارند */
export function mountPublicShell() {
  initTheme();
  mountBackground();
  const top = el('header', { class: 'topbar topbar--public' }, [buildClockBar()]);
  document.body.prepend(top);
}

/* صفحه‌های داخلی: نوار بالا + منوی همبرگری سمت راست */
export function mountAppShell({ active, user }) {
  initTheme();
  mountBackground();

  const burger = el('button', {
    class: 'burger',
    type: 'button',
    'aria-label': 'باز کردن منو',
    'aria-expanded': 'false',
    'aria-controls': 'side-menu',
  }, [el('span', { class: 'burger__bar' }), el('span', { class: 'burger__bar' }), el('span', { class: 'burger__bar' })]);

  const top = el('header', { class: 'topbar' }, [
    burger,
    brand(),
    el('div', { class: 'topbar__clock' }, [buildClockBar()]),
  ]);

  const userName = el('div', { class: 'drawer__name', text: '…' });
  const userMail = el('div', { class: 'drawer__mail', text: user.email || '' });

  const links = [
    ...MENU.map((item) => menuLink(item, active)),
    el('div', { class: 'drawer__group', text: 'مدیریت حساب' }),
    ...ACCOUNT_MENU.map((item) => menuLink(item, active)),
  ];

  const logoutBtn = el('button', { class: 'drawer__link drawer__link--danger', type: 'button' }, [
    icon('logout', 22), el('span', { text: 'خروج از حساب' }),
  ]);

  const closeBtn = el('button', { class: 'drawer__close', type: 'button', 'aria-label': 'بستن منو' }, [icon('close', 22)]);

  const drawer = el('aside', { class: 'drawer', id: 'side-menu', 'aria-hidden': 'true', tabindex: '-1' }, [
    el('div', { class: 'drawer__head' }, [
      el('div', { class: 'drawer__avatar' }, [icon('user', 26)]),
      el('div', { class: 'drawer__who' }, [userName, userMail]),
      closeBtn,
    ]),
    el('nav', { class: 'drawer__nav', 'aria-label': 'منوی اصلی' }, links),
    el('div', { class: 'drawer__foot' }, [logoutBtn]),
  ]);

  const scrim = el('div', { class: 'scrim', 'aria-hidden': 'true' });

  document.body.prepend(top);
  document.body.append(scrim, drawer);

  let open = false;
  function setOpen(value) {
    open = value;
    drawer.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('no-scroll', open);
    if (open) drawer.focus();
    else burger.focus();
  }

  burger.addEventListener('click', () => setOpen(!open));
  closeBtn.addEventListener('click', () => setOpen(false));
  scrim.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });

  logoutBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'خروج از حساب',
      message: 'می‌خواهید از حساب کاربری خارج شوید؟',
      confirmText: 'خروج',
    });
    if (ok) signOut();
  });

  getProfileName(user).then((name) => { userName.textContent = name || 'کاربر'; }).catch(() => {
    userName.textContent = 'کاربر';
  });

  /* نشان تعداد درخواست‌های ادغام و پیوند داشبورد ادغامی (فقط وقتی ادغام فعال است) */
  getMergeSummary().then((summary) => {
    const mergeLink = drawer.querySelector('[data-key="merge"]');
    if (mergeLink && summary.incoming.length) {
      mergeLink.append(el('span', {
        class: 'drawer__badge',
        text: toFa(summary.incoming.length),
        title: 'درخواست ادغام در انتظار پاسخ',
      }));
      burger.classList.add('has-alert');
    }
    if (summary.active) {
      const base = drawer.querySelector('[data-key="dashboard"]');
      const merged = menuLink({
        key: 'dashboard-merged',
        label: 'داشبورد ادغامی',
        icon: 'users',
        href: `${ROUTES.dashboard}#merged`,
      }, active === 'dashboard' && location.hash === '#merged' ? 'dashboard-merged' : '');
      if (base) base.after(merged);
    }
  });
  ensureProfile(user).catch(() => {});

  const main = qs('main');
  if (main) main.setAttribute('tabindex', '-1');
  return { setOpen, userNameNode: userName };
}
