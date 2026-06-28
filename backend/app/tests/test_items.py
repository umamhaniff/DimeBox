import pytest
from uuid import UUID, uuid4
from unittest.mock import AsyncMock

def test_get_items_empty(client, mock_db):
    """
    Test retrieving items when the inventory is empty.
    """
    mock_db.fetch.return_value = []
    
    response = client.get("/items")
    assert response.status_code == 200
    assert response.json() == []
    
    # Verify the database was queried with the correct user ID
    mock_db.fetch.assert_called_once()
    args, _ = mock_db.fetch.call_args
    assert "FROM items i" in args[0]
    assert args[1] == UUID("12345678-1234-5678-1234-567812345678")

def test_get_items_populated(client, mock_db):
    """
    Test retrieving items when there are items in the vault.
    """
    item_id = str(uuid4())
    mock_db.fetch.return_value = [
        {
            "id": UUID(item_id),
            "user_id": UUID("12345678-1234-5678-1234-567812345678"),
            "name": "Holographic Rain Jacket",
            "category": "Wardrobe",
            "status": "Owned",
            "image_url": "http://cloudinary.com/jacket.jpg",
            "purchase_date": None,
            "rating_worth": 5,
            "review": "Legendary gear",
            "dominant_color": "#00ffff",
            "expiry_reminder_months": None,
            "wardrobe_class": "Outer",
            "created_at": "2026-06-28T12:00:00Z",
            "tags_json": '[{"id": "a6b7c8d9-1234-5678-1234-567812345678", "user_id": "12345678-1234-5678-1234-567812345678", "name": "WFC", "created_at": "2026-06-28T12:00:00Z"}]',
            "wishlist_links_json": "[]"
        }
    ]
    
    response = client.get("/items")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Holographic Rain Jacket"
    assert data[0]["category"] == "Wardrobe"
    assert len(data[0]["tags"]) == 1
    assert data[0]["tags"][0]["name"] == "WFC"

def test_get_item_not_found(client, mock_db):
    """
    Test retrieving a non-existent item returns 404.
    """
    mock_db.fetchrow.return_value = None
    
    random_id = uuid4()
    response = client.get(f"/items/{random_id}")
    assert response.status_code == 404
    assert "Item not found" in response.json()["detail"]

def test_create_item(client, mock_db):
    """
    Test registering a new item.
    """
    item_id = UUID("87654321-4321-4321-4321-876543210987")
    
    # Mocking first the insert returning id, then the get_item query
    mock_db.fetchrow.side_effect = [
        {"id": item_id}, # For insert_item_query
        {                # For get_item inside create_item
            "id": item_id,
            "user_id": UUID("12345678-1234-5678-1234-567812345678"),
            "name": "Trail Runner Shoes",
            "category": "Wardrobe",
            "status": "Owned",
            "image_url": None,
            "purchase_date": "2026-06-01",
            "rating_worth": 4,
            "review": "Very comfortable",
            "dominant_color": "#ff00ff",
            "expiry_reminder_months": None,
            "wardrobe_class": "Shoes",
            "created_at": "2026-06-28T12:00:00Z",
            "tags_json": "[]",
            "wishlist_links_json": "[]"
        }
    ]
    
    payload = {
        "name": "Trail Runner Shoes",
        "category": "Wardrobe",
        "status": "Owned",
        "purchase_date": "2026-06-01",
        "rating_worth": 4,
        "review": "Very comfortable",
        "dominant_color": "#ff00ff",
        "wardrobe_class": "Shoes"
    }
    
    response = client.post("/items", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == str(item_id)
    assert data["name"] == "Trail Runner Shoes"
    assert data["wardrobe_class"] == "Shoes"

def test_update_item_details(client, mock_db):
    """
    Test patching item details (e.g. changing status).
    """
    item_id = uuid4()
    
    # Mocking status check, execute, and then fetchrow for get_item
    mock_db.fetchval.return_value = "Wishlist" # Existing status is Wishlist
    mock_db.execute.return_value = "UPDATE 1"
    mock_db.fetchrow.return_value = {
        "id": item_id,
        "user_id": UUID("12345678-1234-5678-1234-567812345678"),
        "name": "Trail Runner Shoes",
        "category": "Wardrobe",
        "status": "Owned", # Changed to Owned
        "image_url": "http://cloudinary.com/shoes.jpg",
        "purchase_date": "2026-06-28",
        "rating_worth": 5,
        "review": "Acquired!",
        "dominant_color": "#ff00ff",
        "expiry_reminder_months": None,
        "wardrobe_class": "Shoes",
        "created_at": "2026-06-28T12:00:00Z",
        "tags_json": "[]",
        "wishlist_links_json": "[]"
    }
    
    payload = {
        "status": "Owned",
        "purchase_date": "2026-06-28",
        "rating_worth": 5,
        "review": "Acquired!",
        "image_url": "http://cloudinary.com/shoes.jpg"
    }
    
    response = client.patch(f"/items/{item_id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Owned"
    assert data["rating_worth"] == 5
    assert data["review"] == "Acquired!"
