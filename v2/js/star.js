/* Digitas Connect v2: the interactive star.
   Five points = Digitas's capability groups (team deck order, clockwise from the top). Ten lines = every connection between them.
   Encoding (one rule each):
   - Point filled white = the client needs services from this group; its size and number = how many services.
   - Line white = Digitas runs this connection inside one team; its thickness = what that connection saves a year.
   - Line in Digitas yellow, numbered = a connection that matters most for the client's main goal.
   - Dark hairline = not in the client's plan.
   Interaction: hover or focus shows a tooltip (data-tip / data-tipv, read by the page); selecting a point or line
   dims everything unrelated. On first render, lines draw in and points settle (skipped if the user prefers reduced motion).
   Colors live in css/v2.css (.s2-*). */
(function () {
  'use strict';
  var D = window.DCV2_DATA;
  var CX = 320, CY = 248, R = 160;
  var POS = {};
  D.points.forEach(function (p, i) {
    var a = (-90 + 72 * i) * Math.PI / 180;
    POS[p.id] = { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), i: i, p: p };
  });
  function f(n) { return n.toFixed(1); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lineKey(a, b) {
    for (var i = 0; i < D.lines.length; i++) {
      var l = D.lines[i];
      if ((l.a === a && l.b === b) || (l.a === b && l.b === a)) return l.a + '-' + l.b;
    }
    return null;
  }
  function radius(n, mini) { return mini ? 15 : n ? 19 + Math.min(n - 1, 3) * 3 : 16; }

  /* Two-line label placed outside the point, clear of its circle. */
  function label(pp, r) {
    var i = pp.i, x = pp.x, y = pp.y;
    if (i === 0) return { anchor: 'middle', x: x, y: y - r - 30 };
    if (i === 1) return { anchor: 'start', x: x + r + 12, y: y - 4 };
    if (i === 4) return { anchor: 'end', x: x - r - 12, y: y - 4 };
    return { anchor: 'middle', x: x, y: y + r + 24 };
  }

  /* opts: { covered: {pointId: count}, keyLines: [[a,b]...], selected: 'point:id' | 'line:a-b', hub: [l1, l2] | null,
             interactive, mini, animate, values: { points: {id: {savings}}, lines: {key: {savings}} }, fmt } */
  function render(opts) {
    opts = opts || {};
    var cov = opts.covered || {}, sel = opts.selected || '', mini = !!opts.mini, inter = !!opts.interactive && !mini;
    var vals = opts.values || null, fmt = opts.fmt || function (v) { return String(Math.round(v)); };
    var keys = (opts.keyLines || []).map(function (pr) { return lineKey(pr[0], pr[1]); });
    var selPoint = sel.indexOf('point:') === 0 ? sel.slice(6) : null, selLine = sel.indexOf('line:') === 0 ? sel.slice(5) : null;
    function owned(l) { return cov[l.a] && cov[l.b]; }
    function related(l) { var id = l.a + '-' + l.b; return selLine ? id === selLine : selPoint ? (l.a === selPoint || l.b === selPoint) : true; }
    function relatedPoint(id) { if (selPoint) return id === selPoint; if (selLine) { var p = selLine.split('-'); return p[0] === id || p[1] === id; } return true; }

    var maxSav = 0;
    if (vals) D.lines.forEach(function (l) { if (owned(l)) maxSav = Math.max(maxSav, vals.lines[l.a + '-' + l.b].savings); });
    function width(l) {
      if (!owned(l)) return 1.3;
      if (!vals || !maxSav) return 2.4;
      return 2 + 7 * Math.sqrt(vals.lines[l.a + '-' + l.b].savings / maxSav);
    }

    var cls = 's2' + (mini ? ' s2-mini' : '') + (inter ? ' s2-int' : '') + (sel ? ' s2-focus' : '') + (opts.animate ? ' s2-anim' : '');
    var vb = mini ? '130 62 380 380' : '28 22 584 440';
    var covNames = D.points.filter(function (p) { return cov[p.id]; }).map(function (p) { return p.name; }).join(', ');
    var out = ['<svg class="' + cls + '" viewBox="' + vb + '" role="img" aria-label="Star of Digitas\'s five capability groups: ' +
      D.points.map(function (p) { return p.name; }).join(', ') + '. Groups covering your services: ' + esc(covNames || 'none') + '.">'];
    out.push('<defs><linearGradient id="s2-grad" gradientUnits="userSpaceOnUse" x1="160" y1="0" x2="480" y2="0"><stop offset="0" stop-color="#ff7911"/><stop offset=".55" stop-color="#ffe100"/><stop offset="1" stop-color="#7cdb00"/></linearGradient></defs>');

    if (!opts.hub) {
      var layers = { dim: [], owned: [], key: [] }, n = 0;
      D.lines.forEach(function (l) {
        var id = l.a + '-' + l.b, a = POS[l.a], b = POS[l.b], on = owned(l), isKey = on && keys.indexOf(id) !== -1;
        var len = Math.hypot(b.x - a.x, b.y - a.y), d = on ? (n++) * 70 : 0;
        var tipv = on ? (vals ? fmt(vals.lines[id].savings) + ' a year' : 'Run by one Digitas team') : 'Not in your plan';
        var g = '<g class="s2-l' + (related(l) ? ' hl' : '') + '" data-line="' + id + '"' +
          (inter ? ' tabindex="0" role="button" aria-label="' + esc(a.p.name + ' and ' + b.p.name + ': ' + tipv) + '" data-tip="' + esc(a.p.name + ' × ' + b.p.name) + '" data-tipv="' + esc(tipv) + '"' : '') + '>' +
          '<line class="s2-line' + (isKey ? ' key' : on ? ' owned' : '') + (selLine === id ? ' sel' : '') + '"' + ' style="stroke-width:' + width(l).toFixed(1) + 'px;--len:' + len.toFixed(0) + ';--d:' + d + 'ms"' +
          ' x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '"/>' +
          (inter ? '<line class="s2-hit" x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '"/>' : '') + '</g>';
        layers[isKey ? 'key' : on ? 'owned' : 'dim'].push(g);
      });
      out.push(layers.dim.join('') + layers.owned.join('') + layers.key.join(''));
      if (!mini) {
        (opts.keyLines || []).forEach(function (pr, k) {
          var id = lineKey(pr[0], pr[1]);
          if (!(cov[pr[0]] && cov[pr[1]])) return;
          var a = POS[pr[0]], b = POS[pr[1]], l = { a: id.split('-')[0], b: id.split('-')[1] };
          var bt = vals ? fmt(vals.lines[id].savings) + ' a year · key for your goal' : 'Key for your goal';
          out.push('<g class="s2-badge' + (related(l) ? ' hl' : '') + '" transform="translate(' + f((a.x + b.x) / 2) + ' ' + f((a.y + b.y) / 2) + ')" data-line="' + id + '"' +
            (inter ? ' data-tip="' + esc(a.p.name + ' × ' + b.p.name) + '" data-tipv="' + esc(bt) + '"' : '') + '><circle r="12"/><text y="4.5" text-anchor="middle">' + (k + 1) + '</text></g>');
        });
      }
    } else {
      D.lines.forEach(function (l) {
        var a = POS[l.a], b = POS[l.b];
        out.push('<line class="s2-line" x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '"/>');
      });
      D.points.forEach(function (p) {
        if (!cov[p.id]) return;
        var a = POS[p.id];
        out.push('<line class="s2-spoke" x1="' + CX + '" y1="' + CY + '" x2="' + f(a.x) + '" y2="' + f(a.y) + '"/>');
      });
      out.push('<g class="s2-hub"><circle cx="' + CX + '" cy="' + CY + '" r="46"/><text x="' + CX + '" y="' + (CY - 3) + '" text-anchor="middle">' + esc(opts.hub[0]) + '</text><text x="' + CX + '" y="' + (CY + 15) + '" text-anchor="middle">' + esc(opts.hub[1] || '') + '</text></g>');
    }

    D.points.forEach(function (p, k) {
      var pp = POS[p.id], n = cov[p.id] || 0, on = n > 0, r = radius(n, mini);
      var tipv = on ? n + (n === 1 ? ' service' : ' services') + (vals ? ' · ' + fmt(vals.points[p.id].savings) + ' a year' : '') : 'None of your services';
      out.push('<g class="s2-p' + (relatedPoint(p.id) ? ' hl' : '') + '" data-point="' + p.id + '"' +
        (inter ? ' tabindex="0" role="button" aria-label="' + esc(p.name + ': ' + tipv) + '" data-tip="' + esc(p.name) + '" data-tipv="' + esc(tipv) + '"' : '') + '>' +
        (inter ? '<circle class="s2-phit" cx="' + f(pp.x) + '" cy="' + f(pp.y) + '" r="' + (r + 10) + '"/>' : '') +
        '<circle class="s2-node' + (on ? ' on' : '') + (selPoint === p.id ? ' sel' : '') + '" style="--d:' + (k * 60) + 'ms" cx="' + f(pp.x) + '" cy="' + f(pp.y) + '" r="' + r + '"/>' +
        (on && !mini ? '<text class="s2-count" x="' + f(pp.x) + '" y="' + f(pp.y + 5.5) + '" text-anchor="middle">' + n + '</text>' : ''));
      if (!mini) {
        var lb = label(pp, r);
        out.push('<text class="s2-label' + (on ? ' on' : '') + '" text-anchor="' + lb.anchor + '" x="' + f(lb.x) + '" y="' + f(lb.y) + '">' +
          '<tspan x="' + f(lb.x) + '">' + esc(p.l1) + '</tspan><tspan x="' + f(lb.x) + '" dy="18">' + esc(p.l2) + '</tspan></text>');
      }
      out.push('</g>');
    });
    out.push('</svg>');
    return out.join('');
  }
  window.DCStar2 = { render: render, lineKey: lineKey, positions: POS };
}());
