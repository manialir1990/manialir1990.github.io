document.addEventListener('pointerdown',e=>{const t=e.target.closest('button,.btn,a.lk,a.kv,#side a');if(!t||t.disabled)return;
const r=t.getBoundingClientRect(),d=Math.max(r.width,r.height)*2,s=document.createElement('span');s.className='rp';
s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;t.appendChild(s);s.addEventListener('animationend',()=>s.remove())},{passive:true});
