// ---------- Power-ups ----------
function castLightning(h){
  if(h.lightCd>0 || grace>0) return; h.lightCd=11;
  const R2=360*360; let n=0;
  const targets=[];
  for(const z of zombies) if(z.alive && dist2(h.x,h.y,z.x,z.y)<R2) targets.push({e:z,hum:false});
  for(const o of humans) if(o.alive && o!==h && dist2(h.x,h.y,o.x,o.y)<R2) targets.push({e:o,hum:true});
  targets.sort((a,b)=>dist2(h.x,h.y,a.e.x,a.e.y)-dist2(h.x,h.y,b.e.x,b.e.y));
  let px=h.x, py=h.y;
  for(const t of targets){ if(n>=5) break; n++;
    zaps.push({x1:px,y1:py,x2:t.e.x,y2:t.e.y,t:0.25});
    px=t.e.x; py=t.e.y;
    hurt(t.e, 45, h, t.hum);
    rings.push({x:t.e.x, y:t.e.y, t:0, dur:0.32, r0:6, r1:42, col:'160,210,255', lw:2.5});
    for(let i=0;i<8;i++) spark(t.e.x,t.e.y,'#9fd2ff',rand(60,200),rand(0,TAU),.5);
  }
  if(h.isPlayer){ shake=Math.min(shake+5,12); sfx('bolt'); }
}
function throwBomb(h){
  if(h.bombCd>0 || grace>0) return; h.bombCd=10;
  const a=h.aim, d=180;
  const fuse=0.85*(activeMutator?.bombFuseMul||1);
  bombs.push({x:h.x, y:h.y, tx:h.x+Math.cos(a)*d, ty:h.y+Math.sin(a)*d, t:0, fuse, owner:h, sx:h.x, sy:h.y});
  if(h.isPlayer) sfx('throw');
}

// ---------- Grapple hook (player mobility) ----------
// Unilateral spring-damper rope: it only pulls when taut (d > len), and the force is
// radial-only — tangential velocity passes through untouched, so momentum is conserved
// through the swing and release keeps your full speed (the zip IS the reward). The rest
// length reels in over time; reeling a taut rope does work on the player, adding speed.
const GRAPPLE={range:430, k:22, c:2.2, reel:230, minLen:46, cd:7, maxV:760, maxT:2.6};
function grappleAnchor(h){ // march along aim, anchor on the first building edge
  const step=8, a=h.aim;
  for(let d=step; d<=GRAPPLE.range; d+=step){
    const x=h.x+Math.cos(a)*d, y=h.y+Math.sin(a)*d;
    for(const o of obstacles){ if(x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h) return {x,y}; }
  }
  return null;
}
function castGrapple(h){
  if(grace>0 || !h.alive) return;
  if(h.grap){ grappleRelease(h); return; }        // press again to let go early
  if(h.grapCd>0) return;
  const hit=grappleAnchor(h);
  if(!hit){ h.grapCd=1; if(h.isPlayer){ toast('NO ANCHOR IN RANGE'); sfx('tick'); } return; }
  h.grap={ax:hit.x, ay:hit.y, len:Math.hypot(hit.x-h.x,hit.y-h.y), t:0};
  if(h.isPlayer){ matchStat.grappled=true; sfx('throw'); }
}
function grappleRelease(h){ h.grap=null; h.grapCd=GRAPPLE.cd; }

