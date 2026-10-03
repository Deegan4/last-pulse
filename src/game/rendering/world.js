// ---- ground texture: cached repeating tile (checker mow-stripes + speckle) ----
const GROUND_COLS = { day:['#6aa84f','#63a14a','#5f9c46','#74b258'], dusk:['#6f9a48','#689344','#648e41','#79a350'], night:['#4f7a44','#4a7440','#46703d','#56834a'] };
let groundPat=null, groundKey='';
function groundPattern(){
  const imgKey = imgOk(groundSkin) ? groundSkin : 'grass';
  const gi=imgOk(imgKey), key=timeOfDay+'-'+imgKey+(gi?'-img':'');
  if(groundKey===key && groundPat) return groundPat;
  groundKey=key;
  if(gi){   // seamless grass photo tile, tinted to match dusk/night lighting
    const T=512, c=document.createElement('canvas'); c.width=c.height=T; const o=c.getContext('2d');
    o.drawImage(gi,0,0,T,T);
    const tint=GROUND_TINT[timeOfDay]; if(tint){ o.fillStyle=tint; o.fillRect(0,0,T,T); }
    groundPat=ctx.createPattern(c,'repeat'); return groundPat;
  }
  const T=256, c=document.createElement('canvas'); c.width=c.height=T; const o=c.getContext('2d');
  const [base,alt,dark,lite]=GROUND_COLS[timeOfDay]||GROUND_COLS.day;
  o.fillStyle=base; o.fillRect(0,0,T,T);
  o.fillStyle=alt; o.fillRect(T/2,0,T/2,T/2); o.fillRect(0,T/2,T/2,T/2);   // mowed checker
  // deterministic speckles (seeded so the tile never shimmers between rebuilds)
  let s=42; const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  for(let i=0;i<64;i++){ o.fillStyle = rnd()<0.5?dark:lite; o.globalAlpha=0.35+rnd()*0.3;
    const x=rnd()*T, y=rnd()*T, r=0.8+rnd()*1.6; o.beginPath(); o.arc(x,y,r,0,TAU); o.fill(); }
  o.globalAlpha=1;
  // faint blade strokes
  o.strokeStyle=dark; o.globalAlpha=0.25; o.lineWidth=1;
  for(let i=0;i<26;i++){ const x=rnd()*T, y=rnd()*T; o.beginPath(); o.moveTo(x,y); o.lineTo(x+1.5-rnd()*3,y-3-rnd()*3); o.stroke(); }
  o.globalAlpha=1;
  groundPat=ctx.createPattern(c,'repeat');
  return groundPat;
}
function drawField(){
  ctx.fillStyle = groundPattern();
  ctx.fillRect(cam.x-2,cam.y-2,W+4,H+4);
  // soft darker patches
  for(const d of decor){ if(d.type!=='patch'||!inView(d.x,d.y,d.s)) continue;
    ctx.fillStyle='rgba(40,80,30,'+d.h+')'; ctx.beginPath(); ctx.ellipse(d.x,d.y,d.s,d.s*0.7,0,0,TAU); ctx.fill(); }
  // world border (fence-ish)
  ctx.strokeStyle='rgba(40,60,24,.8)'; ctx.lineWidth=8; ctx.strokeRect(4,4,ARENA-8,ARENA-8);
}
// interior layer — y-sorted at the building's TOP edge so entities inside draw on top of the
// floor. Also computes the facade fade (player inside or stepping through the door).
function drawBuildingBase(d){
  const x=d.x,y=d.y,w=d.w,h=d.h;
  const p=player, doorX = p && Math.abs(p.x-(x+w/2))<DOOR_HALF+16;
  const nearDoor = p && p.alive && doorX && ((p.y>y+h-36 && p.y<y+h+18) || (w>BIG_HOUSE && p.y>y-18 && p.y<y+36));
  const inside = p && p.alive && p.x>x+WALL_T && p.x<x+w-WALL_T && p.y>y+WALL_T && p.y<y+h-WALL_T;
  d.fade = lerp(d.fade===undefined?1:d.fade, (inside||nearDoor)?0.15:1, 0.16);
  ctx.lineJoin='round';
  ctx.fillStyle='rgba(0,0,0,.18)'; roundRect(x+5,y+8,w,h,6); ctx.fill();
  // wood floor, rug, clutter and the top-down wall frame (seen when the facade fades)
  if(d.fade<0.98){
    ctx.fillStyle='#b9975f'; roundRect(x,y,w,h,5); ctx.fill();
    ctx.strokeStyle='rgba(90,64,34,.5)'; ctx.lineWidth=1.2;
    for(let fy=y+12; fy<y+h-5; fy+=11){ ctx.beginPath(); ctx.moveTo(x+4,fy); ctx.lineTo(x+w-4,fy); ctx.stroke(); }
    ctx.fillStyle='rgba(160,60,60,.85)'; roundRect(x+w/2-24,y+h*0.4,48,30,6); ctx.fill();          // rug
    ctx.strokeStyle='rgba(255,230,180,.5)'; ctx.lineWidth=1.5; roundRect(x+w/2-19,y+h*0.4+4,38,22,4); ctx.stroke();
    ctx.fillStyle='#8a6a3a'; ctx.strokeStyle=INK; ctx.lineWidth=2; roundRect(x+13,y+13,22,18,3); ctx.fill(); ctx.stroke();   // crate
    ctx.strokeStyle='rgba(60,40,16,.6)'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x+13,y+22); ctx.lineTo(x+35,y+22); ctx.stroke();
    ctx.fillStyle='#7a5a3a'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x+w-32,y+27,14,9,0,0,TAU); ctx.fill(); ctx.stroke();  // table
    ctx.fillStyle='#8f8271'; ctx.strokeStyle=INK; ctx.lineWidth=1.5;                                // wall frame + door gap
    for(const wr of wallRects(d)){ ctx.fillRect(wr[0],wr[1],wr[2],wr[3]); ctx.strokeRect(wr[0],wr[1],wr[2],wr[3]); }
  }
}
// facade layer — y-sorted at the bottom edge; fades away while the player is inside.
// The four kinds (house/shop/barn/cabin) share the wall+roof scaffold; each swaps its
// wall texture, windows, door dressing and rooftop trim for a distinct silhouette.
function drawBuilding(d){
  const x=d.x,y=d.y,w=d.w,h=d.h, lit=timeOfDay!=='day', cx=x+w/2;   // windows glow at dusk/night
  const kind=d.kind||'house';
  if((d.fade===undefined?1:d.fade)<=0.02) return;
  // 3D GLB building billboards are intentionally NOT used: the placeholder boxes clipped at the tile edge,
  // hid the door/hp bar/interior, and clashed with the 2D art. Always draw the hand-drawn facade below.
  ctx.lineJoin='round';
  ctx.save(); ctx.globalAlpha=(d.fade===undefined?1:d.fade);
  // Strong top-down silhouette: the old flat rectangle lost its depth on small screens.
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x+w*.52,y+h+10,w*.57,10,0,0,TAU); ctx.fill();
  const sideFill = kind==='barn'?'#7d382f' : kind==='cabin'?'#8d603a' : kind==='shop'?'#b5a993' : '#a69782';
  ctx.fillStyle=sideFill; ctx.strokeStyle=INK; ctx.lineWidth=2.4; ctx.beginPath();
  ctx.moveTo(x+w-2,y+7); ctx.lineTo(x+w+11,y+14); ctx.lineTo(x+w+11,y+h-4); ctx.lineTo(x+w-2,y+h); ctx.closePath(); ctx.fill(); ctx.stroke();
  // --- wall + soft top-light / right-shade (fill colour per kind) ---
  const wallFill = kind==='barn'?'#b0503f' : kind==='cabin'?'#b78a52' : kind==='shop'?'#e6dcc4' : '#ddd0b8';
  ctx.fillStyle=wallFill; ctx.strokeStyle=INK; ctx.lineWidth=2.5; roundRect(x,y,w,h,5); ctx.fill(); ctx.stroke();
  ctx.save(); roundRect(x,y,w,h,5); ctx.clip();
  ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(x,y,w,h*0.3);
  ctx.fillStyle='rgba(0,0,0,.10)'; ctx.fillRect(x+w*0.64,y,w*0.36,h);
  ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(x+3,y+5,w-6,4);                    // upper facade trim
  ctx.fillStyle='rgba(55,40,28,.22)'; ctx.fillRect(x+3,y+h-13,w-6,4);                    // foundation trim
  if(kind==='cabin'){                                                         // horizontal log courses
    ctx.strokeStyle='rgba(80,54,26,.4)'; ctx.lineWidth=1.4;
    for(let ly=y+11; ly<y+h-3; ly+=12){ ctx.beginPath(); ctx.moveTo(x,ly); ctx.lineTo(x+w,ly); ctx.stroke(); }
  } else if(kind==='barn'){                                                   // vertical red planks + white trim
    ctx.strokeStyle='rgba(70,26,20,.35)'; ctx.lineWidth=1.4;
    for(let px=x+16; px<x+w-6; px+=18){ ctx.beginPath(); ctx.moveTo(px,y); ctx.lineTo(px,y+h); ctx.stroke(); }
    ctx.fillStyle='rgba(240,235,225,.85)'; ctx.fillRect(x,y+h*0.5,w,3);
  } else ctx.fillStyle='rgba(120,90,50,.16)', ctx.fillRect(x,y+h*0.5,w,2.5); // house/shop wall trim line
  // blood streaks left on this wall — drawn on the plain wall face, under windows/door dressing
  if(wallStreaks.length){ for(const s of wallStreaks){ if(s.o!==d) continue;
    const sx=x+s.x, sy=y+s.y0, a=clamp(s.t/9,0,1)*0.7;
    const g=ctx.createLinearGradient(sx,sy,sx,sy+s.len);
    g.addColorStop(0,s.col+(a*0.9)+')'); g.addColorStop(1,s.col+'0)');
    ctx.strokeStyle=g; ctx.lineWidth=s.w; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy+s.len); ctx.stroke(); } }
  ctx.restore();
  if(kind==='shop'){
    // --- SHOP: low shopfront window + striped awning + hanging sign ---
    ctx.strokeStyle=INK; ctx.lineWidth=2;
    if(lit){ ctx.shadowColor='#ffcf6a'; ctx.shadowBlur=10; ctx.fillStyle='#ffe6a0'; } else ctx.fillStyle='#bfe3ef';
    roundRect(x+14,y+h*0.4,w-28,h*0.34,4); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(20,40,60,.5)'; ctx.lineWidth=1.4;
    for(let mx=x+14+(w-28)/4; mx<x+w-14; mx+=(w-28)/4){ ctx.beginPath(); ctx.moveTo(mx,y+h*0.4); ctx.lineTo(mx,y+h*0.4+h*0.34); ctx.stroke(); }
    // striped awning band over the shopfront
    const ay=y+h*0.4-11; ctx.strokeStyle=INK; ctx.lineWidth=2;
    for(let i=0;i<Math.ceil((w-20)/16);i++){ ctx.fillStyle=i%2?'#e8524f':'#f6f1ea';
      roundRect(x+10+i*16, ay, Math.min(16,x+w-10-(x+10+i*16)), 11, 2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle='#f6f1ea'; for(let i=0;i<Math.ceil((w-20)/16);i++){ ctx.beginPath();  // scalloped hem
      ctx.moveTo(x+10+i*16,ay+11); ctx.lineTo(x+10+i*16+8,ay+16); ctx.lineTo(x+10+i*16+16,ay+11); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    // hanging sign near the top corner
    ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.fillStyle='#caa24a';
    roundRect(x+w*0.5-16,y+10,32,13,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#6a4a24'; ctx.font='700 9px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('SHOP', cx, y+17);
  } else if(kind==='barn'){
    // --- BARN: round hayloft window up high + big X-braced double doors flanking the gap ---
    ctx.strokeStyle=INK; ctx.lineWidth=2;
    if(lit){ ctx.shadowColor='#ffcf6a'; ctx.shadowBlur=9; ctx.fillStyle='#ffd98a'; } else ctx.fillStyle='#7a4230';
    ctx.beginPath(); ctx.arc(cx,y+h*0.26,11,0,TAU); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(30,10,6,.5)'; ctx.lineWidth=1.4; ctx.beginPath();
    ctx.moveTo(cx-11,y+h*0.26); ctx.lineTo(cx+11,y+h*0.26); ctx.moveTo(cx,y+h*0.26-11); ctx.lineTo(cx,y+h*0.26+11); ctx.stroke();
    const dw2=26,dh2=40, dy=y+h-dh2;                                          // two doors either side of the real gap
    for(const dx of [cx-DOOR_HALF-dw2, cx+DOOR_HALF]){
      ctx.fillStyle='#8f3a2c'; ctx.strokeStyle=INK; ctx.lineWidth=2; roundRect(dx,dy,dw2,dh2,2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(240,235,225,.7)'; ctx.lineWidth=2;                // white X-brace
      ctx.beginPath(); ctx.moveTo(dx+2,dy+2); ctx.lineTo(dx+dw2-2,dy+dh2-2); ctx.moveTo(dx+dw2-2,dy+2); ctx.lineTo(dx+2,dy+dh2-2); ctx.stroke(); }
  } else {
    // --- HOUSE / CABIN: two (or one for cabin) glass windows + a plank door ---
    ctx.strokeStyle=INK; ctx.lineWidth=2;
    const wins = kind==='cabin' ? [cx] : [x+w*0.24, x+w*0.76];
    for(const wx of wins){
      if(lit){ ctx.shadowColor='#ffcf6a'; ctx.shadowBlur=10; ctx.fillStyle='#ffd98a'; } else ctx.fillStyle='#9fd0e6';
      ctx.fillStyle='#3d4c55'; roundRect(wx-16,y+h*0.32,32,26,4); ctx.fill(); ctx.stroke();
      if(lit){ ctx.shadowColor='#ffcf6a'; ctx.shadowBlur=10; ctx.fillStyle='#ffd98a'; } else { ctx.shadowBlur=0; ctx.fillStyle='#9fd0e6'; }
      roundRect(wx-12,y+h*0.34,24,20,2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
      if(!lit){ ctx.fillStyle='rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(wx-11,y+h*0.34+2); ctx.lineTo(wx-3,y+h*0.34+2); ctx.lineTo(wx-11,y+h*0.34+10); ctx.closePath(); ctx.fill(); }  // glass glint
      ctx.strokeStyle='rgba(20,40,60,.5)'; ctx.lineWidth=1.4; ctx.beginPath();
      ctx.moveTo(wx,y+h*0.34); ctx.lineTo(wx,y+h*0.34+21); ctx.moveTo(wx-13,y+h*0.34+10.5); ctx.lineTo(wx+13,y+h*0.34+10.5); ctx.stroke(); ctx.strokeStyle=INK; ctx.lineWidth=2; }
    ctx.fillStyle='#5a4632'; const dw=26,dh=31; roundRect(cx-dw/2,y+h-dh,dw,dh,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(cx-dw/2+3,y+h-dh+4,4,dh-8);
    ctx.fillStyle='#7f633d'; ctx.fillRect(cx-dw/2+5,y+h-7,dw-10,3);                 // threshold
    ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.lineWidth=1.2; roundRect(cx-dw/2+3,y+h-dh+4,dw-6,dh-7,2); ctx.stroke(); ctx.strokeStyle=INK; ctx.lineWidth=2;
    ctx.fillStyle='#caa24a'; ctx.beginPath(); ctx.arc(cx+5,y+h-dh/2,1.8,0,TAU); ctx.fill();
  }
  // --- roof slab with shingle courses + ridge highlight (shared) ---
  ctx.fillStyle=d.roof; ctx.strokeStyle=INK; ctx.lineWidth=2.5; ctx.beginPath();
  ctx.moveTo(x-8,y-14); ctx.lineTo(x+w+8,y-14); ctx.lineTo(x+w+13,y+7); ctx.lineTo(x-3,y+7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.moveTo(x-8,y-14); ctx.lineTo(x+w+8,y-14); ctx.lineTo(x+w+13,y+7); ctx.lineTo(x-3,y+7); ctx.closePath(); ctx.clip();
  ctx.strokeStyle='rgba(0,0,0,.16)'; ctx.lineWidth=1.4;
  for(let ry=y-8; ry<y+10; ry+=6){ ctx.beginPath(); ctx.moveTo(x-10,ry); ctx.lineTo(x+w+12,ry+2); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x-4,y-10); ctx.lineTo(x+w+7,y-10); ctx.lineTo(x+w+9,y-6); ctx.lineTo(x-3,y-6); ctx.closePath(); ctx.fill();
  // rooftop trim per kind: cabin gets a thin stovepipe, shops skip the chimney, others a brick chimney
  if(kind==='cabin'){ ctx.fillStyle='#4a4a4e'; ctx.strokeStyle=INK; ctx.lineWidth=2; roundRect(x+w*0.72,y-30,7,18,2); ctx.fill(); ctx.stroke();
    if(lit){ ctx.fillStyle='rgba(200,200,210,.4)'; ctx.beginPath(); ctx.arc(x+w*0.72+3.5,y-34,5,0,TAU); ctx.fill(); } }   // smoke puff at night
  else if(kind!=='shop'){ ctx.fillStyle='#8a5a4a'; ctx.strokeStyle=INK; ctx.lineWidth=2; roundRect(x+w*0.72,y-26,12,14,2); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
// 2-story stone watchtower (Horde): a tall front wall rising to a walkable rooftop with battlements,
// a south-facing ladder to climb, and a highlighted climb prompt when the player is near.
function drawTower(d){
  const x=d.x, y=d.y, w=d.w, h=d.h, E=TOWER_ELEV, cx=x+w/2;
  const rx=x+11, rw=w-22, rTop=y+11-E, rBot=y+h-11-E;        // rooftop floor (footprint lifted by E)
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.fillStyle='rgba(0,0,0,.24)'; roundRect(x+5,y+9,w,h,7); ctx.fill();          // ground shadow
  // Searchlight upgrade: a soft forward cone telegraphs the tower's active scan without
  // obscuring fighters or changing the existing elevated collision model.
  if(d.scanT>0){ const a=clamp(d.scanT/4,0,1); ctx.save(); ctx.globalAlpha=.13*a; ctx.fillStyle='#9fe9ff';
    ctx.beginPath(); ctx.moveTo(cx,rTop-15); ctx.lineTo(cx-112,y-250); ctx.lineTo(cx+112,y-250); ctx.closePath(); ctx.fill(); ctx.restore(); }
  // --- tall front wall (from just under the roof slab down to the base) ---
  const wallTop=rBot-4, wallH=(y+h)-wallTop;
  ctx.fillStyle='#7c848e'; ctx.strokeStyle=INK; ctx.lineWidth=2.6; roundRect(x,wallTop,w,wallH,6); ctx.fill(); ctx.stroke();
  ctx.save(); roundRect(x,wallTop,w,wallH,6); ctx.clip();
  ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(x,wallTop,w*0.5,wallH);      // left light
  ctx.fillStyle='rgba(0,0,0,.16)'; ctx.fillRect(x+w*0.66,wallTop,w*0.34,wallH);    // right shade
  ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=1.3;                            // stone courses
  for(let cyk=wallTop+9; cyk<y+h; cyk+=11){ ctx.beginPath(); ctx.moveTo(x,cyk); ctx.lineTo(x+w,cyk); ctx.stroke();
    const off=((cyk-wallTop)/11|0)%2?w*0.5:w*0.25; ctx.beginPath(); ctx.moveTo(x+off,cyk); ctx.lineTo(x+off,cyk+11); ctx.stroke(); }
  ctx.fillStyle='rgba(90,64,34,.55)'; ctx.fillRect(x,wallTop+wallH*0.5,w,3);       // 2nd-story band
  // arrow-slit windows on each story
  ctx.fillStyle=timeOfDay!=='day'?'#ffcf6a':'#26303a';
  for(const sy of [wallTop+wallH*0.24, wallTop+wallH*0.66]) for(const sx of [cx-w*0.22, cx+w*0.22]){
    if(timeOfDay!=='day'){ ctx.shadowColor='#ffcf6a'; ctx.shadowBlur=7; } roundRect(sx-2.5,sy,5,10,2); ctx.fill(); ctx.shadowBlur=0; }
  ctx.restore();
  // --- rooftop: slab overhang, flagstone floor, battlement merlons around the back/sides ---
  ctx.fillStyle='#9aa1aa'; ctx.strokeStyle=INK; ctx.lineWidth=2.4; roundRect(x-5,rTop-6,w+10,rBot-rTop+12,6); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#6d747d'; roundRect(rx-2,rTop-2,rw+4,rBot-rTop+4,4); ctx.fill();  // recessed floor (player stands here)
  ctx.strokeStyle='rgba(0,0,0,.22)'; ctx.lineWidth=1; for(let fx=rx+7; fx<rx+rw; fx+=9){ ctx.beginPath(); ctx.moveTo(fx,rTop); ctx.lineTo(fx,rBot); ctx.stroke(); }
  ctx.fillStyle='#9aa1aa'; ctx.strokeStyle=INK; ctx.lineWidth=1.8;                 // merlons (crenellations) along the top edge
  for(let mx=x-5; mx<x+w+2; mx+=15){ roundRect(mx,rTop-12,9,10,2); ctx.fill(); ctx.stroke(); }
  // Survivor banner and searchlight housing.
  ctx.strokeStyle='#4a372a'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(cx+24,rTop-10); ctx.lineTo(cx+24,rTop-52); ctx.stroke();
  ctx.fillStyle='#c8444b'; ctx.strokeStyle=INK; ctx.lineWidth=1.5; ctx.beginPath();
  ctx.moveTo(cx+25,rTop-50); ctx.lineTo(cx+45,rTop-44); ctx.lineTo(cx+25,rTop-36); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle=d.scanT>0?'#bfffff':'#6d8090'; ctx.strokeStyle=INK; ctx.lineWidth=1.8; roundRect(cx-9,rTop-24,18,9,3); ctx.fill(); ctx.stroke();
  // Sandbag nests make the upgraded roof read as a defended position at phone scale.
  for(const side of [-1,1]) for(let k=0;k<3;k++){
    const bx=cx+side*(rw*.28+k*11), by=rTop+5+(k%2)*5;
    ctx.fillStyle='#b39a72'; ctx.strokeStyle=INK; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.ellipse(bx,by,8,4.2,0,0,TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(70,48,30,.38)'; ctx.beginPath(); ctx.moveTo(bx-3,by); ctx.lineTo(bx+3,by); ctx.stroke();
  }
  // --- ladder on the south face (climb point) ---
  ctx.strokeStyle='#5a4632'; ctx.lineWidth=3; ctx.beginPath();
  ctx.moveTo(cx-8,y+h); ctx.lineTo(cx-8,rBot); ctx.moveTo(cx+8,y+h); ctx.lineTo(cx+8,rBot); ctx.stroke();
  ctx.strokeStyle='#7a5c38'; ctx.lineWidth=2.4; for(let ry=rBot+4; ry<y+h; ry+=8){ ctx.beginPath(); ctx.moveTo(cx-8,ry); ctx.lineTo(cx+8,ry); ctx.stroke(); }
  // climb prompt: pulse an up-chevron at the base when the player is nearby & on the ground
  const p=player;
  if(p && p.alive && !p.onTower && Math.abs(p.x-cx)<70 && p.y>y+h-30 && p.y<y+h+90){
    const a=0.5+0.5*Math.sin(gtime*6);
    ctx.strokeStyle='rgba(190,255,90,'+(0.55+0.45*a)+')'; ctx.lineWidth=3;
    const by=y+h+16; ctx.beginPath(); ctx.moveTo(cx-9,by+6); ctx.lineTo(cx,by-4); ctx.lineTo(cx+9,by+6); ctx.stroke();
  }
}
function drawDecor(d){
  if(d.type==='door'){ const x=d.x,y=d.y,w=d.w||42,h=d.h||13,hp=clamp((d.hp||0)/(d.maxhp||70),0,1);
    ctx.save(); ctx.fillStyle='#5a4632'; ctx.strokeStyle=INK; ctx.lineWidth=2.5; roundRect(x,y,w,h,2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(240,220,170,.55)'; ctx.lineWidth=1.5; for(let px=x+8;px<x+w;px+=10){ ctx.beginPath();ctx.moveTo(px,y+2);ctx.lineTo(px,y+h-2);ctx.stroke(); }
    ctx.fillStyle='rgba(0,0,0,.42)'; roundRect(x,y-6,w,3,1); ctx.fill(); ctx.fillStyle=hp>.45?'#ffd35a':'#ff5a4a'; roundRect(x,y-6,w*hp,3,1); ctx.fill(); ctx.restore(); return; }
  if(d.type==='barricade'){ const x=d.x,y=d.y,w=d.w||68,h=d.h||22,hp=clamp((d.hp||0)/(d.maxhp||80),0,1);
    ctx.save(); ctx.lineJoin='round'; ctx.fillStyle='rgba(0,0,0,.24)'; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+4,Math.max(w*.48,14),5,0,0,TAU); ctx.fill();
    ctx.fillStyle='#715035'; ctx.strokeStyle=INK; ctx.lineWidth=3; roundRect(x,y,w,h,4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#a97848'; ctx.lineWidth=4; ctx.beginPath();
    if(w>h){ ctx.moveTo(x+8,y+h-4); ctx.lineTo(x+w-8,y+4); ctx.moveTo(x+8,y+4); ctx.lineTo(x+w-8,y+h-4); }
    else { ctx.moveTo(x+4,y+8); ctx.lineTo(x+w-4,y+h-8); ctx.moveTo(x+w-4,y+8); ctx.lineTo(x+4,y+h-8); }
    ctx.stroke(); ctx.fillStyle='rgba(0,0,0,.42)'; roundRect(x,y-8,w,4,2); ctx.fill();
    ctx.fillStyle=hp>.45?'#7bff4a':'#ff5a4a'; roundRect(x,y-8,w*hp,4,2); ctx.fill(); ctx.restore(); return; }
  if(d.type==='cache'){ const x=d.x, y=d.y, s=d.s||1, open=!!d.open;
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(2,10,27,8,0,0,TAU); ctx.fill();
    ctx.fillStyle='#8b522c'; ctx.strokeStyle=INK; ctx.lineWidth=3.4; roundRect(-23,-17,46,25,5); ctx.fill(); ctx.stroke();
    ctx.save(); roundRect(-21,-16,42,24,5); ctx.clip();
    ctx.fillStyle='rgba(255,220,140,.18)'; ctx.fillRect(-21,-16,42,8);
    ctx.fillStyle='rgba(0,0,0,.16)'; ctx.fillRect(8,-16,14,24);
    ctx.strokeStyle='rgba(55,28,12,.45)'; ctx.lineWidth=1.6;
    for(let px=-14; px<=14; px+=14){ ctx.beginPath(); ctx.moveTo(px,-15); ctx.lineTo(px,7); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle='#ffd35a'; ctx.strokeStyle=INK; ctx.lineWidth=2.5; roundRect(-25,-7,50,10,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#2b1b10'; ctx.font='900 7px system-ui,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('LOOT',0,-2);
    for(const bx of [-17,17]){ ctx.fillStyle='#f3d276'; ctx.strokeStyle=INK; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(bx,-2,2.7,0,TAU); ctx.fill(); ctx.stroke(); }
    if(open){ ctx.fillStyle='#5d351f'; ctx.strokeStyle=INK; ctx.lineWidth=3; roundRect(-20,-28,40,12,4); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ffd35a'; ctx.beginPath(); ctx.ellipse(0,-12,15,4,0,0,TAU); ctx.fill(); ctx.stroke(); }
    if(!open){ const pulse=.45+.35*Math.sin(gtime*4+d.x*.01); ctx.strokeStyle='rgba(214,255,110,'+pulse+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,-31,8+4*pulse,0,TAU); ctx.stroke();
      ctx.fillStyle='#d6ff6e'; ctx.font='900 7px system-ui,sans-serif'; ctx.fillText('OPEN',0,19); }
    ctx.restore(); return; }
  if(d.type==='barrel'){ const x=d.x, y=d.y, s=d.s||1, hot=d.hot;
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(2,8,15,5,0,0,TAU); ctx.fill();
    ctx.fillStyle=hot?'#b84431':'#7c5b36'; ctx.strokeStyle=INK; ctx.lineWidth=3.2; roundRect(-12,-23,24,31,5); ctx.fill(); ctx.stroke();
    ctx.fillStyle=hot?'#e95b45':'#a8753f'; ctx.fillRect(-8,-19,5,23);
    ctx.fillStyle='#d8c7a4'; ctx.strokeStyle=INK; ctx.lineWidth=2.2; ctx.beginPath(); ctx.ellipse(0,-23,12,4,0,0,TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#5d351f'; ctx.strokeStyle=INK; ctx.lineWidth=2.3; roundRect(-13,-14,26,5,1.5); ctx.fill(); ctx.stroke(); roundRect(-13,-2,26,5,1.5); ctx.fill(); ctx.stroke();
    if(hot){ ctx.fillStyle='#ffd35a'; ctx.strokeStyle=INK; ctx.lineWidth=1.8; ctx.beginPath(); ctx.moveTo(-5,-11); ctx.lineTo(2,-8); ctx.lineTo(-2,-4); ctx.lineTo(6,2); ctx.stroke(); }
    else { ctx.fillStyle='#ffd35a'; ctx.strokeStyle=INK; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(4,-8,3,0,TAU); ctx.fill(); ctx.stroke(); }
    if(d.fuel){
      // A compact pump beside the barrel turns the reused prop into a readable fuel station.
      ctx.fillStyle='#3d5964'; ctx.strokeStyle=INK; ctx.lineWidth=2; roundRect(18,-19,13,25,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ffcf5b'; roundRect(20,-15,9,6,1); ctx.fill();
      ctx.strokeStyle='#222b31'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(30,-10); ctx.quadraticCurveTo(39,-7,35,3); ctx.stroke();
      ctx.fillStyle='#ff6b4a'; ctx.font='900 6px system-ui,sans-serif'; ctx.textAlign='center'; ctx.fillText('FUEL',24.5,2);
    }
    ctx.restore(); return; }
  if(d.type==='antenna'){ const x=d.x, y=d.y, s=d.s||1, pulse=0.5+0.5*Math.sin(gtime*4+d.blink);
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(2,7,23,7,0,0,TAU); ctx.fill();
    ctx.fillStyle='#9a8a68'; ctx.strokeStyle=INK; ctx.lineWidth=3.2; roundRect(-17,0,34,10,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#5d351f'; ctx.strokeStyle=INK; ctx.lineWidth=2.2; roundRect(-11,2,22,5,2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=INK; ctx.lineWidth=5.8; ctx.beginPath(); ctx.moveTo(0,1); ctx.lineTo(0,-43); ctx.stroke();
    ctx.strokeStyle='#8b522c'; ctx.lineWidth=3.1; ctx.beginPath(); ctx.moveTo(0,1); ctx.lineTo(0,-43); ctx.stroke();
    ctx.strokeStyle=INK; ctx.lineWidth=3.2; ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(-17,1); ctx.moveTo(0,-18); ctx.lineTo(17,1); ctx.stroke();
    ctx.fillStyle='#c84431'; ctx.strokeStyle=INK; ctx.lineWidth=1.8; ctx.beginPath(); ctx.moveTo(1,-39); ctx.lineTo(18,-34); ctx.lineTo(1,-29); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#ffd35a'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(-15,-30); ctx.lineTo(14,-34); ctx.stroke();
    ctx.fillStyle='rgba(255,211,90,'+(0.65+0.35*pulse)+')'; ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,-45,4.8,0,TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(255,211,90,'+(0.25+0.22*pulse)+')'; ctx.lineWidth=1.8;
    for(let r=11;r<=25;r+=7){ ctx.beginPath(); ctx.arc(0,-45,r,-0.85,-0.18); ctx.stroke(); ctx.beginPath(); ctx.arc(0,-45,r,Math.PI+0.18,Math.PI+0.85); ctx.stroke(); }
    ctx.fillStyle='rgba(100,225,255,'+(0.35+0.3*pulse)+')'; ctx.shadowColor='#64e1ff'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(0,-8,5+2*pulse,0,TAU); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#bff7ff'; ctx.font='900 6px system-ui,sans-serif'; ctx.textAlign='center'; ctx.fillText('RELAY',0,16);
    ctx.restore(); return; }
  if(d.type==='medtent'){ const x=d.x, y=d.y, s=d.s||1, flip=d.flip?-1:1;
    ctx.save(); ctx.translate(x,y); ctx.scale(s*flip,s); ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.27)'; ctx.beginPath(); ctx.ellipse(2,9,35,10,0,0,TAU); ctx.fill();
    ctx.fillStyle='#e6d5ad'; ctx.strokeStyle=INK; ctx.lineWidth=3.4;
    ctx.beginPath(); ctx.moveTo(-31,3); ctx.lineTo(-18,-20); ctx.lineTo(0,-30); ctx.lineTo(18,-20); ctx.lineTo(31,3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.moveTo(-31,3); ctx.lineTo(-18,-20); ctx.lineTo(0,-30); ctx.lineTo(18,-20); ctx.lineTo(31,3); ctx.closePath(); ctx.clip();
    ctx.fillStyle='#c84431'; ctx.fillRect(0,-27,31,31);
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(-29,-27,29,31);
    ctx.strokeStyle='rgba(28,33,21,.32)'; ctx.lineWidth=1.8; for(let px=-22; px<28; px+=12){ ctx.beginPath(); ctx.moveTo(px,2); ctx.lineTo(px+13,-22); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle='#ffd35a'; ctx.strokeStyle=INK; ctx.lineWidth=2.1; roundRect(-5,-24,10,18,1.5); ctx.fill(); ctx.stroke(); roundRect(-10,-19,20,9,1.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#5d351f'; ctx.strokeStyle=INK; ctx.lineWidth=2.4; roundRect(-10,-7,20,10,2); ctx.fill(); ctx.stroke();
    const pulse=.5+.5*Math.sin(gtime*3+d.x*.01); ctx.strokeStyle='rgba(123,255,74,'+(.24+.22*pulse)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,4,35+5*pulse,0,TAU); ctx.stroke();
    ctx.fillStyle='#ffcf5b'; ctx.font='900 7px system-ui,sans-serif'; ctx.textAlign='center'; ctx.fillText('CLINIC',0,14);
    ctx.fillStyle='#d8c7a4'; ctx.strokeStyle=INK; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(-23,1,3,0,TAU); ctx.arc(23,1,3,0,TAU); ctx.fill(); ctx.stroke();
    ctx.restore(); return; }
  if(d.type==='campfire'){ const x=d.x, y=d.y, ni=timeOfDay!=='day';
    ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(x,y+3,16,6,0,0,TAU); ctx.fill();
    if(ni){ const gp=0.75+Math.sin(gtime*7+x)*0.25;   // warm glow at night
      ctx.fillStyle='rgba(255,160,60,'+(0.16*gp)+')'; ctx.beginPath(); ctx.arc(x,y-4,34*gp,0,TAU); ctx.fill(); }
    ctx.strokeStyle='#4a3018'; ctx.lineWidth=4; ctx.lineCap='round';   // crossed logs
    ctx.beginPath(); ctx.moveTo(x-8,y+3); ctx.lineTo(x+8,y-3); ctx.moveTo(x-8,y-3); ctx.lineTo(x+8,y+3); ctx.stroke();
    ctx.fillStyle='#8f8a80'; ctx.strokeStyle=INK; ctx.lineWidth=1.4;   // stone ring
    for(let k=0;k<7;k++){ const a=k/7*TAU; ctx.beginPath(); ctx.ellipse(x+Math.cos(a)*13,y+Math.sin(a)*6.6,3.2,2.4,a,0,TAU); ctx.fill(); ctx.stroke(); }
    const f=0.75+Math.sin(gtime*9+x)*0.25;                             // flickering flame
    ctx.fillStyle='#ff8a2a'; ctx.beginPath(); ctx.moveTo(x-5,y-1);
    ctx.quadraticCurveTo(x-4,y-9*f,x,y-13*f); ctx.quadraticCurveTo(x+4,y-9*f,x+5,y-1); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#ffd24a'; ctx.beginPath(); ctx.moveTo(x-2.5,y-1);
    ctx.quadraticCurveTo(x-2,y-5*f,x,y-8*f); ctx.quadraticCurveTo(x+2,y-5*f,x+2.5,y-1); ctx.closePath(); ctx.fill();
    return; }
  if(d.type==='fence'){ const n=d.n||4, sp=20, hz=d.horiz;
    const ex = hz? d.x+(n-1)*sp : d.x, ey = hz? d.y : d.y+(n-1)*sp;
    ctx.lineCap='round';
    ctx.strokeStyle=INK; ctx.lineWidth=4.6; ctx.beginPath(); ctx.moveTo(d.x,d.y-8); ctx.lineTo(ex,ey-8); ctx.moveTo(d.x,d.y-3); ctx.lineTo(ex,ey-3); ctx.stroke();
    ctx.strokeStyle='#75552f'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(d.x,d.y-8); ctx.lineTo(ex,ey-8); ctx.moveTo(d.x,d.y-3); ctx.lineTo(ex,ey-3); ctx.stroke();
    for(let k=0;k<n;k++){ const px=hz?d.x+k*sp:d.x, py=hz?d.y:d.y+k*sp;
      ctx.fillStyle='rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(px,py+2,4.5,2,0,0,TAU); ctx.fill();
      ctx.fillStyle='#8a6a42'; ctx.strokeStyle=INK; ctx.lineWidth=1.6;
      roundRect(px-2.6,py-13,5.2,15,1.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(px-1.8,py-12,1.4,13); }
    return; }
  if(d.type==='well'){ const x=d.x, y=d.y;
    ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(x,y+4,17,6.5,0,0,TAU); ctx.fill();
    ctx.fillStyle='#7a4a3a'; ctx.strokeStyle=INK; ctx.lineWidth=2;      // little gable roof
    ctx.beginPath(); ctx.moveTo(x-16,y-26); ctx.lineTo(x,y-36); ctx.lineTo(x+16,y-26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=INK; ctx.lineWidth=4.4; ctx.beginPath(); ctx.moveTo(x-11,y-1); ctx.lineTo(x-11,y-26); ctx.moveTo(x+11,y-1); ctx.lineTo(x+11,y-26); ctx.stroke();
    ctx.strokeStyle='#6a4a2a'; ctx.lineWidth=2.8; ctx.beginPath(); ctx.moveTo(x-11,y-1); ctx.lineTo(x-11,y-26); ctx.moveTo(x+11,y-1); ctx.lineTo(x+11,y-26); ctx.stroke();
    ctx.strokeStyle='#caa15a'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(x,y-30); ctx.lineTo(x,y-12); ctx.stroke();  // rope
    ctx.fillStyle='#8a6a3a'; ctx.strokeStyle=INK; ctx.lineWidth=1.4; roundRect(x-3,y-12,6,5,1); ctx.fill(); ctx.stroke(); // bucket
    ctx.fillStyle='#8f8a80'; ctx.strokeStyle=INK; ctx.lineWidth=2;      // stone rim
    ctx.beginPath(); ctx.ellipse(x,y,15,8,0,0,TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#20303a'; ctx.beginPath(); ctx.ellipse(x,y,9.5,4.6,0,0,TAU); ctx.fill();     // dark water hole
    ctx.fillStyle='rgba(140,200,230,.35)'; ctx.beginPath(); ctx.ellipse(x-2,y-0.8,4,1.6,0,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1.2;               // rim stones
    for(let k=0;k<6;k++){ const a=k/6*TAU+0.3; ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*15,y+Math.sin(a)*8); ctx.lineTo(x+Math.cos(a)*10,y+Math.sin(a)*5); ctx.stroke(); }
    return; }
  if(d.type==='statue'){ const x=d.x, y=d.y;
    ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(x,y+4,18,6.5,0,0,TAU); ctx.fill();
    ctx.fillStyle='#9a958b'; ctx.strokeStyle=INK; ctx.lineWidth=2;      // pedestal
    roundRect(x-14,y-7,28,11,2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#aaa49a'; ctx.beginPath(); ctx.ellipse(x,y-7,14,4,0,0,TAU); ctx.fill(); ctx.stroke();
    // weathered stone hero, arms raised — a monument to fallen survivors
    ctx.strokeStyle=INK; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(x-3,y-16); ctx.lineTo(x-9,y-26); ctx.moveTo(x+3,y-16); ctx.lineTo(x+9,y-26); ctx.stroke();
    ctx.strokeStyle='#b3aea3'; ctx.lineWidth=3.2; ctx.beginPath(); ctx.moveTo(x-3,y-16); ctx.lineTo(x-9,y-26); ctx.moveTo(x+3,y-16); ctx.lineTo(x+9,y-26); ctx.stroke();
    ctx.fillStyle='#b3aea3'; ctx.strokeStyle=INK; ctx.lineWidth=2;
    roundRect(x-6,y-19,12,13,3.5); ctx.fill(); ctx.stroke();            // torso
    ctx.beginPath(); ctx.arc(x,y-24,6.4,0,TAU); ctx.fill(); ctx.stroke();  // head
    ctx.fillStyle='rgba(0,0,0,.14)'; ctx.beginPath(); ctx.arc(x+2.2,y-23,3.4,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=1.1;               // cracks + moss
    ctx.beginPath(); ctx.moveTo(x-4,y-14); ctx.lineTo(x-1,y-10); ctx.lineTo(x-3,y-8); ctx.stroke();
    ctx.fillStyle='rgba(90,140,70,.5)'; ctx.beginPath(); ctx.arc(x-9,y-5,2.6,0,TAU); ctx.arc(x+11,y-3,2,0,TAU); ctx.fill();
    return; }
  if(d.type==='graveyard'){ const x=d.x, y=d.y, sd=d.seed||0;
    ctx.lineJoin='round'; ctx.lineCap='round';
    ctx.fillStyle='rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(x,y+6,34,11,0,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(70,90,50,.35)'; ctx.beginPath(); ctx.ellipse(x,y+2,32,12,0,0,TAU); ctx.fill();   // patchy dead grass
    // low iron fence border (2 corner posts each side + a sagging chain rail)
    ctx.strokeStyle='#3a4038'; ctx.lineWidth=2.2;
    for(const px of [x-30,x-10,x+12,x+30]){ ctx.beginPath(); ctx.moveTo(px,y+9); ctx.lineTo(px,y-2); ctx.stroke();
      ctx.fillStyle='#4a5148'; ctx.beginPath(); ctx.arc(px,y-2,1.6,0,TAU); ctx.fill(); }
    ctx.strokeStyle='#4a5148'; ctx.lineWidth=1.4; ctx.beginPath();
    ctx.moveTo(x-30,y-1); ctx.quadraticCurveTo(x-20,y+3,x-10,y-1);
    ctx.moveTo(x-10,y-1); ctx.quadraticCurveTo(x+1,y+3,x+12,y-1);
    ctx.moveTo(x+12,y-1); ctx.quadraticCurveTo(x+21,y+3,x+30,y-1); ctx.stroke();
    // 3 weathered tombstones, staggered heights/lean via the seed
    const stones=[{ox:-16,h:16,lean:-0.06},{ox:0,h:21,lean:0.03+sd*0.05},{ox:16,h:14,lean:0.07}];
    for(const s of stones){ const sx=x+s.ox, sy=y-2;
      ctx.save(); ctx.translate(sx,sy); ctx.rotate(s.lean);
      ctx.fillStyle='rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(0,1.5,7,2.4,0,0,TAU); ctx.fill();
      ctx.fillStyle='#8f8d86'; ctx.strokeStyle=INK; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(-5,-s.h*0.62); ctx.arc(0,-s.h*0.62,5,Math.PI,0);
      ctx.lineTo(5,0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1;                        // engraved cross + moss
      ctx.beginPath(); ctx.moveTo(0,-s.h*0.5); ctx.lineTo(0,-s.h*0.18);
      ctx.moveTo(-2.6,-s.h*0.38); ctx.lineTo(2.6,-s.h*0.38); ctx.stroke();
      ctx.fillStyle='rgba(90,130,70,.45)'; ctx.beginPath(); ctx.arc(-3,-1,1.8,0,TAU); ctx.fill();
      ctx.restore(); }
    return; }
  if(d.type==='dirt'){ ctx.fillStyle = timeOfDay==='night'?'rgba(80,64,40,.45)':'rgba(150,120,72,.4)';
    ctx.beginPath(); ctx.ellipse(d.x,d.y,d.s,d.s*0.62,0,0,TAU); ctx.fill();
    ctx.fillStyle='rgba(110,86,50,.3)'; ctx.beginPath(); ctx.ellipse(d.x+d.s*0.2,d.y+d.s*0.12,d.s*0.5,d.s*0.3,0,0,TAU); ctx.fill(); return; }
  if(d.type==='water'){
    // sandy shore ring
    ctx.fillStyle = timeOfDay==='night'?'rgba(150,130,90,.5)':'rgba(214,190,130,.7)';
    ctx.beginPath(); ctx.ellipse(d.x,d.y,d.s+9,d.s*0.64+8,0,0,TAU); ctx.fill();
    // deep + shallow water
    ctx.fillStyle = timeOfDay==='night'?'#2f5a80':'#3f86b8';
    ctx.beginPath(); ctx.ellipse(d.x,d.y,d.s,d.s*0.64,0,0,TAU); ctx.fill();
    ctx.fillStyle = timeOfDay==='night'?'rgba(80,140,190,.35)':'rgba(120,190,230,.45)';
    ctx.beginPath(); ctx.ellipse(d.x,d.y,d.s*0.72,d.s*0.45,0,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(20,50,80,.45)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(d.x,d.y,d.s,d.s*0.64,0,0,TAU); ctx.stroke();
    // animated ripples (two phases per pond)
    ctx.strokeStyle='rgba(255,255,255,.30)'; ctx.lineWidth=1.6;
    for(let k=0;k<2;k++){ const ph=((gtime*0.35 + k*0.5 + (d.x%97)/97)%1);
      ctx.globalAlpha = 0.32*(1-ph);
      ctx.beginPath(); ctx.ellipse(d.x,d.y,d.s*(0.2+0.74*ph),d.s*0.64*(0.2+0.74*ph),0,0,TAU); ctx.stroke(); }
    ctx.globalAlpha=1;
    // sun / moon glint
    ctx.fillStyle= timeOfDay==='night'?'rgba(210,225,255,.16)':'rgba(255,255,255,.14)'; ctx.beginPath();
    ctx.ellipse(d.x-d.s*0.28,d.y-d.s*0.18,d.s*0.4,d.s*0.18,-0.4,0,TAU); ctx.fill();
    // tiny reeds and bright edge flecks make ponds read as hand-painted instead of flat ellipses
    ctx.strokeStyle=timeOfDay==='night'?'rgba(100,145,92,.55)':'rgba(74,132,57,.65)'; ctx.lineCap='round';
    for(let k=0;k<7;k++){ const a=(d.y*0.011+k*1.73), bx=d.x+Math.cos(a)*d.s*0.86, by=d.y+Math.sin(a)*d.s*0.53;
      ctx.lineWidth=1.1+(k%3)*0.35; ctx.beginPath(); ctx.moveTo(bx,by+2); ctx.quadraticCurveTo(bx+Math.cos(a+1.1)*4,by-7,bx+Math.cos(a+0.7)*7,by-13); ctx.stroke(); }
    ctx.fillStyle='rgba(255,255,255,.18)';
    for(let k=0;k<5;k++){ const a=(d.x*0.017+k*2.1), fx=d.x+Math.cos(a)*d.s*0.72, fy=d.y+Math.sin(a)*d.s*0.42;
      ctx.beginPath(); ctx.ellipse(fx,fy,3.5,1.1,a,0,TAU); ctx.fill(); }
    // lily pads (seeded per-pond so they don't jitter)
    for(let k=0;k<3;k++){ const a=(d.x*7+k*2.399), lx=d.x+Math.cos(a)*d.s*0.55, ly=d.y+Math.sin(a)*d.s*0.4*0.9, ps=d.s*0.16;
      ctx.fillStyle= timeOfDay==='night'?'#2e6a34':'#3f8a3f'; ctx.beginPath(); ctx.ellipse(lx,ly,ps,ps*0.7,a,0,TAU); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(lx,ly); ctx.arc(lx,ly,ps,a+0.3,a+0.9); ctx.closePath(); ctx.fill();
      if(k===0){ ctx.fillStyle='#ff8ab0'; ctx.beginPath(); ctx.arc(lx,ly-ps*0.3,ps*0.3,0,TAU); ctx.fill(); } }  // one flower
    return; }
  if(d.type==='building'){ drawBuilding(d); return; }
  if(d.type==='rock'){ const s=d.s; ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(d.x,d.y+4*s,11*s,4*s,0,0,TAU); ctx.fill();
    ctx.fillStyle='#8f9aa0'; ctx.strokeStyle=INK; ctx.lineWidth=1.6*s;
    ctx.beginPath(); ctx.moveTo(d.x-9*s,d.y+2*s); ctx.lineTo(d.x-5*s,d.y-7*s); ctx.lineTo(d.x+3*s,d.y-8*s); ctx.lineTo(d.x+9*s,d.y); ctx.lineTo(d.x+6*s,d.y+3*s); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.17)'; ctx.beginPath(); ctx.moveTo(d.x+3*s,d.y-8*s); ctx.lineTo(d.x+9*s,d.y); ctx.lineTo(d.x+6*s,d.y+3*s); ctx.lineTo(d.x+1*s,d.y-2*s); ctx.closePath(); ctx.fill();  // dark facet
    ctx.fillStyle='rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(d.x-5*s,d.y-7*s); ctx.lineTo(d.x+3*s,d.y-8*s); ctx.lineTo(d.x-1*s,d.y-3*s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(55,85,65,.42)'; ctx.lineWidth=1.1*s; ctx.beginPath(); ctx.moveTo(d.x-7*s,d.y+1*s); ctx.lineTo(d.x-2*s,d.y-1*s); ctx.moveTo(d.x+2*s,d.y+2*s); ctx.lineTo(d.x+6*s,d.y-1*s); ctx.stroke();
    ctx.fillStyle='rgba(95,150,72,.55)'; ctx.beginPath(); ctx.arc(d.x-7*s,d.y+3*s,1.8*s,0,TAU); ctx.arc(d.x+7*s,d.y+2*s,1.4*s,0,TAU); ctx.fill(); return; }
  if(d.type==='flower'){ ctx.fillStyle='#3f7d33'; ctx.lineWidth=1; ctx.fillRect(d.x-0.6,d.y-5,1.2,5);
    ctx.fillStyle=d.c; ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=0.8;
    for(let k=0;k<5;k++){ const a=k/5*TAU; ctx.beginPath(); ctx.arc(d.x+Math.cos(a)*2.4,d.y-6+Math.sin(a)*2.4,1.9,0,TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle='#ffd24a'; ctx.beginPath(); ctx.arc(d.x,d.y-6,1.5,0,TAU); ctx.fill(); return; }
  if(d.type==='tree'){ const s=d.s, sw=Math.sin(gtime*0.9+d.x*0.013)*2.2*s;  // canopy sway
    const ti=imgOk('tree');
    if(ti){ const DH=100*s, DW=DH*(ti.naturalWidth/ti.naturalHeight);
      ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(d.x+sw*0.4,d.y+5,27*s,10*s,0,0,TAU); ctx.fill();
      ctx.drawImage(ti, d.x-DW/2+sw*0.35, d.y+9-DH, DW, DH); return; }
    ctx.lineJoin='round';
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(d.x+sw*0.4,d.y+5,27*s,10*s,0,0,TAU); ctx.fill();
    // outlined, shaded trunk
    ctx.fillStyle='#5a3d20'; ctx.strokeStyle=INK; ctx.lineWidth=2*s;
    roundRect(d.x-4.5*s,d.y-15*s,9*s,20*s,2.5*s); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,.20)'; ctx.fillRect(d.x+0.6*s,d.y-14*s,3.2*s,18*s);
    if(d.round){ const blobs=[[-9,-30,15],[9,-30,15],[0,-42,17],[0,-26,18]];
      const bx=o=>d.x+o[0]*s+sw*(0.4-o[1]/100), by=o=>d.y+o[1]*s;
      ctx.fillStyle=INK; for(const o of blobs){ ctx.beginPath(); ctx.arc(bx(o),by(o),o[2]*s+2.2*s,0,TAU); ctx.fill(); }       // unified outline
      ctx.fillStyle='#3f7d33'; for(const o of blobs){ ctx.beginPath(); ctx.arc(bx(o),by(o),o[2]*s,0,TAU); ctx.fill(); }
      ctx.fillStyle='#519c41'; for(const o of blobs){ ctx.beginPath(); ctx.arc(bx(o),by(o)-2*s,o[2]*0.82*s,0,TAU); ctx.fill(); }
      ctx.fillStyle='#67ba55'; for(const o of blobs){ ctx.beginPath(); ctx.arc(bx(o)-2*s,by(o)-3.5*s,o[2]*0.48*s,0,TAU); ctx.fill(); }
      ctx.fillStyle='rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(d.x-7*s+sw,d.y-45*s,6*s,0,TAU); ctx.fill(); }
    else { for(let i=0;i<3;i++){ const tx=d.x+sw*(1-i*0.3), topY=d.y-58*s+i*16*s, baseY=d.y-18*s+i*14*s, hw=26*s-i*5*s;
        ctx.fillStyle=INK; ctx.beginPath(); ctx.moveTo(tx,topY-2.4*s); ctx.lineTo(tx-hw-2.4*s,baseY+1.4*s); ctx.lineTo(tx+hw+2.4*s,baseY+1.4*s); ctx.closePath(); ctx.fill();
        ctx.fillStyle=i===0?'#519c41':i===1?'#478f3a':'#3f7d33'; ctx.beginPath(); ctx.moveTo(tx,topY); ctx.lineTo(tx-hw,baseY); ctx.lineTo(tx+hw,baseY); ctx.closePath(); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.13)'; ctx.beginPath(); ctx.moveTo(tx,topY); ctx.lineTo(tx-hw*0.42,baseY-(baseY-topY)*0.42); ctx.lineTo(tx+hw*0.12,topY+3*s); ctx.closePath(); ctx.fill(); } } }
  else if(d.type==='bush'){ const s=d.s; ctx.lineJoin='round';
    const bi=imgOk('bush');
    if(bi){ const DW=52*s, DH=DW*(bi.naturalHeight/bi.naturalWidth);
      ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(d.x,d.y+4,20*s,7*s,0,0,TAU); ctx.fill();
      ctx.drawImage(bi, d.x-DW/2, d.y+6-DH, DW, DH); return; }
    ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(d.x,d.y+4,20*s,7*s,0,0,TAU); ctx.fill();
    const blobs=[[-10,-2,12],[10,-2,12],[0,-8,12],[0,-3,11]];
    ctx.fillStyle=INK; for(const o of blobs){ ctx.beginPath(); ctx.arc(d.x+o[0]*s,d.y+o[1]*s,o[2]*s+2*s,0,TAU); ctx.fill(); }
    ctx.fillStyle='#3f7d33'; for(const o of blobs){ ctx.beginPath(); ctx.arc(d.x+o[0]*s,d.y+o[1]*s,o[2]*s,0,TAU); ctx.fill(); }
    ctx.fillStyle='#519c41'; for(const o of blobs){ ctx.beginPath(); ctx.arc(d.x+o[0]*s,d.y+o[1]*s-2*s,o[2]*0.68*s,0,TAU); ctx.fill(); }
    ctx.fillStyle='#e0556a'; for(const b of [[-6,-6],[7,-4],[1,-9]]){ ctx.beginPath(); ctx.arc(d.x+b[0]*s,d.y+b[1]*s,1.7*s,0,TAU); ctx.fill(); } }  // berries
  else if(d.type==='grass'){ const s=d.s, sway=Math.sin(gtime*1.6+d.ph)*2.4; ctx.lineCap='round';
    ctx.strokeStyle='#3f7d33'; ctx.lineWidth=2.6*s;
    ctx.beginPath(); for(let i=-1;i<=1;i++){ ctx.moveTo(d.x+i*4*s,d.y); ctx.quadraticCurveTo(d.x+i*4*s+i*2,d.y-10*s,d.x+i*5*s+i*3+sway,d.y-16*s); } ctx.stroke();
    ctx.strokeStyle='rgba(150,220,120,.5)'; ctx.lineWidth=1*s;                                        // light tips
    ctx.beginPath(); for(let i=-1;i<=1;i++){ ctx.moveTo(d.x+i*4*s+i*1.5,d.y-11*s); ctx.lineTo(d.x+i*5*s+i*3+sway,d.y-16*s); } ctx.stroke(); }
}

function drawPickup(p){
  const bob=Math.sin(p.t*4)*2, c=PKCOL[p.kind], pulse=0.5+0.5*Math.sin(gtime*3+p.t);
  ctx.save(); ctx.translate(p.x,p.y+bob);
  // Vertical rarity beam makes ground loot readable through grass and during night runs.
  ctx.save(); ctx.globalAlpha=.10+.08*pulse; ctx.fillStyle=c.line; ctx.shadowColor=c.line; ctx.shadowBlur=9;
  ctx.fillRect(-3,-58,6,42); ctx.globalAlpha=.24+.16*pulse; ctx.beginPath(); ctx.arc(0,-58,5+3*pulse,0,TAU); ctx.fill(); ctx.restore();
  ctx.strokeStyle=c.line; ctx.globalAlpha=.34+.2*pulse; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,0,18+4*pulse,0,TAU); ctx.stroke(); ctx.globalAlpha=1;
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0,p.r-1-bob,p.r*0.9,4,0,0,TAU); ctx.fill();
  ctx.shadowColor=c.line; ctx.shadowBlur=6+5*pulse;   // pulsing glow (cheap)
  ctx.fillStyle=c.bg; ctx.strokeStyle=c.line; ctx.lineWidth=2; roundRect(-p.r,-p.r,p.r*2,p.r*2,4); ctx.fill(); ctx.stroke();
  ctx.shadowBlur=0;
  ctx.save(); roundRect(-p.r,-p.r,p.r*2,p.r*2,4); ctx.clip();                    // top gloss + bottom shade bevel
  ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(-p.r,-p.r,p.r*2,p.r*0.7);
  ctx.fillStyle='rgba(0,0,0,.16)'; ctx.fillRect(-p.r,p.r*0.5,p.r*2,p.r*0.5); ctx.restore();
  ctx.fillStyle=c.line; ctx.font='800 15px Trebuchet MS, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(PKGLYPH[p.kind], 0, 1); ctx.textBaseline='alphabetic';
  ctx.restore();
}
// ---- builder rendering: scrap bits, spike traps, walls/turrets, and the placement ghost ----
function buildHpBar(b){ if(b.hp>=b.maxhp) return; const f=clamp(b.hp/b.maxhp,0,1), y=b.y-7;
  ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(b.x,y,b.w,4);
  ctx.fillStyle= f>0.5?'#7bd24a':f>0.25?'#ffd24a':'#ff5a4a'; ctx.fillRect(b.x,y,b.w*f,4); }
function drawScrap(s){ const bob=Math.sin(s.t*4)*1.5;
  ctx.save(); ctx.translate(s.x,s.y+bob);
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0,7-bob,7,3,0,0,TAU); ctx.fill();
  ctx.fillStyle='#caa46a'; ctx.strokeStyle=INK; ctx.lineWidth=1.6;    // a little hex nut
  ctx.beginPath(); for(let i=0;i<6;i++){ const a=i/6*TAU+Math.PI/6, px=Math.cos(a)*7, py=Math.sin(a)*7; i?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#5a4a2e'; ctx.beginPath(); ctx.arc(0,0,2.8,0,TAU); ctx.fill();
  ctx.restore(); }
function drawSpikes(b){ ctx.save();
  ctx.fillStyle='#6a5638'; ctx.strokeStyle=INK; ctx.lineWidth=1.6; roundRect(b.x,b.y,b.w,b.h,4); ctx.fill(); ctx.stroke();  // wooden plate
  ctx.fillStyle='#cfd6dd'; ctx.strokeStyle='#7a828a'; ctx.lineWidth=1;    // metal spikes
  for(let r=0;r<2;r++) for(let c=0;c<3;c++){ const cx=b.x+11+c*15, cy=b.y+14+r*17;
    ctx.beginPath(); ctx.moveTo(cx-4,cy+5); ctx.lineTo(cx,cy-6); ctx.lineTo(cx+4,cy+5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.restore(); buildHpBar(b); }
function drawBuild(b){
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.cx,b.y+b.h,b.w*0.5,5,0,0,TAU); ctx.fill();
  ctx.lineJoin='round';
  if(b.key==='wall'){
    ctx.fillStyle='#8a6a3a'; ctx.strokeStyle=INK; ctx.lineWidth=2.4; roundRect(b.x,b.y,b.w,b.h,4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=1.4;              // horizontal planks
    for(let yy=b.y+b.h/3; yy<b.y+b.h-2; yy+=b.h/3){ ctx.beginPath(); ctx.moveTo(b.x+2,yy); ctx.lineTo(b.x+b.w-2,yy); ctx.stroke(); }
    ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(b.x+2,b.y+2,b.w-4,3);
  } else {                                                            // turret
    ctx.fillStyle='#3a4048'; ctx.strokeStyle=INK; ctx.lineWidth=2.2; roundRect(b.x,b.y,b.w,b.h,5); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(b.cx,b.cy); ctx.rotate(b.aim||0);
    ctx.fillStyle='#20242a'; roundRect(-4,-4,26,8,3); ctx.fill(); ctx.stroke(); ctx.restore();   // barrel
    ctx.fillStyle=b.muzzle>0?'#fff2a0':'#586068'; ctx.beginPath(); ctx.arc(b.cx,b.cy,7,0,TAU); ctx.fill(); ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.stroke();
    if(b.muzzle>0){ const a=b.aim||0; ctx.fillStyle='#ffdd66'; ctx.beginPath(); ctx.arc(b.cx+Math.cos(a)*22,b.cy+Math.sin(a)*22,4,0,TAU); ctx.fill(); }
  }
  ctx.restore(); buildHpBar(b);
}
function drawBuildGhost(h){
  const def=BUILDS[h.buildSel]; if(!def) return;
  const cx=h.ghostX, cy=h.ghostY, x=cx-def.w/2, y=cy-def.h/2, ok=h.ghostOk;
  ctx.save();
  if(def.key==='turret'){ ctx.globalAlpha=0.16; ctx.strokeStyle=ok?'#8be36a':'#ff6a5a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,def.range,0,TAU); ctx.stroke(); }
  ctx.globalAlpha=0.55; ctx.setLineDash([6,5]);
  ctx.fillStyle= ok?'rgba(120,220,110,.5)':'rgba(230,90,80,.5)'; ctx.strokeStyle= ok?'#8be36a':'#ff6a5a'; ctx.lineWidth=2;
  roundRect(x,y,def.w,def.h,4); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha=1; ctx.fillStyle=ok?'#eaffe0':'#ffe6e2'; ctx.font='700 13px Trebuchet MS, sans-serif';
  ctx.textAlign='center'; ctx.fillText(def.icon+' '+def.cost+'🔩', cx, y-6);
  ctx.restore();
}
function drawDrop(d){
  ctx.save();
  if(!d.landed){
    ctx.strokeStyle='rgba(255,255,255,.2)'; ctx.lineWidth=2; ctx.setLineDash([6,8]);
    ctx.beginPath(); ctx.moveTo(d.tx,Math.max(cam.y,d.ty-320)); ctx.lineTo(d.tx,d.ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#ffcf5a'; ctx.beginPath(); ctx.arc(d.x,d.y-22,18,Math.PI,0); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.beginPath();
    ctx.moveTo(d.x-16,d.y-22); ctx.lineTo(d.x-7,d.y-7); ctx.moveTo(d.x+16,d.y-22); ctx.lineTo(d.x+7,d.y-7); ctx.stroke();
  } else {
    const pulse=2+Math.sin(d.lt*6)*2; ctx.strokeStyle='rgba(255,210,80,.7)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(d.x,d.y,18+pulse,0,TAU); ctx.stroke();
    ctx.save(); ctx.globalAlpha=.14+.05*Math.sin(d.lt*5); ctx.fillStyle='#ffd24a'; ctx.shadowColor='#ffd24a'; ctx.shadowBlur=16;
    ctx.fillRect(d.x-5,d.y-170,10,150); ctx.restore();
  }
  ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(d.x,d.y+12,16,5,0,0,TAU); ctx.fill();
  // wooden loot crate: body + planks + metal corner brackets + red supply band
  ctx.lineJoin='round';
  ctx.fillStyle='#b07a3a'; ctx.strokeStyle='#5a3a18'; ctx.lineWidth=2.2; roundRect(d.x-15,d.y-13,30,26,3); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(d.x-14,d.y-12,28,3);
  ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(d.x-14,d.y-3,28,2); ctx.fillRect(d.x-14,d.y+5,28,2);   // plank seams
  ctx.strokeStyle='#4a5058'; ctx.lineWidth=1.4; ctx.fillStyle='#5a626c';                                 // corner brackets
  for(const cx of [-1,1]) for(const cy of [-1,1]){ roundRect(d.x+cx*11-2.6,d.y+cy*9-2.6,5.2,5.2,1); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle='#d23b3b'; ctx.fillRect(d.x-15,d.y-2.5,30,5);                                            // red band
  ctx.fillStyle='#ffd24a'; ctx.font='800 9px Trebuchet MS, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('★', d.x, d.y+0.5); ctx.textBaseline='alphabetic';
  ctx.restore();
}
const GUNK={
  Pistol:  {l:11,c:'#454a53',serr:1,guard:1,hammer:1},
  Rifle:   {l:20,c:'#7a5836',stock:1,mag:1,sight:1,vents:1,muzzle:1,guard:1,wood:1},
  Shotgun: {l:17,c:'#6a4a2e',stock:1,pump:1,tip:1,wood:1,guard:1},
  SMG:     {l:14,c:'#3a3f48',stock:1,mag:1,muzzle:1,guard:1,finned:1},
  Magnum:  {l:13,c:'#4a5058',cyl:1,nickel:1,guard:1},
  Sniper:  {l:26,c:'#2a2f38',scope:1,stock:1,bipod:1,sight:1,brake:1,muzzle:1,guard:1},
  Crossbow:{l:16,c:'#6a4e2a',bow:1,wood:1,guard:1},
  Flame:   {l:13,c:'#8a3a2a',tank:1,nozzle:1,hazard:1},
  Minigun: {l:18,c:'#2a2f38',fat:1,cluster:1,belt:1,grille:1},
  Tommy:   {l:16,c:'#5a4a3a',drum:1,stock:1,foregrip:1,wood:1,muzzle:1,guard:1},
  Launcher:{l:20,c:'#4a5a38',tube:1,stock:1,guard:1},
  Vipers:  {l:14,c:'#2f333b',twin:1,stock:1,mag:1,muzzle:1,guard:1},
  'Pulse SMG':{l:15,c:'#244b5a',stock:1,mag:1,muzzle:1,guard:1,finned:1,vents:1},
  'Arc Rifle':{l:22,c:'#25445f',stock:1,mag:1,sight:1,scope:1,muzzle:1,guard:1,vents:1},
  'Frost Blaster':{l:17,c:'#4d7890',tank:1,nozzle:1,guard:1,brake:1},
  'Rocket Launcher':{l:23,c:'#5a4238',tube:1,stock:1,guard:1,scope:1}};
