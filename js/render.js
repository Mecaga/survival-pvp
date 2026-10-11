// Çizim: dünya, gece/gündüz, yağmur+şimşek, parçacıklar, mini harita
const cv=$('c'),ctx=cv.getContext('2d'),mmc=$('mm'),mm=mmc.getContext('2d'),lc=document.createElement('canvas'),lx=lc.getContext('2d');
let mmN=0,mmBig=false,lastBolt=0;
function resize(){const d=devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0);lc.width=innerWidth;lc.height=innerHeight}
addEventListener('resize',resize);
function sizeMM(){const z=mmBig?220:120;mmc.width=mmc.height=z;mmc.style.width=mmc.style.height=z+'px'}
sizeMM();mmc.addEventListener('pointerdown',e=>{e.preventDefault();mmBig=!mmBig;sizeMM();if(running)minimap()});
const sq=(px,py,c,m=0)=>{ctx.fillStyle=c;ctx.fillRect(px-S/2+m,py-S/2+m,S+1-2*m,S+1-2*m)};
const emo=(s,x,y,sz)=>{ctx.font=sz+'px serif';ctx.fillText(s,x,y)};
function draw(now){
 const W=innerWidth,H=innerHeight,tn=Date.now(),dk=.6*nightAmt(gameHour());
 ctx.fillStyle='#2d5a34';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.textBaseline='middle';
 const ox=W/2-me.x*S,oy=H/2-me.y*S,x0=Math.floor(me.x-W/2/S)-1,x1=Math.ceil(me.x+W/2/S)+1,y0=Math.floor(me.y-H/2/S)-1,y1=Math.ceil(me.y+H/2/S)+1;
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const kk=K(x,y),t=tileAt(x,y),px=ox+x*S,py=oy+y*S,b=blocks[kk];
  if(t==='water'){sq(px,py,'#2f78c8');ctx.fillStyle='#ffffff26';ctx.fillRect(px-S/2+((now/50+x*9)%S),py-S/2+((y*13+x*5)%S),9,2)}
  else{if((x+y)&1)sq(px,py,'#00000010');if(hash(x+999,y)>.94)emo('🌼',px+6,py+6,12)}
  if(b==='bridge'){sq(px,py,'#8a5a2b');ctx.fillStyle='#5e3b18';for(let i=1;i<4;i++)ctx.fillRect(px-S/2,py-S/2+i*S/4,S,2)}
  const c=crops[kk];
  if(c){sq(px,py,'#4a2f17',2);const a=tn-c.t;emo(a<GROW?'🌱':a<2*GROW?'🌿':c.c==='carrot'?'🥕':'🌾',px,py,S*.8)}
  if(b==='table'||b==='furnace'){sq(px,py,b==='table'?'#7a5230':'#555',2);emo(b==='table'?'🛠️':'🔥',px,py,S*.65)}
  if(!t&&!b&&!c){const g=groundAt(x,y);if(g&&alive('g'+kk)){ctx.fillStyle='#ffffff45';ctx.beginPath();ctx.arc(px,py,S*.27,0,7);ctx.fill();emo(ITEMS[g][1],px,py,S*.48)}}
  if(b==='torch')emo('🕯️',px,py,S*.6);
  if(b==='bed')emo('🛏️',px,py,S*.8);
  if(t&&t!=='water'&&alive(kk)){
   if(t==='tree'||t==='bush'){ctx.fillStyle='#0000002e';ctx.beginPath();ctx.ellipse(px,py+S*.32,S*.32,S*.11,0,0,7);ctx.fill()}
   if(t==='bush'){emo('🌿',px,py,S*.85);emo('🫐',px+5,py+4,S*.4)}
   else{if(t!=='tree')sq(px,py,'#3b4a44',2);emo(t==='tree'?'🌲':t==='diamond'?'💎':'🪨',px,py,S*.8);
    if(t==='iron'){emo('🟠',px-S*.2,py+S*.15,S*.3);emo('🟠',px+S*.2,py-S*.1,S*.3)}}
   const hh=hitsMap[kk];if(hh){ctx.fillStyle='#000a';ctx.fillRect(px-14,py-S*.6,28,5);ctx.fillStyle='#ffb020';ctx.fillRect(px-14,py-S*.6,28*Math.max(0,1-hh/HPT[t]),5)}
  }
 }
 for(const id in drops){const d=drops[id],bob=Math.sin(now/250+d.x*3)*2;ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(ox+d.x*S,oy+d.y*S,S*.3,0,7);ctx.fill();emo(ITEMS[d.t][1],ox+d.x*S,oy+d.y*S+bob,S*.45);
  if(d.n>1){ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.fillText(d.n,ox+d.x*S+10,oy+d.y*S+12)}}
 for(const s of shots){const a=(now-s.born)/1000,v=s.v||BSPEED,sx=ox+(s.x+s.dx*v*a)*S,sy=oy+(s.y+s.dy*v*a)*S;
  if(s.m){ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(sx,sy,9,0,7);ctx.stroke()}else{ctx.fillStyle='#ffd84a';ctx.beginPath();ctx.arc(sx,sy,5,0,7);ctx.fill()}}
 for(const id in players){if(id===me.id)continue;const p=players[id];if(p.a===0)continue;dot(ox+p.x*S,oy+p.y*S,p.c||'#e5484d',p.n,p.hp,id)}
 if(deadUntil){ctx.fillStyle='#0006';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 22px sans-serif';ctx.fillText(`Öldün · ${Math.ceil((deadUntil-now)/1000)}`,W/2,H/2)}
 else{ctx.globalAlpha=now<godUntil?.5:1;dot(W/2,H/2,myColor,name,me.hp,me.id);ctx.globalAlpha=1;
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2+aim.x*S*.45,H/2+aim.y*S*.45);ctx.lineTo(W/2+aim.x*S*.8,H/2+aim.y*S*.8);ctx.stroke()}
 for(let i=floats.length-1;i>=0;i--){const f=floats[i],a=(now-f.b)/900;if(a>1){floats.splice(i,1);continue}ctx.globalAlpha=1-a;ctx.fillStyle=f.c;ctx.font='bold 14px sans-serif';ctx.fillText(f.t,ox+f.x*S,oy+(f.y-.6-a)*S)}
 for(let i=parts.length-1;i>=0;i--){const p=parts[i],a=(now-p.b)/500;if(a>1){parts.splice(i,1);continue}ctx.globalAlpha=1-a;ctx.fillStyle=p.c;ctx.fillRect(ox+(p.x+p.vx*a)*S,oy+(p.y+p.vy*a+a*a*1.2)*S,4,4)}
 ctx.globalAlpha=1;
 if(dk>.02){ // gece: meşale ışığı titrer
  lx.globalCompositeOperation='source-over';lx.clearRect(0,0,W,H);lx.fillStyle=`rgba(6,10,40,${dk})`;lx.fillRect(0,0,W,H);lx.globalCompositeOperation='destination-out';
  const L=(x,y,r)=>{const g=lx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');lx.fillStyle=g;lx.fillRect(x-r,y-r,2*r,2*r)};
  L(W/2,H/2,S*5);for(const kk in blocks)if(blocks[kk]==='torch'){const [bx,by]=kk.split('_').map(Number);L(ox+bx*S,oy+by*S,S*4.5*(1+.05*Math.sin(now/90+bx)))}
  ctx.drawImage(lc,0,0,W,H);
 }
 if(dk>.25){ // ateş böcekleri
  ctx.fillStyle='#fff3a0';for(let i=0;i<16;i++){const fx=(Math.sin(i*12.9+now/1700*(1+i%3))*.5+.5)*W,fy=(Math.cos(i*7.3+now/2100*(1+i%2))*.5+.5)*H;
   ctx.globalAlpha=(.4+.6*Math.abs(Math.sin(now/400+i)))*Math.min(1,dk*2);ctx.beginPath();ctx.arc(fx,fy,2.2,0,7);ctx.fill()}ctx.globalAlpha=1;
 }
 if(vnoise(tn/70000,3.3)>.68){ // yağmur + şimşek
  ctx.fillStyle='#10203a30';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#bcd8ff99';ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<70;i++){const x=(i*97+now*.2)%W,y=(i*53+now*.9)%H;ctx.moveTo(x,y);ctx.lineTo(x-3,y+10)}ctx.stroke();
  const lt=Math.floor(tn/9000);if(hash(lt,77)>.75&&tn%9000<140){ctx.fillStyle='#ffffffaa';ctx.fillRect(0,0,W,H);if(lastBolt!==lt){lastBolt=lt;setTimeout(()=>beep(70,.5,'sawtooth'),600)}}
 }
 if(flash>0){ctx.fillStyle=`rgba(255,0,0,${flash})`;ctx.fillRect(0,0,W,H);flash-=.03}
 if(joy){ctx.strokeStyle='#fff6';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.sx,joy.sy,50,0,7);ctx.stroke();ctx.fillStyle='#fff5';ctx.beginPath();ctx.arc(joy.sx+Math.max(-50,Math.min(50,joy.dx)),joy.sy+Math.max(-50,Math.min(50,joy.dy)),20,0,7);ctx.fill()}
 if(mmN++%4===0)minimap();
}
function dot(x,y,c,n,hp,id){
 ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,S*.38,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.fillText(n||'',x,y-S*.7);
 ctx.fillStyle='#400';ctx.fillRect(x-16,y+S*.5,32,4);ctx.fillStyle='#e5484d';ctx.fillRect(x-16,y+S*.5,32*Math.max(hp,0)/100,4);
 const e=id===me.id?me.emo:(players[id]||{}).e;
 if(e&&emoteAt[id]!==undefined){const tx=e.split('|')[0],age=performance.now()-emoteAt[id];
  if(tx.length<=2){if(age<2500)emo(tx,x,y-S*1.2,22)}
  else if(age<4500){ctx.font='bold 12px sans-serif';const w=ctx.measureText(tx).width+12;ctx.fillStyle='#fffe';ctx.fillRect(x-w/2,y-S*1.6,w,20);ctx.fillStyle='#111';ctx.fillText(tx,x,y-S*1.6+10)}}
}
function minimap(){ // 3px/kare. Büyük modda daha geniş alan. Uzaktaki oyuncular kenarda ok olarak görünür
 const z=mmc.width,N=Math.floor(z/3),o=N>>1,cx=Math.round(me.x),cy=Math.round(me.y),COL={tree:'#1f5a2a',stone:'#8a9690',iron:'#d97a2b',diamond:'#52e5ff'};
 mm.fillStyle='#2d5a34';mm.fillRect(0,0,z,z);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  const x=cx+i-o,y=cy+j-o,kk=K(x,y),b=blocks[kk],t=tileAt(x,y);let c=null;
  if(b==='bridge')c='#8a5a2b';else if(b==='table'||b==='furnace')c='#e0b060';else if(t==='water')c='#2f78c8';else if(COL[t]&&alive(kk))c=COL[t];
  if(c){mm.fillStyle=c;mm.fillRect(i*3,j*3,3,3)}
 }
 const mx=v=>(v-cx+o)*3+1.5,my=v=>(v-cy+o)*3+1.5;
 for(const id in players){if(id===me.id)continue;const p=players[id];if(p.a===0)continue;
  const X=mx(p.x),Y=my(p.y),col=p.c||'#e5484d';
  if(X>4&&X<z-4&&Y>4&&Y<z-4){mm.fillStyle=col;mm.strokeStyle='#fff';mm.lineWidth=1.5;mm.beginPath();mm.arc(X,Y,4,0,7);mm.fill();mm.stroke()}
  else{const ang=Math.atan2(p.y-me.y,p.x-me.x),R=z/2-7;mm.save();mm.translate(z/2+Math.cos(ang)*R,z/2+Math.sin(ang)*R);mm.rotate(ang);
   mm.fillStyle=col;mm.strokeStyle='#fff';mm.lineWidth=1.5;mm.beginPath();mm.moveTo(7,0);mm.lineTo(-4,5);mm.lineTo(-4,-5);mm.closePath();mm.fill();mm.stroke();mm.restore()}
 }
 mm.save();mm.translate(mx(me.x),my(me.y));mm.rotate(Math.atan2(aim.y,aim.x));mm.fillStyle='#fff';mm.beginPath();mm.moveTo(6,0);mm.lineTo(-4,4);mm.lineTo(-4,-4);mm.closePath();mm.fill();mm.restore();
}
