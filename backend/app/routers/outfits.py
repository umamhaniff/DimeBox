from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from typing import List
import asyncpg
import json
from app.database import get_db
from app.auth import get_current_user_id
from app.schemas import OutfitCreate, OutfitResponse

router = APIRouter(prefix="/outfits", tags=["Outfits (OOTD Lab)"])

@router.get("", response_model=List[OutfitResponse])
async def get_outfits(
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieve all outfits belonging to the authenticated user.
    Uses nested JSON aggregation to pull outfits, items, and item tags in one query.
    """
    query = """
        SELECT o.id, o.user_id, o.name, o.created_at,
               COALESCE(
                   json_agg(
                       json_build_object(
                           'id', i.id,
                           'user_id', i.user_id,
                           'name', i.name,
                           'category', i.category,
                           'status', i.status,
                           'image_url', i.image_url,
                           'purchase_date', to_char(i.purchase_date, 'YYYY-MM-DD'),
                           'rating_worth', i.rating_worth,
                           'review', i.review,
                           'dominant_color', i.dominant_color,
                           'expiry_reminder_months', i.expiry_reminder_months,
                           'wardrobe_class', i.wardrobe_class,
                           'created_at', to_char(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                           'tags', COALESCE(
                               (SELECT json_agg(
                                           json_build_object(
                                               'id', t.id, 
                                               'user_id', t.user_id, 
                                               'name', t.name, 
                                               'created_at', to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                                           )
                                       )
                                FROM item_tags it
                                JOIN tags t ON it.tag_id = t.id
                                WHERE it.item_id = i.id),
                               '[]'::json
                           )
                       )
                   ) FILTER (WHERE i.id IS NOT NULL),
                   '[]'::json
               ) as items_json
        FROM outfits o
        LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
        LEFT JOIN items i ON oi.item_id = i.id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
    """
    rows = await db.fetch(query, user_id)
    outfits = []
    for row in rows:
        outfit_data = dict(row)
        items_data = outfit_data.pop("items_json")
        outfit_data["items"] = json.loads(items_data) if isinstance(items_data, str) else items_data
        outfits.append(outfit_data)
    return outfits

@router.get("/{outfit_id}", response_model=OutfitResponse)
async def get_outfit(
    outfit_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieve a specific outfit by ID.
    """
    query = """
        SELECT o.id, o.user_id, o.name, o.created_at,
               COALESCE(
                   json_agg(
                       json_build_object(
                           'id', i.id,
                           'user_id', i.user_id,
                           'name', i.name,
                           'category', i.category,
                           'status', i.status,
                           'image_url', i.image_url,
                           'purchase_date', to_char(i.purchase_date, 'YYYY-MM-DD'),
                           'rating_worth', i.rating_worth,
                           'review', i.review,
                           'dominant_color', i.dominant_color,
                           'expiry_reminder_months', i.expiry_reminder_months,
                           'wardrobe_class', i.wardrobe_class,
                           'created_at', to_char(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                           'tags', COALESCE(
                               (SELECT json_agg(
                                           json_build_object(
                                               'id', t.id, 
                                               'user_id', t.user_id, 
                                               'name', t.name, 
                                               'created_at', to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                                           )
                                       )
                                FROM item_tags it
                                JOIN tags t ON it.tag_id = t.id
                                WHERE it.item_id = i.id),
                               '[]'::json
                           )
                       )
                   ) FILTER (WHERE i.id IS NOT NULL),
                   '[]'::json
               ) as items_json
        FROM outfits o
        LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
        LEFT JOIN items i ON oi.item_id = i.id
        WHERE o.id = $1 AND o.user_id = $2
        GROUP BY o.id
    """
    row = await db.fetchrow(query, outfit_id, user_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found or unauthorized access"
        )
    outfit_data = dict(row)
    items_data = outfit_data.pop("items_json")
    outfit_data["items"] = json.loads(items_data) if isinstance(items_data, str) else items_data
    return outfit_data

@router.post("", response_model=OutfitResponse, status_code=status.HTTP_201_CREATED)
async def create_outfit(
    outfit_in: OutfitCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Create a new outfit and link the specified items.
    Validates that all items belong to the user.
    """
    if not outfit_in.item_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An outfit must contain at least one item."
        )

    async with db.transaction():
        # 1. Verify all items belong to the user
        verify_query = "SELECT id FROM items WHERE id = ANY($1) AND user_id = $2"
        verified_rows = await db.fetch(verify_query, outfit_in.item_ids, user_id)
        if len(verified_rows) != len(outfit_in.item_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more item IDs are invalid or unauthorized"
            )

        # 2. Insert outfit
        insert_outfit_query = """
            INSERT INTO outfits (user_id, name)
            VALUES ($1, $2)
            RETURNING id, user_id, name, created_at
        """
        outfit_row = await db.fetchrow(insert_outfit_query, user_id, outfit_in.name.strip())
        outfit_id = outfit_row["id"]

        # 3. Link outfit items
        insert_links = """
            INSERT INTO outfit_items (outfit_id, item_id)
            SELECT $1, unnest($2::uuid[])
        """
        await db.execute(insert_links, outfit_id, outfit_in.item_ids)

        return await get_outfit(outfit_id, user_id, db)

@router.delete("/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_outfit(
    outfit_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Delete an outfit. Cascading deletes will clean up the outfit_items links.
    """
    check_query = "SELECT 1 FROM outfits WHERE id = $1 AND user_id = $2"
    exists = await db.fetchval(check_query, outfit_id, user_id)
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outfit not found or unauthorized access"
        )
    await db.execute("DELETE FROM outfits WHERE id = $1", outfit_id)
    return None
