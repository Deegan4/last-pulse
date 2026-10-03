// Which entities have a generated model. As more GLBs are produced, add rows here
// (or generate this map from assets/meshy/manifest.json). Player avatar 0 = Alex.
// Keyed by avatar NAME (h.avatar.name) and zombie kind — both are visible on the entity,
// so this works for the player and every bot without reaching into the game's closures.
// Fallback used only if the generated loader can't be imported — keeps the pilot assets working.
const FALLBACK_FILES = {
  'avatar:alex':   'assets/meshy/alex-walk.glb',
  // zombies are hand-drawn 2D monsters now — no 3D billboard (drawZombie no longer calls the 3D layer)
};
const BUILDING_FILES = {
  'building:house': 'assets/buildings/building-house.glb',
  'building:shop':  'assets/buildings/building-shop.glb',
  'building:barn':  'assets/buildings/building-barn.glb',
  'building:cabin': 'assets/buildings/building-cabin.glb',
};
const SPRITE = 256;                                  // offscreen render-tile size (px)
const WORLD_H = { character: 46, zombie: 44 };       // on-field pixel height to draw the billboard

(async () => {
  let THREE, GLTFLoader;
  try {
    // three.js is vendored under assets/vendor/three (r169) — no CDN, so this works offline and in
    // sandboxed/CI headless renders. GLTFLoader's own imports were rewritten to the local module.
    THREE = await import('../vendor/three/three.module.js');
    ({ GLTFLoader } = await import('../vendor/three/GLTFLoader.js'));
  } catch { return; }                                // missing vendor files → stay fully 2D

  // Build the model map from the auto-generated manifest loader so EVERY generated model
  // wires itself in — run scripts/gen-meshy.mjs to produce more and they light up on next
  // load with no code change. Characters prefer their walk animation; keys mirror the
  // in-game entity (lowercased avatar name / zombie kind), matching loader ids.
  let MODEL_FILES = FALLBACK_FILES;
  try {
    const { MODELS } = await import('../meshy/loader.js');
    const map = {};
    for (const m of MODELS) {
      if (m.status !== 'generated') continue;
      if (m.type === 'character') map['avatar:' + m.id] = 'assets/meshy/' + (m.walk || m.preview);
      // zombie models intentionally skipped — enemies are hand-drawn 2D monsters
    }
    if (Object.keys(map).length) MODEL_FILES = { ...map, ...BUILDING_FILES };
  } catch {}                                          // loader missing → fall back to pilots
  MODEL_FILES = { ...MODEL_FILES, ...BUILDING_FILES };

  let renderer;
  const tile = document.createElement('canvas'); tile.width = tile.height = SPRITE;
  try { renderer = new THREE.WebGLRenderer({ canvas: tile, antialias: true, alpha: true }); }
  catch { return; }                                  // no WebGL → stay fully 2D
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x40402e, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2, 5, 4); scene.add(key);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  const loader = new GLTFLoader(), clock = new THREE.Clock();

  // one loaded model = { root, mixer, baseY, frontFacing } kept off-scene until rendered
  const models = {};
  for (const [k, url] of Object.entries(MODEL_FILES)) {
    loader.load(url, g => {
      const root = g.scene;
      const box = new THREE.Box3().setFromObject(root), sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      root.position.sub(c); root.position.y += sz.y / 2;     // feet at y=0
      const m = { root, h: sz.y, mixer: null };
      if (g.animations?.length) { m.mixer = new THREE.AnimationMixer(root); m.mixer.clipAction(g.animations[0]).play(); }
      models[k] = m;
    }, undefined, () => {});                                 // per-model failure → that entity stays 2D
  }

  // Render model `key` facing `flip` to the offscreen tile; returns the tile canvas or null.
  function renderTile(key, flip, opts = {}) {
    const m = models[key]; if (!m) return null;
    scene.add(m.root);
    if (opts.building) m.root.rotation.set(0, Math.PI / 5.4, 0);             // fixed 3/4 facade view
    else m.root.rotation.set(0, flip < 0 ? -Math.PI / 2.4 : Math.PI / 2.4, 0);   // 3/4 view, faces travel dir
    const h = m.h, dist = h * 1.7;
    if (opts.building) camera.position.set(0, h * 0.68, dist * 1.18);
    else camera.position.set(0, h * 0.52, dist);
    camera.lookAt(0, h * (opts.building ? 0.46 : 0.5), 0);
    camera.aspect = 1; camera.updateProjectionMatrix();
    renderer.setSize(SPRITE, SPRITE, false);
    renderer.render(scene, camera);
    scene.remove(m.root);
    return tile;
  }

  let lastT = 0;
  function tickAnim() { const dt = clock.getDelta(); for (const k in models) models[k].mixer?.update(dt); }

  function blit(ctx, key, wx, wy, drawH, flip) {
    const t = renderTile(key, flip); if (!t) return false;
    const dw = drawH, dh = drawH;                            // square tile; model centered, feet near bottom
    // tile has feet ~center-bottom; align the model's feet to (wx,wy)
    ctx.drawImage(t, wx - dw / 2, wy - dh * 0.92, dw, dh);
    return true;
  }

  // Public API consumed by drawHuman/drawBuilding. Returns true if it drew the entity in 3D.
  window.Models3D = {
    ready: true,
    _tickedAt: -1,
    _tickOnce() { const n = performance.now(); if (n !== this._tickedAt) { this._tickedAt = n; tickAnim(); } },
    drawHuman(ctx, h) {
      const key = 'avatar:' + ((h.avatar && h.avatar.name || '').toLowerCase());
      if (!models[key]) return false;
      this._tickOnce();
      return blit(ctx, key, h.x, h.y + 18, WORLD_H.character, h.faceX < 0 ? -1 : 1);
    },
    drawZombie(ctx, z) {
      const key = 'zombie:' + z.kind;
      if (!models[key]) return false;
      this._tickOnce();
      return blit(ctx, key, z.x, z.y + 18, WORLD_H.zombie * (z.size || 1), z.faceX < 0 ? -1 : 1);
    },
    drawBuilding(ctx, d) {
      const key = 'building:' + (d.kind || 'house');
      if (!models[key]) return false;
      const t = renderTile(key, 1, { building: true }); if (!t) return false;
      ctx.save();
      ctx.globalAlpha = d.fade === undefined ? 1 : d.fade;
      const dw = d.w * 1.26, dh = d.h * 1.62;
      ctx.drawImage(t, d.x + d.w / 2 - dw / 2, d.y + d.h - dh * 0.88, dw, dh);
      ctx.restore();
      return true;
    },
  };

  // Also power the avatar-screen hero preview from the same loaded Alex model.
  const hero = document.getElementById('hero3d');
  if (hero) {
    const hctx = hero.getContext('2d');
    (function heroLoop() {
      requestAnimationFrame(heroLoop);
      const avatarScreen = document.getElementById('avatarScreen');
      if (!avatarScreen || avatarScreen.classList.contains('hidden')) return;
      window.Models3D._tickOnce();
      // Follow the CURRENTLY SELECTED avatar, not whichever model loaded first. The selected card
      // carries the avatar name in .nm2; key mirrors the in-game entity ('avatar:'+lowercased name).
      // If that avatar has no 3D model (or none selected yet), hide the hero and let the 2D card show.
      const selName = (avatarScreen.querySelector('.card.sel .nm2')?.textContent || '').trim().toLowerCase();
      const heroKey = selName && ('avatar:' + selName);
      const t = heroKey && models[heroKey] ? renderTile(heroKey, 1) : null;
      if (!t) { hero.classList.remove('ready'); return; }
      hero.classList.add('ready');
      hctx.clearRect(0, 0, hero.width, hero.height);
      hctx.drawImage(t, 0, 0, hero.width, hero.height);
    })();
  }
})();
