/* ==========================================================================
   supabase-client.js — اتصال به دیتابیس
   کلید publishable عمداً در سمت کلاینت است؛ امنیت واقعی با RLS تأمین می‌شود
   (فایل data/schema.sql).
   ========================================================================== */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { CONFIG } from './config.js';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});
