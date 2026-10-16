// Edge Function: password-reset  (deploy with "Verify JWT" turned OFF)
// Secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const J = (o: unknown) => new Response(JSON.stringify(o), { headers: { ...cors, "content-type": "application/json" } });
const hash = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function check(nid: string, code: string) {
  const { data: r } = await sb.from("reset_codes").select("*").eq("national_id", nid).maybeSingle();
  if (!r || new Date(r.expires_at) < new Date()) return "bad";
  if (r.tries >= 5) return "locked";
  if (r.code_hash !== await hash(code + nid)) { await sb.from("reset_codes").update({ tries: r.tries + 1 }).eq("national_id", nid); return "bad"; }
  return "ok";
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json(); const nid = String(b.nid || "").trim();
    if (b.action === "request") {
      const email = String(b.email || "").trim().toLowerCase();
      const { data: m } = await sb.from("members").select("email,user_id").eq("national_id", nid).maybeSingle();
      if (!m || !m.user_id || (m.email || "").toLowerCase() !== email) return J({ ok: false, error: "mismatch" });
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await sb.from("reset_codes").upsert({ national_id: nid, code_hash: await hash(code + nid), expires_at: new Date(Date.now() + 15 * 60000).toISOString(), tries: 0 });
      try {
        const c = new SMTPClient({ connection: { hostname: Deno.env.get("SMTP_HOST")!, port: +(Deno.env.get("SMTP_PORT") || 465), tls: true, auth: { username: Deno.env.get("SMTP_USER")!, password: Deno.env.get("SMTP_PASS")! } } });
        await c.send({ from: Deno.env.get("SMTP_FROM") || Deno.env.get("SMTP_USER")!, to: m.email, subject: "کد فراموشی رمز عبور - تعاونی مسکن مپنا هوایی", content: `کد فراموشی رمز عبور شما: ${code}\nاعتبار کد: ۱۵ دقیقه` });
        await c.close();
      } catch { return J({ ok: false, error: "mail" }); }
      return J({ ok: true });
    }
    if (b.action === "verify") { const s = await check(nid, String(b.code || "")); return J(s === "ok" ? { ok: true } : { ok: false, error: s }); }
    if (b.action === "confirm") {
      const s = await check(nid, String(b.code || "")); if (s !== "ok") return J({ ok: false, error: s });
      const { data: m } = await sb.from("members").select("user_id").eq("national_id", nid).maybeSingle();
      if (!m?.user_id) return J({ ok: false, error: "mismatch" });
      const { error } = await sb.auth.admin.updateUserById(m.user_id, { password: String(b.password) });
      if (error) return J({ ok: false, error: "net" });
      await sb.from("reset_codes").delete().eq("national_id", nid); return J({ ok: true });
    }
  } catch { /* fallthrough */ }
  return J({ ok: false, error: "net" });
});
