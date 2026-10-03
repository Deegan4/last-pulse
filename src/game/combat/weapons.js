// ---------- Combat ----------
// effective magazine capacity for a fighter (base weapon mag × their extended-mag multiplier).
// Bots have no magMul → 1×; the player's is set from the shop upgrade at match start.
function magCap(h){ return Math.max(1, Math.round(h.weapon.mag * (h.magMul||1))); }
function startReload(h){ if(h.reloading<=0 && h.mag<magCap(h)) h.reloading=h.weapon.reload; }
// per-weapon firing feel: tracer look (col/lw/tl/glow/tip), muzzle radius (mz),
// recoil kick, spark count/spread, knockback push, and player screen shake.
function bulletFx(w){
  switch(w.name){
    case 'Sniper':   return {col:'#cdecff',lw:4.5,tl:0.05, glow:12,tip:2.6, mz:10, kick:1.9, sparks:8, spread:.5, push:34, shake:6};
    case 'Crossbow': return {col:'#d8b46a',lw:3,  tl:0.07, glow:5, tip:1.6, mz:3,  kick:1.2, sparks:2, spread:.3, push:20, shake:0};
    case 'Shotgun':  return {col:'#ffd9a0',lw:2,  tl:0.008,glow:0, tip:1.0, mz:11, kick:1.7, sparks:9, spread:.7, push:60, shake:5};
    case 'Magnum':   return {col:'#ffe07a',lw:3.8,tl:0.02, glow:7, tip:2.0, mz:9,  kick:1.6, sparks:7, spread:.6, push:38, shake:4};
    case 'SMG':      return {col:'#fff2c8',lw:2.2,tl:0.013,glow:0, tip:1.2, mz:6,  kick:.8,  sparks:3, spread:.5, push:18, shake:0};
    case 'Pulse SMG':return {col:'#8ff6ff',lw:2.1,tl:0.011,glow:6, tip:1.3, mz:7,  kick:.65, sparks:4, spread:.45, push:14, shake:0};
    case 'Arc Rifle':return {col:'#78d7ff',lw:3.3,tl:0.022,glow:11,tip:1.8, mz:8,  kick:1.1, sparks:7, spread:.55, push:25, shake:2};
    case 'Frost Blaster': return {col:'#c9f7ff',lw:3.0,tl:0.02, glow:9, tip:1.7, mz:7.5,kick:.95,sparks:6, spread:.55, push:22, shake:1};
    case 'Minigun':  return {col:'#fff0b0',lw:2.4,tl:0.016,glow:3, tip:1.3, mz:7,  kick:.7,  sparks:3, spread:.5, push:16, shake:0};
    case 'Tommy':    return {col:'#ffe7b0',lw:2.8,tl:0.014,glow:0, tip:1.4, mz:6.5,kick:.9,  sparks:4, spread:.5, push:20, shake:0};
    default:         return {col:'#fff3c0',lw:3.6,tl:0.022,glow:6, tip:2.2, mz:6.5,kick:1,   sparks:5, spread:.4, push:24, shake:0}; // Pistol, Rifle
  }
}
// True hand/muzzle world positions — mirror the exact transform chain drawHeroArm() uses to draw
// the gun (shoulder anchor at HERO_ARM_ANCHOR_X/Y -> CHAR_VISUAL_SCALE -> rotate to h.aim -> arm
// reach [-> barrel length]), so shots/sparks/shells leave from where the gun is actually drawn
// instead of a fixed 16px radius from the character's centre regardless of weapon or art scale
// (that mismatch was most visible on long guns like Rifle/Sniper — bullets read as firing from the
// hip). Recoil is deliberately excluded: it's a post-shot kickback animation, not part of where the
// muzzle sits at the instant a shot leaves.
function wristPos(h){ const d=HERO_ARM_REACH*CHAR_VISUAL_SCALE;
  return { x:h.x+Math.cos(h.aim)*d, y:h.y+HERO_ARM_ANCHOR_Y+Math.sin(h.aim)*d }; }
function gunTip(h){ const d=(HERO_ARM_REACH+heldWeaponLen(h.weapon)+1)*CHAR_VISUAL_SCALE;
  return { x:h.x+Math.cos(h.aim)*d, y:h.y+HERO_ARM_ANCHOR_Y+Math.sin(h.aim)*d }; }
function fire(h){
  if(!h.alive || grace>0 || h.fireCd>0 || h.reloading>0) return;
  if(h.mag<=0){ startReload(h); return; }
  const w=h.weapon; h.fireCd = w.fireCd * (h.isPlayer?1:h.fireMul);
  const range=w.range*RANGE_SCALE;
  const dmgMul = h.isPlayer ? (activeMutator?.dmgOutMul||1)*(h.perkDmgMul||1) : 1;   // Glass Cannon mutator + Heavy Rounds perk — player shots only
  if(w.mode==='flame'){
    const fspd=320, tip=gunTip(h);
    for(let i=0;i<3;i++){ const a=h.aim+rand(-0.34,0.34), sp=fspd*rand(.7,1.1);
      bullets.push({ x:tip.x, y:tip.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
        life:range/fspd, owner:h, dmg:w.dmg*dmgMul, flame:true, hits:0, r:rand(4,8),
        color: pick(['#ff9b3d','#ff6a2a','#ffd24a']) }); }
    h.mag--; sfx('flame'); if(h.mag<=0) startReload(h); return;
  }
  if(w.mode==='launcher'){
    const a=h.aim+(h.isPlayer?rand(-0.01,0.01):rand(-h.acc,h.acc)*0.5), rs=430, tip=gunTip(h);
    bullets.push({ x:tip.x, y:tip.y, vx:Math.cos(a)*rs, vy:Math.sin(a)*rs,
      life:range/rs, owner:h, dmg:w.dmg*dmgMul, boom:true, rocket:true, hits:0,
      color:'#ffcaa0', lw:5, tl:0.02, glow:9, tip:3, aim:a });
    h.mag--; h.muzzleT=0.09; h.muzzleR=12; h.recoil=2.4;
    for(let i=0;i<12;i++) spark(tip.x, tip.y, pick(['#ffd06a','#ffae3a','#c8c8c8']), rand(60,190), a+Math.PI+rand(-.7,.7));
    h.vx-=Math.cos(a)*48; h.vy-=Math.sin(a)*48; if(h.isPlayer) shake=Math.min(shake+6,14);
    sfx('shoot',w); if(h.mag<=0) startReload(h); return;
  }
  const spd = w.mode==='sniper'?1040 : w.mode==='shotgun'?560 : 780;
  const shots = w.mode==='shotgun'?6 : w.twin?2 : 1;
  const fx = bulletFx(w);
  const tip = gunTip(h);
  // bots shoot wilder during the early-match warmup (see updateBot) — softens a fresh BR drop
  const botAcc = h.isPlayer ? 0 : h.acc * (1 + 1.6*(1-clamp(elapsed/18,0,1)));
  for(let i=0;i<shots;i++){
    const spread = w.mode==='shotgun'? rand(-0.28,0.28) : (h.isPlayer?rand(-0.012,0.012):rand(-botAcc,botAcc));
    const a=h.aim+spread + (w.twin?(i===0?-0.02:0.02):0);
    const perp = w.twin?(i===0?-3:3):0;   // twin barrels fire from side-by-side muzzles
    let dmg=w.dmg*dmgMul, crit=false;
    if(w.name==='Pistol' && Math.random()<0.5){ dmg*=2; crit=true; }
    bullets.push({ x:tip.x - Math.sin(h.aim)*perp, y:tip.y + Math.cos(h.aim)*perp, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
      life:range/spd, owner:h, dmg, crit, pierce: w.mode==='sniper'||w.arc, arc:w.arc, frost:w.frost, hits:0,
      color: crit?'#ffd24a':fx.col, lw: crit?4.2:fx.lw, tl: fx.tl, glow: crit?10:fx.glow, tip: crit?2.2:fx.tip });
  }
  h.mag--;
  // muzzle flash + recoil scale with the gun
  h.muzzleT=0.06; h.muzzleR=fx.mz; h.recoil=fx.kick;
  for(let i=0;i<fx.sparks;i++) spark(tip.x, tip.y, pick(['#ffd06a','#ffae3a','#fff1bf']), rand(50,150+fx.mz*8), h.aim+rand(-1,1)*fx.spread);
  if(w.mode!=='sniper' && w.name!=='Crossbow'){ const ej=h.aim+(Math.random()<.5?1:-1)*Math.PI/2, wrist=wristPos(h);  // ejected shell (red for shotgun), from the ejection port near the hand
    spark(wrist.x, wrist.y-5, w.mode==='shotgun'?'#c0392b':'#e6c24a', rand(70,150), ej+rand(-.3,.3), .55); }
  h.vx -= Math.cos(h.aim)*fx.push; h.vy -= Math.sin(h.aim)*fx.push;
  if(h.isPlayer && fx.shake) shake=Math.min(shake+fx.shake, 14);
  sfx('shoot', w);
  if(h.mag<=0) startReload(h);
}
// if a hit lands within DOOR_HALF-ish range of a building wall, leave a drip streak on that
// wall's facade (local coords, so it moves with the building — buildings never move, so this
// is really just x-y, but local coords keep the draw side simple and match drawBuilding's frame)
function spraySplatOnWall(x, y, dmg){
  let bestWr=null, bestObs=null, bestD=22;
  for(const o of obstacles){
    if(o.type!=='building') continue;
    if(x<o.x-40||x>o.x+o.w+40||y<o.y-40||y>o.y+o.h+40) continue;
    for(const wr of wallRects(o)){
      const nx=clamp(x,wr[0],wr[0]+wr[2]), ny=clamp(y,wr[1],wr[1]+wr[3]);
      const d=Math.hypot(x-nx,y-ny);
      if(d<bestD){ bestD=d; bestWr=wr; bestObs=o; }
    }
  }
  if(!bestObs) return;
  const sx=clamp(x,bestWr[0]+3,bestWr[0]+bestWr[2]-3);
  const topY=clamp(y,bestWr[1],bestWr[1]+bestWr[3]);
  const len=Math.min(rand(14,28)+dmg*0.15, bestWr[1]+bestWr[3]-topY);
  if(len<4) return;
  wallStreaks.push({o:bestObs, x:sx-bestObs.x, y0:topY-bestObs.y, len, w:rand(2.5,4.5), t:9,
    col:'rgba(120,22,30,'});
}
function hurt(e, dmg, src, isHumanTarget){
  if(!e.alive) return;
  // Glass Cannon mutator — the player takes extra damage to match the extra damage they deal.
  if(e.isPlayer && activeMutator?.dmgInMul) dmg*=activeMutator.dmgInMul;
  // Thick Skin perk — flat incoming-damage reduction for the player.
  if(e.isPlayer && e.perkDmgInMul) dmg*=e.perkDmgInMul;
  // Carapace: a flat carapace damage reduction (distinct from the numeric shield pickup below) —
  // rewards burst weapons over chip damage, the "low-profile armored tank" wrinkle.
  if(e.armored) dmg*=0.65;
  // armor soaks damage first
  if(e.shield>0){ const a=Math.min(e.shield,dmg); e.shield-=a; dmg-=a;
    for(let i=0;i<3;i++) spark(e.x,e.y-6,'#7fc8ff',rand(40,120),rand(0,TAU),.3); }
  if(dmg>0){ e.hp -= dmg; if(e.isPlayer) matchStat.dmgTaken += dmg; }
  e.hitFlash=0.12;
  // blood: a directional spray along the shot's path (exit-wound style), sized by damage,
  // plus a close mist and — on solid hits — a splatter decal left on the ground
  const blood = '#c0303a', dark = '#8f1f28';   // everything bleeds red
  const a0 = (src && src!==e) ? Math.atan2(e.y-src.y, e.x-src.x) : rand(0,TAU);
  const n = clamp(3+Math.round(dmg/8), 3, 14);
  for(let i=0;i<n;i++) spark(e.x, e.y-4, i%3?blood:dark, rand(60,230), a0+rand(-0.55,0.55), rand(.35,.7));
  for(let i=0;i<3;i++) spark(e.x, e.y-4, blood, rand(25,80), rand(0,TAU), .3);
  if(dmg>=12 && splats.length<220)
    splats.push({x:e.x+Math.cos(a0)*rand(6,20), y:e.y+rand(2,12), r:rand(5,10)+dmg*0.06, t:4,
      col:'rgba(120,22,30,'});
  if(dmg>=12 && wallStreaks.length<160) spraySplatOnWall(e.x, e.y, dmg);
  if(dmg>0) floaters.push({x:e.x, y:e.y-R-10, vy:-34, t:0.7, txt:Math.round(dmg), col: dmg>=60?'#ffd24a':'#fff'});
  // player feedback
  if(src && src.isPlayer && dmg>0){ hitmarks.push({x:e.x,y:e.y-6,t:0.22,kill:false}); sfx('tick',null,e); }
  if(e.isPlayer && src && src!==e){ dmgDirs.push({a:Math.atan2(src.y-e.y,src.x-e.x), t:1.0});
    if(e.gpIndex!=null) gpRumble(e.gpIndex, 110, clamp(dmg/70,0.15,0.55), clamp(dmg/45,0.1,0.5)); }   // rumbles THIS player's own pad, not always pad 0
  if(e.hp<=0){
    // Second Wind perk: consume one banked revive instead of dying, once per pick.
    if(e.isPlayer && e.perkRevives>0){ e.perkRevives--; e.hp=Math.round(e.maxhp*0.5); e.burn=0;
      shake=Math.min(shake+12,18); toast('💗 SECOND WIND — back up!'); sfx('level');
      for(let i=0;i<16;i++) spark(e.x,e.y,'#7bff8a',rand(80,220),rand(0,TAU),.7);
      return; }
    die(e, src, isHumanTarget);
  }
}
function die(e, src, isHumanTarget){
  e.alive=false; e.hp=0; e.burn=0;
  const gore = '#c0303a', goreCol = 'rgba(120,22,30,';   // red blood for everyone
  const ka = (src && src!==e) ? Math.atan2(e.y-src.y, e.x-src.x) : rand(0,TAU);
  for(let i=0;i<14;i++) spark(e.x,e.y, gore, rand(60,240), rand(0,TAU), .9);            // burst
  for(let i=0;i<12;i++) spark(e.x,e.y-4, i%3?gore:'#8f1f28',                            // directional gout
    rand(120,300), ka+rand(-0.4,0.4), rand(.5,.9));
  splats.push({x:e.x, y:e.y+6, r:rand(16,26), t:7, col:goreCol});
  for(let k=0;k<2;k++) splats.push({x:e.x+Math.cos(ka)*rand(14,34)+rand(-8,8),           // satellite pools
    y:e.y+6+rand(-6,14), r:rand(6,12), t:6, col:goreCol});
  if(wallStreaks.length<160) spraySplatOnWall(e.x, e.y, 24);
  sfx('die',null,e);
  if(src && src!==e){
    src.kills = (src.kills||0)+1;
    if(src.isPlayer){
      shake=Math.min(shake+5,14); if(src.gpIndex!=null) gpRumble(src.gpIndex, 90, 0.25, 0.6);
      hitmarks.push({x:e.x,y:e.y-6,t:0.42,kill:true}); sfx('kill',null,e);
      // kill combo: chain kills inside the window for up to 3x XP + escalating slow-mo
      combo = comboT>0 ? combo+1 : 1; comboT=COMBO_WIN;
      if(combo>matchStat.bestCombo) matchStat.bestCombo=combo;
      const mult = Math.min(1+(combo-1)*0.25, 3);
      hitstop = Math.min(0.045+combo*0.012, 0.12);
      if(combo>=2){ sfx('combo', combo);
        floaters.push({x:e.x, y:e.y-R-24, vy:-40, t:0.9, txt:'COMBO x'+combo, col:'#ffd24a'}); }
      // EVERY player kill counts (v2.33.0: horde is the only mode, so zombie kills must feed
      // the counter, streaks, and the end-of-match economy — they used to be human-only)
      killsTotal++;
      killStorm(src,e);
      const now=performance.now()/1000;
      player.streak = (now - player.lastKillT < 4.5) ? player.streak+1 : 1;
      player.lastKillT = now;
      if(player.streak>=2) showStreak(player.streak);      // no '+1 KILL' toast — too spammy at horde kill rates
      if(grantXp(Math.round((isHumanTarget?28:8)*mult))) levelToast();
    }
  }
  if(!isHumanTarget){ // zombie death pop
    rings.push({x:e.x, y:e.y, t:0, dur:0.3, r0:5, r1:30*(e.size||1), col:'150,200,90', lw:3});
    if(e.boom) zombieBurst(e);      // bloater ruptures into an acid cloud
    const scrapMul = activeMutator?.scrapMul||1;   // Rich Vein mutator
    // boss loot table — guaranteed, unlike the regular corpse's 62% scrap roll: a big scrap
    // bundle plus 2 always-good pickups (never plain health), so a boss kill always feels worth it
    if(e.boss){
      scraps.push(makeScrap(e.x, e.y, Math.round(randi(10,14)*scrapMul)));
      const bossPool=['medkit','armor','weapon']; const angles=[0.9,-0.9];
      angles.forEach((off,i)=>{ const a=ka+off, r=34+i*10;
        pickups.push(makePickup(e.x+Math.cos(a)*r, e.y+Math.sin(a)*r, i===0?pick(bossPool):'weapon')); });
      toast((e.kind==='colossus'?'☠ COLOSSUS':'☠ JUGGERNAUT')+' DOWN — loot dropped!'); sfx('loot');
    // scrap salvage — the building currency; bigger corpses yield more
    } else if(scraps.length<40 && Math.random()<0.62){ const big=(e.size||1)>=1.3, run=(e.size||1)<0.86;
      scraps.push(makeScrap(e.x, e.y, Math.round((big?randi(5,8):(run?randi(1,2):randi(2,4)))*scrapMul))); } }
  if(e.isPlayer){ shake=Math.min(shake+10,18); }
  if(isHumanTarget){
    // isPlayer2 checked FIRST: it's the more specific case, and must win over the plain isPlayer
    // branch below (player 2 is also isPlayer:true — that's what exempts them from bot AI — so
    // checking isPlayer alone here would misattribute every player-2 kill/death to player 1's name)
    const victim = e.isPlayer2?e.name : e.isPlayer?meta.name:e.name;
    const killer = src ? (src.weapon ? (src.isPlayer2?src.name : src.isPlayer?meta.name:src.name) : 'A zombie') : 'The safe zone';
    killFeed.unshift({ txt: killer+'  ☠  '+victim, t:5, you: e.isPlayer || (src&&src.isPlayer) });
    if(killFeed.length>4) killFeed.pop();
    checkEnd();
  }
}

// Perk attacks share ownership with weapon kills, but never hit allies.
function perkTargets(h,x,y,r){
  return [...zombies,...humans].filter(e=>e.alive && e!==h &&
    (!humans.includes(e)||e.team!==h.team) && dist2(x,y,e.x,e.y)<r*r)
    .sort((a,b)=>dist2(x,y,a.x,a.y)-dist2(x,y,b.x,b.y));
}
function perkStrike(h,e,dmg,x,y){
  zaps.push({x1:x,y1:y,x2:e.x,y2:e.y,t:0.18});
  hurt(e,dmg,h,humans.includes(e));
}
function ricochetHit(b,e){
  if(!b.owner?.perkRicochet || b.flame || b.boom || b.ricochetUsed) return;
  b.ricochetUsed=true;
  const target=perkTargets(b.owner,e.x,e.y,PERK_TUNE.ricochetRange).find(t=>t!==e);
  if(target) perkStrike(b.owner,target,b.dmg*PERK_TUNE.ricochetMul,e.x,e.y);
}
function reloadBlast(h){
  if(!h.perkReloadBlast || elapsed<(h.perkReloadReady||0) || grace>0) return;
  h.perkReloadReady=elapsed+PERK_TUNE.reloadCooldown;
  rings.push({x:h.x,y:h.y,t:0,dur:0.35,r0:8,r1:PERK_TUNE.reloadRadius,col:'255,170,70',lw:4});
  for(const e of perkTargets(h,h.x,h.y,PERK_TUNE.reloadRadius))
    hurt(e,PERK_TUNE.reloadDamage,h,humans.includes(e));
  sfx('boom');
}
function killStorm(h,e){
  if(!h.alive || !h.perkKillLightning || h.perkStormActive) return;
  h.perkKillCount=(h.perkKillCount||0)+1;
  if(h.perkKillCount<PERK_TUNE.lightningKills) return;
  h.perkKillCount=0; h.perkStormActive=true;
  try{ for(const t of perkTargets(h,e.x,e.y,PERK_TUNE.lightningRange).slice(0,PERK_TUNE.lightningTargets))
    perkStrike(h,t,PERK_TUNE.lightningDamage,e.x,e.y);
  } finally { h.perkStormActive=false; }
}

