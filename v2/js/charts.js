/* Digitas Connect v2: charts. Plain SVG + HTML, no libraries.

   density(): the 10,000 Monte Carlo results as a smooth curve.
     - A cursor follows the pointer (or the arrow keys). Everything to its right is shaded, and the readout says what
       share of scenarios reach at least that amount. It starts at the conservative end (95% of scenarios).
     - Under the curve, a strip marks the likely range (9 in 10 scenarios) with its two ends labeled; a hairline marks
       the most likely value.
     - One series (Connect) or two (Studio: public averages vs Digitas data), with a legend when there are two.
   bars(): one row per cost. Bar length = the cost today; the green part = what a connected team saves; the gray rest
     = what is still spent. Every row carries its numbers as text, so nothing depends on color or hover.

   Marks are drawn in a 1000 x 200 box stretched to the container; lines keep a 2px stroke (non-scaling) and all text
   is HTML, so labels stay crisp and legible at any width. */
(function () {
  'use strict';
  var W = 1000, H = 200, PEAK = 0.9, BINS = 96;
  var REG = {}, seq = 0;

  function quantile(sorted, p) {
    if (!sorted.length) return 0;
    var pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  /* Share of draws at or above v (binary search on the sorted array). */
  function atLeast(sorted, v) {
    var lo = 0, hi = sorted.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
    return sorted.length ? (sorted.length - lo) / sorted.length : 0;
  }
  /* Histogram smoothed with a Gaussian kernel: a readable curve, faithful to the draws. */
  function curve(sorted, x0, x1) {
    var c = new Float64Array(BINS), w = (x1 - x0) / BINS, i, j;
    for (i = 0; i < sorted.length; i++) { var b = Math.floor((sorted[i] - x0) / w); if (b >= 0 && b < BINS) c[b]++; }
    var sig = 3.2, r = Math.ceil(sig * 3), k = [], ks = 0;
    for (j = -r; j <= r; j++) { var g = Math.exp(-j * j / (2 * sig * sig)); k.push(g); ks += g; }
    var out = new Float64Array(BINS);
    for (i = 0; i < BINS; i++) { var s = 0; for (j = -r; j <= r; j++) { var t = i + j; if (t >= 0 && t < BINS) s += c[t] * k[j + r]; } out[i] = s / ks; }
    return out;
  }
  function yOf(d, max) { return H - (max ? d / max : 0) * H * PEAK; }
  function paths(ds, max) {
    var line = '', i;
    for (i = 0; i < BINS; i++) line += (i ? 'L' : 'M') + ((i + 0.5) / BINS * W).toFixed(1) + ' ' + yOf(ds[i], max).toFixed(1);
    var area = 'M0 ' + H + 'L0 ' + yOf(ds[0], max).toFixed(1) + line.replace(/^M/, 'L') + 'L' + W + ' ' + yOf(ds[BINS - 1], max).toFixed(1) + 'L' + W + ' ' + H + 'Z';
    return { line: line, area: area };
  }
  function densityAt(ds, frac) {
    var x = frac * BINS - 0.5, i = Math.max(0, Math.min(BINS - 1, Math.floor(x))), j = Math.min(BINS - 1, i + 1), t = Math.max(0, Math.min(1, x - i));
    return ds[i] + (ds[j] - ds[i]) * t;
  }
  function pctTxt(x) { return Math.round(x * 100) + '%'; }

  /* o: { series: [{ label, sorted, tone: 'main' | 'alt' }], fmt, verb: 'save' | 'avoid', unit: ' a year', q0: 0.05, aria } */
  function density(o) {
    var id = 'dn' + (++seq), S = o.series, fmt = o.fmt;
    var x0 = Math.min.apply(null, S.map(function (s) { return quantile(s.sorted, 0.002); }));
    var x1 = Math.max.apply(null, S.map(function (s) { return quantile(s.sorted, 0.998); }));
    var pad = (x1 - x0) * 0.05 || 1; x0 = Math.max(0, x0 - pad); x1 += pad;
    var ds = S.map(function (s) { return curve(s.sorted, x0, x1); });
    var max = Math.max.apply(null, ds.map(function (d) { return Math.max.apply(null, d); }));
    var main = S[S.length - 1], start = quantile(main.sorted, o.q0 == null ? 0.05 : o.q0);
    REG[id] = { S: S, ds: ds, max: max, x0: x0, x1: x1, fmt: fmt, verb: o.verb || 'save', unit: o.unit || '', cur: start, start: start };
    function fx(v) { return ((v - x0) / (x1 - x0) * 100).toFixed(3) + '%'; }

    var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">',
      '<defs><clipPath id="' + id + '-tail"><rect class="dn-clip" x="0" y="0" width="' + W + '" height="' + H + '"/></clipPath></defs>'];
    S.forEach(function (s, k) {
      var p = paths(ds[k], max);
      svg.push('<path class="dn-area t-' + s.tone + '" d="' + p.area + '"/>');
      svg.push('<path class="dn-tail t-' + s.tone + '" d="' + p.area + '" clip-path="url(#' + id + '-tail)"/>');
      svg.push('<path class="dn-line t-' + s.tone + '" d="' + p.line + '" vector-effect="non-scaling-stroke"/>');
    });
    svg.push('</svg>');

    var med = quantile(main.sorted, 0.5);
    var legend = S.length > 1
      ? '<ul class="dn-legend">' + S.map(function (s) { return '<li><i class="key t-' + s.tone + '"></i>' + s.label + '</li>'; }).join('') + '</ul>'
      : '<ul class="dn-legend"><li><i class="key strip-key"></i>Likely range · 9 in 10 scenarios</li><li><i class="key med-key"></i>Most likely</li></ul>';
    var strips = S.map(function (s) {
      var lo = quantile(s.sorted, 0.05), hi = quantile(s.sorted, 0.95);
      return '<div class="dn-strip t-' + s.tone + '"><span class="rng" style="left:' + fx(lo) + ';width:calc(' + fx(hi) + ' - ' + fx(lo) + ')"></span>' +
        '<span class="end lo" style="left:' + fx(lo) + '">' + fmt(lo) + '</span><span class="end hi" style="left:' + fx(hi) + '">' + fmt(hi) + '</span>' +
        (S.length > 1 ? '<span class="who">' + s.label + '</span>' : '') + '</div>';
    }).join('');

    return '<figure class="dn" id="' + id + '" data-dn="' + id + '" tabindex="0" aria-label="' + (o.aria || '') + ' Use the left and right arrow keys to explore.">' +
      '<div class="dn-head"><p class="dn-read" aria-live="polite">' + readout(id, start) + '</p>' + legend + '</div>' +
      '<div class="dn-plot">' + svg.join('') +
      '<div class="dn-med" style="left:' + fx(med) + '"><span>Most likely ' + fmt(med) + '</span></div>' +
      '<div class="dn-cur" style="left:' + fx(start) + '"></div>' +
      S.map(function (s, k) { return '<div class="dn-dot t-' + s.tone + '" data-k="' + k + '"></div>'; }).join('') + '</div>' +
      '<div class="dn-strips">' + strips + '</div></figure>';
  }

  function readout(id, v) {
    var R = REG[id], f = R.fmt(v);
    if (R.S.length === 1) return '<b>' + pctTxt(atLeast(R.S[0].sorted, v)) + '</b> of scenarios ' + R.verb + ' at least <b>' + f + '</b>' + R.unit;
    return 'Share of scenarios that ' + R.verb + ' at least <b>' + f + '</b>: ' + R.S.map(function (s) { return s.label + ' <b>' + pctTxt(atLeast(s.sorted, v)) + '</b>'; }).join(' · ');
  }
  function place(fig, v) {
    var id = fig.getAttribute('data-dn'), R = REG[id]; if (!R) return;
    v = Math.max(R.x0, Math.min(R.x1, v)); R.cur = v;
    var frac = (v - R.x0) / (R.x1 - R.x0);
    fig.querySelector('.dn-cur').style.left = (frac * 100) + '%';
    var clip = fig.querySelector('.dn-clip'); clip.setAttribute('x', (frac * W).toFixed(1)); clip.setAttribute('width', ((1 - frac) * W).toFixed(1));
    fig.querySelectorAll('.dn-dot').forEach(function (dot) {
      var k = +dot.getAttribute('data-k');
      dot.style.left = (frac * 100) + '%'; dot.style.top = (yOf(densityAt(R.ds[k], frac), R.max) / H * 100) + '%';
    });
    fig.querySelector('.dn-read').innerHTML = readout(id, v);
  }
  function hydrate(root) {
    (root || document).querySelectorAll('.dn').forEach(function (fig) { var R = REG[fig.getAttribute('data-dn')]; if (R) place(fig, R.start); });
  }
  function bind(root) {
    function fromPointer(e) {
      var plot = e.target.closest && e.target.closest('.dn-plot'); if (!plot) return;
      var fig = plot.closest('.dn'), R = REG[fig.getAttribute('data-dn')], b = plot.getBoundingClientRect();
      place(fig, R.x0 + (e.clientX - b.left) / b.width * (R.x1 - R.x0)); fig.classList.add('live');
    }
    root.addEventListener('pointermove', fromPointer);
    root.addEventListener('pointerdown', fromPointer);
    root.addEventListener('pointerleave', function (e) {
      if (!e.target.classList || !e.target.classList.contains('dn-plot')) return;
      var fig = e.target.closest('.dn'), R = REG[fig.getAttribute('data-dn')]; fig.classList.remove('live'); place(fig, R.start);
    }, true);
    root.addEventListener('keydown', function (e) {
      var fig = e.target.closest && e.target.closest('.dn'); if (!fig || e.target !== fig) return;
      var R = REG[fig.getAttribute('data-dn')], step = (R.x1 - R.x0) * (e.shiftKey ? 0.05 : 0.01);
      var map = { ArrowRight: R.cur + step, ArrowLeft: R.cur - step, Home: R.x0, End: R.x1 };
      if (!(e.key in map)) return;
      e.preventDefault(); place(fig, map[e.key]); fig.classList.add('live');
    });
    root.addEventListener('focusout', function (e) {
      var fig = e.target.classList && e.target.classList.contains('dn') ? e.target : null; if (fig) fig.classList.remove('live');
    });
  }

  /* rows: [{ label, explain, total, part }]  o: { fmt, partLabel, restLabel } */
  function bars(rows, o) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.total; })) || 1, fmt = o.fmt;
    return '<div class="bars">' +
      '<ul class="bars-legend"><li><i class="sw part"></i>' + o.partLabel + '</li><li><i class="sw rest"></i>' + o.restLabel + '</li></ul>' +
      rows.map(function (r) {
        var share = r.total ? r.part / r.total : 0, w = r.total / max * 100;
        return '<div class="brow" tabindex="0" aria-label="' + r.label + ': ' + fmt(r.part) + ' saved of ' + fmt(r.total) + ' today.">' +
          '<div class="bl"><span class="bn">' + r.label + '</span><span class="be">' + r.explain + '</span></div>' +
          '<div class="bt"><div class="bb" style="width:' + w.toFixed(2) + '%">' +
          '<span class="seg part" style="flex-basis:' + (share * 100).toFixed(2) + '%"></span>' +
          (share < 0.995 ? '<span class="seg rest"></span>' : '') + '</div></div>' +
          '<div class="bv"><b>' + fmt(r.part) + '</b><span>of ' + fmt(r.total) + '</span></div></div>';
      }).join('') + '</div>';
  }

  function reset() { REG = {}; }
  window.DCCharts = { density: density, bars: bars, bind: bind, hydrate: hydrate, reset: reset, quantile: quantile, atLeast: atLeast };
}());
