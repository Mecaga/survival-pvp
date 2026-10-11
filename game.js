const $=id=>document.getElementById(id), db=firebase.database();
const S=36, SPEED=4.5, BSPEED=11, BLIFE=900;
const RES={tree:['🌲','wood'],stone:['🪨','stone'],iron:['⛏️','iron'],diamond:['💎','diamond']};
let name=localStorage.getItem('spn');
if(!name){name=(prompt('Oyuncu adın?')||'').trim().slice(0,12)||'Oyuncu'+Math.floor(Math.random()*99);localStorage.setItem('spn',name)}
$('hello').textContent='Hoş geldin, '+name;

// ---- Lobi ----
const rand4=()=>Math.random().toString(36).slice(2,6).toUpperCase();
$('create').onclick=()=>{const c=rand4();db.ref('rooms/'+c+'/meta').set({t:Date.now(),host:name});start(c)};
$('join').onclick=()=>{const c=$('code').value.trim().toUpperCase();if(c.length==4)start(c)};
db.ref('rooms').on('value',s=>{
  const ul=$('rooms');ul.innerHTML='';let n=0;
  s.forEach(r=>{const p=r.child('players').numChildren();if(!p)return;n++;
    const li=document.createElement('li');li.innerHTML=`<span><b>${r.key}</b> · ${p} oyuncu</span>`;
    const b=document.createElement('button');b.textContent='Katıl';b.onclick=()=>start(r.key);li.appendChild(b);ul.appendChild(li)});
  if(!n)ul.innerHTML='<li class="empty">Henüz oda yok. İlk odayı sen kur.</li>';
});

// ---- Dünya ----
let seed=1;
function hash(x,y){let h=(x*374761393+y*668265263+seed*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967295}
function tileAt(x,y){const r=hash(x,y);return r<.08?'tree':r<.12?'stone':r<.135?'iron':r<.14?'diamond':null}

// ---- Durum ----
let code,me,pRef,players={},taken={},shots=[],inv={wood:0,stone:0,iron:0,diamond:0},pending={},keys={},joy=null,aim={x:1,y:0},lastHit=0,godUntil=0;
const cv=$('c'),ctx=cv.getContext('2d');
function resize(){const d=devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);

function start(c){
  code=c;seed=[...c].reduce((a,ch)=>a*31+ch.charCodeAt(0),7);
  $('lobby').hidden=true;$('game').hidden=false;$('roomtag').textContent=c;resize();
  me={id:Math.random().toString(36).slice(2,8),x:(Math.random()-.5)*20,y:(Math.random()-.5)*20,hp:100};
  const base='rooms/'+c;pRef=db.ref(base+'/players/'+me.id);
  pRef.onDisconnect().remove();push();setInterval(push,100);
  db.ref(base+'/players').on('value',s=>{players=s.val()||{}});
  const t=db.ref(base+'/taken');
  t.on('child_added',s=>{taken[s.key]=1});
  db.ref(base+'/shots').limitToLast(20).on('child_added',s=>{const v=s.val();if(Date.now()-v.t<3000)shots.push({...v,k:s.key,born:performance.now(),hit:false})});
  requestAnimationFrame(loop);
}
function push(){pRef.set({n:name,x:+me.x.toFixed(2),y:+me.y.toFixed(2),hp:me.hp})}
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;setTimeout(()=>e.style.opacity=0,1200)}

// ---- Girdi ----
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key==' ')shoot()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
cv.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];if(!joy&&t.clientX<innerWidth*.6)joy={id:t.identifier,sx:t.clientX,sy:t.clientY,dx:0,dy:0}},{passive:false});
cv.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(joy&&t.identifier===joy.id){joy.dx=t.clientX-joy.sx;joy.dy=t.clientY-joy.sy}},{passive:false});
cv.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(joy&&t.identifier===joy.id)joy=null});
$('atk').addEventListener('touchstart',e=>{e.preventDefault();shoot()},{passive:false});
$('atk').onclick=shoot;
document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});

let lastShot=0;
function shoot(){
  if(!me||Date.now()-lastShot<350)return;lastShot=Date.now();
  db.ref('rooms/'+code+'/shots').push({o:me.id,x:me.x,y:me.y,dx:aim.x,dy:aim.y,t:Date.now()}).then(r=>setTimeout(()=>r.remove(),4000));
}

// ---- Döngü ----
let prev=performance.now();
function loop(now){
  const dt=Math.min((now-prev)/1000,.05);prev=now;
  let vx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),vy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
  if(joy){const m=Math.hypot(joy.dx,joy.dy);if(m>8){vx=joy.dx/Math.max(m,50);vy=joy.dy/Math.max(m,50)}}
  const m=Math.hypot(vx,vy);
  if(m>0){if(m>1){vx/=m;vy/=m}me.x+=vx*SPEED*dt;me.y+=vy*SPEED*dt;aim={x:vx/Math.max(m,1e-6)*Math.min(m,1)||vx,y:vy/Math.max(m,1e-6)*Math.min(m,1)||vy};const am=Math.hypot(aim.x,aim.y);aim={x:aim.x/am,y:aim.y/am}}
  collect();bullets(now);draw(now);
  $('pos').textContent=`X: ${Math.round(me.x)}  Y: ${Math.round(me.y)}`;
  $('hpbar').style.width=Math.max(me.hp,0)+'%';
  $('inv').textContent=`🌲${inv.wood} 🪨${inv.stone} ⛏️${inv.iron} 💎${inv.diamond}`;
  requestAnimationFrame(loop);
}
function collect(){
  const cx=Math.round(me.x),cy=Math.round(me.y);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
    const x=cx+i,y=cy+j,k=x+'_'+y,t=tileAt(x,y);
    if(!t||taken[k]||pending[k]||Math.hypot(x-me.x,y-me.y)>.9)continue;
    pending[k]=1;
    db.ref('rooms/'+code+'/taken/'+k).transaction(v=>v?undefined:true,(err,ok,snap)=>{
      delete pending[k];if(ok&&snap.val()){taken[k]=1;inv[RES[t][1]]++}
    });
  }
}
function bullets(now){
  shots=shots.filter(s=>now-s.born<BLIFE);
  for(const s of shots){
    if(s.o===me.id||s.hit||now<godUntil)continue;
    const a=(now-s.born)/1000,bx=s.x+s.dx*BSPEED*a,by=s.y+s.dy*BSPEED*a;
    if(Math.hypot(bx-me.x,by-me.y)<.6){
      s.hit=true;me.hp-=20;
      if(me.hp<=0){toast('Öldün! Yeniden doğuyorsun');me.hp=100;godUntil=now+2000;for(const k in inv)inv[k]=Math.floor(inv[k]/2)}
    }
  }
}
function draw(now){
  const W=innerWidth,H=innerHeight;
  ctx.fillStyle='#2d5a34';ctx.fillRect(0,0,W,H);
  const ox=W/2-me.x*S,oy=H/2-me.y*S,x0=Math.floor(me.x-W/2/S)-1,x1=Math.ceil(me.x+W/2/S)+1,y0=Math.floor(me.y-H/2/S)-1,y1=Math.ceil(me.y+H/2/S)+1;
  ctx.font=S*.8+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
    if((x+y)&1){ctx.fillStyle='#00000010';ctx.fillRect(ox+(x-.5)*S,oy+(y-.5)*S,S,S)}
    const t=tileAt(x,y);if(t&&!taken[x+'_'+y])ctx.fillText(RES[t][0],ox+x*S,oy+y*S);
  }
  ctx.fillStyle='#ffd84a';
  for(const s of shots){const a=(now-s.born)/1000;ctx.beginPath();ctx.arc(ox+(s.x+s.dx*BSPEED*a)*S,oy+(s.y+s.dy*BSPEED*a)*S,5,0,7);ctx.fill()}
  ctx.font='bold 12px sans-serif';
  for(const id in players){
    if(id===me.id)continue;const p=players[id];
    dot(ox+p.x*S,oy+p.y*S,'#e5484d',p.n,p.hp);
  }
  ctx.globalAlpha=now<godUntil?.5:1;dot(W/2,H/2,'#4aa8ff',name,me.hp);ctx.globalAlpha=1;
}
function dot(x,y,c,n,hp){
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,S*.38,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.fillText(n,x,y-S*.7);
  ctx.fillStyle='#400';ctx.fillRect(x-16,y+S*.5,32,4);ctx.fillStyle='#e5484d';ctx.fillRect(x-16,y+S*.5,32*Math.max(hp,0)/100,4);
}
