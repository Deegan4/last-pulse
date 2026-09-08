// Roster review against the real canvas renderer; no hooks are written to production HTML.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'), temp=fs.mkdtempSync(path.join(os.tmpdir(),'lp-roster-'));
const copy=path.join(root,'.enemy-review.html');
const out=path.resolve(process.argv[2]||'.shots/enemies');
const hook=String.raw`
window.__enemyReview=()=>{
  paused=true;
  const kinds=Object.keys(ZTYPES), sheet=document.createElement('canvas'); sheet.width=1200; sheet.height=Math.ceil(kinds.length/5)*230+80;
  const o=sheet.getContext('2d'); o.fillStyle='#121d27'; o.fillRect(0,0,sheet.width,sheet.height);
  o.fillStyle='#e9f1dc'; o.font='bold 26px sans-serif'; o.fillText('LAST PULSE / ENEMY ROSTER',30,44);
  let checks=0;
  kinds.forEach((kind,i)=>{
    const x=(i%5)*240, y=Math.floor(i/5)*230+70;
    o.fillStyle=i%2?'#263b39':'#304438'; o.fillRect(x+8,y+4,224,220);
    const z=makeZombie(0,0,kind); z.seed=0; z.walk=1; z.vx=30;
    for(const state of ['idle','attack','flash','injured']){
      z.lunge=state==='attack'?1:0; z.hitFlash=state==='flash'?.1:0; z.hp=state==='injured'?z.maxhp*.5:z.maxhp;
      ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);
      ctx.translate(110,150); ctx.scale(1.7,1.7); drawZombie(z); ctx.restore(); checks++;
      if(state==='idle') o.drawImage(cv,0,0,220,210,x+10,y+2,220,190);
    }
    o.fillStyle='#e9f1dc'; o.font='bold 14px sans-serif'; o.textAlign='center'; o.fillText(kind.toUpperCase(),x+120,y+207);
  });
  return {png:sheet.toDataURL('image/png'),checks,kinds:kinds.length};
};
window.__enemyCrowd=()=>{
  spawnMatch(); grace=0; activeMutator=null; player.shield=100000; player.hp=player.maxhp;
  zombies.length=0; obstacles.length=0; decor.length=0; builds.length=0;
  player.x=ARENA/2; player.y=ARENA/2; timeOfDay='night';
  const kinds=Object.keys(ZTYPES);
  for(let i=0;i<57;i++){const a=i*2.39996,r=110+(i%5)*35;
    const z=makeZombie(player.x+Math.cos(a)*r,player.y+Math.sin(a)*r,kinds[i%kinds.length]); zombies.push(z);}
  paused=false; resize();
  return zombies.length;
};
`;
try{
  fs.mkdirSync(out,{recursive:true});
  const html=fs.readFileSync(process.argv[3]||path.join(root,'index.html'),'utf8');
  fs.writeFileSync(copy,html.replace(/\}\)\(\);\s*<\/script>/,hook+'\n})();\n</script>'));
  let driver=fs.readFileSync(path.join(root,'.agents/skills/run-brawl-arena/driver.mjs'),'utf8');
  const require=createRequire(path.join(root,'.agents/skills/run-brawl-arena/driver.mjs'));
  try{driver=driver.replace("['playwright',",'['+JSON.stringify(require.resolve('playwright'))+',');}catch{}
  driver=driver.replace("  await shot('03-match');", "  const review=await page.evaluate(()=>window.__enemyReview()); fs.writeFileSync(path.join(out,'roster.png'),Buffer.from(review.png.split(',')[1],'base64')); console.log('ROSTER:',review.kinds,'kinds;',review.checks,'render states'); await page.evaluate(()=>window.__enemyCrowd()); await page.waitForTimeout(1800); await shot('crowd-night');");
  const script=path.join(temp,'driver.mjs'); fs.writeFileSync(script,driver);
  const run=spawnSync(process.execPath,[script,'--file',copy,'--play','--mode','horde','--seconds','0.1','--out',out],{stdio:'inherit'}); process.exitCode=run.status??1;
}finally{fs.rmSync(copy,{force:true});fs.rmSync(temp,{recursive:true,force:true});}
