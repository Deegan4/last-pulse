// ===== Daily challenge =====
// One deterministic challenge per calendar day (hashed from the date); completing it in any
// match that day pays DAILY_COINS. Per-match feats come from the same ctx as achievements.
const DAILY_COINS = 60;
const DAILIES = [
  {icon:'⚔',  desc:'Get 6+ kills in one match',             test:c=>c.matchKills>=6},
  {icon:'🌊', desc:'Reach wave 4 in a single run',           test:c=>c.wave>=4},
  {icon:'🌊', desc:'Reach wave 6 in Endless Horde',          test:c=>c.horde && c.wave>=6},
  {icon:'💀', desc:'Get 15+ kills in one run',               test:c=>c.matchKills>=15},
  {icon:'🪝', desc:'Grapple and get 3+ kills in one match',  test:c=>c.grappled && c.matchKills>=3},
  {icon:'⏱',  desc:'Survive 90+ seconds in one match',       test:c=>c.time>=90},
  {icon:'💨', desc:'Take under 30 damage (survive 45s+)',    test:c=>c.dmgTaken<30 && c.time>=45},
];
function dayKey(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function todaysDaily(){ const k=dayKey(); let h=0; for(let i=0;i<k.length;i++) h=(h*31+k.charCodeAt(i))>>>0; return DAILIES[h%DAILIES.length]; }

