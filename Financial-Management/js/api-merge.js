/* ==========================================================================
   api-merge.js — درخواست ادغام، کارتابل ادغام و وضعیت ادغام فعال
   همه‌ی نوشتن‌ها از طریق تابع‌های امن دیتابیس (data/02-merge.sql) انجام می‌شود.
   ========================================================================== */

import { supabase } from './supabase-client.js';
import { CONFIG } from './config.js';

const NOT_INSTALLED = 'بخش ادغام هنوز در دیتابیس نصب نشده است؛ فایل 02-merge.sql را اجرا کنید.';

export function mapMergeError(error) {
  const text = String((error && error.message) || '').toLowerCase();
  const code = String((error && error.code) || '');
  if (code === 'PGRST202' || code === '42883' || code === '42P01' || text.includes('could not find the function')) {
    return NOT_INSTALLED;
  }
  if (text.includes('already merged')) return 'یکی از شما هم‌اکنون با کاربر دیگری ادغام شده است.';
  if (text.includes('request already open')) return 'برای این کاربر درخواست باز وجود دارد؛ کارتابل ادغام را ببینید.';
  if (text.includes('too many pending')) return 'حداکثر ۵ درخواست بدون پاسخ می‌توانید داشته باشید.';
  if (text.includes('target not found')) return 'کاربری با این مشخصات پیدا نشد.';
  if (text.includes('request not available') || text.includes('merge not available')) {
    return 'این درخواست دیگر معتبر نیست؛ صفحه را تازه کنید.';
  }
  if (text.includes('invalid target')) return 'درخواست ادغام با خودتان ممکن نیست.';
  if (text.includes('failed to fetch') || text.includes('network')) return 'ارتباط با سرور برقرار نشد.';
  return 'عملیات انجام نشد. دوباره تلاش کنید.';
}

/* ردیف نام نمایشی کاربر؛ فقط کاربرانی که این سایت را باز کرده‌اند قابل جستجو هستند */
export async function ensureProfile(user) {
  const key = `${CONFIG.STORAGE.PROFILE_READY}:${user.id}`;
  try { if (sessionStorage.getItem(key) === '1') return; } catch (_) { /* ignore */ }
  const fullName = (user.user_metadata && user.user_metadata.full_name) || null;
  const { error } = await supabase
    .from(CONFIG.TABLE_PROFILES)
    .upsert({ id: user.id, full_name: fullName, site_user: true }, { onConflict: 'id' });
  if (!error) {
    try { sessionStorage.setItem(key, '1'); } catch (_) { /* ignore */ }
  }
}

export async function findUsers(name) {
  const { data, error } = await supabase.rpc('fin_find_users', { q: name });
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.found_id, name: r.found_name, email: r.found_email }));
}

export async function requestMerge(targetId) {
  const { data, error } = await supabase.rpc('fin_request_merge', { target: targetId });
  if (error) throw error;
  invalidateMergeCache();
  return data;
}

export async function respondMerge(requestId, accept) {
  const { data, error } = await supabase.rpc('fin_respond_merge', { req: requestId, accept });
  if (error) throw error;
  invalidateMergeCache();
  return data;
}

export async function cancelMerge(requestId) {
  const { error } = await supabase.rpc('fin_cancel_merge', { req: requestId });
  if (error) throw error;
  invalidateMergeCache();
}

export async function endMerge(requestId) {
  const { error } = await supabase.rpc('fin_end_merge', { req: requestId });
  if (error) throw error;
  invalidateMergeCache();
}

export async function listMerges() {
  const { data, error } = await supabase.rpc('fin_my_merges');
  if (error) throw error;
  return data || [];
}

/* خلاصه‌ی وضعیت برای منو و داشبورد: ادغام فعال + تعداد درخواست‌های ورودی */
let cache = null;

export function invalidateMergeCache() {
  cache = null;
}

export async function getMergeSummary() {
  if (cache) return cache;
  cache = (async () => {
    try {
      const rows = await listMerges();
      const active = rows.find((r) => r.status === 'accepted') || null;
      const incoming = rows.filter((r) => r.status === 'pending' && r.direction === 'incoming');
      return { rows, active, incoming, installed: true };
    } catch (_) {
      return { rows: [], active: null, incoming: [], installed: false };
    }
  })();
  return cache;
}
