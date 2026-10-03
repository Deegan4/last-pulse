// ===== Achievements =====
// Career tests read `meta`; per-match feats read the `ctx` passed at match end.
// Tiered: bronze/silver/gold — the tier colors the badge and sets the coin reward.
const TIER_COINS = { bronze:25, silver:75, gold:150 };
const TIER_ICON  = { bronze:'🥉', silver:'🥈', gold:'🥇' };
const ACHIEVEMENTS = [
  {id:'firstkill',  tier:'bronze', icon:'🩸', name:'First Blood',  desc:'Score your first elimination',        test:m=>m.ckills>=1},
  {id:'sharp',      tier:'silver', icon:'🎯', name:'Sharpshooter', desc:'Get 5+ kills in a single match',      test:(m,c)=>c.matchKills>=5},
  {id:'rampage',    tier:'gold',   icon:'💥', name:'Rampage',      desc:'Get 10+ kills in a single match',     test:(m,c)=>c.matchKills>=10},
  {id:'combo4',     tier:'silver', icon:'⚡', name:'Chain Reaction',desc:'Chain a 4-kill combo',                test:(m,c)=>c.bestCombo>=4},
  {id:'combo6',     tier:'gold',   icon:'🔗', name:'Kill Frenzy',  desc:'Chain a 6-kill combo',                test:(m,c)=>c.bestCombo>=6},
  {id:'firstwin',   tier:'bronze', icon:'🌊', name:'Survivor',     desc:'Reach wave 3',                        test:m=>m.bestWave>=3},
  {id:'champ5',     tier:'silver', icon:'👑', name:'Champion',     desc:'Reach wave 8',                        test:m=>m.bestWave>=8},
  {id:'champ15',    tier:'gold',   icon:'🏰', name:'Dynasty',      desc:'Reach wave 15',                       test:m=>m.bestWave>=15},
  {id:'streak3',    tier:'silver', icon:'🔥', name:'Unstoppable',  desc:'Win 3 matches in a row',              test:m=>m.bestStreak>=3},
  {id:'streak5',    tier:'gold',   icon:'☄️', name:'Legendary',    desc:'Win 5 matches in a row',              test:m=>m.bestStreak>=5},
  {id:'wave5',      tier:'bronze', icon:'🌊', name:'Survivor',     desc:'Reach wave 5 in Endless Horde',       test:m=>m.bestWave>=5},
  {id:'wave10',     tier:'silver', icon:'🧟', name:'Horde Master', desc:'Reach wave 10 in Endless Horde',      test:m=>m.bestWave>=10},
  {id:'wave15',     tier:'gold',   icon:'💀', name:'Undying',      desc:'Reach wave 15 in Endless Horde',      test:m=>m.bestWave>=15},
  {id:'matches10',  tier:'bronze', icon:'🎖', name:'Veteran',      desc:'Play 10 matches',                     test:m=>m.matches>=10},
  {id:'matches50',  tier:'silver', icon:'🗡', name:'Warhorse',     desc:'Play 50 matches',                     test:m=>m.matches>=50},
  {id:'kills100',   tier:'silver', icon:'💯', name:'Centurion',    desc:'Rack up 100 career kills',            test:m=>m.ckills>=100},
  {id:'kills500',   tier:'gold',   icon:'⚔️', name:'Warbringer',   desc:'Rack up 500 career kills',            test:m=>m.ckills>=500},
  {id:'lvl5',       tier:'bronze', icon:'⭐', name:'Rising Star',   desc:'Reach level 5',                       test:m=>m.level>=5},
  {id:'lvl10',      tier:'silver', icon:'🌟', name:'Elite',        desc:'Reach level 10',                      test:m=>m.level>=10},
  {id:'lvl20',      tier:'gold',   icon:'💫', name:'Ascendant',    desc:'Reach level 20',                      test:m=>m.level>=20},
  {id:'grappler',   tier:'bronze', icon:'🪝', name:'Swinger',      desc:'Use the grapple hook in a match',     test:(m,c)=>c.grappled},
  {id:'untouchable',tier:'gold',   icon:'🛡', name:'Untouchable',  desc:'Clear wave 3+ without taking damage', test:(m,c)=>c.wave>=3 && c.dmgTaken<=0},
  {id:'daily3',     tier:'silver', icon:'📅', name:'Regular',      desc:'Complete 3 daily challenges',         test:m=>m.dailies>=3},
  {id:'roster',     tier:'gold',   icon:'🦸', name:'Full Roster',  desc:'Unlock every hero (reach level 26)',  test:m=>m.level>=26},
  {id:'ironwall',   tier:'silver', icon:'💪', name:'Iron Wall',    desc:'Reach wave 5 as Sarge',               test:(m,c)=>c.wave>=5 && AVATARS[m.avatar]?.name==='Sarge'},
  {id:'blur',       tier:'silver', icon:'💨', name:'Blur',         desc:'Reach wave 5 as Lila',                test:(m,c)=>c.wave>=5 && AVATARS[m.avatar]?.name==='Lila'},
];
// Evaluate all achievements against current meta + this match's context; toast any newly
// unlocked and pay out the tier's coin reward.
function checkAchievements(ctx){
  const got=[];
  for(const a of ACHIEVEMENTS){
    if(meta.achieved.includes(a.id)) continue;
    let ok=false; try{ ok=!!a.test(meta, ctx||{}); }catch(e){}
    if(ok){ meta.achieved.push(a.id); meta.coins += TIER_COINS[a.tier]||25; got.push(a); }
  }
  if(got.length){ saveMeta();
    got.forEach((a,i)=> setTimeout(()=>{ toast(TIER_ICON[a.tier]+' '+a.name+' unlocked! +'+(TIER_COINS[a.tier]||25)+' 🪙'); sfx('level'); }, 1000 + i*1500)); }
  return got;
}

