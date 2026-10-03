function drawZone(){
  ctx.save(); ctx.beginPath(); ctx.rect(cam.x-50,cam.y-50,W+100,H+100);
  ctx.arc(zone.cx,zone.cy,Math.max(0,zone.r),0,TAU,true);
  ctx.fillStyle='rgba(180,40,40,0.22)'; ctx.fill('evenodd'); ctx.restore();
  ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=4; ctx.shadowColor='rgba(120,200,255,.8)'; ctx.shadowBlur=14;
  ctx.beginPath(); ctx.arc(zone.cx,zone.cy,Math.max(0,zone.r),0,TAU); ctx.stroke(); ctx.shadowBlur=0;
  if(zone.state==='hold' && zone.phase<PHASES.length){ ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.lineWidth=2; ctx.setLineDash([10,10]);
    ctx.beginPath(); ctx.arc(zone.cx,zone.cy,Math.max(0,PHASES[zone.phase].r),0,TAU); ctx.stroke(); ctx.setLineDash([]); }
}

// minimap
const MINI_LANDMARK_COL = {campfire:'#ff8a2a', well:'#7fc8e8', statue:'#c9c2b0', graveyard:'#8f8d86',
  cache:'#d6ff6e', antenna:'#6fe6ff', medtent:'#f2f6e8', barrel:'#ff7d5c', barricade:'#b88754'};
function drawMini(){
  const S=132, sc=S/ARENA; mctx.clearRect(0,0,S,S);
  mctx.fillStyle='#2c4a1e'; mctx.fillRect(0,0,S,S);
  // water ponds — drawn first so buildings/landmarks read on top
  mctx.fillStyle='rgba(80,150,190,.55)';
  for(const d of decor){ if(d.type!=='water') continue;
    mctx.beginPath(); mctx.ellipse(d.x*sc,d.y*sc,Math.max(1,d.s*sc),Math.max(1,d.s*0.64*sc),0,0,TAU); mctx.fill(); }
  // buildings
  mctx.fillStyle='rgba(220,200,170,.55)'; for(const o of obstacles) mctx.fillRect(o.x*sc,o.y*sc,Math.max(1,o.w*sc),Math.max(1,o.h*sc));
  // level-milestone landmarks — small colour-coded dots so the map reads as a real place, not just cover
  for(const d of decor){ const col=MINI_LANDMARK_COL[d.type]; if(!col) continue;
    mctx.fillStyle=col; mctx.beginPath(); mctx.arc(d.x*sc,d.y*sc,1.6,0,TAU); mctx.fill(); }
  if(zoneActive()){ mctx.beginPath(); mctx.arc(zone.cx*sc,zone.cy*sc,Math.max(0,zone.r)*sc,0,TAU);
    mctx.strokeStyle='rgba(255,255,255,.85)'; mctx.lineWidth=1.3; mctx.stroke();
    mctx.fillStyle='rgba(255,255,255,.06)'; mctx.fill(); }
  mctx.fillStyle='#cf3a2a'; for(const z of zombies){ if(!z.alive) continue; mctx.fillRect(z.x*sc-1,z.y*sc-1,2,2); }
  for(const h of humans){ if(!h.alive||h.isPlayer) continue;
    mctx.fillStyle = h.team===player.team ? '#7bd0ff' : '#ff5a4a';   // allies blue-ish, enemies red
    mctx.beginPath(); mctx.arc(h.x*sc,h.y*sc,2,0,TAU); mctx.fill(); }
  if(player&&player.alive){
    const px=player.x*sc, py=player.y*sc;
    mctx.strokeStyle='rgba(255,255,255,.8)'; mctx.lineWidth=1.6; mctx.beginPath();   // facing tick
    mctx.moveTo(px,py); mctx.lineTo(px+Math.cos(player.aim)*7,py+Math.sin(player.aim)*7); mctx.stroke();
    mctx.fillStyle='#7bff4a'; mctx.beginPath(); mctx.arc(px,py,3,0,TAU); mctx.fill();
    mctx.strokeStyle='#fff'; mctx.lineWidth=1; mctx.stroke(); }
  if(player2&&!player2.alive&&player){   // downed co-op partner: hollow cyan ring so you can find them
    mctx.strokeStyle='#5ad1ff'; mctx.lineWidth=1.6; mctx.beginPath(); mctx.arc(player2.x*sc,player2.y*sc,4,0,TAU); mctx.stroke(); }
  if(player2&&player2.alive){   // cyan, matching the .gpfocus controller-accent color used elsewhere
    const px=player2.x*sc, py=player2.y*sc;
    mctx.strokeStyle='rgba(255,255,255,.8)'; mctx.lineWidth=1.6; mctx.beginPath();
    mctx.moveTo(px,py); mctx.lineTo(px+Math.cos(player2.aim)*7,py+Math.sin(player2.aim)*7); mctx.stroke();
    mctx.fillStyle='#5ad1ff'; mctx.beginPath(); mctx.arc(px,py,3,0,TAU); mctx.fill();
    mctx.strokeStyle='#fff'; mctx.lineWidth=1; mctx.stroke(); }
}

// ---------- HUD refresh ----------
function refreshHud(){
  if(gameMode==='horde'){ let az=0; for(const z of zombies) if(z.alive) az++;
    el('statPlayers').textContent=az; el('lblPlayers').textContent='zombies';
    el('lblSafe').textContent='Wave'; el('statSafe').textContent=hordeWave;
  } else {
    el('statPlayers').textContent = aliveHumans()+'/'+fieldSize; el('lblPlayers').textContent='players';
    el('lblSafe').textContent='Safe area:'; el('statSafe').textContent = safeText();
  }
  el('statKills').textContent = killsTotal;
  el('statFps').textContent = Math.round(fps);
  el('xpfill').style.width = clamp(meta.xp/xpNeed(meta.level),0,1)*100 + '%';
  el('lvlText').textContent = 'LV '+meta.level;
  // power cooldown fills + "ready" glow when off cooldown
  const bc=(player?clamp(player.lightCd/11,0,1):0), mc=(player?clamp(player.bombCd/10,0,1):0),
        gc=(player&&!player.grap?clamp(player.grapCd/GRAPPLE.cd,0,1):0);
  el('boltCool').style.height = bc*100 + '%'; el('boltBtn').classList.toggle('ready', bc<=0 && grace<=0);
  el('bombCool').style.height = mc*100 + '%'; el('bombBtn').classList.toggle('ready', mc<=0 && grace<=0);
  el('grapCool').style.height = gc*100 + '%'; el('grapBtn').classList.toggle('ready', gc<=0 && !(player&&player.grap) && grace<=0);
  // builder: scrap readout + the 🔨 button reflecting the selected structure & affordability
  const scrap = player?(player.scrap||0):0, sel = player?player.buildSel:-1;
  el('scrapCount').textContent = scrap;
  const bb=el('buildBtn'), def = sel>=0 ? BUILDS[sel] : null;
  el('buildIcon').textContent = def ? def.icon : '🔨';
  bb.classList.toggle('sel', sel>=0);
  bb.classList.toggle('broke', !!def && scrap<def.cost);
  el('buildCost').style.height = (def && scrap<def.cost) ? clamp(1-scrap/def.cost,0,1)*100+'%' : '0%';
}

// ============================================================
//  Main loop
// ============================================================
