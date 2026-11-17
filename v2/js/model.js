/* Digitas Connect v2: the coordination-cost model and its Monte Carlo simulation.
   Pure functions, no DOM. Runs in the browser (window.DCModel) and in Node (module.exports) for tests.

   Idea (team meeting, Nov 13, 2026):
   - Each marketing need a client selects = one specialist partner if they go the specialist route (k partners).
   - With Digitas, every need Digitas covers moves into one connected team; needs it does not cover stay with specialists.
   - Six cost categories (team deck names) depend on how many separate partners there are.
   - Savings = reduction x (cost with k partners - cost with the connected partner count). Agency fees are held equal.
   - 10,000 draws of the uncertain variables give a range ("in 90% of simulated scenarios...") and a median.
   Seeded, so the same inputs always give the same numbers (stable for a live demo). */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m; else root.DCModel = m;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- random numbers ---------- */
  function hashString(s) { // FNV-1a, 32-bit
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function triangular(u, tri) { // inverse CDF of triangular(min, mode, max)
    var a = tri[0], c = tri[1], b = tri[2];
    if (b === a) return a;
    var fc = (c - a) / (b - a);
    return u < fc ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
  }
  function triMean(tri) { return (tri[0] + tri[1] + tri[2]) / 3; }

  /* ---------- inputs -> structure ---------- */
  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  /* Marketing share of revenue: the client's own figure if given (as a fraction), else Gartner's 7.7%. */
  function shareOf(inp, D) {
    var s = +inp.mktShare;
    return s > 0 && s < 1 ? s : D.marketingShareOfRevenue.value;
  }
  function budgetOf(inp, D) {
    if (inp.budgetMode === 'revenue') return Math.max(0, +inp.revenue || 0) * shareOf(inp, D);
    return Math.max(0, +inp.budget || 0);
  }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

  /* The client's own numbers (optional) become fixed values for the matching simulated variable. */
  function ownOverrides(inp, D) {
    var own = inp.own || {}, ov = {};
    (D.ownNumbers || []).forEach(function (o) {
      var v = +own[o.id];
      if (o.param && v > 0) { var x = v * o.toParam; ov[o.param] = [x, x, x]; }
    });
    return ov;
  }

  /* Who does what: k specialist partners today; with Digitas one team covers c needs and u stay with specialists. */
  function structure(inp, D) {
    var sel = (inp.needs || []).map(function (id) { return byId(D.needs, id); }).filter(Boolean);
    var covered = sel.filter(function (n) { return !!n.point; });
    var uncovered = sel.filter(function (n) { return !n.point; });
    var k = sel.length, c = covered.length, u = uncovered.length;
    var perPoint = {};
    D.points.forEach(function (p) { perPoint[p.id] = []; });
    covered.forEach(function (n) { perPoint[n.point].push(n); });
    var nConn = (c > 0 ? 1 : 0) + u;
    var sh = byId(D.sharing.map(function (s) { return { id: String(s.v), mult: s.mult }; }), String(inp.status === 'planning' ? 3 : inp.sharing || 3));
    var ind = byId(D.industries, inp.industry) || D.industries[0];
    var budget = budgetOf(inp, D), own = inp.own || {};
    var HR = D.fixed.hoursReferencePerPartner, RR = D.fixed.reviewReferenceBudget;
    var ownHourly = +own.hourly > 0 ? +own.hourly : 0;
    return {
      selected: sel, covered: covered, uncovered: uncovered, perPoint: perPoint,
      k: k, c: c, u: u, nToday: k, nConn: nConn,
      linesToday: k * (k - 1) / 2,
      linesOwned: c * (c - 1) / 2,
      /* Fragmentation = the chance that two pieces of the client's marketing sit with different agencies = 1 - sum(share^2),
         each need being an equal share of the work. Today, k equal agencies: (k - 1) / k. With Digitas: one team holds
         c of the k needs, each specialist holds one. Equals (n - 1) / n whenever the agencies are the same size. */
      fragToday: k > 1 ? (k - 1) / k : 0,
      fragConn: c < 2 ? (k > 1 ? (k - 1) / k : 0) : Math.max(0, 1 - (c * c + u) / (k * k)), // one covered need = nothing to connect
      budget: budget,
      mktShare: inp.budgetMode === 'revenue' ? shareOf(inp, D) : null,
      sharingMult: sh ? sh.mult : 1,
      industry: ind,
      wage: D.fixed.hourlyWage.value * ind.rate,
      ownHourly: ownHourly,
      // Hours per partner shrink for small accounts; the client's own management hours are used as given.
      hoursScale: clamp((budget / Math.max(k, 1)) / HR.value, HR.min, 1),
      mgmtOwn: +own.mgmtWeekly > 0,
      size: clamp(budget / RR.value, RR.min, RR.max)
    };
  }

  /* ---------- the six categories ---------- */
  /* ctx: { budget, sharingMult, wage, size, hoursScale, ownHourly, mgmtOwn } */
  function rateOf(p, ctx) { return ctx.ownHourly || ctx.wage; } /* BLS $45.38 is total compensation: benefits are already included */
  function mgmtOf(p, ctx) { return p.mgmtHours * (ctx.mgmtOwn ? 1 : (ctx.hoursScale || 1)); }
  function categoryCost(id, n, p, ctx, frag) {
    if (frag === undefined) frag = n > 1 ? (n - 1) / n : 0;
    var rate = rateOf(p, ctx), hs = ctx.hoursScale || 1;
    switch (id) {
      case 'admin': return n * (p.reviewCost * ctx.size / p.tenure + mgmtOf(p, ctx) * rate);
      case 'lag': return n * p.lagHours * hs * rate;
      case 'goals': return ctx.budget * p.goalsWaste * ctx.sharingMult * frag;
      case 'data': return ctx.budget * p.dataWaste * ctx.sharingMult * frag;
      case 'meas': return ctx.budget * p.measWaste * ctx.sharingMult * frag;
      case 'dup': return Math.max(n - 1, 0) * p.dupHours * hs * rate;
      default: return 0;
    }
  }

  /* ---------- simulation ---------- */
  function percentileSorted(sorted, q) {
    if (!sorted.length) return 0;
    var pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function summarize(arr, interval) {
    var s = Array.prototype.slice.call(arr).sort(function (a, b) { return a - b; });
    var tail = (1 - interval) / 2, sum = 0;
    for (var i = 0; i < s.length; i++) sum += s[i];
    return { lo: percentileSorted(s, tail), p50: percentileSorted(s, 0.5), hi: percentileSorted(s, 1 - tail), mean: s.length ? sum / s.length : 0, min: s[0] || 0, max: s[s.length - 1] || 0 };
  }
  function histogram(arr, bins, lo, hi) {
    var min = lo, max = hi, counts = new Array(bins).fill(0);
    if (min === undefined) { min = Infinity; max = -Infinity; for (var i = 0; i < arr.length; i++) { if (arr[i] < min) min = arr[i]; if (arr[i] > max) max = arr[i]; } }
    var w = (max - min) || 1;
    for (var j = 0; j < arr.length; j++) { var b = Math.floor((arr[j] - min) / w * bins); if (b >= bins) b = bins - 1; if (b < 0) b = 0; counts[b]++; }
    return { min: min, max: max, counts: counts };
  }
  function correlation(x, y) {
    var n = x.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0;
    for (i = 0; i < n; i++) { var dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : 0;
  }

  /* inp: { industry, budgetMode, budget, revenue, needs[], sharing, status, challenge }
     opts: { n, seed, overrides: { paramId: [min, mode, max] } } */
  function simulate(inp, D, opts) {
    opts = opts || {};
    var st = structure(inp, D);
    var N = opts.n || D.fixed.simulations, interval = D.fixed.interval;
    // Precedence: the client's own numbers > Studio calibration overrides > public averages.
    var own = ownOverrides(inp, D);
    var params = D.params.map(function (p) {
      var o = own[p.id] || (opts.overrides && opts.overrides[p.id]);
      return { id: p.id, tri: o ? o : p.tri, own: !!own[p.id] };
    });
    var cats = D.categories;
    var ctx = { budget: st.budget, sharingMult: st.sharingMult, wage: st.wage, size: st.size,
                hoursScale: st.hoursScale, ownHourly: st.ownHourly, mgmtOwn: st.mgmtOwn };
    var seed = opts.seed !== undefined ? opts.seed : hashString(JSON.stringify([inp.industry, budgetOf(inp, D), (inp.needs || []).slice().sort(), inp.sharing, inp.status, inp.own || null, opts.overrides || null]));
    var rnd = mulberry32(seed);

    var today = new Float64Array(N), conn = new Float64Array(N), sav = new Float64Array(N), yr1 = new Float64Array(N), hours = new Float64Array(N);
    var catToday = {}, catSav = {};
    cats.forEach(function (c) { catToday[c.id] = new Float64Array(N); catSav[c.id] = new Float64Array(N); });
    var draws = {}; params.forEach(function (p) { draws[p.id] = new Float64Array(N); });

    var dPartners = st.nToday - st.nConn, dDup = Math.max(st.nToday - 1, 0) - Math.max(st.nConn - 1, 0);
    for (var i = 0; i < N; i++) {
      var p = {};
      for (var j = 0; j < params.length; j++) { var v = triangular(rnd(), params[j].tri); p[params[j].id] = v; draws[params[j].id][i] = v; }
      var t = 0, s = 0;
      for (var c = 0; c < cats.length; c++) {
        var id = cats[c].id;
        var a = categoryCost(id, st.nToday, p, ctx, st.fragToday), b = categoryCost(id, st.nConn, p, ctx, st.fragConn);
        var save = p.reduction * (a - b);
        catToday[id][i] = a; catSav[id][i] = save; t += a; s += save;
      }
      today[i] = t; sav[i] = s; conn[i] = t - s; yr1[i] = s * p.ramp;
      hours[i] = p.reduction * (dPartners * (mgmtOf(p, ctx) + p.lagHours * ctx.hoursScale) + dDup * p.dupHours * ctx.hoursScale);
    }

    var res = {
      inputs: inp, structure: st, n: N, seed: seed, interval: interval,
      today: summarize(today, interval), connected: summarize(conn, interval), savings: summarize(sav, interval),
      year1: summarize(yr1, interval), hours: summarize(hours, interval),
      categories: cats.map(function (c) { return { id: c.id, label: c.label, plain: c.plain || c.label, explain: c.explain || '', kind: c.kind, formula: c.formula, today: summarize(catToday[c.id], interval), savings: summarize(catSav[c.id], interval) }; }),
      params: params,
      drivers: params.filter(function (pp) { return !pp.own; }).map(function (pp) { return { id: pp.id, r: correlation(draws[pp.id], sav) }; })
        .sort(function (x, y) { return Math.abs(y.r) - Math.abs(x.r); }),
      raw: { savings: sav }
    };
    /* Breakdown that adds up to the headline: the median totals are split across the six costs in proportion to each
       cost's average share. Medians of parts never sum to the median of the whole, so this keeps every number on screen consistent. */
    var tMean = res.today.mean, sMean = res.savings.mean;
    res.breakdown = res.categories.map(function (c) {
      var t = tMean ? res.today.p50 * c.today.mean / tMean : 0, s = sMean ? res.savings.p50 * c.savings.mean / sMean : 0;
      return { id: c.id, label: c.label, plain: c.plain, explain: c.explain, kind: c.kind, today: t, savings: s, connected: Math.max(0, t - s) };
    });
    function part(kind, f) { return res.breakdown.filter(function (b) { return b.kind === kind; }).reduce(function (a, b) { return a + b[f]; }, 0); }
    res.partner = { savings: part('partner', 'savings'), today: part('partner', 'today') };
    res.line = { savings: part('line', 'savings'), today: part('line', 'today') };
    res.attribution = attribute(res, D);
    return res;
  }

  /* Split the median savings across the star so each point and line can show its own number.
     Partner-based savings (admin, time lag, duplicated work) are shared equally by the covered needs.
     Line-based savings (goals, data, measurement) are shared equally by the pairs of covered needs:
     pairs inside one group belong to that point, pairs across two groups belong to that line. Totals add up. */
  function attribute(res, D) {
    var st = res.structure, c = st.c, k = st.k;
    var perNeed = c ? res.partner.savings / c : 0;
    var pairs = c * (c - 1) / 2, perPair = pairs ? res.line.savings / pairs : 0;
    var partnerTodayPerNeed = k ? res.partner.today / k : 0;
    var lineTodayPerPair = k > 1 ? res.line.today / (k * (k - 1) / 2) : 0;
    var points = {}, lines = {};
    D.points.forEach(function (p) {
      var n = st.perPoint[p.id].length, inner = n * (n - 1) / 2;
      var save = n * perNeed + inner * perPair, sep = n * partnerTodayPerNeed + inner * lineTodayPerPair;
      points[p.id] = { needs: n, savings: save, separately: sep, connected: Math.max(0, sep - save) };
    });
    D.lines.forEach(function (l) {
      var na = st.perPoint[l.a].length, nb = st.perPoint[l.b].length, pr = na * nb;
      var save = pr * perPair, sep = pr * lineTodayPerPair;
      lines[l.a + '-' + l.b] = { pairs: pr, savings: save, separately: sep, connected: Math.max(0, sep - save) };
    });
    return { points: points, lines: lines };
  }

  return {
    hashString: hashString, mulberry32: mulberry32, triangular: triangular, triMean: triMean,
    structure: structure, budgetOf: budgetOf, shareOf: shareOf, ownOverrides: ownOverrides, categoryCost: categoryCost,
    simulate: simulate, summarize: summarize, histogram: histogram, correlation: correlation
  };
}));
