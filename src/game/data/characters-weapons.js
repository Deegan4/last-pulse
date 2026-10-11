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
const WEAPONS = [
  {name:'Fists',       icon:'👊', dmg:14, reach:34, sweep:0.75, fireCd:0.26, mode:'combo',  unlock:1, melee:true, col:'#e8c4a8', special:'3-hit combo — the finisher hits harder'},
  {name:'Bat',         icon:'🏏', dmg:26, reach:52, sweep:0.85, fireCd:0.34, mode:'combo',  unlock:1, melee:true, col:'#c58a4a', special:'3-hit combo with a wide finisher'},
  {name:'Knife',       icon:'🔪', dmg:12, reach:38, sweep:0.6,  fireCd:0.15, mode:'jab',    unlock:2, melee:true, col:'#cfd6dc', special:'blazing-fast stabs'},
  {name:'Pipe',        icon:'🔧', dmg:48, reach:60, sweep:1.0,  fireCd:0.62, mode:'heavy',  unlock:3, melee:true, col:'#8a949c', special:'slow heavy swing — hits everything in the arc'},
  {name:'Nunchaku',    icon:'🥋', dmg:16, reach:48, sweep:0.9,  fireCd:0.22, mode:'combo',  unlock:4, melee:true, col:'#d4a017', special:'fast 3-hit combo'},
  {name:'Spear',       icon:'🔱', dmg:34, reach:84, sweep:0.32, fireCd:0.46, mode:'thrust', unlock:6, melee:true, col:'#b9c2c9', special:'long thrust that pierces a line of enemies'},
  {name:'Sledgehammer',icon:'🔨', dmg:90, reach:66, sweep:1.1,  fireCd:0.85, mode:'heavy',  unlock:8, melee:true, col:'#7d8790', special:'crushing swing — massive knockback'},
];
const INK = '#23281b';   // shared cartoon outline colour
const RANGE_SCALE = 1.7;

