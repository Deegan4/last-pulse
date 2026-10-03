// ---------- Builders (in-match construction) ----------
// Spend scrap (dropped by zombies + scattered caches) to place structures. Cycle the 🔨 button /
// press B to pick wall → spikes → turret → off; the fire input drops the ghosted piece. Solid
// pieces (wall/turret) also go into `obstacles` so they block movement + bullets and zombies chew
// them; spikes are a walkable ground trap. Tune costs / HP / damage here.
const CELL = 46;                                   // placement grid — walls tile seamlessly at this pitch
const BUILD_RANGE = 156, PLACE_CD = 0.26;          // how far ahead you can place, min gap between placements
const BUILDS = [
  { key:'wall',   icon:'🧱', name:'Wall',   cost:12, hp:240, w:46, h:46, solid:true },
  { key:'spikes', icon:'🔺', name:'Spikes', cost:18, hp:150, w:46, h:46, solid:false, dps:36 },
  { key:'turret', icon:'🔫', name:'Turret', cost:42, hp:130, w:40, h:40, solid:true, range:360, fireCd:0.5, dmg:16 },
];
function snapG(v){ return Math.round(v/CELL)*CELL; }
function buildGhost(h){                              // snapped centre in front of the player, clamped to range
  let tx=aimWX, ty=aimWY; const dx=tx-h.x, dy=ty-h.y, d=Math.hypot(dx,dy);
  if(d>BUILD_RANGE){ tx=h.x+dx/d*BUILD_RANGE; ty=h.y+dy/d*BUILD_RANGE; }
  return { cx:snapG(tx), cy:snapG(ty) };
}
function canPlace(def, cx, cy){
  const x=cx-def.w/2, y=cy-def.h/2, w=def.w, hh=def.h;
  if(x<48||y<48||x+w>ARENA-48||y+hh>ARENA-48) return false;
  for(const o of obstacles){ if(x<o.x+o.w && x+w>o.x && y<o.y+o.h && y+hh>o.y) return false; }
  for(const b of builds){ if(x<b.x+b.w && x+w>b.x && y<b.y+b.h && y+hh>b.y) return false; }
  if(blockedSpawn(cx,cy)) return false;             // keep off ponds (obstacles already covered above)
  if(def.solid){                                    // don't seal a body inside a solid piece
    for(const z of zombies) if(z.alive && z.x>x-4&&z.x<x+w+4&&z.y>y-4&&z.y<y+hh+4) return false;
    for(const p of humans)  if(p.alive && p.x>x-4&&p.x<x+w+4&&p.y>y-4&&p.y<y+hh+4) return false; }
  return true;
}
function placeBuild(h){
  if(h.buildSel<0) return; const def=BUILDS[h.buildSel];
  if(h.placeCd>0 || grace>0) return;
  const g=buildGhost(h);
  if(!canPlace(def, g.cx, g.cy)){ h.placeCd=0.12; if(h.isPlayer) sfx('tick'); return; }
  if((h.scrap||0) < def.cost){ h.placeCd=0.35; if(h.isPlayer){ toast('NOT ENOUGH SCRAP'); sfx('tick'); } return; }
  h.scrap -= def.cost; h.placeCd = PLACE_CD;
  const b={ def, key:def.key, x:g.cx-def.w/2, y:g.cy-def.h/2, w:def.w, h:def.h, cx:g.cx, cy:g.cy,
    hp:def.hp, maxhp:def.hp, solid:!!def.solid, built:true, team:0, turret:def.key==='turret',
    cd:0, tick:rand(0,0.35), aim:h.aim, muzzle:0, seed:rand(0,9) };
  builds.push(b); if(def.solid) obstacles.push(b);
  matchStat.built=(matchStat.built||0)+1;
  for(let i=0;i<9;i++) spark(g.cx, g.cy, '#e8cf9a', rand(60,180), rand(0,TAU), .45);
  rings.push({x:g.cx, y:g.cy, t:0, dur:0.3, r0:6, r1:def.w*0.9, col:'230,200,150', lw:3});
  if(h.isPlayer){ shake=Math.min(shake+2,8); sfx('build'); }
}
function cycleBuild(h){                              // wall → spikes → turret → off
  h.buildSel = (h.buildSel>=BUILDS.length-1) ? -1 : h.buildSel+1;
  if(h.isPlayer) sfx('tick');
}
function removeBuild(i){
  const b=builds[i]; builds.splice(i,1);
  const oi=obstacles.indexOf(b); if(oi>=0) obstacles.splice(oi,1);
  for(let k=0;k<12;k++) spark(b.cx, b.cy, k%2?'#caa46a':'#8a6a3a', rand(50,200), rand(0,TAU), .55);
  rings.push({x:b.cx, y:b.cy, t:0, dur:0.35, r0:6, r1:b.w, col:'190,160,110', lw:3});
  sfx('boom',null,{x:b.cx,y:b.cy});
}
function updateBuilds(dt){
  for(let i=builds.length-1;i>=0;i--){ const b=builds[i], def=b.def;
    if(def.key==='turret'){
      if(b.cd>0) b.cd-=dt; if(b.muzzle>0) b.muzzle-=dt;
      let best=null, bd=def.range*def.range;
      for(const z of zombies){ if(!z.alive) continue; const d=dist2(b.cx,b.cy,z.x,z.y); if(d<bd){ bd=d; best=z; } }
      if(best){ b.aim=angLerp(b.aim, Math.atan2(best.y-b.cy,best.x-b.cx), clamp(dt*10,0,1));
        if(b.cd<=0 && grace<=0){ b.cd=def.fireCd; const sp=560, a=b.aim+rand(-0.04,0.04);
          bullets.push({ x:b.cx+Math.cos(a)*18, y:b.cy+Math.sin(a)*18-4, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
            life:def.range/sp+0.12, owner:b, dmg:def.dmg, r:3, color:'#ffe08a' });
          b.muzzle=0.06; sfx('turret'); } }
    } else if(def.key==='spikes'){
      b.tick-=dt;
      if(b.tick<=0){ b.tick=0.35; let hit=false;
        for(const z of zombies){ if(!z.alive) continue;
          if(z.x>b.x-2&&z.x<b.x+b.w+2&&z.y>b.y-2&&z.y<b.y+b.h+2){ hit=true; hurt(z, def.dps*0.35, null, false); } }
        if(hit){ b.hp-=9; for(let k=0;k<3;k++) spark(b.cx+rand(-16,16), b.cy+rand(-14,14), '#c0303a', rand(30,90), rand(0,TAU), .3); } }
    }
    if(b.hp<=0) removeBuild(i);
  }
}
function makeScrap(x,y,amt){ return { x:x+rand(-8,8), y:y+rand(-8,8), amt, r:9, t:rand(0,3), life:24 }; }
function updateScraps(dt){
  for(let i=scraps.length-1;i>=0;i--){ const s=scraps[i]; s.t+=dt; s.life-=dt;
    if(player && player.alive && dist2(s.x,s.y,player.x,player.y)<(R+s.r+4)*(R+s.r+4)){
      player.scrap=(player.scrap||0)+s.amt; sfx('pickup');
      floaters.push({x:s.x, y:s.y-16, vy:-34, t:0.7, txt:'+'+s.amt+'🔩', col:'#e8cf9a'});
      for(let k=0;k<6;k++) spark(s.x,s.y,'#caa46a',rand(40,120),rand(0,TAU),.4);
      scraps.splice(i,1); continue; }
    if(s.life<=0) scraps.splice(i,1);
  }
}
function updateGrapple(h,dt){
  const g=h.grap; if(!g) return;
  if(h.perkGrappleDamage){
    g.perkHits=g.perkHits||new Set();
    for(const e of perkTargets(h,h.x,h.y,PERK_TUNE.grappleRadius)){
      if(g.perkHits.has(e)) continue;
      g.perkHits.add(e); perkStrike(h,e,PERK_TUNE.grappleDamage,h.x,h.y);
    }
  }
  g.t+=dt;
  g.len=Math.max(GRAPPLE.minLen, g.len-GRAPPLE.reel*dt);
  const dx=g.ax-h.x, dy=g.ay-h.y, d=Math.hypot(dx,dy);
  if(g.t>GRAPPLE.maxT || d<=GRAPPLE.minLen*1.2){ grappleRelease(h); return; }
  if(d>1e-4 && d>g.len){                          // TAUT: F = k·stretch − c·v_radial, never pushes
    const rx=dx/d, ry=dy/d;
    const vTo=h.vx*rx+h.vy*ry;                    // radial speed toward the anchor
    const F=GRAPPLE.k*(d-g.len) - GRAPPLE.c*vTo;  // accel: k in s^-2 · stretch px, c in s^-1
    if(F>0){ h.vx+=rx*F*dt; h.vy+=ry*F*dt; }
    if(Math.random()<dt*24) spark(h.x-rx*8,h.y-ry*8,'#d8c49a',rand(20,60),Math.atan2(-ry,-rx)+rand(-.5,.5),.3);
  }
  const v=Math.hypot(h.vx,h.vy);
  if(v>GRAPPLE.maxV){ h.vx*=GRAPPLE.maxV/v; h.vy*=GRAPPLE.maxV/v; }
}
// Spitter acid gob — an enemy projectile (owner=zombie) that only hurts humans, arcs at the prey
function spitAcid(z,tgt){
  const spd=306, lead=0.14, tx=tgt.x+(tgt.vx||0)*lead, ty=tgt.y+(tgt.vy||0)*lead;
  const a=Math.atan2(ty-z.y,tx-z.x);
  bullets.push({ x:z.x+Math.cos(a)*z.r, y:z.y+Math.sin(a)*z.r-6, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
    life:520/spd, owner:z, dmg:z.dmg, enemy:true, acid:true, hits:0, r:5, color:'#b6ff3a' });
  sfx('spit',null,z);
}
// Bloater death burst — an acid AoE that only damages humans (falls off with distance)
function zombieBurst(e){
  const RAD=98, RAD2=RAD*RAD;
  for(let i=0;i<26;i++) spark(e.x,e.y-4, i%2?'#b6ff3a':'#7fd63a', rand(70,260), rand(0,TAU), .75);
  rings.push({x:e.x, y:e.y, t:0, dur:0.5, r0:10, r1:RAD, col:'150,240,70', lw:4});
  splats.push({x:e.x, y:e.y+6, r:26, t:6, col:'rgba(96,150,34,'});
  shake=Math.min(shake+5,14);
  for(const o of humans){ if(!o.alive) continue; const d2=dist2(e.x,e.y,o.x,o.y);
    if(d2<RAD2){ const dd=e.dmg*1.7*(1-Math.sqrt(d2)/RAD); if(dd>0){ hurt(o, Math.max(8,dd), null, true); if(o.isPlayer) shake=Math.min(shake+3,15); } } }
  sfx('boom',null,e);
}
// Shaman support pulse — nearby zombies get a short movement frenzy, forcing the player to
// decide whether to burn down the support unit or kite the sped-up pack.
function zombieBuff(z){
  const RAD=245, RAD2=RAD*RAD;
  rings.push({x:z.x, y:z.y, t:0, dur:0.55, r0:12, r1:RAD, col:'96,247,255', lw:3});
  floaters.push({x:z.x, y:z.y-34, vy:-30, t:0.75, txt:'FRENZY', col:'#61f7ff'});
  for(let i=0;i<16;i++) spark(z.x,z.y-14, i%2?'#61f7ff':'#b9ffff', rand(70,210), rand(0,TAU), .55);
  for(const o of zombies){ if(!o.alive || o===z) continue;
    if(dist2(z.x,z.y,o.x,o.y)<RAD2) o.frenzyT=Math.max(o.frenzyT||0,3.2); }
  sfx('warn',null,z);
}
function explode(b){
  const RAD=130*(activeMutator?.bombRadMul||1), RAD2=RAD*RAD;
  for(let i=0;i<30;i++) spark(b.x,b.y, i%2?'#ffb13d':'#ff5a2a', rand(80,360), rand(0,TAU), .8);
  rings.push({x:b.x, y:b.y, t:0, dur:0.45, r0:14, r1:RAD+30, col:'255,200,110', lw:5});
  rings.push({x:b.x, y:b.y, t:0, dur:0.7,  r0:8,  r1:RAD,    col:'255,255,255', lw:2.5});
  shake=Math.min(shake+8,16);
  for(const z of zombies) if(z.alive && dist2(b.x,b.y,z.x,z.y)<RAD2) hurt(z, 90, b.owner, false);
  for(const o of humans) if(o.alive && dist2(b.x,b.y,o.x,o.y)<RAD2){ const dd = 110*(1-Math.sqrt(dist2(b.x,b.y,o.x,o.y))/RAD); hurt(o, Math.max(30,dd), b.owner, true); }
  sfx('boom',null,b);
}

