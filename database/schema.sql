-- ============================================================================
-- DimeBox - Database Schema & Row Level Security (RLS) Migration Script
-- Target Database: Supabase PostgreSQL
-- ============================================================================

-- 1. ENUMS
CREATE TYPE item_category AS ENUM ('Wardrobe', 'Gear', 'Toiletries');
CREATE TYPE item_status AS ENUM ('Owned', 'Wishlist');

-- 2. CORE TABLES

-- Table: items (The Item Box Vault)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: tags (Flat Classification System)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Table: item_tags (Junction Table for Multi-Tagging)
CREATE TABLE item_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(item_id, tag_id)
);

-- Table: wishlist_links (The Bounty Radar)
CREATE TABLE wishlist_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    url_link TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    is_cheapest BOOLEAN DEFAULT FALSE,
    spec_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: trips (Quest Log)
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: trip_items (Equipment Slot)
CREATE TABLE trip_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    is_packed BOOLEAN DEFAULT FALSE,
    UNIQUE(trip_id, item_id)
);

-- Table: outfits (OOTD Lab Combinations)
CREATE TABLE outfits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: outfit_items (Junction Table for Outfit Pieces)
CREATE TABLE outfit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE(outfit_id, item_id)
);

-- ============================================================================
-- 3. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);
CREATE INDEX idx_wishlist_links_item_id ON wishlist_links(item_id);
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trip_items_trip_id ON trip_items(trip_id);
CREATE INDEX idx_outfits_user_id ON outfits(user_id);
CREATE INDEX idx_outfit_items_outfit_id ON outfit_items(outfit_id);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;

-- 4.1 RLS Policies for 'items'
CREATE POLICY "Users can manage their own items" ON items
    FOR ALL USING (auth.uid() = user_id);

-- 4.2 RLS Policies for 'tags'
CREATE POLICY "Users can manage their own tags" ON tags
    FOR ALL USING (auth.uid() = user_id);

-- 4.3 RLS Policies for 'item_tags' (Depends on item ownership)
CREATE POLICY "Users can manage tags on their own items" ON item_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM items
            WHERE items.id = item_tags.item_id
            AND items.user_id = auth.uid()
        )
    );

-- 4.4 RLS Policies for 'wishlist_links' (Depends on item ownership)
CREATE POLICY "Users can manage links for their own wishlist items" ON wishlist_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM items
            WHERE items.id = wishlist_links.item_id
            AND items.user_id = auth.uid()
        )
    );

-- 4.5 RLS Policies for 'trips'
CREATE POLICY "Users can manage their own trips" ON trips
    FOR ALL USING (auth.uid() = user_id);

-- 4.6 RLS Policies for 'trip_items' (Depends on trip ownership)
CREATE POLICY "Users can manage items on their own trips" ON trip_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = trip_items.trip_id
            AND trips.user_id = auth.uid()
        )
    );

-- 4.7 RLS Policies for 'outfits'
CREATE POLICY "Users can manage their own outfits" ON outfits
    FOR ALL USING (auth.uid() = user_id);

-- 4.8 RLS Policies for 'outfit_items' (Depends on outfit ownership)
CREATE POLICY "Users can manage items in their own outfits" ON outfit_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outfits
            WHERE outfits.id = outfit_items.outfit_id
            AND outfits.user_id = auth.uid()
        )
    );
