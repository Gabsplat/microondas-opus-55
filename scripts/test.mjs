// Pruebas funcionales de interacción: node scripts/test.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const url = process.env.URL || 'http://127.0.0.1:4380/';
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'OK ' : 'FALLA'} ${name}${extra ? ' — ' + extra : ''}`);

// Escritorio
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(url);
await page.waitForTimeout(600);
const idx = () => page.evaluate(() => window.__app.idx);
const st = (i) => page.evaluate((i) => { const s = window.__app.scenes[i]; return { t: Math.round(s.t), paused: s.paused }; }, i);

await page.keyboard.press('ArrowRight');
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/t-transition.png' });
ok('flecha derecha avanza al 02', (await idx()) === 1);
await page.waitForTimeout(800);
const t1 = (await st(1)).t;
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(300);
ok('flecha izquierda vuelve al 01', (await idx()) === 0);
await page.keyboard.press('ArrowRight');
const t0a = (await st(0)).t;
await page.waitForTimeout(200);
const t1b = (await st(1)).t;
ok('el 02 conserva su reproducción al volver', t1b >= t1 && t1b < t1 + 900, `${t1} → ${t1b}`);
ok('el 01 quedó suspendido mientras no se veía', (await st(0)).t === t0a);
await page.keyboard.press('4');
await page.waitForTimeout(200);
ok('tecla 4 abre el capítulo 04', (await idx()) === 3);
await page.click('#chapters button[data-go="5"]');
await page.waitForTimeout(200);
ok('acceso directo a la lámina final', (await idx()) === 5);
await page.click('#chapters button[data-go="0"]');
await page.waitForTimeout(300);
// Pausa / continuar
await page.click('#play');
const p1 = await st(0);
await page.waitForTimeout(500);
const p2 = await st(0);
ok('Pausar detiene el reloj', p1.paused && p1.t === p2.t);
ok('botón muestra «Continuar»', (await page.textContent('#play .lbl')) === 'Continuar');
await page.click('#play');
await page.waitForTimeout(400);
ok('Continuar reanuda', (await st(0)).t > p2.t);
// Ver completa y repetir
await page.click('#full');
await page.waitForTimeout(200);
ok('Ver completa salta al reposo', (await st(0)).t >= 21500);
await page.screenshot({ path: 'shots/t-complete.png' });
await page.click('#replay');
await page.waitForTimeout(100);
ok('Repetir reinicia', (await st(0)).t < 400);
// Selección de pieza por control accesible
await page.click('#full');
await page.click('[data-part="magnetron"]');
await page.waitForTimeout(1500);
ok('seleccionar pieza actualiza la nota', (await page.textContent('#text')).includes('Magnetrón'));
await page.screenshot({ path: 'shots/t-select.png' });
ok('Encuadrar se habilita con foco', !(await page.isDisabled('#reframe')));
await page.click('#reframe');
await page.waitForTimeout(200);
// Ampliar
await page.click('#zin');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/t-zoom.png' });
await page.click('#reframe');
// Exportar PNG de la sección
await page.click('#exportMenu summary');
const [d1] = await Promise.all([page.waitForEvent('download'), page.click('#expSection')]);
await d1.saveAs('shots/export-seccion.png');
ok('exporta PNG de la sección', d1.suggestedFilename() === 'microondas-mapa.png', d1.suggestedFilename());
await page.click('#exportMenu summary');
const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#expFinal')]);
await d2.saveAs('shots/export-final.png');
ok('exporta PNG de la lámina final', d2.suggestedFilename() === 'microondas-lamina-final.png');
// Gesto horizontal
const box = await page.locator('#stage').boundingBox();
await page.mouse.move(1000, 500);
await page.mouse.down();
await page.mouse.move(800, 505, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(300);
ok('deslizar hacia la izquierda avanza', (await idx()) === 1);
// Corte del magnetrón por control
await page.click('#full');
await page.click('[data-blk="magnetron"]');
await page.waitForTimeout(2600);
ok('abrir el corte del magnetrón', (await page.textContent('#text')).includes('Corte del magnetrón'));
await page.click('[data-arch="inv"]');
await page.waitForTimeout(200);
ok('cambiar a inverter', (await page.getAttribute('[data-arch="inv"]', 'aria-pressed')) === 'true');
// Capítulo 05: abrir la puerta
await page.click('#chapters button[data-go="4"]');
await page.click('#full');
await page.waitForTimeout(5000);
const rf = await page.textContent('[data-rf] b');
ok('al abrir, la RF queda detenida', rf.startsWith('detenida'), rf);
await page.click('[data-door="close"]');
await page.waitForTimeout(2600);
const rf2 = await page.textContent('[data-rf] b');
ok('al cerrar, no vuelve a emitir sola', rf2.includes('volver a encender'), rf2);
// Final: ciclo
await page.click('#chapters button[data-go="5"]');
await page.click('#full');
await page.click('[data-act="cycle"]');
await page.waitForTimeout(6000);
ok('ciclo completo avanza por pasos', /3 · Generar RF|2 · Activar/.test(await page.textContent('#text')), (await page.textContent('#text')).slice(0, 40));
await page.screenshot({ path: 'shots/t-cycle.png' });
// Fuentes
await page.click('#sources summary');
ok('desplegable de fuentes con enlaces', (await page.locator('#sources a').count()) >= 6);
ok('sin errores de JS (escritorio)', errs.length === 0, errs.join(' | '));

// Suspensión con pestaña oculta
await page.click('#sources summary');
await page.click('#chapters button[data-go="0"]');
await page.click('#replay');
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
const h1 = (await st(0)).t; await page.waitForTimeout(500); const h2 = (await st(0)).t;
ok('pestaña oculta suspende la animación', h1 === h2);

// Movimiento reducido
const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const rp = await rctx.newPage();
await rp.goto(url + '#viaje');
await rp.waitForTimeout(500);
const r = await rp.evaluate(() => { const s = window.__app.scenes[2]; return { t: s.t, dur: s.dur, paused: s.paused, idx: window.__app.idx }; });
ok('reduced-motion: abre completo y quieto', r.idx === 2 && r.t >= r.dur && r.paused, JSON.stringify(r));
await rp.screenshot({ path: 'shots/t-reduced.png' });

// Móvil táctil
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const mp = await mctx.newPage();
const merr = [];
mp.on('pageerror', (e) => merr.push(String(e)));
await mp.goto(url + '#alimento');
await mp.waitForTimeout(500);
await mp.evaluate(() => window.__app.complete());
await mp.waitForTimeout(400);
await mp.screenshot({ path: 'shots/t-mobile.png' });
const ov = await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
ok('móvil sin desborde horizontal', ov);
await mp.tap('#next');
await mp.waitForTimeout(300);
ok('móvil: botón siguiente', (await mp.evaluate(() => window.__app.idx)) === 4);
ok('sin errores de JS (móvil)', merr.length === 0, merr.join(' | '));

console.log(results.join('\n'));
await browser.close();
