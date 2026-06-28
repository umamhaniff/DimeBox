import pytest
from uuid import UUID, uuid4

def test_get_outfits(client, mock_db):
    """
    Test retrieving all outfits for the user.
    """
    outfit_id = uuid4()
    item_id = uuid4()
    mock_db.fetch.return_value = [
        {
            "id": outfit_id,
            "user_id": UUID("12345678-1234-5678-1234-567812345678"),
            "name": "Summer WFC Set",
            "created_at": "2026-06-28T12:00:00Z",
            "items_json": [
                {
                    "id": str(item_id),
                    "user_id": "12345678-1234-5678-1234-567812345678",
                    "name": "Holographic Rain Jacket",
                    "category": "Wardrobe",
                    "status": "Owned",
                    "image_url": None,
                    "purchase_date": None,
                    "rating_worth": 5,
                    "review": None,
                    "dominant_color": "#00ffff",
                    "expiry_reminder_months": None,
                    "wardrobe_class": "Outer",
                    "created_at": "2026-06-28T12:00:00Z",
                    "tags": []
                }
            ]
        }
    ]
    
    response = client.get("/outfits")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Summer WFC Set"
    assert len(data[0]["items"]) == 1
    assert data[0]["items"][0]["id"] == str(item_id)

def test_create_outfit(client, mock_db):
    """
    Test saving a new outfit combination.
    """
    outfit_id = uuid4()
    item_id1 = uuid4()
    item_id2 = uuid4()
    
    # 1. Verify items belong to user returns verified ids
    mock_db.fetch.side_effect = [
        [{"id": item_id1}, {"id": item_id2}]  # Verification check
    ]
    
    # 2. Insert outfit and get_outfit
    mock_db.fetchrow.side_effect = [
        {"id": outfit_id},  # Insert outfit RETURNING id
        {                   # get_outfit query
            "id": outfit_id,
            "user_id": UUID("12345678-1234-5678-1234-567812345678"),
            "name": "Rainy Quest Outfit",
            "created_at": "2026-06-28T12:00:00Z",
            "items_json": "[]"
        }
    ]
    mock_db.execute.return_value = "INSERT 0 2"
    
    payload = {
        "name": "Rainy Quest Outfit",
        "item_ids": [str(item_id1), str(item_id2)]
    }
    
    response = client.post("/outfits", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Rainy Quest Outfit"
    assert data["id"] == str(outfit_id)

def test_delete_outfit(client, mock_db):
    """
    Test deleting an outfit.
    """
    outfit_id = uuid4()
    mock_db.fetchval.return_value = 1  # Outfit exists and belongs to user
    mock_db.execute.return_value = "DELETE 1"
    
    response = client.delete(f"/outfits/{outfit_id}")
    assert response.status_code == 204
    mock_db.execute.assert_called_once_with("DELETE FROM outfits WHERE id = $1", outfit_id)
