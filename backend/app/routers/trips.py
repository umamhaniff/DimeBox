from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from typing import List
import asyncpg
import json
from app.database import get_db
from app.auth import get_current_user_id
from app.schemas import TripCreate, TripResponse, TripItemUpdate

router = APIRouter(prefix="/trips", tags=["Trips (Quest Log)"])

@router.get("", response_model=List[TripResponse])
async def get_trips(
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieve all quests/trips for the authenticated user, with packed item checklists.
    """
    query = """
        SELECT t.id, t.user_id, t.trip_name, t.created_at,
               COALESCE(
                   json_agg(
                       json_build_object(
                           'is_packed', ti.is_packed,
                           'item', json_build_object(
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
                                                   'id', tag.id, 
                                                   'user_id', tag.user_id, 
                                                   'name', tag.name, 
                                                   'created_at', to_char(tag.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                                               )
                                           )
                                    FROM item_tags it
                                    JOIN tags tag ON it.tag_id = tag.id
                                    WHERE it.item_id = i.id),
                                   '[]'::json
                               )
                           )
                       )
                   ) FILTER (WHERE i.id IS NOT NULL),
                   '[]'::json
               ) as trip_items_json
        FROM trips t
        LEFT JOIN trip_items ti ON t.id = ti.trip_id
        LEFT JOIN items i ON ti.item_id = i.id
        WHERE t.user_id = $1
        GROUP BY t.id
        ORDER BY t.created_at DESC
    """
    rows = await db.fetch(query, user_id)
    trips = []
    for row in rows:
        trip_data = dict(row)
        items_data = trip_data.pop("trip_items_json")
        trip_data["trip_items"] = json.loads(items_data) if isinstance(items_data, str) else items_data
        trips.append(trip_data)
    return trips

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieve a specific trip checklist by ID.
    """
    query = """
        SELECT t.id, t.user_id, t.trip_name, t.created_at,
               COALESCE(
                   json_agg(
                       json_build_object(
                           'is_packed', ti.is_packed,
                           'item', json_build_object(
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
                                                   'id', tag.id, 
                                                   'user_id', tag.user_id, 
                                                   'name', tag.name, 
                                                   'created_at', to_char(tag.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                                               )
                                           )
                                    FROM item_tags it
                                    JOIN tags tag ON it.tag_id = tag.id
                                    WHERE it.item_id = i.id),
                                   '[]'::json
                               )
                           )
                       )
                   ) FILTER (WHERE i.id IS NOT NULL),
                   '[]'::json
               ) as trip_items_json
        FROM trips t
        LEFT JOIN trip_items ti ON t.id = ti.trip_id
        LEFT JOIN items i ON ti.item_id = i.id
        WHERE t.id = $1 AND t.user_id = $2
        GROUP BY t.id
    """
    row = await db.fetchrow(query, trip_id, user_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or unauthorized access"
        )
    trip_data = dict(row)
    items_data = trip_data.pop("trip_items_json")
    trip_data["trip_items"] = json.loads(items_data) if isinstance(items_data, str) else items_data
    return trip_data

@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_in: TripCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Create a new quest/trip and populate initial equipment slots.
    """
    async with db.transaction():
        # 1. Insert trip
        insert_trip_query = """
            INSERT INTO trips (user_id, trip_name)
            VALUES ($1, $2)
            RETURNING id, user_id, trip_name, created_at
        """
        trip_row = await db.fetchrow(insert_trip_query, user_id, trip_in.trip_name.strip())
        trip_id = trip_row["id"]

        # 2. Add equipment slots if provided
        if trip_in.item_ids:
            # Verify items belong to the user
            verify_query = "SELECT id FROM items WHERE id = ANY($1) AND user_id = $2"
            verified_rows = await db.fetch(verify_query, trip_in.item_ids, user_id)
            if len(verified_rows) != len(trip_in.item_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more item IDs are invalid or unauthorized"
                )

            # Insert slot records
            insert_slots = """
                INSERT INTO trip_items (trip_id, item_id, is_packed)
                SELECT $1, unnest($2::uuid[]), FALSE
                ON CONFLICT (trip_id, item_id) DO NOTHING
            """
            await db.execute(insert_slots, trip_id, trip_in.item_ids)

        return await get_trip(trip_id, user_id, db)

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Delete a trip. Cascading deletes will clean up trip_items slot registries automatically.
    """
    check_query = "SELECT 1 FROM trips WHERE id = $1 AND user_id = $2"
    exists = await db.fetchval(check_query, trip_id, user_id)
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or unauthorized access"
        )
    await db.execute("DELETE FROM trips WHERE id = $1", trip_id)
    return None

@router.patch("/{trip_id}/items/{item_id}", response_model=TripResponse)
async def update_trip_item_status(
    trip_id: UUID,
    item_id: UUID,
    status_in: TripItemUpdate,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Toggle or update the packing status of a specific item in a trip.
    """
    # Verify trip belongs to user
    trip_check = "SELECT 1 FROM trips WHERE id = $1 AND user_id = $2"
    trip_exists = await db.fetchval(trip_check, trip_id, user_id)
    if not trip_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or unauthorized access"
        )

    # Update packing status
    update_query = """
        UPDATE trip_items
        SET is_packed = $1
        WHERE trip_id = $2 AND item_id = $3
    """
    result = await db.execute(update_query, status_in.is_packed, trip_id, item_id)
    
    # Check if a row was actually updated
    if result == "UPDATE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not registered in this trip's equipment slots"
        )

    return await get_trip(trip_id, user_id, db)

@router.post("/{trip_id}/items", response_model=TripResponse)
async def add_items_to_trip(
    trip_id: UUID,
    item_ids: List[UUID],
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Dynamically register additional equipment items into a trip's packing checklist.
    """
    # Verify trip belongs to user
    trip_check = "SELECT 1 FROM trips WHERE id = $1 AND user_id = $2"
    trip_exists = await db.fetchval(trip_check, trip_id, user_id)
    if not trip_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or unauthorized access"
        )

    if not item_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="List of item IDs cannot be empty"
        )

    async with db.transaction():
        # Verify all items belong to user
        verify_query = "SELECT id FROM items WHERE id = ANY($1) AND user_id = $2"
        verified_rows = await db.fetch(verify_query, item_ids, user_id)
        if len(verified_rows) != len(item_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more item IDs are invalid or unauthorized"
            )

        # Insert links
        insert_slots = """
            INSERT INTO trip_items (trip_id, item_id, is_packed)
            SELECT $1, unnest($2::uuid[]), FALSE
            ON CONFLICT (trip_id, item_id) DO NOTHING
        """
        await db.execute(insert_slots, trip_id, item_ids)

    return await get_trip(trip_id, user_id, db)

@router.delete("/{trip_id}/items/{item_id}", response_model=TripResponse)
async def remove_item_from_trip(
    trip_id: UUID,
    item_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Remove an equipment item from a trip's packing checklist.
    """
    # Verify trip belongs to user
    trip_check = "SELECT 1 FROM trips WHERE id = $1 AND user_id = $2"
    trip_exists = await db.fetchval(trip_check, trip_id, user_id)
    if not trip_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or unauthorized access"
        )

    # Delete link
    await db.execute(
        "DELETE FROM trip_items WHERE trip_id = $1 AND item_id = $2",
        trip_id,
        item_id
    )

    return await get_trip(trip_id, user_id, db)
