const Store={
 k:'hads-bezan-v1',
 load(){try{return JSON.parse(localStorage.getItem(this.k))||{history:[],last:{}}}catch(e){return{history:[],last:{}}}},
 save(d){try{localStorage.setItem(this.k,JSON.stringify(d))}catch(e){}},
 addGame(g){const d=this.load();d.history.unshift(g);d.history=d.history.slice(0,50);this.save(d)},
 setLast(o){const d=this.load();d.last=o;this.save(d)},
 clear(){const d=this.load();d.history=[];this.save(d)}
};
