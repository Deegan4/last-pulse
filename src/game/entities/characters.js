function makeHuman(isPlayer, avatar, weapon, name){
  return {
    isPlayer, name: name || avatar.name, avatar, look: avatar.look, weapon, custom:isPlayer?{...meta.custom}:null,
    x:0, y:0, vx:0, vy:0, aim:-Math.PI/2,
    hp:avatar.health, maxhp:avatar.health, speed:avatar.speed*42,
    alive:true, mag:weapon.mag, reloading:0, fireCd:0, walk:0, hitFlash:0, kills:0, faceX:1, seed:rand(0,9),
    shield:0, burn:0, burnSrc:null, streak:0, lastKillT:-99, team:0, ally:false, muzzleT:0, recoil:0,
    onTower:null, climbCd:0,   // watchtower state — must be numeric so the climb guard (climbCd<=0) fires

    // ai
    strafe: Math.random()<.5?-1:1, reJitter:0, aggro:rand(440,560), acc:rand(0.05,0.16),
    think:0, lockT:0, reaction:rand(0.3,0.7), fireMul:rand(1.0,1.5), wanderA:rand(0,TAU),
  };
}
