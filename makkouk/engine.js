/* مكوك — محرّك الجدولة المتوازنة
   بيحسب جدول تشغيل واحد بياخد في الحسبان قيود الإنتاج والمخازن والمشتريات والمالية والتصدير في نفس اللحظة.
   شغّال في المتصفح وفي Node (للاختبار). من غير مكتبات خارجية. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Makkouk = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- أدوات ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const DAY_NAMES = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  function tierPrice(mat, qty) {
    let pr = mat.tiers[0].price;
    for (let i = 0; i < mat.tiers.length; i++) if (qty >= mat.tiers[i].min) pr = mat.tiers[i].price;
    return pr;
  }

  /* ---------- سيناريو افتراضي: مصنع بسكويت وحلويات ---------- */
  function defaultScenario(seed, nOrders) {
    seed = seed || 7; nOrders = nOrders || 100;
    const S = {
      days: 7,
      capacity: [20, 20, 20, 20, 20, 20, 20],      // ساعات تشغيل متاحة في اليوم
      warehouse: 170,                              // سعة المخزن بالطبلية
      storageCost: 20,                             // تكلفة تخزين الطبلية في اليوم
      cash0: 1100000,                               // النقدية المتاحة أول الأسبوع
      creditLimit: 500000,                         // حد السحب على المكشوف
      creditRate: 0.0015,                          // فايدة يومية على المكشوف
      interest: 0.0006,                            // تكلفة رأس المال اليومية على قيمة المخزون
      hourCost: 2500,                              // تكلفة ساعة تشغيل (عمالة + طاقة)
      fixedDaily: 15000,                           // مصروفات ثابتة يومية
      latePenalty: 0.08,                           // خصم عن كل يوم تأخير (طلبية محلية)
      vesselFee: 0.10,                             // غرامة تفويت الباخرة (من قيمة الطلبية)
      exportPremium: 1.08,                         // علاوة سعر التصدير
      materials: [
        { name: 'دقيق',            unit: 'كجم',   space: 0.001,  shelf: 60,  tiers: [{ min: 0, price: 22 },  { min: 4000, price: 21 },   { min: 10000, price: 19.8 }] },
        { name: 'سكر',             unit: 'كجم',   space: 0.001,  shelf: 90,  tiers: [{ min: 0, price: 28 },  { min: 2000, price: 27 },   { min: 6000, price: 25.5 }] },
        { name: 'زيت وسمن',        unit: 'كجم',   space: 0.0011, shelf: 5,   tiers: [{ min: 0, price: 60 },  { min: 1000, price: 57 },   { min: 3000, price: 54 }] },
        { name: 'كاكاو ونكهات',    unit: 'كجم',   space: 0.001,  shelf: 20,  tiers: [{ min: 0, price: 120 }, { min: 300, price: 114 },   { min: 800, price: 108 }] },
        { name: 'تغليف',           unit: 'وحدة',  space: 0.0003, shelf: 365, tiers: [{ min: 0, price: 6 },   { min: 5000, price: 5.7 },  { min: 12000, price: 5.2 }] },
      ],
      // bom: [مادة, كمية للكرتونة]
      products: [
        { name: 'بسكويت سادة',        price: 300, runHr: 0.0040, setupHr: 1.5, space: 0.025, shelf: 120, bom: [[0, 3.0], [1, 1.2], [2, 0.6], [4, 1]] },
        { name: 'بسكويت شوكولاتة',    price: 360, runHr: 0.0045, setupHr: 2.0, space: 0.025, shelf: 90,  bom: [[0, 2.6], [1, 1.4], [2, 0.5], [3, 0.35], [4, 1]] },
        { name: 'ويفر',               price: 330, runHr: 0.0050, setupHr: 2.0, space: 0.030, shelf: 90,  bom: [[0, 2.2], [1, 1.5], [2, 0.7], [3, 0.2], [4, 1]] },
        { name: 'كيك مغلّف',          price: 420, runHr: 0.0060, setupHr: 1.5, space: 0.040, shelf: 5,   bom: [[0, 3.2], [1, 2.0], [2, 1.2], [4, 1]] },
        { name: 'معمول',              price: 390, runHr: 0.0055, setupHr: 1.0, space: 0.030, shelf: 30,  bom: [[0, 3.5], [1, 1.6], [2, 1.0], [4, 1]] },
        { name: 'بتي فور',            price: 340, runHr: 0.0050, setupHr: 1.0, space: 0.030, shelf: 6,   bom: [[0, 2.4], [1, 1.3], [2, 0.8], [3, 0.15], [4, 1]] },
        { name: 'كوكيز',              price: 310, runHr: 0.0040, setupHr: 1.5, space: 0.025, shelf: 45,  bom: [[0, 2.8], [1, 1.5], [2, 0.7], [3, 0.2], [4, 1]] },
        { name: 'كرواسون مغلّف',      price: 380, runHr: 0.0055, setupHr: 1.5, space: 0.045, shelf: 3,   bom: [[0, 3.0], [1, 1.0], [2, 1.5], [4, 1]] },
      ],
      orders: [],
    };
    S.orders = genOrders(S, seed, nOrders);
    return S;
  }

  function genOrders(S, seed, n) {
    const r = rng(seed);
    const w = [1.6, 1.4, 1.1, 0.8, 1.0, 0.7, 1.2, 0.7];
    const wsum = w.reduce((a, b) => a + b, 0);
    const out = [];
    for (let i = 0; i < n; i++) {
      let x = r() * wsum, p = 0;
      while (p < w.length - 1 && x > w[p]) { x -= w[p]; p++; }
      p = Math.min(p, S.products.length - 1);
      const exp = r() < 0.28;
      const qty = Math.round((40 + Math.pow(r(), 1.6) * 230) / 10) * 10;
      const due = exp ? [2, 4, 6][Math.floor(r() * 3)] : 1 + Math.floor(r() * 6);
      out.push({ id: i + 1, p, qty, due: Math.min(due, S.days - 1), type: exp ? 'export' : 'local', payDays: exp ? 10 : 3 });
    }
    return out;
  }

  /* ---------- التقييم: بيحسب كل حاجة من خطة تشغيل واحدة ---------- */
  function evaluate(S, plan) {
    const D = S.days, P = S.products.length, M = S.materials.length, O = S.orders, n = O.length;
    const prodDay = plan.prodDay;
    const mode = plan.buy || 'dp';
    const mu = plan.mu == null ? 1 : plan.mu;

    // 1) الدفعات والساعات
    const batch = new Float64Array(D * P);
    for (let o = 0; o < n; o++) batch[prodDay[o] * P + O[o].p] += O[o].qty;
    const hours = new Float64Array(D);
    let setups = 0, excessHr = 0, hoursTotal = 0;
    for (let d = 0; d < D; d++) {
      for (let p = 0; p < P; p++) {
        const q = batch[d * P + p];
        if (q > 0) { hours[d] += S.products[p].setupHr + q * S.products[p].runHr; setups++; }
      }
      hoursTotal += hours[d];
      const ex = hours[d] - S.capacity[d];
      if (ex > 1e-9) excessHr += ex;
    }

    // 2) احتياج الخامات
    const need = new Float64Array(M * D);
    for (let d = 0; d < D; d++) for (let p = 0; p < P; p++) {
      const q = batch[d * P + p];
      if (q > 0) { const bom = S.products[p].bom; for (let k = 0; k < bom.length; k++) need[bom[k][0] * D + d] += q * bom[k][1]; }
    }

    // 3) خطة الشراء لكل خامة: lots = [{day, qty, price}]
    const lots = [];
    const buyQty = new Float64Array(M * D);
    const spend = new Float64Array(D);
    let matCost = 0;
    for (let m = 0; m < M; m++) {
      const mat = S.materials[m];
      const nd = [];
      for (let d = 0; d < D; d++) if (need[m * D + d] > 1e-9) nd.push(d);
      const K = nd.length; lots[m] = [];
      if (!K) continue;
      if (mode === 'jit') {
        for (const d of nd) lots[m].push({ day: d, qty: need[m * D + d] });
      } else if (mode === 'bulk') {
        let tot = 0; for (const d of nd) tot += need[m * D + d];
        lots[m].push({ day: 0, qty: tot });
      } else {
        // برمجة ديناميكية (Wagner–Whitin) مع حد الصلاحية وتكلفة التخزين وتكلفة رأس المال
        const f = new Float64Array(K + 1), arg = new Int32Array(K + 1);
        const spaceCost = mat.space * S.storageCost;
        for (let b = 1; b <= K; b++) {
          f[b] = Infinity;
          let qty = 0, carry = 0;
          for (let a = b - 1; a >= 0; a--) {
            const nq = need[m * D + nd[a]];
            qty += nq;
            if (nd[b - 1] - nd[a] > mat.shelf && a < b - 1) break;
            // تكلفة الحمل لو الطلب ده اتشرى في يوم nd[a] بدل ما يتشرى في يومه
            carry = 0;
            for (let k = a; k < b; k++) carry += need[m * D + nd[k]] * (nd[k] - nd[a]);
            const pr = tierPrice(mat, qty);
            const c = f[a] + qty * pr + carry * (spaceCost + pr * S.interest) * (1 + mu);
            if (c < f[b]) { f[b] = c; arg[b] = a; }
          }
        }
        let b = K;
        while (b > 0) {
          const a = arg[b]; let qty = 0;
          for (let k = a; k < b; k++) qty += need[m * D + nd[k]];
          lots[m].push({ day: nd[a], qty }); b = a;
        }
        lots[m].reverse();
      }
      for (const L of lots[m]) {
        L.price = tierPrice(mat, L.qty);
        buyQty[m * D + L.day] += L.qty;
        spend[L.day] += L.qty * L.price;
        matCost += L.qty * L.price;
      }
    }

    // 4) مخزن الخامات (FIFO) + صلاحية الخامة
    const rmSpace = new Float64Array(D);
    let spoiledRM = 0, spoiledRMValue = 0;
    for (let m = 0; m < M; m++) {
      const mat = S.materials[m];
      const q = lots[m].map(l => ({ day: l.day, qty: l.qty, price: l.price }));
      let stock = 0, li = 0;
      for (let d = 0; d < D; d++) {
        while (li < q.length && q[li].day <= d) { stock += q[li].qty; li++; }
        rmSpace[d] += stock * mat.space;
        let take = need[m * D + d];
        stock -= take;
        // FIFO: استهلك من أقدم دفعة اتشرت
        for (let k = 0; k < li && take > 1e-9; k++) {
          if (q[k].qty <= 1e-9) continue;
          const used = Math.min(q[k].qty, take);
          if (d - q[k].day > mat.shelf) { spoiledRM += used; spoiledRMValue += used * q[k].price; }
          q[k].qty -= used; take -= used;
        }
      }
    }

    // 5) مخزن المنتج التام + الصلاحية + التسليم والتحصيل
    const fgSpace = new Float64Array(D);
    const T = D + 1 + 30;
    const receipts = new Float64Array(T);
    let revenue = 0, spoiledOrders = 0, lateLocal = 0, lateExport = 0, onTime = 0, vesselPenalty = 0, latePen = 0;
    const info = new Array(n);
    for (let o = 0; o < n; o++) {
      const ord = O[o], pr = S.products[ord.p], t = prodDay[o];
      const value = ord.qty * pr.price * (ord.type === 'export' ? S.exportPremium : 1);
      let ship, status = 'ok', got = value;
      if (t < ord.due) {
        ship = ord.due;
        for (let d = t + 1; d <= ord.due && d < D; d++) fgSpace[d] += ord.qty * pr.space;
        if (ord.due - t > pr.shelf) { status = 'spoiled'; got = 0; spoiledOrders++; }
        else onTime++;
      } else {
        ship = t + 1;
        const late = ship - ord.due;
        if (ord.type === 'export') { status = 'missed'; got = 0; lateExport++; vesselPenalty += value * S.vesselFee; }
        else { status = 'late'; lateLocal++; got = value * Math.max(0, 1 - S.latePenalty * late); }
      }
      revenue += got;
      const rd = Math.min(T - 1, ship + ord.payDays);
      receipts[rd] += got;
      info[o] = { ship, status };
    }

    // 6) السيولة
    const cash = new Float64Array(D);
    let run = S.cash0, minCash = Infinity, breach = 0, interestPaid = 0, runCost = 0;
    let rcum = 0;
    for (let d = 0; d < D; d++) {
      for (let k = 0; k <= d; k++) { /* receipts accumulate below */ }
    }
    const rc = new Float64Array(T); let acc = 0;
    for (let d = 0; d < T; d++) { acc += receipts[d]; rc[d] = acc; }
    let outAcc = 0;
    for (let d = 0; d < D; d++) {
      const hc = hours[d] * S.hourCost; runCost += hc;
      outAcc += spend[d] + hc + S.fixedDaily;
      const c = S.cash0 + rc[d] - outAcc;
      cash[d] = c;
      if (c < minCash) minCash = c;
      if (c < 0) interestPaid += -c * S.creditRate;
      const br = -c - S.creditLimit; if (br > 0) breach += br;
    }

    // 7) المخزن
    const space = new Float64Array(D);
    let overSpace = 0, spaceDays = 0, peakSpace = 0;
    for (let d = 0; d < D; d++) {
      space[d] = rmSpace[d] + fgSpace[d];
      spaceDays += space[d];
      if (space[d] > peakSpace) peakSpace = space[d];
      const ov = space[d] - S.warehouse; if (ov > 1e-9) overSpace += ov;
    }
    const storageCost = spaceDays * S.storageCost;
    const fixedCost = S.fixedDaily * D;
    const profit = revenue - matCost - runCost - fixedCost - storageCost - interestPaid - vesselPenalty - spoiledRMValue;

    // 8) الجزاءات (بتخلّي الخطة اللي بتكسر قيد أسوأ من أي خطة سليمة)
    const penalty = excessHr * 60000 + overSpace * 6000 + breach * 25 + spoiledRM * 0 + spoiledOrders * 20000 + lateExport * 20000 + lateLocal * 15000;
    const feasible = excessHr < 1e-6 && overSpace < 1e-6 && breach < 1 && spoiledOrders === 0 && spoiledRM < 1e-6 && lateExport === 0;
    return {
      profit, revenue, matCost, runCost, fixedCost, storageCost, interestPaid, vesselPenalty,
      setups, hours, hoursTotal, excessHr, space, rmSpace, fgSpace, peakSpace, overSpace, cash, minCash, breach,
      spoiledOrders, spoiledRM, lateLocal, lateExport, onTime, onTimePct: onTime / n * 100,
      objective: -profit + penalty, feasible, batch, need, lots, buyQty, spend, info,
    };
  }

  /* ---------- خطط "كل مدير لوحده" ---------- */
  function greedyEarly(S) {
    // مدير المبيعات: خلّصها بدري ومضمون — املا أول الأيام بالترتيب حسب الموعد
    const D = S.days, P = S.products.length, order = S.orders.map((o, i) => i).sort((a, b) => S.orders[a].due - S.orders[b].due);
    const used = new Float64Array(D), seen = new Uint8Array(D * P), prodDay = new Array(S.orders.length);
    for (const i of order) {
      const o = S.orders[i], pr = S.products[o.p];
      let day = -1;
      for (let d = 0; d <= Math.max(0, o.due - 1); d++) {
        const add = o.qty * pr.runHr + (seen[d * P + o.p] ? 0 : pr.setupHr);
        if (used[d] + add <= S.capacity[d] + 1e-9) { day = d; break; }
      }
      if (day < 0) day = Math.max(0, o.due - 1);
      used[day] += o.qty * pr.runHr + (seen[day * P + o.p] ? 0 : pr.setupHr);
      seen[day * P + o.p] = 1; prodDay[i] = day;
    }
    return prodDay;
  }
  function baselinePlans(S) {
    const n = S.orders.length, P = S.products.length;
    const jit = S.orders.map(o => Math.max(0, o.due - 1));
    const campaign = new Array(n), first = new Array(P).fill(Infinity);
    S.orders.forEach(o => { first[o.p] = Math.min(first[o.p], Math.max(0, o.due - 1)); });
    S.orders.forEach((o, i) => { campaign[i] = first[o.p]; });
    return [
      { key: 'prod',  manager: 'مدير الإنتاج',           want: 'يجمّع كل طلبيات الصنف الواحد في تشغيلة واحدة', plan: { prodDay: campaign, buy: 'jit' } },
      { key: 'store', manager: 'مدير المخازن والمالية',  want: 'مفيش مخزون ومفيش كاش مجمّد: كل طلبية قبل ميعادها بيوم وكل خامة يوم استهلاكها', plan: { prodDay: jit, buy: 'jit' } },
      { key: 'buy',   manager: 'مدير المشتريات',         want: 'يشتري خامات الأسبوع كلها مرة واحدة عشان أعلى خصم', plan: { prodDay: jit, buy: 'bulk' } },
      { key: 'sales', manager: 'مدير المبيعات والتصدير', want: 'يخلّص كل الطلبيات بدري ومضمون قبل أي ميعاد شحن', plan: { prodDay: greedyEarly(S), buy: 'jit' } },
    ].map(b => Object.assign(b, { result: evaluate(S, b.plan) }));
  }

  /* ---------- المحسّن: محاكاة التبريد + بحث موضعي ---------- */
  function createSolver(S, opt) {
    opt = opt || {};
    const iters = opt.iters || 60000, chains = opt.chains || 4, seed = opt.seed || 1;
    const n = S.orders.length, D = S.days, P = S.products.length;
    const r = rng(seed * 7919 + 13);
    const byProduct = Array.from({ length: P }, () => []);
    S.orders.forEach((o, i) => byProduct[o.p].push(i));
    const maxDay = i => Math.max(0, S.orders[i].due - 1);

    const starts = [
      () => ({ prodDay: S.orders.map(o => Math.max(0, o.due - 1)), mu: 1 }),
      () => ({ prodDay: greedyEarly(S), mu: 1 }),
      () => { const b = baselinePlans(S)[0].plan.prodDay; return { prodDay: b.slice(), mu: 1 }; },
      () => ({ prodDay: S.orders.map(o => Math.floor(r() * (Math.max(0, o.due - 1) + 1))), mu: 1 }),
    ];

    let chain = 0, it = 0, cur = null, curObj = 0, T0 = 1, T = 1, best = null, bestObj = Infinity, feas = null, feasObj = Infinity, totalIt = 0, done = false, phase = 'sa';
    const score = st => evaluate(S, { prodDay: st.prodDay, buy: 'dp', mu: st.mu });

    function initChain() {
      cur = starts[chain % starts.length]();
      const res = score(cur); curObj = res.objective; it = 0;
      // درجة حرارة البداية من متوسط تغيّر الهدف لحركات عشوائية
      let sum = 0, cnt = 0;
      for (let k = 0; k < 120; k++) {
        const u = propose(cur);
        const o2 = score(u.state).objective; sum += Math.abs(o2 - curObj); cnt++;
        revert(cur, u);
      }
      T0 = Math.max(50, sum / cnt * 0.6);
      if (curObj < bestObj) { bestObj = curObj; best = { prodDay: cur.prodDay.slice(), mu: cur.mu }; }
    }
    // حركة: بتغيّر الحالة في مكانها وبترجّع تفاصيل التراجع
    function propose(st) {
      const undo = { idx: [], old: [], mu: st.mu, state: st };
      const set = (i, d) => { undo.idx.push(i); undo.old.push(st.prodDay[i]); st.prodDay[i] = d; };
      const k = r();
      if (k < 0.34) {                                 // انقل طلبية ليوم تاني
        const i = Math.floor(r() * n);
        const d = r() < 0.96 ? Math.floor(r() * (maxDay(i) + 1)) : Math.min(D - 1, maxDay(i) + 1);
        set(i, d);
      } else if (k < 0.55) {                          // ضم طلبية لتشغيلة نفس الصنف في يوم تاني
        const i = Math.floor(r() * n), list = byProduct[S.orders[i].p];
        const j = list[Math.floor(r() * list.length)];
        const d = st.prodDay[j];
        if (d <= maxDay(i)) set(i, d); else set(i, maxDay(i));
      } else if (k < 0.75) {                          // انقل تشغيلة كاملة (صنف + يوم) ليوم تاني
        const p = Math.floor(r() * P), list = byProduct[p];
        if (list.length) {
          const a = st.prodDay[list[Math.floor(r() * list.length)]];
          const b = Math.floor(r() * D);
          for (const i of list) if (st.prodDay[i] === a && b <= maxDay(i)) set(i, b);
        }
      } else if (k < 0.9) {                           // بدّل يومين بين طلبيتين
        const i = Math.floor(r() * n), j = Math.floor(r() * n);
        const di = st.prodDay[i], dj = st.prodDay[j];
        if (dj <= maxDay(i) && di <= maxDay(j)) { set(i, dj); set(j, di); }
      } else if (k < 0.96) {                          // اسحب طلبية يوم أبكر/أتأخر
        const i = Math.floor(r() * n), d = st.prodDay[i] + (r() < 0.5 ? -1 : 1);
        if (d >= 0 && d <= maxDay(i)) set(i, d);
      } else {                                         // عدّل معامل الاحتياط في الشراء
        st.mu = Math.min(300, Math.max(0, st.mu * Math.exp((r() - 0.5) * 1.2) + (r() < 0.2 ? r() : 0)));
      }
      return undo;
    }
    function revert(st, u) {
      for (let k = u.idx.length - 1; k >= 0; k--) st.prodDay[u.idx[k]] = u.old[k];
      st.mu = u.mu;
    }

    function polish() {
      // بحث موضعي: جرّب كل طلبية في كل يوم، وكل تشغيلة كاملة
      if (feas) { best = feas; bestObj = feasObj; }
      let st = { prodDay: best.prodDay.slice(), mu: best.mu }, obj = score(st).objective, improved = true, pass = 0;
      while (improved && pass++ < 8) {
        improved = false;
        for (let i = 0; i < n; i++) {
          const keep = st.prodDay[i]; let bd = keep, bo = obj;
          for (let d = 0; d < D; d++) {
            if (d === keep || d > Math.max(maxDay(i), 0)) continue;
            st.prodDay[i] = d; const o2 = score(st).objective;
            if (o2 < bo - 1e-6) { bo = o2; bd = d; }
          }
          st.prodDay[i] = bd; if (bd !== keep) { obj = bo; improved = true; }
        }
        for (let p = 0; p < P; p++) for (let a = 0; a < D; a++) for (let b = 0; b < D; b++) {
          if (a === b) continue;
          const moved = byProduct[p].filter(i => st.prodDay[i] === a && b <= maxDay(i));
          if (!moved.length) continue;
          moved.forEach(i => { st.prodDay[i] = b; });
          const o2 = score(st).objective;
          if (o2 < obj - 1e-6) { obj = o2; improved = true; } else moved.forEach(i => { st.prodDay[i] = a; });
        }
        for (const m of [0, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256]) {
          const keep = st.mu; st.mu = m; const o2 = score(st).objective;
          if (o2 < obj - 1e-6) { obj = o2; improved = true; } else st.mu = keep;
        }
      }
      best = { prodDay: st.prodDay.slice(), mu: st.mu }; bestObj = obj;
    }

    initChain();
    return {
      // بينفّذ شغل لمدة budgetMs وبيرجّع true لما يخلّص
      step(budgetMs) {
        const t0 = Date.now();
        while (!done && Date.now() - t0 < budgetMs) {
          if (phase === 'polish') { polish(); done = true; break; }
          for (let k = 0; k < 400 && it < iters; k++, it++, totalIt++) {
            T = T0 * Math.pow(0.002, it / iters);
            const u = propose(cur);
            const res = score(cur), o2 = res.objective, dlt = o2 - curObj;
            if (dlt <= 0 || r() < Math.exp(-dlt / T)) {
              curObj = o2;
              if (o2 < bestObj - 1e-9) { bestObj = o2; best = { prodDay: cur.prodDay.slice(), mu: cur.mu }; }
              if (res.feasible && o2 < feasObj - 1e-9) { feasObj = o2; feas = { prodDay: cur.prodDay.slice(), mu: cur.mu }; }
            } else revert(cur, u);
          }
          if (it >= iters) { chain++; if (chain >= chains) phase = 'polish'; else initChain(); }
        }
        return done;
      },
      progress() { return phase === 'polish' ? 0.97 : Math.min(0.96, (chain + it / iters) / chains); },
      best() { return { prodDay: best.prodDay.slice(), buy: 'dp', mu: best.mu }; },
      bestObjective() { return bestObj; },
    };
  }

  function solve(S, opt) {
    const sv = createSolver(S, opt); sv.step(1e9);
    const plan = sv.best(); return { plan, result: evaluate(S, plan) };
  }

  return { defaultScenario, genOrders, evaluate, baselinePlans, createSolver, solve, tierPrice, DAY_NAMES, rng };
});
