/* تدريب «عقل دفتر»: بيولّد N جملة (افتراضي 25 مليون) من tests/gen-core.js بصيغ وأخطاء إملائية مختلفة،
   ويدرّب شبكة softmax على ملامح الحروف والكلمات (Hogwild متوازي على كل الأنوية)، ويقيسها على:
     1) جمل متولّدة جديدة ببذرة مختلفة (بأخطاء إملائية وبدونها)   2) الحالات المكتوبة بإيد (tests/parser-cases.json)
   وبيصدّر lib/brain-model.bin + lib/brain-lex.json
   التشغيل:  node tests/brain-train.cjs [N=25000000] [EPOCHS=1]                                       */
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path'), fs = require('fs'), os = require('os');
const B = require('../lib/brain-core.js');
const { makeGen } = require('./gen-core.js');
const { makeExtra } = require('./brain-extra.js');

/* label = نوع العملية (+ بند المصروف) من القيد الصح */
const EXPA = /^مصروف|^مصروفات متنوعة$/;
function labelOf(accept) {
  const al = accept.find(a => Array.isArray(a)) || accept[0];
  if (al === 'Q') return null; // ناقص معلومة: القواعد هي اللي بتسأل، مش شغل التصنيف if (al === 'NONE') return 'none';
  if (!Array.isArray(al)) return null;
  if (al.length > 1) return 'multi';
  const ks = Object.keys(al[0]), has = k => ks.includes(k);
  if (has('قروض بنكية')) return 'loan';
  if (has('مردودات المبيعات')) return 'ret';
  if (has('إيرادات المبيعات')) return 'sale';
  if (has('إيرادات خدمات')) return 'service';
  if (has('إيرادات أخرى')) return 'income';
  if (has('مجمع الإهلاك')) return 'deprec';
  if (has('أصول ثابتة')) return 'asset';
  if (has('المخزون')) return 'buy';
  if (has('رأس المال')) return 'capital';
  if (has('المسحوبات الشخصية')) return 'draw';
  if (has('سلف العاملين')) return 'advance';
  if (has('مصروفات مدفوعة مقدماً')) return 'prepaid';
  const ex = ks.find(k => EXPA.test(k)); if (ex) return 'exp:' + ex;
  if (has('العملاء')) return 'collect';
  if (has('الموردون')) return 'paysupp';
  if (has('النقدية بالبنك') && has('النقدية بالصندوق') && ks.length === 2) return 'move';
  return null;
}
/* typo augmentation: حروف بتتلخبط على الكيبورد / في النطق */
const NEAR = { 'ض': 'صظ', 'ص': 'ضس', 'ث': 'تسق', 'ق': 'كفغ', 'ف': 'قغ', 'غ': 'عف', 'ع': 'غا', 'ه': 'ةخ', 'خ': 'حه', 'ح': 'خج', 'ج': 'حد', 'د': 'ذج', 'ذ': 'دز', 'ش': 'سي', 'س': 'شصث', 'ي': 'ىب', 'ب': 'يل', 'ل': 'با', 'ا': 'لأ', 'ت': 'طن', 'ن': 'تم', 'م': 'نك', 'ك': 'مق', 'ط': 'تظ', 'ظ': 'طض', 'ز': 'رذ', 'ر': 'زو', 'و': 'ر', 'ة': 'ه', 'ى': 'ي' };
function typo(text, rnd) {
  const w = text.split(' '); const cand = w.map((x, i) => i).filter(i => /^[؀-ۿ]{4,}$/.test(w[i]));
  if (!cand.length) return text;
  const times = rnd() < .7 ? 1 : 2;
  for (let t = 0; t < times; t++) {
    const i = cand[Math.floor(rnd() * cand.length)], s = w[i], j = 1 + Math.floor(rnd() * (s.length - 1)), op = rnd();
    if (op < .3) w[i] = s.slice(0, j) + s.slice(j + 1);                                   // حذف حرف
    else if (op < .5 && j < s.length - 1) w[i] = s.slice(0, j) + s[j + 1] + s[j] + s.slice(j + 2); // تبديل جارين
    else if (op < .62) w[i] = s.slice(0, j) + s[j] + s.slice(j);                          // تكرار
    else { const n = NEAR[s[j]]; if (n) w[i] = s.slice(0, j) + n[Math.floor(rnd() * n.length)] + s.slice(j + 1); }
  }
  return w.join(' ');
}
/* paraphrase augmentation: مرادفات بنفس المعنى + حشو كلام + ترتيب مختلف (المعنى ما يتغيّرش فالـlabel ثابت) */
const SYN = [
  [/^(?:بعت|بعنا|بيعت)$/, ['بعت', 'بعنا', 'بيعت', 'بعتلهم', 'سلمت', 'طلعت', 'صرفت بضاعة']],
  [/^(?:اشتريت|اشترينا|جبت)$/, ['اشتريت', 'اشترينا', 'جبت', 'جبنا', 'خدت', 'اخدت', 'شريت']],
  [/^(?:دفعت|دفعنا)$/, ['دفعت', 'دفعنا', 'ادفعت', 'سددت', 'طلعت']],
  [/^(?:بضاعة|بضاعه|بضايع)$/, ['بضاعة', 'بضاعه', 'بضايع', 'حاجة', 'حاجات', 'منتجات', 'سلعة', 'طلبية']],
  [/^(?:كاش|نقدي|نقدا|نقداً)$/, ['كاش', 'نقدي', 'نقدا', 'كاش في ايدي', 'من الدرج', 'كاش علي طول']],
  [/^(?:آجل|اجل|بالآجل)$/, ['آجل', 'اجل', 'بالاجل', 'شكك', 'علي النوتة', 'ع الحساب']],
  [/^(?:الزبون|زبون)$/, ['الزبون', 'زبون', 'العميل', 'الراجل', 'الحاج']],
  [/^(?:المورد|مورد)$/, ['المورد', 'مورد', 'التاجر', 'تاجر الجملة', 'الشركة']],
];
const FILL_PRE = ['', '', '', 'يا دفتر ', 'سجل ', 'سجلي ', 'اكتب ', 'لو سمحت ', 'معلش ', 'النهارده ', 'امبارح ', 'الصبح ', 'بقولك ', 'خد عندك ', 'بص ', 'ياريت تسجل ', 'عايز اسجل ', 'ضيف '];
const FILL_POST = ['', '', '', ' النهارده', ' امبارح', ' يا معلم', ' الحمد لله', ' بالظبط', ' تقريبا', ' سجلها', ' والله', ' يعني', ' بس', ' كده'];
function para(text, rnd) {
  const pk = a => a[Math.floor(rnd() * a.length)];
  let w = text.split(' ').map(x => { if (rnd() > .5) return x; for (const [re, alts] of SYN) if (re.test(x)) return pk(alts); return x; }).join(' ');
  return (pk(FILL_PRE) + w + pk(FILL_POST)).replace(/\s+/g, ' ').trim();
}

/* قاموس المصحّح: كلمات التدريب + كلمات التطبيق نفسه، ومن غير الكلمات اللي هي غلطة إملائية لكلمة أشهر منها */
function buildLex() {
  const G = makeGen(424242), X2 = makeExtra(777), lex = {};
  const addW = (t, f = 1) => { for (const w of B.norm(t).split(' ')) if (/^[\u0600-\u06FF]{3,}$/.test(w)) lex[w] = (lex[w] || 0) + f; };
  for (let i = 0; i < 400000; i++) addW(i & 1 ? G.next()[1] : X2.next()[0]);
  for (const c of require('./parser-cases.json')) addW(c.text);
  const app = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').match(/[\u0600-\u06FF]{3,}/g) || [];
  const appW = new Set(app.map(w => B.norm(w)));
  let keep = Object.entries(lex).filter(([w, f]) => f >= 2 || appW.has(w));
  const freq = new Map(keep);
  keep = keep.filter(([w, f]) => { if (appW.has(w) && f < 50) return true; for (const [v, g] of freq) if (v !== w && g >= f * 20 && Math.abs(v.length - w.length) <= 1 && B.dist(v, w) === 1) return false; return true; });
  const out = Object.fromEntries(keep.sort((a, b) => b[1] - a[1]));
  for (const w of appW) if (!(w in out) && w.length >= 3) out[w] = 1;
  fs.writeFileSync(path.join(__dirname, '../lib/brain-lex.json'), JSON.stringify(out));
  console.log(`القاموس: ${Object.keys(out).length} كلمة`);
}
const LABELS = ['sale', 'buy', 'collect', 'paysupp', 'service', 'income', 'ret', 'capital', 'draw', 'move', 'loan', 'asset', 'deprec', 'advance', 'prepaid', 'multi', 'none',
  'exp:مصروف إيجار', 'exp:مصروف رواتب', 'exp:مصروف كهرباء ومياه', 'exp:مصروف إنترنت واتصالات', 'exp:مصروف نقل', 'exp:مصروف تسويق', 'exp:مصروف صيانة', 'exp:مصروف ضرائب ورسوم', 'exp:مصروف أدوات ومستلزمات', 'exp:مصروفات بنكية', 'exp:مصروف فوائد', 'exp:مصروفات متنوعة'];
const C = LABELS.length, LI = Object.fromEntries(LABELS.map((l, i) => [l, i]));

if (!isMainThread) {
  /* ---------------- worker: SGD Hogwild ---------------- */
  const { sab, bsab, n, seed, lr0, total, offset, l2 } = workerData;
  const W = new Float32Array(sab), bias = new Float32Array(bsab), G = makeGen(seed), X = makeExtra(seed ^ 0x5bd1e995), z = new Float32Array(C);
  const askIntent = t => /بعت|بيع/.test(t) ? 'sale' : /اشتريت/.test(t) ? 'buy' : /للمورد/.test(t) ? 'paysupp' : null;
  let loss = 0, cnt = 0, skipped = 0;
  for (let k = 0; k < n; k++) {
    let text, lab;
    if (X.rnd() < .45) [text, lab] = X.next(); else { const [, t, accept] = G.next(); text = t; lab = labelOf(accept) || (accept.includes('Q') ? askIntent(t) : null); }
    const y = LI[lab]; if (y === undefined) { skipped++; continue; }
    if (G.rnd() < .5) text = para(text, G.rnd);
    if (G.rnd() < .35) text = typo(text, G.rnd);
    const { idx, val } = B.features(text);
    z.fill(0); for (let q = 0; q < idx.length; q++) { const base = idx[q] * C, v = val[q]; for (let c = 0; c < C; c++) z[c] += W[base + c] * v; }
    let m = -1e9; for (let c = 0; c < C; c++) { z[c] += bias[c]; if (z[c] > m) m = z[c]; }
    let s = 0; for (let c = 0; c < C; c++) { z[c] = Math.exp(z[c] - m); s += z[c]; }
    for (let c = 0; c < C; c++) z[c] /= s;
    loss -= Math.log(z[y] + 1e-9); cnt++;
    const lr = lr0 * Math.max(.02, 1 - (offset + k) / total);
    z[y] -= 1;
    for (let q = 0; q < idx.length; q++) { const base = idx[q] * C, v = val[q] * lr; for (let c = 0; c < C; c++) { const g = z[c]; if (g > 1e-4 || g < -1e-4) W[base + c] -= v * g + l2 * W[base + c]; } }
    for (let c = 0; c < C; c++) bias[c] -= lr * .1 * z[c];
    if ((k & 0x3FFF) === 0x3FFF) { parentPort.postMessage({ prog: k + 1, loss: loss / cnt }); loss = 0; cnt = 0; }
  }
  parentPort.postMessage({ done: true, skipped });
} else if (require.main === module && process.argv.includes('--lex')) {
  buildLex();
} else if (require.main === module) {
  const N = +(process.argv[2] || 25e6), EPOCHS = 1, T = os.cpus().length;
  const sab = new SharedArrayBuffer(B.NB * C * 4), bsab = new SharedArrayBuffer(C * 4);
  const W = new Float32Array(sab), bias = new Float32Array(bsab);
  console.log(`تدريب على ${N.toLocaleString()} جملة — ${C} فئة، ${B.NB.toLocaleString()} ملمح، ${T} خيوط`);
  const t0 = Date.now(), prog = new Array(T).fill(0), losses = new Array(T).fill(0); let lastLog = 0;
  (async () => {
    await Promise.all(Array.from({ length: T }, (_, t) => new Promise((res, rej) => {
      const n = Math.floor(N / T);
      const w = new Worker(__filename, { workerData: { sab, bsab, n, seed: 1000003 + t * 7777, lr0: 0.5, total: n, offset: 0, l2: 0 } });
      w.on('message', m => {
        if (m.prog) { prog[t] = m.prog; losses[t] = m.loss; const done = prog.reduce((a, b) => a + b, 0); if (done - lastLog > 1e6) { lastLog = done; process.stderr.write(`  ${done.toLocaleString()}  loss ${(losses.reduce((a, b) => a + b, 0) / T).toFixed(4)}  (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`); } }
        if (m.done) res();
      });
      w.on('error', rej);
    })));
    console.log(`خلص التدريب في ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    /* quantize: int8 per class scale */
    const scale = new Float32Array(C), Q = new Int8Array(B.NB * C);
    for (let c = 0; c < C; c++) { let mx = 0; for (let i = 0; i < B.NB; i++) mx = Math.max(mx, Math.abs(W[i * C + c])); scale[c] = mx / 127 || 1; }
    for (let i = 0; i < B.NB; i++) for (let c = 0; c < C; c++) Q[i * C + c] = Math.max(-127, Math.min(127, Math.round(W[i * C + c] / scale[c])));
    const model = { labels: LABELS, C, W: Q, scale, bias: Float32Array.from(bias) };
    /* export: header JSON (labels, scale, bias) + int8 body */
    const head = Buffer.from(JSON.stringify({ v: 1, bits: B.BITS, labels: LABELS, scale: Array.from(scale), bias: Array.from(model.bias) }));
    const hl = Buffer.alloc(4); hl.writeUInt32LE(head.length);
    fs.writeFileSync(path.join(__dirname, '../lib/brain-model.bin'), Buffer.concat([hl, head, Buffer.from(Q.buffer)]));
    buildLex();
    /* evaluation */
    const ev = (name, it) => { let ok = 0, n = 0, top3 = 0; const conf = {}; for (const [text, lab] of it) { const y = labelOf(lab) ?? lab; if (!(y in LI)) continue; const p = B.predict(model, text, 3); n++; if (p[0].label === y) ok++; else { const k = y + ' → ' + p[0].label; conf[k] = (conf[k] || 0) + 1; } if (p.some(x => x.label === y)) top3++; } console.log(`${name.padEnd(34)} ${ok}/${n}  ${(ok / n * 100).toFixed(2)}%   (ضمن أول 3: ${(top3 / n * 100).toFixed(2)}%)`); return Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 8); };
    const held = (seed, ty, n) => { const G2 = makeGen(seed), out = []; for (let i = 0; i < n; i++) { let [, t, a] = G2.next(); if (ty) t = typo(t, G2.rnd); out.push([t, a]); } return out; };
    ev('متولّد جديد (بذرة مختلفة)', held(99991, false, 100000));
    const c2 = ev('متولّد جديد + أخطاء إملائية', held(99992, true, 100000));
    const c3 = ev('مكتوبة بإيد (من غير حالات «ناقص معلومة»)', require('./parser-cases.json').filter(c => labelOf(c.accept)).map(c => [c.text, c.accept]));
    console.log('أكتر لخبطة (أخطاء إملائية):', c2); console.log('أكتر لخبطة (بإيد):', c3);
    console.log('حجم الموديل', fs.statSync(path.join(__dirname, '../lib/brain-model.bin')).size.toLocaleString(), 'بايت');
  })().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { labelOf, typo, LABELS };
