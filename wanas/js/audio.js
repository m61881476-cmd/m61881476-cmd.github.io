/* سند و ونس — موسيقى ومؤثرات متولّدة بالكود (WebAudio) */
'use strict';

const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, delay, fb, noiseBuf;
  let musicOn = true, sfxOn = true;
  let musicTimer = null, chordIdx = 0, nextPluck = 0, mood = 0, grindNode = null;

  /* سلالم ومزاج لكل بيئة (درجات بالنسبة لـ C) */
  const MOODS = [
    { root: 62, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]] },   // تلج
    { root: 60, scale: [0, 1, 4, 5, 7, 8], prog: [[0, 4, 7], [1, 5, 8], [0, 4, 7], [-2, 1, 5]] },   // صحرا (حجاز خفيف)
    { root: 57, scale: [0, 3, 5, 7, 10], prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]] }, // مدينة بالليل
    { root: 64, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]] },   // شط
    { root: 59, scale: [0, 2, 3, 7, 8], prog: [[0, 3, 7], [-4, -1, 3], [-7, -3, 0], [-5, -1, 2]] }, // خريف
    { root: 65, scale: [0, 2, 4, 7, 9, 11], prog: [[0, 4, 7, 11], [5, 9, 12], [2, 5, 9], [7, 11, 14]] }, // بنفسج
    { root: 55, scale: [0, 2, 3, 7, 10], prog: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]] },  // شمال
    { root: 67, scale: [0, 2, 4, 7, 9, 11], prog: [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [7, 11, 14]] }, // سحاب
  ];

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.32 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.55 : 0; sfxBus.connect(master);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.36;
    fb = ctx.createGain(); fb.gain.value = 0.38;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2400;
    delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }

  function tone(f, t0, dur, type, vol, bus, attack = 0.005, toDelay = false) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus); if (toDelay) g.connect(delay);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  function noise(t0, dur, vol, freq, q = 1, type = 'bandpass') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t0); s.stop(t0 + dur + 0.05);
  }

  /* ---------- الموسيقى ---------- */
  function pad(notes, t0, dur) {
    notes.forEach(n => {
      [-6, 6].forEach(det => {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = hz(n); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.value = 900;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.05, t0 + 1.4);
        g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 1.2);
        o.connect(f); f.connect(g); g.connect(musicBus);
        o.start(t0); o.stop(t0 + dur + 1.4);
      });
    });
  }
  function startMusic() {
    if (musicTimer) return;
    let nextChord = ctx.currentTime + 0.1;
    nextPluck = ctx.currentTime + 1;
    musicTimer = setInterval(() => {
      if (!ctx || ctx.state !== 'running' || !musicOn) return;
      const m = MOODS[mood % MOODS.length], now = ctx.currentTime;
      if (nextChord < now + 0.5) {
        const ch = m.prog[chordIdx % m.prog.length];
        pad(ch.map(x => m.root - 12 + x), nextChord, 4.2);
        tone(hz(m.root - 24 + ch[0]), nextChord, 3.8, 'sine', 0.07, musicBus, 0.6);
        chordIdx++; nextChord += 4;
      }
      while (nextPluck < now + 0.5) {
        const sc = m.scale, oct = Math.random() < 0.3 ? 12 : 0;
        const n = m.root + sc[(Math.random() * sc.length) | 0] + oct;
        tone(hz(n), nextPluck, 1.4, 'triangle', 0.045 + Math.random() * 0.03, musicBus, 0.01, true);
        nextPluck += [0.5, 0.75, 1, 1.5][(Math.random() * 4) | 0];
      }
    }, 200);
  }

  const S = {
    init,
    setMood(i) { mood = i; },
    setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.3); },
    setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.05); },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    play(name, arg) {
      if (!ctx || !sfxOn || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      switch (name) {
        case 'jump': tone(380, t, 0.18, 'sine', 0.18, sfxBus); tone(620, t + 0.04, 0.16, 'sine', 0.1, sfxBus); noise(t, 0.12, 0.12, 2500, 0.8); break;
        case 'duo': [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.05, 0.4, 'triangle', 0.13, sfxBus)); break;
        case 'land': noise(t, 0.16, 0.25, 900, 0.7); tone(120, t, 0.12, 'sine', 0.15, sfxBus); break;
        case 'perfect': tone(1046, t, 0.3, 'sine', 0.12, sfxBus); tone(1568, t + 0.06, 0.35, 'sine', 0.09, sfxBus); break;
        case 'flip': { const n = Math.min(arg || 1, 4); for (let i = 0; i <= n; i++) tone(hz(72 + [0, 4, 7, 12, 16][i]), t + i * 0.06, 0.3, 'triangle', 0.12, sfxBus); break; }
        case 'coin': tone(1318, t, 0.09, 'square', 0.04, sfxBus); tone(1760, t + 0.05, 0.14, 'square', 0.035, sfxBus); break;
        case 'heart': tone(880, t, 0.25, 'sine', 0.12, sfxBus); tone(1108, t + 0.07, 0.3, 'sine', 0.1, sfxBus); break;
        case 'page': noise(t, 0.2, 0.18, 4000, 0.5); tone(990, t, 0.2, 'triangle', 0.08, sfxBus); break;
        case 'crash': noise(t, 0.5, 0.45, 400, 0.6); tone(160, t, 0.4, 'sawtooth', 0.08, sfxBus); tone(90, t + 0.1, 0.4, 'sine', 0.15, sfxBus); break;
        case 'summon': [0, 4, 7, 11, 14, 19].forEach((x, i) => tone(hz(67 + x), t + i * 0.07, 0.7, 'sine', 0.1, sfxBus)); break;
        case 'rescue': [0, 7, 12, 16, 19, 24].forEach((x, i) => tone(hz(64 + x), t + i * 0.05, 0.6, 'triangle', 0.1, sfxBus)); noise(t, 0.4, 0.12, 3000, 0.4); break;
        case 'power': [0, 5, 9, 12].forEach((x, i) => tone(hz(70 + x), t + i * 0.06, 0.35, 'square', 0.05, sfxBus)); break;
        case 'bounce': { const o = tone(300, t, 0.35, 'sine', 0.2, sfxBus); o.frequency.exponentialRampToValueAtTime(900, t + 0.25); break; }
        case 'twirl': { const o = tone(600, t, 0.3, 'triangle', 0.1, sfxBus); o.frequency.exponentialRampToValueAtTime(1400, t + 0.25); noise(t, 0.25, 0.08, 5000, 0.5); break; }
        case 'smash': noise(t, 0.3, 0.4, 700, 0.5); tone(220, t, 0.2, 'square', 0.06, sfxBus); break;
        case 'click': tone(700, t, 0.06, 'sine', 0.1, sfxBus); break;
        case 'ach': [0, 4, 7, 12].forEach((x, i) => tone(hz(76 + x), t + i * 0.09, 0.5, 'triangle', 0.1, sfxBus)); break;
        case 'text': tone(1200 + Math.random() * 300, t, 0.03, 'sine', 0.03, sfxBus); break;
        case 'goal': [0, 4, 7, 12, 16].forEach((x, i) => tone(hz(72 + x), t + i * 0.1, 0.8, 'triangle', 0.11, sfxBus)); break;
      }
    },
    grind(on) {
      if (!ctx) return;
      if (on && !grindNode && sfxOn) {
        const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 3;
        const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(0.12, ctx.currentTime, 0.05);
        s.connect(f); f.connect(g); g.connect(sfxBus); s.start();
        grindNode = { s, g };
      } else if (!on && grindNode) {
        const n = grindNode; grindNode = null;
        n.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
        n.s.stop(ctx.currentTime + 0.3);
      }
    },
  };
  return S;
})();
