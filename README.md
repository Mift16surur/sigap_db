# SIGAP — Skrining Admisi Preeklamsia dan Perdarahan Pascapersalinan

Aplikasi web responsif / PWA berbasis **Next.js (TypeScript)** dengan arsitektur **Decoupled Backend (`backend/`) & Frontend (`frontend/`)** yang siap di-deploy ke **Vercel** secara terpisah.

Seluruh fitur, skema data (**18 entitas ERD**), mesin aturan berversi (**Rule Engine PE & HPP 4T**), **Role-Based Access Control (5 Aktor)**, **Alert Prioritas Seketika (Pre-emptive Alert)**, **Monitoring Kehilangan Darah Objektif Kumulatif**, **Komunikasi SBAR Terverifikasi**, serta **Instrumen Evaluasi Penelitian (Cohen's Kappa, SUS, Waktu Pengisian)** dibangun 100% mengikuti **Dokumen Perancangan Sistem SIGAP (SRS Versi 0.1)**.

---

## Struktur Direktori (Decoupled Architecture)

```text
d:\sigap\
├── backend\                  # Proyek Vercel 1: SIGAP Serverless REST API & Rule Engine (Port 4000)
│   ├── src\
│   │   ├── lib\
│   │   │   ├── types.ts      # Definisi 18 Entitas Inti ERD & Matriks Status Bab 13
│   │   │   ├── rule-engine.ts# Mesin Aturan Berversi PE & HPP 4T (NFR-08, Anti-Asumsi Normal)
│   │   │   ├── seed-data.ts  # Data awal 5 Role, Master Faktor 4T & PE, Protokol v1.2, Skenario
│   │   │   └── store.ts      # Penyimpanan persisten & RBAC Server Guard (SRS Bab 3)
│   │   └── app\api\v1\       # Endpoint REST API (/bootstrap, /admissions, /screening/pe, /screening/hpp, /monitoring, /protocols)
│   └── vercel.json
│
└── frontend\                 # Proyek Vercel 2: SIGAP Web App / PWA (Port 3000)
    ├── src\
    │   ├── lib\api-client.ts # Typed HTTP Client menuju Backend API
    │   ├── components\       # Modul UI Skrining PE, Skrining HPP 4T, Monitoring & SBAR, Protokol & Laporan
    │   └── app\page.tsx      # Antarmuka Utama SIGAP
    └── vercel.json
```

---

## Cara Menjalankan Secara Lokal

1. **Instalasi Dependensi (di root `d:\sigap`):**
   ```bash
   npm install
   ```
2. **Jalankan Server Backend API (Port `4000`):**
   ```bash
   npm run dev:backend
   ```
   - Backend API berjalan di `http://localhost:4000`
3. **Jalankan Server Frontend Web App (Port `3000`):**
   ```bash
   npm run dev:frontend
   ```
   - Buka aplikasi SIGAP di `http://localhost:3000`

---

## Cara Deploy ke Vercel (Backend & Frontend Terpisah)

1. **Deploy Backend (`d:\sigap\backend`):**
   - Buat proyek baru di Vercel dan arahkan **Root Directory** ke `backend`.
   - Setelah ter-deploy (misal `https://sigap-backend.vercel.app`), salin URL tersebut.
2. **Deploy Frontend (`d:\sigap\frontend`):**
   - Buat proyek kedua di Vercel dan arahkan **Root Directory** ke `frontend`.
   - Tambahkan Environment Variable:
     ```env
     NEXT_PUBLIC_API_URL=https://sigap-backend.vercel.app/api/v1
     ```
   - Klik **Deploy**.

