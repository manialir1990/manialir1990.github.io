(async()=>{await need(true);
const url=p=>sb.storage.from('docs').getPublicUrl(p).data.publicUrl;
async function list(){const{data,error}=await sb.from('documents').select('*').order('created_at',{ascending:false});if(error)return $('#dl').textContent=error.message;
 $('#dl').innerHTML=tbl(['نوع','عنوان','تاریخ','پیوند',''],data.map(d=>`<tr><td>${d.kind==='minutes'?'صورت‌جلسه':'دعوتنامه'}</td><td>${d.title}</td><td>${jal(d.created_at)}</td><td><a href="${url(d.path)}" target="_blank">PDF</a></td><td><button class="sec" data-del="${d.id}" data-p="${d.path}">حذف</button></td></tr>`));
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('حذف شود؟'))return;await sb.storage.from('docs').remove([b.dataset.p]);await sb.from('documents').delete().eq('id',b.dataset.del);list()})}
$('#du').onclick=async()=>{const f=$('#df').files[0],t=$('#dt').value.trim(),k=$('#dk').value,s=x=>$('#ds').textContent=x;if(!f||!t)return s('عنوان و فایل لازم است');
 const p=`${k}/${Date.now()}.pdf`;let e=(await sb.storage.from('docs').upload(p,f,{contentType:'application/pdf'})).error;if(e)return s(e.message);
 e=(await sb.from('documents').insert({kind:k,title:t,path:p})).error;s(e?e.message:'انجام شد');$('#dt').value='';$('#df').value='';list()};
list()})();
