// Giriş, ana menü, oda kurma/katılma, ağ dinleyicileri
const show=id=>{['login','menu','game'].forEach(s=>$(s).hidden=s!==id)};
const esc=s=>String(s||'').replace(/[<&]/g,c=>c==='<'?'&lt;':'&amp;');
let name=localStorage.getItem('spn')||'',refs=[],timer=0,isHost=false,pRef=null,emoteAt={};
$('nick').value=name;
$('nick').addEventListener('keydown',e=>{if(e.key==='Enter')$('enter').onclick()});
$('enter').onclick=()=>{name=$('nick').value.trim().slice(0,12);if(!name){$('nick').focus();return}
 localStorage.setItem('spn',name);$('hello').textContent='Hoş geldin, '+name;show('menu')};
const rand4=()=>Math.random().toString(36).slice(2,6).toUpperCase();
$('create').onclick=()=>start(rand4(),true);
$('join').onclick=()=>joinCode($('code').value.trim().toUpperCase());
async function joinCode(c){
 if(!db)return alert('Sunucuya bağlanılamadı, sayfayı yenile.');
 if(c.length!==4)return alert('Oda kodu 4 karakter olmalı.');
 const s=await db.ref('rooms/'+c+'/meta').once('value');
 if(!s.exists())return alert('Bu kodla açık bir oda yok.');start(c,false);
}
if(db)db.ref('rooms').on('value',s=>{
 const ul=$('rooms');ul.innerHTML='';let n=0;
 s.forEach(r=>{const p=r.child('players').numChildren();if(!p||!r.child('meta').exists())return;n++;
  const li=document.createElement('li');li.innerHTML=`<span><b>${r.key}</b> · ${p} oyuncu</span>`;
  const b=document.createElement('button');b.textContent='Katıl';b.onclick=()=>joinCode(r.key);li.appendChild(b);ul.appendChild(li)});
 if(!n)ul.innerHTML='<li class="empty">Henüz oda yok. İlk odayı sen kur.</li>';
});
const listen=(ref,ev,fn)=>{ref.on(ev,fn);refs.push([ref,ev,fn])};
function start(c,host){
 code=c;isHost=host;seed=[...c].reduce((a,ch)=>a*31+ch.charCodeAt(0),7);
 players={};taken={};blocks={};crops={};hitsMap={};drops={};shots=[];pending={};refs=[];emoteAt={};
 deadUntil=0;godUntil=0;sprint=false;flash=0;slots.fill(null);sel=0;
 let x=0,y=0;for(let i=0;i<300;i++){x=(Math.random()-.5)*40;y=(Math.random()-.5)*40;if(canStand(x,y))break}
 me={id:Math.random().toString(36).slice(2,8),x,y,hp:100,hg:100,d:0};
 const base=db.ref('rooms/'+c);
 if(host){base.child('meta').set({host:me.id,hostName:name,t:Date.now()});base.onDisconnect().remove()}
 pRef=base.child('players/'+me.id);pRef.onDisconnect().remove();pRef.set({n:name,x,y,hp:100,a:1,k:0,d:0});
 listen(base.child('players'),'value',s=>{const v=s.val()||{};
  for(const i in v)if(v[i].e&&(!players[i]||players[i].e!==v[i].e))emoteAt[i]=performance.now();players=v;renderPanel()});
 const mapOf=(path,obj,ev)=>{listen(base.child(path),ev,s=>{obj()[s.key]=s.val()})};
 for(const ev of['child_added','child_changed']){mapOf('taken',()=>taken,ev);mapOf('blocks',()=>blocks,ev);mapOf('crops',()=>crops,ev);mapOf('drops',()=>drops,ev)}
 for(const p of['blocks','crops','drops'])listen(base.child(p),'child_removed',s=>{delete({blocks,crops,drops})[p][s.key]});
 listen(base.child('hits'),'value',s=>{hitsMap=s.val()||{}});
 listen(base.child('shots'),'child_added',s=>{const v=s.val();if(shots.some(q=>q.k===s.key)||Date.now()-v.t>3000)return;shots.push({...v,k:s.key,born:performance.now(),hit:false})});
 listen(base.child('shots'),'child_removed',s=>{shots=shots.filter(q=>q.k!==s.key)});
 listen(base.child('feed').limitToLast(5),'child_added',s=>{const v=s.val();if(Date.now()-v.t>6000)return;
  const d=document.createElement('div');d.textContent=`💥 ${v.a} → ${v.b}`;$('feed').appendChild(d);setTimeout(()=>d.remove(),4500)});
 if(!host)listen(base.child('meta'),'value',s=>{if(!s.exists()&&running){leave(false);alert('Oda sahibi ayrıldı, oda kapandı.')}});
 show('game');$('panel').hidden=true;$('bag').hidden=true;resize();add('apple',2);renderInv();
 timer=setInterval(push,100);running=true;prev=performance.now();requestAnimationFrame(loop);
}
function push(){pRef.update({x:+me.x.toFixed(2),y:+me.y.toFixed(2),hp:me.hp,d:me.d,a:deadUntil?0:1})}
function leave(manual=true){
 running=false;clearInterval(timer);refs.forEach(([r,e,f])=>r.off(e,f));$('feed').innerHTML='';
 const base=db.ref('rooms/'+code);pRef.onDisconnect().cancel();
 if(isHost&&manual){base.onDisconnect().cancel();base.remove()}else pRef.remove();
 show('menu');
}
function renderPanel(){
 if(!running)return;const ids=Object.keys(players).sort((a,b)=>(players[b].k||0)-(players[a].k||0));
 $('ptitle').textContent=`Oda ${code} · ${ids.length} oyuncu`;
 $('plist').innerHTML=ids.map(i=>{const p=players[i];return `<li><span>${i===me.id?'⭐ ':''}${esc(p.n)}</span><span>⚔️ ${p.k||0}  💀 ${p.d||0}</span></li>`}).join('');
 $('leave').textContent=isHost?'Odayı kapat ve ayrıl':'Odadan ayrıl';
}
