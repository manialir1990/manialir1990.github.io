(async()=>{const m=await need();shell(m);const k=document.body.dataset.kind;
const{data,error}=await sb.from('documents').select('*').eq('kind',k).order('created_at',{ascending:false});
if(error)return $('#ls').textContent=error.message;
const url=p=>sb.storage.from('docs').getPublicUrl(p,{download:true}).data.publicUrl;
$('#ls').innerHTML=k==='minutes'?tbl(['تاریخ بارگذاری','عنوان','دانلود'],data.map(d=>`<tr><td>${jal(d.created_at)}</td><td>${d.title}</td><td><a class="btn" href="${url(d.path)}">دانلود</a></td></tr>`)):tbl(['عنوان','دانلود'],data.map(d=>`<tr><td>${d.title}</td><td><a class="btn" href="${url(d.path)}">دانلود</a></td></tr>`));
})();
