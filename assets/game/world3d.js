// World3D — procedural high-angle playfield (no Meshy).
// Sim (x,y) maps to Three.js (x, 0, y). Camera: perspective, pitch/yaw from game tunables.
import * as THREE from '../vendor/three/three.module.js';

const DEG = Math.PI / 180;
let renderer, scene, camera, root, follow = { x: 1100, y: 320 };
let camShakeX = 0, camShakeZ = 0;
let ready = false;
let hemiLight, keyLight, zoneMesh;
const MAX_VFX_PARTICLES = 150;
const MAX_VFX_ZAPS = 32;
let vfxParticles, vfxParticleGeo, vfxParticlePos, vfxParticleCol;
let vfxZaps, vfxZapGeo, vfxZapPos;
const _vfxCol = new THREE.Color();
const HEMI_INTENSITY_BASE = 1.1;
const KEY_INTENSITY_BASE = 1.2;

const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();
const _world = new THREE.Vector3();

function screenToGround(cssX, cssY, rect){
  if (!ready || !camera) return null;
  _ndc.x = ((cssX - rect.left) / rect.width) * 2 - 1;
  _ndc.y = -((cssY - rect.top) / rect.height) * 2 + 1;
  _raycaster.setFromCamera(_ndc, camera);
  if (!_raycaster.ray.intersectPlane(_plane, _hit)) return null;
  return { x: _hit.x, y: _hit.z };
}

function worldToScreen(wx, wy){
  if (!ready || !camera || !renderer) return null;
  _world.set(wx, 0, wy);
  _world.project(camera);
  const el = renderer.domElement;
  const w = el.clientWidth || 1;
  const h = el.clientHeight || 1;
  if (_world.z > 1) return null;
  return { x: (_world.x * 0.5 + 0.5) * w, y: (-_world.y * 0.5 + 0.5) * h };
}

function showFail(){
  const el = document.getElementById('webglFail');
  if (el) el.classList.remove('hidden');
  const cv = document.getElementById('cv');
  if (cv) cv.classList.add('hidden');
  ready = false;
  window.World3D = Object.assign(window.World3D || {}, { ready: false });
}

let groundMesh = null;
let groundUnder = null;
let groundTexKey = '';
const texLoader = new THREE.TextureLoader();
const BUILD_BODY = { house: 0xc4a574, shop: 0xb8a090, barn: 0xa84838, cabin: 0x6b5344 };
const BUILD_ROOF = { house: 0x9a4d3a, shop: 0x3f8f96, barn: 0x4a3730, cabin: 0x4a6a44 };
const BUILD_TRIM = { house: 0x5c4030, shop: 0x2a5a60, barn: 0x2a2018, cabin: 0x3a4a34 };

function init(canvas){
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    showFail();
    return false;
  }
  if (!renderer.getContext()) { showFail(); return false; }
  renderer.setClearColor(0x1a2218, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  // Camera sits ~2100 from the player. The old 900–2200 fog swallowed that distance.
  scene.fog = new THREE.Fog(0x1a2218, 1600, 5200);
  root = new THREE.Group();
  scene.add(root);
  hemiLight = new THREE.HemisphereLight(0xffffff, 0x334422, HEMI_INTENSITY_BASE);
  scene.add(hemiLight);
  keyLight = new THREE.DirectionalLight(0xfff2d0, KEY_INTENSITY_BASE);
  keyLight.position.set(420, 680, 280);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 10;
  keyLight.shadow.camera.far = 2400;
  keyLight.shadow.camera.left = -900;
  keyLight.shadow.camera.right = 900;
  keyLight.shadow.camera.top = 700;
  keyLight.shadow.camera.bottom = -700;
  keyLight.shadow.bias = -0.0008;
  scene.add(keyLight);
  scene.add(keyLight.target);

  camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 10, 8000);
  initVfxMeshes();
  ready = true;
  window.World3D.ready = true;
  return true;
}

function initVfxMeshes(){
  vfxParticleGeo = new THREE.BufferGeometry();
  vfxParticlePos = new Float32Array(MAX_VFX_PARTICLES * 3);
  vfxParticleCol = new Float32Array(MAX_VFX_PARTICLES * 3);
  vfxParticleGeo.setAttribute('position', new THREE.BufferAttribute(vfxParticlePos, 3));
  vfxParticleGeo.setAttribute('color', new THREE.BufferAttribute(vfxParticleCol, 3));
  vfxParticles = new THREE.Points(
    vfxParticleGeo,
    new THREE.PointsMaterial({ size: 7, vertexColors: true, transparent: true, opacity: 0.92, sizeAttenuation: false })
  );
  root.add(vfxParticles);

  vfxZapGeo = new THREE.BufferGeometry();
  vfxZapPos = new Float32Array(MAX_VFX_ZAPS * 2 * 3);
  vfxZapGeo.setAttribute('position', new THREE.BufferAttribute(vfxZapPos, 3));
  vfxZaps = new THREE.LineSegments(
    vfxZapGeo,
    new THREE.LineBasicMaterial({ color: 0x99eeff, transparent: true, opacity: 0.9 })
  );
  root.add(vfxZaps);
}

function particleVfxColor(css, out, i){
  try { _vfxCol.set(css); } catch { _vfxCol.set(0xffee88); }
  out[i * 3] = _vfxCol.r;
  out[i * 3 + 1] = _vfxCol.g;
  out[i * 3 + 2] = _vfxCol.b;
}

function syncVfx(particles, zaps){
  if (!ready || !vfxParticles) return;
  const pn = Math.min(particles?.length || 0, MAX_VFX_PARTICLES);
  for (let i = 0; i < pn; i++) {
    const p = particles[i];
    const o = i * 3;
    vfxParticlePos[o] = p.x;
    vfxParticlePos[o + 1] = 10 + (p.r || 2);
    vfxParticlePos[o + 2] = p.y;
    particleVfxColor(p.color, vfxParticleCol, i);
  }
  vfxParticleGeo.setDrawRange(0, pn);
  vfxParticleGeo.attributes.position.needsUpdate = true;
  vfxParticleGeo.attributes.color.needsUpdate = true;
  vfxParticles.visible = pn > 0;

  const zn = Math.min(zaps?.length || 0, MAX_VFX_ZAPS);
  for (let i = 0; i < zn; i++) {
    const z = zaps[i];
    const o = i * 6;
    vfxZapPos[o] = z.x1;
    vfxZapPos[o + 1] = 14;
    vfxZapPos[o + 2] = z.y1;
    vfxZapPos[o + 3] = z.x2;
    vfxZapPos[o + 4] = 14;
    vfxZapPos[o + 5] = z.y2;
  }
  vfxZapGeo.setDrawRange(0, zn * 2);
  vfxZapGeo.attributes.position.needsUpdate = true;
  vfxZaps.visible = zn > 0;
}

// Vertical fov. Distance is the scale lever: at 430×932, dist 2100 keeps the
// left-to-right ground width within 1% of the old ortho view (VIEW_SCALE 2.1 → ~903 units).
const CAM_FOV = 50;
const CAM_DIST = 2100;

function resize(w, h, dpr){
  if (!ready) return;
  const d = Math.min(dpr || 1, 2);
  renderer.setPixelRatio(d);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function setCamFollow(x, y){ follow.x = x; follow.y = y; }

function setShake(sx, sz){ camShakeX = sx; camShakeZ = sz; }

function placeCamera(pitchDeg, yawDeg){
  const pitch = pitchDeg * DEG, yaw = yawDeg * DEG;
  const dist = CAM_DIST;
  const cx = follow.x, cz = follow.y;
  camera.position.set(
    cx + Math.sin(yaw) * Math.cos(pitch) * dist + camShakeX,
    Math.sin(pitch) * dist,
    cz + Math.cos(yaw) * Math.cos(pitch) * dist + camShakeZ
  );
  camera.lookAt(cx, 0, cz);
  camera.updateProjectionMatrix();
}

function render(pitchDeg = 60, yawDeg = 15){
  if (!ready) return;
  placeCamera(pitchDeg, yawDeg);
  renderer.render(scene, camera);
}

function applyTexColorSpace(tex){
  if ('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  else if ('encoding' in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
}

function configureGroundMap(tex){
  applyTexColorSpace(tex);
  // Stretch one map across the pit — these PNGs are not tile-seamless
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  tex.needsUpdate = true;
}

function setGroundTexture(key){
  if (!ready || !groundMesh) return;
  const k = key || 'grass';
  if (k === groundTexKey && groundMesh.material?.map) return;
  const url = 'assets/img/ground-' + k + '.png';
  texLoader.load(url, (tex) => {
    if (!groundMesh) return;
    configureGroundMap(tex);
    const old = groundMesh.material.map;
    groundMesh.material.map = tex;
    groundMesh.material.color.set(0xffffff);
    groundMesh.material.needsUpdate = true;
    if (old && old !== tex) old.dispose();
    groundTexKey = k;
  }, undefined, () => {
    // keep solid green fallback
    if (groundMesh) groundMesh.material.color.set(0x3d5a32);
  });
}

function buildGround(arenaW, arenaH){
  if (!ready || !root) return null;
  if (groundMesh) {
    disposeMesh(groundMesh);
    groundMesh = null;
    groundTexKey = '';
  }
  if (groundUnder) {
    disposeMesh(groundUnder);
    groundUnder = null;
  }
  // Dark surround so the ortho frustum doesn't show a flat void past the pit edge
  const under = new THREE.Mesh(
    new THREE.PlaneGeometry(arenaW * 3.2, arenaH * 3.2),
    new THREE.MeshLambertMaterial({ color: 0x121812 })
  );
  under.rotation.x = -Math.PI / 2;
  under.position.set(arenaW / 2, -0.5, arenaH / 2);
  under.receiveShadow = true;
  root.add(under);
  groundUnder = under;

  const geo = new THREE.PlaneGeometry(arenaW, arenaH);
  const mat = new THREE.MeshLambertMaterial({ color: 0x4a6b3e });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(arenaW / 2, 0, arenaH / 2);
  mesh.receiveShadow = true;
  mesh.userData.arenaW = arenaW;
  mesh.userData.arenaH = arenaH;
  root.add(mesh);
  groundMesh = mesh;
  if (keyLight) {
    keyLight.target.position.set(arenaW / 2, 0, arenaH / 2);
    keyLight.target.updateMatrixWorld();
  }
  return mesh;
}

function disposeMesh(obj){
  if (!obj) return;
  if (obj.parent) obj.parent.remove(obj);
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });
}

function makeBuildingMesh(d){
  const g = new THREE.Group();
  const kind = d.kind || 'house';
  const bodyH = kind === 'barn' ? 42 : kind === 'cabin' ? 32 : 36;
  const bodyCol = BUILD_BODY[kind] || 0xc4a574;
  const roofCol = (d.roof && /^#/.test(d.roof)) ? new THREE.Color(d.roof).getHex() : (BUILD_ROOF[kind] || 0x9a4d3a);
  const trimCol = BUILD_TRIM[kind] || 0x5c4030;
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyCol });
  const roofMat = new THREE.MeshLambertMaterial({ color: roofCol });
  const trimMat = new THREE.MeshLambertMaterial({ color: trimCol });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1410 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(d.w, bodyH, d.h), bodyMat);
  body.position.set(d.w / 2, bodyH / 2, d.h / 2);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // roof overhang slab
  const roof = new THREE.Mesh(new THREE.BoxGeometry(d.w + 8, 5, d.h + 8), roofMat);
  roof.position.set(d.w / 2, bodyH + 2.5, d.h / 2);
  roof.castShadow = true;
  g.add(roof);
  // slight peak ridge
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(d.w + 2, 3, 4), roofMat);
  ridge.position.set(d.w / 2, bodyH + 6, d.h / 2);
  ridge.castShadow = true;
  g.add(ridge);

  // south-face door recess
  const doorW = Math.min(14, d.w * 0.28);
  const doorH = Math.min(18, bodyH * 0.55);
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 2.2), darkMat);
  door.position.set(d.w / 2, doorH / 2 + 1, d.h - 0.4);
  g.add(door);
  const jamb = new THREE.Mesh(new THREE.BoxGeometry(doorW + 3, doorH + 2, 1.2), trimMat);
  jamb.position.set(d.w / 2, doorH / 2 + 1, d.h - 1.6);
  g.add(jamb);

  // windows on south facade
  const winY = bodyH * 0.62;
  const winZ = d.h - 0.5;
  for (const sx of [0.28, 0.72]) {
    const wx = d.w * sx;
    if (Math.abs(wx - d.w / 2) < doorW * 0.7) continue;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 1.4), trimMat);
    frame.position.set(wx, winY, winZ - 0.8);
    g.add(frame);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 1.2), new THREE.MeshLambertMaterial({ color: 0x7ec8e8 }));
    pane.position.set(wx, winY, winZ - 0.2);
    g.add(pane);
  }

  g.position.set(d.x, 0, d.y);
  root.add(g);
  return g;
}

const ENTITY_TOWER_ELEV = 46; // matches TOWER_ELEV in enemies.js (rooftop draw offset)

function heroTextureUrl(imgKey){
  if (!imgKey) return null;
  // loadImg keys are 'hero-kai' → files 'hero-kai-v2.png'
  return 'assets/img/' + imgKey + '-v2.png';
}

function applyHeroBillboardMap(plane, tex){
  applyTexColorSpace(tex);
  tex.needsUpdate = true;
  const mat = plane.material;
  if (mat.map && mat.map !== tex) mat.map.dispose();
  mat.map = tex;
  mat.color.set(0xffffff);
  mat.transparent = true;
  mat.alphaTest = 0.12;
  mat.depthWrite = false;
  mat.needsUpdate = true;
  plane.visible = true;
  const body = plane.parent?.getObjectByName('proxyBody');
  const head = plane.parent?.getObjectByName('proxyHead');
  if (body) body.visible = false;
  if (head) head.visible = false;
}

function makeHumanMesh(look, opts = {}){
  const g = new THREE.Group();
  const isPlayer = !!opts.isPlayer;
  g.userData.isPlayer = isPlayer;
  g.userData.billboard = isPlayer;

  const skin = new THREE.Color(look?.skin || '#e8b48c');
  const outfit = new THREE.Color(look?.outfit || '#888888');
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(7, 10, 4, 8),
    new THREE.MeshLambertMaterial({ color: outfit })
  );
  body.name = 'proxyBody';
  body.position.y = 14;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(8, 12, 10),
    new THREE.MeshLambertMaterial({ color: skin })
  );
  head.name = 'proxyHead';
  head.position.y = 28;
  head.castShadow = true;

  const wrist = new THREE.Group();
  wrist.name = 'wrist';
  wrist.position.set(10, 18, 4);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 2.8, 16),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2e })
  );
  gun.position.z = 8;
  gun.castShadow = true;
  wrist.add(gun);

  g.add(body, head, wrist);

  if (isPlayer) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 46),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, alphaTest: 0.12,
        depthWrite: false, side: THREE.DoubleSide,
      })
    );
    plane.name = 'billboard';
    plane.position.y = 23;
    plane.visible = false;
    g.add(plane);

    const applyImg = (img) => {
      if (!img || !img.naturalWidth) return false;
      applyHeroBillboardMap(plane, new THREE.Texture(img));
      return true;
    };
    if (opts.imgEl && applyImg(opts.imgEl)) {
      // ok
    } else {
      const url = heroTextureUrl(opts.imgKey);
      if (url) {
        texLoader.load(url, (tex) => {
          if (!plane.parent) { tex.dispose(); return; }
          applyHeroBillboardMap(plane, tex);
        });
      }
    }
  }

  root.add(g);
  return g;
}

function makeZombieMesh(kind, size = 1){
  const g = new THREE.Group();
  const s = size || 1;
  const col = kind === 'brute' || kind === 'juggernaut' ? 0x4a5a3a : 0x5a7a4a;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(7 * s, 12 * s, 4, 8),
    new THREE.MeshLambertMaterial({ color: col })
  );
  body.position.y = 14 * s;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(7 * s, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x6a8a5a })
  );
  head.position.y = 28 * s;
  head.castShadow = true;
  g.add(body, head);
  root.add(g);
  return g;
}

function syncEntityMesh(e){
  if (!e.mesh) return;
  const elev = e.onTower ? ENTITY_TOWER_ELEV : 0;
  e.mesh.position.set(e.x, elev, e.y);
  const wrist = e.mesh.getObjectByName('wrist');
  const billboard = e.mesh.getObjectByName('billboard');
  if (e.mesh.userData.billboard && billboard && camera) {
    // Keep group unrotated; face the hero plane at the camera; aim only the gun wrist.
    e.mesh.rotation.y = 0;
    billboard.quaternion.copy(camera.quaternion);
    if (wrist) {
      const reach = 12;
      wrist.position.set(Math.cos(e.aim) * reach, 18, Math.sin(e.aim) * reach);
      wrist.rotation.set(0, -e.aim + Math.PI / 2, 0);
    }
  } else {
    e.mesh.rotation.y = -e.aim + Math.PI / 2;
    if (wrist) {
      wrist.position.set(8, 18, 0);
      wrist.rotation.set(0, 0, 0);
    }
  }
}

function bulletColor(b){
  if (b.acid) return 0xc6ff4a;
  if (b.color) return new THREE.Color(b.color).getHex();
  return 0xffe066;
}

function makeBulletMesh(b){
  const r = b.r || (b.acid ? 5 : 2.2);
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 6, 6),
    new THREE.MeshBasicMaterial({ color: bulletColor(b) })
  );
  root.add(m);
  return m;
}

function syncBullet(b){
  if (!b.mesh) return;
  const y = b.acid ? 10 : 8;
  b.mesh.position.set(b.x, y, b.y);
}

const PICKUP_MESH_COL = { health: 0x5fd35f, medkit: 0xff5a6e, armor: 0x5fa8ff, weapon: 0xc08bff };

function makePickupMesh(p){
  const col = PICKUP_MESH_COL[p.kind] || 0xffffff;
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(p.r || 13, 8, 8),
    new THREE.MeshBasicMaterial({ color: col })
  );
  root.add(m);
  return m;
}

function syncPickup(p){
  if (!p.mesh) return;
  const bob = Math.sin(p.t * 4) * 2;
  p.mesh.position.set(p.x, 6 + bob, p.y);
}

function makeBombMesh(){
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(5, 5, 5),
    new THREE.MeshBasicMaterial({ color: 0xff3a2a })
  );
  root.add(m);
  return m;
}

function syncBomb(b){
  if (!b.mesh) return;
  b.mesh.position.set(b.x, 7, b.y);
}

function setZone(cx, cy, r){
  if (!ready || !root) return;
  const show = r > 0;
  if (!zoneMesh) {
    const geo = new THREE.RingGeometry(0.95, 1, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x66ffcc, side: THREE.DoubleSide, transparent: true, opacity: 0.35,
    });
    zoneMesh = new THREE.Mesh(geo, mat);
    zoneMesh.rotation.x = -Math.PI / 2;
    root.add(zoneMesh);
  }
  zoneMesh.visible = show;
  if (!show) return;
  zoneMesh.position.set(cx, 0.5, cy);
  zoneMesh.scale.set(r, r, 1);
}

function setDayFactor(t01){
  if (!ready || !hemiLight || !keyLight) return;
  const t = Math.max(0, Math.min(1, t01));
  const dim = 0.32 + 0.68 * t;
  hemiLight.intensity = HEMI_INTENSITY_BASE * dim;
  keyLight.intensity = KEY_INTENSITY_BASE * (0.28 + 0.72 * t);
}

window.World3D = {
  ready: false, THREE, scene: null, root: null, camera: null,
  init(canvas){
    if (!init(canvas)) return false;
    window.World3D.scene = scene;
    window.World3D.root = root;
    window.World3D.camera = camera;
    return true;
  },
  resize, render, setCamFollow, setShake, showFail, buildGround, setGroundTexture, makeBuildingMesh, disposeMesh,
  makeHumanMesh, makeZombieMesh, syncEntityMesh,
  makeBulletMesh, syncBullet, makePickupMesh, syncPickup, makeBombMesh, syncBomb,
  setZone, setDayFactor, syncVfx, screenToGround, worldToScreen,
  getScene(){ return scene; },
  getRoot(){ return root; },
};

// Game must call World3D.init(cv) only after #cv has no 2D context (see stage.js / Task 2).
