const UI={
 $(s){return document.querySelector(s)},
 show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));window.scrollTo(0,0)},
 toast(m){const t=this.$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(this._t);this._t=setTimeout(()=>t.classList.remove('show'),2400)},
 fa(n){return Jalali.digits(n)},
 esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
};
