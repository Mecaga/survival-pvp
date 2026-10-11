// Dünya: gürültü, nehirler/göller, kaynaklar, çarpışma
function hash(x,y){let h=(x*374761393+y*668265263+seed*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967295}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function isWater(x,y){return Math.abs(vnoise(x*.07,y*.07)-.5)<.035||vnoise(x*.05+50,y*.05+50)<.1}
function tileAt(x,y){if(isWater(x,y))return 'water';const r=hash(x,y);return r<.07?'tree':r<.1?'stone':r<.115?'iron':r<.12?'diamond':r<.15?'bush':null}
const alive=kk=>{const t=taken[kk];return !(t&&Date.now()-t<REGROW)};
function solid(x,y){
 const kk=K(x,y),b=blocks[kk];
 if(b==='bridge')return false;if(b)return b==='table'||b==='furnace';
 const t=tileAt(x,y);if(t==='water')return true;
 return (t==='tree'||t==='stone'||t==='iron'||t==='diamond')&&alive(kk);
}
function canStand(x,y){for(const a of[-PR,PR])for(const c of[-PR,PR])if(solid(Math.round(x+a),Math.round(y+c)))return false;return true}
function move(dx,dy){if(canStand(me.x+dx,me.y))me.x+=dx;if(canStand(me.x,me.y+dy))me.y+=dy}
// yerde duran odun/taş: elle toplanır, 4 dk sonra yeniden belirir
function groundAt(x,y){if(tileAt(x,y))return null;const r=hash(x+313,y+717);return r<.025?'wood':r<.045?'stone':null}
