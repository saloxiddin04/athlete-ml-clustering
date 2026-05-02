# 🧠 Athlete Fitness Analytics: ML Models Explanation

Ushbu loyiha **"Data-Driven Athlete Performance & Metabolic Engine"** bo'lib, u sportchilarning biologik va faoliyat ma'lumotlarini tahlil qiladi.

## 🎯 Bashorat (Regression) Qaysi Kalitlar Asosida Ishlaydi?
Kaloriya bashorati (`predictCalories`) quyidagi **11 ta parametrga** asoslanadi:
1.  **age**: Yosh (Metabolizm tezligiga ta'sir qiladi).
2.  **height_cm**: Bo'y.
3.  **weight_kg**: Vazn (Qancha og'ir bo'lsa, kaloriya shuncha ko'p sarflanadi).
4.  **duration_minutes**: Mashg'ulot vaqti (Eng asosiy faktor).
5.  **avg_heart_rate**: O'rtacha yurak urishi (Intensivlik o'lchovi).
6.  **daily_steps**: Kunlik qadamlar.
7.  **sleep_hours**: Uyqu sifati.
8.  **stress_level**: Stress darajasi.
9.  **endurance_level**: Chidamlilik.
10. **hydration_level**: Suv ichish darajasi.
11. **resting_heart_rate**: Tinch holatdagi yurak urishi.

---

## 💡 Tavsiya (Recommendation) Qaysi Kalitlar Asosida Ishlaydi?
Aqlli tavsiya (`recommend`) quyidagi **11 ta parametrni** o'zaro solishtiradi:
*   **Biometrika**: `age`, `bmi`, `gender`, `health_condition`, `smoke_status`.
*   **Sport holati**: `stress_level`, `sleep_hours`, `avg_heart_rate`, `endurance_level`.
*   **Mashg'ulot**: `activity_type`, `intensity`, `duration_minutes`.

---

## 📈 Modellarning Ishlash Tamoyili
1.  **Multi-Target Regression**: Random Forest va GBM algoritmlari normalizatsiya qilingan [0, 1] fazoda ishlaydi. Natija bazadagi birliklarga qarab chiqadi va foydalanuvchiga tushunarli bo'lishi uchun x10 masshtabda ko'rsatiladi.
2.  **Weighted KNN**: Sizga eng yaqin 15 ta sportchini topadi. Agar siz "Running" tanlasangiz va biometrikangiz boshqa yuguruvchilarga mos kelsa, **Confidence** (Ishonch) 70% dan yuqori bo'ladi.
3.  **K-Means & PCA**: 15 o'lchamli ma'lumotlarni 2 o'lchamga tushirib, sportchilarni klasterlarga ajratadi.


---

## 📈 Metrikalar Tushuntirishi
*   **RMSE (Root Mean Square Error)**: Model xatosining o'rtacha qiymati. Bu son qancha kichik bo'lsa, bashorat shunchalik aniq.
*   **R² (R-Squared)**: Modelning ma'lumotlarni qanchalik "tushungani" (0 dan 1 gacha). 0.90+ ko'rsatkich — juda yuqori natija hisoblanadi.
*   **Confidence (Ishonch)**: Tavsiya berilayotganda kiritilgan ma'lumotlar bazadagi "qo'shnilarga" qanchalik mos kelishini ko'rsatuvchi foiz ko'rsatkichi.
