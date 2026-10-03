function portraitChibi(av,custom){
  const im=av && imgOk(av.img);
  if(im){   // hero PNG portrait, bottom-aligned in the card
    const c=document.createElement('canvas'); c.width=70; c.height=84; const o=c.getContext('2d');
    const DH=82, DW=DH*(im.naturalWidth/im.naturalHeight);
    o.drawImage(im, 35-DW/2, 84-DH, DW, DH); paintPortraitCustomization(o,custom); return c;
  }
  const c=document.createElement('canvas'); c.width=70; c.height=84; const o=c.getContext('2d');
  const L=av.look; o.translate(35,58); o.lineJoin='round'; o.lineCap='round';
  o.fillStyle='rgba(0,0,0,.18)'; o.beginPath(); o.ellipse(0,19,16,5,0,0,TAU); o.fill();
  // legs + shoes
  o.strokeStyle=INK; o.lineWidth=7; o.beginPath(); o.moveTo(-4,8); o.lineTo(-5,18); o.moveTo(4,8); o.lineTo(5,18); o.stroke();
  o.strokeStyle='#3a3a42'; o.lineWidth=5; o.beginPath(); o.moveTo(-4,8); o.lineTo(-5,18); o.moveTo(4,8); o.lineTo(5,18); o.stroke();
  o.fillStyle='#15151a'; o.beginPath(); o.ellipse(-5,19,3.6,2,0,0,TAU); o.ellipse(5,19,3.6,2,0,0,TAU); o.fill();
  // torso
  o.strokeStyle=INK; o.lineWidth=2; o.fillStyle=L.outfit; rr(o,-10,-7,20,18,6); o.fill(); o.stroke();
  o.save(); rr(o,-10,-7,20,18,6); o.clip(); o.fillStyle='rgba(255,255,255,.13)'; o.fillRect(-10,-8,7,19); o.fillStyle='rgba(0,0,0,.12)'; o.fillRect(5,-8,5,19);
  // bandolier strap on heavy fighters (matches in-game drawHuman)
  if(av.health>=118){ o.strokeStyle='rgba(52,38,24,.9)'; o.lineWidth=3.2;
    o.beginPath(); o.moveTo(-8,-6.5); o.lineTo(7,8.5); o.stroke();
    o.fillStyle='#c8b060'; for(let i=0;i<3;i++){ const k=0.28+i*0.22;
      o.beginPath(); o.arc(-8+15*k,-6.5+15*k,1.1,0,TAU); o.fill(); } }
  // belt + buckle
  o.fillStyle='rgba(0,0,0,.30)'; o.fillRect(-10,5.3,20,3);
  o.fillStyle='#d8b04a'; o.fillRect(-1.9,5,3.8,3.7);
  o.fillStyle='rgba(0,0,0,.35)'; o.fillRect(-0.7,6,1.4,1.7);
  o.restore();
  o.strokeStyle='rgba(0,0,0,.18)'; o.lineWidth=2; o.beginPath(); o.arc(0,-6,5.5,0.16*Math.PI,0.84*Math.PI); o.stroke();   // collar
  // head
  const hy=-19; o.fillStyle=L.skin; o.strokeStyle=INK; o.lineWidth=2; o.beginPath(); o.arc(0,hy,10.5,0,TAU); o.fill(); o.stroke();
  o.fillStyle='rgba(0,0,0,.06)'; o.beginPath(); o.arc(4,hy+1.5,5.5,0,TAU); o.fill();
  // hair (outlined)
  o.fillStyle=L.hair; o.strokeStyle=INK; o.lineWidth=1.5;
  const cap=()=>{ o.fillStyle=L.hair; o.beginPath(); o.arc(0,hy-2,10.7,Math.PI*1.02,-0.02); o.lineTo(9,hy+1.5); o.lineTo(-9,hy+1.5); o.closePath(); o.fill(); o.stroke(); };
  if(L.style==='curly'){ for(const p of [[-7,-6],[0,-9.5],[7,-6],[-3.5,-8.5],[3.5,-8.5]]){ o.beginPath(); o.arc(p[0],hy+p[1],4.7,0,TAU); o.fill(); o.stroke(); } }
  else if(L.style==='long'){ cap(); o.fillStyle=L.hair; o.fillRect(-11,hy-4,3.6,14); o.fillRect(7.4,hy-4,3.6,14); o.strokeRect(-11,hy-4,3.6,14); o.strokeRect(7.4,hy-4,3.6,14); }
  else if(L.style==='mask'){ cap(); o.fillStyle='#cfe8d0'; rr(o,-10,hy,20,9,2); o.fill(); o.stroke(); }
  else if(L.style==='ninja'){ o.fillStyle=L.outfit; o.beginPath(); o.arc(0,hy-1.5,11.5,0,TAU); o.fill(); o.stroke(); o.fillStyle=L.skin; o.fillRect(-9,hy-4,18,5.5); }
  else if(L.style==='mohawk'){ o.fillStyle=L.hair; o.beginPath(); o.moveTo(-2.6,hy-3); o.lineTo(-3.2,hy-15); o.lineTo(0,hy-17); o.lineTo(3.2,hy-15); o.lineTo(2.6,hy-3); o.closePath(); o.fill(); o.stroke(); for(const sx of [-8,8]) o.fillRect(sx-1,hy-6,2,5); }
  else if(L.style==='cap'){ o.fillStyle=L.hair; o.beginPath(); o.arc(0,hy-2,10.6,Math.PI,0); o.fill(); o.stroke(); o.beginPath(); o.ellipse(8.5,hy-1,8,2.8,0,0,TAU); o.fill(); o.stroke(); }
  else if(L.style==='visor'){ cap(); o.fillStyle='#1d2230'; rr(o,-9.5,hy-3,19,7.5,3); o.fill(); o.stroke();
    o.strokeStyle='#39e6d6'; o.lineWidth=1.8; o.beginPath(); o.moveTo(-7,hy+0.6); o.lineTo(7,hy+0.6); o.stroke();
    o.fillStyle='#bafff6'; o.beginPath(); o.arc(3.5,hy+0.6,1.2,0,TAU); o.fill(); }
  else if(L.style==='tophat'){ cap(); o.fillStyle='#23252b';
    o.beginPath(); o.ellipse(0,hy-6.5,12,2.9,0,0,TAU); o.fill(); o.stroke();
    rr(o,-7,hy-17,14,10,1.6); o.fill(); o.stroke();
    o.fillStyle=L.outfit; o.fillRect(-7,hy-9.6,14,2.6); }
  else if(L.style==='crown'){ cap(); o.fillStyle='#ffcf3a'; o.strokeStyle='#a9791a'; o.lineWidth=1.4;
    o.beginPath(); o.moveTo(-8.5,hy-6.5); o.lineTo(-8.5,hy-10); o.lineTo(-4.2,hy-7); o.lineTo(0,hy-12); o.lineTo(4.2,hy-7); o.lineTo(8.5,hy-10); o.lineTo(8.5,hy-6.5); o.closePath(); o.fill(); o.stroke();
    o.fillStyle='#e2452f'; o.beginPath(); o.arc(0,hy-7.5,1.3,0,TAU); o.fill();
    o.fillStyle='#39a0ff'; o.beginPath(); o.arc(-5.3,hy-7,1,0,TAU); o.arc(5.3,hy-7,1,0,TAU); o.fill(); }
  else if(L.style==='halo'){ cap(); o.strokeStyle='#ffe27a'; o.lineWidth=2.2; o.globalAlpha=0.45;
    o.beginPath(); o.ellipse(0,hy-14,7.4,2.5,0,0,TAU); o.stroke(); o.globalAlpha=1;
    o.strokeStyle='#fff3b0'; o.lineWidth=1.7; o.beginPath(); o.ellipse(0,hy-14,7,2.3,0,0,TAU); o.stroke(); }
  else if(L.style==='horns'){ cap(); o.fillStyle='#e8ddc8'; o.strokeStyle=INK; o.lineWidth=1.5;
    for(const sx of [-1,1]){ o.beginPath(); o.moveTo(sx*6.5,hy-6); o.quadraticCurveTo(sx*12,hy-11.5,sx*9.2,hy-17);
      o.quadraticCurveTo(sx*7.5,hy-12.5,sx*4.6,hy-8); o.closePath(); o.fill(); o.stroke(); } }
  else { cap(); if(L.style==='beard'){ o.fillStyle=L.hair; o.beginPath(); o.moveTo(-7.5,hy+1.5); o.quadraticCurveTo(0,hy+12,7.5,hy+1.5); o.closePath(); o.fill(); o.stroke(); } }
  // face (frog / visor draw their own)
  if(L.style!=='frog' && L.style!=='visor'){
    o.strokeStyle='rgba(24,18,12,.65)'; o.lineWidth=1.4; o.beginPath(); o.moveTo(-5,hy-4); o.lineTo(-1.6,hy-4.6); o.moveTo(1.6,hy-4.6); o.lineTo(5,hy-4); o.stroke();
    o.fillStyle='#1a1a1a'; o.beginPath(); o.arc(-3.2,hy-0.4,1.9,0,TAU); o.arc(3.2,hy-0.4,1.9,0,TAU); o.fill();
    o.fillStyle='#fff'; o.beginPath(); o.arc(-3.9,hy-1.1,0.7,0,TAU); o.arc(2.5,hy-1.1,0.7,0,TAU); o.fill();
    if(L.style==='glasses'){ o.strokeStyle='#111'; o.lineWidth=1.4; o.beginPath(); o.arc(-3.2,hy-0.4,3.2,0,TAU); o.arc(3.2,hy-0.4,3.2,0,TAU); o.stroke(); }
    o.strokeStyle='#8a4a3a'; o.lineWidth=1.3; o.beginPath(); o.arc(0,hy+3.4,2.3,0.15*Math.PI,0.85*Math.PI); o.stroke();
  }
  return c;
}
function rr(o,x,y,w,h,r){ o.beginPath(); o.moveTo(x+r,y); o.arcTo(x+w,y,x+w,y+h,r); o.arcTo(x+w,y+h,x,y+h,r); o.arcTo(x,y+h,x,y,r); o.arcTo(x,y,x+w,y,r); o.closePath(); }

function avClass(av){ if(av.health>=130) return {k:'tank',t:'Tank'}; if(av.speed>=5.6) return {k:'swift',t:'Swift'}; return {k:'balanced',t:'All-round'}; }
function buildAvatarGrid(){
  const g=el('avatarGrid'); g.innerHTML='';
  el('curLevel').textContent=meta.level; el('curLevel2').textContent=meta.level;
  renderCustomizer();
  AVATARS.forEach((av,i)=>{
    const unlocked=avatarUnlocked(av), sel=i===meta.avatar, c=avClass(av);
    const card=document.createElement('div'); card.className='card'+(sel?' sel':'')+(unlocked?'':' locked');
    const por=document.createElement('div'); por.className='por'; por.appendChild(portraitChibi(av)); card.appendChild(por);
    card.insertAdjacentHTML('beforeend',
      '<div class="wtop"><span class="nm2">'+av.name+'</span><span class="aclass '+c.k+'">'+c.t+'</span></div>'+
      statBar('spd','Speed', av.speed.toFixed(1), av.speed/6.5)+
      statBar('hp','Health', av.health, av.health/160)+
      '<div class="lvl">'+(unlocked?'Level '+av.unlock:'🔒 Level '+av.unlock)+'</div>'+
      (sel?'<div class="equip">SELECTED</div>':'')+
      (unlocked?'':'<div class="lock">🔒</div>'));
    if(unlocked) card.addEventListener('click',()=>{ meta.avatar=i; saveMeta(); renderCustomizer(); renderMenu();
      [...g.children].forEach(c2=>{ c2.classList.remove('sel'); const e=c2.querySelector('.equip'); if(e) e.remove(); });
      card.classList.add('sel'); card.insertAdjacentHTML('beforeend','<div class="equip">SELECTED</div>'); });
    g.appendChild(card);
  });
}
function renderCustomizer(){
  const groups=[['palette','paletteChoices'],['hair','hairChoices'],['accessory','accessoryChoices'],['trait','traitChoices']];
  const list=k=>({palette:CUSTOM.palettes,hair:CUSTOM.hair,accessory:CUSTOM.accessories,trait:CUSTOM.traits}[k]);
  for(const [key,hostId] of groups){ const host=el(hostId); if(!host) continue; host.innerHTML='';
    for(const item of list(key)){ const b=document.createElement('button'); b.type='button'; b.className='customChoice'+(meta.custom[key]===item.id?' on':'');
      b.textContent=key==='palette'?'':(item.icon+' '+item.name); b.title=item.name;
      if(key==='palette') b.style.background=item.outfit; b.setAttribute('aria-label',item.name);
      b.addEventListener('click',()=>{ meta.custom[key]=item.id; saveMeta(); renderCustomizer(); renderMenu(); }); host.appendChild(b); }
  }
  const p=CUSTOM.palettes.find(x=>x.id===meta.custom.palette)||CUSTOM.palettes[0];
  const names=['hair','accessory','trait'].map(k=>(list(k).find(x=>x.id===meta.custom[k])||list(k)[0]).name);
  const sum=el('customSummary'); if(sum) sum.textContent=p.name+' palette · '+names.join(' · ');
}
const WMODE={semi:'SEMI',auto:'AUTO',shotgun:'SHOT',sniper:'SNIPE',flame:'FLAME',launcher:'BOOM'};
function wstats(w){
  const pel = w.mode==='shotgun'?6 : w.mode==='flame'?3 : (w.twin?2:1);   // projectiles per trigger
  let perShot = w.dmg*pel;
  if(w.mode==='launcher') perShot = 90;                       // splash damage, not the direct hit
  const cyc = w.mag*w.fireCd + w.reload;                      // full mag + reload (s)
  return { perShot, dps: Math.round(perShot*w.mag/cyc), rpm: Math.round(60/w.fireCd) };
}
// rarity tier by unlock level — drives the card's accent colour + chip
function weaponTier(w){ const u=w.unlock||1;
  if(u>=9) return {k:'legendary', t:'Legendary', c:'#ffcf3a', w:'rgba(255,207,58,.20)'};
  if(u>=6) return {k:'epic',      t:'Epic',      c:'#c08bff', w:'rgba(192,139,255,.19)'};
  if(u>=3) return {k:'rare',      t:'Rare',      c:'#5aa8ff', w:'rgba(90,168,255,.16)'};
  return    {k:'common',    t:'Common',    c:'#a7b39a', w:'rgba(167,179,154,.12)'};
}
function statBar(cls,label,val,frac){
  return '<div class="row '+cls+'row"><span>'+label+'</span><span>'+val+'</span></div>'+
         '<div class="bar '+cls+'"><i style="width:'+clamp(frac*100,6,100)+'%"></i></div>';
}
function dpsDelta(dps, eqDps){
  if(dps===eqDps) return '<span class="wdelta same">EQUIPPED</span>';
  const up=dps>eqDps; return '<span class="wdelta '+(up?'up':'down')+'">'+(up?'▲ +':'▼ ')+(dps-eqDps)+' DPS</span>';
}
function buildWeaponGrid(){
  const g=el('weaponGrid'); g.innerHTML='';
  const eqDps = wstats(WEAPONS[meta.weapon]).dps;
  const maxDps = Math.max(...WEAPONS.map(w=>wstats(w).dps));    // strongest gun → full Power bar
  const ownedDps = WEAPONS.filter(weaponUnlocked).map(w=>wstats(w).dps);
  const rankOf = d => ownedDps.filter(x=>x>d).length + 1;       // #1 = best DPS you own (locked guns aren't ranked)
  const order=WEAPONS.map((_,i)=>i).sort((a,b)=>(WEAPONS[b].featured?1:0)-(WEAPONS[a].featured?1:0));
  order.forEach(i=>{
    const w=WEAPONS[i];
    const unlocked=weaponUnlocked(w), sel=i===meta.weapon, s=wstats(w), tier=weaponTier(w);
    const card=document.createElement('div'); card.className='card wcard t-'+tier.k+(sel?' sel':'')+(unlocked?'':' locked');
    card.style.setProperty('--tier', tier.c); card.style.setProperty('--tw', tier.w);
    const ic=document.createElement('div'); ic.className='wicon'; ic.appendChild(weaponIcon(w)); card.appendChild(ic);
    card.insertAdjacentHTML('beforeend',
      '<div class="wtop"><span class="nm2">'+w.name+'</span><span class="wtier '+tier.k+'">'+tier.t+'</span></div>'+
      '<div class="wtop" style="margin-top:-2px"><span class="wmode '+w.mode+'">'+(WMODE[w.mode]||w.mode)+'</span></div>'+
      '<div class="wdps"><b>'+s.dps+'</b><span>DPS</span>'+(unlocked&&!sel?dpsDelta(s.dps,eqDps):'')+'</div>'+
      statBar('pow','Power', unlocked?'#'+rankOf(s.dps):'', s.dps/maxDps)+
      statBar('dmg','Damage', s.perShot, Math.min(s.perShot,250)/250)+
      statBar('fire','Fire rate', s.rpm+'/m', Math.min(s.rpm,1200)/1200)+
      statBar('mag','Mag', w.mag, Math.min(w.mag/60,1))+
      statBar('rng','Range', w.range, w.range/600)+
      '<div class="special">'+w.special+'</div>'+
      '<div class="lvl">'+(unlocked?'Level '+w.unlock:'🔒 Unlocks at Lv '+w.unlock)+'</div>'+
      (sel?'<div class="equip">EQUIPPED</div>':'')+
      (unlocked?'':'<div class="lock">🔒</div>'));
    if(unlocked) card.addEventListener('click',()=>{ meta.weapon=i; saveMeta(); buildWeaponGrid(); });
    g.appendChild(card);
  });
}

function startMatch(){
  audioInit(); ended=false; paused=false; grace=GRACE; lastWin=false; confetti=[];
  spectating=false; specTarget=null; el('specBar').classList.add('hidden');
  applyVolume();
  // never drop in with a locked weapon/avatar (e.g. after data reset)
  if(!weaponUnlocked(WEAPONS[meta.weapon])) meta.weapon=0;
  if(!avatarUnlocked(AVATARS[meta.avatar])) meta.avatar=0;
  zoneReset(); spawnMatch();
  startTime=performance.now(); elapsed=0; shake=0;
  screenState='playing';
  show(''); el('settings').classList.add('hidden'); el('results').classList.add('hidden');
  el('hud').classList.remove('hidden'); el('ctrl').classList.remove('hidden'); el('powers').classList.remove('hidden');
}

