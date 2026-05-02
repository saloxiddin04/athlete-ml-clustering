/**
 * Principal Component Analysis (PCA)
 * Pure JavaScript implementation using Power Iteration for eigenvectors
 */

const { normalizeFeatures } = require('./kmeans');

/**
 * Perform PCA on athlete data
 * @param {Array} athletes - List of athlete objects
 * @param {number} npc - Number of principal components (default 2)
 * @returns {Array} List of coordinates {id, pca_x, pca_y}
 */
const runPCA = (athletes, npc = 2) => {
  if (athletes.length < npc) return [];

  // 1. Prepare and normalize data
  const { normalized } = normalizeFeatures(athletes);
  const data = normalized.map(p => p.features);
  const numObservations = data.length;
  const numFeatures = data[0].length;

  // 2. Center the data (mean subtraction) - normalizeFeatures already centers/scales if needed, 
  // but let's ensure it's mean-centered for PCA
  const means = new Array(numFeatures).fill(0);
  for (let i = 0; i < numObservations; i++) {
    for (let j = 0; j < numFeatures; j++) {
      means[j] += data[i][j];
    }
  }
  for (let j = 0; j < numFeatures; j++) means[j] /= numObservations;

  const centeredData = data.map(row => row.map((val, j) => val - means[j]));

  // 3. Compute Covariance Matrix (Size: numFeatures x numFeatures)
  const covariance = Array.from({ length: numFeatures }, () => new Array(numFeatures).fill(0));
  for (let i = 0; i < numFeatures; i++) {
    for (let j = 0; j < numFeatures; j++) {
      let sum = 0;
      for (let k = 0; k < numObservations; k++) {
        sum += centeredData[k][i] * centeredData[k][j];
      }
      covariance[i][j] = sum / (numObservations - 1);
    }
  }

  // 4. Find Eigenvectors using Power Iteration + Deflation
  const eigenvectors = [];
  let currentCov = covariance.map(row => [...row]);

  for (let c = 0; c < npc; c++) {
    let v = new Array(numFeatures).fill(0).map(() => Math.random());
    
    // Iterate to find dominant eigenvector
    for (let iter = 0; iter < 100; iter++) {
      const nextV = new Array(numFeatures).fill(0);
      for (let i = 0; i < numFeatures; i++) {
        for (let j = 0; j < numFeatures; j++) {
          nextV[i] += currentCov[i][j] * v[j];
        }
      }
      
      // Normalize
      const norm = Math.sqrt(nextV.reduce((sum, val) => sum + val * val, 0));
      v = nextV.map(val => val / (norm || 1));
    }
    
    eigenvectors.push(v);

    // Deflate: Cov = Cov - lambda * v * vT
    // lambda is vT * Cov * v
    let lambda = 0;
    const Cv = new Array(numFeatures).fill(0);
    for (let i = 0; i < numFeatures; i++) {
      for (let j = 0; j < numFeatures; j++) Cv[i] += currentCov[i][j] * v[j];
      lambda += v[i] * Cv[i];
    }

    for (let i = 0; i < numFeatures; i++) {
      for (let j = 0; j < numFeatures; j++) {
        currentCov[i][j] -= lambda * v[i] * v[j];
      }
    }
  }

  // 5. Project data onto principal components
  return athletes.map((athlete, i) => {
    const row = centeredData[i];
    const coords = [];
    for (let c = 0; c < npc; c++) {
      let projection = 0;
      for (let j = 0; j < numFeatures; j++) {
        projection += row[j] * eigenvectors[c][j];
      }
      coords.push(parseFloat(projection.toFixed(4)));
    }
    return {
      id: athlete.id,
      pca_x: coords[0],
      pca_y: coords[1]
    };
  });
};

module.exports = { runPCA };
