# Sportchilarning Fitnes Tahlili va AI Bashoratlash Tizimi (Technical Documentation)

Ushbu hujjat "Athlete Fitness Analytics" loyihasining texnik arxitekturasi, ishlatilgan Machine Learning modellari va tizimning ishlash prinsiplarini to'liq tavsiflaydi.

---

## 1. Umumiy ma'lumotlar
**Loyiha nomi:** Athlete Clustering & Fitness Analytics  
**Texnologik stek:**
- **Frontend:** React.js, Redux Toolkit, Recharts (vizualizatsiya uchun).
- **Backend:** Python 3.11, FastAPI (yuqori tezlikdagi API).
- **Ma'lumotlar bazasi:** PostgreSQL (SQLAlchemy AsyncPG orqali).
- **Machine Learning:** Scikit-learn, Pandas, Numpy.

---

## 2. AT vazifasi va yaratish maqsadlari
**Vazifasi:** Sportchilarning biometrik va mashg'ulot ma'lumotlarini tahlil qilish, ularni guruhlarga ajratish va kelajakdagi natijalarni bashorat qilish.

**Maqsadlari:**
- Sportchilarning mashg'ulot davomida sarf etadigan energiyasini (kcal) aniq bashorat qilish.
*   Sportchilarni jismoniy holati va chidamliligiga qarab avtomatik klasterlash.
*   Foydalanuvchilarga ularning biometrik ko'rsatkichlariga mos keladigan eng maqbul faoliyat turini tavsiya etish.
*   Katta hajmdagi ma'lumotlarni (CSV) tezkor qayta ishlash va vizual tahlil qilish.

---

## 3. AT obyektining xarakteristikalari
Tizim quyidagi asosiy obyektlar bilan ishlaydi:
- **Biometrik ma'lumotlar:** Yosh, jins, bo'y, vazn, BMI.
- **Fiziologik ko'rsatkichlar:** O'rtacha va tinch yurak urishi, qon bosimi (sistolik/diastolik), uyqu soatlari, stress darajasi.
- **Mashg'ulot ko'rsatkichlari:** Faoliyat turi, davomiyligi, intensivligi, kunlik qadamlar.
- **Natijaviy ma'lumotlar:** Sarflangan kaloriya (kcal), klaster ID, o'xshashlik foizi.

---

## 4. AT ga qo'yiladigan talablar
- **Aniqlik (Accuracy):** Regressiya modellari uchun R² ko'rsatkichi 0.85 dan yuqori bo'lishi.
- **Tezkorlik:** CSV yuklash va minglab qatorlarni qayta ishlash 2 soniyadan oshmasligi.
- **Chidamlilik:** Ma'lumotlardagi bo'sh kataklar (NaN) yoki noto'g'ri formatlar tizimni to'xtatib qo'ymasligi (Robust Preprocessing).
- **Modullilik:** ML modellarini istalgan vaqtda qayta o'qitish va `.pkl` formatida saqlash imkoniyati.

---

## 5. Loyiha strukturasi
```text
athlete-clustering/
├── backend/                # Python FastAPI Backend
│   ├── app/
│   │   ├── api/            # API Routerlar
│   │   ├── db/             # MB ulanishi va sessiyalar
│   │   ├── services/       # Biznes mantiq va ML
│   │   │   └── ml/         # ML modellar va preprocessor
│   │   └── main.py         # Asosiy kirish nuqtasi
│   ├── db/                 # SQL sxemalar
│   └── models/             # Saqlangan .pkl modellar
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # UI komponentlar
│   │   ├── pages/          # Sahifalar (Dashboard, Prediction, Visualization)
│   │   └── redux/          # State management
└── data/                   # Namuna CSV fayllar
```

---

## 6. Ishlatilgan Machine Learning modellari va ishlash prinsiplari

### A. Kaloriya bashorati (Regression)
**Modellar:** `Random Forest Regressor` va `Gradient Boosting Regressor (GBM)`.
- **Ishlash prinsipi:** Ko'p sonli qarorlar daraxtlari (Decision Trees) ansambli orqali ishlaydi. 
- **Ketma-ketlik:** 
  1. Ma'lumotlar `MinMaxScaler` orqali [0, 1] oraliqqa keltiriladi.
  2. Model eng yaxshi natija beruvchi parametrlarni (`n_estimators=200`) tanlaydi.
  3. Bashorat qilingan qiymat haqiqiy o'lchov birligida (kcal) qaytariladi.

### B. O'lchamlarni qisqartirish (Dimensionality Reduction)
**Model:** `PCA (Principal Component Analysis)`.
- **Ishlash prinsipi:** 20 dan ortiq ustunlarni vizualizatsiya uchun 2 ta (X, Y) koordinataga qisqartiradi, bunda ma'lumotlarning 95% variatsiyasi saqlab qolinadi.

### C. O'xshashlik va Tavsiya (Similarity & Recommendation)
**Model:** `KNN (K-Nearest Neighbors)` gibrid usuli bilan.
- **Ishlash prinsipi:** 
  1. Yangi foydalanuvchi ma'lumotlari bazadagi minglab sportchilar bilan solishtiriladi.
  2. **Gaussian Kernel** va **Cosine Similarity** yordamida o'xshashlik foizi (65-98%) hisoblanadi.
  3. Eng yaqin 15 ta qo'shnining (neighbors) tajribasidan kelib chiqib, foydalanuvchiga eng mos faoliyat turi tavsiya etiladi.

---

## 7. Ma'lumotlarni qayta ishlash oqimi (Data Flow)
1. **Ingestion:** CSV yuklanadi yoki qo'lda ma'lumot kiritiladi.
2. **Standardization:** Ustunlar nomlari va ma'lumot turlari bazaga moslanadi.
3. **Imputation:** Bo'sh kataklar o'rtacha qiymatlar bilan to'ldiriladi.
4. **Training:** Modellar o'qitiladi va `backend/models/` papkasiga `.pkl` formatida saqlanadi.
5. **Inference:** Foydalanuvchi interfeysda natijalarni va vizual grafikani ko'radi.
