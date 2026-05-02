# AthleteML — Clustering Engine

A full-stack web application that clusters athletes by physical characteristics using K-Means and Hierarchical (Agglomerative) clustering algorithms, with interactive visualizations and KNN-based prediction.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS v4, Redux Toolkit, Recharts |
| Backend | Node.js, Express.js, Nodemon |
| Database | PostgreSQL |
| ML Algorithms | K-Means (K-Means++), Hierarchical (Ward linkage), KNN |

---

## Project Structure

```
athlete-clustering/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── routes/index.js        # All API routes
│   ├── controllers/
│   │   ├── uploadController.js    # CSV upload handling
│   │   ├── trainingController.js  # ML training orchestration
│   │   ├── athleteController.js   # CRUD + cluster data
│   │   └── predictionController.js # KNN prediction
│   ├── ml/
│   │   ├── kmeans.js          # K-Means++ clustering algorithm
│   │   ├── hierarchical.js    # Agglomerative clustering + dendrogram
│   │   └── knn.js             # K-Nearest Neighbors classifier
│   ├── utils/
│   │   └── csvParser.js       # CSV parsing & validation
│   ├── db/
│   │   ├── index.js           # PostgreSQL connection pool + init
│   │   └── schema.sql         # SQL schema reference
│   ├── uploads/               # Temporary CSV upload storage
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.jsx        # Navigation sidebar
    │   │   ├── Notification.jsx   # Toast notifications
    │   │   ├── Card.jsx           # Reusable card container
    │   │   └── Badge.jsx          # Cluster color badges
    │   ├── pages/
    │   │   ├── Dashboard.jsx      # Upload + Train
    │   │   ├── Athletes.jsx       # Data table
    │   │   ├── Visualization.jsx  # Charts + Dendrogram
    │   │   └── Prediction.jsx     # KNN prediction form
    │   ├── redux/
    │   │   ├── store.js
    │   │   ├── athletesSlice.js
    │   │   ├── clustersSlice.js
    │   │   └── uiSlice.js
    │   ├── services/api.js        # Axios API client
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    └── package.json
```

---

## Setup Instructions

### 1. Prerequisites

- Node.js >= 18
- PostgreSQL >= 13

### 2. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE athlete_clustering;"
```

### 3. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your PostgreSQL credentials

npm run dev   # Starts on http://localhost:5000
```

The server automatically creates all tables on startup.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev   # Starts on http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-csv` | Upload CSV file (multipart/form-data, field: `file`) |
| `GET`  | `/api/uploads` | List all uploads |
| `GET`  | `/api/sample-csv` | Download sample CSV |
| `POST` | `/api/train` | Run K-Means + Hierarchical clustering |
| `GET`  | `/api/training-history` | Get past training results |
| `GET`  | `/api/athletes` | List athletes (supports `?trained=true&page=1`) |
| `DELETE` | `/api/athletes/:id` | Delete an athlete |
| `DELETE` | `/api/athletes/reset` | Clear all data |
| `GET`  | `/api/clusters` | Get cluster assignments + stats |
| `POST` | `/api/predict` | Predict cluster for new athlete |
| `GET`  | `/api/health` | Health check |

### Predict Request Body
```json
{
  "name": "Ali Hassan",
  "height": 180,
  "weight": 75,
  "muscle_mass": 40,
  "run_time": 12.5
}
```

### Train Response
```json
{
  "success": true,
  "results": {
    "kmeans": { "clusters": [...], "score": 0.412, "inertia": 2.34, "k": 3 },
    "hierarchical": { "clusters": [...], "score": 0.389, "k": 3, "dendrogram": {...} },
    "comparison": { "winner": "kmeans", "kmeansScore": 0.412, "hierarchicalScore": 0.389 }
  }
}
```

---

## CSV Format

```csv
name,height,weight,muscle_mass,run_time
Ali Hassan,180,75,40,12.5
Vali Karimov,175,70,38,13.2
Sara Yusupova,165,58,35,14.1
```

Field validation:
- `height`: 100–250 cm
- `weight`: 30–200 kg  
- `muscle_mass`: 5–70 %
- `run_time`: 5–60 seconds (100m sprint)

---

## ML Algorithms

### K-Means (K-Means++)
- Smarter centroid initialization via K-Means++ (reduces bad starts)
- Multiple restarts (10 runs), picks lowest inertia
- Auto-selects optimal k using elbow method
- Evaluated via **Silhouette Score**

### Hierarchical Agglomerative (Ward Linkage)
- Bottom-up: each athlete starts as their own cluster
- Merges closest pair using Ward's method (minimizes variance increase)
- Produces full dendrogram tree
- Same k as K-Means for fair comparison

### KNN Predictor
- Weighted KNN (closer neighbors get higher vote weight)
- Normalizes features using training data min/max
- Works with both algorithm outputs
- Returns top-3 nearest neighbors with distances

### Evaluation Metric — Silhouette Score
```
s(i) = (b(i) - a(i)) / max(a(i), b(i))

a(i) = mean distance to same-cluster members
b(i) = mean distance to nearest other cluster
Range: -1 (worst) to 1 (best)
```

---

## Features

- 📂 **CSV Upload** — Drag & drop or click to upload, with validation errors shown per row
- 🧠 **Train Model** — One-click training of both algorithms simultaneously
- 📊 **Scatter Plot** — Height vs Weight colored by cluster assignment
- 🌳 **Dendrogram** — Canvas-rendered hierarchical merge tree
- ⚡ **Algorithm Comparison** — Side-by-side silhouette scores with bar chart
- 🎯 **Prediction** — Enter new athlete stats and get KNN-predicted cluster from both algorithms
- 🗂 **Athletes Table** — Sortable, searchable table with cluster badges
- 🔔 **Notifications** — Toast system for success/error feedback

---

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=athlete_clustering
DB_USER=postgres
DB_PASSWORD=your_password
PORT=5000
FRONTEND_URL=http://localhost:5173
```
