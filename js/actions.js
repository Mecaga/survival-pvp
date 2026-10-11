// Eylemler: ateş, kırma, kullan, ekme, craft, toplama, ölüm
function spawnDrop(t,n,x,y){db.ref('rooms/'+code+'/drops').push({t,n,x:x+(Math.random()-.5)*.7,y:y+(Math.random()-.5)*.7})}
function shoot(){
 const now=Date.now();if(!running||deadUntil||now-lastShot<SHOT_CD)return;lastShot=now;
 let best=null,bd=9;
 for(const id in players){if(id===me.id)continue;const p=players[id];if(p.a===0)continue;const d=Math.hypot(p.x-me.x,p.y-me.y);if(d<bd){bd=d;best=p}}
 let dx=aim.x,dy=aim.y;if(best){dx=(best.x-me.x)/bd;dy=(best.y-me.y)/bd;aim={x:dx,y:dy}}
 const ref=db.ref('rooms/'+code+'/shots').push(),sh={o:me.id,x:me.x,y:me.y,dx,dy,t:now};
 shots.push({...sh,k:ref.key,born:performance.now(),hit:false});ref.set(sh);setTimeout(()=>ref.remove(),2500);beep(300,.06,'sawtooth');
}
function mine(){
 const now=Date.now();if(!running||deadUntil||now-lastMine<MINE_CD)return;lastMine=now;if(melee())return;
 const cx=Math.round(me.x),cy=Math.round(me.y);let best=null,bd=1.7;
 for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){
  const x=cx+i,y=cy+j,kk=K(x,y),d=Math.hypot(x-me.x,y-me.y);if(d>=bd)continue;
  const t=crops[kk]?'crop':tileAt(x,y);if(!t||t==='water'||(t!=='crop'&&!alive(kk)))continue;best={x,y,k:kk,t};bd=d}
 if(!best)return toast('Yakında kırılacak bir şey yok');
 beep(200,.05);if(best.t==='crop')return harvest(best);
 const sl=slots[sel],tool=sl&&TOOLS[sl.t],ore=best.t==='stone'||best.t==='iron'||best.t==='diamond';
 const lvl=ore&&tool&&tool[0]==='ore'?tool[1]:0;
 if(ore&&lvl<NEED[best.t])return toast(lvl?'Daha iyi kazma lazım':'Kazma lazım ⛏️');
 const dmg=tool&&(ore?tool[0]==='ore':best.t==='tree'&&tool[0]==='tree')?tool[1]+1:1,base=db.ref('rooms/'+code);
 burst(best.x,best.y,PC[best.t],4);base.child('hits/'+best.k).transaction(v=>(v||0)+dmg,(e,ok,snap)=>{
  if(!ok||snap.val()<HPT[best.t])return;
  base.child('taken/'+best.k).transaction(v=>(v&&Date.now()-v<REGROW)?undefined:Date.now(),(e2,ok2)=>{
   if(!ok2)return;taken[best.k]=Date.now();base.child('hits/'+best.k).remove();dropsFor(best);gainXp(1);burst(best.x,best.y,PC[best.t],10)})});
}
function dropsFor(b){
 const o=[],r=Math.random;
 if(b.t==='tree'){o.push(['wood',2]);if(r()<.35)o.push(['apple',1]);if(r()<.2)o.push(['seed',1])}
 else if(b.t==='stone')o.push(['stone',1+(r()*2|0)]);
 else if(b.t==='iron')o.push(['iron',1]);else if(b.t==='diamond')o.push(['diamond',1]);
 else{o.push(['berry',1+(r()*2|0)]);if(r()<.6)o.push([r()<.5?'seed':'cseed',1])}
 o.forEach(([t,n])=>spawnDrop(t,n,b.x,b.y));
}
function harvest(b){
 const c=crops[b.k];if(Date.now()-c.t<2*GROW)return toast('Henüz olgunlaşmadı 🌱');
 db.ref('rooms/'+code+'/crops/'+b.k).transaction(v=>v?null:undefined,(e,ok,snap)=>{
  if(!ok||snap.val()!==null)return;delete crops[b.k];const w=c.c==='carrot';
  spawnDrop(w?'carrot':'wheat',2+(Math.random()*2|0),b.x,b.y);spawnDrop(w?'cseed':'seed',1,b.x,b.y)});
}
const front=()=>{const x=Math.round(me.x+aim.x*1.1),y=Math.round(me.y+aim.y*1.1);return{x,y,k:K(x,y)}};
function freeTile(f){const t=tileAt(f.x,f.y);return !blocks[f.k]&&!crops[f.k]&&t!=='water'&&(!t||!alive(f.k))&&Math.hypot(f.x-me.x,f.y-me.y)>.7}
function use(){
 const now=Date.now();if(!running||deadUntil||now-lastUse<300)return;lastUse=now;
 const s=slots[sel];if(!s)return toast('Boş slot');const t=s.t,f=FOOD[t];
 if(f){if(me.hp>=100&&me.hg>=100&&me.en>=100)return toast('Tokum 😋');me.hp=Math.min(100,me.hp+f[0]);me.hg=Math.min(100,me.hg+f[1]);me.en=Math.min(100,me.en+f[2]);take(t,1);beep(500,.1);toast('+'+f[0]+' ❤️'+(f[2]?'  +'+f[2]+' ⚡':''))}
 else if(t==='rod')fish();
 else if(t==='seed'||t==='cseed'){const q=front();if(!freeTile(q))return toast('Buraya ekilmez');
  db.ref('rooms/'+code+'/crops/'+q.k).transaction(v=>v?undefined:{c:t==='seed'?'wheat':'carrot',t:Date.now()},(e,ok)=>{if(ok)take(t,1)})}
 else if(PLACE.includes(t)){const q=front(),water=tileAt(q.x,q.y)==='water'&&!blocks[q.k];
  if(t==='bridge'?!water:!freeTile(q))return toast('Buraya konmaz');
  db.ref('rooms/'+code+'/blocks/'+q.k).transaction(v=>v?undefined:t,(e,ok)=>{if(ok){take(t,1);beep(250,.08);if(t==='bed'){spawnPt={x:q.x,y:q.y};toast('🛏️ Doğma noktan ayarlandı')}}})}
 else toast(ITEMS[t][0]);
}
function fish(){
 const now=Date.now();if(now-lastFish<1500)return;
 const w=[1,1.7,2.4].some(d=>{const x=Math.round(me.x+aim.x*d),y=Math.round(me.y+aim.y*d);return tileAt(x,y)==='water'&&blocks[K(x,y)]!=='bridge'});
 if(!w)return toast('Karşında su yok');lastFish=now;
 if(Math.random()<.55&&space('fish',1)){add('fish',1);toast('🐟 Balık tuttun!');beep(700,.1)}else toast('Tutmadı...');
}
function near(type){for(const kk in blocks)if(blocks[kk]===type){const [x,y]=kk.split('_').map(Number);if(Math.hypot(x-me.x,y-me.y)<2.8)return true}return false}
function canCraft([o,n,need,st]){return Object.entries(need).every(([t,v])=>count(t)>=v)&&(!st||near(st))&&space(o,n)}
function craft(r){if(!canCraft(r))return toast('Malzeme/istasyon eksik');for(const t in r[2])take(t,r[2][t]);add(r[0],r[1]);beep(600,.1);renderInv()}
function pickup(){
 for(const id in drops){
  const d=drops[id];if(pending[id]||Math.hypot(d.x-me.x,d.y-me.y)>.9||!space(d.t,d.n))continue;pending[id]=1;
  db.ref('rooms/'+code+'/drops/'+id).transaction(v=>v?null:undefined,(e,ok,snap)=>{
   delete pending[id];if(ok&&snap.val()===null){add(d.t,d.n);beep(750,.05);floatTxt('+'+d.n+ITEMS[d.t][1],d.x,d.y);delete drops[id]}});
 }
}
function bullets(now){
 shots=shots.filter(s=>now-s.born<(s.l||BLIFE));if(deadUntil||now<godUntil)return;
 for(const s of shots){
  if(s.o===me.id||s.hit)continue;const a=(now-s.born)/1000,v=s.v||BSPEED;
  if(Math.hypot(s.x+s.dx*v*a-me.x,s.y+s.dy*v*a-me.y)<.65){
   s.hit=true;db.ref('rooms/'+code+'/shots/'+s.k).remove();
   const dm=Math.round((s.dm||20)*(count('armor')?.5:1));me.hp-=dm;flash=.45;floatTxt('-'+dm,me.x,me.y,'#ff5a5a');
   beep(120,.12,'sawtooth');if(navigator.vibrate)navigator.vibrate(60);
   if(me.hp<=0)die(s.o,now)}}
}
function die(killer,now){
 me.hp=0;me.d++;deadUntil=now+DEAD_MS;joy=null;keys={};
 slots.forEach(s=>{if(s)spawnDrop(s.t,s.n,me.x,me.y)});slots.fill(null);renderInv();
 db.ref('rooms/'+code+'/players/'+killer+'/k').transaction(v=>(v||0)+1);
 const f=db.ref('rooms/'+code+'/feed').push({a:(players[killer]||{}).n||'?',b:name,t:Date.now()});setTimeout(()=>f.remove(),8000);
 push();
}
const PC={tree:'#2e7d32',stone:'#9aa5a0',iron:'#e08a2e',diamond:'#52e5ff',bush:'#3c8a4a'};
function floatTxt(t,x,y,c='#fff'){floats.push({t,x,y,c,b:performance.now()})}
function burst(x,y,c,n=8){for(let i=0;i<n;i++)parts.push({x,y,c,vx:(Math.random()-.5)*1.6,vy:(Math.random()-.9)*1.2,b:performance.now()})}
function gainXp(n){const o=plvl();xp+=n;localStorage.setItem('spxp',xp);if(plvl()>o){toast('⭐ Seviye '+plvl()+'!');beep(880,.2)}}
function melee(){ // kılıç seçiliyken yakındaki düşmana vurur
 const s=slots[sel];if(!s||s.t!=='sword')return false;
 let best=null,bd=1.8;for(const id in players){if(id===me.id)continue;const p=players[id];if(p.a===0)continue;const d=Math.hypot(p.x-me.x,p.y-me.y);if(d<bd){bd=d;best=p}}
 if(!best)return false;
 const dx=(best.x-me.x)/bd,dy=(best.y-me.y)/bd;aim={x:dx,y:dy};
 const ref=db.ref('rooms/'+code+'/shots').push(),sh={o:me.id,x:me.x,y:me.y,dx,dy,t:Date.now(),v:9,l:220,dm:30,m:1};
 shots.push({...sh,k:ref.key,born:performance.now(),hit:false});ref.set(sh);setTimeout(()=>ref.remove(),1500);beep(220,.07,'triangle');return true;
}
