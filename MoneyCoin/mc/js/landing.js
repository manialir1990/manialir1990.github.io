(()=>{
  const stage=document.getElementById('stage'),coin=document.getElementById('coin'),wrap=document.getElementById('coinWrap'),shadow=document.getElementById('shadow');
  MC.buildCoin(coin);
  let rot=0,ready=false;
  const bounce=p=>{const n=7.5625,d=2.75;if(p<1/d)return n*p*p;if(p<2/d)return n*(p-=1.5/d)*p+.75;if(p<2.5/d)return n*(p-=2.25/d)*p+.9375;return n*(p-=2.625/d)*p+.984375};
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const DUR=reduce?1:2000,H=stage.clientHeight*.9,t0=performance.now();
  coin.classList.add('free');
  (function fall(now){
    const p=Math.min((now-t0)/DUR,1),b=bounce(p);
    wrap.style.transform=`translateY(${-H*(1-b)}px)`;
    coin.style.transform=`rotateY(${1080*(1-Math.pow(1-p,2))}deg)`;
    shadow.style.opacity=b*.9;
    if(p<1)requestAnimationFrame(fall);
    else{coin.style.transform='rotateY(0deg)';void coin.offsetWidth;coin.classList.remove('free');ready=true}
  })(t0);

  function spin(dir){if(!ready)return;rot+=dir*180;coin.style.transform=`rotateY(${rot}deg)`;MC.vib(35)}
  let x0=null;
  stage.addEventListener('pointerdown',e=>{x0=e.clientX});
  stage.addEventListener('pointerup',e=>{if(x0===null)return;const dx=e.clientX-x0;x0=null;if(Math.abs(dx)>=24)spin(dx>0?1:-1)});
  stage.addEventListener('pointercancel',()=>{x0=null});
  document.addEventListener('keydown',e=>{
    if(document.activeElement&&document.activeElement.tagName==='INPUT')return;
    if(e.key==='ArrowLeft')spin(-1);else if(e.key==='ArrowRight')spin(1);
  });

  const form=document.getElementById('f'),inp=document.getElementById('n'),err=document.getElementById('err');
  const fail=m=>{err.textContent=m;inp.classList.remove('bad');void inp.offsetWidth;inp.classList.add('bad');MC.vib([40,30,40]);inp.focus()};
  inp.addEventListener('input',()=>{inp.classList.remove('bad');err.textContent=''});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const raw=MC.toEn(inp.value).trim();
    if(!/^\d+$/.test(raw))return fail('یک عدد صحیح بین ۱ تا ۱۰۰ وارد کن.');
    const n=parseInt(raw,10);
    if(n>100)return fail('حداکثر تعداد مجاز ۱۰۰ سکه است.');
    if(n<1)return fail('حداقل تعداد مجاز ۱ سکه است.');
    MC.save(n);location.href='play.html?n='+n;
  });
})();
