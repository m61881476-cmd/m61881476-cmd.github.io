/* سند و ونس — القوايم والقصة والمتجر والحفظ */
'use strict';

(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const KEY = 'wanas-save-v1';
  const DEF = () => ({
    v: 1, coins: 0, best: { free: 0, freeDist: 0, zenDist: 0 }, story: { unlocked: 0, done: [] },
    owned: ['w0', 's0', 'b0', 't0'], equip: { w: 'w0', s: 's0', board: 'b0', trail: 't0' }, up: {},
    settings: { music: true, sfx: true, vibe: true, autoRescue: true, quality: 1, view3d: false, solo: false, cam3d: 'side' }, stats: {}, ach: [], letterSeen: false,
  });
  let save;
  try { save = Object.assign(DEF(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { save = DEF(); }
  for (const k of ['best', 'story', 'equip', 'settings']) save[k] = Object.assign(DEF()[k], save[k] || {});
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };

  let current = null, lastCfg = null, menuBiome = 0;

  /* ---------- شاشات ---------- */
  const SCREENS = ['menu', 'story', 'setup', 'shop', 'ach', 'set', 'pause', 'results', 'dlg', 'letter'];
  function show(id) {
    SCREENS.forEach(s => $('#' + s).classList.toggle('hidden', s !== id));
    $('#hud').classList.toggle('hidden', id !== null && id !== 'pause' || !Game.run || Game.run.attract);
    if (id === null) $('#hud').classList.remove('hidden');
    current = id;
    $$('.cTotal').forEach(e => e.textContent = save.coins);
  }
  /* ---------- وضع 3D: بيتحمّل بس لما يتطلب ---------- */
  let r3Promise = null;
  function loadScript(src) { return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s); }); }
  function ensure3D() {
    if (window.R3 && R3.ok) return Promise.resolve(true);
    if (!r3Promise) r3Promise = loadScript('js/three.min.js?v=2').then(() => loadScript('js/render3d.js?v=3')).then(() => {
      try { R3.init($('#c3')); return R3.ok; } catch (e) { console.error(e); return false; }
    }).catch(e => { console.error(e); r3Promise = null; return false; });
    return r3Promise;
  }
  async function applyView() {
    let on = !!save.settings.view3d;
    if (on) {
      $('#bView').textContent = '⏳ 3D';
      on = await ensure3D();
      if (!on) { save.settings.view3d = false; persist(); toast('الموبايل ده مش بيدعم 3D 😢'); }
    }
    Game.setView3D(on);
    $('#bView').textContent = on ? '🖼️ 2D' : '🧊 3D';
    $$('#pickView button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === on));
    $$('#pickSolo button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === !!save.settings.solo));
    $('#pickCam').classList.toggle('hidden', !on);
    $$('#pickCam button').forEach(b => b.classList.toggle('on', b.dataset.v === (save.settings.cam3d || 'side')));
    return on;
  }
  $('#bView').addEventListener('click', async () => { click(); save.settings.view3d = !save.settings.view3d; persist(); await applyView(); toast(save.settings.view3d ? '🧊 وضع 3D اشتغل' : '🖼️ رجعنا 2D'); });
  $$('#pickView button').forEach(b => b.addEventListener('click', async () => { click(); save.settings.view3d = b.dataset.v === '1'; persist(); await applyView(); }));
  $$('#pickSolo button').forEach(b => b.addEventListener('click', () => { click(); save.settings.solo = b.dataset.v === '1'; persist(); applyView(); }));
  $$('#pickCam button').forEach(b => b.addEventListener('click', () => { click(); save.settings.cam3d = b.dataset.v; persist(); applyView(); }));

  function toMenu() {
    Game.attract(save, menuBiome);
    $('#note').textContent = '💌 ' + NOTES[Math.floor(Date.now() / 864e5) % NOTES.length];
    show('menu');
    $('#hud').classList.add('hidden');
  }
  function click() { Sound.init(); Sound.play('click'); }

  $$('[data-back]').forEach(b => b.addEventListener('click', () => { click(); toMenu(); }));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    click();
    const g = b.dataset.go;
    if (g === 'story') { renderChapters(); show('story'); }
    else if (g === 'free' || g === 'zen') { openSetup(g); }
    else if (g === 'shop') { renderShop(); show('shop'); }
    else if (g === 'ach') { renderAch(); show('ach'); }
    else if (g === 'set') { renderSet(); show('set'); }
  }));

  /* ---------- طور القصة ---------- */
  function renderChapters() {
    const el = $('#chs'); el.innerHTML = '';
    STORY.forEach((ch, i) => {
      const b = BIOMES[ch.biome], lock = i > save.story.unlocked, done = save.story.done.includes(i);
      const d = document.createElement('button');
      d.className = 'ch' + (lock ? ' lock' : '');
      d.style.background = `linear-gradient(160deg, ${b.sky[0]}, ${b.mid})`;
      d.innerHTML = `<span class="n">${i + 1}</span><b>${ch.title}</b><small>${b.name}</small><small>🎯 ${ch.goalText}</small><span class="st">${lock ? '🔒' : done ? '💜' : '▶'}</span>`;
      d.addEventListener('click', () => { click(); if (lock) return toast('🔒 خلّصي الفصل اللي قبله الأول'); playChapter(i); });
      el.appendChild(d);
    });
  }
  function playChapter(i) {
    const ch = STORY[i];
    Game.attract(save, ch.biome);
    dialog(ch.title, ch.pre, () => startRun({ mode: 'story', chapter: i, main: 'w' }));
  }

  /* ---------- حوار ---------- */
  let dq = null;
  function dialog(title, lines, done) {
    dq = { lines, i: -1, done, typing: null };
    $('#dT').textContent = title || '';
    show('dlg');
    nextLine();
  }
  function nextLine() {
    if (!dq) return;
    if (dq.typing) { clearInterval(dq.typing); dq.typing = null; $('#dX').textContent = dq.lines[dq.i][1]; return; }
    dq.i++;
    if (dq.i >= dq.lines.length) { const d = dq.done; dq = null; d && d(); return; }
    const [who, text] = dq.lines[dq.i];
    $('#dN').textContent = who === 's' ? 'سند' : 'ونس';
    $('#dN').className = 'name ' + who;
    $('#dlg .por.w').classList.toggle('dim', who !== 'w');
    $('#dlg .por.s').classList.toggle('dim', who !== 's');
    const el = $('#dX'); el.textContent = '';
    let k = 0; const chars = [...text];
    dq.typing = setInterval(() => {
      el.textContent += chars[k++] || '';
      if (k % 3 === 0) Sound.play('text');
      if (k >= chars.length) { clearInterval(dq.typing); dq.typing = null; }
    }, 28);
  }
  $('#dlg').addEventListener('click', e => { if (e.target.id === 'dSkip') return; nextLine(); });
  $('#dSkip').addEventListener('click', () => { click(); if (dq) { if (dq.typing) clearInterval(dq.typing); const d = dq.done; dq = null; d && d(); } });

  /* ---------- الجواب ---------- */
  function letter(done) {
    show('letter');
    $('#lTo').textContent = ''; $('#lBody').innerHTML = ''; $('#lSign').textContent = ''; $('#lDone').classList.add('hidden');
    const seq = [['#lTo', LETTER.to], ...LETTER.body.map(t => ['p', t]), ['#lSign', LETTER.sign]];
    let i = 0;
    const nextPart = () => {
      if (i >= seq.length) { $('#lDone').classList.remove('hidden'); return; }
      const [sel, t] = seq[i++];
      let el;
      if (sel === 'p') { el = document.createElement('p'); $('#lBody').appendChild(el); } else el = $(sel);
      const chars = [...t]; let k = 0;
      const iv = setInterval(() => {
        el.textContent += chars[k++] || '';
        const pp = $('#letter .paper'); pp.scrollTop = pp.scrollHeight;
        if (k % 4 === 0) Sound.play('text');
        if (k >= chars.length) { clearInterval(iv); setTimeout(nextPart, 380); }
      }, 45);
    };
    setTimeout(nextPart, 500);
    sparkle();
    $('#lDone').onclick = () => { click(); save.letterSeen = true; persist(); done && done(); };
  }
  function sparkle() {
    const L = $('#letter');
    L.querySelectorAll('.st').forEach(e => e.remove());
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('div'); s.className = 'st';
      s.textContent = ['✦', '💜', '✧', '🤍'][i % 4];
      s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;font-size:${10 + Math.random() * 16}px;opacity:${0.3 + Math.random() * 0.6};animation:fade ${1.5 + Math.random() * 2}s infinite ${Math.random()}s`;
      L.appendChild(s);
    }
  }

  /* ---------- إعداد التزلّج الحر ---------- */
  let setupMode = 'free', setupMain = 'w', setupBiome = 0;
  function openSetup(mode) {
    setupMode = mode;
    $('#setupT').textContent = mode === 'zen' ? '🌙 وضع الهدوء (من غير وقعات)' : '🏂 تزلّج حر';
    const el = $('#bios'); el.innerHTML = '';
    BIOMES.forEach((b, i) => {
      const x = document.createElement('button');
      x.textContent = b.name; x.style.background = `linear-gradient(160deg, ${b.sky[0]}, ${b.mid})`;
      x.className = i === setupBiome ? 'on' : '';
      x.onclick = () => { click(); setupBiome = i; $$('#bios button').forEach((e, j) => e.classList.toggle('on', j === i)); Game.attract(save, i); };
      el.appendChild(x);
    });
    show('setup');
  }
  $$('#pickMain button').forEach(b => b.addEventListener('click', () => { click(); setupMain = b.dataset.m; $$('#pickMain button').forEach(e => e.classList.toggle('on', e === b)); }));
  $('#bGo').addEventListener('click', () => { click(); startRun({ mode: setupMode, biome: setupBiome, main: setupMain }); });

  /* ---------- اللعب ---------- */
  let tipTimer = null;
  function startRun(cfg) {
    cfg.solo = !!save.settings.solo;
    lastCfg = cfg;
    Sound.init();
    tryFullscreen();
    Game.start(cfg, save);
    show(null);
    const helper = cfg.main === 'w' ? 's' : 'w';
    $('#sumImg').src = helper === 's' ? 'img/sanad.png' : 'img/wanas.png';
    $('#tip img').src = helper === 's' ? 'img/sanad.png' : 'img/wanas.png';
    $('#goal').innerHTML = '';
    $('#hint').classList.toggle('hidden', !(cfg.mode === 'story' && cfg.chapter === 0));
    setTimeout(() => $('#hint').classList.add('hidden'), 6000);
    clearTimeout(tipTimer);
    const tips = cfg.mode === 'story' ? STORY[cfg.chapter].teach.slice() : cfg.mode === 'zen' ? ['مفيش وقعات هنا… اتزحلقي براحتك 🌙'] : [];
    if (cfg.mode === 'free' && !save.stats.freeTipped) { tips.push('دوسة = نطّة · دوسة طويلة في الهوا = شقلبة', 'لمّي القلوب 💜 واستدعي ' + (helper === 's' ? 'سند' : 'ونس') + ' بالزرار 🤍'); save.stats.freeTipped = true; }
    showTips(tips);
  }
  function showTips(list) {
    const tip = $('#tip');
    if (!list.length) { tip.classList.add('hidden'); return; }
    tip.querySelector('span').textContent = list.shift();
    tip.classList.remove('hidden'); tip.style.opacity = 1;
    tipTimer = setTimeout(() => { tip.style.opacity = 0; tipTimer = setTimeout(() => showTips(list), 350); }, 3400);
  }
  function tryFullscreen() {
    const d = document.documentElement;
    if (document.fullscreenElement || !d.requestFullscreen || matchMedia('(display-mode: standalone)').matches) return;
    d.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
  }

  let lastHud = {};
  const hooks = {
    hud(h) {
      if (Game.run && Game.run.attract) return;
      if (h.score !== lastHud.score) $('#hScore').textContent = h.mode === 'zen' ? '🌙' : h.score.toLocaleString('ar-EG');
      if (h.dist !== lastHud.dist) $('#hDist').textContent = h.dist.toLocaleString('ar-EG');
      if (h.coins !== lastHud.coins) $('#hCoins').textContent = h.coins.toLocaleString('ar-EG');
      const sum = $('#sum');
      const p = Math.min(100, h.meter / h.cap * 100);
      sum.style.setProperty('--p', p + '%');
      $('#sumTxt').textContent = h.power > 0 ? 'معاكي' : h.meter + '/' + h.cap;
      $('#sumBadge').textContent = h.charges;
      $('#sumBadge').style.display = h.charges > 0 ? '' : 'none';
      sum.classList.toggle('ready', h.can);
      sum.classList.toggle('off', !h.can && h.power <= 0);
      $('#pbar i').style.width = (h.power > 0 ? h.power / h.powerMax * 100 : 0) + '%';
      const pu = [];
      if (h.glide > 0) pu.push('🪶 ' + Math.ceil(h.glide));
      if (h.magnet > 0) pu.push('🧲 ' + Math.ceil(h.magnet));
      if (h.vstar > 0) pu.push('✨ ' + Math.ceil(h.vstar));
      const puH = pu.map(x => `<span>${x}</span>`).join('');
      if (puH !== lastHud.puH) $('#pups').innerHTML = puH;
      if (h.goal) {
        const gh = h.goal.map(g => `<span class="chip ${g.cur >= g.n ? 'ok' : ''}">${g.label} ${g.cur}/${g.n}</span>`).join('');
        if (gh !== lastHud.gh) $('#goal').innerHTML = gh;
        h.gh = gh;
      }
      h.puH = puH; lastHud = h;
    },
    achieve(id) {
      if (save.ach.includes(id)) return;
      const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
      save.ach.push(id); save.coins += a.reward; persist();
      Sound.play('ach');
      toast(`🏆 ${a.name} <small style="opacity:.7">+${a.reward}⭐</small>`);
    },
    toast(t) { toast(t); },
    biome(i) { toast('🗺️ ' + BIOMES[i].name, 1600); },
    over(r) {
      setTimeout(() => results(r), 200);
    },
    goal(r) {
      const i = r.chapter, ch = STORY[i];
      const first = !save.story.done.includes(i);
      if (first) save.story.done.push(i);
      save.story.unlocked = Math.max(save.story.unlocked, Math.min(STORY.length - 1, i + 1));
      const bonus = first ? 150 + i * 50 : 30;
      save.coins += r.earned + bonus;
      persist();
      Game.pause();
      dialog(ch.title, ch.post, () => {
        const after = () => { if (save.story.done.length >= STORY.length) hooks.achieve('story'); toast(`💜 الفصل خلص · +${r.earned + bonus}⭐`); renderChapters(); Game.attract(save, ch.biome); show('story'); };
        if (ch.letter) letter(after); else after();
      });
    },
  };

  function results(r) {
    const earned = r.earned;
    save.coins += earned;
    if (r.mode === 'free') {
      save.best.free = Math.max(save.best.free, r.score);
      save.best.freeDist = Math.max(save.best.freeDist, r.dist);
      if (r.dist >= 3000) hooks.achieve('dist3k');
      if (r.dist >= 8000) hooks.achieve('dist8k');
    }
    save.stats.coins = (save.stats.coins || 0) + r.coins;
    if (save.stats.coins >= 2000) hooks.achieve('coins2000');
    persist();
    const story = r.mode === 'story';
    $('#rT').textContent = story ? 'وقعتي… بس عادي 🤍' : 'خلصت الجولة!';
    $('#rScore').textContent = r.score.toLocaleString('ar-EG');
    const best = r.mode === 'free' ? `<div>🏅 أحسن: ${save.best.free.toLocaleString('ar-EG')}</div>` : '';
    $('#rKv').innerHTML = `<div>📏 ${r.dist}م</div><div>⭐ +${earned}</div><div>🔄 ${r.stats.flips}</div><div>💜 ${r.stats.hearts}</div>${best}`;
    const L = Game.run.main === 'w' ? ['ولا يهمك يا فطومتي، قومي تاني 🤍', 'المرة الجاية هتبقى أحلى… أنا متأكد', 'إيكادولي… يلا تاني؟', 'دي تربيتي وأنا عارف إنك هتعمليها 😌'] : ['قوم يا سند… أنا جنبك 💜', 'إيكادولي! يلا تاني', 'مفيش حاجة اسمها لوحدي 💜'];
    $('#rLine').textContent = (Game.run.main === 'w' ? 'سند: ' : 'ونس: ') + L[(Math.random() * L.length) | 0];
    if (story && save.settings.autoRescue === false) $('#rLine').textContent += ' (شغّلي "سند ينقذك لوحده" من الإعدادات)';
    show('results');
  }
  $('#rAgain').addEventListener('click', () => { click(); startRun(lastCfg); });
  $('#rMenu').addEventListener('click', () => { click(); toMenu(); });
  $('#rPhoto').addEventListener('click', () => { click(); photo(); });

  /* ---------- إيقاف ---------- */
  $('#bPause').addEventListener('click', e => { e.stopPropagation(); click(); pause(); });
  function pause() {
    if (current !== null || !Game.run || Game.run.attract) return;
    Game.pause();
    $('#pauseNote').textContent = '💌 ' + NOTES[(Math.random() * NOTES.length) | 0];
    show('pause');
  }
  $('#bResume').addEventListener('click', () => { click(); show(null); Game.resume(); });
  $('#bRestart').addEventListener('click', () => { click(); startRun(lastCfg); });
  $('#bQuit').addEventListener('click', () => { click(); Game.stop(); toMenu(); });
  $('#bPhoto').addEventListener('click', () => { click(); photo(); });
  $('#sum').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); Sound.init(); if (!Game.summon()) { Sound.play('click'); } });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pause(); Sound.suspend(); } else Sound.resume();
  });

  async function photo() {
    const url = Game.snapshot();
    hooks.achieve('photo');
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], 'sanad-wanas.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'سند و ونس 💜' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = url; a.download = 'sanad-wanas.png'; a.click();
    toast('📸 الصورة اتحفظت');
  }

  /* ---------- المتجر ---------- */
  const TABS = [['w', 'لبس ونس'], ['s', 'لبس سند'], ['board', 'زحاليق'], ['trail', 'الأثر'], ['up', 'ترقيات']];
  let tab = 'w';
  function renderShop() {
    $('#tabs').innerHTML = '';
    TABS.forEach(([id, name]) => {
      const b = document.createElement('button'); b.textContent = name; b.className = id === tab ? 'on' : '';
      b.onclick = () => { click(); tab = id; renderShop(); };
      $('#tabs').appendChild(b);
    });
    const el = $('#items'); el.innerHTML = '';
    $$('.cTotal').forEach(e => e.textContent = save.coins);
    if (tab === 'up') {
      SHOP.up.forEach(u => {
        const lv = save.up[u.id] || 0, max = lv >= u.max, price = u.prices[lv];
        const d = document.createElement('div'); d.className = 'it';
        d.innerHTML = `<div style="font-size:30px">${{ heart: '💜', summon: '🤍', power: '⏳', magnet: '🧲', glide: '🪶' }[u.id]}</div><div class="nm">${u.name}</div><div class="lv">${u.desc}<br>المستوى ${lv}/${u.max}</div>`;
        const b = document.createElement('button'); b.className = 'btn sm ' + (max ? '' : 'pri');
        b.textContent = max ? 'آخر مستوى' : `⭐ ${price}`; b.disabled = max;
        b.onclick = () => { if (save.coins < price) { toast('⭐ محتاجة نجوم أكتر'); return; } save.coins -= price; save.up[u.id] = lv + 1; persist(); Sound.play('power'); hooks.achieve('shop'); renderShop(); };
        d.appendChild(b); el.appendChild(d);
      });
      return;
    }
    SHOP[tab].forEach(item => {
      const owned = save.owned.includes(item.id), eq = save.equip[tab] === item.id;
      const d = document.createElement('div'); d.className = 'it' + (eq ? ' eq' : '');
      const cv = document.createElement('canvas'); cv.width = 72; cv.height = 78;
      preview(cv, tab, item);
      d.appendChild(cv);
      const n = document.createElement('div'); n.className = 'nm'; n.textContent = item.name; d.appendChild(n);
      const b = document.createElement('button'); b.className = 'btn sm ' + (owned ? '' : 'pri');
      b.textContent = eq ? 'لابساه ✓' : owned ? 'البسي' : `⭐ ${item.price}`;
      b.disabled = eq;
      b.onclick = () => {
        if (!owned) {
          if (save.coins < item.price) { toast('⭐ محتاجة نجوم أكتر'); return; }
          save.coins -= item.price; save.owned.push(item.id); hooks.achieve('shop'); Sound.play('power');
        } else click();
        save.equip[tab] = item.id; persist(); renderShop();
      };
      d.appendChild(b); el.appendChild(d);
    });
  }
  function preview(cv, tab, item) {
    const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cv.width, cv.height);
    if (tab === 'w' || tab === 's') {
      const img = Art.outfit(tab, item), k = Math.min(64 / img.height, 64 / img.width);
      c.drawImage(img, (72 - img.width * k) / 2, 74 - img.height * k, img.width * k, img.height * k);
    } else if (tab === 'board') {
      c.save(); c.translate(36, 44); c.scale(1.8, 1.8); c.rotate(-0.15); drawBoard(c, item); c.restore();
    } else {
      const k = item.kind;
      for (let i = 0; i < 6; i++) {
        const x = 12 + i * 10, y = 50 - i * 5;
        if (k === 'hearts') Art.heart(c, x, y, 5, i % 2 ? '#ff9cc9' : '#c9a6ff');
        else if (k === 'stars') Art.star(c, x, y, 5, i % 2 ? '#ffe27a' : '#fff3b0');
        else if (k === 'ribbon') { c.fillStyle = 'rgba(150,90,240,.7)'; c.fillRect(x - 5, y + Math.sin(i) * 3, 11, 6); }
        else { c.fillStyle = '#bcd0f0'; c.fillRect(x, y, 4, 4); }
      }
    }
  }
  function drawBoard(c, b) {
    // رسم مباشر
    c.fillStyle = b.tip; c.beginPath(); c.ellipse(-17, -1.2, 3.4, 2.6, -0.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(17, -1.2, 3.4, 2.6, 0.5, 0, Math.PI * 2); c.fill();
    if (b.glow) { c.shadowColor = b.glow; c.shadowBlur = 8; }
    c.fillStyle = b.col; c.fillRect(-17, -2.5, 34, 4); c.shadowBlur = 0;
    if (b.stars) { c.fillStyle = '#fff'; [-11, -3, 6, 13].forEach((k, i) => c.fillRect(k, -1.8 + (i % 2), 1.2, 1.2)); }
    if (b.hearts) { Art.heart(c, -7, -0.6, 1.6, '#fff'); Art.heart(c, 7, -0.6, 1.6, '#fff'); }
  }

  /* ---------- الإنجازات ---------- */
  function renderAch() {
    $('#achN').textContent = save.ach.length + '/' + ACHIEVEMENTS.length;
    $('#achList').innerHTML = ACHIEVEMENTS.map(a => {
      const ok = save.ach.includes(a.id);
      return `<div class="ach ${ok ? '' : 'no'}"><div class="i">${ok ? '🏆' : '🔒'}</div><div style="flex:1"><b>${a.name}</b><small>${a.desc}</small></div><b>⭐${a.reward}</b></div>`;
    }).join('');
  }

  /* ---------- الإعدادات ---------- */
  function renderSet() {
    const S = save.settings;
    const rows = [
      ['music', '🎵 الموسيقى'], ['sfx', '🔊 المؤثرات'], ['vibe', '📳 الاهتزاز'],
      ['autoRescue', '🤍 سند ينقذك لوحده لما تقعي'], ['solo', '🏂 شخصية لوحدها (التاني ييجي بس لما تستدعيه)'], ['view3d', '🧊 وضع 3D'], ['cam3d', '🎬 كاميرا 3D من ورا (بدل الجنب)'], ['quality', '✨ جودة عالية (اقفليها لو الموبايل تقيل)'],
    ];
    $('#setList').innerHTML = rows.map(([k, n]) => `<div class="row"><span>${n}</span><button class="tog ${k === 'cam3d' ? (S.cam3d === 'chase' ? 'on' : '') : (k === 'view3d' || k === 'solo') ? (S[k] ? 'on' : '') : (S[k] !== false && S[k] !== 0 ? 'on' : '')}" data-k="${k}"></button></div>`).join('')
      + `<div class="row"><span>🏅 أحسن سكور: ${save.best.free.toLocaleString('ar-EG')} · أبعد مسافة: ${save.best.freeDist}م</span></div>`;
    $$('#setList .tog').forEach(t => t.onclick = () => {
      click();
      const k = t.dataset.k;
      if (k === 'quality') S.quality = S.quality === 0 ? 1 : 0;
      else if (k === 'view3d' || k === 'solo') S[k] = !S[k];
      else if (k === 'cam3d') S.cam3d = S.cam3d === 'chase' ? 'side' : 'chase';
      else S[k] = S[k] === false ? true : false;
      if (k === 'view3d' || k === 'solo' || k === 'cam3d') applyView();
      applySettings(); persist(); renderSet();
    });
  }
  function applySettings() {
    const S = save.settings;
    Sound.setMusic(S.music !== false); Sound.setSfx(S.sfx !== false);
    Game.setQuality(S.quality === 0 ? 0 : 1);
  }
  $('#bReplay').addEventListener('click', () => {
    click();
    if (!save.letterSeen) { toast('💌 الجواب بيتفتح في آخر فصل في القصة'); return; }
    letter(() => toMenu());
  });
  $('#bReset').addEventListener('click', () => {
    if (!confirm('متأكدة إنك عايزة تمسحي كل التقدّم؟')) return;
    localStorage.removeItem(KEY); location.reload();
  });

  /* ---------- رسايل صغيرة ---------- */
  let toastT = null;
  function toast(html, ms = 2600) {
    const t = $('#toast'); t.innerHTML = html; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
  }

  /* ---------- تثبيت كتطبيق ---------- */
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#bInstall').classList.remove('hidden'); });
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios && !standalone) $('#bInstall').classList.remove('hidden');
  $('#bInstall').addEventListener('click', async () => {
    click();
    if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; $('#bInstall').classList.add('hidden'); }
    else if (ios) toast('من Safari: دوسي زرار المشاركة ⬆️ وبعدين "إضافة إلى الشاشة الرئيسية" 📲', 6000);
  });
  window.addEventListener('appinstalled', () => { $('#bInstall').classList.add('hidden'); toast('💜 اللعبة اتثبتت على الموبايل'); });

  /* لفّة الشاشة */
  const rot = () => { const p = innerHeight > innerWidth && !sessionStorage.getItem('rotX'); $('#rot').classList.toggle('hidden', !p); };
  addEventListener('resize', rot); rot();
  $('#rotX').addEventListener('click', () => { sessionStorage.setItem('rotX', 1); rot(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }

  /* ---------- البداية ---------- */
  Game.init($('#c'), hooks);
  Art.init().then(async () => {
    applySettings();
    await applyView();
    menuBiome = STORY[Math.min(save.story.unlocked, 7)].biome;
    toMenu();
    $('#load').remove();
    document.addEventListener('pointerdown', () => Sound.init(), { once: true });
  }).catch(err => { $('#load').innerHTML = '<div>حصلت مشكلة في التحميل 😢</div><button class="btn" onclick="location.reload()">جرّبي تاني</button>'; console.error(err); });
})();
