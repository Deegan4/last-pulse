// ---------- Combat (melee) ----------
// Swing state lives on the fighter: swingT/swingDur (current swing anim), swingStep (combo index),
// swingArc (half-arc of this swing's sweep) and comboWin (time left to chain the next combo hit).
// Hit detection is instant on the press — distance <= reach + target radius and within the weapon's
// half-arc of h.aim — and the drawn swing (swingAngle) is purely visual on top of that.
const COMBO_STEPS = 3, FINISHER_MUL = 1.8;
function swingAngle(h){
  if(!(h.swingT>0) || !h.swingDur) return 0;
  if(h.weapon && h.weapon.mode==='thrust') return 0;
  const p = 1 - h.swingT/h.swingDur, e = 1-(1-p)*(1-p);               // ease-out: fast strike, slow follow-through
  const dir = (h.swingStep%2) ? -1 : 1, arc = h.swingArc||0.8;
  return dir * (-arc + 2*arc*e);
}
function swingThrust(h){      // 0..1 forward lunge of the weapon for thrust-mode swings (visual only)
  if(!(h.swingT>0) || !h.swingDur || !h.weapon || h.weapon.mode!=='thrust') return 0;
  const p = 1 - h.swingT/h.swingDur; return Math.sin(p*Math.PI);
}
function attack(h){
  if(!h.alive || grace>0 || h.fireCd>0) return;
  const w=h.weapon, mode=w.mode;
  // combo chain: swinging again inside comboWin advances the step; the 3rd hit is the finisher
  let step = 0;
  if(mode==='combo') step = h.comboWin>0 ? (h.swingStep+1)%COMBO_STEPS : 0;
  else step = (h.swingStep+1)%2;
  const fin = mode==='combo' && step===COMBO_STEPS-1;
  const cdMul = h.isPlayer ? (h.perkCdMul||1) : (h.fireMul||1);
  h.fireCd = w.fireCd * cdMul * (fin?1.6:1);
  h.swingStep = step;
  h.swingDur = clamp(w.fireCd*0.8, 0.1, 0.42) * (fin?1.3:1);
  h.swingT = h.swingDur;
  h.swingArc = (w.sweep||0.8) * (fin?1.4:1) * (mode==='thrust'?0:1);
  h.comboWin = h.fireCd + 0.45;
  const reach = w.reach * (h.isPlayer?(h.perkReachMul||1):1) * (fin?1.12:1);
  const sweep = (w.sweep||0.8) * (fin?1.4:1);
  const perkCritHit = !!(h.isPlayer && h.perkCrit && Math.random()<h.perkCrit);   // Critical Strikes perk: whole swing deals double
  if(perkCritHit) floaters.push({x:h.x, y:h.y-R-30, vy:-46, t:0.6, txt:'CRIT ×2', col:'#ffd24a'});
  const dmgMul = (h.isPlayer ? magMulMeta()*(activeMutator?.dmgOutMul||1)*(h.perkDmgMul||1)*(perkCritHit?2:1) : 1) * (fin?FINISHER_MUL:1);
  const dmg = w.dmg*dmgMul;
  const cap = mode==='jab'?1 : mode==='thrust'?4 : mode==='combo'?(fin?6:3) : 99;
  const heavy = mode==='heavy' || fin;
  // gather targets in the arc (nearest first)
  const hits=[];
  const consider = e=>{
    if(!e.alive || e===h || e.amb) return;
    if(humans.includes(e) && e.team===h.team) return;
    const dx=e.x-h.x, dy=e.y-h.y, d=Math.hypot(dx,dy), er=e.r||R;
    if(d>reach+er) return;
    if(d>er+6){ let da=Math.atan2(dy,dx)-h.aim; da=Math.abs(((da+Math.PI)%TAU+TAU)%TAU-Math.PI);
      if(da>sweep+Math.min(0.6,er/Math.max(d,1))) return; }
    hits.push({e,d});
  };
  for(const z of zombies) consider(z);
  for(const o of humans) consider(o);
  hits.sort((a,b)=>a.d-b.d);
  if(hits.length>cap) hits.length=cap;
  const ca=Math.cos(h.aim), sa=Math.sin(h.aim);
  const isHero = !!h.isPlayer;
  for(const {e} of hits){
    const wasZombie = !e.weapon;
    hurt(e, dmg, h, !wasZombie);
    if(wasZombie && !e.boss){ const kb = (fin?150: mode==='heavy'?(w.dmg>=80?210:120): mode==='thrust'?70: 36);
      e.vx += ca*kb; e.vy += sa*kb; }
    for(let k=0;k<(heavy?7:4);k++) spark(e.x-ca*(e.r||R)*0.5, e.y-6, pick(['#fff3c0','#ffd06a','#ffffff']), rand(60,200), h.aim+rand(-0.9,0.9), rand(.15,.3));
  }
  // Cleave perk: the first target's hit splashes onto one other nearby enemy
  if(hits.length && h.perkRicochet){
    const f=hits[0].e, other=perkTargets(h,f.x,f.y,PERK_TUNE.ricochetRange).find(t=>t!==f && !hits.some(x=>x.e===t));
    if(other) perkStrike(h,other,dmg*PERK_TUNE.ricochetMul,f.x,f.y);
  }
  if(fin && hits.length) finisherBlast(h);
  // feel: lunge into the swing, hit-stop on contact, shake on heavy hits
  const lunge = heavy ? 120 : mode==='thrust' ? 150 : 70;
  if(isHero) { h.vx += ca*lunge; h.vy += sa*lunge*0.4; }
  if(hits.length){
    if(isHero){ hitstop=Math.max(hitstop, heavy?0.07:0.03);
      if(heavy) shake=Math.min(shake+(w.dmg>=80?7:4), 14);
      if(h.gpIndex!=null && heavy) gpRumble(h.gpIndex,70,0.2,clamp(w.dmg/120,0.3,0.7)); }
  }
  slashes.push({x:h.x, y:h.y-10, a:h.aim, reach, sweep, step, thrust:mode==='thrust', fin, heavy,
    t:0, dur:heavy?0.22:0.16, col:fin?'#ffd24a':'#ffffff', hit:hits.length>0});
  sfx('swing', heavy?'heavy':null, h);
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
  // zombie stagger: a damage-scaled shove along the shot so hits visibly land (bosses barely flinch).
  // z.vx/vy are re-lerped toward the chase target every frame, so the shove decays on its own.
  if(!e.isPlayer && !e.weapon && src && src!==e && dmg>0){
    const sa=Math.atan2(e.y-src.y, e.x-src.x), sk=clamp(dmg*2.4,40,190)*(e.boss?0.2:1);
    e.vx+=Math.cos(sa)*sk; e.vy+=Math.sin(sa)*sk; }
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
  // last zombie of a wave: an extended slow-mo beat so clearing a wave reads as an event
  if(gameMode==='horde' && !e.isPlayer && !e.weapon && src && src.isPlayer && !zombies.some(z=>z.alive)) hitstop=0.45;
  if(src && src!==e){
    src.kills = (src.kills||0)+1;
    if(src.isPlayer){
      if(src.perkLifesteal) src.hp=Math.min(src.maxhp, src.hp+src.perkLifesteal);
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
    if(activeMutator?.volatile && !e.boom) volatileBurst(e,src);
    if(e.boom) zombieBurst(e);      // bloater ruptures into an acid cloud
    const scrapMul = (activeMutator?.scrapMul||1)*((src&&src.isPlayer&&src.perkScrapMul)||1);   // Rich Vein mutator
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
    if(e.isPlayer2 && player && player.alive){ reviveT=0; toast('⛑ Player 2 is down — stand next to them to revive!'); }
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
function finisherBlast(h){
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

