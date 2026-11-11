'use strict';
/* Smoke test: runs the real js/*.js in a stubbed DOM and renders every screen for every scenario.
   Catches exceptions, wrong star order, retired names, and broken flows. It does not check layout (see tools/screenshots.sh). */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function boot(hash) {
  const els = {};
  const mkEl = (id) => (els[id] = {
    id, innerHTML: '', value: '', textContent: '', listeners: {},
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    getAttribute() { return null; }, removeAttribute() {}, setAttribute() {}
  });
  const store = {};
  const mem = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const handlers = {};
  const ctx = {
    document: { getElementById: (id) => els[id] || mkEl(id), querySelectorAll: () => [], title: '' },
    location: { hash }, history: { replaceState(_a, _b, url) { ctx.location.hash = url; } },
    localStorage: mem, sessionStorage: mem, console,
    scrollTo() {}, addEventListener(t, f) { handlers[t] = f; }
  };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  mkEl('app'); mkEl('scenario'); mkEl('reset');
  for (const f of ['js/db.js', 'js/calc.js', 'js/star.js', 'js/app.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  const go = (h) => { ctx.location.hash = h; handlers.hashchange(); return els.app.innerHTML; };
  const fire = (el, type, ev) => (el.listeners[type] || []).forEach((fn) => fn(ev));
  return { ctx, els, go, fire, app: els.app };
}

const SCREENS = ['connect/1', 'connect/2', 'connect/3', 'connect/4', 'connect/5', 'studio/a', 'studio/b', 'studio/c', 'studio/d', 'database', 'business-case'];
const SCENARIOS = ['elena-retention', 'elena-performance', 'elena-launch'];

test('every screen renders for every scenario without errors or retired names', () => {
  for (const s of SCENARIOS) {
    for (const r of SCREENS) {
      const b = boot('#/' + r + '?s=' + s);
      const html = b.app.innerHTML;
      assert.ok(html.length > 200, `${s} ${r} rendered nothing`);
      assert.doesNotMatch(html, /\b(Sam|Marcus|Peachtree)\b/, `${s} ${r} shows a retired name`);
      assert.doesNotMatch(html, /undefined|NaN|\[object/, `${s} ${r} has broken output`);
    }
  }
});

test('star point order is clockwise from the top on every screen that shows it', () => {
  for (const r of ['connect/2', 'studio/b']) {
    const html = boot('#/' + r + '?s=elena-retention').app.innerHTML;
    const labels = [...html.matchAll(/class="star-label[^"]*"[^>]*>(?:<tspan[^>]*>)?([^<]+)/g)].map((m) => m[1]);
    assert.deepEqual(labels.slice(0, 5), ['Strategy', 'Creative', 'Media', 'Data &amp; Tech', 'Customer']);
  }
});

test('retention scenario lights exactly the three lines from the problem map', () => {
  const html = boot('#/connect/2?s=elena-retention').app.innerHTML;
  assert.equal((html.match(/star-line lit/g) || []).length, 3);
  assert.match(html, /Behavior data decides who gets which retention message\./);
  assert.match(html, /Specialists can do each point\. The value is in the lines\./);
  const perf = boot('#/connect/2?s=elena-performance').app.innerHTML;
  assert.match(perf, /Media × Data|Media × Data/);
});

test('Connect screen 3 shows placeholders, not invented results', () => {
  const html = boot('#/connect/3?s=elena-retention').app.innerHTML;
  assert.match(html, /NERDS/);
  assert.match(html, /\[placeholder\]/);
  assert.match(html, /Not yet verified/);
});

test('comparison table defaults to $480K / $155K / $325K and recalculates on input', () => {
  const b = boot('#/connect/4?s=elena-retention');
  const out = () => b.els['compare-results'].innerHTML;
  assert.match(out(), /\$480K/); assert.match(out(), /\$155K/); assert.match(out(), /\$325K/);
  assert.match(out(), /Estimates based on stated assumptions\./);
  const attrs = { 'data-path': 'connect.fees', 'data-live': 'compare' };
  b.fire(b.app, 'input', { target: { type: 'number', value: '6000000', getAttribute: (n) => attrs[n] || null } });
  assert.doesNotMatch(out(), /\$480K/);
  // fees doubled: duplicated work $360K, disconnected goals $120K (spend scales), others unchanged -> $720K
  assert.match(out(), /\$720K/);
});

test('lead form saves a lead and shows confirmation', () => {
  const b = boot('#/connect/5?s=elena-retention');
  assert.match(b.app.innerHTML, /Talk to a Digitas strategist/);
  const f = { id: 'lead-form', name: { value: 'Elena' }, email: { value: 'elena@example.com' }, company: { value: "Elena's Company" }, preventDefault() {} };
  b.els['lead-error'] = b.els['lead-error'] || { textContent: '' };
  b.fire(b.app, 'submit', { target: f, preventDefault() {} });
  b.ctx.location.hash = '#/connect/5';
  assert.match(b.app.innerHTML, /Thanks, Elena/);
});

test('Studio: logging a referral keeps ownership with the originating agency and appears in the log', () => {
  const b = boot('#/studio/c?s=elena-retention');
  assert.match(b.app.innerHTML, /originating agency keeps its primary client role unless both parties agree otherwise/);
  assert.match(b.app.innerHTML, /\[placeholder\] %/);
  b.fire(b.app, 'click', { target: { closest: () => ({ getAttribute: () => 'log-referral' }) } });
  assert.equal(b.ctx.location.hash, '#/studio/d');
  const html = b.go('#/studio/d');
  assert.match(html, /REF-003/);
  assert.match(html, /James&#39;s agency keeps client ownership/);
  assert.match(html, /Referrals logged/);
});

test('Studio: changing the owner away from the default shows an agreement warning', () => {
  const b = boot('#/studio/c?s=elena-retention');
  const attrs = { 'data-path': 'studio.owner', 'data-live': 'owner' };
  b.fire(b.app, 'input', { target: { type: 'text', value: 'Some other agency', getAttribute: (n) => attrs[n] || null } });
  assert.match(b.els['owner-hint'].innerHTML, /Both agencies must agree/);
});

test('ROI page shows the brief illustration by default', () => {
  const b = boot('#/business-case');
  const out = b.els['roi-out'].innerHTML;
  assert.match(out, /\$255K/); assert.match(out, /0\.98/); assert.match(out, /\$382\.5K/); assert.match(out, /53%/);
  assert.match(b.app.innerHTML, /\$250K/);
});
