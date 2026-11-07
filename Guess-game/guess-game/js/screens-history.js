const HistoryScreen={render(){const h=Store.load().history;
 UI.$('#history').innerHTML=`<div class="card"><h2>تاریخچه بازی‌ها</h2>${h.length?`<div style="overflow-x:auto"><table><tr><th>تاریخ</th><th>بازیکنان</th><th>نتیجه</th><th>برنده</th></tr>
 ${h.map(g=>`<tr><td>${g.date}<br><small class="muted">${g.time}</small></td><td>${UI.esc(g.names[0])} / ${UI.esc(g.names[1])}</td><td>${UI.fa(g.scores[0])} - ${UI.fa(g.scores[1])}</td><td>${g.winner<0?'مساوی':UI.esc(g.names[g.winner])}</td></tr>`).join('')}</table></div>`:'<p class="muted">هنوز بازی‌ای ثبت نشده است.</p>'}
 <div class="row" style="margin-top:18px"><button class="btn" id="b">بازگشت</button>${h.length?'<button class="btn bad" id="c">پاک کردن</button>':''}</div></div>`;
 UI.$('#b').onclick=()=>IntroScreen.render();const c=UI.$('#c');if(c)c.onclick=()=>{Store.clear();this.render()};UI.show('history')}};
