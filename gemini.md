# 🧠 DimeBox - Project Context & Memory Vault

## 🗺️ Project Overview
**DimeBox (Dimension Item Box)** is a mobile-first Progressive Web App (PWA) designed to track physical inventory, gear, capsule wardrobe, and travel packing lists using an RPG/Anime-inspired HUD interface.

*   **Frontend:** React (Vite) + Tailwind CSS
*   **Backend:** Python (FastAPI)
*   **Database:** Supabase (PostgreSQL)
*   **Storage:** Cloudinary
*   **Hosting:** Vercel (Frontend) & Railway (Backend)

---

## 🗄️ Database Schema (PostgreSQL with Supabase Auth)

### 1. Enums
```sql
CREATE TYPE item_category AS ENUM ('Wardrobe', 'Gear', 'Toiletries');
CREATE TYPE item_status AS ENUM ('Owned', 'Wishlist');
```

### 2. Core Tables
```sql
-- Vault for all registered items (linked to Supabase Auth user)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category item_category NOT NULL,
    status item_status NOT NULL,
    image_url TEXT,
    purchase_date DATE,
    rating_worth INT CHECK (rating_worth BETWEEN 1 AND 5),
    review TEXT,
    dominant_color VARCHAR(50),
    expiry_reminder_months INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Normalized Tags Table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Junction table for items and tags (multi-tagging)
CREATE TABLE item_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(item_id, tag_id)
);

-- Multi-link radar for wishlist items
CREATE TABLE wishlist_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    url_link TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    is_cheapest BOOLEAN DEFAULT FALSE,
    spec_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quest/Trip logs
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment slots for trips
CREATE TABLE trip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    is_packed BOOLEAN DEFAULT FALSE,
    UNIQUE(trip_id, item_id)
);

-- Outfit combinations (OOTD Lab)
CREATE TABLE outfits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for outfits and items
CREATE TABLE outfit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE(outfit_id, item_id)
);
```

---

## 🛠️ Active Architectural Design & Decisions

### 1. Durability HUD & Masa Pakai (RPG Theme)
*   **Decision:** Menolak kalkulator berat barang (*Weight/Encumbrance*). Sebagai gantinya, HUD akan berfokus pada **Durability (Masa Pakai)**.
*   **Mekanisme Durability:**
    *   *Consumables/Toiletries:* Durability bar (100% ke 0%) otomatis menyusut seiring waktu berdasarkan `expiry_reminder_months` sejak `purchase_date`.
    *   *Gear/Wardrobe:* Durability melacak tingkat keausan atau jumlah petualangan (*Quest/Trip*) yang telah diselesaikan oleh item tersebut.

### 2. Multi-User & Autentikasi Supabase
*   **Decision:** Relasi database sepenuhnya mendukung multi-user dengan mengaitkan kolom `user_id` ke tabel internal Supabase `auth.users(id)`.
*   **Workflow Auth:**
    1.  Frontend React menggunakan SDK resmi Supabase (`@supabase/supabase-js`) untuk pendaftaran, login (username/email + password), dan manajemen sesi.
    2.  Setiap kali memanggil backend FastAPI, frontend mengirimkan JWT (JSON Web Token) yang didapat dari Supabase di dalam header `Authorization: Bearer <token>`.
    3.  FastAPI bertindak secara stateless. Backend memvalidasi JWT tersebut menggunakan public key/secret Supabase untuk memastikan token sah dan mengekstrak `user_id` secara aman.

### 3. Tagging System & Outfit Persistence
*   **Decision:** Menggunakan skema relasional penuh.
    *   Tabel `tags` terpisah untuk memudahkan manajemen tag global (edit nama tag atau hapus tag akan otomatis ter-update ke seluruh item melalui cascade).
    *   Tabel `outfits` dan `outfit_items` ditambahkan untuk menyimpan kombinasi pakaian yang dirancang user di kanvas OOTD secara permanen.

### 4. Offline Synchronization (PWA)
*   **Strategy (V1 - Stable Caching):**
    *   Menggunakan Service Workers untuk menyimpan aset statis (HTML, CSS, JS) agar aplikasi bisa dibuka saat offline.
    *   **Read-Only Offline Mode:** Saat offline, data terakhir yang sukses diambil dari server disimpan di local storage (IndexedDB/Cache). User tetap bisa membuka aplikasi dan membaca daftar perlengkapan trip/item box mereka.
    *   **Write Restriction:** Semua operasi perubahan data (tambah/edit/hapus) dinonaktifkan saat offline dan hanya diizinkan saat terhubung ke internet untuk mencegah terjadinya konflik sinkronisasi pada rilis perdana ini.

---

## 🚀 Future Roadmap & Gamification Ideas
*   **RPG Stats & Achievements:** Level up "Explorer" atau "Minimalist" stats berdasarkan jumlah barang yang dilacak dan trip yang diselesaikan.
*   **Durability/Maintenance Alert:** Notifikasi perawatan barang setelah melewati frekuensi trip tertentu.

---

## 📓 Session Log & Learnings

### Session 1: Project Scaffolding & Core Backend (2026-06-26)
*   **Status:** Phase 1 & Phase 2 COMPLETED.
*   **Key Deliverables:**
    1.  `PRD.md` updated with a 6-phase implementation roadmap.
    2.  `.vscode/extensions.json` created for recommended development tools.
    3.  `database/schema.sql` created and successfully executed on Supabase (Enums, Core Tables, Performance Indexes, and RLS policies).
    4.  FastAPI backend initialized as a `uv` project. Dependencies installed: `fastapi`, `uvicorn[standard]`, `pyjwt[crypto]`, `asyncpg`, `pydantic-settings`, `python-dotenv`.
    5.  Stateless Supabase JWT authentication dependency implemented in `backend/app/auth.py`.
    6.  High-performance async connection pooling configured in `backend/app/database.py`.
    7.  JSON-aggregating query routers implemented in `backend/app/routers/items.py` and `tags.py` for atomic multi-tag operations and the "Saya Beli" wishlist conversion.
*   **Key Learnings & Decisions:**
    *   **Durability HUD:** Dropped the complex weight-based encumbrance system in favor of a gamified "Durability/Masa Pakai" system. Consumables drain over time, whereas gear/wardrobe tracks usage based on completed quests.
    *   **PWA Offline Strategy:** V1 will use a stable read-only offline caching strategy. Users can read checklists offline, but writes are restricted to online mode to prevent synchronization conflicts.
    *   **Authentication Flow:** Frontend React handles Supabase Auth UI, obtains JWT, and forwards it to FastAPI. Backend validates JWT statelessly using the Supabase symmetric JWT Secret.

### Session 2: Frontend Foundation & Core Features (2026-06-26)
*   **Status:** Phase 3 & Phase 4 COMPLETED.
*   **Key Deliverables:**
    1.  Resolved critical database connection issue (Supabase routed through `aws-1-ap-south-1.pooler.supabase.com` instead of default `aws-0-`).
    2.  Successfully connected FastAPI backend to Supabase PostgreSQL over IPv4 using connection pooler.
    3.  Initialized React (Vite) + TypeScript + Tailwind CSS v4 inside the `frontend/` directory.
    4.  Implemented a futuristic, glassmorphic RPG HUD design system in `frontend/src/index.css` using Tailwind v4 CSS-first theme tokens.
    5.  Developed secure Supabase `AuthContext` to handle sessions and share JWT tokens with the backend.
    6.  Developed a custom `apiClient` that automatically attaches the active Supabase JWT to FastAPI calls.
    7.  Created a high-fidelity cybernetic Login/Register UI (`Auth.tsx`) and persistent bottom navigation bar (`Navbar.tsx`).
    8.  Developed the complete Dashboard HUD (`Dashboard.tsx`) showing account levels, items count, and automated durability alerts.
    9.  Developed the Wardrobe (`Wardrobe.tsx`) and Gear (`Gear.tsx`) pages with faceted tag classification and search filters.
    10. Developed the Bounty Radar (`Wishlist.tsx`) showing wishlist items and triggering the "Saya Beli" ownership conversion modal.
    11. Developed the S-Class worth-it investment matrix and global tag manager in the Status/Profile tab (`Profile.tsx`).
    12. Built the universal `ItemModal.tsx` for registering and editing items, complete with dynamic category/status inputs and tag creation on the fly.
    13. Resolved a NameError bug in `backend/app/routers/items.py` by replacing the undefined 'Field' parameter validator with FastAPI's 'Query' dependency.
*   **Key Learnings & Decisions:**

    *   **Tailwind CSS v4:** Opted for Tailwind v4 for its blazing-fast build speeds, zero-JS configuration, and native single-plugin Vite integration, saving compiling RAM overhead.
    *   **Verbatim Module Syntax:** Resolved TypeScript 5 compile issues by using type-only imports (`import type`) for Supabase structures.
    *   **Universal ItemModal for Conversion:** Reused the `ItemModal` for the "Saya Beli" conversion journey by pre-populating it and forcing `Owned` status, saving code size and keeping UI consistent.
    *   **Durability Algorithms:** Implemented a robust client-side durability calculator in `utils/durability.ts` that calculates consumable decay by time, and gear/wardrobe decay by ownership duration, reinforcing the RPG HUD theme.

### Session 3: Quest Packing & OOTD Lab (2026-06-26)
*   **Status:** Phase 5 COMPLETED.
*   **Key Deliverables:**
    1.  **Wardrobe Class Integration:** Integrated `wardrobe_class` (`Top`, `Bottom`, `Outer`, `Shoes`) across the frontend. Added `patch` request support in `apiClient.ts`, updated the `Item` interface, and added the class selector dropdown inside the `ItemModal` and card labels.
    2.  **OOTD Combos Lab:** Developed the outfit combination mixer canvas with 4 slots. Built the HSL-based color harmony and tag-matching recommendation engine in `utils/harmony.ts` for automated armor recommendations. Implemented loadout blueprint saving (POST `/outfits`) and a list of saved outfit blueprint setups.
    3.  **Quest Packing Log:** Created schemas and fully asynchronous high-performance routers (`outfits.py`, `trips.py`) on FastAPI using single-query PostgreSQL JSON aggregation. Built the `QuestModal` packing checklist for real-time item packing toggles and dynamic inventory additions, integrated directly into the `Dashboard` with active quest list progress bars.
    4.  **Verification:** Ran the TypeScript compiler and confirmed 100% type-safety and zero errors across the entire codebase.
*   **Key Learnings & Decisions:**
    *   **Color Harmony circular HSL check:** Implemented a robust client-side check that flags saturation-based color clashes (discordant hues between 35 and 145 degrees apart) unless neutral tones (gray, beige, black, white) are present. This ensures beautiful outfit matching.
    *   **Nested JSON Aggregation:** Leveraged PostgreSQL subqueries with `json_agg` and `json_build_object` to fetch hierarchical relationships (e.g. Outfits -> Items -> Tags) in a single high-speed database call, maximizing performance on low-RAM infrastructure.



