// meta / progression
const meta = {
  level: parseInt(safeGet('dd2_level','1'),10) || 1,
  xp: parseInt(safeGet('dd2_xp','0'),10) || 0,
  name: safeGet('dd2_name','deegan'),
  avatar: parseInt(safeGet('dd2_avatar','0'),10) || 0,
  weapon: parseInt(safeGet('dd2_weapon','0'),10) || 0,
  custom: readCustom(),
  // career stats
  matches: parseInt(safeGet('dd2_matches','0'),10) || 0,
  wins: parseInt(safeGet('dd2_wins','0'),10) || 0,
  ckills: parseInt(safeGet('dd2_ckills','0'),10) || 0,
  deaths: parseInt(safeGet('dd2_deaths','0'),10) || 0,
  best: parseInt(safeGet('dd2_best','0'),10) || 0,   // best (lowest) placement; 0 = none yet
  streak: parseInt(safeGet('dd2_streak','0'),10) || 0,
  bestStreak: parseInt(safeGet('dd2_bstreak','0'),10) || 0,
  bestWave: parseInt(safeGet('dd2_bwave','0'),10) || 0,
  sfxVol: Math.max(0,Math.min(1, parseFloat(safeGet('dd2_sfxvol','0.8'))||0.8)),
  aimSens: Math.max(0.3,Math.min(2, parseFloat(safeGet('dd2_sens','1'))||1)),
  achieved: (safeGet('dd2_ach','')||'').split(',').filter(Boolean),   // unlocked achievement ids
  // economy / cosmetics / daily challenge
  coins: parseInt(safeGet('dd2_coins','0'),10) || 0,
  owned: (safeGet('dd2_owned','')||'').split(',').filter(Boolean),   // purchased shop item ids
  trail: safeGet('dd2_trail','none'),                                // equipped trail id
  banner: safeGet('dd2_banner','none'),                              // equipped nameplate banner id
  magLvl: parseInt(safeGet('dd2_maglvl','0'),10) || 0,               // Extended Magazines upgrade tier (0..MAG_MAX)
  dailies: parseInt(safeGet('dd2_dailies','0'),10) || 0,             // total dailies completed
  dailyDone: safeGet('dd2_daily',''),                                // day-key of last completed daily
  iapUnlockAll: safeGet('dd2_iap_unlockall','0')==='1',              // real-money IAP: bypass avatar/weapon level-gates
};
// iOS wrapper bridge: GameViewController injects window.__nativeBootCode (see
// "Native (iOS wrapper) save bridge" below) at document-start, before this script runs —
// localStorage above is empty there (WKWebView is non-persistent), so merge the native
// SwiftData-backed save in now, before anything reads or renders `meta`.
if(window.__nativeBootCode){ try{ importSave(window.__nativeBootCode); }catch(e){} }
// roster shrank to the sprite heroes — clamp any stale saved index so nothing indexes past the table
if(!(meta.avatar>=0 && meta.avatar<AVATARS.length)) meta.avatar=0;
function xpNeed(lv){ return 80 + lv*40; }
// Rank ladder — a title you climb well past the level-25 unlock ceiling, so leveling always
// has a next goal. rankFor() = current rank; nextRank() = the one you're working toward.
const RANKS = [
  {lv:1,  icon:'🐣', name:'Rookie'},   {lv:5,  icon:'🥊', name:'Fighter'},
  {lv:10, icon:'🎖', name:'Veteran'},  {lv:16, icon:'⭐', name:'Elite'},
  {lv:22, icon:'🔥', name:'Master'},   {lv:30, icon:'👑', name:'Champion'},
  {lv:40, icon:'🌟', name:'Legend'},   {lv:55, icon:'💎', name:'Mythic'},
  {lv:75, icon:'☄️', name:'Immortal'},
];
function rankFor(lv){ let r=RANKS[0]; for(const x of RANKS) if(lv>=x.lv) r=x; return r; }
function nextRank(lv){ for(const x of RANKS) if(x.lv>lv) return x; return null; }
// coins paid out for reaching a given level (scales, so higher levels are worth chasing)
function levelReward(lv){ return 20 + lv*4; }
let lastLevelCoins = 0, lastRankUp = null;   // set by grantXp, shown by levelToast
function saveMeta(){
  safeSet('dd2_level',meta.level); safeSet('dd2_xp',meta.xp); safeSet('dd2_name',meta.name);
  safeSet('dd2_avatar',meta.avatar); safeSet('dd2_weapon',meta.weapon);
  safeSet('dd2_custom',JSON.stringify(meta.custom));
  safeSet('dd2_matches',meta.matches); safeSet('dd2_wins',meta.wins); safeSet('dd2_ckills',meta.ckills);
  safeSet('dd2_deaths',meta.deaths); safeSet('dd2_best',meta.best);
  safeSet('dd2_streak',meta.streak); safeSet('dd2_bstreak',meta.bestStreak); safeSet('dd2_bwave',meta.bestWave);
  safeSet('dd2_sfxvol',meta.sfxVol); safeSet('dd2_sens',meta.aimSens);
  safeSet('dd2_ach', meta.achieved.join(','));
  safeSet('dd2_coins',meta.coins); safeSet('dd2_owned',meta.owned.join(',')); safeSet('dd2_trail',meta.trail);
  safeSet('dd2_banner',meta.banner);
  safeSet('dd2_maglvl',meta.magLvl);
  safeSet('dd2_dailies',meta.dailies); safeSet('dd2_daily',meta.dailyDone);
  safeSet('dd2_iap_unlockall', meta.iapUnlockAll ? '1' : '0');
  nativeSaveDebounced();
}
