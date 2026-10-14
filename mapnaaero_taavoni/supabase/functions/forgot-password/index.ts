import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
const PAD='|mapna';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const sha=async(s:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 const j=(o:unknown)=>new Response(JSON.stringify(o),{headers:{...cors,'Content-Type':'application/json'}});
 const{action,nid,email,code,password}=await req.json().catch(()=>({}));
 if(!/^\d{10}$/.test(nid||''))return j({ok:false});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 if(action==='request'){
  const{data:m}=await db.from('members').select('email,user_id').eq('national_id',nid).maybeSingle();
  if(m?.user_id&&m.email&&m.email.toLowerCase()===String(email||'').trim().toLowerCase()){
   const c=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
   await db.from('reset_codes').upsert({national_id:nid,code_hash:await sha(c+nid),expires_at:new Date(Date.now()+15*60000).toISOString(),attempts:0});
   try{const user=Deno.env.get('SMTP_USER')!;
    const s=new SMTPClient({connection:{hostname:Deno.env.get('SMTP_HOST')!,port:+(Deno.env.get('SMTP_PORT')||465),tls:true,auth:{username:user,password:Deno.env.get('SMTP_PASS')!}}});
    await s.send({from:user,to:m.email,subject:'کد بازیابی رمز عبور - تعاونی مسکن مپنا هوایی',content:`کد بازیابی رمز عبور: ${c}\nاعتبار کد: ۱۵ دقیقه`});await s.close();
   }catch(e){console.error(e)}
  }
  return j({ok:true});
 }
 if(action==='reset'){
  const{data:r}=await db.from('reset_codes').select('*').eq('national_id',nid).maybeSingle();
  if(!r||new Date(r.expires_at)<new Date()||r.attempts>=5||String(password||'').length<6)return j({ok:false});
  if(r.code_hash!==await sha(String(code||'')+nid)){await db.from('reset_codes').update({attempts:r.attempts+1}).eq('national_id',nid);return j({ok:false})}
  const{data:m}=await db.from('members').select('user_id').eq('national_id',nid).single();
  const u=await db.auth.admin.updateUserById(m!.user_id,{password:password+PAD});
  await db.from('reset_codes').delete().eq('national_id',nid);
  return j({ok:!u.error});
 }
 return j({ok:false});
});
