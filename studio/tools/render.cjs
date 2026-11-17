#!/usr/bin/env node
// يطلّع الفيديو النهائي: node tools/render.cjs <project> [out.mp4]
// نفس كود الرسم بتاع الاستوديو (canvas) فريم بفريم → ffmpeg، فاللي شايفه في المعاينة هو اللي بيطلع.
const path = require('path'), fs = require('fs'), os = require('os');
const { chromium } = require('playwright');
const C = require('./common.cjs');
(async () => {
  const id = process.argv[2] || 'demo', pr = C.loadProject(id);
  const out = path.resolve(process.argv[3] || path.join(pr.dir, 'final.mp4'));
  const px = C.makeProxies(pr), { srv, url } = await C.serve(pr, px);
  const aud = path.join(px.tmp, 'mix.m4a'); C.mixAudio(pr, aud);
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`${url}index.html?p=${id}&manual=1`); await page.evaluate(() => window.__studio.ready);
  const { fps, w, h } = await page.evaluate(() => window.__studio.info()), N = Math.round(pr.D * fps);
  const enc = C.encoder(['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-i', aud,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-vf', `scale=${w}:${h}`, '-c:a', 'copy', '-shortest', '-movflags', '+faststart', out]);
  for (let i = 0; i < N; i++) {
    await enc.write(C.b64(await page.evaluate(t => window.__studio.frame(t), i / fps)));
    if (i % 60 === 0) process.stdout.write(`\rrender ${i}/${N}`);
  }
  enc.p.stdin.end(); await enc.done; await browser.close(); srv.close(); fs.rmSync(px.tmp, { recursive: true, force: true });
  console.log(`\rdone → ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${pr.D.toFixed(1)}s)`);
})().catch(e => { console.error(e); process.exit(1); });
