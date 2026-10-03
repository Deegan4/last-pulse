function show(id){ ['startScreen','avatarScreen','weaponScreen'].forEach(s=>el(s).classList.toggle('hidden', s!==id));
  if(id==='startScreen'){ renderStats(); renderMenu(); maybeDonateToast(); }
  gpFocusIdx=0;   // new screen = new focus target list; don't carry a stale index over
}
// one gentle, once-per-session menu nudge after a couple of matches (only if donations are set up)
let donateToastShown=false;
function maybeDonateToast(){
  if(donateToastShown || !donateConfigured() || meta.matches<2) return;
  donateToastShown=true;
  setTimeout(()=>{ if(screenState==='start') toast('💜 Enjoying Last Pulse? Tap “Support the game” to tip the dev'); }, 1100);
}
function renderMenu(){
  const fp=el('fighterPortrait'); if(fp){ fp.innerHTML=''; fp.appendChild(portraitChibi(AVATARS[meta.avatar],meta.custom)); }
  renderRoster();
  const lv=el('menuLvl'); if(lv) lv.textContent=meta.level;
  const xp=el('menuXp'); if(xp) xp.style.width=clamp(meta.xp/xpNeed(meta.level),0,1)*100+'%';
  const co=el('menuCoins'); if(co) co.textContent=meta.coins;
  const rk=el('menuRank'); if(rk){ const r=rankFor(meta.level); rk.textContent=r.icon+' '+r.name; }
  const rn=el('menuRankNext'); if(rn){ const nr=nextRank(meta.level);
    rn.textContent = nr ? ('▸ '+nr.name+' at Lv '+nr.lv) : '★ max rank'; }
  const dc=el('dailyCard'); if(dc){ const d=todaysDaily(), done=dailyDoneToday();
    dc.innerHTML='<span class="dic">'+(done?'✅':d.icon)+'</span><div class="dtx"><b>Daily Challenge</b>'
      +'<span>'+d.desc+'</span></div><span class="drw">'+(done?'DONE':'🪙 '+DAILY_COINS)+'</span>';
    dc.classList.toggle('done',done); }
  const wc=el('weeklyCard'); if(wc){ const d=thisWeeksChallenge(), done=weeklyDoneThisWeek();
    wc.innerHTML='<span class="dic">'+(done?'✅':'🏆')+'</span><div class="dtx"><b>Weekly Challenge</b>'
      +'<span>'+d.desc+'</span></div><span class="drw">'+(done?'DONE':'🪙 '+WEEKLY_COINS)+'</span>';
    wc.classList.toggle('done',done); }
}
function renderRoster(){
  const rs=el('rosterStrip'); if(!rs) return; rs.innerHTML='';
  AVATARS.forEach((av,i)=>{
    const unlocked=avatarUnlocked(av), sel=i===meta.avatar;
    const item=document.createElement('div'); item.className='rosterItem'+(sel?' sel':'')+(unlocked?'':' locked');
    item.title=unlocked?av.name:av.name+' — unlocks at Lv '+av.unlock;
    const rip=document.createElement('div'); rip.className='rip'; rip.appendChild(portraitChibi(av,i===meta.avatar?meta.custom:null));
    item.appendChild(rip);
    item.insertAdjacentHTML('beforeend','<span class="rin">'+av.name+'</span>');
    if(unlocked) item.addEventListener('click',()=>{ if(meta.avatar===i) return;
      meta.avatar=i; saveMeta(); renderMenu(); });
    rs.appendChild(item);
  });
}
function goAvatar(){ audioInit();
  const v=el('nameInput').value.trim(); meta.name=v||'deegan'; saveMeta();
  buildAvatarGrid(); screenState='avatar'; show('avatarScreen'); }
function kd(){ return (meta.ckills/Math.max(1,meta.deaths)).toFixed(1); }
function renderStats(){
  const c=el('statsCard'); if(!c) return;
  const tiles=[['Wave',meta.bestWave||0],['Matches',meta.matches],['Kills',meta.ckills],
    ['Dailies',meta.dailies||0],['K/D',kd()],['Streak',meta.bestStreak||0]];
  c.innerHTML=tiles.map(t=>'<div class="st"><b>'+t[1]+'</b><span>'+t[0]+'</span></div>').join('');
  const ac=el('achCount'); if(ac) ac.textContent=meta.achieved.length+'/'+ACHIEVEMENTS.length;
}
function renderAchievements(){
  const g=el('achGrid'); if(!g) return;
  const n=meta.achieved.length, tot=ACHIEVEMENTS.length;
  const per={bronze:0,silver:0,gold:0};
  for(const a of ACHIEVEMENTS) if(meta.achieved.includes(a.id)) per[a.tier]++;
  el('achProg').innerHTML='<b>'+n+'</b> / '+tot+' unlocked · 🥉'+per.bronze+' 🥈'+per.silver+' 🥇'+per.gold;
  g.innerHTML=ACHIEVEMENTS.map(a=>{ const got=meta.achieved.includes(a.id);
    return '<div class="achcard tier-'+a.tier+(got?'':' locked')+'"><span class="aic">'+(got?a.icon:'🔒')+'</span>'
      +'<div class="atxt"><b>'+a.name+' <em class="tchip '+a.tier+'">'+TIER_ICON[a.tier]+'</em></b><span>'+a.desc+' · 🪙'+(TIER_COINS[a.tier]||25)+'</span></div>'
      +(got?'<span class="adone">✓</span>':'')+'</div>'; }).join('');
}
function openAchievements(){ renderAchievements(); el('achievements').classList.remove('hidden'); }
function closeAchievements(){ el('achievements').classList.add('hidden'); }
// ----- shop (cosmetic trails) -----
function renderShop(){
  el('shopCoins').innerHTML='Your coins: <b>🪙 '+meta.coins+'</b> — earn more from kills, wins & dailies';
  // ---- Upgrades: Extended Magazines (permanent, all weapons) ----
  const m=magInfo();
  const magCard='<div class="achcard shopcard upgcard'+(m.maxed?' equipped':(meta.coins<m.nextCost?' poor':''))+'" data-upg="extmag">'
    +'<span class="aic">📦</span><div class="atxt"><b>Extended Magazines</b>'
    +'<span>'+(m.bonus?('+'+m.bonus+'% mag'):'wider mags for every gun')
    +(m.maxed?' · MAX':' · Lv '+m.lvl+'/'+MAG_MAX)+'</span></div>'
    +'<button class="shopbtn'+(m.maxed?' on':'')+'">'+(m.maxed?'MAXED':('🪙 '+m.nextCost))+'</button></div>';
  // Native-only: real-money consumable coin top-up (App Store 3.1.1 forbids the Stripe link
  // inside the wrapper, same reason as the Unlock Everything IAP above it).
  const coinIapCard = inNativeWrapper()
    ? '<div class="shopHdr">Get Coins</div>'
      + COIN_PACKS.filter(p=>iapCoinPrice[p.id]).map(p=>
        '<div class="achcard shopcard" data-iap="'+p.id+'"><span class="aic">🪙</span>'
        + '<div class="atxt"><b>'+p.coins.toLocaleString()+' Coins</b><span>'+(p.tag||'Instant top-up, real money')+'</span></div>'
        + '<button class="shopbtn">'+iapCoinPrice[p.id]+'</button></div>').join('')
    : '';
  el('shopGrid').innerHTML = magCard + coinIapCard
    + '<div class="shopHdr">Trails</div>'
    + '<div class="achcard shopcard'+(meta.trail==='none'?' equipped':'')+'" data-shop="none"><span class="aic">🚫</span>'
    +'<div class="atxt"><b>No Trail</b><span>Plain footsteps</span></div>'
    +'<button class="shopbtn'+(meta.trail==='none'?' on':'')+'">'+(meta.trail==='none'?'EQUIPPED':'EQUIP')+'</button></div>'
    + SHOP_ITEMS.map(s=>{ const owned=meta.owned.includes(s.id), eq=meta.trail===s.id;
      const btn = eq?'EQUIPPED' : owned?'EQUIP' : '🪙 '+s.cost;
      return '<div class="achcard shopcard'+(eq?' equipped':'')+(!owned&&meta.coins<s.cost?' poor':'')+'" data-shop="'+s.id+'">'
        +'<span class="aic">'+s.icon+'</span><div class="atxt"><b>'+s.name+'</b><span>'+s.desc+'</span></div>'
        +'<button class="shopbtn'+(eq?' on':'')+'">'+btn+'</button></div>'; }).join('')
    + '<div class="shopHdr">Nameplate Banner</div>'
    + '<div class="achcard shopcard'+(meta.banner==='none'?' equipped':'')+'" data-banner="none"><span class="aic">🚫</span>'
    +'<div class="atxt"><b>No Banner</b><span>Plain nameplate</span></div>'
    +'<button class="shopbtn'+(meta.banner==='none'?' on':'')+'">'+(meta.banner==='none'?'EQUIPPED':'EQUIP')+'</button></div>'
    + BANNERS.map(b=>{ const owned=meta.owned.includes(b.id), eq=meta.banner===b.id;
      const btn = eq?'EQUIPPED' : owned?'EQUIP' : '🪙 '+b.cost;
      return '<div class="achcard shopcard'+(eq?' equipped':'')+(!owned&&meta.coins<b.cost?' poor':'')+'" data-banner="'+b.id+'">'
        +'<span class="aic">'+b.icon+'</span><div class="atxt"><b>'+b.name+'</b><span>'+b.desc+'</span></div>'
        +'<button class="shopbtn'+(eq?' on':'')+'">'+btn+'</button></div>'; }).join('');
}
function buyMag(){ const m=magInfo();
  if(m.maxed){ toast('Extended Magazines already maxed!'); return; }
  if(meta.coins<m.nextCost){ toast('Not enough coins — earn more in matches!'); return; }
  meta.coins-=m.nextCost; meta.magLvl=(meta.magLvl||0)+1; saveMeta();
  toast('📦 EXTENDED MAGS Lv '+meta.magLvl+' — +'+Math.round(meta.magLvl*MAG_STEP*100)+'% mag capacity!'); sfx('level');
  if(player && player.alive){ player.magMul=magMulMeta(); }   // apply live if bought mid-session
  renderShop(); renderMenu();
}
function shopTap(id){
  if(id!=='none' && !meta.owned.includes(id)){ const s=shopItem(id); if(!s) return;
    if(meta.coins<s.cost){ toast('Not enough coins — earn more in matches!'); return; }
    meta.coins-=s.cost; meta.owned.push(s.id); meta.trail=s.id; saveMeta();
    toast(s.icon+' '+s.name+' purchased & equipped!'); sfx('level');
  } else { meta.trail=id; saveMeta(); }
  renderShop(); renderMenu();
}
function bannerTap(id){
  if(id!=='none' && !meta.owned.includes(id)){ const b=bannerItem(id); if(!b) return;
    if(meta.coins<b.cost){ toast('Not enough coins — earn more in matches!'); return; }
    meta.coins-=b.cost; meta.owned.push(b.id); meta.banner=b.id; saveMeta();
    toast(b.icon+' '+b.name+' purchased & equipped!'); sfx('level');
  } else { meta.banner=id; saveMeta(); }
  renderShop(); renderMenu();
}
let shopFromSettings=false;   // true when Shop was opened via the in-match Settings menu (pause), so Close returns to it
function openShop(){ renderShop(); el('shop').classList.remove('hidden'); }
function closeShop(){ el('shop').classList.add('hidden');
  if(shopFromSettings){ shopFromSettings=false; el('settings').classList.remove('hidden'); gpFocusIdx=0; } }
// ----- donate / support (opens the owner's Stripe Payment Link) -----
function donateConfigured(){ return /^https:\/\/(buy\.stripe\.com|[a-z0-9-]+\.stripe\.com)\//i.test(STRIPE_DONATE_URL); }
function openDonate(){
  const note=el('donateNote'), go=el('donateGo'), sec=el('donateSecure');
  const iapGo=el('iapUnlockBtn'), iapRestore=el('iapRestoreBtn'), blurb=el('donateBlurb');
  if(inNativeWrapper()){
    // Native build: real StoreKit purchase, no external payment link (App Store 3.1.1).
    go.style.display='none'; sec.style.display='none'; note.hidden=true;
    blurb.textContent = meta.iapUnlockAll
      ? 'You already own everything — thanks for the support!'
      : 'Skip the grind: unlock every fighter and weapon right now, no waiting on levels.';
    iapGo.hidden = meta.iapUnlockAll;
    iapRestore.hidden = false;
    nativeRestore();   // silent re-check on open, in case a prior purchase never confirmed
  } else if(donateConfigured()){
    note.hidden=true; go.style.display=''; sec.style.display='';
    iapGo.hidden=true; iapRestore.hidden=true;
  } else {                                   // not set up yet — explain instead of opening a dead link
    go.style.display='none'; sec.style.display='none'; note.hidden=false;
    iapGo.hidden=true; iapRestore.hidden=true;
    note.textContent='Donations aren’t set up yet. The game owner can enable this by pasting a Stripe Payment Link into STRIPE_DONATE_URL in index.html.';
  }
  el('donate').classList.remove('hidden');
}
function closeDonate(){ el('donate').classList.add('hidden'); }
// ----- Add to Home Screen (iOS) -----
// iPhone/iPad Safari can't trigger install programmatically, so we show step-by-step instructions.
function isApple(){ return /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1); }   // iPadOS 13+ masquerades as Mac
function inNativeWrapper(){ return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeSave); }
// The native iOS wrapper (LastPulseIOS/GameViewController.swift) is a third viewport context
// besides "normal browser tab" and "installed PWA": a full-bleed, edge-to-edge WKWebView with
// no browser chrome — behaviorally identical to standalone (viewport genuinely covers the
// whole screen under the notch), but neither navigator.standalone nor display-mode:standalone
// ever get set for a bare WKWebView, so without this it fell through to the plain-tab path in
// resize()/measureViewport() that assumes chrome eats space above the content, clipping the
// top of the stage. Detected via the same messageHandlers.nativeSave presence the save bridge
// already uses to gate itself.
function inStandalone(){ return navigator.standalone===true || matchMedia('(display-mode: standalone)').matches || inNativeWrapper(); }
function syncA2HS(){ const b=el('a2hsBtn'); if(b) b.classList.toggle('hidden', !(isApple() && !inStandalone())); }
function openA2HS(){ el('a2hs').classList.remove('hidden'); }
function closeA2HS(){ el('a2hs').classList.add('hidden'); }
function donateGo(){
  if(inNativeWrapper() || !donateConfigured()) return;
  window.open(STRIPE_DONATE_URL, '_blank', 'noopener,noreferrer');   // Stripe-hosted, secure, new tab
  sfx('pickup');
}
// ----- game-updated notification -----
function openWhatsNew(){
  const c=CHANGELOG[0];
  el('wnVer').textContent='WHAT’S NEW · v'+c.v;
  el('wnList').innerHTML=c.items.map(i=>'<div class="wnitem"><span class="ic">'+i[0]+'</span>'
    +'<div class="tx"><b>'+i[1]+'</b><span>'+i[2]+'</span></div></div>').join('');
  el('whatsnew').classList.remove('hidden');
}
function closeWhatsNew(){ el('whatsnew').classList.add('hidden'); safeSet('dd2_seenver',GAME_VERSION); }
// auto-show once per version — but not to brand-new players (nothing is "new" to them)
function maybeShowWhatsNew(){
  const seen=safeGet('dd2_seenver','');
  if(seen===GAME_VERSION) return;
  if(!seen && meta.matches===0 && meta.level<=1){ safeSet('dd2_seenver',GAME_VERSION); return; }
  openWhatsNew();
}
function paintPortraitCustomization(o,custom){
  if(!custom) return; const pal=CUSTOM.palettes.find(x=>x.id===custom.palette)||CUSTOM.palettes[0];
  o.save(); o.strokeStyle='#23281b'; o.lineWidth=2.2; o.strokeStyle=pal.outfit; o.beginPath(); o.moveTo(25,45); o.lineTo(45,55); o.stroke();
  o.strokeStyle=pal.accent; o.lineWidth=1.5; o.beginPath(); o.moveTo(25,45); o.lineTo(45,55); o.stroke();
  if(custom.accessory==='headset'){ o.strokeStyle='#b7d6e8'; o.lineWidth=1.5; o.beginPath(); o.arc(35,38,13,Math.PI*1.05,Math.PI*1.95); o.stroke(); }
  if(custom.accessory==='scarf'){ o.fillStyle=pal.accent; o.fillRect(25,47,20,3); }
  if(custom.accessory==='visor'){ o.fillStyle='rgba(35,235,210,.75)'; o.fillRect(27,36,16,4); }
  if(custom.hair==='spikes'){ o.fillStyle=pal.outfit; o.beginPath(); o.moveTo(28,31); o.lineTo(31,23); o.lineTo(35,30); o.lineTo(39,22); o.lineTo(43,31); o.closePath(); o.fill(); }
  if(custom.trait==='scar'){ o.strokeStyle='#c94d4d'; o.lineWidth=1.1; o.beginPath(); o.moveTo(39,38); o.lineTo(41,43); o.stroke(); }
  o.restore();
}
