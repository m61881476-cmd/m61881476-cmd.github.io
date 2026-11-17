// أدوات مشتركة: سيرفر محلي + نسخ proxy للمتصفح + ميكس الصوت النهائي
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
const { spawnSync, spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const sh = (cmd, args, opt = {}) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opt }); if (r.status !== 0) throw new Error(`${cmd} failed:\n${(r.stderr || '').slice(-1500)}`); return r.stdout; };
const hasAudio = f => sh('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', f]).trim() !== '';
const isImage = f => /\.(jpe?g|png|webp|gif)$/i.test(f);

function loadProject(id) {
  const dir = path.join(ROOT, 'projects', id);
  const P = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
  let t = 0;
  const segs = P.segments.map(s => { const a = s.in || 0, dur = s.out != null ? s.out - a : (s.dur || 2), g = { ...s, in: a, dur, t0: t }; t += dur; return g; });
  return { id, dir, P, segs, D: t, fmt: { w: 1080, h: 1920, fps: 30, ...(P.format || {}) } };
}

// الكروميوم هنا مش بيشغّل H.264/AAC، فبنعمل نسخ WebM كل فريم فيها keyframe (seek سريع ودقيق)
function makeProxies(pr) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-proxy-')), map = {};
  const files = Object.values(pr.P.sources).map(s => s.file); if (pr.P.music) files.push(pr.P.music.file);
  for (const f of new Set(files)) {
    if (isImage(f)) continue;
    const src = path.join(pr.dir, f), out = path.join(tmp, f.replace(/[^\w.]/g, '_') + '.webm');
    const video = sh('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=index', '-of', 'csv=p=0', src]).trim() !== '';
    const args = ['-v', 'error', '-y', '-i', src];
    if (video) args.push('-vf', `scale=-2:'min(${pr.fmt.h},ih)',fps=${pr.fmt.fps}`, '-c:v', 'libvpx', '-g', '1', '-b:v', '12M', '-crf', '6', '-deadline', 'realtime', '-cpu-used', '6'); else args.push('-vn');
    if (hasAudio(src)) args.push('-c:a', 'libopus', '-b:a', '96k'); else args.push('-an');
    sh('ffmpeg', [...args, out]); map[f] = out;
  }
  return { tmp, map };
}

function serve(pr, proxies) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.webm': 'video/webm', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    let file = path.join(ROOT, rel); if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    const pfx = `projects/${pr.id}/`;
    if (rel.startsWith(pfx) && proxies.map[rel.slice(pfx.length)]) file = proxies.map[rel.slice(pfx.length)];
    fs.stat(file, (e, st) => {
      if (e || !st.isFile()) { res.writeHead(404); return res.end(); }
      const h = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
      if (m) { const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1; res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Content-Length': b - a + 1 }); fs.createReadStream(file, { start: a, end: b }).pipe(res); }
      else { res.writeHead(200, { ...h, 'Content-Length': st.size }); fs.createReadStream(file).pipe(res); }
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, url: `http://127.0.0.1:${srv.address().port}/` })));
}

// ميكس الصوت: صوت كل قصّة بالترتيب + الموسيقى → ملف واحد
function mixAudio(pr, out) {
  const { P, segs, D } = pr, inputs = [], parts = []; let n = 0;
  const idx = {};
  segs.forEach((s, i) => {
    const f = path.join(pr.dir, P.sources[s.src].file);
    const ok = !isImage(f) && !s.mute && P.sources[s.src].audio !== false && hasAudio(f);
    if (ok) { if (idx[f] == null) { idx[f] = n++; inputs.push('-i', f); }
      parts.push(`[${idx[f]}:a]atrim=${s.in}:${s.in + s.dur},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=${s.volume ?? 1},afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, s.dur - .02)}:d=0.02,apad=whole_dur=${s.dur},atrim=0:${s.dur}[a${i}]`); }
    else parts.push(`anullsrc=r=48000:cl=stereo,atrim=0:${s.dur}[a${i}]`);
  });
  let g = parts.join(';') + ';' + segs.map((_, i) => `[a${i}]`).join('') + `concat=n=${segs.length}:v=0:a=1[voice]`;
  if (P.music) {
    inputs.push('-stream_loop', '-1', '-i', path.join(pr.dir, P.music.file));
    g += `;[${n}:a]atrim=${P.music.start || 0}:${(P.music.start || 0) + D},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,volume=${P.music.volume ?? .25},afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, D - 1.2)}:d=1.2[mus];[voice][mus]amix=inputs=2:normalize=0,alimiter=limit=0.95[out]`;
  } else g += ';[voice]anull[out]';
  sh('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', g, '-map', '[out]', '-t', String(D), '-c:a', 'aac', '-b:a', '160k', out]);
}

function encoder(args) { const p = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] }); const done = new Promise((res, rej) => p.on('close', c => c ? rej(new Error('ffmpeg exit ' + c)) : res())); return { p, done, write: buf => new Promise(r => p.stdin.write(buf) ? r() : p.stdin.once('drain', r)) }; }
const b64 = d => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
module.exports = { ROOT, sh, loadProject, makeProxies, serve, mixAudio, encoder, b64 };
