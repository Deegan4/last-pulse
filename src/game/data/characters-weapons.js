const AVATARS = [
  {name:'Kai',    speed:5.6, health:104, unlock:1,  img:'hero-kai',    armless:true, look:{skin:'#f0c8a0',hair:'#1f52d8',outfit:'#2f6ecc',style:'glasses'}},
  {name:'Milo',   speed:5.5, health:110, unlock:1,  img:'hero-milo',   armless:true, look:{skin:'#f2cbb0',hair:'#5a3a1a',outfit:'#e8641f',style:'curly'}},
  {name:'Chip',   speed:6.0, health:88,  unlock:2,  img:'hero-chip',   armless:true, look:{skin:'#f2cbb0',hair:'#3aa83a',outfit:'#2e9a2e',style:'cap'}},
  {name:'Lila',   speed:6.3, health:80,  unlock:3,  img:'hero-lila',   armless:true, look:{skin:'#f2cbb0',hair:'#e8479a',outfit:'#e85d9a',style:'long'}},
  {name:'Yuki',   speed:6.0, health:90,  unlock:5,  img:'hero-yuki',   armless:true, look:{skin:'#e8c4a8',hair:'#3a2a4a',outfit:'#2a2530',style:'long'}},
  {name:'Vex',    speed:6.1, health:86,  unlock:7,  img:'hero-vex',    armless:true, look:{skin:'#e8c4a8',hair:'#161616',outfit:'#1f1f22',style:'ninja'}},
  {name:'Sarge',  speed:4.6, health:140, unlock:9,  img:'hero-sarge',  armless:true, look:{skin:'#e8b48c',hair:'#e8b48c',outfit:'#3f4a2a',style:'beard'}},
  {name:'Finn',   speed:5.3, health:118, unlock:12, img:'hero-finn',   armless:true, look:{skin:'#f0c8a0',hair:'#f2c832',outfit:'#6a4a2a',style:'mohawk'}},
  {name:'Cypher', speed:5.9, health:96,  unlock:15, img:'hero-cypher', armless:true, look:{skin:'#e8d0c0',hair:'#6a5a8a',outfit:'#241f38',style:'visor'}},
  {name:'Shade',  speed:6.2, health:84,  unlock:16, img:'hero-shade',  armless:true, aura:'#7bff5a', look:{skin:'#2a2f26',hair:'#141414',outfit:'#1c221a',style:'ninja'}},
  {name:'Nova',   speed:6.4, health:82,  unlock:18, img:'hero-nova',   armless:true, aura:'#c46bff', look:{skin:'#efc9a6',hair:'#2a1f38',outfit:'#241a30',style:'ninja'}},
  {name:'Blaze',  speed:5.5, health:112, unlock:20, img:'hero-blaze',  armless:true, aura:'#ff8a3a', look:{skin:'#f0c090',hair:'#ff6a1a',outfit:'#2f3320',style:'mohawk'}},
  {name:'Reaper', speed:5.8, health:96,  unlock:22, img:'hero-reaper', armless:true, aura:'#6bff9a', look:{skin:'#d8d2bc',hair:'#141414',outfit:'#17171a',style:'ninja'}},
  {name:'Onyx',   speed:4.7, health:138, unlock:24, img:'hero-onyx',   armless:true, aura:'#39e0ff', look:{skin:'#3a4048',hair:'#141414',outfit:'#191b1f',style:'horns'}},
  {name:'Titan',  speed:4.4, health:150, unlock:26, img:'hero-titan',  armless:true, aura:'#ff5a5a', look:{skin:'#e8b48c',hair:'#3a3f47',outfit:'#33373d',style:'horns'}},
];
// Modular cosmetic layers are intentionally independent of fighter stats. Existing saves get
// the first option in each family, while the avatar's own look remains the visual baseline.
const CUSTOM = {
  palettes:[
    {id:'pulse',name:'Pulse',outfit:'#2f6ecc',accent:'#d6ff6e'},
    {id:'ember',name:'Ember',outfit:'#b84f35',accent:'#ffcf6b'},
    {id:'tide',name:'Tide',outfit:'#247f91',accent:'#8de8ff'},
    {id:'violet',name:'Violet',outfit:'#7047a8',accent:'#e0b8ff'},
    {id:'sun',name:'Solar',outfit:'#c89227',accent:'#fff0a8'},
  ],
  hair:[
    {id:'base',name:'Signature',icon:'✦'}, {id:'fade',name:'Fade',icon:'▰'},
    {id:'waves',name:'Waves',icon:'〰'}, {id:'spikes',name:'Spikes',icon:'▲'},
  ],
  accessories:[
    {id:'none',name:'None',icon:'—'}, {id:'headset',name:'Headset',icon:'◉'},
    {id:'scarf',name:'Scarf',icon:'⌁'}, {id:'visor',name:'Visor',icon:'▱'},
  ],
  traits:[
    {id:'bright',name:'Bright eyes',icon:'●'}, {id:'wink',name:'Wink',icon:'◒'},
    {id:'scar',name:'Battle scar',icon:'╱'}, {id:'smile',name:'Big smile',icon:'⌣'},
  ]
};
function defaultCustom(){ return {palette:'pulse',hair:'base',accessory:'none',trait:'bright'}; }
function readCustom(){
  try{ const v=JSON.parse(safeGet('dd2_custom','{}')); const d=defaultCustom();
    return {...d,...(v&&typeof v==='object'?v:{})}; }catch(e){ return defaultCustom(); }
}
const WEAPONS = [
  {name:'Pistol',  icon:'🔫', dmg:30,  mag:5,  reload:2.0,  range:300, fireCd:0.34, mode:'semi',    unlock:1,  special:'50% chance of a critical hit',        img:'weapon-pistol'},
  {name:'Rifle',   icon:'🪖', dmg:10,  mag:10, reload:1.25, range:150, fireCd:0.10, mode:'auto',    unlock:1,  special:'10 bullets per ammo',                  img:'weapon-rifle'},
  {name:'Shotgun', icon:'💥', dmg:20,  mag:2,  reload:1.25, range:150, fireCd:0.62, mode:'shotgun', unlock:2,  special:'wide pellet spread',                   img:'weapon-shotgun'},
  {name:'SMG',     icon:'🧨', dmg:8,   mag:25, reload:1.6,  range:200, fireCd:0.07, mode:'auto',    unlock:3,  special:'blazing fire rate',                    img:'weapon-smg'},
  {name:'Magnum',  icon:'🔩', dmg:55,  mag:6,  reload:1.8,  range:340, fireCd:0.40, mode:'semi',    unlock:4,  special:'heavy-hitting revolver',               img:'weapon-magnum'},
  {name:'Sniper',  icon:'🎯', dmg:190, mag:1,  reload:3.0,  range:600, fireCd:0.9,  mode:'sniper',  unlock:5,  special:'pierces — huge range & damage',        img:'weapon-sniper'},
  {name:'Crossbow',icon:'🏹', dmg:90,  mag:1,  reload:1.3,  range:480, fireCd:0.9,  mode:'sniper',  unlock:6,  special:'silent piercing bolt',                 img:'weapon-crossbow'},
  {name:'Flame',   icon:'🔥', dmg:7,   mag:80, reload:2.2,  range:120, fireCd:0.04, mode:'flame',   unlock:7,  special:'sets enemies on fire',                 img:'weapon-flame'},
  {name:'Minigun', icon:'🌀', dmg:9,   mag:60, reload:3.4,  range:260, fireCd:0.05, mode:'auto',    unlock:9,  special:'huge mag — mows down crowds',          img:'weapon-minigun'},
  {name:'Tommy',   icon:'🎻', dmg:11,  mag:30, reload:1.7,  range:190, fireCd:0.085,mode:'auto',    unlock:8,  special:'drum-mag auto — steady spray',         img:'weapon-tommy'},
  {name:'Launcher',icon:'🚀', dmg:40,  mag:1,  reload:2.6,  range:340, fireCd:1.2,  mode:'launcher',unlock:12, special:'explosive rocket — splash damage',     img:'weapon-launcher'},
  {name:'Vipers',  icon:'🐍', dmg:9,   mag:24, reload:1.7,  range:210, fireCd:0.09, mode:'auto', twin:true, unlock:15, special:'twin barrels — double the lead', img:'weapon-vipers'},
  {name:'Pulse SMG',icon:'⚡', dmg:7,   mag:36, reload:1.45, range:230, fireCd:0.055,mode:'auto',    unlock:1, special:'hyper-fast pulse stream',             img:'weapon-pulse-smg', featured:true},
  {name:'Arc Rifle',icon:'🔷', dmg:18,  mag:14, reload:1.9,  range:360, fireCd:0.18, mode:'auto', arc:true, unlock:1, special:'electric rounds chain once',   img:'weapon-arc-rifle', featured:true},
  {name:'Frost Blaster',icon:'❄️', dmg:12, mag:28, reload:2.0, range:250, fireCd:0.12, mode:'auto', frost:true, unlock:1, special:'slows enemies on hit',       img:'weapon-frost-blaster', featured:true},
  {name:'Rocket Launcher',icon:'🚀', dmg:62, mag:2, reload:3.2, range:390, fireCd:1.35, mode:'launcher', unlock:1, special:'heavy rockets — bigger splash',     img:'weapon-rocket-launcher', featured:true},
];
const INK = '#23281b';   // shared cartoon outline colour
const RANGE_SCALE = 1.7;

