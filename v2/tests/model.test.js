/* v2 model tests. Run from the repository root: node --test v2/tests/model.test.js */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const D = require('../data/v2-data.js');
const M = require('../js/model.js');

const elena = () => JSON.parse(JSON.stringify(D.presets.find((p) => p.id === 'elena')));
const fast = { n: 3000 };

test('data integrity: every need maps to a known group or to a specialist', () => {
  const ids = D.points.map((p) => p.id);
  D.needs.forEach((n) => assert.ok(n.point === null || ids.includes(n.point), n.id));
  D.industries.forEach((ind) => {
    ind.suggested.forEach((s) => assert.ok(D.needs.some((n) => n.id === s), ind.id + ' suggests ' + s));
    ids.forEach((p) => assert.ok(ind.pivots[p], ind.id + ' pivot for ' + p));
  });
  D.params.forEach((p) => assert.ok(p.tri[0] <= p.tri[1] && p.tri[1] <= p.tri[2], p.id));
  D.challenges.forEach((c) => c.lines.forEach((pr) => assert.ok(ids.includes(pr[0]) && ids.includes(pr[1]))));
  assert.strictEqual(D.lines.length, 10);
});

test('structure: Elena has 6 needs, Digitas covers 5, so 6 partners become 2', () => {
  const st = M.structure(elena(), D);
  assert.strictEqual(st.k, 6);
  assert.strictEqual(st.c, 5);
  assert.strictEqual(st.nConn, 2);
  assert.strictEqual(st.linesToday, 15);
  assert.strictEqual(st.linesOwned, 10);
  assert.ok(Math.abs(st.budget - 250000000 * 0.077) < 1);
});

test('honesty: one need, or one covered need, means no savings', () => {
  const a = elena(); a.needs = ['crm'];
  assert.strictEqual(M.simulate(a, D, fast).savings.hi, 0);
  const b = elena(); b.needs = ['crm', 'pr', 'local'];
  assert.strictEqual(M.simulate(b, D, fast).savings.hi, 0);
});

test('seeded: same inputs give the same numbers', () => {
  assert.strictEqual(M.simulate(elena(), D, fast).savings.p50, M.simulate(elena(), D, fast).savings.p50);
});

test('direction: more covered needs, bigger budget and worse sharing all raise savings', () => {
  const few = elena(); few.needs = ['brand', 'paid', 'crm'];
  const many = elena(); many.needs = ['brand', 'paid', 'crm', 'social', 'ecom'];
  assert.ok(M.simulate(many, D, fast).savings.p50 > M.simulate(few, D, fast).savings.p50);
  const big = elena(); big.revenue *= 2;
  assert.ok(M.simulate(big, D, fast).savings.p50 > M.simulate(elena(), D, fast).savings.p50);
  const bad = elena(); bad.sharing = 1; const good = elena(); good.sharing = 5;
  assert.ok(M.simulate(bad, D, fast).savings.p50 > M.simulate(good, D, fast).savings.p50);
});

test('range: low < median < high, savings below today\'s cost, year one below a full year', () => {
  const r = M.simulate(elena(), D);
  assert.strictEqual(r.n, 10000);
  assert.ok(r.savings.lo < r.savings.p50 && r.savings.p50 < r.savings.hi);
  assert.ok(r.savings.hi < r.today.hi);
  assert.ok(r.year1.p50 < r.savings.p50);
  // Sanity band for the demo: savings a small share of a ~$19M budget.
  assert.ok(r.savings.p50 / r.structure.budget > 0.005 && r.savings.p50 / r.structure.budget < 0.06);
});

test('attribution: the star points and lines add up to the headline savings', () => {
  const r = M.simulate(elena(), D, fast);
  let sum = 0;
  Object.values(r.attribution.points).forEach((p) => { sum += p.savings; });
  Object.values(r.attribution.lines).forEach((l) => { sum += l.savings; });
  assert.ok(Math.abs(sum - r.savings.p50) < 1);
});

test('breakdown: the six costs add up to the headline today and savings', () => {
  const r = M.simulate(elena(), D, fast);
  const t = r.breakdown.reduce((a, b) => a + b.today, 0), s = r.breakdown.reduce((a, b) => a + b.savings, 0);
  assert.ok(Math.abs(t - r.today.p50) < 1);
  assert.ok(Math.abs(s - r.savings.p50) < 1);
  r.breakdown.forEach((b) => assert.ok(b.savings <= b.today + 1e-6 && b.savings >= 0, b.id));
});

test('calibration: Digitas data narrows the range', () => {
  const ov = {};
  Object.keys(D.calibration.params).forEach((k) => { ov[k] = D.calibration.params[k].tri; });
  const pub = M.simulate(elena(), D, fast), cal = M.simulate(elena(), D, Object.assign({ overrides: ov }, fast));
  assert.ok(cal.savings.hi - cal.savings.lo < pub.savings.hi - pub.savings.lo);
});

test('any company: every industry with its common needs gives a sane range', () => {
  D.industries.forEach((ind) => {
    [1e6, 2e7, 4e8].forEach((budget) => {
      const inp = Object.assign({}, D.blankInputs, { industry: ind.id, budgetMode: 'budget', budget, needs: ind.suggested });
      const r = M.simulate(inp, D, { n: 1000 });
      assert.ok(Number.isFinite(r.savings.p50) && r.savings.lo >= 0, ind.id + ' ' + budget);
      assert.ok(r.savings.hi <= r.today.hi, ind.id + ' savings below today');
      assert.ok(r.savings.p50 / budget < 0.1, ind.id + ' ' + budget + ' under 10% of budget');
    });
  });
});

test('every example preset runs and stays under 10% of its budget', () => {
  D.presets.forEach((p) => {
    const r = M.simulate(Object.assign({}, D.blankInputs, p), D, fast);
    assert.ok(r.structure.budget > 0 && r.structure.k > 0, p.id);
    assert.ok(r.savings.p50 / r.structure.budget < 0.1, p.id);
  });
});

test('blank inputs give zero, not an error', () => {
  const r = M.simulate(D.blankInputs, D, fast);
  assert.strictEqual(r.structure.budget, 0);
  assert.strictEqual(r.savings.hi, 0);
});

test('own numbers replace averages and narrow the range', () => {
  const avg = M.simulate(elena(), D, fast);
  const own = elena(); own.own = { mgmtWeekly: 4, hourly: 85, tenure: 5 };
  const r = M.simulate(own, D, fast);
  assert.deepStrictEqual(r.params.find((p) => p.id === 'mgmtHours').tri, [208, 208, 208]);
  assert.ok(r.params.find((p) => p.id === 'tenure').own);
  assert.strictEqual(r.structure.ownHourly, 85);
  const rel = (s) => (s.hi - s.lo) / s.p50; // width relative to the median: own numbers remove uncertainty
  assert.ok(rel(r.savings) < rel(avg.savings));
  assert.ok(!r.drivers.some((d) => d.id === 'mgmtHours' || d.id === 'tenure'));
});

test('own marketing share of revenue replaces 7.7%', () => {
  const a = elena(); a.mktShare = 0.12;
  assert.ok(Math.abs(M.budgetOf(a, D) - 250000000 * 0.12) < 1);
  const b = elena(); b.mktShare = null;
  assert.ok(Math.abs(M.budgetOf(b, D) - 250000000 * 0.077) < 1);
});

test('small budgets scale hours per partner down', () => {
  const small = Object.assign({}, D.blankInputs, { budgetMode: 'budget', budget: 1000000, needs: ['brand', 'paid', 'search', 'crm'] });
  const big = Object.assign({}, small, { budget: 50000000 });
  assert.strictEqual(M.structure(small, D).hoursScale, D.fixed.hoursReferencePerPartner.min);
  assert.strictEqual(M.structure(big, D).hoursScale, 1);
});

test('triangular sampler stays inside its bounds', () => {
  const rnd = M.mulberry32(7);
  for (let i = 0; i < 2000; i++) {
    const v = M.triangular(rnd(), [1, 2, 5]);
    assert.ok(v >= 1 && v <= 5);
  }
});

test('fragmentation: equal agencies give (k-1)/k; a big Digitas team plus one specialist is far less fragmented', () => {
  const st = M.structure(elena(), D); // 6 needs, Digitas covers 5, PR stays with a specialist
  assert.ok(Math.abs(st.fragToday - 5 / 6) < 1e-9);
  assert.ok(Math.abs(st.fragConn - 10 / 36) < 1e-9);
  const none = elena(); none.needs = ['crm', 'pr', 'local'];
  const s2 = M.structure(none, D);
  assert.ok(Math.abs(s2.fragConn - s2.fragToday) < 1e-9, 'one covered need changes nothing');
});
