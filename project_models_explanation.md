# Athlete Fitness Analytics: AI Modellar va Loyiha Konsepsiyasi

## 1. Loyihaning To'liq G'oyasi (Analiz)

**Athlete Fitness Analytics** — bu sportchilar va sog'lom turmush tarzi ishqibozlari uchun mo'ljallangan, sun'iy intellektga asoslangan tahliliy platforma. Loyihaning asosiy maqsadi shunchaki ma'lumotlarni yig'ish emas, balki ulardan **shaxsiylashtirilgan (personalized)** tushunchalar va bashoratlar yaratishdir.

### Loyihaning Asosiy Ustunlari:

1.  **Aqlli Bashorat (Smart Prediction):**
    *   Foydalanuvchi o'z ma'lumotlarini (yosh, vazn, yurak urishi, mashg'ulot turi) kiritganda, sistema **Regression** modellari yordamida u qancha kaloriya yo'qotishini aniq bashorat qiladi.
    *   Ma'lumotlarning realistik bo'lishi uchun bashorat qilingan natijalar maxsus masshtab koeffitsiyenti (20x) bilan aniqlashtiriladi.

2.  **Ijtimoiy Solishtirish (KNN Similarity):**
    *   Tizim bazadagi minglab yozuvlar ichidan aynan foydalanuvchiga o'xshash, bir xil faoliyat turi bilan shug'ullangan **eng yaqin 3 ta sportchini** topib beradi.
    *   Bu orqali foydalanuvchi o'z natijasini boshqa o'xshash insonlar bilan solishtirish imkoniga ega bo'ladi.

3.  **Shaxsiylashtirilgan Tavsiyalar (Health Recommendation):**
    *   Foydalanuvchining sog'liq holati (diabet, astma, gipertoniya va h.k.), yoshi va BMI ko'rsatkichlaridan kelib chiqib, sistema unga xavfsiz va samarali mashg'ulot turi, intensivligi va davomiyligini tavsiya qiladi.
    *   Har bir foydalanuvchi uchun uning sog'lig'iga oid maxsus "Health Tip"lar taqdim etiladi.

4.  **Chuqur Ma'lumotlar Tahlili (EDA & Clustering):**
    *   Katta hajmdagi ma'lumotlar klasterlarga ajratiladi, bu esa turli xil sportchi tiplarini (masalan, professional yoki havaskor) aniqlashga yordam beradi.
    *   Murakkab 15+ o'lchamli ma'lumotlar PCA va t-SNE algoritmlari yordamida 2D ko'rinishga keltirilib, vizual grafiklar orqali taqdim etiladi.

5.  **Ma'lumotlarni Boshqarish:**
    *   CSV formatidagi katta ma'lumotlar bazasini yuklash va ularni real vaqt rejimida ML modellarini o'qitish uchun ishlatish imkoniyati mavjud.

### Natija:
Ushbu platforma foydalanuvchiga nafaqat "nima bo'ldi" (tarix), balki "nima bo'ladi" (prediction) va "nima qilish kerak" (recommendation) degan savollarga javob beradi.


---

## 2. Loyihada Ishlatilgan Modellar: Ishlash Prinsipi va Vazifasi

Ushbu loyihada ma'lumotlarni tahlil qilish va bashorat qilish uchun bir nechta Machine Learning (ML) modellari va algoritmlaridan foydalanilgan. Quyida har birining ishlash printsipi va loyihada nima uchun ishlatilganligi tushuntirilgan.

### A. Multi-Target Regression (Kaloriya Bashorati)

Bu model sportchining jismoniy ko'rsatkichlari (yosh, vazn, bo'y, yurak urishi va h.k.) asosida **qancha kaloriya (kcal) yo'qotishini** aniqlash uchun ishlatiladi. Loyihada bir vaqtning o'zida 3 ta xil algoritm o'qitiladi:

1.  **Linear Regression (Chiziqli Regressiya)**
    *   **Ishlash printsipi:** Ma'lumotlar orasidagi chiziqli bog'liqlikni topadi. **Gradient Descent** usuli yordamida modelning xatolik (cost function) qiymatini minimallashtiradigan ko'paytuvchi (weights) va o'zgarmas (bias) qiymatlarni hisoblaydi.
    *   **Vazifasi:** Oddiy va to'g'ridan-to'g'ri bog'liqliklarni (masalan, vaqt oshsa kaloriya ham oshishi) aniqlash uchun bazaviy model sifatida ishlatiladi.

2.  **Random Forest (Tasodifiy O'rmon)**
    *   **Ishlash printsipi:** **Bagging** va **Bootstrap** usullariga asoslangan. Ko'plab kichik "Decision Tree" (Qaror daraxtlari) hosil qilinadi. Har bir daraxt ma'lumotlarning tasodifiy qismini o'rganadi. Yakuniy natija barcha daraxtlar bergan natijalarning o'rtachasi sifatida olinadi.
    *   **Vazifasi:** Murakkab va chiziqli bo'lmagan bog'liqliklarni topish uchun ishlatiladi. Ma'lumotlardagi "shovqin" (noise) ga chidamli va aniqligi yuqori bo'lgani uchun loyihada **asosiy model** sifatida tanlangan.

3.  **Gradient Boosting (GBM)**
    *   **Ishlash printsipi:** **Boosting** usuliga asoslangan. Bunda daraxtlar ketma-ket quriladi. Har bir yangi daraxt oldingi daraxt yo'l qo'ygan xatolarni (residuals) to'g'rilashga harakat qiladi.
    *   **Vazifasi:** Maksimal aniqlikka erishish uchun ishlatiladi. Agar ma'lumotlar yetarli darajada ko'p bo'lsa, eng aniq bashoratni aynan shu model beradi.

---

### B. K-Nearest Neighbors (KNN) - O'xshashlik va Tavsiya

KNN algoritmi "Menga do'stingni ayt, men senga kimmoligingni aytaman" tamoyili asosida ishlaydi.

1.  **O'xshash sportchilarni topish (Similar Athletes)**
    *   **Ishlash printsipi:** **Euclidean Distance** (Evklid masofasi) formulasi orqali bazadagi sportchilarning kiritilgan foydalanuvchiga qanchalik "yaqin" (o'xshash) ekanligini hisoblaydi.
    *   **Vazifasi:** Foydalanuvchiga o'ziga xos bo'lgan profillarni ko'rsatish uchun. Masalan, "Sizga o'xshash vazn va yoshdagi boshqa sportchilar ham xuddi shu mashg'ulotda shuncha kaloriya yo'qotgan" degan ma'lumotni taqdim etadi.

2.  **Activity Recommender (Mashg'ulot Tavsiyasi)**
    *   **Ishlash printsipi:** **Majority Vote** (Ko'pchilik ovozi) usulini qo'llaydi. Foydalanuvchiga eng yaqin 7-9 ta sportchi tahlil qilinadi va ularning ko'pchiligi qaysi turdagi mashg'ulotni bajarayotgani aniqlanadi.
    *   **Vazifasi:** Foydalanuvchining sog'lig'i, yoshi va BMI ko'rsatkichlaridan kelib chiqib, unga eng mos keladigan mashg'ulot turi, uning intensivligi va davomiyligini tavsiya etish uchun ishlatiladi.

---

### C. Clustering (Klasterlash) - Guruhlash

Bu algoritm ma'lumotlarda yashirin qonuniyatlarni (pattern) topish uchun ishlatiladi (Unsupervised Learning).

1.  **K-Means Clustering**
    *   **Ishlash printsipi:** Ma'lumotlarni oldindan belgilangan **K ta guruhga (klaster)** ajratadi. Har bir guruh markazi (centroid) bo'ladi va nuqtalar o'ziga eng yaqin markazga biriktiriladi. Markazlar nuqtalar o'rtachasi bo'yicha qayta hisoblanib, model barqaror holatga kelguncha davom etadi.
    *   **Vazifasi:** Sportchilarni umumiy tiplarga ajratish uchun (masalan: "Professional sportchilar", "Haskorlar", "Sog'lig'ida muammosi borlar").

2.  **Hierarchical Clustering**
    *   **Ishlash printsipi:** **Agglomerative (pastdan yuqoriga)** usulida ishlaydi. Har bir sportchi bitta guruh deb olinadi va bir-biriga eng o'xshashlari bosqichma-bosqich birlashtirilib boriladi (Dendrogramma hosil bo'ladi).
    *   **Vazifasi:** Sportchilar orasidagi ierarxik bog'liqlikni va o'xshashlik darajalarini chuqurroq tahlil qilish uchun.

---

### D. Dimensionality Reduction (O'lchamlarni Qisqartirish)

Loyihada 15 dan ortiq parametrlar (yosh, vazn, yurak urishi va h.k.) mavjud. Ularni 2 o'lchamli (2D) grafikda ko'rsatish imkonsiz. Shu sababli quyidagilar ishlatiladi:

1.  **Principal Component Analysis (PCA)**
    *   **Ishlash printsipi:** Ma'lumotlardagi eng ko'p o'zgaruvchanlikka (variance) ega bo'lgan yo'nalishlarni topadi va ularni "Asosiy komponentlar" deb ataydi. 15 ta ustunni 2 tagacha qisqartiradi.
    *   **Vazifasi:** Ko'p o'lchamli ma'lumotlarni umumiy ko'rinishda grafikda vizualizatsiya qilish uchun.

2.  **t-SNE (t-Distributed Stochastic Neighbor Embedding)**
    *   **Ishlash printsipi:** Lokal o'xshashliklarni saqlab qolishga harakat qiladi. Ya'ni, ko'p o'lchamli fazoda yaqin bo'lgan nuqtalar 2D fazoda ham bir-biriga yaqin joylashadi.
    *   **Vazifasi:** Klasterlar (guruhlar) bir-biridan qanchalik uzoq yoki yaqin ekanligini grafikda aniq ajratib ko'rsatish uchun.

---

## 3. Nima uchun aynan shu modellar? (Xulosa)

*   **Regression:** Faqat bitta qiymatni (kaloriya) aniq hisoblash kerak bo'lgani uchun.
*   **KNN:** Shaxsiy (personalized) tavsiyalar berishda eng samarali va oson tushuntiriladigan algoritm bo'lgani uchun.
*   **Clustering:** Sportchilarning katta bazasini avtomatik ravishda toifalarga ajratib olish (EDA) uchun.
*   **PCA/t-SNE:** Murakkab matematik ma'lumotlarni foydalanuvchiga tushunarli "nuqtali grafik" ko'rinishida yetkazish uchun.

---

## 4. Normalizatsiya: Nega bu muhim?

Modellar ishlashidan oldin barcha ma'lumotlar **Min-Max [0, 1]** yoki **Z-score** (standardizatsiya) usulida normalizatsiya qilinadi.
*   **Sababi:** Masalan, "Vazn" (100 kg gacha) va "Bo'y" (200 cm gacha) sonlari har xil masshtabga ega. Agar normalizatsiya qilinmasa, model kattaroq songa ega ustunni "muhimroq" deb o'ylab, xato bashorat qilishi mumkin. Normalizatsiya barcha ustunlarni bir xil "vazn" (importance) darajasiga keltiradi.

