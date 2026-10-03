// ============================================================
//  LAST PULSE — shared web / iOS game runtime
//  Portrait, cartoon, twin-stick survival royale.
// ============================================================

// ---------- Stage / canvas ----------
const stage = document.getElementById('game');
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');
let W = 0, H = 0, DPR = 1;
// measure env(safe-area-inset-top) in px — iPhones report the notch/status-bar height here.
// The layout viewport starts BELOW it, so unless we paint into it the OS shows the bare page
// background there (the "black bar at the top" on notched phones).
let safeTopEl = null, safeBotEl = null;
function safeTopPx(){
  if(!safeTopEl){ safeTopEl=document.createElement('div');
    safeTopEl.style.cssText='position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
    document.documentElement.appendChild(safeTopEl); }
  return safeTopEl.getBoundingClientRect().height || 0;
}
function safeBottomPx(){
  if(!safeBotEl){ safeBotEl=document.createElement('div');
    safeBotEl.style.cssText='position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
    document.documentElement.appendChild(safeBotEl); }
  return safeBotEl.getBoundingClientRect().height || 0;
}
// Effective insets: trust env() when it reports, but iOS standalone is KNOWN to lie (env()=0)
// on some versions — there we substitute standard hardware values (54pt status/notch strip,
// 34pt home indicator) rather than render bars. Non-Apple / desktop: env()=0 and stays 0.
function effInsets(){
  let st=safeTopPx(), sb=safeBottomPx();
  if(isApple() && inStandalone()){
    if(st<8) st=54;
    if(sb<8) sb=34;
  }
  return {st, sb};
}
function measureViewport(){
  // Take the LARGEST honest answer from every viewport API — each one has an iOS mode where it
  // under-reports (innerHeight lies short at standalone cold-launch and never fires resize;
  // clientHeight lags rotation; visualViewport shrinks for the keyboard, hence max() not trust).
  const vv = window.visualViewport;
  let vw = Math.max(window.innerWidth||0,  document.documentElement.clientWidth||0,  vv?Math.round(vv.width):0)  || 360;
  let vh = Math.max(window.innerHeight||0, document.documentElement.clientHeight||0, vv?Math.round(vv.height):0) || 640;
  // Installed Home Screen app: the web view genuinely covers the entire screen, but WebKit can
  // misreport the viewport at launch in two DIFFERENT ways, confirmed via two separate user Screen
  // Fit reports on the same portrait 393×852 phone:
  //  (a) fully SWAPPED to the other orientation's numbers — inner/clientHeight/visualViewport ALL
  //      agreed on a landscape-shaped 852×393. A swap corrupts vw/vh themselves, so guessing
  //      orientation by comparing vw>=vh trusts the exact numbers already known to lie — use an
  //      INDEPENDENT signal (screen.orientation) instead, and replace vw/vh outright.
  //  (b) genuinely short but SELF-CONSISTENT and CORRECTLY SHAPED — a later report on the same
  //      device read 393×793 everywhere (not swapped) with env() ALSO reporting real, non-lying
  //      inset values (59/34, both ≥8). Clamping that up to screen.height (852) — what a first
  //      attempt at this fix did — overshot the stage past the real viewport, because this
  //      device's own numbers were trustworthy the whole time; env() only lies (and takes the
  //      rest of the viewport measurement down with it) when its own probe reads suspiciously low
  //      (<8, the same signal effInsets() already uses to decide whether to substitute). So: only
  //      clamp up toward screen size when that lying-env signal is present; otherwise trust the
  //      browser's own (correctly-shaped) numbers as measured.
  if(inStandalone()){
    const s1 = screen.width||0, s2 = screen.height||0;
    if(s1 && s2){
      const portrait = (window.screen && screen.orientation && screen.orientation.type)
        ? screen.orientation.type.indexOf('portrait')===0
        : matchMedia('(orientation: portrait)').matches;
      const fullW = portrait ? Math.min(s1,s2) : Math.max(s1,s2);
      const fullH = portrait ? Math.max(s1,s2) : Math.min(s1,s2);
      const reportedPortrait = vw <= vh;
      if(reportedPortrait !== portrait){ vw = fullW; vh = fullH; }             // (a) wholesale swap
      else if(safeTopPx()<8 && safeBottomPx()<8){                              // (b) env() is lying too
        if(fullW > vw) vw = fullW;
        if(fullH > vh) vh = fullH;
      }
    }
  }
  return { vw, vh };
}
function resize(){
  // Fill the entire viewport, computed in JS (iOS Safari mis-evaluates CSS min()/calc()
  // viewport sizing and can collapse the stage to zero height). The game fills the whole
  // browser window on every device; the camera + HUD adapt to whatever W/H we get.
  const m = measureViewport();
  let gw = m.vw, gh = m.vh;
  if (!(gw > 0)) gw = 360;                   // fallbacks if anything went sideways
  if (!(gh > 0)) gh = 640;
  const ins = effInsets(), st = ins.st, sb = ins.sb;
  // publish the effective insets — ALL safe-area CSS reads var(--sat)/--sab, so when env()
  // lies (iOS standalone) the substituted hardware values reposition the title/HUD too.
  document.documentElement.style.setProperty('--sat', st+'px');
  document.documentElement.style.setProperty('--sab', sb+'px');
  if(inStandalone()){
    // Installed Home Screen app: the webview already covers the ENTIRE physical screen — there's
    // no browser chrome above it to "pull the canvas under" the way a Safari tab needs. gw/gh
    // (from measureViewport) already represent that full extent, so just fill it at top:0. Insets
    // exist purely to keep CONTENT (menu text, HUD) padded away from the notch/home-indicator via
    // --sat/--sab CSS padding — they must NOT also inflate the stage's own size, or the stage
    // overshoots the real screen (confirmed via a Screen Fit report: stage computed 945px tall
    // against a 793px viewport once gw/gh were already correct — the double-count was the bug).
    stage.style.top = '0px';
    stage.style.width = gw + 'px';
    stage.style.height = gh + 'px';
  } else {
    // Safari tab: pull the stage up under the status bar and extend it by the same amount, so the
    // CANVAS paints the notch strip instead of the flat page background (a flat strip up there
    // reads as a "black bar" now that menus are translucent over the live field, v2.32.0+). In
    // practice effInsets() returns 0/0 in a plain tab (confirmed v2.34.1), so this is a no-op —
    // kept for older Safari versions/edge cases that might still report a nonzero inset in a tab.
    stage.style.top = (-st) + 'px';
    stage.style.width = gw + 'px';
    stage.style.height = (gh + st + sb) + 'px';
    gh += st + sb;
  }
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = gw; H = gh;
  cv.width = Math.max(1, Math.floor(W * DPR));
  cv.height = Math.max(1, Math.floor(H * DPR));
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
window.addEventListener('load', () => setTimeout(resize, 50));
// iOS often updates visualViewport WITHOUT firing a window resize (toolbar collapse,
// standalone launch settling) — listen to it directly.
if(window.visualViewport) window.visualViewport.addEventListener('resize', resize);
window.addEventListener('pageshow', () => setTimeout(resize, 50));   // resumed from app switcher
resize();
setTimeout(resize, 200);                     // re-measure after iOS settles its viewport
setTimeout(resize, 600);                     // standalone cold-launch settles later than 200ms
setTimeout(resize, 1500);                    // last-chance sweep — cheap, and kills stragglers

// ---- black-bar diagnostic (dormant unless the URL has ?safeprobe) --------------------------
// Reproduces device-only "black bar at top" reports that don't show in desktop emulation.
// On a real phone, load  ...index.html?safeprobe  and screenshot the overlay: it reports the
// safe-area insets and how the stage/canvas rects compare to the visual viewport. A top gap
// == safe-area-inset-top means the notch region isn't being painted; a stage shorter than the
// viewport means the letterbox box-shadow is showing through.
(function safeProbe(){
  if(!/(?:\?|&)safeprobe\b/.test(location.search)) return;
  const box=document.createElement('div');
  box.style.cssText='position:fixed;left:6px;top:6px;z-index:99999;max-width:92vw;padding:8px 10px;'
    +'font:600 11px/1.4 monospace;color:#bfff5a;background:rgba(0,0,0,.82);border:1px solid #6f9a25;'
    +'border-radius:8px;white-space:pre;pointer-events:none';
  const read=()=>{
    const cs=getComputedStyle(document.documentElement);
    const si=p=>cs.getPropertyValue('--sa-'+p)||'?';
    const g=document.getElementById('game').getBoundingClientRect();
    const c=document.getElementById('cv').getBoundingClientRect();
    const vv=window.visualViewport;
    box.textContent='SAFE-AREA PROBE\n'
      +'inset T/R/B/L: '+si('t')+' '+si('r')+' '+si('b')+' '+si('l')+'\n'
      +'inner: '+window.innerWidth+'x'+window.innerHeight+'\n'
      +'visualVP: '+(vv?Math.round(vv.width)+'x'+Math.round(vv.height)+' @'+Math.round(vv.offsetTop):'n/a')+'\n'
      +'#game rect: top='+g.top.toFixed(1)+' h='+g.height.toFixed(1)+'\n'
      +'#cv   rect: top='+c.top.toFixed(1)+' h='+c.height.toFixed(1);
  };
  // expose the raw insets as CSS custom props so the probe can read them numerically
  const st=document.createElement('style');
  st.textContent=':root{--sa-t:env(safe-area-inset-top,0px);--sa-r:env(safe-area-inset-right,0px);'
    +'--sa-b:env(safe-area-inset-bottom,0px);--sa-l:env(safe-area-inset-left,0px)}';
  document.head.appendChild(st); document.body.appendChild(box);
  read(); setInterval(read, 500);
})();

// ---------- Persistence ----------
function safeGet(k, d){ try{ const v = localStorage.getItem(k); return v==null?d:v; }catch(e){ return d; } }
function safeSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

// ---------- Helpers ----------
const TAU = Math.PI*2;
const rand = (a,b)=> a + Math.random()*(b-a);
const randi = (a,b)=> Math.floor(rand(a,b+1));
const clamp = (v,a,b)=> v<a?a:v>b?b:v;
const lerp = (a,b,t)=> a+(b-a)*t;
const dist2 = (ax,ay,bx,by)=>{ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; };
const len = (x,y)=> Math.hypot(x,y);
function angLerp(a,b,t){ let d=((b-a+Math.PI)%TAU)-Math.PI; if(d<-Math.PI)d+=TAU; return a+d*t; }
const pick = a => a[randi(0,a.length-1)];
const el = id => document.getElementById(id);

// ============================================================
//  Data: avatars & weapons
// ============================================================
// Hero roster — hand-drawn chibi sprites (PNG cutouts in assets/img). `img` keys into the IMG
// cache; drawHuman/portraitChibi billboard the sprite and fall back to the drawn `look` chibi if
// the image never loads. More fighters get added by dropping a PNG + a row here.
// Roster is the nine "armless" (arms-at-sides) portraits — the game mounts a live 360° gun-arm on
// each (see drawHeroArm), so every hero holds and aims its weapon. All are flagged `armless:true`.
