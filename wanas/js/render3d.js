/* سند و ونس — وضع 3D: نفس اللعبة ونفس الفيزيا، بس مرسومة بـ Three.js
   الشخصيات معمولة "ڤوكسل" من رسومات محمد نفسها (كل بكسل = مكعب) */
'use strict';

const R3 = (() => {
  const T = window.THREE;
  if (!T) return { ok: false };
  const SPR = Art.SPR;
  let renderer, scene, camera, canvas;
  let hemi, dir, skyMesh, skyMat, sunSprite, stars;
  let terr, terrGeo, terrPos, terrCol;
  const farLayers = [];
  let aurora = [];
  const pools = { decor: new Map(), item: new Map(), rock: new Map(), flower: new Map(), rope: new Map() };
  const chars = {};
  let partPts, partGeo, shadowP, shadowH, shield, duoHeart;
  const camPos = new T.Vector3(), camLook = new T.Vector3(), lookT = new T.Vector3(), shk = new T.Vector3();
  let camInit = false, lastRunId = null;
  const tmpC = new T.Color(), tmpV = new T.Vector3();
  const COLS = [-900, -520, -280, -150, -70, -34, 0, 34, 70, 150, 260, 420];
  const TRACK = 70;
  const ROWS = COLS.length;
  const MAXC = 260;
  let lastPal = null;

  /* ---------- مواد مشتركة ---------- */
  const M = {
    decor: new T.MeshLambertMaterial({ color: 0x3d4f6d }),
    trunk: new T.MeshLambertMaterial({ color: 0x6b4a32 }),
    white: new T.MeshLambertMaterial({ color: 0xffffff }),
    rock: new T.MeshLambertMaterial({ color: 0x5b6680, flatShading: true }),
    leaf: [0xe2702d, 0xc94a26, 0xe9a23b, 0xb8572b].map(c => new T.MeshLambertMaterial({ color: c })),
    pink: [0xf4b6e0, 0xe59ad0, 0xffd0ee].map(c => new T.MeshLambertMaterial({ color: c })),
    lav: new T.MeshLambertMaterial({ color: 0x9b6fe0 }),
    stem: new T.MeshLambertMaterial({ color: 0x5f8a4f }),
    ice: new T.MeshLambertMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.85 }),
    window: new T.MeshBasicMaterial({ color: 0xffd88a }),
    coin: new T.MeshLambertMaterial({ color: 0xffd45e, emissive: 0x6b4a00 }),
    pole: new T.MeshLambertMaterial({ color: 0x3a2c3e }),
    rope: new T.LineBasicMaterial({ color: 0x4a3a2e }),
    shadow: new T.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.22, depthWrite: false }),
    shield: new T.MeshBasicMaterial({ color: 0xc9a6ff, transparent: true, opacity: 0.18, depthWrite: false }),
  };
  const G = {
    cyl: new T.CylinderGeometry(1, 1, 1, 8),
    cone: new T.ConeGeometry(1, 1, 8),
    sph: new T.SphereGeometry(1, 10, 8),
    box: new T.BoxGeometry(1, 1, 1),
    dode: new T.DodecahedronGeometry(1, 0),
    coin: new T.CylinderGeometry(8, 8, 2.4, 14),
  };
  G.coin.rotateX(Math.PI / 2);

  /* ---------- صور صغيرة للحاجات اللي بتتلم ---------- */
  const texCache = {};
  function tex(key, draw, size = 64) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.translate(size / 2, size / 2); draw(x, size);
    const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter;
    return (texCache[key] = t);
  }
  const spriteMat = {
    heart: () => new T.SpriteMaterial({ map: tex('heart', x => { x.shadowColor = '#c9a6ff'; x.shadowBlur = 10; Art.heart(x, 0, 6, 20, '#b98cff'); x.shadowBlur = 0; Art.heart(x, -5, 0, 6, 'rgba(255,255,255,.7)'); }) }),
    page: () => new T.SpriteMaterial({ map: tex('page', x => { x.scale(2.4, 2.4); Art.page(x, 0, 0, 0); }) }),
    feather: () => new T.SpriteMaterial({ map: tex('feather', x => { x.scale(2.2, 2.2); x.shadowColor = '#c9a6ff'; x.shadowBlur = 8; Art.feather(x, 0, 0, 0); }) }),
    magnet: () => new T.SpriteMaterial({ map: tex('magnet', x => { x.scale(2.4, 2.4); Art.magnet(x, 0, 0); }) }),
    vstar: () => new T.SpriteMaterial({ map: tex('vstar', x => { x.shadowColor = '#b27cff'; x.shadowBlur = 14; Art.star(x, 0, 0, 26, '#a66bff'); Art.star(x, 0, 0, 11, '#fff'); }) }),
    flower: () => new T.SpriteMaterial({ map: tex('flower', x => { x.scale(2.2, 2.2); Art.flower(x, 0, 12, 0, 0); }) }),
    sun: () => new T.SpriteMaterial({ map: tex('sun', (x, s) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.9)'); g.addColorStop(0.32, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-s / 2, -s / 2, s, s); }, 128), transparent: true, depthWrite: false, fog: false }),
    lantern: (c) => new T.SpriteMaterial({ map: tex('lan' + c, x => { x.shadowColor = c; x.shadowBlur = 16; x.fillStyle = c; x.fillRect(-9, -12, 18, 24); x.fillStyle = '#3a2c3e'; x.fillRect(-10, -14, 20, 4); }) }),
    dot: () => tex('dot', (x, s) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-s / 2, -s / 2, s, s); }, 32),
  };
  const matCache = {};
  const sm = (k, ...a) => matCache[k + a.join()] || (matCache[k + a.join()] = spriteMat[k](...a));

  /* ---------- البداية ---------- */
  function init(cv) {
    canvas = cv;
    renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(48, 1, 4, 9000);
    scene.fog = new T.Fog(0xf8d4c4, 900, 3600);
    hemi = new T.HemisphereLight(0xffffff, 0x8f9cc8, 0.85); scene.add(hemi);
    dir = new T.DirectionalLight(0xffffff, 0.75); dir.position.set(-0.4, 1, 0.6); scene.add(dir);
    scene.add(dir.target);

    // السما
    skyMat = new T.ShaderMaterial({
      uniforms: { top: { value: new T.Color() }, bot: { value: new T.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float t = clamp(vP.y*1.6+0.35,0.0,1.0); gl_FragColor = vec4(mix(bot, top, t),1.0); }',
      side: T.BackSide, depthWrite: false, fog: false,
    });
    skyMesh = new T.Mesh(new T.SphereGeometry(7000, 24, 16), skyMat); skyMesh.renderOrder = -10; scene.add(skyMesh);
    sunSprite = new T.Sprite(sm('sun')); sunSprite.scale.set(900, 900, 1); scene.add(sunSprite);
    { // نجوم
      const g = new T.BufferGeometry(), n = 500, p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.9 + 0.08, r = 6500; p[i * 3] = Math.cos(a) * Math.cos(b) * r; p[i * 3 + 1] = Math.sin(b) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r; }
      g.setAttribute('position', new T.BufferAttribute(p, 3));
      stars = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 14, sizeAttenuation: true, transparent: true, opacity: 0, fog: false, depthWrite: false, map: sm('dot'), alphaTest: 0.01 }));
      scene.add(stars);
    }
    // شفق
    for (let k = 0; k < 3; k++) {
      const g = new T.PlaneGeometry(9000, 420, 60, 1);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: k === 1 ? 0xb27cff : 0x5cf2b0, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, fog: false }));
      m.userData.base = Float32Array.from(g.attributes.position.array);
      aurora.push(m); scene.add(m);
    }
    // جبال بعيدة
    for (let k = 0; k < 2; k++) {
      const n = 120, g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 2 * 3), 3));
      const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      g.setIndex(idx);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xb8c2e2, side: T.DoubleSide, fog: true }));
      m.frustumCulled = false; m.userData.n = n; m.userData.z = k ? -1500 : -2700; m.userData.k = k;
      farLayers.push(m); scene.add(m);
    }
    // الأرض
    terrGeo = new T.BufferGeometry();
    terrPos = new Float32Array(MAXC * ROWS * 3); terrCol = new Float32Array(MAXC * ROWS * 3);
    terrGeo.setAttribute('position', new T.BufferAttribute(terrPos, 3));
    terrGeo.setAttribute('color', new T.BufferAttribute(terrCol, 3));
    terrGeo.setIndex(new T.BufferAttribute(new Uint32Array((MAXC - 1) * (ROWS - 1) * 6), 1));
    terr = new T.Mesh(terrGeo, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
    terr.frustumCulled = false; scene.add(terr);
    // جزيئات
    partGeo = new T.BufferGeometry();
    partGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(500 * 3), 3));
    partGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(500 * 3), 3));
    partPts = new T.Points(partGeo, new T.PointsMaterial({ size: 9, vertexColors: true, transparent: true, depthWrite: false, map: sm('dot'), alphaTest: 0.01 }));
    partPts.frustumCulled = false; scene.add(partPts);
    // ضل ودرع
    const cg = new T.CircleGeometry(1, 20); cg.rotateX(-Math.PI / 2);
    shadowP = new T.Mesh(cg, M.shadow); shadowH = new T.Mesh(cg, M.shadow); scene.add(shadowP, shadowH);
    shield = new T.Mesh(G.sph, M.shield); scene.add(shield);
    duoHeart = new T.Sprite(sm('heart')); duoHeart.scale.set(18, 18, 1); scene.add(duoHeart);
    R.ok = true;
  }

  /* ---------- شخصيات ڤوكسل ---------- */
  function voxel(who, item, board) {
    const key = who + (item ? item.id : '0') + board.id;
    if (chars[key]) return chars[key];
    const img = Art.outfit(who, item);
    const x = img.getContext('2d'), d = x.getImageData(0, 0, img.width, img.height).data;
    const list = [];
    for (let yy = 0; yy < img.height; yy++) for (let xx = 0; xx < img.width; xx++) {
      const i = (yy * img.width + xx) * 4; if (d[i + 3] > 100) list.push([xx, yy, d[i], d[i + 1], d[i + 2]]);
    }
    const geo = new T.BoxGeometry(SPR, SPR, SPR * 3.2);
    const mat = new T.MeshLambertMaterial({ transparent: true, opacity: 1 });
    const inst = new T.InstancedMesh(geo, mat, list.length);
    const m4 = new T.Matrix4(), c = new T.Color();
    const W = img.width, H = img.height;
    list.forEach(([xx, yy, r, g, b], i) => {
      // البكسلات اللي في النص أتخن شوية عشان الشكل يبقى مدوّر
      const edge = Math.abs(xx - W / 2) / (W / 2);
      const dz = 1 + (1 - edge) * 0.6;
      m4.makeScale(1, 1, dz); m4.setPosition((xx - W / 2 + 0.5) * SPR, (H - yy - 0.5) * SPR + 3, 0);
      inst.setMatrixAt(i, m4);
      c.setRGB(r / 255, g / 255, b / 255); inst.setColorAt(i, c);
    });
    const grp = new T.Group(), body = new T.Group();
    body.add(inst); grp.add(body);
    const bm = new T.MeshLambertMaterial({ color: board.col, emissive: board.glow ? new T.Color(board.glow).multiplyScalar(0.35) : 0x000000, transparent: true });
    const bd = new T.Mesh(G.box, bm); bd.scale.set(36, 4, 14); bd.position.y = 0; grp.add(bd);
    const tipM = new T.MeshLambertMaterial({ color: board.tip, transparent: true });
    [-1, 1].forEach(s => { const t = new T.Mesh(G.box, tipM); t.scale.set(6, 4, 14); t.position.set(s * 19, 2, 0); t.rotation.z = s * 0.5; grp.add(t); });
    let wings = null;
    if (who === 'w') {
      const wm = new T.MeshLambertMaterial({ color: (item && item.hijab) || '#e9dcc8', transparent: true, side: T.DoubleSide });
      wings = new T.Group();
      [-1, 1].forEach(s => { const w = new T.Mesh(G.box, wm); w.scale.set(44, 3, 20); w.position.set(s * 26, H * SPR * 0.62, 0); w.rotation.z = s * 0.35; wings.add(w); });
      wings.visible = false; grp.add(wings);
    }
    const ch = { grp, body, wings, mats: [mat, bm, tipM], in: false };
    chars[key] = ch;
    return ch;
  }
  function placeChar(o, x, y, z, alpha, t) {
    const ch = voxel(o.who, o.item, o.board);
    if (!ch.in) { scene.add(ch.grp); ch.in = true; }
    ch.used = true;
    const g = ch.grp;
    g.position.set(x, -y, z);
    g.rotation.set(0, 0, -(o.rot || 0));
    ch.body.rotation.y = o.twirl ? o.twirl * Math.PI * 4 : Math.sin(t * 2) * 0.12;
    const sq = o.squash || 0;
    ch.body.scale.set(1 + sq * 0.6, 1 - sq, 1);
    if (ch.wings) { ch.wings.visible = !!o.glide; ch.wings.rotation.x = Math.sin(t * 7) * 0.15; }
    ch.mats.forEach(m => { m.opacity = alpha; m.transparent = alpha < 0.99; m.depthWrite = alpha > 0.5; });
    g.visible = alpha > 0.02;
  }

  /* ---------- ديكور 3D ---------- */
  function mesh(geo, mat, sx, sy, sz, x, y, z) { const m = new T.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); return m; }
  const hash = n => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
  const sn = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) + (hash(i + 1) - hash(i)) * u; };
  function buildDecor(type, s, seed) {
    const g = new T.Group(), r = k => hash(seed * 7.3 + k);
    switch (type) {
      case 'pine': {
        g.add(mesh(G.cyl, M.trunk, 3 * s, 14 * s, 3 * s, 0, 7 * s, 0));
        for (let i = 0; i < 3; i++) g.add(mesh(G.cone, M.decor, (24 - i * 6) * s, 28 * s, (24 - i * 6) * s, 0, (20 + i * 15) * s, 0));
        g.add(mesh(G.cone, M.white, 7 * s, 10 * s, 7 * s, 0, 64 * s, 0));
        break;
      }
      case 'cactus':
        if (r(1) < 0.5) {
          const h = (40 + r(2) * 30) * s;
          g.add(mesh(G.cyl, M.decor, 5 * s, h, 5 * s, 0, h / 2, 0));
          g.add(mesh(G.cyl, M.decor, 3.5 * s, h * 0.35, 3.5 * s, -10 * s, h * 0.55, 0));
          g.add(mesh(G.cyl, M.decor, 3.5 * s, h * 0.3, 3.5 * s, 10 * s, h * 0.7, 0));
          break;
        }
      // falls through
      case 'palm': {
        const h = 70 * s;
        const tr = mesh(G.cyl, M.trunk, 3 * s, h, 3 * s, 3 * s, h / 2, 0); tr.rotation.z = -0.08; g.add(tr);
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * Math.PI * 2, l = mesh(G.sph, M.decor, 20 * s, 3 * s, 6 * s, 6 * s + Math.cos(a) * 14 * s, h + 2 * s, Math.sin(a) * 14 * s);
          l.rotation.y = -a; l.rotation.z = -0.35; g.add(l);
        }
        break;
      }
      case 'city': {
        const h = (60 + r(3) * 110) * s, w = (30 + r(4) * 30) * s, dd = (30 + r(6) * 20) * s;
        g.add(mesh(G.box, M.decor, w, h, dd, 0, h / 2 - 4, 0));
        for (let i = 0; i < 8; i++) if (r(10 + i) < 0.6) g.add(mesh(G.box, M.window, 5 * s, 6 * s, 1, -w / 2 + 7 * s + (i % 3) * (w - 14 * s) / 2, h - 12 * s - Math.floor(i / 3) * 18 * s, dd / 2 + 0.6));
        if (r(5) < 0.35) {
          g.add(mesh(G.sph, M.decor, w * 0.38, w * 0.38, w * 0.38, 0, h - 4, 0));
          g.add(mesh(G.cyl, M.decor, 3 * s, 46 * s, 3 * s, w * 0.42, h + 20 * s, 0));
          g.add(mesh(G.cone, M.window, 4 * s, 8 * s, 4 * s, w * 0.42, h + 47 * s, 0));
        }
        break;
      }
      case 'autumn': {
        const h = (50 + r(2) * 25) * s;
        g.add(mesh(G.cyl, M.trunk, 3.5 * s, h * 0.6, 3.5 * s, 0, h * 0.3, 0));
        for (let i = 0; i < 5; i++) g.add(mesh(G.sph, M.leaf[(seed + i) % 4], (11 + r(i + 4) * 7) * s, (11 + r(i + 4) * 7) * s, (11 + r(i + 7) * 7) * s, (r(i) - 0.5) * 26 * s, h * 0.6 + r(i + 9) * 24 * s, (r(i + 3) - 0.5) * 20 * s));
        break;
      }
      case 'lavender':
        if (r(1) < 0.45) {
          g.add(mesh(G.cyl, M.trunk, 3 * s, 36 * s, 3 * s, 0, 18 * s, 0));
          for (let i = 0; i < 6; i++) g.add(mesh(G.sph, M.pink[i % 3], (9 + r(i + 2) * 6) * s, (9 + r(i + 2) * 6) * s, (9 + r(i + 2) * 6) * s, (r(i) - 0.5) * 34 * s, 40 * s + r(i + 5) * 18 * s, (r(i + 8) - 0.5) * 20 * s));
        } else for (let i = 0; i < 9; i++) {
          const xx = (r(i) - 0.5) * 30 * s, zz = (r(i + 20) - 0.5) * 30 * s, hh = (16 + r(i + 3) * 14) * s;
          g.add(mesh(G.cyl, M.stem, 0.8 * s, hh, 0.8 * s, xx, hh / 2, zz));
          g.add(mesh(G.cone, M.lav, 2.6 * s, 10 * s, 2.6 * s, xx, hh + 4 * s, zz));
        }
        break;
      case 'ice': {
        for (let i = 0; i < 3; i++) { const h = (30 + r(i) * 50) * s; const c = mesh(G.cone, M.ice, (8 + r(i + 3) * 6) * s, h, (8 + r(i + 5) * 6) * s, (i - 1) * 12 * s, h / 2, (r(i + 7) - 0.5) * 14 * s); c.rotation.z = (r(i + 9) - 0.5) * 0.3; g.add(c); }
        break;
      }
      case 'cloud': {
        for (let i = 0; i < 5; i++) g.add(mesh(G.sph, M.white, (14 + r(i) * 8) * s, (10 + r(i + 2) * 6) * s, (14 + r(i + 4) * 6) * s, (i - 2) * 13 * s, 6 * s + (i % 2) * 6 * s, (r(i + 6) - 0.5) * 16 * s));
        break;
      }
    }
    return g;
  }

  /* ---------- مزامنة الحاجات مع العالم ---------- */
  function sync(pool, list, make, update, x0, x1) {
    for (const [k, v] of pool) v.__seen = false;
    for (const o of list) {
      const ox = o.x != null ? o.x : o.x1;
      if (ox < x0 || ox > x1) continue;
      let m = pool.get(o);
      if (!m) { m = make(o); if (!m) continue; pool.set(o, m); scene.add(m); }
      m.__seen = true;
      update && update(o, m);
    }
    for (const [k, v] of pool) if (!v.__seen) { scene.remove(v); pool.delete(k); }
  }

  /* ---------- الرسم ---------- */
  function render(Wd, dt) {
    const { pts, baseX, DX, P, helper, cam, time, run, hAt } = Wd;
    if (!P || !pts.length) return;
    if (lastRunId !== run) { lastRunId = run; camInit = false; for (const k in pools) { for (const [, v] of pools[k]) scene.remove(v); pools[k].clear(); } }
    const pal = Wd.palette(P.x);
    const bi = Wd.biomeAt(P.x), bType = BIOMES[pal.main];

    // ألوان
    if (lastPal !== pal.sky0 + pal.ground + pal.decorCol) {
      lastPal = pal.sky0 + pal.ground + pal.decorCol;
      skyMat.uniforms.top.value.set(pal.sky0); skyMat.uniforms.bot.value.set(pal.sky1);
      scene.fog.color.set(pal.sky1);
      hemi.color.set(0xffffff); hemi.groundColor.set(pal.shade);
      M.decor.color.set(pal.decorCol); M.rock.color.set(pal.rock);
      farLayers[0].material.color.set(pal.mid); farLayers[1].material.color.set(pal.far);
    }
    const night = pal.night;
    hemi.intensity = 0.68 - night * 0.2; dir.intensity = 0.5 - night * 0.2;
    stars.material.opacity = Math.max(0, night - 0.1);
    M.window.color.set(night > 0.5 ? 0xffd88a : 0xc9d6e8);

    // الكاميرا
    const port = Wd.Hc > Wd.Wc;
    const z = cam.z || 1, dist = (port ? 470 : 270) * z;
    const gy = Wd.isGap(P.x) ? P.y : hAt(P.x);
    const midY = (P.y + gy) / 2;
    const tPos = tmpV.set(P.x - 150 * z, -midY + 95 * z + (port ? 90 : 0), dist);
    if (!camInit) { camPos.copy(tPos); camLook.set(P.x + 150, -midY - 40, 0); camInit = true; }
    const k = Math.min(1, dt * 4.5);
    camPos.lerp(tPos, k);
    camLook.lerp(lookT.set(P.x + 110 + P.speed * 0.1, -midY - 30, -10), k);
    camera.position.copy(camPos);
    if (Wd.shake) camera.position.add(shk.set((Math.random() - 0.5) * Wd.shake * 1.5, (Math.random() - 0.5) * Wd.shake * 1.5, 0));
    camera.lookAt(camLook);
    skyMesh.position.copy(camera.position); stars.position.copy(camera.position);
    sunSprite.position.set(camera.position.x + 1800, camera.position.y + 200 + (1 - pal.sunY) * 1600, camera.position.z - 3600);
    sunSprite.material.color.set(pal.sun);
    dir.position.set(camLook.x - 300, camLook.y + 800, 500); dir.target.position.copy(camLook);

    // الأرض
    const i0 = Math.max(0, Math.floor((camLook.x - 1000 - baseX) / DX)), i1 = Math.min(pts.length - 1, i0 + MAXC - 1);
    const n = i1 - i0 + 1;
    const cG = new T.Color(pal.ground), cE = new T.Color(pal.edge), cS = new T.Color(pal.shade);
    const idx = terrGeo.index.array; let ii = 0;
    for (let c = 0; c < n; c++) {
      const p = pts[i0 + c], x = baseX + (i0 + c) * DX;
      for (let r = 0; r < ROWS; r++) {
        const zz = COLS[r], az = Math.abs(zz), o = (c * ROWS + r) * 3;
        let yy = -p.y;
        if (az > TRACK) {
          const f = (az - TRACK);
          const bump = sn(x / 260 + r * 3.7) * 0.6 + sn(x / 700 + r * 1.3) * 0.4;
          if (zz < 0) yy += Math.pow(f / 300, 1.2) * 150 + bump * Math.min(f, 400) * 0.22;
          else yy -= f * 0.22 - bump * Math.min(f, 300) * 0.08;
        }
        terrPos[o] = x; terrPos[o + 1] = p.gap && az <= 300 ? yy - 900 : yy; terrPos[o + 2] = zz;
        const t = az <= TRACK ? 0 : Math.min(1, (az - TRACK) / 500);
        tmpC.copy(az <= 40 ? cE : cG).lerp(cS, t * 0.8);
        const v = 0.96 + hash(i0 + c + r * 31) * 0.06;
        terrCol[o] = tmpC.r * v; terrCol[o + 1] = tmpC.g * v; terrCol[o + 2] = tmpC.b * v;
      }
    }
    for (let c = 0; c < n - 1; c++) {
      const gapCol = pts[i0 + c].gap || pts[i0 + c + 1].gap;
      for (let r = 0; r < ROWS - 1; r++) {
        if (gapCol && Math.abs(COLS[r]) <= 300 && Math.abs(COLS[r + 1]) <= 300) continue;
        const a = c * ROWS + r, b = a + ROWS;
        idx[ii++] = a; idx[ii++] = b; idx[ii++] = a + 1; idx[ii++] = a + 1; idx[ii++] = b; idx[ii++] = b + 1;
      }
    }
    terrGeo.setDrawRange(0, ii);
    terrGeo.index.needsUpdate = true; terrGeo.attributes.position.needsUpdate = true; terrGeo.attributes.color.needsUpdate = true;
    terrGeo.computeVertexNormals();

    // الجبال البعيدة
    farLayers.forEach(m => {
      const N = m.userData.n, pos = m.geometry.attributes.position.array, zz = m.userData.z, kk = m.userData.k;
      const span = 12000, x0 = camera.position.x - span * 0.4;
      const base = camLook.y - (kk ? 450 : 300);
      for (let i = 0; i < N; i++) {
        const x = x0 + i / (N - 1) * span;
        let h;
        const fx = x * 0.0006 * (kk ? 1 : 1.6);
        const nz = (Math.sin(fx * 3.1) + Math.sin(fx * 7.3 + 1) * 0.5 + Math.sin(fx * 13.7 + 2) * 0.25) / 1.75;
        if (bType.id === 'city' && !kk) h = 300 + hash(Math.floor(x / 160)) * 500;
        else if (bType.id === 'snow' || bType.id === 'aurora') h = 500 + Math.abs(nz) * 1500;
        else if (bType.id === 'beach' && kk) h = 30;
        else h = 300 + (nz + 1) * 500;
        pos[i * 6] = x; pos[i * 6 + 1] = base - 2500; pos[i * 6 + 2] = zz;
        pos[i * 6 + 3] = x; pos[i * 6 + 4] = base + h; pos[i * 6 + 5] = zz;
      }
      m.geometry.attributes.position.needsUpdate = true;
    });
    // شفق
    const auro = (bi.i === 6 ? 1 - bi.t : 0) + (bi.j === 6 ? bi.t : 0);
    aurora.forEach((m, k2) => {
      m.material.opacity = 0.22 * auro; m.visible = auro > 0.01;
      if (!m.visible) return;
      m.position.set(camera.position.x + 600, camLook.y + 1500 + k2 * 180, -3000 + k2 * 200);
      const p = m.geometry.attributes.position.array, b = m.userData.base;
      for (let i = 0; i < p.length; i += 3) p[i + 1] = b[i + 1] + Math.sin(b[i] * 0.002 + time * 0.6 + k2) * 120 + Math.sin(b[i] * 0.005 - time * 0.4) * 50;
      m.geometry.attributes.position.needsUpdate = true;
    });

    // الحاجات
    const x0 = camLook.x - 1100, x1 = camLook.x + 2700;
    sync(pools.decor, Wd.decor, d => {
      const bb = Wd.biomeAt(d.x), type = BIOMES[bb.t < 0.5 ? bb.i : bb.j].decor;
      const g = new T.Group();
      const s = d.s * 1.15;
      const zb = -(90 + hash(d.seed) * 380), zf = 170 + hash(d.seed + 5) * 240;
      const a = buildDecor(type, s, d.seed); a.position.set(0, 0, zb); g.add(a);
      if (hash(d.seed + 9) < 0.7) { const b2 = buildDecor(type, s * 1.2, d.seed + 3); b2.position.set(60, 0, zb - 260); g.add(b2); }
      if (!d.back && type !== 'city') { const c2 = buildDecor(type, s * 0.85, d.seed + 1); c2.position.set(0, 0, zf); g.add(c2); }
      g.userData.parts = g.children.map(ch => ch.position.z);
      g.position.x = d.x;
      return g;
    }, (d, g) => {
      g.children.forEach(ch => {
        const zz = ch.position.z, az = Math.abs(zz);
        let yy = -hAt(d.x + ch.position.x);
        const rr = COLS.reduce((bi, cz, i) => Math.abs(cz - zz) < Math.abs(COLS[bi] - zz) ? i : bi, 0), xx = d.x + ch.position.x;
        const f = az - TRACK, bump = sn(xx / 260 + rr * 3.7) * 0.6 + sn(xx / 700 + rr * 1.3) * 0.4;
        if (zz < -TRACK) yy += Math.pow(f / 300, 1.2) * 150 + bump * Math.min(f, 400) * 0.22;
        else if (zz > TRACK) yy -= f * 0.22 - bump * Math.min(f, 300) * 0.08;
        ch.position.y = yy + 4;
      });
    }, x0, x1);
    sync(pools.rock, Wd.rocks, r => {
      const m = new T.Mesh(G.dode, M.rock); m.scale.set(r.w * 0.6, r.h * 0.9, r.w * 0.7); m.rotation.y = r.x; return m;
    }, (r, m) => { m.visible = !r.broken; m.position.set(r.x, -hAt(r.x) + r.h * 0.35, 0); }, x0, x1);
    sync(pools.flower, Wd.flowers, f => { const s = new T.Sprite(sm('flower')); s.scale.set(44, 44, 1); return s; },
      (f, s) => { s.position.set(f.x, -hAt(f.x) + 20, 0); s.material.opacity = f.used ? 0.5 : 1; }, x0, x1);
    sync(pools.item, Wd.items, it => {
      if (it.type === 'coin') return new T.Mesh(G.coin, M.coin);
      const s = new T.Sprite(sm(it.type)); const sc = { heart: 26, page: 34, feather: 34, magnet: 34, vstar: 34 }[it.type] || 28; s.scale.set(sc, sc, 1); return s;
    }, (it, m) => {
      m.visible = !it.got;
      m.position.set(it.x, -it.y + Math.sin(time * 3 + it.x * 0.05) * 3, 0);
      if (it.type === 'coin') m.rotation.y = time * 3 + it.x * 0.01;
    }, x0, x1);
    sync(pools.rope, Wd.ropes, r => {
      const g = new T.Group(), city = BIOMES[Wd.biomeAt(r.x1).i].id === 'city';
      [[r.x1, r.y1], [r.x2, r.y2]].forEach(([x, y]) => { const h = hAt(x) - y + 10; g.add(mesh(G.cyl, M.pole, 2, h, 2, x, -y - h / 2 + 6, 0)); });
      const pts3 = []; for (let x = r.x1; x <= r.x2; x += 10) pts3.push(new T.Vector3(x, -Wd.ropeY(r, x), 0));
      g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts3), M.rope));
      const cols = city ? ['#ffcf5a', '#ff8a5a', '#7fd0ff', '#c9a6ff'] : ['#c9a6ff', '#ff9cc9', '#ffd45e', '#8fe3c0'];
      for (let x = r.x1 + 16, i = 0; x < r.x2 - 8; x += 26, i++) { const s = new T.Sprite(sm('lantern', cols[i % 4])); s.scale.set(11, 11, 1); s.position.set(x, -Wd.ropeY(r, x) - 8, 0); g.add(s); }
      return g;
    }, null, x0 - 400, x1);

    // الشخصيات
    for (const kk in chars) chars[kk].used = false;
    const hw = Wd.helperWho(), main = run.main;
    const hz = P.power > 0 ? -16 : -30;
    R.helperZ = hz;
    const hv = helper.vis == null ? 1 : helper.vis;
    const blink = P.invuln > 0 && Math.sin(time * 30) > 0;
    placeChar(Wd.charOpts(main, { rot: P.rot, squash: P.land * 0.12, twirl: P.twirl, glide: P.gliding > 0 && main === 'w' }), P.x, P.y, 6, blink ? 0.5 : 1, time);
    if (hv > 0.02) placeChar(Wd.charOpts(hw, { rot: helper.rot, twirl: helper.tw, glide: helper.glide && hw === 'w' }), helper.x, helper.y, hz, hv, time);
    for (const kk in chars) if (!chars[kk].used && chars[kk].in) { scene.remove(chars[kk].grp); chars[kk].in = false; }
    // ضل
    [[shadowP, P, 6, 1], [shadowH, helper, hz, hv]].forEach(([m, ch, zz, vis]) => {
      const gx = ch.x, g2 = Wd.isGap(gx) ? null : hAt(gx);
      m.visible = g2 != null && vis > 0.3 && !P.dead;
      if (!m.visible) return;
      const hgt = Math.max(0, g2 - ch.y), s = Math.max(4, 16 - hgt * 0.04);
      m.position.set(gx, -g2 + 1.5, zz); m.scale.set(s * 1.4, 1, s * 0.8); m.rotation.z = -Wd.angAt(gx);
      m.material.opacity = 0.22 * Math.max(0.2, 1 - hgt / 300);
    });
    shield.visible = P.power > 0;
    if (shield.visible) {
      shield.position.set((P.x + helper.x) / 2, -(P.y + helper.y) / 2 + 26, (6 + hz) / 2);
      shield.scale.set(64, 50, 46);
      M.shield.opacity = 0.16 + Math.sin(time * 6) * 0.04;
    }
    duoHeart.visible = P.duoT > 0 && !P.grounded && hv > 0.5;
    if (duoHeart.visible) duoHeart.position.set((P.x + helper.x) / 2, -(P.y + helper.y) / 2 + 40 + Math.sin(time * 8) * 2, (6 + hz) / 2);

    // جزيئات
    const pp = partGeo.attributes.position.array, pc = partGeo.attributes.color.array;
    const L = Math.min(500, Wd.parts.length);
    for (let i = 0; i < L; i++) {
      const p = Wd.parts[i]; const a = Math.max(0, p.life / p.max);
      pp[i * 3] = p.x; pp[i * 3 + 1] = -p.y; pp[i * 3 + 2] = ((i % 9) - 4) * 3;
      tmpC.set(p.col); pc[i * 3] = tmpC.r; pc[i * 3 + 1] = tmpC.g; pc[i * 3 + 2] = tmpC.b;
      if (a < 0.15) pp[i * 3 + 1] = -1e7;
    }
    partGeo.setDrawRange(0, L);
    partGeo.attributes.position.needsUpdate = true; partGeo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
  }

  function project(x, y, z = 0) {
    tmpV.set(x, -y, z).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return { x: (tmpV.x + 1) / 2 * w, y: (1 - tmpV.y) / 2 * h };
  }
  function resize(w, h, dpr, q) {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(dpr || 1, q === 0 ? 1 : 1.75));
    renderer.setSize(w, h, true);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  const R = { ok: false, init, render, project, resize, helperZ: -30, get canvas() { return canvas; } };
  return R;
})();
window.R3 = R3;
