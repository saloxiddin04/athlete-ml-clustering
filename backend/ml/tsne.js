/**
 * t-Distributed Stochastic Neighbor Embedding (t-SNE)
 * Simplified JavaScript implementation for athlete data visualization
 */

const { euclideanDistance, normalizeFeatures } = require('./kmeans');

/**
 * runTSNE
 * @param {Array} athletes - Athlete data
 * @param {Object} options - {perplexity, iterations, learningRate}
 */
const runTSNE = (athletes, options = {}) => {
  const { normalized } = normalizeFeatures(athletes);
  const X = normalized.map(p => p.features);
  const N = X.length;
  if (N < 2) return athletes.map(a => ({ id: a.id, tsne_x: 0, tsne_y: 0 }));

  const perplexity = options.perplexity || 30;
  const iterations = options.iterations || 200;
  const learningRate = options.learningRate || 10;
  
  // 1. Compute pairwise distances in high-dimensional space
  const dists = Array.from({ length: N }, () => new Float64Array(N));
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const d = euclideanDistance(X[i], X[j]);
      dists[i][j] = d;
      dists[j][i] = d;
    }
  }

  // 2. Compute P-probabilities (conditional probabilities)
  const P = Array.from({ length: N }, () => new Float64Array(N));
  const targetEntropy = Math.log2(perplexity);

  for (let i = 0; i < N; i++) {
    let beta = 1.0;
    let betaMin = -Infinity;
    let betaMax = Infinity;

    for (let iter = 0; iter < 50; iter++) {
      let sumP = 0;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        P[i][j] = Math.exp(-dists[i][j] * beta);
        sumP += P[i][j];
      }
      
      let H = 0;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        P[i][j] /= (sumP || 1e-7);
        if (P[i][j] > 1e-7) {
          H -= P[i][j] * Math.log2(P[i][j]);
        }
      }

      if (Math.abs(H - targetEntropy) < 1e-4) break;
      if (H > targetEntropy) {
        betaMin = beta;
        beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2;
      } else {
        betaMax = beta;
        beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2;
      }
    }
  }

  // Symmetrize P
  const symP = Array.from({ length: N }, () => new Float64Array(N));
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      symP[i][j] = (P[i][j] + P[j][i]) / (2 * N);
    }
  }

  // 3. Initialize low-dimensional Y (2D)
  let Y = Array.from({ length: N }, () => [Math.random() - 0.5, Math.random() - 0.5]);
  let velocities = Array.from({ length: N }, () => [0, 0]);

  // 4. Optimization (Gradient Descent)
  const momentum = 0.8;
  for (let iter = 0; iter < iterations; iter++) {
    // Compute Q matrix (Student t-distribution)
    const Q = Array.from({ length: N }, () => new Float64Array(N));
    let sumQ = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const d2 = Math.pow(Y[i][0] - Y[j][0], 2) + Math.pow(Y[i][1] - Y[j][1], 2);
        Q[i][j] = 1 / (1 + d2);
        sumQ += Q[i][j];
      }
    }

    // Compute gradients
    for (let i = 0; i < N; i++) {
        let gradX = 0, gradY = 0;
        for (let j = 0; j < N; j++) {
            if (i === j) continue;
            const q = Q[i][j] / (sumQ || 1e-7);
            const coeff = 4 * (symP[i][j] - q) * Q[i][j];
            gradX += coeff * (Y[i][0] - Y[j][0]);
            gradY += coeff * (Y[i][1] - Y[j][1]);
        }
        
        // Update velocities and positions
        velocities[i][0] = momentum * velocities[i][0] - learningRate * gradX;
        velocities[i][1] = momentum * velocities[i][1] - learningRate * gradY;
        Y[i][0] += velocities[i][0];
        Y[i][1] += velocities[i][1];
    }

    // Mean-center Y to prevent drift
    if (iter % 10 === 0) {
        let cenX = 0, cenY = 0;
        for(let i=0; i<N; i++) { cenX += Y[i][0]; cenY += Y[i][1]; }
        cenX /= N; cenY /= N;
        for(let i=0; i<N; i++) { Y[i][0] -= cenX; Y[i][1] -= cenY; }
    }
  }

  return athletes.map((athlete, i) => ({
    id: athlete.id,
    tsne_x: parseFloat(Y[i][0].toFixed(4)),
    tsne_y: parseFloat(Y[i][1].toFixed(4))
  }));
};

module.exports = { runTSNE };
