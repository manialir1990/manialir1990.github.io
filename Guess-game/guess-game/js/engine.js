const Engine={s:null,
 start(n1,n2,cat,count){const c=CATEGORIES.find(x=>x.id===cat);const items=[...c.items].sort(()=>Math.random()-.5).slice(0,count).map((p,i)=>({id:i,e:p[0],n:p[1],gone:false}));
  this.s={names:[n1,n2],cat:c.name,items,scores:[0,0],round:1,phase:'think',log:[],date:Jalali.format(),time:Jalali.time()}},
 picker(){return(this.s.round-1)%2},guesser(){return 1-this.picker()},
 left(){return this.s.items.filter(i=>!i.gone)},
 over(){return this.left().length<=1},
 reveal(){this.s.phase='result'},
 miss(){const s=this.s;s.log.push(`دور ${UI.fa(s.round)}: ${s.names[this.guesser()]} حدس نزد ❌`);this.next()},
 hit(id){const s=this.s,it=s.items.find(i=>i.id===id),g=this.guesser();it.gone=true;s.scores[g]++;
  s.log.push(`دور ${UI.fa(s.round)}: ${s.names[g]} درست حدس زد ${it.e} ${it.n} ✅`);this.next()},
 next(){const s=this.s;s.round++;s.phase='think';if(this.over()){s.phase='done';this.finish()}},
 winner(){const[a,b]=this.s.scores;return a===b?-1:(a>b?0:1)},
 finish(){const s=this.s;Store.addGame({names:s.names,scores:s.scores,cat:s.cat,date:s.date,time:s.time,rounds:s.round-1,winner:this.winner()})}
};
