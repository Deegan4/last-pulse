const keys=Object.create(null);
const mouse={x:W/2,y:H/2,down:false};
window.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  keys[k]=true;
  if(k==='r' && player) startReload(player);
  if(k==='q' && player) castLightning(player);
  if(k==='e' && player) throwBomb(player);
  if(k==='f' && player) castGrapple(player);
  if(k==='b' && player) cycleBuild(player);
},{passive:false});
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });
cv.addEventListener('mousemove',e=>{ const r=cv.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top; });
cv.addEventListener('mousedown',e=>{ if(e.button===0){ mouse.down=true; audioInit(); } });
window.addEventListener('mouseup',e=>{ if(e.button===0) mouse.down=false; });
cv.addEventListener('contextmenu',e=>e.preventDefault());

// twin-stick touch
const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
document.body.classList.toggle('touch', isTouch);   // hide desktop-only keybind hints on touch
const moveVec={x:0,y:0,active:false};
const aimVec={x:0,y:0,active:false};
function stick(zoneId, baseId, knobId, hintId, vec){
  const z=el(zoneId), base=el(baseId), knob=el(knobId), hint=el(hintId);
  let id=null, ox=0, oy=0; const cap=58, DEAD=0.14;
  const sr=()=>cv.getBoundingClientRect();
  z.addEventListener('touchstart',e=>{ const t=e.changedTouches[0]; id=t.identifier; const r=sr();
    ox=t.clientX-r.left; oy=t.clientY-r.top;
    base.style.left=knob.style.left=ox+'px'; base.style.top=knob.style.top=oy+'px';
    base.classList.add('on'); knob.classList.add('on'); if(hint) hint.classList.add('hide');
    vec.active=true; vec.x=vec.y=0; audioInit(); e.preventDefault(); },{passive:false});
  z.addEventListener('touchmove',e=>{ const r=sr();
    for(const t of e.changedTouches){ if(t.identifier!==id) continue;
      let dx=(t.clientX-r.left)-ox, dy=(t.clientY-r.top)-oy; let m=len(dx,dy);
      if(m>cap){ dx=dx/m*cap; dy=dy/m*cap; m=cap; }
      knob.style.left=(ox+dx)+'px'; knob.style.top=(oy+dy)+'px';
      const mag=m/cap, f = mag<DEAD?0:(mag-DEAD)/(1-DEAD);  // deadzone, scaled
      vec.x = m>0 ? dx/m*f : 0; vec.y = m>0 ? dy/m*f : 0;
    } e.preventDefault(); },{passive:false});
  const end=e=>{ for(const t of e.changedTouches){ if(t.identifier===id){ id=null; vec.x=vec.y=0; vec.active=false;
    base.classList.remove('on'); knob.classList.remove('on'); if(hint) hint.classList.remove('hide'); } } };
  z.addEventListener('touchend',end); z.addEventListener('touchcancel',end);
}
function setupTouch(){
  stick('moveZone','moveBase','moveKnob','moveHint',moveVec);
  stick('aimZone','aimBase','aimKnob','aimHint',aimVec);
  if(!isTouch){ // desktop: hide hints and let mouse clicks pass through the stick zones
    el('moveHint').style.display='none'; el('aimHint').style.display='none';
    el('moveZone').style.pointerEvents='none'; el('aimZone').style.pointerEvents='none';
  }
  // power buttons (tap)
  const bind=(id,fn)=>{ const b=el(id); const go=e=>{e.preventDefault(); audioInit(); fn();};
    b.addEventListener('touchstart',go,{passive:false}); b.addEventListener('mousedown',go); };
  bind('boltBtn',()=>player&&castLightning(player));
  bind('bombBtn',()=>player&&throwBomb(player));
  bind('grapBtn',()=>player&&castGrapple(player));
  bind('buildBtn',()=>player&&cycleBuild(player));
  bind('powerFab', togglePowers);   // open / close the ability cluster
  bind('mmFab', toggleMinimap);     // open / close the minimap panel
}
function togglePowers(){ const p=el('powers'); if(p){ p.classList.toggle('collapsed'); sfx('tick'); } }
function toggleMinimap(){ const p=el('mmwrap'); if(p){ p.classList.toggle('collapsed'); sfx('tick'); } }

// ============================================================
//  Audio
// ============================================================
let actx=null, master=null, dryIn=null, revBus=null, NOISE=null;
// static waveshaper curve — soft-clips oscillators into a gritty, overdriven tone (for guns)
