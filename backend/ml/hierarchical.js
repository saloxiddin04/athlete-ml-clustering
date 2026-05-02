/**
 * Hierarchical (Agglomerative) Clustering Algorithm
 * Pure JavaScript implementation
 * 
 * Algorithm (Bottom-up):
 * 1. Start: each point is its own cluster
 * 2. Find two closest clusters (Ward linkage)
 * 3. Merge them into one cluster
 * 4. Repeat until k clusters remain
 * 
 * Linkage method: Ward's method (minimizes within-cluster variance)
 */

const { euclideanDistance, normalizeFeatures } = require('./kmeans');

/**
 * Compute Ward linkage distance between two clusters
 * Ward = increase in total within-cluster variance from merging
 * D(A,B) = sqrt(2 * nA * nB / (nA + nB)) * ||centroid_A - centroid_B||
 */
const wardDistance = (clusterA, clusterB) => {
  const nA = clusterA.points.length;
  const nB = clusterB.points.length;
  const coeff = Math.sqrt((2 * nA * nB) / (nA + nB));
  return coeff * euclideanDistance(clusterA.centroid, clusterB.centroid);
};

/**
 * Average linkage: mean distance between all pairs of points
 */
const averageLinkage = (clusterA, clusterB) => {
  let totalDist = 0;
  let count = 0;
  clusterA.points.forEach(a => {
    clusterB.points.forEach(b => {
      totalDist += euclideanDistance(a.features, b.features);
      count++;
    });
  });
  return count > 0 ? totalDist / count : Infinity;
};

/**
 * Compute centroid of a cluster
 */
const computeCentroid = (points) => {
  const dim = points[0].features.length;
  const centroid = new Array(dim).fill(0);
  points.forEach(p => {
    p.features.forEach((v, i) => { centroid[i] += v; });
  });
  return centroid.map(v => v / points.length);
};

/**
 * Build the distance matrix for all cluster pairs
 */
const buildDistanceMatrix = (clusters) => {
  const n = clusters.length;
  const matrix = {};
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${clusters[i].id}-${clusters[j].id}`;
      matrix[key] = wardDistance(clusters[i], clusters[j]);
    }
  }
  return matrix;
};

/**
 * Find the two closest clusters in current set
 */
const findClosestClusters = (clusters) => {
  let minDist = Infinity;
  let bestPair = [0, 1];

  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const dist = wardDistance(clusters[i], clusters[j]);
      if (dist < minDist) {
        minDist = dist;
        bestPair = [i, j];
      }
    }
  }

  return { i: bestPair[0], j: bestPair[1], distance: minDist };
};

/**
 * Silhouette score (reused concept from kmeans module context)
 */
const computeSilhouetteScore = (assignedData) => {
  const n = assignedData.length;
  if (n < 2) return 0;

  const clusters = [...new Set(assignedData.map(d => d.cluster))];
  if (clusters.length < 2) return 0;

  const clusterGroups = {};
  clusters.forEach(c => {
    clusterGroups[c] = assignedData.filter(d => d.cluster === c);
  });

  const scores = assignedData.map(point => {
    const sameCluster = clusterGroups[point.cluster].filter(p => p.id !== point.id);

    const a = sameCluster.length === 0 ? 0 :
      sameCluster.reduce((s, p) => s + euclideanDistance(point.features, p.features), 0) / sameCluster.length;

    const otherClusters = clusters.filter(c => c !== point.cluster);
    if (otherClusters.length === 0) return 0;

    const b = Math.min(...otherClusters.map(c => {
      const members = clusterGroups[c];
      return members.reduce((s, p) => s + euclideanDistance(point.features, p.features), 0) / members.length;
    }));

    const maxAB = Math.max(a, b);
    return maxAB === 0 ? 0 : (b - a) / maxAB;
  });

  return scores.reduce((s, v) => s + v, 0) / scores.length;
};

/**
 * Main Hierarchical Clustering function
 * 
 * @param {Array} athletes - Athlete objects from DB
 * @param {number} k - Target number of clusters
 * @returns {Object} Clustering results with dendrogram and scores
 */
const hierarchicalClustering = (athletes, k = 3) => {
  if (athletes.length < 2) {
    throw new Error('Need at least 2 athletes for clustering');
  }

  const { normalized } = normalizeFeatures(athletes);
  const finalK = Math.max(2, Math.min(k, athletes.length - 1));

  // Initialize: each point is its own cluster
  let clusters = normalized.map((point, idx) => ({
    id: idx,
    points: [point],
    centroid: [...point.features],
    athleteIds: [point.id],
    label: `C${idx}`
  }));

  // Dendrogram data: records merge history
  const dendrogram = [];
  let nextClusterId = clusters.length;

  // Agglomerate until we have k clusters
  while (clusters.length > finalK) {
    const { i, j, distance } = findClosestClusters(clusters);

    const clusterA = clusters[i];
    const clusterB = clusters[j];

    // Record this merge in dendrogram
    dendrogram.push({
      id: nextClusterId,
      left: clusterA.id,
      right: clusterB.id,
      distance: parseFloat(distance.toFixed(4)),
      count: clusterA.points.length + clusterB.points.length
    });

    // Merge clusters
    const mergedPoints = [...clusterA.points, ...clusterB.points];
    const mergedCluster = {
      id: nextClusterId++,
      points: mergedPoints,
      centroid: computeCentroid(mergedPoints),
      athleteIds: [...clusterA.athleteIds, ...clusterB.athleteIds],
      label: `C${nextClusterId}`
    };

    // Remove merged clusters and add new one
    clusters = clusters.filter((_, idx) => idx !== i && idx !== j);
    clusters.push(mergedCluster);
  }

  // Assign cluster labels (0 to k-1)
  const assignments = [];
  clusters.forEach((cluster, clusterIdx) => {
    cluster.points.forEach(point => {
      assignments.push({ id: point.id, cluster: clusterIdx });
    });
  });

  // Compute silhouette score
  const assignedData = normalized.map(point => {
    const assignment = assignments.find(a => a.id === point.id);
    return { ...point, cluster: assignment ? assignment.cluster : 0 };
  });

  const silhouetteScore = computeSilhouetteScore(assignedData);

  // Build cluster summaries
  const clusterSummaries = clusters.map((cluster, idx) => ({
    id: idx,
    size: cluster.points.length,
    members: cluster.points.map(p => ({ id: p.id, name: p.name })),
    centroid: {
      height: cluster.points.reduce((s, p) => s + p.height, 0) / cluster.points.length,
      weight: cluster.points.reduce((s, p) => s + p.weight, 0) / cluster.points.length,
      muscle_mass: cluster.points.reduce((s, p) => s + p.muscle_mass, 0) / cluster.points.length,
      run_time: cluster.points.reduce((s, p) => s + p.run_time, 0) / cluster.points.length,
    }
  }));

  return {
    assignments,
    clusters: clusterSummaries,
    k: finalK,
    score: parseFloat(silhouetteScore.toFixed(4)),
    dendrogram: {
      merges: dendrogram,
      // Simplified dendrogram nodes for visualization
      nodes: buildDendrogramNodes(dendrogram, normalized.length)
    }
  };
};

/**
 * Build dendrogram tree structure for frontend visualization
 */
const buildDendrogramNodes = (merges, leafCount) => {
  // Create leaf nodes
  const nodes = {};
  for (let i = 0; i < leafCount; i++) {
    nodes[i] = { id: i, isLeaf: true, height: 0, children: [] };
  }

  // Add merge nodes
  merges.forEach(merge => {
    nodes[merge.id] = {
      id: merge.id,
      isLeaf: false,
      height: merge.distance,
      count: merge.count,
      children: [merge.left, merge.right]
    };
  });

  return Object.values(nodes);
};

module.exports = { hierarchicalClustering };
