// ===== Save health & transfer =====
// Some browsers can't persist localStorage at all (private tabs, TikTok/Instagram in-app
// webviews) — progress silently vanishes between sessions. Detect that up front and WARN,
// and give players a save code so progress can move between browsers / the installed app /
// different game URLs (every origin keeps its own separate save).
function storageOk(){
  try{ localStorage.setItem('__lp_t','1'); const ok=localStorage.getItem('__lp_t')==='1';
    localStorage.removeItem('__lp_t'); return ok; }catch(e){ return false; }
}
function exportSave(){ return 'LP1.'+btoa(unescape(encodeURIComponent(JSON.stringify(meta)))); }
function importSave(code){
  try{
    code=(code||'').trim(); if(!code.startsWith('LP1.')) return false;
    const o=JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
    if(typeof o.level!=='number' || typeof o.coins!=='number' || !Array.isArray(o.achieved)) return false;
    Object.assign(meta,o); saveMeta(); return true;
  }catch(e){ return false; }
}
// flush on tab hide / app switch — belt & suspenders against abrupt closes losing a purchase
window.addEventListener('pagehide',()=>{ try{ saveMeta(); nativeSaveNow(); }catch(e){} });
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'){ try{ saveMeta(); nativeSaveNow(); }catch(e){} } });

