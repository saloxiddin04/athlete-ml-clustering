# Athlete Analytics — Sportchilar Faoliyatini Tahlil Qilish va Bashorat Qilish Platformasi

Ushbu hujjat loyihaning **yangilangan** to'liq g'oyasi, texnik talablar va AI modellarining ish prinsipi haqida batafsil ma'lumot beradi.

---

## 1. Loyiha Haqida Umumiy Ma'lumot

**Athlete Analytics** — katta hajmdagi sport va salomatlik ma'lumotlarini (Big Data) boshqarish, ularni klasterlash va sportchining **kelajakda qancha kaloriya yo'qotishini bashorat qilish** hamda unga eng mos faoliyat turini tavsiya qilish uchun mo'ljallangan Full-stack AI platformasi.

---

## 2. Loyihaning Asosiy Maqsadlari

| # | Maqsad | Texnologiya |
|---|--------|-------------|
| 1 | CSV formatidagi millionlab ma'lumotlarni yuklash | Node.js Streams, PostgreSQL |
| 2 | Sportchilarni guruhlarga ajratish (Clustering) | K-Means, Hierarchical |
| 3 | Ko'p o'lchamli ma'lumotlarni 2D vizuallashtirish | PCA, t-SNE |
| 4 | **Kaloriya sarfini bashorat qilish** | Multi-target Regression (RF/GBM/Linear) |
| 5 | **O'xshash 3 sportchini ko'rsatish (KNN)** | KNN (activity_type bir xil shart) |
| 6 | **Aqlli faoliyat tavsiya qilish** | KNN Activity Recommender |
| 7 | Xavfsiz kirish va rollar boshqaruvi | JWT, RBAC |

---

## 3. Yangilangan Prediction Sahifasi

### 3.1 Olib Tashlangan Funksiyalar
- ❌ **Classification (Fitness Level)** tab — predictionController.js da alohida saqlanadi, lekin Prediction sahifasidan olib tashlandi
- ❌ **Health Risk & Anomaly** tab — insightsController.js da saqlanadi, lekin Prediction sahifasidan olib tashlandi

### 3.2 Birlashtirilgan: Regression + Smart Recommendation

Prediction sahifasida endi **bitta yagona oqim** mavjud:

```
Foydalanuvchi ma'lumot kiritadi
         ↓
Regression modeli calories_burned ni bashorat qiladi
         ↓
KNN: bir xil activity_type bilan eng yaqin 3 sportchi topiladi
         ↓
Smart Recommendation: eng mos faoliyat, intensivlik, davomiylik tavsiya qilinadi
```

---

## 4. AI Modellari — Yangilangan Arxitektura

### A. Multi-Target Regression → Calories Burned Predictor

**Joylashuvi:** `backend/ml/regression.js` + `backend/controllers/regressionController.js`

**Maqsad:** Foydalanuvchining 11 ta parametri asosida u qancha kaloriya yo'qotishini bashorat qilish.

**Normalizatsiya (Yangi):**
```
Har bir ustun uchun alohida Min-Max Scaling [0, 1]:
  x_norm = (x - x_min) / (x_max - x_min)

Ustunlar:
  age, height_cm, weight_kg, duration_minutes,
  avg_heart_rate, daily_steps, sleep_hours, stress_level,
  endurance_level, hydration_level, resting_heart_rate
  → calories_burned (target ham normalizatsiya qilinadi)
```

**3 ta model parallel o'qitiladi:**
- `Linear Regression` — Gradient Descent (500 iteratsiya, lr=0.05)
- `Random Forest` — 10 ta bootstrap tree (default, eng aniq)
- `Gradient Boosting` — 15 ta iteratsiya, lr=0.1

**Metrikalar:** RMSE (kcal) va R² (0-1) — har model uchun alohida hisoblanadi.

---

### B. KNN — O'xshash 3 Sportchini Topish

**Joylashuvi:** `backend/ml/regression.js` → `findSimilarAthletes()`

**Muhim shart:** `activity_type` kiritilgan sportchi bilan bir xil bo'lishi kerak.

**Ishlash tartibi:**
1. Bazadan faqat bir xil `activity_type` li sportchilar olinadi
2. Har bir sportchi Min-Max normalizatsiya bilan vektorga aylantiriladi
3. Evklid masofasi hisoblanadi: `d = √Σ(x_i - y_i)²`
4. Eng kichik masofali 3 ta sportchi qaytariladi

**Qaytariladigan ma'lumotlar:** faoliyat turi, davomiylik, kaloriya, masofa (d)

---

### C. KNN Activity Recommender — Aqlli Tavsiya

**Joylashuvi:** `backend/ml/activityRecommender.js` + `backend/controllers/regressionController.js` (birlashtirilgan)

**Normalizatsiya:** Z-score (μ=0, σ=1) — faoliyat tavsiyasi uchun

**Feature-lar:** `age, bmi, stress_level, sleep_hours, avg_heart_rate, endurance_level` + kategorik kodlash

**Ishlash tartibi:**
1. 9 ta eng yaqin qo'shni topiladi
2. Ko'pchilik ovozi bilan `activity_type` va `intensity` aniqlanadi
3. `duration_minutes` — qo'shnilar o'rtachasidan hisoblanadi
4. Sog'lik holatiga qarab intensivlik korektsiya qilinadi (masalan, yurak kasalligi → low)

**Tavsiya natijasi:** activity_type, intensity, duration_minutes, health_tip, confidence (%)

---

### D. K-Means va Hierarchical Clustering

**Joylashuvi:** `backend/ml/kmeans.js`, `backend/ml/hierarchical.js`

**Maqsad:** Sportchilarni o'xshash guruhlarga ajratish (Dashboard, Visualization uchun)

**Normalizatsiya:** Min-Max [0,1] klasterlash uchun

---

### E. PCA & t-SNE — Vizualizatsiya

**Joylashuvi:** `backend/ml/pca.js`, `backend/ml/tsne.js`

**Maqsad:** 15+ o'lchamli ma'lumotni 2D ga siqib, scatter-plot chizish

---

## 5. Texnik Arxitektura

```
Frontend (React + Redux)
  └── Prediction.jsx
        ├── Forma: 20 ta parametr
        ├── Model tanlash: RF / GBM / Linear
        └── Natija paneli:
              ├── 🔥 Bashorat qilingan kaloriya (kcal)
              ├── 💡 Smart Recommendation (faoliyat + intensivlik + davomiylik)
              └── 👥 O'xshash 3 sportchi (activity_type bir xil · KNN masofa)

Backend (Node.js + Express)
  └── POST /api/regression/predict
        ├── regressionController.predictReg()
        │     ├── predictCalories() — ML regression
        │     ├── findSimilarAthletes() — KNN (same activity_type)
        │     └── recommend() — KNN activity recommender
        └── GET /api/regression/metrics → metrikalar
```

---

## 6. Ma'lumotlar Oqimi (Data Flow)

```
CSV Upload → PostgreSQL (participants jadval, trained=true)
     ↓
POST /regression/train
  → 5,000 ta yozuv olinadi
  → Har ustun uchun Min-Max stats hisoblanadi
  → Linear / RF / GBM modellari o'qitiladi
  → Metrics (RMSE, R²) saqlanadi
     ↓
POST /regression/predict
  → Kiritilgan ma'lumotlar normalizatsiya qilinadi
  → predictCalories() → calories_burned bashorat
  → findSimilarAthletes() → 3 ta o'xshash sportchi (KNN)
  → recommend() → faoliyat tavsiyasi
  → JSON javob qaytariladi
```

---

## 7. Texnik Texnologiyalar To'plami

| Qatlam | Texnologiya |
|--------|-------------|
| **Frontend** | React.js, Redux Toolkit, Vanilla CSS, Recharts |
| **Backend** | Node.js, Express.js, JWT Auth |
| **Ma'lumotlar Bazasi** | PostgreSQL |
| **ML Algoritmlar** | Custom JS: Linear Reg, Random Forest, GBM, KNN, K-Means, PCA, t-SNE |
| **Normalizatsiya** | Per-column Min-Max [0,1] (Regression) · Z-score (Recommender) |
| **Arxitektura** | MVC (Model-View-Controller) |

---

## 8. Kelajakdagi Rivojlanish Rejalari

1. **Real-time Integration:** Aqlli soatlardan ma'lumot olish
2. **Deep Learning:** Neyron tarmoqlari yordamida jarohat prognozi
3. **Model Persistence:** Modellarni diskka saqlash (restart bo'lganda yo'qolmasin)
4. **Feature Importance:** Qaysi parametr kaloriyaga ko'proq ta'sir qilishini ko'rsatish
