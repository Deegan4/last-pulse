function loop(now){
  let dt=(now-lastT)/1000; lastT=now; if(dt>0.05) dt=0.05;
  fpsAcc+=dt; fpsFrames++; if(fpsAcc>=0.4){ fps=fpsFrames/fpsAcc; fpsAcc=0; fpsFrames=0; }
  const perfT0 = (screenState==='playing' && zombies.length>30) ? performance.now() : 0;   // heavy-frame sample
  // Sample every connected pad once/frame, EVERY screen — menus read curGp too, not just
  // gameplay. Slot 0 is always player 1's (matches the old "first non-null" readGamepad()
  // exactly, so solo play sees byte-identical behavior); slot 1 becomes player 2's only once
  // they've actually joined, so a second controller sitting connected-but-idle before joining
  // never accidentally steals a frame of edge-state from a bystander read.
  const pads = connectedPads();
  curGp = readGamepadFrom(pads[0], gp1Edge);
  curGp2 = player2 ? readGamepadFrom(pads[1], gp2Edge) : null;
  if(curGp && curGp.start){ if(paused) closeSettings(); else openSettings(); }
  if(screenState==='playing' && !paused){
    elapsed=(now-startTime)/1000;
    if(hitstop>0){ hitstop-=dt; dt*=0.15; }   // kill slow-mo: world crawls for a beat
    if(grace>0) grace-=dt;
    if(zoneActive()){ if(grace<=0){ zoneUpdate(dt); reinforceZombies(dt); } if(zoneWarn>0) zoneWarn-=dt; }
    else hordeUpdate(dt);
    tryJoinPlayer2(pads);   // cheap: bails immediately unless player2 is still null and pads[1] exists
    updatePlayer(player,dt,curGp,true);
    if(player2 && player2.alive) updatePlayer(player2,dt,curGp2,false);
    for(const h of humans){ if(h.alive && !h.isPlayer) updateBot(h,dt); }
    for(const h of humans){ if(h.alive) integrate(h,dt); }
    updateRevive(dt);
    leashPlayer2();   // co-op has one shared, non-zooming camera (see draw()) — keep both players in its view
    for(const z of zombies){ if(z.alive) updateZombie(z,dt); }
    separate();
    updateBuilds(dt); updateBullets(dt); updateBombs(dt); updatePickups(dt); updateScraps(dt); updateWorldInteractables(dt); updateParticles(dt);
    if(spectating){ spectateT+=dt; if(!specTarget||!specTarget.alive) specPick();
      el('specName').textContent = specTarget? specTarget.name : '—';
      if(spectateT>16 && !ended){ ended=true; showResults(false, deathPlace); } }
    refreshHud(); drawMini();
  } else { updateParticles(dt); menuSceneUpdate(dt); if(curGp) updateGamepadMenuNav(curGp); syncControllerStatus(); }
  draw();
  if(perfT0){ perfAcc+=performance.now()-perfT0; perfN++; perfPeakZ=Math.max(perfPeakZ,zombies.length);
    if(now-perfLog>2000){ const ms=perfAcc/Math.max(1,perfN);
      if(ms>20) console.warn('[perf] sim+draw '+ms.toFixed(1)+'ms · peak '+perfPeakZ+' zombies · wave '+hordeWave+' (budget 16.7ms)');
      perfAcc=0; perfN=0; perfPeakZ=0; perfLog=now; } }
  requestAnimationFrame(loop);
}

// ============================================================
//  Screens & flow
// ============================================================
