/**
 * Main router - aggregates all route modules
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Import controllers
const { uploadCSV, getUploads, getSampleCSV } = require('../controllers/uploadController');
const { trainModels, getTrainingHistory } = require('../controllers/trainingController');
const { getAthletes, getClusters, getStats, deleteAthlete, resetAthletes, getAnalytics } = require('../controllers/athleteController');
const { register, login, getMe } = require('../controllers/authController');
const { getUsers, updateUserRole, deleteUser } = require('../controllers/userController');

// Import middleware
const { protect, authorize } = require('../utils/authMiddleware');

// Configure Multer for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `athletes-${uniqueSuffix}.csv`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// ===== Auth Routes =====
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', protect, getMe);

// ===== User Management (Admin Only) =====
router.get('/users', protect, authorize('admin'), getUsers);
router.put('/users/:id/role', protect, authorize('admin'), updateUserRole);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

// ===== Upload Routes (Admin Only) =====
router.post('/upload-csv', protect, authorize('admin'), upload.single('file'), uploadCSV);
router.get('/uploads', protect, getUploads);
router.get('/sample-csv', getSampleCSV);

// ===== Training Routes (Admin Only) =====
router.post('/train', protect, authorize('admin'), trainModels);
router.get('/training-history', protect, getTrainingHistory);

// ===== Athlete Routes (All authenticated) =====
router.get('/athletes', protect, getAthletes);
router.get('/athletes/stats', protect, getStats);
router.delete('/athletes/reset', protect, authorize('admin'), resetAthletes);
router.delete('/athletes/:id', protect, authorize('admin'), deleteAthlete);

// ===== Cluster Routes (All authenticated) =====
router.get('/clusters', protect, getClusters);

// ===== Analytics Routes =====
router.get('/analytics', protect, getAnalytics);

// ===== Prediction & Regression Routes (All authenticated) =====
const { trainRegression, predictReg, getMetrics } = require('../controllers/regressionController');

router.post('/predict', protect, predictReg); // Point legacy /predict to consolidated regression
router.post('/regression/train',   protect, authorize('admin'), trainRegression);
router.post('/regression/predict', protect, predictReg);
router.get('/regression/metrics',  protect, getMetrics);

// ===== Smart Insights & Model Comparison =====
const { getSmartInsights, getModelComparison } = require('../controllers/insightsTextController');
router.get('/insights/smart',   protect, getSmartInsights);
router.get('/insights/compare', protect, getModelComparison);

// ===== Health Check =====
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
