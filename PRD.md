# 🗺️ DimeBox (Dimension Item Box) - PRODUCT REQUIREMENT DOCUMENT

## *“An Infinite Pocket Dimension for Your Real-Life Gear & Wardrobe”*

---

## 1. Project Overview & Lore

**DimeBox** adalah sebuah aplikasi *Progressive Web App (PWA)* berpendekatan *Mobile-First Design* yang terinspirasi dari sistem *Inventory/Item Box* di dunia game RPG dan anime. Aplikasi ini berfungsi sebagai "kantong dimensi" digital untuk melacak seluruh barang berharga yang kamu miliki (*Owned Items*), mengelola target buruan (*Wishlist*), memadupadankan armor harian (*Capsule Wardrobe*), serta menyusun *equipment* sebelum memulai *quest* luar ruangan (*Trip Packing Checklist*).

### Key Metrics & Success Indicators

* **Data Integrity:** Sinkronisasi relasi database yang sempurna layaknya *system interface* anime antara item, multi-link, tag, dan kombinasi OOTD.
* **Seamless Access:** Aplikasi ringan dan responsif, dapat di-akses kilat lewat HP (PWA) bahkan saat berada di area *low-signal* (alam liar).

---

## 2. Tech Stack & Architecture (The Core Engine)

| Layer                 | Technology                        | Reason / Benefit                                                                                                                       |
| :-------------------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend UI**       | React.js (Vite) + Tailwind CSS v4 | Interface yang responsif, glassmorphic dengan tema warna gelap fantasi ala Solo Leveling System HUD, serta transisi spring yang mulus.   |
| **Backend API**       | Python (FastAPI)                  | Menggunakan stack utama Python untuk pemrosesan data yang cepat, asinkronus, dan auto-generate Swagger docs untuk testing endpoint.    |
| **Database**          | Supabase (PostgreSQL - Free Tier) | Penyimpanan data relasional gratis, terstruktur, aman, dan mendukung operasi real-time data.                                           |
| **Storage**           | Cloudinary (Free Tier)            | Dimensi penyimpanan khusus untuk mengompresi dan mengamankan foto aset fisik yang kamu scan (upload).                                  |
| **Hosting**           | Vercel & Railway                  | Pipeline deployment otomatis (CI/CD) dari GitHub ke server publik secara gratis dan instan.                                            |

---

## 3. Database Schema Concept (Relational PostgreSQL)

### 3.1 Table: `items` (The Item Box Vault)

Menyimpan seluruh objek yang terdaftar di dalam DimeBox, baik yang sudah masuk *inventory* maupun masih dalam radar perburuan.

```sql
CREATE TYPE item_category AS ENUM ('Wardrobe', 'Gear', 'Toiletries');
CREATE TYPE item_status AS ENUM ('Owned', 'Wishlist');

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category item_category NOT NULL,
    status item_status NOT NULL,
    image_url TEXT,
    purchase_date DATE, -- Mengisi manual tanggal perolehan barang (bisa untuk barang lama)
    rating_worth INT CHECK (rating_worth BETWEEN 1 AND 5), -- Evaluasi seberapa worth-it barang ini
    review TEXT, -- Catatan performa barang setelah pemakaian
    dominant_color VARCHAR(50), -- Warna primer untuk algoritma kombinasi pakaian
    expiry_reminder_months INT, -- Durasi ketahanan untuk item tipe consumables/toiletries
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Table: `wishlist_links` (The Bounty Radar)

Menampung multi-link toko online untuk satu item incaran guna mendeteksi harga paling menguntungkan.

```sql
CREATE TABLE wishlist_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    url_link TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    is_cheapest BOOLEAN DEFAULT FALSE, -- Auto-true pada link dengan harga paling rendah
    spec_note TEXT, -- Keterangan spesifikasi: Ukuran (M/L/XL), Varian, Warna, dll.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 Table: `trips` (Quest Log)

Menyimpan data rencana perjalanan atau petualangan (*Quest*).

```sql
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_name VARCHAR(255) NOT NULL, -- Nama Quest, e.g., "Mendaki Gunung Penanggungan"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 Table: `trip_items` (Equipment Slot)

Menghubungkan item dengan perjalanan tertentu beserta status kemasannya.

```sql
CREATE TABLE trip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    is_packed BOOLEAN DEFAULT FALSE, -- Status apakah barang sudah masuk tas/inventory fisik
    UNIQUE(trip_id, item_id)
);
```

---

## 4. Feature Requirements & System Logic

### 4.1 Navigation & Mobile Interface (Solo Leveling HUD Layout)

Menggunakan *Bottom Navigation Bar* persisten yang dioptimalkan untuk akses satu jempol di layar HP dengan tema warna ungu-cyan gelap ala *Shadow Monarch*.

**Struktur Menu HUD:**

* **Home (Dashboard):** Menampilkan **SYSTEM STATUS: INTERFACE ACTIVE** dengan indikator `LV. X`, XP progress bar, low durability warning center, dan active quest logs.
* **Wardrobe (Armor Section):** Ruang penyimpanan pakaian (Top, Bottom, Outer, Shoes) dengan border menyala sesuai tingkat kelangkaan (S-Rank hingga D-Rank).
* **Gear (Equipment Section):** Gudang penyimpanan alat non-baju dengan filtrasi tag.
* **Wishlist (Bounty List):** Daftar barang incaran lengkap dengan kalkulasi target dana yang harus dikumpulkan.
* **Profile (Status Window):** Menampilkan antarmuka **Status Window** Sung Jinwoo dengan pembagian statistik (STR, AGI, VIT, INT, SEN) yang terpetakan secara dinamis dari aset fisik, serta fitur alokasi poin status interaktif.

### 4.2 Module: Magic Tagging System (Faceted Filter)

Sistem klasifikasi menggunakan sistem *Flat Tags* (tanpa sub-kategori) untuk menjaga kecepatan input data di mobile device.

* **Daftar Elemen Tag:** `Indoor`, `Outdoor`, `Portable`, `Touring`, `WFC`, `Mendaki`, `Pantai`.
* **Sistem Filtrasi:**
  * Satu item bisa dilekatkan banyak tag sekaligus (*multi-tag*).
  * User bisa menyaring seluruh isi Item Box secara instan hanya dengan menekan pil tag di bagian atas menu.

### 4.3 Module: Visual Capsule Wardrobe (OOTD Combination Lab)

* **Manual Equipment Editor:** Kanvas interaktif untuk memilih, menggeser, dan menyandingkan foto baju yang sudah kamu scan (foto satu per satu dengan background bersih) untuk melihat kecocokan kombinasi pakaian secara visual tanpa perlu membongkar isi lemari fisik.
* **Smart Auto-Armor Recommendation:** Sistem secara cerdas mengacak rekomendasi set pakaian harian berdasarkan aturan:
  * **Tag Alignment:** Atasan dan bawahan wajib memiliki minimal satu kecocokan tag aktivitas (misal: Atasan bertag WFC hanya dipasangkan dengan bawahan bertag WFC).
  * **Color Balance Rule:** Membaca data `dominant_color`. Jika atasan bertipe warna kontras, sistem otomatis mengunci pilihan bawahan dengan warna netral (Black, Beige, White, Grey) agar kombinasi warna tidak tabrakan.

### 4.4 Module: Wishlist Conversion & The "Item Acquired" Journey

* **Cheapest Badge Detector:** Saat kamu memasukkan beberapa alternatif link pembelian pada satu item wishlist, backend FastAPI otomatis menyaring harga terkecil dan memberikan lencana khusus "Termurah" pada link tersebut di UI.
* **The Conversion Event (Tombol "Saya Beli"):** Klik pada tombol ini akan merubah status item dari `Wishlist` menjadi `Owned`, sekaligus memicu runtutan form wajib melalui modal pop-up interaktif:
  1. User menginput tanggal pembelian (`purchase_date`) secara manual (mendukung pencatatan akurat untuk barang lama).
  2. User wajib mengambil foto asli fisik barang (bukan lagi gambar dari web) yang akan di-upload ke Cloudinary.
  3. User memberikan penilaian tingkat kepuasan berupa rating bintang (`rating_worth` 1-5) dan review singkat.

### 4.5 Module: Quest Packing Checklist

* **Workflow Pembuatan:** User mendaftarkan rencana perjalanan (Quest Baru) di aplikasi dan memilih tag aktivitasnya (Contoh: `Touring` + `Outdoor`).
* **Auto-Load Equipment:** Sistem secara otomatis menyalin semua daftar barang miliknya (`Owned`) yang memiliki tag tersebut ke dalam daftar bawaan trip (`trip_items`).
* **Interactive Check:** Saat berkemas, user tinggal mencentang item yang sudah masuk ke dalam tas fisik. Dilengkapi dengan *HUD Progress Bar* (0-100%) untuk memastikan tidak ada *equipment* penting yang tertinggal sebelum berangkat.

### 4.6 Module: Consumables & Durability Alert (Toiletries Status)

Fitur khusus melacak ketahanan item habis pakai (kategori `Toiletries` atau gas kaleng mendaki) berdasarkan nilai estimasi bulan (`expiry_reminder_months`).

Sistem secara otomatis menghitung umur barang sejak tanggal pembelian (`purchase_date`) dan memberikan indikator warna:

* 🟢 **Green (Optimal):** Durasi pemakaian masih aman di bawah 50% estimasi.
* 🟡 **Yellow (Low Durability):** Durasi pemakaian sudah lewat 50%. UI menampilkan pesan peringatan: *"Sudah berumur X bulan, cek sisa pemakaian sebelum memulai quest!"*
* 🔴 **Red (Depleted):** Melewati batas waktu estimasi pemakaian.

### 4.7 Worth-it Analytics & Status Window (The Status Board)

* **Bounty Gold Required:** Menghitung akumulasi total dana riil yang kamu butuhkan untuk menebus seluruh barang impian di daftar wishlist (menghitung total harga dari link bertanda `is_cheapest`).
* **Legendary Investment Matrix:** Daftar etalase khusus yang otomatis menampilkan barang-barang lama milikmu yang memiliki `rating_worth = 5` dengan usia kepemilikan sudah di atas 6 atau 12 bulan. Ini merepresentasikan *gear* terbaik yang terbukti paling berharga dan awet sepanjang petualanganmu.
* **Solo Leveling Status Window:** Konversi halaman profil menjadi panel status pemburu (*Hunter Status*):
  * **Level:** Dihitung dari jumlah total `Owned Items`.
  * **STR (Strength):** `ownedCount * 2` (arsenal senjata/gear fisik).
  * **AGI (Agility):** `wardrobeCount * 2` (mobilitas padupadan pakaian).
  * **VIT (Vitality):** `averageDurability` (kondisi rata-rata seluruh barang).
  * **INT (Intelligence):** `legendaryCount * 5` (investasi barang berharga S-Class).
  * **SEN (Sense):** `wishlistCount * 3` (kepekaan berburu barang incaran baru).
  * **FATIGUE:** Tingkat kelelahan yang dihitung dinamis berdasarkan persentase barang yang butuh perawatan (durability warning/depleted).
  * **Stat Point Allocation:** Fitur kosmetik interaktif untuk mengalokasikan poin stat sisa (`+` button) dengan feedback notifikasi instan dari sistem.

---

## 5. Non-Functional Requirements (NFR)

* **Offline Pocket Dimension (Service Workers PWA):** Aplikasi wajib menerapkan mekanisme caching lokal. Menu pencatatan, daftar inventory, dan checklist perjalanan harus tetap bisa diakses dan dicentang secara normal walaupun kamu sedang berada di area tanpa sinyal data internet (di dalam hutan, jalur mendaki, atau pegunungan).
* **High-Speed Render & Compression:** Proses upload foto dari kamera HP wajib dikompresi secara otomatis di sisi client sebelum dikirimkan ke Cloudinary API, guna menghemat bandwidth kuota internet mobile dan mempercepat performa memuat gambar di dalam grid aplikasi.

---

## 6. Phased Implementation Roadmap (Cicilan Token-Efficient)

Untuk mengoptimalkan penggunaan token dan mendukung pengerjaan harian yang terarah, proyek DimeBox dibagi menjadi 6 fase mandiri:

### Phase 1: Project Scaffolding & Database Setup (Supabase)

* **Target:** Fondasi project dan keamanan database multi-user.
* **Rincian Tugas:**
  * Inisialisasi struktur direktori proyek (`frontend/` dan `backend/`).
  * Pembuatan konfigurasi `.vscode/extensions.json` untuk rekomendasi tools.
  * Penyusunan skema database PostgreSQL Supabase lengkap (Tabel, Enum, Foreign Keys, Index).
  * Konfigurasi awal aturan Row Level Security (RLS) di Supabase demi keamanan data antar-user.

### Phase 2: Backend API Core (FastAPI & Auth Validation)

* **Target:** API Gateway yang aman dan CRUD dasar.
* **Rincian Tugas:**
  * Inisialisasi project backend FastAPI menggunakan Virtual Environment.
  * Pembuatan middleware/dependency validator JWT Supabase untuk verifikasi user secara stateless.
  * Implementasi REST API CRUD mendasar untuk modul `items` (Item Box Vault) dan `tags`.

### Phase 3: Frontend Foundation & Authentications

* **Target:** Aplikasi client yang bisa diakses dan login aman.
* **Rincian Tugas:**
  * Inisialisasi project frontend React menggunakan Vite dan Tailwind CSS.
  * Konfigurasi tema desain visual (RPG HUD Theme tokens, HSL colors, neon accents).
  * Integrasi Supabase Auth SDK di React (Layar Login, Register, dan Manajemen Sesi).

### Phase 4: Core Features (Inventory & Tagging HUD)

* **Target:** Manajemen barang fisik yang berfungsi penuh.
* **Rincian Tugas:**
  * Pembuatan Dashboard Utama (Home HUD) dengan statistik ringkas.
  * Implementasi halaman Wardrobe (Armor) dan Gear (Equipment) dengan filtrasi tag interaktif.
  * Implementasi Modal Add/Edit Item dan form konversi "Saya Beli" (Wishlist ke Owned).

### Phase 5: Quests Packing & OOTD Lab

* **Target:** Fitur gamifikasi utama dan padupadan pakaian.
* **Rincian Tugas:**
  * Implementasi Modul Quest/Trip (Daftar perjalanan, auto-load perlengkapan berdasarkan tag, HUD progress bar).
  * Pembuatan OOTD Combination Lab (Kanvas interaktif untuk menyandingkan pakaian dan menyimpan kombinasi outfit).
  * Implementasi sistem Durability Alert berbasis waktu untuk item tipe Toiletries/Consumables.

### Phase 6: Analytics, Cloudinary, & PWA Offline Cache

* **Target:** Optimasi performa, offline access, dan laporan investasi barang.
* **Rincian Tugas:**
  * Implementasi modul Worth-it Analytics (Legendary Investment Matrix & Bounty Gold Required).
  * Integrasi upload gambar ke Cloudinary disertai kompresi otomatis di sisi client.
  * Konfigurasi PWA Service Workers untuk caching offline tingkat aplikasi (Read-Only Offline Mode).
