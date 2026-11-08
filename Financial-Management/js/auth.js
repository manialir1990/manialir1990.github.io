/* ==========================================================================
   auth.js — ثبت نام، ورود، خروج، بازیابی رمز و محافظ صفحات
   ========================================================================== */

import { supabase } from './supabase-client.js';
import { ROUTES, absoluteUrl, CONFIG } from './config.js';
import { MSG } from './messages.js';

export function mapAuthError(error) {
  if (!error) return MSG.unknown;
  const text = String(error.message || '').toLowerCase();
  const code = String(error.code || '').toLowerCase();
  if (error.status === 429 || code.includes('rate') || text.includes('rate limit') || text.includes('too many')) {
    return MSG.rateLimited;
  }
  if (text.includes('email not confirmed') || code === 'email_not_confirmed') return MSG.emailNotConfirmed;
  if (text.includes('invalid login') || code === 'invalid_credentials') return MSG.loginFailed;
  if (text.includes('already registered') || code === 'user_already_exists') return MSG.signupExists;
  if (text.includes('password') && text.includes('characters')) return MSG.passwordShort(CONFIG.PASSWORD_MIN);
  if (text.includes('failed to fetch') || text.includes('network')) return MSG.network;
  if (text.includes('same password')) return 'رمز جدید باید با رمز قبلی متفاوت باشد.';
  return MSG.unknown;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function getUser() {
  const session = await getSession();
  return session ? session.user : null;
}

/* صفحه‌های داخلی: اگر وارد نشده باشد به صفحه‌ی ورود می‌رود */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    location.replace(ROUTES.login);
    return null;
  }
  return session.user;
}

/* صفحه‌های ورود/ثبت نام: اگر وارد شده باشد به داشبورد می‌رود */
export async function redirectIfAuthed() {
  const session = await getSession();
  if (session) {
    location.replace(ROUTES.dashboard);
    return true;
  }
  return false;
}

export async function signUp({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: absoluteUrl(ROUTES.verified),
    },
  });
  if (error) throw error;
  /* وقتی ایمیل تکراری باشد Supabase کاربر بدون identity برمی‌گرداند */
  const identities = data.user && data.user.identities;
  if (data.user && Array.isArray(identities) && identities.length === 0) {
    const dup = new Error('User already registered');
    dup.code = 'user_already_exists';
    throw dup;
  }
  return data;
}

export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: absoluteUrl(ROUTES.verified) },
  });
  if (error) throw error;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
  location.replace(ROUTES.login);
}

export async function signOutOtherSessions() {
  try { await supabase.auth.signOut({ scope: 'others' }); } catch (_) { /* ignore */ }
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: absoluteUrl(ROUTES.reset),
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function getProfileName(user) {
  const meta = user && user.user_metadata && user.user_metadata.full_name;
  if (meta) return meta;
  const { data } = await supabase.from(CONFIG.TABLE_PROFILES).select('full_name').eq('id', user.id).maybeSingle();
  return (data && data.full_name) || (user.email ? user.email.split('@')[0] : '');
}
