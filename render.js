// Çizim: dünya, gece, yağmur, mini harita
const cv=$('c'),ctx=cv.getContext('2d'),mm=$('mm').getContext('2d'),lc=document.createElement('canvas'),lx=lc.getContext('2d');let mmN=0;
function resize(){const d=devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0);lc.width=innerWidth;lc.height=innerHeight}
addEventListener('resize',resize);
const sq=(px,py,c,m=0)=>{ctx.fillStyle=c;ctx.fillRect(px-S/2+m,py-S/2+m,S+1-2*m,S+1-2*m)};
const emo=(s,x,y,sz)=>{ctx.font=sz+'px serif';ctx.fillText(s,x,y)};
function draw(now){
 const W=innerWidth,H=innerHeight,tn=Date.now();
 ctx.fillStyle='#2d5a34';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.textBaseline='middle';
 const ox=W/2-me.x*S,oy=H/2-me.y*S,x0=Math.floor(me.x-W/2/S)-1,x1=Math.ceil(me.x+W/2/S)+1,y0=Math.floor(me.y-H/2/S)-1,y1=Math.ceil(me.y+H/2/S)+1;
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const kk=K(x,y),t=tileAt(x,y),px=ox+x*S,py=oy+y*S,b=blocks[kk];
  if(t==='water'){sq(px,py,'#2f78c8');ctx.fillStyle='#ffffff26';ctx.fillRect(px-S/2+((now/50+x*9)%S),py-S/2+((y*13+x*5)%S),9,2)}
  else{if((x+y)&1)sq(px,py,'#00000010');if(hash(x+999,y)>.94)emo('🌼',px+6,py+6,12)}
  if(b==='bridge'){sq(px,py,'#8a5a2b');ctx.fillStyle='#5e3b18';for(let i=1;i<4;i++)ctx.fillRect(px-S/2,py-S/2+i*S/4,S,2)}
  const c=crops[kk];
  if(c){sq(px,py,'#5b3b1f',3);const a=tn-c.t;emo(a<GROW?'🌱':a<2*GROW?'🌿':c.c==='carrot'?'🥕':'🌾',px,py,S*.7)}
  if(b==='table'||b==='furnace'){sq(px,py,b==='table'?'#7a5230':'#555',2);emo(b==='table'?'🛠️':'🔥',px,py,S*.65)}
  if(b==='torch')emo('🕯️',px,py,S*.6);
  if(t&&t!=='water'&&alive(kk)){
   if(t==='bush')emo('🫐',px,py,S*.55);
   else{if(t!=='tree')sq(px,py,'#3b4a44',2);emo(t==='tree'?'🌲':t==='diamond'?'💎':'🪨',px,py,S*.8);
    if(t==='iron'){emo('🟠',px-S*.2,py+S*.15,S*.3);emo('🟠',px+S*.2,py-S*.1,S*.3)}}
   const h=hitsMap[kk];if(h){ctx.fillStyle='#000a';ctx.fillRect(px-14,py-S*.6,28,5);ctx.fillStyle='#ffb020';ctx.fillRect(px-14,py-S*.6,28*Math.max(0,1-h/HPT[t]),5)}}
 }
 for(const id in drops){const d=drops[id],bob=Math.sin(now/250+d.x*3)*2;ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.arc(ox+d.x*S,oy+d.y*S,S*.3,0,7);ctx.fill();emo(ITEMS[d.t][1],ox+d.x*S,oy+d.y*S+bob,S*.45);
  if(d.n>1){ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.fillText(d.n,ox+d.x*S+10,oy+d.y*S+12)}}
 ctx.fillStyle='#ffd84a';
 for(const s of shots){const a=(now-s.born)/1000;ctx.beginPath();ctx.arc(ox+(s.x+s.dx*BSPEED*a)*S,oy+(s.y+s.dy*BSPEED*a)*S,5,0,7);ctx.fill()}
 for(const id in players){if(id===me.id)continue;const p=players[id];if(p.a===0)continue;dot(ox+p.x*S,oy+p.y*S,'#e5484d',p.n,p.hp,id)}
 if(deadUntil){ctx.fillStyle='#0006';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 22px sans-serif';ctx.fillText(`Öldün · ${Math.ceil((deadUntil-now)/1000)}`,W/2,H/2)}
 else{ctx.globalAlpha=now<godUntil?.5:1;dot(W/2,H/2,'#4aa8ff',name,me.hp,me.id);ctx.globalAlpha=1;
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W/2+aim.x*S*.45,H/2+aim.y*S*.45);ctx.lineTo(W/2+aim.x*S*.8,H/2+aim.y*S*.8);ctx.stroke()}
 // gece
 const dark=Math.max(0,Math.sin(tn%DAY/DAY*6.283))*.72;
 if(dark>.03){
  lx.globalCompositeOperation='source-over';lx.clearRect(0,0,W,H);lx.fillStyle=`rgba(4,8,36,${dark})`;lx.fillRect(0,0,W,H);lx.globalCompositeOperation='destination-out';
  const L=(x,y,r)=>{const g=lx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');lx.fillStyle=g;lx.fillRect(x-r,y-r,2*r,2*r)};
  L(W/2,H/2,S*4.5);for(const kk in blocks)if(blocks[kk]==='torch'){const [bx,by]=kk.split('_').map(Number);L(ox+bx*S,oy+by*S,S*4)}
  ctx.drawImage(lc,0,0,W,H);
 }
 if(vnoise(tn/70000,3.3)>.68){ctx.fillStyle='#10203a30';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#bcd8ff99';ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<70;i++){const x=(i*97+now*.2)%W,y=(i*53+now*.9)%H;ctx.moveTo(x,y);ctx.lineTo(x-3,y+10)}ctx.stroke()}
 if(flash>0){ctx.fillStyle=`rgba(255,0,0,${flash})`;ctx.fillRect(0,0,W,H);flash-=.03}
 if(joy){ctx.strokeStyle='#fff6';ctx.lineWidth=2;ctx.beginPath();ctx.arc(joy.sx,joy.sy,50,0,7);ctx.stroke();ctx.fillStyle='#fff5';ctx.beginPath();ctx.arc(joy.sx+Math.max(-50,Math.min(50,joy.dx)),joy.sy+Math.max(-50,Math.min(50,joy.dy)),20,0,7);ctx.fill()}
 if(mmN++%8===0)minimap();
}
function dot(x,y,c,n,hp,id){
 ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,S*.38,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.fillText(n||'',x,y-S*.7);
 ctx.fillStyle='#400';ctx.fillRect(x-16,y+S*.5,32,4);ctx.fillStyle='#e5484d';ctx.fillRect(x-16,y+S*.5,32*Math.max(hp,0)/100,4);
 const p=id===me.id?null:players[id],e=id===me.id?me.emo:p&&p.e;
 if(e&&emoteAt[id]!==undefined&&performance.now()-emoteAt[id]<2500)emo(e.split('|')[0],x,y-S*1.2,22);
}
function minimap(){
 mm.fillStyle='#2d5a34';mm.fillRect(0,0,90,90);const cx=Math.round(me.x),cy=Math.round(me.y);
 for(let i=-15;i<15;i++)for(let j=-15;j<15;j++)if(isWater(cx+i,cy+j)){mm.fillStyle=blocks[K(cx+i,cy+j)]==='bridge'?'#8a5a2b':'#2f78c8';mm.fillRect((i+15)*3,(j+15)*3,3,3)}
 mm.fillStyle='#e5484d';for(const id in players){if(id===me.id)continue;const p=players[id];if(p.a===0)continue;const i=p.x-cx+15,j=p.y-cy+15;if(i>=0&&i<30&&j>=0&&j<30)mm.fillRect(i*3-1,j*3-1,4,4)}
 mm.fillStyle='#fff';mm.fillRect(me.x-cx+15>=0?(me.x-cx+15)*3-1:0,(me.y-cy+15)*3-1,4,4);
}
