// ===== Image assets (fail-safe: everything still draws if these never load) =====
// PNG cutouts under assets/img/. imgOk(key) returns the loaded <img> only once it's decoded and
// non-empty, so every draw path can `const im = imgOk(...)` and fall back to canvas shapes.
const IMG = {};
function imgOk(k){ const e=IMG[k]; return (e && e.ok && e.img && e.img.naturalWidth>0) ? e.img : null; }
function imgBounds(k){
  const e=IMG[k];
  return (e && e.bounds) ? e.bounds : null;
}
function alphaBounds(im){
  try{
    const w=im.naturalWidth||im.width, h=im.naturalHeight||im.height;
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const o=c.getContext('2d',{willReadFrequently:true}); o.drawImage(im,0,0);
    const d=o.getImageData(0,0,w,h).data; let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(d[(y*w+x)*4+3]>12){ if(x<x0)x0=x; if(y<y0)y0=y; if(x>x1)x1=x; if(y>y1)y1=y; } }
    if(x1<x0 || y1<y0) return {x:0,y:0,w,h};
    const pad=3; x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(w-1,x1+pad); y1=Math.min(h-1,y1+pad);
    return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
  }catch(e){ return null; }
}
function loadImg(k, src){
  const im = new Image();
  im.onload  = ()=>{ IMG[k].ok=true; IMG[k].bounds=alphaBounds(im); groundKey='';           // force the ground pattern to rebuild
    try{ if(screenState==='start') renderMenu();             // refresh the menu portrait
      const ag=el('avatarGrid'); if(ag && ag.children.length) buildAvatarGrid();
      const wg=el('weaponGrid'); if(wg && wg.children.length) buildWeaponGrid(); }catch(e){} };
  im.onerror = ()=>{ IMG[k].ok=false; };
  IMG[k]={img:im, ok:false}; im.src=src;
}
loadImg('grass',     'assets/img/ground-grass.png');
// Biome grounds are an Unlock-Everything perk and only one is used per match, so they load on
// demand (ensureGround) instead of ~6 MB at boot; groundPattern() falls back to grass until decoded.
function ensureGround(k){ if(!IMG[k]) loadImg(k, 'assets/img/ground-'+k+'.png'); }
loadImg('tree',      'assets/img/decor-tree.png');
loadImg('bush',      'assets/img/decor-bush.png');
loadImg('hero-kai',   'assets/img/hero-kai-v2.png');
loadImg('hero-milo',  'assets/img/hero-milo-v2.png');
loadImg('hero-chip',  'assets/img/hero-chip-v2.png');
loadImg('hero-lila',  'assets/img/hero-lila-v2.png');
loadImg('hero-yuki',  'assets/img/hero-yuki-v2.png');
loadImg('hero-vex',   'assets/img/hero-vex-v2.png');
loadImg('hero-sarge', 'assets/img/hero-sarge-v2.png');
loadImg('hero-finn',  'assets/img/hero-finn-v2.png');
loadImg('hero-cypher','assets/img/hero-cypher-v2.png');
loadImg('hero-shade', 'assets/img/hero-shade-v2.png');
loadImg('hero-nova',  'assets/img/hero-nova-v2.png');
loadImg('hero-blaze', 'assets/img/hero-blaze-v2.png');
loadImg('hero-reaper','assets/img/hero-reaper-v2.png');
loadImg('hero-onyx',  'assets/img/hero-onyx-v2.png');
loadImg('hero-titan', 'assets/img/hero-titan-v2.png');
// ===== Weapon art (fail-safe: drawGun's vector rendering is the fallback) =====
loadImg('weapon-pistol',  'assets/img/weapon-pistol-v2.png');
loadImg('weapon-rifle',   'assets/img/weapon-rifle-v2.png');
loadImg('weapon-shotgun', 'assets/img/weapon-shotgun-v2.png');
loadImg('weapon-smg',     'assets/img/weapon-smg-v2.png');
loadImg('weapon-magnum',  'assets/img/weapon-magnum-v2.png');
loadImg('weapon-sniper',  'assets/img/weapon-sniper-v2.png');
loadImg('weapon-crossbow','assets/img/weapon-crossbow-v2.png');
loadImg('weapon-flame',   'assets/img/weapon-flame-v2.png');
loadImg('weapon-minigun', 'assets/img/weapon-minigun-v2.png');
loadImg('weapon-tommy',   'assets/img/weapon-tommy-v2.png');
loadImg('weapon-launcher','assets/img/weapon-launcher-v2.png');
loadImg('weapon-vipers',  'assets/img/weapon-vipers-v2.png');
loadImg('weapon-pulse-smg',      'assets/img/weapon-pulse-smg.png');
loadImg('weapon-arc-rifle',      'assets/img/weapon-arc-rifle.png');
loadImg('weapon-frost-blaster',  'assets/img/weapon-frost-blaster.png');
loadImg('weapon-rocket-launcher','assets/img/weapon-rocket-launcher.png');
const GROUND_TINT = { dusk:'rgba(255,140,50,.12)', night:'rgba(24,34,86,.32)' };  // sprite grass lit per time-of-day
const GROUND_SKINS = {
  day: ['grass','desert','snow','stone','swamp'],
  dusk: ['desert','stone','swamp','ash'],
  night: ['ash','stone','snow','swamp'],
};

