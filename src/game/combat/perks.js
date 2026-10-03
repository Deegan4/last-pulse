// ===== Match mutators =====
// Occasional whole-match modifiers announced at drop-in (ROADMAP v1.13). Each entry carries the
// numeric knobs that the relevant systems (wave spawn, bomb throw/blast, night vignette) read
// directly off `activeMutator` — no apply/revert step needed since spawnMatch rebuilds the world
// from scratch every match anyway.
const MUTATORS = [
  {id:'horde2x',  icon:'🧟', name:'SWARM NIGHT',  desc:'Every wave spawns twice the zombies',        zMul:2},
  {id:'fogNight', icon:'🌙', name:'DEEP FOG',       desc:'Endless night — your light barely reaches',  fog:true},
  {id:'lowGrav',  icon:'🎈', name:'LOW GRAVITY',   desc:'Bombs hang longer and blast wider',          bombFuseMul:1.8, bombRadMul:1.4},
  {id:'glassCannon', icon:'💎', name:'GLASS CANNON', desc:'You deal +60% damage but take +60% too',   dmgOutMul:1.6, dmgInMul:1.6},
  {id:'richVein',    icon:'💰', name:'RICH VEIN',    desc:'Zombies drop 70% more scrap',              scrapMul:1.7},
  {id:'bloodMoon',   icon:'🔴', name:'BLOOD MOON',   desc:'+50% XP and coins this run',                xpMul:1.5, coinMul:1.5},
];
const MUTATOR_CHANCE = 0.35;    // "occasional" — most matches stay vanilla
function pickMutator(){ return Math.random()<MUTATOR_CHANCE ? pick(MUTATORS) : null; }

// ===== Perk picks =====
// Mid-run agency: every 3rd wave (3,6,9…) pauses on a 3-card choice before the next wave spawns.
// Each perk's apply(h) mutates the player instance directly (h.perkDmgMul etc.) — read at the
// existing single choke points in fire()/hurt()/die() rather than a generic buff-list, matching
// how activeMutator's numeric fields are consumed.
const PERK_TUNE = { statRanks:3, ricochetRange:180, ricochetMul:0.5,
  reloadRadius:110, reloadDamage:40, reloadCooldown:6, lightningKills:4,
  lightningRange:220, lightningDamage:35, lightningTargets:3, grappleRadius:48, grappleDamage:55 };
const PERKS = [
  {id:'extClip',  icon:'🧰', name:'EXTENDED CLIP', desc:'+50% magazine size',            apply:h=>{ h.magMul=(h.magMul||1)*1.5; }},
  {id:'adrenaline',icon:'⚡', name:'ADRENALINE',    desc:'+15% move speed',               apply:h=>{ h.perkSpeedMul=(h.perkSpeedMul||1)*1.15; }},
  {id:'heavyRounds',icon:'🔨',name:'HEAVY ROUNDS',  desc:'+20% weapon damage',            apply:h=>{ h.perkDmgMul=(h.perkDmgMul||1)*1.2; }},
  {id:'thickSkin',icon:'🛡️', name:'THICK SKIN',    desc:'-20% damage taken',             apply:h=>{ h.perkDmgInMul=(h.perkDmgInMul||1)*0.8; }},
  {id:'regen',    icon:'💗', name:'REGENERATION',  desc:'Heal 1.5 hp/s passively',       apply:h=>{ h.perkRegen=(h.perkRegen||0)+1.5; }},
  {id:'secondWind',icon:'💖',name:'SECOND WIND',    desc:'Survive one lethal hit at 50% hp',apply:h=>{ h.perkRevives=(h.perkRevives||0)+1; }},
  {id:'ricochet',icon:'↪️',name:'RICOCHET ROUNDS',maxRanks:1,desc:'Bullet hits bounce to one nearby enemy for 50% damage. Excludes flames and rockets.',apply:h=>{ h.perkRicochet=true; }},
  {id:'reloadBlast',icon:'💥',name:'EXPLOSIVE RELOAD',maxRanks:1,desc:'Finish a reload to blast nearby enemies for 40 damage. 6s cooldown.',apply:h=>{ h.perkReloadBlast=true; }},
  {id:'killLightning',icon:'🌩️',name:'KILL STORM',maxRanks:1,desc:'Every 4 kills zap up to 3 enemies near the last kill for 35 damage. Zap kills do not charge it.',apply:h=>{ h.perkKillLightning=true; h.perkKillCount=0; }},
  {id:'grappleDamage',icon:'🪝',name:'RAZOR SWING',maxRanks:1,desc:'While grappling, strike nearby enemies for 55 damage once per enemy per swing.',apply:h=>{ h.perkGrappleDamage=true; }},
];
let perkChoices=[], pendingWaveBoss=false;
function perkRank(h,id){ return h.perkRanks?.[id]||0; }
function perkLimit(p){ return p.maxRanks||PERK_TUNE.statRanks; }
function availablePerks(h){ return PERKS.filter(p=>perkRank(h,p.id)<perkLimit(p)); }
function applyPerk(h,p){
  if(perkRank(h,p.id)>=perkLimit(p)) return false;
  h.perkRanks=h.perkRanks||{}; h.perkRanks[p.id]=perkRank(h,p.id)+1;
  p.apply(h); return true;
}
function openPerkPick(boss){
  pendingWaveBoss = boss;
  const pool = availablePerks(player); perkChoices=[];
  if(!pool.length){ player.hp=Math.min(player.maxhp,player.hp+player.maxhp*0.25);
    toast('BUILD COMPLETE — healed 25%'); hordeSpawnWave(boss); return; }
  while(perkChoices.length<3 && pool.length) perkChoices.push(pool.splice(randi(0,pool.length-1),1)[0]);
  const grid = el('perkGrid'); grid.innerHTML='';
  for(const p of perkChoices){
    const card = document.createElement('div'); card.className='achcard shopcard'; card.dataset.perk=p.id;
    card.innerHTML = `<span class="aic">${p.icon}</span><div class="atxt"><b>${p.name}</b><span>${p.desc} · Rank ${perkRank(player,p.id)+1}/${perkLimit(p)}</span></div>`;
    grid.appendChild(card);
  }
  paused = true;
  el('perkPick').classList.remove('hidden');
}
function choosePerk(id){
  const p = perkChoices.find(x=>x.id===id); if(!p || !applyPerk(player,p)) return;
  perkChoices=[];
  toast(p.icon+' '+p.name+' picked!'); sfx('level');
  el('perkPick').classList.add('hidden');
  paused = false;
  hordeSpawnWave(pendingWaveBoss);
}
function dailyDoneToday(){ return meta.dailyDone===dayKey(); }
// Called at match end (before results render). Returns true if the daily was just completed.
function checkDaily(ctx){
  if(dailyDoneToday()) return false;
  let ok=false; try{ ok=!!todaysDaily().test(ctx||{}); }catch(e){}
  if(ok){ meta.dailyDone=dayKey(); meta.dailies++; meta.coins+=DAILY_COINS; saveMeta();
    setTimeout(()=>{ toast('📅 Daily challenge complete! +'+DAILY_COINS+' 🪙'); sfx('level'); }, 600); }
  return ok;
}

