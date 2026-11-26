/* سند و ونس — الإضافات: مهام ومستويات، تحدّي يومي، هدية دخول، عجلة حظ، ألبومات، إحصائيات،
   أحسن 10، فرصة تانية، كارت مشاركة، عدّاد الأيام، رسالتك، تعديل الجواب، شخصيات القايمة، إيه الجديد */
'use strict';

const Extras = (() => {
  const $ = s => document.querySelector(s);
  let U = null, pendingNew = false; // واجهة ui.js: { save, persist, toast, show, click, startRun, toMenu }
  const S = () => U.save;
  const day = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PHOTOS = 'wanas-photos-v1';

  /* ---------- مستويات ---------- */
  const need = l => 120 + (l - 1) * 80;
  function addXp(n) {
    const s = S(); s.xp = (s.xp || 0) + n; s.lvl = s.lvl || 1;
    while (s.xp >= need(s.lvl)) {
      s.xp -= need(s.lvl); s.lvl++;
      const gift = 100 * s.lvl; s.coins += gift;
      Sound.play('levelup'); Game.confetti(80);
      U.toast(`⭐ مستوى ${s.lvl}! <small>+${gift}⭐</small>`, 3500);
      if (s.lvl >= 5) U.ach('lvl5'); if (s.lvl >= 10) U.ach('lvl10');
    }
    renderLevel();
  }
  function renderLevel() {
    const s = S(), el = $('#lvl'); if (!el) return;
    el.innerHTML = `⭐ مستوى ${s.lvl || 1} <i><b style="width:${Math.min(100, (s.xp || 0) / need(s.lvl || 1) * 100)}%"></b></i>`;
  }

  /* ---------- المهام ---------- */
  function ms() {
    const s = S(); s.ms = s.ms || { active: [], prog: {}, done: 0 };
    while (s.ms.active.length < 3) {
      const pool = MISSIONS.filter(m => !s.ms.active.includes(m.id) && !(s.ms.recent || []).includes(m.id));
      const m = pool[(Math.random() * pool.length) | 0] || MISSIONS[(Math.random() * MISSIONS.length) | 0];
      s.ms.active.push(m.id); s.ms.prog[m.id] = 0;
    }
    return s.ms;
  }
  function evt(name, v = 1) {
    const st = ms(); let changed = false;
    st.active.forEach((id, i) => {
      const m = MISSIONS.find(x => x.id === id); if (!m || m.ev !== name) return;
      st.prog[id] = m.best ? Math.max(st.prog[id] || 0, v) : (st.prog[id] || 0) + v;
      changed = true;
      if (st.prog[id] >= m.n) {
        const reward = 80 + Math.min(220, m.n);
        S().coins += reward; st.done++;
        st.recent = [...(st.recent || []), id].slice(-6);
        st.active.splice(i, 1, null);
        U.toast(`🎯 مهمة خلصت: ${m.text} <small>+${reward}⭐</small>`, 3200);
        Sound.play('ach');
        addXp(60);
        if (st.done >= 10) U.ach('missions10');
      }
    });
    if (changed) { st.active = st.active.filter(Boolean); ms(); U.persist(); }
  }
  function missionsHTML() {
    const st = ms();
    return st.active.map(id => {
      const m = MISSIONS.find(x => x.id === id), p = Math.min(m.n, Math.floor(st.prog[id] || 0));
      return `<div class="mis"><div><b>${m.text}</b><i><b style="width:${p / m.n * 100}%"></b></i></div><span>${p.toLocaleString('ar-EG')}/${m.n.toLocaleString('ar-EG')}</span></div>`;
    }).join('');
  }

  /* ---------- نهاية الجولة ---------- */
  function onResults(r) {
    const s = S(), lines = [];
    s.stats.runs = (s.stats.runs || 0) + 1;
    s.stats.totalDist = (s.stats.totalDist || 0) + r.dist;
    s.stats.bestCombo = Math.max(s.stats.bestCombo || 0, r.stats.bestCombo || 0);
    evt('runDist', r.dist); evt('runScore', r.score); evt('dist', r.dist);
    if (r.mode === 'zen') evt('zenDist', r.dist);
    if (r.mode === 'story') evt('storyRun');
    // أحسن 10
    if (r.mode === 'free' && r.score > 0) {
      s.top = (s.top || []).concat([{ score: r.score, dist: r.dist, d: Date.now(), m: Game.run.main }]).sort((a, b) => b.score - a.score).slice(0, 10);
      const rank = s.top.findIndex(t => t.score === r.score && Date.now() - t.d < 5000);
      if (rank >= 0 && rank < 3) lines.push(`🏆 المركز ${rank + 1} في أحسن 10`);
    }
    // تحدّي اليوم
    const dc = DAILY[day() % DAILY.length];
    s.daily = s.daily && s.daily.day === day() ? s.daily : { day: day(), done: false };
    if (!s.daily.done) {
      const val = { flips: r.stats.flips, hearts: r.stats.hearts, dist: r.dist, grinds: r.stats.grinds, duos: r.stats.duos, coins: r.coins, perfects: r.stats.perfects || 0 }[dc.stat] || 0;
      if (val >= dc.n) { s.daily.done = true; s.coins += 250; lines.push('📅 خلّصتي تحدّي اليوم! +250⭐'); Game.confetti(80); U.ach('daily'); addXp(80); }
    }
    addXp(Math.round(10 + r.dist / 100));
    U.persist();
    return lines;
  }

  /* ---------- فرصة تانية ---------- */
  let reviveTimer = null;
  function revive() {
    const s = S(), cost = 60, el = $("#revive");
    U.show('revive');
    let n = 6;
    $('#rvCount').textContent = n;
    $('#rvYes').disabled = s.coins < cost;
    $('#rvYes').textContent = s.coins < cost ? `محتاجة ${cost}⭐` : `💜 كمّلي (${cost}⭐)`;
    clearInterval(reviveTimer);
    reviveTimer = setInterval(() => { n--; $('#rvCount').textContent = n; if (n <= 0) { clearInterval(reviveTimer); no(); } }, 1000);
    const yes = () => { clearInterval(reviveTimer); if (s.coins < cost) return; s.coins -= cost; U.persist(); U.show(null); Game.revive(); };
    const no = () => { clearInterval(reviveTimer); if (!el.classList.contains('hidden')) { U.show(null); Game.giveUp(); } };
    $('#rvYes').onclick = () => { U.click(); yes(); };
    $('#rvNo').onclick = () => { U.click(); no(); };
  }

  /* ---------- شاشة عامة ---------- */
  function panel(title, html, after) {
    $('#exT').textContent = title; $('#exB').innerHTML = html;
    U.show('extra'); after && after();
  }

  /* ---------- هدية الدخول اليومي ---------- */
  function checkLogin() {
    const s = S(), d = day(); s.login = s.login || { last: 0, streak: 0 };
    if (s.login.last === d) return false;
    s.login.streak = s.login.last === d - 1 ? s.login.streak + 1 : 1;
    s.login.last = d;
    const idx = (s.login.streak - 1) % 7, reward = STREAK_REWARDS[idx];
    s.coins += reward; U.persist();
    if (s.login.streak >= 7) U.ach('streak7');
    const boxes = STREAK_REWARDS.map((v, i) => `<div class="day ${i < idx ? 'past' : i === idx ? 'now' : ''}"><small>يوم ${i + 1}</small><b>${i === 6 ? '🎁' : '⭐'}</b>${v}</div>`).join('');
    setTimeout(() => {
      panel('🗓️ هدية النهارده', `<p class="line">صباح الونس يا فطومتي 🤍 دي هدية يوم ${s.login.streak}</p><div class="days">${boxes}</div><p class="line">+${reward}⭐ — ادخلي بكرة عشان الهدية تكبر</p>`);
      Sound.play('gift'); Game.confetti(50);
    }, 900);
    return true;
  }

  /* ---------- عجلة الحظ ---------- */
  function wheel() {
    const s = S(), can = s.wheelDay !== day();
    panel('🎡 عجلة الحظ', `<canvas id="whl" width="300" height="300" style="width:240px;height:240px;display:block;margin:0 auto"></canvas>
      <p class="line" id="whlTxt">${can ? 'لفّة واحدة كل يوم 💜' : 'لفّيتي النهارده… استني لبكرة 🌙'}</p>
      <div class="acts"><button class="btn pri" id="whlGo" ${can ? '' : 'disabled'}>لفّي</button></div>`, () => {
      const cv = $('#whl'), c = cv.getContext('2d'), n = WHEEL.length, cols = ['#c9a6ff', '#ffd6f2', '#b98cff', '#fff1b8', '#d9c2ff', '#bfe3ff', '#ff8fc7', '#efe6ff'];
      let ang = 0;
      const draw = () => {
        c.clearRect(0, 0, 300, 300);
        for (let i = 0; i < n; i++) {
          const a0 = ang + i / n * Math.PI * 2, a1 = a0 + Math.PI * 2 / n;
          c.fillStyle = cols[i]; c.beginPath(); c.moveTo(150, 150); c.arc(150, 150, 140, a0, a1); c.fill();
          c.save(); c.translate(150, 150); c.rotate((a0 + a1) / 2); c.fillStyle = '#2b2240'; c.font = '900 15px Cairo'; c.textAlign = 'right'; c.direction = 'rtl'; c.fillText(WHEEL[i].label, 128, 5); c.restore();
        }
        c.fillStyle = '#7c4ddb'; c.beginPath(); c.arc(150, 150, 18, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.font = '20px sans-serif'; c.textAlign = 'center'; c.fillText('💜', 150, 157);
        c.fillStyle = '#2b2240'; c.beginPath(); c.moveTo(286, 150); c.lineTo(300, 140); c.lineTo(300, 160); c.fill();
      };
      draw();
      $('#whlGo').onclick = () => {
        if (s.wheelDay === day()) return;
        s.wheelDay = day(); U.persist(); $('#whlGo').disabled = true; U.ach('wheel');
        const pickI = (Math.random() * n) | 0, target = Math.PI * 2 * 6 - (pickI + 0.5) / n * Math.PI * 2;
        const t0 = performance.now(), dur = 3600; let lastTick = -1;
        const spin = now => {
          const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4);
          ang = target * e; draw();
          const tick = Math.floor(ang / (Math.PI * 2 / n)); if (tick !== lastTick) { lastTick = tick; Sound.play('wheel', tick % 8); }
          if (k < 1) requestAnimationFrame(spin);
          else {
            const w = WHEEL[pickI];
            if (w.coins) s.coins += w.coins; else s.pending = w.meter ? 'meter' : w.start;
            U.persist(); Sound.play('gift'); Game.confetti(60);
            $('#whlTxt').textContent = '🎉 كسبتي: ' + w.label + (w.coins ? '' : ' (في الجولة الجاية)');
          }
        };
        requestAnimationFrame(spin);
      };
    });
  }

  /* ---------- ألبوم الرسايل ---------- */
  function notes() {
    const have = S().notes || [];
    panel(`💌 رسايل الحمام (${have.length}/${PIGEON_NOTES.length})`, `<div class="notes">${PIGEON_NOTES.map((t, i) => have.includes(i)
      ? `<div class="nt">🕊️ ${esc(t)}</div>` : `<div class="nt lock">🔒 لسه… امسكي حمامة رسايل في التزلّج</div>`).join('')}</div>`);
  }

  /* ---------- ألبوم الصور ---------- */
  function getPhotos() { try { return JSON.parse(localStorage.getItem(PHOTOS) || '[]'); } catch (e) { return []; } }
  function savePhoto(dataUrl) {
    const img = new Image();
    img.onload = () => {
      const w = 420, h = Math.round(img.height * w / img.width), c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      const list = [c.toDataURL('image/jpeg', 0.72), ...getPhotos()].slice(0, 9);
      try { localStorage.setItem(PHOTOS, JSON.stringify(list)); } catch (e) { try { localStorage.setItem(PHOTOS, JSON.stringify(list.slice(0, 4))); } catch (e2) {} }
      evt('photo');
    };
    img.src = dataUrl;
  }
  function album() {
    const list = getPhotos();
    panel('🖼️ ألبوم الصور', list.length ? `<div class="alb">${list.map((u, i) => `<img src="${u}" data-i="${i}" alt="">`).join('')}</div><p class="line">دوسي على صورة عشان تحفظيها أو تشاركيها</p>`
      : '<p class="line">لسه مفيش صور… خدي لقطة من زرار 📸 في الاستراحة أو آخر الجولة</p>', () => {
      document.querySelectorAll('.alb img').forEach(im => im.onclick = () => share(im.src, 'sanad-wanas-' + im.dataset.i + '.jpg'));
    });
  }
  async function share(url, name) {
    try {
      const blob = await (await fetch(url)).blob(), file = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'سند و ونس 💜' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  }

  /* ---------- كارت النتيجة ---------- */
  function scoreCard(r) {
    const c = document.createElement('canvas'); c.width = 800; c.height = 800; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, '#3a2070'); g.addColorStop(1, '#c78be8'); x.fillStyle = g; x.fillRect(0, 0, 800, 800);
    for (let i = 0; i < 70; i++) { x.globalAlpha = Math.random() * 0.7; x.fillStyle = '#fff'; x.fillRect(Math.random() * 800, Math.random() * 450, 3, 3); }
    x.globalAlpha = 1; x.fillStyle = '#f2ecff'; x.beginPath(); x.ellipse(400, 900, 700, 330, 0, 0, 7); x.fill();
    x.imageSmoothingEnabled = false;
    const sp = Art.base.sp, wp = Art.base.wp;
    x.drawImage(sp, 150, 430, sp.width * 270 / sp.height, 270); x.drawImage(wp, 420, 400, wp.width * 310 / wp.height, 310);
    x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#fff';
    x.font = '64px Lalezar, Cairo, sans-serif'; x.fillText('سند و ونس 💜', 400, 110);
    x.font = '900 90px Lalezar, Cairo, sans-serif'; x.fillText(r.score.toLocaleString('ar-EG'), 400, 230);
    x.font = '700 34px Cairo, sans-serif'; x.fillText(`📏 ${r.dist}م · 🔄 ${r.stats.flips} · 💜 ${r.stats.hearts}`, 400, 300);
    x.font = '700 28px Cairo, sans-serif'; x.fillStyle = '#5b34b0'; x.fillText('إنتي البنفسجي الخاص بي ✨', 400, 770);
    share(c.toDataURL('image/png'), 'sanad-wanas-score.png');
  }

  /* ---------- إحصائيات وأحسن 10 ---------- */
  function stats() {
    const s = S(), st = s.stats || {};
    const rows = [
      ['🏂 عدد الجولات', st.runs || 0], ['📏 المسافة الكلية', ((st.totalDist || 0)).toLocaleString('ar-EG') + 'م'], ['🔄 الشقلبات', st.flips || 0],
      ['💜 القلوب', st.hearts || 0], ['⭐ النجوم', st.coins || 0], ['👌 نزلات مظبوطة', st.perfect || 0], ['🤍 سند لحقك', st.rescues || 0],
      ['🤝 إيد في إيد', st.duos || 0], ['🕊️ حمام', st.pigeons || 0], ['🎁 هدايا', st.gifts || 0], ['⏩ دفعات سرعة', st.pads || 0],
      ['🎯 مهام خلصت', (s.ms && s.ms.done) || 0], ['⭐ المستوى', s.lvl || 1], ['🏅 أحسن سكور', (s.best.free || 0).toLocaleString('ar-EG')], ['🏆 إنجازات', s.ach.length + '/' + ACHIEVEMENTS.length],
    ];
    panel('📊 الإحصائيات', rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${typeof v === 'number' ? v.toLocaleString('ar-EG') : v}</b></div>`).join(''));
  }
  function top() {
    const t = S().top || [];
    panel('🏆 أحسن 10 جولات', t.length ? t.map((r, i) => `<div class="row"><span>${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${r.m === 's' ? 'سند' : 'ونس'} · ${r.dist}م · <small>${new Date(r.d).toLocaleDateString('ar-EG')}</small></span><b>${r.score.toLocaleString('ar-EG')}</b></div>`).join('')
      : '<p class="line">لسه مفيش جولات في التزلّج الحر</p>');
  }
  function missions() {
    const s = S(), dc = DAILY[day() % DAILY.length], done = s.daily && s.daily.day === day() && s.daily.done;
    panel('🎯 المهام', `${missionsHTML()}<div class="mis daily"><div><b>📅 تحدّي اليوم: ${dc.text}</b></div><span>${done ? '✅' : '+250⭐'}</span></div>
      <p class="line">المهمة اللي تخلص بتتبدّل بواحدة جديدة · كل مهمة = خبرة ⭐</p>`);
  }
  function whatsNew(auto) {
    panel('✨ إيه الجديد', `<p class="line">${WHATS_NEW.length} إضافة جديدة 💜</p><ol class="wn">${WHATS_NEW.map(t => `<li>${t}</li>`).join('')}</ol>`);
    if (auto) { S().seenNew = 5; U.persist(); }
  }
  function controls() {
    panel('📖 التحكم', `<div class="ctl">
      <div><b>👆 دوسة</b> نطّة (وعلى الحبل: نطّة منه)</div>
      <div><b>✋ دوسة طويلة في الهوا</b> شقلبة لورا · سيبي قبل الأرض</div>
      <div><b>👆👆 دوستين في الهوا</b> لفّة الطرحة</div>
      <div><b>🤍 زرار الاستدعاء</b> سند ييجي جنبك: يحميكي ويرفعك ويعمل معاكي إيد في إيد</div>
      <div><b>🪶 الريشة</b> دوسي وفضلي دايسة وانتي نازلة = طيران</div>
      <div><b>🎈 بالونة</b> بتطيّرك لفوق شوية · <b>🫧 فقاعة</b> بتحميكي من وقعة · <b>⏳</b> بتبطّأ الوقت · <b>×2</b> نجوم مضاعفة</div>
      <div><b>⏩ الأسهم البنفسجي</b> دفعة سرعة · <b>🌸 الزهور</b> بتنطّطك · <b>🏮 الحبال</b> انزلي فوقها</div>
      <div><b>🕊️ الحمامة</b> الحقيها وخدي رسالة حب</div></div>`);
  }

  /* ---------- لمسات شخصية في القايمة ---------- */
  function menuExtras() {
    const s = S(), st = s.settings, line = $('#anniv');
    if (st.anniv) {
      const d0 = new Date(st.anniv + 'T00:00:00'), now = new Date(), days = Math.floor((now - d0) / 864e5);
      if (days >= 0) {
        let txt = `💜 بقالنا ${days.toLocaleString('ar-EG')} يوم سوا`;
        if (now.getDate() === d0.getDate() && days > 0) {
          txt += ' — كل شهر وإحنا سوا 🎉';
          if (s.annivShown !== day()) { s.annivShown = day(); U.persist(); setTimeout(() => Game.confetti(120), 600); }
        }
        line.textContent = txt; line.classList.remove('hidden');
      } else line.classList.add('hidden');
    } else line.classList.add('hidden');
    if (st.msg && Math.random() < 0.6) $('#note').textContent = '✍️ ' + st.msg;
    renderLevel();
    const dc = $('#dailyDot'); if (dc) dc.classList.toggle('hidden', s.wheelDay === day());
  }
  function charTap(who, el) {
    U.click(); Sound.play('pop');
    const L = LINES[who === 's' ? 's' : 'w'], pool = [...L.flip, ...L.summon, ...L.full];
    U.toast((who === 's' ? 'سند: ' : 'ونس: ') + pool[(Math.random() * pool.length) | 0], 2000);
    el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop');
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const h = document.createElement('div'); h.className = 'fh'; h.textContent = ['💜', '🤍', '✨'][i % 3];
      h.style.left = r.left + r.width / 2 + (Math.random() - 0.5) * 40 + 'px'; h.style.top = r.top + 'px'; h.style.animationDelay = i * 0.08 + 's';
      document.body.appendChild(h); setTimeout(() => h.remove(), 1600);
    }
  }

  /* ---------- الإعدادات الإضافية ---------- */
  function settingsHTML() {
    const st = S().settings;
    return `<div class="row"><span>🎵 صوت الموسيقى</span><input type="range" min="0" max="100" value="${Math.round((st.mVol ?? 0.8) * 100)}" id="sMV"></div>
      <div class="row"><span>🔊 صوت المؤثرات</span><input type="range" min="0" max="100" value="${Math.round((st.sVol ?? 0.8) * 100)}" id="sSV"></div>
      <div class="row"><span>💜 اتعرفنا يوم</span><input type="date" id="sAnniv" value="${st.anniv || ''}"></div>
      <div class="row col"><span>✍️ رسالتك ليها (بتظهر في القايمة)</span><textarea id="sMsg" rows="2" maxlength="120" placeholder="اكتب رسالة قصيرة…">${esc(st.msg || '')}</textarea></div>
      <div class="row col"><span>📝 الجواب الأخير (كل سطر فقرة)</span><textarea id="sLetter" rows="5" maxlength="1500">${esc(st.letter || LETTER.body.join('\n'))}</textarea></div>
      <div class="acts" style="margin-top:8px"><button class="btn sm" id="bNew">✨ إيه الجديد</button><button class="btn sm" id="bCtl">📖 التحكم</button><button class="btn sm" id="bLetterReset">↺ رجّعي الجواب الأصلي</button></div>`;
  }
  function bindSettings() {
    const st = S().settings;
    const vol = () => { st.mVol = $('#sMV').value / 100; st.sVol = $('#sSV').value / 100; Sound.setVolumes(st.mVol, st.sVol); U.persist(); };
    $('#sMV').oninput = vol; $('#sSV').oninput = vol;
    $('#sAnniv').onchange = e => { st.anniv = e.target.value; U.persist(); };
    $('#sMsg').onchange = e => { st.msg = e.target.value.trim(); U.persist(); };
    $('#sLetter').onchange = e => { st.letter = e.target.value; U.persist(); U.toast('📝 الجواب اتحفظ'); };
    $('#bNew').onclick = () => { U.click(); whatsNew(); };
    $('#bCtl').onclick = () => { U.click(); controls(); };
    $('#bLetterReset').onclick = () => { U.click(); st.letter = ''; U.persist(); $('#sLetter').value = LETTER.body.join('\n'); };
    ['#sMsg', '#sLetter', '#sAnniv'].forEach(q => { const e = $(q); e.addEventListener('pointerdown', ev => ev.stopPropagation()); });
  }
  function letterBody() { const t = S().settings.letter; return t && t.trim() ? t.split('\n').map(x => x.trim()).filter(Boolean) : LETTER.body; }

  /* ---------- الجودة لوحدها ---------- */
  function autoQuality() {
    const s = S(); if (s.settings.quality === 0 || s.autoQ) return;
    let n = 0; const t0 = performance.now();
    const f = now => {
      n++;
      if (now - t0 < 5000) return requestAnimationFrame(f);
      const fps = n / ((now - t0) / 1000);
      if (fps < 32 && Game.run && !Game.run.attract) { s.settings.quality = 0; s.autoQ = true; Game.setQuality(0); U.persist(); U.toast('🔋 خففت الجودة عشان اللعب يبقى أنعم (تقدري ترجّعيها من الإعدادات)', 4000); }
    };
    setTimeout(() => requestAnimationFrame(f), 2500);
  }

  function init(api) {
    U = api; ms();
    $('#btnMissions').onclick = () => { U.click(); missions(); };
    $('#btnWheel').onclick = () => { U.click(); wheel(); };
    $('#btnNotes').onclick = () => { U.click(); notes(); };
    $('#btnAlbum').onclick = () => { U.click(); album(); };
    $('#btnStats').onclick = () => { U.click(); stats(); };
    $('#btnTop').onclick = () => { U.click(); top(); };
    $('#exBack').onclick = () => { U.click(); if (pendingNew) { pendingNew = false; whatsNew(true); } else U.toMenu(); };
    $('#mcW').onclick = e => charTap('w', e.currentTarget);
    $('#mcS').onclick = e => charTap('s', e.currentTarget);
    const st = S().settings; Sound.setVolumes(st.mVol ?? 0.8, st.sVol ?? 0.8);
    const loginShown = checkLogin();
    if (!loginShown && S().seenNew !== 5) setTimeout(() => whatsNew(true), 900);
    else if (loginShown && S().seenNew !== 5) pendingNew = true;
  }

  return { init, evt, onResults, revive, savePhoto, scoreCard, missionsHTML, menuExtras, settingsHTML, bindSettings, letterBody, autoQuality, whatsNew };
})();
