# 🚀 DimeBox - Vercel Unified Monorepo Deployment Protocol

Dokumen ini berisi panduan langkah-demi-langkah untuk mendeploy monorepo **DimeBox** (Vite React PWA & FastAPI Backend) secara bersamaan di **satu project Vercel** secara **100% gratis** menggunakan konfigurasi `vercel.json` kustom di root.

---

## 📋 Prasyarat Environment Variables

Sebelum memulai, siapkan data berikut dari **Supabase Dashboard** -> **Project Settings** -> **API**:

| Variabel | Sumber di Supabase Dashboard | Kegunaan |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection String (Port 6543 / Pooler IPv4) | Koneksi database PostgreSQL (PgBouncer) |
| `SUPABASE_JWT_SECRET` | JWT Secret | Autentikasi JWT stateless di FastAPI |
| `VITE_SUPABASE_URL` | Project URL | Inisialisasi SDK Supabase & Verifikasi JWKS ES256 |
| `VITE_SUPABASE_ANON_KEY` | anon public key | Autentikasi anonim di React |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud Name (Cloudinary Dashboard) | *Optional* - Cloud name untuk upload gambar |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Upload Preset (Unsigned) | *Optional* - Preset upload gambar |

---

## 🚏 Langkah 1: Kirim Perubahan Terkini ke GitHub

Pastikan seluruh berkas konfigurasi monorepo ter-update (`vercel.json` di root folder) sudah terunggah ke repositori GitHub kamu.

```bash
git push
```

---

## 🔌 Langkah 2: Deploy ke Vercel (Single-Project)

Vercel akan membaca berkas `vercel.json` di root untuk melakukan build ganda (FastAPI serverless function & Vite React static assets) di bawah satu domain yang sama.

1. Masuk ke **[Vercel Dashboard](https://vercel.com/)**.
2. Klik tombol **Add New** -> Pilih **Project**.
3. Cari repositori **DimeBox** di daftar repositori GitHub kamu, lalu klik **Import**.
4. Di halaman konfigurasi proyek:
   * **Project Name**: `dimebox` (atau sesuai keinginan).
   * **Root Directory**: Biarkan **`/`** (Jangan diubah, biarkan default root agar Vercel mendeteksi `vercel.json` di root).
   * **Framework Preset**: Pilih **Other** (Vercel akan secara otomatis mengikuti instruksi build dari `vercel.json`).
5. Buka bagian **Environment Variables** dan tambahkan seluruh variabel berikut:
   * **`DATABASE_URL`**: `<CONNECTION_STRING_SUPABASE>` *(Gunakan connection string pooler IPv4 port 6543 dengan parameter `?pgbouncer=true`)*.
   * **`SUPABASE_JWT_SECRET`**: `<JWT_SECRET_SUPABASE>`.
   * **`VITE_SUPABASE_URL`**: `<PROJECT_URL_SUPABASE>`.
   * **`VITE_SUPABASE_ANON_KEY`**: `<ANON_KEY_SUPABASE>`.
   * **`VITE_CLOUDINARY_CLOUD_NAME`**: *(Optional)*.
   * **`VITE_CLOUDINARY_UPLOAD_PRESET`**: *(Optional)*.
6. Klik tombol **Deploy** dan tunggu proses instalasi dependensi (Python & Node) serta kompilasi selesai (~45-60 detik).
7. Setelah selesai, kamu akan mendapatkan satu domain utama (misalnya: `https://dimebox.vercel.app`) yang berisi aplikasi frontend, dan API backend otomatis aktif di bawah path `/api/*` (contoh: `https://dimebox.vercel.app/api/status`).

---

## 📱 Langkah 3: Hubungkan & Install PWA di HP

1. Buka URL utama aplikasi menggunakan HP kamu:
   * **iOS**: Wajib gunakan browser **Safari** untuk fitur PWA penuh.
   * **Android**: Wajib gunakan browser **Chrome**.
2. **Tambahkan Aplikasi ke Home Screen:**
   * **iOS (Safari)**: Klik tombol **Share** di bagian bawah browser -> gulir ke bawah -> pilih **Add to Home Screen**.
   * **Android (Chrome)**: Klik ikon titik tiga di kanan atas -> pilih **Install app** atau **Tambahkan ke Layar Utama**.
3. Aplikasi **DimeBox** kini terpasang di HP kamu dengan tampilan penuh layaknya aplikasi native (tanpa URL bar browser) dan siap digunakan!
