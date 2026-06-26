from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum

# 1. ENUMS (matching database types)
class ItemCategory(str, Enum):
    WARDROBE = "Wardrobe"
    GEAR = "Gear"
    TOILETRIES = "Toiletries"

class ItemStatus(str, Enum):
    OWNED = "Owned"
    WISHLIST = "Wishlist"

class WardrobeClass(str, Enum):
    TOP = "Top"
    BOTTOM = "Bottom"
    OUTER = "Outer"
    SHOES = "Shoes"

# 2. TAG SCHEMAS
class TagBase(BaseModel):
    name: str = Field(..., max_length=50, description="Name of the tag")

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# 3. WISHLIST LINK SCHEMAS
class WishlistLinkBase(BaseModel):
    url_link: str = Field(..., description="Target shop or source URL link")
    price: float = Field(..., ge=0, description="Acquisition price of the item")
    spec_note: Optional[str] = Field(None, description="Specification notes or details")

class WishlistLinkCreate(WishlistLinkBase):
    pass

class WishlistLinkResponse(WishlistLinkBase):
    id: UUID
    item_id: UUID
    is_cheapest: bool
    created_at: datetime

    class Config:
        from_attributes = True

# 4. ITEM SCHEMAS
class ItemBase(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the physical item")
    category: ItemCategory
    status: ItemStatus
    image_url: Optional[str] = None
    purchase_date: Optional[date] = None
    rating_worth: Optional[int] = Field(None, ge=1, le=5, description="Worth-it rating (1-5)")
    review: Optional[str] = None
    dominant_color: Optional[str] = Field(None, max_length=50)
    expiry_reminder_months: Optional[int] = Field(None, description="Expiration or durability lifespan in months")
    wardrobe_class: Optional[WardrobeClass] = Field(None, description="Type of wardrobe piece (Top, Bottom, Outer, Shoes)")

class ItemCreate(ItemBase):
    tag_ids: Optional[List[UUID]] = Field(default_factory=list, description="Associated tag IDs")
    wishlist_links: Optional[List[WishlistLinkCreate]] = Field(default_factory=list, description="Associated wishlist links")

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    category: Optional[ItemCategory] = None
    status: Optional[ItemStatus] = None
    image_url: Optional[str] = None
    purchase_date: Optional[date] = None
    rating_worth: Optional[int] = Field(None, ge=1, le=5)
    review: Optional[str] = None
    dominant_color: Optional[str] = Field(None, max_length=50)
    expiry_reminder_months: Optional[int] = None
    wardrobe_class: Optional[WardrobeClass] = None
    tag_ids: Optional[List[UUID]] = None
    wishlist_links: Optional[List[WishlistLinkCreate]] = None

class ItemResponse(ItemBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    tags: List[TagResponse] = []
    wishlist_links: List[WishlistLinkResponse] = []

    class Config:
        from_attributes = True



# 4. OUTFIT SCHEMAS
class OutfitBase(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the outfit combination")

class OutfitCreate(OutfitBase):
    item_ids: List[UUID] = Field(..., description="List of item IDs forming the outfit")

class OutfitResponse(OutfitBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    items: List[ItemResponse] = []

    class Config:
        from_attributes = True


# 5. TRIP/QUEST SCHEMAS
class TripBase(BaseModel):
    trip_name: str = Field(..., max_length=255, description="Name of the quest/trip")

class TripCreate(TripBase):
    item_ids: Optional[List[UUID]] = Field(default_factory=list, description="Initial equipment slots for this trip")

class TripItemResponse(BaseModel):
    item: ItemResponse
    is_packed: bool

class TripResponse(TripBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    trip_items: List[TripItemResponse] = []

    class Config:
        from_attributes = True

class TripItemUpdate(BaseModel):
    is_packed: bool


