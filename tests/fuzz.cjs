/* اختبار المليون: مولّد جمل عشوائي (بذرة ثابتة) بيركّب عمليات بصيغ وأرقام وأسماء وطرق دفع مختلفة،
   وكل جملة معروف قيدها الصح مسبقاً. بيشغّلها على parseLocal جوه المتصفح ويطلّع نسبة النجاح وعيّنات الفشل.
   التشغيل:  node tests/fuzz.cjs [عدد الجمل=1000000] [البذرة=1]   (PAR=عدد الصفحات المتوازية، افتراضي عدد الأنوية)                                    */
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const ROOT = path.join(__dirname, '..');
const N = +(process.argv[2] || 1000000), SEED = +(process.argv[3] || 1), CHUNK = 20000;
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.bin': 'application/octet-stream' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });

/* ---- runs inside the page ---- */
function pageFuzz(count, seed) {
  const G = makeGen(seed); const r2 = v => Math.round(v * 100) / 100;
  const net = e => { const d = {}; for (const l of e.lines) d[l.account] = r2((d[l.account] || 0) + l.debit - l.credit); for (const k of Object.keys(d)) if (Math.abs(d[k]) < 0.005) delete d[k]; return d; };
  const same = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => k in b && Math.abs(a[k] - b[k]) < 0.011); };
  const stats = {}, fails = {}, wrongs = {};
  for (let n = 0; n < count; n++) {
    const [kind, text, accept] = G.next();
    const r = window.__daftar.parseLocal(text), got = r.entries.map(net);
    let ok, silent = false;
    if (got.length) { ok = !r.questions.length && accept.some(al => Array.isArray(al) && al.length === got.length && got.every(g => al.some(q => same(g, q)))); silent = !ok && !r.entries.some(e => e._warn) && !r.questions.length; }
    else if (r.questions.length) ok = accept.includes('Q'); else ok = accept.includes('NONE');
    const st = stats[kind] = stats[kind] || [0, 0, 0]; st[1]++; if (ok) st[0]++; else { if (silent) st[2]++; const f = fails[kind] = fails[kind] || []; if (f.length < 12) f.push([text, got, r.questions.length ? 'Q' : '']); if (silent) { const w = wrongs[kind] = wrongs[kind] || []; if (w.length < 12) w.push([text, got]); } }
  }
  return { stats, fails, wrongs, seed: G.seed };
}

srv.listen(0, async () => {
  const port = srv.address().port; let browser;
  try {
    const PAR = Math.max(1, +(process.env.PAR || require('os').cpus().length));
    browser = await chromium.launch();
    const tot = {}, fails = {}, wrongs = {}; let done = 0, lastLog = 0; const t0 = Date.now();
    const share = k => Math.floor(N / PAR) + (k < N % PAR ? 1 : 0);
    await Promise.all(Array.from({ length: PAR }, async (_, k) => {
      const pg = await browser.newPage();
      await pg.goto(`http://localhost:${port}/`); await pg.waitForFunction(() => window.__daftar); await pg.evaluate(() => window.__daftar.brainLoad && window.__daftar.brainLoad());
      await pg.addScriptTag({ content: fs.readFileSync(path.join(__dirname, 'gen-core.js'), 'utf8') + '\n' + pageFuzz.toString() });
      let seed = PAR === 1 ? SEED : SEED * 7919 + k * 104729, mine = share(k), d = 0;
      while (d < mine) {
        const n = Math.min(CHUNK, mine - d); const r = await pg.evaluate(([n, seed]) => pageFuzz(n, seed), [n, seed]); seed = r.seed; d += n; done += n;
        for (const [kk, [p, a, w]] of Object.entries(r.stats)) { const t = tot[kk] = tot[kk] || [0, 0, 0]; t[0] += p; t[1] += a; t[2] += w; }
        for (const [kk, v] of Object.entries(r.fails)) { fails[kk] = (fails[kk] || []).concat(v).slice(0, 12); }
        for (const [kk, v] of Object.entries(r.wrongs)) { wrongs[kk] = (wrongs[kk] || []).concat(v).slice(0, 12); }
        if (done - lastLog >= 500000 || done === N) { lastLog = done; process.stderr.write(`  ${done.toLocaleString()} / ${N.toLocaleString()}  (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`); }
      }
      await pg.close();
    }));
    let P = 0, A = 0, Wr = 0;
    for (const [k, [p, a, w]] of Object.entries(tot).sort()) { P += p; A += a; Wr += w; console.log(`${k.padEnd(9)} ${String(p).padStart(7)}/${String(a).padEnd(7)} ${(p / a * 100).toFixed(3)}%  غلط صامت: ${w}`); }
    console.log(`TOTAL     ${P}/${A}  ${(P / A * 100).toFixed(4)}%   غلط صامت: ${Wr}   (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    if (process.argv.includes('--show')) for (const [k, v] of Object.entries(fails)) { console.log('\n--', k); v.slice(0, +(process.env.SHOW || 6)).forEach(f => console.log('  FAIL', f[0], JSON.stringify(f[1]), f[2])); }
    process.exitCode = P === A ? 0 : 1;
  } catch (e) { console.error(e); process.exitCode = 2; } finally { if (browser) await browser.close(); srv.close(); }
});
