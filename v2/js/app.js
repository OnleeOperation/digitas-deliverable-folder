/* Digitas Connect v2: screens, routing and events.
   Public side (Digitas Connect), for any company:
     1 Company (who you are, how big) -> 2 Marketing (what you need, one partner per need) -> 3 How it runs (sharing, goal, own numbers)
     -> 4 Results -> 5 Share your interest.
   A live "What the model will use" panel on steps 1-3 shows every value the estimate runs on and where it comes from.
   Private side (Digitas Connect Studio): Inbox -> Calibrate -> Team & pitch -> Outcome & data.
   Behind the scenes: the model and the open team decisions.
   Routes: #/connect/1..5  #/studio/a..d  #/model  #/decisions */
(function () {
  'use strict';
  var D = window.DCV2_DATA, M = window.DCModel, Star = window.DCStar2, Charts = window.DCCharts;
  var app = document.getElementById('app');

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function money(n) {
    var a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 999500) { var m = a / 1e6; return s + '$' + (m >= 10 ? m.toFixed(1) : m.toFixed(2)).replace(/\.?0+$/, '') + 'M'; }
    if (a >= 1000) return s + '$' + Math.round(a / 1000) + 'K';
    return s + '$' + Math.round(a);
  }
  function int(n) { return Math.round(n).toLocaleString('en-US'); }
  function pct(x, d) { return (x * 100).toFixed(d == null ? 0 : d).replace(/\.0+$/, '') + '%'; }
  function digits(s) { var v = String(s || '').replace(/[^0-9.]/g, ''); return v ? Math.round(parseFloat(v)) : 0; }
  function num(s) { var v = parseFloat(String(s || '').replace(/[^0-9.]/g, '')); return isFinite(v) && v > 0 ? v : null; }
  function store(k, v) { try { if (v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ } }
  function load(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function sstore(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function sload(k) { try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function today() { return new Date().toISOString().slice(0, 10); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  var PT = {}; D.points.forEach(function (p) { PT[p.id] = p; });
  function lineOf(key) { for (var i = 0; i < D.lines.length; i++) if (D.lines[i].a + '-' + D.lines[i].b === key) return D.lines[i]; return null; }
  function lineName(l) { return PT[l.a].name + ' × ' + PT[l.b].name; }
  function industry(id) { return byId(D.industries, id) || D.industries[0]; }
  /* If no goal is chosen, highlight a sensible default for the industry (shown as "not chosen" in the panel). */
  var GOAL_DEFAULT = { tech: 'leads', industrial: 'leads', retail: 'growth', finance: 'prove', travel: 'retention', telecom: 'retention' };
  function challengeOf(inp) { return byId(D.challenges, inp.challenge) || byId(D.challenges, GOAL_DEFAULT[inp.industry]) || D.challenges[0]; }
  var ROLE = { creative: 'Creative director', media: 'Media lead', commerce: 'Commerce lead', social: 'Social lead', crm: 'CRM & loyalty lead' };
  function statusTag(st) {
    if (st === 'sourced') return '<span class="tag good">Sourced</span>';
    if (st === 'team') return '<span class="tag team">Team estimate</span>';
    if (st === 'own') return '<span class="tag you">Your number</span>';
    return '<span class="tag warn">Placeholder</span>';
  }
  /* Client-facing status: plain words, no team notes. */
  function publicTag(st) {
    if (st === 'sourced') return '<span class="tag good">Published source</span>';
    if (st === 'own') return '<span class="tag you">Your figure</span>';
    if (st === 'team') return '<span class="tag team">Estimate</span>';
    return '<span class="tag warn">Being confirmed</span>';
  }
  function fmtParam(p, v) {
    if (p.unit === 'usd') return money(v);
    if (p.unit === 'pct') return pct(v, v < 0.1 ? 1 : 0);
    if (p.unit === 'x') return v.toFixed(2) + '×';
    if (p.unit === 'years') return (Math.round(v * 10) / 10) + ' yrs';
    return int(v) + ' h';
  }
  function param(id) { return byId(D.params, id); }

  /* ---------- state ---------- */
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function freshInputs(pid) {
    var base = clone(D.blankInputs), p = pid ? byId(D.presets, pid) : null;
    if (p) ['company', 'industry', 'budgetMode', 'budget', 'revenue', 'challenge', 'status', 'sharing', 'needs'].forEach(function (k) { base[k] = clone(p[k]); });
    return base;
  }
  function freshState(pid) {
    return { preset: pid || null, inp: freshInputs(pid), sel: null,
             share: { name: '', email: '', role: '', cShare: false, cContact: false, error: '' }, sent: null,
             studio: { reportId: null, sel: null, logged: null } };
  }
  var SKEY = 'dc2.state.v3';
  var state = sload(SKEY);
  if (!state || !state.inp || !state.studio || !state.inp.own) state = freshState();
  function save() { sstore(SKEY, state); }

  /* Simulation cache: same inputs, same result (the model is seeded too). */
  var cache = {};
  function sim(inp, cal) {
    var key = JSON.stringify([inp.industry, inp.budgetMode, inp.budget, inp.revenue, inp.mktShare, (inp.needs || []).slice().sort(), inp.sharing, inp.status, inp.own || {}, !!cal]);
    if (!cache[key]) {
      var ov = null;
      if (cal) { ov = {}; Object.keys(D.calibration.params).forEach(function (k) { ov[k] = D.calibration.params[k].tri; }); }
      cache[key] = M.simulate(inp, D, ov ? { overrides: ov } : {});
      cache[key].sorted = Float64Array.from(cache[key].raw.savings).sort();
    }
    return cache[key];
  }

  /* Reports shared from Connect (this browser) + labeled seed examples. */
  function reports() {
    var mine = load('dc2.reports') || [];
    var stages = load('dc2.stages') || {};
    return mine.concat(D.inboxSeed).map(function (r) { var c = clone(r); if (stages[c.id]) c.stage = stages[c.id]; return c; });
  }
  function currentReport() {
    var all = reports();
    return byId(all, state.studio.reportId) || all[0];
  }

  /* ---------- routing ---------- */
  var CJ = [['Company', 'connect/1'], ['Services', 'connect/2'], ['Details', 'connect/3'], ['Results', 'connect/4'], ['Contact', 'connect/5']];
  var SJ = [['Inbox', 'studio/a'], ['Calibrate', 'studio/b'], ['Team & pitch', 'studio/c'], ['Outcome & data', 'studio/d']];
  var BJ = [['The model', 'model'], ['Open decisions', 'decisions']];
  var current = { key: '', cur: '' };

  function route() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var p = raw.split('?')[0].split('/').filter(Boolean);
    var area = p[0] || 'connect', key, cur;
    if (area === 'connect') { var n = Math.min(5, Math.max(1, parseInt(p[1], 10) || 1)); key = 'connect' + n; cur = 'connect/' + n; }
    else if (area === 'studio') { var k = ['a', 'b', 'c', 'd'].indexOf(p[1]) === -1 ? 'a' : p[1]; key = 'studio' + k; cur = 'studio/' + k; }
    else if (area === 'model' || area === 'decisions') { key = area; cur = area; }
    else { location.hash = '#/connect/1'; return; }
    current = { key: key, cur: cur };
    render(true);
  }
  function render(top) {
    var area = current.cur.split('/')[0];
    area = (area === 'model' || area === 'decisions') ? 'reference' : area;
    document.querySelectorAll('[data-area]').forEach(function (a) {
      if (a.getAttribute('data-area') === area) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var y = window.scrollY;
    Charts.reset();
    app.innerHTML = SCREENS[current.key]();
    Charts.hydrate(app);
    window.scrollTo(0, top ? 0 : y);
    document.title = 'Digitas Connect v2 · ' + current.key;
    syncPreset();
  }

  function journey(steps, cur, letters) {
    return '<ol class="journey" aria-label="Progress">' + steps.map(function (s, i) {
      var cls = i < cur ? 'done' : i === cur ? 'now' : '';
      return '<li class="' + cls + '" data-n="' + (letters ? String.fromCharCode(65 + i) : '0' + (i + 1)) + '"' + (i === cur ? ' aria-current="step"' : '') + '><a href="#/' + s[1] + '">' + esc(s[0]) + '</a></li>';
    }).join('') + '</ol>';
  }
  /* Page head in the digitas.com pattern: optional eyebrow, a large serif headline on the left, body copy on the right. */
  function head(o) {
    return '<header class="page-head">' + (o.steps ? journey(o.steps, o.cur, o.letters) : '') +
      (o.viewer ? '<p class="viewer">' + o.viewer + '</p>' : '') +
      '<div class="ph-grid' + (o.lede ? '' : ' solo') + '"><div>' + (o.eyebrow ? '<p class="eyebrow">' + o.eyebrow + '</p>' : '') + '<h1>' + o.title + '</h1></div>' +
      (o.lede ? '<div class="lede">' + o.lede + '</div>' : '') + '</div></header>';
  }
  var VIEW_CLIENT = null; // the public side reads like a website, without a viewer label
  var VIEW_STUDIO = 'Private · Digitas only · James, senior leader at Digitas';

  /* ---------- shared pieces ---------- */
  function coveredMap(st) { var m = {}; D.points.forEach(function (p) { m[p.id] = st.perPoint[p.id].length; }); return m; }
  function casesFor(points, chId) {
    var hits = D.cases.filter(function (c) { return c.points.some(function (p) { return points.indexOf(p) !== -1; }); });
    hits.sort(function (a, b) { return (b.challenges.indexOf(chId) !== -1) - (a.challenges.indexOf(chId) !== -1); });
    return hits;
  }
  function nav(back, next, label, disabled, why) {
    return '<div class="actions">' + (back ? '<a class="btn ghost" href="' + back + '">Back</a>' : '') +
      (next ? '<a class="btn" href="' + next + '"' + (disabled ? ' aria-disabled="true" tabindex="-1"' : '') + '>' + label + '</a>' : '') +
      (disabled && why ? '<span class="hint" style="margin:0">' + esc(why) + '</span>' : '') + '</div>';
  }

  /* One question: number, title, one plain sentence of help, then the field. */
  function q(n, title, help, body, opt) {
    return '<section class="q"><div class="qh"><span class="qn">' + (n < 10 ? '0' + n : n) + '</span><div><h2>' + title + (opt ? ' <span class="opt">Optional</span>' : '') + '</h2>' +
      (help ? '<p class="qhelp">' + help + '</p>' : '') + '</div></div><div class="qb">' + body + '</div></section>';
  }

  /* ---------- the summary panel beside the questions ---------- */
  function ledger() {
    var i = state.inp, st = M.structure(i, D), ind = industry(i.industry);
    function row(label, value, note) {
      return '<div class="lrow"><div class="lk">' + label + '</div><div class="lv">' + value + '</div>' + (note ? '<div class="ln">' + note + '</div>' : '') + '</div>';
    }
    var none = function (t) { return '<span class="muted">' + t + '</span>'; };
    return '<h2>Your summary</h2>' +
      row('Company', esc(i.company || 'Your company'), esc(ind.label)) +
      row('Marketing budget', st.budget ? money(st.budget) + ' a year' : none('Not set yet'),
        st.budget && i.budgetMode === 'revenue' ? 'Estimated at ' + pct(st.mktShare, 1) + ' of revenue' : '') +
      row('Agencies today', st.k ? st.k : none('Choose your services'), st.k ? 'One per service' : '') +
      row('With Digitas', st.k ? (st.c ? '1 team' : 'No change') + (st.u ? ' + ' + plural(st.u, 'specialist') : '') : none('–'),
        st.k ? 'Digitas covers ' + st.c + ' of your ' + plural(st.k, 'service') : '') +
      row('Main goal', i.challenge ? esc(challengeOf(i).label) : none('Not chosen yet')) +
      (st.k ? Star.render({ covered: coveredMap(st), mini: true }) : '') +
      '<p class="fine">Anything you don\'t tell us is filled in with industry averages. You can review them on the results page.</p>';
  }
  function refreshLive() {
    var l = document.getElementById('ledger'); if (l) l.innerHTML = ledger();
    var h = document.getElementById('budget-hint'); if (h) h.innerHTML = budgetHint();
    var n1 = document.getElementById('nav1'); if (n1) n1.innerHTML = nav1();
    var n2 = document.getElementById('nav2'); if (n2) n2.innerHTML = nav2();
  }
  function inputsLayout(main) {
    return '<div class="grid-main"><div class="qs">' + main + '</div><aside class="panel sticky ledger" id="ledger" aria-live="polite">' + ledger() + '</aside></div>';
  }

  /* =================== DIGITAS CONNECT (public) =================== */
  var SCREENS = {};

  /* Step 1: the company. */
  SCREENS.connect1 = function () {
    var i = state.inp;
    var size = i.budgetMode === 'revenue'
      ? '<div class="fields-2"><div class="field"><label for="revenue">Annual revenue</label><div class="money"><input id="revenue" type="text" inputmode="numeric" data-k="revenue" value="' + (i.revenue ? esc(int(i.revenue)) : '') + '" placeholder="250,000,000" aria-describedby="budget-hint"></div></div>' +
        '<div class="field"><label for="mktShare">Share spent on marketing <span class="lopt">optional</span></label><div class="pctf"><input id="mktShare" type="text" inputmode="decimal" data-k="mktShare" value="' + (+i.mktShare > 0 ? esc(+(i.mktShare * 100).toFixed(2)) : '') + '" placeholder="7.7"></div></div></div>'
      : '<div class="field"><label for="budget">Annual marketing budget</label><div class="money"><input id="budget" type="text" inputmode="numeric" data-k="budget" value="' + (i.budget ? esc(int(i.budget)) : '') + '" placeholder="20,000,000" aria-describedby="budget-hint"></div></div>';
    return head({ steps: CJ, cur: 0, title: 'What do separate agencies really cost you?',
                  lede: 'Every extra agency adds briefs, handoffs and data that does not connect. Answer a few questions and we estimate that hidden cost, and what one connected Digitas team could save. About two minutes; nothing is shared unless you choose to.' }) +
      inputsLayout(
        q(1, 'Company name', '', '<input id="company" type="text" data-k="company" value="' + esc(i.company) + '" placeholder="Company name" autocomplete="off" aria-label="Company name">', true) +
        q(2, 'Industry', 'Helps us suggest services and use typical costs for your sector.',
          '<select id="industry" data-k="industry" aria-label="Industry">' + D.industries.map(function (x) { return '<option value="' + x.id + '"' + (x.id === i.industry ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select>') +
        q(3, 'Company size', 'Use whichever figure you know.',
          '<div class="seg" role="radiogroup" aria-label="Company size">' +
          '<label><input type="radio" name="bm" data-k="budgetMode" value="revenue"' + (i.budgetMode === 'revenue' ? ' checked' : '') + '><span>Revenue</span></label>' +
          '<label><input type="radio" name="bm" data-k="budgetMode" value="budget"' + (i.budgetMode !== 'revenue' ? ' checked' : '') + '><span>Marketing budget</span></label></div>' +
          size + '<p class="hint" id="budget-hint">' + budgetHint() + '</p>')) +
      '<div id="nav1">' + nav1() + '</div>';
  };
  function nav1() { var b = M.budgetOf(state.inp, D); return nav(null, '#/connect/2', 'Continue', !b, 'Add your revenue or budget to continue.'); }
  function budgetHint() {
    var i = state.inp, b = M.budgetOf(i, D);
    if (!b) return i.budgetMode === 'revenue' ? 'Companies spend about 7.7% of revenue on marketing on average (Gartner, 2025).' : 'Total yearly marketing spend, including agencies.';
    if (i.budgetMode === 'revenue') return 'Estimated marketing budget: <b>' + money(b) + '</b> a year.';
    return 'About <b>' + money(b) + '</b> a year.';
  }

  /* Step 2: services. */
  SCREENS.connect2 = function () {
    var i = state.inp, ind = industry(i.industry);
    var groups = D.needGroups.map(function (g) {
      var items = D.needs.filter(function (n) { return n.group === g.id; });
      return '<div class="ngroup"><h3>' + esc(g.label) + '</h3><div class="needs">' + items.map(function (n) {
        var on = i.needs.indexOf(n.id) !== -1, sug = ind.suggested.indexOf(n.id) !== -1;
        return '<label class="choice need"><input type="checkbox" data-need="' + n.id + '"' + (on ? ' checked' : '') + '><span><span class="nl">' + esc(n.label) + '</span>' +
          (sug || !n.point ? '<span class="nm">' + (sug ? '<b class="sug">Recommended</b>' : '') + (!n.point ? '<i>Handled by a specialist</i>' : '') + '</span>' : '') + '</span></label>';
      }).join('') + '</div></div>';
    }).join('');
    return head({ steps: CJ, cur: 1, title: 'What do you need help with?',
                  lede: 'We compare using a separate agency for each service with one connected Digitas team.' }) +
      inputsLayout(
        q(4, 'Do you work with agencies today?', '',
          '<div class="choices" role="radiogroup" aria-label="Agencies today">' +
          '<label class="choice"><input type="radio" name="stt" data-k="status" value="using"' + (i.status !== 'planning' ? ' checked' : '') + '><span>Yes, we do</span></label>' +
          '<label class="choice"><input type="radio" name="stt" data-k="status" value="planning"' + (i.status === 'planning' ? ' checked' : '') + '><span>Not yet, we are planning to</span></label></div>') +
        q(5, 'Which services do you need?', 'Select all that apply. Each one usually means a separate agency. <span class="sugkey"></span> typical for your industry.',
          '<div class="actions need-actions"><button class="btn ghost small" type="button" data-act="suggest">Use recommended</button>' +
          '<button class="btn ghost small" type="button" data-act="clear-needs">Clear all</button></div>' + groups)) +
      '<div id="nav2">' + nav2() + '</div>';
  };
  function nav2() { return nav('#/connect/1', '#/connect/3', 'Continue', !state.inp.needs.length, 'Select at least one service.'); }

  /* Step 3: details. */
  SCREENS.connect3 = function () {
    var i = state.inp, own = i.own || {}, anyOwn = D.ownNumbers.some(function (o) { return +own[o.id] > 0; });
    var plan = i.status === 'planning';
    var ownFields = D.ownNumbers.map(function (o) {
      return '<div class="field"><label for="own-' + o.id + '">' + esc(o.label) + '</label><div class="' + (o.unit === 'usd' ? 'money' : 'unitf') + '"' + (o.unit !== 'usd' ? ' data-unit="' + (o.unit === 'years' ? 'years' : 'hours') + '"' : '') + '>' +
        '<input id="own-' + o.id + '" type="text" inputmode="decimal" data-own="' + o.id + '" value="' + (+own[o.id] > 0 ? esc(own[o.id]) : '') + '" placeholder="' + esc(o.placeholder) + '"></div></div>';
    }).join('');
    return head({ steps: CJ, cur: 2, title: 'A few final details.', lede: 'These help us tailor the estimate to you.' }) +
      inputsLayout(
        (plan ? '' : q(6, 'How well do your agencies share data and goals?', 'Agencies that work in silos cost more to coordinate.',
          '<div class="choices c5" role="radiogroup" aria-label="Data and goal sharing">' +
          D.sharing.map(function (s) { return '<label class="choice"><input type="radio" name="sh" data-k="sharing" value="' + s.v + '"' + (+i.sharing === s.v ? ' checked' : '') + '><span>' + esc(s.label) + '</span></label>'; }).join('') + '</div>')) +
        q(plan ? 6 : 7, 'What is your main goal?', 'We will show which connections matter most for it.',
          '<div class="choices c4" role="radiogroup" aria-label="Main goal">' +
          D.challenges.map(function (c) { return '<label class="choice"><input type="radio" name="ch" data-k="challenge" value="' + c.id + '"' + (c.id === i.challenge ? ' checked' : '') + '><span>' + esc(c.label) + '</span></label>'; }).join('') + '</div>') +
        q(plan ? 7 : 8, 'Your own figures', 'If you know them, they replace our averages and sharpen the estimate.',
          '<details class="own"' + (anyOwn ? ' open' : '') + '><summary>' + (anyOwn ? 'Edit your figures' : 'Add your figures') + '</summary>' + ownFields + '</details>', true)) +
      nav('#/connect/2', '#/connect/4', 'See my results');
  };

  /* Step 4: results. Reading order: the number, how sure it is, where it comes from, how Digitas connects it, proof, next step. */
  function section(title, aside, body, id) {
    return '<section class="rsec"' + (id ? ' id="' + id + '"' : '') + '><div class="section-title"><h2>' + title + '</h2>' + (aside ? '<span class="label">' + aside + '</span>' : '') + '</div>' + body + '</section>';
  }
  function agencies(n) { return n + (n === 1 ? ' agency' : ' agencies'); }
  SCREENS.connect4 = function () {
    var i = state.inp, r = sim(i), st = r.structure, ch = challengeOf(i), plan = i.status === 'planning';
    if (!st.budget || !st.k) {
      return head({ steps: CJ, cur: 3, title: 'A few answers are missing.' }) +
        '<div class="banner">' + (!st.budget ? 'Add your revenue or budget in <a href="#/connect/1">step 1</a>. ' : '') + (!st.k ? 'Select at least one service in <a href="#/connect/2">step 2</a>.' : '') + '</div>';
    }
    var fte = r.hours.p50 / 1800, perPartner = st.budget / st.k, none = !(r.savings.hi > 0), verb = plan ? 'avoid' : 'save';
    var removed = r.today.p50 ? r.savings.p50 / r.today.p50 : 0;
    var notes = '';
    if (st.c < 2) notes += '<div class="banner" role="status">Digitas covers ' + (st.c ? 'only one' : 'none') + ' of the services you selected, so there is nothing to connect and no saving to show. A specialist agency may be the better choice, and we would rather tell you so.</div>';
    else if (st.k > 2 && perPartner < 250000) notes += '<div class="banner info" role="status">With about ' + money(perPartner) + ' per agency, many companies your size use fewer agencies than services. Treat this estimate as an upper limit.</div>';
    var specialists = st.u ? ' Your ' + (st.u === 1 ? 'specialist' : 'specialists') + ' for ' + esc(st.uncovered.map(function (n) { return n.label; }).join(' and ')) + ' stay' + (st.u === 1 ? 's' : '') + ' in place.' : '';

    var kpis = none
      ? '<div class="kpis two">' +
        '<div class="kpi"><span class="kl">' + (plan ? 'Hidden cost of separate agencies' : 'Hidden cost today') + '</span><span class="value">' + money(r.today.p50) + '</span><span class="sub">a year, ' + (plan ? 'if you hired ' : 'running ') + agencies(st.k) + '</span></div>' +
        '<div class="kpi"><span class="kl">Services Digitas covers</span><span class="value">' + st.c + '<span class="arrow">of</span>' + st.k + '</span><span class="sub">too few to connect · <a href="#/connect/2">review your services</a></span></div></div>'
      : '<div class="kpis">' +
        '<div class="kpi hero"><span class="kl">Likely range a year</span><span class="value range">' + money(r.savings.lo) + '<span class="dash">–</span>' + money(r.savings.hi) + '</span>' +
        '<span class="sub">9 in 10 scenarios · about ' + money(r.year1.p50) + ' in year one</span></div>' +
        '<div class="kpi"><span class="kl">' + (plan ? 'Hidden cost of separate agencies' : 'Hidden cost today') + '</span><span class="value">' + money(r.today.p50) + '</span><span class="sub">a year, ' + (plan ? 'if you hired ' : 'running ') + agencies(st.k) + '</span></div>' +
        '<div class="kpi"><span class="kl">Team time freed</span><span class="value">' + int(r.hours.p50) + '<small> h</small></span><span class="sub">a year, about ' + (fte >= 0.5 ? fte.toFixed(1) + ' full-time ' + (fte >= 1.05 ? 'people' : 'person') : Math.max(1, Math.round(fte * 40)) + ' hours a week') + '</span></div>' +
        '<div class="kpi"><span class="kl">Agencies to manage</span><span class="value">' + st.k + '<span class="arrow">→</span>' + st.nConn + '</span><span class="sub">' + (st.c ? '1 Digitas team' : 'no change') + (st.u ? ' + ' + plural(st.u, 'specialist') : '') + '</span></div></div>';

    var who = i.company ? esc(i.company) : 'You';
    var title = none ? 'Not enough to connect, yet.' : who + ' could ' + verb + ' <span class="hl">' + money(r.savings.p50) + ' a year.</span>';
    var story = none ? 'Digitas covers ' + st.c + ' of your ' + plural(st.k, 'service') + ', so a connected team would not change much today.'
      : (plan ? 'Hiring ' : 'Running ') + agencies(st.k) + ' separately ' + (plan ? 'would carry' : 'carries') + ' about <b>' + money(r.today.p50) + ' a year</b> in hidden coordination costs. ' +
        'One connected Digitas team could remove about <b>' + pct(removed) + '</b> of it, for the same agency fees.' + specialists;
    var facts = '<p class="facts">' + esc(industry(i.industry).label) + ' · ' + money(st.budget) + ' marketing budget · ' + plural(st.k, 'service') + ' · <a href="#/connect/1">Edit answers</a></p>';

    var rows = r.breakdown.filter(function (b) { return b.today >= 1; }).sort(function (a, b) { return b.savings - a.savings; })
      .map(function (b) { return { label: esc(b.plain), explain: esc(b.explain), total: b.today, part: b.savings }; });

    return head({ steps: CJ, cur: 3, eyebrow: 'Your estimate', title: title, lede: '<p>' + story + '</p>' + facts }) +
      notes + kpis +
      (none ? '' :
        '<div class="band light">' +
        section('How sure can you be?', 'Hover or use arrow keys',
          '<div class="panel chart-panel">' + Charts.density({ series: [{ label: 'Your estimate', sorted: r.sorted, tone: 'main' }], fmt: money, verb: verb, unit: ' a year',
            aria: 'Distribution of yearly ' + (plan ? 'cost avoided' : 'savings') + ' across 10,000 scenarios. Likely between ' + money(r.savings.lo) + ' and ' + money(r.savings.hi) + ', most likely ' + money(r.savings.p50) + '.' }) +
          '<p class="fine">We ran 10,000 scenarios, each with a different but realistic mix of the assumptions behind this estimate. The curve shows how often each result came up; move along it to see how many scenarios reach a given amount.</p></div>') +
        section('Where the savings come from', 'The six hidden costs',
          '<div class="panel">' + Charts.bars(rows, { fmt: money, partLabel: 'Saved with one Digitas team', restLabel: 'Still spent' }) +
          '<div class="bars-total"><span>Total</span><span><b>' + money(r.savings.p50) + '</b> of ' + money(r.today.p50) + '</span></div></div>') +
        '</div>') +
      '<div class="band">' + section('How Digitas connects your work', 'Select a point or line', '<div id="starzone">' + starZone(r, ch, true) + '</div>') +
      '</div>' +
      '<section class="band yellow cta2"><div class="ph-grid"><h2>Get a sharper estimate.</h2><div class="lede"><p>Share this report with Digitas. A strategist refines it with your own figures before you meet.</p>' +
      '<a class="btn" href="#/connect/5">Share with Digitas</a></div></div></section>' +
      '<div class="band tail">' + howWeCalculated(r) + '<div class="actions"><a class="btn ghost" href="#/connect/3">Back</a></div></div>';
  };

  function starZone(r, ch, animate) {
    var st = r.structure, sel = state.sel;
    return '<div class="grid-star"><div class="panel star-panel">' +
      Star.render({ covered: coveredMap(st), keyLines: ch.lines, selected: sel, interactive: true, animate: !!animate, values: r.attribution, fmt: money }) +
      '<div class="s2-tip" role="tooltip" hidden><b></b><span></span></div>' +
      '<ul class="legend">' +
      '<li><i class="lk grad"></i>Matters most for your goal</li>' +
      '<li><i class="lk white"></i>Run by one Digitas team · thicker saves more</li>' +
      '<li><i class="lk dim"></i>Not in your plan</li>' +
      '<li><i class="pk"></i>Capability you need · number of services</li></ul></div>' +
      '<div class="panel detail" aria-live="polite">' + detail(r, ch) + '</div></div>';
  }

  /* Separately vs connected, as two thin bars on one scale, with the saving stated in words. */
  function compare(sep, conn, save) {
    var w = sep ? Math.max(0, Math.min(100, conn / sep * 100)) : 0;
    return '<div class="cmp">' +
      '<div class="cmp-r"><span class="cmp-l">With separate agencies</span><span class="cmp-v">' + money(sep) + '</span><span class="cmp-b"><i style="width:100%"></i></span></div>' +
      '<div class="cmp-r"><span class="cmp-l">With one Digitas team</span><span class="cmp-v">' + money(conn) + '</span><span class="cmp-b on"><i style="width:' + w.toFixed(1) + '%"></i></span></div>' +
      '<p class="cmp-save"><i class="sw part"></i><span>Saves <b>' + money(save) + '</b> a year</span></p></div>';
  }

  function detail(r, ch) {
    var sel = state.sel || '', st = r.structure, ind = industry(r.inputs.industry), A = r.attribution;
    var back = '<button class="linkbtn" type="button" data-sel="">← Back to overview</button>';
    if (sel.indexOf('point:') === 0) {
      var p = PT[sel.slice(6)], ap = A.points[p.id], mine = st.perPoint[p.id];
      return back + '<p class="label kick">Digitas capability</p><h2>' + esc(p.name) + '</h2><p class="muted">' + esc(p.does) + '</p>' +
        (mine.length
          ? '<div class="chips">' + mine.map(function (n) { return '<span class="chip on">' + esc(n.label) + '</span>'; }).join('') + '</div>' +
            compare(ap.separately, ap.connected, ap.savings) +
            '<p class="hint">' + (mine.length > 1 ? 'These ' + mine.length + ' services would otherwise mean ' + mine.length + ' separate agencies.' : 'One fewer agency to brief, manage and review.') + '</p>'
          : '<p class="banner info">None of your services fall here yet. <a href="#/connect/2">Add one</a> to connect it.</p>') +
        '<dl class="kv tight"><div><dt>Result it moves for you</dt><dd>' + esc(ind.pivots[p.id]) + '</dd></div></dl>' +
        '<p class="label" style="margin-top:1.1rem">What this team does</p><div class="chips">' + p.subs.map(function (s) { return '<span class="chip">' + esc(s) + '</span>'; }).join('') + '</div>';
    }
    if (sel.indexOf('line:') === 0) {
      var key = sel.slice(5), l = lineOf(key), al = A.lines[key], owned = st.perPoint[l.a].length && st.perPoint[l.b].length;
      var isKey = ch.lines.some(function (pr) { return Star.lineKey(pr[0], pr[1]) === key; });
      return back + '<p class="label kick">Connection' + (isKey ? ' · key for your goal' : '') + '</p><h2>' + esc(lineName(l)) + '</h2>' +
        '<p>' + esc(l.text) + '</p>' +
        (owned
          ? compare(al.separately, al.connected, al.savings) +
            '<p class="hint">Separately, two agencies have to align goals, data and measurement across this handoff. Connected, one team works from one brief and one dataset.</p>'
          : '<p class="banner info">Not in your plan: you have no services in ' + esc(!st.perPoint[l.a].length ? PT[l.a].name : PT[l.b].name) + '.</p>') +
        '<dl class="kv tight"><div><dt>Results it moves</dt><dd>' + esc(ind.pivots[l.a]) + '<br>' + esc(ind.pivots[l.b]) + '</dd></div></dl>';
    }
    var ownedN = 0, possible = 0;
    D.lines.forEach(function (x) { if (st.perPoint[x.a].length && st.perPoint[x.b].length) ownedN++; });
    return '<p class="label kick">Your goal</p><h2>' + esc(ch.label) + '</h2><p class="muted">The connections that matter most for it, and what each saves you a year.</p>' +
      '<ol class="linelist">' + ch.lines.map(function (pr, n) {
        var key = Star.lineKey(pr[0], pr[1]), l = lineOf(key), on = st.perPoint[l.a].length && st.perPoint[l.b].length;
        return '<li><span class="n' + (on ? '' : ' dash') + '">' + (n + 1) + '</span><button type="button" data-sel="line:' + key + '"><span class="t">' + esc(lineName(l)) + '</span><br><span class="s">' + esc(l.text) + '</span></button>' +
          '<span class="a">' + (on ? money(r.attribution.lines[key].savings) : '<span class="muted">not in plan</span>') + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="hint">One Digitas team runs ' + ownedN + ' of the 10 possible connections for you. Select any point or line to see its value.</p>' +
      (st.u ? '<p class="hint">' + esc(st.uncovered.map(function (n) { return n.label; }).join(', ')) + ' stay' + (st.u === 1 ? 's' : '') + ' with your specialist; Digitas coordinates the handoff.</p>' : '');
  }

  function howWeCalculated(r) {
    var st = r.structure, top = r.drivers.filter(function (d) { return Math.abs(d.r) > 0.02; }).slice(0, 5);
    var maxR = top.length ? Math.abs(top[0].r) : 1, ind = industry(r.inputs.industry);
    var used = {}; r.params.forEach(function (p) { used[p.id] = p; });
    return '<details class="how"><summary>How we estimate this</summary><div class="inner">' +
      '<p>We compare two ways of covering the same services: <b>' + agencies(st.k) + '</b>, one per service, or <b>one connected Digitas team' + (st.u ? ' plus ' + plural(st.u, 'specialist') : '') + '</b>. Agency fees are assumed equal in both cases, because Digitas\'s pricing is not public. Only the hidden cost of coordinating agencies is compared.</p>' +
      '<h3>The six hidden costs</h3><div class="tablewrap"><table><thead><tr><th>Cost</th><th class="num">Today</th><th class="num">Saved</th><th>How it is estimated</th></tr></thead><tbody>' +
      r.breakdown.map(function (c) { return '<tr><td>' + esc(c.plain) + '</td><td class="num">' + money(c.today) + '</td><td class="num">' + money(c.savings) + '</td><td class="small muted">' + esc((c.formula || byId(D.categories, c.id).formula).replace(/ x /g, ' × ')) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td>Total</td><td class="num">' + money(r.today.p50) + '</td><td class="num">' + money(r.savings.p50) + '</td><td></td></tr></tfoot></table></div>' +
      '<p class="fine"><b>Fragmentation</b> is the chance that two pieces of your marketing sit with different agencies: ' + pct(st.fragToday) + ' today with ' + agencies(st.k) + ', ' + pct(st.fragConn) + ' with one Digitas team' + (st.u ? ' and your specialist' + (st.u === 1 ? '' : 's') : '') + '. Totals are the most likely result across all scenarios, split across the six costs in proportion to each one\'s average share.</p>' +
      '<h3>Assumptions</h3><div class="tablewrap"><table><thead><tr><th>Assumption</th><th>Low · likely · high</th><th>Source</th><th>Status</th></tr></thead><tbody>' +
      D.params.map(function (p) {
        var u = used[p.id];
        if (u && u.own) return '<tr><td>' + esc(p.label) + '</td><td class="small">' + fmtParam(p, u.tri[0]) + '</td><td class="small muted">Your figure, replacing ' + p.tri.map(function (v) { return fmtParam(p, v); }).join(' · ') + '</td><td>' + publicTag('own') + '</td></tr>';
        return '<tr><td>' + esc(p.label) + '</td><td class="small" style="white-space:nowrap">' + p.tri.map(function (v) { return fmtParam(p, v); }).join(' · ') + '</td><td class="small muted">' + esc(p.source) + '</td><td>' + statusTag(p.status) + '</td></tr>';
      }).join('') +
      (st.ownHourly
        ? '<tr><td>Hourly cost of your team</td><td class="small">' + money(st.ownHourly) + '</td><td class="small muted">Your figure, replacing the industry average</td><td>' + publicTag('own') + '</td></tr>'
        : '<tr><td>Hourly cost of your team</td><td class="small">$' + D.fixed.hourlyWage.value + ' × ' + ind.rate + ' (industry)</td><td class="small muted">' + esc(D.fixed.hourlyWage.source) + '. Industry factors are placeholders.</td><td>' + statusTag('sourced') + '</td></tr>') +
      '<tr><td>Size adjustment: agency reviews</td><td class="small">× ' + pct(st.size) + '</td><td class="small muted">The review cost above is for large advertisers; it is scaled to your budget</td><td>' + publicTag('team') + '</td></tr>' +
      '<tr><td>Size adjustment: hours per agency</td><td class="small">× ' + pct(st.hoursScale) + '</td><td class="small muted">Smaller accounts take less time to manage, so hours are scaled to your budget per agency</td><td>' + publicTag('placeholder') + '</td></tr>' +
      '</tbody></table></div>' +
      (top.length ? '<h3>What moves the estimate most</h3><ul class="drivers">' + top.map(function (d) {
        var p = param(d.id);
        return '<li><span>' + esc(p.label) + '</span><span class="b" style="width:' + Math.round(Math.abs(d.r) / maxR * 100) + '%"></span><span class="v">' + d.r.toFixed(2) + '</span></li>';
      }).join('') + '</ul><p class="fine">How strongly each assumption moves the result across the 10,000 scenarios (correlation). Your own figures, or Digitas\'s data, would pin down the top ones first.</p>' : '') +
      '<p class="fine">' + int(r.n) + ' scenarios · triangular distributions · likely range = 5th to 95th percentile · seed ' + r.seed + ' (same answers, same numbers).</p>' +
      '</div></details>';
  }

  /* Step 5: share your interest. */
  SCREENS.connect5 = function () {
    var i = state.inp, r = sim(i), s = state.share, ch = challengeOf(i);
    if (!r.structure.budget || !r.structure.k) return SCREENS.connect4();
    if (state.sent) {
      return head({ steps: CJ, cur: 4, title: 'Thank you. Your report is with Digitas.', lede: 'Reference ' + esc(state.sent) + '.' }) +
        '<div class="grid-2"><div class="done-box"><h2>What happens next</h2><ol class="steps3">' +
        '<li><span>A Digitas lead reviews your report.</span></li>' +
        '<li><span>A strategist meets you to confirm your needs and goals.</span></li>' +
        '<li><span>Together you refine the estimate with your own figures.</span></li></ol>' +
        '<div class="actions"><a class="btn" href="#/studio/a">Open in Studio (demo)</a><button class="btn ghost" type="button" data-act="new-run">Start over</button></div>' +
        '<p class="fine">Prototype: the report is saved only in this browser.</p></div>' +
        '<div>' + reportPreview(i, r, ch) + '</div></div>';
    }
    return head({ steps: CJ, cur: 4, title: 'Share with Digitas.', lede: 'A Digitas strategist will review your report before getting in touch. You decide what is shared.' }) +
      '<div class="grid-2"><div class="panel">' +
      (s.error ? '<div class="banner" role="alert">' + esc(s.error) + '</div>' : '') +
      '<div class="fields-2"><div class="field"><label for="sh-name">Name</label><input id="sh-name" type="text" data-share="name" value="' + esc(s.name) + '" autocomplete="off"></div>' +
      '<div class="field"><label for="sh-role">Role</label><input id="sh-role" type="text" data-share="role" value="' + esc(s.role) + '" placeholder="e.g. CMO" autocomplete="off"></div></div>' +
      '<div class="field"><label for="sh-email">Work email</label><input id="sh-email" type="email" data-share="email" value="' + esc(s.email) + '" autocomplete="off"></div>' +
      '<label class="choice check" style="margin-bottom:.5rem"><input type="checkbox" data-share="cShare"' + (s.cShare ? ' checked' : '') + '><span>Share this report with Digitas</span></label>' +
      '<label class="choice check"><input type="checkbox" data-share="cContact"' + (s.cContact ? ' checked' : '') + '><span>Digitas may contact me about it</span></label>' +
      '<p class="fine">Shared only with Digitas and used only to prepare your conversation. Never shown to other clients.</p>' +
      '<div class="actions"><a class="btn ghost" href="#/connect/4">Back</a><button class="btn" type="button" data-act="send">Send report</button></div></div>' +
      '<div><p class="label" style="margin-bottom:.6rem">What Digitas will see</p>' + reportPreview(i, r, ch) + '</div></div>';
  };
  function reportPreview(i, r, ch) {
    var st = r.structure, own = i.own || {}, nOwn = D.ownNumbers.filter(function (o) { return +own[o.id] > 0; }).length;
    return '<div class="report"><h3>' + esc(i.company || 'Your company') + '</h3><p class="small muted">' + esc(industry(i.industry).label) + ' · ' + esc(ch.label) + '</p>' +
      '<dl class="kv"><div><dt>Budget</dt><dd>' + money(st.budget) + '</dd></div>' +
      '<div><dt>Services</dt><dd class="small">' + esc(st.selected.map(function (n) { return n.label; }).join(', ')) + '</dd></div>' +
      '<div><dt>Agencies</dt><dd>' + st.k + ' → ' + st.nConn + '</dd></div>' +
      '<div><dt>Estimated savings</dt><dd>' + money(r.savings.p50) + ' <span class="muted small">(' + money(r.savings.lo) + '–' + money(r.savings.hi) + ')</span></dd></div>' +
      '<div><dt>Data sharing</dt><dd>' + (i.status === 'planning' ? 'Planning' : esc(D.sharing[(+i.sharing || 3) - 1].label)) + '</dd></div>' +
      (nOwn ? '<div><dt>Your figures</dt><dd>' + nOwn + ' provided</dd></div>' : '') + '</dl></div>';
  }

  /* =================== DIGITAS CONNECT STUDIO (private) =================== */
  function reportInputs(rep) {
    return { company: rep.company, industry: rep.industry, budgetMode: 'budget', budget: rep.budget, revenue: 0, mktShare: null,
             challenge: rep.challenge, status: rep.status, sharing: rep.sharing, needs: rep.needs, own: rep.own || {} };
  }

  SCREENS.studioa = function () {
    var all = reports(), curId = (currentReport() || {}).id;
    return head({ steps: SJ, cur: 0, letters: true, viewer: VIEW_STUDIO, title: 'Shared interest, ready to review.',
                  lede: 'Reports prospects chose to send from Digitas Connect. Open one to sharpen the estimate and plan the pitch.' }) +
      '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Received</th><th>Company</th><th>Industry</th><th class="num">Needs</th><th class="num">Public estimate</th><th>Consent</th><th>Stage</th><th></th></tr></thead><tbody>' +
      all.map(function (rep) {
        var r = sim(reportInputs(rep));
        return '<tr class="click' + (rep.seed ? '' : ' mine') + '" data-open="' + esc(rep.id) + '"><td class="small">' + esc(rep.receivedAt) + '</td><td>' + esc(rep.company) + (rep.id === curId ? ' <span class="tag">open</span>' : '') + '</td>' +
          '<td class="small">' + esc(industry(rep.industry).label) + '</td><td class="num">' + r.structure.c + ' of ' + r.structure.k + '</td>' +
          '<td class="num">' + money(r.savings.p50) + '<span class="d">' + money(r.savings.lo) + '–' + money(r.savings.hi) + '</span></td>' +
          '<td>' + (rep.consent ? '<span class="tag good">Given</span>' : '<span class="tag warn">Missing</span>') + '</td><td class="small">' + esc(rep.stage) + '</td>' +
          '<td><button class="btn small" type="button" data-open="' + esc(rep.id) + '">Open</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="fine">Rows marked "[Seed example]" are examples so the inbox is never empty. Reports you send from Digitas Connect appear on top.</p></div>';
  };

  SCREENS.studiob = function () {
    var rep = currentReport(), inp = reportInputs(rep), pub = sim(inp), cal = sim(inp, true);
    var w = function (x) { return x.savings.hi - x.savings.lo; }, narrow = w(pub) ? 1 - w(cal) / w(pub) : 0;
    var none = !(pub.savings.hi > 0);
    return head({ steps: SJ, cur: 1, letters: true, viewer: VIEW_STUDIO, title: 'Sharpen the estimate with Digitas data.',
                  lede: esc(rep.company) + ': the public tool used industry averages. Inside Studio, the same model runs on Digitas\'s own records.' }) +
      '<div class="banner info">' + esc(D.calibration.note) + '</div>' +
      (none ? '<div class="banner">Digitas covers fewer than two of this prospect\'s services, so there is no coordination saving to sharpen.</div>' :
      '<div class="kpis two">' +
      '<div class="kpi"><span class="kl">Public estimate</span><span class="value">' + money(pub.savings.p50) + '</span><span class="sub">Likely ' + money(pub.savings.lo) + ' – ' + money(pub.savings.hi) + '</span></div>' +
      '<div class="kpi hero"><span class="kl">With Digitas data</span><span class="value">' + money(cal.savings.p50) + '</span><span class="sub">Likely ' + money(cal.savings.lo) + ' – ' + money(cal.savings.hi) + ' · range ' + pct(Math.max(0, narrow)) + ' narrower</span></div></div>' +
      '<div class="panel chart-panel">' + Charts.density({ series: [{ label: 'Public estimate', sorted: pub.sorted, tone: 'alt' }, { label: 'With Digitas data', sorted: cal.sorted, tone: 'main' }],
        fmt: money, verb: 'save', unit: ' a year', aria: 'Savings across 10,000 scenarios: public estimate likely ' + money(pub.savings.lo) + ' to ' + money(pub.savings.hi) + '; with Digitas data likely ' + money(cal.savings.lo) + ' to ' + money(cal.savings.hi) + '.' }) +
      '<p class="fine">The tighter the curve, the firmer the promise Digitas can make in the pitch. Every logged outcome tightens it further.</p></div>') +
      '<div class="section-title"><h2>What Digitas data replaces</h2></div>' +
      '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Assumption</th><th>Public range</th><th>Digitas data</th><th>Source inside Digitas</th></tr></thead><tbody>' +
      Object.keys(D.calibration.params).map(function (k) {
        var p = param(k), c = D.calibration.params[k];
        return '<tr><td>' + esc(p.label) + '</td><td class="small" style="white-space:nowrap">' + fmtParam(p, p.tri[0]) + ' – ' + fmtParam(p, p.tri[2]) + '</td><td class="small" style="white-space:nowrap"><b>' + fmtParam(p, c.tri[0]) + ' – ' + fmtParam(p, c.tri[2]) + '</b></td><td class="small muted">' + esc(c.from) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      nav('#/studio/a', '#/studio/c', 'Next: team & pitch');
  };

  SCREENS.studioc = function () {
    var rep = currentReport(), inp = reportInputs(rep), r = sim(inp, true), st = r.structure, ch = challengeOf(inp), ind = industry(inp.industry);
    var groups = D.points.filter(function (p) { return st.perPoint[p.id].length; });
    var lead = ch.lines.filter(function (pr) { return st.perPoint[pr[0]].length && st.perPoint[pr[1]].length; });
    var cases = casesFor(groups.map(function (g) { return g.id; }), ch.id).slice(0, 2);
    var teamList = '<ol class="linelist">' + groups.map(function (g) {
      return '<li><span class="n">' + st.perPoint[g.id].length + '</span><div><span class="t">' + esc(g.name) + '</span><br><span class="s">' + esc(ROLE[g.id]) + ' · ' + esc(st.perPoint[g.id].map(function (n) { return n.label; }).join(', ')) + '</span></div><span></span></li>';
    }).join('') + '<li><span class="n" style="border-color:var(--yellow);color:var(--yellow)">★</span><div><span class="t">Integration lead</span><br><span class="s">One named person who owns every line between the teams</span></div><span></span></li></ol>';
    return '<div class="no-print">' + head({ steps: SJ, cur: 2, letters: true, viewer: VIEW_STUDIO, title: 'Bring in the right team.',
                  lede: esc(rep.company) + ' · ' + esc(ch.label) + '. Less time finding teams, more time building the proposal.' }) +
      '<div class="grid-star"><div class="panel">' + Star.render({ covered: coveredMap(st), hub: ['Client', 'team'] }) +
      '<p class="under-star">' + groups.length + ' Digitas group' + (groups.length === 1 ? '' : 's') + ', one integration lead' + (st.u ? ', ' + plural(st.u, 'specialist') + ' coordinated' : '') + '.</p></div>' +
      '<div class="panel"><h2>Recommended team</h2>' + teamList +
      (st.u ? '<h3 style="margin-top:1.2rem">Client keeps</h3><p class="small">' + esc(st.uncovered.map(function (n) { return n.label; }).join(', ')) + ' with their specialist. Digitas coordinates the handoff.</p>' : '') +
      '</div></div>' +
      '<div class="section-title"><h2>Pitch brief</h2><button class="btn ghost small" type="button" data-act="print">Print brief</button></div></div>' +
      '<div class="report print-area"><p class="label">Digitas Connect Studio · internal · ' + esc(today()) + '</p><h3 style="font-size:1.3rem;margin-top:.3rem">' + esc(rep.company) + '</h3>' +
      '<p class="small muted">' + esc(ind.label) + ' · ' + money(st.budget) + ' budget · ' + esc(ch.label) + '</p>' +
      '<div class="grid-2" style="margin-top:1rem"><dl class="kv">' +
      '<div><dt>Estimate (Digitas data)</dt><dd>' + money(r.savings.p50) + ' <span class="small muted">' + money(r.savings.lo) + '–' + money(r.savings.hi) + '</span></dd></div>' +
      '<div><dt>Partners</dt><dd>' + st.k + ' → ' + st.nConn + '</dd></div>' +
      '<div><dt>Hours back</dt><dd>' + int(r.hours.p50) + ' a year</dd></div>' +
      '<div><dt>Team</dt><dd class="small">' + esc(groups.map(function (g) { return g.name; }).join(', ')) + ' + integration lead</dd></div></dl>' +
      '<div><p class="label">Lead with</p><ol class="small" style="padding-left:1.1rem;margin:.4rem 0 1rem">' +
      (lead.length ? lead.map(function (pr) { var l = lineOf(Star.lineKey(pr[0], pr[1])); return '<li><b>' + esc(lineName(l)) + '</b>: ' + esc(l.text) + '</li>'; }).join('') : '<li>No key line covered yet: confirm needs in discovery.</li>') + '</ol>' +
      '<p class="label">Results we would move</p><p class="small">' + esc(groups.map(function (g) { return ind.pivots[g.id]; }).join(' · ')) + '</p>' +
      (cases.length ? '<p class="label">Proof</p><p class="small">' + cases.map(function (c) { return esc(c.client) + ': ' + esc(c.result) + ' (not yet verified)'; }).join('<br>') + '</p>' : '') +
      '</div></div><p class="fine">Next step: discovery workshop. Confirm needs and sharing; with client consent, replace averages with their own numbers.</p></div>' +
      '<div class="no-print">' + nav('#/studio/b', '#/studio/d', 'Next: log the outcome') + '</div>';
  };

  SCREENS.studiod = function () {
    var rep = currentReport(), outs = load('dc2.outcomes') || [];
    var stages = ['New', 'Meeting booked', 'Pitched', 'Won', 'Lost', 'Not a fit'];
    return head({ steps: SJ, cur: 3, letters: true, viewer: VIEW_STUDIO, title: 'Log the outcome. The model learns.',
                  lede: 'Every pitch result feeds back into the ranges Digitas Connect shows the next prospect.' }) +
      (state.studio.logged ? '<div class="banner ok" role="status">Logged: ' + esc(state.studio.logged) + '.</div>' : '') +
      '<div class="grid-main"><div class="panel"><h2>' + esc(rep.company) + '</h2>' +
      '<div class="fields-2"><div class="field"><label for="o-stage">Stage</label><select id="o-stage">' + stages.map(function (s) { return '<option' + (s === rep.stage ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="o-actual">Actual savings (if won, later)</label><div class="money"><input id="o-actual" type="text" inputmode="numeric" placeholder="optional"></div></div></div>' +
      '<div class="field"><label for="o-note">Note</label><textarea id="o-note" placeholder="What won or lost it?"></textarea></div>' +
      '<div class="actions" style="margin-top:.4rem"><button class="btn" type="button" data-act="log">Log outcome</button></div>' +
      (outs.length ? '<h3 style="margin-top:1.6rem">Logged in this browser</h3><div class="tablewrap"><table><thead><tr><th>Date</th><th>Company</th><th>Stage</th><th class="num">Actual</th><th>Note</th></tr></thead><tbody>' +
        outs.slice().reverse().map(function (o) { return '<tr><td class="small">' + esc(o.date) + '</td><td>' + esc(o.company) + '</td><td>' + esc(o.stage) + '</td><td class="num">' + (o.actual ? money(o.actual) : '–') + '</td><td class="small muted">' + esc(o.note) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '') + '</div>' +
      '<aside class="panel"><h2>Model library</h2><dl class="kv"><div><dt>Outcomes logged</dt><dd>' + outs.length + '</dd></div><div><dt>Recalibration</dt><dd>Quarterly</dd></div><div><dt>Owner</dt><dd class="small">Named data steward</dd></div></dl>' +
      '<p class="fine">In production the ranges in "Calibrate" are rebuilt from these outcomes. Here they are illustrative.</p></aside></div>' +
      '<div class="section-title"><h2>Why the numbers can be trusted</h2><span class="label">Accuracy · privacy · updating</span></div>' +
      '<div class="grid-3 gov">' +
      '<div class="panel"><span class="tag">Accuracy</span><h3>How do we know it is right?</h3><ul><li>Every number shows its range and source.</li><li>10,000 scenarios: we state a range, never one promise.</li><li>Clients can enter their own numbers; Digitas outcomes narrow the range over time.</li></ul></div>' +
      '<div class="panel"><span class="tag">Privacy</span><h3>Whose data is this?</h3><ul><li>The public tool uses industry averages only.</li><li>Prospects choose to share; consent is recorded.</li><li>Client data stays in Studio, by role, under Digitas\'s policy; only anonymous averages flow back.</li></ul></div>' +
      '<div class="panel"><span class="tag">Updating</span><h3>Who keeps it current?</h3><ul><li>A named data steward owns the model.</li><li>Quarterly refresh of sources and outcomes.</li><li>Every assumption carries a date and a status.</li></ul></div></div>' +
      nav('#/studio/c', null);
  };

  /* =================== BEHIND THE SCENES =================== */
  SCREENS.model = function () {
    var small = { n: 2000 };
    function run(inp) { return M.simulate(inp, D, small); }
    function ex(id, mod) { var x = freshInputs(id); if (mod) mod(x); return x; }
    function rel(s) { return s.p50 ? (s.hi - s.lo) / s.p50 : 0; }
    var one = run(ex('saas', function (x) { x.needs = ['crm']; }));
    var cov1 = run(ex('bank', function (x) { x.needs = ['crm', 'pr', 'research']; }));
    var three = run(ex('hotel', function (x) { x.needs = ['brand', 'paid', 'crm']; })), five = run(ex('hotel', function (x) { x.needs = ['brand', 'paid', 'crm', 'social', 'ecom']; }));
    var bad = run(ex('saas', function (x) { x.sharing = 1; })), good = run(ex('saas', function (x) { x.sharing = 5; }));
    var a1 = run(ex('bank')), a2 = run(ex('bank'));
    var mine = run(ex('saas', function (x) { x.own = { mgmtWeekly: 4, hourly: 85, tenure: 5 }; })), avg = run(ex('saas'));
    var sum = 0; Object.keys(a1.attribution.points).forEach(function (k) { sum += a1.attribution.points[k].savings; }); Object.keys(a1.attribution.lines).forEach(function (k) { sum += a1.attribution.lines[k].savings; });
    var examples = D.presets.map(function (p) { return { p: p, r: run(freshInputs(p.id)) }; });
    var checks = [
      ['One need only: savings are $0', one.savings.hi === 0],
      ['Digitas covers only one need: savings are $0', cov1.savings.hi === 0],
      ['More needs Digitas covers: more savings (' + money(three.savings.p50) + ' → ' + money(five.savings.p50) + ')', five.savings.p50 > three.savings.p50],
      ['Worse data sharing today: more savings (' + money(good.savings.p50) + ' → ' + money(bad.savings.p50) + ')', bad.savings.p50 > good.savings.p50],
      ['Own numbers narrow the range (±' + pct(rel(avg.savings) / 2) + ' → ±' + pct(rel(mine.savings) / 2) + ' around the median)', rel(mine.savings) < rel(avg.savings)],
      ['Same inputs, same numbers (seeded)', a1.savings.p50 === a2.savings.p50],
      ['Star points and lines add up to the headline savings', Math.abs(sum - a1.savings.p50) < 1],
      ['The six costs add up to the headline savings', Math.abs(a1.breakdown.reduce(function (a, b) { return a + b.savings; }, 0) - a1.savings.p50) < 1],
      ['Every example stays under 10% of its budget', examples.every(function (e) { return e.r.savings.p50 / e.r.structure.budget < 0.1; })]
    ];
    return head({ steps: BJ, cur: 0, viewer: 'Team only · not shown to clients', title: 'How the model works.',
                  lede: 'One idea, for any company: count the partners, price the coordination between them, and simulate what we are unsure of.' }) +
      '<div class="grid-2"><div class="panel"><h2>The math</h2><div class="formula">' +
      'k&nbsp;&nbsp;= needs selected (one specialist each)<br>' +
      'k₁ = 1 Digitas team + needs Digitas does not cover<br>' +
      'cost = sum of six costs (per-agency costs × agencies; waste costs × fragmentation)<br>' +
      'fragmentation = 1 − Σ share² ((k−1)/k today; 1 − (c² + u)/k² with Digitas)<br>' +
      'savings = reduction × (cost(k) − cost(k₁))<br>' +
      'year one = savings × ramp</div>' +
      '<p class="fine">Agency fees are held equal (Digitas pricing is not public). Waste costs scale with fragmentation: the chance two pieces of work sit with different agencies. One agency has none; a large Digitas team plus one small specialist has little. Size scales the review cost (budget ÷ $100M) and the hours per partner (budget per partner ÷ $2M). A client\'s own numbers replace the matching ranges.</p></div>' +
      '<div class="panel"><h2>Built-in checks</h2><ul class="checks" style="list-style:none;padding:0;margin:0">' +
      checks.map(function (c) { return '<li><span class="' + (c[1] ? 'ok-dot' : 'bad-dot') + '">' + (c[1] ? 'PASS' : 'FAIL') + '</span> &nbsp;' + esc(c[0]) + '</li>'; }).join('') + '</ul>' +
      '<p class="fine">Run live in your browser on the example companies (2,000 scenarios each).</p></div></div>' +
      '<div class="section-title"><h2>Same model, different companies</h2><span class="label">Examples from the top-bar menu</span></div><div class="panel"><div class="tablewrap"><table><thead><tr><th>Example</th><th>Industry</th><th class="num">Budget</th><th class="num">Partners</th><th class="num">Savings a year (90%)</th><th class="num">% of budget</th></tr></thead><tbody>' +
      examples.map(function (e) { var s = e.r.structure; return '<tr><td>' + esc(e.p.label) + '</td><td class="small">' + esc(industry(e.p.industry).label) + '</td><td class="num">' + money(s.budget) + '</td><td class="num">' + s.k + ' → ' + s.nConn + '</td><td class="num">' + money(e.r.savings.p50) + '<span class="d">' + money(e.r.savings.lo) + '–' + money(e.r.savings.hi) + '</span></td><td class="num">' + pct(e.r.savings.p50 / s.budget, 1) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '<div class="section-title"><h2>Six costs (team deck names)</h2></div><div class="panel"><div class="tablewrap"><table><thead><tr><th>Cost</th><th>Grows with</th><th>Formula</th></tr></thead><tbody>' +
      D.categories.map(function (c) { return '<tr><td>' + esc(c.label) + '</td><td class="small">' + (c.kind === 'partner' ? 'Each partner' : 'Each handoff between partners') + '</td><td class="small muted">' + esc(c.formula) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '<div class="section-title"><h2>Inputs, by where they come from</h2></div><div class="grid-3">' +
      '<div class="panel"><span class="src you">You</span><h3 style="margin-top:.7rem">The client answers</h3><ul class="small" style="padding-left:1.1rem;margin:.6rem 0 0"><li>Industry</li><li>Revenue (× 7.7% or their own %) or marketing budget</li><li>Agencies today or planning</li><li>Needs (one partner each)</li><li>Data & goal sharing (1–5)</li><li>Main goal (highlights only)</li></ul></div>' +
      '<div class="panel"><span class="src you">You, optional</span><h3 style="margin-top:.7rem">Own numbers</h3><ul class="small" style="padding-left:1.1rem;margin:.6rem 0 0">' + D.ownNumbers.map(function (o) { return '<li>' + esc(o.label) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="panel"><span class="src avg">Average</span><h3 style="margin-top:.7rem">Simulated (10,000 draws)</h3><ul class="small" style="padding-left:1.1rem;margin:.6rem 0 0">' + D.params.map(function (p) { return '<li>' + esc(p.label) + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="section-title"><h2>Simulated variables</h2><span class="label">' + int(D.fixed.simulations) + ' scenarios · triangular</span></div><div class="panel"><div class="tablewrap"><table><thead><tr><th>Variable</th><th>Low · likely · high</th><th>Source</th><th>Status</th></tr></thead><tbody>' +
      D.params.map(function (p) { return '<tr><td>' + esc(p.label) + '</td><td class="small" style="white-space:nowrap">' + p.tri.map(function (v) { return fmtParam(p, v); }).join(' · ') + '</td><td class="small muted">' + esc(p.source) + '</td><td>' + statusTag(p.status) + '</td></tr>'; }).join('') +
      '<tr><td>Marketing share of revenue</td><td class="small">7.7%</td><td class="small muted">' + esc(D.marketingShareOfRevenue.source) + '</td><td>' + statusTag('sourced') + '</td></tr>' +
      '<tr><td>Review-cost size scale</td><td class="small">budget ÷ $100M (1%–150%)</td><td class="small muted">' + esc(D.fixed.reviewReferenceBudget.note) + '</td><td>' + statusTag('team') + '</td></tr>' +
      '<tr><td>Hours size scale</td><td class="small">budget per partner ÷ $2M (25%–100%)</td><td class="small muted">' + esc(D.fixed.hoursReferencePerPartner.note) + '</td><td>' + statusTag('placeholder') + '</td></tr>' +
      '<tr><td>Sharing multiplier</td><td class="small">1.3 · 1.15 · 1.0 · 0.85 · 0.7</td><td class="small muted">Applied to goals, data and measurement costs. Team estimate.</td><td>' + statusTag('team') + '</td></tr>' +
      '</tbody></table></div></div>';
  };

  SCREENS.decisions = function () {
    return head({ steps: BJ, cur: 1, viewer: 'Team only · from the Nov 13 meeting', title: 'Open decisions.',
                  lede: 'What v2 does today, and the alternatives the team raised. Change any of these in the data file.' }) +
      '<div class="panel"><div class="tablewrap"><table><thead><tr><th>Question</th><th>v2 today</th><th>Alternatives raised</th></tr></thead><tbody>' +
      D.decisions.map(function (d) { return '<tr><td><b>' + esc(d.q) + '</b></td><td class="small">' + esc(d.v2) + '</td><td class="small muted">' + esc(d.alt) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '<div class="section-title"><h2>What changed from v1</h2><a class="btn ghost small" href="../index.html">Open v1</a></div>' +
      '<div class="grid-2"><div class="panel"><h3>Digitas Connect</h3><ul class="small" style="padding-left:1.1rem;margin:.6rem 0 0">' +
      '<li>Works for any company: 13 industries + "Other / general", B2C and B2B needs and goals, sizes from $1M to billions.</li>' +
      '<li>Inputs in three steps (Company · Marketing · How it runs), each question says what it changes, and a live panel shows every value the estimate uses and where it comes from.</li>' +
      '<li>"Number of agencies" replaced by the needs you pick: each need = one specialist.</li>' +
      '<li>Optional own numbers replace averages (hours per agency, hourly cost, review cycle, marketing %).</li>' +
      '<li>Monte Carlo: 10,000 seeded scenarios, 90% range and median, drivers.</li>' +
      '<li>Results: your answers on top (click to edit), four numbers, clickable star with value per point and line.</li>' +
      '<li>"Get in contact" became "Share your interest", with consent.</li></ul></div>' +
      '<div class="panel"><h3>Digitas Connect Studio</h3><ul class="small" style="padding-left:1.1rem;margin:.6rem 0 0">' +
      '<li>Now internal to Digitas\'s own groups (no sister-agency ownership or referral credit).</li>' +
      '<li>Inbox of shared reports from Connect.</li>' +
      '<li>Calibrate: same model on Digitas data (illustrative), range narrows.</li>' +
      '<li>Team & pitch: recommended groups + integration lead, printable brief.</li>' +
      '<li>Outcome log and the accuracy / privacy / updating answers.</li></ul></div></div>';
  };

  /* ---------- events ---------- */
  function setInput(k, v) {
    var i = state.inp;
    if (k === 'budget' || k === 'revenue') i[k] = digits(v);
    else if (k === 'sharing') i[k] = +v;
    else if (k === 'mktShare') { var x = num(v); i.mktShare = x && x < 100 ? x / 100 : null; }
    else i[k] = v;
    save();
  }
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches('[data-k]') && t.type !== 'radio' && t.tagName !== 'SELECT') { setInput(t.getAttribute('data-k'), t.value); refreshLive(); }
    if (t.matches('[data-own]')) {
      var v = num(t.value); state.inp.own = state.inp.own || {};
      if (v) state.inp.own[t.getAttribute('data-own')] = v; else delete state.inp.own[t.getAttribute('data-own')];
      save(); refreshLive();
    }
    if (t.matches('[data-share]') && t.type !== 'checkbox') { state.share[t.getAttribute('data-share')] = t.value; save(); }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-k]') && (t.type === 'radio' || t.tagName === 'SELECT')) {
      var k = t.getAttribute('data-k'), b = M.budgetOf(state.inp, D);
      setInput(k, t.value);
      // Switching how to size the company carries the number across, so nothing is lost.
      if (k === 'budgetMode' && t.value === 'revenue' && !state.inp.revenue && b) state.inp.revenue = Math.round(b / D.marketingShareOfRevenue.value);
      if (k === 'budgetMode' && t.value === 'budget' && !state.inp.budget && b) state.inp.budget = Math.round(b);
      state.sel = null; save(); render(false);
      var again = document.querySelector('[data-k="' + k + '"]' + (t.type === 'radio' ? '[value="' + t.value + '"]' : ''));
      if (again) again.focus();
    }
    if (t.matches('[data-need]')) {
      var id = t.getAttribute('data-need'), n = state.inp.needs, ix = n.indexOf(id);
      if (t.checked && ix === -1) n.push(id); if (!t.checked && ix !== -1) n.splice(ix, 1);
      state.sel = null; save(); refreshLive();
    }
    if (t.matches('[data-share]') && t.type === 'checkbox') { state.share[t.getAttribute('data-share')] = t.checked; save(); }
  });

  /* Star tooltip: one element per star panel, filled with textContent, placed beside the pointer (or the focused mark). */
  function tipFor(el) { var panel = el.closest('.star-panel'); return panel ? { panel: panel, tip: panel.querySelector('.s2-tip') } : null; }
  function showTip(el, x, y) {
    var t = tipFor(el); if (!t || !t.tip) return;
    t.tip.querySelector('b').textContent = el.getAttribute('data-tip');
    t.tip.querySelector('span').textContent = el.getAttribute('data-tipv');
    t.tip.hidden = false;
    var pb = t.panel.getBoundingClientRect(), tw = t.tip.offsetWidth, th = t.tip.offsetHeight;
    var left = x - pb.left + 16, top = y - pb.top + 16;
    if (left + tw > pb.width - 8) left = x - pb.left - tw - 16;
    if (top + th > pb.height - 8) top = y - pb.top - th - 16;
    t.tip.style.left = Math.max(8, left) + 'px'; t.tip.style.top = Math.max(8, top) + 'px';
  }
  function hideTips() { document.querySelectorAll('.s2-tip').forEach(function (t) { t.hidden = true; }); }
  app.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('.s2-int [data-tip]');
    if (el && e.pointerType !== 'touch') showTip(el, e.clientX, e.clientY); else hideTips();
  });
  app.addEventListener('pointerleave', function (e) { if (e.target.classList && e.target.classList.contains('s2')) hideTips(); }, true);
  app.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('.s2-int [data-tip]');
    if (!el) return; var b = el.getBoundingClientRect(); showTip(el, b.left + b.width / 2, b.top + b.height / 2);
  });
  app.addEventListener('focusout', hideTips);
  Charts.bind(app);

  function selectStar(sel) {
    if (sel && sel === state.sel) sel = null; // selecting the same mark again returns to the overview
    hideTips();
    state.sel = sel || null; save();
    var z = document.getElementById('starzone');
    if (z) z.innerHTML = starZone(sim(state.inp), challengeOf(state.inp));
    var f = sel ? document.querySelector('#starzone [data-' + (sel.indexOf('point:') === 0 ? 'point="' + sel.slice(6) : 'line="' + sel.slice(5)) + '"][tabindex]') : null;
    if (f) f.focus();
  }
  app.addEventListener('click', function (e) {
    var t = e.target;
    var sp = t.closest('.s2-int [data-point]'), sl = t.closest('.s2-int [data-line]'), ss = t.closest('[data-sel]');
    if (sp) { selectStar('point:' + sp.getAttribute('data-point')); return; }
    if (sl) { selectStar('line:' + sl.getAttribute('data-line')); return; }
    if (ss) { selectStar(ss.getAttribute('data-sel')); return; }
    var open = t.closest('[data-open]');
    if (open) { state.studio.reportId = open.getAttribute('data-open'); state.studio.logged = null; save(); location.hash = '#/studio/b'; return; }
    var act = t.closest('[data-act]');
    if (!act) return;
    var a = act.getAttribute('data-act');
    if (a === 'suggest') { state.inp.needs = industry(state.inp.industry).suggested.slice(); save(); render(false); }
    if (a === 'clear-needs') { state.inp.needs = []; save(); render(false); }
    if (a === 'send') {
      var s = state.share;
      if (!s.cShare) { s.error = 'Tick "Share this report with Digitas" to send it.'; save(); render(false); return; }
      if (s.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) { s.error = 'That email does not look right.'; save(); render(false); return; }
      var mine = load('dc2.reports') || [], r = sim(state.inp), i = state.inp;
      var id = 'R-' + (1100 + mine.length + 1);
      mine.unshift({ id: id, receivedAt: today(), company: i.company || 'Unnamed prospect', industry: i.industry, budget: Math.round(M.budgetOf(i, D)),
                     challenge: challengeOf(i).id, status: i.status, sharing: i.sharing, needs: i.needs.slice(), own: clone(i.own || {}), contact: s.name || '', role: s.role || '',
                     consent: true, contactOk: !!s.cContact, stage: 'New', estimate: { lo: r.savings.lo, p50: r.savings.p50, hi: r.savings.hi } });
      store('dc2.reports', mine);
      s.error = ''; state.sent = id; state.studio.reportId = id; save(); render(true);
    }
    if (a === 'new-run') { var keep = state.studio; state = freshState(); state.studio = keep; save(); location.hash = '#/connect/1'; }
    if (a === 'print') { window.print(); }
    if (a === 'log') {
      var rep = currentReport(), stage = document.getElementById('o-stage').value;
      var outs = load('dc2.outcomes') || [];
      outs.push({ date: today(), id: rep.id, company: rep.company, stage: stage, actual: digits(document.getElementById('o-actual').value) || null, note: document.getElementById('o-note').value });
      store('dc2.outcomes', outs);
      var stg = load('dc2.stages') || {}; stg[rep.id] = stage; store('dc2.stages', stg);
      state.studio.logged = rep.company + ' → ' + stage; save(); render(false);
    }
  });
  app.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target;
    if (t.matches && t.matches('.s2-int [data-point], .s2-int [data-line]')) {
      e.preventDefault();
      selectStar(t.hasAttribute('data-point') ? 'point:' + t.getAttribute('data-point') : 'line:' + t.getAttribute('data-line'));
    }
    if (t.matches && t.matches('tr[data-open]')) { e.preventDefault(); t.click(); }
  });

  /* ---------- top bar ---------- */
  var presetSel = document.getElementById('preset');
  presetSel.innerHTML = '<option value="">Load an example…</option>' + D.presets.map(function (p) { return '<option value="' + p.id + '">' + esc(p.label) + '</option>'; }).join('');
  function syncPreset() { presetSel.value = ''; }
  presetSel.addEventListener('change', function () {
    if (!presetSel.value) return;
    var keep = state.studio;
    state = freshState(presetSel.value); state.studio = keep; save();
    if (current.cur.indexOf('connect') === 0) render(true); else location.hash = '#/connect/1';
  });
  document.getElementById('reset').addEventListener('click', function () {
    store('dc2.reports', undefined); store('dc2.outcomes', undefined); store('dc2.stages', undefined);
    state = freshState(); save(); cache = {};
    if (location.hash === '#/connect/1') route(); else location.hash = '#/connect/1';
  });

  window.addEventListener('hashchange', route);
  route();
}());
