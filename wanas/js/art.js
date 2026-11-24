/* سند و ونس — الرسم: الشخصيات من رسومات محمد نفسها + اللبس + الديكور */
'use strict';

const Art = (() => {
  const base = {};          // الصور الأصلية
  const cache = {};         // نسخ اللبس المتلوّنة
  const SPR = 1.12;         // وحدة عالم لكل بكسل

  const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return rgb([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); };
  const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

  function load(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  async function init() {
    const [w, s, wp, sp] = await Promise.all([load('img/wanas.png'), load('img/sanad.png'), load('img/wanas-portrait.png'), load('img/sanad-portrait.png')]);
    base.w = w; base.s = s; base.wp = wp; base.sp = sp;
    // نحفظ ألوان اللبس الأصلية عشان التلوين يحافظ على الضل والنور
  }

  /* يلوّن جزء من اللبس مع الحفاظ على الإضاءة */
  function tint(px, i, target, refL) {
    const L = lum(px[i], px[i + 1], px[i + 2]);
    const T = hex(target), k = Math.max(0.35, Math.min(1.6, L / refL));
    let r = T[0] * k, g = T[1] * k, b = T[2] * k;
    if (k > 1) { const e = (k - 1) * 0.5; r += (255 - r) * e; g += (255 - g) * e; b += (255 - b) * e; }
    px[i] = Math.min(255, r); px[i + 1] = Math.min(255, g); px[i + 2] = Math.min(255, b);
  }

  function outfit(who, item) {
    const key = who + (item ? item.id : '0');
    if (cache[key]) return cache[key];
    const img = base[who];
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    if (item && (item.hijab || item.jacket)) {
      const W = c.width, H = c.height, d = x.getImageData(0, 0, W, H), p = d.data;
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const i = (yy * W + xx) * 4; if (p[i + 3] < 10) continue;
        const r = p[i], g = p[i + 1], b = p[i + 2], L = lum(r, g, b), fy = yy / H, fx = xx / W;
        if (who === 'w') {
          const cream = r > 150 && b / r > 0.7 && g / r > 0.8;
          const skin = r > 170 && b / r < 0.72 && g / r < 0.85 && fy < 0.5;
          if (skin) continue;
          if (fy < 0.47 && cream) tint(p, i, item.hijab, 205);
          else if (fy >= 0.47 && fy < 0.8) {
            if (cream && fx > 0.6) tint(p, i, item.hijab, 205);
            else if (L < 95 && !(r > 150)) tint(p, i, item.top, 55);
            else if (L >= 95 && !(r > 200 && g < 170)) tint(p, i, item.pat, 170);
          } else if (fy >= 0.8 && fy < 0.95 && L > 110) tint(p, i, item.skirt, 205);
        } else {
          const skin = r > 140 && r - g > 35;
          if (skin) continue;
          if (fy > 0.5 && fy < 0.86 && L < 160 && L > 25) tint(p, i, item.jacket, 62);
        }
      }
      x.putImageData(d, 0, 0);
    }
    cache[key] = c;
    return c;
  }

  /* ---------- أشكال صغيرة ---------- */
  function heart(ctx, x, y, s, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 1.1, y - s * 0.45, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.45, x, y + s * 0.35);
    ctx.fill();
  }
  function star(ctx, x, y, r, col, pts = 5, inner = 0.45, rot = -Math.PI / 2) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = rot + i * Math.PI / pts, rr = i % 2 ? r * inner : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  function board(ctx, b, t) {
    ctx.fillStyle = b.tip;
    ctx.beginPath(); ctx.ellipse(-17, -1.2, 3.4, 2.6, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(17, -1.2, 3.4, 2.6, 0.5, 0, Math.PI * 2); ctx.fill();
    if (b.glow) { ctx.shadowColor = b.glow; ctx.shadowBlur = 8; }
    ctx.fillStyle = b.col; ctx.fillRect(-17, -2.5, 34, 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-17, 0.5, 34, 1);
    if (b.stars) { ctx.fillStyle = '#fff'; [-11, -3, 6, 13].forEach((k, i) => ctx.fillRect(k, -1.8 + (i % 2), 1.2, 1.2)); }
    if (b.hearts) { heart(ctx, -7, -0.6, 1.6, '#fff'); heart(ctx, 7, -0.6, 1.6, '#fff'); }
    // الرباط
    ctx.fillStyle = '#2a2230'; ctx.fillRect(-7, -3.6, 4, 1.4); ctx.fillRect(3, -3.6, 4, 1.4);
  }

  /*
   * يرسم شخصية على زحليقتها. (x,y) = نقطة لمس الزحليقة للأرض.
   * o: { who, item, board, rot, squash, twirl, t, speed, glide, crashed, alpha, hand }
   */
  function rider(ctx, x, y, o) {
    const img = outfit(o.who, o.item);
    const W = img.width * SPR, H = img.height * SPR;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(o.rot || 0);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const sq = o.squash || 0;
    // ضل خفيف
    ctx.save();
    const tw = o.twirl ? Math.cos(o.twirl * Math.PI * 4) : 1;
    // طرحة بترفرف (ونس) أو جناحات الطيران
    if (o.who === 'w') scarf(ctx, o, H, W);
    ctx.scale(tw * (1 + sq * 0.6), 1 - sq);
    const bob = o.crashed ? 0 : Math.sin(o.t * 9) * 0.5 * Math.min(1, (o.speed || 0) / 400);
    ctx.drawImage(img, -W / 2, -H - 3 + bob, W, H);
    ctx.restore();
    if (!o.noBoard) board(ctx, o.board, o.t);
    ctx.restore();
  }

  function scarf(ctx, o, H, W) {
    const col = (o.item && o.item.hijab) || '#e9dcc8';
    const sh = (o.item && o.item.hijab) ? mix(o.item.hijab, '#000000', 0.18) : '#cdb99f';
    const sp = Math.min(1, (o.speed || 300) / 520);
    if (o.glide) {
      // الطرحة بتتفرد زي جناحين
      const f = Math.sin(o.t * 7) * 3;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-3, -H * 0.62);
      ctx.quadraticCurveTo(-30, -H * 0.95 + f, -46, -H * 0.55 + f);
      ctx.quadraticCurveTo(-26, -H * 0.6, -3, -H * 0.45);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(3, -H * 0.62);
      ctx.quadraticCurveTo(28, -H * 1.0 - f, 44, -H * 0.62 - f);
      ctx.quadraticCurveTo(24, -H * 0.62, 3, -H * 0.45);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = sh; ctx.lineWidth = 1; ctx.stroke();
      return;
    }
    const len = 8 + sp * 14;
    ctx.fillStyle = sh;
    for (let i = 0; i < 6; i++) {
      const k = i / 5, wv = Math.sin(o.t * 14 - i * 0.9) * (1.5 + k * 3) * sp;
      const px = -W * 0.28 - k * len, py = -H * 0.62 + k * 5 + wv;
      ctx.fillStyle = i % 2 ? col : sh;
      ctx.fillRect(px - 2.4, py - 2.4, 4.8 - k * 1.5, 4.8 - k * 1.5);
    }
  }

  /* ---------- ديكور البيئات ---------- */
  function decor(ctx, type, x, y, s, col, seed, t) {
    const r = (k) => { const v = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
    ctx.fillStyle = col;
    switch (type) {
      case 'pine': {
        const h = 60 * s, w = 24 * s;
        ctx.fillRect(x - 2 * s, y - 10 * s, 4 * s, 12 * s);
        for (let i = 0; i < 3; i++) {
          const yy = y - 8 * s - i * h * 0.28;
          ctx.beginPath(); ctx.moveTo(x - w * (1 - i * 0.22), yy); ctx.lineTo(x + w * (1 - i * 0.22), yy); ctx.lineTo(x, yy - h * 0.42); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.moveTo(x - 6 * s, y - h * 0.78); ctx.lineTo(x + 6 * s, y - h * 0.78); ctx.lineTo(x, y - h * 0.98); ctx.fill();
        break;
      }
      case 'cactus': {
        if (r(1) < 0.5) {
          const h = (40 + r(2) * 30) * s;
          ctx.fillRect(x - 4 * s, y - h, 8 * s, h);
          ctx.fillRect(x - 13 * s, y - h * 0.62, 5 * s, h * 0.3); ctx.fillRect(x - 13 * s, y - h * 0.62, 10 * s, 5 * s);
          ctx.fillRect(x + 8 * s, y - h * 0.8, 5 * s, h * 0.35); ctx.fillRect(x + 3 * s, y - h * 0.5, 10 * s, 5 * s);
        } else palm(ctx, x, y, s * 0.9, col, t, seed);
        break;
      }
      case 'palm': palm(ctx, x, y, s, col, t, seed); break;
      case 'city': {
        const h = (50 + r(3) * 70) * s, w = (26 + r(4) * 24) * s;
        ctx.fillRect(x - w / 2, y - h, w, h + 4);
        if (r(5) < 0.35) { // قبّة ومئذنة
          ctx.beginPath(); ctx.arc(x, y - h, w * 0.4, Math.PI, 0); ctx.fill();
          ctx.fillRect(x + w * 0.35, y - h - 40 * s, 5 * s, 40 * s);
          ctx.beginPath(); ctx.arc(x + w * 0.35 + 2.5 * s, y - h - 40 * s, 4 * s, Math.PI, 0); ctx.fill();
        }
        ctx.fillStyle = '#ffd88a';
        for (let i = 0; i < 6; i++) if (r(10 + i) < 0.55) ctx.fillRect(x - w / 2 + 4 * s + (i % 2) * w * 0.5, y - h + 8 * s + Math.floor(i / 2) * 14 * s, 5 * s, 6 * s);
        break;
      }
      case 'autumn': {
        const h = (50 + r(2) * 25) * s;
        ctx.fillRect(x - 3 * s, y - h * 0.5, 6 * s, h * 0.52);
        const cols = ['#e2702d', '#c94a26', '#e9a23b', '#b8572b'];
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = cols[(seed + i) % 4];
          ctx.beginPath(); ctx.arc(x + (r(i) - 0.5) * 26 * s, y - h * 0.55 - r(i + 9) * 26 * s, (11 + r(i + 4) * 7) * s, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'lavender': {
        if (r(1) < 0.45) { // شجرة ورد
          ctx.fillRect(x - 3 * s, y - 34 * s, 6 * s, 36 * s);
          const cols = ['#f4b6e0', '#e59ad0', '#ffd0ee'];
          for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.arc(x + (r(i) - 0.5) * 34 * s, y - 40 * s - r(i + 5) * 20 * s, (9 + r(i + 2) * 6) * s, 0, Math.PI * 2); ctx.fill(); }
        } else {
          for (let i = 0; i < 7; i++) {
            const xx = x + (i - 3) * 4 * s, hh = (16 + r(i) * 14) * s;
            ctx.fillStyle = '#5f8a4f'; ctx.fillRect(xx, y - hh, 1.5 * s, hh);
            ctx.fillStyle = i % 2 ? '#9b6fe0' : '#b892f0'; ctx.fillRect(xx - 1.5 * s, y - hh - 8 * s, 4.5 * s, 9 * s);
          }
        }
        break;
      }
      case 'ice': {
        const h = (30 + r(2) * 40) * s;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(x - 10 * s, y + 2); ctx.lineTo(x - 2 * s, y - h); ctx.lineTo(x + 8 * s, y + 2); ctx.fill();
        ctx.fillStyle = '#e9f5ff'; ctx.beginPath(); ctx.moveTo(x - 2 * s, y - h); ctx.lineTo(x + 8 * s, y + 2); ctx.lineTo(x + 1 * s, y + 2); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case 'cloud': {
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + (i - 1.5) * 13 * s, y - 8 * s - (i % 2) * 7 * s, (12 + r(i) * 6) * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
        break;
      }
    }
  }
  function palm(ctx, x, y, s, col, t, seed) {
    const h = 70 * s;
    ctx.strokeStyle = '#7b5a3c'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10 * s, y - h * 0.5, x + 4 * s, y - h); ctx.stroke();
    ctx.fillStyle = col;
    const sw = Math.sin(t * 1.5 + seed) * 0.1;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55 + sw;
      ctx.save(); ctx.translate(x + 4 * s, y - h); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(16 * s, 0, 18 * s, 4 * s, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function rock(ctx, x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + 4);
    ctx.lineTo(x - w * 0.42, y - h * 0.55);
    ctx.lineTo(x - w * 0.12, y - h);
    ctx.lineTo(x + w * 0.28, y - h * 0.85);
    ctx.lineTo(x + w / 2, y - h * 0.2);
    ctx.lineTo(x + w / 2, y + 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.moveTo(x - w * 0.12, y - h); ctx.lineTo(x + w * 0.28, y - h * 0.85); ctx.lineTo(x + w * 0.05, y - h * 0.5); ctx.fill();
  }
  function flower(ctx, x, y, t, used) {
    const k = used ? 0.6 : 1 + Math.sin(t * 5) * 0.05;
    ctx.fillStyle = '#4f8a46'; ctx.fillRect(x - 1.5, y - 14, 3, 14);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + t;
      ctx.fillStyle = i % 2 ? '#a77af0' : '#c9a6ff';
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 8 * k, y - 18 + Math.sin(a) * 5 * k, 6 * k, 4 * k, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.arc(x, y - 18, 3.5 * k, 0, Math.PI * 2); ctx.fill();
  }
  function coin(ctx, x, y, t) {
    const w = Math.abs(Math.cos(t * 3)) * 0.8 + 0.2;
    ctx.save(); ctx.translate(x, y); ctx.scale(w, 1);
    star(ctx, 0, 0, 8, '#ffd45e'); star(ctx, 0, 0, 4.5, '#fff1b8');
    ctx.restore();
  }
  function page(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.3);
    ctx.fillStyle = '#fffdf6'; ctx.fillRect(-8, -10, 16, 20);
    ctx.fillStyle = '#9ab0d8'; for (let i = 0; i < 5; i++) ctx.fillRect(-6, -7 + i * 3.6, 12, 1);
    ctx.fillStyle = '#e57373'; ctx.fillRect(-5, -10, 1, 20);
    ctx.restore();
  }
  function feather(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6 + Math.sin(t * 3) * 0.2);
    ctx.fillStyle = '#b48cff'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f3eaff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -12); ctx.stroke();
    ctx.restore();
  }
  function magnet(ctx, x, y) {
    ctx.strokeStyle = '#e04b5a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y - 2, 7, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#e04b5a'; ctx.fillRect(x - 9.5, y - 2, 5, 7); ctx.fillRect(x + 4.5, y - 2, 5, 7);
    ctx.fillStyle = '#eee'; ctx.fillRect(x - 9.5, y + 4, 5, 3); ctx.fillRect(x + 4.5, y + 4, 5, 3);
  }

  return { init, outfit, rider, decor, rock, flower, coin, page, feather, magnet, heart, star, mix, hex, mixRgb, rgb, base, SPR };
})();
