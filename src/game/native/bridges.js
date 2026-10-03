// ===== Native (iOS wrapper) save bridge =====
// The iOS WKWebView wraps this page with a non-persistent data store (see LastPulseIOS/
// GameViewController.swift) — localStorage does NOT survive an app relaunch there. Mirror
// every save out to native via a message handler so GameSaveStore (SwiftData) can persist
// it; the restore direction is window.__nativeBootCode, read once above right where `meta`
// is constructed (see the comment there for why it has to happen that early). This is a
// no-op in a normal browser (webkit.messageHandlers is undefined outside WKWebView).
let __nativeSaveTimer=null;
function nativeSaveNow(){
  try{
    clearTimeout(__nativeSaveTimer); __nativeSaveTimer=null;
    window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeSave
      && window.webkit.messageHandlers.nativeSave.postMessage(exportSave());
  }catch(e){}
}
function nativeSaveDebounced(){
  if(!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeSave)) return;
  clearTimeout(__nativeSaveTimer);
  __nativeSaveTimer=setTimeout(nativeSaveNow, 400);
}
// ===== Native (iOS wrapper) IAP bridge =====
// Apple rejects/pulls apps that point to an external payment link for digital content (the
// Stripe donate button below), so the native wrapper offers a real StoreKit2 purchase instead.
// nativePurchase()/nativeRestore() post a request to StoreManager (LastPulseIOS/LastPulse/
// StoreManager.swift + the "nativePurchase"/"nativeRestore" message handlers in
// GameViewController.swift); the native side calls back into window.__nativeSetEntitlement
// once StoreKit confirms the transaction, which flips meta.iapUnlockAll and re-renders.
function nativePurchase(productId){
  try{ window.webkit.messageHandlers.nativePurchase.postMessage(productId); }catch(e){}
}
function nativeRestore(){
  try{ window.webkit.messageHandlers.nativeRestore.postMessage('restore'); }catch(e){}
}
const IAP_UNLOCKALL_ID = 'com.lastpulse.game.unlockall';
// consumables — StoreManager.swift credits `coins` on purchase (keep in sync with its coinAmounts)
const COIN_PACKS = [
  {id:'com.lastpulse.game.coins500',  coins:500,  tag:''},
  {id:'com.lastpulse.game.coins1200', coins:1200, tag:'Best value'},
  {id:'com.lastpulse.game.coins3000', coins:3000, tag:'Biggest pack'},
];
const iapCoinPrice = {};   // productId -> localized price, filled by __nativeSetProductPrice
window.__nativeSetProductPrice = function(productId, localizedPrice){
  if(productId===IAP_UNLOCKALL_ID && localizedPrice) el('iapUnlockBtn').textContent = '🔓 Unlock Everything — '+localizedPrice;
  if(localizedPrice && COIN_PACKS.some(p=>p.id===productId)){ iapCoinPrice[productId] = localizedPrice;
    if(el('shopGrid').children.length) renderShop(); }
};
window.__nativeSetEntitlement = function(productId, owned){
  if(productId===IAP_UNLOCKALL_ID){
    meta.iapUnlockAll = !!owned;
    saveMeta();
    if(owned) toast('🔓 Everything unlocked — thank you!');
    if(el('avatarGrid').children.length) buildAvatarGrid();
    if(el('weaponGrid').children.length) buildWeaponGrid();
    renderMenu();
  }
};
// Consumables never carry an "owned" flag (no restore) — StoreManager.swift calls this
// straight out of a successful purchase() instead of the entitlement path above.
window.__nativeCoinsGranted = function(amount){
  amount = Number(amount)||0; if(!amount) return;
  meta.coins += amount; saveMeta();
  toast('🪙 +'+amount+' coins added!'); sfx('pickup');
  renderMenu();
  if(el('shop') && !el('shop').classList.contains('hidden')) renderShop();
};
// ===== Native (iOS wrapper) Game Center bridge =====
// Endless Horde's "best wave" is the natural leaderboard score — showResults() posts the run's
// wave every time a horde match ends (LastPulseIOS/LastPulse/GameCenterManager.swift submits it
// to GKLeaderboard; Game Center itself keeps only the player's best). Sign-in and score
// submission are silent no-ops on failure (offline, Game Center disabled, not yet authenticated)
// so a match never blocks on this. The results-screen button is native-only, same gating as IAP.
function nativeSubmitScore(wave){
  try{ window.webkit.messageHandlers.nativeSubmitScore.postMessage(Math.floor(wave)||0); }catch(e){}
}
function nativeShowLeaderboard(){
  try{ window.webkit.messageHandlers.nativeShowLeaderboard.postMessage('show'); }catch(e){}
}
