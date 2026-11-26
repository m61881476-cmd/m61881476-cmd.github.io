/* سند و ونس — محرّك اللعبة: تضاريس بتتولّد لوحدها، فيزيا، حركات، سند، إنقاذ، رسم */
'use strict';

const Game = (() => {
  /* ---------- ثوابت ---------- */
  const DX = 14, G = 1500, JUMP = 560, DUO_JUMP = 780, FLIP = 7.4, M = 20; // M = وحدات لكل متر
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const hash = n => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
  const vnoise = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u); };
  const fbm = x => vnoise(x) * 0.6 + vnoise(x * 2.1 + 7) * 0.28 + vnoise(x * 4.3 + 13) * 0.12;

  /* ---------- حالة ---------- */
  let cv, ctx, Wc = 1, Hc = 1, dpr = 1, scale = 1, viewW = 1, viewH = 1;
  let state = 'idle', run = null, hooks = {}, save = null, quality = 1;
  let pts = [], baseX = 0, gen = null;
  let rocks = [], ropes = [], flowers = [], items = [], decor = [], gaps = [], pads = [], signs = [];
  let pigeon = null, ofx = [], shooting = [], heartCloud = null, flash = 0, boltT = 6, constel = null;
  let P = null, hist = [], helper = { x: 0, y: 0, rot: 0 }, cam = { x: 0, y: 0, z: 1 };
  let parts = [], popups = [], bubbles = [], weather = [];
  let time = 0, slow = 1, slowT = 0, shake = 0, acc = 0, last = 0, raf = 0;
  let down = false, downAt = 0, lastAirTap = 0;
  let rescue = null, overT = 0, goalT = 0, hudT = 0, bubbleCd = 0;
  const PAL = BIOMES.map(b => ({
    sky0: Art.hex(b.sky[0]), sky1: Art.hex(b.sky[1]), sun: Art.hex(b.sun), far: Art.hex(b.far), mid: Art.hex(b.mid),
    ground: Art.hex(b.ground), edge: Art.hex(b.edge), shade: Art.hex(b.shade), decorCol: Art.hex(b.decorCol), rock: Art.hex(b.rock), sunY: b.sunY, night: b.night,
  }));

  /* ---------- التضاريس ---------- */
  const ptX = i => baseX + i * DX;
  function idxAt(x) { return (x - baseX) / DX; }
  function hAt(x) {
    const f = idxAt(x), i = Math.floor(f);
    if (i < 0) return pts[0] ? pts[0].y : 0;
    if (i >= pts.length - 1) return pts[pts.length - 1].y;
    return lerp(pts[i].y, pts[i + 1].y, f - i);
  }
  function ptSlope(i) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    if (!a || !b) return 0;
    return (b.y - a.y) / (DX * (Math.min(pts.length - 1, i + 1) - Math.max(0, i - 1)) || 1);
  }
  function slopeAt(x) {
    const f = idxAt(x), i = clamp(Math.floor(f), 0, pts.length - 2);
    return lerp(ptSlope(i), ptSlope(i + 1), clamp(f - i, 0, 1));
  }
  const angAt = x => Math.atan(slopeAt(x));
  function isGap(x) {
    const i = Math.floor(idxAt(x));
    return !!((pts[i] && pts[i].gap) || (pts[i + 1] && pts[i + 1].gap));
  }
  function gapAt(x) { for (const g of gaps) if (x >= g.x1 - DX && x <= g.x2 + DX) return g; return null; }

  function push(slope, gap = false) {
    const prev = pts[pts.length - 1];
    gen.y = prev ? prev.y + slope * DX : 0;
    pts.push({ y: gen.y, gap });
    gen.slope = slope;
  }
  const lastX = () => ptX(pts.length - 1);

  function diff() {
    if (run.mode === 'story') return 0.25 + run.chapter * 0.07;
    return clamp((lastX() - run.startX) / (M * 7000), 0, 1);
  }
  function weights() {
    const d = diff(), zen = run.mode === 'zen';
    let w = { hills: 3, ramp: 1.6, gap: d > 0.04 ? 0.8 + d * 1.5 : 0, cliff: 1, rope: 0.9, flower: 0.7, rocks: 0.6 + d * 1.6 };
    if (run.mode === 'story') {
      const c = run.chapter;
      const S = [
        { gap: 0, rope: 0, rocks: 1.4, cliff: 0.4, ramp: 1.2 },
        { gap: 0, rope: 0, rocks: 0.5, cliff: 1.6, ramp: 2.4 },
        { gap: 0.3, rope: 3.2, rocks: 0.6, ramp: 1.2 },
        { gap: 0.4, rope: 0.6, flower: 1.6, rocks: 0.8 },
        { gap: 0.8, rope: 0.5, cliff: 1.6, rocks: 0.8 },
        { gap: 0.6, rope: 0.6, flower: 2, ramp: 2 },
        { gap: 2.2, rope: 0.4, rocks: 1.2, cliff: 1 },
        { gap: 1.0, rope: 1.0, flower: 1.2, rocks: 1 },
      ][c];
      w = Object.assign(w, S);
    }
    if (zen) { w.gap = 0; w.rocks = 0; }
    if (lastX() - run.startX < 900) { w.gap = 0; w.rocks *= 0.3; }
    return w;
  }
  function pickW(w) {
    let s = 0; for (const k in w) s += w[k];
    let r = Math.random() * s;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'hills';
  }
  function ease(to, n) { const s0 = gen.slope; for (let i = 1; i <= n; i++) push(lerp(s0, to, i / n)); }

  function genFeature() {
    const f = gen.after || pickW(weights()); gen.after = null;
    const x0 = lastX(), d = diff();
    switch (f) {
      case 'hills': {
        const n = (rnd(28, 60)) | 0, s0 = rnd(0.26, 0.42), A = rnd(0.12, 0.3), k = rnd(0.8, 1.8), ph = rnd(0, 6);
        const start = gen.slope;
        for (let i = 0; i < n; i++) {
          const target = s0 + A * Math.sin(ph + (i / n) * TAU * k);
          const s = i < 8 ? lerp(start, target, i / 8) : target;
          push(clamp(s, -0.25, 0.85));
        }
        placeLine(x0 + 60, lastX() - 40);
        break;
      }
      case 'ramp': {
        ease(0.32, 8); for (let i = 0; i < 6; i++) push(0.32);
        const kick = rnd(-0.38, -0.5);
        ease(kick, 6);
        const lip = lastX();
        push(0.9); push(1.1); push(0.8);
        ease(0.38, 6);
        placeArc(lip + 20, 220 + rnd(0, 120), 95);
        break;
      }
      case 'cliff': {
        ease(0.22, 8); for (let i = 0; i < 4; i++) push(0.22);
        const lip = lastX(), drop = rnd(110, 200) * (0.8 + d * 0.4);
        const n = 3; for (let i = 0; i < n; i++) push(drop / (DX * n));
        ease(0.45, 4); ease(0.36, 6);
        placeArc(lip + 30, 200, 70);
        break;
      }
      case 'gap': {
        ease(0.28, 8); for (let i = 0; i < 5; i++) push(0.28);
        ease(-0.22, 5);
        const lipX = lastX(), lipY = gen.y, w = rnd(110, 150) + d * 110;
        const n = Math.ceil(w / DX);
        for (let i = 0; i < n; i++) pts.push({ y: lipY, gap: true });
        gen.slope = 0;
        // الأرض بعد الفجوة أوطى
        const land = rnd(40, 90);
        pts.push({ y: lipY + land, gap: false }); gen.y = lipY + land;
        gen.slope = 0.5; push(0.5); push(0.45); ease(0.36, 6);
        gaps.push({ x1: lipX + DX, x2: lipX + n * DX, y: lipY });
        placeArc(lipX + 10, w + 60, 90);
        break;
      }
      case 'rope': {
        ease(0.3, 6);
        const n = (rnd(30, 40)) | 0, xs = lastX();
        for (let i = 0; i < n; i++) push(0.3 + 0.06 * Math.sin(i / n * Math.PI));
        const xa = xs + 40, xb = lastX() - 40, lift = rnd(70, 82);
        ropes.push({ x1: xa, y1: hAt(xa) - lift, x2: xb, y2: hAt(xb) - lift, sag: rnd(14, 24), seed: Math.random() * 99 });
        if (Math.random() < 0.7) for (let i = 1; i < 8; i++) {
          const x = lerp(xa, xb, i / 8); items.push({ x, y: ropeY(ropes[ropes.length - 1], x) - 20, type: 'coin' });
        }
        break;
      }
      case 'flower': {
        ease(0.3, 6); const xs = lastX();
        for (let i = 0; i < 26; i++) push(0.3 + 0.08 * Math.sin(i / 4));
        flowers.push({ x: xs + 60, used: 0 });
        placeArc(xs + 90, 260, 170);
        break;
      }
      case 'rocks': {
        const n = (rnd(34, 54)) | 0, xs = lastX();
        ease(0.32, 6);
        for (let i = 0; i < n; i++) push(0.32 + 0.1 * Math.sin(i / 7));
        const cnt = d > 0.5 && Math.random() < 0.5 ? 2 : 1;
        for (let k = 0; k < cnt; k++) {
          const x = xs + 140 + k * rnd(220, 300);
          if (x < lastX() - 60) rocks.push({ x, w: rnd(22, 32), h: rnd(16, 24), broken: 0 });
        }
        placeLine(xs + 30, xs + 110);
        break;
      }
    }
    // ديكور
    for (let x = x0 + rnd(40, 160); x < lastX(); x += rnd(110, 280)) {
      if (!isGap(x)) decor.push({ x, s: rnd(0.75, 1.25), seed: (Math.random() * 1000) | 0, back: Math.random() < 0.55 });
    }
    specials(x0, lastX());
  }

  /* حاجات بتتلم */
  function placeLine(a, b) {
    if (b - a < 80) return;
    const r = Math.random(), heartRate = run.mode === 'story' && (run.chapter === 3 || run.chapter === 5 || run.chapter === 7) ? 0.6 : 0.25;
    if (r < heartRate) {
      for (let x = a; x < Math.min(b, a + 200); x += 50) if (!isGap(x)) items.push({ x, y: hAt(x) - 30, type: 'heart' });
    } else if (r < 0.85) {
      for (let x = a; x < Math.min(b, a + 260); x += 34) if (!isGap(x)) items.push({ x, y: hAt(x) - 24, type: 'coin' });
    }
  }
  function placeArc(x, w, hgt) {
    const n = 6;
    const heart = Math.random() < 0.3;
    for (let i = 0; i <= n; i++) {
      const t = i / n, xx = x + t * w;
      const base = Math.min(hAt(x), hAt(xx));
      items.push({ x: xx, y: base - 40 - Math.sin(t * Math.PI) * hgt, type: heart && i === 3 ? 'heart' : 'coin' });
    }
  }
  function specials(a, b) {
    const story = run.mode === 'story', c = run.chapter;
    const mid = (a + b) / 2;
    if (isGap(mid)) return;
    if (story && c === 0 && run.pagesSpawned < 14 && Math.random() < 0.6) {
      items.push({ x: mid, y: hAt(mid) - rnd(35, 85), type: 'page' }); run.pagesSpawned++;
    } else if (story && c === 4 && Math.random() < 0.35 && !P.glideT) {
      items.push({ x: mid, y: hAt(mid) - 70, type: 'feather' });
    } else if (!story || c > 3) {
      const r = Math.random(), zen = run.mode === 'zen';
      if (r < 0.05) items.push({ x: mid, y: hAt(mid) - 70, type: 'feather' });
      else if (r < 0.09) items.push({ x: mid, y: hAt(mid) - 60, type: 'magnet' });
      else if (r < 0.115 && !zen) items.push({ x: mid, y: hAt(mid) - 90, type: 'vstar' });
      else if (r < 0.155) items.push({ x: mid, y: hAt(mid) - 40, type: 'gift' });
      else if (r < 0.175 && !zen) items.push({ x: mid, y: hAt(mid) - 60, type: 'x2' });
      else if (r < 0.195 && !zen) items.push({ x: mid, y: hAt(mid) - 60, type: 'bubble' });
      else if (r < 0.21) items.push({ x: mid, y: hAt(mid) - 60, type: 'hourglass' });
      else if (r < 0.23) items.push({ x: mid, y: hAt(mid) - 50, type: 'balloon' });
    }
    // دفعات سرعة
    if (Math.random() < 0.14 && !isGap(mid + 50) && !isGap(mid - 50)) pads.push({ x: mid + rnd(-30, 30), used: 0 });
    // يافطات حب وعلامة كل كيلو
    if (!run.attract) {
      if (lastX() - (run.lastSign || 0) > M * 650 && !isGap(mid)) { run.lastSign = lastX(); signs.push({ x: mid + 40, text: pick(LOVE_SIGNS), kind: 'love' }); }
      const mx = run.startX + (run.nextMileSign || 1) * 1000 * M;
      if (mx >= a && mx < b) { let xx = mx; while (isGap(xx) && xx < b) xx += 20; signs.push({ x: xx, text: (run.nextMileSign || 1) + ' كم 🏁', kind: 'mile' }); run.nextMileSign = (run.nextMileSign || 1) + 1; }
    }
  }

  function ensureTerrain() {
    const need = cam.x + Math.max(viewW * 1.8 + 600, view3d ? 2900 : 0);
    while (lastX() < need) genFeature();
    // نشيل اللي عدّى
    const cut = cam.x - 600;
    const drop = Math.floor((cut - baseX) / DX) - 2;
    if (drop > 50) { pts.splice(0, drop); baseX += drop * DX; }
    const keep = o => (o.x2 || o.x) > cut;
    rocks = rocks.filter(keep); ropes = ropes.filter(keep); flowers = flowers.filter(keep);
    items = items.filter(keep); decor = decor.filter(keep); gaps = gaps.filter(keep); pads = pads.filter(keep); signs = signs.filter(keep);
  }

  /* ---------- البيئات والألوان ---------- */
  const SEG = M * 1800, BLEND = 4000;
  function biomeAt(x) {
    if (run.mode === 'story') return { i: run.biome, j: run.biome, t: 0 };
    const d = Math.max(0, x - run.startX), s = Math.floor(d / SEG), within = d - s * SEG;
    const i = (run.biome + s) % 8, j = (i + 1) % 8;
    const t = within > SEG - BLEND ? (within - (SEG - BLEND)) / BLEND : 0;
    return { i, j, t: t * t * (3 - 2 * t) };
  }
  function palette(x) {
    const b = biomeAt(x), A = PAL[b.i], B = PAL[b.j], t = b.t, o = {};
    for (const k of ['sky0', 'sky1', 'sun', 'far', 'mid', 'ground', 'edge', 'shade', 'decorCol', 'rock']) o[k] = Art.rgb(Art.mixRgb(A[k], B[k], t));
    o.sunY = lerp(A.sunY, B.sunY, t); o.night = lerp(A.night, B.night, t);
    o.main = t < 0.5 ? b.i : b.j; o.bi = b.i; o.bj = b.j; o.t = t;
    const k = dayNight() * (1 - o.night);
    if (k > 0.01) {
      const mixK = (key, to, a) => { const v = Art.mixRgb(Art.mixRgb(A[key], B[key], t), to, a); o[key] = Art.rgb(v); };
      mixK('sky0', [10, 16, 44], k); mixK('sky1', [44, 36, 86], k * 0.9); mixK('sun', [242, 240, 230], k);
      ['far', 'mid', 'ground', 'edge', 'shade', 'decorCol', 'rock'].forEach(key => mixK(key, [40, 44, 90], k * (key === 'ground' || key === 'edge' ? 0.35 : 0.5)));
      o.sunY = lerp(o.sunY, 0.25, k); o.night = Math.max(o.night, k);
    }
    return o;
  }

  function dayNight() {
    if (!run || run.mode === 'story' || run.attract) return 0;
    return Math.max(0, (1 - Math.cos((run.clock || 0) * Math.PI * 2 / 160)) / 2 - 0.08) * 0.92;
  }

  /* ---------- اللاعب ---------- */
  function newPlayer(x) {
    return { x, y: 0, vy: 0, speed: 300, rot: 0, rotV: 0, grounded: true, grind: null, air: 0, flipAcc: 0, coyote: 0, land: 0,
      twirl: 0, twirlUsed: false, invuln: 0, dead: false, deadT: 0, glideT: 0, gliding: 0, glideCounted: false, magnetT: 0, vstarT: 0,
      power: 0, boostT: 0, duoT: 0, grindT: 0 };
  }
  const minSp = () => run.mode === 'zen' ? 250 : 270;
  const maxSp = () => 455 + (P.boostT > 0 ? 130 : 0) + (P.power > 0 ? 50 : 0) + diff() * 55;
  const tol = () => run.mode === 'zen' ? 9 : (run.tol || 0.85);
  const heartCap = () => 12 - (save.up.heart || 0) * 2;
  const holding = () => down;

  function jump() {
    if (P.dead || state !== 'play') return;
    const canGround = P.grounded || P.coyote > 0 || P.grind;
    if (!canGround) return;
    const duo = P.power > 0;
    if (P.grind) endGrind();
    P.grounded = false; P.coyote = 0;
    P.vy = Math.min(P.vy, 0) - (duo ? DUO_JUMP : JUMP) * (P.grind ? 0.9 : 1);
    P.vy = Math.max(P.vy, -(duo ? DUO_JUMP : JUMP) - 220);
    P.air = 0; P.flipAcc = 0; P.twirlUsed = false;
    Sound.play(duo ? 'duo' : 'jump');
    burst(P.x, P.y, 8, ['#ffffff', '#e9e3ff'], 120, 'dot');
    if (duo) {
      P.duoT = 1.2; run.stats.duos++; save.stats.duos = (save.stats.duos || 0) + 1;
      trick('duo'); say(helperWho(), 'duo', 0.8);
      for (let i = 0; i < 6; i++) parts.push({ x: P.x - 18, y: P.y - 40, vx: rnd(-60, 60), vy: rnd(-160, -60), life: 1.2, max: 1.2, size: rnd(4, 7), col: '#c9a6ff', type: 'heart' });
    }
  }
  function onDown() {
    if (state !== 'play') return;
    down = true; downAt = time;
    if (P.grounded || P.grind || P.coyote > 0) { jump(); return; }
    // نقرتين في الهوا = لفّة الطرحة
    if (time - lastAirTap < 0.32 && !P.twirlUsed && !P.dead) {
      P.twirlUsed = true; P.twirl = 0.001; trick('twirl'); Sound.play('twirl');
      save.stats.twirls = (save.stats.twirls || 0) + 1;
      if (save.stats.twirls >= 10) ach('twirl10');
    }
    lastAirTap = time;
  }
  function onUp() { down = false; }

  function startGrind(r) {
    P.grind = r; P.grounded = false; P.grindT = 0; P.rotV = 0;
    const flips = Math.floor((P.flipAcc + 0.8) / TAU);
    if (flips > 0) trick('flip', flips);
    P.flipAcc = 0; P.air = 0;
    Sound.grind(true); Sound.play('land');
  }
  function endGrind() {
    const r = P.grind; if (!r) return;
    P.grind = null; Sound.grind(false);
    if (P.grindT > 0.25) {
      run.stats.grinds++;
      trick('grind', P.grindT);
      if (P.grindT > 2.5) ach('grind3s');
    }
  }
  function ropeY(r, x) {
    const t = clamp((x - r.x1) / (r.x2 - r.x1), 0, 1);
    return lerp(r.y1, r.y2, t) + r.sag * 4 * t * (1 - t);
  }
  function ropeSlope(r, x) {
    const t = clamp((x - r.x1) / (r.x2 - r.x1), 0, 1);
    return (r.y2 - r.y1) / (r.x2 - r.x1) + r.sag * 4 * (1 - 2 * t) / (r.x2 - r.x1);
  }

  function step(dt) {
    time += dt;
    if (P.invuln > 0) P.invuln -= dt;
    P.land = Math.max(0, P.land - dt * 5);
    if (P.twirl) { P.twirl += dt * 1.6; if (P.twirl >= 1) P.twirl = 0; }
    for (const k of ['glideT', 'magnetT', 'vstarT', 'boostT', 'duoT', 'x2T', 'bubbleT', 'hgT', 'balloonT']) if (P[k] > 0) P[k] = Math.max(0, P[k] - dt);
    run.clock = (run.clock || 0) + dt;
    if (P.power > 0) { P.power -= dt; if (P.power <= 0) { P.power = 0; hooks.toast && hooks.toast('سند رجع ورا 🤍'); } }
    if (P.dead) { stepDead(dt); return; }

    if (P.grind) {
      const r = P.grind, a = Math.atan(ropeSlope(r, P.x));
      P.speed = clamp(P.speed + Math.sin(a) * 500 * dt, minSp(), maxSp());
      P.x += P.speed * dt; P.grindT += dt;
      P.y = ropeY(r, P.x); P.vy = ropeSlope(r, P.x) * P.speed; P.rot = a;
      run.score += 120 * dt * mult();
      if (Math.random() < 0.6) parts.push({ x: P.x, y: P.y, vx: rnd(-80, -20), vy: rnd(-60, 30), life: 0.4, max: 0.4, size: 2, col: '#ffe9a6', type: 'dot' });
      if (P.x >= r.x2) { endGrind(); P.coyote = 0.12; }
    } else if (P.grounded) {
      const a = angAt(P.x);
      P.speed = clamp(P.speed + (Math.sin(a) * 620 - 35) * dt, minSp(), maxSp());
      const nx = P.x + P.speed * dt;
      if (isGap(nx)) { leaveGround(); P.x = nx; P.y += P.vy * dt; }
      else {
        const nvy = slopeAt(nx) * P.speed;
        if ((nvy - P.vy) / dt > G * 1.7) { leaveGround(); P.x = nx; P.y += P.vy * dt; }
        else {
          P.x = nx; P.y = hAt(nx); P.vy = nvy;
          P.rot += angDiff(a, P.rot) * Math.min(1, dt * 14);
          spray(dt);
        }
      }
      comboTick(dt);
      hitRocks();
      hitFlowers();
      for (const pd of pads) if (!pd.used && Math.abs(pd.x - P.x) < 22) {
        pd.used = 1; P.boostT = Math.max(P.boostT, 2.4); P.speed = Math.min(maxSp() + 60, P.speed + 150);
        Sound.play('boost'); vibrate(15); evt('pad'); burst(P.x, P.y, 10, ['#c9a6ff', '#ffffff'], 180, 'star');
        save.stats.pads = (save.stats.pads || 0) + 1; if (save.stats.pads >= 20) ach('pads20');
      }
      if (P.balloonT > 0) { leaveGround(); P.vy = -260; }
    } else {
      stepAir(dt);
    }
    P.coyote = Math.max(0, P.coyote - dt);
    // مسافة
    const dist = (P.x - run.startX) / M;
    if (dist > run.dist) { run.score += (dist - run.dist) * (run.mode === 'zen' ? 0 : 1); run.dist = dist; }
    collect();
    stepPigeon(dt);
    if (!run.attract) {
      const km = Math.floor(run.dist / 1000);
      if (km >= (run.nextMile || 1)) {
        run.nextMile = km + 1;
        pop('🏁 ' + km + ' كيلو!', MILE_LINES[Math.min(km - 1, MILE_LINES.length - 1)]);
        bubbles.push({ who: helper.vis > 0.5 ? helperWho() : run.main, text: MILE_LINES[Math.min(km - 1, MILE_LINES.length - 1)], t: 0 }); bubbleCd = 2.5;
        Sound.play('ach'); if (km >= 5) ach('mile5');
      }
      if (run.mode === 'free' && !run.bestBeat && save.best.free > 500 && run.score > save.best.free) { run.bestBeat = true; fireworks(); pop('رقم قياسي جديد! 🎆', ''); }
      if (dayNight() > 0.6) ach('night');
    }
    hist.push({ x: P.x, y: P.y, rot: P.rot, g: P.grounded || !!P.grind, glide: P.gliding > 0, tw: P.twirl });
    if (hist.length > 240) hist.shift();
    // البيئة
    if (run.mode !== 'story') {
      const b = biomeAt(P.x).i;
      if (b !== run.curBiome) { run.curBiome = b; Sound.setMood(b); hooks.biome && hooks.biome(b); visit(b); }
    }
  }
  function leaveGround() { P.grounded = false; P.coyote = 0.1; P.air = 0; P.flipAcc = 0; P.twirlUsed = false; }

  function stepAir(dt) {
    P.air += dt;
    if (P.balloonT > 0) P.vy = Math.max(P.vy - G * 1.6 * dt, -240);
    const glideOn = P.glideT > 0 && holding() && P.vy > -50;
    if (glideOn) {
      P.vy = Math.min(P.vy + G * 0.22 * dt, 95);
      P.rot += angDiff(-0.08, P.rot) * Math.min(1, dt * 6);
      P.gliding += dt; P.rotV = 0;
      if (P.gliding > 0.8 && !P.glideCounted) { P.glideCounted = true; run.stats.glides++; trick('glide'); }
    } else {
      P.vy += G * dt;
      if (P.gliding > 0 && !holding()) { P.gliding = 0; P.glideCounted = false; }
      if (holding() && time - downAt > 0.06) P.rotV = -FLIP * (P.power > 0 ? 1.08 : 1);
      else P.rotV *= Math.pow(0.0005, dt);
      P.rot += P.rotV * dt;
      P.flipAcc += Math.max(0, -P.rotV * dt);
      // مساعدة خفيفة في الهبوط (الصعوبة هادية)
      if (!holding()) {
        const below = isGap(P.x) ? 999 : hAt(P.x) - P.y;
        if (below < 160) {
          const a = angAt(P.x + P.speed * 0.08), dd = angDiff(a, P.rot);
          if (Math.abs(dd) < 1.25) P.rot += dd * Math.min(1, dt * (run.assist || 5));
        }
      }
    }
    const px = P.x, py = P.y;
    P.speed = Math.max(minSp(), P.speed - 6 * dt);
    P.x += P.speed * dt; P.y += P.vy * dt;
    if (P.y < py - 1 && Math.random() < 0.3 && P.duoT > 0) parts.push({ x: P.x - 14, y: P.y - 30, vx: -40, vy: 20, life: 0.8, max: 0.8, size: 3, col: '#d9c2ff', type: 'heart' });
    // حبال
    if (P.vy > 0) for (const r of ropes) {
      if (P.x < r.x1 || P.x > r.x2 - 10) continue;
      const ry0 = ropeY(r, px), ry = ropeY(r, P.x);
      if (py <= ry0 + 3 && P.y >= ry - 1) {
        const dd = Math.abs(angDiff(P.rot, Math.atan(ropeSlope(r, P.x))));
        if (dd < tol() + 0.3 || run.mode === 'zen') { P.y = ry; startGrind(r); return; }
      }
    }
    // ورد بيزق
    hitFlowers();
    // هبوط
    if (!isGap(P.x) && P.y >= hAt(P.x)) { landCheck(); return; }
    const g = gapAt(P.x);
    if (g && P.y > g.y + 230) crash('fall');
    if (P.y > hAt(P.x) + 400 && !g) crash('fall');
    hitRocks();
  }

  function landCheck() {
    const a = angAt(P.x), d = Math.abs(angDiff(P.rot, a));
    if (d <= tol() || P.invuln > 0) {
      const flips = Math.floor((P.flipAcc + 0.8) / TAU);
      P.grounded = true; P.y = hAt(P.x); P.vy = slopeAt(P.x) * P.speed; P.rotV = 0;
      const perfect = d < 0.2 && P.air > 0.45;
      if (P.air > 0.25) { P.land = 1; Sound.play('land'); burst(P.x, P.y, 10 + P.air * 8, [cssEdge(), '#ffffff'], 160, 'dot'); }
      if (P.air > 1.3) trick('air', P.air);
      if (flips > 0) trick('flip', flips);
      if (perfect) trick('perfect');
      if (d > 0.45 && run.mode !== 'zen') { P.speed *= 0.8; }
      P.rot = a; P.flipAcc = 0; P.air = 0; P.gliding = 0; P.glideCounted = false;
      if (P.air > 0.6) shake = Math.max(shake, 3);
    } else crash('land');
  }

  function crash(reason) {
    if (P.dead || rescue) return;
    if (run.mode === 'zen') {
      if (reason === 'fall') { safePlace(); return; }
      P.rot = angAt(P.x); P.grounded = true; P.y = hAt(P.x); P.flipAcc = 0; P.air = 0; return;
    }
    if (P.invuln > 0 && reason !== 'fall') { P.rot = angAt(P.x); P.grounded = true; P.y = hAt(P.x); return; }
    endGrind();
    if (P.bubbleT > 0) {
      P.bubbleT = 0; Sound.play('pop'); ach('bubbleSave');
      burst(P.x, P.y - 20, 18, ['#bfe3ff', '#ffffff'], 220, 'dot');
      if (reason === 'fall') safePlace(); else { P.rot = angAt(P.x); P.grounded = true; P.y = hAt(P.x); P.flipAcc = 0; P.air = 0; }
      P.invuln = 1.2; pop('الفقاعة حمتك 🫧', ''); return;
    }
    if (P.power > 0) { startRescue(true); return; }
    if (canSummon() && save.settings.autoRescue !== false) { consumeSummon(); startRescue(false); return; }
    // وقعة
    P.dead = true; P.deadT = 0; P.rotV = rnd(-9, -5); P.vy = Math.min(P.vy, -200);
    combo.end(true);
    Sound.play('crash'); vibrate([60, 40, 90]); shake = 10;
    burst(P.x, P.y, 26, [cssEdge(), '#ffffff', '#cccccc'], 260, 'dot');
    say(helperWho(), 'rescue', 1);
  }
  function stepDead(dt) {
    P.deadT += dt;
    if (!P.settled) {
      P.vy += G * dt; P.x += P.speed * 0.4 * dt; P.y += P.vy * dt; P.rot += P.rotV * dt; P.speed *= 0.98;
      if (!isGap(P.x) && P.y >= hAt(P.x)) { P.y = hAt(P.x); P.settled = true; P.rot = angAt(P.x) - 1.5; burst(P.x, P.y, 14, [cssEdge(), '#fff'], 140, 'dot'); }
    }
    if (P.deadT > 1.6 && state === 'play') {
      if (!run.revived && run.mode !== 'zen' && !run.attract && hooks.revive) { state = 'ask'; Sound.grind(false); hooks.revive(); }
      else finish(false);
    }
  }

  /* ---------- سند: الاستدعاء والإنقاذ ---------- */
  function canSummon() { return run.meter >= heartCap() || run.charges > 0; }
  function consumeSummon() {
    if (run.meter >= heartCap()) run.meter = 0; else run.charges--;
  }
  function summon() {
    if (state !== 'play' || P.dead || P.power > 0 || !canSummon()) return false;
    consumeSummon();
    P.power = 8 + (save.up.power || 0) * 2.5;
    run.stats.summons++;
    if (run.solo && helper.vis < 0.5) arrive();
    Sound.play('summon'); vibrate([40, 90, 40, 260, 40, 90, 40]); evt('summon');
    const g = gapAt(P.x + 220) || gapAt(P.x);
    const rockAhead = rocks.some(r => !r.broken && r.x > P.x && r.x < P.x + 450);
    if (!P.grounded && !P.grind && g) {
      P.vy = Math.min(P.vy, 0) - 820; P.speed += 90; P.duoT = 1;
      pop('رفعة سند! 🚀', '+300'); run.score += 300;
    } else if (rockAhead) pop('سند هيحميكي 🛡️', '');
    else pop(helperWho() === 's' ? 'سند جنبك 🤍' : 'ونس جنبك 💜', '');
    say(helperWho(), 'summon', 1);
    for (let i = 0; i < 18; i++) parts.push({ x: P.x - 30, y: P.y - 25, vx: rnd(-160, 160), vy: rnd(-200, 40), life: 1, max: 1, size: rnd(3, 6), col: pick(['#c9a6ff', '#ffffff', '#ffd6f2']), type: i % 3 ? 'star' : 'heart' });
    return true;
  }
  function arrive() {
    // سند/ونس جاي طاير من ورا لما يتستدعى في وضع "لوحدي"
    helper.x = P.x - 260; helper.y = P.y - 230; helper.arrive = 1; run.hoff = 140; helper.vis = 1;
    for (let i = 0; i < 14; i++) parts.push({ x: helper.x, y: helper.y, vx: rnd(-80, 80), vy: rnd(-80, 80), life: 0.9, max: 0.9, size: rnd(3, 6), col: pick(['#c9a6ff', '#ffffff']), type: 'star' });
  }
  function startRescue(free) {
    if (run.solo && helper.vis < 0.5) { helper.x = P.x - 260; helper.y = P.y - 230; helper.vis = 1; }
    rescue = { t: 0, from: { x: helper.x, y: helper.y }, free, done: false };
    state = 'rescue';
    run.stats.rescues++; save.stats.rescues = (save.stats.rescues || 0) + 1;
    if (save.stats.rescues >= 10) ach('rescue10');
    Sound.play('rescue'); vibrate(40); evt('rescue');
    say(helperWho(), 'rescue', 1);
  }
  function stepRescue(dt) {
    rescue.t += dt;
    const k = clamp(rescue.t / 0.55, 0, 1), e = 1 - Math.pow(1 - k, 3);
    if (!rescue.done) {
      helper.x = lerp(rescue.from.x, P.x - 10, e);
      helper.y = lerp(rescue.from.y, P.y - 10, e) - Math.sin(e * Math.PI) * 80;
      helper.rot = -0.3;
      if (k >= 1) {
        rescue.done = true;
        for (let i = 0; i < 20; i++) parts.push({ x: P.x, y: P.y - 25, vx: rnd(-200, 200), vy: rnd(-220, 60), life: 1.2, max: 1.2, size: rnd(4, 8), col: pick(['#c9a6ff', '#ffd6f2', '#ffffff']), type: 'heart' });
        safePlace();
        pop(helperWho() === 's' ? 'سند لحقك 🤍' : 'ونس لحقتك 💜', '');
      }
    } else if (rescue.t > 0.95) {
      rescue = null; state = 'play'; P.invuln = 1.6;
    }
  }
  function safePlace() {
    let x = P.x + 30;
    const g = gapAt(x) || gapAt(P.x);
    if (g) x = g.x2 + 70;
    for (let k = 0; k < 20; k++) {
      const bad = isGap(x) || rocks.some(r => !r.broken && Math.abs(r.x - x) < 70) || gapAt(x + 40);
      if (!bad) break; x += 40;
    }
    P.x = x; P.y = hAt(x); P.rot = angAt(x); P.grounded = true; P.grind = null; P.vy = slopeAt(x) * P.speed;
    P.speed = Math.max(P.speed, 320); P.air = 0; P.flipAcc = 0; P.rotV = 0; P.dead = false; P.settled = false;
    hist = [];
    for (let xx = x - 120; xx <= x; xx += 6) if (!isGap(xx)) hist.push({ x: xx, y: hAt(xx), rot: angAt(xx), g: true });
  }
  const helperWho = () => run.main === 'w' ? 's' : 'w';

  function placeHelper(dt) {
    if (state === 'rescue') { helper.vis = 1; return; }
    if (run.solo) {
      const want = P.power > 0 ? 1 : 0;
      helper.vis = lerp(helper.vis, want, Math.min(1, dt * (want ? 6 : 1.6)));
      if (!want) { // بيمشي ويطير لفوق
        helper.leave = (helper.leave || 0) + dt;
        if (helper.vis < 0.03) return;
        helper.y -= 90 * dt * helper.leave * 4; helper.x -= 40 * dt; return;
      }
      helper.leave = 0;
    } else helper.vis = 1;
    if (helper.arrive > 0) {
      helper.arrive = Math.max(0, helper.arrive - dt * 1.6);
      const tx0 = P.x - 30;
      helper.x = lerp(helper.x, tx0, Math.min(1, dt * 5)); helper.y = lerp(helper.y, P.y, Math.min(1, dt * 5)); helper.rot = -0.4 * helper.arrive;
      return;
    }
    const off = P.power > 0 ? 30 : 78;
    run.hoff = run.hoff == null ? off : lerp(run.hoff, off, Math.min(1, dt * 3));
    const tx = P.x - run.hoff;
    let s = null;
    for (let i = hist.length - 1; i >= 0; i--) if (hist[i].x <= tx) { s = hist[i]; break; }
    if (!s && hist.length) s = hist[0];
    if (!s) { helper.x = tx; helper.y = P.y; helper.rot = P.rot; return; }
    helper.x = lerp(helper.x || s.x, s.x, Math.min(1, dt * 20));
    helper.y = lerp(helper.y || s.y, s.y, Math.min(1, dt * 20));
    helper.rot = s.rot; helper.g = s.g; helper.glide = s.glide; helper.tw = s.tw;
    if (P.dead) { helper.x = Math.min(helper.x, P.x - 30); }
  }

  /* ---------- حركات ونقط ---------- */
  const combo = {
    n: 0, t: 0,
    add() { this.n++; this.t = 2.6; evt('combo', this.n); run.stats.bestCombo = Math.max(run.stats.bestCombo || 0, this.n); if (this.n >= 6) ach('combo6'); if (this.n === 3) { P.boostT = 2.5; pop('شرارة ⚡', 'سرعة'); } },
    end(silent) { if (this.n >= 3 && !silent) { pop('كومبو ×' + this.n, ''); run.score += this.n * 100; } this.n = 0; this.t = 0; },
  };
  function comboTick(dt) { if (combo.n) { combo.t -= dt; if (combo.t <= 0) combo.end(); } }
  const mult = () => (1 + Math.max(0, combo.n - 1) * 0.5) * (P.vstarT > 0 ? 2 : 1) * (P.power > 0 ? 1.5 : 1);

  function evt(name, v = 1) { if (run && !run.attract && hooks.evt) hooks.evt(name, v); }
  function trick(kind, n = 1) {
    if (kind === 'flip') { evt('flip', n); if (n > 1) evt('multiflip'); }
    else if (kind === 'perfect') { evt('perfect'); run.stats.perfects = (run.stats.perfects || 0) + 1; }
    else if (kind !== 'air') evt(kind);
    if (run.mode === 'zen' && kind !== 'flip') return;
    let pts = 0, txt = '';
    switch (kind) {
      case 'flip':
        pts = [0, 400, 1200, 2400, 4000][Math.min(n, 4)] + Math.max(0, n - 4) * 2000;
        txt = n === 1 ? 'شقلبة' : n === 2 ? 'شقلبتين' : n + ' شقلبات';
        run.stats.flips += n; save.stats.flips = (save.stats.flips || 0) + n;
        Sound.play('flip', n); vibrate(20);
        ach('flip1');
        if (n >= 3) ach('flip3');
        say(Math.random() < 0.7 ? helperWho() : run.main, n > 1 ? 'multi' : 'flip', n > 1 ? 0.9 : 0.35);
        break;
      case 'perfect':
        pts = 200; txt = 'نزلة مظبوطة'; Sound.play('perfect'); slowT = 0.25;
        save.stats.perfect = (save.stats.perfect || 0) + 1;
        if (save.stats.perfect >= 20) ach('perfect20');
        say(helperWho(), 'perfect', 0.2);
        break;
      case 'grind': pts = Math.round(200 + n * 300); txt = 'حبل الفوانيس'; say(helperWho(), 'grind', 0.4); break;
      case 'twirl': pts = 250; txt = 'لفّة الطرحة'; break;
      case 'duo': pts = 300; txt = 'إيد في إيد 🤝'; break;
      case 'bounce': pts = 150; txt = 'نطّة زهرة'; say(helperWho(), 'bounce', 0.3); break;
      case 'glide': pts = 250; txt = 'طيران بالطرحة 🪶'; say(helperWho(), 'glide', 0.5); break;
      case 'air': pts = Math.round(n * 120); txt = 'في الهوا ' + n.toFixed(1) + 'ث'; break;
    }
    if (run.mode === 'zen') return;
    const m = mult(), got = Math.round(pts * m);
    run.score += got; combo.add();
    pop(txt, (combo.n > 1 ? 'كومبو ×' + combo.n + ' · ' : '') + got + '+');
    if (kind === 'flip' || kind === 'duo') P.boostT = Math.max(P.boostT, 1 + n * 0.5);
  }

  function collect() {
    const mr = (P.magnetT > 0 || P.power > 0) ? 130 + (save.up.magnet || 0) * 40 : 0;
    const cx = P.x, cy = P.y - 24;
    for (const it of items) {
      if (it.got) continue;
      const dx = it.x - cx, dy = it.y - cy, d2 = dx * dx + dy * dy;
      if (mr && d2 < mr * mr && (it.type === 'coin' || it.type === 'heart')) {
        const d = Math.sqrt(d2) || 1; it.x -= dx / d * 520 / 60; it.y -= dy / d * 520 / 60;
      }
      if (d2 < 30 * 30) {
        it.got = true;
        switch (it.type) {
          case 'coin': run.coins += P.x2T > 0 ? 2 : 1; evt('coin', P.x2T > 0 ? 2 : 1); Sound.play('coin'); burst(it.x, it.y, 5, ['#ffd45e', '#fff1b8'], 80, 'star'); break;
          case 'heart': {
            run.stats.hearts++; save.stats.hearts = (save.stats.hearts || 0) + 1; evt('heart');
            const was = run.meter < heartCap();
            run.meter = Math.min(heartCap(), run.meter + 1);
            Sound.play('heart'); burst(it.x, it.y, 6, ['#c9a6ff', '#ffffff'], 90, 'heart');
            if (was && run.meter >= heartCap()) { say(helperWho(), 'full', 1); vibrate(25); }
            if (save.stats.hearts >= 200) ach('hearts200');
            break;
          }
          case 'page': run.stats.pages++; Sound.play('page'); pop('ورقة مذاكرة 📄', run.stats.pages + '/' + ((run.goal && run.goal.n) || '')); break;
          case 'feather': P.glideT = 12 + (save.up.glide || 0) * 4; Sound.play('power'); evt('power'); pop('الطرحة الطايرة 🪶', 'دوسي وفضلي دايسة في الهوا'); break;
          case 'magnet': P.magnetT = 10 + (save.up.magnet || 0) * 3; Sound.play('power'); evt('power'); pop('مغناطيس 🧲', ''); break;
          case 'vstar': P.vstarT = 8; Sound.play('power'); pop('لحظة بنفسجي ✨', 'النقط ×2'); ach('violet'); evt('power'); break;
          case 'x2': P.x2T = 12; Sound.play('power'); pop('النجوم ×2 ⭐', '12 ثانية'); evt('power'); break;
          case 'bubble': P.bubbleT = 14; Sound.play('power'); pop('فقاعة أمان 🫧', 'هتحميكي من وقعة'); evt('power'); break;
          case 'hourglass': P.hgT = 6; Sound.play('power'); pop('الوقت بيبطّأ ⏳', ''); evt('power'); break;
          case 'balloon': P.balloonT = 3.2; Sound.play('power'); pop('بالونة 🎈', 'لفوق!'); evt('power'); break;
          case 'gift': {
            Sound.play('gift'); evt('gift'); save.stats.gifts = (save.stats.gifts || 0) + 1; if (save.stats.gifts >= 10) ach('gift10');
            const g = Math.random();
            if (g < 0.45) { const c = 25 + ((Math.random() * 4) | 0) * 25; run.coins += c; pop('هدية 🎁', '+' + c + '⭐'); }
            else if (g < 0.7) { run.meter = heartCap(); pop('هدية 🎁', 'العداد اتملا 💜'); }
            else if (g < 0.85) { P.magnetT = 10; pop('هدية 🎁', 'مغناطيس 🧲'); }
            else { P.glideT = 12; pop('هدية 🎁', 'ريشة 🪶'); }
            burst(it.x, it.y, 14, ['#c9a6ff', '#ff8fc7', '#ffd45e'], 200, 'star');
            break;
          }
        }
      }
    }
  }
  function stepPigeon(dt) {
    if (run.attract || run.mode === 'story' && run.chapter < 2) return;
    if (!pigeon) {
      if (run.dist > (run.nextPigeon || 350)) {
        const x = P.x + 750;
        if (!isGap(x)) { pigeon = { x, y: hAt(x) - 140, t: 0, gone: 0 }; run.nextPigeon = run.dist + 550 + Math.random() * 500; pop('🕊️ حمامة رسايل!', 'الحقيها'); }
      }
      return;
    }
    const pg = pigeon; pg.t += dt;
    if (pg.gone) { pg.gone += dt; pg.x += 420 * dt; pg.y -= 260 * dt; if (pg.gone > 2.5) pigeon = null; return; }
    pg.x += Math.max(220, P.speed * 0.86) * dt;
    const gy = isGap(pg.x) ? pg.y + 140 : hAt(pg.x);
    pg.y = lerp(pg.y, gy - 118 + Math.sin(pg.t * 2.2) * 22, Math.min(1, dt * 3));
    if (Math.abs(pg.x - P.x) < 36 && Math.abs(pg.y - (P.y - 24)) < 46) {
      pigeon = null;
      const have = save.notes || (save.notes = []);
      const left = PIGEON_NOTES.map((_, i) => i).filter(i => !have.includes(i));
      const idx = left.length ? pick(left) : (Math.random() * PIGEON_NOTES.length) | 0;
      if (!have.includes(idx)) have.push(idx);
      run.coins += 50; Sound.play('pigeon'); vibrate([20, 40, 20]);
      save.stats.pigeons = (save.stats.pigeons || 0) + 1;
      if (save.stats.pigeons % 5 === 0) { run.coins += 200; pop('5 حمامات! 🎊', '+200⭐'); }
      ach('pigeon1'); if (have.length >= PIGEON_NOTES.length) ach('notesAll');
      evt('pigeon'); hooks.note && hooks.note(PIGEON_NOTES[idx], idx);
      for (let i = 0; i < 16; i++) parts.push({ x: P.x, y: P.y - 40, vx: rnd(-160, 160), vy: rnd(-200, 20), life: 1.2, max: 1.2, size: rnd(3, 6), col: pick(['#ffffff', '#ffd6f2', '#c9a6ff']), type: i % 2 ? 'heart' : 'star' });
    } else if (pg.t > 22 || P.x > pg.x + 260) pg.gone = 0.001;
  }

  /* مؤثرات فوق الشاشة (2D و 3D): شهب، حروفنا في النجوم، سحابة قلب، قوس قزح، برق، ألعاب نارية، قصاقيص */
  function confetti(n = 90) {
    for (let i = 0; i < n; i++) ofx.push({ x: Math.random() * Wc, y: -20 - Math.random() * Hc * 0.4, vx: rnd(-40, 40), vy: rnd(80, 200), rot: rnd(0, 6), vr: rnd(-6, 6), life: 4, max: 4, col: pick(['#c9a6ff', '#ff8fc7', '#ffd45e', '#8fe3c0', '#7fb8ff', '#ffffff']), k: 'conf' });
  }
  function fireworks() {
    Sound.play('firework');
    for (let b = 0; b < 4; b++) setTimeout(() => {
      const cx = Wc * (0.2 + Math.random() * 0.6), cy = Hc * (0.15 + Math.random() * 0.25), col = pick(['#c9a6ff', '#ff8fc7', '#ffd45e', '#8fe3c0']);
      Sound.play('firework');
      for (let i = 0; i < 46; i++) { const a = i / 46 * TAU, v = rnd(90, 170); ofx.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.6, max: 1.6, col, k: 'spark' }); }
    }, b * 380);
  }
  function makeConstel() {
    const c = document.createElement('canvas'); c.width = 120; c.height = 50;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.font = '900 40px Cairo, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
    x.fillText('م ♥ ف', 60, 26);
    const d = x.getImageData(0, 0, 120, 50).data, pts2 = [];
    for (let yy = 0; yy < 50; yy += 3) for (let xx = 0; xx < 120; xx += 3) if (d[(yy * 120 + xx) * 4 + 3] > 120 && Math.random() < 0.55) pts2.push([xx, yy, Math.random() * 6]);
    return pts2;
  }
  function raining() { return Math.sin(time * 0.11) > -0.35; }
  function drawFx(c, pal, W, H, dt) {
    const night = pal.night, bid = BIOMES[pal.main].id;
    // شهب
    if (night > 0.45 && Math.random() < dt * 0.35) shooting.push({ x: W * (0.3 + Math.random() * 0.7), y: H * Math.random() * 0.25, t: 0 });
    shooting = shooting.filter(s => (s.t += dt) < 0.9);
    shooting.forEach(s => {
      const k = s.t / 0.9, x = s.x - k * W * 0.35, y = s.y + k * H * 0.18;
      const g = c.createLinearGradient(x, y, x + 60, y - 30); g.addColorStop(0, 'rgba(255,255,255,' + (1 - k) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 60, y - 30); c.stroke();
    });
    // حروفنا في النجوم
    if (night > 0.55) {
      constel = constel || makeConstel();
      const a = Math.min(1, (night - 0.55) * 3), ox = W * 0.1, oy = H * 0.08, sc = Math.min(W, H) / 380;
      constel.forEach(([xx, yy, ph]) => { c.globalAlpha = a * (0.45 + 0.55 * Math.abs(Math.sin(time * 1.8 + ph))); c.fillStyle = '#fff'; c.fillRect(ox + xx * sc, oy + yy * sc, 1.6 * sc, 1.6 * sc); });
      c.globalAlpha = 1;
    }
    // سحابة قلب بالنهار
    if (night < 0.3 && !heartCloud && Math.random() < dt * 0.04) heartCloud = { x: W + 80, y: H * (0.08 + Math.random() * 0.15), s: 0.8 + Math.random() * 0.6 };
    if (heartCloud) {
      heartCloud.x -= dt * 22;
      const { x, y, s } = heartCloud; c.globalAlpha = 0.75; c.fillStyle = '#fff';
      [[-14, -6, 16], [14, -6, 16], [0, 8, 18], [-6, 18, 12], [6, 18, 12], [0, 26, 8]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); c.fill(); });
      c.globalAlpha = 1; if (heartCloud.x < -100) heartCloud = null;
    }
    // قوس قزح بعد المطر
    if (bid === 'forest' && !raining()) {
      const cx = W * 0.68, cy = H * 0.62, r0 = Math.min(W, H) * 0.55;
      ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].forEach((col, i) => { c.globalAlpha = 0.22; c.strokeStyle = col; c.lineWidth = 7; c.beginPath(); c.arc(cx, cy, r0 - i * 7, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); });
      c.globalAlpha = 1;
    }
    // برق
    if (bid === 'aurora' && !run.attract) {
      boltT -= dt;
      if (boltT <= 0) { boltT = 7 + Math.random() * 9; flash = 1; Sound.play('thunder'); shake = Math.max(shake, 4); }
    }
    if (flash > 0) { c.fillStyle = 'rgba(235,240,255,' + flash * 0.55 + ')'; c.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 2.2); }
    // ألعاب نارية وقصاقيص
    ofx = ofx.filter(f => (f.life -= dt) > 0);
    ofx.forEach(f => {
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.k === 'conf') { f.rot += f.vr * dt; f.vx += Math.sin(time * 3 + f.y * 0.02) * 20 * dt; c.save(); c.translate(f.x, f.y); c.rotate(f.rot); c.fillStyle = f.col; c.globalAlpha = Math.min(1, f.life); c.fillRect(-4, -2, 8, 4); c.restore(); }
      else { f.vy += 60 * dt; f.vx *= 0.985; c.globalAlpha = f.life / f.max; c.fillStyle = f.col; c.fillRect(f.x - 1.5, f.y - 1.5, 3, 3); }
    });
    c.globalAlpha = 1;
  }

  function hitRocks() {
    for (const r of rocks) {
      if (r.broken) continue;
      if (Math.abs(r.x - P.x) < r.w / 2 + 6 && P.y > hAt(r.x) - r.h + 4) {
        if (P.power > 0 || P.invuln > 0 || run.mode === 'zen') {
          r.broken = 1; Sound.play('smash'); shake = 5;
          burst(r.x, hAt(r.x) - r.h / 2, 16, [cssRock(), '#ffffff'], 220, 'dot');
          if (P.power > 0) { run.score += 100; pop('سند كسرها 💥', '+100'); evt('smash'); }
        } else { crash('rock'); return; }
      }
    }
  }
  function hitFlowers() {
    for (const f of flowers) {
      if (f.used > 0) continue;
      if (Math.abs(f.x - P.x) < 18 && P.y > hAt(f.x) - 34) {
        f.used = 1; P.grounded = false; P.grind = null; P.vy = -980; P.air = 0; P.flipAcc = 0; P.twirlUsed = false; P.coyote = 0;
        Sound.play('bounce'); trick('bounce'); vibrate(15);
        burst(f.x, hAt(f.x) - 18, 14, ['#c9a6ff', '#a77af0', '#ffe07a'], 200, 'petal');
      }
    }
  }

  /* ---------- كلام وفقاعات ---------- */
  function say(who, kind, prob) {
    if (Math.random() > prob || bubbleCd > 0) return;
    if (run.solo && who === helperWho() && helper.vis < 0.5 && kind !== 'rescue' && kind !== 'summon') {
      if (run.main !== 'w') return;
      who = 'w'; if (kind === 'full') { bubbles.push({ who, text: 'العداد اتملا… أستدعيه؟ 🤍', t: 0 }); bubbleCd = 2.5; return; }
    }
    const L = LINES[who] && LINES[who][kind]; if (!L) return;
    bubbles.push({ who, text: pick(L), t: 0 });
    if (bubbles.length > 1) bubbles.shift();
    bubbleCd = 2.5;
  }
  function pop(text, sub) {
    popups.push({ text, sub, t: 0 });
    if (popups.length > 3) popups.shift();
  }

  /* ---------- جزيئات ---------- */
  function burst(x, y, n, cols, sp, type) {
    if (quality < 1) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = rnd(-Math.PI, 0), v = rnd(sp * 0.3, sp);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.4, 0.9), max: 0.9, size: rnd(1.5, 3.5), col: pick(cols), type });
    }
  }
  function spray(dt) {
    const tr = trailItem().kind;
    const rate = P.speed / 400 * (quality ? 1 : 0.5);
    if (Math.random() < rate * 0.8) {
      if (tr === 'spray' || tr === 'ribbon') parts.push({ x: P.x - 14, y: P.y - 1, vx: rnd(-110, -30), vy: rnd(-90, -20), life: 0.5, max: 0.5, size: rnd(1.5, 3), col: cssEdge(), type: 'dot' });
      if (tr === 'hearts' && Math.random() < 0.4) parts.push({ x: P.x - 16, y: P.y - 4, vx: rnd(-60, -20), vy: rnd(-60, -20), life: 0.8, max: 0.8, size: 3, col: pick(['#ff9cc9', '#c9a6ff']), type: 'heart' });
      if (tr === 'notes' && Math.random() < 0.25) parts.push({ x: P.x - 16, y: P.y - 10, vx: rnd(-50, -15), vy: rnd(-70, -30), life: 1, max: 1, size: 9, col: pick(['#8b5cf6', '#ff8fc7', '#5b34b0']), type: 'note' });
      if (tr === 'petals' && Math.random() < 0.4) parts.push({ x: P.x - 16, y: P.y - 6, vx: rnd(-70, -20), vy: rnd(-50, -10), life: 1, max: 1, size: 2.6, col: pick(['#ffbfe0', '#f4b6e0', '#ffffff']), type: 'petal' });
      if (tr === 'fire' && Math.random() < 0.7) parts.push({ x: P.x - 14 + rnd(-3, 3), y: P.y - 2, vx: rnd(-60, -20), vy: rnd(-90, -40), life: 0.45, max: 0.45, size: rnd(2, 3.5), col: pick(['#ffb347', '#ff7043', '#ffd45e']), type: 'dot' });
      if (tr === 'stars' && Math.random() < 0.4) parts.push({ x: P.x - 16, y: P.y - 4, vx: rnd(-60, -20), vy: rnd(-60, -20), life: 0.8, max: 0.8, size: 3.5, col: pick(['#ffe27a', '#ffffff']), type: 'star' });
    }
  }
  const trailItem = () => SHOP.trail.find(t => t.id === save.equip.trail) || SHOP.trail[0];

  /* ---------- الطقس ---------- */
  function initWeather() {
    weather = [];
    for (let i = 0; i < 90; i++) weather.push({ x: Math.random(), y: Math.random(), z: rnd(0.4, 1.2), p: Math.random() * 10 });
  }

  /* ---------- الحلقة ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (state === 'paused' || state === 'idle' || state === 'ask') { if (state !== 'paused') draw(dt); return; }
    if (slowT > 0) { slowT -= dt; slow = 0.45; } else slow = lerp(slow, P && P.hgT > 0 ? 0.6 : 1, Math.min(1, dt * 6));
    if (P && !run.attract) Sound.setAir(!P.grounded && !P.grind && !P.dead);
    bubbleCd = Math.max(0, bubbleCd - dt);
    const sdt = dt * slow;
    if (run.attract && state === 'play') autopilot(dt);
    if (state === 'rescue') { stepRescue(dt); }
    else if (state === 'play' || state === 'goal') {
      acc += sdt;
      const h = 1 / 120;
      let n = 0;
      while (acc >= h && n < 10) { step(h); acc -= h; n++; }
      if (state === 'play') checkGoal();
    }
    if (state === 'goal') { goalT += dt; P.speed = Math.max(120, P.speed - 260 * dt); if (goalT > 1.6) { state = 'done'; hooks.goal && hooks.goal(results(true)); } }
    if (state === 'over') { overT += dt; }
    placeHelper(dt);
    updateCam(dt);
    ensureTerrain();
    updateParts(dt);
    draw(dt);
    hudT -= dt;
    if (hudT <= 0 && hooks.hud) { hudT = 0.1; hooks.hud(hud()); }
  }

  let apHold = 0;
  function autopilot(dt) {
    if (apHold > 0) { apHold -= dt; if (apHold <= 0) onUp(); return; }
    if ((P.grounded && Math.random() < dt * 0.5) || (P.grind && Math.random() < dt * 1.2)) { onDown(); onUp(); if (Math.random() < 0.6) { setTimeout(() => { if (run.attract && !P.grounded) { down = true; downAt = time; apHold = 0.8; } }, 180); } }
  }

  function hud() {
    return {
      score: Math.floor(run.score), dist: Math.floor(run.dist), coins: run.coins,
      meter: run.meter, cap: heartCap(), charges: run.charges, can: canSummon() && P.power <= 0 && !P.dead,
      power: P.power, powerMax: 8 + (save.up.power || 0) * 2.5, combo: combo.n,
      glide: P.glideT, magnet: P.magnetT, vstar: P.vstarT, x2: P.x2T, bubble: P.bubbleT, hg: P.hgT, balloon: P.balloonT, comboT: combo.n ? combo.t / 2.6 : 0, goal: goalProgress(), mode: run.mode,
    };
  }

  function goalProgress() {
    if (run.mode !== 'story') return null;
    const g = run.goal, s = run.stats, parts = [];
    const add = (cur, n, label) => parts.push({ cur: Math.min(cur, n), n, label });
    if (g.type === 'pages') add(s.pages, g.n, '📄');
    if (g.type === 'flips') add(s.flips, g.n, '🔄');
    if (g.type === 'grinds') add(s.grinds, g.n, '🏮');
    if (g.type === 'hearts') add(s.hearts, g.n, '💜');
    if (g.summon) add(s.summons, g.summon, '🤍');
    if (g.type === 'glides') add(s.glides, g.n, '🪶');
    if (g.type === 'duos') add(s.duos, g.n, '🤝');
    if (g.hearts) add(s.hearts, g.hearts, '💜');
    if (g.dist) add(Math.floor(run.dist), g.dist, 'م');
    return parts;
  }
  function checkGoal() {
    const gp = goalProgress(); if (!gp) return;
    if (gp.every(p => p.cur >= p.n) && !P.dead && P.grounded) {
      state = 'goal'; goalT = 0; Sound.play('goal'); vibrate([30, 30, 60]);
      pop('خلّصتي الفصل! 💜', '');
      for (let i = 0; i < 40; i++) parts.push({ x: P.x + rnd(-100, 200), y: P.y - rnd(40, 200), vx: rnd(-60, 60), vy: rnd(-60, 60), life: 2, max: 2, size: rnd(3, 7), col: pick(['#c9a6ff', '#ffd6f2', '#fff']), type: i % 2 ? 'heart' : 'star' });
    }
  }

  function updateCam(dt) {
    const port = Hc > Wc;
    const lead = port ? 0.28 : 0.3;
    const gy = isGap(P.x) ? (gapAt(P.x) || { y: P.y }).y : hAt(P.x);
    const above = clamp(gy - P.y, 0, 500);
    const zt = 1 + clamp(above / 800, 0, 0.3) + clamp((P.speed - 400) / 1400, 0, 0.1);
    cam.z = lerp(cam.z, zt, Math.min(1, dt * 2));
    const vw = viewW * cam.z, vh = viewH * cam.z;
    const tx = P.x - vw * lead + P.speed * 0.15;
    const ty = lerp(P.y, gy, 0.4) - vh * (port ? 0.5 : 0.56);
    if (!cam.init) { cam.x = tx; cam.y = ty; cam.init = true; }
    cam.x = lerp(cam.x, tx, Math.min(1, dt * 6));
    cam.y = lerp(cam.y, ty, Math.min(1, dt * (P.dead ? 2 : 4.5)));
    if (shake > 0) shake = Math.max(0, shake - dt * 25);
  }

  function updateParts(dt) {
    for (const p of parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.type === 'heart' || p.type === 'star' ? 60 : 300) * dt;
      p.vx *= Math.pow(0.3, dt);
    }
    parts = parts.filter(p => p.life > 0);
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    for (const p of popups) p.t += dt;
    popups = popups.filter(p => p.t < 1.6);
    for (const b of bubbles) b.t += dt;
    bubbles = bubbles.filter(b => b.t < 2.4);
  }

  /* ---------- الرسم ---------- */
  let palCur = null;
  const cssEdge = () => palCur ? palCur.edge : '#fff';
  const cssRock = () => palCur ? palCur.rock : '#666';
  const sx = x => (x - cam.x) * scale / cam.z;
  const sy = y => (y - cam.y) * scale / cam.z;

  let view3d = false;
  function world() {
    return { pts, baseX, DX, rocks, ropes, flowers, items, decor, gaps, P, helper, cam, parts, time, run, save, hAt, angAt, isGap, ropeY, biomeAt, palette, charOpts, helperWho, shake, state, viewW, viewH, Wc, Hc, dpr, slow, pads, signs, pigeon };
  }
  function draw(dt) {
    if (!run) return;
    if (view3d && window.R3 && R3.ok) {
      palCur = palette(P ? P.x : cam.x);
      R3.render(world(), dt);
      const c = ctx, W = Wc, H = Hc;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      drawWeather(c, palCur, W, H, dt);
      drawFx(c, palCur, W, H, dt);
      if (P && (P.boostT > 0 || P.speed > 500)) { // خطوط سرعة
        const a = P.boostT > 0 ? 0.35 : 0.15;
        c.strokeStyle = 'rgba(255,255,255,' + a + ')'; c.lineWidth = 1.5;
        for (let i = 0; i < 14; i++) {
          const ang = hash(i * 3 + Math.floor(time * 12)) * TAU, r0 = Math.min(W, H) * (0.42 + hash(i + Math.floor(time * 12)) * 0.2), len = 40 + hash(i * 7) * 60;
          c.beginPath(); c.moveTo(W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * r0 * 0.7); c.lineTo(W / 2 + Math.cos(ang) * (r0 + len), H / 2 + Math.sin(ang) * (r0 + len) * 0.7); c.stroke();
        }
      }
      drawBubbles(c);
      drawPopups(c, W, H);
      if (P && P.vstarT > 0) { c.fillStyle = 'rgba(150,90,255,.12)'; c.fillRect(0, 0, W, H); }
      if (P && P.power > 0 && P.power < 2 && Math.sin(time * 20) > 0) { c.fillStyle = 'rgba(201,166,255,.08)'; c.fillRect(0, 0, W, H); }
      return;
    }
    const pal = palCur = palette(cam.x + viewW * 0.5);
    const c = ctx, W = Wc, H = Hc, k = scale / cam.z;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // السما
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.sky0); g.addColorStop(1, pal.sky1);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (P && P.vstarT > 0) { c.fillStyle = 'rgba(150,90,255,.18)'; c.fillRect(0, 0, W, H); }
    drawSkyFx(c, pal, W, H);
    // الخلفيات البعيدة
    drawFar(c, pal, W, H);
    // نطبّق الكاميرا
    const shx = shake ? rnd(-shake, shake) : 0, shy = shake ? rnd(-shake, shake) : 0;
    c.setTransform(dpr * k, 0, 0, dpr * k, dpr * (-cam.x * k + shx), dpr * (-cam.y * k + shy));
    const x0 = cam.x - 80, x1 = cam.x + viewW * cam.z + 80, yBot = cam.y + viewH * cam.z + 40;
    // ديكور ورا
    for (const d of decor) if (d.back && d.x > x0 - 60 && d.x < x1 + 60) {
      const bi = biomeAt(d.x), b = BIOMES[bi.t < 0.5 ? bi.i : bi.j];
      Art.decor(c, b.decor, d.x, hAt(d.x) + 6, d.s, pal.decorCol, d.seed, time);
    }
    drawGround(c, pal, x0, x1, yBot);
    // حبال
    for (const r of ropes) if (r.x2 > x0 && r.x1 < x1) drawRope(c, r, pal);
    for (const f of flowers) if (f.x > x0 && f.x < x1) Art.flower(c, f.x, hAt(f.x), time, f.used);
    for (const r of rocks) if (!r.broken && r.x > x0 && r.x < x1) Art.rock(c, r.x, hAt(r.x), r.w, r.h, pal.rock);
    for (const pd of pads) if (pd.x > x0 && pd.x < x1) Art.pad(c, pd.x, hAt(pd.x) - 0.5, angAt(pd.x), time, pd.used);
    for (const sg of signs) if (sg.x > x0 - 60 && sg.x < x1) Art.sign(c, sg.x, hAt(sg.x) + 2, sg.text, sg.kind);
    for (const it of items) if (!it.got && it.x > x0 && it.x < x1) drawItem(c, it);
    if (pigeon) Art.pigeon(c, pigeon.x, pigeon.y, time);
    // الشخصيات
    if (P) drawChars(c);
    // ديكور قدام
    for (const d of decor) if (!d.back && d.x > x0 - 60 && d.x < x1 + 60) {
      const bi = biomeAt(d.x), b = BIOMES[bi.t < 0.5 ? bi.i : bi.j];
      if (b.decor === 'city' || b.decor === 'ice') continue;
      c.globalAlpha = 0.9;
      Art.decor(c, b.decor, d.x, hAt(d.x) + 24, d.s * 0.8, pal.decorCol, d.seed + 1, time);
      c.globalAlpha = 1;
    }
    drawParts(c);
    // واجهة فوق الشاشة
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWeather(c, pal, W, H, dt);
    drawFx(c, pal, W, H, dt);
    drawBubbles(c);
    drawPopups(c, W, H);
    if (P && P.power > 0 && P.power < 2 && Math.sin(time * 20) > 0) { c.fillStyle = 'rgba(201,166,255,.08)'; c.fillRect(0, 0, W, H); }
    // ظل حواف الشاشة
    const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,0,40,.22)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }

  function drawSkyFx(c, pal, W, H) {
    const main = BIOMES[pal.main].id;
    // نجوم
    if (pal.night > 0.15) {
      c.fillStyle = '#fff';
      for (let i = 0; i < 70; i++) {
        const x = (hash(i) * W * 1.3 - cam.x * 0.01) % W, y = hash(i + 50) * H * 0.6;
        c.globalAlpha = pal.night * (0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + i)));
        const s = hash(i + 9) < 0.15 ? 2.2 : 1.2;
        c.fillRect((x + W) % W, y, s, s);
      }
      c.globalAlpha = 1;
    }
    // شفق
    if (main === 'aurora' || (pal.bi === 6 || pal.bj === 6)) {
      const a = pal.bi === 6 ? 1 - pal.t : pal.t;
      for (let b = 0; b < 3; b++) {
        c.globalAlpha = 0.18 * a;
        c.fillStyle = b === 1 ? '#b27cff' : '#5cf2b0';
        c.beginPath();
        for (let x = -16; x <= W + 16; x += 16) {
          const y = H * (0.18 + b * 0.07) + Math.sin(x * 0.006 + time * 0.6 + b) * 30 + Math.sin(x * 0.013 - time * 0.4) * 14;
          x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        for (let x = W + 16; x >= -16; x -= 16) c.lineTo(x, H * (0.18 + b * 0.07) + 60 + Math.sin(x * 0.006 + time * 0.6 + b) * 30);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    // الشمس / القمر
    const sxp = W * 0.72, syp = H * pal.sunY * 0.8, R = Math.min(W, H) * 0.07;
    const sg = c.createRadialGradient(sxp, syp, R * 0.5, sxp, syp, R * 4);
    sg.addColorStop(0, pal.sun.replace('rgb', 'rgba').replace(')', ',.55)')); sg.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, H);
    c.fillStyle = pal.sun; c.beginPath(); c.arc(sxp, syp, R, 0, TAU); c.fill();
    if (pal.night > 0.5) { c.fillStyle = pal.sky0; c.beginPath(); c.arc(sxp + R * 0.45, syp - R * 0.2, R * 0.9, 0, TAU); c.fill(); }
  }

  function drawFar(c, pal, W, H) {
    const type = BIOMES[pal.main].id;
    const layers = [
      { col: pal.far, par: 0.08, base: 0.5, amp: 0.22, fr: 0.004 },
      { col: pal.mid, par: 0.2, base: 0.64, amp: 0.14, fr: 0.006 },
    ];
    layers.forEach((L, li) => {
      c.fillStyle = L.col;
      c.beginPath(); c.moveTo(0, H);
      const off = cam.x * L.par;
      for (let x = 0; x <= W + 8; x += 6) {
        const wx = (x / scale + off);
        let h;
        if (type === 'city' && li === 0) {
          const b = Math.floor(wx / 46); h = 0.12 + hash(b) * 0.28 + (hash(b + 3) < 0.15 ? 0.15 : 0);
        } else if ((type === 'snow' || type === 'aurora') && li === 0) {
          h = Math.abs(fbm(wx * L.fr) - 0.5) * 2 * 0.55 + fbm(wx * L.fr * 3) * 0.1;
        } else if (type === 'beach' && li === 0) {
          h = 0.03 + Math.sin(wx * 0.05 + time) * 0.004;
        } else if (type === 'sky') {
          h = 0.1 + fbm(wx * L.fr * 3) * 0.25;
        } else h = fbm(wx * L.fr) * 0.9;
        c.lineTo(x, H * L.base - h * H * L.amp * 2);
      }
      c.lineTo(W, H); c.closePath(); c.fill();
      if (type === 'city' && li === 0) {
        c.fillStyle = 'rgba(255,214,130,.55)';
        for (let x = 0; x < W; x += 9) {
          const wx = Math.floor((x / scale + off) / 9);
          if (hash(wx) < 0.18) c.fillRect(x, H * L.base - hash(wx + 1) * H * 0.12, 2, 2);
        }
      }
      if (type === 'beach' && li === 0) {
        c.fillStyle = 'rgba(255,255,255,.35)';
        for (let i = 0; i < 18; i++) { const x = (hash(i) * W + time * 12 * (1 + hash(i + 4))) % W; c.fillRect(x, H * L.base - H * 0.05 + hash(i + 2) * H * 0.2, 14, 1.5); }
      }
    });
  }

  function drawGround(c, pal, x0, x1, yBot) {
    const i0 = Math.max(0, Math.floor(idxAt(x0))), i1 = Math.min(pts.length - 1, Math.ceil(idxAt(x1)));
    let run0 = -1;
    const flush = (a, b) => {
      if (b <= a) return;
      const gy = pts[a].y;
      const gr = c.createLinearGradient(0, gy, 0, gy + 260);
      gr.addColorStop(0, pal.ground); gr.addColorStop(1, pal.shade);
      c.fillStyle = gr;
      c.beginPath(); c.moveTo(ptX(a), yBot + 2000);
      for (let i = a; i <= b; i++) c.lineTo(ptX(i), pts[i].y);
      c.lineTo(ptX(b), yBot + 2000); c.closePath(); c.fill();
      c.strokeStyle = pal.edge; c.lineWidth = 3; c.lineJoin = 'round';
      c.beginPath(); for (let i = a; i <= b; i++) i === a ? c.moveTo(ptX(i), pts[i].y) : c.lineTo(ptX(i), pts[i].y); c.stroke();
    };
    for (let i = i0; i <= i1; i++) {
      if (!pts[i].gap) { if (run0 < 0) run0 = i; }
      else if (run0 >= 0) { flush(run0, i - 1); run0 = -1; }
    }
    if (run0 >= 0) flush(run0, i1);
  }

  function drawRope(c, r, pal) {
    const city = BIOMES[biomeAt(r.x1).i].id;
    c.strokeStyle = '#3a2c3e'; c.lineWidth = 3;
    [[r.x1, r.y1], [r.x2, r.y2]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x, hAt(x) + 4); c.stroke(); });
    c.strokeStyle = '#4a3a2e'; c.lineWidth = 1.6;
    c.beginPath();
    for (let x = r.x1; x <= r.x2; x += 8) { const y = ropeY(r, x); x === r.x1 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
    const cols = city === 'city' ? ['#ffcf5a', '#ff8a5a', '#7fd0ff', '#c9a6ff'] : ['#c9a6ff', '#ff9cc9', '#ffd45e', '#8fe3c0'];
    for (let x = r.x1 + 16, i = 0; x < r.x2 - 8; x += 26, i++) {
      const y = ropeY(r, x), col = cols[i % cols.length];
      if (city === 'city') {
        c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 10;
        c.fillRect(x - 3, y + 2, 6, 8); c.shadowBlur = 0;
        c.fillStyle = '#3a2c3e'; c.fillRect(x - 3.5, y + 1, 7, 1.5); c.fillRect(x - 1, y + 10, 2, 2);
      } else {
        c.fillStyle = col; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.lineTo(x, y + 9); c.fill();
      }
    }
  }

  function drawItem(c, it) {
    const bob = Math.sin(time * 3 + it.x * 0.05) * 3;
    switch (it.type) {
      case 'gift': case 'x2': case 'bubble': case 'hourglass': case 'balloon': Art.item(c, it.type, it.x, it.y + bob, time); break;
      case 'coin': Art.coin(c, it.x, it.y + bob, time + it.x * 0.01); break;
      case 'heart': c.shadowColor = '#c9a6ff'; c.shadowBlur = 10; Art.heart(c, it.x, it.y + bob, 9, '#b98cff'); c.shadowBlur = 0; Art.heart(c, it.x - 2, it.y + bob - 3, 3, 'rgba(255,255,255,.7)'); break;
      case 'page': Art.page(c, it.x, it.y + bob, time + it.x); break;
      case 'feather': c.shadowColor = '#c9a6ff'; c.shadowBlur = 14; Art.feather(c, it.x, it.y + bob, time); c.shadowBlur = 0; break;
      case 'magnet': Art.magnet(c, it.x, it.y + bob); break;
      case 'vstar': c.shadowColor = '#b27cff'; c.shadowBlur = 18; Art.star(c, it.x, it.y + bob, 12, '#a66bff', 5, 0.45, time); Art.star(c, it.x, it.y + bob, 5, '#ffffff', 5, 0.45, time); c.shadowBlur = 0; break;
    }
  }

  function charOpts(who, extra) {
    const item = who === 'w' ? SHOP.w.find(i => i.id === save.equip.w) : SHOP.s.find(i => i.id === save.equip.s);
    const b = SHOP.board.find(i => i.id === (who === run.main ? save.equip.board : (who === 'w' ? 'b1' : 'b0'))) || SHOP.board[0];
    return Object.assign({ who, item, board: b, t: time, speed: P.speed }, extra);
  }

  function drawChars(c) {
    const hw = helperWho(), mainW = run.main;
    // الدرع
    if (P.power > 0) {
      const a = Math.min(1, P.power) * (0.55 + Math.sin(time * 6) * 0.1);
      c.save(); c.globalAlpha = a * 0.5;
      const cx = (P.x + helper.x) / 2, cy = (P.y + helper.y) / 2 - 26;
      const gr = c.createRadialGradient(cx, cy, 10, cx, cy, 62);
      gr.addColorStop(0, 'rgba(201,166,255,0)'); gr.addColorStop(0.75, 'rgba(201,166,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,.7)');
      c.fillStyle = gr; c.beginPath(); c.ellipse(cx, cy, 62, 48, 0, 0, TAU); c.fill();
      c.restore();
    }
    // المساعد
    const helperAlpha = (state === 'rescue' ? 1 : (P.power > 0 ? 1 : 0.95)) * (helper.vis == null ? 1 : helper.vis);
    if (state === 'rescue' && !rescue.done) {
      for (let i = 0; i < 3; i++) parts.push({ x: helper.x, y: helper.y - 20, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 0.5, max: 0.5, size: 3, col: '#e8dcff', type: 'star' });
    }
    if (P.duoT > 0 && !P.grounded && helperAlpha > 0.5) {
      c.strokeStyle = '#ffd6f2'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(helper.x + 8, helper.y - 24); c.quadraticCurveTo((helper.x + P.x) / 2, (helper.y + P.y) / 2 - 18, P.x - 8, P.y - 24); c.stroke();
      Art.heart(c, (helper.x + P.x) / 2, (helper.y + P.y) / 2 - 34 + Math.sin(time * 8) * 2, 5, '#ff9cc9');
    }
    if (helperAlpha > 0.02) Art.rider(c, helper.x, helper.y, charOpts(hw, { rot: helper.rot, alpha: helperAlpha, glide: helper.glide && hw === 'w', twirl: helper.tw, squash: 0, speed: P.speed }));
    // اللاعب
    const blink = P.invuln > 0 && Math.sin(time * 30) > 0;
    const sq = P.land * 0.12 - (P.grounded ? 0 : 0.0);
    const o = charOpts(mainW, { rot: P.rot, squash: sq, twirl: P.twirl, glide: P.gliding > 0 && mainW === 'w', crashed: P.dead, alpha: blink ? 0.5 : 1 });
    if (P.dead) o.noBoard = false;
    if (P.boostT > 0 || P.vstarT > 0) {
      c.save(); c.globalAlpha = 0.25;
      for (let i = 1; i <= 3; i++) Art.rider(c, P.x - i * 10, P.y + i * slopeAt(P.x) * 10, Object.assign({}, o, { alpha: 0.25 / i }));
      c.restore();
    }
    if (trailItem().kind === 'ribbon' && hist.length > 4) {
      c.strokeStyle = 'rgba(178,124,255,.55)'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); const n = Math.min(40, hist.length);
      for (let i = hist.length - n; i < hist.length; i++) { const h = hist[i]; i === hist.length - n ? c.moveTo(h.x - 12, h.y - 4) : c.lineTo(h.x - 12, h.y - 4 + Math.sin(i * 0.7 + time * 8) * 2); }
      c.stroke();
    }
    Art.rider(c, P.x, P.y, o);
    if (P.bubbleT > 0) { c.globalAlpha = 0.35 + Math.sin(time * 5) * 0.08; Art.bubble(c, P.x, P.y - 26, time); c.save(); c.translate(P.x, P.y - 26); c.scale(2.6, 2.6); c.translate(-P.x, -P.y + 26); c.restore(); c.strokeStyle = 'rgba(160,210,255,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(P.x, P.y - 26, 34, 0, TAU); c.stroke(); c.globalAlpha = 1; }
  }

  function drawParts(c) {
    for (const p of parts) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      if (p.type === 'heart') Art.heart(c, p.x, p.y, p.size, p.col);
      else if (p.type === 'star') Art.star(c, p.x, p.y, p.size, p.col);
      else if (p.type === 'note') { c.fillStyle = p.col; c.font = '900 ' + p.size + 'px sans-serif'; c.fillText('♪', p.x, p.y); }
      else if (p.type === 'petal') { c.fillStyle = p.col; c.beginPath(); c.ellipse(p.x, p.y, p.size * 1.6, p.size, p.x * 0.1, 0, TAU); c.fill(); }
      else { c.fillStyle = p.col; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    }
    c.globalAlpha = 1;
  }

  function drawWeather(c, pal, W, H, dt) {
    const b = palette(P ? P.x : cam.x), type = BIOMES[b.main].weather;
    const n = quality ? weather.length : 40;
    const vx = (P ? P.speed : 300) / 900;
    for (let i = 0; i < n; i++) {
      const w = weather[i];
      switch (type) {
        case 'snow': case 'storm': {
          const storm = type === 'storm';
          w.x -= (vx * 0.6 + (storm ? 0.5 : 0.05)) * dt * w.z; w.y += (storm ? 0.35 : 0.08) * dt * w.z; w.x += Math.sin(time + w.p) * 0.0006;
          c.fillStyle = 'rgba(255,255,255,' + (0.5 + w.z * 0.3) + ')';
          const s = w.z * (storm ? 2.4 : 2.6); c.fillRect(w.x * W, w.y * H, s, s);
          break;
        }
        case 'sand':
          w.x -= (vx + 0.3) * dt * w.z; w.y += Math.sin(time * 2 + w.p) * 0.0008;
          c.fillStyle = 'rgba(255,230,180,.35)'; c.fillRect(w.x * W, w.y * H, 10 * w.z, 1.2);
          break;
        case 'rain':
          w.x -= (vx * 0.5 + 0.15) * dt; w.y += 1.3 * dt * w.z;
          if (!raining() && i % 6) break;
          c.strokeStyle = 'rgba(210,225,255,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(w.x * W, w.y * H); c.lineTo(w.x * W - 4, w.y * H + 12 * w.z); c.stroke();
          if (i % 6 === 0) { // ورق شجر
            const lx = ((w.p * 0.13 + time * 0.05) % 1) * W, ly = ((w.p * 0.29 + time * 0.08 * w.z) % 1) * H;
            c.fillStyle = ['#e2702d', '#e9a23b', '#c94a26'][i % 3]; c.save(); c.translate(W - lx, ly); c.rotate(time * 2 + i); c.fillRect(-3, -1.5, 6, 3); c.restore();
          }
          break;
        case 'fireflies': {
          const x = ((w.x + Math.sin(time * 0.3 + w.p) * 0.03 - cam.x * 0.00002 * w.z) % 1 + 1) % 1, y = 0.2 + w.y * 0.6 + Math.sin(time * 0.7 + w.p) * 0.02;
          if (i % 2) break;
          c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + w.p));
          c.fillStyle = '#ffe08a'; c.shadowColor = '#ffd04a'; c.shadowBlur = 8; c.fillRect(x * W, y * H, 2.5, 2.5); c.shadowBlur = 0; c.globalAlpha = 1;
          break;
        }
        case 'petals':
          w.x -= (vx * 0.5 + 0.08) * dt * w.z; w.y += 0.09 * dt * w.z;
          if (i % 2) break;
          c.fillStyle = i % 4 ? 'rgba(255,190,235,.85)' : 'rgba(190,150,255,.85)';
          c.save(); c.translate(w.x * W, w.y * H); c.rotate(time * 2 + w.p); c.beginPath(); c.ellipse(0, 0, 3.5 * w.z, 2 * w.z, 0, 0, TAU); c.fill(); c.restore();
          break;
        case 'gulls':
          if (i > 5) break;
          w.x -= (0.03 + vx * 0.05) * dt;
          c.strokeStyle = 'rgba(60,50,70,.6)'; c.lineWidth = 1.4;
          { const x = w.x * W, y = w.y * H * 0.4, f = Math.sin(time * 6 + w.p) * 3; c.beginPath(); c.moveTo(x - 7, y - f); c.quadraticCurveTo(x - 3, y - 4, x, y); c.quadraticCurveTo(x + 3, y - 4, x + 7, y - f); c.stroke(); }
          break;
        case 'stars':
          if (i % 3) break;
          w.x -= (vx * 0.1 + 0.01) * dt;
          c.globalAlpha = Math.abs(Math.sin(time * 1.5 + w.p));
          Art.star(c, w.x * W, w.y * H * 0.7, 2.5 * w.z, '#fff', 4, 0.35, 0);
          c.globalAlpha = 1;
          break;
      }
      if (w.x < -0.05) { w.x += 1.1; w.y = Math.random(); }
      if (w.y > 1.05) { w.y -= 1.1; w.x = Math.random() * 1.1; }
    }
  }

  function bubble(c, x, y, text, who, a) {
    c.save(); c.globalAlpha = a;
    c.font = '700 14px Cairo, Tajawal, sans-serif'; c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(text).width + 20, h = 26;
    const bx = clamp(x, w / 2 + 6, Wc - w / 2 - 6), by = Math.max(h, y);
    c.fillStyle = who === 's' ? 'rgba(255,255,255,.95)' : 'rgba(246,238,255,.97)';
    c.strokeStyle = who === 's' ? '#5b6640' : '#9b74e0'; c.lineWidth = 1.5;
    c.beginPath(); c.roundRect(bx - w / 2, by - h, w, h, 10); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 5, by - 1); c.lineTo(x + 3, by + 7); c.lineTo(x + 6, by - 1); c.fill();
    c.fillStyle = '#2b2240'; c.fillText(text, bx, by - h / 2 + 1);
    c.restore();
  }
  function drawBubbles(c) {
    for (const b of bubbles) {
      const ch = b.who === run.main ? P : helper;
      if (ch === helper && helper.vis < 0.4) continue;
      const a = Math.min(1, b.t * 5, (2.4 - b.t) * 3);
      if (view3d && window.R3 && R3.ok) { const s = R3.project(ch.x + (ch === helper ? R3.helperDX || 0 : 0), ch.y - 58, ch === helper ? R3.helperZ : 0); bubble(c, s.x, s.y, b.text, b.who, a); }
      else bubble(c, sx(ch.x), sy(ch.y) - 62 * scale / cam.z, b.text, b.who, a);
    }
  }
  function drawPopups(c, W, H) {
    popups.forEach((p, i) => {
      const a = Math.min(1, p.t * 6, (1.6 - p.t) * 3), y = H * 0.2 + i * 46 - p.t * 10;
      c.save(); c.globalAlpha = a;
      c.textAlign = 'center'; c.direction = 'rtl';
      const s = 1 + Math.max(0, 0.25 - p.t) * 1.2;
      c.translate(W / 2, y); c.scale(s, s);
      c.font = '900 24px Lalezar, Cairo, sans-serif';
      c.lineWidth = 5; c.strokeStyle = 'rgba(40,20,70,.55)'; c.strokeText(p.text, 0, 0);
      c.fillStyle = '#fff'; c.fillText(p.text, 0, 0);
      if (p.sub) { c.font = '700 14px Cairo, sans-serif'; c.lineWidth = 4; c.strokeText(p.sub, 0, 20); c.fillStyle = '#f0e2ff'; c.fillText(p.sub, 0, 20); }
      c.restore();
    });
  }

  /* ---------- مساعدات ---------- */
  function ach(id) { if (run && !run.attract && hooks.achieve) hooks.achieve(id); }
  function vibrate(p) { if (save.settings.vibe !== false && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} }
  function visit(b) {
    save.stats.biomes = save.stats.biomes || [];
    if (!save.stats.biomes.includes(b)) { save.stats.biomes.push(b); if (save.stats.biomes.length >= 8) ach('biomes'); }
  }

  function results(win) {
    const earned = run.coins + Math.floor(run.score / 250);
    return { win, mode: run.mode, chapter: run.chapter, score: Math.floor(run.score), dist: Math.floor(run.dist), coins: run.coins, earned, stats: run.stats };
  }
  function finish(win) {
    if (state === 'over' || state === 'done') return;
    state = 'over'; overT = 0; Sound.grind(false);
    hooks.over && hooks.over(results(win));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, quality ? 2 : 1.25);
    Wc = window.innerWidth; Hc = window.innerHeight;
    cv.width = Math.round(Wc * dpr); cv.height = Math.round(Hc * dpr);
    cv.style.width = Wc + 'px'; cv.style.height = Hc + 'px';
    if (Hc > Wc) scale = Wc / 400; else scale = Hc / 330;
    viewW = Wc / scale; viewH = Hc / scale;
    ctx.imageSmoothingEnabled = false;
    if (window.R3 && R3.ok) R3.resize(Wc, Hc, dpr, quality);
  }

  /* ---------- API ---------- */
  function start(cfg, saveRef) {
    save = saveRef; quality = save.settings.quality === 0 ? 0 : 1;
    resize();
    const ch = cfg.mode === 'story' ? STORY[cfg.chapter] : null;
    run = {
      mode: cfg.mode, chapter: cfg.chapter || 0, main: cfg.main || 'w', solo: !!cfg.solo, biome: ch ? ch.biome : (cfg.biome || 0), curBiome: -1,
      tol: ch ? ch.tol : 0.88, assist: ch && cfg.chapter < 2 ? 7 : 5, goal: ch ? ch.goal : null, startX: 0,
      score: 0, dist: 0, coins: 0, meter: 0, charges: 1 + (save.up.summon || 0), pagesSpawned: 0, hoff: null,
      stats: { flips: 0, grinds: 0, hearts: 0, pages: 0, summons: 0, glides: 0, duos: 0, rescues: 0 },
    };
    if (ch && ch.startFull) run.meter = 999;
    pts = []; baseX = -400; rocks = []; ropes = []; flowers = []; items = []; decor = []; gaps = []; pads = []; signs = []; pigeon = null; ofx = []; shooting = []; heartCloud = null; flash = 0; parts = []; popups = []; bubbles = []; hist = [];
    gen = { y: 0, slope: 0.3, after: null };
    P = newPlayer(0);
    run.meter = Math.min(run.meter, heartCap());
    for (let i = 0; i < 40; i++) push(0.3);
    gen.after = 'hills';
    cam.init = false; cam.z = 1; cam.x = -200; cam.y = -200;
    ensureTerrain();
    P.y = hAt(0); P.rot = angAt(0);
    helper.x = -78; helper.y = hAt(-78); helper.rot = angAt(-78); helper.arrive = 0; helper.leave = 0; helper.vis = run.solo ? 0 : 1;
    for (let x = -120; x <= 0; x += 6) hist.push({ x, y: hAt(x), rot: angAt(x), g: true });
    combo.n = 0; combo.t = 0; slow = 1; slowT = 0; shake = 0; rescue = null; acc = 0; down = false; time = 0; downAt = 0; lastAirTap = -9; bubbleCd = 0; apHold = 0;
    Sound.setMood(run.biome); if (run.mode !== 'story') { run.curBiome = run.biome; visit(run.biome); } else visit(run.biome);
    initWeather();
    state = 'play'; last = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function init(canvas, h) {
    cv = canvas; ctx = cv.getContext('2d'); hooks = h;
    window.addEventListener('resize', () => { if (save) resize(); });
    const isUI = e => e.target !== cv;
    cv.addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); onDown(); });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'ArrowUp') && !e.repeat && !isUI(e)) { onDown(); } if (e.code === 'KeyS') summon(); });
    window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp') onUp(); });
  }

  /* شاشة ورا القوايم: تزلج تلقائي هادي */
  function attract(saveRef, biome) {
    start({ mode: 'zen', biome, main: 'w' }, JSON.parse(JSON.stringify(saveRef)));
    run.attract = true; state = 'play'; Sound.setMenu && Sound.setMenu();
  }

  return {
    init, start, attract, summon,
    pause() { if (state === 'play' || state === 'rescue') { run.prevState = state; state = 'paused'; Sound.grind(false); } },
    resume() { if (state === 'paused') { state = run.prevState || 'play'; last = performance.now(); } },
    stop() { state = 'idle'; Sound.grind(false); },
    get state() { return state; },
    get run() { return run; },
    autopilot(dt) {},
    snapshot() {
      if (!(view3d && window.R3 && R3.ok)) return cv.toDataURL('image/png');
      const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
      const x = o.getContext('2d'); x.drawImage(R3.canvas, 0, 0, o.width, o.height); x.drawImage(cv, 0, 0);
      return o.toDataURL('image/png');
    },
    setView3D(on) {
      view3d = !!on && !!(window.R3 && R3.ok);
      if (window.R3 && R3.canvas) R3.canvas.style.display = view3d ? 'block' : 'none';
      if (view3d) R3.resize(Wc, Hc, dpr, quality);
      return view3d;
    },
    get view3d() { return view3d; },
    confetti, fireworks,
    grant(k) {
      if (!P || !run) return;
      if (k === 'meter') run.meter = heartCap(); else if (k === 'feather') P.glideT = 12; else if (k === 'bubble') P.bubbleT = 14; else if (k === 'magnet') P.magnetT = 10;
      pop('🎡 جايزة العجلة', { meter: 'عداد مليان 💜', feather: 'ريشة 🪶', bubble: 'فقاعة 🫧', magnet: 'مغناطيس 🧲' }[k] || '');
    },
    revive() {
      if (state !== 'ask') return;
      run.revived = true; safePlace(); P.invuln = 2.5; P.dead = false; state = 'play'; last = performance.now();
      Sound.play('rescue'); ach('revive'); pop('كمّلي 💜', '');
    },
    giveUp() { if (state === 'ask') { state = 'play'; finish(false); } },
    setQuality(q) { quality = q; if (save) resize(); },
    _debug: () => ({ P, run, cam, pts: pts.length, rocks, gaps, ropes, flowers, items, pads, signs, hAt, isGap, gapAt, down: (v) => v ? onDown() : onUp() }),
  };
})();
