// ---------- Power-ups (melee brawler) ----------
// Q — drone strike: zaps the nearest enemies from above.  E — first aid: heals a chunk of max HP.
// F — power weapon: swaps to the Sledgehammer for POWER_DUR seconds, then back to the equipped weapon.
const DRONE={range:420, hits:6, dmg:55, cd:11};
const FIRSTAID={heal:0.4, cd:25};
const GRAPPLE={cd:40, power:15, range:430, k:22, c:2.2, reel:230, minLen:46, maxV:760, maxT:2.6};   // rope fields only matter to the dormant updateGrapple
function castLightning(h){
  if(h.lightCd>0 || grace>0 || !h.alive) return; h.lightCd=DRONE.cd;
  const R2=DRONE.range*DRONE.range, targets=[];
  for(const z of zombies) if(z.alive && !z.amb && dist2(h.x,h.y,z.x,z.y)<R2) targets.push({e:z,hum:false});
  for(const o of humans) if(o.alive && o!==h && o.team!==h.team && dist2(h.x,h.y,o.x,o.y)<R2) targets.push({e:o,hum:true});
  targets.sort((a,b)=>dist2(h.x,h.y,a.e.x,a.e.y)-dist2(h.x,h.y,b.e.x,b.e.y));
  let n=0;
  for(const t of targets){ if(n>=DRONE.hits) break; n++;
    zaps.push({x1:t.e.x+rand(-14,14),y1:t.e.y-300,x2:t.e.x,y2:t.e.y,t:0.25});
    hurt(t.e, DRONE.dmg*(h.perkDmgMul||1), h, t.hum);
    rings.push({x:t.e.x, y:t.e.y, t:0, dur:0.32, r0:6, r1:42, col:'160,210,255', lw:2.5});
    for(let i=0;i<8;i++) spark(t.e.x,t.e.y,'#9fd2ff',rand(60,200),rand(0,TAU),.5);
  }
  if(h.isPlayer){ if(n){ shake=Math.min(shake+5,12); sfx('bolt'); } else { toast('DRONE: NO TARGETS'); h.lightCd=1; sfx('tick'); } }
}
function throwBomb(h){
  if(h.bombCd>0 || grace>0 || !h.alive) return;
  if(h.hp>=h.maxhp){ if(h.isPlayer){ toast('ALREADY AT FULL HEALTH'); sfx('tick'); } return; }
  h.bombCd=FIRSTAID.cd;
  const heal=Math.round(h.maxhp*FIRSTAID.heal); h.hp=Math.min(h.maxhp,h.hp+heal);
  floaters.push({x:h.x, y:h.y-R-24, vy:-46, t:0.7, txt:'+'+heal, col:'#7dff9a'});
  rings.push({x:h.x, y:h.y, t:0, dur:0.5, r0:6, r1:36, col:'120,255,150', lw:2.5});
  if(h.isPlayer) sfx('pickup');
}
function castGrapple(h){
  if(h.grapCd>0 || grace>0 || !h.alive) return;
  const sled=WEAPONS.find(w=>w.name==='Sledgehammer');
  if(!sled || h.weapon===sled) return;
  h.grapCd=GRAPPLE.cd; h.baseWeapon=h.weapon; h.weapon=sled; h.powerT=GRAPPLE.power; h.swingT=0; h.comboWin=0;
  rings.push({x:h.x, y:h.y, t:0, dur:0.5, r0:6, r1:48, col:'255,210,90', lw:3});
  if(h.isPlayer){ matchStat.grappled=true; toast('SLEDGEHAMMER! '+GRAPPLE.power+'s'); sfx('level'); }
}
function tickPower(h,dt){
  if(!(h.powerT>0)) return;
  h.powerT-=dt;
  if(h.powerT<=0){ h.powerT=0; if(h.baseWeapon){ h.weapon=h.baseWeapon; h.baseWeapon=null; } h.swingT=0; h.comboWin=0; }
}
function grappleRelease(h){ h.grap=null; h.grapCd=GRAPPLE.cd; }

