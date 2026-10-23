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
  getScene(){ return scene; },
  getRoot(){ return root; },
};

// Game must call World3D.init(cv) only after #cv has no 2D context (see stage.js / Task 2).
