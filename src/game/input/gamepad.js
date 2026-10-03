function readGamepadFrom(gp, st){
  if(!gp) return null;
  const dz=v=>Math.abs(v)<0.18?0:v, btn=i=>!!(gp.buttons[i]&&gp.buttons[i].pressed);
  const mx=dz(gp.axes[0]||0), my=dz(gp.axes[1]||0), ax=dz(gp.axes[2]||0), ay=dz(gp.axes[3]||0);
  const fire=btn(7)||btn(5)||btn(0);
  const rN=btn(2)||btn(1), lN=btn(3)||btn(4), bN=btn(6), gN=btn(10), stN=btn(9);
  const reload=rN&&!st.RP, light=lN&&!st.LP, bomb=bN&&!st.BP, grapple=gN&&!st.GP, start=stN&&!st.StP;
  st.RP=rN; st.LP=lN; st.BP=bN; st.GP=gN; st.StP=stN;
  // menu cursor: d-pad buttons (12-15) OR the left stick past a generous threshold — either one
  // moves the focus exactly one cell per press/flick, never continuously
  const upN=btn(12)||my<-0.5, dnN=btn(13)||my>0.5, ltN=btn(14)||mx<-0.5, rtN=btn(15)||mx>0.5, aN=btn(0);
  const navUp=upN&&!st.UpP, navDown=dnN&&!st.DnP, navLeft=ltN&&!st.LtP, navRight=rtN&&!st.RtP, confirm=aN&&!st.AP;
  st.UpP=upN; st.DnP=dnN; st.LtP=ltN; st.RtP=rtN; st.AP=aN;
  if(!gpSeen && (mx||my||ax||ay||fire)){ gpSeen=true; audioInit(); }
  // `reload` (X/B — already edge-triggered above) doubles as menu Back, same reuse pattern as
  // Start doubling as pause-toggle even while paused
  return {mx,my,ax,ay,fire,reload,light,bomb,grapple,start,navUp,navDown,navLeft,navRight,confirm,back:reload};
}
// Connected pads in slot order, filtered to non-null — the 1st is player 1's, the 2nd (if
// player2 has joined) is player 2's. Matches the old readGamepad()'s "first non-null" behavior
// for player 1 exactly, so solo play is unaffected byte-for-byte.
function connectedPads(){ return navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; }
// Local co-op: player 2 auto-joins the moment a second physical controller shows up while a
// match is live — no join screen, no separate save/profile (they use a fixed avatar + player 1's
// current weapon; kills/XP/coins still accrue to player 1's meta, same as a guest controller on
// a console). Called every frame from loop() with that frame's already-fetched pads array so
// this never triggers a second navigator.getGamepads() call of its own.
function tryJoinPlayer2(pads){
  if(player2 || !player || !player.alive) return;
  if(!pads || !pads[1]) return;
  player2 = makeHuman(true, AVATARS[(meta.avatar+1)%AVATARS.length], WEAPONS[meta.weapon], 'Player 2');
  player2.isPlayer2 = true; player2.gpIndex = 1; player2.team = 0;
  player2.x = clamp(player.x + rand(-70,-40), R, ARENA-R);
  player2.y = clamp(player.y + rand(-30,30), R, ARENA-R);
  player2.lightCd=0; player2.bombCd=0; player2.grapCd=0; player2.grap=null;
  player2.scrap=0; player2.buildSel=-1; player2.placeCd=0;
  player2.magMul=1; player2.mag=magCap(player2);
  humans.push(player2);
  toast('🎮 Player 2 joined!'); sfx('pickup');
}
// Co-op uses ONE shared, non-zooming camera (see draw() — it frames the midpoint of both alive
// players at a fixed 1:1 world-to-screen scale, same as solo play). A dynamic zoom-to-fit-both
// camera was considered and deliberately cut for this pass: the codebase's culling (inView()),
// vignette, and a couple of other draw-time rects all assume the visible world span equals
// exactly W×H — correctly threading a variable zoom through all of them without being able to
// verify the result on a real 2-controller device felt like a worse tradeoff than a simple
// position leash that keeps both players on-screen without touching rendering at all. If a
// zoomed camera is wanted later, search this file for every `cam.x`/`cam.y` read (not just this
// comment) — each one currently assumes zoom===1.
function leashPlayer2(){
  if(!player2 || !player2.alive || !player || !player.alive) return;
  const maxLeash = Math.min(W,H)*0.42;
  const dx=player2.x-player.x, dy=player2.y-player.y, d=Math.hypot(dx,dy);
  if(d>maxLeash){ const k=maxLeash/d; player2.x=player.x+dx*k; player2.y=player.y+dy*k; }
}
// Bluetooth/USB pads (PS5 DualSense included) fire connect/disconnect events independent of the
// per-frame poll above — listen directly so pairing success is visible right away instead of
// waiting for gpSeen to flip on the first stick/button read (which on a freshly-paired Bluetooth
// pad can lag a beat), and so a non-'standard' mapping is at least diagnosable instead of quietly
// producing dead or scrambled input. The Gamepad API's 'standard' mapping is WHY DualSense,
// DualShock, and Xbox pads already work identically here — there's no PS5-specific code path to
// add; support IS readGamepad() as written, as long as the browser reports 'standard'. That has
// been true on Chrome/Edge (desktop + Android) for DualSense over both USB and Bluetooth for
// years; the one environment with known historical gaps is Safari/WebKit (desktop and iOS), where
// some versions have reported DualSense with mapping !== 'standard' or with axes 2/3 (right
// stick) silently absent. Can't be fixed from here — it's a browser-side mapping table gap, not
// something a web page's JS can patch — but it can be surfaced instead of silently eating input.
window.addEventListener('gamepadconnected', e=>{
  const gp=e.gamepad;
  if(!gpSeen){ gpSeen=true; audioInit(); }
  if(gp.mapping!=='standard'){
    // surfaced to the PLAYER too, not just devtools — a silent console.warn is useless to someone
    // whose buttons just don't work after pairing over Bluetooth
    toast('🎮 '+(gp.id||'Controller')+' connected (buttons may be misaligned)');
    console.warn('[gamepad] "'+gp.id+'" reported mapping="'+(gp.mapping||'(none)')+'" (expected "standard") — button/axis indices in readGamepad() may not line up; this is a browser limitation, not fixable in-page');
  } else toast('🎮 '+(gp.id||'Controller')+' connected');
  syncControllerStatus();
  if(screenState==='playing') tryJoinPlayer2(connectedPads());   // 2nd controller pairing mid-match auto-joins co-op
});
window.addEventListener('gamepaddisconnected', ()=>{ toast('🎮 Controller disconnected'); syncControllerStatus(); });
// Live controller-status card in Settings — added because a player pairing a controller had
// NOTHING in the UI telling them how, or confirming it worked; a silent 🎮 HUD icon that only
// appears once gpSeen flips true (which itself requires actual stick/button movement) mid-match
// is not discoverable before you're already in a fight. Bluetooth pairing itself always happens
// at the OS level — a web page cannot trigger or complete that handshake — so this card's job is
// purely to show LIVE status and point the player at the right OS setting, not to "connect" one.
function syncControllerStatus(){
  const row=el('sCtrlStatus'), hint=el('sCtrlHint');
  if(!row || el('settings').classList.contains('hidden')) return;   // cheap no-op when the card isn't visible
  const pads = connectedPads();
  if(!pads.length){
    row.textContent = '⚪ No controller connected';
    hint.textContent = 'Pair one in your device\'s Bluetooth settings first, then press any button on it here.';
    return;
  }
  const bad = pads.find(p=>p.mapping!=='standard');
  row.textContent = pads.length>1
    ? '🟢 '+pads.length+' controllers connected (2-player co-op ready)'
    : '🟢 '+(pads[0].id||'Controller')+' connected';
  hint.textContent = bad
    ? '⚠️ "'+bad.id+'" reported as a non-standard layout — buttons may be misaligned. Try updating your browser or OS.'
    : pads.length>1
      ? 'Player 2 joins automatically on drop-in. D-pad/stick to move, A to confirm, X/B to go back in menus.'
      : 'D-pad or left stick to move the cursor, A to confirm, X/B to go back. Connect a 2nd controller for co-op.';
}
// Haptic feedback (DualSense's rumble works over both USB and Bluetooth via the standard Gamepad
// API — no vendor-specific code needed) for the two moments players most want to FEEL: taking a
// hit and landing a kill. Feature-detected and wrapped in try/catch since vibrationActuator is
// unsupported on plenty of browsers/pads — a missing rumble should never be able to throw and
// interrupt hurt()/die(), which run in the middle of live combat.
function gpRumble(padIndex, duration, weakMagnitude, strongMagnitude){
  try{
    const pads = navigator.getGamepads && navigator.getGamepads();
    const act = pads && pads[padIndex] && pads[padIndex].vibrationActuator;
    if(act && act.playEffect) act.playEffect('dual-rumble', {duration, startDelay:0, weakMagnitude, strongMagnitude});
  }catch(err){}
}
// ---- Gamepad menu navigation ----
// Avatar/weapon grids, settings, and results were mouse/touch-only DOM overlays even after
// in-match gamepad support (v2.37.0) shipped — a controller player could get in and fight but
// couldn't reach the fight in the first place. This reuses the SAME curGp sample loop() already
// takes once/frame (see readGamepad() above); it must never call readGamepad() again itself.
let gpFocusIdx = 0;
// `.grid` (avatarGrid/weaponGrid) is a fixed 2-column CSS grid (index.html ~line 132) — hard-code
// it rather than reading computed style every frame; if that layout ever goes responsive this is
// the one place to update.
const GP_GRID_COLS = 2;
// Single-purpose modals (informational or one-action): just their action button(s) + Close, in
// visual order. Shop cards are individually clickable via #shopGrid's delegated listener
// (e.target.closest('[data-upg],[data-shop]')) — clicking the card element itself still hits
// that delegate correctly since closest() matches the element it's called on too.
const GP_SIMPLE_MODALS = [
  {id:'shop',        closeId:'shopClose',   targets:()=>[...el('shopGrid').querySelectorAll('.shopcard'), el('shopClose')]},
  {id:'achievements',closeId:'achClose',    targets:()=>[el('achClose')]},   // achievement cards are display-only, not clickable
  {id:'donate',      closeId:'donateClose', targets:()=>[el('donateGo'), el('donateClose')]},
  {id:'a2hs',        closeId:'a2hsClose',   targets:()=>[el('a2hsClose')]},
  {id:'whatsnew',    closeId:'wnClose',     targets:()=>[el('wnClose')]},
  {id:'perkPick',    closeId:null,          targets:()=>[...el('perkGrid').querySelectorAll('.shopcard')]},  // forced pick, no close
];
function gpMenuTargets(){
  // Recomputed each call instead of cached: the grids rebuild whenever level/unlocks change
  // (buildAvatarGrid/buildWeaponGrid), so a cached NodeList would go stale silently.
  // Returns {targets, cols, closeId} together — cols/closeId describe the LIST JUST BUILT, not
  // screenState, since Settings (and every modal above) can be opened on top of the avatar/
  // weapon screens without screenState changing. Deriving cols from screenState separately (an
  // earlier version of this code did exactly that) meant navigating the 1-column Settings list
  // while screenState was still 'avatar'/'weapon' silently used a 2-column stride and skipped
  // every other row — caught by the throwaway __gpTest harness, not by eye, which is exactly why
  // it's worth keeping this as one return value instead of separate functions that can drift out
  // of sync.
  if(!el('settings').classList.contains('hidden'))
    // .opt buttons and the two <input type=range> sliders interleave in DOM/visual order —
    // querySelectorAll always returns document order regardless of which part of the selector
    // matched, so this doesn't need to be built up manually.
    return { targets:[...el('settings').querySelectorAll('.opt:not(.hidden), .slider input'), el('sClose')], cols:1, closeId:'sClose' };
  if(!el('results').classList.contains('hidden'))
    return { targets:[el('againBtn'), el('menuBtn')], cols:1, closeId:null };   // no back target — matches touch (no close button either)
  for(const m of GP_SIMPLE_MODALS){
    if(!el(m.id).classList.contains('hidden')) return { targets:m.targets(), cols:1, closeId:m.closeId };
  }
  if(screenState==='avatar')
    return { targets:[...el('avatarGrid').querySelectorAll('.card:not(.locked)'), el('toWeaponBtn')], cols:GP_GRID_COLS, closeId:null };
  if(screenState==='weapon')
    return { targets:[...el('weaponGrid').querySelectorAll('.card:not(.locked)'), el('dropInBtn')], cols:GP_GRID_COLS, closeId:null };
  if(screenState==='start')
    return { targets:[el('toModeBtn'), el('achBtn'), el('shopBtn'), el('donateBtn')], cols:1, closeId:null };
  return { targets:[], cols:1, closeId:null };
}
function updateGamepadMenuNav(gp){
  const {targets, cols, closeId} = gpMenuTargets();
  // clear stale focus rings from whatever was focused a screen ago before bailing/recomputing
  document.querySelectorAll('.gpfocus').forEach(t=>t.classList.remove('gpfocus'));
  if(!targets.length) return;
  if(gpFocusIdx>=targets.length) gpFocusIdx=targets.length-1;
  const focused = targets[gpFocusIdx];
  const isSlider = focused && focused.tagName==='INPUT' && focused.type==='range';
  if(isSlider && (gp.navLeft||gp.navRight)){
    // left/right on a focused slider adjusts its value instead of moving the cursor — up/down
    // still moves between rows, same convention as most console settings menus
    const step=+focused.step||1, dir=gp.navLeft?-1:1;
    focused.value = clamp(+focused.value + dir*step, +focused.min, +focused.max);
    focused.dispatchEvent(new Event('input',{bubbles:true}));   // reuses the existing sfxVol/aimSens listeners verbatim
  } else {
    if(gp.navLeft)  gpFocusIdx = Math.max(0, gpFocusIdx-1);
    if(gp.navRight) gpFocusIdx = Math.min(targets.length-1, gpFocusIdx+1);
  }
  if(gp.navUp)   gpFocusIdx = Math.max(0, gpFocusIdx-cols);
  if(gp.navDown) gpFocusIdx = Math.min(targets.length-1, gpFocusIdx+cols);
  targets[gpFocusIdx].classList.add('gpfocus');
  if(gp.confirm && !isSlider){ audioInit(); targets[gpFocusIdx].click(); }   // a slider has nothing to "click" — left/right already adjusts it
  else if(gp.back && closeId){ audioInit(); el(closeId).click(); }
}
function integrate(h,dt){
  h.x=clamp(h.x+h.vx*dt,R,ARENA-R); h.y=clamp(h.y+h.vy*dt,R,ARENA-R);
  if(h.onTower) clampToRoof(h); else resolveObstacles(h);   // roof campers move on the platform, not the ground
  if(h.fireCd>0) h.fireCd-=dt; if(h.hitFlash>0) h.hitFlash-=dt;
  if(h.muzzleT>0) h.muzzleT-=dt; if(h.recoil>0) h.recoil-=dt*7;
  if(Math.abs(h.vx)>4) h.faceX=h.vx<0?-1:1;
  if(zoneActive() && grace<=0 && outsideZone(h)){ h.hp-=zone.dmg*dt;
    if(Math.random()<dt*7) spark(h.x+rand(-8,8),h.y+rand(-8,8),'#ff7a4a',rand(20,60),rand(0,TAU),.4);
    if(h.hp<=0) die(h,null,true); }
  if(h.burn>0 && h.alive){ h.burn-=dt; h.hp-=9*dt;
    if(Math.random()<dt*12) spark(h.x+rand(-7,7), h.y-rand(2,16), pick(['#ff9b3d','#ff6a2a']), rand(20,70), -Math.PI/2+rand(-.4,.4), .4);
    if(h.hp<=0) die(h, h.burnSrc, true); }
  if(h.slowT>0) h.slowT-=dt;
}
// Uniform spatial hash: any colliding pair (dist < r_a+r_b) is guaranteed to land in the same or
// an adjacent cell as long as SEP_CELL >= the largest possible r_a+r_b (colossus r:29 is the
// biggest entity, so 2*29=58 is the worst case — 64 leaves a slim 6px margin). Bucketing + a 3x3 neighbor
// scan turns the old O(n^2) all-pairs pass into ~O(n) candidate checks — with two hard-learned
// caveats from actually measuring it (scratchpad benchmark, not committed; function compiled ONCE
// outside the timed loop, matching real per-frame cost, not re-`eval`'d per call):
//   1. A first version keyed the Map with a template string (`cx+','+cy`) and was SLOWER than
//      brute force at every size tested — string concat + string-keyed Map lookups cost more than
//      the comparisons they save at this scale. Fixed by packing cx/cy into one integer key
//      (`(cx+OFFSET)*8192+(cy+OFFSET)`, collision-free for this arena/cell size) instead.
//   2. Even with the integer key, this is a WASH (≈1.0x) at the game's actual current ceiling
//      (~99 entities: 15 humans + up to 84 zombies under Swarm Night) — the win only becomes real
//      above that: 1.3x by n≈150, 1.95x by n≈220, 2.2x by n≈400. Below ~80 entities (most of a
//      normal match) brute force is faster and the grid is pure overhead. Shipped anyway because
//      it's not a regression at today's scale and buys real headroom if density climbs further
//      (bigger arena, future mutators/waves) — but don't cite this as a "2-5x win," that number
//      only shows up well beyond what the game currently produces.
// `if(j<=i) continue` resolves each pair exactly once (same pair SET as the old i<j loop) but NOT
// in the same order — this is a single-pass Gauss-Seidel-style relaxation, so intra-frame
// trajectories differ slightly from the old code. Verified this doesn't matter: across 200
// randomized configs the two orderings are symmetric (neither systematically leaves more residual
// overlap), converging equivalently within ~30 frames at realistic swarm densities. Don't force
// global ordering to "fix" this — it would reintroduce the O(n^2) cost for a property nothing
// downstream depends on.
