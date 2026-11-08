/* ==========================================================================
   api.js — خواندن و نوشتن اطلاعات مالی در Supabase
   ========================================================================== */

import { supabase } from './supabase-client.js';
import { CONFIG } from './config.js';
import { getSession } from './auth.js';

const COLUMNS =
  'id, user_id, kind, title, amount, due_date, jalali_year, jalali_month, jalali_day, ' +
  'is_recurring, recur_unit, recur_total, series_id, series_index, created_at';

const PAGE = 1000;

function normalise(row) {
  return { ...row, amount: Number(row.amount) };
}

async function myId() {
  const session = await getSession();
  if (!session) throw new Error('no-session');
  return session.user.id;
}

/* userIds: پیش‌فرض فقط کاربر جاری؛ در داشبورد ادغامی شناسه‌ی هر دو نفر داده می‌شود.
   (سیاست RLS اجازه‌ی خواندن ردیف‌های شریک ادغام را می‌دهد، پس فیلتر صریح لازم است.) */
export async function fetchEntries({ from, to, kind, userIds } = {}) {
  const ids = userIds && userIds.length ? userIds : [await myId()];
  const rows = [];
  let offset = 0;
  /* صفحه‌بندی تا محدودیت ۱۰۰۰ ردیفی Supabase مانع نشود */
  for (;;) {
    let query = supabase.from(CONFIG.TABLE_ENTRIES).select(COLUMNS)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE - 1)
      .in('user_id', ids);
    if (from) query = query.gte('due_date', from);
    if (to) query = query.lte('due_date', to);
    if (kind) query = query.eq('kind', kind);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data.map(normalise));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

export async function insertEntries(rows) {
  const inserted = [];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { data, error } = await supabase.from(CONFIG.TABLE_ENTRIES).insert(chunk).select(COLUMNS);
    if (error) throw error;
    inserted.push(...data.map(normalise));
  }
  return inserted;
}

export async function deleteEntries(ids) {
  let removed = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await supabase.from(CONFIG.TABLE_ENTRIES).delete().in('id', chunk).select('id');
    if (error) throw error;
    removed += data.length;
  }
  return removed;
}

/* حذف همه‌ی ردیف‌های یک سری (به‌جز آنچه قبلاً حذف شده) */
export async function deleteSeries(seriesIds) {
  let removed = 0;
  for (const seriesId of seriesIds) {
    const { data, error } = await supabase.from(CONFIG.TABLE_ENTRIES).delete().eq('series_id', seriesId).select('id');
    if (error) throw error;
    removed += data.length;
  }
  return removed;
}

export async function countEntries() {
  const { count, error } = await supabase.from(CONFIG.TABLE_ENTRIES)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', await myId());
  if (error) throw error;
  return count || 0;
}
