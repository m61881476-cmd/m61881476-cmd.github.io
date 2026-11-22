// اختبار محرّك مكوك: الحل لازم يبقى قابل للتنفيذ وأحسن من كل خطط "كل مدير لوحده"
const M = require('../makkouk/engine.js');
let fail = 0;
for (const seed of [7, 11, 23]) {
  const S = M.defaultScenario(seed, 100);
  const bs = M.baselinePlans(S);
  const { result: r } = M.solve(S, { iters: 20000, chains: 3, seed: 1 });
  const ok = r.feasible && bs.every(b => !b.result.feasible);
  console.log(seed, ok ? 'OK' : 'FAIL', 'profit', Math.round(r.profit), 'setups', r.setups);
  if (!ok) fail++;
}
process.exit(fail ? 1 : 0);
