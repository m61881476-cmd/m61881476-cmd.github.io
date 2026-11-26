/* سند و ونس — الصوت (نسخة 2)
   موسيقى هادية متولّدة بالكود بإحساس "أمبيانت": بيانو ناعم + وتريات + صدى قاعة واسعة،
   مكتوبة كجُمل موسيقية (موتيف بيتكرر ويتغيّر) لكل بيئة، وأصوات طبيعة حقيقية (هوا، موج، مطر، صراصير، عصافير).
   الموسيقى بتتفاعل مع اللعب: في الهوا بتفتح وبيظهر لمعان، والإيقاف بيكتمها، وكل حاجة بتتلم بتعزف نغمة من نفس السلم. */
'use strict';

const Sound = (() => {
  let ctx = null, master, comp, musicBus, musicFilter, sfxBus, ambBus, verb, verbIn, noiseBuf, pinkBuf;
  let musicOn = true, sfxOn = true, musicVol = 0.8, sfxVol = 0.8;
  let timer = null, mood = 0, nextBeat = 0, beat = 0, air = false, paused = false, inMenu = true;
  let amb = null, grindNode = null, streak = 0, lastPick = 0;
  const BPM = 66, SPB = 60 / BPM;

  /* لكل بيئة: مقام وسلم وتتابع كوردات (درجات من السلم) ولون صوت */
  const MOODS = [
    { name: 'snow', root: 62, scale: [0, 2, 4, 7, 9, 11], prog: [[0, 4, 7, 11], [9, 12, 16], [5, 9, 12, 16], [7, 11, 14]], amb: 'wind', bright: 0.7 },
    { name: 'desert', root: 60, scale: [0, 1, 4, 5, 7, 8, 10], prog: [[0, 4, 7], [1, 5, 8], [-2, 1, 5], [0, 4, 7]], amb: 'breeze', bright: 0.6 },
    { name: 'city', root: 57, scale: [0, 2, 3, 5, 7, 10], prog: [[0, 3, 7, 10], [-4, 0, 3, 7], [-7, -3, 0, 5], [-5, -2, 2, 5]], amb: 'night', bright: 0.45 },
    { name: 'beach', root: 64, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4, 7], [7, 11, 14]], amb: 'waves', bright: 0.75 },
    { name: 'forest', root: 59, scale: [0, 2, 3, 7, 8, 10], prog: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-5, -1, 2]], amb: 'rain', bright: 0.5 },
    { name: 'violet', root: 65, scale: [0, 2, 4, 7, 9, 11], prog: [[0, 4, 7, 11], [2, 5, 9, 12], [-3, 0, 4, 7], [5, 9, 12, 16]], amb: 'birds', bright: 0.8 },
    { name: 'aurora', root: 55, scale: [0, 2, 3, 7, 10], prog: [[0, 3, 7, 10], [-2, 2, 5, 9], [-4, 0, 3, 7], [-5, -2, 2, 5]], amb: 'storm', bright: 0.4 },
    { name: 'sky', root: 67, scale: [0, 2, 4, 7, 9, 11], prog: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [2, 5, 9, 14]], amb: 'high', bright: 0.9 },
    { name: 'menu', root: 62, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12], [7, 11, 14]], amb: 'none', bright: 0.6 },
  ];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const R = Math.random;
  const M = () => MOODS[inMenu ? 8 : mood % 8];

  /* ---------- تجهيز ---------- */
  function makeImpulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.95; master.connect(comp);
    verb = ctx.createConvolver(); verb.buffer = makeImpulse(3.6, 2.6);
    verbIn = ctx.createGain(); verbIn.gain.value = 1; verbIn.connect(verb);
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.55; verb.connect(verbOut); verbOut.connect(master);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 5200; musicFilter.Q.value = 0.4;
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? musicVol * 0.5 : 0;
    musicBus.connect(musicFilter); musicFilter.connect(master);
    const mSend = ctx.createGain(); mSend.gain.value = 0.85; musicFilter.connect(mSend); mSend.connect(verbIn);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? sfxVol * 0.7 : 0; sfxBus.connect(master);
    const sSend = ctx.createGain(); sSend.gain.value = 0.25; sfxBus.connect(sSend); sSend.connect(verbIn);
    ambBus = ctx.createGain(); ambBus.gain.value = sfxOn ? sfxVol * 0.5 : 0; ambBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
    pinkBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    { const d = pinkBuf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = R() * 2 - 1; b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2) * 2.2; } }
    nextBeat = ctx.currentTime + 0.2;
    timer = setInterval(tick, 50);
    setAmbience();
  }

  /* ---------- آلات ---------- */
  function piano(m, t, vel = 0.5, dur = 2.6, bus = musicBus) {
    const f = hz(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(9000, f * 9), t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.6), t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.32, t + 0.008);
    g.gain.exponentialRampToValueAtTime(vel * 0.12, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [[1, 1, 'triangle'], [2, 0.35, 'sine'], [3, 0.12, 'sine'], [4.01, 0.05, 'sine']].forEach(([k, a, type]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.value = f * k; o.detune.value = (R() - 0.5) * 6;
      og.gain.value = a; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.1);
    });
    lp.connect(g); g.connect(bus);
  }
  function strings(notes, t, dur, vol = 0.05) {
    notes.forEach(m => {
      const f = hz(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 650 + M().bright * 500; lp.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(vol * 0.8, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.6);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.6 + R(); lg.gain.value = 3.5;
      lfo.connect(lg);
      [-7, 7].forEach(det => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        lg.connect(o.detune); o.connect(lp); o.start(t); o.stop(t + dur + 1.8);
      });
      lfo.start(t); lfo.stop(t + dur + 1.8);
      lp.connect(g); g.connect(musicBus);
    });
  }
  function bell(m, t, vol = 0.12, bus = sfxBus, dur = 1.6) {
    const f = hz(m);
    [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([k, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * k;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * a, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / k);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.1);
    });
  }
  function bass(m, t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.1);
  }
  function noise(t, dur, vol, freq, q = 1, type = 'bandpass', bus = sfxBus, buf = noiseBuf) {
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, R() * 1); s.stop(t + dur + 0.05);
    return f;
  }
  function tone(f, t, dur, type, vol, attack = 0.005) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  /* ---------- التأليف ---------- */
  let motif = null, phrase = 0;
  function newMotif() {
    const m = M(), len = 5 + ((R() * 3) | 0), notes = [];
    let deg = 2 + ((R() * 3) | 0);
    const rhythms = [[0, 1, 1.5, 2, 3], [0, 0.5, 1, 2, 2.5, 3], [0, 1.5, 2, 3, 3.5], [0, 1, 2, 2.5, 3, 3.5]];
    const rh = rhythms[(R() * rhythms.length) | 0];
    for (let i = 0; i < Math.min(len, rh.length); i++) {
      deg += [-1, 1, 1, -2, 2, 0][(R() * 6) | 0];
      deg = Math.max(0, Math.min(m.scale.length * 2 - 1, deg));
      notes.push([rh[i], deg]);
    }
    return notes;
  }
  const degToMidi = (m, deg) => m.root + 12 + m.scale[deg % m.scale.length] + 12 * Math.floor(deg / m.scale.length);

  function scheduleBar(t, barIdx) {
    const m = M(), ch = m.prog[barIdx % m.prog.length], bar = SPB * 4;
    // وتريات + باص
    if (barIdx % 2 === 0) { strings(ch.map(x => m.root - 12 + x), t, bar * 2, 0.032 + m.bright * 0.012); bass(m.root - 24 + ch[0], t, bar * 2); }
    // إيد شمال: أربيجو مكسور
    const arp = [0, 2, 1, 3, 2, 1, 0, 2];
    for (let i = 0; i < 8; i++) {
      if (R() < 0.18) continue;
      const n = ch[arp[i] % ch.length];
      piano(m.root - 12 + n + (i >= 4 && R() < 0.3 ? 12 : 0), t + i * SPB / 2, 0.22 + R() * 0.08, 2.2);
    }
    // إيد يمين: جملة لحنية (A A' B A) مع راحة
    const sect = phrase % 4;
    if (!motif || (barIdx % 8 === 0 && R() < 0.5)) motif = newMotif();
    if (barIdx % 2 === 0 && sect !== 3) {
      const shift = sect === 1 ? 1 : sect === 2 ? -2 : 0;
      motif.forEach(([b, d], i) => {
        const dd = Math.max(0, d + shift + (sect === 1 && i === motif.length - 1 ? 1 : 0));
        piano(degToMidi(m, dd), t + b * SPB + (R() - 0.5) * 0.02, 0.33 + R() * 0.1, 3.2);
      });
      phrase++;
    } else if (barIdx % 2 === 0) phrase++;
    // لمعان في الهوا
    if (air) for (let i = 0; i < 4; i++) bell(degToMidi(m, 7 + ((R() * 5) | 0)), t + i * SPB + SPB / 2, 0.035, musicBus, 2.4);
    // أصوات طبيعة على الإيقاع
    ambEvents(t, bar);
  }
  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (nextBeat < now - 0.5) nextBeat = now + 0.05;
    while (nextBeat < now + 0.25) {
      if (beat % 4 === 0 && musicOn) scheduleBar(nextBeat, beat / 4);
      else if (beat % 4 === 0) ambEvents(nextBeat, SPB * 4);
      beat++; nextBeat += SPB;
    }
  }

  /* ---------- أصوات الطبيعة ---------- */
  function setAmbience() {
    if (!ctx) return;
    if (amb) { const a = amb; a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6); setTimeout(() => { try { a.s.stop(); a.lfo.stop(); } catch (e) {} }, 3000); amb = null; }
    const type = inMenu ? 'none' : M().amb;
    if (type === 'none') return;
    const P = { wind: [500, 0.6, 0.5], breeze: [900, 0.5, 0.25], night: [3000, 2, 0.05], waves: [420, 0.4, 0.35], rain: [2600, 0.4, 0.4], birds: [700, 0.6, 0.18], storm: [380, 0.8, 0.85], high: [1200, 0.5, 0.25] }[type];
    const s = ctx.createBufferSource(); s.buffer = pinkBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type === 'rain' ? 'highpass' : 'bandpass'; f.frequency.value = P[0]; f.Q.value = P[1];
    const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(P[2], ctx.currentTime, 1.5);
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = type === 'waves' ? 1 / 7 : 0.11; lg.gain.value = P[0] * (type === 'waves' ? 0.6 : 0.4);
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    if (type === 'waves') { const wg = ctx.createGain(); wg.gain.value = P[2] * 0.8; lfo.connect(wg); wg.connect(g.gain); }
    s.connect(f); f.connect(g); g.connect(ambBus); s.start();
    amb = { s, g, lfo, type };
  }
  function ambEvents(t, bar) {
    if (!amb || !sfxOn) return;
    const type = amb.type;
    if (type === 'night') for (let i = 0; i < 6; i++) if (R() < 0.6) { const tt = t + R() * bar; for (let k = 0; k < 3; k++) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 4200 + R() * 300; g.gain.setValueAtTime(0.0001, tt + k * 0.05); g.gain.exponentialRampToValueAtTime(0.012, tt + k * 0.05 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, tt + k * 0.05 + 0.035); o.connect(g); g.connect(ambBus); o.start(tt + k * 0.05); o.stop(tt + k * 0.05 + 0.05); } }
    if (type === 'birds' || type === 'rain' && R() < 0.3) for (let i = 0; i < 2; i++) if (R() < 0.55) {
      const tt = t + R() * bar, base = 2400 + R() * 1600;
      for (let k = 0; k < 2 + ((R() * 3) | 0); k++) { const o = ctx.createOscillator(), g = ctx.createGain(), s0 = tt + k * 0.11; o.frequency.setValueAtTime(base, s0); o.frequency.exponentialRampToValueAtTime(base * (1.3 + R() * 0.4), s0 + 0.07); g.gain.setValueAtTime(0.0001, s0); g.gain.exponentialRampToValueAtTime(0.02, s0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s0 + 0.09); o.connect(g); g.connect(ambBus); o.start(s0); o.stop(s0 + 0.1); }
    }
    if (type === 'high' && R() < 0.5) bell(M().root + 24 + M().scale[(R() * 5) | 0], t + R() * bar, 0.02, ambBus, 3);
  }

  /* ---------- نغمة من السلم الحالي (للحاجات اللي بتتلم) ---------- */
  function scaleNote(i, oct = 2) { const m = M(), s = m.scale; return m.root + oct * 12 - 12 + s[i % s.length] + 12 * Math.floor(i / s.length); }

  const S = {
    init,
    setMood(i) { const ch = (i % 8) !== mood || inMenu; mood = i % 8; inMenu = false; if (ch) { motif = null; setAmbience(); } },
    setMenu() { if (!inMenu) { inMenu = true; motif = null; setAmbience(); } },
    setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? musicVol * 0.5 : 0, ctx.currentTime, 0.3); },
    setSfx(on) { sfxOn = on; if (sfxBus) { sfxBus.gain.setTargetAtTime(on ? sfxVol * 0.7 : 0, ctx.currentTime, 0.05); ambBus.gain.setTargetAtTime(on ? sfxVol * 0.5 : 0, ctx.currentTime, 0.2); } },
    setVolumes(mv, sv) { musicVol = mv; sfxVol = sv; S.setMusic(musicOn); S.setSfx(sfxOn); },
    setAir(on) { if (on === air || !ctx) return; air = on; if (!paused) musicFilter.frequency.setTargetAtTime(on ? 9000 : 5200, ctx.currentTime, 0.4); },
    setPaused(on) { paused = on; if (ctx) musicFilter.frequency.setTargetAtTime(on ? 500 : 5200, ctx.currentTime, 0.25); },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    play(name, arg) {
      if (!ctx || !sfxOn || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      switch (name) {
        case 'jump': noise(t, 0.16, 0.12, 1800, 0.7); piano(scaleNote(4, 1), t, 0.18, 0.6, sfxBus); break;
        case 'duo': [0, 2, 4, 7].forEach((d, i) => bell(scaleNote(d + 4), t + i * 0.06, 0.09)); break;
        case 'land': noise(t, 0.22, 0.28, 700, 0.6, 'lowpass', sfxBus, pinkBuf); break;
        case 'perfect': bell(scaleNote(7), t, 0.12); bell(scaleNote(9), t + 0.07, 0.09); bell(scaleNote(11), t + 0.14, 0.07); break;
        case 'flip': { const n = Math.min(arg || 1, 5); for (let i = 0; i <= n; i++) piano(scaleNote(5 + i * 2, 2), t + i * 0.07, 0.3, 1.4, sfxBus); break; }
        case 'coin': {
          const now = performance.now(); streak = now - lastPick < 650 ? streak + 1 : 0; lastPick = now;
          bell(scaleNote(5 + (streak % 10)), t, 0.07, sfxBus, 0.9); break;
        }
        case 'heart': bell(scaleNote(4), t, 0.08); bell(scaleNote(6), t + 0.05, 0.07); bell(scaleNote(9), t + 0.1, 0.06); break;
        case 'page': noise(t, 0.25, 0.14, 4200, 0.5); bell(scaleNote(8), t + 0.05, 0.06); break;
        case 'crash': noise(t, 0.6, 0.45, 300, 0.6, 'lowpass', sfxBus, pinkBuf); piano(scaleNote(0, 0), t + 0.05, 0.35, 1.8, sfxBus); piano(scaleNote(1, 0), t + 0.05, 0.25, 1.8, sfxBus); break;
        case 'summon': [0, 2, 4, 6, 8, 11].forEach((d, i) => bell(scaleNote(d + 2), t + i * 0.08, 0.08, sfxBus, 2.2)); noise(t, 0.8, 0.06, 5000, 0.3); break;
        case 'rescue': [0, 4, 7, 9, 11, 14].forEach((d, i) => piano(scaleNote(d, 2), t + i * 0.05, 0.3, 1.6, sfxBus)); break;
        case 'power': [0, 3, 5, 7].forEach((d, i) => bell(scaleNote(d + 5), t + i * 0.06, 0.07)); break;
        case 'bounce': { const o = tone(260, t, 0.4, 'sine', 0.16); o.frequency.exponentialRampToValueAtTime(820, t + 0.3); bell(scaleNote(9), t + 0.1, 0.06); break; }
        case 'twirl': noise(t, 0.35, 0.09, 5200, 0.5); [0, 2, 4].forEach((d, i) => bell(scaleNote(d + 7), t + i * 0.05, 0.05)); break;
        case 'smash': noise(t, 0.35, 0.4, 600, 0.5, 'lowpass', sfxBus, pinkBuf); tone(180, t, 0.2, 'triangle', 0.06); break;
        case 'click': tone(880, t, 0.06, 'sine', 0.07); break;
        case 'ach': [0, 2, 4, 7, 9].forEach((d, i) => bell(scaleNote(d + 3), t + i * 0.09, 0.08, sfxBus, 2)); break;
        case 'text': tone(1300 + R() * 250, t, 0.025, 'sine', 0.025); break;
        case 'goal': [0, 2, 4, 7, 9, 11, 14].forEach((d, i) => piano(scaleNote(d, 2), t + i * 0.1, 0.32, 2.4, sfxBus)); break;
        case 'boost': { noise(t, 0.5, 0.18, 1400, 0.8); const o = tone(200, t, 0.4, 'sawtooth', 0.03); o.frequency.exponentialRampToValueAtTime(900, t + 0.35); break; }
        case 'gift': [0, 4, 2, 7].forEach((d, i) => bell(scaleNote(d + 6), t + i * 0.08, 0.07)); break;
        case 'pigeon': noise(t, 0.4, 0.15, 900, 1.5); [0, 2, 4, 7, 9].forEach((d, i) => bell(scaleNote(d + 4), t + 0.1 + i * 0.07, 0.07)); break;
        case 'thunder': noise(t, 2.6, 0.55, 120, 0.5, 'lowpass', sfxBus, pinkBuf); noise(t + 0.05, 0.4, 0.3, 900, 0.6); break;
        case 'firework': noise(t, 0.08, 0.2, 2000, 0.5); noise(t + 0.25, 0.9, 0.18, 2600, 0.4); bell(scaleNote(9), t + 0.25, 0.04); break;
        case 'wheel': tone(1000 + (arg || 0) * 40, t, 0.04, 'square', 0.03); break;
        case 'levelup': [0, 4, 7, 11, 14].forEach((d, i) => { piano(scaleNote(d, 2), t + i * 0.08, 0.3, 2, sfxBus); bell(scaleNote(d + 7), t + i * 0.08, 0.04); }); break;
        case 'pop': tone(600 + R() * 400, t, 0.12, 'sine', 0.08); break;
      }
    },
    grind(on) {
      if (!ctx) return;
      if (on && !grindNode && sfxOn) {
        const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 2.5;
        const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(0.08, ctx.currentTime, 0.05);
        s.connect(f); f.connect(g); g.connect(sfxBus); s.start();
        grindNode = { s, g };
      } else if (!on && grindNode) {
        const n = grindNode; grindNode = null;
        n.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04); n.s.stop(ctx.currentTime + 0.3);
      }
    },
  };
  return S;
})();
