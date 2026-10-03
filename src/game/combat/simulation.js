const SEP_CELL = 64, SEP_GRID_OFFSET = 8192;
function sepKey(cx,cy){ return (cx+SEP_GRID_OFFSET)*8192 + (cy+SEP_GRID_OFFSET); }
function separate(){
  const all=[...humans.filter(h=>h.alive), ...zombies.filter(z=>z.alive)];
  const n=all.length;
  const grid=new Map();
  for(let i=0;i<n;i++){ const e=all[i];
    const key=sepKey(Math.floor(e.x/SEP_CELL), Math.floor(e.y/SEP_CELL));
    let bucket=grid.get(key); if(!bucket){ bucket=[]; grid.set(key,bucket); } bucket.push(i); }
  for(let i=0;i<n;i++){ const a=all[i];
    const cx=Math.floor(a.x/SEP_CELL), cy=Math.floor(a.y/SEP_CELL);
    for(let gx=cx-1; gx<=cx+1; gx++) for(let gy=cy-1; gy<=cy+1; gy++){
      const bucket=grid.get(sepKey(gx,gy)); if(!bucket) continue;
      for(const j of bucket){ if(j<=i) continue;
        const b=all[j];
        const dx=b.x-a.x,dy=b.y-a.y,d=len(dx,dy),min=(a.r||R)+(b.r||R);
        if(d>0&&d<min){ const p=(min-d)/2,nx=dx/d,ny=dy/d; a.x-=nx*p;a.y-=ny*p;b.x+=nx*p;b.y+=ny*p; } } } }
}
function updateBullets(dt){
  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i];
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; let gone=false;
    if(obstacles.length && bulletInObstacle(b)){
      if(b.boom){ gone=true; }
      else { for(let k=0;k<4;k++) spark(b.x,b.y,'#cdbf9a',rand(30,100),rand(0,TAU),.25); bullets.splice(i,1); continue; } }
    if(!gone && !b.enemy) for(const z of zombies){ if(!z.alive) continue;   // enemy acid passes through zombies
      if(dist2(b.x,b.y,z.x,z.y)<(z.r+3)*(z.r+3)){
        if(b.boom){ gone=true; break; }
        hurt(z,b.dmg,b.owner,false); ricochetHit(b,z); if(b.flame) ignite(z,b.owner); if(b.frost) z.slowT=Math.max(z.slowT||0,2.0);
        if(b.arc && b.hits===0){ const n=nearestHuman(z,false).o; if(n&&n!==b.owner&&n!==z){ hurt(n,b.dmg*.55,b.owner,!!n.isPlayer); zaps.push({x1:z.x,y1:z.y,x2:n.x,y2:n.y,t:.18}); } }
        if(!b.flame) for(let k=0;k<5;k++) spark(b.x,b.y,'#fff',rand(40,160),rand(0,TAU),.3);
        b.hits++; if(!b.pierce||b.hits>(b.flame?0:2)){gone=true;} break; } }
    if(!gone) for(const h of humans){ if(!h.alive||h===b.owner||(b.owner&&h.team===b.owner.team)) continue;
      if(dist2(b.x,b.y,h.x,h.y)<(R+3)*(R+3)){
        if(b.boom){ gone=true; break; }
        hurt(h,b.dmg,b.owner,true); ricochetHit(b,h); if(b.flame) ignite(h,b.owner); if(b.frost) h.slowT=Math.max(h.slowT||0,1.6);
        if(b.arc && b.hits===0){ const n=nearestHuman(h,false).o; if(n&&n!==b.owner&&n!==h){ hurt(n,b.dmg*.55,b.owner,!!n.isPlayer); zaps.push({x1:h.x,y1:h.y,x2:n.x,y2:n.y,t:.18}); } }
        h.vx+=b.vx*0.04; h.vy+=b.vy*0.04;
        if(!b.flame) for(let k=0;k<5;k++) spark(b.x,b.y,'#fff',rand(40,160),rand(0,TAU),.3);
        b.hits++; if(!b.pierce||b.hits>(b.flame?0:2)){gone=true;} break; } }
    const oob = b.x<0||b.y<0||b.x>ARENA||b.y>ARENA;
    if(gone||b.life<=0||oob){
      if(b.boom && !oob) explode(b);   // rockets detonate on impact / at max range (not off-map)
      bullets.splice(i,1); }
  }
}
function updateBombs(dt){
  for(let i=bombs.length-1;i>=0;i--){ const b=bombs[i]; b.t+=dt;
    const k=clamp(b.t/b.fuse,0,1); b.x=lerp(b.sx,b.tx,k); b.y=lerp(b.sy,b.ty,k);
    if(b.t>=b.fuse){ explode(b); bombs.splice(i,1); } }
}
function applyPickup(h,p){
  if(p.kind==='health'){ h.hp=Math.min(h.maxhp,h.hp+30); }
  else if(p.kind==='medkit'){ h.hp=h.maxhp; }
  else if(p.kind==='armor'){ h.shield=Math.min(100,(h.shield||0)+50); }
  else if(p.kind==='ammo'){ h.mag=magCap(h); h.reloading=0; }
  else if(p.kind==='weapon'){ h.weapon=p.w; h.mag=magCap(h); h.reloading=0; }
  if(h.isPlayer){ sfx('pickup'); toast(PKMSG[p.kind]); }
  for(let i=0;i<10;i++) spark(p.x,p.y,PKCOL[p.kind].line,rand(50,160),rand(0,TAU),.5);
}
function updatePickups(dt){
  for(let i=pickups.length-1;i>=0;i--){ const p=pickups[i]; p.t+=dt; let taken=false;
    for(const h of humans){ if(!h.alive) continue;
      if(dist2(p.x,p.y,h.x,h.y) < (R+p.r+2)*(R+p.r+2)){
        if((p.kind==='health'||p.kind==='medkit') && h.hp>=h.maxhp) continue;
        if(p.kind==='armor' && (h.shield||0)>=100) continue;
        if(p.kind==='ammo' && h.mag>=magCap(h)) continue;
        applyPickup(h,p); taken=true; break; } }
    if(taken) pickups.splice(i,1);
  }
  // trickle new items inside the safe zone (avoid water/buildings)
  if(pickups.length<9 && Math.random()<dt*0.45){
    for(let tries=0;tries<8;tries++){ const a=rand(0,TAU), rr=Math.sqrt(Math.random())*zone.r*0.85;
      const px=clamp(zone.cx+Math.cos(a)*rr,120,ARENA-120), py=clamp(zone.cy+Math.sin(a)*rr,120,ARENA-120);
      if(!blockedSpawn(px,py)){ pickups.push(makePickup(px,py)); break; } } }
  // supply drops
  nextDrop-=dt;
  if(nextDrop<=0 && drops.length<2){ nextDrop=rand(24,36);
    let tx=zone.cx, ty=zone.cy;
    for(let tries=0;tries<8;tries++){ const a=rand(0,TAU), rr=Math.sqrt(Math.random())*zone.r*0.6;
      tx=clamp(zone.cx+Math.cos(a)*rr,150,ARENA-150); ty=clamp(zone.cy+Math.sin(a)*rr,150,ARENA-150);
      if(!blockedSpawn(tx,ty)) break; }
    drops.push({x:tx, y:ty-520, tx, ty, landed:false, lt:0}); if(player&&player.alive) toast('📦 SUPPLY DROP INCOMING'); }
  for(let i=drops.length-1;i>=0;i--){ const d=drops[i];
    if(!d.landed){ d.y+=340*dt; if(d.y>=d.ty){ d.y=d.ty; d.landed=true; shake=Math.min(shake+3,8);
      rings.push({x:d.x, y:d.y+8, t:0, dur:0.5, r0:10, r1:70, col:'220,200,150', lw:3});
      for(let k=0;k<10;k++) spark(d.x,d.y+8,'#cdbf9a',rand(50,160),rand(0,TAU),.5); } }
    else { d.lt+=dt;
      for(const h of humans){ if(!h.alive) continue;
        if(dist2(d.x,d.y,h.x,h.y)<(R+17)*(R+17)){
          const goodW=pick(WEAPONS.filter(w=>['Minigun','Sniper','Crossbow','Flame'].includes(w.name)));
          h.weapon=goodW; h.mag=magCap(h); h.reloading=0;
          h.shield=Math.min(100,(h.shield||0)+60); h.hp=Math.min(h.maxhp,h.hp+30);
          if(h.isPlayer){ sfx('loot'); toast('📦 '+goodW.name.toUpperCase()+' + ARMOR'); }
          for(let k=0;k<16;k++) spark(d.x,d.y,'#ffd24a',rand(60,200),rand(0,TAU),.6);
          drops.splice(i,1); break; } } }
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.life-=dt; p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.92;p.vy*=0.92;
    if(p.life<=0){ particles.splice(i,1); if(partPool.length<400) partPool.push(p); } }
  for(let i=floaters.length-1;i>=0;i--){ const f=floaters[i]; f.t-=dt; f.y+=f.vy*dt; f.vy*=0.96; if(f.t<=0) floaters.splice(i,1); }
  for(let i=zaps.length-1;i>=0;i--){ zaps[i].t-=dt; if(zaps[i].t<=0) zaps.splice(i,1); }
  for(let i=rings.length-1;i>=0;i--){ rings[i].t+=dt; if(rings[i].t>=rings[i].dur) rings.splice(i,1); }
  for(let i=killFeed.length-1;i>=0;i--){ killFeed[i].t-=dt; if(killFeed[i].t<=0) killFeed.splice(i,1); }
  for(let i=hitmarks.length-1;i>=0;i--){ hitmarks[i].t-=dt; if(hitmarks[i].t<=0) hitmarks.splice(i,1); }
  for(let i=dmgDirs.length-1;i>=0;i--){ dmgDirs[i].t-=dt; if(dmgDirs[i].t<=0) dmgDirs.splice(i,1); }
  for(let i=splats.length-1;i>=0;i--){ splats[i].t-=dt; if(splats[i].t<=0) splats.splice(i,1); }
  for(let i=wallStreaks.length-1;i>=0;i--){ wallStreaks[i].t-=dt; if(wallStreaks[i].t<=0) wallStreaks.splice(i,1); }
  if(streakT>0) streakT-=dt;
  if(comboT>0){ comboT-=dt; if(comboT<=0) combo=0; }
  if(toastT>0){ toastT-=dt; if(toastT<=0) el('toast').style.opacity='0'; }
  // respawn a few zombies over time to keep pressure
  if(zombies.filter(z=>z.alive).length<6 && Math.random()<dt*0.3){ const s=farSpawn(zone.r*0.3+60); if(s) zombies.push(makeZombie(s.x,s.y)); }
}

// ============================================================
//  End / results
// ============================================================
