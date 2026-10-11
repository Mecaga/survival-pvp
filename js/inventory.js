// Envanter: 4 hotbar + 20 çanta, sürükle-bırak, craft listesi
let slots=Array(24).fill(null),sel=0,drag=null,tab=1;
const seen=JSON.parse(localStorage.getItem('spseen')||'{}');
const saveSeen=()=>localStorage.setItem('spseen',JSON.stringify(seen));
function note(t){if(!seen[t]){seen[t]=1;saveSeen();toast('🏆 Yeni eşya: '+ITEMS[t][0])}}
function ach(id,txt){if(!seen['a_'+id]){seen['a_'+id]=1;saveSeen();toast('🏆 '+txt)}}
function dropStack(i){const s=slots[i];if(!s||!running)return;spawnDrop(s.t,s.n,me.x+aim.x*1.6,me.y+aim.y*1.6);slots[i]=null;renderInv()}
function count(t){return slots.reduce((a,s)=>a+(s&&s.t===t?s.n:0),0)}
function space(t,n){let r=n;for(const s of slots){if(!s)r-=MAXST;else if(s.t===t)r-=MAXST-s.n;if(r<=0)return true}return false}
function add(t,n){note(t);
 for(const s of slots)if(n&&s&&s.t===t){const q=Math.min(n,MAXST-s.n);s.n+=q;n-=q}
 for(let i=0;i<24&&n;i++)if(!slots[i]){const q=Math.min(n,MAXST);slots[i]={t,n:q};n-=q}
 renderInv();return n}
function take(t,n){for(let i=23;i>=0&&n;i--){const s=slots[i];if(s&&s.t===t){const q=Math.min(n,s.n);s.n-=q;n-=q;if(!s.n)slots[i]=null}}renderInv()}
function slotEl(i){const d=document.createElement('div');d.className='slot'+(i===sel&&i<4?' sel':'');d.dataset.i=i;const s=slots[i];
 if(s)d.innerHTML=`<span>${ITEMS[s.t][1]}</span>${s.n>1?`<small>${s.n}</small>`:''}`;return d}
function fill(id,from,to){const g=$(id);g.innerHTML='';for(let i=from;i<to;i++)g.appendChild(slotEl(i))}
function renderInv(){
 fill('hslots',0,4);const s=slots[sel];$('selname').textContent=s?ITEMS[s.t][0]:'';
 if(!$('bag').hidden){fill('grid',4,24);fill('grid2',0,4);if(tab===2)renderCraft('clist','')}
 if(!$('stn').hidden)renderCraft('slist',stOpen);
}
function showTab(n){tab=n;$('bagview').hidden=n!==1;$('clist').hidden=n!==2;$('tb1').classList.toggle('on',n===1);$('tb2').classList.toggle('on',n===2);renderInv()}
function moveItem(a,b){
 if(a===b)return;const A=slots[a],B=slots[b];
 if(A&&B&&A.t===B.t){const q=Math.min(A.n,MAXST-B.n);B.n+=q;A.n-=q;if(!A.n)slots[a]=null}else{slots[a]=B;slots[b]=A}
 renderInv();
}
document.addEventListener('pointerdown',e=>{const el=e.target.closest('.slot');if(el)drag={i:+el.dataset.i,x:e.clientX,y:e.clientY,moved:false,g:null}});
document.addEventListener('pointermove',e=>{
 if(!drag)return;
 if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8&&slots[drag.i]&&!$('bag').hidden){
  drag.moved=true;const g=document.createElement('div');g.className='ghost';g.textContent=ITEMS[slots[drag.i].t][1];document.body.appendChild(g);drag.g=g}
 if(drag.g){drag.g.style.left=e.clientX+'px';drag.g.style.top=e.clientY+'px'}
});
document.addEventListener('pointerup',e=>{
 if(!drag)return;const d=drag;drag=null;if(d.g)d.g.remove();
 if(d.moved){const t=document.elementFromPoint(e.clientX,e.clientY),el=t&&t.closest('.slot');if(el)moveItem(d.i,+el.dataset.i);else if(t&&t.id==='bag')dropStack(d.i)}
 else if(d.i<4){sel=d.i;renderInv()}
});
document.addEventListener('pointercancel',()=>{if(drag&&drag.g)drag.g.remove();drag=null});
function renderCraft(id,st){
 const L=$(id);L.innerHTML='';
 for(const r of RECIPES.filter(r=>(r[3]||'')===st)){
  const [o,n,need]=r,ok=canCraft(r),row=document.createElement('div');row.className='rec'+(ok?'':' no');
  row.innerHTML=`<span>${ITEMS[o][1]} ×${n} <b>${ITEMS[o][0]}</b><br><small>${Object.entries(need).map(([a,v])=>ITEMS[a][1]+v+(count(a)>=v?'':'✗')).join(' ')}</small></span>`;
  const b=document.createElement('button');b.textContent='Yap';b.disabled=!ok;b.onclick=()=>craft(r);row.appendChild(b);L.appendChild(row);
 }
}
