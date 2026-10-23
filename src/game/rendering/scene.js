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
}
function inView(x,y,pad){ return x>cam.x-pad && x<cam.x+W+pad && y>cam.y-pad && y<cam.y+H+pad; }
function dayLightFactor(){
  if (timeOfDay === 'day') return 1;
  if (timeOfDay === 'dusk') return 0.62;
  return 0.38;
}
