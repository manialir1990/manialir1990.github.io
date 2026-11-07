const SetupScreen={render(){
 const l=Store.load().last||{};this.cat=l.cat||'fruit';this.count=l.count||8;
 UI.$('#setup').innerHTML=`<div class="card"><h2>تنظیمات بازی</h2><p class="muted" style="margin-bottom:20px">نوع مهره‌ها و تعداد آن‌ها را انتخاب کنید.</p>
 <div class="row"><div class="field" style="flex:1;min-width:150px"><label>نفر اول</label><input type="text" id="n1" maxlength="14" value="${UI.esc(l.n1||'نفر اول')}"></div>
 <div class="field" style="flex:1;min-width:150px"><label>نفر دوم</label><input type="text" id="n2" maxlength="14" value="${UI.esc(l.n2||'نفر دوم')}"></div></div>
 <div class="field"><label>نوع مهره‌ها</label><div class="chips" id="cats">${CATEGORIES.map(c=>`<div class="chip" data-id="${c.id}"><span class="e">${c.icon}</span>${c.name}</div>`).join('')}</div></div>
 <div class="field"><label>تعداد مهره‌ها: <b id="cv"></b></label><input type="range" id="cnt" min="${LIMITS.min}" max="${LIMITS.max}"></div>
 <div class="row"><button class="btn primary lg" id="start">شروع</button><button class="btn" id="back">بازگشت</button></div></div>`;
 const sync=()=>{document.querySelectorAll('#cats .chip').forEach(c=>c.classList.toggle('sel',c.dataset.id===this.cat));UI.$('#cv').textContent=UI.fa(this.count)};
 document.querySelectorAll('#cats .chip').forEach(c=>c.onclick=()=>{this.cat=c.dataset.id;sync()});
 const r=UI.$('#cnt');r.value=this.count;r.oninput=()=>{this.count=+r.value;sync()};sync();
 UI.$('#back').onclick=()=>IntroScreen.render();
 UI.$('#start').onclick=()=>{const n1=UI.$('#n1').value.trim()||'نفر اول',n2=UI.$('#n2').value.trim()||'نفر دوم';
  Store.setLast({n1,n2,cat:this.cat,count:this.count});Engine.start(n1,n2,this.cat,this.count);GameScreen.render()};
 UI.show('setup')}};
