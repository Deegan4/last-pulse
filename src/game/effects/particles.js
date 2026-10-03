// ---------- Effects ----------
const partPool=[];   // recycle particle objects to cut GC churn
function spark(x,y,color,spd,ang,life){
  if(particles.length>900) return;             // hard cap for low-end phones
  const p = partPool.pop() || {};
  p.x=x; p.y=y; p.vx=Math.cos(ang)*spd; p.vy=Math.sin(ang)*spd;
  p.life=life||rand(.25,.55); p.r=rand(1.5,3.5); p.color=color;
  particles.push(p);
}
// little dust puffs kicked up at the feet while running
function stepDust(h,dt){
  if((h.vx*h.vx+h.vy*h.vy)>3600 && Math.random()<dt*7)
    spark(h.x+rand(-5,5), h.y+15, 'rgba(168,158,128,.55)', rand(8,26), rand(-Math.PI*0.85,-Math.PI*0.15), rand(.25,.4));
}
// campfire heal aura — stand near a fire (Lv3+ landmark) to slowly recover HP
function campfireHeal(h,dt){
  if(h.hp>=h.maxhp || grace>0 || !campfires.length) return;
  const r2=CAMPFIRE.r*CAMPFIRE.r;
  for(const cf of campfires){ if(dist2(h.x,h.y,cf.x,cf.y)<r2){
    h.hp=Math.min(h.maxhp, h.hp+CAMPFIRE.heal*dt);
    if(h.isPlayer && Math.random()<dt*9) spark(h.x+rand(-9,9), h.y-rand(0,16), '#8fe36a', rand(18,60), -Math.PI/2, .55);
    return; } }
}
// Regeneration perk — a flat hp/s passive heal, independent of campfires. Stacks additively if
// picked more than once (h.perkRegen accumulates in the perk's own apply()).
function perkRegenTick(h,dt){
  if(!h.perkRegen || h.hp>=h.maxhp || grace>0) return;
  h.hp=Math.min(h.maxhp, h.hp+h.perkRegen*dt);
  if(Math.random()<dt*6) spark(h.x+rand(-9,9), h.y-rand(0,16), '#ff8fd6', rand(18,55), -Math.PI/2, .5);
}
let toastT=0;
function toast(msg){ const t=el('toast'); t.textContent=msg; t.style.opacity='1'; toastT=1.1; }
function levelToast(){
  toast('LEVEL UP! Lv '+meta.level + (lastLevelCoins?(' · +'+lastLevelCoins+' 🪙'):'')); sfx('level');
  if(lastRankUp){ const r=lastRankUp; setTimeout(()=>{ toast('🏅 NEW RANK — '+r.icon+' '+r.name.toUpperCase()); sfx('level'); }, 1500); }
  lastLevelCoins=0; lastRankUp=null;
}
const STREAKS={2:'DOUBLE KILL!',3:'TRIPLE KILL!',4:'MULTI KILL!',5:'RAMPAGE!',6:'UNSTOPPABLE!',7:'GODLIKE!'};
function showStreak(n){ streakMsg = STREAKS[Math.min(n,7)] || (n+' KILL STREAK!'); streakT=1.7; sfx('streak', n); }

// ============================================================
//  Input
// ============================================================
