/* ستوديو المونتاج — يقرأ project.json ويعرض الوكلاء وهم يبنون المونتاج ثم يشغّل النتيجة.
   كل العرض دالة في الزمن (showT) علشان يتسجّل فريم بفريم بنفس الشكل بالظبط. */
(() => {
'use strict';
const Q = new URLSearchParams(location.search);
const MANUAL = Q.has('manual');
const PID = (Q.get('p') || 'demo').replace(/[^\w\-]/g, '');
const BASE = `projects/${PID}/`;
const SPEED = +Q.get('speed') || 1;
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const eo = t => 1 - Math.pow(1 - t, 3);
const eob = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const f1 = x => (Math.round(x * 10) / 10).toString();
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const AGENTS = [
  ['lib', 'المكتبة', '#c9a87a'], ['cut', 'القصّ', '#5ac8fa'], ['mic', 'الصوت', '#30d158'], ['cap', 'الترجمة', '#ffd60a'],
  ['zoom', 'الزووم', '#ff9f0a'], ['fx', 'المؤثرات', '#bf5af2'], ['piece', 'العناصر', '#ff6482'], ['music', 'الموسيقى', '#4c9dff'],
  ['color', 'الألوان', '#ff5d7d'], ['font', 'الخطوط', '#64d2ff'], ['review', 'المراجعة', '#a8f05a'], ['export', 'التصدير', '#34e0a1'],
].map(([id, name, color], i) => ({ id, name, color, i, ops: [] }));
const AG = Object.fromEntries(AGENTS.map(a => [a.id, a]));
const LANES = [['cap', 'ترجمة', '#ffd60a'], ['fx', 'مؤثرات', '#bf5af2'], ['piece', 'عناصر', '#ff6482'], ['video', 'فيديو', '#5ac8fa'], ['music', 'موسيقى', '#4c9dff'], ['mic', 'صوت', '#30d158']];
const TR_NAMES = { flash: 'فلاش', punch: 'بَنش', none: '' };
const PIECE_NAMES = { title: 'عنوان', lower: 'شريط اسم', cta: 'دعوة للتفاعل', bar: 'شريط التقدّم', sticker: 'ملصق' };
const SLIDERS = [['zoom', 'زووم', 1, 1.5], ['exposure', 'إضاءة', .7, 1.3], ['contrast', 'تباين', .7, 1.3], ['saturation', 'تشبّع', 0, 2], ['temp', 'حرارة', -1, 1]];
const NEUTRAL = { exposure: 1, contrast: 1, saturation: 1, temp: 0 };

const stage = $('stage'), pv = $('pv'), pctx = pv.getContext('2d'), rawCv = $('rawCv'), rctx = rawCv.getContext('2d');
const HASFILTER = (() => { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(1px)'; return c.filter === 'blur(1px)'; })();
let P, fmt, segs = [], caps = [], pieces = [], D = 1, ops = [], B = 10, PLAY0 = 10, TOTAL = 20;
let SC = 1, SR = { left: 0, top: 0 }, showT = 0, running = false, muted = false, te = 0, music = null;
const lanes = {}, peaks = {}, S = { look: { ...NEUTRAL }, wheel: [0, 0, 0], cap: { style: 0, font: 0, color: 0, pos: 0 }, review: 0, exp: 0 };

/* ---------- layout ---------- */
function fit() {
  const forced = Q.get('layout');
  const p = forced ? forced.toUpperCase() === 'P' : innerHeight > innerWidth * 1.05;
  stage.className = p ? 'P' : 'L';
  const W = p ? 900 : 1600, H = p ? 1600 : 900;
  SC = Math.min(innerWidth / W, innerHeight / H);
  stage.style.transform = `translate(-50%,-50%) scale(${SC})`;
}
addEventListener('resize', fit); fit();
function R(e) { const r = e.getBoundingClientRect(); return { x: (r.left - SR.left) / SC, y: (r.top - SR.top) / SC, w: r.width / SC, h: r.height / SC }; }

/* ---------- media ---------- */
function seekTo(v, t, to = 2500) {
  return new Promise(res => {
    if (!v || v.tagName !== 'VIDEO') return res();
    if (Math.abs(v.currentTime - t) < .004 && v.readyState >= 2 && !v.seeking) return res();
    let done = false; const fin = () => { if (done) return; done = true; v.removeEventListener('seeked', fin); res(); };
    v.addEventListener('seeked', fin); setTimeout(fin, to);
    try { v.currentTime = t; } catch (e) { fin(); }
  });
}
function loadVideo(url) {
  return new Promise(res => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('playsinline', ''); v.src = url;
    let done = false; const fin = () => { if (!done) { done = true; res(v); } };
    v.addEventListener('loadeddata', fin); v.addEventListener('error', fin); setTimeout(fin, 8000); v.load();
  });
}
function loadImage(url) { return new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(i); i.src = url; }); }
async function loadPeaks(url) {
  try {
    const r = await fetch(url); if (+r.headers.get('content-length') > 45e6) return null;
    const buf = await r.arrayBuffer();
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ab = await new OC(1, 1, 44100).decodeAudioData(buf);
    const ch = ab.getChannelData(0), step = ab.sampleRate / 50, n = Math.ceil(ch.length / step), out = new Float32Array(n);
    let mx = 0;
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step | 0, e = Math.min(ch.length, (i + 1) * step | 0); j < e; j += 6) { const a = Math.abs(ch[j]); if (a > m) m = a; } out[i] = m; if (m > mx) mx = m; }
    if (mx > 0) for (let i = 0; i < n; i++) out[i] /= mx;
    return out;
  } catch (e) { return null; }
}
const peakAt = (pk, t) => pk ? (pk[Math.max(0, Math.min(pk.length - 1, t * 50 | 0))] || 0) : 0;
function drawWave(cv, pk, t0, t1, color) {
  const w = cv.width = 2 * Math.max(8, Math.round(cv.clientWidth || 100)), h = cv.height = 48, c = cv.getContext('2d');
  c.fillStyle = color; const mid = h / 2;
  for (let x = 0; x < w; x += 3) { const a = Math.max(.04, peakAt(pk, lerp(t0, t1, x / w))); c.fillRect(x, mid - a * mid * .92, 2, a * h * .92); }
}
const srcDims = e => e.tagName === 'VIDEO' ? [e.videoWidth, e.videoHeight] : [e.naturalWidth, e.naturalHeight];

/* ---------- load project ---------- */
async function load() {
  P = await (await fetch(BASE + 'project.json', { cache: 'no-store' })).json();
  fmt = { w: 1080, h: 1920, fps: 30, ...(P.format || {}) };
  P.look = { ...NEUTRAL, ...(P.look || {}) };
  P.cap = { style: 'pop', font: 'Cairo', color: '#ffd60a', position: .72, size: 1, ...(P.captionStyle || {}) };
  document.title = P.title + ' — ستوديو المونتاج';
  $('projTitle').textContent = $('startTitle').textContent = P.title;
  pv.width = 540; pv.height = Math.round(540 * fmt.h / fmt.w);
  $('fmt').textContent = `${fmt.w}×${fmt.h} · ${fmt.fps}fps`;

  // sources → element pool (عنصرين لكل مصدر متكرر علشان القطع يبقى ناعم)
  const use = {}; (P.segments || []).forEach(s => use[s.src] = (use[s.src] || 0) + 1);
  const pool = {}, jobs = [];
  for (const [id, src] of Object.entries(P.sources)) {
    src.kind = /\.(jpe?g|png|webp|gif)$/i.test(src.file) ? 'image' : 'video';
    const n = src.kind === 'video' && use[id] > 1 ? 2 : 1;
    pool[id] = [];
    for (let k = 0; k < n; k++) jobs.push((src.kind === 'image' ? loadImage : loadVideo)(BASE + src.file).then(e => pool[id][k] = e));
    if (src.kind === 'video' && src.audio !== false) jobs.push(Promise.race([loadPeaks(BASE + src.file), new Promise(r => setTimeout(r, 9000))]).then(p => peaks[id] = p || null));
  }
  if (P.music) {
    music = new Audio(); music.preload = 'auto'; music.src = BASE + P.music.file; music.load();
    jobs.push(Promise.race([loadPeaks(BASE + P.music.file), new Promise(r => setTimeout(r, 9000))]).then(p => peaks.__music = p || null));
  }
  await Promise.all(jobs);
  if (P.music && !peaks.__music) { const r = rng(7), a = peaks.__music = new Float32Array(6000); for (let i = 0; i < a.length; i++) a[i] = .25 + .75 * r() * (i % 25 < 6 ? 1 : .55); }

  let t = 0; const cnt = {};
  segs = P.segments.map((s, i) => {
    const src = P.sources[s.src], k = cnt[s.src] = (cnt[s.src] || 0) + 1, a = s.in || 0;
    const dur = s.out != null ? s.out - a : (s.dur || 2);
    const g = { ...s, i, in: a, dur, t0: t, t1: t + dur, el: pool[s.src][(k - 1) % pool[s.src].length], kind: src.kind,
      label: s.label || src.label || `لقطة ${i + 1}`, hasAudio: src.kind === 'video' && src.audio !== false && !s.mute,
      zoom: s.zoom ? (Array.isArray(s.zoom) ? s.zoom : [1, s.zoom]) : null, transition: s.transition === 'none' ? null : s.transition };
    t += dur; return g;
  });
  D = t;
  caps = (P.captions || []).map(c => ({ ...c, words: c.text.trim().split(/\s+/), rtl: /[؀-ۿ]/.test(c.text) }));
  pieces = (P.pieces || []).map(p => ({ ...p, start: p.start || 0, end: p.end != null ? p.end : D }));
  buildDOM();
  await makeThumbs();
  schedule();
  buildLog();
  $('tcTotal').textContent = '/ ' + tc(D);
  prep(0); paint();
}

const segAt = t => { for (let i = 0; i < segs.length; i++) if (t < segs[i].t1) return i; return segs.length - 1; };
const tc = t => { const f = Math.round(t * fmt.fps), s = f / fmt.fps | 0; return [s / 60 | 0, s % 60, f % fmt.fps].map(n => String(n).padStart(2, '0')).join(':'); };

/* ---------- DOM ---------- */
function item(lane, t0, t1, cls, text) {
  const e = el('div', 'it ' + (cls || ''), text != null ? esc(text) : null);
  e.style.left = (t0 / D * 100) + '%'; e.style.width = `calc(${(t1 - t0) / D * 100}% - 2px)`;
  lanes[lane].appendChild(e); return e;
}
function buildDOM() {
  AGENTS.forEach(a => { a.dot = el('i'); a.dot.style.background = a.dot.style.color = a.color; $('dots').appendChild(a.dot);
    a.cur = el('div', 'cur', `<svg viewBox="0 0 20 22"><path d="M2 1l15 9.5-6.6 1.4L7 18.5z" fill="${a.color}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><span style="background:${a.color}">${a.name}</span>`);
    a.cur.style.opacity = 0; $('cursors').appendChild(a.cur); });
  LANES.forEach(([id, name, c]) => { const l = el('div', 'lane', `<label>${name}</label><div></div>`); l.style.setProperty('--c', c); $('lanes').appendChild(l); lanes[id] = l.lastChild; });
  const step = [1, 2, 5, 10, 15, 30, 60].find(s => D / s <= 14) || 120;
  for (let t = 0; t < D; t += step) { const s = el('span', '', tc(t).slice(0, 5)); s.style.left = (t / D * 100) + '%'; $('ruler').appendChild(s); }
  $('binCount').textContent = segs.length + ' لقطات';
  segs.forEach(s => {
    s.thumbEl = el('div', 'th', `<canvas width="90" height="120"></canvas><span>${f1(s.dur)}s</span>`); $('thumbs').appendChild(s.thumbEl);
    s.clipEl = item('video', s.t0, s.t1, 'clip');
    if (s.hasAudio) { s.micEl = item('mic', s.t0, s.t1, '', null); s.micEl.appendChild(el('canvas')); }
    if (s.zoom) s.zoomEl = item('fx', s.t0, s.t1, 'fxz');
    if (s.transition && s.i > 0) s.trEl = item('fx', Math.max(0, s.t0 - .12), Math.min(D, s.t0 + .25), 'fxt');
  });
  caps.forEach(c => c.el = item('cap', c.start, c.end, '', c.text));
  pieces.forEach(p => {
    p.name = PIECE_NAMES[p.type] || p.type;
    p.el = item('piece', p.start, p.end, p.type === 'bar' ? 'thin' : 'low', p.name + (p.text ? ' · ' + p.text : ''));
    p.listEl = el('div', 'pc', `<i></i>${esc(p.name)}`); $('pieceList').appendChild(p.listEl);
  });
  const chip = (name) => { const c = el('div', 'chip', `<span>${name}</span><canvas></canvas>`); $('audioChips').appendChild(c); return c; };
  if (P.music) { P.music.chip = chip(esc(P.music.label || 'موسيقى')); P.music.el = item('music', 0, D, '', null); P.music.el.appendChild(el('canvas')); }
  if (segs.some(s => s.hasAudio)) chip('صوت اللقطات').classList.add('sel');
  SLIDERS.forEach(([k, name]) => { const r = el('div', 'sl', `<label>${name}</label><div class="slider"><i></i></div><span>0</span>`); $('sliders').appendChild(r); SLIDERS[k] = r; });
  const styles = [['pop', 'بوب'], ['box', 'صندوق'], ['plain', 'عادي']];
  styles.forEach(([k, n]) => { const s = el('span', '', n); s.dataset.k = k; $('optStyle').appendChild(s); });
  ['System', 'Cairo Bold', P.cap.font + ' Black'].forEach(n => $('optFont').appendChild(el('span', '', n)));
  const cols = ['#ffffff', '#ffd60a', '#a8f05a', '#5ac8fa', '#ff6482']; if (!cols.includes(P.cap.color)) cols[1] = P.cap.color;
  cols.forEach(c => { const i = el('i'); i.style.background = c; i.dataset.c = c; $('optColor').appendChild(i); });
}
async function makeThumbs() {
  for (const s of segs) {
    const cv = s.thumbEl.firstChild, c = cv.getContext('2d');
    await seekTo(s.el, s.in + Math.min(s.dur / 2, .6), 1500);
    const [sw, sh] = srcDims(s.el);
    if (sw) { const k = Math.max(90 / sw, 120 / sh); try { c.drawImage(s.el, (90 - sw * k) / 2, (120 - sh * k) / 2, sw * k, sh * k); } catch (e) {} }
    else { const g = c.createLinearGradient(0, 0, 90, 120); g.addColorStop(0, '#243044'); g.addColorStop(1, '#101722'); c.fillStyle = g; c.fillRect(0, 0, 90, 120); }
    try { s.clipEl.style.backgroundImage = `url(${cv.toDataURL('image/jpeg', .6)})`; } catch (e) {}
  }
  requestAnimationFrame(drawWaves);
}
function drawWaves() {
  segs.forEach(s => s.micEl && drawWave(s.micEl.firstChild, peaks[s.src], s.in, s.in + s.dur, '#30d158'));
  if (P.music) { const m0 = P.music.start || 0; drawWave(P.music.el.firstChild, peaks.__music, m0, m0 + D, '#4c9dff'); drawWave(P.music.chip.lastChild, peaks.__music, m0, m0 + Math.min(D, 12), '#4c9dff'); }
}

/* ---------- schedule: تحويل المشروع لحركة وكلاء ---------- */
function schedule() {
  const raw = [];
  const add = (agent, o) => { o.agent = AG[agent]; o.p = 0; raw.push(o); return o; };
  segs.forEach((s, i) => {
    const pick = add('lib', { el: s.thumbEl, dur: .35, tr: .4, kind: 'pick', log: `سحب ${s.label} للتايملاين` });
    s.opCut = add('cut', { el: s.clipEl, dur: 1.0, tr: .45, kind: 'grow', dep: pick, seg: s, log: `قصّ ${s.label} · ${f1(s.in)}s ← ${f1(s.in + s.dur)}s` });
    if (s.micEl) add('mic', { el: s.micEl, dur: .4, tr: .3, kind: 'grow', dep: s.opCut, log: `تنضيف صوت ${s.label}` });
    if (s.zoom) s.opZoom = add('zoom', { el: s.zoomEl, dur: .6, tr: .4, kind: 'grow', dep: s.opCut, log: `زووم ${s.zoom[0]}× ← ${s.zoom[1]}×` });
    if (s.trEl) s.opTr = add('fx', { el: s.trEl, dur: .5, tr: .4, kind: 'grow', dep: s.opCut, log: `انتقال ${TR_NAMES[s.transition] || s.transition} عند ${f1(s.t0)}s` });
  });
  const cut0 = segs[0].opCut;
  caps.forEach(c => c.op = add('cap', { el: c.el, dur: .7, tr: .4, kind: 'grow', dep: segs[segAt(c.start)].opCut, log: `ترجمة «${c.text}»` }));
  pieces.forEach(p => { const a = add('piece', { el: p.listEl, dur: .25, tr: .3, kind: 'pick', dep: segs[segAt(p.start)].opCut });
    p.op = add('piece', { el: p.el, dur: .55, tr: .4, kind: 'grow', dep: a, log: `${p.name}${p.text ? ' «' + p.text + '»' : ''}` }); });
  if (P.music) { const a = add('music', { el: P.music.chip, dur: .4, tr: .4, kind: 'pick', dep: cut0, log: `اختيار ${P.music.label || 'الموسيقى'}` });
    add('music', { el: P.music.el, dur: 3.2, tr: .6, kind: 'grow', dep: a, log: `موسيقى تحت الكلام · مستوى ${Math.round((P.music.volume ?? .25) * 100)}٪` }); }
  ['wh0', 'wh1', 'wh2'].forEach((id, i) => add('color', { el: $(id), dur: .9, tr: .6, kind: 'wheel', i, dep: cut0, log: ['ظبط الظلال', 'ظبط الوسط', 'ظبط الإضاءات'][i] }));
  SLIDERS.slice(1).forEach(([k, name]) => { if (P.look[k] !== NEUTRAL[k]) add('color', { el: SLIDERS[k].children[1], row: SLIDERS[k], dur: .9, tr: .6, kind: 'param', key: k, dep: cut0, log: `${name} ${P.look[k] > NEUTRAL[k] ? '+' : ''}${Math.round((P.look[k] - NEUTRAL[k]) * 100)}` }); });
  if (caps.length) {
    const d = caps[0].op, st = [...$('optStyle').children].find(e => e.dataset.k === P.cap.style) || $('optStyle').firstChild;
    add('font', { el: st, dur: 1.0, tr: .7, kind: 'opt', key: 'style', dep: d, log: `ستايل الترجمة: ${st.textContent}` });
    add('font', { el: $('optFont').lastChild, dur: 1.0, tr: .7, kind: 'opt', key: 'font', dep: d, log: `الخط: ${P.cap.font} Black` });
    add('font', { el: [...$('optColor').children].find(e => e.dataset.c === P.cap.color) || $('optColor').firstChild, dur: 1.0, tr: .7, kind: 'opt', key: 'color', dep: d, log: 'لون تمييز الكلمة' });
    add('font', { el: $('optPos'), dur: 1.0, tr: .7, kind: 'opt', key: 'pos', dep: d, log: 'مكان الترجمة على الشاشة' });
  }
  const review = add('review', { el: lanes.video, dur: 2.2, tr: .5, kind: 'review', depAll: true, log: 'مراجعة القصّات والإيقاع' });
  const exp = add('export', { el: $('exportBtn'), dur: 1.3, tr: .5, kind: 'export', dep: review, log: `تصدير ${fmt.w}×${fmt.h}` });

  const free = {}; let mx = 0;
  raw.forEach(o => {
    const a = o.agent, dep = o.depAll ? mx : (o.dep ? o.dep.end : 0);
    o.ts = Math.max(free[a.id] ?? a.i * .12, dep); o.start = o.ts + o.tr; o.end = o.start + o.dur; free[a.id] = o.end; mx = Math.max(mx, o.end);
  });
  B = (P.show && P.show.build) || clamp(exp.end, 14, 30);
  const k = B / exp.end;
  raw.forEach(o => { o.ts *= k; o.start *= k; o.end *= k; o.dur *= k; o.agent.ops.push(o); });
  ops = raw; S.reviewOp = review;
  PLAY0 = B + .6; TOTAL = PLAY0 + D + 1;
}
function buildLog() {
  const L = ops.filter(o => o.log).sort((a, b) => a.start - b.start);
  L.forEach(o => { o.logEl = el('div', 'lg', `<t>${tc(o.start).slice(3)}</t><b style="color:${o.agent.color}">${o.agent.name}</b>${esc(o.log)}`); $('logLines').appendChild(o.logEl); });
  S.logOps = L;
}

/* ---------- show state ---------- */
function applyOp(o) {
  const p = o.p, e = o.el, hot = p > 0 && p < 1;
  switch (o.kind) {
    case 'grow': e.style.opacity = p > 0 ? 1 : 0; e.style.clipPath = p < 1 ? `inset(-4px ${100 * (1 - eo(p))}% -4px -4px)` : ''; e.classList.toggle('hot', hot); break;
    case 'pick': e.classList.toggle('sel', hot || (p >= 1 && e.classList.contains('chip'))); e.classList.toggle('used', p >= 1); break;
    case 'param': S.look[o.key] = lerp(NEUTRAL[o.key], P.look[o.key], eio(p)); o.row.classList.toggle('hot', hot); break;
    case 'wheel': S.wheel[o.i] = eio(p); e.classList.toggle('hot', hot); break;
    case 'opt': S.cap[o.key] = o.key === 'pos' ? eio(p) : (p >= 1 ? 1 : 0); if (o.key === 'pos') e.classList.toggle('hot', hot); else e.classList.toggle('on', p >= .5); break;
    case 'review': S.review = p; break;
    case 'export': S.exp = p; break;
  }
}
function editTime(t) {
  if (t >= PLAY0) return clamp(t - PLAY0, 0, D - .001);
  const r = S.reviewOp;
  if (t >= r.start) return r.p < 1 ? eio(r.p) * (D - .001) : 0;
  let best = 0, bt = -1;
  for (const s of segs) { const o = s.opCut; if (o.start <= t && o.start > bt) { bt = o.start; best = s.t0 + Math.min(.999, o.p) * s.dur; } }
  return best;
}
function prep(t) {
  showT = t;
  for (const o of ops) { o.p = clamp((t - o.start) / o.dur); applyOp(o); }
  te = editTime(t);
}

/* ---------- drawing ---------- */
function drawCover(ctx, e, W, H, z, focus) {
  const [sw, sh] = srcDims(e); if (!sw) return;
  const k = Math.max(W / sw, H / sh) * z, w = sw * k, h = sh * k, fx = focus ? focus[0] : .5, fy = focus ? focus[1] : .5;
  const x = clamp(W / 2 - fx * w, W - w, 0), y = clamp(H / 2 - fy * h, H - h, 0);
  try { ctx.drawImage(e, x, y, w, h); } catch (err) {}
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function fitFont(ctx, text, weight, size, maxW, fam) { for (let i = 0; i < 12; i++) { ctx.font = `${weight} ${size}px ${fam}`; if (ctx.measureText(text).width <= maxW) break; size *= .92; } return size; }

function drawResult(ctx, W, H, t, full) {
  const s = segs[segAt(t)], dt = t - s.t0, u = dt / s.dur, L = full ? P.look : S.look;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (full || s.opCut.p > 0) {
    let z = 1;
    if (s.zoom && (full || s.opZoom.p >= 1)) z = lerp(s.zoom[0], s.zoom[1], u);
    const trOn = s.transition && s.i > 0 && (full || (s.opTr && s.opTr.p >= 1));
    if (trOn && s.transition === 'punch') z *= 1 + .22 * Math.pow(1 - clamp(dt / .28), 3);
    if (HASFILTER) ctx.filter = `brightness(${L.exposure}) contrast(${L.contrast}) saturate(${L.saturation})`;
    drawCover(ctx, s.el, W, H, z, s.focus);
    ctx.filter = 'none';
    if (L.temp) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = Math.abs(L.temp) * .35; ctx.fillStyle = L.temp > 0 ? '#ff9a3c' : '#3c9aff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (trOn && s.transition === 'flash') { const a = 1 - clamp(dt / .2); if (a > 0) { ctx.globalAlpha = a * .85; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; } }
  }
  for (const p of pieces) if (t >= p.start && t < p.end && (full || p.op.p >= 1)) drawPiece(ctx, W, H, t, p);
  drawCaps(ctx, W, H, t, full);
}
function drawPiece(ctx, W, H, t, p) {
  const fam = `${P.cap.font},Cairo,sans-serif`, a = clamp((t - p.start) / .3), out = clamp((p.end - t) / .2), k = eob(a), col = p.color || '#a8f05a';
  ctx.save(); ctx.globalAlpha = Math.min(1, a * 3) * out; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.direction = /[؀-ۿ]/.test(p.text || '') ? 'rtl' : 'ltr';
  if (p.type === 'bar') { ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff30'; ctx.fillRect(0, 0, W, H * .008); ctx.fillStyle = col; ctx.fillRect(0, 0, W * (t / D), H * .008); }
  else if (p.type === 'title') {
    const y = H * (p.y ?? .2), sz = fitFont(ctx, p.text, 900, W * .105, W * .78, fam), tw = ctx.measureText(p.text).width, bw = tw + W * .09, bh = sz * 1.55;
    ctx.translate(W / 2, y); ctx.scale(k, k); ctx.rotate(-.025);
    ctx.fillStyle = '#000a'; rrect(ctx, -bw / 2 + W * .012, -bh / 2 + W * .014, bw, bh, sz * .28); ctx.fill();
    ctx.fillStyle = col; rrect(ctx, -bw / 2, -bh / 2, bw, bh, sz * .28); ctx.fill();
    ctx.fillStyle = '#0a0d08'; ctx.fillText(p.text, 0, sz * .04);
    if (p.sub) { ctx.rotate(.025); const s2 = fitFont(ctx, p.sub, 700, W * .05, W * .8, fam); ctx.lineWidth = s2 * .22; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000'; ctx.strokeText(p.sub, 0, bh * .5 + s2 * 1.1); ctx.fillStyle = '#fff'; ctx.fillText(p.sub, 0, bh * .5 + s2 * 1.1); }
  } else if (p.type === 'lower') {
    const y = H * (p.y ?? .5), sz = fitFont(ctx, p.text, 900, W * .058, W * .6, fam), tw = ctx.measureText(p.text).width;
    let sw2 = 0, s2 = 0; if (p.sub) { s2 = fitFont(ctx, p.sub, 500, W * .036, W * .6, fam); sw2 = ctx.measureText(p.sub).width; }
    const bw = Math.max(tw, sw2) + W * .08, bh = sz * 1.5 + (p.sub ? s2 * 1.5 : 0), x = W - W * .06 - bw + (1 - eo(a)) * W * .5;
    ctx.fillStyle = '#0b0f15e6'; rrect(ctx, x, y, bw, bh, sz * .25); ctx.fill();
    ctx.fillStyle = col; rrect(ctx, x + bw - W * .012, y, W * .012, bh, 4); ctx.fill();
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = `900 ${sz}px ${fam}`; ctx.fillText(p.text, x + bw - W * .035, y + sz * .8);
    if (p.sub) { ctx.fillStyle = col; ctx.font = `500 ${s2}px ${fam}`; ctx.fillText(p.sub, x + bw - W * .035, y + sz * 1.5 + s2 * .6); }
  } else if (p.type === 'cta') {
    const y = H * (p.y ?? .9), sz = fitFont(ctx, p.text, 900, W * .056, W * .7, fam), tw = ctx.measureText(p.text).width, bw = tw + W * .1, bh = sz * 1.9, pulse = 1 + .04 * Math.sin((t - p.start) * 7);
    ctx.translate(W / 2, y); ctx.scale(k * pulse, k * pulse);
    ctx.fillStyle = col; rrect(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = '#0a0d08'; ctx.fillText(p.text, 0, sz * .04);
  } else if (p.type === 'sticker') {
    const sz = W * (p.size || .16); ctx.translate(W * (p.x ?? .5), H * (p.y ?? .4)); ctx.rotate((p.rot || -8) * Math.PI / 180); ctx.scale(k, k);
    ctx.font = `900 ${sz}px ${fam}`; ctx.lineWidth = sz * .18; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000'; ctx.strokeText(p.text, 0, 0); ctx.fillStyle = col; ctx.fillText(p.text, 0, 0);
  }
  ctx.restore();
}
function drawCaps(ctx, W, H, t, full) {
  const c = caps.find(c => t >= c.start && t < c.end); if (!c || !(full || c.op.p >= 1)) return;
  const st = P.cap, k = full ? { style: 1, font: 1, color: 1, pos: 1 } : S.cap, styled = k.style && st.style !== 'plain';
  const n = c.words.length, act = Math.min(n - 1, Math.floor((t - c.start) / (c.end - c.start) * n));
  const size = W * .085 * (st.size || 1) * (styled ? 1 : .72);
  ctx.save(); ctx.font = k.font ? `900 ${size}px ${st.font},Cairo,sans-serif` : `700 ${size}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = c.rtl ? 'rtl' : 'ltr'; ctx.lineJoin = 'round';
  const sp = ctx.measureText(' ').width * 1.1, maxW = W * .84, lines = []; let cur = [], cw = 0;
  c.words.forEach((w, i) => { const ww = ctx.measureText(w).width; if (cur.length && cw + sp + ww > maxW) { lines.push({ ws: cur, w: cw }); cur = []; cw = 0; } cur.push({ w, ww, i }); cw += (cur.length > 1 ? sp : 0) + ww; });
  lines.push({ ws: cur, w: cw });
  const lh = size * 1.32, yc = H * lerp(.86, st.position, k.pos), pop = styled ? eob(clamp((t - c.start) / .14)) : 1;
  ctx.translate(W / 2, yc); ctx.scale(pop, pop);
  const hi = k.color ? st.color : '#fff';
  lines.forEach((ln, li) => {
    const y = (li - (lines.length - 1) / 2) * lh; let x = c.rtl ? ln.w / 2 : -ln.w / 2;
    ln.ws.forEach(o => {
      const cx = c.rtl ? x - o.ww / 2 : x + o.ww / 2, on = styled && o.i === act;
      if (styled && st.style === 'box') {
        if (on) { ctx.fillStyle = hi; rrect(ctx, cx - o.ww / 2 - size * .16, y - size * .62, o.ww + size * .32, size * 1.24, size * .2); ctx.fill(); }
        else { ctx.lineWidth = size * .2; ctx.strokeStyle = '#000'; ctx.strokeText(o.w, cx, y); }
        ctx.fillStyle = on ? '#0a0d08' : '#fff'; ctx.fillText(o.w, cx, y);
      } else {
        ctx.lineWidth = size * (styled ? .22 : .14); ctx.strokeStyle = '#000'; ctx.strokeText(o.w, cx, y);
        ctx.fillStyle = on ? hi : '#fff'; ctx.fillText(o.w, cx, y);
      }
      x += (c.rtl ? -1 : 1) * (o.ww + sp);
    });
  });
  ctx.restore();
}
function drawRaw(t) {
  const s = segs[segAt(t)], W = rawCv.width, H = rawCv.height;
  rctx.fillStyle = '#05070a'; rctx.fillRect(0, 0, W, H);
  if (showT < PLAY0 && !(s.opCut.p > 0)) return;
  const [sw, sh] = srcDims(s.el); if (!sw) return;
  const k = Math.min(W / sw, H / sh), w = sw * k, h = sh * k;
  try { rctx.drawImage(s.el, (W - w) / 2, (H - h) / 2, w, h); } catch (e) {}
  $('rawLabel').textContent = `${s.label} · ${f1(s.in + (t - s.t0))}s`;
}
const scv = document.createElement('canvas'); scv.width = 48; scv.height = 84; const sctx = scv.getContext('2d', { willReadFrequently: true });
const wave = $('wave'), wctx = wave.getContext('2d'), vec = $('vec'), vctx = vec.getContext('2d');
function drawScopes() {
  let d; try { sctx.drawImage(pv, 0, 0, 48, 84); d = sctx.getImageData(0, 0, 48, 84).data; } catch (e) { return; }
  const ww = wave.width, wh = wave.height, vw = vec.width, R0 = vw / 2 - 8;
  wctx.fillStyle = '#080b10'; wctx.fillRect(0, 0, ww, wh); wctx.fillStyle = '#ffffff10';
  for (let i = 1; i < 4; i++) wctx.fillRect(0, wh * i / 4, ww, 1);
  vctx.fillStyle = '#080b10'; vctx.fillRect(0, 0, vw, vw); vctx.strokeStyle = '#ffffff18'; vctx.lineWidth = 1;
  vctx.beginPath(); vctx.arc(vw / 2, vw / 2, R0, 0, 7); vctx.moveTo(vw / 2 + R0 * .5, vw / 2); vctx.arc(vw / 2, vw / 2, R0 * .5, 0, 7); vctx.moveTo(8, vw / 2); vctx.lineTo(vw - 8, vw / 2); vctx.moveTo(vw / 2, 8); vctx.lineTo(vw / 2, vw - 8); vctx.stroke();
  for (let i = 0, px = 0; i < d.length; i += 4, px++) {
    const r = d[i], g = d[i + 1], b = d[i + 2], y = (.299 * r + .587 * g + .114 * b) / 255, x = px % 48;
    wctx.fillStyle = `rgba(${150 + r * .4 | 0},${170 + g * .33 | 0},${150 + b * .4 | 0},.3)`;
    wctx.fillRect(x / 48 * ww + (px * 7 % 5), (1 - y) * (wh - 6) + 3, 2, 2);
    if (px % 2) continue;
    const cb = (-.169 * r - .331 * g + .5 * b) / 255, cr = (.5 * r - .419 * g - .081 * b) / 255;
    vctx.fillStyle = `rgba(${r},${g},${b},.55)`; vctx.fillRect(vw / 2 + cb * R0 * 2.4, vw / 2 - cr * R0 * 2.4, 2, 2);
  }
}

/* ---------- UI paint ---------- */
function cursorTarget(o, p) {
  const r = R(o.el);
  if (o.kind === 'grow') return { x: r.x + r.w * eo(p), y: r.y + r.h * .55 };
  if (o.kind === 'review') return { x: r.x + r.w * eio(p), y: r.y + r.h * .5 };
  if (o.kind === 'export') return { x: r.x + r.w * .3, y: r.y + r.h * .55 };
  return { x: r.x + r.w * .55, y: r.y + r.h * .55 };
}
function paintCursors(t) {
  let active = 0;
  for (const a of AGENTS) {
    const L = a.ops; let k = -1;
    for (let i = 0; i < L.length; i++) if (L[i].ts <= t) k = i;
    const alive = L.length && t >= L[0].ts && t <= L[L.length - 1].end + .3;
    if (alive) active++;
    if (k < 0 || t >= PLAY0) { a.cur.style.opacity = 0; a.dot.classList.remove('on'); continue; }
    const o = L[k], to = cursorTarget(o, o.p); let x = to.x, y = to.y, op = 1;
    if (t < o.start) {
      const d = R(a.dot), from = k > 0 ? cursorTarget(L[k - 1], 1) : { x: d.x, y: d.y + 10 }, q = eio((t - o.ts) / (o.start - o.ts));
      x = lerp(from.x, to.x, q); y = lerp(from.y, to.y, q) - Math.sin(q * Math.PI) * 18;
      if (k === 0) op = clamp(q * 4);
    }
    if (k === L.length - 1 && t > o.end) op = clamp(1 - (t - o.end - .3) / .4);
    x += Math.sin(t * 5.1 + a.i * 1.7) * 1.6; y += Math.cos(t * 4.3 + a.i) * 1.6;
    a.cur.style.opacity = op; a.cur.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    a.dot.classList.toggle('on', t >= o.ts && t <= o.end);
  }
  $('agentCount').textContent = active;
}
let lastScope = 0;
function paint() {
  const t = showT, full = t >= PLAY0, s = segs[segAt(te)];
  SR = stage.getBoundingClientRect();
  drawResult(pctx, pv.width, pv.height, te, full);
  drawRaw(te);
  if (MANUAL || ++lastScope % 2 === 0) drawScopes();
  // timeline + transport
  $('playhead').style.left = `calc(74px + (100% - 74px) * ${(te / D).toFixed(5)})`;
  $('tc').textContent = $('tcTop').textContent = tc(te);
  const r = S.reviewOp, ph = full ? (t >= PLAY0 + D ? 'خلص ✓' : 'عرض النتيجة') : S.exp > 0 ? 'تصدير' : t >= r.start ? 'مراجعة' : 'الوكلاء بيمنتجوا';
  $('phase').textContent = ph;
  $('status').textContent = full ? 'النسخة النهائية' : `${ph} · ${Math.round(clamp(t / B) * 100)}٪`;
  $('btnPlay').textContent = running ? '❚❚' : '▶';
  // inspector
  const L = full ? P.look : S.look, zs = s.zoom && (full || s.opZoom.p >= 1) ? lerp(s.zoom[0], s.zoom[1], (te - s.t0) / s.dur) : 1;
  SLIDERS.forEach(([k, , a, b]) => { const v = k === 'zoom' ? zs : L[k], row = SLIDERS[k]; row.children[1].firstChild.style.left = (clamp((v - a) / (b - a)) * 100) + '%'; row.lastChild.textContent = v.toFixed(2); });
  const W = full ? [1, 1, 1] : S.wheel, lk = P.look, off = [[-lk.temp * 14, -(lk.contrast - 1) * 45], [lk.temp * 16, -(lk.saturation - 1) * 14], [lk.temp * 10 + 3, -(lk.exposure - 1) * 55]];
  off.forEach(([dx, dy], i) => { $('wh' + i).children[0].style.transform = `translate(${clamp(dx, -20, 20) * W[i]}px,${clamp(dy, -20, 20) * W[i]}px)`; });
  const pk = full ? 1 : S.cap.pos; $('optPos').firstChild.style.left = (lerp(.86, P.cap.position, pk) * 100) + '%';
  // export button
  const eb = $('exportBtn'); eb.firstElementChild.style.width = (S.exp < 1 ? S.exp * 100 : 0) + '%';
  eb.classList.toggle('done', S.exp >= 1); eb.lastElementChild.textContent = S.exp >= 1 ? (P.final ? 'تحميل ⬇' : 'جاهز ✓') : 'تصدير';
  // meters
  const live = full || (t >= r.start && r.p < 1), mic = live && s.hasAudio ? peakAt(peaks[s.src], s.in + te - s.t0) : 0, mus = live && P.music ? peakAt(peaks.__music, (P.music.start || 0) + te) * .7 : 0;
  $('mMic').style.width = (mic * 92) + '%'; $('mMus').style.width = (mus * 92) + '%'; $('mAll').style.width = (Math.min(1, Math.max(mic, mus) * 1.05) * 95) + '%';
  // log
  const LG = S.logOps; let n = 0; while (n < LG.length && LG[n].start <= t) n++;
  if (n !== S.logN) { S.logN = n; LG.forEach((o, i) => { o.logEl.classList.toggle('v', i < n && i >= n - 30); o.logEl.classList.toggle('new', i === n - 1); }); $('logCount').textContent = `${n}/${LG.length}`; }
  paintCursors(t);
}

/* ---------- live playback ---------- */
function sync(playing) {
  const i = segAt(te), s = segs[i], v = s.el, want = s.in + (te - s.t0), nx = segs[i + 1];
  for (const g of segs) if (g.el !== v && g.el.tagName === 'VIDEO' && !g.el.paused) g.el.pause();
  if (v.tagName === 'VIDEO') {
    if (playing) {
      v.muted = muted || !s.hasAudio; v.volume = s.volume ?? 1;
      if (Math.abs(v.currentTime - want) > .3 && !v.seeking) v.currentTime = want;
      if (v.paused) v.play().catch(() => {});
    } else { if (!v.paused) v.pause(); if (!v.seeking && Math.abs(v.currentTime - want) > .04) v.currentTime = want; }
  }
  if (playing && nx && nx.el !== v && nx.el.tagName === 'VIDEO' && !nx.el.seeking && Math.abs(nx.el.currentTime - nx.in) > .05) nx.el.currentTime = nx.in;
  if (music) {
    if (playing) {
      const mw = (P.music.start || 0) + te; music.muted = muted; music.volume = clamp((P.music.volume ?? .25) * clamp((D - te) / 1.2) * clamp(te / .3 + .3));
      if (Math.abs(music.currentTime - mw) > .3) music.currentTime = mw;
      if (music.paused) music.play().catch(() => {});
    } else if (!music.paused) music.pause();
  }
}
let last = 0;
function tick(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (running) { showT += dt * (showT < PLAY0 ? SPEED : 1); if (showT >= TOTAL) { showT = TOTAL; running = false; } }
  prep(showT); sync(running && showT >= PLAY0 && showT < PLAY0 + D); paint();
  requestAnimationFrame(tick);
}
function unlock() { const seen = new Set(); segs.forEach(s => { const v = s.el; if (v.tagName !== 'VIDEO' || seen.has(v)) return; seen.add(v); v.play().then(() => v.pause()).catch(() => {}); }); if (music) music.play().then(() => music.pause()).catch(() => {}); }
function wire() {
  $('startBtn').onclick = () => { unlock(); $('start').classList.add('hide'); showT = 0; running = true; };
  $('btnPlay').onclick = () => { if (showT >= TOTAL - .01) showT = PLAY0; running = !running; };
  $('btnReplay').onclick = () => { showT = 0; running = true; };
  $('btnResult').onclick = () => { showT = PLAY0; running = true; };
  $('btnMute').onclick = () => { muted = !muted; $('btnMute').textContent = muted ? '🔇' : '🔊'; };
  $('prev').onclick = () => $('btnPlay').onclick();
  $('tracks').onclick = e => { if (showT < PLAY0) return; const r = $('lanes').getBoundingClientRect(), x = clamp((e.clientX - r.left - 74 * SC) / (r.width - 74 * SC)); showT = PLAY0 + x * D; };
  if (P.final) { $('exportBtn').href = BASE + P.final; $('exportBtn').download = (P.title || PID) + '.mp4'; }
  fetch('projects/index.json', { cache: 'no-store' }).then(r => r.json()).then(list => { if (list.length < 2) return; list.forEach(p => { const a = el('a', p.id === PID ? 'on' : '', esc(p.title)); a.href = '?p=' + p.id; $('projList').appendChild(a); }); }).catch(() => {});
}

/* ---------- boot ---------- */
const ready = load().then(async () => {
  if (document.fonts) { try { await Promise.all([document.fonts.load('900 20px Cairo', 'ابجد abc'), document.fonts.load('700 20px Cairo', 'ابجد abc'), document.fonts.load('500 20px Cairo', 'ابجد abc')]); } catch (e) {} }
  drawWaves();
  if (MANUAL) { $('start').classList.add('hide'); prep(0); paint(); return; }
  wire();
  $('startInfo').textContent = `${segs.length} لقطات · ${AGENTS.length} وكيل · ${Math.round(D)} ثانية`;
  $('startBtn').disabled = false;
  if (Q.has('auto')) { muted = true; $('btnMute').textContent = '🔇'; $('start').classList.add('hide'); running = true; }
  requestAnimationFrame(t => { last = t; tick(t); });
}).catch(e => { $('startInfo').textContent = 'تعذّر تحميل المشروع: ' + e.message; throw e; });

const xcv = document.createElement('canvas'), xctx = xcv.getContext('2d');
window.__studio = {
  ready,
  info: () => ({ build: B, play0: PLAY0, total: TOTAL, duration: D, fps: fmt.fps, w: fmt.w, h: fmt.h, layout: stage.className }),
  async show(t) { prep(t); const s = segs[segAt(te)]; await seekTo(s.el, s.in + (te - s.t0)); paint(); },
  async frame(t) { t = clamp(t, 0, D - .001); const s = segs[segAt(t)]; await seekTo(s.el, s.in + (t - s.t0));
    if (xcv.width !== fmt.w) { xcv.width = fmt.w; xcv.height = fmt.h; }
    drawResult(xctx, fmt.w, fmt.h, t, true); return xcv.toDataURL('image/jpeg', .93); },
};
})();
