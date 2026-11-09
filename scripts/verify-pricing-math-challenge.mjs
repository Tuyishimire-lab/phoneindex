/**
 * EMPIRICAL ADVERSARIAL STRESS-TESTING SUITE FOR:
 * docs/PRICING_DEAL_STRATEGY_EVALUATION.md
 * 
 * Challenger 1: Mathematical & Algorithmic Challenger
 */

import { writeFileSync } from 'node:fs';

console.log("================================================================================");
console.log("CHALLENGER 1: EMPIRICAL MATHEMATICAL & ALGORITHMIC VERIFICATION SUITE");
console.log("================================================================================\n");

const results = {
  decayTests: [],
  consensusTests: [],
  outlierTests: [],
  pHashTests: [],
  rankingTests: [],
  tcoTests: [],
  capacityTests: []
};

// ------------------------------------------------------------------------------
// TEST 1: Dynamic Half-Life Decay Formula & Lambda Constants
// ------------------------------------------------------------------------------
console.log("--- TEST 1: Dynamic Half-Life Decay & Lambda Verification ---");

function halfLifeLambda(halfLifeHours) {
  return Math.LN2 / halfLifeHours;
}

const decayConfigs = [
  { name: "Flash Sales (Doc: 8h)", halfLife: 8, docLambda: 0.0866 },
  { name: "Open-Box Clearance (Doc: 14h)", halfLife: 14, docLambda: 0.0495 },
  { name: "Flash (24h - Dispatch)", halfLife: 24, docLambda: 0.02888 },
  { name: "Weekend (72h - Dispatch)", halfLife: 72, docLambda: 0.009628 },
  { name: "Clearance (48h - Dispatch)", halfLife: 48, docLambda: 0.01444 },
  { name: "Clearance (7d / 168h - Dispatch)", halfLife: 168, docLambda: 0.004126 }
];

for (const cfg of decayConfigs) {
  const calculatedLambda = halfLifeLambda(cfg.halfLife);
  const diff = Math.abs(calculatedLambda - cfg.docLambda);
  const relErr = diff / calculatedLambda;
  
  // Test decay at t=0, t=half-life, t=3*half-life
  const p0 = Math.exp(-cfg.docLambda * 0);
  const pHalf = Math.exp(-cfg.docLambda * cfg.halfLife);
  const p3Half = Math.exp(-cfg.docLambda * (3 * cfg.halfLife));
  
  const testRecord = {
    name: cfg.name,
    halfLifeHours: cfg.halfLife,
    docLambda: cfg.docLambda,
    calculatedLambda: parseFloat(calculatedLambda.toFixed(6)),
    relErrPct: parseFloat((relErr * 100).toFixed(4)),
    p_at_0: parseFloat(p0.toFixed(4)),
    p_at_halfLife: parseFloat(pHalf.toFixed(4)),
    p_at_3halfLife: parseFloat(p3Half.toFixed(4)),
    pass: relErr < 0.002 // within 0.2% precision
  };
  results.decayTests.push(testRecord);
  console.log(`[Decay] ${cfg.name}: λ_doc=${cfg.docLambda}, λ_calc=${calculatedLambda.toFixed(6)} (Err: ${(relErr*100).toFixed(3)}%) | P(0)=${p0.toFixed(3)}, P(T_half)=${pHalf.toFixed(3)}, P(3T_half)=${p3Half.toFixed(3)} -> ${testRecord.pass ? 'PASS' : 'FAIL'}`);
}

// Adversarial Stress: Test Composite Decay Formula Boundaries & Necromancy
console.log("\n[Decay Adversarial Stress]: Composite Decay Formula");
function computePActive(t, lambda, nConfirm, nExpiredVotes) {
  return Math.exp(-lambda * t) * (1 + 0.25 * nConfirm) - (0.50 * nExpiredVotes);
}

const flashLambda = 0.0866; // 8h
const boundaryCases = [
  { desc: "t=0, 0 confirms, 0 expired", t: 0, nC: 0, nE: 0, expected: 1.0 },
  { desc: "t=0, 4 confirms (upper bound check)", t: 0, nC: 4, nE: 0, expected: 2.0 },
  { desc: "t=0, 3 expired votes (negative check)", t: 0, nC: 0, nE: 3, expected: -0.5 },
  { desc: "t=24h (3*half-life), 0 confirms", t: 24, nC: 0, nE: 0, expected: 0.125 },
  { desc: "t=24h (3*half-life), 4 sybil confirms (Zombie Deal)", t: 24, nC: 4, nE: 0, expected: 0.25 },
  { desc: "t=48h (6*half-life), 10 sybil confirms", t: 48, nC: 10, nE: 0, expected: 0.054 }
];

for (const b of boundaryCases) {
  const p = computePActive(b.t, flashLambda, b.nC, b.nE);
  console.log(`  Case [${b.desc}]: P_active = ${p.toFixed(4)} (Autodelist threshold <= 0.20 -> ${p <= 0.20 ? 'DELISTED' : 'ACTIVE'})`);
}

// ------------------------------------------------------------------------------
// TEST 2: Multi-User Consensus Scoring Algorithm & Sybil Attacks
// ------------------------------------------------------------------------------
console.log("\n--- TEST 2: Consensus Scoring & Sybil Resistance ---");

const TIER_WEIGHTS = {
  Scout: 1.0,
  Hunter: 2.0, // Mid-tier
  Verifier: 2.5,
  Master: 4.0
};

const THRESHOLD_VERIFY = 3.0;
const THRESHOLD_EXPIRE = -2.0;

function evaluateConsensus(voters) {
  let score = 0;
  for (const v of voters) {
    score += (TIER_WEIGHTS[v.tier] || 1.0) * v.vote;
  }
  return {
    score,
    isVerified: score >= THRESHOLD_VERIFY,
    isExpired: score <= THRESHOLD_EXPIRE
  };
}

const attackScenarios = [
  {
    name: "Sybil Attack: 3 Scout (+1) accounts colluding",
    voters: [{ tier: "Scout", vote: 1 }, { tier: "Scout", vote: 1 }, { tier: "Scout", vote: 1 }],
    target: "Bypass verification"
  },
  {
    name: "Rogue Actor: 1 Single Master Curator (+1)",
    voters: [{ tier: "Master", vote: 1 }],
    target: "Unilateral verification"
  },
  {
    name: "Competitor Sabotage: 1 Single Local Verifier (-1)",
    voters: [{ tier: "Verifier", vote: -1 }],
    target: "Unilateral deal censorship/expiry"
  },
  {
    name: "Competitor Sabotage: 2 Scout (-1) accounts",
    voters: [{ tier: "Scout", vote: -1 }, { tier: "Scout", vote: -1 }],
    target: "Low-cost deal censorship/expiry"
  },
  {
    name: "Legitimate Balance: 1 Verifier (+1) + 1 Scout (+1)",
    voters: [{ tier: "Verifier", vote: 1 }, { tier: "Scout", vote: 1 }],
    target: "Legitimate consensus (score = 3.5)"
  }
];

for (const sc of attackScenarios) {
  const res = evaluateConsensus(sc.voters);
  const finding = {
    scenario: sc.name,
    votersCount: sc.voters.length,
    score: res.score,
    verified: res.isVerified,
    expired: res.isExpired
  };
  results.consensusTests.push(finding);
  console.log(`[Consensus] ${sc.name}: Score = ${res.score} | Verified = ${res.isVerified} | Expired = ${res.isExpired}`);
}

// ------------------------------------------------------------------------------
// TEST 3: Outlier Detection (Z-Score & IQR) vs Baseline Street Price
// ------------------------------------------------------------------------------
console.log("\n--- TEST 3: Statistical Outlier Detection (Z-Score & IQR) ---");

function calculateZScore(price, mean, stdev) {
  return Math.abs(price - mean) / stdev;
}

function calculateIQR(prices) {
  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return { q1, q3, iqr, lowerBound: q1 - 1.5 * iqr, upperBound: q3 + 1.5 * iqr };
}

// Empirical Test 3A: Tight flagship market ($1,200 mean, $20 stdev)
const meanTight = 1200;
const stdevTight = 20;

const priceTests = [
  { desc: "Normal variation (-2.5%)", price: 1170 },
  { desc: "Modest legitimate sale (-5%)", price: 1140 },
  { desc: "Black Friday promotion (-20%)", price: 960 },
  { desc: "Clearance discount (-40%)", price: 720 },
  { desc: "Scam listing (-50%)", price: 600 },
  { desc: "Extreme fraud (-70%)", price: 360 },
  { desc: "Price gouge (+100%)", price: 2400 }
];

for (const pt of priceTests) {
  const z = calculateZScore(pt.price, meanTight, stdevTight);
  const discountPct = ((meanTight - pt.price) / meanTight) * 100;
  const isQuarantined = z > 3.0 || discountPct > 45 || pt.price < 400;
  
  results.outlierTests.push({
    desc: pt.desc,
    price: pt.price,
    discountPct: parseFloat(discountPct.toFixed(1)),
    zScore: parseFloat(z.toFixed(2)),
    isQuarantined
  });
  
  console.log(`[Outlier] ${pt.desc} ($${pt.price}): Disc=${discountPct.toFixed(1)}%, Z=${z.toFixed(2)} -> Quarantined: ${isQuarantined}`);
}

// ------------------------------------------------------------------------------
// TEST 4: Perceptual Hash (pHash) Hamming Distance Threshold
// ------------------------------------------------------------------------------
console.log("\n--- TEST 4: 64-bit DCT pHash Collision & Evasion ---");

function nCr(n, r) {
  if (r < 0 || r > n) return 0n;
  if (r === 0 || r === n) return 1n;
  let num = 1n;
  let den = 1n;
  for (let i = 1n; i <= BigInt(r); i++) {
    num *= (BigInt(n) - i + 1n);
    den *= i;
  }
  return num / den;
}

let totalCollisions5Bits = 0n;
for (let k = 0; k <= 5; k++) {
  totalCollisions5Bits += nCr(64, k);
}
const totalSpace = 2n ** 64n;
const pCollision = Number(totalCollisions5Bits) / Number(totalSpace);

console.log(`[pHash] Total permutations with Hamming Distance <= 5: ${totalCollisions5Bits.toLocaleString()}`);
console.log(`[pHash] Total 64-bit hash space: ${totalSpace.toLocaleString()}`);
console.log(`[pHash] Random independent collision probability: ${pCollision.toExponential(4)}`);

// Evasion simulation: minor image manipulation bit-flips
const evasionAttacks = [
  { attack: "Identical duplicate", bitFlips: 0, detectedAsFraud: true },
  { attack: "Minor compression (JPEG 90 -> 75)", bitFlips: 2, detectedAsFraud: true },
  { attack: "Mild crop (2%)", bitFlips: 7, detectedAsFraud: false },
  { attack: "1-degree rotation", bitFlips: 11, detectedAsFraud: false },
  { attack: "Contrast / CLAHE adjustment", bitFlips: 8, detectedAsFraud: false },
  { attack: "Border padding (2px)", bitFlips: 14, detectedAsFraud: false }
];

for (const ea of evasionAttacks) {
  const isDetected = ea.bitFlips <= 5;
  results.pHashTests.push({ ...ea, actualDetected: isDetected });
  console.log(`[pHash Evasion] ${ea.attack}: ${ea.bitFlips} bit flips -> Detected Fraud: ${isDetected} (Evaded: ${!isDetected})`);
}

// ------------------------------------------------------------------------------
// TEST 5: Proximity Search & Multi-Factor Ranking Function
// ------------------------------------------------------------------------------
console.log("\n--- TEST 5: Proximity Search & Multi-Factor Ranking ---");

function scoreDistance(dKm) {
  return Math.exp(-dKm / 12.0);
}

function scoreDiscount(discPct) {
  return Math.min(1.0, discPct / 40.0);
}

function scoreFreshness(hours) {
  return Math.exp(-hours / 24.0);
}

function rankScoreDoc(dKm, discPct, hours, verifScore) {
  // Document line 456: 0.40 * dist + 0.30 * disc + 0.15 * fresh + 0.15 * verif
  return 0.40 * scoreDistance(dKm) + 0.30 * scoreDiscount(discPct) + 0.15 * scoreFreshness(hours) + 0.15 * verifScore;
}

function rankScoreBalanced(dKm, discPct, hours, verifScore) {
  // Balanced weights: 0.35 * dist + 0.35 * disc + 0.15 * fresh + 0.15 * verif
  return 0.35 * scoreDistance(dKm) + 0.35 * scoreDiscount(discPct) + 0.15 * scoreFreshness(hours) + 0.15 * verifScore;
}

const rankingScenarios = [
  { name: "Store A (0km, 0% disc, fresh, POS)", dKm: 0, discPct: 0, h: 0, ver: 1.0 },
  { name: "Store B (0.5km, 0% disc, fresh, POS)", dKm: 0.5, discPct: 0, h: 0, ver: 1.0 },
  { name: "Store C (15km, 20% disc, fresh, POS)", dKm: 15, discPct: 20, h: 0, ver: 1.0 },
  { name: "Store D (25km, 40% disc, fresh, POS)", dKm: 25, discPct: 40, h: 0, ver: 1.0 },
  { name: "Store E (25km, 60% disc, fresh, POS)", dKm: 25, discPct: 60, h: 0, ver: 1.0 },
  { name: "Store F (5km, 30% disc, 72h old, POS)", dKm: 5, discPct: 30, h: 72, ver: 1.0 },
  { name: "Store G (100km, 40% disc, fresh, POS)", dKm: 100, discPct: 40, h: 0, ver: 1.0 },
  { name: "Store H (2km, 30% disc, fresh, unverified)", dKm: 2, discPct: 30, h: 0, ver: 0.4 }
];

console.log("Ranking Comparison (Doc Weights [0.40, 0.30, 0.15, 0.15] vs Balanced [0.35, 0.35, 0.15, 0.15]):");
for (const sc of rankingScenarios) {
  const sDist = scoreDistance(sc.dKm);
  const sDisc = scoreDiscount(sc.discPct);
  const sFresh = scoreFreshness(sc.h);
  const scoreDoc = rankScoreDoc(sc.dKm, sc.discPct, sc.h, sc.ver);
  const scoreBal = rankScoreBalanced(sc.dKm, sc.discPct, sc.h, sc.ver);
  
  results.rankingTests.push({
    scenario: sc.name,
    sDist: parseFloat(sDist.toFixed(4)),
    sDisc: parseFloat(sDisc.toFixed(4)),
    sFresh: parseFloat(sFresh.toFixed(4)),
    scoreDoc: parseFloat(scoreDoc.toFixed(4)),
    scoreBal: parseFloat(scoreBal.toFixed(4))
  });
  
  console.log(`  ${sc.name}: S_dist=${sDist.toFixed(3)}, S_disc=${sDisc.toFixed(3)}, S_fresh=${sFresh.toFixed(3)} | DocScore=${scoreDoc.toFixed(4)} | BalScore=${scoreBal.toFixed(4)}`);
}

// ------------------------------------------------------------------------------
// TEST 6: TCO & Economic Calculations
// ------------------------------------------------------------------------------
console.log("\n--- TEST 6: TCO Calculation Verification ---");

// Official APIs Model
const keepaMin = 49 * 1.08; // ~52.92
const keepaMax = 189 * 1.08; // ~204.12
const officialMin = keepaMin; // ~$55/mo
const officialMax = keepaMax; // ~$205/mo

// Scraper Model
const checksPerDay = 100000;
const reqSizeBytes = 300 * 1024; // 300 KB
const gbPerDay = (checksPerDay * 300) / (1024 * 1024); // 28.61 GB/day (approx 30 GB/day)
const gbPerMonth = gbPerDay * 30; // 858.3 GB/month (rounded to 900 GB/month in doc)

const proxyMin = 900 * 8; // $7,200
const proxyMax = 900 * 12; // $10,800
const captcha = 30;
const compute = 400;
const devMin = 4000;
const devMax = 8000;

const scraperMin = proxyMin + captcha + compute + devMin;
const scraperMax = proxyMax + captcha + compute + devMax;

console.log(`[TCO Scraper] Bandwidth: 900 GB @ $8-$12 = $${proxyMin} - $${proxyMax}`);
console.log(`[TCO Scraper] Total: $${scraperMin.toLocaleString()} - $${scraperMax.toLocaleString()} / month`);
console.log(`[TCO Official] Keepa: €49 - €189 ($${officialMin.toFixed(0)} - $${officialMax.toFixed(0)} / month)`);
console.log(`[TCO Ratio] Scraping is ${(scraperMin / officialMax).toFixed(1)}x to ${(scraperMax / officialMin).toFixed(1)}x more expensive.`);

results.tcoTests.push({
  scraperMin,
  scraperMax,
  officialMin: Math.round(officialMin),
  officialMax: Math.round(officialMax),
  ratioLow: parseFloat((scraperMin / officialMax).toFixed(1)),
  ratioHigh: parseFloat((scraperMax / officialMin).toFixed(1))
});

// ------------------------------------------------------------------------------
// TEST 7: Rate Limit Capacity Across 1,000 to 10,000 Daily Active Queries
// ------------------------------------------------------------------------------
console.log("\n--- TEST 7: Rate Limit & Token Bucket Capacity ---");

const dailyQueryVolumes = [1000, 5000, 10000];

const providers = [
  { name: "Amazon PA-API 5.0", dailyQuota: 86400, peakTPS: 1 },
  { name: "eBay Browse (Default)", dailyQuota: 5000, peakTPS: 5 },
  { name: "eBay Browse (Prod Tier 1)", dailyQuota: 50000, peakTPS: 5 },
  { name: "Best Buy Dev API", dailyQuota: 50000, peakTPS: 5 },
  { name: "Keepa (€49/mo - 20 tok/min)", dailyQuota: 20 * 60 * 24, peakTPS: 20 / 60 },
  { name: "Keepa (€189/mo - 100 tok/min)", dailyQuota: 100 * 60 * 24, peakTPS: 100 / 60 }
];

for (const vol of dailyQueryVolumes) {
  console.log(`\nVolume: ${vol.toLocaleString()} queries/day:`);
  for (const prov of providers) {
    const pctUsed = (vol / prov.dailyQuota) * 100;
    const isExceeded = vol > prov.dailyQuota;
    console.log(`  - ${prov.name}: ${pctUsed.toFixed(2)}% of daily quota (${isExceeded ? 'EXCEEDED!' : 'OK'})`);
    results.capacityTests.push({ volume: vol, provider: prov.name, pctUsed: parseFloat(pctUsed.toFixed(2)), isExceeded });
  }
}

console.log("\n================================================================================");
console.log("VERIFICATION COMPLETE. ALL CALCULATIONS LOGGED.");
console.log("================================================================================");
