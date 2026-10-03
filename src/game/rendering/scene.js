function draw(){
  ctx.clearRect(0,0,W,H);
  gtime = performance.now()/1000;
  let t = (spectating&&specTarget&&specTarget.alive)?specTarget : (player&&player.alive)?player:(player||{x:ARENA/2,y:ARENA/2});
  // co-op: frame the MIDPOINT of both players instead of just player 1, so player 2 doesn't drift
  // toward the camera's edge. leashPlayer2() (called after integrate() each frame) is what
  // actually keeps them close enough for this midpoint to stay meaningful — see its comment for
  // why this camera doesn't zoom to fit both.
  if(!spectating && player2 && player2.alive && player && player.alive)
    t = {x:(player.x+player2.x)/2, y:(player.y+player2.y)/2, vx:(player.vx+player2.vx)/2, vy:(player.vy+player2.vy)/2};
  // camera look-ahead: lead the view in the direction of travel so fast movement feels dynamic
  const lx=(t.vx||0)*MOVE.camLead, ly=(t.vy||0)*MOVE.camLead;
  let tcx=clamp(t.x+lx-W/2,0,Math.max(0,ARENA-W)), tcy=clamp(t.y+ly-H/2,0,Math.max(0,ARENA-H));
  if(ARENA<W) tcx=(ARENA-W)/2; if(ARENA<H) tcy=(ARENA-H)/2;
  // smooth camera follow (snap if far, e.g. on (re)spawn)
  const cd=Math.hypot(tcx-cam.x,tcy-cam.y);
  if(cd>400 || screenState!=='playing'){ cam.x=tcx; cam.y=tcy; } else { cam.x+=(tcx-cam.x)*0.16; cam.y+=(tcy-cam.y)*0.16; }
  let shx=0,shy=0; if(shake>0){ shx=rand(-shake,shake); shy=rand(-shake,shake); shake-=18/60; if(shake<0)shake=0; }
  ctx.save(); ctx.translate(-cam.x+shx,-cam.y+shy);

  drawField();
  // ground-level decor — flat pass (no per-frame y-sort), in array order
  for(const d of decor){ const t=d.type;
    if(t==='patch'||t==='tree'||t==='bush'||t==='building'||t==='tower'||TALL_DECOR[t]) continue;
    if(inView(d.x,d.y,(d.s||14)+40)) drawDecor(d); }
  // ground blood decals
  for(const s of splats){ if(!inView(s.x,s.y,s.r)) continue; ctx.globalAlpha=clamp(s.t/7,0,1)*0.5;
    ctx.fillStyle=s.col+'1)'; ctx.beginPath(); ctx.ellipse(s.x,s.y,s.r,s.r*0.6,0,0,TAU); ctx.fill(); } ctx.globalAlpha=1;
  // spike traps are flat ground pieces (walkable) — draw them here, under the fighters
  for(const b of builds) if(b.key==='spikes' && inView(b.cx,b.cy,40)) drawSpikes(b);
  // day/night tint over the GROUND ONLY — apply it here (screen space) so characters and
  // decor draw at full brightness on top and never look washed-out / see-through at dusk/night.
  ctx.restore();
  drawDayNight();
  ctx.save(); ctx.translate(-cam.x+shx,-cam.y+shy);
  // tall decor + items + entities sorted by y for depth
  const drawables=[];
  for(const d of decor){ if(d.type!=='tree'&&d.type!=='bush'&&d.type!=='building'&&d.type!=='tower'&&!TALL_DECOR[d.type]) continue;
    const cx=d.x+(d.w?d.w/2:0), cy=d.y+(d.h?d.h/2:0), pad=d.type==='building'?300:140;
    if(!inView(cx,cy,pad)) continue;
    if(d.type==='tower'){ drawables.push({y:d.y+d.h, fn:()=>drawTower(d)}); continue; }
    // buildings split in two layers: the interior floor sorts at the TOP edge (under anyone
    // standing inside), the facade at the bottom edge (over anyone inside, until it fades)
    if(d.type==='building') drawables.push({y:d.y, fn:()=>drawBuildingBase(d)});
    drawables.push({y:(d.y+(d.h||0)), fn:()=>drawDecor(d)}); }
  for(const p of pickups) if(inView(p.x,p.y,40)) drawables.push({y:p.y, fn:()=>drawPickup(p)});
  for(const s of scraps) if(inView(s.x,s.y,30)) drawables.push({y:s.y, fn:()=>drawScrap(s)});
  for(const b of builds){ if(b.key==='spikes' || !inView(b.cx,b.cy,60)) continue;   // walls/turrets y-sort with entities
    drawables.push({y:b.y+b.h, fn:()=>drawBuild(b)}); }
  for(const d of drops) if(inView(d.x,d.y,560)) drawables.push({y:d.landed?d.y:1e9, fn:()=>drawDrop(d)});
  for(const z of zombies) if(z.alive && inView(z.x,z.y,60)) drawables.push({y:z.y, fn:()=>drawZombie(z)});
  for(const h of humans){ if(!h.alive || !inView(h.x,h.y,60)) continue;
    if(h.onTower) drawables.push({y:1e8, fn:()=>{ ctx.save(); ctx.translate(0,-TOWER_ELEV); drawHuman(h); ctx.restore(); }});  // stand on the roof (drawn last, on top)
    else drawables.push({y:h.y, fn:()=>drawHuman(h)}); }
  drawables.sort((a,b)=>a.y-b.y);
  drawDowned(player2);   // under the y-sorted sprites so a revived player pops back up on top
  for(const d of drawables) d.fn();
  // build-mode ghost: a snapped preview of the piece you're about to drop (green ok / red blocked)
  if(player && player.alive && player.buildSel>=0){ drawBuildGhost(player); }

  // bombs
  for(const b of bombs){ ctx.fillStyle='#15181f'; ctx.beginPath(); ctx.arc(b.x,b.y-6,7,0,TAU); ctx.fill();
    ctx.fillStyle = (Math.floor(b.t*12)%2)?'#ff3a2a':'#ffd24a'; ctx.beginPath(); ctx.arc(b.x+3,b.y-12,2.5,0,TAU); ctx.fill(); }
  // grapple rope (taut = straight + stretch tint; slack = sagging curve)
  if(player&&player.alive&&player.grap){ const g=player.grap;
    const d=Math.hypot(g.ax-player.x,g.ay-player.y), taut=d>g.len;
    ctx.strokeStyle= taut?'#f0dcae':'#bfae8a'; ctx.lineWidth= taut?2.6:2;
    ctx.beginPath(); ctx.moveTo(player.x,player.y-6);
    if(taut) ctx.lineTo(g.ax,g.ay);
    else { const mx=(player.x+g.ax)/2, my=(player.y+g.ay)/2+(g.len-d)*0.35; ctx.quadraticCurveTo(mx,my,g.ax,g.ay); }
    ctx.stroke();
    ctx.fillStyle='#8a6a3a'; ctx.beginPath(); ctx.arc(g.ax,g.ay,4.2,0,TAU); ctx.fill();
    ctx.strokeStyle=INK; ctx.lineWidth=1.4; ctx.stroke();
  }
  // bullets (flame = fiery blobs, others = glowing tracers)
  ctx.lineCap='round';
  for(const b of bullets){
    if(b.flame){ ctx.globalAlpha=clamp(b.life*3,0,1); ctx.fillStyle=b.color; ctx.beginPath(); ctx.arc(b.x,b.y,b.r||5,0,TAU); ctx.fill(); ctx.globalAlpha=1; continue; }
    if(b.acid){ ctx.save(); ctx.shadowColor='#b6ff3a'; ctx.shadowBlur=9; ctx.fillStyle='#c6ff4a';   // spitter acid gob + trail
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r||5,0,TAU); ctx.fill();
      ctx.globalAlpha=.5; ctx.beginPath(); ctx.arc(b.x-b.vx*0.012,b.y-b.vy*0.012,(b.r||5)*0.7,0,TAU); ctx.fill(); ctx.restore(); continue; }
    if(b.arc){ const a=Math.atan2(b.vy,b.vx); ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(a);
      ctx.shadowColor='#78d7ff'; ctx.shadowBlur=12; ctx.fillStyle='#bff6ff'; ctx.strokeStyle='#38a9e8'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(7,0); ctx.lineTo(0,-3); ctx.lineTo(-6,0); ctx.lineTo(0,3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(120,215,255,.65)'; ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(-18,Math.sin(gtime*20+b.x)*3); ctx.stroke(); ctx.restore(); continue; }
    if(b.frost){ const a=Math.atan2(b.vy,b.vx); ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(a);
      ctx.shadowColor='#c9f7ff'; ctx.shadowBlur=10; ctx.fillStyle='#eaffff'; ctx.strokeStyle='#8ed7ee'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(7,0); ctx.lineTo(1,-4); ctx.lineTo(-5,0); ctx.lineTo(1,4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); continue; }
    if(b.rocket){ const a=b.aim||Math.atan2(b.vy,b.vx);
      // fiery exhaust trail
      spark(b.x-Math.cos(a)*6, b.y-Math.sin(a)*6, pick(['#ffae3a','#ff6a2a','#cfcfcf']), rand(10,60), a+Math.PI+rand(-.4,.4), .35);
      ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(a);
      ctx.fillStyle='#e2452f'; ctx.strokeStyle=INK; ctx.lineWidth=1.4;            // warhead
      ctx.beginPath(); ctx.moveTo(6,0); ctx.lineTo(1,-2.6); ctx.lineTo(1,2.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#4a5a38'; roundRect(-5,-2.4,7,4.8,1.6,ctx); ctx.fill(); ctx.stroke();  // body
      ctx.fillStyle='#2b2e35'; ctx.beginPath(); ctx.moveTo(-5,-2.4); ctx.lineTo(-8,-4); ctx.lineTo(-5,0); ctx.lineTo(-8,4); ctx.lineTo(-5,2.4); ctx.closePath(); ctx.fill();  // fins
      ctx.restore(); continue; }
    const tl = b.tl||0.012, lw = b.lw||3, tip = b.tip||1.4;
    if(b.glow){ ctx.shadowColor=b.color; ctx.shadowBlur=b.glow; }
    ctx.strokeStyle=b.color; ctx.lineWidth=lw;
    ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*tl,b.y-b.vy*tl); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(b.x,b.y,tip,0,TAU); ctx.fill(); }
  // particles
  for(const p of particles){ ctx.globalAlpha=clamp(p.life*2,0,1); ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,TAU); ctx.fill(); } ctx.globalAlpha=1;
  // shockwave rings
  for(const r of rings){ const k=clamp(r.t/r.dur,0,1), e=1-(1-k)*(1-k);  // ease-out
    ctx.globalAlpha=(1-k)*0.85; ctx.strokeStyle='rgba('+r.col+',1)'; ctx.lineWidth=r.lw*(1-k*0.6);
    ctx.beginPath(); ctx.arc(r.x,r.y,lerp(r.r0,r.r1,e),0,TAU); ctx.stroke(); } ctx.globalAlpha=1;
  // lightning zaps
  for(const z of zaps){ ctx.globalAlpha=clamp(z.t*4,0,1); ctx.strokeStyle='#bfe4ff'; ctx.lineWidth=3;
    ctx.shadowColor='#39a0ff'; ctx.shadowBlur=12; jagLine(z.x1,z.y1,z.x2,z.y2); ctx.shadowBlur=0; } ctx.globalAlpha=1;
  // hit markers
  for(const m of hitmarks){ ctx.globalAlpha=clamp(m.t*5,0,1); ctx.strokeStyle=m.kill?'#ff4a4a':'#ffffff'; ctx.lineWidth=2; ctx.lineCap='round';
    const s=m.kill?9:5, o=2.5; for(const d of [[-1,-1],[1,-1],[-1,1],[1,1]]){ ctx.beginPath();
      ctx.moveTo(m.x+d[0]*o,m.y+d[1]*o); ctx.lineTo(m.x+d[0]*(o+s),m.y+d[1]*(o+s)); ctx.stroke(); } } ctx.globalAlpha=1;
  // floaters
  for(const f of floaters){ ctx.globalAlpha=clamp(f.t*1.5,0,1); ctx.fillStyle=f.col;
    ctx.font='800 14px Trebuchet MS, sans-serif'; ctx.textAlign='center'; ctx.fillText(f.txt,f.x,f.y); } ctx.globalAlpha=1;

  drawReticle();
  if(zoneActive() && !menuAmbient) drawZone();   // no zone ring behind the ambient menu scene
  ctx.restore();
  drawVignette();

  // grace banner
  if(screenState==='playing' && grace>0){ ctx.save(); ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,255,.95)'; ctx.font='800 italic 40px Trebuchet MS, sans-serif';
    ctx.fillText('GET READY', W/2, H*0.4);
    ctx.fillStyle='#ffe27a'; ctx.font='800 60px Trebuchet MS, sans-serif'; ctx.fillText(Math.ceil(grace), W/2, H*0.4+58);
    ctx.fillStyle='rgba(255,255,255,.8)'; ctx.font='700 14px Trebuchet MS, sans-serif';
    const gmTxt = gameMode==='horde'?'Survive the endless horde' : gameMode==='squad'?'Squad up — last team standing' : (fieldSize+' players · survive the safe zone');
    ctx.fillText(gmTxt, W/2, H*0.4-40); ctx.restore(); }

  if(screenState==='playing'){
    // kill feed (top-left, under the XP bar)
    ctx.textAlign='left'; ctx.font='700 12px Trebuchet MS, sans-serif';
    let ky=74;
    for(const f of killFeed){ ctx.globalAlpha=clamp(f.t,0,1);
      const w=ctx.measureText(f.txt).width; ctx.fillStyle='rgba(0,0,0,.4)'; roundRect(8,ky-12,w+12,18,4); ctx.fill();
      ctx.fillStyle=f.you?'#ffe27a':'#fff'; ctx.fillText(f.txt,14,ky+1); ky+=22; }
    ctx.globalAlpha=1;
    // controller-detected indicator — quiet confirmation once a gamepad has sent input
    if(gpSeen){ ctx.globalAlpha=0.85; ctx.font='14px Trebuchet MS, sans-serif'; ctx.textAlign='right';
      ctx.fillText('🎮', W-10, 26); ctx.globalAlpha=1; ctx.textAlign='left'; }
    // out-of-zone red vignette + warning
    if(zoneActive()&&player&&player.alive&&grace<=0&&outsideZone(player)){
      const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.30,W/2,H/2,Math.max(W,H)*0.72);
      g.addColorStop(0,'rgba(210,40,30,0)'); g.addColorStop(1,'rgba(210,40,30,.42)');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#ffe2e2'; ctx.textAlign='center'; ctx.font='800 17px Trebuchet MS, sans-serif';
      ctx.fillText('⚠ GET TO THE SAFE AREA', W/2, H*0.5+90);
    }
    // low-health pulse — a breathing red vignette that intensifies toward death
    if(player&&player.alive&&grace<=0){
      const frac=player.maxhp>0?player.hp/player.maxhp:1;
      if(frac<0.3){
        const intensity=1-frac/0.3;                      // 0 at 30% HP → 1 near death
        ctx.globalCompositeOperation='saturation';       // drain colour as you near death (cheap full-screen blend)
        ctx.fillStyle='rgba(128,128,128,'+(0.55*intensity).toFixed(3)+')'; ctx.fillRect(0,0,W,H);
        ctx.globalCompositeOperation='source-over';
        const pulse=0.5+0.5*Math.sin(gtime*6);
        const a=(0.16+0.30*intensity)*(0.55+0.45*pulse);
        const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.28,W/2,H/2,Math.max(W,H)*0.74);
        g.addColorStop(0,'rgba(200,20,24,0)'); g.addColorStop(1,'rgba(200,20,24,'+a.toFixed(3)+')');
        ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      }
    }
    // "safe area is shrinking" banner
    if(zoneWarn>0 && grace<=0){ ctx.globalAlpha=clamp(zoneWarn/2.8,0,1);
      ctx.fillStyle='#ffe27a'; ctx.textAlign='center'; ctx.font='800 italic 18px Trebuchet MS, sans-serif';
      ctx.fillText('⚠ THE SAFE AREA IS SHRINKING', W/2, H*0.30); ctx.globalAlpha=1; }
    // boss hp banner — every alive boss gets a stacked bar, weakest (closest to death) on top,
    // so a multi-boss wave (2 @w10-15, 3 @w20+) still reads as an ordered priority list
    // left-anchored, narrow — the top-right is the minimap's territory (collapsible, but default open)
    { const bosses=zombies.filter(z=>z.alive&&z.boss).sort((a,b)=>(a.hp/a.maxhp)-(b.hp/b.maxhp));
      if(bosses.length){ ctx.save(); ctx.textAlign='left';
        const bx=14, bw=Math.min(190,W*0.46);
        bosses.slice(0,3).forEach((z,i)=>{ const by=98+i*30, frac=clamp(z.hp/z.maxhp,0,1);
          ctx.font='800 12px Trebuchet MS, sans-serif'; ctx.fillStyle='#ffcf9a';
          ctx.fillText((z.kind==='colossus'?'☠ COLOSSUS':'☠ JUGGERNAUT'), bx, by-6);
          ctx.fillStyle='rgba(0,0,0,.55)'; roundRect(bx-2,by-2,bw+4,12+4,5,ctx); ctx.fill();
          ctx.fillStyle='#241814'; roundRect(bx,by,bw,12,4,ctx); ctx.fill();
          ctx.fillStyle=frac>0.3?'#e6503a':'#ff2e2e'; roundRect(bx,by,bw*frac,12,4,ctx); ctx.fill(); });
        ctx.restore(); } }
    // damage-direction indicators (red arc toward the attacker)
    for(const d of dmgDirs){ ctx.save(); ctx.globalAlpha=clamp(d.t,0,1)*0.85; ctx.translate(W/2,H/2); ctx.rotate(d.a);
      ctx.strokeStyle='#ff3a3a'; ctx.lineWidth=5; const R0=Math.min(W,H)*0.34;
      ctx.beginPath(); ctx.arc(0,0,R0,-0.32,0.32); ctx.stroke(); ctx.restore(); } ctx.globalAlpha=1;
    // kill-streak callout
    if(streakT>0){ ctx.save(); ctx.globalAlpha=clamp(streakT*1.3,0,1); ctx.textAlign='center';
      const sc=1+clamp(1.7-streakT,0,0.3); ctx.translate(W/2,H*0.26); ctx.scale(sc,sc);
      ctx.font='800 italic 30px Trebuchet MS, sans-serif'; ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,.45)';
      ctx.fillStyle='#ff5a6e'; ctx.strokeText(streakMsg,0,0); ctx.fillText(streakMsg,0,0); ctx.restore(); ctx.globalAlpha=1; }
    // kill-combo meter (xp multiplier) — pulses and drains with the chain window
    if(combo>=2 && comboT>0){ const k=comboT/COMBO_WIN, mult=Math.min(1+(combo-1)*0.25,3);
      ctx.save(); ctx.textAlign='center'; ctx.translate(W/2,H*0.335);
      const pu=1+Math.max(0,comboT-COMBO_WIN+0.18)*1.6;  // pop on each fresh kill
      ctx.scale(pu,pu);
      ctx.font='800 italic 22px Trebuchet MS, sans-serif'; ctx.lineWidth=3.5; ctx.strokeStyle='rgba(0,0,0,.5)';
      ctx.fillStyle='#ffd24a'; const txt='COMBO x'+combo+'  ·  '+mult.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'× XP';
      ctx.strokeText(txt,0,0); ctx.fillText(txt,0,0);
      ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(-52,7,104,5);
      ctx.fillStyle=k>0.35?'#ffd24a':'#ff6a4a'; ctx.fillRect(-52,7,104*k,5);
      ctx.restore(); }
  }
  // victory confetti
  if(lastWin && screenState==='results'){
    for(const c of confetti){ c.y+=c.vy*0.016; c.x+=c.vx*0.016; c.rot+=c.vr*0.016; if(c.y>H+10){ c.y=-10; c.x=rand(0,W); }
      ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.rot); ctx.fillStyle=c.c; ctx.fillRect(-c.s/2,-c.s/2,c.s,c.s*0.6); ctx.restore(); }
  }
}
function drawReticle(){
  if(!(screenState==='playing' && !spectating && player && player.alive && grace<=0 && aimShow)) return;
  const x=aimWX, y=aimWY;
  const low = player.reloading<=0 && player.mag<=Math.max(1,Math.ceil(magCap(player)*0.25));
  ctx.save(); ctx.globalAlpha=0.9; ctx.lineWidth=2; ctx.lineCap='round';
  ctx.strokeStyle = player.reloading>0?'#ffd166' : low?'#ff6a6a' : '#ffffff';
  ctx.beginPath(); ctx.arc(x,y,9,0,TAU); ctx.stroke();
  for(const a of [0,Math.PI/2,Math.PI,3*Math.PI/2]){ ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*5,y+Math.sin(a)*5); ctx.lineTo(x+Math.cos(a)*13,y+Math.sin(a)*13); ctx.stroke(); }
  ctx.fillStyle=ctx.strokeStyle; ctx.beginPath(); ctx.arc(x,y,1.5,0,TAU); ctx.fill();
  ctx.restore(); ctx.globalAlpha=1;
}
function inView(x,y,pad){ return x>cam.x-pad && x<cam.x+W+pad && y>cam.y-pad && y<cam.y+H+pad; }
function drawVignette(){
  const key=Math.round(W)+'x'+Math.round(H);
  if(vignetteKey!==key || !vignetteGrad){ vignetteKey=key;
    const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(W)); c.height=Math.max(1,Math.round(H));
    const o=c.getContext('2d');
    const g=o.createRadialGradient(W/2,H*0.46,Math.min(W,H)*0.34, W/2,H*0.5,Math.max(W,H)*0.80);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(0.66,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(8,14,6,0.34)');
    o.fillStyle=g; o.fillRect(0,0,c.width,c.height); vignetteGrad=c; }
  ctx.drawImage(vignetteGrad,0,0,W,H);   // fast blit of the pre-rendered vignette
}
function drawDayNight(){
  if(timeOfDay==='day') return;
  ctx.save();
  if(timeOfDay==='dusk'){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(255,120,40,.16)'); g.addColorStop(1,'rgba(80,30,70,.20)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  } else { // night
    const fog=activeMutator?.fog;
    ctx.fillStyle=fog?'rgba(20,30,72,.48)':'rgba(20,30,72,.30)'; ctx.fillRect(0,0,W,H);
    if(player&&player.alive){ const px=player.x-cam.x, py=player.y-cam.y;
      const g=ctx.createRadialGradient(px,py,18,px,py,fog?170:280); g.addColorStop(0,'rgba(255,240,200,.20)'); g.addColorStop(1,'rgba(255,240,200,0)');
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.globalCompositeOperation='source-over'; }
  }
  ctx.restore();
}
function jagLine(x1,y1,x2,y2){ const seg=6; ctx.beginPath(); ctx.moveTo(x1,y1);
  for(let i=1;i<seg;i++){ const k=i/seg; ctx.lineTo(lerp(x1,x2,k)+rand(-6,6), lerp(y1,y2,k)+rand(-6,6)); }
  ctx.lineTo(x2,y2); ctx.stroke(); }
