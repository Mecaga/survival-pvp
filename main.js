// Ana döngü, girdiler, açlık/yenilenme, düğmeler
let prev=0,tHun=0,tReg=0,emoN=0,ei=0;const EM=['😀','😡','👍','😭','❤️'];
addEventListener('keydown',e=>{if(!running)return;const k=e.key.toLowerCase();keys[k]=1;
 if(k===' ')shoot();if(k==='e')mine();if(k==='f')use();if(k==='b')toggleBag();if('1234'.includes(k)&&k.length===1){sel=+k-1;renderInv()}});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
cv.addEventListener('touchstart',e=>{e.preventDefault();if(deadUntil)return;for(const t of e.changedTouches)if(!joy&&t.clientX<innerWidth*.6)joy={id:t.identifier,sx:t.clientX,sy:t.clientY,dx:0,dy:0}},{passive:false});
cv.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(joy&&t.identifier===joy.id){joy.dx=t.clientX-joy.sx;joy.dy=t.clientY-joy.sy}},{passive:false});
cv.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(joy&&t.identifier===joy.id)joy=null});
cv.addEventListener('touchcancel',()=>joy=null);
document.addEventListener('touchmove',e=>{if(!e.target.closest('#plist,#clist,.screen'))e.preventDefault()},{passive:false});
const btn=(id,fn)=>$(id).addEventListener('pointerdown',e=>{e.preventDefault();fn()});
btn('atk',shoot);btn('mine',mine);btn('use',use);
btn('sprint',()=>{sprint=!sprint;$('sprint').style.opacity=sprint?1:.55});
btn('emote',()=>{ei=(ei+1)%EM.length;me.emo=EM[ei]+'|'+(++emoN);emoteAt[me.id]=performance.now();pRef.update({e:me.emo});$('emote').textContent=EM[ei]});
function toggleBag(){$('bag').hidden=!$('bag').hidden;if(!$('bag').hidden)showTab(1)}
$('bagbtn').onclick=toggleBag;$('bclose').onclick=()=>$('bag').hidden=true;$('tb1').onclick=()=>showTab(1);$('tb2').onclick=()=>showTab(2);
$('leave').onclick=()=>leave(true);$('exit').onclick=()=>{$('panel').hidden=false;renderPanel()};$('pclose').onclick=()=>$('panel').hidden=true;
function loop(now){
 if(!running)return;const dt=Math.min((now-prev)/1000,.05);prev=now;
 if(deadUntil){if(now>=deadUntil){deadUntil=0;me.hp=100;me.hg=Math.max(me.hg,40);godUntil=now+1500;push()}}
 else{
  let vx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),vy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(joy){const m=Math.hypot(joy.dx,joy.dy);if(m>8){vx=joy.dx/Math.max(m,50);vy=joy.dy/Math.max(m,50)}}
  const m=Math.hypot(vx,vy);
  if(m>.01){aim={x:vx/m,y:vy/m};const sp=SPEED*Math.min(m,1)*(sprint?1.5:1)*dt;move(aim.x*sp,aim.y*sp)}
  pickup();
  tHun+=dt*(sprint&&m>.01?2.5:1);if(tHun>=4){tHun=0;me.hg=Math.max(0,me.hg-1)}
  tReg+=dt;if(tReg>=3){tReg=0;if(me.hg>70&&me.hp<100)me.hp++;else if(me.hg<=0&&me.hp>1)me.hp--}
 }
 bullets(now);draw(now);
 $('pos').textContent=`X: ${Math.round(me.x)}  Y: ${Math.round(me.y)}`;
 $('hpbar').style.width=Math.max(me.hp,0)+'%';$('hgbar').style.width=me.hg+'%';
 $('score').textContent=`⚔️ ${(players[me.id]||{}).k||0}   💀 ${me.d}`;
 requestAnimationFrame(loop);
}
