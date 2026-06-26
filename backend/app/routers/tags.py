from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from typing import List
import asyncpg
from app.database import get_db
from app.auth import get_current_user_id
from app.schemas import TagCreate, TagResponse

router = APIRouter(prefix="/tags", tags=["Tags (Elements)"])

@router.get("", response_model=List[TagResponse])
async def get_tags(
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Retrieve all tags belonging to the authenticated user.
    """
    query = "SELECT id, user_id, name, created_at FROM tags WHERE user_id = $1 ORDER BY name ASC"
    rows = await db.fetch(query, user_id)
    return [dict(row) for row in rows]

@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_in: TagCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Create a new flat tag for the authenticated user.
    Names are unique per user.
    """
    # Normalize name to title case or strip whitespace
    normalized_name = tag_in.name.strip()
    
    query = """
        INSERT INTO tags (user_id, name)
        VALUES ($1, $2)
        RETURNING id, user_id, name, created_at
    """
    try:
        row = await db.fetchrow(query, user_id, normalized_name)
        return dict(row)
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tag '{normalized_name}' already exists in your vault"
        )

@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """
    Delete a specific tag. Cascade rules in DB will automatically detach it from any items.
    """
    # Check ownership
    check_query = "SELECT 1 FROM tags WHERE id = $1 AND user_id = $2"
    exists = await db.fetchval(check_query, tag_id, user_id)
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found or unauthorized access"
        )
        
    delete_query = "DELETE FROM tags WHERE id = $1"
    await db.execute(delete_query, tag_id)
    return None
