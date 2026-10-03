function updateBot(h,dt){
  if(h.reloading>0){ h.reloading-=dt; if(h.reloading<=0) h.mag=magCap(h); }
  const near=botTarget(h); const tgt=near.o;
  let mvx=0,mvy=0; const out=outsideZone(h);
  const dc=Math.hypot(h.x-zone.cx,h.y-zone.cy);
  if(out || dc>zone.r-90){ const a=Math.atan2(zone.cy-h.y,zone.cx-h.x); mvx+=Math.cos(a)*1.2; mvy+=Math.sin(a)*1.2; }
  const pref=h.weapon.range*RANGE_SCALE*0.7;
  // early-match warmup: bots ease in over the first ~18s — shorter sight, slower to fire, and
  // they hesitate longer before shooting the player — so a fresh drop isn't instantly lethal.
  const warm = clamp(elapsed/18, 0, 1);
  const aggroR = h.aggro * (0.45 + 0.55*warm);
  const react  = (tgt&&tgt.isPlayer) ? h.reaction*(2.4-1.4*warm) : h.reaction*(1.6-0.6*warm);
  if(tgt && near.d<aggroR){
    const a=Math.atan2(tgt.y-h.y,tgt.x-h.x); h.aim=angLerp(h.aim,a,0.2);
    if(near.d>pref*1.15){ mvx+=Math.cos(a)*0.9; mvy+=Math.sin(a)*0.9; }
    else if(near.d<pref*0.55){ mvx-=Math.cos(a)*0.8; mvy-=Math.sin(a)*0.8; }
    if(h.reJitter<=0){ h.strafe*=Math.random()<.5?-1:1; h.reJitter=rand(.6,1.4); } h.reJitter-=dt;
    mvx+=Math.cos(a+Math.PI/2)*h.strafe*0.6; mvy+=Math.sin(a+Math.PI/2)*h.strafe*0.6;
    if(near.d < h.weapon.range*RANGE_SCALE*1.02){
      const err=Math.abs(((h.aim-a+Math.PI)%TAU)-Math.PI);
      if(err<0.22){ h.lockT+=dt; if(h.lockT>react){ if(h.mag>0) fire(h); else startReload(h); } } else h.lockT=Math.max(0,h.lockT-dt*.5);
    } else h.lockT=0;
  } else { h.lockT=0; if(!out){ if(h.think<=0){ h.wanderA=rand(0,TAU); h.think=rand(.8,1.8); } h.think-=dt;
    mvx+=Math.cos(h.wanderA)*0.5; mvy+=Math.sin(h.wanderA)*0.5; h.aim=angLerp(h.aim,h.wanderA,0.08); } }
  const m=len(mvx,mvy);
  if(m>0){ const sp=h.speed*(out?1.1:0.95)*(h.slowT>0?0.62:1); h.vx+=(mvx/m*sp-h.vx)*0.2; h.vy+=(mvy/m*sp-h.vy)*0.2; h.walk+=dt*8; }
  else { h.vx*=0.8; h.vy*=0.8; }
  stepDust(h,dt);
}
function updateZombie(z,dt){
  if(z.hitFlash>0) z.hitFlash-=dt;
  if(z.attackCd>0) z.attackCd-=dt;
  if(z.leapCd>0) z.leapCd-=dt;
  if(z.buffCd>0) z.buffCd-=dt;
  if(z.frenzyT>0) z.frenzyT-=dt;
  if(z.burn>0){ z.burn-=dt; z.hp-=9*dt;
    if(Math.random()<dt*12) spark(z.x+rand(-7,7), z.y-rand(2,16), pick(['#ff9b3d','#ff6a2a']), rand(20,70), -Math.PI/2, .4);
    if(z.hp<=0){ die(z, z.burnSrc, false); return; } }
  if(z.slowT>0) z.slowT-=dt;
  if(z.hasteT>0) z.hasteT-=dt;
  const near=nearestHuman(z,true); const tgt=near.o;
  let mvx=0,mvy=0;
  if(tgt && near.d<(z.ranged?540:z.buff?560:460)){ z.aim=Math.atan2(tgt.y-z.y,tgt.x-z.x);
    if(z.ranged){                                            // Spitter: hold a standoff distance & lob acid
      const ideal=290;
      if(near.d<ideal-70){ mvx=-Math.cos(z.aim); mvy=-Math.sin(z.aim); }      // too close → back off
      else if(near.d>ideal+70){ mvx=Math.cos(z.aim); mvy=Math.sin(z.aim); }   // too far → close in
      else { const s=(z.seed|0)%2?1:-1; mvx=Math.cos(z.aim+Math.PI/2)*0.5*s; mvy=Math.sin(z.aim+Math.PI/2)*0.5*s; }  // strafe
      z.spitCd-=dt;
      if(z.spitCd<=0 && grace<=0 && near.d<500){ z.spitCd=rand(1.7,2.6); z.lunge=1; spitAcid(z,tgt); }
    } else if(z.buff){                                       // Shaman: standoff support that frenzies nearby undead
      const ideal=330;
      if(near.d<ideal-80){ mvx=-Math.cos(z.aim); mvy=-Math.sin(z.aim); }
      else if(near.d>ideal+90){ mvx=Math.cos(z.aim); mvy=Math.sin(z.aim); }
      else { const s=(z.seed|0)%2?1:-1; mvx=Math.cos(z.aim+Math.PI/2)*0.45*s; mvy=Math.sin(z.aim+Math.PI/2)*0.45*s; }
      if(z.buffCd<=0 && grace<=0 && near.d<540){ z.buffCd=rand(4.2,5.8); z.lunge=1; zombieBuff(z); }
    } else {
      // if the prey is holed up in a building we aren't in, route to a door gap (around the
      // walls via the nearer corner when we're on the wrong side) instead of grinding the wall
      let gx=tgt.x, gy=tgt.y; const b=insideBuilding(tgt.x,tgt.y);
      if(b && insideBuilding(z.x,z.y)!==b){
        const cx=b.x+b.w/2, useTop=b.w>BIG_HOUSE && z.y<b.y;   // big house: take the top door from above
        const doorY=useTop?b.y:b.y+b.h, outside=useTop?b.y-20:b.y+b.h+20;
        const onDoorSide = useTop ? z.y<=doorY+8 : z.y>=doorY-8;
        if(onDoorSide){ gx=cx; gy=outside; }                   // aligned with the door → head in
        else { gx=(z.x<cx)?b.x-28:b.x+b.w+28; gy=outside; }    // skirt the nearer corner to reach it
      }
      const a=Math.atan2(gy-z.y,gx-z.x); mvx=Math.cos(a); mvy=Math.sin(a);
      if(z.leaper && z.leapCd<=0 && grace<=0 && near.d>80 && near.d<340){
        z.leapCd=rand(2.4,3.4); z.lunge=1.25;
        z.vx+=Math.cos(a)*280; z.vy+=Math.sin(a)*280;
        for(let i=0;i<8;i++) spark(z.x-rand(-5,5), z.y+14, '#c8b46a', rand(40,120), rand(-Math.PI*0.9,-Math.PI*0.1), rand(.25,.45));
      }
      if(near.d<z.r+R+2 && z.attackCd<=0 && grace<=0 && !tgt.onTower){ z.attackCd=0.85; z.lunge=1; hurt(tgt, z.dmg, z, true);
        tgt.vx+=Math.cos(a)*120; tgt.vy+=Math.sin(a)*120; if(tgt.isPlayer) shake=Math.min(shake+4,10); }
    } }
  else { if(z.think<=0){ z.wanderA=rand(0,TAU); z.think=rand(1,2.4); } z.think-=dt;
    mvx=Math.cos(z.wanderA)*0.5; mvy=Math.sin(z.wanderA)*0.5; }
  // ---- BOSS ground-slam AoE: a telegraphed heavy hit, separate from normal contact damage ----
  if(z.boss){
    if(z.slamWind>0){ z.slamWind-=dt;
      if(z.slamWind<=0){                                          // windup finished → the slam lands
        for(const hh of humans){ if(!hh.alive) continue;
          if(dist2(hh.x,hh.y,z.x,z.y) < JUGGERNAUT_SLAM.r*JUGGERNAUT_SLAM.r){
            hurt(hh, JUGGERNAUT_SLAM.dmg, z, true);
            const ka=Math.atan2(hh.y-z.y,hh.x-z.x); hh.vx+=Math.cos(ka)*JUGGERNAUT_SLAM.knock; hh.vy+=Math.sin(ka)*JUGGERNAUT_SLAM.knock;
            if(hh.isPlayer) shake=Math.min(shake+8,18);
            if(hh.gpIndex!=null) gpRumble(hh.gpIndex,260,0.6,1.0); } }
        rings.push({x:z.x,y:z.y,t:0,dur:0.4,r0:10,r1:JUGGERNAUT_SLAM.r,col:'255,140,40',lw:4});
        for(let i=0;i<14;i++) spark(z.x,z.y,'#caa46a',rand(80,220),rand(0,TAU),.5);
        z.slamCd=rand(JUGGERNAUT_SLAM.cdMin,JUGGERNAUT_SLAM.cdMax); }
    } else if(z.slamCd>0){ z.slamCd-=dt; }
    else if(tgt && near.d<JUGGERNAUT_SLAM.range && grace<=0){ z.slamWind=JUGGERNAUT_SLAM.wind; z.attackCd=Math.max(z.attackCd,1.2); }
  }
  // ---- HOWLER screech: periodic haste pulse to nearby zombies — a "kill this one first"
  // priority target below boss tier, giving the horde a support role it didn't have before ----
  if(z.howler){
    if(z.howlCd>0) z.howlCd-=dt;
    else if(grace<=0){ z.howlCd=rand(5,7); z.howlFlash=0.35;
      for(const z2 of zombies){ if(z2.alive && z2!==z && dist2(z2.x,z2.y,z.x,z.y)<190*190) z2.hasteT=3.5; }
      rings.push({x:z.x,y:z.y,t:0,dur:0.35,r0:6,r1:190,col:'180,107,255',lw:3});
      for(let i=0;i<10;i++) spark(z.x,z.y,'#b46bff',rand(60,150),rand(0,TAU),.4);
    }
  }
  if(z.howlFlash>0) z.howlFlash-=dt;
  // ---- HUSK spawner: periodically drops a weaker add — sustained pressure that isn't just
  // hordeScale()'s "bigger numbers", capped per-husk so it can't runaway-breed ----
  if(z.spawner && z.spawnsLeft>0){
    if(z.spawnCd>0) z.spawnCd-=dt;
    else if(grace<=0){ z.spawnCd=rand(6,9); z.spawnsLeft--;
      const a=rand(0,TAU), sx=z.x+Math.cos(a)*24, sy=z.y+Math.sin(a)*24;
      const add=makeZombie(sx,sy,'runner'); hordeScale(add,hordeWave); zombies.push(add);
      for(let i=0;i<8;i++) spark(z.x,z.y,'#c8cfc0',rand(40,110),rand(0,TAU),.35);
    }
  }
  // chew through any solid player-built barricade we're pressed against (walls & turrets)
  if(z.attackCd<=0 && grace<=0 && builds.length){
    for(const b of builds){ if(!b.solid) continue;
      const nx=clamp(z.x,b.x,b.x+b.w), ny=clamp(z.y,b.y,b.y+b.h);
      if(dist2(z.x,z.y,nx,ny) < (z.r+5)*(z.r+5)){ z.attackCd=0.85; z.lunge=1; b.hp-=z.dmg; z.aim=Math.atan2(ny-z.y,nx-z.x);
        for(let k=0;k<4;k++) spark(nx,ny,'#caa46a',rand(40,120),rand(0,TAU),.3); break; } }
  }
  if(z.lunge>0) z.lunge-=dt*3.2;
  const m=len(mvx,mvy);
  if(m>0){ const sp=z.speed*(z.slowT>0?0.55:1)*(z.frenzyT>0?1.24:1)*(z.hasteT>0?1.35:1); z.vx+=(mvx/m*sp-z.vx)*0.12; z.vy+=(mvy/m*sp-z.vy)*0.12; z.walk+=dt*6*(z.frenzyT>0?1.2:1); if(mvx) z.faceX=mvx<0?-1:1; }
  else { z.vx*=0.85; z.vy*=0.85; }
  // kicked-up dirt (in-view only): runners scrabble constantly, brutes throw heavy
  // stomp-clods on each footfall, normals scuff the odd puff
  const zs=z.vx*z.vx+z.vy*z.vy, zfam=z.family||z.kind;
  if(zs>2500 && inView(z.x,z.y,40)){
    if(zfam==='runner' && zs>8000 && Math.random()<dt*9)
      spark(z.x+rand(-5,5), z.y+14, 'rgba(120,100,70,.6)', rand(15,45), rand(-Math.PI*0.9,-Math.PI*0.1), rand(.2,.35));
    else if(zfam==='brute' && Math.sin(z.walk)>0.92 && Math.random()<dt*22)
      for(let i=0;i<3;i++) spark(z.x+rand(-9,9), z.y+16, 'rgba(105,88,60,.65)', rand(10,35), rand(-Math.PI*0.9,-Math.PI*0.1), rand(.3,.5));
    else if(zfam==='normal' && Math.random()<dt*4)
      spark(z.x+rand(-6,6), z.y+15, 'rgba(140,118,80,.5)', rand(6,20), rand(-Math.PI*0.85,-Math.PI*0.15), rand(.3,.5));
  }
  z.x=clamp(z.x+z.vx*dt,R,ARENA-R); z.y=clamp(z.y+z.vy*dt,R,ARENA-R);
  resolveObstacles(z);
}

// ============================================================
//  Update
// ============================================================
// `gp` is this human's OWN gamepad sample (curGp for player 1, curGp2 for player 2 — see loop()).
// `readShared` gates keyboard/mouse/touch input: those are single-device UI singletons (one
// `keys{}`, one `mouse`, one on-screen joystick pair) that must stay exclusive to whichever human
// is the "primary" local player, or player 2's presence would silently also steer/aim player 1
// (and vice versa) every frame both are being updated. Player 2 is gamepad-only by design — no
// touch/keyboard fallback — so it always passes readShared=false.
