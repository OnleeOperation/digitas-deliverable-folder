'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const calc = require('../js/calc');
const { validate } = require('./validate');

const db = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'database.json'), 'utf8'));

test('database passes integrity checks', () => {
  assert.deepEqual(validate(db), []);
});

test('hidden costs match Build Brief 9.1 by default', () => {
  const h = calc.hiddenCosts(db.costAssumptions, {});
  const by = Object.fromEntries(h.rows.map(r => [r.id, r]));
  assert.equal(by.agencyManagement.specialist, 72000);
  assert.equal(by.agencyManagement.digitas, 18000);
  assert.equal(by.agencyManagement.savings, 54000);
  assert.equal(by.duplicatedWork.specialist, 180000);
  assert.equal(by.duplicatedWork.digitas, 60000);
  assert.equal(by.duplicatedWork.savings, 120000);
  assert.equal(by.disconnectedGoals.specialist, 60000);
  assert.equal(by.disconnectedGoals.digitas, 20000);
  assert.equal(by.disconnectedGoals.savings, 40000);
  assert.equal(by.reportReconciliation.specialist, 48000);
  assert.equal(by.reportReconciliation.digitas, 12000);
  assert.equal(by.reportReconciliation.savings, 36000);
  assert.equal(by.timeLag.specialist, 120000);
  assert.equal(by.timeLag.digitas, 45000);
  assert.equal(by.timeLag.savings, 75000);
  assert.deepEqual(h.totals, { specialist: 480000, digitas: 155000, savings: 325000 });
});

test('cost vs upside split sums to the total savings', () => {
  const h = calc.hiddenCosts(db.costAssumptions, {});
  assert.equal(h.savingsByType.cost, 210000);
  assert.equal(h.savingsByType.upside, 115000);
  assert.equal(h.savingsByType.cost + h.savingsByType.upside, h.totals.savings);
});

test('table recalculates when the three inputs change', () => {
  const base = calc.hiddenCosts(db.costAssumptions, {});
  const more = calc.hiddenCosts(db.costAssumptions, { totalFees: 6000000, agencies: 6, campaigns: 20 });
  assert.ok(more.totals.specialist > base.totals.specialist);
  // agency management: 6 x 15 x 12 x 100
  assert.equal(more.rows.find(r => r.id === 'agencyManagement').specialist, 108000);
  // duplicated work doubles with fees
  assert.equal(more.rows.find(r => r.id === 'duplicatedWork').specialist, 360000);
  // time lag doubles with campaigns
  assert.equal(more.rows.find(r => r.id === 'timeLag').specialist, 240000);
  // Digitas agency-management cost does not depend on how many specialists the client has today
  assert.equal(more.rows.find(r => r.id === 'agencyManagement').digitas, 18000);
});

test('bad input falls back to defaults instead of producing NaN', () => {
  const h = calc.hiddenCosts(db.costAssumptions, { totalFees: 'abc', agencies: -3, campaigns: null });
  assert.equal(h.totals.savings, 325000);
});

test('budget totals $250K', () => {
  const b = calc.budget(db.budget);
  assert.equal(b.total, 250000);
  assert.equal(b.matches, true);
});

test('ROI matches Build Brief 9.3 illustration', () => {
  const r = calc.roi(db.roi, db.budget.total);
  assert.equal(Math.round(r.profitPerClient), 255000);
  assert.ok(Math.abs(r.winsToBreakEven - 0.98) < 0.01);
  assert.equal(Math.round(r.yearOneProfit), 382500);
  assert.equal(Math.round(r.yearOneROI * 100), 53);
  assert.equal(r.longTermValue, null); // lifespan not sourced yet
});

test('money formatting', () => {
  assert.equal(calc.money(480000), '$480K');
  assert.equal(calc.money(325000), '$325K');
  assert.equal(calc.money(250000), '$250K');
  assert.equal(calc.money(54000), '$54K');
  assert.equal(calc.money(1500000), '$1.5M');
  assert.equal(calc.money(3000000), '$3M');
  assert.equal(calc.money(382500), '$382.5K'); // brief says "about $382K"; show the exact half-thousand
  assert.equal(calc.money(850), '$850');
});
