// Exercise real closure-scoped combat in a disposable HTML copy, using the normal browser driver.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const copy=path.join(root,'.perk-test.html');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lp-perks-'));
const hook=String.raw`
window.__testPerks=()=>{
  let checks=0;
  const ok=(value,msg)=>{ if(!value) throw Error(msg); checks++; };
  const fresh=()=>{ spawnMatch(); grace=0; activeMutator=null; paused=true;
    obstacles.length=0; zombies.length=0; humans.splice(1); player.x=900; player.y=900; return player; };
  const add=(x=940,y=900,hp=500)=>{ const z=makeZombie(x,y,'normal'); z.hp=z.maxhp=hp; zombies.push(z); return z; };
  const take=(h,id)=>applyPerk(h,PERKS.find(p=>p.id===id));
  let h=fresh(); ok(PERKS.length===10,'ten perks');
  for(const p of PERKS){ for(let i=0;i<perkLimit(p);i++) ok(applyPerk(h,p),'rank applies');
    ok(!applyPerk(h,p),'rank cap'); }
  ok(availablePerks(h).length===0,'maxed perks excluded');
  h.hp=h.maxhp/2; openPerkPick(false);
  ok(h.hp===h.maxhp*.75 && zombies.length>0,'full build heals and spawns');
  h=fresh(); ok(!h.perkRanks&&!h.perkRicochet,'fresh run resets');
  take(h,'ricochet'); const a=add(),b=add(1000); const ally=makeHuman(true,AVATARS[0],WEAPONS[0]);
  ally.team=h.team; ally.x=945; ally.y=900; humans.push(ally); const allyHP=ally.hp;
  bullets.push({x:a.x,y:a.y,vx:0,vy:0,life:1,owner:h,dmg:20,hits:0}); updateBullets(0);
  ok(a.hp===480&&b.hp===490,'bullet impact deals secondary half damage');
  ok(ally.hp===allyHP,'ricochet excludes ally');
  for(const flags of [{flame:true},{boom:true}]){ const hp=b.hp; ricochetHit({owner:h,dmg:20,...flags},a); ok(b.hp===hp,'excluded weapon'); }
  const shot={owner:h,dmg:20}; ricochetHit(shot,a); const hp=b.hp; ricochetHit(shot,a); ok(b.hp===hp,'one bounce per projectile');
  h=fresh(); take(h,'reloadBlast'); const near=add(),far=add(1200); elapsed=10;
  h.mag=0; startReload(h); ok(near.hp===500,'reload start does not blast');
  updatePlayer(h,h.weapon.reload+.01,null,false); ok(near.hp===460&&far.hp===500,'completed reload radius');
  h.mag=0; startReload(h); updatePlayer(h,h.weapon.reload+.01,null,false); ok(near.hp===460,'reload cooldown');
  elapsed+=6; h.mag=0; startReload(h); updatePlayer(h,h.weapon.reload+.01,null,false); ok(near.hp===420,'reload cooldown expires');
  h=fresh(); take(h,'killLightning');
  for(let i=0;i<3;i++) hurt(add(940,900,1),2,h,false);
  const targets=Array.from({length:4},(_,i)=>add(960+i*15,900,30));
  hurt(add(930,900,1),2,h,false);
  ok(targets.filter(z=>!z.alive).length===3,'fourth kill zaps at most three');
  ok(h.perkKillCount===0&&!h.perkStormActive,'lightning kills cannot recursively charge');
  h=fresh(); take(h,'grappleDamage'); const z=add(920);
  h.grap={ax:1200,ay:900,len:300,t:0}; updateGrapple(h,.01); updateGrapple(h,.01);
  ok(z.hp===445,'one grapple strike per target');
  h.grap={ax:1200,ay:900,len:300,t:0}; updateGrapple(h,.01); ok(z.hp===390,'next swing strikes again');
  h=fresh(); hordeWave=1;
  for(let wave=2;wave<=15;wave++){
    zombies.length=0; hordeUpdate(.01); ok(hordeWave===wave,'wave advances '+wave);
    if(wave%3===0){ ok(perkChoices.length===3,'three distinct choices');
      const id=perkChoices[0].id; choosePerk(id); const count=zombies.length; choosePerk(id);
      ok(zombies.length===count,'double pick cannot duplicate wave'); }
    ok(zombies.length>0,'wave populated '+wave);
    if(wave%5===0) ok(zombies.some(z=>z.boss),'boss on milestone');
  }
  // Leave a real picker visible for screenshot inspection.
  openPerkPick(false); paused=true;
  return {checks,wave:hordeWave,choices:perkChoices.map(p=>p.name)};
};
`;
try {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  fs.writeFileSync(copy,html.replace(/\}\)\(\);\s*<\/script>/,hook+'\n})();\n</script>'));
  let driver=fs.readFileSync(path.join(root,'.agents/skills/run-brawl-arena/driver.mjs'),'utf8');
  const require=createRequire(path.join(root,'.agents/skills/run-brawl-arena/driver.mjs'));
  try { driver=driver.replace("['playwright',", '['+JSON.stringify(require.resolve('playwright'))+','); } catch {}
  driver=driver.replace("  await shot('03-match');", "  console.log('PERK CHECKS:', await page.evaluate(()=>window.__testPerks()));\n  await shot('03-match');");
  const script=path.join(temp,'driver.mjs'); fs.writeFileSync(script,driver);
  const run=spawnSync(process.execPath,[script,'--file',copy,'--play','--mode','horde','--seconds','0.1','--out',path.join(root,'.shots/perks')],{stdio:'inherit',env:process.env});
  process.exitCode=run.status??1;
} finally { fs.rmSync(copy,{force:true}); fs.rmSync(temp,{recursive:true,force:true}); }
