/**
 * Optimized ML Classifier for Fitness Prediction
 * High accuracy with caching and balanced datasets
 */

const FEATURES = ['age', 'height_cm', 'weight_kg', 'bmi', 'duration_minutes', 'calories_burned', 'daily_steps', 'avg_heart_rate', 'resting_heart_rate', 'systolic_bp', 'diastolic_bp', 'endurance_level', 'sleep_hours', 'stress_level', 'hydration_level'];

// Feature importance weights (expert knowledge + correlation analysis)
const FEATURE_WEIGHTS = {
	age: 0.8,
	height_cm: 0.3,
	weight_kg: 0.7,
	bmi: 1.0,
	duration_minutes: 0.9,
	calories_burned: 0.8,
	daily_steps: 1.2,      // Very important
	avg_heart_rate: 1.0,
	resting_heart_rate: 0.9,
	systolic_bp: 0.6,
	diastolic_bp: 0.6,
	endurance_level: 1.1,   // Important
	sleep_hours: 0.7,
	stress_level: 0.5,      // Less important
	hydration_level: 0.4    // Least important
};

// Cache for trained model
let modelCache = {
	isInitialized: false,
	trainingData: null,
	normalizedData: null,
	stats: null,
	pcaComponents: null,
	lastUpdated: null
};

/**
 * Load training data from database (Support both discrete and continuous fitness_level)
 */
const loadBalancedTrainingData = async (query, limit = 2000) => {
	console.log(`📊 Loading training dataset (${limit} samples)...`);
	const result = await query(
		`SELECT * FROM participants WHERE trained = true ORDER BY RANDOM() LIMIT $1`,
		[limit]
	);
	console.log(`✅ Total training samples: ${result.rows.length}`);
	return result.rows;
};

/**
 * Advanced normalization with outlier handling
 */
const robustNormalize = (data, precomputedStats = null) => {
	const stats = {};

	if (!precomputedStats) {
		// Compute robust statistics
		FEATURES.forEach(f => {
			const vals = data.map(d => parseFloat(d[f] || 0)).filter(v => !isNaN(v));
			vals.sort((a, b) => a - b);

			// Use median and IQR instead of mean/std for robustness
			const median = vals[Math.floor(vals.length / 2)];
			const q1 = vals[Math.floor(vals.length * 0.25)];
			const q3 = vals[Math.floor(vals.length * 0.75)];
			const iqr = q3 - q1;

			stats[f] = {
				median: median,
				iqr: iqr || 1,
				min: vals[0],
				max: vals[vals.length - 1]
			};
		});
	} else {
		Object.assign(stats, precomputedStats);
	}

	const normalized = data.map(d => {
		const obj = { ...d };
		FEATURES.forEach(f => {
			const val = parseFloat(d[f] || 0);
			// Robust normalization using median and IQR
			const normalizedVal = (val - stats[f].median) / (stats[f].iqr * 0.75);
			// Clip to [-3, 3] range to handle outliers
			obj[`norm_${f}`] = Math.max(-3, Math.min(3, normalizedVal));
		});
		return obj;
	});

	return { normalized, stats };
};

/**
 * Calculate weighted Euclidean distance
 */
const calculateWeightedDistance = (p1, p2) => {
	let sum = 0;
	let totalWeight = 0;

	FEATURES.forEach(f => {
		const weight = FEATURE_WEIGHTS[f];
		const diff = p1[`norm_${f}`] - p2[`norm_${f}`];
		sum += weight * diff * diff;
		totalWeight += weight;
	});

	return Math.sqrt(sum / totalWeight);
};

/**
 * Optimal K selection based on dataset size
 */
const getOptimalK = (datasetSize) => {
	if (datasetSize < 100) return 3;
	if (datasetSize < 500) return 5;
	if (datasetSize < 1000) return 7;
	return 9;
};

/**
 * Weighted KNN prediction (Regression for continuous variables)
 */
const weightedKNNPredict = (target, trainingSet, k = null) => {
	if (trainingSet.length === 0) return { prediction: '3', confidence: 0.5, neighborsCount: 0 };

	const optimalK = k || getOptimalK(trainingSet.length);

	// Calculate distances
	const distances = trainingSet.map(point => ({
		label: point.fitness_level,
		distance: calculateWeightedDistance(target, point)
	}));

	// Sort by distance
	distances.sort((a, b) => a.distance - b.distance);

	// Get K nearest neighbors
	const neighbors = distances.slice(0, optimalK);

	let sumVals = 0;
	let totalWeight = 0;

	neighbors.forEach(neighbor => {
		const weight = 1 / (neighbor.distance + 0.0001);
		sumVals += parseFloat(neighbor.label || 0) * weight;
		totalWeight += weight;
	});

	const prediction = (sumVals / totalWeight).toFixed(1);
    
	// Confidence based on distance (closer = higher confidence)
	const avgDistance = neighbors.reduce((s, n) => s + n.distance, 0) / optimalK;
	const confidence = Math.max(0.40, Math.min(0.99, 1 - (avgDistance / 5)));

	return { prediction, confidence, neighborsCount: optimalK };
};

/**
 * Initialize or refresh the model
 */
const initializeModel = async (query, forceRefresh = false) => {
	const now = new Date();

	if (!forceRefresh && modelCache.isInitialized && modelCache.lastUpdated) {
		const hoursSinceUpdate = (now - modelCache.lastUpdated) / (1000 * 60 * 60);
		if (hoursSinceUpdate < 24) {
			console.log('✅ Using cached model (fresh)');
			return modelCache;
		}
	}

	console.log('🔄 Initializing ML model...');

	// Load balanced training data
	const trainingData = await loadBalancedTrainingData(query, 500);

	if (trainingData.length < 50) {
		throw new Error('Insufficient training data. Need at least 50 samples.');
	}

	// Normalize data
	const { normalized, stats } = robustNormalize(trainingData);

	// Update cache by mutating the exported object
	Object.assign(modelCache, {
		isInitialized: true,
		trainingData: normalized,
		stats: stats,
		lastUpdated: now,
		totalSamples: trainingData.length
	});

	console.log(`✅ Model initialized with ${modelCache.totalSamples} samples`);
	console.log(`📊 Optimal K: ${getOptimalK(modelCache.totalSamples)}`);

	return modelCache;
};

/**
 * Normalize a single target using cached stats
 */
const normalizeTarget = (target, stats) => {
	const normalized = {};

	FEATURES.forEach(f => {
		const val = parseFloat(target[f] || 0);
		const normalizedVal = (val - stats[f].median) / (stats[f].iqr * 0.75);
		normalized[`norm_${f}`] = Math.max(-3, Math.min(3, normalizedVal));
	});

	return normalized;
};

/**
 * Validate input data before prediction
 */
const validateInput = (data) => {
	const errors = [];

	// Required fields
	const required = ['age', 'gender', 'height_cm', 'weight_kg', 'daily_steps', 'avg_heart_rate'];
	for (const field of required) {
		if (!data[field] && data[field] !== 0) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	// Range checks
	if (data.age && (data.age < 15 || data.age > 100)) {
		errors.push('Age must be between 15 and 100');
	}
	if (data.height_cm && (data.height_cm < 100 || data.height_cm > 250)) {
		errors.push('Height must be between 100cm and 250cm');
	}
	if (data.weight_kg && (data.weight_kg < 30 || data.weight_kg > 200)) {
		errors.push('Weight must be between 30kg and 200kg');
	}
	if (data.daily_steps && data.daily_steps > 50000) {
		errors.push('Daily steps seem unrealistic (>50000)');
	}
	if (data.avg_heart_rate && (data.avg_heart_rate < 40 || data.avg_heart_rate > 200)) {
		errors.push('Heart rate out of normal range');
	}

	return errors;
};

/**
 * Calculate BMI if not provided
 */
const calculateBMI = (heightCm, weightKg) => {
	if (!heightCm || !weightKg) return null;
	const heightM = heightCm / 100;
	return weightKg / (heightM * heightM);
};

module.exports = {
	initializeModel,
	normalizeTarget,
	weightedKNNPredict,
	validateInput,
	calculateBMI,
	FEATURES,
	FEATURE_WEIGHTS,
	modelCache
};