from fastapi import APIRouter, Depends, HTTPException, status, Query
from uuid import UUID
from typing import List, Optional
import asyncpg
import json
from datetime import date
from app.database import get_db
from app.auth import get_current_user_id
from app.schemas import ItemCreate, ItemResponse, ItemUpdate, ItemStatus, ItemCategory, WishlistLinkCreate

router = APIRouter(prefix="/items", tags=["Items (Vault)"])

@router.get("", response_model=List[ItemResponse])
async def get_items(
    category: Optional[ItemCategory] = None,
    status_filter: Optional[ItemStatus] = None,
    tag_name: Optional[str] = None,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieve all items belonging to the authenticated user.
    Supports filtering by category, status, and tag name.
    Uses PostgreSQL subqueries with JSON aggregation to fetch items, their tags, and wishlist links in a single query.
    """
    # Base query with high-performance subqueries for tags and wishlist links
    query = """
        SELECT i.id, i.user_id, i.name, i.category, i.status, i.image_url, 
               i.purchase_date, i.rating_worth, i.review, i.dominant_color, 
               i.expiry_reminder_months, i.wardrobe_class, i.created_at,
               (
                   SELECT COALESCE(
                       json_agg(
                           json_build_object(
                               'id', t.id, 
                               'user_id', t.user_id, 
                               'name', t.name, 
                               'created_at', to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                           )
                       ), 
                       '[]'::json
                   )
                   FROM item_tags it
                   JOIN tags t ON it.tag_id = t.id
                   WHERE it.item_id = i.id
               ) as tags_json,
               (
                   SELECT COALESCE(
                       json_agg(
                           json_build_object(
                               'id', wl.id, 
                               'item_id', wl.item_id, 
                               'url_link', wl.url_link, 
                               'price', wl.price, 
                               'is_cheapest', wl.is_cheapest, 
                               'spec_note', wl.spec_note, 
                               'created_at', to_char(wl.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                           ) ORDER BY wl.price ASC
                       ), 
                       '[]'::json
                   )
                   FROM wishlist_links wl
                   WHERE wl.item_id = i.id
               ) as wishlist_links_json
        FROM items i
        WHERE i.user_id = $1
    """
    
    params = [user_id]
    param_idx = 2
    
    # Dynamic filters
    if category:
        query += f" AND i.category = ${param_idx}"
        params.append(category.value)
        param_idx += 1
        
    if status_filter:
        query += f" AND i.status = ${param_idx}"
        params.append(status_filter.value)
        param_idx += 1

    query += " ORDER BY i.created_at DESC"
    
    rows = await db.fetch(query, *params)
    
    items = []
    for row in rows:
        item_data = dict(row)
        
        # Parse tags
        tags_data = item_data.pop("tags_json")
        if isinstance(tags_data, str):
            item_data["tags"] = json.loads(tags_data)
        else:
            item_data["tags"] = tags_data
            
        # Parse wishlist links
        links_data = item_data.pop("wishlist_links_json")
        if isinstance(links_data, str):
            item_data["wishlist_links"] = json.loads(links_data)
        else:
            item_data["wishlist_links"] = links_data
            
        # Optional: Filter by tag name in python if requested
        if tag_name:
            has_tag = any(t["name"].lower() == tag_name.lower() for t in item_data["tags"])
            if not has_tag:
                continue
                
        items.append(item_data)
        
    return items

@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieve a specific item by ID.
    """
    query = """
        SELECT i.id, i.user_id, i.name, i.category, i.status, i.image_url, 
               i.purchase_date, i.rating_worth, i.review, i.dominant_color, 
               i.expiry_reminder_months, i.wardrobe_class, i.created_at,
               (
                   SELECT COALESCE(
                       json_agg(
                           json_build_object(
                               'id', t.id, 
                               'user_id', t.user_id, 
                               'name', t.name, 
                               'created_at', to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                           )
                       ), 
                       '[]'::json
                   )
                   FROM item_tags it
                   JOIN tags t ON it.tag_id = t.id
                   WHERE it.item_id = i.id
               ) as tags_json,
               (
                   SELECT COALESCE(
                       json_agg(
                           json_build_object(
                               'id', wl.id, 
                               'item_id', wl.item_id, 
                               'url_link', wl.url_link, 
                               'price', wl.price, 
                               'is_cheapest', wl.is_cheapest, 
                               'spec_note', wl.spec_note, 
                               'created_at', to_char(wl.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                           ) ORDER BY wl.price ASC
                       ), 
                       '[]'::json
                   )
                   FROM wishlist_links wl
                   WHERE wl.item_id = i.id
               ) as wishlist_links_json
        FROM items i
        WHERE i.id = $1 AND i.user_id = $2
    """
    row = await db.fetchrow(query, item_id, user_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or unauthorized access"
        )
        
    item_data = dict(row)
    tags_data = item_data.pop("tags_json")
    item_data["tags"] = json.loads(tags_data) if isinstance(tags_data, str) else tags_data
    
    links_data = item_data.pop("wishlist_links_json")
    item_data["wishlist_links"] = json.loads(links_data) if isinstance(links_data, str) else links_data
    
    return item_data

@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_in: ItemCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Create a new item in the vault. If tag_ids or wishlist_links are provided, links them.
    """
    # Start a transaction to ensure atomicity
    async with db.transaction():
        # 1. Insert the item
        insert_item_query = """
            INSERT INTO items (
                user_id, name, category, status, image_url, purchase_date, 
                rating_worth, review, dominant_color, expiry_reminder_months,
                wardrobe_class
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        """
        item_row = await db.fetchrow(
            insert_item_query,
            user_id,
            item_in.name.strip(),
            item_in.category.value,
            item_in.status.value,
            item_in.image_url,
            item_in.purchase_date,
            item_in.rating_worth,
            item_in.review,
            item_in.dominant_color,
            item_in.expiry_reminder_months,
            item_in.wardrobe_class.value if item_in.wardrobe_class else None
        )
        item_id = item_row["id"]

        # 2. Link tags if provided
        if item_in.tag_ids:
            verify_query = "SELECT id FROM tags WHERE id = ANY($1) AND user_id = $2"
            verified_tag_rows = await db.fetch(verify_query, item_in.tag_ids, user_id)
            
            if len(verified_tag_rows) != len(item_in.tag_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more tag IDs are invalid or unauthorized"
                )
                
            insert_tag_links = """
                INSERT INTO item_tags (item_id, tag_id)
                SELECT $1, unnest($2::uuid[])
            """
            await db.execute(insert_tag_links, item_id, item_in.tag_ids)
            
        # 3. Insert wishlist links if provided (and status is Wishlist)
        if item_in.status == ItemStatus.WISHLIST and item_in.wishlist_links:
            # Sort links by price to calculate cheapest
            sorted_links = sorted(item_in.wishlist_links, key=lambda l: l.price)
            for idx, link in enumerate(sorted_links):
                is_cheapest = (idx == 0)
                insert_link_query = """
                    INSERT INTO wishlist_links (item_id, url_link, price, is_cheapest, spec_note)
                    VALUES ($1, $2, $3, $4, $5)
                """
                await db.execute(
                    insert_link_query,
                    item_id,
                    link.url_link.strip(),
                    link.price,
                    is_cheapest,
                    link.spec_note.strip() if link.spec_note else None
                )
            
        # Fetch and return the fully populated item via get_item
        return await get_item(item_id, user_id, db)

@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: UUID,
    item_in: ItemUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Update an item. Supports updating details, re-linking tags, and re-linking wishlist links.
    """
    async with db.transaction():
        # Check ownership
        check_query = "SELECT status FROM items WHERE id = $1 AND user_id = $2"
        existing_status = await db.fetchval(check_query, item_id, user_id)
        if not existing_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found or unauthorized access"
            )

        # Build dynamic update query
        update_fields = []
        params = []
        param_idx = 1
        
        # Mapping incoming fields
        updatable = [
            ("name", item_in.name),
            ("category", item_in.category),
            ("status", item_in.status),
            ("image_url", item_in.image_url),
            ("purchase_date", item_in.purchase_date),
            ("rating_worth", item_in.rating_worth),
            ("review", item_in.review),
            ("dominant_color", item_in.dominant_color),
            ("expiry_reminder_months", item_in.expiry_reminder_months),
            ("wardrobe_class", item_in.wardrobe_class)
        ]
        
        for col, val in updatable:
            if val is not None:
                update_fields.append(f"{col} = ${param_idx}")
                params.append(val.value if hasattr(val, 'value') else val)
                param_idx += 1
                
        if update_fields:
            query = f"UPDATE items SET {', '.join(update_fields)} WHERE id = ${param_idx} AND user_id = ${param_idx+1}"
            params.extend([item_id, user_id])
            await db.execute(query, *params)

        # Handle tags update if provided
        if item_in.tag_ids is not None:
            await db.execute("DELETE FROM item_tags WHERE item_id = $1", item_id)
            
            if item_in.tag_ids:
                verify_query = "SELECT id FROM tags WHERE id = ANY($1) AND user_id = $2"
                verified_ids = await db.fetch(verify_query, item_in.tag_ids, user_id)
                if len(verified_ids) != len(item_in.tag_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="One or more tag IDs are invalid or unauthorized"
                    )
                
                insert_tag_links = """
                    INSERT INTO item_tags (item_id, tag_id)
                    SELECT $1, unnest($2::uuid[])
                """
                await db.execute(insert_tag_links, item_id, item_in.tag_ids)

        # Handle wishlist links update if provided
        if item_in.wishlist_links is not None:
            await db.execute("DELETE FROM wishlist_links WHERE item_id = $1", item_id)
            
            # If new links are provided and the item status is currently Wishlist (or updating to Wishlist)
            target_status = item_in.status.value if item_in.status else existing_status
            if target_status == "Wishlist" and item_in.wishlist_links:
                sorted_links = sorted(item_in.wishlist_links, key=lambda l: l.price)
                for idx, link in enumerate(sorted_links):
                    is_cheapest = (idx == 0)
                    insert_link_query = """
                        INSERT INTO wishlist_links (item_id, url_link, price, is_cheapest, spec_note)
                        VALUES ($1, $2, $3, $4, $5)
                    """
                    await db.execute(
                        insert_link_query,
                        item_id,
                        link.url_link.strip(),
                        link.price,
                        is_cheapest,
                        link.spec_note.strip() if link.spec_note else None
                    )

        # Fetch and return fully updated item
        return await get_item(item_id, user_id, db)

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Delete an item from the vault. Cascade deletes will clean up tags/links.
    """
    check_query = "SELECT 1 FROM items WHERE id = $1 AND user_id = $2"
    exists = await db.fetchval(check_query, item_id, user_id)
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or unauthorized access"
        )
        
    await db.execute("DELETE FROM items WHERE id = $1", item_id)
    return None

@router.post("/{item_id}/buy", response_model=ItemResponse)
async def buy_wishlist_item(
    item_id: UUID,
    purchase_date: date,
    rating_worth: int = Query(..., ge=1, le=5),
    review: Optional[str] = None,
    image_url: Optional[str] = None,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    The Conversion Event (Saya Beli): Converts a Wishlist item to Owned status.
    Requires inputting purchase details, a worth-it rating, and optionally a new physical photo URL.
    """
    async with db.transaction():
        # Check ownership and status
        check_query = "SELECT status FROM items WHERE id = $1 AND user_id = $2"
        current_status = await db.fetchval(check_query, item_id, user_id)
        if not current_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found or unauthorized access"
            )
            
        if current_status != "Wishlist":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only wishlist items can be converted to owned status"
            )
            
        # Perform the conversion update
        update_query = """
            UPDATE items
            SET status = 'Owned',
                purchase_date = $1,
                rating_worth = $2,
                review = $3,
                image_url = COALESCE($4, image_url)
            WHERE id = $5 AND user_id = $6
        """
        await db.execute(
            update_query,
            purchase_date,
            rating_worth,
            review,
            image_url,
            item_id,
            user_id
        )
        
        return await get_item(item_id, user_id, db)

