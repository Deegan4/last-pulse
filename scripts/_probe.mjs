import { webkit } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
const ROOT='/Volumes/SAMSUNG 1TB/last-pulse';
const srv=createServer((rq,rs)=>{ const u=normalize(decodeURIComponent(rq.url.split('?')[0]));
  const p=join(ROOT, u==='/'?'index.html':u);
  try{ statSync(p); rs.writeHead(200,{'content-type':p.endsWith('.html')?'text/html':'application/octet-stream'}); createReadStream(p).pipe(rs);}catch{rs.writeHead(404).end();} });
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const b=await webkit.launch();
for(const [w,h,st,sb] of [[375,522,0,0],[375,667,0,21]]){
  const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const p=await c.newPage();
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?insets=${st},${sb}`,{waitUntil:'load'});
  await p.waitForTimeout(1700);
  console.log(`--- ${w}x${h} insets ${st}/${sb} ---`);
  console.log(await p.evaluate(()=>{
    const s=document.getElementById('startScreen');
    const cs=getComputedStyle(s);
    let out=`pad ${cs.paddingTop} / ${cs.paddingBottom}  rowGap ${cs.rowGap}\n`;
    let sum=0;
    for(const el of s.children){ const r=el.getBoundingClientRect(); const g=getComputedStyle(el);
      if(g.display==='none') continue;
      out+=`  ${(el.id||el.className).slice(0,26).padEnd(28)} h=${r.height.toFixed(1).padStart(6)}  top=${r.top.toFixed(0).padStart(5)}  bot=${(r.bottom).toFixed(0).padStart(5)}\n`;
      sum+=r.height; }
    return out+`  sum children = ${sum.toFixed(1)}   viewport = ${window.innerHeight}`;
  }));
  await c.close();
}
await b.close(); srv.close();
