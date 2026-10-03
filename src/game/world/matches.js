// ===== Ambient menu scene =====
// The menu screens are translucent, so the live canvas shows through them. While no match is
// running we keep a little horde shambling (and runners sprinting) across the field behind the
// menus. They live in the normal `zombies` array (drawZombie animates them for free) but carry
// z.amb so only the ambient mover touches them; spawnMatch wipes the array and clears the flag.
let menuAmbient=false;
function menuScene(){
  zombies.length=0; bullets.length=0; bombs.length=0; zaps.length=0;
  if(!decor.length) buildDecor();                        // first boot: give the menu real scenery
  menuAmbient=true;
  const cx=(player&&player.x)||ARENA/2, cy=(player&&player.y)||ARENA/2;
  for(let i=0;i<14;i++){
    const kind=pick(['normal','normal','normal','normal','runner','runner','brute']);
    const dir=Math.random()<0.5?-1:1;
    const z=makeZombie(clamp(cx+rand(-520,520),R,ARENA-R), clamp(cy+rand(-620,620),R,ARENA-R), kind);
    z.amb={dir}; z.faceX=dir; z.vx=dir*z.speed*0.85; z.vy=rand(-8,8); z.walk=rand(0,TAU);
    zombies.push(z);
  }
}
function menuSceneUpdate(dt){
  if(!menuAmbient) return;
  const cx=(player&&player.x)||ARENA/2;
  for(const z of zombies){ if(!z.amb) continue;
    z.x+=z.vx*dt; z.y+=z.vy*dt; z.walk+=dt*6;
    if((z.amb.dir>0 && z.x>cx+560) || (z.amb.dir<0 && z.x<cx-560)){   // crossed the view → wrap
      z.amb.dir*=-1; z.faceX=z.amb.dir; z.vx=z.amb.dir*z.speed*0.85;
      z.y=clamp(((player&&player.y)||ARENA/2)+rand(-620,620),R,ARENA-R); }
  }
}
function spawnMatch(){
  humans.length=0; zombies.length=0; bullets.length=0; bombs.length=0; zaps.length=0;
  particles.length=0; floaters.length=0; killFeed.length=0; zoneWarn=0;
  pickups.length=0; drops.length=0; hitmarks.length=0; splats.length=0; wallStreaks.length=0; dmgDirs.length=0; confetti=[]; rings.length=0;
  builds.length=0; scraps.length=0;
  killsTotal=0; nextDrop=18; streakT=0; victoryT=0; hordeWave=0; mapEscalations=0; zReinforce=rand(10,14); activeMutator=null;
  hordeStallT=0; hordeLastAlive=0;
  combo=0; comboT=0; hitstop=0;
  menuAmbient=false;                                     // real match takes over the canvas
  matchStat={dmgTaken:0, grappled:false, bestCombo:0};   // per-match feats for achievements
  player2 = null; reviveT = 0;   // fresh match always starts solo; tryJoinPlayer2() re-adds them if a 2nd pad is present
  buildDecor();
  // interior loot — every house hides a pickup (a reason to step inside)
  for(const o of obstacles) pickups.push(makePickup(o.x+o.w/2+rand(-12,12), o.y+o.h*0.55));
  // player
  player = makeHuman(true, AVATARS[meta.avatar], WEAPONS[meta.weapon], meta.name||'deegan');
  player.team=0; player.gpIndex=0; const p=farSpawn(ARENA*0.18); player.x=p.x; player.y=p.y;
  player.lightCd=0; player.bombCd=0; player.grapCd=0; player.grap=null;
  player.scrap=0; player.buildSel=-1; player.placeCd=0;   // builder state (start with mode off)
  player.magMul=magMulMeta(); player.mag=magCap(player);  // Extended Magazines upgrade → wider mag, start full
  humans.push(player);
  tryJoinPlayer2(connectedPads());   // catch a 2nd controller that was ALREADY connected before drop-in, not just one that connects mid-match
  // scattered scrap caches — a reason to explore; seeds your first walls before the first kills
  for(let i=0;i<10;i++){ const s=decorSpot(90); scraps.push(makeScrap(s.x,s.y,randi(4,8))); }

  if(gameMode==='horde'){
    fieldSize=1; hordeWave=1;
    activeMutator = pickMutator();
    if(activeMutator){
      if(activeMutator.fog) timeOfDay='night';
      toast(activeMutator.icon+' '+activeMutator.name+' — '+activeMutator.desc);
      el('statMut').textContent = activeMutator.icon+' '+activeMutator.name;
      el('mutRow').classList.remove('is-hidden');
    } else el('mutRow').classList.add('is-hidden');
    // two 2-story watchtowers to climb and shoot down from (Horde only)
    for(let i=0;i<2;i++){ let sp,tries=0; do{ sp=decorSpot(210); tries++; }
      while(tries<24 && dist2(sp.x,sp.y,player.x,player.y)<280*280);
      const tw={type:'tower', tower:true, x:clamp(sp.x-TOWER_W/2,120,ARENA-120-TOWER_W), y:clamp(sp.y-TOWER_H/2,120,ARENA-120-TOWER_H),
        w:TOWER_W, h:TOWER_H, roof:'#6b7178'};
      obstacles.push(tw); decor.push(tw); }
    const n=Math.round(10*(activeMutator?.zMul||1)); for(let i=0;i<n;i++){ const s=farSpawn(ARENA*0.18); zombies.push(makeZombie(s.x,s.y)); }
  } else if(gameMode==='squad'){
    fieldSize=16;
    const allyNames=['Buddy','Scout','Doc','Tank'];
    for(let i=0;i<3;i++){ const a=newBot(0, allyNames, i); a.ally=true; a.name=allyNames[i]; humans.push(a); }
    for(let i=0;i<12;i++){ const e=newBot(0, null, i); e.team=1+Math.floor(i/4); humans.push(e); } // 3 enemy squads of 4
    for(let i=0;i<8;i++){ let s,tries=0; do{ s=farSpawn(ARENA*0.12); tries++; }
      while(dist2(s.x,s.y,player.x,player.y)<420*420 && tries<12); zombies.push(makeZombie(s.x,s.y)); }
    for(let i=0;i<9;i++){ const s=farSpawn(ARENA*0.1); pickups.push(makePickup(s.x,s.y)); }
  } else { // br
    fieldSize=15;
    for(let i=0;i<14;i++){ const b=newBot(i+1, null, i); b.name=b.avatar.name + (i>5? ' '+randi(2,9):''); humans.push(b); }
    for(let i=0;i<6;i++){ let s,tries=0; do{ s=farSpawn(ARENA*0.12); tries++; }
      while(dist2(s.x,s.y,player.x,player.y)<520*520 && tries<12); zombies.push(makeZombie(s.x,s.y)); }
    for(let i=0;i<9;i++){ const s=farSpawn(ARENA*0.1); pickups.push(makePickup(s.x,s.y)); }
  }
}
const PKINDS=['health','health','medkit','armor','ammo','weapon'];
const PKCOL={health:{bg:'#1f5a2a',line:'#5fd35f'}, medkit:{bg:'#7a1f24',line:'#ff5a6e'},
  armor:{bg:'#1f3a5a',line:'#5fa8ff'}, ammo:{bg:'#5a431f',line:'#ff9b3d'}, weapon:{bg:'#3a1f5a',line:'#c08bff'}};
const PKGLYPH={health:'+', medkit:'✚', armor:'▽', ammo:'≡', weapon:'★'};
const PKMSG={health:'+30 HP', medkit:'FULL HEAL', armor:'+50 ARMOR', ammo:'AMMO REFILL', weapon:'NEW WEAPON'};
function makePickup(x,y,kind){ kind=kind||pick(PKINDS); return {x,y,kind,r:13,t:rand(0,3),w: kind==='weapon'?pick(WEAPONS):null}; }
function ignite(e,src){ e.burn=Math.max(e.burn||0, 2.6); e.burnSrc=src; }
function aliveHumans(){ let n=0; for(const h of humans) if(h.alive) n++; return n; }
function nearestHuman(e, fromHumansOnly){
  let best=null, bd=Infinity;
  for(const h of humans){ if(!h.alive || h===e) continue;
    const d=dist2(e.x,e.y,h.x,h.y); if(d<bd){bd=d;best=h;} }
  if(!fromHumansOnly){ for(const z of zombies){ if(!z.alive) continue;
    const d=dist2(e.x,e.y,z.x,z.y); if(d<bd){bd=d;best=z;} } }
  return {o:best, d:Math.sqrt(bd)};
}
// team-aware: nearest enemy human (different team) or any zombie
function botTarget(e){
  let best=null, bd=Infinity;
  for(const h of humans){ if(!h.alive || h===e || h.team===e.team) continue;
    const d=dist2(e.x,e.y,h.x,h.y); if(d<bd){bd=d;best=h;} }
  for(const z of zombies){ if(!z.alive) continue; const d=dist2(e.x,e.y,z.x,z.y); if(d<bd){bd=d;best=z;} }
  return {o:best, d:Math.sqrt(bd)};
}

