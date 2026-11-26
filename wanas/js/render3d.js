/* سند و ونس — وضع 3D (نسخة 2)
   نفس اللعبة ونفس الفيزيا، مرسومة بـ Three.js:
   - الشخصيات ڤوكسل من رسومات محمد، متقسّمة (راس/جسم/رجلين) وبتتحرك، وطرحة ونس بترفرف مكعبات
   - ضل حقيقي، كاميرا سينمائية بوضعين (جنب / ورا)، أثر الزحليقة على الأرض
   - قلوب ونجوم مجسّمة بتلمع، جبال بطبقات وقمم تلج، سحاب، بحر، فوانيس منوّرة */
'use strict';

const R3 = (() => {
  const T = window.THREE;
  if (!T) return { ok: false };
  const SPR = Art.SPR;
  let renderer, scene, camera, canvas, quality = 1;
  let hemi, dir, nightLight, skyMesh, skyMat, sunSprite, sunHalo, stars;
  let terrGeo, terrPos, terrCol, terr;
  let trailGeo, trailMesh, glitter, glitterGeo, sea;
  const clouds = [], farLayers = [], aurora = [];
  const pools = { decor: new Map(), item: new Map(), rock: new Map(), flower: new Map(), rope: new Map() };
  const chars = {};
  let partGeo, partAddGeo, blobP, blobH, shield, duoHeart;
  const camPos = new T.Vector3(), camLook = new T.Vector3(), lookT = new T.Vector3(), shk = new T.Vector3();
  let camInit = false, lastRunId = null, fov = 50, orbit = 0;
  const tmpC = new T.Color(), tmpC2 = new T.Color(), tmpV = new T.Vector3();
  const COLS = [-1100, -700, -440, -260, -150, -80, -64, -52, -40, -14, 0, 14, 40, 52, 64, 80, 150, 260, 420, 640];
  const markers = new Map();
  const TRACK = 60, ROWS = COLS.length, MAXC = 270;
  const trail = [];
  let lastPal = null;

  const hash = n => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
  const sn = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) + (hash(i + 1) - hash(i)) * u; };
  /* ارتفاع جوانب الوادي (الطريق نفسه = فيزيا اللعبة) */
  function side(x, z) {
    const az = Math.abs(z); if (az <= TRACK) return 0;
    const f = az - TRACK, bump = sn(x / 260 + z / 97) * 0.6 + sn(x / 700 + z / 230) * 0.4;
    return z < 0 ? Math.pow(f / 300, 1.25) * 170 + bump * Math.min(f, 500) * 0.25 : -f * 0.2 + bump * Math.min(f, 300) * 0.1;
  }

  /* ---------- مواد ---------- */
  const GRAD = (() => { const d = new Uint8Array([105, 105, 105, 255, 185, 185, 185, 255, 255, 255, 255, 255]); const t = new T.DataTexture(d, 3, 1, T.RGBAFormat); t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t; })();
  const lam = (c, o = {}) => o.flatShading ? new T.MeshLambertMaterial(Object.assign({ color: c }, o)) : new T.MeshToonMaterial(Object.assign({ color: c, gradientMap: GRAD }, o));
  const M = {
    decor: lam(0x3d4f6d), trunk: lam(0x6b4a32), white: lam(0xffffff), rock: lam(0x5b6680, { flatShading: true }),
    snowcap: lam(0xffffff, { flatShading: true }),
    leaf: [0xe2702d, 0xc94a26, 0xe9a23b, 0xb8572b].map(c => lam(c)),
    pink: [0xf4b6e0, 0xe59ad0, 0xffd0ee].map(c => lam(c)),
    lav: lam(0x9b6fe0), stem: lam(0x5f8a4f),
    ice: lam(0xbfe0ff, { transparent: true, opacity: 0.85 }),
    window: new T.MeshBasicMaterial({ color: 0xffd88a }),
    star: lam(0xffd45e, { emissive: 0x8a6000 }),
    heart: lam(0xb98cff, { emissive: 0x4a2490 }),
    pole: lam(0x3a2c3e), mark: lam(0x8b5cf6), mark2: lam(0xff8fc7), rope: new T.LineBasicMaterial({ color: 0x4a3a2e }),
    blob: new T.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.22, depthWrite: false }),
    shield: new T.MeshBasicMaterial({ color: 0xc9a6ff, transparent: true, opacity: 0.16, depthWrite: false }),
    trail: new T.MeshBasicMaterial({ color: 0x9fb0d8, transparent: true, opacity: 0.35, depthWrite: false }),
    sea: lam(0x4b7fc4, { transparent: true, opacity: 0.92 }),
  };
  const G = {
    cyl: new T.CylinderGeometry(1, 1, 1, 8), cone: new T.ConeGeometry(1, 1, 8), sph: new T.SphereGeometry(1, 12, 9),
    box: new T.BoxGeometry(1, 1, 1), dode: new T.DodecahedronGeometry(1, 0), ico: new T.IcosahedronGeometry(1, 0),
  };
  { // نجمة وقلب مجسّمين
    const st = new T.Shape();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.3 : 9.5; i ? st.lineTo(Math.cos(a) * r, -Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, -Math.sin(a) * r); }
    G.star = new T.ExtrudeGeometry(st, { depth: 2.4, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 1 }); G.star.center();
    const h = new T.Shape();
    h.moveTo(0, -7); h.bezierCurveTo(-11, 2, -5, 11, 0, 5); h.bezierCurveTo(5, 11, 11, 2, 0, -7);
    G.heart = new T.ExtrudeGeometry(h, { depth: 3, bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5, bevelSegments: 2 }); G.heart.center();
  }

  /* ---------- صور ---------- */
  const texCache = {};
  function tex(key, draw, size = 64) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.translate(size / 2, size / 2); draw(x, size);
    const t = new T.CanvasTexture(c); t.minFilter = T.LinearFilter;
    return (texCache[key] = t);
  }
  const radial = (x, s, stops) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, s / 2); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(-s / 2, -s / 2, s, s); };
  const T_ = {
    dot: () => tex('dot', (x, s) => radial(x, s, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.85)'], [1, 'rgba(255,255,255,0)']]), 32),
    glow: () => tex('glow', (x, s) => radial(x, s, [[0, 'rgba(255,255,255,.9)'], [0.25, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]), 64),
    sun: () => tex('sun', (x, s) => radial(x, s, [[0, '#fff'], [0.18, '#fff'], [0.24, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]), 128),
    cloud: () => tex('cloud', (x, s) => { for (let i = 0; i < 9; i++) { const cx = (hash(i) - 0.5) * s * 0.55, cy = (hash(i + 9) - 0.5) * s * 0.18, r = s * (0.13 + hash(i + 3) * 0.12); const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } }, 256),
    sparkle: () => tex('sparkle', (x, s) => { radial(x, s * 0.6, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]); x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(-s / 2, -1, s, 2); x.fillRect(-1, -s / 2, 2, s); }, 32),
  };
  const smCache = {};
  function spr(key, make, add) { return smCache[key] || (smCache[key] = new T.SpriteMaterial(Object.assign({ map: make(), depthWrite: false }, add ? { blending: T.AdditiveBlending } : {}))); }
  const S = {
    page: () => spr('page', () => tex('page', x => { x.scale(2.4, 2.4); Art.page(x, 0, 0, 0); })),
    feather: () => spr('feather', () => tex('feather', x => { x.scale(2.2, 2.2); x.shadowColor = '#c9a6ff'; x.shadowBlur = 8; Art.feather(x, 0, 0, 0); })),
    magnet: () => spr('magnet', () => tex('magnet', x => { x.scale(2.4, 2.4); Art.magnet(x, 0, 0); })),
    vstar: () => spr('vstar', () => tex('vstar', x => { x.shadowColor = '#b27cff'; x.shadowBlur = 14; Art.star(x, 0, 0, 26, '#a66bff'); Art.star(x, 0, 0, 11, '#fff'); })),
    flower: () => spr('flower', () => tex('flower', x => { x.scale(2.2, 2.2); Art.flower(x, 0, 12, 0, 0); })),
    glow: (c) => { const m = spr('glow', T_.glow, true).clone(); m.color.set(c); return m; },
  };

  /* ---------- البداية ---------- */
  function init(cv) {
    canvas = cv;
    renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(50, 1, 4, 12000);
    scene.fog = new T.Fog(0xf8d4c4, 900, 4200);
    hemi = new T.HemisphereLight(0xffffff, 0x8f9cc8, 0.62); scene.add(hemi);
    dir = new T.DirectionalLight(0xfff4e6, 0.62);
    dir.castShadow = true; dir.shadow.mapSize.set(1024, 1024);
    Object.assign(dir.shadow.camera, { left: -340, right: 340, top: 260, bottom: -260, near: 10, far: 1800 });
    dir.shadow.camera.updateProjectionMatrix();
    dir.shadow.bias = -0.0008; dir.shadow.normalBias = 1.2;
    scene.add(dir, dir.target);
    nightLight = new T.PointLight(0xffe0b0, 0, 420, 1.6); scene.add(nightLight);

    skyMat = new T.ShaderMaterial({
      uniforms: { top: { value: new T.Color() }, bot: { value: new T.Color() }, sunDir: { value: new T.Vector3(0.4, 0.2, -1).normalize() }, sunCol: { value: new T.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP; void main(){ float t = clamp(vP.y*1.5+0.32,0.0,1.0); vec3 c = mix(bot, top, pow(t,0.9)); float s = max(dot(normalize(vP), sunDir),0.0); c += sunCol * (pow(s,8.0)*0.35 + pow(s,64.0)*0.5); gl_FragColor = vec4(c,1.0); }',
      side: T.BackSide, depthWrite: false, fog: false,
    });
    skyMesh = new T.Mesh(new T.SphereGeometry(9000, 32, 16), skyMat); skyMesh.renderOrder = -10; scene.add(skyMesh);
    sunSprite = new T.Sprite(new T.SpriteMaterial({ map: T_.sun(), transparent: true, depthWrite: false, fog: false })); sunSprite.scale.set(700, 700, 1); scene.add(sunSprite);
    sunHalo = new T.Sprite(new T.SpriteMaterial({ map: T_.glow(), transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending, opacity: 0.5 })); sunHalo.scale.set(2600, 2600, 1); scene.add(sunHalo);
    { // نجوم
      const g = new T.BufferGeometry(), n = 700, p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.9 + 0.05, r = 8500; p[i * 3] = Math.cos(a) * Math.cos(b) * r; p[i * 3 + 1] = Math.sin(b) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r; }
      g.setAttribute('position', new T.BufferAttribute(p, 3));
      stars = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 26, transparent: true, opacity: 0, fog: false, depthWrite: false, map: T_.dot(), blending: T.AdditiveBlending }));
      scene.add(stars);
    }
    for (let k = 0; k < 3; k++) { // شفق
      const g = new T.PlaneGeometry(10000, 520, 70, 1);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: k === 1 ? 0xb27cff : 0x5cf2b0, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, fog: false, blending: T.AdditiveBlending }));
      m.userData.base = Float32Array.from(g.attributes.position.array); aurora.push(m); scene.add(m);
    }
    for (let k = 0; k < 3; k++) { // جبال بطبقات
      const n = 140, g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3 * 3), 3));
      g.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3 * 3), 3));
      const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
      g.setIndex(idx);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide, fog: true }));
      m.frustumCulled = false; m.userData = { n, z: [-1300, -2300, -3600][k], k };
      farLayers.push(m); scene.add(m);
    }
    for (let i = 0; i < 16; i++) { // سحاب
      const s = new T.Sprite(new T.SpriteMaterial({ map: T_.cloud(), transparent: true, depthWrite: false, opacity: 0.85 }));
      s.userData = { ox: hash(i) * 9000, oy: 500 + hash(i + 2) * 1100, z: -1000 - hash(i + 4) * 3000, sc: 700 + hash(i + 6) * 900, sp: 4 + hash(i + 8) * 10 };
      clouds.push(s); scene.add(s);
    }
    sea = new T.Mesh(new T.PlaneGeometry(16000, 6000, 1, 1), M.sea); sea.rotation.x = -Math.PI / 2; scene.add(sea);

    // الأرض
    terrGeo = new T.BufferGeometry();
    terrPos = new Float32Array(MAXC * ROWS * 3); terrCol = new Float32Array(MAXC * ROWS * 3);
    terrGeo.setAttribute('position', new T.BufferAttribute(terrPos, 3));
    terrGeo.setAttribute('color', new T.BufferAttribute(terrCol, 3));
    terrGeo.setIndex(new T.BufferAttribute(new Uint32Array((MAXC - 1) * (ROWS - 1) * 6), 1));
    terr = new T.Mesh(terrGeo, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
    terr.frustumCulled = false; terr.receiveShadow = true; scene.add(terr);
    // أثر الزحليقة
    trailGeo = new T.BufferGeometry();
    trailGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(160 * 2 * 3), 3));
    { const idx = []; for (let i = 0; i < 159; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } trailGeo.setIndex(idx); }
    trailMesh = new T.Mesh(trailGeo, M.trail); trailMesh.frustumCulled = false; scene.add(trailMesh);
    // لمعة التلج
    glitterGeo = new T.BufferGeometry();
    glitterGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(420 * 3), 3));
    glitterGeo.setAttribute('color', new T.BufferAttribute(new Float32Array(420 * 3), 3));
    glitter = new T.Points(glitterGeo, new T.PointsMaterial({ size: 9, vertexColors: true, map: T_.sparkle(), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    glitter.frustumCulled = false; scene.add(glitter);
    // جزيئات (عادية + منوّرة)
    const mkParts = (add) => {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array(500 * 3), 3));
      g.setAttribute('color', new T.BufferAttribute(new Float32Array(500 * 3), 3));
      const p = new T.Points(g, new T.PointsMaterial({ size: add ? 12 : 8, vertexColors: true, transparent: true, depthWrite: false, map: T_.dot(), blending: add ? T.AdditiveBlending : T.NormalBlending }));
      p.frustumCulled = false; scene.add(p); return g;
    };
    partGeo = mkParts(false); partAddGeo = mkParts(true);
    const cg = new T.CircleGeometry(1, 20); cg.rotateX(-Math.PI / 2);
    blobP = new T.Mesh(cg, M.blob); blobH = new T.Mesh(cg, M.blob); scene.add(blobP, blobH);
    shield = new T.Mesh(G.sph, M.shield); scene.add(shield);
    duoHeart = new T.Mesh(G.heart, M.heart); duoHeart.scale.setScalar(0.9); scene.add(duoHeart);
    R.ok = true;
  }

  /* ---------- شخصيات ڤوكسل متقسّمة ---------- */
  function voxel(who, item, board) {
    const key = who + (item ? item.id : '0') + board.id;
    if (chars[key]) return chars[key];
    const img = Art.outfit(who, item), W = img.width, H = img.height;
    const d = img.getContext('2d').getImageData(0, 0, W, H).data;
    const headRow = Math.round(H * (who === 'w' ? 0.5 : 0.54)), legRow = Math.round(H * 0.86);
    const parts = { head: [], torso: [], legs: [] };
    const op = (x2, y2) => x2 >= 0 && y2 >= 0 && x2 < W && y2 < H && d[(y2 * W + x2) * 4 + 3] >= 100;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const i = (yy * W + xx) * 4; if (d[i + 3] < 100) continue;
      const edge = !op(xx - 1, yy) || !op(xx + 1, yy) || !op(xx, yy - 1) || !op(xx, yy + 1);
      (yy < headRow ? parts.head : yy < legRow ? parts.torso : parts.legs).push([xx, yy, d[i], d[i + 1], d[i + 2], edge]);
    }
    const geo = new T.BoxGeometry(SPR, SPR, SPR);
    const mat = lam(0xffffff);
    const m4 = new T.Matrix4(), c = new T.Color();
    const hipY = (H - legRow) * SPR + 3, neckY = (H - headRow) * SPR + 3;
    const backHead = who === 'w' ? new T.Color((item && item.hijab) || '#e9dcc8') : new T.Color(0x1c1919);
    const outM = new T.MeshBasicMaterial({ color: 0x1a1030, side: T.BackSide });
    const geoO = new T.BoxGeometry(SPR + 1.1, SPR + 1.1, SPR);
    const bc = new T.Color();
    const make = (list, pivotY, part) => {
      const grpP = new T.Group(), n = list.length;
      const inst = new T.InstancedMesh(geo, mat, Math.max(1, n * 2));
      const out = new T.InstancedMesh(geoO, outM, Math.max(1, n));
      let no = 0;
      list.forEach(([xx, yy, r, g, b, edge], i) => {
        const e = Math.abs(xx - W / 2 + 0.5) / (W / 2), dz = 2.4 + (1 - e * e) * 2.8;
        const px = (xx - W / 2 + 0.5) * SPR, py = (H - yy - 0.5) * SPR + 3 - pivotY;
        c.setRGB(r / 255, g / 255, b / 255);
        // النص اللي قدّام: الرسمة نفسها
        m4.makeScale(1, 1, dz / 2); m4.setPosition(px, py, dz * SPR / 4);
        inst.setMatrixAt(i * 2, m4); inst.setColorAt(i * 2, c);
        // النص اللي ورا: ضهر الشخصية (شعر سند / طرحة ونس) بدل الوش
        const skin = r > 140 && r - g > 30 && r - b > 50;
        if (part === 'head' && !(who === 's' && skin && yy > headRow * 0.82)) bc.copy(backHead).multiplyScalar(0.9 + (1 - yy / headRow) * 0.1);
        else if (r + g + b > 600 && !skin) bc.copy(c).multiplyScalar(0.8);
        else bc.copy(c).multiplyScalar(0.94);
        m4.setPosition(px, py, -dz * SPR / 4);
        inst.setMatrixAt(i * 2 + 1, m4); inst.setColorAt(i * 2 + 1, bc);
        if (edge) { m4.makeScale(1, 1, dz + 0.35); m4.setPosition(px, py, 0); out.setMatrixAt(no++, m4); }
      });
      inst.castShadow = true; inst.count = n * 2; out.count = no;
      grpP.add(inst, out);
      return grpP;
    };
    const grp = new T.Group(), body = new T.Group(), legs = new T.Group(), torso = new T.Group(), head = new T.Group();
    legs.add(make(parts.legs, 0, 'legs'));
    torso.position.y = hipY; torso.add(make(parts.torso, hipY, 'torso'));
    head.position.y = neckY - hipY; head.add(make(parts.head, neckY, 'head'));
    torso.add(head); body.add(legs, torso); grp.add(body);
    // الزحليقة
    const bm = lam(board.col, { emissive: board.glow ? new T.Color(board.glow).multiplyScalar(0.3) : 0x000000 });
    const tipM = lam(board.tip);
    const bd = new T.Mesh(G.box, bm); bd.scale.set(34, 3.5, 13); bd.position.y = 0.5; bd.castShadow = true; grp.add(bd);
    [-1, 1].forEach(s => { const t = new T.Mesh(G.box, tipM); t.scale.set(7, 3.5, 13); t.position.set(s * 19.5, 2.2, 0); t.rotation.z = s * 0.45; t.castShadow = true; grp.add(t); });
    let glowS = null;
    if (board.glow) { glowS = new T.Sprite(S.glow(board.glow)); glowS.scale.set(70, 26, 1); grp.add(glowS); }
    // طرحة ونس بترفرف
    let scarf = null, wings = null;
    if (who === 'w') {
      const col = (item && item.hijab) || '#e9dcc8';
      const sm = lam(col), sh = lam(new T.Color(col).multiplyScalar(0.82));
      scarf = [];
      for (let i = 0; i < 7; i++) {
        const b = new T.Mesh(G.box, i % 2 ? sm : sh); const s = 5.2 - i * 0.45; b.scale.set(s, s, s * 1.4); b.castShadow = true;
        head.add(b); scarf.push(b);
      }
      wings = new T.Group();
      [-1, 1].forEach(s => { const w = new T.Mesh(G.box, sm); w.scale.set(46, 2.5, 22); w.position.set(s * 26, 0, 0); w.rotation.z = s * 0.3; w.castShadow = true; wings.add(w); });
      wings.position.y = 10; wings.visible = false; torso.add(wings);
    }
    const ch = { grp, body, legs, torso, head, scarf, wings, glowS, W, H, headH: (H - headRow) * SPR, headY0: head.position.y, in: false, mats: [mat, bm, tipM] };
    chars[key] = ch;
    return ch;
  }
  function placeChar(o, x, y, z, alpha, t, st) {
    const ch = voxel(o.who, o.item, o.board);
    if (!ch.in) { scene.add(ch.grp); ch.in = true; }
    ch.used = true;
    const g = ch.grp;
    g.visible = alpha > 0.05;
    if (!g.visible) return;
    g.position.set(x, -y, z);
    g.rotation.set(0, 0, -(o.rot || 0));
    const sp = Math.min(1, (o.speed || 300) / 520);
    const air = !!st.air, sq = o.squash || 0;
    const yaw = st.yaw || 0;
    ch.body.rotation.y = yaw + (o.twirl ? o.twirl * Math.PI * 4 : 0);
    ch.body.scale.set(1 + sq * 0.5, 1 - sq * 0.9, 1 + sq * 0.5);
    ch.legs.scale.y = air ? 0.86 : 1;
    ch.torso.rotation.z = st.crashed ? 0.9 : air ? (st.flipping ? -0.25 : 0.04) : -(0.1 + sp * 0.14) + Math.sin(t * 2.2) * 0.02;
    ch.torso.position.x = air ? 0 : 1.5 * sp;
    ch.head.rotation.z = Math.sin(t * 3.1) * 0.05 + (air ? 0.08 : 0);
    ch.head.rotation.y = st.lookAt ? st.lookAt : Math.sin(t * 0.7) * 0.15;
    ch.head.position.y = ch.headY0 + (air ? 0 : Math.abs(Math.sin(t * 9)) * 0.6 * sp);
    if (ch.scarf) {
      const hx = -ch.W * SPR * 0.32, hy = -ch.headH * 0.15;
      ch.scarf.forEach((b, i) => {
        const k = i + 1, wave = Math.sin(t * 13 - i * 0.9);
        const L = k * (3.4 + sp * 3.2), side2 = Math.sin(t * 7 - i) * k * 0.5;
        const dx = -Math.cos(yaw), dzz = -Math.sin(yaw);
        b.position.set((yaw ? 0 : hx) + dx * L - dzz * side2, hy - k * 1.1 + wave * k * 0.55 * (0.4 + sp), (yaw ? -ch.W * SPR * 0.12 : -2) + dzz * L + dx * side2);
        b.rotation.z = wave * 0.3;
        b.visible = !st.glide;
      });
    }
    if (ch.wings) { ch.wings.visible = !!st.glide; ch.wings.rotation.x = Math.sin(t * 7) * 0.12; ch.wings.children.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * (0.3 + Math.sin(t * 5) * 0.08); }); }
    if (ch.glowS) ch.glowS.material.opacity = 0.6 + Math.sin(t * 6) * 0.2;
    const tr = alpha < 0.99;
    ch.mats.forEach(m => { if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = alpha; });
  }

  /* ---------- ديكور 3D ---------- */
  function mesh(geo, mat, sx, sy, sz, x, y, z, shadow = true) { const m = new T.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = shadow; return m; }
  function buildDecor(type, s, seed) {
    const g = new T.Group(), r = k => hash(seed * 7.3 + k);
    switch (type) {
      case 'pine': {
        g.add(mesh(G.cyl, M.trunk, 3 * s, 14 * s, 3 * s, 0, 7 * s, 0));
        for (let i = 0; i < 4; i++) {
          g.add(mesh(G.cone, M.decor, (26 - i * 5.5) * s, 24 * s, (26 - i * 5.5) * s, 0, (18 + i * 13) * s, 0));
          g.add(mesh(G.cone, M.white, (19 - i * 4.5) * s, 6 * s, (19 - i * 4.5) * s, 0, (27 + i * 13) * s, 0, false));
        }
        break;
      }
      case 'cactus':
        if (r(1) < 0.5) {
          const h = (40 + r(2) * 30) * s;
          g.add(mesh(G.cyl, M.decor, 5 * s, h, 5 * s, 0, h / 2, 0));
          g.add(mesh(G.cyl, M.decor, 3.5 * s, h * 0.35, 3.5 * s, -10 * s, h * 0.55, 0)); g.add(mesh(G.cyl, M.decor, 3.5 * s, 3.5 * s, 3.5 * s, -6 * s, h * 0.38, 0));
          g.add(mesh(G.cyl, M.decor, 3.5 * s, h * 0.3, 3.5 * s, 10 * s, h * 0.7, 0)); g.add(mesh(G.cyl, M.decor, 3.5 * s, 3.5 * s, 3.5 * s, 6 * s, h * 0.56, 0));
          break;
        }
      // falls through
      case 'palm': {
        const h = 72 * s;
        for (let i = 0; i < 6; i++) { const seg = mesh(G.cyl, M.trunk, (3.4 - i * 0.25) * s, h / 6 + 1, (3.4 - i * 0.25) * s, Math.sin(i / 6 * 1.2) * 10 * s, h / 12 + i * h / 6, 0); seg.rotation.z = -0.12 * i / 6; g.add(seg); }
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2, l = mesh(G.sph, M.decor, 22 * s, 2.6 * s, 6 * s, 10 * s + Math.cos(a) * 16 * s, h - 4 * s, Math.sin(a) * 16 * s);
          l.rotation.y = -a; l.rotation.z = -0.45; g.add(l);
        }
        g.add(mesh(G.sph, M.trunk, 4 * s, 4 * s, 4 * s, 10 * s, h - 2 * s, 0));
        break;
      }
      case 'city': {
        const h = (60 + r(3) * 120) * s, w = (32 + r(4) * 30) * s, dd = (32 + r(6) * 22) * s;
        g.add(mesh(G.box, M.decor, w, h, dd, 0, h / 2 - 4, 0));
        for (let fl = 0; fl < Math.floor(h / (20 * s)) - 1; fl++) for (let c = 0; c < 3; c++) if (r(10 + fl * 3 + c) < 0.55) g.add(mesh(G.box, M.window, 5 * s, 6 * s, 1, -w / 2 + 8 * s + c * (w - 16 * s) / 2, h - 14 * s - fl * 20 * s, dd / 2 + 0.6, false));
        if (r(5) < 0.4) {
          g.add(mesh(G.sph, M.decor, w * 0.36, w * 0.36, w * 0.36, 0, h - 4, 0));
          g.add(mesh(G.cyl, M.decor, 3.2 * s, 52 * s, 3.2 * s, w * 0.42, h + 22 * s, 0));
          g.add(mesh(G.cyl, M.decor, 5 * s, 3 * s, 5 * s, w * 0.42, h + 36 * s, 0));
          g.add(mesh(G.cone, M.window, 4 * s, 9 * s, 4 * s, w * 0.42, h + 52 * s, 0, false));
        }
        break;
      }
      case 'lamp': { // فانوس شارع
        g.add(mesh(G.cyl, M.pole, 1.6, 48, 1.6, 0, 24, 0));
        g.add(mesh(G.box, M.pole, 12, 1.6, 1.6, 5, 47, 0));
        g.add(mesh(G.box, M.window, 5, 7, 5, 10, 42, 0, false));
        const gl = new T.Sprite(S.glow('#ffcf6a')); gl.scale.set(60, 60, 1); gl.position.set(10, 42, 0); g.add(gl);
        break;
      }
      case 'autumn': {
        const h = (50 + r(2) * 25) * s;
        g.add(mesh(G.cyl, M.trunk, 3.5 * s, h * 0.6, 3.5 * s, 0, h * 0.3, 0));
        for (let i = 0; i < 6; i++) g.add(mesh(G.ico, M.leaf[(seed + i) % 4], (11 + r(i + 4) * 7) * s, (10 + r(i + 4) * 6) * s, (11 + r(i + 7) * 7) * s, (r(i) - 0.5) * 28 * s, h * 0.6 + r(i + 9) * 24 * s, (r(i + 3) - 0.5) * 22 * s));
        break;
      }
      case 'lavender':
        if (r(1) < 0.45) {
          g.add(mesh(G.cyl, M.trunk, 3 * s, 36 * s, 3 * s, 0, 18 * s, 0));
          for (let i = 0; i < 7; i++) g.add(mesh(G.ico, M.pink[i % 3], (9 + r(i + 2) * 6) * s, (8 + r(i + 2) * 5) * s, (9 + r(i + 2) * 6) * s, (r(i) - 0.5) * 34 * s, 40 * s + r(i + 5) * 18 * s, (r(i + 8) - 0.5) * 22 * s));
        } else for (let i = 0; i < 11; i++) {
          const xx = (r(i) - 0.5) * 34 * s, zz = (r(i + 20) - 0.5) * 34 * s, hh = (16 + r(i + 3) * 14) * s;
          g.add(mesh(G.cyl, M.stem, 0.8 * s, hh, 0.8 * s, xx, hh / 2, zz, false));
          g.add(mesh(G.cone, M.lav, 2.8 * s, 11 * s, 2.8 * s, xx, hh + 4 * s, zz));
        }
        break;
      case 'ice':
        for (let i = 0; i < 3; i++) { const h = (30 + r(i) * 55) * s; const c = mesh(G.cone, M.ice, (8 + r(i + 3) * 6) * s, h, (8 + r(i + 5) * 6) * s, (i - 1) * 12 * s, h / 2, (r(i + 7) - 0.5) * 14 * s); c.rotation.z = (r(i + 9) - 0.5) * 0.3; g.add(c); }
        break;
      case 'cloud':
        for (let i = 0; i < 6; i++) g.add(mesh(G.sph, M.white, (14 + r(i) * 9) * s, (10 + r(i + 2) * 7) * s, (14 + r(i + 4) * 7) * s, (i - 2.5) * 12 * s, 6 * s + (i % 2) * 6 * s, (r(i + 6) - 0.5) * 18 * s));
        break;
    }
    return g;
  }

  function sync(pool, list, make, update, x0, x1) {
    for (const [, v] of pool) v.__seen = false;
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
    if (lastRunId !== run) {
      lastRunId = run; camInit = false; trail.length = 0;
      for (const [, m] of markers) scene.remove(m); markers.clear();
      for (const k in pools) { for (const [, v] of pools[k]) scene.remove(v); pools[k].clear(); }
    }
    const pal = Wd.palette(P.x), bi = Wd.biomeAt(P.x), bid = BIOMES[pal.main].id;
    const mode = (Wd.save.settings && Wd.save.settings.cam3d) || 'behind';

    // ألوان
    if (lastPal !== pal.sky0 + pal.ground + pal.decorCol + pal.sun) {
      lastPal = pal.sky0 + pal.ground + pal.decorCol + pal.sun;
      skyMat.uniforms.top.value.set(pal.sky0); skyMat.uniforms.bot.value.set(pal.sky1); skyMat.uniforms.sunCol.value.set(pal.sun);
      scene.fog.color.set(pal.sky1).lerp(tmpC.set(pal.sky0), 0.15);
      hemi.groundColor.set(pal.shade); hemi.color.set(0xffffff).lerp(tmpC.set(pal.sky0), 0.25);
      dir.color.set(0xffffff).lerp(tmpC.set(pal.sun), 0.5);
      M.decor.color.set(pal.decorCol); M.rock.color.set(pal.rock);
      M.trail.color.set(pal.shade).multiplyScalar(0.85);
      sunSprite.material.color.set(pal.sun); sunHalo.material.color.set(pal.sun);
    }
    const night = pal.night;
    hemi.intensity = 0.7 - night * 0.22; dir.intensity = 0.6 - night * 0.28;
    stars.material.opacity = Math.max(0, night - 0.1);
    M.window.color.set(night > 0.5 ? 0xffd88a : 0xc9d6e8);
    nightLight.intensity = night > 0.5 ? 0.9 : 0;
    if (renderer.shadowMap.enabled !== (quality !== 0)) { renderer.shadowMap.enabled = quality !== 0; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }

    // ---------- الكاميرا ----------
    const port = Wd.Hc > Wd.Wc, zf = cam.z || 1;
    const gy = Wd.isGap(P.x) ? P.y : hAt(P.x), midY = (P.y + gy) / 2;
    const inAir = !P.grounded && !P.grind;
    orbit += ((inAir && P.air > 0.5 ? 1 : 0) - orbit) * Math.min(1, dt * 1.5);
    const slowZoom = Wd.slow < 0.9 ? 0.82 : 1;
    if (mode === 'behind') {
      const d = (port ? 1.3 : 1) * zf * slowZoom;
      const ax = P.x + 320, aheadY = Wd.isGap(ax) ? P.y + 110 : hAt(ax);
      lookT.set(ax, -(midY * 0.45 + aheadY * 0.55) + 14, -14);
      tmpV.set(P.x - 132 * d, -midY + (64 + orbit * 26) * d, -18 + orbit * 50 * d);
    } else if (mode === 'chase') {
      const d = (port ? 1.5 : 1) * zf * slowZoom;
      lookT.set(P.x + 230 + P.speed * 0.15, -midY - 40, -10);
      tmpV.set(P.x - 210 * d, -midY + (110 + orbit * 40) * d, (150 + orbit * 70) * d);
    } else {
      const d = (port ? 1.75 : 1) * zf * slowZoom;
      lookT.set(P.x + 110 + P.speed * 0.1, -midY - 30, -10);
      tmpV.set(P.x - (150 - orbit * 40) * d, -midY + (95 + orbit * 30) * d + (port ? 60 : 0), (270 + orbit * 60) * d);
    }
    if (!camInit) { camPos.copy(tmpV); camLook.copy(lookT); camInit = true; }
    const k = Math.min(1, dt * (mode === 'side' ? 4.5 : 5.5));
    camPos.lerp(tmpV, k); camLook.lerp(lookT, k);
    camera.position.copy(camPos);
    if (Wd.shake) camera.position.add(shk.set((Math.random() - 0.5) * Wd.shake * 1.6, (Math.random() - 0.5) * Wd.shake * 1.6, 0));
    camera.lookAt(camLook);
    const fovT = (mode === 'behind' ? 58 : 50) + Math.max(0, (P.speed - 380) / 260) * 7 + (P.boostT > 0 ? 6 : 0) - (Wd.slow < 0.9 ? 4 : 0);
    fov += (fovT - fov) * Math.min(1, dt * 3);
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }

    // سما وشمس
    skyMesh.position.copy(camera.position); stars.position.copy(camera.position);
    const sd = skyMat.uniforms.sunDir.value.set(0.45, 0.06 + (1 - pal.sunY) * 0.5, -1).normalize();
    sunSprite.position.copy(camera.position).addScaledVector(sd, 6000);
    sunHalo.position.copy(sunSprite.position);
    dir.position.set(P.x - 260, -P.y + 620, 380); dir.target.position.set(P.x + 60, -P.y, 0);
    nightLight.position.set(P.x + 20, -P.y + 90, 70);

    // ---------- الأرض ----------
    const i0 = Math.max(0, Math.floor((camLook.x - 1000 - baseX) / DX)), i1 = Math.min(pts.length - 1, i0 + MAXC - 1);
    const n = i1 - i0 + 1;
    const cG = new T.Color(pal.ground), cE = new T.Color(pal.edge), cS = new T.Color(pal.shade), cB = new T.Color(pal.shade).lerp(tmpC.set(0x8b5cf6), 0.3).multiplyScalar(0.95);
    const idx = terrGeo.index.array; let ii = 0;
    for (let c = 0; c < n; c++) {
      const p = pts[i0 + c], x = baseX + (i0 + c) * DX;
      for (let r = 0; r < ROWS; r++) {
        const zz = COLS[r], az = Math.abs(zz), o = (c * ROWS + r) * 3;
        const yy = -p.y + side(x, zz);
        terrPos[o] = x; terrPos[o + 1] = p.gap && az <= 300 ? yy - 1400 : yy; terrPos[o + 2] = zz;
        const t = az <= TRACK ? 0 : Math.min(1, (az - TRACK) / 700);
        if (az <= 46) tmpC2.copy(cE).lerp(cG, 0.15); else if (az <= 64) tmpC2.copy(cB); else tmpC2.copy(cG).lerp(cS, t * 0.75);
        const v = 0.93 + sn(x / 120 + zz / 60) * 0.1;
        terrCol[o] = tmpC2.r * v; terrCol[o + 1] = tmpC2.g * v; terrCol[o + 2] = tmpC2.b * v;
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

    // أثر الزحليقة
    if (P.grounded && !P.dead && (!trail.length || P.x - trail[trail.length - 1].x > 7)) {
      if (trail.length && P.x - trail[trail.length - 1].x > 60) trail.push(Object.assign({}, trail[trail.length - 1], { cut: true }));
      trail.push({ x: P.x, y: P.y });
    } else if (!P.grounded && trail.length && !trail[trail.length - 1].cut) trail.push(Object.assign({}, trail[trail.length - 1], { cut: true }));
    while (trail.length > 160) trail.shift();
    {
      const tp = trailGeo.attributes.position.array, L = trail.length;
      for (let i = 0; i < 160; i++) {
        const q = trail[Math.min(i, L - 1)] || { x: P.x, y: P.y }, w = q.cut || i >= L ? 0 : 4.5 * Math.min(1, i / 20);
        tp[i * 6] = q.x; tp[i * 6 + 1] = -q.y + 0.9; tp[i * 6 + 2] = 6 - w;
        tp[i * 6 + 3] = q.x; tp[i * 6 + 4] = -q.y + 0.9; tp[i * 6 + 5] = 6 + w;
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailMesh.visible = L > 2;
    }

    // لمعة التلج/الرمل
    const sparkleOn = ['snow', 'aurora', 'sky', 'desert', 'beach'].includes(bid);
    glitter.visible = sparkleOn;
    if (sparkleOn) {
      const gp = glitterGeo.attributes.position.array, gc = glitterGeo.attributes.color.array;
      const gold = bid === 'desert' || bid === 'beach';
      const xs = Math.floor((camLook.x - 400) / 24);
      for (let i = 0; i < 420; i++) {
        const cell = xs + Math.floor(i / 3), hx = cell * 24 + hash(cell * 3 + i % 3) * 24;
        const zz = (hash(cell * 7 + i % 3) - 0.5) * 520;
        gp[i * 3] = hx; gp[i * 3 + 1] = Wd.isGap(hx) ? -1e7 : -hAt(hx) + side(hx, zz) + 1.2; gp[i * 3 + 2] = zz;
        const tw = Math.max(0, Math.sin(time * (2 + hash(i) * 3) + i * 1.7)), b = tw * tw * tw;
        gc[i * 3] = b; gc[i * 3 + 1] = b * (gold ? 0.85 : 1); gc[i * 3 + 2] = b * (gold ? 0.55 : 1);
      }
      glitterGeo.attributes.position.needsUpdate = true; glitterGeo.attributes.color.needsUpdate = true;
    }

    // جبال بعيدة بقمم
    const snowy = bid === 'snow' || bid === 'aurora';
    farLayers.forEach(m => {
      const { n: N, z: zz, k: kk } = m.userData, pos = m.geometry.attributes.position.array, col = m.geometry.attributes.color.array;
      const span = 16000, x0 = camera.position.x - span * 0.4, base = camLook.y - 420 - kk * 160;
      const cBase = new T.Color(kk === 0 ? pal.mid : pal.far).lerp(tmpC2.set(pal.sky1), kk * 0.22);
      const cTop = cBase.clone().lerp(tmpC2.set(snowy ? 0xffffff : pal.sky1), snowy ? 0.85 : 0.35);
      for (let i = 0; i < N; i++) {
        const x = x0 + i / (N - 1) * span, fx = x * 0.00045 * (1.6 - kk * 0.3) + kk * 10;
        const nz = (Math.sin(fx * 3.1) + Math.sin(fx * 7.3 + 1) * 0.5 + Math.sin(fx * 13.7 + 2) * 0.25) / 1.75;
        let h;
        if (bid === 'city' && kk === 0) h = 160 + hash(Math.floor(x / 180)) * 340;
        else if (snowy) h = 260 + Math.pow(Math.abs(nz), 1.3) * (650 + kk * 380);
        else if (bid === 'beach' && kk < 2) h = 30 + kk * 10;
        else if (bid === 'sky') h = 120 + (nz + 1) * 110;
        else h = 160 + (nz + 1) * (190 + kk * 140);
        const o = i * 9;
        pos[o] = x; pos[o + 1] = base - 3000; pos[o + 2] = zz;
        pos[o + 3] = x; pos[o + 4] = base + h * 0.72; pos[o + 5] = zz;
        pos[o + 6] = x; pos[o + 7] = base + h; pos[o + 8] = zz;
        col[o] = cBase.r; col[o + 1] = cBase.g; col[o + 2] = cBase.b;
        const tt = snowy ? 0.15 : 0.5;
        col[o + 3] = cBase.r + (cTop.r - cBase.r) * tt; col[o + 4] = cBase.g + (cTop.g - cBase.g) * tt; col[o + 5] = cBase.b + (cTop.b - cBase.b) * tt;
        col[o + 6] = cTop.r; col[o + 7] = cTop.g; col[o + 8] = cTop.b;
      }
      m.geometry.attributes.position.needsUpdate = true; m.geometry.attributes.color.needsUpdate = true;
    });
    // سحاب
    clouds.forEach(c => {
      const u = c.userData, wx = ((u.ox + time * u.sp) % 9000 + 9000) % 9000;
      c.position.set(camera.position.x - 3000 + wx, camLook.y + u.oy, u.z);
      c.scale.set(u.sc, u.sc * 0.42, 1);
      c.material.color.set(pal.sky1).lerp(tmpC.set(0xffffff), night > 0.5 ? 0.15 : 0.75);
      c.material.opacity = bid === 'sky' ? 0.95 : night > 0.5 ? 0.35 : 0.75;
    });
    // بحر
    sea.visible = bid === 'beach';
    if (sea.visible) { sea.position.set(camLook.x + 2000, camLook.y - 330 + Math.sin(time) * 2, 3600); M.sea.color.set(0x4b7fc4).lerp(tmpC.set(pal.sky1), 0.25); }
    // شفق
    const auro = (bi.i === 6 ? 1 - bi.t : 0) + (bi.j === 6 ? bi.t : 0);
    aurora.forEach((m, k2) => {
      m.material.opacity = 0.3 * auro; m.visible = auro > 0.01;
      if (!m.visible) return;
      m.position.set(camera.position.x + 800, camLook.y + 1700 + k2 * 220, -4000 + k2 * 250);
      const p = m.geometry.attributes.position.array, b = m.userData.base;
      for (let i = 0; i < p.length; i += 3) p[i + 1] = b[i + 1] + Math.sin(b[i] * 0.002 + time * 0.6 + k2) * 140 + Math.sin(b[i] * 0.005 - time * 0.4) * 60;
      m.geometry.attributes.position.needsUpdate = true;
    });

    // ---------- الحاجات ----------
    const x0 = camLook.x - 1200, x1 = camLook.x + 2800;
    sync(pools.decor, Wd.decor, d => {
      const bb = Wd.biomeAt(d.x), type = BIOMES[bb.t < 0.5 ? bb.i : bb.j].decor;
      const g = new T.Group(), s = d.s * 1.2;
      const add = (tp, sc, dx, z, sd) => { const m = buildDecor(tp, sc, sd); m.position.set(dx, 0, z); g.add(m); };
      add(type, s, 0, -(90 + hash(d.seed) * 380), d.seed);
      if (hash(d.seed + 9) < 0.75) add(type, s * 1.25, 60, -(380 + hash(d.seed + 2) * 500), d.seed + 3);
      if (!d.back) { if (type === 'city') add('lamp', 1, 0, 95, d.seed + 1); else add(type, s * 0.9, 0, 150 + hash(d.seed + 5) * 260, d.seed + 1); }
      g.position.x = d.x;
      return g;
    }, (d, g) => { g.children.forEach(ch => { const xx = d.x + ch.position.x; ch.position.y = -hAt(xx) + side(xx, ch.position.z) + 2; }); }, x0, x1);
    sync(pools.rock, Wd.rocks, r => {
      const g = new T.Group();
      const m = new T.Mesh(G.dode, M.rock); m.scale.set(r.w * 0.6, r.h * 0.9, r.w * 0.7); m.rotation.set(r.x, r.x * 2, 0); m.castShadow = true; g.add(m);
      if (['snow', 'aurora'].includes(BIOMES[Wd.biomeAt(r.x).i].id)) { const cap = new T.Mesh(G.dode, M.snowcap); cap.scale.set(r.w * 0.45, r.h * 0.3, r.w * 0.5); cap.position.y = r.h * 0.65; g.add(cap); }
      return g;
    }, (r, m) => { m.visible = !r.broken; m.position.set(r.x, -hAt(r.x) + r.h * 0.3, 0); }, x0, x1);
    sync(pools.flower, Wd.flowers, () => { const s = new T.Sprite(S.flower()); s.scale.set(46, 46, 1); return s; },
      (f, s) => { s.position.set(f.x, -hAt(f.x) + 21, 0); s.material.opacity = f.used ? 0.5 : 1; }, x0, x1);
    sync(pools.item, Wd.items, it => {
      const g = new T.Group();
      if (it.type === 'coin' || it.type === 'heart') {
        const m = new T.Mesh(it.type === 'coin' ? G.star : G.heart, it.type === 'coin' ? M.star : M.heart);
        m.scale.setScalar(it.type === 'coin' ? 0.85 : 1.05); g.add(m);
        const gl = new T.Sprite(S.glow(it.type === 'coin' ? '#ffcf5a' : '#b98cff')); gl.scale.set(36, 36, 1); gl.material.opacity = 0.55; g.add(gl);
      } else {
        const s = new T.Sprite(S[it.type]()); const sc = { page: 34, feather: 36, magnet: 34, vstar: 38 }[it.type] || 30; s.scale.set(sc, sc, 1); g.add(s);
        const gl = new T.Sprite(S.glow('#c9a6ff')); gl.scale.set(60, 60, 1); gl.material.opacity = 0.5; g.add(gl);
      }
      return g;
    }, (it, g) => {
      g.visible = !it.got;
      g.position.set(it.x, -it.y + Math.sin(time * 3 + it.x * 0.05) * 3, 0);
      if (g.children[0].isMesh) g.children[0].rotation.y = time * 2.6 + it.x * 0.01;
    }, x0, x1);
    { const step = 170, a = Math.floor(x0 / step), b = Math.floor(x1 / step);
      for (const [kk, m] of markers) if (kk < a || kk > b) { scene.remove(m); markers.delete(kk); }
      for (let kk = a; kk <= b; kk++) {
        const x = kk * step; let m = markers.get(kk);
        if (!m) {
          m = new T.Group();
          [-72, 72].forEach((zz, j) => {
            m.add(mesh(G.cyl, M.white, 1.5, 16, 1.5, 0, 8, zz));
            m.add(mesh(G.cyl, M.mark, 1.6, 12, 1.6, 0, 22, zz));
            m.add(mesh(G.box, (kk + j) % 2 ? M.mark : M.mark2, 8, 6, 1, 4, 26, zz, false));
          });
          scene.add(m); markers.set(kk, m);
        }
        m.visible = !Wd.isGap(x) && !Wd.isGap(x + 10);
        m.position.set(x, -hAt(x), 0);
      }
    }
    sync(pools.rope, Wd.ropes, r => {
      const g = new T.Group(), city = BIOMES[Wd.biomeAt(r.x1).i].id === 'city';
      [[r.x1, r.y1], [r.x2, r.y2]].forEach(([x, y]) => { const h = hAt(x) - y + 10; g.add(mesh(G.cyl, M.pole, 2.2, h, 2.2, x, -y - h / 2 + 6, 0)); });
      const pts3 = []; for (let x = r.x1; x <= r.x2; x += 10) pts3.push(new T.Vector3(x, -Wd.ropeY(r, x), 0));
      g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts3), M.rope));
      const cols = city ? ['#ffcf5a', '#ff8a5a', '#7fd0ff', '#c9a6ff'] : ['#c9a6ff', '#ff9cc9', '#ffd45e', '#8fe3c0'];
      for (let x = r.x1 + 16, i = 0; x < r.x2 - 8; x += 26, i++) {
        const y = -Wd.ropeY(r, x) - 8, col = cols[i % 4];
        g.add(mesh(G.box, new T.MeshBasicMaterial({ color: col }), 5, 7, 5, x, y, 0, false));
        const gl = new T.Sprite(S.glow(col)); gl.scale.set(city ? 42 : 26, city ? 42 : 26, 1); gl.position.set(x, y, 0); g.add(gl);
      }
      return g;
    }, null, x0 - 400, x1);

    // ---------- الشخصيات ----------
    for (const kk in chars) chars[kk].used = false;
    const hw = Wd.helperWho(), main = run.main;
    const hz = P.power > 0 ? -18 : -34;
    R.helperZ = hz;
    const hv = helper.vis == null ? 1 : helper.vis;
    const blink = P.invuln > 0 && Math.sin(time * 30) > 0;
    const duo = P.duoT > 0 && inAir && hv > 0.5;
    placeChar(Wd.charOpts(main, { rot: P.rot, squash: P.land * 0.14, twirl: P.twirl, speed: P.speed }), P.x, P.y, 6, blink ? 0.45 : 1, time,
      { yaw: mode === 'behind' ? Math.PI / 2 : 0, air: inAir, flipping: Math.abs(P.rotV) > 1, glide: P.gliding > 0 && main === 'w', crashed: P.dead, lookAt: duo || P.power > 0 ? -0.45 : 0 });
    let hx = helper.x, hy = helper.y, hzz = hz;
    if (mode === 'behind' && Wd.state !== 'rescue' && !(helper.arrive > 0) && !Wd.isGap(P.x - 16) && !Wd.isGap(helper.x)) {
      hx = P.x - 16; hy = helper.y + (hAt(hx) - hAt(helper.x)); hzz = P.power > 0 ? -30 : -44;
    }
    R.helperZ = hzz; R.helperDX = hx - helper.x;
    placeChar(Wd.charOpts(hw, { rot: helper.rot, twirl: helper.tw, speed: P.speed }), hx, hy, hzz, hv, time + 1.3,
      { yaw: mode === 'behind' ? Math.PI / 2 : 0, air: !helper.g, glide: helper.glide && hw === 'w', lookAt: duo || P.power > 0 ? 0.45 : 0 });
    for (const kk in chars) if (!chars[kk].used && chars[kk].in) { scene.remove(chars[kk].grp); chars[kk].in = false; }
    const blobs = quality === 0;
    [[blobP, P, 6, 1], [blobH, { x: hx, y: hy }, hzz, hv]].forEach(([m, ch, zz, vis]) => {
      const gx = ch.x, g2 = Wd.isGap(gx) ? null : hAt(gx);
      m.visible = blobs && g2 != null && vis > 0.3 && !P.dead;
      if (!m.visible) return;
      const hgt = Math.max(0, g2 - ch.y), s = Math.max(4, 16 - hgt * 0.04);
      m.position.set(gx, -g2 + 1.5, zz); m.scale.set(s * 1.4, 1, s * 0.8); m.rotation.z = -Wd.angAt(gx);
    });
    shield.visible = P.power > 0 && hv > 0.3;
    if (shield.visible) {
      shield.position.set((P.x + hx) / 2, -(P.y + hy) / 2 + 26, (6 + hzz) / 2);
      shield.scale.set(66, 52, 52); M.shield.opacity = 0.13 + Math.sin(time * 6) * 0.04;
    }
    duoHeart.visible = duo;
    if (duo) { duoHeart.position.set((P.x + hx) / 2, -(P.y + hy) / 2 + 52 + Math.sin(time * 8) * 2, (6 + hzz) / 2); duoHeart.rotation.y = time * 3; }

    // ---------- جزيئات ----------
    const fill = (geo, add) => {
      const pp = geo.attributes.position.array, pc = geo.attributes.color.array; let L = 0;
      for (let i = 0; i < Wd.parts.length && L < 500; i++) {
        const p = Wd.parts[i], glowy = p.type === 'star' || p.type === 'heart';
        if (glowy !== add) continue;
        const a = Math.max(0, p.life / p.max);
        pp[L * 3] = p.x; pp[L * 3 + 1] = a < 0.12 ? -1e7 : -p.y; pp[L * 3 + 2] = ((i % 9) - 4) * 3 + 4;
        tmpC.set(p.col); const m = add ? a : 1;
        pc[L * 3] = tmpC.r * m; pc[L * 3 + 1] = tmpC.g * m; pc[L * 3 + 2] = tmpC.b * m; L++;
      }
      geo.setDrawRange(0, L); geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    };
    fill(partGeo, false); fill(partAddGeo, true);

    renderer.render(scene, camera);
  }

  function project(x, y, z = 0) {
    tmpV.set(x, -y, z).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    return { x: (tmpV.x + 1) / 2 * w, y: (1 - tmpV.y) / 2 * h };
  }
  function resize(w, h, dpr, q) {
    if (!renderer) return;
    quality = q;
    renderer.setPixelRatio(Math.min(dpr || 1, q === 0 ? 1 : 2));
    renderer.setSize(w, h, true);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  const R = { ok: false, init, render, project, resize, helperZ: -34, get canvas() { return canvas; } };
  return R;
})();
window.R3 = R3;
