// Capturas de control: node scripts/shot.mjs <escena> <t1,t2,...> [ancho] [alto] [js extra]
import { chromium } from 'playwright';
const [scene = '0', times = '0', w = '1440', h = '900', extra = ''] = process.argv.slice(2);
const url = process.env.URL || 'http://127.0.0.1:4380/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto(url);
await page.waitForTimeout(400);
for (const t of times.split(',')) {
  await page.evaluate(([s, t, extra]) => {
    const a = window.__app;
    a.go(+s, { instant: true });
    const sc = a.scenes[+s];
    sc.t = +t; sc.paused = true;
    if (extra) eval(extra);
    a.wake();
  }, [scene, t, extra]);
  await page.waitForTimeout(250);
  const t0 = Date.now();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: `shots/s${scene}-${t}-${w}.png` });
}
const perf = await page.evaluate(async () => {
  const a = window.__app; const sc = a.scenes[a.idx]; sc.paused = false; sc.t = 0; a.wake();
  let n = 0; const t0 = performance.now();
  await new Promise((r) => { const f = () => { n++; performance.now() - t0 < 1500 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
  return Math.round(n / 1.5);
});
console.log('fps≈', perf, 'errores:', errs.length ? errs : 'ninguno');
await browser.close();
