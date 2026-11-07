const EndScreen={render(){const s=Engine.s,w=Engine.winner(),last=Engine.left()[0];
 UI.$('#end').innerHTML=`<div class="card center"><div class="trophy">${w<0?'🤝':'🏆'}</div>
 <h2>${w<0?'مساوی شد!':`برنده: ${UI.esc(s.names[w])}`}</h2>
 <p class="muted">${UI.esc(s.names[0])} ${UI.fa(s.scores[0])} — ${UI.fa(s.scores[1])} ${UI.esc(s.names[1])}</p>
 <p style="margin:14px 0">مهره‌ی آخر: <span style="font-size:2.4rem">${last?last.e:''}</span> ${last?last.n:''}</p>
 <p class="muted" style="font-size:.85rem">${Jalali.format()} · ${UI.fa(s.round-1)} دور</p>
 <div class="row center" style="margin-top:20px"><button class="btn primary" id="again">بازی دوباره</button><button class="btn" id="home">صفحه اصلی</button></div></div>`;
 UI.$('#again').onclick=()=>SetupScreen.render();UI.$('#home').onclick=()=>IntroScreen.render();UI.show('end')}};
