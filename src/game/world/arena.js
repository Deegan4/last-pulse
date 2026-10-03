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
function decorSpot(m){ let x=rand(m,ARENA-m), y=rand(m,ARENA-m);
  for(let t=0; t<16 && blockedSpawn(x,y); t++){ x=rand(m,ARENA-m); y=rand(m,ARENA-m); } return {x,y}; }
function farSpawn(minFromCenter){
  let fx=ARENA/2, fy=ARENA/2;
  for(let i=0;i<48;i++){
    const a=rand(0,TAU), rr=rand(minFromCenter, ARENA*0.5*0.92);
    fx=clamp(ARENA/2+Math.cos(a)*rr,80,ARENA-80); fy=clamp(ARENA/2+Math.sin(a)*rr,80,ARENA-80);
    if(!blockedSpawn(fx,fy)) return {x:fx,y:fy};
  }
  return {x:fx,y:fy};
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
function buildDecor(){
  decor.length=0; obstacles.length=0; worldInteractables.length=0;
  timeOfDay = pick(['day','day','dusk','night']);   // mostly day, sometimes dusk/night
  // biome ground variants (desert/snow/ash/stone/swamp) are an "Unlock Everything" IAP perk —
  // free players always render the classic grass ground, paid players get the full rotation.
  const groundPool = meta.iapUnlockAll ? (GROUND_SKINS[timeOfDay] || GROUND_SKINS.day) : ['grass'];
  groundSkin = pick(groundPool); ensureGround(groundSkin); groundKey = '';
  // the world grows with your level: more houses (each hiding loot), more ponds and
  // greenery, and new landmarks unlock at level milestones (see below). Counts here are tuned
  // for the v2.36 arena bump (3000→4000, ~1.8x the area) — scaled up but not 1:1 with area, so
  // the bigger map reads as MORE to explore rather than just diluting the old density.
  const lvl = meta.level;
  const nBuild = Math.min(13 + Math.floor(lvl/4), 22);
  const nWater = Math.min(9 + Math.floor(lvl/8), 13);
  const xtra   = Math.min(lvl, 20);                 // generic density bonus
  for(let i=0;i<112;i++){ decor.push({type:'patch', x:rand(0,ARENA), y:rand(0,ARENA), s:rand(40,120), h:rand(0.04,0.1)}); }
  for(let i=0;i<nWater;i++){ decor.push({type:'water', x:rand(200,ARENA-200), y:rand(200,ARENA-200), s:rand(90,180)}); }
  // buildings (cover) — kept apart and away from the very centre
  for(let i=0;i<nBuild;i++){ let b, ok=false, tries=0;
    do{ const w=rand(110,210), h=rand(90,170);
      // pick a look: wide footprints lean barn; otherwise a shop/cabin/house mix
      const kind = w>BIG_HOUSE ? (Math.random()<0.6?'barn':pick(['shop','house']))
                               : pick(['house','house','shop','cabin']);
      b={type:'building', x:rand(160,ARENA-160-w), y:rand(160,ARENA-160-h), w, h, kind, roof:pick(BKINDS[kind].roof)}; ok=true;
      if(dist2(b.x+b.w/2,b.y+b.h/2,ARENA/2,ARENA/2) < 360*360) ok=false;
      // GAP: wide, even spacing between buildings so they read as a tidy settlement, not a clump
      for(const o of obstacles) if(b.x<o.x+o.w+90 && b.x+b.w+90>o.x && b.y<o.y+o.h+90 && b.y+b.h+90>o.y) ok=false;
      for(const wd of decor) if(wd.type==='water'){ const pw=wd.s+60, ph=wd.s*0.64+60;   // keep houses well clear of ponds
        if(b.x<wd.x+pw && b.x+b.w>wd.x-pw && b.y<wd.y+ph && b.y+b.h>wd.y-ph){ ok=false; break; } }
      tries++; } while(!ok && tries<40);
    if(ok){ obstacles.push(b); decor.push(b); } }
  // Building doors start shuttered, then can be shot open to create an entry route.
  for(const o of obstacles.filter(o=>o.type==='building')){
    const door={type:'door', x:o.x+o.w/2-DOOR_HALF, y:o.y+o.h-WALL_T-2, w:DOOR_HALF*2, h:WALL_T+4, hp:70, maxhp:70, building:o};
    obstacles.push(door); decor.push(door);
  }
  for(let i=0;i<36+Math.floor(xtra*0.9);i++){ const p=decorSpot(120); decor.push({type:'tree', x:p.x, y:p.y, s:rand(0.85,1.4), round:Math.random()<0.4}); }
  for(let i=0;i<46+Math.floor(xtra*1.3);i++){ const p=decorSpot(80); decor.push({type:'bush', x:p.x, y:p.y, s:rand(0.8,1.3)}); }
  for(let i=0;i<92+Math.floor(xtra*2.6);i++){ decor.push({type:'grass', x:rand(40,ARENA-40), y:rand(40,ARENA-40), s:rand(0.7,1.25), ph:rand(0,TAU)}); }
  for(let i=0;i<36+Math.floor(xtra*1.3);i++){ decor.push({type:'flower', x:rand(40,ARENA-40), y:rand(40,ARENA-40), c:pick(['#ff5a8a','#ffd166','#7fd0ff','#fff','#c08bff'])}); }
  for(let i=0;i<20+Math.floor(xtra*0.7);i++){ const p=decorSpot(40); decor.push({type:'rock', x:p.x, y:p.y, s:rand(0.7,1.5)}); }
  for(let i=0;i<8+Math.floor(lvl/6);i++){ decor.push({type:'dirt', x:rand(150,ARENA-150), y:rand(150,ARENA-150), s:rand(70,150)}); }
  for(let i=0;i<8+Math.floor(xtra*0.35);i++){ const p=decorSpot(70); decor.push({type:'cache', x:p.x, y:p.y, s:rand(0.88,1.16), open:Math.random()<0.28}); }
  for(let i=0;i<5+Math.floor(xtra*0.22);i++){ const p=decorSpot(80); decor.push({type:'barrel', x:p.x, y:p.y, s:rand(0.86,1.18), hot:Math.random()<0.36, fuel:true}); }
  for(let i=0;i<3+Math.floor(lvl/10);i++){ const p=decorSpot(95); decor.push({type:'antenna', x:p.x, y:p.y, s:rand(0.9,1.15), blink:rand(0,TAU)}); }
  for(let i=0;i<2+Math.floor(lvl/12);i++){ const p=decorSpot(105); decor.push({type:'medtent', x:p.x, y:p.y, s:rand(0.9,1.12), flip:Math.random()<0.5}); }
  // Destructible cover: solid in the world, readable at phone scale, and cheap to simulate.
  for(let i=0;i<5+Math.floor(xtra*0.25);i++){
    const p=decorSpot(80), horiz=Math.random()<0.5;
    const b={type:'barricade', x:p.x-34, y:p.y-11, w:horiz?68:22, h:horiz?22:68, hp:80, maxhp:80};
    obstacles.push(b); decor.push(b);
  }
  // level-milestone landmarks — the map gains character as you rank up
  if(lvl>=3)  for(let i=0;i<4;i++){ const p=decorSpot(70); decor.push({type:'campfire', x:p.x, y:p.y}); }
  if(lvl>=6)  for(let i=0;i<7;i++){ const p=decorSpot(90); decor.push({type:'fence', x:p.x, y:p.y, n:3+(i%3), horiz:Math.random()<0.5}); }
  if(lvl>=10) for(let i=0;i<3;i++){ const p=decorSpot(80); decor.push({type:'well', x:p.x, y:p.y}); }
  if(lvl>=15) for(let i=0;i<3;i++){ const p=decorSpot(80); decor.push({type:'statue', x:p.x, y:p.y}); }
  if(lvl>=20) for(let i=0;i<2;i++){ const p=decorSpot(90); decor.push({type:'graveyard', x:p.x, y:p.y, seed:rand(0,1)}); }
  decor.sort((a,b)=> ((a.type==='water'||a.type==='dirt')?-1e9:a.y) - ((b.type==='water'||b.type==='dirt')?-1e9:b.y));
  campfires = decor.filter(d=>d.type==='campfire');   // cache for the heal-aura check
}
// Additive map escalation (Horde only) — called on boss waves from the wave-clear block. NEVER
// clears or repositions existing decor/obstacles (that would strand zombies/the player inside
// new solid geometry mid-fight); it only appends new buildings using the exact same
// placement-and-retry rules buildDecor() uses for its own buildings, plus a clearance check
// against every living human (buildDecor doesn't need that — it runs before anyone spawns).
// Safe to call mid-match: it's only ever invoked at the "wave cleared" point, where the horde
// loop has already confirmed zero zombies are alive, so there's nothing else to avoid placing on.
function escalateMap(){
  if(mapEscalations>=MAP_ESCALATE_MAX) return;
  let added=0;
  for(let i=0;i<MAP_ESCALATE_PER;i++){ let b, ok=false, tries=0;
    do{ const w=rand(110,210), h=rand(90,170);
      const kind = w>BIG_HOUSE ? (Math.random()<0.6?'barn':pick(['shop','house'])) : pick(['house','house','shop','cabin']);
      b={type:'building', x:rand(160,ARENA-160-w), y:rand(160,ARENA-160-h), w, h, kind, roof:pick(BKINDS[kind].roof)}; ok=true;
      if(dist2(b.x+b.w/2,b.y+b.h/2,ARENA/2,ARENA/2) < 360*360) ok=false;
      for(const o of obstacles) if(b.x<o.x+o.w+90 && b.x+b.w+90>o.x && b.y<o.y+o.h+90 && b.y+b.h+90>o.y) ok=false;
      for(const wd of decor) if(wd.type==='water'){ const pw=wd.s+60, ph=wd.s*0.64+60;
        if(b.x<wd.x+pw && b.x+b.w>wd.x-pw && b.y<wd.y+ph && b.y+b.h>wd.y-ph){ ok=false; break; } }
      for(const h of humans){ if(!h.alive) continue;   // never drop a wall on a living player
        if(h.x>b.x-70 && h.x<b.x+b.w+70 && h.y>b.y-70 && h.y<b.y+b.h+70){ ok=false; break; } }
      tries++; } while(!ok && tries<40);
    if(ok){ obstacles.push(b); decor.push(b); added++; } }   // drawables.sort() in draw() handles y-order — no decor re-sort needed
  if(added){ mapEscalations++; toast('🧱 New buildings have appeared on the map'); }
}
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
  b.team=team; let s=farSpawn(ARENA*0.16), tries=0;   // don't drop a bot on top of the player
  while(player && dist2(s.x,s.y,player.x,player.y)<560*560 && tries<10){ s=farSpawn(ARENA*0.16); tries++; }
  b.x=s.x; b.y=s.y; b.aim=rand(0,TAU);
  return b;
}
