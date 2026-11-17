#!/usr/bin/env node
// يسجّل «كواليس المونتاج» (الوكلاء وهم شغّالين ثم النتيجة): node tools/record.cjs <project> [--layout p|l] [--fps 30] [--out file.mp4]
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const C = require('./common.cjs');
(async () => {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv.splice(i, 2)[1] : null; };
  const layout = (opt('layout') || 'p').toLowerCase(), fps = +(opt('fps') || 30), outArg = opt('out');
  const id = argv[0] || 'demo', pr = C.loadProject(id);
  const out = path.resolve(outArg || path.join(C.ROOT, 'out', `${id}-making-of.mp4`)); fs.mkdirSync(path.dirname(out), { recursive: true });
  const px = C.makeProxies(pr), { srv, url } = await C.serve(pr, px);
  const aud = path.join(px.tmp, 'mix.m4a'); C.mixAudio(pr, aud);
  const vp = layout === 'p' ? { width: 900, height: 1600 } : { width: 1600, height: 900 };
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1.2 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`${url}index.html?p=${id}&manual=1&layout=${layout}`); await page.evaluate(() => window.__studio.ready);
  const info = await page.evaluate(() => window.__studio.info()), N = Math.round(info.total * fps);
  const delay = Math.round(info.play0 * 1000);
  const enc = C.encoder(['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', aud,
    '-filter_complex', `[1:a]adelay=${delay}:all=1,apad[a]`, '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]);
  for (let i = 0; i < N; i++) {
    await page.evaluate(t => window.__studio.show(t), i / fps);
    await enc.write(await page.screenshot({ type: 'jpeg', quality: 92 }));
    if (i % 30 === 0) process.stdout.write(`\rrecord ${i}/${N}`);
  }
  enc.p.stdin.end(); await enc.done; await browser.close(); srv.close(); fs.rmSync(px.tmp, { recursive: true, force: true });
  console.log(`\rdone → ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${info.total.toFixed(1)}s)`);
})().catch(e => { console.error(e); process.exit(1); });
