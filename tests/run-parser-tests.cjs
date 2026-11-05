/* اختبار منطق دفتر: بيشغّل كل جملة في parser-cases.json على parseLocal جوه المتصفح ويقارن القيد.
   التشغيل:  node tests/run-parser-tests.cjs        (محتاج playwright: npm i -D playwright)
   كل جملة ليها «accept»: قايمة إجابات مقبولة. الإجابة إما مجموعة قيود (حساب → صافي مدين+/دائن−)، أو "Q" (سؤال)، أو "NONE" (مش عملية). */
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const ROOT = path.join(__dirname, '..');
const cases = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, 'parser-cases.json'), 'utf8'));
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
});
const net = e => { const d = {}; for (const [a, dr, cr] of e) d[a] = (d[a] || 0) + dr - cr; for (const k of Object.keys(d)) if (Math.abs(d[k]) < 0.005) delete d[k]; return d; };
const same = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => k in b && Math.abs(a[k] - b[k]) < 0.01); };
srv.listen(0, async () => {
  const port = srv.address().port; let browser;
  try {
    browser = await chromium.launch(); const pg = await browser.newPage();
    await pg.goto(`http://localhost:${port}/`); await pg.waitForFunction(() => window.__daftar);
    const outs = await pg.evaluate(ts => ts.map(t => { const r = window.__daftar.parseLocal(t); return { e: r.entries.map(e => e.lines.map(l => [l.account, l.debit, l.credit])), q: r.questions.length, warn: r.entries.some(e => e._warn) }; }), cases.map(c => c.text));
    const fails = []; const byLvl = {};
    cases.forEach((c, i) => {
      const o = outs[i], got = o.e.map(net); let ok;
      if (got.length) ok = !o.q && c.accept.some(alt => Array.isArray(alt) && alt.length === got.length && got.every(g => alt.some(x => same(g, x))));
      else if (o.q) ok = c.accept.includes('Q');
      else ok = c.accept.includes('NONE');
      const L = byLvl[c.level] = byLvl[c.level] || [0, 0]; L[1]++; if (ok) L[0]++; else fails.push({ text: c.text, got, asked: !!o.q });
    });
    for (const [k, [p, n]] of Object.entries(byLvl)) console.log(`${k.padEnd(7)} ${p}/${n}`);
    console.log(`TOTAL   ${cases.length - fails.length}/${cases.length}`);
    for (const f of fails) console.log('FAIL', f.text, JSON.stringify(f.got), f.asked ? '(asked)' : '');
    process.exitCode = fails.length ? 1 : 0;
  } catch (e) { console.error(e); process.exitCode = 2; }
  finally { if (browser) await browser.close(); srv.close(); }
});
