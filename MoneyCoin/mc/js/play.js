(()=>{
  const n=MC.load()||parseInt(new URLSearchParams(location.search).get('n'),10)||0;
  if(n<1||n>100){location.replace('index.html');return}
  const table=document.getElementById('table'),layer=document.getElementById('layer');
  const Z={};
  document.querySelectorAll('.zone').forEach(el=>{Z[el.dataset.zone]={el,coins:[],out:el.querySelector('.count b')}});

  function layout(){
    const T=table.getBoundingClientRect();
    for(const k in Z){
      const z=Z[k],r=z.el.getBoundingClientRect(),m=z.coins.length;
      z.out.textContent=MC.fa(m);
      if(!m)continue;
      const cw=z.el.querySelector('.count').offsetWidth+20,W=r.width-cw-16,H=r.height-16;
      let cell=0,cols=1;
      for(let c=1;c<=m;c++){const s=Math.min(W/c,H/Math.ceil(m/c));if(s>cell){cell=s;cols=c}}
      const rows=Math.ceil(m/cols),d=Math.min(cell*.88,170);
      const x0=r.left-T.left+8+(W-cols*cell)/2,y0=r.top-T.top+8+(H-rows*cell)/2;
      z.coins.forEach((c,i)=>{
        const row=Math.floor(i/cols),inRow=row===rows-1?m-row*cols:cols,col=i%cols,off=(cols-inRow)*cell/2;
        Object.assign(c.style,{width:d+'px',height:d+'px',left:(x0+off+col*cell+(cell-d)/2)+'px',top:(y0+row*cell+(cell-d)/2)+'px'});
      });
    }
  }

  function flip(c){c.dataset.side=c.dataset.side==='back'?'front':'back';MC.vib(20)}

  function drop(c,y){
    let best='mid',bd=1e9;
    for(const k in Z){const r=Z[k].el.getBoundingClientRect(),d=y<r.top?r.top-y:y>r.bottom?y-r.bottom:0;if(d<bd){bd=d;best=k}}
    const old=Z[c.dataset.zone];old.coins=old.coins.filter(x=>x!==c);
    c.dataset.zone=best;Z[best].coins.push(c);layout();
  }

  function bind(c){
    let sx=0,sy=0,ox=0,oy=0,drag=false,id=null;
    c.addEventListener('pointerdown',e=>{
      id=e.pointerId;c.setPointerCapture(id);sx=e.clientX;sy=e.clientY;
      const r=c.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;drag=false;
    });
    c.addEventListener('pointermove',e=>{
      if(id===null)return;
      if(!drag&&Math.hypot(e.clientX-sx,e.clientY-sy)>8){drag=true;c.classList.add('drag')}
      if(drag){const T=table.getBoundingClientRect();c.style.left=(e.clientX-T.left-ox)+'px';c.style.top=(e.clientY-T.top-oy)+'px'}
    });
    c.addEventListener('pointerup',e=>{
      if(id===null)return;id=null;c.classList.remove('drag');
      if(drag){drop(c,e.clientY);MC.vib(18)}else flip(c);
      drag=false;
    });
    c.addEventListener('pointercancel',()=>{id=null;drag=false;c.classList.remove('drag');layout()});
  }

  for(let i=0;i<n;i++){
    const c=document.createElement('div');
    c.className='coin';c.dataset.zone='mid';c.dataset.side='front';
    c.innerHTML='<div class="flip"><img class="f" src="assets/coin-front.png" alt="" draggable="false"><img class="b" src="assets/coin-back.png" alt="" draggable="false"></div>';
    layer.appendChild(c);Z.mid.coins.push(c);bind(c);
  }

  document.getElementById('reset').addEventListener('click',()=>{
    for(const k in Z)Z[k].coins=[];
    layer.querySelectorAll('.coin').forEach(c=>{c.dataset.zone='mid';c.dataset.side='front';Z.mid.coins.push(c)});
    layout();MC.vib(20);
  });
  addEventListener('resize',layout);
  layout();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(layout);
})();
