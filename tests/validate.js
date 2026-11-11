'use strict';
/* Integrity checks for data/database.json. Returns a list of error strings (empty = OK). */
const ORDER = ['strategy', 'creative', 'media', 'data', 'cx'];

function validate(db) {
  const e = [];
  const ids = db.specialties.map(s => s.id);
  if (JSON.stringify(ids) !== JSON.stringify(ORDER)) e.push('Specialties must be in order ' + ORDER.join(', ') + ' (clockwise from the top). Got: ' + ids.join(', '));
  db.specialties.forEach((s, i) => { if (s.order !== i + 1) e.push('Specialty ' + s.id + ' has wrong order number'); });

  if (db.lines.length !== 10) e.push('Expected 10 lines, found ' + db.lines.length);
  const lineIds = new Set(db.lines.map(l => l.id));
  const seenPairs = new Set();
  db.lines.forEach(l => {
    if (!ids.includes(l.a) || !ids.includes(l.b)) e.push('Line ' + l.id + ' references an unknown specialty');
    if (l.a === l.b) e.push('Line ' + l.id + ' connects a point to itself');
    seenPairs.add([l.a, l.b].sort().join('|'));
    if (!l.general) e.push('Line ' + l.id + ' has no general sentence');
  });
  if (seenPairs.size !== 10) e.push('Lines must cover all 10 distinct pairs of the 5 points');

  db.problemMap.forEach(p => {
    p.points.forEach(pt => { if (!ids.includes(pt)) e.push('Problem ' + p.id + ' references unknown point ' + pt); });
    p.lines.forEach(l => {
      if (!lineIds.has(l.line)) e.push('Problem ' + p.id + ' references unknown line ' + l.line);
      if (!l.sentence) e.push('Problem ' + p.id + ' line ' + l.line + ' has no sentence');
      const ln = db.lines.find(x => x.id === l.line);
      if (ln && !(p.points.includes(ln.a) && p.points.includes(ln.b))) e.push('Problem ' + p.id + ' lights line ' + l.line + ' but not both of its points');
    });
  });

  const problemIds = new Set(db.problemMap.map(p => p.id));
  db.caseStudies.forEach(c => {
    c.specialtiesUsed.forEach(s => { if (!ids.includes(s)) e.push('Case ' + c.id + ' unknown specialty ' + s); });
    c.linesConnected.forEach(l => { if (!lineIds.has(l)) e.push('Case ' + c.id + ' unknown line ' + l); });
    c.demoSlot.forEach(p => { if (!problemIds.has(p)) e.push('Case ' + c.id + ' unknown problem ' + p); });
    // Build Brief 14: every case study result is verified or marked [placeholder].
    if (c.verified !== true && c.result !== '[placeholder]') e.push('Case ' + c.id + ' has an unverified result that is not marked [placeholder]');
    if (c.verified === true && (!c.sourceLink || c.sourceLink === '[placeholder]')) e.push('Case ' + c.id + ' is marked verified but has no source link');
  });

  db.scenarios.forEach(s => {
    if (!problemIds.has(s.problem)) e.push('Scenario ' + s.id + ' unknown problem ' + s.problem);
    if (!problemIds.has(s.studio.challenge)) e.push('Scenario ' + s.id + ' unknown studio challenge');
  });
  if (db.scenarios.length !== 3) e.push('Expected exactly 3 scripted scenarios');

  const b = db.budget;
  const sum = b.items.reduce((t, i) => t + i.amount, 0);
  if (sum !== b.total) e.push('Budget items sum to ' + sum + ', expected ' + b.total);
  if (b.total !== 250000) e.push('Budget total must be $250,000');

  db.costAssumptions.rows.forEach(r => {
    if (!r.source) e.push('Cost row ' + r.id + ' has no source (use [placeholder] until sourced)');
    if (!['cost', 'upside'].includes(r.type)) e.push('Cost row ' + r.id + ' has invalid type');
  });

  // Retired character names must never appear in the database (Build Brief section 3).
  const text = JSON.stringify(db);
  ['Sam', 'Marcus', 'Peachtree'].forEach(n => { if (new RegExp('\\b' + n + '\\b').test(text)) e.push('Retired name "' + n + '" appears in the database'); });
  // One spelling of the product names (Build Brief section 12).
  if (/Connect Studio/.test(text) && /\bDigitas Connect Studio\b/.test(text) === false) e.push('Use "Digitas Connect Studio" in full');
  return e;
}

module.exports = { validate, ORDER };
