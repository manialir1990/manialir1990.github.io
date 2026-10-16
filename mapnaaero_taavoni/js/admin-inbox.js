(async()=>{await need(true);
async function list(){const{data,error}=await sb.from('pending_members').select('*').order('created_at',{ascending:false});if(error)return $('#pl').textContent=error.message;$('#ib').textContent=data.length;$('#ib').hidden=!data.length;
 $('#pl').innerHTML=data.length?tbl(['نام','نام خانوادگی','کد ملی','موبایل','ایمیل','کد تاییدیه','تاریخ',''],data.map(d=>`<tr><td>${d.first_name}</td><td>${d.last_name}</td><td>${d.national_id}</td><td>${d.mobile}</td><td>${d.email||''}</td><td>${d.email||''}</td><td>${d.code||''}</td><td>${jal(d.created_at)}</td><td><button data-ok="${d.id}">تایید</button> <button class="sec" data-no="${d.id}">رد</button></td></tr>`)):'<p>درخواستی وجود ندارد</p>';
 document.querySelectorAll('[data-ok]').forEach(b=>b.onclick=async()=>{const e=await sb.rpc('approve_pending',{pid:+b.dataset.ok});if(e.error)alert(e.error.message);list()});
 document.querySelectorAll('[data-no]').forEach(b=>b.onclick=async()=>{if(!confirm('رد شود؟'))return;await sb.from('pending_members').delete().eq('id',b.dataset.no);list()})}
list()})();
