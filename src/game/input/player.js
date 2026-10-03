function updatePlayer(h,dt,gp,readShared){
  if(!h.alive) return;
  if(h.reloading>0){ h.reloading-=dt; if(h.reloading<=0){ h.mag=magCap(h); reloadBlast(h); } }
  let mx=0,my=0;
  if(readShared){
    if(keys['w']||keys['arrowup']) my-=1; if(keys['s']||keys['arrowdown']) my+=1;
    if(keys['a']||keys['arrowleft']) mx-=1; if(keys['d']||keys['arrowright']) mx+=1;
    if(moveVec.active){ mx+=moveVec.x; my+=moveVec.y; }
  }
  const kbTouch = mx!==0 || my!==0;
  if(gp){ mx+=gp.mx; my+=gp.my; }
  const m=len(mx,my);
  // analog walking: a half-pushed stick walks at ~half speed (pad-only; keys/touch stay full speed)
  const padAnalog = (gp && !kbTouch) ? clamp(0.35+0.65*m,0.35,1) : 1;
  if(h.grap){ // rope physics owns velocity — input only steers (pumps the swing)
    if(m>0){ h.vx+=mx/m*520*dt; h.vy+=my/m*520*dt; } h.walk+=dt*10;
  }
  else if(m>0){ const spd=h.speed*(h.perkSpeedMul||1)*padAnalog;   // padAnalog<1 only for a pad-only light push
    h.vx+=(mx/m*spd-h.vx)*MOVE.accel; h.vy+=(my/m*spd-h.vy)*MOVE.accel; }
  else { h.vx*=MOVE.friction; h.vy*=MOVE.friction; }   // coast to a stop with a little skid
  // stride cadence tracks real speed: fast run = quick legs, a creep = a slow shuffle
  if(!h.grap){ const s01=clamp(Math.hypot(h.vx,h.vy)/(h.speed||1),0,1.25); h.walk+=dt*(2.5+9*s01); }
  // --- watchtower climb / descend (auto: walk onto the south ladder to go up, walk off the roof's
  //     south edge to drop down). Melee zombies can't reach the roof; ranged Spitters still can. ---
  if(h.climbCd>0) h.climbCd-=dt;
  if(!h.onTower){
    if(h.climbCd<=0) for(const o of obstacles){ if(!o.tower) continue; const L=towerLadder(o);
      if(h.x>L.x-6 && h.x<L.x+L.w+6 && h.y>L.y-6 && h.y<L.y+L.h+12){
        h.onTower=o; const r=towerRoof(o); h.x=o.x+o.w/2; h.y=r.y+r.h-7; h.vx=h.vy=0; h.climbCd=0.5;
        toast('🪜 ON THE ROOF — hold it & shoot down'); sfx('pickup'); break; } }
  } else {
    const r=towerRoof(h.onTower);
    if(h.y>=r.y+r.h-1.3 && my>0.3){                                   // press down at the south edge → drop off
      const t=h.onTower; h.onTower=null; h.x=t.x+t.w/2; h.y=t.y+t.h+R+6; h.vx=0; h.vy=70; h.climbCd=0.5; sfx('throw'); }
  }
  // aim + fire
  let firing=false, mouseAim=false;
  if(gp && (Math.abs(gp.ax)+Math.abs(gp.ay))>0.25){ const a=assistAim(h,Math.atan2(gp.ay,gp.ax)); h.aim=angLerp(h.aim,a,clamp(0.35*meta.aimSens,0.12,1)); firing=true; }
  else if(readShared && aimVec.active && (aimVec.x||aimVec.y)){ h.aim=Math.atan2(aimVec.y,aimVec.x); firing=true; }
  else if(readShared && !isTouch){ h.aim=Math.atan2((mouse.y+cam.y)-h.y,(mouse.x+cam.x)-h.x); firing=mouse.down||keys[' ']; mouseAim=true; }
  if(gp){ if(gp.fire) firing=true; if(gp.reload) startReload(h); if(gp.light) castLightning(h); if(gp.bomb) throwBomb(h); if(gp.grapple) castGrapple(h); }
  // reticle world target — player-1-only screen overlay globals (aimWX/aimWY/aimShow); player 2
  // doesn't get an on-screen reticle in this pass, a deliberate scope cut, not an oversight — see
  // memory.md 2-player entry
  if(readShared){
    if(mouseAim){ aimWX=mouse.x+cam.x; aimWY=mouse.y+cam.y; }
    else { aimWX=h.x+Math.cos(h.aim)*130; aimWY=h.y+Math.sin(h.aim)*130; }
    aimShow = mouseAim || firing || aimVec.active || !!(gp&&(Math.abs(gp.ax)+Math.abs(gp.ay))>0.25);
  }
  if(Math.cos(h.aim)) h.faceX=Math.cos(h.aim)<0?-1:1;
  // build mode hijacks the fire input to drop structures instead of shooting
  if(h.placeCd>0) h.placeCd-=dt;
  if(h.buildSel>=0){ const g=buildGhost(h); h.ghostX=g.cx; h.ghostY=g.cy;
    h.ghostOk=canPlace(BUILDS[h.buildSel], g.cx, g.cy) && (h.scrap||0)>=BUILDS[h.buildSel].cost;
    if(firing) placeBuild(h); }
  else if(firing) fire(h);
  if(h.lightCd>0) h.lightCd-=dt; if(h.bombCd>0) h.bombCd-=dt; if(h.grapCd>0) h.grapCd-=dt;
  updateGrapple(h,dt);
  stepDust(h,dt);
  campfireHeal(h,dt); perkRegenTick(h,dt);
  // equipped cosmetic trail (shop) — player only
  const tr = meta.trail!=='none' && shopItem(meta.trail);
  if(tr && (h.vx*h.vx+h.vy*h.vy)>3600 && Math.random()<dt*14)
    spark(h.x+rand(-5,5), h.y+rand(8,15), pick(tr.colors), rand(6,22), rand(-Math.PI*0.9,-Math.PI*0.1), rand(.3,.55));
  // low-health heartbeat — quickens as HP drops toward zero. readShared-gated: heartT is a
  // single shared timer, so letting player 2 also drive it would make the cadence reflect
  // whichever of the two humans updatePlayer() happened to process last each frame.
  if(readShared){
    const lf = h.maxhp>0 ? h.hp/h.maxhp : 1;
    if(h.alive && lf<0.3 && grace<=0){ heartT-=dt; if(heartT<=0){ sfx('heart'); if(h.gpIndex!=null) gpRumble(h.gpIndex,70,0.0,0.35); heartT=lerp(0.5,0.95,clamp(lf/0.3,0,1)); } }
    else heartT=0;
  }
}
let gpSeen=false, curGp=null, curGp2=null;
// Controller aim assist: a right stick can't match a mouse for precision, so when you're aiming
// roughly at a zombie (inside ~13°) the aim bends 55% of the way onto it. Nearest-in-angle wins
// with a small distance penalty so a far zombie never beats a close one. Gamepad-only, toggled by
// meta.aimAssist; mouse and touch aim are untouched.
const ASSIST_CONE=0.23, ASSIST_RANGE=520, ASSIST_PULL=0.55;
function assistAim(h,a){
  if(!meta.aimAssist) return a;
  let best=null, bestScore=1e9;
  for(const z of zombies){ if(!z.alive) continue;
    const dx=z.x-h.x, dy=z.y-h.y, d2=dx*dx+dy*dy; if(d2>ASSIST_RANGE*ASSIST_RANGE) continue;
    let da=Math.atan2(dy,dx)-a; da=Math.atan2(Math.sin(da),Math.cos(da)); if(Math.abs(da)>ASSIST_CONE) continue;
    const score=Math.abs(da)+Math.sqrt(d2)/ASSIST_RANGE*0.15;
    if(score<bestScore){ bestScore=score; best=da; } }
  return best===null ? a : a+best*ASSIST_PULL;
}
// Edge-trigger state is a per-CONTROLLER bag, not module-level singletons — a second local
// gamepad (co-op player 2) needs its OWN prev-frame button state, or it would corrupt player 1's
// edge detection (and vice versa) every time both controllers happened to press something the
// same frame. This is the exact bug class CLAUDE.md's "Input edge / continuous split" warns
// about: readGamepad() mutates mutable prev-state, so sharing that state across two independent
// input sources silently breaks edge-triggering for whichever one reads second.
function makeGpEdgeState(){ return {RP:false,LP:false,BP:false,GP:false,StP:false,UpP:false,DnP:false,LtP:false,RtP:false,AP:false}; }
let gp1Edge = makeGpEdgeState(), gp2Edge = makeGpEdgeState();
// Reads ONE already-resolved Gamepad object against ITS OWN edge-state bag. Callers own picking
// which raw pad and which state bag to pass in (see loop()) — this function no longer does its
// own "find a pad" scan, so the same logic serves player 1 and player 2 without duplication.
