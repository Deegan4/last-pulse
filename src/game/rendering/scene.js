function draw(){
  gtime = performance.now()/1000;
  let t = (spectating&&specTarget&&specTarget.alive)?specTarget : (player&&player.alive)?player:(player||{x:ARENA_W/2,y:ARENA_H/2});
  // co-op: frame the MIDPOINT of both players instead of just player 1, so player 2 doesn't drift
  // toward the camera's edge. leashPlayer2() (called after integrate() each frame) is what
  // actually keeps them close enough for this midpoint to stay meaningful — see its comment for
  // why this camera doesn't zoom to fit both.
  if(!spectating && player2 && player2.alive && player && player.alive)
    t = {x:(player.x+player2.x)/2, y:(player.y+player2.y)/2, vx:(player.vx+player2.vx)/2, vy:(player.vy+player2.vy)/2};
  // camera look-ahead: lead the view in the direction of travel so fast movement feels dynamic
  const lx=(t.vx||0)*MOVE.camLead, ly=(t.vy||0)*MOVE.camLead;
  let tcx=clamp(t.x+lx-W/2,0,Math.max(0,ARENA_W-W)), tcy=clamp(t.y+ly-H/2,0,Math.max(0,ARENA_H-H));
  if(ARENA_W<W) tcx=(ARENA_W-W)/2; if(ARENA_H<H) tcy=(ARENA_H-H)/2;
  // smooth camera follow (snap if far, e.g. on (re)spawn)
  const cd=Math.hypot(tcx-cam.x,tcy-cam.y);
  if(cd>400 || screenState!=='playing'){ cam.x=tcx; cam.y=tcy; } else { cam.x+=(tcx-cam.x)*0.16; cam.y+=(tcy-cam.y)*0.16; }

  if (!(window.World3D && window.World3D.ready)) return;

  let shx = 0, shy = 0;
  if (shake > 0) {
    shx = rand(-shake, shake);
    shy = rand(-shake, shake);
    shake -= 18 / 60;
    if (shake < 0) shake = 0;
  }
  window.World3D.setShake?.(shx, shy);
  window.World3D.setCamFollow(t.x, t.y);
  window.World3D.setDayFactor(dayLightFactor());
  window.World3D.render(CAM_PITCH, CAM_YAW);

  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  drawHudWorldProjected();
  drawVignette();
  drawScreenHudOverlays();
}
function hudWorld(x, y){
  const s = window.World3D.worldToScreen?.(x, y);
  return s || null;
}
function drawHudWorldProjected(){
  for (const f of floaters) {
    const p = hudWorld(f.x, f.y);
    if (!p) continue;
    ctx.globalAlpha = clamp(f.t * 1.5, 0, 1);
    ctx.fillStyle = f.col;
    ctx.font = '800 14px Trebuchet MS, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.txt, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  for (const m of hitmarks) {
    const p = hudWorld(m.x, m.y);
    if (!p) continue;
    ctx.globalAlpha = clamp(m.t * 5, 0, 1);
    ctx.strokeStyle = m.kill ? '#ff4a4a' : '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const s = m.kill ? 9 : 5, o = 2.5;
    for (const d of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.moveTo(p.x + d[0] * o, p.y + d[1] * o);
      ctx.lineTo(p.x + d[0] * (o + s), p.y + d[1] * (o + s));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  drawReticle();
}
function drawScreenHudOverlays(){
  if (screenState === 'playing' && grace > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.font = '800 italic 40px Trebuchet MS, sans-serif';
    ctx.fillText('GET READY', W / 2, H * 0.4);
    ctx.fillStyle = '#ffe27a';
    ctx.font = '800 60px Trebuchet MS, sans-serif';
    ctx.fillText(Math.ceil(grace), W / 2, H * 0.4 + 58);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = '700 14px Trebuchet MS, sans-serif';
    const gmTxt = gameMode === 'horde' ? 'Survive the endless horde' : gameMode === 'squad' ? 'Squad up — last team standing' : (fieldSize + ' players · survive the safe zone');
    ctx.fillText(gmTxt, W / 2, H * 0.4 - 40);
    ctx.restore();
  }

  if (screenState !== 'playing') {
    if (lastWin && screenState === 'results') drawConfetti();
    return;
  }

  ctx.textAlign = 'left';
  ctx.font = '700 12px Trebuchet MS, sans-serif';
  let ky = 74;
  for (const f of killFeed) {
    ctx.globalAlpha = clamp(f.t, 0, 1);
    const tw = ctx.measureText(f.txt).width;
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    roundRect(8, ky - 12, tw + 12, 18, 4);
    ctx.fill();
    ctx.fillStyle = f.you ? '#ffe27a' : '#fff';
    ctx.fillText(f.txt, 14, ky + 1);
    ky += 22;
  }
  ctx.globalAlpha = 1;

  if (gpSeen) {
    ctx.globalAlpha = 0.85;
    ctx.font = '14px Trebuchet MS, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🎮', W - 10, 26);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  if (zoneActive() && player && player.alive && grace <= 0 && outsideZone(player)) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.30, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(210,40,30,0)');
    g.addColorStop(1, 'rgba(210,40,30,.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffe2e2';
    ctx.textAlign = 'center';
    ctx.font = '800 17px Trebuchet MS, sans-serif';
    ctx.fillText('⚠ GET TO THE SAFE AREA', W / 2, H * 0.5 + 90);
  }

  if (player && player.alive && grace <= 0) {
    const frac = player.maxhp > 0 ? player.hp / player.maxhp : 1;
    if (frac < 0.3) {
      const intensity = 1 - frac / 0.3;
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(128,128,128,' + (0.55 * intensity).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      const pulse = 0.5 + 0.5 * Math.sin(gtime * 6);
      const a = (0.16 + 0.30 * intensity) * (0.55 + 0.45 * pulse);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.74);
      g.addColorStop(0, 'rgba(200,20,24,0)');
      g.addColorStop(1, 'rgba(200,20,24,' + a.toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  if (zoneWarn > 0 && grace <= 0) {
    ctx.globalAlpha = clamp(zoneWarn / 2.8, 0, 1);
    ctx.fillStyle = '#ffe27a';
    ctx.textAlign = 'center';
    ctx.font = '800 italic 18px Trebuchet MS, sans-serif';
    ctx.fillText('⚠ THE SAFE AREA IS SHRINKING', W / 2, H * 0.30);
    ctx.globalAlpha = 1;
  }

  const bosses = zombies.filter(z => z.alive && z.boss).sort((a, b) => (a.hp / a.maxhp) - (b.hp / b.maxhp));
  if (bosses.length) {
    ctx.save();
    ctx.textAlign = 'left';
    const bx = 14, bw = Math.min(190, W * 0.46);
    bosses.slice(0, 3).forEach((z, i) => {
      const by = 98 + i * 30, frac = clamp(z.hp / z.maxhp, 0, 1);
      ctx.font = '800 12px Trebuchet MS, sans-serif';
      ctx.fillStyle = '#ffcf9a';
      ctx.fillText((z.kind === 'colossus' ? '☠ COLOSSUS' : '☠ JUGGERNAUT'), bx, by - 6);
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      roundRect(bx - 2, by - 2, bw + 4, 12 + 4, 5, ctx);
      ctx.fill();
      ctx.fillStyle = '#241814';
      roundRect(bx, by, bw, 12, 4, ctx);
      ctx.fill();
      ctx.fillStyle = frac > 0.3 ? '#e6503a' : '#ff2e2e';
      roundRect(bx, by, bw * frac, 12, 4, ctx);
      ctx.fill();
    });
    ctx.restore();
  }

  for (const d of dmgDirs) {
    ctx.save();
    ctx.globalAlpha = clamp(d.t, 0, 1) * 0.85;
    ctx.translate(W / 2, H / 2);
    ctx.rotate(d.a);
    ctx.strokeStyle = '#ff3a3a';
    ctx.lineWidth = 5;
    const R0 = Math.min(W, H) * 0.34;
    ctx.beginPath();
    ctx.arc(0, 0, R0, -0.32, 0.32);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  if (streakT > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(streakT * 1.3, 0, 1);
    ctx.textAlign = 'center';
    const sc = 1 + clamp(1.7 - streakT, 0, 0.3);
    ctx.translate(W / 2, H * 0.26);
    ctx.scale(sc, sc);
    ctx.font = '800 italic 30px Trebuchet MS, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.fillStyle = '#ff5a6e';
    ctx.strokeText(streakMsg, 0, 0);
    ctx.fillText(streakMsg, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  if (combo >= 2 && comboT > 0) {
    const k = comboT / COMBO_WIN, mult = Math.min(1 + (combo - 1) * 0.25, 3);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.translate(W / 2, H * 0.335);
    const pu = 1 + Math.max(0, comboT - COMBO_WIN + 0.18) * 1.6;
    ctx.scale(pu, pu);
    ctx.font = '800 italic 22px Trebuchet MS, sans-serif';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.fillStyle = '#ffd24a';
    const txt = 'COMBO x' + combo + '  ·  ' + mult.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + '× XP';
    ctx.strokeText(txt, 0, 0);
    ctx.fillText(txt, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(-52, 7, 104, 5);
    ctx.fillStyle = k > 0.35 ? '#ffd24a' : '#ff6a4a';
    ctx.fillRect(-52, 7, 104 * k, 5);
    ctx.restore();
  }
}
function drawConfetti(){
  for (const c of confetti) {
    c.y += c.vy * 0.016;
    c.x += c.vx * 0.016;
    c.rot += c.vr * 0.016;
    if (c.y > H + 10) { c.y = -10; c.x = rand(0, W); }
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.c;
    ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s * 0.6);
    ctx.restore();
  }
}
function drawReticle(){
  if (!(screenState === 'playing' && !spectating && player && player.alive && grace <= 0 && aimShow)) return;
  const p = hudWorld(aimWX, aimWY);
  if (!p) return;
  const x = p.x, y = p.y;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = player.fireCd > 0 ? '#ffd166' : '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, TAU);
  ctx.stroke();
  for (const a of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
    ctx.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13);
    ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
function inView(x,y,pad){ return x>cam.x-pad && x<cam.x+W+pad && y>cam.y-pad && y<cam.y+H+pad; }
function dayLightFactor(){
  if (timeOfDay === 'day') return 1;
  if (timeOfDay === 'dusk') return 0.62;
  return 0.38;
}
function drawVignette(){
  const key=Math.round(W)+'x'+Math.round(H);
  if(vignetteKey!==key || !vignetteGrad){ vignetteKey=key;
    const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(W)); c.height=Math.max(1,Math.round(H));
    const o=c.getContext('2d');
    const g=o.createRadialGradient(W/2,H*0.46,Math.min(W,H)*0.34, W/2,H*0.5,Math.max(W,H)*0.80);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(0.66,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(8,14,6,0.34)');
    o.fillStyle=g; o.fillRect(0,0,c.width,c.height); vignetteGrad=c; }
  ctx.drawImage(vignetteGrad,0,0,W,H);
}
