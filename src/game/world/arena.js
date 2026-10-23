// ---- watchtower geometry: solid footprint, an inset walkable roof, and a south-facing ladder zone ----
function towerRoof(t){ return {x:t.x+11, y:t.y+11, w:t.w-22, h:t.h-22}; }
function towerLadder(t){ return {x:t.x+t.w/2-16, y:t.y+t.h-6, w:32, h:26}; }
function clampToRoof(h){ const r=towerRoof(h.onTower); h.x=clamp(h.x,r.x,r.x+r.w); h.y=clamp(h.y,r.y,r.y+r.h); }
function blockedSpawn(x,y){
  for(const o of obstacles){ if(x>o.x-18 && x<o.x+o.w+18 && y>o.y-18 && y<o.y+o.h+18) return true; }
  for(const d of decor){ if(d.type==='water'){ const dx=(x-d.x)/(d.s+14), dy=(y-d.y)/(d.s*0.64+14); if(dx*dx+dy*dy<1) return true; } }
  return false;
}
// a decor position clear of buildings + ponds (retries; last try is accepted if all blocked)
function decorSpot(m){ let x=rand(m,ARENA_W-m), y=rand(m,ARENA_H-m);
  for(let t=0; t<16 && blockedSpawn(x,y); t++){ x=rand(m,ARENA_W-m); y=rand(m,ARENA_H-m); } return {x,y}; }
function farSpawn(minFromCenter){
  let fx=ARENA_W/2, fy=ARENA_H/2;
  for(let i=0;i<48;i++){
    const a=rand(0,TAU), rr=rand(minFromCenter, Math.min(ARENA_W,ARENA_H)*0.5*0.92);
    fx=clamp(ARENA_W/2+Math.cos(a)*rr,80,ARENA_W-80); fy=clamp(ARENA_H/2+Math.sin(a)*rr,80,ARENA_H-80);
    if(!blockedSpawn(fx,fy)) return {x:fx,y:fy};
  }
  return {x:fx,y:fy};
}
// Brawler entrance spawn: just inside the pit's left/right wall at a random height, so zombies
// visibly walk in from one side instead of popping in omnidirectionally (the old BR/Squad
// farSpawn() model). Used by the live Horde spawn path; farSpawn() above stays for the dormant
// BR/Squad paths so their (unreachable) code keeps parsing against the old semantics.
function edgeSpawn(){
  const side = Math.random()<0.5 ? -1 : 1;
  const x = side<0 ? R+rand(0,30) : ARENA_W-R-rand(0,30);
  const y = clamp(ARENA_H/2 + rand(-ARENA_H*0.32, ARENA_H*0.32), R, ARENA_H-R);
  return {x, y, side};
}
const ROOFS=['#9a4d3a','#5a6a86','#6a8a5a','#7a6a4a','#8a5a7a'];
// Building kinds — all share the hollow-walls/door/interior system (collision, loot, zombie
// pathing are identical); only the facade art (drawBuilding) differs. `kind` picks the look;
// `roof` is the kind's palette. Barns bias to wider footprints (see buildDecor).
const BKINDS={
  house: {roof:['#9a4d3a','#7a6a4a','#8a5a7a']},   // classic cottage (windows + chimney)
  shop:  {roof:['#3f8f96','#c06a3a']},             // striped awning + hanging sign
  barn:  {roof:['#4a3730','#5a4038']},             // red planks, X-braced big doors, hayloft
  cabin: {roof:['#4a6a44','#6a5a3a']},             // log-course walls + stovepipe
};
const TALL_DECOR={campfire:1,fence:1,well:1,statue:1,graveyard:1,cache:1,antenna:1,medtent:1,barrel:1,barricade:1,door:1};   // level-milestone landmarks + prop assets (y-sorted)
// ===== Maps =====
// A map is a layout preset for buildDecor(): a ground texture, a time-of-day pool, and density
// multipliers `m` (build/water/tree/bush/rock/grass/flower — missing key = 1). `landmarks` unlocks
// statues + graveyards at any level. `free:false` would gate a map behind the "Unlock Everything"
// IAP (all six are free as of v2.76.2) — flip `free` per map to change which ones free players can pick.
const MAPS = [
  {id:'meadow', icon:'🌿', name:'MEADOW',        free:true,  ground:'grass',  tod:['day','day','dusk','night'], m:{}},
  {id:'desert', icon:'🌵', name:'DUSTY OUTPOST', free:true,  ground:'desert', tod:['day','day','dusk'],         m:{water:.2,tree:.3,bush:.4,rock:2.2,grass:.5,flower:.2,build:.8}},
  {id:'snow',   icon:'❄️', name:'FROZEN PINES',  free:true, ground:'snow',   tod:['day','night'],              m:{tree:1.6,bush:.6,water:.6,rock:1.2,flower:0,grass:.4}},
  {id:'ash',    icon:'🌋', name:'ASHLANDS',      free:true, ground:'ash',    tod:['dusk','night'],             m:{tree:.2,bush:.2,water:0,rock:2.5,grass:.2,flower:0,build:.7}},
  {id:'ruins',  icon:'🏛️', name:'STONE RUINS',   free:true, ground:'stone',  tod:['day','dusk'],               m:{build:1.35,tree:.5,bush:.6,rock:1.8,water:.4}, landmarks:true},
  {id:'swamp',  icon:'🐸', name:'SUNKEN MARSH',  free:true, ground:'swamp',  tod:['dusk','night'],             m:{water:1.5,bush:1.8,tree:1.2,rock:.5,build:.8}},
];
const availableMaps = ()=> MAPS.filter(m=>m.free||meta.iapUnlockAll);
// meta.mapPick: 'random' (any map you own) | a MAPS id. A pick you no longer own falls back to random.
function currentMap(){
  const want=MAPS.find(m=>m.id===meta.mapPick), pool=availableMaps();
  return (want && pool.includes(want)) ? want : pick(pool);
}
function mapPickLabel(){ const m=MAPS.find(x=>x.id===meta.mapPick);   // menu-button HTML (constants only)
  return '<small>MAP</small><b>'+(m ? m.icon+' '+m.name+((m.free||meta.iapUnlockAll)?'':' 🔒') : '🎲 Random')+'</b>'; }
function cycleMapPick(){ const order=['random',...MAPS.map(x=>x.id)];
  for(let i=1;i<=order.length;i++){ const id=order[(Math.max(0,order.indexOf(meta.mapPick))+i)%order.length];
    const m=MAPS.find(x=>x.id===id); if(!m || m.free || meta.iapUnlockAll){ meta.mapPick=id; break; } }
  saveMeta(); }
function disposeDecorMeshes(){
  const w3d = window.World3D;
  if (!w3d || !w3d.disposeMesh) return;
  for (const d of decor) {
    if (d.mesh) { w3d.disposeMesh(d.mesh); d.mesh = null; }
  }
}
function attachBuildingMesh(d){
  if (d.type !== 'building' || d.mesh) return;
  const w3d = window.World3D;
  if (w3d && w3d.ready) d.mesh = w3d.makeBuildingMesh(d);
}
function syncBuildingMeshes(){
  for (const d of decor) if (d.type === 'building' && !d.mesh) attachBuildingMesh(d);
}
function pushBuilding(b){
  obstacles.push(b); decor.push(b);
  attachBuildingMesh(b);
}
// Flat brawler pit — no ponds/landmarks; procedural 3D boxes stand in for canvas building art.
function buildDecor(){
  disposeDecorMeshes();
  decor.length=0; obstacles.length=0; worldInteractables.length=0;
  const MP=currentMap(); activeMap=MP;
  const mc=(n,k)=>Math.max(0,Math.round(n*(MP.m[k]??1)));
  timeOfDay = pick(MP.tod);
  groundSkin = MP.ground; ensureGround(groundSkin); groundKey = '';
  campfires = []; barrels = [];
  const nBuild = mc(10, 'build');
  const cx = ARENA_W / 2, cy = ARENA_H / 2;
  for (let i = 0; i < nBuild; i++) {
    let b, ok = false, tries = 0;
    do {
      const w = rand(100, 180), h = rand(70, 130);
      const kind = w > BIG_HOUSE ? (Math.random() < 0.6 ? 'barn' : pick(['shop', 'house']))
        : pick(['house', 'house', 'shop', 'cabin']);
      b = {
        type: 'building',
        x: rand(100, ARENA_W - 100 - w),
        y: rand(60, ARENA_H - 60 - h),
        w, h, kind,
        roof: pick(BKINDS[kind].roof),
      };
      ok = true;
      if (dist2(b.x + b.w / 2, b.y + b.h / 2, cx, cy) < 280 * 280) ok = false;
      for (const o of obstacles) {
        if (b.x < o.x + o.w + 70 && b.x + b.w + 70 > o.x && b.y < o.y + o.h + 50 && b.y + b.h + 50 > o.y) ok = false;
      }
      tries++;
    } while (!ok && tries < 40);
    if (ok) pushBuilding(b);
  }
}
// Additive map escalation (Horde only) — called on boss waves from the wave-clear block. NEVER
// clears or repositions existing decor/obstacles (that would strand zombies/the player inside
// new solid geometry mid-fight); it only appends new buildings using the exact same
// placement-and-retry rules buildDecor() uses for its own buildings, plus a clearance check
// against every living human (buildDecor doesn't need that — it runs before anyone spawns).
// Safe to call mid-match: it's only ever invoked at the "wave cleared" point, where the horde
// loop has already confirmed zero zombies are alive, so there's nothing else to avoid placing on.
// No-op in the bare pit (see buildDecor) — there's no building system left to escalate. Kept as
// a function (not deleted) since hordeSpawnWave() still calls it on every boss wave.
function escalateMap(){}
// Buildings are hollow — 4 solid walls with a door gap at the bottom-centre, so entities
// can walk inside through the door and bullets fly through the doorway but not the walls.
const WALL_T = 9, DOOR_HALF = 21;   // gap 42px: humans (r15) fit easily, brutes (r20) barely
const BIG_HOUSE = 170;              // wider houses get a second door in the top wall (no dead ends)
function wallRects(o){
  if(o.tower || o.built || o.type==='barricade') return [[o.x,o.y,o.w,o.h]];   // towers, barricades + player-built pieces are fully solid
  const dx0=o.x+o.w/2-DOOR_HALF, dx1=o.x+o.w/2+DOOR_HALF;
  const r = [
    [o.x, o.y, WALL_T, o.h],                       // left
    [o.x+o.w-WALL_T, o.y, WALL_T, o.h],            // right
    [o.x, o.y+o.h-WALL_T, dx0-o.x, WALL_T],        // bottom, left of the door
    [dx1, o.y+o.h-WALL_T, o.x+o.w-dx1, WALL_T],    // bottom, right of the door
  ];
  if(o.w>BIG_HOUSE){ r.push([o.x, o.y, dx0-o.x, WALL_T]);        // top, left of the 2nd door
    r.push([dx1, o.y, o.x+o.w-dx1, WALL_T]); }                   // top, right of the 2nd door
  else r.push([o.x, o.y, o.w, WALL_T]);                          // solid top wall
  return r;
}
// push a circle entity out of one solid rect
function pushOutRect(e, rx,ry,rw,rh, r){
  if(e.x < rx-r || e.x > rx+rw+r || e.y < ry-r || e.y > ry+rh+r) return;
  const nx=clamp(e.x,rx,rx+rw), ny=clamp(e.y,ry,ry+rh);
  let dx=e.x-nx, dy=e.y-ny, d2=dx*dx+dy*dy;
  if(d2 > r*r) return;
  if(d2 > 0.001){ const d=Math.sqrt(d2); e.x=nx+dx/d*r; e.y=ny+dy/d*r; }
  else { // centre inside — push to nearest edge
    const dl=e.x-rx, dr=rx+rw-e.x, dt=e.y-ry, db=ry+rh-e.y, m=Math.min(dl,dr,dt,db);
    if(m===dl) e.x=rx-r; else if(m===dr) e.x=rx+rw+r; else if(m===dt) e.y=ry-r; else e.y=ry+rh+r;
  }
}
function resolveObstacles(e){
  const r=(e.r||R);
  for(const o of obstacles){
    if(e.x < o.x-r || e.x > o.x+o.w+r || e.y < o.y-r || e.y > o.y+o.h+r) continue;
    for(const wr of wallRects(o)) pushOutRect(e, wr[0],wr[1],wr[2],wr[3], r);
  }
}
// which building's interior contains this point (null if none) — used so zombies path to the
// door when their prey is holed up inside instead of grinding against the wall
function insideBuilding(x,y){
  for(const o of obstacles) if(!o.tower && !o.built && x>o.x+WALL_T && x<o.x+o.w-WALL_T && y>o.y+WALL_T && y<o.y+o.h-WALL_T) return o;
  return null;
}
function bulletInObstacle(b){
  for(const o of obstacles){
    if(o.tower) continue;   // bullets fly over towers (so roof campers can shoot out & acid can reach them)
    if(b.x<o.x||b.x>o.x+o.w||b.y<o.y||b.y>o.y+o.h) continue;
    for(const wr of wallRects(o)) if(b.x>wr[0]&&b.x<wr[0]+wr[2]&&b.y>wr[1]&&b.y<wr[1]+wr[3]) return true;
  }
  return false;
}
function newBot(team, namePool, i){
  const av=pick(AVATARS);
  const b=makeHuman(false, av, pick(WEAPONS), namePool? namePool[i%namePool.length] : av.name);
  b.team=team; let s=farSpawn(Math.min(ARENA_W,ARENA_H)*0.16), tries=0;   // don't drop a bot on top of the player
  while(player && dist2(s.x,s.y,player.x,player.y)<560*560 && tries<10){ s=farSpawn(Math.min(ARENA_W,ARENA_H)*0.16); tries++; }
  b.x=s.x; b.y=s.y; b.aim=rand(0,TAU);
  return b;
}
