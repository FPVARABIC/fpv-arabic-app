import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});
const c = await b.newContext({ viewport:{width:390,height:844}});
const p = await c.newPage();
await p.goto('http://localhost:5174'); await p.evaluate(()=>{localStorage.setItem('fpv_has_started','true');localStorage.setItem('fpv_safety_seen','true');});
for (const [id,f] of [['lesson-1','/tmp/d-quad.png'],['lesson-5','/tmp/d-size.png'],['lesson-7','/tmp/d-lipo.png']]) {
  await p.goto('http://localhost:5174/lessons/'+id,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
  await p.screenshot({path:f}); console.log('ok',f);
}
await b.close();
