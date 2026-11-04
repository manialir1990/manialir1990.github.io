(async()=>{
  const sb=MC.sb,$=id=>document.getElementById(id);
  const {data:{session}}=await sb.auth.getSession();
  if(!session){location.replace('login.html');return}
  const {data:P}=await sb.from('profiles').select('*').eq('id',session.user.id).single();
  if(!P||P.banned){await sb.auth.signOut();location.replace('login.html');return}
  if(P.role==='admin')$('adminLink').hidden=false;
  $('logout').onclick=async()=>{await sb.auth.signOut();location.href='login.html'};

  const DIA='<svg viewBox="0 0 64 64"><polygon points="32,4 56,22 32,60 8,22" fill="#b27cff"/><polygon points="32,4 44,22 20,22" fill="#e6d3ff"/><polygon points="8,22 20,22 32,60" fill="#8a4fe0"/><polygon points="56,22 44,22 32,60" fill="#6f33c9"/><polygon points="20,22 44,22 32,60" fill="#a368f5"/></svg>';
  $('diaIcon').innerHTML=DIA;
  let coins=+P.coins,last=+P.last_amount,spins=P.spins,dia=P.diamonds,awarded=P.diamonds+P.pending_diamonds,col=0,inflight=0,rot=0,queue=Promise.resolve();
  const render=()=>{$('coinNum').textContent=coins.toFixed(4);$('diaNum').textContent=dia};
  render();

  const coin=$('coin'),stage=$('stage');
  MC.buildCoin(coin);

  function fly(a){
    const r=coin.getBoundingClientRect(),el=document.createElement('div');
    el.className='fly';el.textContent='+'+a.toFixed(6);
    el.style.left=(r.left+r.width/2+(Math.random()*90-70))+'px';el.style.top=(r.top-10)+'px';
    document.body.appendChild(el);el.addEventListener('animationend',()=>el.remove());
  }

  function release(){
    const r=coin.getBoundingClientRect(),box=$('diaBox'),el=document.createElement('div');
    el.className='diamond';el.innerHTML=DIA;
    let x=r.left+r.width/2-28,y=r.top-20,drag=false,ox=0,oy=0;
    const put=()=>{el.style.left=x+'px';el.style.top=y+'px'};put();
    document.body.appendChild(el);
    box.classList.remove('flash');void box.offsetWidth;box.classList.add('flash');box.addEventListener('animationend',()=>box.classList.remove('flash'),{once:true});MC.vib(40);
    (function tick(){if(!el.isConnected)return;if(!drag){y-=.7;put()}if(y<-70){el.remove();return}requestAnimationFrame(tick)})();
    el.addEventListener('pointerdown',e=>{drag=true;el.setPointerCapture(e.pointerId);el.classList.add('drag');ox=e.clientX-x;oy=e.clientY-y});
    el.addEventListener('pointermove',e=>{if(!drag)return;x=e.clientX-ox;y=e.clientY-oy;put()});
    el.addEventListener('pointerup',async e=>{
      drag=false;el.classList.remove('drag');
      const b=box.getBoundingClientRect();
      if(e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom){
        el.remove();dia++;render();MC.vib([20,30,20]);col++;
        queue=queue.then(()=>sb.rpc('collect_diamond')).then(({data})=>{col--;if(data&&col===0){dia=data.diamonds;render()}}).catch(()=>{col=Math.max(0,col-1)});
      }
    });
  }

  function spin(dir){
    rot+=dir*180;coin.style.transform=`rotateY(${rot}deg)`;MC.vib(30);
    const a=spins===0?0.0001:last*1.001;last=a;spins++;coins+=a;render();fly(a);
    inflight++;
    queue=queue.then(()=>sb.rpc('spin')).then(({data,error})=>{
      inflight--;
      if(error||!data)return;
      const tot=(+data.diamonds)+(+data.pending_diamonds);if(tot>awarded){awarded=tot;release()}
      if(inflight===0){coins=+data.coins;last=+data.last_amount;spins=data.spins;render()}
    }).catch(()=>{inflight=Math.max(0,inflight-1)});
  }
  let x0=null;
  stage.addEventListener('pointerdown',e=>{x0=e.clientX});
  stage.addEventListener('pointerup',e=>{if(x0===null)return;const dx=e.clientX-x0;x0=null;spin(Math.abs(dx)<24?1:(dx>0?1:-1))});
  stage.addEventListener('pointercancel',()=>{x0=null});
  document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')spin(-1);else if(e.key==='ArrowRight')spin(1)});
})();
