# Sportchilarning Fitnes Tahlili va AI Bashoratlash Tizimi 🏃‍♂️🏋️‍♀️

Ushbu loyiha sportchilarning biometrik va jismoniy ko'rsatkichlarini tahlil qilish, ularni klasterlarga ajratish hamda sun'iy intellekt yordamida natijalarni bashorat qilish uchun mo'ljallangan kompleks tizimdir.

## 🚀 Loyiha Haqida Umumiy Ma'lumot

"Athlete Fitness Analytics" tizimi sportchilar va murabbiylarga ma'lumotlarga asoslangan qarorlar qabul qilishda yordam beradi. Tizim nafaqat o'tmishdagi ma'lumotlarni tahlil qiladi, balki kelajakdagi natijalarni (masalan, sarflanadigan kaloriya) bashorat qiladi va foydalanuvchining jismoniy holatiga mos mashg'ulotlarni tavsiya etadi.

### Asosiy Imkoniyatlar:
- **Ma'lumotlarni CSV orqali yuklash:** Minglab sportchilar ma'lumotlarini bir zumda tahlil qilish.
- **Real-vaqtda Bashoratlash:** Kaloriya sarfini yuqori aniqlikda hisoblash.
- **Intellektual Tavsiyalar:** Foydalanuvchining ko'rsatkichlariga qarab optimal faoliyat turini tanlash.
- **Interaktiv Vizualizatsiya:** Sportchilarni PCA va K-Means algoritmlari orqali klasterlangan holda 2D grafikda ko'rish.
- **Analitika Dashboard:** Jamoa yoki guruhning umumiy salomatlik ko'rsatkichlarini kuzatish.

---

## 🧠 Ishlatilgan Algoritmlar va Texnologiyalar

Loyiha eng zamonaviy Machine Learning (ML) algoritmlariga asoslangan:

### 1. Bashoratlash (Regression)
*   **Algoritmlar:** `Random Forest Regressor` va `Gradient Boosting Regressor (GBM)`.
*   **Vazifasi:** Sportchining biometrik ma'lumotlari va mashg'ulot davomiyligiga qarab sarflanadigan kaloriyani (`calories_burned`) bashorat qilish.
*   **Aniqlik:** R² ko'rsatkichi > 0.85 (85%+ aniqlik).

### 2. Klasterlash va Vizualizatsiya
*   **PCA (Principal Component Analysis):** 20 dan ortiq ko'rsatkichlarni (o'lchamlarni) vizual ko'rish uchun 2 ta asosiy komponentga (X, Y koordinata) qisqartiradi.
*   **K-Means:** Sportchilarni jismoniy holati, chidamliligi va boshqa ko'rsatkichlariga ko'ra avtomatik ravishda guruhlarga (klasterlarga) ajratadi.

### 3. O'xshashlik va Tavsiya Tizimi (Recommendation)
*   **KNN (K-Nearest Neighbors):** Yangi foydalanuvchini bazadagi mavjud "o'xshash" sportchilar bilan solishtiradi.
*   **Vazifasi:** Eng yaqin 15 ta qo'shnining tajribasidan kelib chiqib, foydalanuvchi uchun eng samarali mashg'ulot turini tavsiya etadi.

---

## 🔑 Bashoratlash uchun ishlatiladigan Kalitlar (Features)

Tizim quyidagi 19 ta asosiy parametr asosida tahlil o'tkazadi:

| № | Kalit (Feature) | Tavsif |
|---|---|---|
| 1 | `age` | Foydalanuvchining yoshi |
| 2 | `gender` | Jinsi (Male, Female, Other) |
| 3 | `height_cm` | Bo'yi (sm) |
| 4 | `weight_kg` | Vazni (kg) |
| 5 | `bmi` | Tana vazni indeksi (tizim tomonidan qayta hisoblanadi) |
| 6 | `activity_type` | Mashg'ulot turi (yugurish, suzish va h.k.) |
| 7 | `duration_minutes` | Mashg'ulot davomiyligi (daqiqada) |
| 8 | `intensity` | Mashg'ulot shiddati (Low, Medium, High) |
| 9 | `daily_steps` | Kunlik qadamlar soni |
| 10 | `avg_heart_rate` | O'rtacha yurak urishi |
| 11 | `resting_heart_rate` | Tinch holatdagi yurak urishi |
| 12 | `systolic_bp` | Sistolik qon bosimi |
| 13 | `diastolic_bp` | Diastolik qon bosimi |
| 14 | `endurance_level` | Chidamlilik darajasi (1-10) |
| 15 | `sleep_hours` | Kunlik uyqu vaqti |
| 16 | `stress_level` | Stress darajasi |
| 17 | `hydration_level` | Suv ichish darajasi |
| 18 | `smoke_status` | Chekish holati |
| 19 | `health_condition` | Umumiy sog'liq holati |

---

## 🛠 Texnik Arxitektura (Tech Stack)

- **Backend:** Python 3.11, FastAPI, SQLAlchemy (Asinxron), Scikit-learn, Pandas.
- **Frontend:** React.js (Vite), Redux Toolkit, TailwindCSS, Recharts.
- **Ma'lumotlar bazasi:** PostgreSQL.
- **Modelni saqlash:** Joblib (.pkl format).

---

## ❓ Ko'p Beriladigan Savollarga Javoblar

**1. Model qanchalik aniq ishlaydi?**
Tizimda bir nechta modellar (Random Forest va GBM) o'qitiladi va eng yuqori natija (R² Score) bergani avtomatik tanlanadi. Hozirgi ko'rsatkichlar 85% dan 95% gacha aniqlikni ko'rsatmoqda.

**2. Ma'lumotlar qayerda saqlanadi?**
Barcha sportchilar ma'lumotlari PostgreSQL bazasida saqlanadi. O'qitilgan ML modellari esa `backend/models/` papkasida `.pkl` fayllar ko'rinishida saqlanadi.

**3. Yangi ma'lumot qo'shilsa modelni qayta o'qitish kerakmi?**
Ha, dashboard orqali "Train Models" tugmasini bosish orqali bazadagi eng so'nggi ma'lumotlar asosida modellarni yangilash mumkin.

**4. Tavsiya tizimi qanday ishlaydi?**
KNN algoritmi yordamida sizga o'xshash biometrik ko'rsatkichlarga ega bo'lgan boshqa sportchilarning muvaffaqiyatli natijalari tahlil qilinadi va sizga ham shunday faoliyat tavsiya etiladi.

---

## 📦 O'rnatish va Ishga tushirish

### Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/main.py
```

### Frontend:
```bash
cd frontend
npm install
npm run dev
```

---
*Ushbu loyiha ma'lumotlar tahlili (Data Science) va zamonaviy web dasturlashning (Full-stack) o'zaro integratsiyasiga yorqin misoldir.*
