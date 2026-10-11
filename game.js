const $=id=>document.getElementById(id), db=firebase.database();
const S=36, SPEED=4.5, BSPEED=12, BLIFE=900, SHOT_CD=380, MINE_CD=300, DEAD_MS=2000;
const HP={tree:3,stone:4,iron:6,diamond:8}, DROP={tree:'wood',stone:'stone',iron:'iron',diamond:'diamond'};
const ICON={wood:'🪵',stone:'🪨',iron:'🟠',diamond:'💎'};
const show=id=>{['login','menu','game'].forEach(s=>$(s).hidden=s!==id)};

// ---- Giriş & menü ----
let name=localStorage.getItem('spn')||'';
$('nick').value=name;
$('enter').onclick=()=>{
  name=$('nick').value.trim().slice(0,12);if(!name){$('nick').focus();return}
  localStorage.setItem('spn',name);$('hello').textContent='Hoş geldin, '+name;show('menu');
};
const rand4=()=>Math.random().toString(36).slice(2,6).toUpperCase();
$('create').onclick=()=>start(rand4(),true);
$('join').onclick=()=>joinCode($('code').value.trim().toUpperCase());
async function joinCode(c){
  if(c.length!==4)return alert('Oda kodu 4 karakter olmalı.');
  const s=await db.ref('rooms/'+c+'/meta').once('value');
  if(!s.exists())return alert('Bu kodla açık bir oda yok.');
  start(c,false);
}
db.ref('rooms').on('value',s=>{
  const ul=$('rooms');ul.innerHTML='';let n=0;
  s.forEach(r=>{const p=r.child('players').numChildren();if(!p||!r.child('meta').exists())return;n++;
    const li=document.createElement('li');li.innerHTML=`<span><b>${r.key}</b> · ${p} oyuncu</span>`;
    const b=document.createElement('button');b.textContent='Katıl';b.onclick=()=>joinCode(r.key);li.appendChild(b);ul.appendChild(li)});
  if(!n)ul.innerHTML='<li class="empty">Henüz oda yok. İlk odayı sen kur.</li>';
});

// ---- Dünya ----
let seed=1;
function hash(x,y){let h=(x*374761393+y*668265263+seed*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967295}
function tileAt(x,y){const r=hash(x,y);return r<.08?'tree':r<.12?'stone':r<.135?'iron':r<.14?'diamond':null}

// ---- Durum ----
let code,isHost,me,pRef,refs,timer,running,players={},taken={},hitsMap={},drops={},shots=[],inv,pending={},keys={},joy=null,aim={x:1,y:0},godUntil=0,lastShot=0,lastMine=0,deadUntil=0;
const cv=$('c'),ctx=cv.getContext('2d');
function resize(){const d=devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.opacity=0,1400)}
const listen=(ref,ev,fn)=>{ref.on(ev,fn);refs.push([ref,ev,fn])};

function start(c,host){
  code=c;isHost=host;seed=[...c].reduce((a,ch)=>a*31+ch.charCodeAt(0),7);
  players={};taken={};hitsMap={};drops={};shots=[];pending={};refs=[];deadUntil=0;godUntil=0;
  inv={wood:0,stone:0,iron:0,diamond:0};
  me={id:Math.random().toString(36).slice(2,8),x:(Math.random()-.5)*20,y:(Math.random()-.5)*20,hp:100,d:0};
  const base=db.ref('rooms/'+c);
  if(host){base.child('meta').set({host:me.id,hostName:name,t:Date.now()});base.onDisconnect().remove()}
  pRef=base.child('players/'+me.id);
  pRef.onDisconnect().remove();
  pRef.set({n:name,x:me.x,y:me.y,hp:100,a:1,k:0,d:0});
  listen(base.child('players'),'value',s=>{players=s.val()||{};renderPanel()});
  listen(base.child('taken'),'child_added',s=>{taken[s.key]=1});
  listen(base.child('hits'),'value',s=>{hitsMap=s.val()||{}});
  listen(base.child('drops'),'child_added',s=>{drops[s.key]=s.val()});
  listen(base.child('drops'),'child_removed',s=>{delete drops[s.key]});
  listen(base.child('shots'),'child_added',s=>{
    const v=s.val();if(shots.some(q=>q.k===s.key)||Date.now()-v.t>3000)return;
    shots.push({...v,k:s.key,born:performance.now(),hit:false});
  });
  listen(base.child('shots'),'child_removed',s=>{shots=shots.filter(q=>q.k!==s.key)});
  if(!host)listen(base.child('meta'),'value',s=>{if(!s.exists()&&running){leave(false);alert('Oda sahibi odadan ayrıldı, oda kapandı.')}});
  show('game');$('panel').hidden=true;resize();
  timer=setInterval(push,100);running=true;prev=performance.now();requestAnimationFrame(loop);
}
function push(){pRef.update({x:+me.x.toFixed(2),y:+me.y.toFixed(2),hp:me.hp,d:me.d,a:deadUntil?0:1})}
function leave(manual=true){
  running=false;clearInterval(timer);
  refs.forEach(([r,e,f])=>r.off(e,f));
  const base=db.ref('rooms/'+code);
  pRef.onDisconnect().cancel();
  if(isHost&&manual){base.onDisconnect().cancel();base.remove()}else pRef.remove();
  show('menu');
}
$('leave').onclick=()=>leave(true);
$('exit').onclick=()=>{$('panel').hidden=false;renderPanel()};
$('pclose').onclick=()=>$('panel').hidden=true;
function renderPanel(){
  if(!running)return;
  const ids=Object.keys(players);$('ptitle').textContent=`Oda ${code} · ${ids.length} oyuncu`;
  $('plist').innerHTML=ids.map(i=>{const p=players[i];return `<li><span>${i===me.id?'⭐ ':''}${(p.n||'').replace(/</g,'&lt;')}</span><span>⚔️ ${p.k||0}  💀 ${p.d||0}</span></li>`}).join('');
  $('leave').textContent=isHost?'Odayı kapat ve ayrıl':'Odadan ayrıl';
}

// ---- Girdi ----
addEventListener('keydown',e=>{if(!running)return;keys[e.key.toLowerCase()]=1;if(e.key===' ')shoot();if(e.key.toLowerCase()==='e')mine()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
cv.addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)if(!joy&&t.clientX<innerWidth*.6)joy={id:t.identifier,sx:t.clientX,sy:t.clientY,dx:0,dy:0}},{passive:false});
cv.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(joy&&t.identifier===joy.id){joy.dx=t.clientX-joy.sx;joy.dy=t.clientY-joy.sy}},{passive:false});
cv.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(joy&&t.identifier===joy.id)joy=null});
cv.addEventListener('touchcancel',()=>joy=null);
$('atk').addEventListener('pointerdown',e=>{e.preventDefault();shoot()});
$('mine').addEventListener('pointerdown',e=>{e.preventDefault();mine()});
document.addEventListener('touchmove',e=>{if(!e.target.closest('#plist,.screen'))e.preventDefault()},{passive:false});

// ---- Ateş: en yakın düşmana otomatik nişan, yoksa baktığın yöne ----
function shoot(){
  const now=Date.now();if(!running||deadUntil||now-lastShot<SHOT_CD)return;lastShot=now;
  let best=null,bd=9;
  for(const id in players){if(id===me.id)continue;const p=players[id];if(p.a===0)continue;const d=Math.hypot(p.x-me.x,p.y-me.y);if(d<bd){bd=d;best=p}}
  let dx=aim.x,dy=aim.y;
  if(best){dx=(best.x-me.x)/bd;dy=(best.y-me.y)/bd;aim={x:dx,y:dy}}
  const ref=db.ref('rooms/'+code+'/shots').push();
  const sh={o:me.id,x:me.x,y:me.y,dx,dy,t:now};
  shots.push({...sh,k:ref.key,born:performance.now(),hit:false});
  ref.set(sh);setTimeout(()=>ref.remove(),2500);
}

// ---- Maden / ağaç kırma ----
function mine(){
  const now=Date.now();if(!running||deadUntil||now-lastMine<MINE_CD)return;lastMine=now;
  let bk=null,bt=null,bd=1.6,bx=0,by=0;
  const cx=Math.round(me.x),cy=Math.round(me.y);
  for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){
    const x=cx+i,y=cy+j,k=x+'_'+y,t=tileAt(x,y);if(!t||taken[k])continue;
    const d=Math.hypot(x-me.x,y-me.y);if(d<bd){bd=d;bk=k;bt=t;bx=x;by=y}
  }
  if(!bk){toast('Yakında kırılacak bir şey yok');return}
  const base=db.ref('rooms/'+code);
  base.child('hits/'+bk).transaction(v=>(v||0)+1,(err,ok,snap)=>{
    if(!ok||snap.val()<HP[bt])return;
    base.child('taken/'+bk).transaction(v=>v?undefined:true,(e2,ok2)=>{
      if(!ok2)return;taken[bk]=1;base.child('hits/'+bk).remove();
      const n=bt==='tree'?2:1+Math.floor(Math.random()*2);
      base.child('drops').push({t:DROP[bt],n,x:bx+(Math.random()-.5)*.6,y:by+(Math.random()-.5)*.6});
    });
  });
}
function pickup(){
  for(const id in drops){
    const d=drops[id];if(pending[id]||Math.hypot(d.x-me.x,d.y-me.y)>.8)continue;
    pending[id]=1;
    db.ref('rooms/'+code+'/drops/'+id).transaction(v=>v?null:undefined,(e,ok,snap)=>{
      delete pending[id];if(ok&&snap.val()===null){inv[d.t]+=d.n;delete drops[id]}
    });
  }
}

// ---- Çarpışma, ölüm ----
function bullets(now){
  shots=shots.filter(s=>now-s.born<BLIFE);
  if(deadUntil||now<godUntil)return;
  for(const s of shots){
    if(s.o===me.id||s.hit)continue;
    const a=(now-s.born)/1000,bx=s.x+s.dx*BSPEED*a,by=s.y+s.dy*BSPEED*a;
    if(Math.hypot(bx-me.x,by-me.y)<.65){
      s.hit=true;db.ref('rooms/'+code+'/shots/'+s.k).remove();
      me.hp-=20;
      if(me.hp<=0)die(s.o,now);
    }
  }
}
function die(killer,now){
  me.hp=0;me.d++;deadUntil=now+DEAD_MS;joy=null;keys={};
  for(const k in inv)inv[k]=Math.floor(inv[k]/2);
  db.ref('rooms/'+code+'/players/'+killer+'/k').transaction(v=>(v||0)+1);
  push();
}

// ---- Döngü ----
let prev=0;
function loop(now){
  if(!running)return;
  const dt=Math.min((now-prev)/1000,.05);prev=now;
  if(deadUntil){
    if(now>=deadUntil){deadUntil=0;me.hp=100;godUntil=now+1500;push()}
  }else{
    let vx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),vy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
    if(joy){const m=Math.hypot(joy.dx,joy.dy);if(m>8){vx=joy.dx/Math.max(m,50);vy=joy.dy/Math.max(m,50)}}
    const m=Math.hypot(vx,vy);
    if(m>.01){
      aim={x:vx/m,y:vy/m};const k=Math.min(m,1);
      me.x+=aim.x*k*SPEED*dt;me.y+=aim.y*k*SPEED*dt;
    }
    pickup();
  }
  bullets(now);draw(now);
  $('pos').textContent=`X: ${Math.round(me.x)}  Y: ${Math.round(me.y)}`;
  $('hpbar').style.width=Math.max(me.hp,0)+'%';
  $('inv').textContent=Object.keys(ICON).map(k=>ICON[k]+inv[k]).join('  ');
  $('score').textContent=`⚔️ Öldürme: ${(players[me.id]||{}).k||0}   💀 Ölüm: ${me.d}`;
  requestAnimationFrame(loop);
}

// ---- Çizim ----
function draw(now){
  const W=innerWidth,H=innerHeight;
  ctx.fillStyle='#2d5a34';ctx.fillRect(0,0,W,H);
  const ox=W/2-me.x*S,oy=H/2-me.y*S,x0=Math.floor(me.x-W/2/S)-1,x1=Math.ceil(me.x+W/2/S)+1,y0=Math.floor(me.y-H/2/S)-1,y1=Math.ceil(me.y+H/2/S)+1;
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    if((x+y)&1){ctx.fillStyle='#00000010';ctx.fillRect(ox+(x-.5)*S,oy+(y-.5)*S,S,S)}
    const t=tileAt(x,y),k=x+'_'+y;if(!t||taken[k])continue;
    const px=ox+x*S,py=oy+y*S;
    if(t!=='tree'){ctx.fillStyle='#3b4a44';ctx.beginPath();ctx.roundRect(px-S*.46,py-S*.46,S*.92,S*.92,8);ctx.fill()}
    ctx.font=S*.8+'px serif';ctx.fillText(t==='tree'?'🌲':t==='diamond'?'💎':'🪨',px,py);
    if(t==='iron'){ctx.font=S*.3+'px serif';ctx.fillText('🟠',px-S*.2,py+S*.15);ctx.fillText('🟠',px+S*.2,py-S*.1)}
    const h=hitsMap[k];if(h){ctx.fillStyle='#000a';ctx.fillRect(px-14,py-S*.6,28,5);ctx.fillStyle='#ffb020';ctx.fillRect(px-14,py-S*.6,28*(1-h/HP[t]),5)}
  }
  for(const id in drops){const d=drops[id];ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(ox+d.x*S,oy+d.y*S,S*.3,0,7);ctx.fill();ctx.font=S*.45+'px serif';ctx.fillStyle='#fff';ctx.fillText(ICON[d.t],ox+d.x*S,oy+d.y*S)}
  ctx.fillStyle='#ffd84a';
  for(const s of shots){const a=(now-s.born)/1000;ctx.beginPath();ctx.arc(ox+(s.x+s.dx*BSPEED*a)*S,oy+(s.y+s.dy*BSPEED*a)*S,5,0,7);ctx.fill()}
  ctx.font='bold 12px sans-serif';
  for(const id in players){if(id===me.id)continue;const p=players[id];if(p.a===0)continue;dot(ox+p.x*S,oy+p.y*S,'#e5484d',p.n,p.hp)}
  if(deadUntil){
    ctx.fillStyle='#0006';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 22px sans-serif';
    ctx.fillText(`Öldün · ${Math.ceil((deadUntil-now)/1000)}`,W/2,H/2);
  }else{
    ctx.globalAlpha=now<godUntil?.5:1;dot(W/2,H/2,'#4aa8ff',name,me.hp);ctx.globalAlpha=1;
    ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2+aim.x*S*.45,H/2+aim.y*S*.45);ctx.lineTo(W/2+aim.x*S*.8,H/2+aim.y*S*.8);ctx.stroke();
  }
  if(joy){ctx.strokeStyle='#fff6';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.sx,joy.sy,50,0,7);ctx.stroke();ctx.fillStyle='#fff5';ctx.beginPath();ctx.arc(joy.sx+Math.max(-50,Math.min(50,joy.dx)),joy.sy+Math.max(-50,Math.min(50,joy.dy)),20,0,7);ctx.fill()}
}
function dot(x,y,c,n,hp){
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,S*.38,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.fillText(n||'',x,y-S*.7);
  ctx.fillStyle='#400';ctx.fillRect(x-16,y+S*.5,32,4);ctx.fillStyle='#e5484d';ctx.fillRect(x-16,y+S*.5,32*Math.max(hp,0)/100,4);
}
