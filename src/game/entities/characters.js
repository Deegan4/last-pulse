function makeHuman(isPlayer, avatar, weapon, name){
  const h = {
    isPlayer, name: name || avatar.name, avatar, look: avatar.look, weapon,
    x:0, y:0, vx:0, vy:0, aim:-Math.PI/2,
    hp:avatar.health, maxhp:avatar.health, speed:avatar.speed*42,
    alive:true, fireCd:0, swingT:0, swingDur:0.2, swingStep:0, swingArc:0.8, comboWin:0, walk:0, hitFlash:0, kills:0, faceX:1, seed:rand(0,9),
    shield:0, burn:0, burnSrc:null, streak:0, lastKillT:-99, team:0, ally:false,
    onTower:null, climbCd:0,   // watchtower state — must be numeric so the climb guard (climbCd<=0) fires

    // ai
    strafe: Math.random()<.5?-1:1, reJitter:0, aggro:rand(440,560), acc:rand(0.05,0.16),
    think:0, lockT:0, reaction:rand(0.3,0.7), fireMul:rand(1.0,1.5), wanderA:rand(0,TAU),
  };
  if (window.World3D?.ready) {
    const imgKey = h.avatar?.img;
    const imgEl = (typeof imgOk === 'function' && imgKey) ? imgOk(imgKey) : null;
    h.mesh = window.World3D.makeHumanMesh(h.look, { isPlayer: !!h.isPlayer, imgKey, imgEl });
    window.World3D.syncEntityMesh(h);
  }
  return h;
}
