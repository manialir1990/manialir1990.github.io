const sb=supabase.createClient(CFG.url,CFG.key);
const $=s=>document.querySelector(s);
const nd=s=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
const money=n=>Number(n||0).toLocaleString('fa-IR');
const jal=d=>{if(d==null||d==='')return'';if(typeof d==='string'&&/^1[34]\d\d[\/-]/.test(nd(d)))return nd(d).replace(/-/g,'/');
 const x=typeof d==='number'?new Date(Math.round((d-25569)*864e5)):new Date(d);if(isNaN(x))return String(d);
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(x).map(a=>[a.type,a.value]));return`${p.year}/${p.month}/${p.day}`};
async function me(){const{data:{user}}=await sb.auth.getUser();if(!user)return null;return(await sb.from('members').select('*').eq('user_id',user.id).maybeSingle()).data}
async function need(adm){const m=await me();if(!m){location='index.html';throw 0}if(adm&&!['admin','superadmin'].includes(m.role)){location='dashboard.html';throw 0}return m}
function shell(m){document.body.insertAdjacentHTML('afterbegin',`<div class="trail"><i></i><i></i><i></i></div><button id="burger">☰</button><aside id="side"><a href="dashboard.html">داشبورد</a><a href="invitations.html">دعوتنامه‌ها و ابلاغیه‌ها</a><a href="minutes.html">صورت‌جلسات</a><a href="location.html">موقعیت پروژه</a><a href="news.html">اخبار</a><a href="companies.html">شرکت‌های مادر</a>${['admin','superadmin'].includes(m.role)?'<h4>مدیریت</h4><a href="admin.html#inbox">کارتابل عضویت</a><a href="admin.html">پنل مدیریت</a><a href="admin.html#db">پایگاه داده</a>':''}<a href="#" id="out">خروج</a></aside>`);
 $('#burger').onclick=()=>$('#side').classList.toggle('open');$('#out').onclick=async e=>{e.preventDefault();await sb.auth.signOut();location='index.html'}}
const tbl=(h,rows)=>`<div class="scroll"><table><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.join('')}</table></div>`;
