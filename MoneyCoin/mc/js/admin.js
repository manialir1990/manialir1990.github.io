(async()=>{
  const sb=MC.sb,$=id=>document.getElementById(id);
  const {data:{session}}=await sb.auth.getSession();
  if(!session){location.replace('login.html');return}
  const {data:me}=await sb.from('profiles').select('role').eq('id',session.user.id).single();
  if(!me||me.role!=='admin'){location.replace('mining.html');return}
  $('logout').onclick=async()=>{await sb.auth.signOut();location.href='login.html'};
  let all=[];
  const say=(t,bad)=>{$('msg').textContent=t;$('msg').className=bad?'err':''};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  async function load(){
    const {data,error}=await sb.from('profiles').select('*').order('created_at',{ascending:false});
    if(error)return say('خطا در خواندن اطلاعات: '+error.message,true);
    all=data;stats();draw();
  }
  function stats(){
    const s=(f)=>all.reduce((a,u)=>a+f(u),0);
    const c=[['کاربران',all.length],['مجموع سکه',s(u=>+u.coins).toFixed(4)],['مجموع الماس',s(u=>u.diamonds)],['مجموع چرخش',s(u=>u.spins)],['ادمین‌ها',all.filter(u=>u.role==='admin').length],['مسدود',all.filter(u=>u.banned).length]];
    $('stats').innerHTML=c.map(([k,v])=>`<div class="st"><b>${v}</b><span>${k}</span></div>`).join('');
  }
  function draw(){
    const q=$('q').value.trim().toLowerCase();
    $('rows').innerHTML=all.filter(u=>(u.email||'').toLowerCase().includes(q)).map(u=>`<tr data-id="${u.id}">
      <td class="em">${esc(u.email||'')}</td><td>${u.spins}</td>
      <td><input type="number" step="0.0001" min="0" data-f="coins" value="${+u.coins}"></td>
      <td><input type="number" step="1" min="0" data-f="diamonds" value="${u.diamonds}"></td>
      <td><select data-f="role"><option value="user"${u.role==='user'?' selected':''}>کاربر</option><option value="admin"${u.role==='admin'?' selected':''}>ادمین</option></select></td>
      <td><input type="checkbox" data-f="banned"${u.banned?' checked':''}></td>
      <td><button data-a="save">ذخیره</button><button data-a="reset">ریست</button><button class="danger" data-a="del">حذف</button></td></tr>`).join('');
  }
  $('rows').addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    const tr=b.closest('tr'),id=tr.dataset.id,a=b.dataset.a;
    let res;
    if(a==='save'){
      const v=f=>tr.querySelector(`[data-f=${f}]`);
      res=await sb.from('profiles').update({coins:+v('coins').value||0,diamonds:parseInt(v('diamonds').value)||0,role:v('role').value,banned:v('banned').checked}).eq('id',id);
    }else if(a==='reset'){
      if(!confirm('پیشرفت این کاربر ریست شود؟'))return;
      res=await sb.from('profiles').update({coins:0,last_amount:0,spins:0,diamonds:0,pending_diamonds:0,next_drop:55}).eq('id',id);
    }else if(a==='del'){
      if(id===session.user.id)return say('نمی‌توانی حساب خودت را حذف کنی.',true);
      if(!confirm('پروفایل این کاربر حذف شود؟'))return;
      res=await sb.from('profiles').delete().eq('id',id);
    }
    if(res.error)return say('خطا: '+res.error.message,true);
    say('انجام شد.');load();
  });
  $('q').addEventListener('input',draw);
  $('reload').onclick=load;
  $('csv').onclick=()=>{
    const rows=[['email','spins','coins','diamonds','role','banned','created_at'],...all.map(u=>[u.email,u.spins,u.coins,u.diamonds,u.role,u.banned,u.created_at])];
    const blob=new Blob(['\ufeff'+rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='money-users.csv';a.click();
  };
  load();
})();
