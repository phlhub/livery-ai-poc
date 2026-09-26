// Content, world layout and timeline. Edit this file to change story beats and copy.

// ---------- key times (seconds) ----------
const T = {
  pointIn: 0.8,
  firstCards: 2.8,
  accumStart: 7.0,
  saturate: 13.5,
  freeze: 18.0,
  linksForm: 19.0,
  reorg: 20.4,
  ringForm: 22.6,
  magisterWord: 24.4,
  agents: 27.6,
  dive: 37.0,
  recipe: 39.0,
  bend: 42.8,
  loop: 44.3,
  back: 47.5,
  living: 49.5,
  opp: 58.0,
  surface: 59.3,
  brief: 60.4,
  human: 66.0,
  callback: 76.0,
  retransform: 78.4,
  finalComp: 83.0,
  simplify: 88.0,
  line1: 90.5, line2: 94.0, line3: 97.5,
  lockup: 102.3,
  fadeOut: 106.5,
};

// ---------- camera keyframes: [t, x, y, zoom, rotDeg, easeIntoThisKey] ----------
const EXEC_POS = polar(260, 45);
const CAM_KEYS = [
  [0, 0, 0, 1.55, 0],
  [2.5, 0, 0, 1.42, 0, E.sine],
  [7.0, 0, 0, 1.04, 0, E.io],
  [13.5, 0, 0, 1.0, -0.6, E.sine],
  [18.0, 0, 0, 1.13, -1.4, E.sine],
  [19.0, 0, 0, 1.13, -1.4, E.lin],
  [25.4, 0, 30, 0.8, 0, E.io5],
  [27.5, 0, 30, 0.8, 0, E.sine],
  [37.0, 0, 30, 0.86, 0, E.sine],
  [39.0, EXEC_POS[0], EXEC_POS[1], 11, 0, (t) => E.io5(t)],
  [47.5, EXEC_POS[0], EXEC_POS[1], 11, 0, E.lin],
  [49.8, 0, 30, 0.8, 0, E.io5],
  [57.8, 0, 30, 0.74, 0, E.sine],
  [59.7, 0, 30, 0.76, 0, E.sine],
  [61.8, 305, 0, 1.3, 0, E.io5],
  [66.0, 300, 0, 1.33, 0, E.sine],
  [68.6, 0, 0, 1.6, 0, E.io5],
  [76.0, 0, 0, 1.68, 0, E.sine],
  [77.6, 0, 0, 1.08, -1.0, E.io5],
  [78.4, 0, 0, 1.1, -1.2, E.sine],
  [81.6, 0, 30, 0.8, 0, E.io5],
  [83.0, 0, 30, 0.78, 0, E.sine],
  [88.0, 0, 30, 0.72, 0, E.sine],
  [90.6, 0, 440, 0.42, 0, E.io5],
  [102.3, 0, 445, 0.42, 0, E.sine],
  [104.4, 0, 400, 0.3, 0, E.io5],
  [108.0, 0, 400, 0.29, 0, E.sine],
];

// ---------- agents (on the Magister ring, r = 260) ----------
const RING_R = 260;
const AGENTS = [
  { id: 'consumption', name: 'Consumption Steward', desc: 'Tracks adoption, deviations and opportunity', ang: -90 },
  { id: 'health', name: 'Health Sentinel', desc: 'Watches health, risk and meaningful change', ang: -45 },
  { id: 'relationship', name: 'Relationship Steward', desc: 'Tracks stakeholders, interactions, context', ang: 0 },
  { id: 'execution', name: 'Execution Assistant', desc: 'Owns actions, commitments, follow-through', ang: 45 },
  { id: 'impact', name: 'Impact Steward', desc: 'Captures outcomes and evidence of impact', ang: 90 },
  { id: 'governor', name: 'Account Governor', desc: 'Holds state, priorities, operating rhythm', ang: 135 },
  { id: 'growth', name: 'Growth Scout', desc: 'Spots opportunities worth human attention', ang: 180 },
  { id: 'csdr', name: 'CSDR Steward', desc: 'Keeps CSDR current, flags what needs attention', ang: 225 },
];
// introduction order follows the narrative
const AGENT_INTRO = ['health', 'consumption', 'execution', 'csdr', 'impact', 'governor', 'growth', 'relationship'];
AGENTS.forEach((a) => {
  a.pos = polar(RING_R, a.ang);
  a.intro = T.agents + AGENT_INTRO.indexOf(a.id) * 0.82;
});
const AG = Object.fromEntries(AGENTS.map((a) => [a.id, a]));

// ---------- information categories (become the 14 stacks of the customer environment) ----------
const STACK_RX = 700, STACK_RY = 470;
const CATS = [
  { id: 'consumption', name: 'Consumption', agent: 'consumption', ang: -90, col: [120, 198, 152], icon: 'bars' },
  { id: 'escalation', name: 'Support escalations', agent: 'health', ang: -56, col: [226, 124, 110], icon: 'alert' },
  { id: 'risk', name: 'Risks', agent: 'health', ang: -34, col: [228, 150, 104], icon: 'shield' },
  { id: 'email', name: 'Email', agent: 'relationship', ang: -20, col: [124, 166, 224], icon: 'mail' },
  { id: 'teams', name: 'Teams conversations', agent: 'relationship', ang: 0, col: [146, 150, 232], icon: 'chat' },
  { id: 'meeting', name: 'Customer meetings', agent: 'relationship', ang: 20, col: [104, 196, 190], icon: 'cal' },
  { id: 'commitment', name: 'Commitments', agent: 'execution', ang: 35, col: [226, 196, 122], icon: 'check' },
  { id: 'followup', name: 'Follow-ups', agent: 'execution', ang: 55, col: [172, 186, 204], icon: 'loop' },
  { id: 'milestone', name: 'Delivery milestones', agent: 'impact', ang: 90, col: [188, 164, 232], icon: 'flag' },
  { id: 'accountplan', name: 'Account plan', agent: 'governor', ang: 125, col: [178, 198, 138], icon: 'doc' },
  { id: 'internal', name: 'Internal meetings', agent: 'governor', ang: 145, col: [142, 162, 194], icon: 'people' },
  { id: 'opportunity', name: 'Opportunities', agent: 'growth', ang: 170, col: [242, 184, 96], icon: 'spark' },
  { id: 'request', name: 'Customer requests', agent: 'growth', ang: 190, col: [122, 186, 226], icon: 'inbox' },
  { id: 'csdr', name: 'CSDR actions', agent: 'csdr', ang: 225, col: [152, 180, 206], icon: 'list' },
];
CATS.forEach((c, i) => {
  c.i = i;
  const a = c.ang * Math.PI / 180;
  c.pos = [STACK_RX * Math.cos(a), STACK_RY * Math.sin(a)];
});
const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));

const TITLES = {
  email: ['Re: Renewal timeline', 'Fwd: Architecture review', 'Re: Licensing question', 'Recap from Tuesday', 'Re: Pilot scope'],
  teams: ['Can you join at 3?', 'Quick q on migration', 'Rollout status thread', 'Ping: exec deck?'],
  meeting: ['Quarterly business review', 'Exec sponsor sync', 'Architecture workshop'],
  escalation: ['Sev A · Auth outage', 'Escalation · Latency', 'Support case aging'],
  consumption: ['Consumption −12% WoW', 'Analytics usage +18%', 'Storage trend flat'],
  milestone: ['Phase 2 go-live slipped', 'Pilot complete', 'Migration wave 3'],
  csdr: ['CSDR · 4 actions due', 'CSDR · Update needed', 'CSDR · Review Friday'],
  risk: ['Risk · Sponsor change', 'Risk · Budget freeze', 'Risk · Skills gap'],
  commitment: ['Commit · Roadmap brief', 'Commit · Security review', 'Commit · Cost model'],
  followup: ['Follow up · Pricing', 'Send recap to CTO', 'Chase SOW signature'],
  internal: ['Account team sync', 'Pipeline review', 'Deal desk'],
  request: ['Request · Training plan', 'Request · Cost forecast', 'Request · Reference call'],
  accountplan: ['Account plan FY27', 'Priorities · H1', 'Success plan v4'],
  opportunity: ['Opportunity · Data platform', 'Opportunity · AI pilot'],
};
const AGES = ['now', '2m', '5m', '12m', '1h', '3h', 'today', 'yesterday'];

// ---------- the 56 information cards (the recurring objects of the film) ----------
const CARDS = (() => {
  const r = rng(7);
  const cards = [];
  const early = ['email', 'meeting', 'consumption', 'teams', 'milestone', 'csdr', 'commitment', 'request'];
  const earlyAng = [-160, -118, -62, -18, 24, 70, 128, 170];
  const pool = ['email', 'email', 'teams', 'teams', 'meeting', 'escalation', 'consumption', 'milestone', 'csdr', 'risk',
    'commitment', 'followup', 'followup', 'internal', 'request', 'accountplan', 'opportunity', 'escalation', 'risk', 'internal'];
  const used = {};
  const title = (cat) => { used[cat] = (used[cat] || 0); const l = TITLES[cat]; return l[used[cat]++ % l.length]; };
  const place = (x, y) => cards.every((c) => Math.abs(c.cx - x) > 170 || Math.abs(c.cy - y) > 58);
  early.forEach((cat, i) => {
    const [x, y] = [470 * Math.cos(earlyAng[i] * Math.PI / 180), 250 * Math.sin(earlyAng[i] * Math.PI / 180)];
    cards.push({ cat, cx: x + (r() - 0.5) * 30, cy: y + (r() - 0.5) * 20, spawn: T.firstCards + i * 0.5, d: 0, title: title(cat) });
  });
  // remaining categories are guaranteed at least once, then the pool
  const later = ['escalation', 'risk', 'followup', 'internal', 'accountplan', 'opportunity'];
  for (let i = 0; i < 42; i++) later.push(pool[Math.floor(r() * pool.length)]);
  later.forEach((cat, i) => {
    const u = i / later.length;
    let x, y, tries = 0, minOK = false;
    do {
      const a = r() * TAU, rr = 0.3 + Math.sqrt(r()) * 0.72;
      x = Math.cos(a) * 920 * rr; y = Math.sin(a) * 470 * rr;
      tries++;
      minOK = (Math.hypot(x / 1.7, y) > 120) && (tries > 60 - u * 55 || place(x, y));
    } while (!minOK);
    cards.push({ cat, cx: x, cy: y, spawn: T.accumStart + 9.6 * Math.pow(u, 0.72), d: (r() - 0.35) * 0.45, title: title(cat) });
  });
  const stackCount = {};
  cards.forEach((c, i) => {
    c.i = i;
    c.stackIdx = (stackCount[c.cat] = (stackCount[c.cat] ?? -1) + 1);
    c.badge = r() < 0.45 ? 1 + Math.floor(r() * 8) : 0;
    c.age = AGES[Math.floor(r() * AGES.length)];
    c.seed = r() * 100;
    // stagger of the reorganisation: nearer cards move first
    const dist = Math.hypot(c.cx / 900, c.cy / 470);
    c.stag = clamp(dist * 0.8 + r() * 0.2);
  });
  CATS.forEach((cat) => (cat.count = stackCount[cat.id] + 1));
  return cards;
})();

// background "windows" that thicken the opening
const PANELS = [
  { kind: 'line', cat: 'consumption', x: -560, y: -250, w: 320, h: 170, d: 0.55, spawn: 9.2, label: 'Consumption · 90 days' },
  { kind: 'gantt', cat: 'milestone', x: 520, y: 250, w: 340, h: 180, d: 0.6, spawn: 10.4, label: 'Delivery plan' },
  { kind: 'table', cat: 'csdr', x: -470, y: 290, w: 320, h: 170, d: 0.5, spawn: 11.3, label: 'CSDR tracker' },
  { kind: 'doc', cat: 'accountplan', x: 560, y: -270, w: 280, h: 190, d: 0.65, spawn: 12.1, label: 'Account plan FY27' },
  { kind: 'inbox', cat: 'email', x: 60, y: -330, w: 300, h: 150, d: 0.75, spawn: 12.8, label: 'Inbox · 47 unread' },
  { kind: 'bars', cat: 'request', x: -60, y: 350, w: 300, h: 140, d: 0.7, spawn: 13.6, label: 'Open requests' },
];

// manual "hops": the CSAM carrying information from one system to another
const HOPS = (() => {
  const r = rng(21), hops = [];
  const n = 46;
  for (let k = 0; k < n; k++) {
    const t = 4.6 + 13.2 * Math.pow(k / n, 0.62);
    const vis = CARDS.filter((c) => c.spawn < t - 0.4);
    if (vis.length < 2) continue;
    const a = vis[Math.floor(r() * vis.length)];
    let b = vis[Math.floor(r() * vis.length)];
    if (b === a) b = vis[(vis.indexOf(a) + 1) % vis.length];
    hops.push({ t, a: a.i, b: b.i, dur: 1.05 - 0.3 * (k / n) });
  }
  return hops;
})();

// Magister's evolving model of the account (constellation inside the ring)
const MODEL = (() => {
  const r = rng(99), nodes = [];
  for (let i = 0; i < 30; i++) {
    const a = r() * TAU, rr = 78 + r() * 140;
    nodes.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, s: r() * 10, i });
  }
  const edges = [];
  nodes.forEach((n, i) => {
    const near = nodes.map((m, j) => [Math.hypot(m.x - n.x, m.y - n.y), j]).filter((p) => p[1] !== i).sort((p, q) => p[0] - q[0]);
    for (let k = 0; k < 2; k++) if (near[k][0] < 110) edges.push([i, near[k][1]]);
  });
  return { nodes, edges };
})();

// wider customer environment field (telemetry, tickets, interactions...) feeding the stacks
const FIELD = (() => {
  const r = rng(314), pts = [];
  for (let i = 0; i < 150; i++) {
    const a = r() * TAU, rr = 1.2 + r() * 0.7;
    const x = Math.cos(a) * STACK_RX * rr, y = Math.sin(a) * STACK_RY * rr;
    let best = 0, bd = 1e9;
    CATS.forEach((c, j) => { const dd = Math.hypot(c.pos[0] - x, c.pos[1] - y); if (dd < bd) { bd = dd; best = j; } });
    pts.push({ x, y, cat: best, s: r(), d: 0.15 + r() * 0.3 });
  }
  return pts;
})();

// quiet events handled by agents during "the account becomes a living system"
const EVENTS = [
  { t: 50.5, cat: 'followup', agent: 'execution', a: 'Action overdue', b: 'Followed up', probes: [] },
  { t: 52.0, cat: 'consumption', agent: 'consumption', a: 'Consumption −14%', b: 'Investigating signals', probes: ['milestone', 'escalation', 'request'] },
  { t: 53.5, cat: 'commitment', agent: 'execution', a: 'Commitment due Friday', b: 'Follow-up prepared', probes: [] },
  { t: 55.0, cat: 'milestone', agent: 'governor', a: 'Milestone moved', b: 'Dependencies updated', probes: ['accountplan', 'commitment', 'csdr'] },
  { t: 56.5, cat: 'risk', agent: 'health', a: 'New risk detected', b: 'Correlated with 3 signals', probes: ['escalation', 'consumption', 'meeting'] },
];

const BRIEF = {
  title: 'Expansion signal · Data platform',
  sections: [
    ['What changed', 'Customer announced two new regional operations hubs for 2027.'],
    ['Why it matters', 'Current capacity plan doesn’t cover them. The decision window closes in six weeks.'],
    ['Relevant context', 'Analytics consumption +18% · New executive sponsor since Q2 · Open data-residency risk'],
    ['Recommended next action', 'Brief the CIO on a phased expansion plan before the Q4 planning review.'],
  ],
};

const STAKEHOLDERS = [
  { name: 'CIO', ang: -62, r: 178, t: 67.3 },
  { name: 'VP Operations', ang: 12, r: 196, t: 68.1 },
  { name: 'Head of Data', ang: 78, r: 170, t: 68.6 },
  { name: 'Procurement', ang: 152, r: 186, t: 69.1 },
  { name: 'Business Sponsor', ang: -140, r: 190, t: 69.6 },
];
STAKEHOLDERS.forEach((s) => (s.pos = polar(s.r, s.ang)));

const CAPTIONS = [
  { t0: 3.1, t1: 7.2, text: "Today’s CSAM", size: 46, weight: 300 },
  { t0: 13.9, t1: 17.9, text: 'The human has become the integration layer.', size: 42, weight: 300 },
  { t0: 33.8, t1: 37.0, text: 'Specialized agents. Standing responsibilities.', size: 38, weight: 300 },
  { t0: 39.5, t1: 42.9, text: 'Automation executes a recipe.', size: 44, weight: 300 },
  { t0: 44.5, t1: 47.9, text: 'An agent owns a responsibility.', size: 44, weight: 300 },
  { t0: 50.3, t1: 57.4, text: 'Events happen. Most are handled quietly.', size: 38, weight: 300 },
  { t0: 61.8, t1: 66.0, text: 'The system decides when human attention creates value.', size: 38, weight: 300 },
  { t0: 67.9, t1: 70.7, text: 'Less administration.', size: 46, weight: 300 },
  { t0: 76.9, t1: 79.7, text: 'The work didn’t disappear.', size: 42, weight: 300 },
  { t0: 80.0, t1: 83.2, text: 'Responsibility moved.', size: 46, weight: 300 },
];
