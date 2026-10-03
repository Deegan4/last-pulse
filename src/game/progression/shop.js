// ===== Shop (cosmetic trails) =====
// Trails are player-only running particles; colors feed spark(). 'none' is free & default.
const SHOP_ITEMS = [
  {id:'ember',  icon:'🔥', name:'Ember Trail',   desc:'Smoldering embers in your wake',  cost:150, colors:['#ff9b3d','#ff6a2a']},
  {id:'frost',  icon:'❄️', name:'Frost Trail',   desc:'A trail of glittering ice',       cost:150, colors:['#bfe9ff','#7ad0ff']},
  {id:'toxic',  icon:'☠️', name:'Toxic Trail',   desc:'Dripping zombie-green ooze',      cost:200, colors:['#9dff5a','#5ad63a']},
  {id:'shadow', icon:'🌑', name:'Shadow Trail',  desc:'Wisps of creeping darkness',      cost:250, colors:['rgba(50,44,70,.85)','rgba(80,66,110,.75)']},
  {id:'star',   icon:'✨', name:'Star Trail',    desc:'Sparkling stardust footsteps',    cost:300, colors:['#fff6c0','#ffd166']},
  {id:'royal',  icon:'👑', name:'Royal Trail',   desc:'Gold & violet — walk like a king',cost:500, colors:['#ffd166','#c08bff']},
];
function shopItem(id){ return SHOP_ITEMS.find(s=>s.id===id); }
// Nameplate banners — a colored bar drawn under the player's name in drawNameplate(), purely
// cosmetic like trails (own inventory/equip slot, doesn't touch stats).
const BANNERS = [
  {id:'crimson', icon:'🔴', name:'Crimson Banner', desc:'Bold red name banner',       cost:150, color:'#e2452f'},
  {id:'azure',   icon:'🔵', name:'Azure Banner',   desc:'Cool blue name banner',      cost:150, color:'#5fa8ff'},
  {id:'gold',    icon:'🟡', name:'Gold Banner',    desc:'Champion gold name banner',  cost:250, color:'#ffd166'},
  {id:'violet',  icon:'🟣', name:'Violet Banner',  desc:'Royal violet name banner',   cost:250, color:'#c08bff'},
];
function bannerItem(id){ return BANNERS.find(b=>b.id===id); }
// Extended Magazines — a permanent, coin-bought upgrade (meta.magLvl) that widens every weapon's
// magazine. Tunables: capacity bonus per level and the coin cost of each tier.
const MAG_MAX=3, MAG_STEP=0.20;          // up to +60% magazine capacity across all guns
const MAG_COST=[250, 500, 900];          // coin cost for tier 1 / 2 / 3
function magMulMeta(){ return 1 + Math.min(meta.magLvl||0, MAG_MAX)*MAG_STEP; }
function magInfo(){ const lvl=Math.min(meta.magLvl||0, MAG_MAX), maxed=lvl>=MAG_MAX;
  return { lvl, bonus:Math.round(lvl*MAG_STEP*100), maxed, nextCost:maxed?null:MAG_COST[lvl] }; }
function weaponUnlocked(w){ return meta.iapUnlockAll || meta.level >= (w.unlock||1); }
// nearest still-locked avatar/weapon — the "one more run" carrot on the results screen
function nextUnlock(){
  let best=null;
  for(const a of AVATARS) if(a.unlock>meta.level && (!best||a.unlock<best.lv)) best={lv:a.unlock, name:a.name};
  for(const w of WEAPONS) if((w.unlock||1)>meta.level && (!best||(w.unlock||1)<best.lv)) best={lv:w.unlock||1, name:w.name};
  return best;
}
function grantXp(n){
  meta.xp += n; let leveled=false, coins=0; const rank0=rankFor(meta.level).name;
  while(meta.xp >= xpNeed(meta.level)){ meta.xp -= xpNeed(meta.level); meta.level++; leveled=true; coins += levelReward(meta.level); }
  if(coins){ meta.coins += coins; lastLevelCoins = coins; }               // every level-up pays coins
  const rk=rankFor(meta.level); lastRankUp = (rk.name!==rank0) ? rk : null;
  saveMeta(); return leveled;
}
function avatarUnlocked(a){ return meta.iapUnlockAll || meta.level >= a.unlock; }

// ============================================================
//  World
// ============================================================
