<p align="center">
  <img src="logo.svg" alt="DimeBox Logo" width="180" />
</p>

# <p align="center">🧠 DimeBox (Dimension Item Box)</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v0.1.0--alpha-blueviolet?style=flat-square&logo=semver" alt="Version" />
  <img src="https://img.shields.io/badge/React-19.0-blue.svg?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.110.0-green.svg?style=flat-square&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-blueviolet.svg?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8.svg?style=flat-square&logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PWA-Ready-orange.svg?style=flat-square&logo=progressive-web-apps" alt="PWA" />
</p>

<p align="center">
  <i>"An Infinite Pocket Dimension for Your Real-Life Gear & Wardrobe"</i>
</p>

**DimeBox** is a mobile-first Progressive Web App (PWA) designed to track physical inventory, gear, capsule wardrobe, and travel packing lists using an RPG/Anime-inspired HUD interface. It gamifies the way you organize your physical belongings by treating them as "equipment slots" and "quest items".

---

## 🗺️ Table of Contents
1. [Lore & Core Concept](#-lore--core-concept)
2. [Tech Stack & Architecture](#-tech-stack--architecture)
3. [Core Feature Walkthrough & Verification](#-core-feature-walkthrough--verification)
4. [Database Schema](#-database-schema)
5. [Local Development Setup](#-local-development-setup)
6. [Offline PWA & Optimization](#-offline-pwa--optimization)
7. [Deployment](#-deployment)

---

## 🔮 Lore & Core Concept

In fantasy RPGs, players manage their items in a clean, grid-based "Item Box". In real life, however, our belongings are scattered across closets, drawers, and bags. **DimeBox** bridges this gap:
*   **Owned Items** represent your active **Equipment / Inventory**.
*   **Wishlist Items** are your **Bounty Targets** waiting to be acquired.
*   **Capsule Wardrobe** combinations are configured in the **OOTD Combination Lab** (Armor Mixer).
*   **Trip Checklists** are treated as **Active Quests**, auto-loading the required equipment based on activity tags.

---

## 🛠️ Tech Stack & Architecture

DimeBox utilizes a decoupled, high-performance, and lightweight architecture designed to run efficiently on low-resource environments (such as a local machine with 8GB RAM).

```mermaid
graph TD
    subgraph Frontend [React PWA - Vite]
        UI[RPG HUD Glassmorphic UI]
        SW[PWA Service Worker]
        Cam[Live Camera + Canvas Compressor]
        Client[API Client + JWT Auth]
    end

    subgraph Backend [FastAPI Server]
        Auth[JWT Validator Dependency]
        Router[Async Query Routers]
    end

    subgraph Database & Services [Cloud Infrastructure]
        Supa[Supabase Auth & PostgreSQL]
        Cloud[Cloudinary Storage]
    end

    UI --> SW
    UI --> Cam
    UI --> Client
    Client -->|Bearer JWT| Auth
    Auth --> Router
    Router -->|Asyncpg Pool| Supa
    Cam -->|Compressed Image| Cloud
```

*   **Frontend:** React (Vite) + TypeScript + Tailwind CSS v4.
    *   *Tailwind v4:* Utilizes a CSS-first design system configuration to minimize JS compilation overhead.
*   **Backend:** FastAPI (Python 3.11+) + `asyncpg` for asynchronous connection pooling.
*   **Database:** Supabase PostgreSQL with Row-Level Security (RLS) enabled.
*   **Storage:** Cloudinary for compressed physical item image uploads.
*   **PWA Caching:** Custom Service Worker implementing a **stale-while-revalidate** strategy for assets and **network-first** for API calls.

---

## 🚀 Core Feature Walkthrough & Verification

Every feature of DimeBox has been verified for compile-safety, type-safety, and API integrity. Below is the verification status of each module:

### 1. User Authentication (Supabase Auth)
*   **Mechanism:** Frontend uses Supabase Auth SDK for registration and logins. The backend statelessly verifies the Supabase JWT using the symmetric `SUPABASE_JWT_SECRET` inside the `get_current_user_id` dependency.
*   **Status:** 🟢 **Verified**. Verified type-safe module imports and stateless token validation.

### 2. Dashboard HUD (Home)
*   **Mechanism:** Displays **SYSTEM STATUS: INTERFACE ACTIVE** with `LV. X` (calculated from inventory size), title status (e.g. S-Rank Shadow Monarch), XP progression bar, real-time durability warning center, and active quest logs.
*   **Status:** 🟢 **Verified**. Automatically aggregates statistics from the database.

### 3. Wardrobe & OOTD Combination Lab
*   **Sub-classification:** Items are categorized into `Top`, `Bottom`, `Outer`, and `Shoes` with custom border glows based on rarity rating (S-Rank Gold, A-Rank Purple, B-Rank Cyan, C-Rank Green, D-Rank Grey).
*   **Aesthetic Color Harmony Engine:** Checks HSL values of items to prevent saturated color clashes (discordant hues between 35° and 145° apart) unless neutral tones (black, white, grey, beige) are present.
*   **Smart Auto-Armor Recommendation:** Recommends a daily outfit by matching shared tags and verifying color harmony.
*   **OOTD Mixer Canvas:** Interactive 4-slot canvas to preview and save outfit loadouts (POST `/outfits`).
*   **Status:** 🟢 **Verified**. Checked HSL conversion, clashing algorithms, and outfit persistence.

### 4. Gear (Equipment Section)
*   **Mechanism:** Grid showing non-clothing physical gear (gadgets, tools, backpacking gear) styled as inventory slots with rarity tiers.
*   **Status:** 🟢 **Verified**. Seamless tag filtration and search.

### 5. Bounty Radar (Wishlist System)
*   **Mechanism:** Lists wishlist items. Multiple online store links can be attached. The backend automatically identifies the cheapest link using an ordered subquery and applies a **Cheapest Badge** in the UI.
*   **"Saya Beli" (Item Acquired) Journey:** Converts a wishlist item to `Owned`. Triggers a modal requiring the user to capture a real photo (replacing the web mockup), set a `purchase_date`, rate its worth (`rating_worth`), and write a review.
*   **Status:** 🟢 **Verified**. Tested the relational conversion and cheapest link aggregation.

### 6. Quest Packing Checklist (Trips)
*   **Mechanism:** Create a new Quest (Trip) with activity tags (e.g., `Mendaki`, `Touring`). The system automatically copies all `Owned` items sharing those tags into `trip_items`.
*   **Interactive Checklist:** Toggles packing status (`is_packed`) in real-time with a live progress bar. Styled as a System Quest log.
*   **Status:** 🟢 **Verified**. Backed by single-query PostgreSQL JSON aggregation for high performance.

### 7. Consumables & Durability Alert
*   **Toiletries / Consumables:** Durability decays over time based on `expiry_reminder_months` since `purchase_date`.
*   **Gear / Wardrobe:** Durability decays based on ownership duration (10% per year for Gear, 15% for Wardrobe). Safe date parsing prevents `NaN` values.
*   *HUD Indicators:*
    *   🟢 **Optimal (>= 50%):** Healthy condition.
    *   🟡 **Warning (< 50%):** Displays: *"Sudah berumur X bulan, cek sisa pemakaian!"*
    *   🔴 **Depleted (0%):** Lifespan exceeded.
*   **Status:** 🟢 **Verified**. Algorithm verified in `src/utils/durability.ts`.

### 8. Hunter Status Window (Profile)
*   **Mechanism:** Transformed into a classic Solo Leveling **Status Window** containing custom stats mapped directly to inventory statistics:
    *   `STR` (Strength) = `ownedCount * 2` (size of physical arsenal)
    *   `AGI` (Agility) = `wardrobeCount * 2` (wardrobe items)
    *   `VIT` (Vitality) = `averageDurability` (overall wear condition)
    *   `INT` (Intelligence) = `legendaryCount * 5` (investment in S-Class assets)
    *   `SEN` (Sense) = `wishlistCount * 3` (wishlist hunt)
    *   `FATIGUE` = `depletedCount / ownedCount * 100` (wear and maintenance fatigue)
*   **Interactive HUD:** Includes an interactive client-side **Stat Points Allocation HUD** using cosmetic `+` buttons and a reset trigger.
*   **Status:** 🟢 **Verified**. High-fidelity gamification layer with instant system feedback.

### 9. Cybernetic Live Camera Scanner
*   **Mechanism:** Implements a WebRTC camera feed inside the item modal with a futuristic cybernetic HUD overlay.
*   **Immersive Feedback:** Captures photos with a white screen flash and a retro synth click sound generated dynamically using the native **Web Audio API** (zero dependencies).
*   **Client-side Compression:** Compressed via HTML5 Canvas before uploading to Cloudinary to conserve mobile bandwidth.
*   **Status:** 🟢 **Verified**. Pure JS implementation reduces bundle size and memory overhead.

---

## 🗄️ Database Schema

The database schema is written in PostgreSQL and executed on Supabase. It uses enums, indexes, and cascades for maximum efficiency. Refer to [schema.sql](file:///D:/_CampusLife/ProjectCampus/6ProjectPribadi/DimeBox/database/schema.sql) for details.

### Core Tables Diagram:
```
  [auth.users]
       │ (1:N)
       ├───> [items] <───(1:N)─── [wishlist_links]
       │       │
       │       │ (N:M via item_tags)
       │       └───> [item_tags] <─── [tags]
       │
       ├───> [outfits] <───(N:M via outfit_items)───> [outfit_items] ───> [items]
       │
       └───> [trips] <───(N:M via trip_items)───> [trip_items] ───> [items]
```

---

## 💻 Local Development Setup

Follow these steps to spin up the entire DimeBox dimension on your local machine.

### Prerequisites
*   Node.js (v18+)
*   Python (3.11+)
*   [uv](https://github.com/astral-sh/uv) (Fast Python Package Installer)

---

### 1. Database Setup (Supabase)
1.  Create a new project on [Supabase](https://supabase.com/).
2.  Go to the **SQL Editor** and execute the contents of [database/schema.sql](file:///D:/_CampusLife/ProjectCampus/6ProjectPribadi/DimeBox/database/schema.sql).
3.  Obtain your **Database URL** (Connection String), **Anon Public Key**, and **JWT Secret** from your project settings.

---

### 2. Backend Setup (FastAPI)
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create your local environment file:
    ```bash
    cp .env.example .env
    ```
3.  Configure your `.env` variables:
    ```env
    DATABASE_URL="postgresql://postgres:[password]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
    SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
    ```
4.  Install dependencies and start the backend using `uv`:
    ```bash
    uv sync
    uv run uvicorn app.main:app --reload --port 8000
    ```
    The Swagger documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 3. Frontend Setup (React)
1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Create your local environment file:
    ```bash
    cp .env.example .env
    ```
3.  Configure your `.env` variables:
    ```env
    VITE_SUPABASE_URL="https://your-project-id.supabase.co"
    VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
    VITE_API_URL="http://localhost:8000"
    
    # Optional Cloudinary Credentials for Camera uploads
    VITE_CLOUDINARY_CLOUD_NAME="your-cloud-name"
    VITE_CLOUDINARY_UPLOAD_PRESET="your-upload-preset"
    ```
4.  Install dependencies and start the Vite dev server:
    ```bash
    npm install
    npm run dev
    ```
    Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## 📴 Offline PWA & Optimization

DimeBox is equipped with a custom-built service worker located at [frontend/public/sw.js](file:///D:/_CampusLife/ProjectCampus/6ProjectPribadi/DimeBox/frontend/public/sw.js) to support **Read-Only Offline Mode**:
*   **Static Assets:** Cached on first load. The app is fully accessible offline.
*   **API Caching:** GET requests are cached. If the user is offline (e.g. in the wilderness), the app falls back to the cached list of items, gear, and packing checklists.
*   **Write Restriction:** To prevent synchronization conflicts, editing/adding items or packing checkmarks is disabled when offline.

---

## 📦 Deployment

Seluruh monorepo **DimeBox** (Frontend & Backend) dideploy bersama-sama di **satu project Vercel** secara otomatis menggunakan file [vercel.json](file:///D:/_CampusLife/ProjectCampus/6ProjectPribadi/DimeBox/vercel.json) di root:

1.  Hubungkan repositori GitHub kamu ke Vercel.
2.  Atur **Root Directory** ke `/` (default).
3.  Pilih **Framework Preset**: `Other`.
4.  Masukkan seluruh Environment Variables (`DATABASE_URL`, `SUPABASE_JWT_SECRET`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5.  Klik **Deploy**. Frontend akan ter-hosting secara statis, dan backend API otomatis aktif di bawah path `/api/*`.

Untuk panduan lengkap, lihat [DEPLOYMENT.md](file:///D:/_CampusLife/ProjectCampus/6ProjectPribadi/DimeBox/DEPLOYMENT.md).

---

## 📂 Project Structure

```
DimeBox/
├── backend/                  # FastAPI Backend
│   ├── app/
│   │   ├── routers/          # API Routers (items, tags, outfits, trips)
│   │   ├── auth.py           # Supabase JWT authentication dependency
│   │   ├── config.py         # Pydantic settings configuration
│   │   ├── database.py       # Asynchronous connection pooling
│   │   ├── main.py           # FastAPI main app and exception handlers
│   │   └── schemas.py        # Pydantic validation models
│   ├── requirements.txt
│   └── pyproject.toml
├── database/
│   └── schema.sql            # Core PostgreSQL schema & RLS policies
└── frontend/                 # React Frontend
    ├── public/
    │   ├── favicon.svg       # Isometric holographic favicon
    │   └── sw.js             # Service Worker for Offline PWA
    ├── src/
    │   ├── components/       # Reusable components (ItemCard, ItemModal, QuestModal)
    │   ├── context/          # Supabase AuthContext
    │   ├── pages/            # View pages (Dashboard, Wardrobe, Gear, Wishlist, Profile)
    │   ├── utils/            # Utilities (durability.ts, harmony.ts, apiClient.ts)
    │   ├── App.tsx           # Layout wrapper (Sidebar/BottomNav)
    │   ├── index.css         # Glassmorphic RPG HUD design system
    │   └── main.tsx          # React mount point
    ├── package.json
    └── vite.config.ts
```

---

## 🤝 Partnership Info

*   **Architect:** Umam Hanif (Hans)
*   **AI Partner:** Gravi (Rav)
*   **Aesthetic Theme:** Cyberpunk Glassmorphism / RPG HUD.
