const GameScreen={mode:'view',
 render(){const s=Engine.s;if(s.phase==='done'){this.mode='view';return EndScreen.render()}
  const p=Engine.picker(),g=Engine.guesser(),pl=i=>`<div class="pl ${i===g?'act':''}"><div class="role">${i===g?'حدس‌زننده 🎯':'انتخاب‌کننده 🧠'}</div>${UI.esc(s.names[i])}<b>${UI.fa(s.scores[i])}</b></div>`;
  let ctl='';
  if(s.phase==='think')ctl=`<div class="phase">دور ${UI.fa(s.round)} — هر دو نفر یک مهره را <b>در ذهن</b> انتخاب کنید و بعد دکمه را بزنید.<br><button class="btn primary" id="rev" style="margin-top:12px">هر دو انتخاب کردیم</button></div>`;
  else if(this.mode==='pick')ctl=`<div class="phase">روی مهره‌ای که هر دو انتخاب کرده بودید بزنید تا حذف شود.<br><button class="btn" id="cancel" style="margin-top:10px">انصراف</button></div>`;
  else ctl=`<div class="phase">آیا ${UI.esc(s.names[g])} مهره‌ی ${UI.esc(s.names[p])} را درست حدس زد؟<div class="row center" style="margin-top:12px"><button class="btn ok" id="yes">بله ✅</button><button class="btn bad" id="no">خیر ❌</button></div></div>`;
  UI.$('#game').innerHTML=`<div class="card"><div class="scorebar">${pl(0)}<div class="mid center"><span class="badge">${s.cat}</span><div class="muted" style="font-size:.85rem">${UI.fa(Engine.left().length)} مهره باقی است</div></div>${pl(1)}</div>${ctl}
  <div class="board">${s.items.map((i,k)=>`<div class="piece ${i.gone?'gone':''} ${this.mode==='pick'&&!i.gone?'pickable':''}" data-id="${i.id}" style="animation-delay:${k*40}ms"><div><span class="e">${i.e}</span><small>${i.n}</small></div></div>`).join('')}</div>
  <div class="log">${s.log.slice().reverse().map(l=>`<div>${l}</div>`).join('')}</div>
  <div class="row center" style="margin-top:14px"><button class="btn" id="quit">خروج</button></div></div>`;
  const on=(id,f)=>{const e=UI.$(id);if(e)e.onclick=f};
  on('#rev',()=>{Engine.reveal();this.render()});on('#no',()=>{Engine.miss();this.render()});
  on('#yes',()=>{this.mode='pick';this.render()});on('#cancel',()=>{this.mode='view';this.render()});
  on('#quit',()=>{if(confirm('بازی فعلی از بین می‌رود. خارج می‌شوید؟')){this.mode='view';IntroScreen.render()}});
  document.querySelectorAll('.piece.pickable').forEach(e=>e.onclick=()=>{this.mode='view';Engine.hit(+e.dataset.id);this.render()});
  UI.show('game')}};
