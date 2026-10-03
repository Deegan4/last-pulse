const ARENA = 4000;
const cam = {x:0,y:0};
let screenState = 'start';   // 'start'|'avatar'|'weapon'|'playing'|'results'
let paused = false;
let grace = 0;
const GRACE = 2.6;
// --- movement feel (tune here) ---
const MOVE = { accel:0.30, friction:0.80, camLead:0.16 };   // start-snap, coast/skid, camera look-ahead (s of velocity)
// SHIPPED MODES — the single source of truth. BR & Squads were retired in v2.33.0 (engine paths
// kept dormant), and the docs/driver kept referencing them for a while afterwards. scripts/
// validate.mjs now gates every mode named in CLAUDE.md / the driver against this list, so a
// retired mode can't survive in a documented command again.
const MODES = ['horde'];
let gameMode = MODES[0];  // Endless Horde is the only mode (BR & Squads retired v2.33.0)
let timeOfDay = 'day';                      // 'day' | 'dusk' | 'night'
let groundSkin = 'grass';                   // key in IMG; picked with timeOfDay in buildDecor()
let activeMutator = null;                   // this match's MUTATORS entry, or null — see spawnMatch
let hordeWave = 0;
// Map escalation — every boss wave (5th, 10th, 15th…) also drops MAP_ESCALATE_PER new buildings
// onto the arena, additively, so later waves fight over a more cut-up, chokepoint-heavy map
// instead of just "the same map with more zombies". Capped so a very long run doesn't clutter the
// arena into a maze; MAP_ESCALATE_MAX * MAP_ESCALATE_PER = 12, roughly matching buildDecor's own
// max building count (22) added on top of a starting count as low as 13.
const MAP_ESCALATE_MAX = 6, MAP_ESCALATE_PER = 2;
let mapEscalations = 0;                     // escalateMap() call count this match, capped at MAP_ESCALATE_MAX
let hordeStallT = 0, hordeLastAlive = 0;    // wave-clear stall watchdog (unsticks stranded stragglers)
let aimWX = 0, aimWY = 0, aimShow = false;  // reticle world target
let spectating = false, specTarget = null, deathPlace = 0, spectateT = 0;
let gtime = 0;                              // animation clock (grass sway, etc.)
let vignetteGrad = null, vignetteKey = '';  // cached vignette gradient
const rings = [];                           // expanding shockwave rings (explosions)

const humans = [];
const zombies = [];
const bullets = [];
const bombs = [];
const zaps = [];          // lightning visual segments
const particles = [];
const floaters = [];
const killFeed = [];
const decor = [];
const obstacles = [];      // buildings (AABB) — block movement & bullets
const worldInteractables = []; // first-bundle cache/clinic/fuel/radio state
const pickups = [];        // ground items (health/medkit/armor/ammo/weapon)
const builds = [];         // player-built structures (walls/spikes/turrets) — solids also live in `obstacles`
const scraps = [];         // collectible scrap bits (the currency for building)
const drops = [];          // descending supply crates
const hitmarks = [];       // hit/kill markers (player feedback)
const splats = [];         // ground blood decals
const wallStreaks = [];    // blood drips left on building walls (local coords: o.x+s.x, o.y+s.y0)
const dmgDirs = [];        // damage-direction indicators (player)
let confetti = [];         // victory celebration
let lastWin = false, victoryT = 0, nextDrop = 18;
let streakMsg = '', streakT = 0;
let combo = 0, comboT = 0;                  // kill-combo chain (xp multiplier)
const COMBO_WIN = 3.0;                      // seconds to chain the next kill
let hitstop = 0;                            // kill slow-mo timer (wall-clock seconds)
let zoneWarn = 0;
let heartT = 0;                             // low-health heartbeat cadence
let zReinforce = 0;                         // BR/Squad zombie reinforcement cadence
let player = null;
let player2 = null;   // local co-op: 2nd human-controlled entity, joins when a 2nd gamepad is detected (see tryJoinPlayer2)
let startTime = 0, elapsed = 0, shake = 0, lastT = performance.now();
let killsTotal = 0, fieldSize = 15;
let matchStat = {dmgTaken:0, grappled:false};

// FPS counter
let fps = 60, fpsAcc = 0, fpsFrames = 0;
// perf-guard: sample sim+draw cost on heavy frames (many scaled zombies + acid) and warn if the
// budget blows past ~1 frame; helps catch a late-wave mobile slowdown before players report it.
let perfAcc = 0, perfN = 0, perfPeakZ = 0, perfLog = 0;

// ---------- Tunables ----------
const R = 15;                 // collision radius (humans)
const CHAR_VISUAL_SCALE = 1.18;       // drawn chibi scale only; collisions stay at R
const HERO_H = 70;                    // on-field hero sprite height (px) — nameplate offset tracks this
const HERO_ARM_ANCHOR_X = 0;           // live weapon-arm pivot on PNG heroes, in sprite-local pixels
const HERO_ARM_ANCHOR_Y = -15;         // chest-height anchor; avoids belly-mounted arms on v2 sprites
const HERO_ARM_REACH = 12;             // shoulder-to-wrist length in drawHeroArm's local (pre-scale)
                                        // space — shared with gunTip()/wristPos() below so bullets
                                        // spawn from the same point the arm is actually drawn at
const WEAPON_HAND_SCALE = 1.06;       // procedural in-hand fallback scale
const WEAPON_PNG_HAND_SCALE = 1.30;   // real PNG in-hand art scale
let campfires = [];           // cached campfire decor (heal auras) — rebuilt in buildDecor
const CAMPFIRE = { r:72, heal:6 };   // heal radius (px) and hp/sec near a fire

// ============================================================
//  Safe area (shrinking zone)
// ============================================================
