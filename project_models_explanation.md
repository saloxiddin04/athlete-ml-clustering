# Athlete Fitness Analytics: AI Modellar va Ularning Ishlash Printsipi

## 1. Loyihaning Yangilangan G'oyasi

**Athlete Fitness Analytics** platformasi sportchilarning sog'liq va mashg'ulot ma'lumotlarini chuqur tahlil qilib, **qancha kaloriya yo'qotishini bashorat qilish**, ularga o'xshash sportchilarni ko'rsatish va faoliyat tavsiyasi berish uchun mo'ljallangan.

### Yangiliklar (So'nggi versiya)
- ✅ Prediction sahifasida faqat **Regression + Smart Recommendation** (birlashtirilgan)
- ✅ **Classification** va **Health Risk & Anomaly** tablari olib tashlandi (backend da mavjud, lekin UI dan chiqarildi)
- ✅ Normalizatsiya: har ustun uchun alohida **Min-Max [0,1]** scaling
- ✅ KNN: o'xshash 3 sportchi — **activity_type bir xil** bo'lishi shart
- ✅ Faqat **calories_burned** bashorat qilinadi (bmi, fitness_level chiqarib tashlandi)

---

## 2. Loyihada Ishlatilgan Modellar

### A. Multi-Target Regression → Calories Burned Predictor

**Joylashuvi:** `backend/ml/regression.js` + `backend/controllers/regressionController.js`

**Ishlash printsipi:**

1. **Normalizatsiya (Min-Max, har ustun alohida):**
   ```
   x_norm = (x - x_min) / (x_max - x_min)   →  [0, 1]
   ```
   Bu har bir feature va target (`calories_burned`) uchun alohida bajariladi.

2. **3 ta model o'qitiladi:**
   - `Linear Regression` — Gradient Descent: og'irliklarni bosqichma-bosqich moslashtiradi
   - `Random Forest` — 10 ta bootstrap daraxt: har biri turli namuna bilan o'qitiladi, natijalar o'rtalanadi
   - `Gradient Boosting` — Qoldiqlarni kamaytiruvchi 15 ta daraxt: har iteratsiyada xatoni to'g'rilaydi

3. **Bashorat:**
   - Kiritilgan qiymatlar normalizatsiya qilinadi
   - Tanlangan model (RF, GBM yoki Linear) normalizatsiya qilingan qiymat qaytaradi
   - Natija denormalizatsiya qilinib, asl masshtabga (kcal) qaytariladi

4. **Metrikalar:**
   - `RMSE` — O'rtacha kvadrat xato (past bo'lsa yaxshi)
   - `R²` — Model qanchalik yaxshi tushuntiradi (1 ga yaqin bo'lsa yaxshi)

---

### B. KNN — O'xshash 3 Sportchini Topish (Yangi)

**Joylashuvi:** `backend/ml/regression.js` → `findSimilarAthletes()`

**Muhim shart:** `activity_type` bir xil bo'lishi kerak.

**Ishlash printsipi:**
1. Bazadan faqat bir xil `activity_type` li sportchilar olinadi
2. Ularning feature vektorlari Min-Max bilan normalizatsiya qilinadi
3. Evklid masofasi: `d = √Σ(xᵢ - yᵢ)²`
4. Eng yaqin 3 ta sportchi qaytariladi

**Qaytariladigan ma'lumotlar:**
- Faoliyat turi, davomiylik (daqiqa), kaloriya (kcal), masofa (d)

---

### C. KNN Activity Recommender — Aqlli Faoliyat Tavsiyasi (Birlashtirilgan)

**Joylashuvi:** `backend/ml/activityRecommender.js`  
Endi `regressionController.js` ichida chaqiriladi (alohida `/recommend` endpointi emas).

**Normalizatsiya:** Z-score (μ, σ) — faoliyat tavsiyasi uchun

**Ishlash printsipi:**
1. 9 ta eng yaqin qo'shni topiladi
2. Ko'pchilik ovozi (majority vote) bilan `activity_type` aniqlanadi
3. Intensivlik va davomiylik o'rtacha hisoblanadi
4. Sog'lik holati asosida intensivlik korektsiya qilinadi

---

### D. K-Means va Hierarchical Clustering

**Joylashuvi:** `backend/ml/kmeans.js`, `backend/ml/hierarchical.js`

**Maqsad:** Sportchilarni jismoniy ko'rsatkichlari bo'yicha guruhlarga ajratish.

**Normalizatsiya:** Min-Max [0,1] klasterlash uchun.

**Ishlash tartibi:**
- *K-Means:* K ta sentroid bilan boshlanib, takroriy masofani minimizatsiya qiladi
- *Hierarchical:* Sngl-linkage agglomerative — pastdan yuqoriga dendrogramma

---

### E. PCA & t-SNE — Vizualizatsiya

**Joylashuvi:** `backend/ml/pca.js`, `backend/ml/tsne.js`

**Maqsad:** 15+ ustunli ma'lumotni 2D grafikda ko'rsatish uchun o'lchamlarni qisqartirish.

- **PCA:** Ko'rinmas komponentlar (dispersiya maksimizatsiya)
- **t-SNE:** Lokal o'xshashliklarni 2D da saqlash

---

## 3. Birlashtirilgan Prediction Oqimi

```
POST /api/regression/predict
         ↓
1. regressionModel mavjud bo'lmasa → auto-train (3000 yozuv)
2. predictCalories()  → calories_burned (kcal)
3. findSimilarAthletes() → 3 ta KNN qo'shni (bir xil activity_type)
4. recommend()  → faoliyat tavsiyasi (intensity, duration, health_tip)
         ↓
JSON {
  predicted_calories,
  similar_athletes: [{activity_type, duration_minutes, calories_burned, distance}],
  recommendation: {activity_type, intensity, duration_minutes, health_tip, confidence}
}
```

---

## 4. Normalizatsiya Strategiyasi

| Model | Usul | Sabab |
|-------|------|-------|
| Regression (features) | Min-Max [0,1] | Gradient descent uchun bir xil miqyos |
| Regression (target) | Min-Max [0,1] | Prognoz qiymatini qaytarishda denormalizatsiya osonroq |
| KNN o'xshash sportchi | Min-Max [0,1] | Regression bilan bir xil stats ishlatiladi |
| Activity Recommender | Z-score | Turli turdagi kategorik + sonli featurelar |
| Clustering | Min-Max [0,1] | Masofaga asoslangan klasterlash uchun |

---

## 5. Keraksiz/Faol bo'lmagan Funksiyalar (Kommentga olingan)

- `backend/ml/regression.js` — Eski Z-score normalise() — kommentga olingan
- `backend/controllers/predictionController.js` → 1-65 qatorlar — eski oddiy KNN classifier
- `TARGETS` (bmi, fitness_level) — regression.js dan olib tashlandi
