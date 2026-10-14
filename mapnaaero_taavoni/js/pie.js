(async()=>{const el=document.querySelector('#pie');if(!el)return;
const t=await(await fetch('data/stats.txt?'+Date.now())).text();
const v=t.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')).map(Number).slice(0,3);
const names=['اعضای فعال تعاونی ۱','اعضای غیرفعال تعاونی ۱','اعضای فعال تعاونی ۲'],col=['var(--ac)','var(--bad)','var(--ac2)'];
const tot=v.reduce((a,b)=>a+(b||0),0),fa=n=>Number(n).toLocaleString('fa-IR',{maximumFractionDigits:1});
if(!tot){el.textContent='داده‌ای وجود ندارد';return}
const R=110,C=130;let a0=-Math.PI/2,out='';
v.forEach((n,i)=>{if(!n)return;const f=n/tot,a1=a0+f*2*Math.PI,m=(a0+a1)/2,pt=(a,r)=>[C+r*Math.cos(a),C+r*Math.sin(a)];
 const[x0,y0]=pt(a0,R),[x1,y1]=pt(a1,R),[tx,ty]=pt(m,f===1?0:R*.62);
 out+=f===1?`<circle cx="${C}" cy="${C}" r="${R}" fill="${col[i]}"/>`:`<path d="M${C} ${C}L${x0} ${y0}A${R} ${R} 0 ${f>.5?1:0} 1 ${x1} ${y1}Z" fill="${col[i]}" stroke="var(--bg)" stroke-width="2"/>`;
 out+=`<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" style="direction:rtl;font-size:13px;font-weight:700;fill:#fff;stroke:#0009;stroke-width:3px;paint-order:stroke">${fa(n)} (${fa(f*100)}٪)</text>`;a0=a1});
el.innerHTML=`<svg viewBox="0 0 260 260" style="max-width:320px;width:100%;display:block;margin:auto;filter:drop-shadow(0 0 12px #38e1c855)">${out}</svg>
<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:8px">${names.map((n,i)=>`<span><b style="color:${col[i]}">●</b> ${n}</span>`).join('')}</div>
<h3 style="text-align:center">تعداد کل: ${fa(tot)}</h3>`})();
