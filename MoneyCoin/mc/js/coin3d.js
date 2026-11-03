MC.buildCoin=function(el,t=4){
  let s='';
  for(let z=-t+1;z<t;z++)s+=`<i class="slice" style="transform:translateZ(${z}px)"></i>`;
  el.innerHTML=s+
    `<img class="face" src="assets/coin-front.png" alt="سکه Money" draggable="false" style="transform:translateZ(${t}px)">`+
    `<img class="face" src="assets/coin-back.png" alt="" draggable="false" style="transform:rotateY(180deg) translateZ(${t}px)">`;
};
