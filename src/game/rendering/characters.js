function drawHuman(h){
  // 3D model layer (progressive): if a model is loaded for this avatar, billboard it and skip 2D.
  // Falls through to the hand-drawn chibi whenever the 3D system isn't ready/available. Skipped for
  // "armless" heroes — they rely on the 2D sprite + drawHeroArm rig, and a 3D billboard would hide
  // the drawn gun-arm (leaving them empty-handed), so those always take the sprite path below.
  const armless3D = h.avatar && h.avatar.armless;
  if(!armless3D && window.Models3D && Models3D.drawHuman(ctx,h)){ drawNameplate(h); return; }
  // sprite hero layer: if this fighter has a loaded PNG, billboard it and skip the drawn chibi.
  const heroImg = h.avatar && imgOk(h.avatar.img);
  if(heroImg){ drawHeroSprite(h, heroImg); drawNameplate(h); return; }
  const x=h.x, y=h.y, L=h.look, flip=h.faceX<0?-1:1;
  const sp2=h.vx*h.vx+h.vy*h.vy, moving=sp2>140;
  const spd01=h.speed?clamp(Math.sqrt(sp2)/h.speed,0,1.25):0;   // fraction of top speed → stride/lean scale
  const now=performance.now()/1000, seed=h.seed||0;
  const breath=moving?0:Math.sin(now*2.3+seed)*0.9;          // idle chest rise
  // stride & bob grow with actual speed: a creep barely moves, a full sprint pumps hard
  const bob=(moving?Math.sin(h.walk)*(1.1+1.7*spd01):0)+breath, step=moving?Math.sin(h.walk)*(1.8+3.2*spd01):0;
  const ga=h.aim, flash=h.hitFlash>0;
  const oneHand = h.weapon && (h.weapon.name==='Pistol'||h.weapon.name==='Magnum');
  ctx.save(); ctx.translate(x,y); ctx.scale(CHAR_VISUAL_SCALE, CHAR_VISUAL_SCALE); ctx.lineJoin='round'; ctx.lineCap='round';
  // shadow
  ctx.fillStyle='rgba(0,0,0,.20)'; ctx.beginPath(); ctx.ellipse(0,19,15,5,0,0,TAU); ctx.fill();
  // lean the body into the run (shadow stays flat): stronger, scales with horizontal speed + run bounce
  ctx.rotate(clamp(h.vx/1700,-0.16,0.16) + (moving?Math.sin(h.walk)*0.03*spd01:0));
  // free back arm (one-handed guns): swings with the step, hangs when idle
  if(oneHand){ const ax=-7.5*flip, sw=moving?-step*0.9:Math.sin(now*2.3+seed)*0.6;
    ctx.strokeStyle=INK; ctx.lineWidth=5.6; ctx.beginPath(); ctx.moveTo(ax*0.55,-4+bob*0.2); ctx.lineTo(ax+sw*0.4,7+sw); ctx.stroke();
    ctx.strokeStyle=flash?'#fff':L.skin; ctx.lineWidth=3.6; ctx.beginPath(); ctx.moveTo(ax*0.55,-4+bob*0.2); ctx.lineTo(ax+sw*0.4,7+sw); ctx.stroke();
    ctx.fillStyle=flash?'#fff':L.skin; ctx.beginPath(); ctx.arc(ax+sw*0.4,7.6+sw,2.4,0,TAU); ctx.fill(); }
  // legs (outline under, colour over) + shoes
  ctx.strokeStyle=INK; ctx.lineWidth=6.5; ctx.beginPath(); ctx.moveTo(-4,7); ctx.lineTo(-5,16+step); ctx.moveTo(4,7); ctx.lineTo(5,16-step); ctx.stroke();
  ctx.strokeStyle='#3a3a42'; ctx.lineWidth=4.4; ctx.beginPath(); ctx.moveTo(-4,7); ctx.lineTo(-5,16+step); ctx.moveTo(4,7); ctx.lineTo(5,16-step); ctx.stroke();
  ctx.fillStyle='#15151a'; ctx.beginPath(); ctx.ellipse(-5,17.6+step,3.4,2,0,0,TAU); ctx.ellipse(5,17.6-step,3.4,2,0,0,TAU); ctx.fill();
  if(!flash){ ctx.fillStyle='rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(-5.6,17+step,1.4,0.8,0,0,TAU); ctx.ellipse(4.4,17-step,1.4,0.8,0,0,TAU); ctx.fill(); }  // shoe shine
  // torso with outline + rounded shading
  const ty=-7+bob*0.2;
  ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.fillStyle=flash?'#fff':L.outfit;
  roundRect(-9,ty,18,17,6); ctx.fill(); ctx.stroke();
  if(!flash){ ctx.save(); roundRect(-9,ty,18,17,6); ctx.clip();
    ctx.fillStyle='rgba(255,255,255,.15)'; ctx.fillRect(-9,ty,6,19);                 // left light
    ctx.fillStyle='rgba(0,0,0,.14)'; ctx.fillRect(5,ty,4,19);                         // right shade
    ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(-9,ty,18,2.4);               // shoulder sheen
    ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(-9,ty+13,18,4);
    // bandolier strap on heavy fighters
    if(h.avatar && h.avatar.health>=118){ ctx.strokeStyle='rgba(52,38,24,.9)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-7*flip,ty+0.5); ctx.lineTo(6*flip,ty+15); ctx.stroke();
      ctx.fillStyle='#c8b060'; for(let i=0;i<3;i++){ const k=0.28+i*0.22;
        ctx.beginPath(); ctx.arc((-7+13*k)*flip,ty+0.5+14.5*k,1,0,TAU); ctx.fill(); } }
    // belt + buckle
    ctx.fillStyle='rgba(0,0,0,.30)'; ctx.fillRect(-9,ty+11.6,18,2.8);
    ctx.fillStyle='#d8b04a'; ctx.fillRect(-1.7,ty+11.3,3.4,3.4);
    ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(-0.6,ty+12.2,1.2,1.6);
    ctx.restore();
    ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,ty+1,5,0.16*Math.PI,0.84*Math.PI); ctx.stroke(); }  // collar
  // head
  const hy=-17+bob;
  if(!flash){ ctx.fillStyle=L.skin; ctx.strokeStyle=INK; ctx.lineWidth=1.6; roundRect(-2.6,hy+6,5.2,5,2); ctx.fill(); }  // neck
  ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.fillStyle=flash?'#fff':L.skin;
  ctx.beginPath(); ctx.arc(0,hy,9.5,0,TAU); ctx.fill(); ctx.stroke();
  if(!flash){ ctx.fillStyle='rgba(0,0,0,.07)'; ctx.beginPath(); ctx.arc(3.8,hy+1.8,5,0,TAU); ctx.fill();         // soft shade
    ctx.strokeStyle='rgba(255,255,255,.32)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,hy,8.3,Math.PI*1.06,Math.PI*1.5); ctx.stroke(); }  // rim light
  drawHair(L,hy,flip);
  // face (frog / visor draw their own in drawHair)
  if(L.style!=='frog' && L.style!=='visor'){
    const ex=flip*1.2, hurtF=h.hp/h.maxhp<0.3;
    const blink=((now*0.9+seed)%3.4)<0.09;
    ctx.strokeStyle='rgba(24,18,12,.65)'; ctx.lineWidth=1.3;
    const bd=hurtF?1.1:0;   // brows knit down when hurt
    ctx.beginPath(); ctx.moveTo(ex-4.6,hy-3.6); ctx.lineTo(ex-1.6,hy-4.1+bd); ctx.moveTo(ex+1.6,hy-4.1+bd); ctx.lineTo(ex+4.6,hy-3.6); ctx.stroke();
    if(blink){ ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(ex-4.4,hy-0.2); ctx.lineTo(ex-1.6,hy-0.2); ctx.moveTo(ex+1.6,hy-0.2); ctx.lineTo(ex+4.4,hy-0.2); ctx.stroke(); }
    else { const px=Math.cos(ga)*0.7, py=Math.sin(ga)*0.45;   // pupils track the aim
      ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.arc(ex-3+px,hy-0.2+py,1.7,0,TAU); ctx.arc(ex+3+px,hy-0.2+py,1.7,0,TAU); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ex-3.6+px,hy-0.9+py,0.6,0,TAU); ctx.arc(ex+2.4+px,hy-0.9+py,0.6,0,TAU); ctx.fill(); }
    if(hurtF){ // gritted mouth + sweat drop
      ctx.strokeStyle='#8a4a3a'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(ex-2.2,hy+3.6); ctx.lineTo(ex+2.2,hy+3.2); ctx.stroke();
      ctx.strokeStyle='rgba(24,18,12,.4)'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(ex-1.2,hy+2.6); ctx.lineTo(ex-1.2,hy+4.2); ctx.moveTo(ex+0.4,hy+2.6); ctx.lineTo(ex+0.4,hy+4);
      ctx.stroke();
      const sw=(now*1.6+seed)%1, sy=hy-6+sw*4;
      ctx.fillStyle='rgba(140,210,255,'+(0.85*(1-sw))+')';
      ctx.beginPath(); ctx.arc(ex-6.4*flip,sy,1.2,0,TAU); ctx.fill(); }
    else { ctx.strokeStyle='#8a4a3a'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.arc(ex,hy+3,2,0.15*Math.PI,0.85*Math.PI); ctx.stroke(); }
  }
  // gun arm (front), rotated to aim; keep the gun upright when aiming left
  const gname = h.weapon?h.weapon.name:'Pistol';
  const reach = 15 - (h.recoil>0?h.recoil*3:0);   // recoil kicks the gun back
  ctx.save(); ctx.translate(0,-2); ctx.rotate(ga);
  ctx.strokeStyle=INK; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(reach,2); ctx.stroke();
  ctx.strokeStyle=flash?'#fff':L.skin; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(reach,2); ctx.stroke();
  ctx.translate(reach,2); if(Math.cos(ga)<0) ctx.scale(1,-1);
  drawHeldWeapon(h.weapon, gname);
  // support hand on the foregrip for two-handed weapons
  if(!oneHand && !flash){ const gl=heldWeaponLen(h.weapon), fx=gl*0.45;
    ctx.strokeStyle=INK; ctx.lineWidth=4.6; ctx.beginPath(); ctx.moveTo(fx-7,6); ctx.lineTo(fx,2.2); ctx.stroke();
    ctx.strokeStyle=L.skin; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(fx-7,6); ctx.lineTo(fx,2.2); ctx.stroke();
    ctx.fillStyle=L.skin; ctx.strokeStyle=INK; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.arc(fx,2.2,2.5,0,TAU); ctx.fill(); ctx.stroke(); }
  if(h.muzzleT>0){ const gl=heldWeaponLen(h.weapon), mr=h.muzzleR||7; ctx.save(); ctx.translate(gl+1,0);
    ctx.fillStyle='rgba(255,205,80,.55)'; ctx.beginPath(); ctx.arc(0,0,mr,0,TAU); ctx.fill();
    ctx.fillStyle='#fff6c0'; for(let k=0;k<4;k++){ ctx.save(); ctx.rotate(k*Math.PI/2+0.4);
      ctx.beginPath(); ctx.moveTo(0,-mr*0.34); ctx.lineTo(mr*1.4+rand(0,3),0); ctx.lineTo(0,mr*0.34); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0,0,mr*0.48,0,TAU); ctx.fill(); ctx.restore(); }
  ctx.restore();
  // player ring
  if(h.isPlayer){ ctx.strokeStyle='rgba(120,225,90,.9)'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.ellipse(0,19,17,5.5,0,0,TAU); ctx.stroke();
    if(h.reloading>0){ const pr=clamp(1-h.reloading/h.weapon.reload,0,1); ctx.strokeStyle='#ffd166'; ctx.lineWidth=3; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(0,4,21,-Math.PI/2,-Math.PI/2+pr*TAU); ctx.stroke(); } }
  ctx.restore();
  drawCustomizationOverlay(h, false);
  drawNameplate(h);
}
// Cosmetic overlays keep the authored hero PNGs intact while adding a readable, per-player
// identity layer. They are deliberately small, outlined shapes so they survive zoom/DPR changes.
function drawCustomizationOverlay(h, sprite){
  if(!h.isPlayer || !h.custom) return;
  const c=h.custom, pal=CUSTOM.palettes.find(x=>x.id===c.palette)||CUSTOM.palettes[0];
  const s=sprite?1:1, headY=sprite?-30:-17;
  ctx.save(); ctx.lineJoin='round'; ctx.lineCap='round';
  // palette: a luminous shoulder sash plus a small waist accent makes the outfit change visible
  ctx.strokeStyle=INK; ctx.lineWidth=4.5; ctx.beginPath(); ctx.moveTo(-8,headY+19); ctx.lineTo(8,headY+25); ctx.stroke();
  ctx.strokeStyle=pal.outfit; ctx.lineWidth=2.8; ctx.beginPath(); ctx.moveTo(-8,headY+19); ctx.lineTo(8,headY+25); ctx.stroke();
  ctx.fillStyle=pal.accent; ctx.globalAlpha=.9; ctx.fillRect(-7,headY+27,14,2); ctx.globalAlpha=1;
  // hair silhouettes are placed above the source art, giving every player a second, mixable shape
  ctx.fillStyle=pal.outfit; ctx.strokeStyle=INK; ctx.lineWidth=1.5;
  if(c.hair==='fade'){ ctx.beginPath(); ctx.arc(0,headY-1,9.2,Math.PI,0); ctx.fill(); ctx.stroke(); ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(-7,headY-2,3,4); }
  if(c.hair==='waves'){ for(const p of [[-6,-3],[0,-6],[6,-3]]){ ctx.beginPath(); ctx.arc(p[0],headY+p[1],3.2,0,TAU); ctx.fill(); ctx.stroke(); } }
  if(c.hair==='spikes'){ ctx.beginPath(); ctx.moveTo(-8,headY-3); ctx.lineTo(-6,headY-11); ctx.lineTo(-2,headY-5); ctx.lineTo(2,headY-12); ctx.lineTo(5,headY-5); ctx.lineTo(8,headY-9); ctx.lineTo(8,headY+1); ctx.lineTo(-8,headY+1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // accessories
  if(c.accessory==='headset'){ ctx.strokeStyle='#b7d6e8'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,headY,11,-Math.PI*1.02,-Math.PI*.02); ctx.stroke(); ctx.fillStyle='#72c9e8'; ctx.beginPath(); ctx.arc(-10,headY+1,2.6,0,TAU); ctx.arc(10,headY+1,2.6,0,TAU); ctx.fill(); }
  if(c.accessory==='scarf'){ ctx.fillStyle=pal.accent; ctx.strokeStyle=INK; ctx.lineWidth=1.4; roundRect(-10,headY+8,20,5,2); ctx.fill(); ctx.stroke(); ctx.fillStyle=pal.accent; ctx.beginPath(); ctx.moveTo(5,headY+12); ctx.lineTo(10,headY+23); ctx.lineTo(5,headY+20); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if(c.accessory==='visor'){ ctx.fillStyle='rgba(35,235,210,.75)'; ctx.strokeStyle=INK; ctx.lineWidth=1.2; roundRect(-8,headY-1,16,5,2); ctx.fill(); ctx.stroke(); }
  // facial traits
  if(c.trait==='wink'){ ctx.strokeStyle='#171a14'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-5,headY+2); ctx.lineTo(-1.5,headY+2); ctx.stroke(); }
  if(c.trait==='scar'){ ctx.strokeStyle='#c94d4d'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(4,headY-1); ctx.lineTo(6,headY+4); ctx.stroke(); }
  if(c.trait==='smile'){ ctx.strokeStyle='#8a4a3a'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(0,headY+4,3,0.15*Math.PI,0.85*Math.PI); ctx.stroke(); }
  ctx.restore();
}
// Billboard a hero PNG in place of the drawn chibi: shadow + player ring under it, a gentle
// walk-bob / run-lean, a white flash on hit, plus muzzle flash + reload ring so combat still reads.
function drawHeroSprite(h, img){
  // Face the way we AIM (the whole sprite turns to shoot), not the way we move. `faceX` is set
  // from movement velocity in integrate(), so a static sprite would shoot backwards while running.
  // Deadzone near vertical + a sticky `spriteFlip` avoids flicker when aiming straight up/down.
  const ca = Math.cos(h.aim);
  if(ca < -0.06) h.spriteFlip = -1; else if(ca > 0.06) h.spriteFlip = 1;
  const flip = h.spriteFlip || (h.faceX<0?-1:1);
  const moving = (h.vx*h.vx+h.vy*h.vy)>140;
  const now = performance.now()/1000, seed=h.seed||0;
  // Procedural walk cycle for the static billboard: the torso bobs/sways/leans and the legs step in
  // anti-phase, so the whole hero animates instead of a spinning arm on a frozen body. `h.walk` only
  // advances while moving, so it freezes to a clean stance when idle (idle uses a breathing bob).
  const gait = moving ? Math.sin(h.walk) : 0;                       // -1..1 stride phase
  const bob  = moving ? -Math.abs(Math.sin(h.walk))*2.1            // body rises between footfalls
                      : Math.sin(now*2.3+seed)*0.8;                 // idle breathing
  const sway = moving ? Math.sin(h.walk)*2.0 : 0;                   // weight shifts side to side
  const lean = clamp(h.vx/2400,-0.10,0.10);
  const DH = HERO_H, DW = DH*(img.naturalWidth/img.naturalHeight);   // display size, aspect-preserved
  ctx.save(); ctx.translate(h.x,h.y);
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0,20,16.5,5.5,0,0,TAU); ctx.fill();  // shadow
  // signature aura — a soft, gently-pulsing colored halo behind heroes that have one (a per-hero trait,
  // shown for the player and bots alike), tying the sprite's own glow into gameplay
  if(h.avatar && h.avatar.aura){ ctx.save();
    const gr=ctx.createRadialGradient(0,-4,2, 0,-4,28); gr.addColorStop(0,h.avatar.aura); gr.addColorStop(0.55,h.avatar.aura); gr.addColorStop(1,'transparent');
    ctx.globalAlpha=0.32+0.09*Math.sin(now*2.2+seed); ctx.fillStyle=gr;
    ctx.beginPath(); ctx.ellipse(0,-4,23,30,0,0,TAU); ctx.fill(); ctx.restore(); }
  if(h.isPlayer){ ctx.strokeStyle='rgba(120,225,90,.9)'; ctx.lineWidth=2.4;
    ctx.beginPath(); ctx.ellipse(0,20,19,6,0,0,TAU); ctx.stroke(); }
  ctx.save(); ctx.translate(sway,bob);                              // torso + gun-arm share the bob/sway (stay attached)
  ctx.save(); ctx.rotate(lean); ctx.scale(flip,1);                  // body leans into the run & faces the aim
  if(h.hitFlash>0) ctx.filter='brightness(2.4) saturate(0.5)';       // hit flash (resets on restore)
  drawWalkBody(img, DW, DH, gait);
  ctx.restore();
  // "armless" heroes are drawn with their arms at their sides, so we mount a live gun-arm on top
  // that rotates the full 360° to the aim — the weapon shows in-hand and points wherever we shoot.
  const armless = h.avatar && h.avatar.armless;
  if(armless){ drawHeroArm(h, 0); }                                 // pivots at the (already-moved) chest, aims true
  else if(h.muzzleT>0){ const mr=h.muzzleR||7, mx=Math.cos(h.aim)*20, my=Math.sin(h.aim)*12-6;   // muzzle flash along aim
    ctx.save(); ctx.translate(mx,my);
    ctx.fillStyle='rgba(255,205,80,.5)'; ctx.beginPath(); ctx.arc(0,0,mr,0,TAU); ctx.fill();
    ctx.fillStyle='#fff6c0'; ctx.beginPath(); ctx.arc(0,0,mr*0.5,0,TAU); ctx.fill(); ctx.restore(); }
  ctx.restore();                                                     // close bob/sway frame
  if(h.isPlayer && h.reloading>0){ const pr=clamp(1-h.reloading/h.weapon.reload,0,1);   // reload ring (steady, un-bobbed)
    ctx.strokeStyle='#ffd166'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(0,4,21,-Math.PI/2,-Math.PI/2+pr*TAU); ctx.stroke(); }
  drawCustomizationOverlay(h, true);
  ctx.restore();
}
// Draw the billboard with an articulated two-part leg walk: the static PNG has no frames, so split
// the lower portion into left/right halves and lift each in anti-phase — the legs visibly step. The
// upper body is drawn last so it covers the hip seam of whichever leg is raised.
function drawWalkBody(img, DW, DH, gait){
  const sw=img.naturalWidth, sh=img.naturalHeight;
  const splitF = 0.60;                                              // legs occupy the bottom ~40% of the art
  const topY = 20-DH, bodyH = DH*splitF, legH = DH*(1-splitF), legY = topY + bodyH;
  const sBodyH = sh*splitF, sLegY = sh*splitF, sLegH = sh*(1-splitF);
  const lift = Math.abs(gait)*3.6;                                  // one leg lifts per half-stride
  const liftL = gait>0 ? lift : 0, liftR = gait<0 ? lift : 0;
  ctx.drawImage(img, 0,    sLegY, sw/2, sLegH, -DW/2, legY-liftL, DW/2, legH);   // screen-left leg
  ctx.drawImage(img, sw/2, sLegY, sw/2, sLegH,  0,    legY-liftR, DW/2, legH);   // screen-right leg
  ctx.drawImage(img, 0, 0, sw, sBodyH, -DW/2, topY, DW, bodyH);                  // upper body over the hip seam
}
// A live gun-arm for the "armless" sprite heroes: a sleeve-coloured arm pinned at the chest that
// rotates to `h.aim` (full 360°) with the weapon in-hand — mirrors the 2D chibi's arm/`drawGun`
// rig so combat reads identically. Called in the sprite's local space (already translated to h.x,h.y).
function drawHeroArm(h, bob){
  const L = h.look || (h.avatar && h.avatar.look) || {skin:'#f0c8a0', outfit:'#556'};
  const ga = h.aim, gname = h.weapon ? h.weapon.name : 'Pistol';
  const gl = heldWeaponLen(h.weapon);
  const oneHand = h.weapon && (h.weapon.name==='Pistol' || h.weapon.name==='Magnum');
  const reach = HERO_ARM_REACH - (h.recoil>0 ? h.recoil*3 : 0);        // recoil kicks the gun back
  const sleeve = L.outfit || '#556', skin = L.skin || '#f0c8a0';
  ctx.save(); ctx.translate(HERO_ARM_ANCHOR_X, HERO_ARM_ANCHOR_Y + bob*0.6); ctx.scale(CHAR_VISUAL_SCALE, CHAR_VISUAL_SCALE); ctx.rotate(ga);   // shoulder pivot at the chest, bobbing with the body
  ctx.lineJoin='round'; ctx.lineCap='round';
  // upper arm: dark outline under a sleeve-coloured limb
  ctx.strokeStyle=INK; ctx.lineWidth=6.4; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(reach,1); ctx.stroke();
  ctx.strokeStyle=sleeve; ctx.lineWidth=4.2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(reach,1); ctx.stroke();
  // hand + gun at the wrist; flip the gun upright when aiming left so it never reads upside-down
  ctx.translate(reach,1); if(Math.cos(ga)<0) ctx.scale(1,-1);
  ctx.fillStyle=skin; ctx.strokeStyle=INK; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(0.4,0.4,2.7,0,TAU); ctx.fill(); ctx.stroke();     // trigger hand
  drawHeldWeapon(h.weapon, gname);
  // support hand on the foregrip for two-handed weapons
  if(!oneHand){ const fx=gl*0.45;
    ctx.strokeStyle=INK; ctx.lineWidth=4.6; ctx.beginPath(); ctx.moveTo(fx-6.5,6.5); ctx.lineTo(fx,2.4); ctx.stroke();
    ctx.strokeStyle=sleeve; ctx.lineWidth=2.8; ctx.beginPath(); ctx.moveTo(fx-6.5,6.5); ctx.lineTo(fx,2.4); ctx.stroke();
    ctx.fillStyle=skin; ctx.strokeStyle=INK; ctx.lineWidth=1.1;
    ctx.beginPath(); ctx.arc(fx,2.4,2.3,0,TAU); ctx.fill(); ctx.stroke(); }
  // muzzle flash at the barrel tip (in gun space, so it tracks the aim)
  if(h.muzzleT>0){ const mr=h.muzzleR||7; ctx.save(); ctx.translate(gl+1,0);
    ctx.fillStyle='rgba(255,205,80,.55)'; ctx.beginPath(); ctx.arc(0,0,mr,0,TAU); ctx.fill();
    ctx.fillStyle='#fff6c0'; for(let k=0;k<4;k++){ ctx.save(); ctx.rotate(k*Math.PI/2+0.4);
      ctx.beginPath(); ctx.moveTo(0,-mr*0.34); ctx.lineTo(mr*1.4+rand(0,3),0); ctx.lineTo(0,mr*0.34); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0,0,mr*0.48,0,TAU); ctx.fill(); ctx.restore(); }
  ctx.restore();
}
function drawHair(L,hy,flip){
  ctx.fillStyle=L.hair; ctx.strokeStyle=INK; ctx.lineWidth=1.4; ctx.lineJoin='round'; ctx.lineCap='round';
  function cap(){ ctx.fillStyle=L.hair; ctx.beginPath(); ctx.arc(0,hy-2,9.7,Math.PI*1.02,-0.02); ctx.lineTo(8,hy+1.5); ctx.lineTo(-8,hy+1.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  switch(L.style){
    case 'curly': for(const o of [[-6,-5],[0,-8.5],[6,-5],[-3,-7.5],[3,-7.5]]){ ctx.beginPath(); ctx.arc(o[0],hy+o[1],4.2,0,TAU); ctx.fill(); ctx.stroke(); } break;
    case 'long': cap(); ctx.fillStyle=L.hair; ctx.fillRect(-10,hy-4,3.4,13); ctx.fillRect(6.6,hy-4,3.4,13); ctx.strokeRect(-10,hy-4,3.4,13); ctx.strokeRect(6.6,hy-4,3.4,13); break;
    case 'beard': cap(); ctx.fillStyle=L.hair; ctx.beginPath(); ctx.moveTo(-7,hy+1.5); ctx.quadraticCurveTo(0,hy+11,7,hy+1.5); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
    case 'mask': cap(); ctx.fillStyle='#cfe8d0'; ctx.beginPath(); roundRect(-9,hy,18,8,2); ctx.fill(); ctx.stroke(); break;
    case 'glasses': cap(); ctx.strokeStyle='#111'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(-3,hy-0.3,3,0,TAU); ctx.arc(4,hy-0.3,3,0,TAU); ctx.stroke(); break;
    case 'ninja': ctx.fillStyle=L.outfit; ctx.beginPath(); ctx.arc(0,hy-1.5,10.5,0,TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle=L.skin; ctx.fillRect(-8,hy-3.5,16,5); break;
    case 'mohawk': ctx.fillStyle=L.hair; ctx.beginPath(); ctx.moveTo(-2.4,hy-3); ctx.lineTo(-3,hy-14); ctx.lineTo(0,hy-16); ctx.lineTo(3,hy-14); ctx.lineTo(2.4,hy-3); ctx.closePath(); ctx.fill(); ctx.stroke();
      for(const sx of [-7.5,7.5]){ ctx.fillRect(sx-1,hy-6,2,5); } break;
    case 'cap': ctx.fillStyle=L.hair; ctx.beginPath(); ctx.arc(0,hy-2,9.9,Math.PI,0); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(flip*8,hy-1,7.5,2.6,0,0,TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(-2,hy-5,3,0,TAU); ctx.fill(); break;
    case 'visor': cap(); ctx.fillStyle='#1d2230'; roundRect(-9,hy-3,18,7,3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#39e6d6'; ctx.lineWidth=1.8; ctx.beginPath(); ctx.moveTo(-6.5,hy+0.4); ctx.lineTo(6.5,hy+0.4); ctx.stroke();
      ctx.fillStyle='#bafff6'; ctx.beginPath(); ctx.arc(flip*3.5,hy+0.4,1.1,0,TAU); ctx.fill(); break;
    case 'tophat': cap(); ctx.fillStyle='#23252b';
      ctx.beginPath(); ctx.ellipse(0,hy-6,11,2.6,0,0,TAU); ctx.fill(); ctx.stroke();
      roundRect(-6.5,hy-15,13,9,1.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle=L.outfit; ctx.fillRect(-6.5,hy-8.6,13,2.4); break;
    case 'crown': cap(); ctx.fillStyle='#ffcf3a'; ctx.strokeStyle='#a9791a'; ctx.lineWidth=1.3;
      ctx.beginPath(); ctx.moveTo(-8,hy-6); ctx.lineTo(-8,hy-9); ctx.lineTo(-4,hy-6.5); ctx.lineTo(0,hy-11); ctx.lineTo(4,hy-6.5); ctx.lineTo(8,hy-9); ctx.lineTo(8,hy-6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#e2452f'; ctx.beginPath(); ctx.arc(0,hy-7,1.2,0,TAU); ctx.fill();
      ctx.fillStyle='#39a0ff'; ctx.beginPath(); ctx.arc(-5,hy-6.6,0.9,0,TAU); ctx.arc(5,hy-6.6,0.9,0,TAU); ctx.fill(); break;
    case 'halo': cap(); ctx.strokeStyle='#ffe27a'; ctx.lineWidth=2; ctx.globalAlpha=0.45;    // soft glow ring
      ctx.beginPath(); ctx.ellipse(0,hy-13,7,2.3,0,0,TAU); ctx.stroke(); ctx.globalAlpha=1;
      ctx.strokeStyle='#fff3b0'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.ellipse(0,hy-13,6.6,2.1,0,0,TAU); ctx.stroke(); break;
    case 'horns': cap(); ctx.fillStyle='#e8ddc8'; ctx.strokeStyle=INK; ctx.lineWidth=1.4;      // curved bone horns
      for(const sx of [-1,1]){ ctx.beginPath(); ctx.moveTo(sx*6,hy-5.5); ctx.quadraticCurveTo(sx*11,hy-10.5,sx*8.5,hy-15.5);
        ctx.quadraticCurveTo(sx*7,hy-11.5,sx*4.2,hy-7.5); ctx.closePath(); ctx.fill(); ctx.stroke(); } break;
    default: cap();
  }
}
function drawNameplate(h){
  const x=h.x, y=h.y+18-HERO_H;   // sit just above the sprite's head (feet at +20, top at +20-HERO_H)
  ctx.textAlign='center'; ctx.font='800 11px Trebuchet MS, sans-serif';
  // equipped nameplate banner — a colored pill behind the player's own name (purely cosmetic)
  if(h.isPlayer && meta.banner!=='none'){ const bn=bannerItem(meta.banner);
    if(bn){ const bw=ctx.measureText(h.name).width+14;
      ctx.fillStyle=bn.color; ctx.globalAlpha=0.32; roundRect(x-bw/2,y-19,bw,15,7); ctx.fill(); ctx.globalAlpha=1;
      ctx.strokeStyle=bn.color; ctx.lineWidth=1.2; roundRect(x-bw/2,y-19,bw,15,7); ctx.stroke(); } }
  ctx.fillStyle = h.isPlayer?'#9bff6e' : (!h.isPlayer && h.team===player.team)?'#8fd6ff' : '#ffffff'; ctx.fillText(h.name, x, y-9);
  // rarity accent under the player's name — ties the weapon-select rarity color into gameplay
  if(h.isPlayer){ const tw=Math.min(ctx.measureText(h.name).width+8,34);
    ctx.fillStyle=weaponTier(h.weapon).c; ctx.fillRect(x-tw/2, y-2.5, tw, 1.5); }
  // hp bar
  const bw=30; ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(x-bw/2,y-6,bw,5);
  const hc=clamp(h.hp/h.maxhp,0,1); ctx.fillStyle=hc>.5?'#5fd35f':hc>.25?'#ffd166':'#e2452f';
  ctx.fillRect(x-bw/2,y-6,bw*hc,5);
  // armor/shield bar (thin blue, above hp)
  if(h.shield>0){ ctx.fillStyle='rgba(0,0,0,.5)'; ctx.fillRect(x-bw/2,y-10,bw,3);
    ctx.fillStyle='#5fa8ff'; ctx.fillRect(x-bw/2,y-10,bw*clamp(h.shield/100,0,1),3); }
  // ammo pips (orange) for player, mini for bots
  if(h.isPlayer){ const w=h.weapon, n=magCap(h);
    const seg=Math.min(n,10), gap=2, tot=bw, sw=(tot-(seg-1)*gap)/seg;
    const low = h.reloading<=0 && h.mag<=Math.max(1,Math.ceil(n*0.25));
    const pulse = low ? (0.45+0.55*Math.abs(Math.sin(performance.now()/130))) : 1;
    for(let i=0;i<seg;i++){ ctx.fillStyle = i<h.mag ? (low?'rgba(255,'+Math.round(70+90*pulse)+',60,1)':'#ff9b3d') : 'rgba(0,0,0,.45)';
      ctx.fillRect(x-bw/2+i*(sw+gap), y+1, sw, 4); }
    if(h.reloading>0){ ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font='700 9px Trebuchet MS'; ctx.fillText('reloading…',x,y+13); }
    else if(low){ ctx.fillStyle='#ff6a6a'; ctx.font='700 9px Trebuchet MS'; ctx.fillText('LOW AMMO',x,y+13); }
  } else if(h.reloading>0){ // bot reload progress
    ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(x-bw/2,y+1,bw,3);
    ctx.fillStyle='rgba(255,255,255,.8)'; ctx.fillRect(x-bw/2,y+1,bw*(1-h.reloading/h.weapon.reload),3);
  }
}
