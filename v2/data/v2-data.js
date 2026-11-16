/* Digitas Connect v2: the one data source for v2 (content, model assumptions, presets).
   Built from the team meeting of Nov 13, 2026 (see Deliverable/Meeting Notes 2026-11-13.md) on top of v1.
   Status on every number: "sourced" (team-cited source, still to be re-checked), "team" (team estimate) or "placeholder" (needs a source).
   Works in the browser (window.DCV2_DATA) and in Node (module.exports) so the model can be tested. */
(function (root, factory) {
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data; else root.DCV2_DATA = data;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    meta: {
      version: '2.0.0-draft',
      updated: '2026-11-13',
      basis: 'Team meeting Nov 13, 2026 + v1 prototype + team deck (Nov 12) + Digitas creds deck slide 19.'
    },

    /* The star: Digitas's five capability groups, in the team deck's order (slide 12), clockwise from the top.
       Sub-capabilities are verbatim from the Digitas creds deck, slide 19 ("Digitas Capabilities"). */
    points: [
      { id: 'creative', name: 'Creative Experiences', l1: 'Creative', l2: 'Experiences',
        does: 'Ideas, content and experiences people respond to.',
        subs: ['Campaigns', 'Content', 'Experiential', 'XD', 'Brand Design & Identity', 'Performance Assets'] },
      { id: 'media', name: 'Networked Media', l1: 'Networked', l2: 'Media',
        does: 'Media planned and bought as one network, measured with data.',
        subs: ['Media Strategy', 'Planning and Buying', 'Brand and Performance Expertise', 'Cross-Channel Investments', 'Media Tech & Ops', 'Data & Analytics'] },
      { id: 'commerce', name: 'Total Commerce', l1: 'Total', l2: 'Commerce',
        does: 'Turning attention into sales, online and on the shelf.',
        subs: ['D2C Strategy', 'Shoppable Media Experiences', 'Full Funnel Retail Media Strategy & Activation', 'Digital Shelf Insights', 'Digital Shelf Content Strategy & Creation'] },
      { id: 'social', name: 'Social Transformation', l1: 'Social', l2: 'Transformation',
        does: 'Social, creators and community, run as one program.',
        subs: ['Social Strategy', 'Paid Social Activation', 'Influencer & Creator Marketing', 'Community Strategy & Management', 'Social Commerce & Intelligence', 'SWAT (Share Worthy & Trending)'] },
      { id: 'crm', name: 'CRM & Loyalty', l1: 'CRM &', l2: 'Loyalty',
        does: 'The ongoing relationship with every customer.',
        subs: ['End-to-end CRM', 'Loyalty Strategy & Management', 'Lifecycle Strategy', 'B2B Expertise', 'Personalized Messaging', 'Data & Technology Operations'] }
    ],

    /* What connecting two groups does (qualitative value of each line). */
    lines: [
      { a: 'creative', b: 'media', text: 'Creative is built for where media will run it, and media results show which creative to make more of.' },
      { a: 'creative', b: 'commerce', text: 'The same idea carries from the ad to the product page and the shelf.' },
      { a: 'creative', b: 'social', text: 'Campaign ideas arrive ready for social instead of being re-cut by another partner.' },
      { a: 'creative', b: 'crm', text: 'Every customer message looks and sounds like the brand, so it is worth opening.' },
      { a: 'media', b: 'commerce', text: 'Media spend follows what actually sells, down to the retailer and the product.' },
      { a: 'media', b: 'social', text: 'Paid and social plans share one audience map and one calendar.' },
      { a: 'media', b: 'crm', text: 'New customers from media find a follow-up waiting; lapsed ones are won back, not bought again.' },
      { a: 'commerce', b: 'social', text: 'Social moments link straight to a place to buy.' },
      { a: 'commerce', b: 'crm', text: 'Purchase data decides who gets which offer next.' },
      { a: 'social', b: 'crm', text: 'What the community says feeds the CRM, so the next message fits.' }
    ],

    /* Input 2: the marketing types a client needs (multi-select). Team assumption (Jeffrey, Nov 13):
       each type selected = one specialist partner if the client went the specialist route.
       point = the Digitas group that covers it (creds deck slide 19); null = not on Digitas's capability slide, so a specialist keeps it. */
    /* Client-facing groups for the needs screen (plain words, not Digitas's org chart). */
    needGroups: [
      { id: 'create', label: 'Create', hint: 'Ideas, content and experiences' },
      { id: 'reach', label: 'Reach', hint: 'Getting in front of people' },
      { id: 'sell', label: 'Sell', hint: 'Turning attention into sales' },
      { id: 'keep', label: 'Keep', hint: 'Customers, leads and their data' },
      { id: 'measure', label: 'Measure', hint: 'Knowing what works' },
      { id: 'other', label: 'Other specialists', hint: 'Not on Digitas\'s capabilities slide' }
    ],
    needs: [
      { id: 'brand', group: 'create', label: 'Brand & campaign creative', point: 'creative', via: 'Campaigns; Brand Design & Identity' },
      { id: 'content', group: 'create', label: 'Content production', point: 'creative', via: 'Content; Performance Assets' },
      { id: 'experience', group: 'create', label: 'Website & app experience', point: 'creative', via: 'XD' },
      { id: 'events', group: 'create', label: 'Events & experiential', point: 'creative', via: 'Experiential' },
      { id: 'paid', group: 'reach', label: 'Paid media (TV, digital, programmatic)', point: 'media', via: 'Planning and Buying; Cross-Channel Investments' },
      { id: 'search', group: 'reach', label: 'Search (paid search & SEO)', point: 'media', via: 'Brand and Performance Expertise (Haleon case in team deck)' },
      { id: 'social', group: 'reach', label: 'Social media & community', point: 'social', via: 'Social Strategy; Paid Social; Community' },
      { id: 'creators', group: 'reach', label: 'Creators & influencers', point: 'social', via: 'Influencer & Creator Marketing' },
      { id: 'ecom', group: 'sell', label: 'E-commerce & D2C', point: 'commerce', via: 'D2C Strategy; Shoppable Media Experiences' },
      { id: 'retail', group: 'sell', label: 'Retail media & digital shelf', point: 'commerce', via: 'Retail Media; Digital Shelf' },
      { id: 'crm', group: 'keep', label: 'CRM & email', point: 'crm', via: 'End-to-end CRM; Personalized Messaging' },
      { id: 'loyalty', group: 'keep', label: 'Loyalty & retention programs', point: 'crm', via: 'Loyalty Strategy & Management; Lifecycle Strategy' },
      { id: 'leads', group: 'keep', label: 'B2B lead nurturing & account marketing', point: 'crm', via: 'B2B Expertise; Lifecycle Strategy' },
      { id: 'martech', group: 'keep', label: 'Marketing tech & customer data', point: 'crm', via: 'Data & Technology Operations' },
      { id: 'analytics', group: 'measure', label: 'Data, analytics & measurement', point: 'media', via: 'Data & Analytics' },
      { id: 'research', group: 'measure', label: 'Market research & insights', point: null, via: 'Not on Digitas capabilities slide' },
      { id: 'pr', group: 'other', label: 'PR & earned media', point: null, via: 'Not on Digitas capabilities slide' },
      { id: 'local', group: 'other', label: 'Local & field marketing', point: null, via: 'Not on Digitas capabilities slide' },
      { id: 'affiliate', group: 'other', label: 'Affiliate & partnerships', point: null, via: 'Not on Digitas capabilities slide' }
    ],

    /* Input: industry. Sets the suggested needs, the hourly cost (BLS average x industry factor; factors are placeholders)
       and the industry "pivots": the KPIs each Digitas group would move (Francesco, Nov 13).
       "Other / general" keeps the tool usable for any company. */
    industries: [
      { id: 'other', label: 'Other / general', rate: 1.0, suggested: ['brand', 'paid', 'search', 'social', 'crm'],
        pivots: { creative: 'Brand awareness', media: 'Cost per new customer', commerce: 'Online conversion rate', social: 'Engagement rate', crm: 'Customer retention' } },
      { id: 'cpg', label: 'Food, beverage & consumer goods', rate: 1.0, suggested: ['brand', 'social', 'paid', 'crm', 'loyalty', 'retail'],
        pivots: { creative: 'Brand awareness', media: 'Cost per new buyer', commerce: 'Share of digital shelf', social: 'Engagement rate', crm: 'Repeat purchase rate' } },
      { id: 'retail', label: 'Retail & e-commerce', rate: 0.9, suggested: ['paid', 'search', 'ecom', 'retail', 'crm', 'social'],
        pivots: { creative: 'Conversion on product pages', media: 'Return on ad spend', commerce: 'Average order value', social: 'Social-driven sales', crm: 'Customer lifetime value' } },
      { id: 'tech', label: 'Technology & software (B2B)', rate: 1.3, suggested: ['brand', 'content', 'search', 'paid', 'leads', 'martech', 'analytics'],
        pivots: { creative: 'Brand consideration among buyers', media: 'Cost per qualified lead', commerce: 'Self-serve sign-ups', social: 'Share of voice with buyers', crm: 'Pipeline from nurtured leads' } },
      { id: 'finance', label: 'Financial services & insurance', rate: 1.2, suggested: ['brand', 'paid', 'search', 'analytics', 'crm', 'experience'],
        pivots: { creative: 'Brand trust', media: 'Cost per new account', commerce: 'Digital sign-up completion', social: 'Share of conversation', crm: 'Products per customer' } },
      { id: 'health', label: 'Health, pharma & wellness', rate: 1.1, suggested: ['crm', 'loyalty', 'content', 'search', 'analytics'],
        pivots: { creative: 'Trust and recall', media: 'Cost per new patient or member', commerce: 'Online refill or order rate', social: 'Community questions answered', crm: 'Member retention and adherence' } },
      { id: 'auto', label: 'Automotive & mobility', rate: 1.0, suggested: ['brand', 'paid', 'search', 'experience', 'crm', 'local'],
        pivots: { creative: 'Model consideration', media: 'Cost per test-drive lead', commerce: 'Online configurations and reservations', social: 'Launch buzz', crm: 'Service retention and repurchase' } },
      { id: 'telecom', label: 'Telecom, media & entertainment', rate: 1.1, suggested: ['brand', 'paid', 'social', 'creators', 'crm', 'analytics'],
        pivots: { creative: 'Brand preference', media: 'Cost per new subscriber', commerce: 'Online plan upgrades', social: 'Fan engagement', crm: 'Monthly churn' } },
      { id: 'travel', label: 'Travel & hospitality', rate: 0.9, suggested: ['brand', 'paid', 'search', 'crm', 'loyalty', 'social'],
        pivots: { creative: 'Brand consideration', media: 'Cost per booking', commerce: 'Direct-booking share', social: 'Review score', crm: 'Repeat-guest rate' } },
      { id: 'industrial', label: 'Industrial & manufacturing (B2B)', rate: 1.05, suggested: ['brand', 'content', 'search', 'events', 'leads', 'martech'],
        pivots: { creative: 'Recognition with buyers', media: 'Cost per qualified lead', commerce: 'Online quote requests', social: 'Reach with engineers and buyers', crm: 'Distributor and repeat orders' } },
      { id: 'education', label: 'Education & family', rate: 1.0, suggested: ['content', 'paid', 'social', 'crm', 'loyalty'],
        pivots: { creative: 'Parent trust', media: 'Cost per new subscriber or student', commerce: 'Trial-to-paid conversion', social: 'Word of mouth', crm: 'Churn and re-enrolment' } },
      { id: 'nonprofit', label: 'Nonprofit & public sector', rate: 0.8, suggested: ['brand', 'content', 'social', 'crm', 'pr'],
        pivots: { creative: 'Cause awareness', media: 'Cost per new donor or sign-up', commerce: 'Online donation completion', social: 'Supporter engagement', crm: 'Repeat-donor rate' } },
      { id: 'local', label: 'Local & home services', rate: 0.85, suggested: ['search', 'paid', 'social', 'local', 'crm'],
        pivots: { creative: 'Local recognition', media: 'Cost per lead', commerce: 'Online booking rate', social: 'Reviews and reels reach', crm: 'Repeat jobs' } }
    ],

    /* Input: main goal (Ally's input). Lights the lines that matter most; does not change the dollars. */
    challenges: [
      { id: 'awareness', label: 'Build the brand', hint: 'Be known and chosen', lines: [['creative', 'media'], ['creative', 'social'], ['media', 'social']] },
      { id: 'performance', label: 'Get more from ad spend', hint: 'Lower cost per result', lines: [['media', 'commerce'], ['creative', 'media'], ['media', 'social']] },
      { id: 'growth', label: 'Grow online sales', hint: 'More orders and sign-ups', lines: [['commerce', 'crm'], ['media', 'commerce'], ['commerce', 'social']] },
      { id: 'leads', label: 'Win more qualified leads', hint: 'B2B pipeline', lines: [['media', 'crm'], ['creative', 'crm'], ['creative', 'media']] },
      { id: 'retention', label: 'Keep more customers', hint: 'Repeat, renew, refer', lines: [['crm', 'media'], ['creative', 'crm'], ['social', 'crm']] },
      { id: 'launch', label: 'Launch something new', hint: 'Product, market or brand', lines: [['creative', 'media'], ['creative', 'social'], ['media', 'commerce']] },
      { id: 'prove', label: 'Prove what marketing returns', hint: 'One view of results', lines: [['media', 'crm'], ['media', 'commerce'], ['commerce', 'crm']] }
    ],

    /* Optional "Know your own numbers?" inputs. Each one replaces an industry average in the simulation with the client's value. */
    ownNumbers: [
      { id: 'mgmtWeekly', label: 'Weekly hours spent managing each agency', unit: 'hours', param: 'mgmtHours', toParam: 52, placeholder: 'e.g. 6',
        hint: 'Briefs, status calls, approvals, invoices. We assume 3–10.' },
      { id: 'hourly', label: 'Hourly cost of your marketing team', unit: 'usd', placeholder: 'e.g. 75',
        hint: 'Salary plus benefits, per hour. We assume about $59–$68 before the industry factor.' },
      { id: 'tenure', cite: 'Industry estimate, source being confirmed', label: 'Years between agency reviews', unit: 'years', param: 'tenure', toParam: 1, placeholder: 'e.g. 5',
        hint: 'How often you re-pitch an agency. We assume 3–7 years.' }
    ],

    /* Input 4: how well current (or planned) partners share data and goals. Multiplies the three "disconnection" costs. Team estimate. */
    sharing: [
      { v: 1, label: 'Hardly at all', mult: 1.3 },
      { v: 2, label: 'A little', mult: 1.15 },
      { v: 3, label: 'Somewhat', mult: 1.0 },
      { v: 4, label: 'Mostly', mult: 0.85 },
      { v: 5, label: 'Fully', mult: 0.7 }
    ],

    /* Budget helper: Aliyah's anchor. */
    marketingShareOfRevenue: { value: 0.077, source: 'Gartner CMO Spend Survey 2025: marketing budgets at 7.7% of company revenue (team source, Aliyah)', status: 'sourced' },

    /* ---------- Monte Carlo model ----------
       Six cost categories, named exactly as the team deck (slides 22-23). Each depends on the number of separate partners n.
       Today: n = needs selected (k). Connected: n = 1 Digitas team + needs Digitas does not cover.
       Savings = reduction x (cost at k partners - cost at the connected partner count). Agency fees are assumed equal in both
       scenarios (Digitas pricing is not public), so the model compares only the cost of coordinating partners. */
    /* label = team deck name (Behind the scenes); plain + explain = what a client reads. */
    categories: [
      { id: 'admin', label: 'Administration fees', plain: 'Managing agencies', explain: 'Briefs, status calls, approvals, invoices and periodic agency reviews.',
        kind: 'partner', formula: 'partners x (agency review cost x size / tenure + management hours x hourly cost)' },
      { id: 'lag', label: 'Time lag', plain: 'Waiting on handoffs', explain: 'Time lost while work passes from one agency to the next.',
        kind: 'partner', formula: 'partners x hours lost to handoffs x hourly cost' },
      { id: 'goals', label: 'Disconnected goals', plain: 'Misaligned goals', explain: 'Spend optimized for each agency\'s own targets instead of yours.',
        kind: 'line', formula: 'budget x share lost to misaligned goals x sharing x fragmentation' },
      { id: 'data', label: 'Data disconnection', plain: 'Siloed data', explain: 'Budget wasted because agencies cannot see each other\'s customer data.',
        kind: 'line', formula: 'budget x share lost to siloed data x sharing x fragmentation' },
      { id: 'meas', label: 'Inconsistent measurement', plain: 'Conflicting measurement', explain: 'Budget misallocated when every agency reports results its own way.',
        kind: 'line', formula: 'budget x share misallocated by measurement doubts x sharing x fragmentation' },
      { id: 'dup', label: 'Duplicated work', plain: 'Duplicated work', explain: 'The same research, assets and reports produced more than once.',
        kind: 'partner', formula: '(partners - 1) x duplicated hours x hourly cost' }
    ],

    /* The simulated variables. tri = triangular(min, mode, max). Every one is shown on screen with its source and status. */
    params: [
      { id: 'reviewCost', cite: 'ANA & 4As, The Cost of the Pitch (2023)', label: 'Cost of one agency review', unit: 'usd', tri: [250000, 408000, 550000], status: 'sourced',
        source: 'ANA / 4As, The Cost of the Pitch (2023): $408K per review (team appendix). Range is a team estimate.' },
      { id: 'tenure', label: 'Years between agency reviews', unit: 'years', tri: [3, 4.5, 7], status: 'placeholder',
        source: 'Agency tenure: Aliyah\'s source to be added.' },
      { id: 'mgmtHours', cite: 'Estimate from typical agency workflows (3–10 hours a week)', label: 'Hours to manage one partner a year', unit: 'hours', tri: [150, 300, 500], status: 'team',
        source: 'Team estimate: briefs, status calls, approvals, invoices (about 3-10 hours a week).' },
      { id: 'lagHours', cite: 'PPC Land (2026): about 72 hours a year per agency', label: 'Hours lost to handoffs per partner', unit: 'hours', tri: [40, 72, 120], status: 'sourced',
        source: 'PPC Land (2026) via team deck: 720 hours across 10 agencies = 72 per partner. Knak (2026): 85% missed a launch date.' },
      { id: 'goalsWaste', cite: 'Digiday (2019), applied as a share of budget', label: 'Budget lost to misaligned goals', unit: 'pct', tri: [0.01, 0.025, 0.05], status: 'team',
        source: 'Digiday (2019): 40% say agency interests are not aligned with theirs. Share of budget is a team estimate.' },
      { id: 'dataWaste', cite: 'StackAdapt (2026), applied as a share of budget', label: 'Budget lost to siloed data', unit: 'pct', tri: [0.01, 0.02, 0.04], status: 'team',
        source: 'StackAdapt (2026): 42% say siloed data wastes over 20% of programmatic budget. Share of total budget is a team estimate.' },
      { id: 'measWaste', cite: 'EMARKETER / TransUnion (2025), applied as a share of budget', label: 'Budget misallocated by measurement doubts', unit: 'pct', tri: [0.005, 0.015, 0.03], status: 'team',
        source: 'EMARKETER / TransUnion (2025): 29% had up to 20% of budget at risk from measurement doubts. Share is a team estimate.' },
      { id: 'dupHours', cite: 'Asana, Anatomy of Work (2021)', label: 'Duplicated hours per extra partner', unit: 'hours', tri: [150, 308, 450], status: 'sourced',
        source: 'Asana, Anatomy of Work (2021): 308 hours per worker a year on duplicated work (team deck).' },
      { id: 'loaded', cite: 'U.S. BLS, Employer Costs for Employee Compensation', label: 'Benefits on top of wages', unit: 'x', tri: [1.3, 1.43, 1.5], status: 'placeholder',
        source: 'BLS Employer Costs for Employee Compensation: benefits are about 30% of total compensation. Verify.' },
      { id: 'reduction', cite: 'Estimate, to be calibrated with Digitas client outcomes', label: 'Share of coordination cost Digitas removes', unit: 'pct', tri: [0.3, 0.6, 0.9], status: 'team',
        source: 'Team deck used a flat 90%. Here 90% is the best case and 60% the most likely. Calibrate with Digitas outcomes (Studio).' },
      { id: 'ramp', cite: 'Estimate of onboarding time', label: 'Share realized in year one', unit: 'pct', tri: [0.4, 0.7, 1.0], status: 'team',
        source: 'Team estimate: onboarding takes part of the first year.' }
    ],

    fixed: {
      hourlyWage: { value: 45.38, source: 'U.S. Bureau of Labor Statistics (2025), average hourly earnings (team deck slide 21)', status: 'sourced' },
      reviewReferenceBudget: { value: 100000000, min: 0.01, max: 1.5, note: 'The $408K review cost reflects large US advertisers; it is scaled by budget ÷ $100M (1%–150%) for other sizes (team assumption).', status: 'team' },
      /* Smaller accounts need less managing. Hours per partner are scaled by (budget per partner ÷ $2M), between 25% and 100%. */
      hoursReferencePerPartner: { value: 2000000, min: 0.25, note: 'Hours spent per partner shrink for small accounts: scaled by budget per partner ÷ $2M (25%–100%). Team estimate, to verify.', status: 'placeholder' },
      simulations: 10000,
      interval: 0.9
    },

    /* Studio: what Digitas's own data would replace (illustrative ranges, not real client data). */
    calibration: {
      note: 'Illustrative. In production these ranges come from Digitas\'s own consented client records. Nothing here is real client data.',
      params: {
        reduction: { tri: [0.48, 0.62, 0.74], from: 'Outcomes logged for past integrated clients' },
        mgmtHours: { tri: [240, 290, 340], from: 'Digitas timesheets for client management' },
        tenure: { tri: [3.8, 4.5, 5.4], from: 'Digitas client records (contract start and review dates)' },
        goalsWaste: { tri: [0.018, 0.025, 0.033], from: 'Discovery audits of past clients (consented)' },
        dataWaste: { tri: [0.014, 0.02, 0.027], from: 'Discovery audits of past clients (consented)' },
        measWaste: { tri: [0.01, 0.015, 0.02], from: 'Discovery audits of past clients (consented)' },
        ramp: { tri: [0.6, 0.72, 0.85], from: 'Onboarding timelines of past integrated clients' }
      }
    },

    /* Proof: case studies named in the team deck (slide 13). Results are as the deck states them; not yet verified by us. No logos. */
    cases: [
      { id: 'nerds', client: 'NERDS Gummy Clusters', points: ['creative', 'commerce'], challenges: ['launch', 'growth', 'retention'],
        result: '400% increase in e‑commerce sales', source: 'Digitas case studies; Creativebrief (per team deck)', verified: false },
      { id: 'abcmouse', client: 'ABCmouse', points: ['creative'], challenges: ['retention', 'performance', 'awareness'],
        result: '83% choose it over alternatives', source: 'Digitas case studies (per team deck); source to confirm', verified: false },
      { id: 'haleon', client: 'Haleon', points: ['media'], challenges: ['performance', 'launch', 'prove'],
        result: '+64% growth in market share (SEO + paid search)', source: 'Digitas case studies; Creativebrief (per team deck)', verified: false }
    ],

    /* Starting inputs: an empty form for any company. */
    blankInputs: { company: '', industry: 'other', budgetMode: 'revenue', revenue: 0, budget: 0, mktShare: null,
                   challenge: '', status: 'using', sharing: null, needs: [], own: {} },

    /* Worked examples (top-bar menu). None is the default; they show the tool across sizes, industries and B2C/B2B.
       Elena is the team deck's fictional persona (slide 6). */
    presets: [
      { id: 'elena', label: 'Consumer brand · Elena, soda (deck persona)', company: 'Elena\'s soda brand', industry: 'cpg', budgetMode: 'revenue', revenue: 10000000, budget: 0,
        challenge: 'retention', status: 'using', sharing: 2, needs: ['brand', 'social', 'paid', 'crm', 'loyalty', 'pr'] },
      { id: 'saas', label: 'B2B software company', company: 'Mid-size software company', industry: 'tech', budgetMode: 'revenue', revenue: 400000000, budget: 0,
        challenge: 'leads', status: 'using', sharing: 3, needs: ['brand', 'content', 'search', 'paid', 'leads', 'martech', 'analytics', 'events'] },
      { id: 'bank', label: 'Regional bank (large budget)', company: 'Regional bank', industry: 'finance', budgetMode: 'budget', revenue: 0, budget: 60000000,
        challenge: 'prove', status: 'using', sharing: 2, needs: ['brand', 'paid', 'search', 'social', 'analytics', 'crm', 'experience', 'pr'] },
      { id: 'hotel', label: 'Boutique hotel group', company: 'Hotel group', industry: 'travel', budgetMode: 'budget', revenue: 0, budget: 6000000,
        challenge: 'retention', status: 'using', sharing: 3, needs: ['brand', 'search', 'paid', 'crm', 'loyalty'] },
      { id: 'local', label: 'Home services company (planning, small)', company: 'Home services co.', industry: 'local', budgetMode: 'budget', revenue: 0, budget: 1500000,
        challenge: 'performance', status: 'planning', sharing: 3, needs: ['search', 'paid', 'social', 'local'] }
    ],

    /* Studio inbox seed: clearly labeled examples so the inbox is never empty. */
    inboxSeed: [
      { id: 'R-1041', seed: true, receivedAt: '2026-11-11', company: '[Seed example] Regional grocer', industry: 'retail', budget: 12000000, challenge: 'growth',
        status: 'using', sharing: 2, needs: ['paid', 'search', 'ecom', 'retail', 'crm', 'pr'], contact: 'Seed example', consent: true, stage: 'New' },
      { id: 'R-1042', seed: true, receivedAt: '2026-11-12', company: '[Seed example] Telehealth startup', industry: 'health', budget: 4000000, challenge: 'retention',
        status: 'planning', sharing: 3, needs: ['crm', 'loyalty', 'content', 'search'], contact: 'Seed example', consent: true, stage: 'Meeting booked' }
    ],

    /* Open decisions from the Nov 13 meeting, shown on the Behind the scenes page with what v2 does today. */
    decisions: [
      { q: 'What is prong 2?', v2: 'Studio = the private side: same model on Digitas\'s own consented data, team and pitch brief, outcome log that updates the model.',
        alt: 'Remove Studio (Francesco); Studio as a workflow, not software (Ally); split Connect into qualitative + quantitative (Jeffrey).' },
      { q: 'Cheaper or better value?', v2: 'Better value for the same money: agency fees are held equal; only the cost of coordinating partners is compared.',
        alt: 'Subtract Digitas\'s fee from specialist fees (Jeffrey) — needs Digitas pricing, which we do not have (Ewen).' },
      { q: 'Results order', v2: 'Numbers on top (four tiles + range), interactive star below with the qualitative and quantitative value of each point and line (Francesco).',
        alt: 'Qualitative first, then numbers (Jeffrey).' },
      { q: 'Who is James?', v2: 'A Digitas client lead using Studio internally (Studio now covers Digitas\'s own five groups).',
        alt: 'Deck slide 7 still describes James as a leader at another Publicis Groupe agency. Update the slide or the persona.' },
      { q: 'Industry inputs', v2: '13 industries plus "Other / general". Industry changes suggested needs, hourly cost and the KPIs shown per group. Optional "your own numbers" replace averages for any company.',
        alt: 'Ask 5 industry-specific numbers per industry (e.g. hotel: average stay, nightly rate). More precise, much more to source.' },
      { q: 'How is disconnection measured?', v2: 'Fragmentation = the chance two pieces of work sit with different agencies (1 − Σ share²). Equal agencies give (k−1)/k; one large Digitas team plus a small specialist counts as nearly connected. Elena: about $48K a year.',
        alt: 'Count agencies only, (n−1)/n, which treats a small leftover specialist like an equal partner (Elena: about 30% less).' },
      { q: 'Each need = one agency?', v2: 'Yes (Jeffrey, Nov 13). Hours per partner shrink for small budgets so small companies are not overstated.',
        alt: 'Ask who does each need today (in-house / agency / nobody). More accurate, one more question per need.' },
      { q: 'Case results', v2: 'Shown as the team deck states them, tagged "not yet verified". No logos.',
        alt: 'Verify each with Digitas or anonymize.' }
    ]
  };
}));
