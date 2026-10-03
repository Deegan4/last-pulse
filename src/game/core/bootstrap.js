// ---------- button wiring ----------
el('nameInput').value = meta.name==='deegan'?'':meta.name;
el('nameInput').placeholder = 'deegan';
el('toModeBtn').addEventListener('click',goAvatar);   // straight to fighter select — horde is the game
el('fighterPortrait').addEventListener('click',goAvatar);
el('changeAvatar').addEventListener('click',goAvatar);
el('toWeaponBtn').addEventListener('click',()=>{ buildWeaponGrid(); screenState='weapon'; show('weaponScreen'); });
el('dropInBtn').addEventListener('click', startMatch);
el('againBtn').addEventListener('click',()=>{ el('results').classList.add('hidden'); startMatch(); });
el('menuBtn').addEventListener('click',()=>{ el('results').classList.add('hidden'); screenState='start'; menuScene(); show('startScreen'); });
el('rDonate').addEventListener('click', openDonate);   // results-screen donation nudge → donate modal
// achievements
el('achBtn').addEventListener('click',()=>{ audioInit(); openAchievements(); });
el('achClose').addEventListener('click',closeAchievements);
// shop
el('shopBtn').addEventListener('click',()=>{ audioInit(); openShop(); });
el('shopClose').addEventListener('click',closeShop);
el('shopGrid').addEventListener('click',e=>{ const u=e.target.closest('[data-upg]'); if(u){ buyMag(); return; }
  const iap=e.target.closest('[data-iap]'); if(iap){ nativePurchase(iap.dataset.iap); return; }
  const c=e.target.closest('[data-shop]'); if(c){ shopTap(c.dataset.shop); return; }
  const bn=e.target.closest('[data-banner]'); if(bn) bannerTap(bn.dataset.banner); });
// perk pick (mid-run, every 3rd wave — see openPerkPick/choosePerk)
el('perkGrid').addEventListener('click',e=>{ const p=e.target.closest('[data-perk]'); if(p) choosePerk(p.dataset.perk); });
// donate / support
el('donateBtn').addEventListener('click',()=>{ audioInit(); openDonate(); });
el('donateGo').addEventListener('click',donateGo);
el('donateClose').addEventListener('click',closeDonate);
el('iapUnlockBtn').addEventListener('click',()=>{ audioInit(); nativePurchase(IAP_UNLOCKALL_ID); });
el('iapRestoreBtn').addEventListener('click',()=>{ audioInit(); nativeRestore(); toast('Checking for past purchases…'); });
el('gcLeaderboardBtn').addEventListener('click',()=>{ audioInit(); nativeShowLeaderboard(); });
// add to home screen (iOS)
el('a2hsBtn').addEventListener('click',openA2HS);
el('a2hsClose').addEventListener('click',closeA2HS);
syncA2HS();
// what's-new
el('wnClose').addEventListener('click',closeWhatsNew);
// BUILD IDENTITY — stamp which build/surface this actually is, so "is the page stale?" is answered
// at a glance instead of by probing the DOM. There is no build step to inject a git SHA (that would
// break the one-file pillar), so the discriminators are the three things that DO differ between
// surfaces: the version, the origin it was served from, and the file's own Last-Modified.
(()=>{ const where = location.host || (location.protocol==='file:' ? 'file://' : 'unknown');
  document.body.dataset.build = GAME_VERSION;
  document.body.dataset.src = where;
  document.body.dataset.mod = document.lastModified;
  try{ console.info('%cLast Pulse v'+GAME_VERSION+'%c  ·  '+where+'  ·  modified '+document.lastModified,
    'font-weight:700;color:#7bbf2e','color:#888'); }catch(e){}
})();
el('verLink').textContent='v'+GAME_VERSION+' · what’s new';
el('verLink').addEventListener('click',openWhatsNew);
// spectate → results
el('specBtn').addEventListener('click',()=>{ if(!ended){ ended=true; showResults(false, deathPlace); } });

// settings sliders
function syncSliders(){ el('sfxVol').value=Math.round(meta.sfxVol*100); el('sfxVal').textContent=Math.round(meta.sfxVol*100)+'%';
  el('aimSens').value=Math.round(meta.aimSens*100); el('sensVal').textContent=meta.aimSens.toFixed(1)+'×'; syncPadToggles(); }
el('sfxVol').addEventListener('input',e=>{ meta.sfxVol=clamp(+e.target.value/100,0,1); el('sfxVal').textContent=Math.round(meta.sfxVol*100)+'%'; applyVolume(); saveMeta(); });
function syncPadToggles(){ el('sAimAssistTxt').textContent='Aim assist: '+(meta.aimAssist?'ON':'OFF');
  el('sRumbleTxt').textContent='Vibration: '+(meta.rumble?'ON':'OFF'); }
el('sAimAssist').addEventListener('click',()=>{ meta.aimAssist=!meta.aimAssist; saveMeta(); syncPadToggles(); });
el('sRumble').addEventListener('click',()=>{ meta.rumble=!meta.rumble; saveMeta(); syncPadToggles();
  if(meta.rumble) gpRumble(0,120,0.4,0.6); });   // buzz once so you can feel it turned on
el('aimSens').addEventListener('input',e=>{ meta.aimSens=clamp(+e.target.value/100,0.3,2); el('sensVal').textContent=meta.aimSens.toFixed(1)+'×'; saveMeta(); });

// settings
function syncMoreOptions(open){
  // mid-match (screenState==='playing', i.e. reached via the pause gear icon) hides the toggle
  // is unnecessary — profile/save/diagnostic items collapse by default there since they're not
  // what a player needs while fighting; every other context (pre-match avatar/weapon screens)
  // shows everything, same as before this button existed.
  const midMatch = screenState==='playing';
  el('sMoreToggle').classList.toggle('hidden', !midMatch);
  const show = !midMatch || open;
  document.querySelectorAll('.sMoreItem').forEach(b=>b.classList.toggle('hidden', !show));
  el('sMoreToggle').innerHTML = '<span class="oic">'+(show?'▾':'⋯')+'</span>'+(show?'Fewer options':'More options');
}
function openSettings(){ paused=true; el('settings').classList.remove('hidden');
  el('sQuit').classList.toggle('hidden', screenState!=='playing');   // only offer "quit to menu" mid-match
  syncMoreOptions(false);   // always starts collapsed on a fresh open
  syncSliders(); syncControllerStatus(); gpFocusIdx=0; }
function closeSettings(){ el('settings').classList.add('hidden'); if(screenState==='playing') paused=false; gpFocusIdx=0; }
// abandon the current match and return to the main menu (state is overwritten on the next Play)
function quitToMenu(){
  el('settings').classList.add('hidden'); el('results').classList.add('hidden'); el('specBar').classList.add('hidden');
  paused=false; ended=true; spectating=false; specTarget=null;
  el('hud').classList.add('hidden'); el('ctrl').classList.add('hidden'); el('powers').classList.add('hidden');
  screenState='start'; menuScene(); show('startScreen');
}
el('gearHud').addEventListener('click',openSettings);
el('sQuit').addEventListener('click',quitToMenu);
// save transfer
el('sExport').addEventListener('click',()=>{
  const code=exportSave();
  const done=()=>toast('💾 Save code copied — paste it on your other device');
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done,()=>prompt('Copy your save code:',code));
  else prompt('Copy your save code:',code);
});
el('sImport').addEventListener('click',()=>{
  const code=prompt('Paste your save code:');
  if(code===null) return;
  if(importSave(code)){ toast('📥 Save loaded! Lv '+meta.level+' · 🪙 '+meta.coins); renderMenu(); syncSliders(); }
  else toast('That code didn’t work — copy the WHOLE code, starting with LP1.');
});
// screen-fit diagnostic: every viewport number that matters, tap to close, Copy for support
// Turn the raw numbers into a verdict + pass/fail checks. Without this the report is ambiguous in
// the exact place it matters: `env probe 0/0` is CORRECT in a Safari tab (Safari's own chrome owns
// the notch band, so the web view never sees an inset) but a real BUG in the installed app. The
// raw output cannot tell those apart — these assertions can.
function fitChecks(){
  const vv=window.visualViewport, cs=getComputedStyle(document.documentElement);
  const g=el('game').getBoundingClientRect();
  const sa=inStandalone(), ap=isApple();
  const sat=parseFloat(cs.getPropertyValue('--sat'))||0, sab=parseFloat(cs.getPropertyValue('--sab'))||0;
  const vh=vv?Math.round(vv.height):window.innerHeight;
  const lost=Math.max(0, screen.height - window.innerHeight);
  const L=[], fail=[];
  // 1. the stage must fill the viewport it was given — this is resize()'s whole job
  const dh=Math.abs(Math.round(g.height)-vh);
  if(dh<=2) L.push('✓ stage fills viewport ('+Math.round(g.height)+'=='+vh+')');
  else { L.push('✗ stage '+Math.round(g.height)+' != viewport '+vh+' (off by '+dh+')'); fail.push('stage-fit'); }
  // 2. THE regression that matters: installed app must actually apply hardware insets. effInsets()
  //    substitutes 54/34 when env() lies, so a 0 here means the substitution itself broke.
  if(sa && ap){
    if(sat>=8 && sab>=8) L.push('✓ insets applied in standalone (--sat '+sat+' --sab '+sab+')');
    else { L.push('✗ standalone but --sat/--sab = '+sat+'/'+sab+' — effInsets() substitution FAILED'); fail.push('insets'); }
  } else L.push('· inset check n/a (not an installed app — env()=0 is correct here)');
  // 3. reclaimable screen space
  if(!sa && lost>40) L.push('· '+lost+'px of the '+screen.height+'px screen is browser chrome (reclaimable)');
  const reclaim = ap ? ' Add to Home Screen to reclaim.' : '';   // iOS-only advice; meaningless on desktop
  const verdict = sa
    ? (fail.length ? 'FULLSCREEN but BROKEN → '+fail.join(', ') : 'FULLSCREEN — fitting correctly')
    : (fail.length ? 'TAB and BROKEN → '+fail.join(', ')
                   : 'TAB — '+lost+'px lost to browser chrome.'+reclaim+' Not a bug.');
  return {verdict, lines:L, ok:!fail.length};
}
el('sFit').addEventListener('click',()=>{
  const vv=window.visualViewport;
  const cs=getComputedStyle(document.documentElement);
  const g=el('game').getBoundingClientRect();
  const fc=fitChecks();
  const rep=[
    'LAST PULSE screen fit  v'+GAME_VERSION,
    'url: '+location.host+location.pathname,
    'standalone: '+inStandalone()+'   apple: '+isApple(),
    'screen: '+screen.width+'x'+screen.height,
    'inner: '+window.innerWidth+'x'+window.innerHeight,
    'clientH: '+document.documentElement.clientHeight,
    'visualViewport: '+(vv?Math.round(vv.width)+'x'+Math.round(vv.height):'n/a'),
    'env probe top/bottom: '+safeTopPx()+' / '+safeBottomPx(),
    'applied --sat/--sab: '+cs.getPropertyValue('--sat').trim()+' / '+cs.getPropertyValue('--sab').trim(),
    'stage rect: top '+Math.round(g.top)+' h '+Math.round(g.height),
    'storage: '+(storageOk()?'OK':'NOT SAVING'),
    '',
    'VERDICT: '+fc.verdict,
    ...fc.lines,
  ].join('\n');
  const box=document.createElement('div');
  box.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;max-width:92vw;'
    +'padding:14px 16px;font:600 12px/1.55 monospace;background:rgba(0,0,0,.92);'
    +'border-radius:12px;white-space:pre;'
    +(fc.ok?'color:#bfff5a;border:1.5px solid #6f9a25;':'color:#ffb4a8;border:1.5px solid #d8452e;');
  box.textContent=rep+'\n\n[ tap to close ]';
  const cp=document.createElement('button');
  cp.textContent='COPY REPORT'; cp.style.cssText='display:block;margin-top:10px;padding:8px 14px;border:none;border-radius:8px;background:#7bbf2e;color:#12280a;font-weight:800;cursor:pointer';
  cp.addEventListener('click',e=>{ e.stopPropagation();
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(rep).then(()=>toast('Report copied'),()=>prompt('Copy this report:',rep));
    else prompt('Copy this report:',rep); });
  box.appendChild(cp);
  box.addEventListener('click',()=>box.remove());
  document.body.appendChild(box);
});
// warn once at boot when this browser can't persist progress at all
if(!storageOk()){
  setTimeout(()=>toast('⚠️ This browser can’t save progress — open in Safari and Add to Home Screen'), 1600);
  setTimeout(()=>toast('⚠️ Progress won’t be saved here! Use Safari → Add to Home Screen'), 12000);
}
el('avatarGear').addEventListener('click',openSettings);
el('weaponGear').addEventListener('click',openSettings);
el('sClose').addEventListener('click',closeSettings);
el('sMoreToggle').addEventListener('click',()=>{ syncMoreOptions(el('sAvatar').classList.contains('hidden')); gpFocusIdx=0; });
el('sAvatar').addEventListener('click',()=>{ closeSettings(); buildAvatarGrid(); screenState='avatar'; show('avatarScreen');
  el('hud').classList.add('hidden'); el('ctrl').classList.add('hidden'); el('powers').classList.add('hidden'); });
el('sWeapon').addEventListener('click',()=>{ closeSettings(); buildWeaponGrid(); screenState='weapon'; show('weaponScreen');
  el('hud').classList.add('hidden'); el('ctrl').classList.add('hidden'); el('powers').classList.add('hidden'); });
el('sShop').addEventListener('click',()=>{ audioInit(); shopFromSettings=true; el('settings').classList.add('hidden'); openShop(); gpFocusIdx=0; });
el('sName').addEventListener('click',()=>{ closeSettings(); screenState='start'; show('startScreen');
  el('hud').classList.add('hidden'); el('ctrl').classList.add('hidden'); el('powers').classList.add('hidden'); el('nameInput').focus(); });

// mode selector

// glowing embers rising behind every menu screen (colour-varied to match the aurora)
(function(){ const EMBER=['rgba(190,255,120,.9)','rgba(90,224,204,.85)','rgba(160,130,255,.85)','rgba(255,170,90,.8)'];
  for(const id of ['startScreen','avatarScreen','weaponScreen']){ const host=el(id); if(!host) continue;
    const n = id==='startScreen'?14:9;
    for(let i=0;i<n;i++){ const s=document.createElement('div'); s.className='spore';
      const sz=2+Math.random()*4.5; s.style.width=s.style.height=sz+'px';
      s.style.left=(4+Math.random()*92)+'%'; s.style.bottom=(1+Math.random()*22)+'%';
      s.style.setProperty('--g', EMBER[(Math.random()*EMBER.length)|0]);
      s.style.animationDuration=(7+Math.random()*9)+'s'; s.style.animationDelay=(-Math.random()*14)+'s';
      host.appendChild(s); } } })();

setupTouch();
buildDecor();
menuScene();
show('startScreen');
maybeShowWhatsNew();
requestAnimationFrame(loop);

// Debug/automation hook — lets headless smoke tests drive menus without faking tap gestures
// (the start screen needs a user gesture the sandbox won't supply). Read-only into game state
// plus the few nav actions a test needs; harmless in production (no UI, no side effects unless called).
window.__game = {
  get screenState(){ return screenState; },
  get avatar(){ return meta.avatar; },
  get avatarName(){ return AVATARS[meta.avatar]?.name; },
  goAvatar(){ buildAvatarGrid(); screenState='avatar'; show('avatarScreen'); },
  selectAvatar(i){ if(i>=0 && i<AVATARS.length && avatarUnlocked(AVATARS[i])){ meta.avatar=i; saveMeta(); buildAvatarGrid(); return true; } return false; },
};
