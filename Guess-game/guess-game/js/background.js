const Background={
 scenes:['radial-gradient(circle at 20% 20%,#4c1d95,transparent 50%),radial-gradient(circle at 80% 30%,#0e7490,transparent 55%),linear-gradient(#0b0820,#1a1040)',
 'radial-gradient(circle at 70% 20%,#9d174d,transparent 50%),radial-gradient(circle at 20% 70%,#1e3a8a,transparent 55%),linear-gradient(#12081f,#2a0e3d)',
 'radial-gradient(circle at 30% 30%,#065f46,transparent 50%),radial-gradient(circle at 80% 70%,#6d28d9,transparent 55%),linear-gradient(#04141a,#0b2a2e)',
 'radial-gradient(circle at 60% 20%,#b45309,transparent 45%),radial-gradient(circle at 20% 60%,#5b21b6,transparent 55%),linear-gradient(#150a22,#2a1740)'],
 i:0,
 init(){const a=document.querySelector('.scene.a'),b=document.querySelector('.scene.b');this.l=[a,b];
  const st=document.getElementById('stars');for(let n=0;n<90;n++){const s=document.createElement('i');s.className='star';
   s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*70}%;animation-delay:${Math.random()*3}s;transform:scale(${Math.random()*1.6+.5})`;st.appendChild(s)}
  const o=document.getElementById('orbs'),cols=['#8b5cf6','#22d3ee','#f472b6','#fbbf24'];
  for(let n=0;n<5;n++){const d=document.createElement('div');d.className='orb';const z=120+Math.random()*180;
   d.style.cssText=`width:${z}px;height:${z}px;left:${Math.random()*90}%;top:${Math.random()*80}%;background:${cols[n%4]};animation-duration:${14+Math.random()*14}s`;o.appendChild(d)}
  this.next();setInterval(()=>this.next(),12000)},
 next(){const el=this.l[this.i%2];el.style.background=this.scenes[this.i%this.scenes.length];
  this.l.forEach(x=>x.classList.remove('on'));el.classList.add('on');this.i++}
};
