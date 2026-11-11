/* Pure math for Digitas Connect. No DOM. Works in the browser (window.DCCalc) and in Node (require).
   Every function reads its numbers from the shared database; nothing is hard-coded here. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DCCalc = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function rowAmount(row, side, inp, base) {
    var p = row[side];
    var partners = side === 'specialist' ? inp.agencies : base.digitasPartners;
    // Campaign spend scales with fees; at the baseline it is exactly campaignSpendBaseline.
    var spend = inp.totalFees * base.campaignSpendBaseline / base.feesBaseline;
    switch (row.id) {
      case 'agencyManagement':    return partners * p.hoursPerMonth * 12 * base.hourlyCost;
      case 'duplicatedWork':      return p.pct * inp.totalFees;
      case 'disconnectedGoals':   return p.pct * spend;
      case 'reportReconciliation':return p.hoursPerMonth * 12 * base.hourlyCost;
      case 'timeLag':             return p.days * inp.campaigns * base.revenuePerCampaignDay;
      default: throw new Error('Unknown cost row: ' + row.id);
    }
  }

  /* Hidden-cost comparison (Build Brief 9.1).
     inputs: { totalFees, agencies, campaigns }. Missing values fall back to the database defaults. */
  function hiddenCosts(costAssumptions, inputs) {
    var base = costAssumptions.baseInputs;
    var inp = {
      totalFees: num(inputs && inputs.totalFees, base.totalFees),
      agencies: num(inputs && inputs.agencies, base.specialistPartners),
      campaigns: num(inputs && inputs.campaigns, base.campaignsPerYear)
    };
    var rows = costAssumptions.rows.map(function (row) {
      var spec = rowAmount(row, 'specialist', inp, base);
      var dig = rowAmount(row, 'digitas', inp, base);
      return { id: row.id, label: row.label, type: row.type, formula: row.formula, source: row.source,
               specialist: spec, digitas: dig, savings: spec - dig };
    });
    var sum = function (k) { return rows.reduce(function (t, r) { return t + r[k]; }, 0); };
    var costRows = rows.filter(function (r) { return r.type === 'cost'; });
    var upsideRows = rows.filter(function (r) { return r.type === 'upside'; });
    return {
      inputs: inp,
      rows: rows,
      totals: { specialist: sum('specialist'), digitas: sum('digitas'), savings: sum('savings') },
      savingsByType: {
        cost: costRows.reduce(function (t, r) { return t + r.savings; }, 0),
        upside: upsideRows.reduce(function (t, r) { return t + r.savings; }, 0)
      }
    };
  }

  /* Budget (Build Brief 9.2). */
  function budget(b) {
    var total = b.items.reduce(function (t, i) { return t + i.amount; }, 0);
    return { total: total, target: b.total, matches: total === b.total,
             items: b.items.map(function (i) { return { id: i.id, label: i.label, amount: i.amount, share: i.amount / total }; }) };
  }

  /* ROI (Build Brief 9.3). Optional overrides: { avgAnnualClientFees, operatingMargin, newWins, yearFractionOfProfit, investment }. */
  function roi(r, investment, overrides) {
    var o = overrides || {};
    var fees = num(o.avgAnnualClientFees, r.avgAnnualClientFees);
    var margin = num(o.operatingMargin, r.operatingMargin);
    var wins = num(o.newWins, r.newWins);
    var frac = num(o.yearFractionOfProfit, r.yearFractionOfProfit);
    var inv = num(o.investment, investment);
    var profitPerClient = fees * margin;
    var yearOneProfit = wins * profitPerClient * frac;
    return {
      profitPerClient: profitPerClient,
      winsToBreakEven: inv / profitPerClient,
      yearOneProfit: yearOneProfit,
      yearOneROI: (yearOneProfit - inv) / inv,
      longTermValue: r.clientLifespanYears == null ? null : profitPerClient * r.clientLifespanYears,
      inputs: { fees: fees, margin: margin, wins: wins, yearFraction: frac, investment: inv }
    };
  }

  function num(v, fallback) {
    var n = typeof v === 'string' ? parseFloat(v) : v;
    return (typeof n === 'number' && isFinite(n) && n >= 0) ? n : fallback;
  }

  /* Money formatting: $480K, $1.2M, $850. */
  function money(n) {
    var a = Math.abs(n), s = n < 0 ? '-' : '';
    if (a >= 1e6) return s + '$' + trim(a / 1e6, 2) + 'M';
    if (a >= 1e3) return s + '$' + trim(a / 1e3, 1) + 'K';
    return s + '$' + Math.round(a);
  }
  function trim(x, d) { return String(parseFloat(x.toFixed(d))); }
  function pct(n, d) { return (n * 100).toFixed(d == null ? 0 : d) + '%'; }

  return { hiddenCosts: hiddenCosts, budget: budget, roi: roi, money: money, pct: pct, num: num };
}));
