const ZTYPES = {
  // skin / torso / shade (dark limb) / eye (glow) drive the redrawn 2D monsters below
  normal:{ hp:60,  dmg:12, sp:[64,98],  r:15, skin:'#86c85a', torso:'#5a6b38', shade:'#4c7a32', eye:'#e6ff46', size:1.0,  w:0.58 },
  runner:{ hp:30,  dmg:8,  sp:[120,150],r:12, skin:'#a7c86a', torso:'#6b4a2e', shade:'#5c7a3e', eye:'#ff4630', size:0.82, w:0.30 },
  brute: { hp:130, dmg:20, sp:[44,62],  r:20, skin:'#5a9a42', torso:'#3c5226', shade:'#3d6e2a', eye:'#ffd23a', size:1.35, w:0.12 },
  // Horde-only (w:0 → never in the default random mix; spawned by hordeKind/boss waves):
  grunt:{ hp:78, dmg:13, sp:[54,76], r:16, skin:'#9aa36a', torso:'#4f4a32', shade:'#5b5a36', eye:'#ffe66a', size:1.05, w:0, family:'normal' },        // tougher baseline shambler
  skitter:{ hp:24, dmg:7, sp:[150,184], r:10, skin:'#c1d96a', torso:'#493b2a', shade:'#637a36', eye:'#ff8a3d', size:0.74, w:0, family:'runner' },    // tiny, very fast runner
  crusher:{ hp:175, dmg:24, sp:[34,48], r:22, skin:'#66884d', torso:'#303f24', shade:'#314f28', eye:'#ffb347', size:1.48, w:0, family:'brute' },      // slow heavy bruiser
  spitter:{ hp:42, dmg:9,  sp:[46,66],  r:14, skin:'#9ed86a', torso:'#4a6b3a', shade:'#5c8a3e', eye:'#c6ff2e', size:0.95, w:0, ranged:true },  // ranged acid lobber
  venomspine:{ hp:36, dmg:11, sp:[58,78], r:13, skin:'#7edb8b', torso:'#305b3a', shade:'#34844c', eye:'#5cff89', size:0.88, w:0, family:'spitter', ranged:true }, // quicker acid lobber
  bloater:{ hp:95, dmg:16, sp:[36,52],  r:19, skin:'#8fb36a', torso:'#5a6b38', shade:'#4c7a32', eye:'#b6ff5a', size:1.28, w:0, boom:true },     // bursts into acid on death
  rottank:{ hp:140, dmg:18, sp:[26,40], r:22, skin:'#a38f5b', torso:'#62502f', shade:'#5f5a33', eye:'#d6ff58', size:1.42, w:0, family:'bloater', boom:true }, // tanky acid rupturer
  stalker:{ hp:26, dmg:11, sp:[132,168],r:11, skin:'#b7d86a', torso:'#3a4a2e', shade:'#7a3a86', eye:'#ff2ea0', size:0.80, w:0 },                 // fast, fragile swarm rusher (mid-game)
  wraith:{ hp:34, dmg:13, sp:[116,146], r:12, skin:'#8fd0c8', torso:'#253c45', shade:'#4a5e8e', eye:'#8fe8ff', size:0.86, w:0, family:'stalker' }, // evasive quilled hunter
  leaper:{ hp:48, dmg:14, sp:[92,118],  r:13, skin:'#b4d65c', torso:'#4d5b2d', shade:'#6b7332', eye:'#ffcf36', size:0.92, w:0, leaper:true },    // pounces from mid-range
  shaman:{ hp:74, dmg:10, sp:[54,72],   r:16, skin:'#78b8a5', torso:'#315050', shade:'#2f6a64', eye:'#61f7ff', size:1.08, w:0, buff:true },       // buffs nearby undead
  juggernaut:{ hp:420,dmg:30,sp:[30,44], r:26, skin:'#4c6a3a', torso:'#28331f', shade:'#28401e', eye:'#ff7a1a', size:1.70, w:0, boss:true },      // armored mini-boss (milestone waves)
  colossus:{ hp:560,dmg:36,sp:[24,36], r:29, skin:'#526646', torso:'#20271f', shade:'#24371f', eye:'#ff4f1a', size:1.92, w:0, family:'juggernaut', boss:true }, // rarer boss variant
  // Late-game additions (w:0, unlocked well past stalker@7 so the roster keeps growing instead of
  // just scaling numbers forever) — each breaks from the shared green-olive palette onto its own
  // hue family so it reads as a distinct threat at a glance, not a recolored normal/brute/stalker.
  howler: { hp:48, dmg:10, sp:[70,100], r:14, skin:'#8a6a9a', torso:'#4a3560', shade:'#3a2850', eye:'#b46bff', size:1.0,  w:0, howler:true },     // violet support caster — screech hastes nearby zombies
  carapace:{ hp:170,dmg:17, sp:[34,48],  r:19, skin:'#a8724a', torso:'#6b3a20', shade:'#4a2814', eye:'#4ad6ff', size:1.25, w:0, armored:true },     // rust carapace tank — flat damage reduction, slow
  husk:   { hp:80, dmg:10, sp:[40,58],  r:17, skin:'#c8cfc0', torso:'#5a5850', shade:'#3a3830', eye:'#9fd8ff', size:1.15, w:0, spawner:true },     // pale bone husk — periodically drops weaker adds
};
// Boss ground-slam AoE — a telegraphed heavy hit distinct from a juggernaut's normal contact
// damage, on its own cooldown. `wind` is the visible windup (growing warning ring) before impact.
const JUGGERNAUT_SLAM = { r:95, dmg:45, range:150, wind:0.6, cdMin:4.5, cdMax:6.5, knock:220 };
const TOWER_W=88, TOWER_H=72, TOWER_ELEV=46;   // 2-story watchtower: footprint + rooftop rise (climb to shoot down)
function pickZKind(){ const r=Math.random(); return r<ZTYPES.brute.w?'brute':r<ZTYPES.brute.w+ZTYPES.runner.w?'runner':'normal'; }
function makeZombie(x,y,kind){
  kind = kind || pickZKind(); const t=ZTYPES[kind];
  return { x,y, vx:0,vy:0, aim:0, kind, family:t.family||kind, hp:t.hp, maxhp:t.hp, dmg:t.dmg, r:t.r, skin:t.skin, torso:t.torso, size:t.size,
    alive:true, walk:0, hitFlash:0, attackCd:0, think:rand(0,1), wanderA:rand(0,TAU), faceX:1, speed:rand(t.sp[0],t.sp[1]),
    seed:rand(0,9), lunge:0, burn:0, burnSrc:null, ranged:!!t.ranged, boom:!!t.boom, spitCd:rand(0.6,1.8),
    leaper:!!t.leaper, buff:!!t.buff, leapCd:rand(0.8,2.2), buffCd:rand(1.2,3.0), frenzyT:0,
    boss:!!t.boss, slamCd:t.boss?rand(JUGGERNAUT_SLAM.cdMin,JUGGERNAUT_SLAM.cdMax):0, slamWind:0,
    howler:!!t.howler, howlCd:t.howler?rand(2,4):0, howlFlash:0, hasteT:0,
    armored:!!t.armored,
    spawner:!!t.spawner, spawnCd:t.spawner?rand(3,5):0, spawnsLeft:t.spawner?3:0 };
}
