/* The star: five points (Strategy, Creative, Media, Data & Tech, Customer Experience), clockwise from the top.
   One renderer, used on every screen, so point order and colors never drift (Build Brief section 11).
   Colors live in css/styles.css (.star-*). */
(function () {
  'use strict';
  var DB = window.DigitasDB;
  var SPECS = DB.specialties.slice().sort(function (a, b) { return a.order - b.order; });
  var CX = 320, CY = 232, R = 150;

  var POS = {};
  SPECS.forEach(function (s, i) {
    var a = (-90 + 72 * i) * Math.PI / 180;
    POS[s.id] = { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a), i: i, spec: s };
  });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function f(n) { return n.toFixed(1); }

  // Label placement: top above, right-side to the right, bottom below, left-side to the left. Clear of the node ring.
  function label(p, mini) {
    if (mini) return '';
    var name = p.spec.name, i = p.i, x = p.x, y = p.y, anchor, dx = 0, dy = 0;
    if (i === 0) { anchor = 'middle'; dy = -30; }
    else if (i === 1) { anchor = 'start'; dx = 28; dy = 6; }
    else if (i === 4) { anchor = 'end'; dx = -28; dy = 6; }
    else { anchor = 'middle'; dy = 44; }
    var text;
    if (name === 'Customer Experience') {
      text = '<tspan x="' + f(x + dx) + '" dy="' + (dy - 10) + '">Customer</tspan><tspan x="' + f(x + dx) + '" dy="24">Experience</tspan>';
      return '<text class="star-label" text-anchor="' + anchor + '" x="' + f(x + dx) + '" y="' + f(y) + '">' + text + '</text>';
    }
    return '<text class="star-label" text-anchor="' + anchor + '" x="' + f(x + dx) + '" y="' + f(y + dy) + '">' + esc(name) + '</text>';
  }

  /* opts: { points: [ids] highlighted, lines: [ids] lit, mini: bool, numbered: bool } */
  function render(opts) {
    opts = opts || {};
    var hp = opts.points || [], hl = opts.lines || [], mini = !!opts.mini;
    var out = [];
    var vb = mini ? '150 60 340 320' : '0 0 640 470';
    var names = hp.map(function (id) { return POS[id].spec.name; }).join(', ');
    var litNames = hl.map(function (id) {
      var l = DB.lines.filter(function (x) { return x.id === id; })[0];
      return POS[l.a].spec.name + ' with ' + POS[l.b].spec.name;
    }).join('; ');
    out.push('<svg class="star' + (mini ? ' star-mini' : '') + '" viewBox="' + vb + '" role="img" aria-label="Star of five Digitas specialties, clockwise from the top: ' +
      SPECS.map(function (s) { return s.name; }).join(', ') + '. Highlighted: ' + (names || 'none') + '. Lit lines: ' + (litNames || 'none') + '.">');
    // Digitas brand gradient (orange to yellow to green), shared by every star so colors never drift.
    out.push('<defs><linearGradient id="dc-grad" gradientUnits="userSpaceOnUse" x1="170" y1="0" x2="470" y2="0"><stop offset="0" stop-color="#ff7911"/><stop offset=".55" stop-color="#ffe100"/><stop offset="1" stop-color="#7cdb00"/></linearGradient></defs>');

    // Unlit lines first, then lit lines on top.
    DB.lines.forEach(function (l) {
      if (hl.indexOf(l.id) !== -1) return;
      var a = POS[l.a], b = POS[l.b];
      out.push('<line class="star-line" x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '"/>');
    });
    hl.forEach(function (id) {
      var l = DB.lines.filter(function (x) { return x.id === id; })[0];
      var a = POS[l.a], b = POS[l.b];
      out.push('<line class="star-line lit" stroke="url(#dc-grad)" x1="' + f(a.x) + '" y1="' + f(a.y) + '" x2="' + f(b.x) + '" y2="' + f(b.y) + '"/>');
    });
    if (opts.numbered && !mini) {
      hl.forEach(function (id, n) {
        var l = DB.lines.filter(function (x) { return x.id === id; })[0];
        var a = POS[l.a], b = POS[l.b];
        out.push('<g class="star-badge" transform="translate(' + f((a.x + b.x) / 2) + ' ' + f((a.y + b.y) / 2) + ')"><circle r="14"/><text y="6" text-anchor="middle">' + (n + 1) + '</text></g>');
      });
    }
    SPECS.forEach(function (s) {
      var p = POS[s.id], on = hp.indexOf(s.id) !== -1;
      out.push('<circle class="star-node' + (on ? ' on' : '') + '" cx="' + f(p.x) + '" cy="' + f(p.y) + '" r="' + (mini ? 15 : 17) + '"/>');
    });
    if (!mini) {
      SPECS.forEach(function (s) {
        var on = hp.indexOf(s.id) !== -1;
        out.push(label(POS[s.id], mini).replace('class="star-label"', 'class="star-label' + (on ? ' on' : '') + '"'));
      });
    }
    out.push('</svg>');
    return out.join('');
  }

  window.DCStar = { render: render, positions: POS };
}());
