/* مكوك — الواجهة */
(function () {
  'use strict';
  const M = window.Makkouk;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n0 = x => Math.round(x).toLocaleString('en-US');
  const n1 = x => (Math.round(x * 10) / 10).toLocaleString('en-US');
  const money = x => (x < 0 ? '−' : '') + n0(Math.abs(x)) + ' ج.م';
  const dayName = d => M.DAY_NAMES[d % 7];

  let S = M.defaultScenario(7, 100);
  let baselines = [];
  let solved = null;      // { plan, result, S snapshot }
  let running = false;

  /* ---------- التعامل مع المسارات (data-path) ---------- */
  function setPath(obj, path, val) {
    const keys = path.split('.'); let o = obj;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = val;
  }
  const num = (path, v, step, cls) => `<input type="number" data-path="${path}" value="${v}" step="${step || 'any'}" min="0" ${cls ? `class="${cls}"` : ''}>`;

  /* ---------- لوحة المدخلات ---------- */
  function renderInputs() {
    const g = [
      ['warehouse', 'سعة المخزن (طبلية)', 1], ['storageCost', 'تخزين الطبلية يوميًا (ج.م)', 1],
      ['cash0', 'النقدية أول الأسبوع (ج.م)', 1000], ['creditLimit', 'حد السحب على المكشوف (ج.م)', 1000],
      ['hourCost', 'تكلفة ساعة التشغيل (ج.م)', 100], ['fixedDaily', 'مصروفات ثابتة يوميًا (ج.م)', 1000],
      ['interest', 'تكلفة رأس المال اليومية (مخزون)', 0.0001], ['creditRate', 'فايدة المكشوف اليومية', 0.0001],
      ['latePenalty', 'خصم التأخير لكل يوم (طلبية محلية)', 0.01], ['vesselFee', 'غرامة تفويت الباخرة', 0.01],
      ['exportPremium', 'معامل سعر التصدير', 0.01],
    ];
    const caps = S.capacity.map((c, i) => `<label class="f">${dayName(i)}${num('capacity.' + i, c, 1)}</label>`).join('');
    const prodRows = S.products.map((p, i) => `<tr>
      <td><input class="wide" data-path="products.${i}.name" value="${esc(p.name)}" type="text"></td>
      <td>${num(`products.${i}.price`, p.price, 1)}</td>
      <td>${num(`products.${i}.runHr`, p.runHr, 0.0005)}</td>
      <td>${num(`products.${i}.setupHr`, p.setupHr, 0.25)}</td>
      <td>${num(`products.${i}.space`, p.space, 0.005)}</td>
      <td>${num(`products.${i}.shelf`, p.shelf, 1)}</td>
      <td class="muted">${p.bom.map(b => `<span class="chip">${esc(S.materials[b[0]].name)} ${b[1]}</span>`).join('')}</td></tr>`).join('');
    const matRows = S.materials.map((m, i) => `<tr>
      <td><input class="wide" data-path="materials.${i}.name" value="${esc(m.name)}" type="text"></td>
      <td>${num(`materials.${i}.tiers.0.price`, m.tiers[0].price, 0.1)}</td>
      <td>${num(`materials.${i}.tiers.1.min`, m.tiers[1].min, 100)}</td><td>${num(`materials.${i}.tiers.1.price`, m.tiers[1].price, 0.1)}</td>
      <td>${num(`materials.${i}.tiers.2.min`, m.tiers[2].min, 100)}</td><td>${num(`materials.${i}.tiers.2.price`, m.tiers[2].price, 0.1)}</td>
      <td>${num(`materials.${i}.shelf`, m.shelf, 1)}</td></tr>`).join('');
    $('#inputs').innerHTML = `
    <details class="panel" open><summary>القيود العامة</summary><div class="body">
      <h3>الطاقة التشغيلية: ساعات متاحة في كل يوم</h3>
      <div class="grid g6">${caps}</div>
      <h3 style="margin-top:14px">المخزن والمالية والتكاليف</h3>
      <div class="grid g6">${g.map(([k, t, st]) => `<label class="f">${t}${num(k, S[k], st)}</label>`).join('')}</div>
    </div></details>
    <details class="panel"><summary>الأصناف (${S.products.length})</summary><div class="body scroll">
      <table><thead><tr><th>الصنف</th><th>سعر الكرتونة</th><th>ساعات/كرتونة</th><th>ساعات تجهيز</th><th>طبلية/كرتونة</th><th>صلاحية (يوم)</th><th>الخامات لكل كرتونة</th></tr></thead><tbody>${prodRows}</tbody></table>
    </div></details>
    <details class="panel"><summary>الخامات وخصومات الكمية (${S.materials.length})</summary><div class="body scroll">
      <table><thead><tr><th>الخامة</th><th>السعر الأساسي</th><th>خصم 1 من كمية</th><th>سعره</th><th>خصم 2 من كمية</th><th>سعره</th><th>صلاحية (يوم)</th></tr></thead><tbody>${matRows}</tbody></table>
    </div></details>
    <details class="panel"><summary id="ordersSum">الطلبيات (${S.orders.length})</summary><div class="body">
      <div class="row">
        <label class="f">العدد<input type="number" id="genN" value="${S.orders.length}" min="5" max="400" style="width:90px"></label>
        <label class="f">رقم التوليد<input type="number" id="genSeed" value="7" min="1" style="width:90px"></label>
        <button id="gen">ولّد طلبيات عشوائية</button>
      </div>
      <p class="note">أو الصق طلبياتك (سطر لكل طلبية): <b>الصنف، الكمية، يوم التسليم، النوع</b> — مثال: <code dir="ltr">ويفر,120,الثلاثاء,تصدير</code>. اليوم بالاسم أو رقم من 1 إلى 6 (0 = السبت). النوع «محلي» أو «تصدير».</p>
      <textarea id="csvIn" rows="4" style="width:100%" placeholder="بسكويت سادة,150,الأحد,محلي"></textarea>
      <div class="row" style="margin-top:8px"><button id="csvImp">استيراد</button><span class="note" id="csvMsg"></span></div>
      <div class="scroll tall" style="margin-top:10px"><table><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>يوم التسليم</th><th>النوع</th></tr></thead><tbody>
      ${S.orders.map(o => `<tr><td>${o.id}</td><td>${esc(S.products[o.p].name)}</td><td>${o.qty}</td><td>${dayName(o.due)}</td><td>${o.type === 'export' ? 'تصدير' : 'محلي'}</td></tr>`).join('')}
      </tbody></table></div>
    </div></details>`;
  }

  /* ---------- كروت المديرين ---------- */
  const MGR = {
    prod:  { icon: '🏭', hurt: 'تكديس بضاعة وانتهاء صلاحية وضغط على الطاقة' },
    store: { icon: '📦', hurt: 'تشغيلات كتير وتجهيزات ماكينة تاكل الطاقة' },
    buy:   { icon: '🛒', hurt: 'سيولة مجمّدة ومخزن ممتلئ' },
    sales: { icon: '🚢', hurt: 'تخزين بدري ومخاطرة بالصلاحية' },
  };
  function violations(r, sc) {
    const v = [];
    if (r.excessHr > 1e-6) v.push(['bad', `ساعات تشغيل فوق الطاقة: ${n1(r.excessHr)} ساعة`]);
    if (r.overSpace > 1e-6) v.push(['bad', `تخزين فوق السعة: أعلى حمولة ${n0(r.peakSpace)} من ${n0(sc.warehouse)} طبلية`]);
    const gap = -r.minCash - sc.creditLimit;
    if (gap >= 1) v.push(['bad', `سيولة تحت حد الائتمان بـ ${money(gap)}`]);
    if (r.spoiledOrders) v.push(['bad', `${r.spoiledOrders} طلبية انتهت صلاحيتها قبل الشحن`]);
    if (r.spoiledRM > 1e-6) v.push(['bad', `خامات انتهت صلاحيتها: ${n0(r.spoiledRM)}`]);
    if (r.lateExport) v.push(['bad', `${r.lateExport} طلبية تصدير فاتها ميعاد الباخرة`]);
    if (r.lateLocal) v.push(['warn', `${r.lateLocal} طلبية محلية متأخرة`]);
    return v;
  }
  function renderManagers() {
    baselines = M.baselinePlans(S);
    $('#managers').innerHTML = baselines.map(b => {
      const m = MGR[b.key], v = violations(b.result, S);
      return `<div class="card mgr"><div class="role">${m.icon} ${b.manager}</div>
        <div class="want">${b.want}</div>
        ${v.length ? v.map(([c, t]) => `<span class="pill ${c === 'warn' ? 'warn' : ''}">${t}</span>`).join('') : '<span class="pill ok">خطته قابلة للتنفيذ</span>'}
        <span class="tag">تشغيلات: ${b.result.setups} · ربح على الورق: ${money(b.result.profit)}</span></div>`;
    }).join('');
  }

  /* ---------- الرسوم ---------- */
  function chart(opts) {
    // opts: days, stacks: [[values,color],...], limit (رقم أو مصفوفة), limitColor, fmt
    const W = 320, H = 170, pl = 38, pr = 8, pt = 10, pb = 26, D = opts.days.length;
    let lo = 0, hi = 0;
    const totals = opts.days.map((_, i) => opts.stacks.reduce((a, s) => a + Math.max(0, s[0][i]), 0));
    const negs = opts.days.map((_, i) => opts.stacks.reduce((a, s) => a + Math.min(0, s[0][i]), 0));
    hi = Math.max(...totals, ...(opts.limits || []).map(l => l.v));
    lo = Math.min(0, ...negs, ...(opts.limits || []).map(l => Math.min(0, l.v)));
    if (hi <= lo) hi = lo + 1;
    hi *= 1.08; if (lo < 0) lo *= 1.08;
    const y = v => pt + (hi - v) / (hi - lo) * (H - pt - pb);
    const bw = (W - pl - pr) / D, x = i => pl + i * bw;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img">`;
    const ticks = 4;
    for (let k = 0; k <= ticks; k++) {
      const v = lo + (hi - lo) * k / ticks;
      s += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 4}" y="${y(v) + 4}" text-anchor="end">${opts.fmt(v)}</text>`;
    }
    opts.days.forEach((d, i) => {
      let pos = 0, neg = 0;
      opts.stacks.forEach(([vals, col]) => {
        const v = vals[i]; if (!v) return;
        const c = (opts.negColor && v < 0) ? opts.negColor : col;
        if (v >= 0) { s += `<rect x="${x(i) + bw * 0.18}" width="${bw * 0.64}" y="${y(pos + v)}" height="${Math.max(0, y(pos) - y(pos + v))}" fill="${c}" rx="2"/>`; pos += v; }
        else { s += `<rect x="${x(i) + bw * 0.18}" width="${bw * 0.64}" y="${y(0)}" height="${Math.max(0, y(neg + v) - y(0))}" fill="${c}" rx="2"/>`; neg += v; }
      });
      s += `<text x="${x(i) + bw / 2}" y="${H - 8}" text-anchor="middle">${d}</text>`;
    });
    (opts.limits || []).forEach(l => { s += `<line x1="${pl}" x2="${W - pr}" y1="${y(l.v)}" y2="${y(l.v)}" stroke="var(--bad)" stroke-width="1.6" stroke-dasharray="5 4"/>`; });
    return s + '</svg>';
  }

  /* ---------- النتيجة ---------- */
  const VERDICT = r => r.feasible ? '<span class="badge ok">قابلة للتنفيذ</span>' : '<span class="badge bad">مش قابلة للتنفيذ</span>';
  function renderResults() {
    if (!solved) return;
    const { plan, result: r, sc } = solved;
    const D = sc.days, P = sc.products.length, days = Array.from({ length: D }, (_, d) => dayName(d));
    $('#results').style.display = 'block';
    $('#stale').style.display = 'none';

    const util = r.hoursTotal / sc.capacity.reduce((a, b, i) => a + (i < D - 1 ? b : 0), 0) * 100;
    $('#kpis').innerHTML = [
      [money(r.profit), 'صافي الربح المتوقع'],
      [r.setups, 'عدد التشغيلات (تجهيزات الماكينة)'],
      [n0(util) + '%', 'استغلال الطاقة'],
      [n0(r.peakSpace) + ' / ' + n0(sc.warehouse), 'أعلى حمولة مخزن (طبلية)'],
      [money(r.minCash), 'أدنى رصيد نقدية (الحد −' + n0(sc.creditLimit / 1000) + ' ألف)'],
      [n0(r.onTimePct) + '%', 'طلبيات في ميعادها'],
    ].map(([b, t]) => `<div class="card kpi"><b>${b}</b><span>${t}</span></div>`).join('');

    // المقارنة
    const rows = solved.baselines.map(b => ({ name: b.manager, r: b.result })).concat([{ name: 'مكوك (متوازن)', r, best: true }]);
    $('#compare').innerHTML = `<thead><tr><th>الخطة</th><th>الربح</th><th>التشغيلات</th><th>ساعات فوق الطاقة</th><th>أعلى مخزن</th><th>أدنى نقدية</th><th>صلاحية / شحن</th><th>الحالة</th></tr></thead><tbody>` +
      rows.map(x => `<tr class="${x.best ? 'best' : ''}"><td>${esc(x.name)}</td><td>${n0(x.r.profit / 1000)} ألف</td><td>${x.r.setups}</td>
        <td>${x.r.excessHr > 1e-6 ? `<span class="badge bad">${n1(x.r.excessHr)}</span>` : '0'}</td>
        <td>${x.r.overSpace > 1e-6 ? `<span class="badge bad">${n0(x.r.peakSpace)}</span>` : n0(x.r.peakSpace)}</td>
        <td>${-x.r.minCash - sc.creditLimit >= 1 ? `<span class="badge bad">${n0(x.r.minCash / 1000)} ألف</span>` : n0(x.r.minCash / 1000) + ' ألف'}</td>
        <td>${(x.r.spoiledOrders + x.r.lateExport) ? `<span class="badge bad">${x.r.spoiledOrders + x.r.lateExport}</span>` : '0'}${x.r.lateLocal ? ` <span class="badge warn">${x.r.lateLocal} متأخرة</span>` : ''}</td>
        <td>${VERDICT(x.r)}</td></tr>`).join('') + '</tbody>';

    // لماذا
    const jitPlan = { prodDay: sc.orders.map(o => Math.max(0, o.due - 1)), buy: 'jit' };
    const jit = M.evaluate(sc, jitPlan);
    const sameProdJit = M.evaluate(sc, { prodDay: plan.prodDay, buy: 'jit' });
    const sameProdBulk = M.evaluate(sc, { prodDay: plan.prodDay, buy: 'bulk' });
    const noDiscount = (() => { let t = 0; r.lots.forEach((ls, m) => ls.forEach(L => { t += L.qty * sc.materials[m].tiers[0].price; })); return t; })();
    const lotsN = r.lots.reduce((a, ls) => a + ls.length, 0), needDays = r.lots.reduce((a, ls, m) => a + (() => { let c = 0; for (let d = 0; d < D; d++) if (r.need[m * D + d] > 1e-9) c++; return c; })(), 0);
    const tight = [];
    const capDays = sc.capacity.map((c, d) => (c > 0 && r.hours[d] / c > 0.93) ? dayName(d) : null).filter(Boolean);
    if (capDays.length) tight.push(`الطاقة شبه ممتلئة في: ${capDays.join('، ')}`);
    if (r.peakSpace > sc.warehouse * 0.9) tight.push(`المخزن وصل ${n0(r.peakSpace / sc.warehouse * 100)}% من سعته`);
    if (-r.minCash > sc.creditLimit * 0.9) tight.push(`السيولة قريبة من حد الائتمان (أدنى رصيد ${money(r.minCash)})`);
    const lines = [
      `جمّعنا ${sc.orders.length} طلبية في <b>${r.setups}</b> تشغيلة بدل ${jit.setups} لو كل طلبية اتشغلت في يومها. وفّرنا <b>${n1(jit.hoursTotal - r.hoursTotal)}</b> ساعة تشغيل كانت هتضيع في تجهيز الماكينات.`,
      `اشترينا الخامات في <b>${lotsN}</b> دفعة بدل ${needDays} لو اشترينا يوم بيوم، فاستفدنا من خصم الكمية وفرق ${money(sameProdJit.matCost - r.matCost)} في تكلفة الخامات، من غير ما نشتري الأسبوع كله مرة واحدة (ده كان هيكلّف ${money(sameProdBulk.minCash < r.minCash ? r.minCash - sameProdBulk.minCash : 0)} عجز سيولة إضافي).`,
      `الأصناف قصيرة الصلاحية (${sc.products.filter(p => p.shelf <= 7).map(p => esc(p.name)).join('، ') || 'لا يوجد'}) اتشغلت قريبة من ميعاد شحنها، والأصناف الطويلة اتجمّعت في تشغيلات أكبر.`,
      `طلبيات التصدير (${sc.orders.filter(o => o.type === 'export').length} طلبية) اتأمّنت قبل مواعيد الباخرة: ${r.lateExport ? `<b>فات ${r.lateExport}</b>` : 'ولا طلبية فاتت'}.`,
      tight.length ? `القيود اللي بتحدد الحل دلوقتي: ${tight.join('، ')}.` : 'مفيش قيد واحد ضاغط على الحل، الجدول مريح.',
      r.lateLocal ? `<b>${r.lateLocal}</b> طلبية محلية اتأخرت يوم، لأن تأخيرها أرخص من كسر قيد السيولة أو الطاقة (الخصم ${n0(sc.latePenalty * 100)}% في اليوم).` : 'كل الطلبيات اتسلّمت في ميعادها.',
    ];
    $('#insights').innerHTML = lines.map(l => `<li>${l}</li>`).join('');

    // اللوحة
    let head = '<thead><tr><th style="text-align:right">اليوم</th>' + sc.products.map(p => `<th>${esc(p.name)}</th>`).join('') + '<th>الساعات</th><th style="text-align:right">مشتريات اليوم</th><th>النقدية</th></tr></thead><tbody>';
    let body = '';
    for (let d = 0; d < D; d++) {
      const buys = [];
      sc.materials.forEach((m, i) => { const q = r.buyQty[i * D + d]; if (q > 0) { const lot = r.lots[i].find(L => L.day === d); buys.push(`<span class="chip">${esc(m.name)} ${n0(q)} @ ${n1(lot.price)}</span>`); } });
      const cap = sc.capacity[d], pct = cap > 0 ? Math.min(100, r.hours[d] / cap * 100) : 0;
      body += `<tr><td class="day">${days[d]}</td>` + sc.products.map((p, i) => { const q = r.batch[d * P + i]; return `<td class="cell ${q > 0 ? 'on' : ''}">${q > 0 ? n0(q) : '·'}</td>`; }).join('') +
        `<td><div class="hbar"><i style="width:${pct}%"></i><span>&nbsp;${n1(r.hours[d])}/${cap}</span></div></td><td style="text-align:right;white-space:normal;min-width:180px">${buys.join('') || '<span class="muted">—</span>'}</td><td>${n0(r.cash[d] / 1000)} ألف</td></tr>`;
    }
    $('#board').innerHTML = head + body + '</tbody>';

    // الرسوم
    $('#chCap').innerHTML = chart({ days, stacks: [[Array.from(r.hours), 'var(--brand)']], limits: [{ v: Math.max(...sc.capacity) }], fmt: v => n0(v) });
    $('#chSpace').innerHTML = chart({ days, stacks: [[Array.from(r.rmSpace), '#6366f1'], [Array.from(r.fgSpace), 'var(--brand)']], limits: [{ v: sc.warehouse }], fmt: v => n0(v) });
    $('#chCash').innerHTML = chart({ days, stacks: [[Array.from(r.cash), 'var(--brand)']], negColor: 'var(--bad)', limits: [{ v: -sc.creditLimit }], fmt: v => n0(v / 1000) });

    // المشتريات
    let bh = '<thead><tr><th>الخامة</th><th>الدفعات (اليوم · الكمية · السعر)</th><th>إجمالي</th><th>وفر الخصم</th></tr></thead><tbody>';
    sc.materials.forEach((m, i) => {
      const ls = r.lots[i]; if (!ls.length) return;
      const tot = ls.reduce((a, L) => a + L.qty * L.price, 0), base = ls.reduce((a, L) => a + L.qty * m.tiers[0].price, 0);
      bh += `<tr><td>${esc(m.name)}</td><td style="white-space:normal">${ls.map(L => `<span class="chip">${days[L.day]} · ${n0(L.qty)} ${esc(m.unit)} · ${n1(L.price)}</span>`).join('')}</td><td>${money(tot)}</td><td>${base - tot > 0.5 ? `<span class="badge ok">${money(base - tot)}</span>` : '—'}</td></tr>`;
    });
    $('#buys').innerHTML = bh + `</tbody><tfoot><tr><td><b>الإجمالي</b></td><td></td><td><b>${money(r.matCost)}</b></td><td><span class="badge ok">${money(noDiscount - r.matCost)}</span></td></tr></tfoot>`;

    // الطلبيات
    const ST = { ok: '<span class="badge ok">في ميعادها</span>', late: '<span class="badge warn">متأخرة</span>', missed: '<span class="badge bad">فاتت الباخرة</span>', spoiled: '<span class="badge bad">صلاحية</span>' };
    $('#ordersOut').innerHTML = '<thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>النوع</th><th>التسليم</th><th>يوم التشغيل</th><th>الحالة</th></tr></thead><tbody>' +
      sc.orders.map((o, i) => `<tr><td>${o.id}</td><td>${esc(sc.products[o.p].name)}</td><td>${o.qty}</td><td>${o.type === 'export' ? 'تصدير' : 'محلي'}</td><td>${dayName(o.due)}</td><td><b>${dayName(plan.prodDay[i])}</b></td><td>${ST[r.info[i].status]}</td></tr>`).join('') + '</tbody>';
  }

  /* ---------- أحداث ---------- */
  function markStale() { if (solved) $('#stale').style.display = 'block'; }

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset && t.dataset.path) {
      const v = t.type === 'number' ? parseFloat(t.value) : t.value;
      if (t.type === 'number' && !(v >= 0)) { renderInputs(); return; }
      setPath(S, t.dataset.path, v);
      renderManagers(); markStale();
    }
  });
  document.addEventListener('click', e => {
    const id = e.target.id;
    if (id === 'gen') {
      const n = Math.max(5, Math.min(400, parseInt($('#genN').value, 10) || 100)), seed = parseInt($('#genSeed').value, 10) || 7;
      S.orders = M.genOrders(S, seed, n); refreshOrders();
    } else if (id === 'csvImp') importCsv();
    else if (id === 'run') run();
    else if (id === 'csv') downloadCsv();
  });
  function refreshOrders() {
    const open = [...document.querySelectorAll('details.panel')].map(d => d.open);
    renderInputs(); document.querySelectorAll('details.panel').forEach((d, i) => { d.open = open[i]; });
    renderManagers(); markStale();
  }
  function importCsv() {
    const lines = $('#csvIn').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out = []; let bad = 0;
    for (const line of lines) {
      const c = line.split(/[,،;\t]/).map(x => x.trim());
      if (c.length < 3) { bad++; continue; }
      let p = S.products.findIndex(x => x.name === c[0]);
      if (p < 0 && /^\d+$/.test(c[0]) && +c[0] >= 1 && +c[0] <= S.products.length) p = +c[0] - 1;
      const qty = parseFloat(c[1]);
      let due = M.DAY_NAMES.indexOf(c[2]); if (due < 0) due = parseInt(c[2], 10);
      const exp = /تصدير|export/i.test(c[3] || '');
      if (p < 0 || !(qty > 0) || !(due >= 1 && due <= S.days - 1)) { bad++; continue; }
      out.push({ id: out.length + 1, p, qty, due, type: exp ? 'export' : 'local', payDays: exp ? 10 : 3 });
    }
    if (out.length) { S.orders = out; refreshOrders(); }
    const m = $('#csvMsg'); if (m) m.textContent = out.length ? `تم استيراد ${out.length} طلبية${bad ? ` وتجاهل ${bad} سطر غلط` : ''}.` : 'مفيش سطر صالح. راجع الصيغة.';
  }
  function downloadCsv() {
    if (!solved) return;
    const { plan, result: r, sc } = solved;
    const rows = [['رقم', 'الصنف', 'الكمية', 'النوع', 'يوم التسليم', 'يوم التشغيل', 'الحالة']];
    sc.orders.forEach((o, i) => rows.push([o.id, sc.products[o.p].name, o.qty, o.type === 'export' ? 'تصدير' : 'محلي', dayName(o.due), dayName(plan.prodDay[i]), r.info[i].status]));
    const blob = new Blob(['﻿' + rows.map(x => x.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'makkouk-schedule.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function run() {
    if (running) return;
    if (!S.orders.length) { alert('مفيش طلبيات.'); return; }
    running = true;
    const q = { fast: [15000, 3], normal: [30000, 4], deep: [80000, 4] }[$('#quality').value];
    const sc = JSON.parse(JSON.stringify(S));
    const btn = $('#run'), bar = $('#bar'); btn.disabled = true; btn.textContent = 'بيحسب…'; $('#barWrap').style.display = 'block'; bar.style.width = '2%';
    const sv = M.createSolver(sc, { iters: q[0], chains: q[1], seed: 1 });
    (function tick() {
      const done = sv.step(40);
      bar.style.width = Math.round(sv.progress() * 100) + '%';
      if (!done) { setTimeout(tick, 0); return; }
      const plan = sv.best();
      solved = { plan, result: M.evaluate(sc, plan), sc, baselines: M.baselinePlans(sc) };
      bar.style.width = '100%';
      setTimeout(() => { $('#barWrap').style.display = 'none'; }, 400);
      btn.disabled = false; btn.textContent = 'احسب الجدول المتوازن'; running = false;
      renderResults();
      $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    })();
  }

  renderInputs();
  renderManagers();
  window.__makkouk = { get S() { return S; }, get solved() { return solved; } };
})();
