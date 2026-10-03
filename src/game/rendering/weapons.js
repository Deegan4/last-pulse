function drawWeaponArt(w){
  if(!w || !w.img) return false;
  const art = imgOk(w.img);
  if(!art) return false;
  const g = GUNK[w.name] || {l:14};
  const b = imgBounds(w.img) || {x:0,y:0,w:art.naturalWidth||art.width,h:art.naturalHeight||art.height};
  const srcX = b.x, srcY = b.y, srcW = b.w, srcH = b.h;
  const scale = (g.l / 220) * WEAPON_PNG_HAND_SCALE;
  const dw = srcW * scale, dh = srcH * scale;
  ctx.drawImage(art, srcX, srcY, srcW, srcH, -dw*0.08, -dh*0.55, dw, dh);
  return true;
}
function heldWeaponLen(w){
  const g = GUNK[(w&&w.name)||'Pistol'] || {l:14};
  const art = imgOk(w&&w.img);
  if(art){
    // Mirror drawWeaponArt()'s real geometry: it scales the ALPHA-TRIMMED source width (which
    // varies per weapon PNG, ~260-340px — not the fixed 220 reference below) and draws it spanning
    // -dw*0.08..dw*0.92 from the hand, so the visible muzzle sits at dw*0.92, not at a flat
    // g.l*scale. Using the flat value here (pre-fix) put the computed muzzle ~10-12px short of
    // where the gun art actually ends, most visible on longer guns like Rifle/Sniper.
    const b = imgBounds(w.img) || {w: art.naturalWidth||art.width};
    const scale = (g.l/220) * WEAPON_PNG_HAND_SCALE;
    return b.w * scale * 0.92;
  }
  return g.l * WEAPON_HAND_SCALE;
}
function drawHeldWeapon(w, fallbackName){
  if(drawWeaponArt(w)) return;
  ctx.save(); ctx.scale(WEAPON_HAND_SCALE, WEAPON_HAND_SCALE);
  drawGun(fallbackName);
  ctx.restore();
}
function drawGun(name,c){
  c=c||ctx;
  const g=GUNK[name]||{l:14,c:'#3a3f48'}, ink='rgba(0,0,0,.38)';
  c.lineJoin='round'; c.lineWidth=1;
  // ---- BEHIND BODY (drawn first so the main body occludes their near edge) ----
  // shoulder stock (behind the hand)
  if(g.stock){ c.fillStyle='#2b2e35'; c.strokeStyle=ink; roundRect(-7,-1,8,4.5,1.5,c); c.fill(); c.stroke(); }
  // magazine below the body
  if(g.mag){ c.fillStyle='#34383f'; c.strokeStyle=ink; roundRect(3,2,3.4,7,1,c); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.12)'; c.fillRect(3.4,2.4,1,6); }
  // angled pistol grip (skip on the minigun)
  if(!g.fat){ c.save(); c.translate(2.6,1.6); c.rotate(0.32); c.fillStyle='#26282e'; c.strokeStyle=ink;
    roundRect(-1.5,0,3,5.6,1.2,c); c.fill(); c.stroke(); c.restore(); }
  if(g.foregrip){ c.fillStyle='#26282e'; c.strokeStyle=ink; roundRect(g.l*0.58,2,2.4,4,1,c); c.fill(); c.stroke(); }
  // minigun ammo belt, feeding up into the body from below — drawn before the body on purpose
  // (declared/drawn here, in the BEHIND-BODY pass, not after: this is exactly the class of
  // ordering mistake the stalker-ridge fix caught — a "behind" layer accidentally drawn after
  // the thing it's meant to sit behind renders on top instead and looks wrong)
  if(g.belt){ c.strokeStyle='#3a3f28'; c.lineWidth=3.2; c.beginPath(); c.moveTo(6,4); c.quadraticCurveTo(2,10,-3,9); c.stroke();
    c.fillStyle='#caa15a'; for(let k=0;k<4;k++){ const t=k/3, bx=6+(-3-6)*t, by=4+Math.sin(t*Math.PI)*5.5+t*5;
      c.beginPath(); c.arc(bx,by,1,0,TAU); c.fill(); } c.lineWidth=1; }
  // ---- MAIN BODY ----
  c.strokeStyle=ink; c.fillStyle=g.c;
  if(g.fat){ roundRect(-1,-4.2,g.l+1,8.4,2.5,c); c.fill(); c.stroke();
    c.fillStyle='#5a5f68'; for(let i=0;i<4;i++) c.fillRect(2+i*4,-4.2,1.8,8.4);
    c.fillStyle='rgba(0,0,0,.25)'; for(let i=0;i<4;i++) c.fillRect(3.8+i*4,-4.2,0.8,8.4); }
  else if(g.tube){ // rocket-launcher tube: fat barrel with a flared mouth + optic
    roundRect(-1,-3.4,g.l+1,6.8,3,c); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.16)'; c.fillRect(1,-3,g.l-3,1.1);
    c.fillStyle='#20261a'; c.strokeStyle=ink; c.beginPath(); c.ellipse(g.l+0.5,0,2.2,4,0,0,TAU); c.fill(); c.stroke();  // flared mouth
    c.fillStyle='#12160e'; c.beginPath(); c.ellipse(g.l+0.5,0,1.1,2.4,0,0,TAU); c.fill();
    c.fillStyle='#6a7a4a'; c.strokeStyle=ink; roundRect(g.l*0.32,-6,5,3,1,c); c.fill(); c.stroke();               // top optic
    c.fillStyle='#e2452f'; c.fillRect(2,1.6,g.l*0.5,1); }                                                          // red warning stripe
  else { roundRect(0,-2,g.l,4,1.4,c); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.22)'; c.fillRect(1.5,-1.7,g.l-3,1);        // top sheen
    c.fillStyle='rgba(0,0,0,.18)'; c.fillRect(1.5,1.1,g.l-3,0.9); }           // under-shade
  // ---- OVER BODY: mid-layer attachments (cylinder/sights/scope/pump/tank/bow/drum, one per gun) ----
  // twin lower barrel (Vipers)
  if(g.twin){ c.fillStyle=g.c; c.strokeStyle=ink; roundRect(1,2.4,g.l-2,3,1.2,c); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.18)'; c.fillRect(2.5,2.7,g.l-5,0.8);
    c.fillStyle='#20242a'; roundRect(g.l-2.4,1.9,2.6,4,1,c); c.fill(); c.stroke(); }   // shared muzzle block
  // revolver cylinder
  if(g.cyl){ c.fillStyle='#5b636d'; c.strokeStyle=ink; c.beginPath(); c.arc(4.6,0.6,3.1,0,TAU); c.fill(); c.stroke();
    c.fillStyle='rgba(0,0,0,.45)'; for(let k=0;k<5;k++){ const a=k/5*TAU; c.beginPath(); c.arc(4.6+Math.cos(a)*1.5,0.6+Math.sin(a)*1.5,0.5,0,TAU); c.fill(); } }
  if(g.sight){ c.fillStyle=g.c; c.strokeStyle=ink; c.fillRect(g.l-3.5,-3.6,1.5,2); }
  if(g.scope){ c.fillStyle='#16171b'; c.strokeStyle=ink; roundRect(5,-5.2,8,2.9,1.2,c); c.fill(); c.stroke();
    c.fillStyle='#86d4ff'; c.beginPath(); c.arc(12.2,-3.7,1,0,TAU); c.fill(); }
  if(g.bipod){ c.strokeStyle='#22252b'; c.lineWidth=1.5; c.beginPath(); c.moveTo(g.l-7,2); c.lineTo(g.l-9,7.5); c.moveTo(g.l-7,2); c.lineTo(g.l-4,7.5); c.stroke(); c.lineWidth=1; }
  // ribbed suppressor-style cylinder along the barrel (SMG) — a chunky attached sleeve with
  // heat-sink fins, distinct from the plain muzzle cap other guns use
  if(g.finned){ c.fillStyle='#4a4f58'; c.strokeStyle=ink; roundRect(g.l*0.32,-2.6,g.l*0.34,5.2,1.8,c); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.14)'; c.fillRect(g.l*0.32+0.8,-2.2,1.2,4.4);
    c.strokeStyle='rgba(0,0,0,.4)'; c.lineWidth=1;
    for(let k=0;k<4;k++){ const fx=g.l*0.32+2.2+k*1.9; c.beginPath(); c.moveTo(fx,-2.6); c.lineTo(fx,2.6); c.stroke(); } c.lineWidth=1; }
  if(g.pump){ c.fillStyle='#4a3320'; c.strokeStyle=ink; roundRect(g.l*0.42,1.6,6.5,3,1.4,c); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.12)'; c.fillRect(g.l*0.42+0.6,2,5,0.9); }
  if(g.tip){ c.fillStyle='#565b64'; c.strokeStyle=ink; roundRect(g.l-4,-2,4.5,4,1,c); c.fill(); c.stroke(); }
  // flamethrower tank + lit nozzle
  if(g.tank){ c.fillStyle='#c43f2a'; c.strokeStyle=ink; roundRect(-3.5,-3.6,5.5,7.2,2.2,c); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.28)'; c.fillRect(-2.4,-3,1.3,6); }
  if(g.nozzle){ c.fillStyle='#777c84'; c.strokeStyle=ink; roundRect(g.l-1,-1.8,3.5,3.6,1,c); c.fill(); c.stroke();
    c.fillStyle='#ff9b3d'; c.beginPath(); c.arc(g.l+3.4,0,1.7,0,TAU); c.fill(); c.fillStyle='#ffd24a'; c.beginPath(); c.arc(g.l+3,0,0.8,0,TAU); c.fill(); }
  // crossbow limbs + nocked bolt
  if(g.bow){ c.strokeStyle='#2e2113'; c.lineWidth=2.2; c.beginPath(); c.arc(g.l,0,6,-1.15,1.15); c.stroke();
    c.strokeStyle='#caa15a'; c.lineWidth=1.4; c.beginPath(); c.moveTo(g.l-3,0); c.lineTo(g.l+6,0); c.stroke();
    c.fillStyle='#caa15a'; c.beginPath(); c.moveTo(g.l+6,0); c.lineTo(g.l+3.5,-1.4); c.lineTo(g.l+3.5,1.4); c.closePath(); c.fill(); c.lineWidth=1; }
  // tommy drum mag
  if(g.drum){ c.fillStyle='#34343c'; c.strokeStyle=ink; c.beginPath(); c.arc(7,4.6,3.9,0,TAU); c.fill(); c.stroke();
    c.fillStyle='rgba(255,255,255,.16)'; c.beginPath(); c.arc(5.8,3.4,1.4,0,TAU); c.fill();
    c.strokeStyle='rgba(0,0,0,.3)'; c.beginPath(); c.arc(7,4.6,2,0,TAU); c.stroke(); }
  // ---- OVER BODY: detail pass, per-gun flair (drawn last so it sits on top of everything above) ----
  if(g.hammer){ c.fillStyle='#2e3138'; c.strokeStyle=ink; c.lineWidth=1;    // pistol rear hammer
    c.beginPath(); c.moveTo(-1.8,-2.6); c.lineTo(-3.4,-4.6); c.lineTo(-1.2,-3.6); c.closePath(); c.fill(); c.stroke(); }
  if(g.guard){ c.strokeStyle='#1c1f26'; c.lineWidth=1.3;                    // trigger guard loop
    c.beginPath(); c.arc(0.8,3.1,2.4,-0.25,Math.PI*0.95); c.stroke(); c.lineWidth=1; }
  if(g.serr){ c.strokeStyle='rgba(255,255,255,.3)'; c.lineWidth=0.9;        // slide serrations
    c.beginPath(); for(let k=0;k<3;k++){ c.moveTo(1.6+k*1.7,-1.7); c.lineTo(1.6+k*1.7,-0.2); } c.stroke(); c.lineWidth=1; }
  if(g.wood){ c.strokeStyle='rgba(52,32,14,.45)'; c.lineWidth=0.8;          // wood grain waves
    for(let k=0;k<3;k++){ const yy=-1.1+k*1.15; c.beginPath(); c.moveTo(1.5,yy);
      c.quadraticCurveTo(g.l*0.5,yy+0.8,g.l-2.5,yy-0.35); c.stroke(); } c.lineWidth=1; }
  if(g.vents){ c.fillStyle='rgba(0,0,0,.32)';                               // handguard vents
    for(let k=0;k<3;k++) c.fillRect(g.l*0.5+k*3,-1.2,1.7,2.4); }
  if(g.brake){ c.fillStyle='rgba(0,0,0,.42)';                               // muzzle-brake slots
    for(let k=0;k<2;k++) c.fillRect(g.l-6.5+k*3,-2.6,1.4,1.3); }
  if(g.muzzle){ c.fillStyle='#20242a'; c.strokeStyle=ink;                    // muzzle cap ring
    roundRect(g.l-1.2,-2.5,2.8,5,1,c); c.fill(); c.stroke(); }
  if(g.nickel){ c.fillStyle='rgba(255,255,255,.4)'; c.fillRect(1.6,-1.7,g.l-4.5,0.9);  // polished top
    c.fillStyle='#e8c25a'; c.beginPath(); c.arc(1.2,4.2,1.1,0,TAU); c.fill();          // gold trigger
    c.fillStyle='rgba(232,194,90,.9)'; c.fillRect(g.l-2.6,-2.5,1.4,5); }               // gold muzzle band
  if(g.hazard){ c.save(); roundRect(-3.5,-3.6,5.5,7.2,2.2,c); c.clip();     // hazard stripes on the tank
    c.fillStyle='rgba(255,208,60,.7)'; c.rotate(-0.6);
    for(let k=-2;k<3;k++) c.fillRect(-7+k*4.4,-2,2,15); c.restore(); }
  if(g.cluster){ c.fillStyle='#3a4048'; c.strokeStyle=ink;                   // rotary barrel cluster
    for(const oy of [-2.3,0,2.3]){ c.beginPath(); c.arc(g.l+1.6,oy,1.5,0,TAU); c.fill(); c.stroke(); }
    c.fillStyle='rgba(0,0,0,.5)'; for(const oy of [-2.3,0,2.3]){ c.beginPath(); c.arc(g.l+1.6,oy,0.6,0,TAU); c.fill(); } }
  if(g.grille){ c.fillStyle='rgba(0,0,0,.36)';                               // minigun heat-vent grille
    for(let k=0;k<3;k++) c.fillRect(g.l*0.28+k*3.2,-3.6,2,2.6);
    c.strokeStyle='rgba(255,120,60,.5)'; c.lineWidth=0.8;                    // faint heat-glow lines
    c.beginPath(); for(let k=0;k<3;k++){ c.moveTo(g.l*0.28+k*3.2+0.4,2.4); c.lineTo(g.l*0.28+k*3.2+1.6,2.4); }
    c.stroke(); c.lineWidth=1; }
}
// render a weapon's real gun art onto a hi-res canvas for the select-grid card — big and crisp
// (the plate background + tier ring come from CSS; DPR-scaled so it stays sharp on retina)
function weaponIcon(w){
  const art=imgOk(w.img);
  const g=GUNK[w.name]||{l:14}; const x0=-11, x1=g.l+9, span=x1-x0;
  const CW=124, CH=58, DPR=3;
  const c=document.createElement('canvas'); c.width=CW*DPR; c.height=CH*DPR;
  c.style.width=CW+'px'; c.style.height=CH+'px';
  const o=c.getContext('2d'); o.scale(DPR,DPR);
  o.lineJoin='round'; o.lineCap='round';
  if(art){
    o.save();
    o.shadowColor='rgba(0,0,0,.36)'; o.shadowBlur=5; o.shadowOffsetY=2;
    const pad=6, maxW=CW-pad*2, maxH=CH-pad*2;
    const b=imgBounds(w.img) || {x:0,y:0,w:art.naturalWidth||art.width,h:art.naturalHeight||art.height};
    const sw=b.w, sh=b.h;
    const sc=Math.min(maxW/sw, maxH/sh);
    const dw=sw*sc, dh=sh*sc;
    o.drawImage(art, b.x, b.y, b.w, b.h, (CW-dw)/2, (CH-dh)/2, dw, dh);
    o.restore();
    return c;
  }
  const sc=Math.min(3.6,(CW-14)/span);                 // fill the plate — bigger guns
  o.translate((CW-span*sc)/2 - x0*sc, CH/2+1.5*sc); o.scale(sc,sc);
  // soft contact shadow under the gun
  o.save(); o.fillStyle='rgba(0,0,0,.28)'; o.beginPath();
  o.ellipse(g.l*0.5, 5.5, g.l*0.62, 1.8, 0, 0, TAU); o.fill(); o.restore();
  // the gun, with a light drop shadow so it reads as a raised "product shot"
  o.save(); o.shadowColor='rgba(0,0,0,.35)'; o.shadowBlur=2.2; o.shadowOffsetY=1.2;
  drawGun(w.name, o); o.restore();
  return c;
}
// cartoon character (front-facing chibi, dark-outlined with shading)
