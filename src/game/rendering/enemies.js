// Enemy art direction: broad silhouettes, cel-lit volumes and role-specific equipment.
// Visual-only descriptors: collision radii, movement and combat remain in ZTYPES.
const ENEMY_ART = {
  normal:     {skin:'#a7c87a', shade:'#58764c', cloth:'#657b9b', accent:'#f3cd78', shape:'villager'},
  grunt:      {skin:'#c5bd85', shade:'#777951', cloth:'#9d654b', accent:'#edc57a', shape:'guard'},
  runner:     {skin:'#df9880', shade:'#925968', cloth:'#784252', accent:'#ffbb67', shape:'hunter'},
  skitter:    {skin:'#dac795', shade:'#98765b', cloth:'#70485b', accent:'#ff9966', shape:'insect'},
  brute:      {skin:'#9faf86', shade:'#5c7161', cloth:'#855b47', accent:'#e9d1a1', shape:'ogre'},
  crusher:    {skin:'#adada2', shade:'#68767e', cloth:'#596577', accent:'#efa968', shape:'iron'},
  spitter:    {skin:'#aed279', shade:'#537e63', cloth:'#537661', accent:'#d9ff7c', shape:'acid'},
  venomspine: {skin:'#78c2ad', shade:'#3f716f', cloth:'#4a5978', accent:'#9dffd0', shape:'cobra'},
  bloater:    {skin:'#d1bc75', shade:'#85845a', cloth:'#82704f', accent:'#dcf682', shape:'belly'},
  rottank:    {skin:'#c6a77c', shade:'#876c59', cloth:'#806444', accent:'#c6ef83', shape:'tank'},
  stalker:    {skin:'#bba4d2', shade:'#675481', cloth:'#53476c', accent:'#ff98cd', shape:'blade'},
  wraith:     {skin:'#c1ece5', shade:'#65989f', cloth:'#426582', accent:'#a0f5ef', shape:'ghost'},
  leaper:     {skin:'#b4c47b', shade:'#607e59', cloth:'#5b7053', accent:'#ffdf84', shape:'frog'},
  shaman:     {skin:'#88bfa9', shade:'#487c7b', cloth:'#536a85', accent:'#96ffe4', shape:'witch'},
  howler:     {skin:'#c49aca', shade:'#765086', cloth:'#694b7b', accent:'#f2b2ed', shape:'banshee'},
  carapace:   {skin:'#c6a67b', shade:'#826345', cloth:'#a45f46', accent:'#91e3dc', shape:'beetle'},
  husk:       {skin:'#e2d6b3', shade:'#aaa18b', cloth:'#887d68', accent:'#c7e9b0', shape:'brood'},
  juggernaut: {skin:'#a5b394', shade:'#596a64', cloth:'#566574', accent:'#ffbe71', shape:'knight'},
  colossus:   {skin:'#bbb19a', shade:'#79665c', cloth:'#66616b', accent:'#ff9069', shape:'king'},
};
function drawZombie(z){
  const art=ENEMY_ART[z.kind]||ENEMY_ART.normal, q=art.shape, flash=z.hitFlash>0;
  const heavy=['ogre','iron','knight','king'].includes(q), swollen=['belly','tank','beetle','brood'].includes(q);
  const hunter=['hunter','blade','insect','frog'].includes(q), caster=['witch','banshee','ghost'].includes(q);
  const now=performance.now()/1000, moving=z.vx*z.vx+z.vy*z.vy>200, face=z.faceX<0?-1:1;
  const swing=moving?Math.sin(z.walk)*3:0, breath=Math.sin(now*2.4+z.seed)*.7, attack=Math.max(0,z.lunge||0);
  const width=heavy?13:swollen?13:hunter?8:9, headY=heavy?-17:swollen?-21:hunter?-20:-25;
  const ink='#253039', bone='#f4e3bb', accent=art.accent;
  // Tiny local path helpers keep all 19 designs consistent, including white hit flashes.
  const paint=(color)=>{ctx.fillStyle=flash?'#fff4dd':color;ctx.strokeStyle=ink;ctx.lineWidth=1.25;};
  const oval=(x,y,rx,ry,color,rot=0)=>{paint(color);ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,TAU);ctx.fill();ctx.stroke();};
  const poly=(points,color)=>{paint(color);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();ctx.stroke();};
  const line=(points,color,w=1.3)=>{ctx.strokeStyle=flash?'#fff4dd':color;ctx.lineWidth=w;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();};
  const gem=(x,y,r,color)=>{poly([[x,y-r],[x+r*.7,y],[x,y+r],[x-r*.7,y]],color);};
  const limb=(x,y,ex,ey,w,color)=>{line([[x,y],[ex,ey]],ink,w+2);line([[x,y],[ex,ey]],color,w);};
  if(z.boss&&z.slamWind>0){const k=1-clamp(z.slamWind/JUGGERNAUT_SLAM.wind,0,1);
    ctx.save();ctx.globalAlpha=.22+.4*k;ctx.strokeStyle='#ff6a2a';ctx.lineWidth=3+2*k;
    ctx.beginPath();ctx.arc(z.x,z.y,JUGGERNAUT_SLAM.r*Math.min(1,k+.15),0,TAU);ctx.stroke();ctx.restore();}
  ctx.save();ctx.translate(z.x,z.y);ctx.scale(z.size,z.size);ctx.lineJoin='round';ctx.lineCap='round';
  ctx.fillStyle='rgba(12,23,24,.28)';ctx.beginPath();ctx.ellipse(0,18,width+5,4.5,0,0,TAU);ctx.fill();
  ctx.translate(attack*face*3,breath);ctx.rotate(moving?Math.sin(z.walk)*.025:Math.sin(now*1.8+z.seed)*.018);
  // Back silhouettes distinguish roles before any face detail is visible.
  if(caster){poly([[-8,-25],[-16,-5],[-14,15],[-7,11],[-3,18],[3,12],[13,16],[16,-6],[8,-25]],art.cloth);
    line([[-9,-15],[-11,6],[-6,10]],art.shade,3);}
  if(q==='cobra'||q==='banshee'){const flare=q==='banshee'&&z.howlFlash>0?5:0;
    poly([[-6,-29],[-17-flare,-29],[-20-flare,-17],[-12,-5],[0,1],[12,-5],[20+flare,-17],[17+flare,-29],[6,-29]],art.cloth);
    for(const side of [-1,1])for(let i=0;i<3;i++)line([[side*7,-24+i*6],[side*(15-i),-23+i*6]],accent,1.5);}
  if(q==='beetle'||q==='brood'){oval(0,-8,17,21,art.cloth);line([[0,-27],[0,10]],art.shade,2.5);
    for(const side of [-1,1])for(let i=0;i<3;i++)line([[side*2,-21+i*9],[side*14,-16+i*7]],bone,1);}
  if(q==='tank'){for(const side of [-1,1]){oval(side*13,-5,5,16,art.cloth);line([[side*13,-17],[side*13,6]],accent,3);}}
  if(q==='blade'||q==='insect')for(const side of [-1,1])for(let i=0;i<3;i++){
    poly([[side*6,-14+i*7],[side*(18-i),-23+i*8],[side*12,-8+i*7]],q==='blade'?bone:art.cloth);}
  if(q==='witch'){limb(15,14,17,-35,2.5,'#aa8e6d');poly([[12,-36],[17,-43],[23,-36],[19,-28]],bone);gem(17,-35,4,accent);}
  if(q==='king')for(const side of [-1,1])poly([[side*9,-23],[side*21,-31],[side*24,-20],[side*18,-10]],art.cloth);
  // Jointed legs and deliberate stances: crouching hunters, planted tanks, floating wraiths.
  if(q!=='ghost')for(const side of [-1,1]){
    const knee=side*(hunter?12:7), footY=16+side*swing;
    limb(side*5,3,knee,9,heavy?7:4,art.shade);limb(knee,9,side*(hunter?15:8),footY,heavy?6:3.5,art.skin);
    oval(side*(hunter?15:8)+face,footY+1,heavy?5:4,2.5,heavy?art.cloth:art.shade);
    if(hunter)for(let i=0;i<2;i++)line([[side*15+i,footY],[side*18+i,footY+1]],bone,1.2);
  }
  // Back arm and body with broad cel shading instead of repeated exposed ribcages.
  limb(-face*7,-10,-face*(width+5),7-swing*.4,heavy?7:4,art.shade);
  oval(-face*(width+5),8-swing*.4,heavy?5:3,heavy?5:3,art.shade);
  if(swollen)oval(0,-1,width+1,16,art.skin);
  else poly([[-width,-15],[width,-15],[width+1,-2],[width*.7,12],[2,10],[-3,13],[-width*.8,9]],art.cloth);
  poly([[-width+2,-12],[-width*.5,-14],[-width*.55,8],[-width+1,5]],swollen?art.shade:art.skin);
  if(!flash){line([[-width+3,-12],[0,-14],[width-3,-12]],'#ffffff55',1.6);}
  if(q==='villager'||q==='guard'){poly([[-7,-15],[-1,-7],[-4,-2],[-9,-9]],'#b9c5b5');
    poly([[7,-15],[1,-7],[3,0],[9,-9]],art.shade);line([[0,-7],[0,9]],ink,1.2);
    for(let i=0;i<3;i++)oval(2,-3+i*4,.7,.7,bone);
    poly([[-8,3],[-2,4],[-3,8],[-7,7]],'#b7aa80');
    if(q==='guard'){line([[-8,-14],[8,7]],'#dac19b',4);oval(0,-3,2,2,art.cloth);}}
  if(q==='hunter'){poly([[-8,-15],[0,-10],[8,-16],[7,-9],[-1,-5],[-8,-9]],'#de785f');
    poly([[-8,-12],[-21,-5],[-17,-2],[-7,-7]],'#de785f');}
  if(q==='ogre'){line([[-9,-11],[8,8]],'#d9ba86',4);poly([[-12,7],[12,7],[10,12],[-10,12]],art.cloth);oval(3,9,2.5,2.5,'#bfb5a1');}
  if(q==='iron'||q==='knight'||q==='king'){
    poly([[-11,-16],[11,-16],[13,-4],[8,9],[0,12],[-9,8],[-13,-4]],art.cloth);
    poly([[-8,-13],[0,-15],[0,8],[-7,5]],'#93a5af');poly([[0,-15],[8,-13],[8,4],[0,8]],'#455363');
    for(const side of [-1,1]){poly([[side*8,-16],[side*18,-15],[side*21,-7],[side*10,-5]],art.cloth);
      line([[side*10,-14],[side*17,-12]],bone,1.4);oval(side*14,-9,1.1,1.1,accent);}
    gem(0,-4,q==='king'?5:3,accent);
    if(q==='king')poly([[-6,8],[6,8],[8,20],[0,16],[-8,20]],'#a14d49');
  }
  if(q==='belly'||q==='tank'){oval(1,0,9,11,art.shade);oval(0,-2,7.5,8.5,accent);
    line([[-5,-5],[-2,-7],[1,-7]],'#fff4ce',1.8);line([[-7,4],[6,5]],art.shade,2);
    for(let i=0;i<3;i++)line([[-4+i*4,2],[-3+i*4,7]],bone,1);
    for(const side of [-1,1])oval(side*10,-11,3,4,accent);}
  if(q==='acid'||q==='cobra'){oval(0,-8,8,9,art.shade);oval(0,-9,6,7,accent);
    line([[-3,-12],[-1,-14],[2,-13]],'#fff7d6',1.5);}
  if(q==='brood')for(let i=0;i<(z.spawnsLeft||0);i++){
    oval((i-1)*7,-6+(i%2)*4,4,6,bone);oval((i-1)*7,-7+(i%2)*4,2,2,accent);
  }
  if(caster){poly([[-7,-12],[0,8],[7,-12],[4,11],[0,15],[-4,10]],art.shade);
    gem(0,-6,4,accent);line([[-5,6],[0,9],[5,6]],bone,1);}
  if(q==='frog'){oval(-8,5,5,7,art.skin,-.5);oval(8,5,5,7,art.skin,.5);}
  // Front hands: oversized knuckles and ivory claws, with attack extension.
  const reach=width+4+attack*5, handY=heavy?6:-3+swing*.35;
  limb(face*(width-2),-10,face*reach,handY,heavy?8:4.5,art.skin);
  oval(face*reach,handY+1,heavy?5.5:3.6,heavy?6:4,art.skin);
  if(!flash)line([[face*(reach-1),handY-2],[face*(reach+2),handY-1]],'#ffffff66',1.4);
  for(let i=0;i<3;i++)poly([[face*(reach-2+i*2),handY+3],[face*(reach-1+i*2),handY+7],[face*(reach+i*2),handY+3]],bone);
  // Larger sculpted face; ear shapes, jaws and headwear carry character identity.
  ctx.save();ctx.translate(face*(hunter?3:0),headY+breath*.4);ctx.rotate(face*(hunter?.12:0));
  const hw=heavy?9.5:q==='insect'?9:10.5;
  for(const side of [-1,1])poly([[side*8,-5],[side*15,-7],[side*12,0],[side*8,2]],art.shade);
  if(q==='frog'){oval(-7,-8,5,5,art.skin);oval(7,-8,5,5,art.skin);}
  oval(0,-1,hw,10,art.skin);
  poly([[3,-9],[hw-1,-4],[hw-1,4],[5,9],[-2,9],[4,4]],art.shade);
  // Brow plane and cheek highlight make the face read at phone scale.
  if(!flash)line([[-7,-6],[-3,-9],[2,-9]],'#fff4c488',2);
  oval(0,5,heavy?8:7,heavy?5:4,art.skin);
  if(q==='banshee'){oval(0,4,5,7+attack*2,ink);oval(0,6,2.7,3,accent);}
  else if(q==='acid'||q==='cobra'){oval(0,5,5,4,art.shade);oval(0,5,3.5,2.8,ink);oval(2,9,1.4,2.2,accent);}
  else {poly([[-6,3],[-2,4],[2,3],[6,2],[5,7+attack*2],[-4,8+attack*2]],ink);
    for(const side of [-1,1])poly([[side*4,3],[side*3,7],[side*1.5,3.5]],bone);
    line([[-1,8+attack*2],[2,8+attack*2]],bone,1.5);}
  if(q==='insect'){for(const side of [-1,1]){oval(side*5,-3,4.5,5,ink);oval(side*5,-4,2.8,3,accent);}}
  else if(q==='witch'||q==='ghost'){
    poly([[-8,-7],[0,-11],[8,-7],[7,3],[0,7],[-7,3]],bone);
    for(const side of [-1,1])poly([[side*2,-4],[side*6,-5],[side*4,0]],ink);
    gem(0,-6,2,accent);
  } else for(const side of [-1,1]){
    oval(side*4.5,-2,3.6,3,ink);poly([[side*1.5,-4],[side*7.5,-5],[side*6,0],[side*2,0]],accent);
    if(!flash)oval(side*4.5,-2,1,1.5,'#fffbe0');
    line([[side*1.5,-5],[side*7.5,-7]],art.shade,2.4);
  }
  // Recognizable head silhouettes, not just palette swaps.
  if(q==='villager'){poly([[-10,-5],[-11,-11],[-5,-14],[-1,-12],[5,-14],[9,-10],[9,-7],[2,-10],[-2,-8],[-7,-10]],'#59635a');
    line([[-7,0],[-4,2]],art.shade,1);}
  if(q==='guard'){poly([[-11,-7],[-9,-15],[7,-15],[11,-7]],'#968b72');line([[-12,-7],[12,-7]],'#ddd0a7',3);}
  if(q==='hunter'){poly([[-8,-9],[-4,-17],[0,-12],[5,-16],[8,-8]],'#64475b');line([[-10,-6],[9,-7]],'#eb9870',2.7);}
  if(q==='insect'||q==='cobra')for(const side of [-1,1]){line([[side*6,-10],[side*10,-18],[side*14,-20]],art.shade,2);oval(side*14,-20,2,2,accent);}
  if(q==='ogre')for(const side of [-1,1])poly([[side*7,-7],[side*15,-14],[side*13,-4],[side*9,-1]],bone);
  if(q==='iron'||q==='knight'||q==='king'){
    poly([[-11,0],[-12,-10],[-7,-16],[7,-16],[12,-10],[11,0],[7,-5],[-7,-5]],art.cloth);
    poly([[-8,-11],[0,-15],[0,-7],[-9,-6]],'#a3b0b5');line([[-7,-3],[7,-3]],accent,2.3);
    if(q==='king')poly([[-9,-13],[-12,-23],[-5,-19],[0,-26],[5,-19],[12,-23],[9,-13]],'#d9ac6b');
    else if(q==='knight')poly([[-2,-15],[-3,-24],[3,-24],[2,-15]],'#b26453');
    else line([[-7,-11],[7,-11]],bone,2);
  }
  if(q==='blade'){poly([[-9,-6],[-11,-16],[-3,-12],[1,-20],[6,-11],[11,-14],[9,-4],[5,-8],[-5,-8]],art.cloth);}
  if(q==='witch')for(const side of [-1,1]){line([[side*7,-9],[side*11,-19],[side*8,-25]],bone,2.2);line([[side*11,-18],[side*17,-22]],bone,1.5);}
  if(q==='ghost'){poly([[-10,0],[-13,-10],[-5,-18],[4,-20],[11,-10],[10,1],[6,-9],[0,-12],[-6,-8]],art.cloth);}
  if(q==='beetle'){poly([[-11,-2],[-10,-12],[0,-17],[10,-12],[11,-2],[4,-7],[-4,-7]],art.cloth);
    poly([[-3,-15],[-4,-25],[0,-22],[4,-25],[3,-15]],'#d7ac7d');line([[0,-14],[0,-8]],bone,1.7);}
  if(q==='brood'){poly([[-10,-3],[-12,-12],[-5,-16],[6,-15],[11,-9],[10,1],[6,-6],[1,-11],[-5,-8]],bone);}
  if(q==='belly'||q==='tank'){for(let i=0;i<3;i++)oval(-6+i*6,-11,2.3,2.5,accent);}
  ctx.restore();ctx.restore();
  const hc=clamp(z.hp/z.maxhp,0,1),bw=24*z.size;
  if(hc<1){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(z.x-bw/2,z.y-49*z.size,bw,3);
    ctx.fillStyle=accent;ctx.fillRect(z.x-bw/2,z.y-49*z.size,bw*hc,3);}
}
function roundRect(x,y,w,h,r,c){ c=c||ctx; c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r);
  c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
