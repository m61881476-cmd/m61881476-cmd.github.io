/* اختبار المليون: مولّد جمل عشوائي (بذرة ثابتة) بيركّب عمليات بصيغ وأرقام وأسماء وطرق دفع مختلفة،
   وكل جملة معروف قيدها الصح مسبقاً. بيشغّلها على parseLocal جوه المتصفح ويطلّع نسبة النجاح وعيّنات الفشل.
   التشغيل:  node tests/fuzz.cjs [عدد الجمل=1000000] [البذرة=1]                                    */
const { chromium } = require('playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const ROOT = path.join(__dirname, '..');
const N = +(process.argv[2] || 1000000), SEED = +(process.argv[3] || 1), CHUNK = 20000;
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); });

/* ---- runs inside the page ---- */
function pageFuzz(count, seed) {
  let s = seed >>> 0; const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)], chance = p => rnd() < p, ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const C = 'النقدية بالصندوق', B = 'النقدية بالبنك', AR = 'العملاء', AP = 'الموردون', INV = 'المخزون', S = 'إيرادات المبيعات', SV = 'إيرادات خدمات', FA = 'أصول ثابتة',
    CAP = 'رأس المال', DR = 'المسحوبات الشخصية', LN = 'قروض بنكية', VO = 'ضريبة القيمة المضافة - مخرجات', VI = 'ضريبة القيمة المضافة - مدخلات', COGS = 'تكلفة المبيعات', SRET = 'مردودات المبيعات';
  const r2 = v => Math.round(v * 100) / 100;
  const E = (...p) => { const d = {}; for (let i = 0; i < p.length; i += 2) d[p[i]] = r2((d[p[i]] || 0) + p[i + 1]); return d; };
  /* number → Egyptian words */
  const U = ['', 'واحد', 'اتنين', 'تلاتة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'تمانية', 'تسعة', 'عشرة', 'حداشر', 'اتناشر', 'تلتاشر', 'أربعتاشر', 'خمستاشر', 'ستاشر', 'سبعتاشر', 'تمنتاشر', 'تسعتاشر'];
  const T = ['', '', 'عشرين', 'تلاتين', 'أربعين', 'خمسين', 'ستين', 'سبعين', 'تمانين', 'تسعين'];
  const H = ['', 'مية', 'ميتين', 'تلتمية', 'ربعمية', 'خمسمية', 'ستمية', 'سبعمية', 'تمنمية', 'تسعمية'];
  const TH = ['', 'ألف', 'ألفين', 'تلت آلاف', 'أربع آلاف', 'خمس آلاف', 'ست آلاف', 'سبع آلاف', 'تمن آلاف', 'تسع آلاف', 'عشر آلاف'];
  const THF = { 3: 'تلتلاف', 4: 'أربعتلاف', 5: 'خمستلاف', 6: 'ستلاف', 7: 'سبعتلاف', 8: 'تمنتلاف', 9: 'تسعتلاف', 10: 'عشرتلاف' };
  const sub100 = n => n < 20 ? U[n] : n % 10 ? `${U[n % 10]} و${T[n / 10 | 0]}` : T[n / 10 | 0];
  const sub1000 = n => { const h = n / 100 | 0, r = n % 100; return [H[h], r ? sub100(r) : ''].filter(Boolean).join(' و'); };
  function words(v) {
    if (v >= 1e6) { const m = v / 1e6; if (m === 1) return 'مليون'; if (m === 1.5) return 'مليون ونص'; if (m === 2) return '2 مليون'; return null; }
    const k = v / 1000 | 0, r = v % 1000; let out = '';
    if (k) out = k <= 10 ? (THF[k] && chance(.4) ? THF[k] : TH[k]) : `${sub1000(k)} ألف`;
    if (k && r === 500 && chance(.6)) return out + ' ونص';
    if (r) out = out ? `${out} و${sub1000(r)}` : sub1000(r);
    return out;
  }
  const ARD = s0 => s0.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  function amt(max) {
    const kind = rnd(); let v;
    if (kind < .3) v = ri(1, 99) * 10; else if (kind < .65) v = ri(2, 199) * 50; else if (kind < .85) v = ri(1, 300) * 1000; else if (kind < .93) v = ri(11, 9999); else v = pick([1500, 2500, 3500, 250, 750, 1e6, 1.5e6, 12500, 150000]);
    if (max && v > max) v = ri(1, max / 10 | 0) * 10 || 10;
    const f = rnd(); let t;
    if (f < .34) t = String(v); else if (f < .46 && v >= 1000) t = v.toLocaleString('en-US'); else if (f < .58) t = ARD(String(v)); else if (f < .7 && v >= 1000 && v % 1000 === 0 && v < 1e6) t = `${v / 1000} ألف`; else if (f < .76 && v >= 1000 && v % 500 === 0 && v < 1e6) t = `${v / 1000} ألف`; else { t = (v % 10 === 0 || v < 100 || v % 1000 < 100 && false) ? words(v) : null; if (!t || v % 10) t = String(v); }
    if (chance(.04) && /^\d+$/.test(t) && v < 100000) { v = r2(v + pick([.5, .25, .75])); t = String(v); }
    return { v, t: t + (chance(.2) ? pick([' جنيه', ' جنيه', ' ج', ' ج.م', ' جنيه مصري']) : '') };
  }
  const PRE = () => pick(['بـ ', 'ب ', 'بـ', 'بمبلغ ', 'بقيمة ', 'بـ ']);
  const LEAD = () => chance(.2) ? pick(['النهارده ', 'امبارح ', 'يا باشا ', 'والله ', 'الحمد لله ', 'الصبح ', 'أول امبارح ', 'بص يا دفتر ', 'سجل عندك ', 'يا ريس ', 'انهارده ']) : '';
  const TAIL = () => chance(.12) ? pick([' النهارده', ' امبارح', ' والحمد لله', ' الصبح', ' يوم 5', ' أول امبارح', ' يوم 12', ' 15/9', ' 3 أكتوبر', '.', ' الأسبوع اللي فات', ' بالليل']) : '';
  const NAMES = ['محمد', 'أحمد', 'حسن', 'كريم', 'سيد', 'مصطفى', 'طارق', 'هاني', 'مينا', 'عمرو', 'الحاج سيد', 'أم حسن', 'الأستاذ كريم', 'المعلم رضا', 'مدام منى', 'محمد حسن', 'أحمد علي'];
  const ORGS = ['شركة النيل', 'شركة الأمل', 'مطعم الشرق', 'صيدلية الشفا', 'مؤسسة النور', 'مصنع الهدى'];
  const L = (who, pre = 'ل') => (pre === 'ل' ? (/^ال/.test(who) ? 'لل' + who.slice(2) : 'ل' + who) : pre + ' ' + who).replace(/^لأ/, 'لأ');
  const CASH_IN = ['كاش', 'نقدي', 'نقدا', 'نقداً', 'كاش في الدرج'], BANK_IN = ['تحويل', 'تحويل بنكي', 'انستاباي', 'بالفيزا', 'على البنك', 'في البنك', 'فيزا'], CRED = ['على الحساب', 'آجل', 'بالآجل', 'شكك', 'على النوتة', 'ع الحساب'];
  const CASH_OUT = ['كاش', 'نقدي', 'نقدا', 'من الدرج', 'كاش من الدرج', 'من الخزنة'], BANK_OUT = ['من البنك', 'تحويل', 'تحويل بنكي', 'بالفيزا', 'فيزا', 'انستاباي'], CRED_OUT = ['على الحساب', 'آجل', 'بالآجل', 'والفلوس عليا', 'شكك'];
  const meth = dir => { const m = pick(['cash', 'bank']); return { m, acc: m === 'cash' ? C : B, w: pick(dir === 'in' ? (m === 'cash' ? CASH_IN : BANK_IN) : (m === 'cash' ? CASH_OUT : BANK_OUT)) }; };
  const EXP = {
    'مصروف إيجار': ['إيجار المحل', 'الإيجار', 'إيجار المخزن', 'إيجار الشهر', 'ايجار', 'إيجار'],
    'مصروف رواتب': ['المرتبات', 'مرتبات العمال', 'مرتب العامل', 'رواتب الموظفين', 'يومية العمال', 'أجور العمال', 'مرتب الكاشير', 'حوافز العمال', 'مرتبات'],
    'مصروف كهرباء ومياه': ['الكهربا', 'فاتورة الكهربا', 'فاتورة الكهرباء', 'فاتورة المية', 'فاتورة المياه', 'فاتورة الغاز', 'كهربا'],
    'مصروف إنترنت واتصالات': ['النت', 'فاتورة النت', 'باقة النت', 'الانترنت', 'فاتورة التليفون', 'فاتورة الموبايل', 'نت'],
    'مصروف نقل': ['بنزين', 'سولار', 'نقل البضاعة', 'مصاريف شحن', 'مواصلات', 'تاكسي', 'أجرة التاكسي', 'نولون', 'ميكروباص'],
    'مصروف تسويق': ['إعلان على فيسبوك', 'إعلانات', 'دعاية', 'إعلان ممول', 'بروشورات', 'تسويق'],
    'مصروف صيانة': ['صيانة التكييف', 'تصليح التلاجة', 'صيانة', 'تصليح الباب', 'صيانة الكمبيوتر'],
    'مصروف ضرائب ورسوم': ['ضرايب', 'رسوم الترخيص', 'التأمينات', 'دمغة', 'مخالفة', 'غرامة'],
    'مصروفات متنوعة': ['شاي وقهوة', 'ضيافة', 'بوفيه'],
  };
  const EXPK = Object.keys(EXP), SHORT = { 'مصروف إيجار': ['إيجار', 'الإيجار'], 'مصروف رواتب': ['مرتبات', 'المرتبات'], 'مصروف كهرباء ومياه': ['كهربا', 'الكهربا'], 'مصروف إنترنت واتصالات': ['نت', 'النت'], 'مصروف نقل': ['نقل', 'مواصلات', 'بنزين'], 'مصروف تسويق': ['إعلانات', 'دعاية'], 'مصروف صيانة': ['صيانة'] };
  const SUP = ['أكياس', 'منظفات', 'أدوات مكتبية', 'مستلزمات تغليف', 'ورق طباعة'], FIX = ['لابتوب', 'تلاجة عرض', 'تكييف', 'طابعة', 'رفوف', 'كاميرات', 'ميزان', 'ماكينة'];
  const SC = {
    sale() { const a = amt(), k = pick(['cash', 'bank', 'credit']), w = pick(k === 'cash' ? CASH_IN : k === 'bank' ? BANK_IN : CRED); const who = k === 'credit' ? (chance(.75) ? pick(NAMES.concat(ORGS)) : '') : (chance(.15) ? pick(NAMES) : ''); const verb = pick(['بعت', 'بعنا', 'بعت', 'بيع', 'تم بيع', 'قمت ببيع']), obj = pick(['بضاعة', 'بضايع', 'بضاعه', 'منتجات', 'بضاعة']);
      const f = rnd(); let t = f < .5 ? `${verb} ${obj}${who ? ' ' + L(who) : ''} ${PRE()}${a.t} ${w}` : f < .8 && who ? `${verb} ${L(who)} ${obj} ${PRE()}${a.t} ${w}` : `${verb} ${obj} ${w} ${PRE()}${a.t}${who ? ' ' + L(who) : ''}`;
      return [LEAD() + t + TAIL(), [[E(k === 'cash' ? C : k === 'bank' ? B : AR, a.v, S, -a.v)]]]; },
    buy() { const a = amt(), k = pick(['cash', 'bank', 'credit']), w = pick(k === 'cash' ? CASH_OUT : k === 'bank' ? BANK_OUT : CRED_OUT); const frm = chance(.4) ? ' من ' + pick(ORGS.concat(['المورد', 'تاجر الجملة'])) : ''; const verb = pick(['اشتريت', 'اشترينا', 'جبت', 'جبنا', 'شراء', 'تم شراء', 'قمت بشراء']), obj = pick(['بضاعة', 'بضايع', 'خامات', 'بضاعة للمحل', 'طلبية بضاعة']);
      return [LEAD() + `${verb} ${obj}${frm} ${PRE()}${a.t} ${w}` + TAIL(), [[E(INV, a.v, k === 'cash' ? C : k === 'bank' ? B : AP, -a.v)]]]; },
    exp() { const a = amt(400000), acc = pick(EXPK), what = pick(EXP[acc]), M = meth('out'), verb = pick(['دفعت', 'دفعنا', 'سددت', 'دفعت', 'صرفت']); const f = rnd();
      const t = f < .45 ? `${verb} ${what} ${a.t} ${M.w}` : f < .7 ? `${verb} ${a.t} ${what} ${M.w}` : f < .85 ? `${verb} ${what} ${PRE()}${a.t} ${M.w}` : `تم سداد ${what} بمبلغ ${a.t} ${M.w}`;
      return [LEAD() + t + TAIL(), [[E(acc, a.v, M.acc, -a.v)]]]; },
    supplies() { const a = amt(50000), M = meth('out'); return [`اشتريت ${pick(SUP)} ${PRE()}${a.t} ${M.w}`, [[E('مصروف أدوات ومستلزمات', a.v, M.acc, -a.v)]]]; },
    asset() { const a = amt(), k = pick(['cash', 'bank', 'credit']), w = pick(k === 'cash' ? CASH_OUT : k === 'bank' ? BANK_OUT : ['تقسيط', 'على الحساب', 'آجل']); return [`${pick(['اشتريت', 'جبت', 'اشترينا'])} ${pick(FIX)}${chance(.5) ? ' للمحل' : ''} ${PRE()}${a.t} ${w}`, [[E(FA, a.v, k === 'cash' ? C : k === 'bank' ? B : AP, -a.v)]]]; },
    collect() { const a = amt(), M = meth('in'), p = pick(NAMES.concat(ORGS)); const f = rnd();
      const t = f < .3 ? `حصلت من ${p} ${a.t} ${M.w}` : f < .5 ? `استلمت من ${p} ${a.t} ${M.w}` : f < .65 ? `قبضت من ${p} ${a.t} ${M.w}` : f < .8 ? `${p} سدد ${a.t} ${M.w}` : f < .9 ? `${p} دفع ${a.t} ${M.w} من اللي عليه` : `تحصيل ${a.t} من ${p} ${M.w}`;
      return [LEAD() + t, [[E(M.acc, a.v, AR, -a.v)]]]; },
    paysupp() { const a = amt(), M = meth('out'), p = pick(ORGS.slice(0, 2).concat(['المورد', 'مصنع الهدى'])); return [LEAD() + pick([`دفعت ${L(p)} ${a.t} ${M.w}`, `سددت ${L(p)} ${a.t} ${M.w}`, `دفعت ${a.t} ${L(p)} ${M.w}`]), [[E(AP, a.v, M.acc, -a.v)]]]; },
    capital() { const a = amt(), m = pick(['cash', 'bank']); return [pick([`حطيت ${a.t} رأس مال ${m === 'cash' ? 'كاش' : 'في البنك'}`, `زودت رأس المال ${a.t} ${m === 'cash' ? 'كاش' : 'في البنك'}`, `بدأت برأس مال ${a.t} ${m === 'cash' ? 'كاش' : 'في البنك'}`]), [[E(m === 'cash' ? C : B, a.v, CAP, -a.v)]]]; },
    draw() { const a = amt(200000), m = pick(['cash', 'bank']), src = m === 'cash' ? pick(['من الدرج', 'من الخزنة', 'كاش']) : 'من البنك'; return [pick([`خدت ${a.t} ${src} للبيت`, `سحبت ${a.t} ${src} لمصاريف البيت`, `سحبت ${a.t} ${src} لنفسي`, `خدت ${a.t} ${src} لمصروفي`]), [[E(DR, a.v, m === 'cash' ? C : B, -a.v)]]]; },
    move() { const a = amt(); return chance(.5) ? [pick([`أودعت ${a.t} في البنك`, `نزلت ${a.t} من الدرج للبنك`, `حطيت ${a.t} من الخزنة في البنك`, `تم إيداع ${a.t} بالبنك`]), [[E(B, a.v, C, -a.v)]]] : [pick([`سحبت ${a.t} من البنك للدرج`, `سحبت ${a.t} كاش من البنك`, `سحبت ${a.t} من البنك للخزنة`]), [[E(C, a.v, B, -a.v)]]]; },
    split() { const v = ri(2, 400) * 100, fr = pick([['نصها', .5], ['ربعها', .25], ['تلتها', 1 / 3], ['نصهم', .5]]); const first = r2(v * fr[1]), rest = r2(v - first);
      if (chance(.5)) return [`بعت بضاعة ${PRE()}${v} ${fr[0]} كاش والباقي ${pick(['على الحساب', 'آجل'])}`, [[E(C, first, AR, rest, S, -v)]]];
      if (chance(.5)) return [`اشتريت بضاعة ${PRE()}${v} ${fr[0]} كاش والباقي ${pick(['على الحساب', 'آجل'])}`, [[E(INV, v, C, -first, AP, -rest)]]];
      const p1 = ri(1, v / 100 - 1) * 100; return chance(.5) ? [`بعت بضاعة ${PRE()}${v}، ${p1} كاش والباقي على الحساب`, [[E(C, p1, AR, v - p1, S, -v)]]] : [`اشتريت بضاعة ${PRE()}${v} دفعت ${p1} ${pick(['كاش', 'من البنك'])} والباقي آجل`, [[E(INV, v, C, -p1, AP, -(v - p1))], [E(INV, v, B, -p1, AP, -(v - p1))]]]; },
    list() { const k = ri(2, 4), accs = []; while (accs.length < k) { const a = pick(Object.keys(SHORT)); if (!accs.includes(a)) accs.push(a); } const vals = accs.map(() => ri(2, 180) * 50), m = pick(['cash', 'bank']), acc = m === 'cash' ? C : B;
      const parts = accs.map((a, i) => `${pick(SHORT[a])} ${chance(.2) ? ARD(String(vals[i])) : vals[i]}`), sep = pick([' و', ' و ', '، ']), tail = m === 'cash' ? pick(['كله كاش', 'كلهم كاش', 'كاش']) : pick(['كله من البنك', 'كلهم من البنك']);
      return [`دفعت ${parts.join(sep)} ${tail}`, [accs.map((a, i) => E(a, vals[i], acc, -vals[i]))]]; },
    qty() { const q = ri(2, 60), p = ri(1, 200) * 5, u = pick([['كراتين', 'الكرتونة'], ['قطع', 'القطعة'], ['علب', 'العلبة'], ['شكاير', 'الشيكارة'], ['كيلو', 'الكيلو']]), M = meth('in'); const unit = chance(.25) ? pick(['الواحدة', 'الواحد']) : u[1];
      return chance(.6) ? [`بعت ${q} ${u[0]} ${unit} بـ ${p} ${M.w}`, [[E(M.acc, q * p, S, -q * p)]]] : [`اشتريت ${q} ${u[0]} ${unit} بـ ${p} ${pick(['على الحساب', 'آجل'])}`, [[E(INV, q * p, AP, -q * p)]]]; },
    vat() { const net = ri(1, 500) * 100, vat = r2(net * .14), M = meth('in');
      if (chance(.5)) return [`بعت بضاعة بـ ${r2(net + vat)} شامل الضريبة ${M.w}`, [[E(M.acc, r2(net + vat), S, -net, VO, -vat)]]];
      return chance(.5) ? [`بعت بضاعة بـ ${net} + ضريبة 14% ${M.w}`, [[E(M.acc, r2(net + vat), S, -net, VO, -vat)]]] : [`اشتريت بضاعة بـ ${net} + الضريبة ${pick(['من البنك', 'كاش'])}`, [[E(INV, net, VI, vat, B, -r2(net + vat))], [E(INV, net, VI, vat, C, -r2(net + vat))]]]; },
    cogs() { const v = ri(5, 400) * 100, c = r2(v * pick([.6, .7, .8])), M = meth('in'); return [`بعت بضاعة بـ ${v} ${M.w} ${pick(['تكلفتها', 'والتكلفة', 'بتكلفة'])} ${c}`, [[E(M.acc, v, S, -v, COGS, c, INV, -c)]]]; },
    loan() { const a = amt(); if (chance(.4)) return [pick([`أخدت قرض من البنك ${a.t}`, `استلمت قرض ${a.t} في البنك`, `خدت قرض ${a.t} من البنك`]), [[E(B, a.v, LN, -a.v)]]];
      const v = ri(10, 200) * 100, i = ri(1, 9) * 100; return chance(.5) ? [`دفعت قسط القرض ${v} من البنك`, [[E(LN, v, B, -v)]]] : [`دفعت قسط القرض ${v} منهم ${i} فوايد من البنك`, [[E(LN, v - i, 'مصروف فوائد', i, B, -v)]]]; },
    ret() { const a = amt(50000); return chance(.5) ? [pick([`الزبون رجع بضاعة بـ ${a.t} ورجعتله فلوسه كاش`, `العميل رجع بضاعة بـ ${a.t} ورجعتله كاش`]), [[E(SRET, a.v, C, -a.v)]]] : [pick([`العميل رجع بضاعة بـ ${a.t} وخصمتها من حسابه`, `عميل رجع بضاعة بـ ${a.t} وخصمتها من حسابه`]), [[E(SRET, a.v, AR, -a.v)]]]; },
    service() { const a = amt(100000), M = meth('in'); return [pick([`قبضت ${a.t} أتعاب تصميم ${M.w}`, `عملت صيانة لعميل وقبضت ${a.t} ${M.w}`, `قبضت ${a.t} استشارة ${M.w}`, `بعت خدمة تركيب لعميل بـ ${a.t} ${M.w}`]), [[E(M.acc, a.v, SV, -a.v)]]]; },
    advance() { const a = amt(20000), M = meth('out'); return [pick([`اديت سلفة للعامل ${a.t} ${M.w}`, `سلفة للصنايعي ${a.t} ${M.w}`]), [[E('سلف العاملين', a.v, M.acc, -a.v)]]]; },
    deprec() { const a = amt(50000); return [`إهلاك ${pick(['العربية', 'المعدات', 'الأجهزة', 'الأثاث'])} ${a.t}`, [[E('مصروف إهلاك', a.v, 'مجمع الإهلاك', -a.v)]]]; },
    bank() { const v = ri(1, 60) * 5; return chance(.5) ? [pick([`البنك خصم عمولة ${v}`, `البنك خصم مصاريف ${v}`, `البنك خصم عمولة تحويل ${v}`, `البنك خصم رسوم ${v}`]), [[E('مصروفات بنكية', v, B, -v)]]] : chance(.5) ? [`البنك خصم ${pick(['فوائد', 'فوايد القرض'])} ${v * 10}`, [[E('مصروف فوائد', v * 10, B, -v * 10)]]] : [`البنك ضاف فوايد ${v * 10} على حسابي`, [[E(B, v * 10, 'إيرادات أخرى', -v * 10)]]]; },
    two() { const a = amt(), b = ri(1, 80) * 50, M = meth('in'); const acc = pick(['مصروف نقل', 'مصروف إيجار', 'مصروف كهرباء ومياه']), what = { 'مصروف نقل': 'نقل', 'مصروف إيجار': 'الإيجار', 'مصروف كهرباء ومياه': 'الكهربا' }[acc];
      return [`بعت بضاعة ${PRE()}${a.t} ${M.w} ودفعت ${what} ${b} كاش`, [[E(M.acc, a.v, S, -a.v), E(acc, b, C, -b)]]]; },
    none() { const a = amt(); return [pick([`هبيع بضاعة بكرة بـ ${a.t}`, `كسبت كام الشهر ده؟`, `لو بعت بضاعة بـ ${a.t} هكسب كام؟`, `ما دفعتش الإيجار لسه`, `هدفع الإيجار ${a.t} بكرة`, `ناوي أشتري بضاعة بـ ${a.t}`, `كام رصيد الدرج؟`, `مين عليه فلوس؟`, 'صباح الخير', 'شكرا', `هشتري بضاعة الأسبوع الجاي بـ ${a.t}`, `عايز أعرف مصاريفي`]), ['NONE', 'Q']]; },
    ask() { const a = amt(); return [pick([`بعت بضاعة بـ ${a.t}`, `اشتريت بضاعة بـ ${a.t}`, `دفعت ${a.t}`, 'بعت بضاعة كاش', 'دفعت للمورد', 'اشتريت بضاعة', `قبضت ${a.t}`]), ['Q']]; },
  };
  const noise = t => { const k = rnd(); if (k < .3) return t.replace(/ة(?=\s|$)/g, 'ه'); if (k < .55) return t.replace(/[أإآ]/g, 'ا'); if (k < .7) return t.replace(/ي(?=\s|$)/g, 'ى'); if (k < .82) return t.replace(/ /g, '  '); if (k < .92) return '  ' + t + '  '; return t.replace(/ـ/g, ''); };
  Object.assign(SC, {
    saledue() { const a = amt(), who = pick(NAMES.concat(ORGS)), due = pick(['وهيدفع الخميس', 'وهيدفع آخر الشهر', 'وهيدفع أول الشهر', 'وهيدفع بعد أسبوع', 'والفلوس آخر الشهر', 'وهيدفع الشهر الجاي', 'على 3 دفعات', 'وهيدفع بعد 10 أيام']); return [`${pick(['بعت', 'بعنا'])} ${L(who)} ${pick(['بضاعة', 'بضايع'])} ${PRE()}${a.t} ${pick(['على الحساب', 'آجل', 'بالآجل'])} ${due}`, [[E(AR, a.v, S, -a.v)]]]; },
    saledue2() { const a = amt(), who = pick(NAMES); return [`${pick(['بعت', 'بعنا'])} ${L(who)} بضاعة ${PRE()}${a.t} ${pick(['وهيدفع الخميس', 'وهيدفع آخر الشهر', 'وهيدفع بعد أسبوع', 'ولسه ما دفعش'])}`, [[E(AR, a.v, S, -a.v)]]]; },
    expnom() { const a = amt(300000), acc = pick(EXPK), what = pick(EXP[acc]); return [`${pick(['دفعت', 'دفعنا', 'سددت'])} ${what} ${a.t}`, [[E(acc, a.v, C, -a.v)], 'Q']]; },
    took() { const a = amt(), who = pick(NAMES); return [`${who} ${pick(['اخد', 'خد'])} بضاعة ${PRE()}${a.t} ${pick(CRED)}`, [[E(AR, a.v, S, -a.v)]]]; },
    paid3() { const a = amt(), M = meth('in'), who = pick(NAMES.concat(ORGS)); return [LEAD() + `${who} ${M.m === 'bank' ? pick(['سدد', 'دفع', 'حول']) : pick(['سدد', 'دفع'])} ${a.t} ${M.w}${chance(.5) ? ' من اللي عليه' : ''}`, [[E(M.acc, a.v, AR, -a.v)], ...(M.m === 'cash' ? [] : [])]]; },
    partial() { const v = ri(5, 300) * 100, p1 = ri(1, v / 100 - 1) * 100, who = pick(NAMES); return [`بعت بضاعة ${L(who)} بـ ${v} دفع ${p1} ${pick(['كاش ', ''])}والباقي ${pick(['على الحساب', 'آجل', 'آخر الشهر', 'هيدفعه بعدين'])}`, [[E(C, p1, AR, v - p1, S, -v)]]]; },
    halves() { const v = ri(2, 300) * 200; return chance(.5) ? [`بعت بضاعة بـ ${v} ${pick(['نصها كاش ونصها آجل', 'نص كاش ونص آجل', 'نصها كاش ونصها على الحساب'])}`, [[E(C, v / 2, AR, v / 2, S, -v)]]] : [`اشتريت بضاعة بـ ${v} ${pick(['نصها كاش ونصها على الحساب', 'نص كاش ونص آجل'])}`, [[E(INV, v, C, -v / 2, AP, -v / 2)]]]; },
    buyship() { const v = ri(5, 300) * 100, sh = ri(1, 40) * 10, m = pick(['cash', 'bank']), acc = m === 'cash' ? C : B; return [`اشتريت بضاعة بـ ${v} ودفعت ${pick(['نقلها', 'نقل', 'تحميل'])} ${sh} ${m === 'cash' ? pick(['كله كاش', 'كلهم كاش']) : 'كله من البنك'}`, [[E(INV, v, acc, -v), E('مصروف نقل', sh, acc, -sh)], [E(INV, v + sh, acc, -(v + sh))]]]; },
    twosales() { const a = ri(1, 200) * 50, b = ri(1, 200) * 50; return [`بعت بضاعة بـ ${a} كاش وبعت بضاعة تانية بـ ${b} ${pick(['آجل', 'على الحساب'])}`, [[E(C, a, S, -a), E(AR, b, S, -b)]]]; },
    multicollect() { const a = ri(1, 200) * 50, b = ri(1, 200) * 50, p = pick(NAMES.slice(0, 5)), q = pick(NAMES.slice(5, 10)); return [`حصلت من ${p} ${a} كاش ومن ${q} ${b} تحويل`, [[E(C, a, AR, -a), E(B, b, AR, -b)]]]; },
    prepaid() { const a = amt(500000), M = meth('out'); return [`دفعت ${pick(['إيجار 3 شهور مقدم', 'إيجار سنة مقدم', 'تأمين المحل سنة مقدم'])} ${a.t} ${M.w}`, [[E('مصروفات مدفوعة مقدماً', a.v, M.acc, -a.v)]]]; },
    worker() { const a = amt(30000), M = meth('out'); return [`دفعت ${pick(['للعامل', 'للصنايعي', 'لعامل اليومية', 'لعمال التحميل'])} ${a.t} ${M.w}`, [[E('مصروف رواتب', a.v, M.acc, -a.v)], [E('مصروف نقل', a.v, M.acc, -a.v)], [E('مصروف صيانة', a.v, M.acc, -a.v)]]]; },
    fix() { const a = amt(50000), M = meth('out'); return [pick([`صلحت ${pick(['التكييف', 'التلاجة', 'الطابعة', 'الموتوسيكل'])} بـ ${a.t} ${M.w}`, `دفعت ${pick(['للسباك', 'للكهربائي', 'للنقاش'])} ${a.t} ${M.w}`, `جبت ${pick(['فني صيانة للتلاجة', 'سباك للحمام', 'ميكانيكي للعربية'])} بـ ${a.t} ${M.w}`]), [[E('مصروف صيانة', a.v, M.acc, -a.v)]]]; },
    partner() { const a = amt(); return chance(.5) ? [pick([`الشريك حط ${a.t} في البنك`, `دخل معايا شريك بـ ${a.t} تحويل`]), [[E(B, a.v, CAP, -a.v)]]] : [`${pick(['الشريك', 'صاحب المحل'])} سحب ${a.t} لنفسه ${pick(['كاش', 'من البنك'])}`, [[E(DR, a.v, C, -a.v)], [E(DR, a.v, B, -a.v)]]]; },
  });
  const W = [['saledue', 4], ['saledue2', 2], ['expnom', 3], ['took', 2], ['paid3', 4], ['partial', 3], ['halves', 2], ['buyship', 2], ['twosales', 1], ['multicollect', 1], ['prepaid', 1], ['worker', 1], ['fix', 3], ['partner', 1], ['sale', 16], ['buy', 11], ['exp', 20], ['supplies', 2], ['asset', 4], ['collect', 8], ['paysupp', 5], ['capital', 2], ['draw', 3], ['move', 3], ['split', 5], ['list', 5], ['qty', 3], ['vat', 2], ['cogs', 1], ['loan', 2], ['ret', 1], ['service', 2], ['advance', 1], ['deprec', 1], ['bank', 1], ['two', 2], ['none', 2], ['ask', 2]];
  const totalW = W.reduce((x, y) => x + y[1], 0);
  const net = e => { const d = {}; for (const l of e.lines) d[l.account] = r2((d[l.account] || 0) + l.debit - l.credit); for (const k of Object.keys(d)) if (Math.abs(d[k]) < 0.005) delete d[k]; return d; };
  const same = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => k in b && Math.abs(a[k] - b[k]) < 0.011); };
  const stats = {}, fails = {}, wrongs = {};
  for (let n = 0; n < count; n++) {
    let x = rnd() * totalW, kind = W[0][0]; for (const [k, w] of W) { if ((x -= w) < 0) { kind = k; break; } }
    let [text, accept] = SC[kind]();
    if (chance(.3)) text = noise(text);
    const r = window.__daftar.parseLocal(text), got = r.entries.map(net);
    let ok, silent = false;
    if (got.length) { ok = !r.questions.length && accept.some(al => Array.isArray(al) && al.length === got.length && got.every(g => al.some(q => same(g, q)))); silent = !ok && !r.entries.some(e => e._warn) && !r.questions.length; }
    else if (r.questions.length) ok = accept.includes('Q'); else ok = accept.includes('NONE');
    const st = stats[kind] = stats[kind] || [0, 0, 0]; st[1]++; if (ok) st[0]++; else { if (silent) st[2]++; const f = fails[kind] = fails[kind] || []; if (f.length < 12) f.push([text, got, r.questions.length ? 'Q' : '']); if (silent) { const w = wrongs[kind] = wrongs[kind] || []; if (w.length < 12) w.push([text, got]); } }
  }
  return { stats, fails, wrongs, seed: s };
}

srv.listen(0, async () => {
  const port = srv.address().port; let browser;
  try {
    browser = await chromium.launch(); const pg = await browser.newPage();
    await pg.goto(`http://localhost:${port}/`); await pg.waitForFunction(() => window.__daftar);
    await pg.addScriptTag({ content: pageFuzz.toString() });
    const tot = {}, fails = {}, wrongs = {}; let seed = SEED, done = 0; const t0 = Date.now();
    while (done < N) {
      const n = Math.min(CHUNK, N - done); const r = await pg.evaluate(([n, seed]) => pageFuzz(n, seed), [n, seed]); seed = r.seed; done += n;
      for (const [k, [p, a, w]] of Object.entries(r.stats)) { const t = tot[k] = tot[k] || [0, 0, 0]; t[0] += p; t[1] += a; t[2] += w; }
      for (const [k, v] of Object.entries(r.fails)) { fails[k] = (fails[k] || []).concat(v).slice(0, 12); }
      for (const [k, v] of Object.entries(r.wrongs)) { wrongs[k] = (wrongs[k] || []).concat(v).slice(0, 12); }
      if (done % 100000 === 0 || done === N) process.stderr.write(`  ${done.toLocaleString()} / ${N.toLocaleString()}  (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
    }
    let P = 0, A = 0, Wr = 0;
    for (const [k, [p, a, w]] of Object.entries(tot).sort()) { P += p; A += a; Wr += w; console.log(`${k.padEnd(9)} ${String(p).padStart(7)}/${String(a).padEnd(7)} ${(p / a * 100).toFixed(3)}%  غلط صامت: ${w}`); }
    console.log(`TOTAL     ${P}/${A}  ${(P / A * 100).toFixed(4)}%   غلط صامت: ${Wr}   (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    if (process.argv.includes('--show')) for (const [k, v] of Object.entries(fails)) { console.log('\n--', k); v.slice(0, +(process.env.SHOW || 6)).forEach(f => console.log('  FAIL', f[0], JSON.stringify(f[1]), f[2])); }
    process.exitCode = P === A ? 0 : 1;
  } catch (e) { console.error(e); process.exitCode = 2; } finally { if (browser) await browser.close(); srv.close(); }
});
