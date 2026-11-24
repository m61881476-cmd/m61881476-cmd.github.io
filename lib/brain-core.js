/* عقل دفتر: شبكة عصبية صغيرة (تصنيف نوع العملية) + مصحّح إملائي، بتشتغل على الجهاز من غير نت.
   نفس الكود بيستخدمه التطبيق والتدريب (tests/brain-train.cjs).
   - الكلمات بتتحوّل لملامح (حروف متتالية 2–4 وكلمات وأزواج كلمات) وتتوزّع على 2^15 خانة.
   - الشبكة: طبقة واحدة softmax (انحدار لوجستي متعدد الفئات) متدرّبة بـ SGD.
   - المصحّح: قاموس كلمات اتعلّمه من جمل التدريب + بحث بالحذف (SymSpell) لمسافة تعديل 1 (و2 للكلمات الطويلة بس).
     أول حرفين في الكلمة ما بيتغيّروش (عشان «هتدفعها» ما تبقاش «هدفعها» و«لبيبسي» ما تبقاش «لجيبي»). */
(function (root) {
  'use strict';
  const BITS = 15, NB = 1 << BITS;
  const AR_D = '٠١٢٣٤٥٦٧٨٩', FA_D = '۰۱۲۳۴۵۶۷۸۹';
  const NUMW = new Set('واحد وحده اتنين اثنين تلاته تلات ثلاث ثلاثه اربعه اربع خمسه خمس سته ست سبعه سبع تمانيه تمن ثمانيه تسعه تسع عشره عشر حداشر اتناشر تلتاشر اربعتاشر خمستاشر ستاشر سبعتاشر تمنتاشر تسعتاشر عشرين تلاتين ثلاثين اربعين خمسين ستين سبعين تمانين ثمانين تسعين ميه مائه ميت ميتين متين تلتميه ربعميه خمسميه ستميه سبعميه تمنميه تسعميه الف الفين الاف تلاف تالاف تلتلاف خمستلاف اربعتلاف ستلاف سبعتلاف تمنتلاف تسعتلاف عشرتلاف مليون ملايين مليونين نص ربع تلت جنيه جنيها جنيهات ج'.split(' '));
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, d => AR_D.indexOf(d)).replace(/[۰-۹]/g, d => FA_D.indexOf(d))
      .replace(/([؀-ۿ])\1{2,}/g, '$1$1')
      .replace(/[^؀-ۿa-z0-9%\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const isNum = w => /^\d/.test(w) || NUMW.has(w) || NUMW.has(w.replace(/^(?:و|ب|بـ)/, ''));
  const tokens = s => norm(s).split(' ').filter(Boolean).map(w => isNum(w) ? '#' : w);
  /* FNV-1a */
  function h(str) { let x = 0x811c9dc5; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193); } return (x >>> 0) & (NB - 1); }
  function features(s) {
    const t = tokens(s), f = new Map();
    const add = k => { const i = h(k); f.set(i, (f.get(i) || 0) + 1); };
    for (let i = 0; i < t.length; i++) {
      const w = t[i]; add('w:' + w); if (i) add('b:' + t[i - 1] + '_' + w);
      if (w !== '#') { const p = '<' + w + '>'; for (let n = 2; n <= 4; n++) for (let j = 0; j + n <= p.length; j++) add('c' + n + ':' + p.substr(j, n)); }
    }
    add('bias'); if (!t.includes('#')) add('nonum'); add('len:' + Math.min(t.length, 12));
    let z = 0; for (const v of f.values()) z += v * v; z = 1 / Math.sqrt(z || 1);
    const idx = new Int32Array(f.size), val = new Float32Array(f.size); let k = 0;
    for (const [i, v] of f) { idx[k] = i; val[k] = v * z; k++; }
    return { idx, val };
  }
  /* model: { labels:[...], C, W:Int8Array(NB*C) row-major by feature, scale:Float32Array(C), bias:Float32Array(C) } */
  function predict(model, s, topN = 3) {
    if (!model) return [];
    const { idx, val } = features(s), C = model.C, z = new Float32Array(C);
    for (let k = 0; k < idx.length; k++) { const base = idx[k] * C, v = val[k]; for (let c = 0; c < C; c++) z[c] += model.W[base + c] * v; }
    let m = -Infinity; for (let c = 0; c < C; c++) { z[c] = z[c] * model.scale[c] + model.bias[c]; if (z[c] > m) m = z[c]; }
    let sum = 0; for (let c = 0; c < C; c++) { z[c] = Math.exp(z[c] - m); sum += z[c]; }
    const out = []; for (let c = 0; c < C; c++) out.push({ label: model.labels[c], p: z[c] / sum });
    return out.sort((a, b) => b.p - a.p).slice(0, topN);
  }
  /* ---------- spelling ---------- */
  function deletes(w, d) { const out = new Set([w]); let cur = [w]; for (let k = 0; k < d; k++) { const nx = []; for (const x of cur) for (let i = 0; i < x.length; i++) { const y = x.slice(0, i) + x.slice(i + 1); if (!out.has(y)) { out.add(y); nx.push(y); } } cur = nx; } return out; }
  function dist(a, b) { // Damerau-Levenshtein (optimal string alignment)
    const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; const d = []; for (let i = 0; i <= m; i++) { d[i] = [i]; } for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) { const c = a[i - 1] === b[j - 1] ? 0 : 1; d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }
    return d[m][n];
  }
  function makeSpeller(lex) { // lex: { word: freq }
    const words = new Map(Object.entries(lex)), index = new Map();
    for (const w of words.keys()) for (const x of deletes(w, w.length >= 8 ? 2 : 1)) { const a = index.get(x); if (a) a.push(w); else index.set(x, [w]); }
    function fix(w) {
      if (words.has(w) || w.length < 4 || isNum(w) || !/^[؀-ۿ]+$/.test(w)) return null;
      const maxD = w.length >= 8 ? 2 : 1; let best = null;
      for (const x of deletes(w, maxD)) { const c = index.get(x); if (!c) continue; for (const cand of c) { if (cand[0] !== w[0] || cand[1] !== w[1]) continue; const dd = dist(w, cand); if (dd > maxD) continue; const f = words.get(cand); if (!best || dd < best.d || (dd === best.d && f > best.f)) best = { w: cand, d: dd, f }; } }
      return best && best.w !== w ? best : null;
    }
    return { fix, has: w => words.has(w) };
  }
  root.DaftarBrain = { BITS, NB, norm, tokens, features, predict, makeSpeller, dist };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DaftarBrain;
})(typeof globalThis !== 'undefined' ? globalThis : this);
