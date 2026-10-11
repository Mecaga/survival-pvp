// Ortak sabitler, eşya/tarif verisi, paylaşılan durum
const $=id=>document.getElementById(id);
window.onerror=(m,s,l)=>{const e=$('err');e.textContent='Hata: '+m+' ('+String(s||'').split('/').pop()+':'+l+')';e.hidden=false};
let db=null;try{db=firebase.database()}catch(e){window.onerror('Firebase yüklenemedi: '+e.message)}
const S=36,SPEED=4.5,BSPEED=12,BLIFE=900,SHOT_CD=380,MINE_CD=280,DEAD_MS=2000,REGROW=240000,GROW=25000,PR=.3,MAXST=64,DAY=240000;
const ITEMS={wood:['Odun','🪵'],stone:['Taş','🪨'],iron:['Demir cevheri','🟠'],ingot:['Demir külçe','⚙️'],diamond:['Elmas','💎'],
 plank:['Tahta','🟫'],stick:['Çubuk','🥢'],seed:['Buğday tohumu','🌱'],cseed:['Havuç tohumu','🌰'],wheat:['Buğday','🌾'],carrot:['Havuç','🥕'],
 apple:['Elma','🍎'],berry:['Böğürtlen','🫐'],bread:['Ekmek','🍞'],fish:['Çiğ balık','🐟'],cfish:['Pişmiş balık','🍣'],
 table:['Craft masası','🛠️'],furnace:['Fırın','🔥'],torch:['Meşale','🕯️'],bridge:['Köprü','🌉'],rod:['Olta','🎣'],armor:['Demir zırh','🛡️'],
 axe1:['Odun balta','🪓'],axe2:['Taş balta','🪓'],axe3:['Demir balta','🪓'],pick1:['Odun kazma','⛏️'],pick2:['Taş kazma','⛏️'],pick3:['Demir kazma','⛏️']};
const FOOD={apple:[10,8],berry:[6,6],carrot:[12,10],bread:[25,25],fish:[8,8],cfish:[30,28]}; // [can, açlık]
const PLACE=['table','furnace','torch','bridge'];
const TOOLS={axe1:['tree',1],axe2:['tree',2],axe3:['tree',3],pick1:['ore',1],pick2:['ore',2],pick3:['ore',3]};
const HPT={tree:3,stone:4,iron:6,diamond:8,bush:1}, NEED={stone:1,iron:2,diamond:3};
const RECIPES=[ // [çıktı, adet, malzeme, istasyon]
 ['plank',4,{wood:1}],['stick',4,{plank:2}],['table',1,{plank:4}],['torch',2,{stick:1,wood:1}],
 ['axe1',1,{plank:3,stick:2},'table'],['pick1',1,{plank:3,stick:2},'table'],
 ['axe2',1,{stone:3,stick:2},'table'],['pick2',1,{stone:3,stick:2},'table'],
 ['axe3',1,{ingot:3,stick:2},'table'],['pick3',1,{ingot:3,stick:2},'table'],
 ['furnace',1,{stone:8},'table'],['bridge',2,{plank:2},'table'],['rod',1,{stick:3,plank:1},'table'],
 ['bread',1,{wheat:3},'table'],['armor',1,{ingot:6},'table'],
 ['ingot',1,{iron:1,wood:1},'furnace'],['cfish',1,{fish:1,wood:1},'furnace']];
// durum
let code,me,running=false,players={},taken={},blocks={},crops={},hitsMap={},drops={},shots=[],pending={},keys={},joy=null,aim={x:1,y:0},
 godUntil=0,deadUntil=0,lastShot=0,lastMine=0,lastUse=0,lastFish=0,flash=0,sprint=false,seed=1;
const K=(x,y)=>x+'_'+y;
let ac;function beep(f=440,d=.08,ty='square'){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.type=ty;o.frequency.value=f;g.gain.value=.04;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch(e){}}
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.opacity=0,1400)}
