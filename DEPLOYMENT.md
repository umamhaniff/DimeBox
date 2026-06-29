# 🚀 DimeBox - Vercel Free-Tier Deployment Protocol

Dokumen ini berisi panduan langkah-demi-langkah untuk mendeploy monorepo **DimeBox** (Frontend React PWA & Backend FastAPI) sepenuhnya di **Vercel** secara **100% gratis** menggunakan arsitektur *Serverless Python Functions* dan *Static Web Hosting*.

---

## 📋 Prasyarat Environment Variables

Sebelum memulai, siapkan data berikut dari **Supabase Dashboard** -> **Project Settings** -> **API**:

| Variabel | Sumber di Supabase Dashboard | Kegunaan |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection String (Port 6543 / Pooler IPv4) | Koneksi database PostgreSQL |
| `SUPABASE_JWT_SECRET` | JWT Secret | Autentikasi JWT stateless di FastAPI |
| `VITE_SUPABASE_URL` | Project URL | Inisialisasi SDK Supabase di React |
| `VITE_SUPABASE_ANON_KEY` | anon public key | Autentikasi anonim di React |

---

## 🚏 Langkah 1: Kirim Perubahan Terkini ke GitHub

Pastikan seluruh file konfigurasi serverless terbaru (`requirements.txt` dan `vercel.json` di folder backend) sudah terunggah ke repositori GitHub kamu.

Jalankan perintah berikut di terminal root folder:
```bash
git push
```

---

## 🔌 Langkah 2: Deploy API (Backend FastAPI) ke Vercel

Vercel akan mendeploy backend FastAPI sebagai *Serverless Python Functions* gratis menggunakan file `backend/vercel.json` yang telah kita siapkan.

1. Masuk ke **[Vercel Dashboard](https://vercel.com/)**.
2. Klik tombol **Add New** -> Pilih **Project**.
3. Cari repositori **DimeBox** di daftar repositori GitHub kamu, lalu klik **Import**.
4. Di halaman konfigurasi proyek:
   * **Project Name**: Ubah nama proyek menjadi `dimebox-api` (atau sesuai keinginan).
   * **Framework Preset**: Pilih **Other** (karena proyek ini menggunakan Python/FastAPI).
   * **Root Directory**: Klik tombol **Edit** di sebelah kanan, pilih folder `backend`, lalu klik **Continue**.
5. Buka bagian **Environment Variables** dan tambahkan dua variabel berikut:
   * **`DATABASE_URL`**: `<CONNECTION_STRING_SUPABASE>` *(Gunakan connection string pooler IPv4 port 6543 dengan parameter `?pgbouncer=true`)*.
   * **`SUPABASE_JWT_SECRET`**: `<JWT_SECRET_SUPABASE>`.
6. Klik tombol **Deploy** dan tunggu proses instalasi dependensi serta kompilasi serverless selesai (~45 detik).
7. Setelah selesai, **salin URL domain API publik** yang diberikan oleh Vercel (misalnya: `https://dimebox-api.vercel.app`).

---

## 🎨 Langkah 3: Deploy App (Frontend React PWA) ke Vercel

Vercel akan meng-hosting antarmuka React PWA secara statis dan menghubungkannya dengan API serverless yang baru saja dibuat.

1. Kembali ke **Vercel Dashboard**.
2. Klik **Add New** -> Pilih **Project** -> Import kembali repositori **DimeBox** yang sama sebagai proyek baru kedua.
3. Di halaman konfigurasi proyek:
   * **Project Name**: Ubah nama proyek menjadi `dimebox` (ini akan menjadi domain utama aplikasi kamu).
   * **Framework Preset**: Pilih **Vite** (otomatis terdeteksi).
   * **Root Directory**: Klik tombol **Edit**, pilih folder `frontend`, lalu klik **Continue**.
4. Buka bagian **Environment Variables** dan tambahkan variabel-variabel berikut:
   * **`VITE_SUPABASE_URL`**: `<PROJECT_URL_SUPABASE>`.
   * **`VITE_SUPABASE_ANON_KEY`**: `<ANON_KEY_SUPABASE>`.
   * **`VITE_API_URL`**: `<URL_API_VERCEL_DARI_LANGKAH_2>` *(Masukkan URL proyek backend yang disalin di Langkah 2, contoh: `https://dimebox-api.vercel.app`. **PENTING: Jangan tambahkan tanda garis miring `/` di akhir URL**)*.
   * **`VITE_CLOUDINARY_CLOUD_NAME`**: `<CLOUD_NAME_CLOUDINARY>` *(Optional, untuk menyimpan foto hasil scan kamera)*.
   * **`VITE_CLOUDINARY_UPLOAD_PRESET`**: `<UPLOAD_PRESET_CLOUDINARY>` *(Optional, untuk upload preset tanpa tanda tangan / unsigned)*.
5. Klik tombol **Deploy** dan tunggu proses build React selesai (~30 detik).

---

## 📱 Langkah 4: Hubungkan & Install PWA di HP

Setelah Langkah 3 selesai, kamu akan mendapatkan URL utama aplikasi kamu (misalnya: `https://dimebox.vercel.app`).

1. Buka URL utama tersebut menggunakan HP kamu:
   * **iOS**: Wajib gunakan browser **Safari** untuk fitur PWA penuh.
   * **Android**: Wajib gunakan browser **Chrome**.
2. **Tambahkan Aplikasi ke Home Screen:**
   * **iOS (Safari)**: Klik tombol **Share** di bagian bawah browser -> gulir ke bawah -> pilih **Add to Home Screen**.
   * **Android (Chrome)**: Klik ikon titik tiga di kanan atas -> pilih **Install app** atau **Tambahkan ke Layar Utama**.
3. Aplikasi **DimeBox** kini terpasang di HP kamu dengan tampilan penuh layaknya aplikasi native (tanpa URL bar browser) dan siap untuk dicoba.
