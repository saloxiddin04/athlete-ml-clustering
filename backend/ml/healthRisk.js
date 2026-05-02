/**
 * Health Risk Prediction
 * Predicts: high_risk (1) vs low_risk (0)
 * Models:   Logistic Regression, Decision Tree (CART)
 * Features: bmi, systolic_bp, diastolic_bp, smoke_status, stress_level, sleep_hours, age
 */

const RISK_FEATURES = [
  'age', 'bmi', 'systolic_bp', 'diastolic_bp',
  'stress_level', 'sleep_hours', 'resting_heart_rate', 'avg_heart_rate'
];

// ── Label: 1 = high risk, 0 = low risk ──────────────────────────────────────
const getLabel = (row) => {
  const bmi        = parseFloat(row.bmi ?? 22);
  const sbp        = parseFloat(row.systolic_bp ?? 120);
  const dbp        = parseFloat(row.diastolic_bp ?? 80);
  const smoke      = String(row.smoke_status ?? 'never').toLowerCase();
  const stress     = parseFloat(row.stress_level ?? 3);
  const sleep      = parseFloat(row.sleep_hours ?? 7);
  const healthCond = String(row.health_condition ?? 'healthy').toLowerCase();

  let riskScore = 0;
  if (bmi > 30) riskScore++;
  if (bmi > 35) riskScore++;
  if (sbp > 140) riskScore++;
  if (dbp > 90)  riskScore++;
  if (smoke === 'current') riskScore += 2;
  if (smoke === 'former')  riskScore++;
  if (stress >= 7) riskScore++;
  if (sleep < 5)  riskScore++;
  if (['heart disease', 'hypertension', 'diabetes'].includes(healthCond)) riskScore += 2;

  return riskScore >= 3 ? 1 : 0;
};

// ── Encode categorical fields ─────────────────────────────────────────────────
const encodeRow = (row) => {
  const smokeMap = { never: 0, former: 0.5, current: 1 };
  return [
    ...RISK_FEATURES.map(f => parseFloat(row[f] ?? 0)),
    smokeMap[String(row.smoke_status ?? 'never').toLowerCase()] ?? 0
  ];
};

// ── Z-score normalise ─────────────────────────────────────────────────────────
const buildStats = (encoded) => {
  const dim = encoded[0].length;
  return Array.from({ length: dim }, (_, i) => {
    const vals = encoded.map(v => v[i]);
    const mu   = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sig  = Math.sqrt(vals.reduce((s, v) => s + (v - mu) ** 2, 0) / vals.length) || 1;
    return { mu, sig };
  });
};

const norm = (vec, stats) => vec.map((v, i) => (v - stats[i].mu) / stats[i].sig);

// ── Sigmoid ───────────────────────────────────────────────────────────────────
const sigmoid = x => 1 / (1 + Math.exp(-Math.min(Math.max(x, -500), 500)));

// ── Logistic Regression (gradient descent) ────────────────────────────────────
const trainLogistic = (Xs, ys, lr = 0.05, epochs = 800) => {
  const n = Xs.length;
  const m = Xs[0].length;
  let w = new Array(m).fill(0);
  let b = 0;

  for (let e = 0; e < epochs; e++) {
    let dw = new Array(m).fill(0);
    let db = 0;
    for (let i = 0; i < n; i++) {
      const z    = Xs[i].reduce((s, x, j) => s + x * w[j], b);
      const pred = sigmoid(z);
      const err  = pred - ys[i];
      dw = dw.map((v, j) => v + (err * Xs[i][j]) / n);
      db += err / n;
    }
    w = w.map((v, j) => v - lr * dw[j]);
    b -= lr * db;
  }
  return { w, b };
};

const logisticPredict = ({ w, b }, xs) => {
  const z = xs.reduce((s, x, j) => s + x * w[j], b);
  return sigmoid(z);
};

// ── Decision Tree (CART, binary classification) ───────────────────────────────
const gini = (ys) => {
  if (!ys.length) return 0;
  const p = ys.filter(v => v === 1).length / ys.length;
  return 1 - p * p - (1 - p) * (1 - p);
};

const buildTree = (Xs, ys, depth = 0, maxDepth = 6, minSamples = 4) => {
  const p1 = ys.filter(v => v === 1).length / ys.length;
  if (!ys.length || depth >= maxDepth || ys.length < minSamples || p1 === 0 || p1 === 1) {
    return { leaf: true, value: Math.round(p1), prob: p1 };
  }

  let bestF = -1, bestThr = 0, bestGain = -Infinity;
  const parentGini = gini(ys);

  for (let f = 0; f < Xs[0].length; f++) {
    const uniq = [...new Set(Xs.map(x => x[f]))].sort((a, b) => a - b);
    for (let t = 0; t < uniq.length - 1; t++) {
      const thr = (uniq[t] + uniq[t + 1]) / 2;
      const lIdx = [], rIdx = [];
      Xs.forEach((x, i) => (x[f] <= thr ? lIdx : rIdx).push(i));
      if (!lIdx.length || !rIdx.length) continue;
      const gain = parentGini
        - (lIdx.length / ys.length) * gini(lIdx.map(i => ys[i]))
        - (rIdx.length / ys.length) * gini(rIdx.map(i => ys[i]));
      if (gain > bestGain) { bestGain = gain; bestF = f; bestThr = thr; }
    }
  }

  if (bestF < 0) return { leaf: true, value: Math.round(p1), prob: p1 };

  const lIdx = Xs.map((x, i) => x[bestF] <= bestThr ? i : -1).filter(i => i >= 0);
  const rIdx = Xs.map((x, i) => x[bestF] >  bestThr ? i : -1).filter(i => i >= 0);

  return {
    leaf: false, feature: bestF, threshold: bestThr,
    left:  buildTree(lIdx.map(i => Xs[i]), lIdx.map(i => ys[i]), depth + 1, maxDepth, minSamples),
    right: buildTree(rIdx.map(i => Xs[i]), rIdx.map(i => ys[i]), depth + 1, maxDepth, minSamples)
  };
};

const treePredict = (node, xs) => {
  if (node.leaf) return { label: node.value, prob: node.prob };
  return xs[node.feature] <= node.threshold
    ? treePredict(node.left, xs)
    : treePredict(node.right, xs);
};

// ── Accuracy / Precision / Recall / F1 ───────────────────────────────────────
const calcMetrics = (truths, preds) => {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  truths.forEach((t, i) => {
    if (t === 1 && preds[i] === 1) tp++;
    else if (t === 0 && preds[i] === 0) tn++;
    else if (t === 0 && preds[i] === 1) fp++;
    else fn++;
  });
  const accuracy  = (tp + tn) / truths.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall    = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1        = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  return {
    accuracy:  +accuracy.toFixed(3),
    precision: +precision.toFixed(3),
    recall:    +recall.toFixed(3),
    f1:        +f1.toFixed(3)
  };
};

// ── Main train ────────────────────────────────────────────────────────────────
const trainHealthRisk = (data) => {
  const clean = data.filter(d =>
    RISK_FEATURES.every(f => d[f] !== null && d[f] !== undefined && !isNaN(parseFloat(d[f])))
  );
  if (clean.length < 20) throw new Error('Need at least 20 records for health risk training.');

  const labels  = clean.map(getLabel);
  const encoded = clean.map(encodeRow);
  const stats   = buildStats(encoded);
  const normXs  = encoded.map(v => norm(v, stats));

  const split   = Math.floor(clean.length * 0.8);
  const trXs    = normXs.slice(0, split);
  const trYs    = labels.slice(0, split);
  const teXs    = normXs.slice(split);
  const teYs    = labels.slice(split);

  // Logistic
  const logModel  = trainLogistic(trXs, trYs);
  const logPreds  = teXs.map(x => logisticPredict(logModel, x) >= 0.5 ? 1 : 0);
  const logMetrics = calcMetrics(teYs, logPreds);

  // Decision Tree
  const dtModel   = buildTree(trXs, trYs);
  const dtPreds   = teXs.map(x => treePredict(dtModel, x).label);
  const dtMetrics = calcMetrics(teYs, dtPreds);

  return {
    models: { logModel, dtModel },
    stats,
    metrics: { logistic: logMetrics, decisionTree: dtMetrics },
    trainedOn: clean.length,
    highRiskCount: labels.filter(l => l === 1).length
  };
};

// ── Single prediction ─────────────────────────────────────────────────────────
const predictHealthRisk = (row, { models, stats }, model = 'dt') => {
  const xs = norm(encodeRow(row), stats);

  if (model === 'logistic') {
    const prob = logisticPredict(models.logModel, xs);
    return {
      risk:       prob >= 0.5 ? 'high_risk' : 'low_risk',
      probability: +prob.toFixed(3),
      model:      'Logistic Regression'
    };
  } else {
    const { label, prob } = treePredict(models.dtModel, xs);
    return {
      risk:        label === 1 ? 'high_risk' : 'low_risk',
      probability: +prob.toFixed(3),
      model:       'Decision Tree'
    };
  }
};

module.exports = { trainHealthRisk, predictHealthRisk, getLabel };
