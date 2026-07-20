#!/usr/bin/env node
// Build a THROWAWAY instrumented copy of index.html that can render the SFX graph through an
// OfflineAudioContext, so gun loudness is a measured number instead of an opinion.
//
//   node scripts/make-audit-copy.mjs [out.html]      # default: .audit-tmp.html (gitignored)
//
// The hook must live INSIDE the game IIFE — actx/master/dryIn/NOISE/sfx are all closure-scoped.
// Never commit the output: `grep -c "window.__" index.html` must stay at 1 (the __game API).
//
// KNOWN LIMIT: layers scheduled with later()/setTimeout (tails, brass, debris) do NOT appear in an
// offline render — they fire on the wall clock, after rendering has finished. What this measures is
// the SIMULTANEOUS TRANSIENT STACK, which is precisely the clipping risk: N guns firing on the same
// frame. Treat the number as a floor on peak level, not the full mix.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, '.audit-tmp.html'));
const src = readFileSync(join(root, 'index.html'), 'utf8');

const HOOK = `
/* === injected by scripts/make-audit-copy.mjs — THROWAWAY COPY ONLY === */
window.__audioAudit = async function(opts){
  const shots = (opts&&opts.shots)||40, kind=(opts&&opts.kind)||'shoot', secs=(opts&&opts.secs)||2;
  const OC = window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!OC) return {error:'no OfflineAudioContext'};
  const SR = 44100, oc = new OC(2, SR*secs, SR);
  const save = {actx, master, dryIn, revBus, NOISE, lastShot, lastTick, lastHit, lastDie};
  try{
    // rebuild the SHIPPED chain against the offline context (same topology as audioInit)
    actx = oc; NOISE = makeNoiseBuffer();
    master = oc.createGain(); master.gain.value = 0.36*1;          // sfxVol = 1 (worst case)
    const lim = oc.createDynamicsCompressor();
    lim.threshold.value=-8; lim.knee.value=6; lim.ratio.value=12; lim.attack.value=0.002; lim.release.value=0.14;
    const clip = oc.createWaveShaper(); clip.curve = SOFT_CLIP; clip.oversample='4x';
    master.connect(lim); lim.connect(clip); clip.connect(oc.destination);
    dryIn = oc.createGain(); dryIn.gain.value=1; dryIn.connect(master);
    const cv = oc.createConvolver(); cv.buffer = makeIR(1.1,2.6,0.42);
    revBus = oc.createGain(); revBus.gain.value=0.20; dryIn.connect(revBus); revBus.connect(cv); cv.connect(master);
    // stack N voices on the SAME frame — offline currentTime stays 0 until render
    const w = (typeof WEAPONS!=='undefined') ? WEAPONS[opts&&opts.weapon||0] : null;
    for(let i=0;i<shots;i++){
      lastShot=-1e9; lastTick=-1e9; lastHit=-1e9; lastDie=-1e9;   // defeat the rate limiters
      sfx(kind, kind==='shoot' ? w : undefined);
    }
    const buf = await oc.startRendering();
    let peak=0, sum=0, n=0, clipped=0;
    for(let c=0;c<buf.numberOfChannels;c++){
      const d=buf.getChannelData(c);
      for(let i=0;i<d.length;i++){ const a=Math.abs(d[i]); if(a>peak)peak=a; if(a>=0.999)clipped++; sum+=d[i]*d[i]; n++; }
    }
    const db = v => v>0 ? +(20*Math.log10(v)).toFixed(2) : -Infinity;
    return { kind, shots, weapon: w?w.name:null, peak:+peak.toFixed(4), peakDb: db(peak),
             rms:+Math.sqrt(sum/n).toFixed(5), rmsDb: db(Math.sqrt(sum/n)),
             clippedSamples: clipped, voicesInFlight: _voices };
  } finally {
    actx=save.actx; master=save.master; dryIn=save.dryIn; revBus=save.revBus; NOISE=save.NOISE;
    lastShot=save.lastShot; lastTick=save.lastTick; lastHit=save.lastHit; lastDie=save.lastDie;
  }
};
`;

const idx = src.indexOf('\n})();\n</script>');   // FIRST match = the game IIFE (the 2nd is the 3D module)
if (idx < 0) { console.error('could not locate the game IIFE close'); process.exit(2); }
writeFileSync(out, src.slice(0, idx) + HOOK + src.slice(idx));
console.log('audit copy →', out);
