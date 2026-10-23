# True 3D High-Angle World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2D canvas playfield with a true Three.js Orthographic high-angle tactical world (procedural low-poly only; no Meshy), keeping Endless Horde sim feel and DOM menus/HUD.

**Architecture:** A new ES-module `World3D` owns the WebGL renderer, scene, OrthographicCamera, lights, and procedural mesh factories. The existing game IIFE keeps combat/AI on ground-plane fields `entity.x` / `entity.y` (where `y` maps to Three.js `z`); each living entity holds a `mesh` Object3D. Playfield 2D draw and Meshy billboards are removed. WebGL failure shows a hard error screen.

**Tech Stack:** Vendored Three.js r169 (`assets/vendor/three/`), existing `src/game/**` IIFE assembled by `scripts/build-game.py`, Playwright driver, `scripts/validate.mjs`. No Meshy, no npm bundler.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-23-3d-high-angle-world-design.md`
- **No Meshy** — playfield must not import GLBs or call `Models3D` for match rendering
- **3D-only** — if WebGL init fails, show `#webglFail` and stop the game loop; do not fall back to 2D world draw
- Camera defaults: `CAM_PITCH = 60°`, `CAM_YAW = 15°` (radians in code), Orthographic
- Coordinate map: sim `(x, y)` → Three.js `(x, 0, y)`; height is Three.js `y`
- Keep DOM HUD / menus / touch sticks; only the playfield becomes WebGL
- Edit sources under `src/`; run `python3 scripts/build-game.py` before validate/driver
- Ship with `GAME_VERSION` bump + `CHANGELOG` + `ROADMAP.md` header sync
- No new automated unit-test framework — verify with `validate.mjs` + driver screenshots (repo convention)

---

## File Structure

**Create:**
- `src/rendering/world3d.js` — ES module: init, camera, factories, sync, render, dispose, hard-fail
- `src/styles` / markup bits for `#webglFail` (via `src/index.html` + `src/styles/game.css`)

**Modify:**
- `src/index.html` — load `assets/game/world3d.js` (built copy) or keep path `src/rendering` → build outputs `assets/game/world3d.js`; replace playfield canvas role
- `scripts/build-game.py` — emit `assets/game/world3d.js` from `src/rendering/world3d.js` (replace or alongside `models3d.js`)
- `src/game/core/stage.js` — size WebGL via `World3D.resize`; stop assuming 2D `ctx` for world
- `src/game/core/loop.js` — call `World3D.render()`; gate loop if WebGL dead
- `src/game/core/state.js` — add `CAM_PITCH` / `CAM_YAW` / `WORLD3D` tunables
- `src/game/entities/characters.js` / `enemies.js` — attach/dispose meshes
- `src/game/world/arena.js` / `building.js` / `matches.js` — spawn building meshes
- `src/game/input/player.js` / `touch-keyboard.js` — mouse aim via ground-plane raycast
- `src/game/rendering/scene.js` — become thin orchestrator (camera follow numbers → World3D); delete 2D world blit
- `src/game/rendering/world.js`, `characters.js`, `enemies.js`, `weapons.js` — strip or delete playfield 2D draw
- `src/rendering/models3d.js` — stub or remove playfield API; optional menu preview later
- `ROADMAP.md`, `memory.md`, `src/game/data/releases.js` — version + Meshy cancelled
- `scripts/validate.mjs` — Meshy playfield no longer a hard dependency for boot (keep lint optional if files remain)

**Coordinate convention (do not rename every `y` in v1):**  
Keep sim fields `x,y,vx,vy`. Document in `world3d.js` header: **sim Y = world Z**. Mesh sync: `mesh.position.set(e.x, e.elev||0, e.y)`.

---

### Task 1: World3D bootstrap + hard WebGL error

**Files:**
- Create: `src/rendering/world3d.js`
- Modify: `src/index.html` (script tag + `#webglFail` markup)
- Modify: `src/styles/game.css` (fail panel styles)
- Modify: `scripts/build-game.py` (copy `world3d.js` → `assets/game/world3d.js`)

**Interfaces:**
- Produces: `window.World3D = { ready:boolean, init(canvas), resize(w,h,dpr), render(), setCamFollow(x,y), showFail() }`
- Consumes: `#cv` canvas element, vendored Three modules

- [ ] **Step 1: Add fail markup to `src/index.html`**

Inside `#game`, after `<canvas id="cv">`:

```html
<div id="webglFail" class="hidden" role="alert">
  <h2>WebGL required</h2>
  <p>Last Pulse needs WebGL for its 3D world. Try another browser or update your device.</p>
</div>
```

Change the models script tag from `models3d.js` to `world3d.js` (built asset):

```html
<script type="module" src="assets/game/world3d.js"></script>
```

- [ ] **Step 2: Style `#webglFail` in `src/styles/game.css`**

```css
#webglFail{
  position:absolute; inset:0; z-index:50;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:12px; padding:24px; text-align:center;
  background:#0b0e14; color:#e8eef7;
  font-family: system-ui, sans-serif;
}
#webglFail.hidden{ display:none; }
#webglFail h2{ margin:0; font-size:1.4rem; }
#webglFail p{ margin:0; max-width:28ch; opacity:.85; }
```

- [ ] **Step 3: Implement `src/rendering/world3d.js` (init + fail + empty scene)**

```js
// World3D — procedural high-angle playfield (no Meshy).
// Sim (x,y) maps to Three.js (x, 0, y). Camera: ortho, pitch/yaw from game tunables.
import * as THREE from '../vendor/three/three.module.js';

const DEG = Math.PI / 180;
let renderer, scene, camera, root, follow = { x: 1100, y: 320 };
let ready = false;

function showFail(){
  const el = document.getElementById('webglFail');
  if (el) el.classList.remove('hidden');
  const cv = document.getElementById('cv');
  if (cv) cv.classList.add('hidden');
  ready = false;
  window.World3D = Object.assign(window.World3D || {}, { ready: false });
}

function init(canvas){
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    showFail();
    return false;
  }
  if (!renderer.getContext()) { showFail(); return false; }
  renderer.setClearColor(0x1a2218, 1);
  scene = new THREE.Scene();
  root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334422, 1.1));
  const key = new THREE.DirectionalLight(0xfff2d0, 1.2);
  key.position.set(4, 10, 2);
  scene.add(key);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 5000);
  ready = true;
  window.World3D.ready = true;
  return true;
}

function resize(w, h, dpr){
  if (!ready) return;
  const d = Math.min(dpr || 1, 2);
  renderer.setPixelRatio(d);
  renderer.setSize(w, h, false);
  const halfW = w / 2, halfH = h / 2;
  camera.left = -halfW; camera.right = halfW;
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}

function setCamFollow(x, y){ follow.x = x; follow.y = y; }

function placeCamera(pitchDeg, yawDeg){
  const pitch = pitchDeg * DEG, yaw = yawDeg * DEG;
  const dist = 900;
  const cx = follow.x, cz = follow.y;
  camera.position.set(
    cx + Math.sin(yaw) * Math.cos(pitch) * dist,
    Math.sin(pitch) * dist,
    cz + Math.cos(yaw) * Math.cos(pitch) * dist
  );
  camera.lookAt(cx, 0, cz);
  camera.updateProjectionMatrix();
}

function render(pitchDeg = 60, yawDeg = 15){
  if (!ready) return;
  placeCamera(pitchDeg, yawDeg);
  renderer.render(scene, camera);
}

window.World3D = {
  ready: false, THREE, scene: null, root: null, camera: null,
  init, resize, render, setCamFollow, showFail,
  getScene(){ return scene; },
  getRoot(){ return root; },
};

// Auto-init when DOM ready
const boot = () => {
  const cv = document.getElementById('cv');
  if (!cv) return showFail();
  if (!init(cv)) return;
  window.World3D.scene = scene;
  window.World3D.root = root;
  window.World3D.camera = camera;
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
```

- [ ] **Step 4: Wire `scripts/build-game.py` to emit `world3d.js`**

In `assemble()` `outputs` dict, change/add:

```python
'assets/game/world3d.js': (ROOT/'src/rendering/world3d.js').read_text(encoding='utf-8'),
```

Keep copying `models3d.js` until Task 9 removes it, or replace the key if nothing imports it.

- [ ] **Step 5: Build and smoke-check**

```bash
python3 scripts/build-game.py
grep -n "World3D" assets/game/world3d.js | head
node -e "import('fs').then(fs=>console.log(fs.existsSync('assets/game/world3d.js')?'ok':'missing'))"
```

Expected: `ok`; file contains `OrthographicCamera`.

- [ ] **Step 6: Commit**

```bash
git add src/rendering/world3d.js src/index.html src/styles/game.css scripts/build-game.py assets/game/world3d.js
git commit -m "feat(3d): World3D bootstrap with WebGL hard-fail gate"
```

---

### Task 2: Ground plane + resize/camera hookup from game loop

**Files:**
- Modify: `src/rendering/world3d.js`
- Modify: `src/game/core/state.js`
- Modify: `src/game/core/stage.js`
- Modify: `src/game/core/loop.js`
- Modify: `src/game/rendering/scene.js`

**Interfaces:**
- Consumes: `World3D.init/resize/render/setCamFollow`
- Produces: `CAM_PITCH`, `CAM_YAW` in `state.js`; ground mesh in scene

- [ ] **Step 1: Add tunables to `src/game/core/state.js`**

Near `MOVE`:

```js
const CAM_PITCH = 60;   // degrees — high-angle tactical
const CAM_YAW = 15;     // degrees — slight orbit
```

- [ ] **Step 2: Add ground factory in `world3d.js`**

```js
function buildGround(arenaW, arenaH){
  const geo = new THREE.PlaneGeometry(arenaW, arenaH);
  const mat = new THREE.MeshLambertMaterial({ color: 0x3d5a32 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(arenaW / 2, 0, arenaH / 2);
  root.add(mesh);
  return mesh;
}
window.World3D.buildGround = buildGround;
```

Call `buildGround(2200, 640)` once after init from game bootstrap (or from `world3d` boot using constants duplicated as defaults, then game can rebuild on match — for v1 call from `spawnMatch` clear+rebuild).

- [ ] **Step 3: Hook `resize()` in `stage.js`**

After setting `W,H,DPR`, replace 2D buffer sizing when World3D is ready:

```js
if (window.World3D && window.World3D.ready) {
  window.World3D.resize(W, H, DPR);
} else if (!(window.World3D && window.World3D.ready === false && document.getElementById('webglFail') && !document.getElementById('webglFail').classList.contains('hidden'))) {
  // legacy 2D path only until Task 9 deletes it — during migration keep both:
  cv.width = Math.max(1, Math.floor(W * DPR));
  cv.height = Math.max(1, Math.floor(H * DPR));
  if (ctx) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
```

Once Task 9 lands, delete the 2D branch entirely and always `World3D.resize`.

- [ ] **Step 4: Drive camera from `draw()` / loop**

In `src/game/rendering/scene.js`, after computing `cam.x` / `cam.y` (and target `t`), add:

```js
if (window.World3D && window.World3D.ready) {
  window.World3D.setCamFollow(t.x, t.y);
  window.World3D.render(CAM_PITCH, CAM_YAW);
  return; // skip 2D world blit once ground is visible (temporary early-return during Tasks 2–8)
}
```

Keep DOM HUD updates in `refreshHud()` as today.

- [ ] **Step 5: Gate loop if WebGL failed**

At top of `loop()` in `src/game/core/loop.js`:

```js
if (window.World3D && window.World3D.ready === false && document.getElementById('webglFail') &&
    !document.getElementById('webglFail').classList.contains('hidden')) {
  return; // stop scheduling further frames after fail
}
```

Only use this after confirming fail UI is showing; otherwise prefer: if `World3D` exists and `ready===false` after boot attempt, `return` without `requestAnimationFrame`.

Safer pattern:

```js
if (window.__world3dDead) return;
// ... existing loop body ending in:
requestAnimationFrame(loop);
```

Set `window.__world3dDead = true` from a one-shot check in `bootstrap.js` if `!World3D.ready` after a short wait.

- [ ] **Step 6: Build + driver smoke**

```bash
python3 scripts/build-game.py
node scripts/validate.mjs
node .claude/skills/run-brawl-arena/driver.mjs --play --shoot
```

Expected: no page errors; screenshot shows green ground plane under tilted ortho (not the old top-down field). Read PNGs in `.shots/`.

- [ ] **Step 7: Commit**

```bash
git add src/rendering/world3d.js src/game/core/state.js src/game/core/stage.js src/game/core/loop.js src/game/rendering/scene.js assets/game/
git commit -m "feat(3d): ground plane + ortho camera follow from game loop"
```

---

### Task 3: Procedural buildings

**Files:**
- Modify: `src/rendering/world3d.js` — `makeBuildingMesh(d)`
- Modify: `src/game/world/arena.js` / wherever buildings are pushed into `decor`
- Modify: `src/game/world/matches.js` — dispose prior meshes on respawn

**Interfaces:**
- Produces: `World3D.makeBuildingMesh({x,y,w,h,kind}) → THREE.Group`
- Consumes: existing decor building footprints (`d.x,d.y,d.w,d.h`)

- [ ] **Step 1: Building factory**

```js
function makeBuildingMesh(d){
  const g = new THREE.Group();
  const bodyH = 36;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(d.w, bodyH, d.h),
    new THREE.MeshLambertMaterial({ color: 0x8a7355 })
  );
  body.position.set(d.w / 2, bodyH / 2, d.h / 2);
  g.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(d.w + 4, 6, d.h + 4),
    new THREE.MeshLambertMaterial({ color: 0x5c4030 })
  );
  roof.position.set(d.w / 2, bodyH + 3, d.h / 2);
  g.add(roof);
  g.position.set(d.x, 0, d.y);
  root.add(g);
  return g;
}
window.World3D.makeBuildingMesh = makeBuildingMesh;
```

- [ ] **Step 2: Attach on spawn**

Where buildings are created in arena/decor build, after pushing `d`:

```js
if (window.World3D && window.World3D.ready) d.mesh = window.World3D.makeBuildingMesh(d);
```

- [ ] **Step 3: Dispose on match reset**

Before clearing `decor` in `spawnMatch`:

```js
for (const d of decor) {
  if (d.mesh) window.World3D.disposeMesh(d.mesh);
}
```

Add `disposeMesh(obj)` that removes from parent and disposes geo/mat recursively.

- [ ] **Step 4: Verify**

```bash
python3 scripts/build-game.py
node .claude/skills/run-brawl-arena/driver.mjs --play --shoot
```

Expected: box buildings visible on the ground in `.shots/`.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(3d): procedural building meshes on decor spawn"
```

---

### Task 4: Human + zombie proxies + lifecycle

**Files:**
- Modify: `src/rendering/world3d.js` — `makeHumanMesh(look)`, `makeZombieMesh(kind,size)`, `syncEntityMesh(e)`
- Modify: `src/game/entities/characters.js` — `makeHuman` attaches mesh when player/bot spawns (or attach in `spawnMatch`)
- Modify: `src/game/entities/enemies.js` — attach on `makeZombie`
- Modify: `src/game/combat/simulation.js` / `die()` — dispose mesh
- Modify: `src/game/core/loop.js` — after integrates, sync all meshes

**Interfaces:**
- Produces: `e.mesh` Group; wrist child named `wrist` for aim
- Consumes: `avatar.look`, `z.kind`, `z.size`

- [ ] **Step 1: Human proxy factory**

```js
function makeHumanMesh(look){
  const g = new THREE.Group();
  const skin = new THREE.Color(look.skin || '#e8b48c');
  const outfit = new THREE.Color(look.outfit || '#888888');
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(7, 10, 4, 8), new THREE.MeshLambertMaterial({ color: outfit }));
  body.position.y = 14;
  const head = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 28;
  const wrist = new THREE.Group();
  wrist.name = 'wrist';
  wrist.position.set(8, 18, 0);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 14), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  gun.position.z = 7;
  wrist.add(gun);
  g.add(body, head, wrist);
  root.add(g);
  return g;
}
```

- [ ] **Step 2: Zombie proxy factory**

```js
function makeZombieMesh(kind, size = 1){
  const g = new THREE.Group();
  const s = size || 1;
  const col = kind === 'brute' || kind === 'juggernaut' ? 0x4a5a3a : 0x5a7a4a;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(7 * s, 12 * s, 4, 8), new THREE.MeshLambertMaterial({ color: col }));
  body.position.y = 14 * s;
  const head = new THREE.Mesh(new THREE.SphereGeometry(7 * s, 10, 8), new THREE.MeshLambertMaterial({ color: 0x6a8a5a }));
  head.position.y = 28 * s;
  g.add(body, head);
  root.add(g);
  return g;
}
```

- [ ] **Step 3: Sync helper**

```js
function syncEntityMesh(e){
  if (!e.mesh) return;
  const elev = e.onTower ? 28 : 0; // approx TOWER_ELEV mapping — tune to match TOWER_ELEV px
  e.mesh.position.set(e.x, elev, e.y);
  e.mesh.rotation.y = -e.aim + Math.PI / 2; // aim along -Z/+X as needed; tune in playtest
  const wrist = e.mesh.getObjectByName('wrist');
  if (wrist) wrist.rotation.y = 0; // body yaw carries aim for v1
}
window.World3D.syncEntityMesh = syncEntityMesh;
window.World3D.makeHumanMesh = makeHumanMesh;
window.World3D.makeZombieMesh = makeZombieMesh;
```

- [ ] **Step 4: Attach + dispose call sites**

In spawn paths after `makeHuman` / `makeZombie`:

```js
if (window.World3D?.ready) {
  h.mesh = window.World3D.makeHumanMesh(h.look || h.avatar.look);
  window.World3D.syncEntityMesh(h);
}
```

In `die()` / remove:

```js
if (e.mesh && window.World3D) { window.World3D.disposeMesh(e.mesh); e.mesh = null; }
```

After movement each frame in `loop` (playing branch):

```js
for (const h of humans) if (h.alive) window.World3D?.syncEntityMesh?.(h);
for (const z of zombies) if (z.alive) window.World3D?.syncEntityMesh?.(z);
```

- [ ] **Step 5: Verify + commit**

```bash
python3 scripts/build-game.py
node .claude/skills/run-brawl-arena/driver.mjs --play --shoot
```

Expected: capsules visible; player moves under camera.

```bash
git commit -am "feat(3d): procedural human/zombie meshes with sync+dispose"
```

---

### Task 5: Mouse / touch aim via ground raycast

**Files:**
- Modify: `src/rendering/world3d.js` — `screenToGround(clientX, clientY) → {x,y}|null`
- Modify: `src/game/input/player.js` — use raycast hit instead of `mouse+cam` 2D math when World3D ready
- Modify: `src/game/input/touch-keyboard.js` — store client coords if needed

**Interfaces:**
- Produces: `World3D.screenToGround(cssX, cssY, canvasRect) → {x,y}` in sim space
- Consumes: OrthographicCamera + ground plane `y=0`

- [ ] **Step 1: Raycast helper**

```js
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();

function screenToGround(cssX, cssY, rect){
  if (!ready) return null;
  _ndc.x = ((cssX - rect.left) / rect.width) * 2 - 1;
  _ndc.y = -((cssY - rect.top) / rect.height) * 2 + 1;
  _raycaster.setFromCamera(_ndc, camera);
  if (!_raycaster.ray.intersectPlane(_plane, _hit)) return null;
  return { x: _hit.x, y: _hit.z };
}
window.World3D.screenToGround = screenToGround;
```

- [ ] **Step 2: Wire `updatePlayer` mouse aim**

Replace the desktop aim branch that uses `(mouse.x+cam.x)` when `World3D.ready`:

```js
else if (readShared && !isTouch && window.World3D?.ready) {
  const rect = cv.getBoundingClientRect();
  // mouse.x/y are canvas-local today — convert to client:
  const clientX = rect.left + mouse.x;
  const clientY = rect.top + mouse.y;
  const g = window.World3D.screenToGround(clientX, clientY, rect);
  if (g) {
    h.aim = Math.atan2(g.y - h.y, g.x - h.x);
    firing = mouse.down || keys[' '];
    mouseAim = true;
  }
}
```

Touch `aimVec` stays atan2 of stick axes (already view-relative enough for twin-stick).

- [ ] **Step 3: Verify shooting direction in driver**

```bash
python3 scripts/build-game.py
node .claude/skills/run-brawl-arena/driver.mjs --play --shoot
```

Expected: bullets travel toward aim; no console errors.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(3d): ground-plane raycast mouse aim"
```

---

### Task 6: Bullets, bombs, pickups, particles in 3D

**Files:**
- Modify: `src/rendering/world3d.js` — pooled simple meshes or per-projectile meshes
- Modify: `src/game/combat/weapons.js` / `simulation.js` — attach mesh on spawn
- Modify: `src/game/effects/particles.js` — optional sync or keep data-only with World3D particle sprites
- Modify: `src/game/rendering/scene.js` — ensure 2D projectile draw skipped

**Interfaces:**
- Produces: `World3D.makeBulletMesh()`, `syncBullet(b)`, dispose on death

- [ ] **Step 1: Bullet mesh**

```js
function makeBulletMesh(){
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe066 })
  );
  root.add(m);
  return m;
}
function syncBullet(b){
  if (!b.mesh) return;
  b.mesh.position.set(b.x, 8, b.y);
}
```

Attach in bullet push site; dispose when bullet removed.

- [ ] **Step 2: Bombs + pickups** — same pattern (box/sphere at `(x, 6, y)`).

- [ ] **Step 3: Particles v1 — skip full port; spawn small `Points` or omit until readable. Minimum: explosions still call `sfx` + camera shake via existing `shake` → feed into `World3D` camera offset:

```js
function setShake(sx, sz){ /* add to camera.position.x/z in placeCamera */ }
```

- [ ] **Step 4: Verify + commit**

```bash
python3 scripts/build-game.py
node .claude/skills/run-brawl-arena/driver.mjs --play --shoot
git commit -am "feat(3d): projectile and pickup meshes"
```

---

### Task 7: Zone ring + lighting day/night

**Files:**
- Modify: `src/rendering/world3d.js`
- Modify: `src/game/world/zone.js` — sync radius to mesh
- Modify: day/night helper currently in 2D scene — drive light intensity instead

**Interfaces:**
- Produces: `World3D.setZone(cx, cy, r)`, `World3D.setDayFactor(t01)`

- [ ] **Step 1: Zone as thin cylinder or ring**

```js
let zoneMesh;
function setZone(cx, cy, r){
  if (!zoneMesh) {
    const geo = new THREE.RingGeometry(0.95, 1, 64);
    const mat = new THREE.MeshBasicMaterial({ color: 0x66ffcc, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
    zoneMesh = new THREE.Mesh(geo, mat);
    zoneMesh.rotation.x = -Math.PI / 2;
    root.add(zoneMesh);
  }
  zoneMesh.position.set(cx, 0.5, cy);
  zoneMesh.scale.set(r, r, 1);
}
```

Call from `zoneUpdate` / horde equivalent if zone active; hide when not.

- [ ] **Step 2: Day factor modulates hemisphere intensity** (map existing day/night t).

- [ ] **Step 3: Verify + commit**

```bash
git commit -am "feat(3d): safe-zone ring and day/night light"
```

---

### Task 8: Delete 2D playfield path + Meshy playfield + docs/version

**Files:**
- Modify: `src/game/rendering/scene.js` — only camera math + `World3D.render`; no `ctx` world draw
- Delete or gut: playfield portions of `world.js`, `characters.js`, `enemies.js`, `weapons.js` (keep minimap 2D in `hud.js`)
- Modify: `src/rendering/models3d.js` — remove or no-op playfield exports; stop loading from `index.html` if unused
- Modify: `src/index.html` — only `world3d.js` module
- Modify: `scripts/build-game.py` — stop emitting unused `models3d.js` if removed
- Modify: `scripts/validate.mjs` — Meshy GLB budget optional; do not fail boot on empty Meshy
- Modify: `ROADMAP.md` — cancel Meshy moonshot; add v2.77 3D world section; sync header version
- Modify: `memory.md` — bullet for ship
- Modify: `src/game/data/releases.js` — bump `GAME_VERSION` (e.g. `2.77.0`) + CHANGELOG entry

**Interfaces:**
- Consumes: all prior World3D APIs
- Produces: shippable 3D-only playfield

- [ ] **Step 1: Remove early-return migration hacks; `draw()` becomes:**

```js
function draw(){
  // camera follow targets (keep existing t / cam.x / cam.y math for minimap + leash)
  // ... existing cam follow block ...
  if (!(window.World3D && window.World3D.ready)) return;
  const sh = shake > 0 ? shake : 0;
  window.World3D.setCamFollow(t.x, t.y);
  window.World3D.setShake?.(sh);
  window.World3D.render(CAM_PITCH, CAM_YAW);
}
```

Minimap stays on `#minimap` 2D context in `drawMini()`.

- [ ] **Step 2: Strip `Models3D` calls from any remaining `drawHuman` paths; delete file or leave unused.**

- [ ] **Step 3: ROADMAP Meshy moonshot → cancelled (cost); note procedural World3D.**

- [ ] **Step 4: Version bump**

```js
const GAME_VERSION = '2.77.0';
const CHANGELOG = [
  { v:'2.77.0', title:'True 3D high-angle world', items:[
    'Playfield is WebGL Orthographic (procedural low-poly) — no Meshy',
    'Hard error if WebGL unavailable (no 2D world fallback)',
  ]},
  // ...previous
];
```

Match ROADMAP header to `2.77.0`.

- [ ] **Step 5: Full validation**

```bash
python3 scripts/build-game.py
node scripts/validate.mjs
node .claude/skills/run-brawl-arena/driver.mjs --play --shoot
# optional balance smoke:
node .claude/skills/run-brawl-arena/driver.mjs --waves 5 --runs 1 --json .shots/waves3d.json
```

Expected: validate green; screenshots show high-angle 3D; zero page errors; `grep -c "window.__" src/index.html assets/game/game.js` → 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(3d): ship 3D-only playfield; cancel Meshy; v2.77.0"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| True 3D Orthographic high-angle camera | 1–2 |
| Pitch ~60° / yaw ~15° | 2 (`CAM_PITCH`/`CAM_YAW`) |
| 3D-only hard WebGL error | 1, 2 |
| Procedural low-poly; no Meshy | 3–4, 8 |
| Full rewrite sim mesh ownership | 4–6 |
| DOM HUD retained | 2, 8 |
| Buildings / humans / zombies / projectiles | 3, 4, 6 |
| Ground raycast mouse aim | 5 |
| Zone ring | 7 |
| Dispose on death / match reset | 3–4, 6 |
| Version + ROADMAP + Meshy cancelled | 8 |
| validate + driver | each task + 8 |

## Out of scope (do not implement in this plan)

- Meshy GLB loading / `gen-meshy.mjs` spend
- Skeletal animation
- Co-op variable zoom
- Renaming every sim `y` → `z` (document mapping only)

---

## Self-review notes

- No TBD placeholders in task steps.
- `World3D.*` names are consistent across tasks.
- Sim `y` → Three `z` called out to avoid double-flip bugs in aim/raycast.
- Minimap intentionally remains 2D.
