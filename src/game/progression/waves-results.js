let ended=false;
// Endless Horde escalates every wave: more zombies (to a cap), tankier / a touch faster /
// hitting harder, and a meaner mix (more runners, then brutes) so late waves stay deadly
// instead of plateauing once the spawn count maxes out.
function hordeKind(wave){
  // weighted spawn table — new threats unlock and ramp as waves climb, and the plain
  // "normal" share bleeds off so late waves are dominated by specials.
  const t=[
    ['normal',  Math.max(0.10, 0.62 - wave*0.030)],
    ['runner',  Math.min(0.20 + wave*0.010, 0.40)],
  ];
  if(wave>=2) t.push(['grunt',    Math.min(0.05 + (wave-2)*0.008, 0.16)]);  // tougher shambler variant
  if(wave>=3) t.push(['brute',   Math.min(0.10 + wave*0.012, 0.30)]);
  if(wave>=4) t.push(['skitter', Math.min(0.04 + (wave-4)*0.008, 0.15)]);  // tiny speed variant
  if(wave>=4) t.push(['spitter', Math.min(0.05 + (wave-4)*0.010, 0.18)]);  // ranged pressure
  if(wave>=5) t.push(['bloater', Math.min(0.05 + (wave-5)*0.008, 0.16)]);  // area denial on death
  if(wave>=5) t.push(['crusher', Math.min(0.04 + (wave-5)*0.007, 0.14)]);  // heavy bruiser variant
  if(wave>=6) t.push(['leaper',  Math.min(0.05 + (wave-6)*0.011, 0.17)]);  // mid-range pounce pressure
  if(wave>=6) t.push(['venomspine', Math.min(0.035 + (wave-6)*0.007, 0.12)]); // fast acid variant
  if(wave>=7) t.push(['rottank', Math.min(0.035 + (wave-7)*0.006, 0.11)]); // tanky rupture variant
  if(wave>=7) t.push(['stalker', Math.min(0.06 + (wave-7)*0.012, 0.24)]);  // swarm rush
  if(wave>=8) t.push(['wraith',  Math.min(0.04 + (wave-8)*0.007, 0.13)]);  // ghostly stalker variant
  if(wave>=9) t.push(['shaman',  Math.min(0.04 + (wave-9)*0.007, 0.13)]);  // support aura priority target
  if(wave>=9)  t.push(['howler',   Math.min(0.05 + (wave-9)*0.008, 0.14)]);   // haste support — priority kill target
  if(wave>=11) t.push(['carapace', Math.min(0.05 + (wave-11)*0.008, 0.16)]);  // armored tank — rewards burst over chip damage
  if(wave>=13) t.push(['husk',     Math.min(0.04 + (wave-13)*0.008, 0.14)]);  // spawner — sustained pressure, not just bigger numbers
  let sum=0; for(const e of t) sum+=e[1];
  let r=Math.random()*sum;
  for(const e of t){ r-=e[1]; if(r<=0) return e[0]; }
  return 'normal';
}
function hordeScale(z, wave){
  const w=Math.max(0, wave-1);
  z.hp = z.maxhp = Math.round(z.maxhp*(1 + w*0.14));        // +14% HP per wave (unbounded — tanks the longer you last)
  z.dmg = Math.round(z.dmg*(1 + Math.min(w*0.05, 1.8)));   // up to +180% damage
  z.speed *= 1 + Math.min(w*0.018, 0.55);                  // up to +55% speed
}
// BR / Squad keep a light, steady zombie presence so the field doesn't go quiet
// mid-match once the early roamers are cleared. Horde has its own wave system, so this
// is skipped there. Spawns land just inside the safe zone (stay relevant as it closes)
// and never right on top of the player; the target count eases off as the lobby empties.
function reinforceZombies(dt){
  if(grace>0 || zone.state==='done') return;
  zReinforce -= dt; if(zReinforce>0) return;
  zReinforce = rand(7,11);
  let aliveZ=0; for(const z of zombies) if(z.alive) aliveZ++;
  const target = Math.min(10, 3 + aliveHumans());
  if(aliveZ>=target) return;
  const a=rand(0,TAU), rr=zone.r*rand(0.55,0.92);
  const x=clamp(zone.cx+Math.cos(a)*rr, R, ARENA-R), y=clamp(zone.cy+Math.sin(a)*rr, R, ARENA-R);
  if(!blockedSpawn(x,y) && dist2(x,y,player.x,player.y)>320*320) zombies.push(makeZombie(x,y));
}
function hordeUpdate(dt){
  if(grace>0) return;
  let aliveZ=0; for(const z of zombies) if(z.alive) aliveZ++;
  // Wave-clear watchdog: the wave only advances on a FULL clear, so a few stragglers stuck out of
  // reach (behind geometry, or while you camp a watchtower) used to freeze the counter. If kills
  // stall for a few seconds with a handful left, haul the distant stragglers back toward you so the
  // wave can actually be finished.
  if(aliveZ>0){
    if(aliveZ<hordeLastAlive) hordeStallT=0; else hordeStallT+=dt;   // reset the timer whenever something dies
    if(aliveZ<=6 && hordeStallT>=5){ hordeStallT=0;
      for(const z of zombies){ if(!z.alive) continue;
        if(dist2(z.x,z.y,player.x,player.y) > 700*700){             // only relocate the far, stranded ones
          const a=rand(0,TAU), rr=rand(320,460);
          z.x=clamp(player.x+Math.cos(a)*rr, R, ARENA-R); z.y=clamp(player.y+Math.sin(a)*rr, R, ARENA-R); z.vx=z.vy=0; } } }
  } else hordeStallT=0;
  hordeLastAlive=aliveZ;
  if(aliveZ>0) return;                                              // wave not cleared → keep fighting
  // ---- wave cleared → next wave ----
  for(let i=zombies.length-1;i>=0;i--) if(!zombies[i].alive) zombies.splice(i,1);  // prune corpses
  hordeWave++; hordeStallT=0;
  const boss = hordeWave>=5 && hordeWave%5===0;                     // every 5th wave: armored elites
  // Every 3rd wave: pause on a perk pick before the next wave spawns (hordeSpawnWave runs once the
  // player chooses). Can coincide with a boss wave (e.g. 15) — that's fine, both just fire together.
  if(hordeWave>=3 && hordeWave%3===0){ openPerkPick(boss); return; }
  hordeSpawnWave(boss);
}
function hordeSpawnWave(boss){
  toast(boss ? '☠ WAVE '+hordeWave+' · ELITES INCOMING' : 'WAVE '+hordeWave+' — CLEARED, next wave!'); sfx('warn');
  const zMul=activeMutator?.zMul||1;
  const n=Math.min((8+hordeWave*3)*zMul, 42*zMul);                 // steeper ramp so it doesn't stay trivial
  for(let i=0;i<n;i++){ let s,tries=0; do{ s=farSpawn(ARENA*0.12); tries++; }
    while(dist2(s.x,s.y,player.x,player.y)<500*500 && tries<10);
    const z=makeZombie(s.x,s.y,hordeKind(hordeWave)); hordeScale(z,hordeWave); zombies.push(z); }
  if(boss){ const nb=1+Math.floor(hordeWave/10);                    // 1 juggernaut @w5, 2 @w10-15, 3 @w20…
    for(let i=0;i<nb;i++){ let s,tries=0; do{ s=farSpawn(ARENA*0.14); tries++; }
      while(dist2(s.x,s.y,player.x,player.y)<560*560 && tries<10);
      const bigBoss=hordeWave>=15 && Math.random()<0.35;
      const z=makeZombie(s.x,s.y,bigBoss?'colossus':'juggernaut'); hordeScale(z,hordeWave); zombies.push(z); } }
  if(boss) escalateMap();   // same milestone as boss waves — the map gets meaner right when the fight does
}
function enemiesLeft(){ let n=0; for(const h of humans) if(h.alive && h.team!==player.team) n++; return n; }
function checkEnd(){
  if(ended||screenState!=='playing') return;
  if(gameMode==='horde'){ if(!player.alive){ ended=true; setTimeout(()=>showResults(false,0),700); } return; }
  const alive=aliveHumans();
  // player just died → watch the rest of the match (spectate) instead of cutting to results
  if(!player.alive && !spectating){
    if(alive<=0){ ended=true; setTimeout(()=>showResults(false,1),700); return; }
    deathPlace=alive+1; enterSpectate(); return;
  }
  if(gameMode==='squad'){ if(enemiesLeft()===0){ ended=true; if(!spectating) sfx('win');
    setTimeout(()=>showResults(!spectating, spectating?deathPlace:1),800); } return; }
  if(alive===1){ ended=true; if(!spectating) sfx('win');
    setTimeout(()=>showResults(!spectating, spectating?deathPlace:1),800); }
}
function enterSpectate(){
  spectating=true; spectateT=0; specPick();
  el('specBar').classList.remove('hidden');
  el('specPlace').textContent='#'+deathPlace;
}
function specPick(){ let best=null,bk=-2; for(const h of humans){ if(!h.alive) continue; const k=(h.kills||0)+(h.team===0?0.5:0); if(k>bk){bk=k;best=h;} } specTarget=best; }
function endSpectate(){ spectating=false; el('specBar').classList.add('hidden'); }
function ord(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
function showResults(win, place){
  screenState='results'; endSpectate(); gpFocusIdx=0;
  const horde = gameMode==='horde';
  let xpEarned = win?120:40; xpEarned += killsTotal*(horde?2:10); if(horde) xpEarned += hordeWave*15;
  xpEarned = Math.round(xpEarned*(activeMutator?.xpMul||1));   // Blood Moon mutator
  const lv=grantXp(xpEarned);
  // career stats
  meta.matches++; meta.ckills += killsTotal;
  if(win){ meta.wins++; meta.streak++; if(meta.streak>meta.bestStreak) meta.bestStreak=meta.streak; }
  else { meta.deaths++; if(!horde) meta.streak=0; }
  if(horde){ if(hordeWave>meta.bestWave) meta.bestWave=hordeWave; nativeSubmitScore(hordeWave); }
  else if(meta.best===0 || place<meta.best) meta.best=place;
  // coins: per-kill + win / horde-wave bonuses (achievements & the daily pay on top)
  let coinsEarned = killsTotal*(horde?1:5) + (win?25:0) + (horde?hordeWave*6:0);
  coinsEarned = Math.round(coinsEarned*(activeMutator?.coinMul||1));   // Blood Moon mutator
  meta.coins += coinsEarned;
  saveMeta();
  const mctxA = { win, place, horde, matchKills:killsTotal, wave:hordeWave, time:elapsed,
    dmgTaken:matchStat.dmgTaken, grappled:matchStat.grappled, bestCombo:matchStat.bestCombo };
  const newAch = checkAchievements(mctxA);
  const dailyHit = checkDaily(mctxA);
  coinsEarned += newAch.reduce((s,a)=>s+(TIER_COINS[a.tier]||25),0) + (dailyHit?DAILY_COINS:0);
  el('hud').classList.add('hidden'); el('ctrl').classList.add('hidden'); el('powers').classList.add('hidden');
  lastWin = win;
  if(win){ confetti=[]; for(let i=0;i<90;i++) confetti.push({x:rand(0,W), y:rand(-H,0),
    vy:rand(60,170), vx:rand(-30,30), rot:rand(0,TAU), vr:rand(-5,5), s:rand(5,9),
    c:pick(['#ffd166','#ff7ad1','#6be3ff','#7bff4a','#ffffff','#c08bff'])}); }
  const pc=el('placard');
  if(horde){ pc.classList.remove('win'); pc.textContent='WAVE '+hordeWave;
    el('placeSub').textContent='🧟 Survived '+Math.floor(elapsed)+'s · best wave '+meta.bestWave; }
  else { pc.classList.toggle('win',win); pc.textContent = win?'#1 VICTORY':('#'+place);
    const close = place===2?'🔥 SO CLOSE! ':place===3?'😤 Almost had it! ':'';
    el('placeSub').textContent = win
      ? (gameMode==='squad'?'🏆 Your squad takes the win!':'🏆 Winner winner — last one standing!')
      : (close+'Eliminated · '+ord(place)+(gameMode==='squad'?'':(' of '+fieldSize))); }
  const tiles = horde
    ? [['⚔ Kills',killsTotal],['🌊 Wave',hordeWave],['⏱ Time',Math.floor(elapsed)+'s'],['✨ XP','+'+xpEarned]]
    : [['⚔ Kills',killsTotal],['🏅 Place', win?'#1':('#'+place)],['⏱ Survived',Math.floor(elapsed)+'s'],['✨ XP','+'+xpEarned]];
  el('rStats').innerHTML = tiles.map(t=>'<div>'+t[0]+'<b>'+t[1]+'</b></div>').join('');
  el('rXpLbl').textContent='+'+xpEarned+' XP';
  el('rLvl').innerHTML = lv ? '<span class="up">LEVEL UP! · Lv '+meta.level+'</span>' : ('Lv '+meta.level);
  el('rXpFill').style.width='0%';
  setTimeout(()=>{ el('rXpFill').style.width = clamp(meta.xp/xpNeed(meta.level),0,1)*100+'%'; }, 120);   // animate the fill
  // "one more run" hook: what does the next level (or a nearby one) unlock?
  const nu=nextUnlock(), nrk=nextRank(meta.level);
  const xpTo = lv => { let need=-meta.xp; for(let l=meta.level;l<lv;l++) need+=xpNeed(l); return Math.max(0,need); };
  if(nu){ el('rNext').innerHTML='🔓 <b>'+nu.name+'</b> unlocks at Lv '+nu.lv+' — <b>'+xpTo(nu.lv)+'</b> XP to go';
    el('rNext').style.display=''; }
  else if(nrk){ el('rNext').innerHTML='🏅 Rank up to <b>'+nrk.icon+' '+nrk.name+'</b> at Lv '+nrk.lv+' — <b>'+xpTo(nrk.lv)+'</b> XP to go';
    el('rNext').style.display=''; }
  else el('rNext').style.display='none';
  el('rCareer').innerHTML='Career: <b>'+meta.wins+'</b> wins · <b>'+meta.matches+'</b> matches · <b>'+meta.ckills+'</b> kills · K/D <b>'+kd()+'</b>'+(meta.bestWave?(' · wave <b>'+meta.bestWave+'</b>'):'');
  // subtle donation nudge — only when donations are set up, and only every 3rd match so it never nags
  const dn=el('rDonate'); if(dn) dn.classList.toggle('hidden', !(donateConfigured() && meta.matches>=3 && meta.matches%3===0));
  // unlock banner: coins earned + any new achievement badges + daily-challenge completion
  let ub='<div class="ru coin">🪙 +'+coinsEarned+' <span>coins</span></div>';
  for(const a of newAch) ub+='<div class="ru '+a.tier+'">'+a.icon+' '+a.name+' <span>'+TIER_ICON[a.tier]+' unlocked</span></div>';
  if(dailyHit) ub+='<div class="ru dailyhit">📅 Daily complete <span>+'+DAILY_COINS+' 🪙</span></div>';
  el('rUnlocks').innerHTML=ub;
  el('gcLeaderboardBtn').hidden = !(horde && inNativeWrapper());
  el('results').classList.remove('hidden');
  if(lv) setTimeout(levelToast,400);
}

// ============================================================
//  Draw
// ============================================================
