/* Digitas Connect + Digitas Connect Studio: clickable prototype.
   Everything is scripted from the shared database (window.DigitasDB). No network calls, no language model.
   Routes: #/connect/1..5   #/studio/a..d   #/database   #/business-case */
(function () {
  'use strict';
  var DB = window.DigitasDB, C = window.DCCalc, Star = window.DCStar;
  var app = document.getElementById('app');

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function find(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function ph(text) { return String(text).indexOf('[placeholder]') === 0 ? '<span class="ph">' + esc(text) + '</span>' : esc(text); }
  function usd(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  var SPEC = {}; DB.specialties.forEach(function (s) { SPEC[s.id] = s; });
  function lineName(l) { return SPEC[l.a].name + ' × ' + SPEC[l.b].name; }
  function problem(id) { return find(DB.problemMap, id) || find(DB.problemMap, 'other'); }
  function store(k, v) { try { if (v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ } }
  function load(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function sstore(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function sload(k) { try { var v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  /* ---------- state ---------- */
  var BASE = DB.costAssumptions.baseInputs;
  function freshState(sid) {
    var sc = find(DB.scenarios, sid) || DB.scenarios[0];
    return {
      scenarioId: sc.id,
      connect: { company: sc.connect.company, industry: sc.connect.industry, problem: sc.problem,
                 agencies: String(sc.connect.agencies), fees: String(BASE.totalFees), campaigns: String(BASE.campaignsPerYear), lead: null },
      studio: { client: sc.studio.client, owningAgency: sc.studio.owningAgency, challenge: sc.studio.challenge, note: sc.studio.note,
                owner: sc.studio.owningAgency, ownerResp: DB.collaborationRules.responsibilitiesTemplate.owningAgency,
                digitasResp: '', digitasRespTouched: false, credit: DB.collaborationRules.creditSplit.label,
                leadRole: 'Integration lead', loggedId: null, justLogged: null },
      bc: { fees: String(DB.roi.avgAnnualClientFees), margin: String(DB.roi.operatingMargin * 100), wins: String(DB.roi.newWins), frac: String(DB.roi.yearFractionOfProfit * 100) }
    };
  }
  var state = sload('dc.state');
  if (!state || !state.bc || !state.studio || !state.connect) state = freshState(DB.scenarios[0].id);
  function save() { sstore('dc.state', state); }

  function setPath(path, value) {
    var parts = path.split('.'), o = state;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
    save();
  }
  function refs() {
    var r = load('dc.referrals');
    if (!r) { r = DB.referralSeed.map(function (x) { return JSON.parse(JSON.stringify(x)); }); store('dc.referrals', r); }
    return r;
  }
  function leads() { return load('dc.leads') || []; }

  /* ---------- routing ---------- */
  function parseHash() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var q = raw.split('?'), path = q[0].split('/').filter(Boolean), query = {};
    if (q[1]) q[1].split('&').forEach(function (kv) { var p = kv.split('='); query[p[0]] = decodeURIComponent(p[1] || ''); });
    return { path: path, query: query };
  }

  function route() {
    var h = parseHash(), p = h.path;
    if (h.query.s && find(DB.scenarios, h.query.s) && h.query.s !== state.scenarioId) { state = freshState(h.query.s); save(); }
    if (h.query.s) history.replaceState(null, '', '#/' + p.join('/'));
    var area = p[0] || 'connect', step = p[1], key, cur;
    if (area === 'connect') { var n = Math.min(5, Math.max(1, parseInt(step, 10) || 1)); key = 'connect' + n; cur = 'connect/' + n; }
    else if (area === 'studio') { var k = ['a', 'b', 'c', 'd'].indexOf(step) === -1 ? 'a' : step; key = 'studio' + k; cur = 'studio/' + k; }
    else if (area === 'database') { key = 'database'; cur = 'database'; }
    else if (area === 'business-case') { key = 'bc'; cur = 'business-case'; }
    else { location.hash = '#/connect/1'; return; }
    render(cur, key);
    syncScenarioSelect();
  }

  function render(cur, key) {
    var area = cur.split('/')[0]; area = (area === 'database' || area === 'business-case') ? 'reference' : area;
    document.querySelectorAll('[data-area]').forEach(function (a) {
      if (a.getAttribute('data-area') === area) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    app.innerHTML = SCREENS[key]();
    window.scrollTo(0, 0);
    document.title = 'Digitas Connect Prototype: ' + key;
    if (key === 'connect4') updateCompare();
    if (key === 'bc') updateBC();
  }

  /* Client journey: the same five steps on every Connect screen; Studio has four. */
  var CJ = [['Start', 'connect/1'], ['Your star', 'connect/2'], ['Proof', 'connect/3'], ['Compare', 'connect/4'], ['Next step', 'connect/5']];
  var SJ = [['Start', 'studio/a'], ['Match', 'studio/b'], ['Agreement', 'studio/c'], ['Log', 'studio/d']];
  function journey(steps, cur) {
    return '<ol class="journey" aria-label="Progress">' + steps.map(function (s, i) {
      var cls = i < cur ? 'done' : i === cur ? 'now' : '';
      return '<li class="' + cls + '" data-n="' + (steps === SJ ? String.fromCharCode(65 + i) : i + 1) + '"' + (i === cur ? ' aria-current="step"' : '') + '><a href="#/' + s[1] + '">' + esc(s[0]) + '</a></li>';
    }).join('') + '</ol>';
  }
  /* Page header: journey, one headline, at most one short sentence. */
  function head(o) {
    return '<header class="page-head">' + (o.steps ? journey(o.steps, o.cur) : '') +
      (o.viewer ? '<p class="viewer">' + esc(o.viewer) + '</p>' : '') +
      '<h1>' + o.title + '</h1>' + (o.lede ? '<p class="lede">' + o.lede + '</p>' : '') + '</header>';
  }
  var VIEW_ELENA = 'Elena · CMO';
  var VIEW_JAMES = 'James · Groupe agency leader';

  function lineList(prob) {
    if (!prob.lines.length) return '<p class="muted">Tell us a little more and a Digitas strategist will map the lines that matter for your challenge.</p>';
    return '<ol class="linelist">' + prob.lines.map(function (pl, i) {
      var l = find(DB.lines, pl.line);
      return '<li><span class="n" aria-hidden="true">' + (i + 1) + '</span><div><div class="t">' + esc(lineName(l)) + '</div><div class="s">' + esc(pl.sentence) + '</div></div></li>';
    }).join('') + '</ol>';
  }

  function caseCard(c) {
    var names = c.specialtiesUsed.map(function (id) { return SPEC[id].name; }).join(', ');
    return '<article class="panel case">' +
      '<div class="case-head"><h3>' + esc(c.client) + '</h3><span class="tag ' + (c.verified ? 'good' : 'warn') + '">' + (c.verified ? 'Verified' : 'Not yet verified') + '</span></div>' +
      '<div class="withstar">' + Star.render({ points: c.specialtiesUsed, lines: c.linesConnected, mini: true }) + '<span class="small muted">' + esc(names) + '</span></div>' +
      '<div class="row"><span>Problem</span><span>' + ph(c.problemLabel) + '</span></div>' +
      '<div class="row"><span>Result</span><span>' + ph(c.result) + '</span></div>' +
      '<div class="row"><span>Source</span><span>' + ph(c.sourceLink) + '</span></div></article>';
  }
  function casesFor(probId) {
    var m = DB.caseStudies.filter(function (c) { return c.demoSlot.indexOf(probId) !== -1; });
    return m.length ? m : DB.caseStudies;
  }
  function nav(back, next, nextLabel) {
    return '<div class="actions">' + (back ? '<a class="btn ghost" href="' + back + '">Back</a>' : '') + (next ? '<a class="btn" href="' + next + '">' + nextLabel + '</a>' : '') + '</div>';
  }

  /* ---------- Digitas Connect ---------- */
  var SCREENS = {};

  SCREENS.connect1 = function () {
    var c = state.connect;
    return head({ steps: CJ, cur: 0, viewer: VIEW_ELENA, title: 'Show us your marketing challenge.' }) +
      '<div class="panel" style="max-width:48rem">' +
      '<div class="fields-2"><div class="field"><label for="company">Company</label><input id="company" type="text" data-path="connect.company" value="' + esc(c.company) + '" autocomplete="off"></div>' +
      '<div class="field"><label for="industry">Industry</label><select id="industry" data-path="connect.industry">' +
      DB.industries.map(function (i) { return '<option' + (i === c.industry ? ' selected' : '') + '>' + esc(i) + '</option>'; }).join('') + '</select></div></div>' +
      '<fieldset style="border:0;padding:0;margin:0 0 1.1rem"><legend class="label" style="padding:0;margin-bottom:.5rem">Challenge</legend><div class="choices">' +
      DB.problemMap.map(function (p) {
        return '<label class="choice"><input type="radio" name="problem" data-path="connect.problem" value="' + p.id + '"' + (p.id === c.problem ? ' checked' : '') + '><span>' + esc(p.label) + '</span></label>';
      }).join('') + '</div></fieldset>' +
      '<div class="field" style="max-width:18rem"><label for="agencies">Agencies today (optional)</label><input id="agencies" type="number" min="0" step="1" data-path="connect.agencies" value="' + esc(c.agencies) + '"></div>' +
      '<a class="btn" href="#/connect/2">Build my strategy</a></div>';
  };

  SCREENS.connect2 = function () {
    var c = state.connect, prob = problem(c.problem), company = c.company || 'Your company';
    var lede = prob.lines.length ? esc(prob.label) + ' needs ' + prob.points.length + ' specialties working as one.' : 'Tell us more and a strategist maps your lines.';
    return head({ steps: CJ, cur: 1, viewer: VIEW_ELENA, title: esc(company) + ': your star', lede: lede }) +
      '<div class="grid-star"><div>' + Star.render({ points: prob.points, lines: prob.lines.map(function (l) { return l.line; }), numbered: true }) +
      '<p class="under-star">Specialists can do each point. The value is in the lines.</p></div>' +
      '<div class="panel"><h2>The lines that matter</h2>' + lineList(prob) + '</div></div>' +
      nav('#/connect/1', '#/connect/3', 'See the proof');
  };

  SCREENS.connect3 = function () {
    var prob = problem(state.connect.problem), cases = casesFor(prob.id);
    var unverified = cases.some(function (c) { return !c.verified; });
    return head({ steps: CJ, cur: 2, viewer: VIEW_ELENA, title: 'Proof: we have connected these lines',
      lede: unverified ? '<span class="ph">[placeholder]</span> until Digitas confirms each result.' : '' }) +
      '<div class="grid-3">' + cases.map(caseCard).join('') + '</div>' +
      nav('#/connect/2', '#/connect/4', 'Compare');
  };

  function compareHTML() {
    var cn = state.connect;
    var h = C.hiddenCosts(DB.costAssumptions, { totalFees: cn.fees, agencies: cn.agencies, campaigns: cn.campaigns });
    var body = h.rows.map(function (r) {
      return '<tr><td>' + esc(r.label) + '</td><td class="num">' + C.money(r.specialist) + '</td><td class="num">' + C.money(r.digitas) + '</td><td class="num"><b>' + C.money(r.savings) + '</b></td></tr>';
    }).join('');
    return '<div class="kpis"><div class="kpi"><span class="label">Specialists only</span><span class="value">' + C.money(h.totals.specialist) + '</span><span class="sub">hidden cost per year</span></div>' +
      '<div class="kpi"><span class="label">Digitas connected</span><span class="value">' + C.money(h.totals.digitas) + '</span><span class="sub">hidden cost per year</span></div>' +
      '<div class="kpi hero"><span class="label">Annual savings</span><span class="value">' + C.money(h.totals.savings) + '</span><span class="sub">' + C.money(h.savingsByType.cost) + ' cost + ' + C.money(h.savingsByType.upside) + ' upside</span></div></div>' +
      '<div class="panel"><table><thead><tr><th>Hidden cost</th><th class="num">Specialists only</th><th class="num">Digitas connected</th><th class="num">Savings</th></tr></thead><tbody>' + body + '</tbody>' +
      '<tfoot><tr><td>Total</td><td class="num">' + C.money(h.totals.specialist) + '</td><td class="num">' + C.money(h.totals.digitas) + '</td><td class="num">' + C.money(h.totals.savings) + '</td></tr></tfoot></table>' +
      '<p class="est">Estimates based on stated assumptions.</p></div>';
  }
  function updateCompare() { var el = document.getElementById('compare-results'); if (el) el.innerHTML = compareHTML(); }

  /* "How we calculated this": formula, basis for each side, and source, kept off the main view. */
  function howTable() {
    var cn = state.connect;
    var h = C.hiddenCosts(DB.costAssumptions, { totalFees: cn.fees, agencies: cn.agencies, campaigns: cn.campaigns });
    return '<table class="small"><thead><tr><th>Row</th><th>Formula</th><th>Specialists</th><th>Digitas</th><th>Source</th></tr></thead><tbody>' +
      DB.costAssumptions.rows.map(function (r) {
        return '<tr><td>' + esc(r.label) + '</td><td>' + esc(r.formula) + '</td><td>' + esc(detail(r, 'specialist', h)) + '</td><td>' + esc(detail(r, 'digitas', h)) + '</td><td>' + ph(r.source) + '</td></tr>';
      }).join('') + '</tbody></table><p class="small muted" style="margin-top:.8rem">' + usd(BASE.hourlyCost) + '/hr loaded cost, ' + usd(BASE.revenuePerCampaignDay) + ' revenue per campaign-day, campaign spend ' + C.money(BASE.campaignSpendBaseline) + ' at ' + C.money(BASE.feesBaseline) + ' of fees (scales with fees). All <span class="ph">[placeholder]</span>.</p>';
  }
  function detail(row, side, h) {
    var p = row[side], inp = h.inputs, partners = side === 'specialist' ? inp.agencies : BASE.digitasPartners;
    var spend = inp.totalFees * BASE.campaignSpendBaseline / BASE.feesBaseline;
    switch (row.id) {
      case 'agencyManagement': return partners + (partners === 1 ? ' partner' : ' partners') + ', ' + p.hoursPerMonth + ' hrs/mo';
      case 'duplicatedWork': return C.pct(p.pct) + ' of fees';
      case 'disconnectedGoals': return C.pct(p.pct) + ' of ' + C.money(spend) + ' spend';
      case 'reportReconciliation': return p.hoursPerMonth + ' hrs/mo';
      case 'timeLag': return p.days + ' days × ' + inp.campaigns + ' campaigns';
    }
    return '';
  }

  SCREENS.connect4 = function () {
    var cn = state.connect;
    return head({ steps: CJ, cur: 3, viewer: VIEW_ELENA, title: 'Specialists only vs. Digitas connected', lede: 'Edit your numbers. The table updates.' }) +
      '<div class="panel"><div class="fields-3">' +
      '<div class="field"><label for="fees">Agency fees per year ($)</label><input id="fees" type="number" min="0" step="50000" data-path="connect.fees" data-live="compare" value="' + esc(cn.fees) + '"></div>' +
      '<div class="field"><label for="ag2">Agencies</label><input id="ag2" type="number" min="1" step="1" data-path="connect.agencies" data-live="compare" value="' + esc(cn.agencies) + '"></div>' +
      '<div class="field"><label for="camp">Campaigns per year</label><input id="camp" type="number" min="1" step="1" data-path="connect.campaigns" data-live="compare" value="' + esc(cn.campaigns) + '"></div></div></div>' +
      '<div id="compare-results" aria-live="polite" style="margin-top:1.5rem"></div>' +
      '<details style="margin-top:1.2rem"><summary class="eyebrow" style="cursor:pointer;color:var(--white)">How we calculated this</summary><div class="panel" style="margin-top:.8rem" id="how">' + howTable() + '</div></details>' +
      nav('#/connect/3', '#/connect/5', 'Next step');
  };

  SCREENS.connect5 = function () {
    var cn = state.connect, lead = cn.lead, prob = problem(cn.problem);
    var h = C.hiddenCosts(DB.costAssumptions, { totalFees: cn.fees, agencies: cn.agencies, campaigns: cn.campaigns });
    var form = '<form id="lead-form" novalidate data-action="lead"><div class="field"><label for="ln">Name</label><input id="ln" name="name" type="text" required autocomplete="name"></div>' +
      '<div class="field"><label for="le">Email</label><input id="le" name="email" type="email" required autocomplete="email"></div>' +
      '<div class="field"><label for="lc">Company</label><input id="lc" name="company" type="text" required value="' + esc(cn.company) + '" autocomplete="organization"></div>' +
      '<p id="lead-error" class="small" style="color:var(--orange);min-height:1.2rem" role="alert"></p>' +
      '<button class="btn" type="submit">Talk to a Digitas strategist</button></form>';
    var done = lead ? '<div class="banner ok"><b>Thanks, ' + esc(lead.name) + '.</b> A Digitas strategist will be in touch with ' + esc(lead.company) + '.<br><span class="small muted">Prototype: nothing is sent; saved in this browser only.</span></div>' : '';
    var recap = '<dl class="recap"><div><dt>Challenge</dt><dd>' + esc(prob.label) + '</dd></div>' +
      '<div><dt>Star</dt><dd>' + prob.points.length + ' specialties, ' + prob.lines.length + ' lines</dd></div>' +
      '<div><dt>Est. annual savings</dt><dd class="big">' + C.money(h.totals.savings) + '</dd></div></dl>';
    return head({ steps: CJ, cur: 4, viewer: VIEW_ELENA, title: 'Talk to a Digitas strategist', lede: 'We walk through your star and your numbers.' }) +
      '<div class="grid-2"><div class="panel">' + done + (lead ? '<a class="btn ghost" href="#/connect/1">Start over</a>' : form) + '</div>' +
      '<div class="panel"><h2>Your summary</h2>' + recap + '</div></div>' +
      nav('#/connect/4', null);
  };

  /* ---------- Digitas Connect Studio ---------- */
  function studioProb() { return problem(state.studio.challenge); }
  function digitasRespDefault() {
    var prob = studioProb();
    var t = DB.collaborationRules.responsibilitiesTemplate.digitas;
    if (!prob.lines.length) return t;
    return t + ' Lines: ' + prob.lines.map(function (pl) { return lineName(find(DB.lines, pl.line)); }).join('; ') + '.';
  }

  SCREENS.studioa = function () {
    var s = state.studio;
    return head({ steps: SJ, cur: 0, viewer: VIEW_JAMES, title: 'Bring in the right team', lede: 'Your agency keeps the client.' }) +
      '<div class="panel" style="max-width:48rem"><div class="fields-2"><div class="field"><label for="sclient">Client name</label><input id="sclient" type="text" data-path="studio.client" value="' + esc(s.client) + '"></div>' +
      '<div class="field"><label for="sagency">Owning agency (the Point Owner)</label><input id="sagency" type="text" data-path="studio.owningAgency" data-sync-owner="1" value="' + esc(s.owningAgency) + '"></div></div>' +
      '<div class="field"><label for="schal">Opportunity or challenge</label><select id="schal" data-path="studio.challenge" data-reset-resp="1">' +
      DB.problemMap.map(function (p) { return '<option value="' + p.id + '"' + (p.id === s.challenge ? ' selected' : '') + '>' + esc(p.label) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="snote">What the client is asking for</label><textarea id="snote" data-path="studio.note">' + esc(s.note) + '</textarea></div>' +
      '<a class="btn" href="#/studio/b">Find the right team</a></div>';
  };

  SCREENS.studiob = function () {
    var s = state.studio, prob = studioProb(), cases = casesFor(prob.id);
    var specs = DB.specialties.filter(function (x) { return prob.points.indexOf(x.id) !== -1; });
    return head({ steps: SJ, cur: 1, viewer: VIEW_JAMES, title: esc(s.client) + ': the right team', lede: esc(s.owningAgency) + ' stays the Point Owner.' }) +
      '<div class="grid-star"><div>' + Star.render({ points: prob.points, lines: prob.lines.map(function (l) { return l.line; }), numbered: true }) + '</div>' +
      '<div class="panel"><h2>Recommended specialists</h2><table><thead><tr><th>Specialty</th><th>Team</th><th>Role</th></tr></thead><tbody>' +
      specs.map(function (x) { return '<tr><td><b>' + esc(x.name) + '</b><span class="detail">' + esc(x.subCapabilities.slice(0, 3).join(', ')) + '</span></td><td>' + esc(x.team) + '</td><td>' + esc(x.role) + '</td></tr>'; }).join('') +
      '</tbody></table></div></div>' +
      '<div class="panel"><h2>Suggested collaboration</h2><p class="muted">Digitas works on these lines. ' + esc(s.owningAgency) + ' keeps the client.</p>' + lineList(prob) + '</div>' +
      '<h2 class="section-title">Related case studies</h2><div class="grid-3">' + cases.map(caseCard).join('') + '</div>' +
      nav('#/studio/a', '#/studio/c', 'Set up the referral');
  };

  function ownerHint(changed) {
    return changed ? '<span style="color:var(--orange)">Changed from the default. Both agencies must agree to this.</span>' : esc(DB.collaborationRules.ownershipDefault);
  }

  SCREENS.studioc = function () {
    var s = state.studio;
    if (!s.digitasRespTouched) s.digitasResp = digitasRespDefault();
    var changed = s.owner.trim() !== s.owningAgency.trim();
    var rules = DB.collaborationRules;
    return head({ steps: SJ, cur: 2, viewer: VIEW_JAMES, title: 'Referral agreement', lede: 'Defaults protect your client. Edit before you log.' }) +
      '<div class="panel" style="max-width:54rem">' +
      '<div class="field"><label for="aowner">Client owner</label><input id="aowner" type="text" data-path="studio.owner" data-live="owner" value="' + esc(s.owner) + '">' +
      '<p class="hint" id="owner-hint">' + ownerHint(changed) + '</p></div>' +
      '<div class="fields-2"><div class="field"><label for="aresp1">Stays with ' + esc(s.owningAgency) + '</label><textarea id="aresp1" data-path="studio.ownerResp">' + esc(s.ownerResp) + '</textarea></div>' +
      '<div class="field"><label for="aresp2">Digitas takes on</label><textarea id="aresp2" data-path="studio.digitasResp" data-touch="1">' + esc(s.digitasResp) + '</textarea></div></div>' +
      '<div class="fields-2"><div class="field"><label for="acredit">Revenue credit split</label><input id="acredit" type="text" data-path="studio.credit" value="' + esc(s.credit) + '"><p class="hint">' + esc(rules.creditSplit.note) + ' Credit is internal.</p></div>' +
      '<div class="field"><label for="alead">Integration lead</label><input id="alead" type="text" data-path="studio.leadRole" value="' + esc(s.leadRole) + '"><p class="hint">' + esc(rules.integrationLeadRole) + '</p></div></div>' +
      '<div class="actions" style="margin-top:.5rem"><a class="btn ghost" href="#/studio/b">Back</a><button class="btn" type="button" data-action="log-referral">Log referral</button></div></div>';
  };

  SCREENS.studiod = function () {
    var list = refs(), s = state.studio;
    var inProg = list.filter(function (r) { return r.status === 'Joint proposal in progress'; }).length;
    var seeds = list.filter(function (r) { return /^\[Seed example\]/.test(r.client); }).length;
    var statuses = ['Agreement logged', 'Joint proposal in progress', 'Won', 'Closed'];
    return head({ steps: SJ, cur: 3, viewer: VIEW_JAMES, title: 'Referral log' }) +
      (s.justLogged ? '<div class="banner ok"><b>Referral ' + esc(s.justLogged) + ' logged.</b> ' + esc(s.owner) + ' keeps client ownership. The participating teams and responsibilities are recorded before work starts.</div>' : '') +
      '<div class="kpis"><div class="kpi"><span class="label">Referrals logged</span><span class="value">' + list.length + '</span><span class="sub">includes ' + seeds + ' seed examples</span></div>' +
      '<div class="kpi"><span class="label">Joint proposals in progress</span><span class="value">' + inProg + '</span></div>' +
      '<div class="kpi"><span class="label">Time saved finding the right team</span><span class="value"><span class="ph" style="font-size:1.1rem">[placeholder]</span></span><span class="sub">to be measured in the pilot</span></div></div>' +
      '<div class="panel"><table><thead><tr><th>Referral</th><th>Client</th><th>Owning agency</th><th>Status</th><th>Credit split</th><th>Integration lead</th></tr></thead><tbody>' +
      list.slice().reverse().map(function (r) {
        return '<tr class="' + (r.id === s.justLogged ? 'new' : '') + '"><td>' + esc(r.id) + '</td><td>' + esc(r.client) + '</td><td>' + esc(r.owner || r.owningAgency) + '</td><td>' +
          '<select aria-label="Status for ' + esc(r.id) + '" data-action="status" data-id="' + esc(r.id) + '">' + statuses.map(function (x) { return '<option' + (x === r.status ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td>' +
          '<td>' + ph(r.creditSplit) + '</td><td>' + esc(r.integrationLead) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      nav('#/studio/c', '#/database', 'See the one database');
  };

  /* ---------- one database ---------- */
  SCREENS.database = function () {
    var tables = [
      { name: 'Specialties', n: DB.specialties.length, unit: 'points', reads: 'Connect 2, 3 · Studio B' },
      { name: 'Case studies', n: DB.caseStudies.length, unit: 'cases', reads: 'Connect 3 · Studio B' },
      { name: 'Problem map', n: DB.problemMap.length, unit: 'problem types', reads: 'Connect 2 · Studio B' },
      { name: 'Collaboration rules', n: 1, unit: 'rule set', reads: 'Studio C' },
      { name: 'Cost assumptions', n: DB.costAssumptions.rows.length, unit: 'hidden-cost rows', reads: 'Connect 4' }
    ];
    return head({ viewer: 'Behind the scenes', title: 'One database', lede: 'One source, two platforms.' }) +
      '<div class="dbmap"><div class="panel platform"><h2>Digitas Connect</h2><p class="muted">For prospective clients like Elena</p><p>Shows the value of connection</p><p><a class="btn small" href="#/connect/1">Open</a></p></div>' +
      '<div class="panel db"><h2>Shared database</h2><ul>' + tables.map(function (t) {
        return '<li><span><b>' + t.name + '</b><br><span class="reads">' + t.reads + '</span></span><span>' + t.n + ' <span class="muted small">' + t.unit + '</span></span></li>';
      }).join('') + '</ul><p class="small muted" style="margin:.9rem 0 0">Referral log: ' + refs().length + ' records (written by Digitas Connect Studio)</p></div>' +
      '<div class="panel platform"><h2>Digitas Connect Studio</h2><p class="muted">For Digitas and Groupe employees like James</p><p>Makes collaboration easy and safe</p><p><a class="btn small" href="#/studio/a">Open</a></p></div></div>' +
      '<p class="under-star" style="margin-top:1.5rem">Table data lives in <code>data/database.json</code> and is exported to CSV in <code>data/csv/</code>.</p>';
  };

  /* ---------- business case (team reference) ---------- */
  var COLORS = ['#ffffff', '#ff7911', '#ffe100', '#7cdb00', '#c9c9c9', '#8a8a8a', '#4a4a4a'];
  SCREENS.bc = function () {
    var b = C.budget(DB.budget), bc = state.bc;
    return head({ viewer: 'Behind the scenes · team only', title: 'Business case', lede: 'Budget, ROI and KPIs. Every figure is a <span class="ph">[placeholder]</span> until sourced.' }) +
      '<div class="grid-2"><div class="panel"><h2>Budget: ' + C.money(b.total) + '</h2>' +
      '<div class="stack" role="img" aria-label="Budget split">' + b.items.map(function (i, k) { return '<i style="width:' + (i.share * 100).toFixed(2) + '%;background:' + COLORS[k % COLORS.length] + '" title="' + esc(i.label) + '"></i>'; }).join('') + '</div>' +
      '<div class="legend">' + b.items.map(function (i, k) { return '<span><b style="background:' + COLORS[k % COLORS.length] + '"></b>' + esc(i.label) + '</span>'; }).join('') + '</div>' +
      '<table style="margin-top:1rem"><tbody>' + b.items.map(function (i) { return '<tr><td>' + esc(i.label) + '</td><td class="num">' + C.money(i.amount) + '</td></tr>'; }).join('') + '</tbody>' +
      '<tfoot><tr><td>Total</td><td class="num">' + C.money(b.total) + '</td></tr></tfoot></table>' +
      '<p class="small muted" style="margin-top:.8rem">Draft split. Rebuild each line as people × time × rate with a cited rate and timeline.</p></div>' +
      '<div class="panel"><h2>Return on investment</h2>' +
      '<div class="fields-2"><div class="field"><label for="bfees">Avg annual client fees ($)</label><input id="bfees" type="number" min="0" step="50000" data-path="bc.fees" data-live="bc" value="' + esc(bc.fees) + '"></div>' +
      '<div class="field"><label for="bmargin">Operating margin (%)</label><input id="bmargin" type="number" min="0" step="0.5" data-path="bc.margin" data-live="bc" value="' + esc(bc.margin) + '"></div>' +
      '<div class="field"><label for="bwins">New client wins in year 1</label><input id="bwins" type="number" min="0" step="1" data-path="bc.wins" data-live="bc" value="' + esc(bc.wins) + '"></div>' +
      '<div class="field"><label for="bfrac">Share of a year of profit (%)</label><input id="bfrac" type="number" min="0" max="100" step="5" data-path="bc.frac" data-live="bc" value="' + esc(bc.frac) + '"></div></div>' +
      '<div id="roi-out" aria-live="polite"></div></div></div>' +
      '<div class="panel"><h2>KPIs: Acquire, Grow, Retain</h2><div class="grid-3">' + DB.kpis.map(function (k) {
        return '<div><h3>' + esc(k.stage) + '</h3><ul>' + k.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      }).join('') + '</div></div>';
  };

  function updateBC() {
    var el = document.getElementById('roi-out'); if (!el) return;
    var bc = state.bc;
    var r = C.roi(DB.roi, DB.budget.total, { avgAnnualClientFees: bc.fees, operatingMargin: parseFloat(bc.margin) / 100, newWins: bc.wins, yearFractionOfProfit: parseFloat(bc.frac) / 100 });
    el.innerHTML = '<table><tbody>' +
      '<tr><td>Profit per client per year</td><td class="num"><b>' + C.money(r.profitPerClient) + '</b></td></tr>' +
      '<tr><td>Wins needed to break even</td><td class="num"><b>' + r.winsToBreakEven.toFixed(2) + '</b></td></tr>' +
      '<tr><td>Year-1 profit from ' + r.inputs.wins + ' wins (starting mid-year)</td><td class="num"><b>' + C.money(r.yearOneProfit) + '</b></td></tr>' +
      '<tr><td>Year-1 ROI</td><td class="num"><b>' + Math.round(r.yearOneROI * 100) + '%</b></td></tr>' +
      '<tr><td>Long-term value</td><td class="num">' + (r.longTermValue == null ? '<span class="ph">[placeholder] lifespan</span>' : C.money(r.longTermValue)) + '</td></tr></tbody></table>' +
      '<p class="small muted" style="margin-top:.8rem">Illustration only. Assumes wins start mid-year. Margin from Publicis Groupe annual results (to verify); lifespan from retainer research (to cite).</p>';
  }

  /* ---------- events ---------- */
  app.addEventListener('input', function (e) {
    var t = e.target, path = t.getAttribute && t.getAttribute('data-path');
    if (!path) return;
    setPath(path, t.value);
    if (t.getAttribute('data-touch')) setPath('studio.digitasRespTouched', true);
    if (t.getAttribute('data-sync-owner')) setPath('studio.owner', t.value);
    var live = t.getAttribute('data-live');
    if (live === 'compare') { updateCompare(); var hw = document.getElementById('how'); if (hw) hw.innerHTML = howTable(); }
    if (live === 'bc') updateBC();
    if (live === 'owner') { var hint = document.getElementById('owner-hint'); if (hint) hint.innerHTML = ownerHint(state.studio.owner.trim() !== state.studio.owningAgency.trim()); }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute('data-path')) {
      setPath(t.getAttribute('data-path'), t.value);
      if (t.getAttribute('data-reset-resp')) setPath('studio.digitasRespTouched', false);
      if (t.getAttribute('data-sync-owner')) setPath('studio.owner', t.value);
    }
    if (t.getAttribute && t.getAttribute('data-action') === 'status') {
      var list = refs();
      list.forEach(function (r) { if (r.id === t.getAttribute('data-id')) r.status = t.value; });
      store('dc.referrals', list);
      var y = window.scrollY; route(); window.scrollTo(0, y);
    }
  });
  app.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-action]') : null;
    if (t && t.getAttribute('data-action') === 'log-referral') logReferral();
  });
  app.addEventListener('submit', function (e) {
    if (e.target.id !== 'lead-form') return;
    e.preventDefault();
    var f = e.target, name = f.name.value.trim(), email = f.email.value.trim(), company = f.company.value.trim();
    var err = document.getElementById('lead-error');
    if (!name || !company || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Please add your name, a valid email and your company.'; return; }
    var list = leads(); list.push({ name: name, email: email, company: company, at: new Date().toISOString() }); store('dc.leads', list);
    state.connect.lead = { name: name, company: company }; save();
    route();
  });

  function logReferral() {
    var s = state.studio, list = refs(), prob = studioProb();
    var rec = {
      id: s.loggedId || 'REF-' + ('00' + (list.length + 1)).slice(-3),
      client: s.client, owningAgency: s.owningAgency, owner: s.owner,
      challenge: prob.id, teams: prob.points.map(function (id) { return SPEC[id].team; }),
      responsibilities: { owningAgency: s.ownerResp, digitas: s.digitasResp },
      status: 'Agreement logged', creditSplit: s.credit, integrationLead: s.leadRole,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    var idx = -1; list.forEach(function (r, i) { if (r.id === rec.id) idx = i; });
    if (idx >= 0) { rec.status = list[idx].status; list[idx] = rec; } else list.push(rec);
    store('dc.referrals', list);
    s.loggedId = rec.id; s.justLogged = rec.id; save();
    location.hash = '#/studio/d';
  }

  /* ---------- demo controls ---------- */
  var sel = document.getElementById('scenario');
  sel.innerHTML = DB.scenarios.map(function (s) { return '<option value="' + s.id + '">' + esc(s.label) + '</option>'; }).join('');
  function syncScenarioSelect() { sel.value = state.scenarioId; }
  sel.addEventListener('change', function () { state = freshState(sel.value); save(); route(); });
  document.getElementById('reset').addEventListener('click', function () {
    store('dc.referrals', undefined); store('dc.leads', undefined);
    state = freshState(state.scenarioId); save(); route();
  });

  window.addEventListener('hashchange', route);
  route();
}());
