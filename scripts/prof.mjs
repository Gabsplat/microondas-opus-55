import { chromium } from 'playwright';
const [extra=''] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4380/'); await page.waitForTimeout(300);
const r = await page.evaluate((extra) => {
  const a = window.__app; eval(extra);
  const sc = a.scenes[a.idx];
  const c = document.createElement('canvas'); c.width = 1440; c.height = 900; const g = c.getContext('2d');
  const out = {};
  const orig = sc.draw.bind(sc);
  let tot = 0, N = 20;
  for (let i = 0; i < N; i++) { const t0 = performance.now(); a.wake(); tot += 0; }
  // medir draw directo
  const F = { };
  return 'ok';
}, extra);
// medir con el bucle real
const fps = await page.evaluate(async (extra) => {
  const a = window.__app; eval(extra); const sc = a.scenes[a.idx]; sc.paused = false;
  const d0 = sc.draw.bind(sc); let acc = 0, n = 0;
  sc.draw = (R) => { const t0 = performance.now(); d0(R); acc += performance.now() - t0; n++; };
  let frames = 0; const t0 = performance.now();
  await new Promise((r) => { const f = () => { frames++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
  return { fps: frames / 2, drawMs: (acc / n).toFixed(1) };
}, extra);
console.log(fps);
await browser.close();
