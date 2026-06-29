# 🧠 DimeBox - Project Context & Memory Vault

## 🗺️ Project Overview
**DimeBox (Dimension Item Box)** is a mobile-first Progressive Web App (PWA) designed to track physical inventory, gear, capsule wardrobe, and travel packing lists using an RPG/Anime-inspired HUD interface.

*   **Frontend:** React (Vite) + Tailwind CSS
*   **Backend:** Python (FastAPI)
*   **Database:** Supabase (PostgreSQL)
*   **Storage:** Cloudinary
*   **Hosting:** Vercel (Frontend & Backend Serverless)

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

### Session 4: Responsive Alignment, Worth-it Analytics, Cloudinary & PWA Cache (2026-06-27)
*   **Status:** Phase 6 COMPLETED. All core roadmap phases are now fully implemented and verified.
*   **Key Deliverables:**
    1.  **Favicon & SEO PWA:** Custom-built an isometric neon holographic SVG favicon (`favicon.svg`) and updated `index.html` with title, PWA viewport settings, and theme color tags.
    2.  **Responsive Layout Chassis:** Redesigned `App.tsx` and `Dashboard.tsx` to support a sidebar-based desktop dashboard with an RPG player profile card and multi-column grids for items on desktop, while maintaining a pure mobile-first layout on phone view.
    3.  **Treasury HUD & Worth-it Analytics:** Integrated the `wishlist_links` (Bounty Radar) database model in backend schemas and routers using single-query subquery JSON aggregation. Implemented **Bounty Gold Required** calculations (sum of cheapest wishlist prices) and **S-Class Legendary Worth Ratio** on the Profile tab (`Profile.tsx`), and rendered target price/shop link buttons on item cards (`ItemCard.tsx`).
    4.  **Cloudinary Integration & Canvas Compression:** Built a high-performance HTML5 Canvas client-side compressor (pure vanilla JS, zero dependencies) and Cloudinary upload handler in `ItemModal.tsx`, complete with a manual URL fallback and env variable instruction notice.
    5.  **PWA Service Worker for Offline Mode:** Developed a pure vanilla `/sw.js` implementing a **stale-while-revalidate** strategy for static assets and **network-first, cache-fallback** for API requests, delivering a stable **Read-Only Offline Mode** with write restrictions.
    6.  **Verification:** Verified production builds and confirmed 100% type-safety and successful compilation on Vite.
*   **Key Learnings & Decisions:**
    *   **Vanilla Service Worker & Canvas Compressor:** Opted for pure vanilla implementations for both PWA caching and image compression to avoid installing heavy npm packages. This minimizes bundler size, optimizes compile time, and prevents memory overhead on low-RAM infrastructure.
    *   **Cheapest Link SQL Ordering:** Implemented ordering by price in the aggregated subquery of `wishlist_links` so the cheapest option is always the first element, simplifying the client-side parsing of prices.

### Session 5: Cybernetic Live Camera Scanner & Robust Error Handling (2026-06-28)
*   **Status:** Advanced Features & Error Handling COMPLETED.
*   **Key Deliverables:**
    1.  **Live Camera Scanner:** Implemented WebRTC-based camera feed inside the `ItemModal` component. Built a cybernetic overlay (hologram corner brackets, target crosshair, pulsing scanning line, and status indicators) that fits the RPG HUD theme.
    2.  **Immersive Shutter Feedback:** Implemented a white screen flash animation upon capture and a retro synth-like click sound generated dynamically using the native Web Audio API (zero dependencies).
    3.  **Global Backend Exception Handlers:** Registered global exception filters in `backend/app/main.py` for database errors (`asyncpg.PostgresError`) and general python exceptions. This secures the backend by preventing traceback leaks and returning standardized error JSONs.
    4.  **Descriptive API Error Mapping:** Refactored `apiClient.ts` to wrap all fetch requests, mapping network connection timeouts/refusals (like `TypeError: Failed to fetch`) and server errors (e.g. 401 Session Expired or 503 Service Unavailable) to clear, actionable messages.
    5.  **HUD Red Alert Banners:** Implemented a reusable, styled error banner on all main views (`Dashboard`, `Wardrobe`, `Gear`, `Wishlist`, `Profile`). If an API/DB link failure occurs, it displays the error and provides a "Retry Connection" button.
*   **Key Learnings & Decisions:**
    *   **Web Audio API Synth Shutter:** Opted to generate the camera shutter sound dynamically via code using Web Audio API oscillators instead of loading static audio files. This keeps the application 100% self-contained and avoids audio file download latency.
    *   **Unified Error Boundary:** By catching connection issues globally in `apiClient.ts`, we simplified page-level error states. Each page only needs a simple `error` state and can trigger a clean retry flow on button click.

### Session 6: Compile Verification & Master Documentation (2026-06-28)
*   **Status:** Master Documentation & Full Build Verification COMPLETED.
*   **Key Deliverables:**
    1.  Verified frontend compilation using Vite and TypeScript (`npm run build`), achieving a clean production build with 100% type safety and zero compiling errors.
    2.  Verified backend syntax and dependency imports using `uv run python` on the main FastAPI application entry point, confirming it imports cleanly without configuration issues.
    3.  Analyzed and verified all core application features one by one, including User Auth, Dashboard HUD, OOTD Lab, Bounty Radar, Quest Packing, Consumable Durability, and the Cybernetic Live Camera.
    4.  Created a comprehensive, premium root `README.md` containing the project overview, Mermaid architecture diagram, database relationships, local development setup instructions, offline PWA features, and deployment configurations.
*   **Key Learnings & Decisions:**
    *   **Decoupled Verification:** Independent frontend compilation and backend module import checks are highly effective in validating microservices-based architectures prior to deployment.
    *   **Self-Documentation:** Aligning the README's feature checklist with the PRD helps keep the product specifications and documentation synchronized.

### Session 7: Bundler Optimization & Code Splitting (2026-06-29)
*   **Status:** Chunk Size Warning Resolved & Build Optimized.
*   **Key Deliverables:**
    1.  **Vite / Rolldown Chunking Config:** Updated `vite.config.ts` to implement `manualChunks` splitting for `@supabase/supabase-js`, `lucide-react`, and `react-core` (React, React-DOM, Scheduler), keeping all generated chunks well below the 500 kB warning limit.
    2.  **Dynamic Page Import (Lazy Loading):** Modified `App.tsx` to dynamically load all primary pages (`Auth`, `Dashboard`, `Wardrobe`, `Gear`, `Wishlist`, `Profile`) using `React.lazy` and wrapped them in `<React.Suspense>` blocks with themed cybernetic loading overlays ("Loading Module...", "Loading System Modules...").
    3.  **Production Verification:** Successfully built the frontend using `npm run build` with Vite 8 / Rolldown in 540ms, achieving 100% type-safe compilation and zero warnings.
    4.  **Cybernetic Camera Fallback:** Implemented a multi-stage WebRTC and HTML5 camera capture fallback in `ItemModal.tsx`. If the initial request for the back/environment camera fails (which happens on most laptops/desktops because they only have a front webcam), it instantly falls back to a generic `{ video: true }` request to use whatever webcam is available. If that also fails (or if we are in an insecure context), it falls back to the native device camera application via HTML5 `capture="environment"`.
*   **Key Learnings & Decisions:**
    *   **Vite 8 & Rolldown Compatibility:** Rolldown successfully supports the standard Rollup function-based `manualChunks` configuration, allowing precise control over heavy node_modules libraries without needing complex plugins.
    *   **Dynamic Suspense Fallbacks:** Using localized `<React.Suspense>` blocks inside the main layout preserves the layout frame (like the sidebar and header) while loading lazy chunks, offering a seamless UX.
    *   **Secure Context Restrictions (WebRTC vs HTML5):** WebRTC's `getUserMedia` is strictly restricted to secure contexts (HTTPS or localhost). Adding an HTML5 `<input type="file" capture="environment">` fallback guarantees camera access on mobile devices when testing over local network IPs.

### Session 8: Solo Leveling System UI/UX Overhaul (2026-06-29)
*   **Status:** UI/UX Redesign COMPLETED.
*   **Key Deliverables:**
    1.  **System-Wide Theme Overhaul:** Reconfigured `index.css` with a high-contrast dark fantasy palette (`hsl(225 50% 3%)` background, glowing `neon-purple` shadow Monarch aura, and `neon-cyan` details). Added custom CRT scanline overlays and slanted panel layout classes.
    2.  **RPG Status Dashboard:** Redesigned `Dashboard.tsx` to feature a tactical **"SYSTEM STATUS: INTERFACE ACTIVE"** board with `LV. X` display, dynamic title ratings (e.g. C-Rank, S-Rank), XP progression meters, and **"Active Quest Logs"** styled as system quest notifications.
    3.  **Hunter Status Window:** Transformed `Profile.tsx` into a classic Solo Leveling **"Status Window"** containing custom stats (STR, AGI, VIT, INT, SEN) mapped directly to inventory statistics (asset counts, average durability, wishlist counts). Implemented an interactive client-side **Stat Points Allocation HUD** (allocated using cosmetic "+" buttons and a reset trigger).
    4.  **Rarity-Based Inventory Slots:** Refactored `ItemCard.tsx` to apply custom border glows and shadows according to item worth rating (S-Rank Gold, A-Rank Purple, B-Rank Cyan, C-Rank Green, D-Rank Grey), replicating RPG gear slots.
    5.  **Production Verification:** Successfully compiled the React frontend with `npm run build` using Vite/Rolldown, confirming 100% type safety and zero warnings in 624ms.
*   **Key Learnings & Decisions:**
    *   **Gamified Stat Mapping:** Mapping real inventory metrics (like average durability to Vitality, and wishlist counts to Sense) creates a highly engaging, meaningful gamification loop rather than just static numbers.
    *   **Strict Local Compiler Checks:** Resolving unused imports (`Award` and `ShieldAlert`) immediately after builds ensures production deployment pipelines do not break on Vercel.



