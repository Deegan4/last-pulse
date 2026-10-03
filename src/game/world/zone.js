const zone = { cx:ARENA/2, cy:ARENA/2, r:ARENA*0.6, fromCx:0,fromCy:0,fromR:0,toCx:0,toCy:0,toR:0,
  phase:0, state:'hold', t:0, dur:0, dmg:1.5 };
const PHASES = [
  { hold:40, shrink:14, r:ARENA*0.40, dmg:2 },
  { hold:30, shrink:12, r:ARENA*0.26, dmg:3 },
  { hold:24, shrink:11, r:ARENA*0.15, dmg:5 },
  { hold:20, shrink:10, r:ARENA*0.08, dmg:7 },
  { hold:16, shrink:9,  r:ARENA*0.03, dmg:10 },
  { hold:14, shrink:8,  r:0,          dmg:16 },
];
function zoneReset(){
  zone.cx=ARENA/2; zone.cy=ARENA/2; zone.r=ARENA*0.6;
  zone.phase=0; zone.state='hold'; zone.t=0; zone.dur=PHASES[0].hold; zone.dmg=PHASES[0].dmg;
}
function zoneUpdate(dt){
  zone.t += dt;
  if(zone.state==='hold'){
    if(zone.t>=zone.dur){
      const ph=PHASES[zone.phase], maxOff=Math.max(0,zone.r-ph.r);
      const a=rand(0,TAU), off=Math.sqrt(Math.random())*maxOff;
      zone.fromCx=zone.cx; zone.fromCy=zone.cy; zone.fromR=zone.r;
      zone.toCx=clamp(zone.cx+Math.cos(a)*off, ph.r, ARENA-ph.r);
      zone.toCy=clamp(zone.cy+Math.sin(a)*off, ph.r, ARENA-ph.r);
      zone.toR=ph.r; zone.state='shrink'; zone.t=0; zone.dur=ph.shrink; zone.dmg=ph.dmg;
      zoneWarn=2.8; sfx('warn');
    }
  } else if(zone.state==='shrink'){
    const k=clamp(zone.t/zone.dur,0,1), e=k*k*(3-2*k);
    zone.cx=lerp(zone.fromCx,zone.toCx,e); zone.cy=lerp(zone.fromCy,zone.toCy,e); zone.r=lerp(zone.fromR,zone.toR,e);
    if(zone.t>=zone.dur){ zone.cx=zone.toCx; zone.cy=zone.toCy; zone.r=zone.toR;
      zone.phase++; zone.t=0;
      if(zone.phase>=PHASES.length){ zone.state='done'; zone.dur=1e9; }
      else { zone.state='hold'; zone.dur=PHASES[zone.phase].hold; } }
  }
}
function outsideZone(e){ return Math.hypot(e.x-zone.cx, e.y-zone.cy) > zone.r; }
function zoneActive(){ return gameMode!=='horde'; }
function safeText(){
  if(zone.state==='done') return 'FINAL';
  if(zone.state==='shrink') return 'closing';
  return Math.ceil(zone.dur - zone.t) + 's';
}

// ============================================================
//  Entities
// ============================================================
