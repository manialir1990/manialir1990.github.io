const MC={
  key:'mc_count',
  vib(p=25){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}},
  fa(n){return Number(n).toLocaleString('fa-IR')},
  toEn(s){return String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d))},
  save(n){try{sessionStorage.setItem(this.key,n)}catch(e){}},
  load(){try{return parseInt(sessionStorage.getItem(this.key),10)||0}catch(e){return 0}},
  initLight(){
    const l=document.querySelector('.bg-light');if(!l)return;
    if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    let t=0;
    const f=()=>{t+=.004;l.style.setProperty('--lx',(50+42*Math.sin(t*1.3))+'%');l.style.setProperty('--ly',(50+40*Math.sin(t*.9+1))+'%');requestAnimationFrame(f)};
    f();
  }
};
document.addEventListener('DOMContentLoaded',()=>MC.initLight());
