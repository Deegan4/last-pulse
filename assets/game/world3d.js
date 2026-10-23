// World3D — procedural high-angle playfield (no Meshy).
// Sim (x,y) maps to Three.js (x, 0, y). Camera: ortho, pitch/yaw from game tunables.
import * as THREE from '../vendor/three/three.module.js';

const DEG = Math.PI / 180;
let renderer, scene, camera, root, follow = { x: 1100, y: 320 };
let ready = false;

const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();

function screenToGround(cssX, cssY, rect){
  if (!ready || !camera) return null;
  _ndc.x = ((cssX - rect.left) / rect.width) * 2 - 1;
  _ndc.y = -((cssY - rect.top) / rect.height) * 2 + 1;
  _raycaster.setFromCamera(_ndc, camera);
  if (!_raycaster.ray.intersectPlane(_plane, _hit)) return null;
  return { x: _hit.x, y: _hit.z };
}

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

function buildGround(arenaW, arenaH){
  if (!ready || !root) return null;
  const geo = new THREE.PlaneGeometry(arenaW, arenaH);
  const mat = new THREE.MeshLambertMaterial({ color: 0x3d5a32 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(arenaW / 2, 0, arenaH / 2);
  root.add(mesh);
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

const ENTITY_TOWER_ELEV = 46; // matches TOWER_ELEV in enemies.js (rooftop draw offset)

function makeHumanMesh(look){
  const g = new THREE.Group();
  const skin = new THREE.Color(look?.skin || '#e8b48c');
  const outfit = new THREE.Color(look?.outfit || '#888888');
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(7, 10, 4, 8),
    new THREE.MeshLambertMaterial({ color: outfit })
  );
  body.position.y = 14;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(8, 12, 10),
    new THREE.MeshLambertMaterial({ color: skin })
  );
  head.position.y = 28;
  const wrist = new THREE.Group();
  wrist.name = 'wrist';
  wrist.position.set(8, 18, 0);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 14),
    new THREE.MeshLambertMaterial({ color: 0x222222 })
  );
  gun.position.z = 7;
  wrist.add(gun);
  g.add(body, head, wrist);
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
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(7 * s, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x6a8a5a })
  );
  head.position.y = 28 * s;
  g.add(body, head);
  root.add(g);
  return g;
}

function syncEntityMesh(e){
  if (!e.mesh) return;
  const elev = e.onTower ? ENTITY_TOWER_ELEV : 0;
  e.mesh.position.set(e.x, elev, e.y);
  e.mesh.rotation.y = -e.aim + Math.PI / 2;
  const wrist = e.mesh.getObjectByName('wrist');
  if (wrist) wrist.rotation.y = 0;
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
  resize, render, setCamFollow, showFail, buildGround, makeBuildingMesh, disposeMesh,
  makeHumanMesh, makeZombieMesh, syncEntityMesh, screenToGround,
  getScene(){ return scene; },
  getRoot(){ return root; },
};

// Game must call World3D.init(cv) only after #cv has no 2D context (see stage.js / Task 2).
