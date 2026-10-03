const DIST_CURVE=(()=>{ const n=1024,c=new Float32Array(n),k=16; for(let i=0;i<n;i++){ const x=i/n*2-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); } return c; })();
// Output brickwall. The DynamicsCompressor alone is NOT a limiter: its 2ms attack lets fast
// transients through, and `scripts/make-audit-copy.mjs` measured 40 stacked 'boom's peaking at
// +0.84 dBFS with 33 hard-clipped samples. tanh(k·x)/k has unity slope at 0 (quiet sounds pass
// untouched) and saturates at tanh(0.8)/0.8 ≈ 0.834, so the mix can never reach full scale.
const SOFT_CLIP=(()=>{ const n=4096,c=new Float32Array(n),k=0.8;
  for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x)/k; } return c; })();
// ---- realism helpers (v2.34.0) ---------------------------------------------------------------
// A real report is transient → body → tail, decays EXPONENTIALLY, arrives from a direction, and
// drags a room tail behind it. The pieces that buy the most realism: (1) one shared noise buffer
// instead of a fresh Float32Array per shot, (2) exponential envelopes with a ~1.5ms attack (a hard
// gain jump reads as a digital click, not a transient), (3) a convolution tail, (4) stereo placement.
function makeNoiseBuffer(){ const n=Math.floor(actx.sampleRate*2), b=actx.createBuffer(1,n,actx.sampleRate);
  const a=b.getChannelData(0); for(let i=0;i<n;i++) a[i]=Math.random()*2-1; return b; }
// procedural impulse response: decaying noise + an early reflection slap. `damp` is a one-pole
// lowpass applied as it's built, so highs die faster than lows — that's air absorption, and it's
// what makes the tail read as "outdoors" rather than "reverb plugin".
function makeIR(dur,decay,damp){ const n=Math.floor(actx.sampleRate*dur), b=actx.createBuffer(2,n,actx.sampleRate);
  for(let c=0;c<2;c++){ const d=b.getChannelData(c); let lp=0;
    for(let i=0;i<n;i++){ const v=(Math.random()*2-1)*Math.pow(1-i/n,decay); lp+=(v-lp)*damp; d[i]=lp; }
    const e=Math.floor(n*(c?0.105:0.088)); if(e<n) d[e]+=(c?0.5:0.62); }   // slap-back off the nearest surface
  return b; }
let _sp=null, _voices=0;                      // active placement; in-flight layer count (see budget())
// VOICE BUDGET: the layered model emits 6–8 nodes per shot where the old one emitted 3–4. At
// Minigun cadence with 40 zombies that is a real mobile CPU cliff, so non-essential layers (tails,
// brass, debris) are shed once the field is busy. Transients are never shed — losing those is
// audible as a missing shot; losing a tail is not.
function budget(){ return _voices < 24; }
function voice(d){ _voices++; setTimeout(()=>{ _voices--; }, Math.min(1500, d*1000+120)); }
function place(o){ if(!o||!player) return null;
  const dx=o.x-player.x, dy=o.y-player.y, d=Math.hypot(dx,dy);
  return { pan: clamp(dx/460,-1,1),            // stereo image widens across ~half a screen
           vol: 1/(1+d/300),                   // inverse-distance falloff
           cut: Math.max(700, 18000/(1+d/200)) };  // distant sounds lose their highs first
}
// where a layer connects: unplaced SFX go straight to the dry bus; placed ones get pan + muffling
function sink(){ if(!actx) return null; if(!_sp) return dryIn;
  const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=_sp.cut;
  const g=actx.createGain(); g.gain.value=_sp.vol;
  lp.connect(g); g.connect(dryIn);
  if(!actx.createStereoPanner) return lp;
  const p=actx.createStereoPanner(); p.pan.value=_sp.pan; p.connect(lp); return p; }
// schedule a delayed layer while PRESERVING the placement it was fired with
function later(ms,fn){ const s=_sp; setTimeout(()=>{ const prev=_sp; _sp=s; try{ fn(); } finally{ _sp=prev; } }, ms); }
function audioInit(){ if(actx) return;
  try{ actx=new (window.AudioContext||window.webkitAudioContext)();
    NOISE=makeNoiseBuffer();
    master=actx.createGain(); master.gain.value=0.36*meta.sfxVol;
    // limiter — 40 zombies + a minigun + a bomb used to sum past 0dBFS and hard-clip into a buzz
    const lim=actx.createDynamicsCompressor();
    lim.threshold.value=-8; lim.knee.value=6; lim.ratio.value=12; lim.attack.value=0.002; lim.release.value=0.14;
    const clip=actx.createWaveShaper(); clip.curve=SOFT_CLIP; clip.oversample='4x';
    master.connect(lim); lim.connect(clip); clip.connect(actx.destination);
    dryIn=actx.createGain(); dryIn.gain.value=1; dryIn.connect(master);
    try{ const cv=actx.createConvolver(); cv.buffer=makeIR(1.1,2.6,0.42);        // outdoor field tail
      revBus=actx.createGain(); revBus.gain.value=0.20; dryIn.connect(revBus); revBus.connect(cv); cv.connect(master);
    }catch(e){ revBus=null; }                                                    // no convolver → dry, still fine
  }catch(e){ actx=null; } }
function applyVolume(){ if(master) master.gain.value = 0.36*meta.sfxVol; }
// Fire-and-forget SFX voices — all play "now" and route through sink() → dryIn → limiter.
function tone(f,d,type,v,slide){ if(!actx) return; const o=actx.createOscillator(),g=actx.createGain();
  o.type=type||'square'; o.frequency.value=f; if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),actx.currentTime+d);
  const t=actx.currentTime, pk=v||0.2;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(pk,t+0.0015); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(g);g.connect(sink());o.start();o.stop(t+d); voice(d); }
// distorted (overdriven) tone — oscillator → waveshaper → lowpass; the crunch behind meaty guns
function dtone(f,d,type,v,slide,cutoff){ if(!actx) return; const o=actx.createOscillator(),ws=actx.createWaveShaper(),lp=actx.createBiquadFilter(),g=actx.createGain();
  o.type=type||'sawtooth'; o.frequency.value=f; if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),actx.currentTime+d);
  ws.curve=DIST_CURVE; ws.oversample='2x'; lp.type='lowpass'; lp.frequency.value=cutoff||2200;
  const t=actx.currentTime, pk=v||0.2;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(pk,t+0.0015); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(ws); ws.connect(lp); lp.connect(g); g.connect(sink()); o.start(); o.stop(t+d); voice(d); }
// unfiltered noise burst — reuses the shared buffer at a random offset (no per-call allocation)
function noise(d,v){ if(!actx||!NOISE) return; const s=actx.createBufferSource(); s.buffer=NOISE;
  const g=actx.createGain(), t=actx.currentTime;
  g.gain.setValueAtTime(v||0.18,t); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  s.connect(g); g.connect(sink()); s.start(t, Math.random()*(2-d-0.05), d+0.02); voice(d); }
// filtered noise burst — the workhorse for gun texture: a biquad shapes the white noise into a
// bright "crack" (highpass), a mid "snap" (bandpass) or a low "thump" (lowpass); freq can slide.
function fnoise(d,v,type,freq,q,slide){ if(!actx||!NOISE) return;
  const s=actx.createBufferSource(); s.buffer=NOISE;
  const f=actx.createBiquadFilter(); f.type=type||'bandpass'; f.frequency.value=freq||1000; f.Q.value=q||1;
  const t=actx.currentTime;
  if(slide) f.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+d);
  const g=actx.createGain(); const pk=v||0.18;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(pk,t+0.0015); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  s.connect(f); f.connect(g); g.connect(sink()); s.start(t, Math.random()*(2-d-0.05), d+0.02); voice(d); }
// ---- physical layer helpers ------------------------------------------------------------------
// firing-pin / bolt click: the tiny mechanical tick BEFORE the powder goes off. ~2ms, very quiet,
// but its absence is why synthesised guns sound like they start from nothing.
function pin(v){ fnoise(0.006,(v||0.06),'highpass',5200,0.9); }
// the action cycling back — a short, dull metallic clack a few ms after the shot (sheddable)
function mech(ms,v){ if(!budget()) return; later(ms,()=>{ fnoise(0.028,v||0.055,'bandpass',1800,2.2,1100); fnoise(0.02,(v||0.055)*0.6,'highpass',4200,1); }); }
// a brass case tumbling onto the ground: 2–3 bright metallic pings, each quieter and later (sheddable)
function shell(ms,v){ if(!budget()) return; const b=v||0.045;
  for(let i=0;i<3;i++) later(ms+i*(70+i*55)+rand(0,30),()=>{
    fnoise(0.05,b*Math.pow(0.55,i),'bandpass',4200+rand(-900,1400),9,3200); }); }
// the report rolling away across open ground — fed mostly by the reverb send (sheddable)
function tail(d,v,cut){ if(!budget()) return; fnoise(d,v,'lowpass',cut||900,0.7,(cut||900)*0.35); }
// formant growl: a rough sawtooth pushed through two vowel bandpasses + a breath layer. Two
// resonances is the minimum that reads as a THROAT rather than a synth tone — this is what makes
// the zombies sound organic instead of like the old square-wave beep.
function growl(f0,d,v,fa,fb){ if(!actx) return;
  const o=actx.createOscillator(), g=actx.createGain(), t=actx.currentTime;
  o.type='sawtooth'; o.frequency.setValueAtTime(f0,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(24,f0*rand(0.55,0.78)),t+d);   // pitch sags as breath runs out
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
  const dst=sink();
  for(const [f,q,amp] of [[fa||420,7,1],[fb||1180,9,0.55]]){
    const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f*rand(0.92,1.08); bp.Q.value=q;
    const ga=actx.createGain(); ga.gain.value=amp; g.connect(bp); bp.connect(ga); ga.connect(dst); }
  o.connect(g); o.start(t); o.stop(t+d+0.02); voice(d);
  if(budget()) fnoise(d*0.8,v*0.32,'bandpass',900,1.1,500);                       // breath / rasp
}
// wet flesh impact — a dull low thud plus a short mid splat, no metallic ring
function flesh(v){ fnoise(0.045,(v||0.16),'bandpass',420,1.3,180); fnoise(0.02,(v||0.16)*0.7,'lowpass',900); tone(120,0.05,'sine',(v||0.16)*0.5,70); }
let lastShot=0, lastTick=0, lastHit=0, lastDie=0;
// sfx(kind, mode, src) — `src` is an optional world-space {x,y} (an entity): when given, the sound
// is panned and distance-attenuated relative to the player instead of playing flat and centred.
function sfx(kind,mode,src){ if(!actx) return;
  _sp = src ? place(src) : null;
  try{ _sfx(kind,mode); } finally{ _sp=null; }
}
function _sfx(kind,mode){
  if(kind==='shoot'){ const t=performance.now(); if(t-lastShot<30) return; lastShot=t;
    // `mode` may be the weapon object (preferred — gives per-gun character) or a bare mode string
    const w = (mode&&typeof mode==='object') ? mode : null; const md = w?w.mode:mode, nm = w?w.name:'';
    const j = 1 + rand(-0.05,0.05);   // per-shot pitch jitter so full-auto isn't a robotic click-loop
    // Every gun below is built from the same physical stack, in firing order:
    //   pin (striker) → crack (supersonic snap) → body (overdriven muzzle blast) → sub (chest
    //   thump) → tail (report rolling away, reverb-fed) → mech (action cycling) → shell (brass).
    // Per-gun character is which layers dominate and how long the tail is, not different synths.
    if(nm==='Crossbow'){               // "silent" bolt — limb slap + string thrum + fletching hiss
      pin(0.05); tone(320*j,0.05,'triangle',0.08,150); fnoise(0.09,0.06,'bandpass',1400,1.4,600);
      tone(180,0.06,'sine',0.05,90); fnoise(0.13,0.035,'highpass',3400,0.8,1800); mech(120,0.03); }
    else if(md==='sniper'){            // high-velocity CRACK, long body, report rolling for ~0.5s
      pin(0.07); fnoise(0.05,0.24,'highpass',3200*j,0.5); dtone(240*j,0.15,'sawtooth',0.2,58,2400); tone(250*j,0.1,'square',0.12,60);
      tone(72,0.26,'sine',0.18,34); tail(0.34,0.13,520);
      later(95,()=>tail(0.30,0.075,680)); later(240,()=>tail(0.34,0.035,460));   // two slap-backs = open ground
      mech(150,0.075); shell(430,0.05); }
    else if(md==='shotgun'){           // fat, gritty blast + the unmistakable pump action
      pin(0.06); fnoise(0.15,0.26,'lowpass',1400,0.6,300); fnoise(0.05,0.16,'highpass',2100*j,0.7);
      dtone(96*j,0.13,'sawtooth',0.22,42,1200); tone(46,0.2,'sine',0.2,26); tail(0.26,0.10,620);
      later(170,()=>{ fnoise(0.05,0.075,'bandpass',1500,3,900); });               // pump back
      later(275,()=>{ fnoise(0.045,0.085,'bandpass',1250,3.4,760); });            // pump forward, chambering
      shell(300,0.055); }
    else if(md==='launcher'){          // heavy WHUMP + the rocket motor hissing away (airburst is 'boom')
      pin(0.05); dtone(120*j,0.16,'sawtooth',0.24,42,1500); fnoise(0.18,0.18,'bandpass',700,0.7,300); tone(52,0.22,'sine',0.2,28);
      fnoise(0.55,0.075,'bandpass',1250,0.8,320); tail(0.4,0.09,520); mech(220,0.06); }
    else if(nm==='Magnum'){            // hand-cannon revolver — huge body, long tail, cylinder click
      pin(0.08); fnoise(0.045,0.22,'bandpass',1500*j,0.8); dtone(150*j,0.11,'sawtooth',0.22,48,1900); tone(200*j,0.07,'square',0.14,54);
      tone(60,0.19,'sine',0.2,30); tail(0.3,0.14,360); later(130,()=>tail(0.26,0.06,520)); mech(190,0.05); }
    else if(md==='auto'){              // tight, fast, mechanical — action noise is half the sound at rate
      pin(0.05); dtone(300*j,0.05,'sawtooth',0.14,150,2200); fnoise(0.03,0.13,'highpass',2900*j,0.6);
      tone(64,0.05,'sine',0.1,44); tail(0.09,0.07,520); mech(28,0.06); shell(210,0.032); }
    else {                             // semi (Pistol/Rifle-ish) — snappy crack + growl + slide cycling
      pin(0.06); fnoise(0.03,0.15,'highpass',2500*j,0.7); dtone(230*j,0.06,'sawtooth',0.16,70,2000);
      tone(58,0.08,'sine',0.14,40); tail(0.14,0.09,420); mech(42,0.06); shell(300,0.042); } }
  else if(kind==='flame'){ const t=performance.now(); if(t-lastShot<45) return; lastShot=t;
    fnoise(0.13,0.09,'bandpass',900*(1+rand(-0.1,0.1)),0.6,480); tone(92,0.09,'sawtooth',0.05,72);
    fnoise(0.16,0.035,'highpass',5200,0.7,2600); }                       // fuel hiss riding on top
  else if(kind==='tick'){ const t=performance.now(); if(t-lastTick<45) return; lastTick=t;
    flesh(0.10); fnoise(0.012,0.05,'highpass',3600,1); }                 // wet hit + thin hitmarker tick
  else if(kind==='kill'){ const t=performance.now(); if(t-lastHit<40) return; lastHit=t;
    flesh(0.2); fnoise(0.09,0.1,'bandpass',260,1.2,120); tone(880,0.06,'square',0.07,1320); }  // meat, then the UI ping
  else if(kind==='combo'){ const n=Math.min(mode||2,9); tone(420+n*95,0.1,'square',0.15,560+n*95); tone(210+n*45,0.12,'triangle',0.1); }
  else if(kind==='streak'){ const n=Math.min(mode||2,4); [660,880,1100,1320].slice(0,n).forEach((f,i)=>setTimeout(()=>tone(f,0.12,'square',0.14),i*70)); }
  else if(kind==='pickup'){ tone(720,0.1,'sine',0.13,1120); }
  else if(kind==='loot'){ [700,900,1200].forEach((f,i)=>setTimeout(()=>tone(f,0.14,'triangle',0.15),i*80)); }
  else if(kind==='die'){ const t=performance.now(); if(t-lastDie<70) return; lastDie=t;
    // a dying throat, then the body hitting the dirt — not a descending sawtooth beep
    growl(rand(150,205),0.42,0.17,rand(360,480),rand(1000,1320));
    later(190,()=>{ fnoise(0.13,0.13,'lowpass',260,0.8,110); tone(70,0.12,'sine',0.1,44); }); }
  else if(kind==='boom'){
    pin(0.1); fnoise(0.05,0.28,'highpass',2600,0.5); tone(120,0.12,'square',0.24,42);   // crack + concussion
    tone(84,0.55,'sawtooth',0.26,32); fnoise(0.5,0.24,'lowpass',900,0.6,200); tone(46,0.5,'sine',0.2,26); // body + sub
    later(60,()=>tail(0.7,0.12,620)); later(300,()=>tail(0.8,0.06,420));                 // the blast rolling out
    for(let i=0;i<5;i++) later(120+rand(0,420),()=>{ if(budget()) fnoise(0.05,rand(0.02,0.05),'bandpass',rand(700,2600),4); }); }  // debris rain
  else if(kind==='bolt'){ // lightning: the strike, then thunder a beat later
    fnoise(0.02,0.2,'highpass',6000,0.6); tone(900,0.15,'square',0.1,200);
    later(40,()=>{ tone(60,0.45,'sine',0.18,28); tail(0.55,0.16,700); }); }
  else if(kind==='throw'){ fnoise(0.16,0.05,'bandpass',1100,1.1,2600); tone(400,0.12,'sine',0.07,700); }  // whoosh
  else if(kind==='spit'){ growl(210,0.13,0.07,700,1600);                                   // the hock…
    later(90,()=>{ fnoise(0.16,0.13,'bandpass',1500,0.8,600); tone(300,0.1,'sawtooth',0.06,120); }); }  // …then the acid
  else if(kind==='heart'){ // lub-dub: two muffled thumps, the second softer — a real cardiac rhythm
    tone(74,0.13,'sine',0.16,46); fnoise(0.09,0.05,'lowpass',180);
    setTimeout(()=>{ tone(60,0.15,'sine',0.12,38); fnoise(0.1,0.035,'lowpass',150); },150); }
  else if(kind==='warn'){ tone(440,0.13,'square',0.1); setTimeout(()=>tone(440,0.13,'square',0.1),170); }
  else if(kind==='level'){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.2,'triangle',0.16),i*90)); }
  else if(kind==='win'){ [523,659,784,1046,1318,1568].forEach((f,i)=>setTimeout(()=>tone(f,0.26,'triangle',0.2),i*120)); }
  else if(kind==='build'){ pin(0.05); fnoise(0.06,0.16,'lowpass',900,1); tone(180,0.09,'square',0.12,120);
    tone(360,0.07,'square',0.08,300); later(70,()=>fnoise(0.05,0.05,'bandpass',2600,5)); }  // hammer thunk + nail ring
  else if(kind==='turret'){ const t=performance.now(); if(t-lastShot<40) return; lastShot=t; fnoise(0.04,0.12,'highpass',2400,0.6); tone(520,0.05,'square',0.07,240); }  // light pop
}
// Background music was removed in v2.24.0 — the game ships SFX-only. (The tone/dtone/noise/fnoise
// voices above are still used by all the sound effects; only the looping soundtrack is gone.)

// ============================================================
//  AI
// ============================================================
