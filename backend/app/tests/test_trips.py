import pytest
from uuid import UUID, uuid4

def test_get_trips(client, mock_db):
    """
    Test retrieving all trips for the user.
    """
    trip_id = uuid4()
    item_id = uuid4()
    mock_db.fetch.return_value = [
        {
            "id": trip_id,
            "user_id": UUID("12345678-1234-5678-1234-567812345678"),
            "trip_name": "Mendaki Rinjani",
            "created_at": "2026-06-28T12:00:00Z",
            "trip_items_json": [
                {
                    "is_packed": False,
                    "item": {
                        "id": str(item_id),
                        "user_id": "12345678-1234-5678-1234-567812345678",
                        "name": "Camping Tent",
                        "category": "Gear",
                        "status": "Owned",
                        "image_url": None,
                        "purchase_date": None,
                        "rating_worth": 5,
                        "review": None,
                        "dominant_color": None,
                        "expiry_reminder_months": None,
                        "wardrobe_class": None,
                        "created_at": "2026-06-28T12:00:00Z",
                        "tags": []
                    }
                }
            ]
        }
    ]
    
    response = client.get("/trips")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["trip_name"] == "Mendaki Rinjani"
    assert len(data[0]["trip_items"]) == 1
    assert data[0]["trip_items"][0]["item"]["name"] == "Camping Tent"
    assert data[0]["trip_items"][0]["is_packed"] is False

def test_create_trip(client, mock_db):
    """
    Test creating a new trip/quest with initial equipment items.
    """
    trip_id = uuid4()
    item_id = uuid4()
    
    # 1. Insert trip RETURNING id
    mock_db.fetchrow.side_effect = [
        {"id": trip_id},  # Insert trip
        {                 # get_trip query
            "id": trip_id,
            "user_id": UUID("12345678-1234-5678-1234-567812345678"),
            "trip_name": "WFC Bali",
            "created_at": "2026-06-28T12:00:00Z",
            "trip_items_json": "[]"
        }
    ]
    
    # 2. Mock item verification check
    mock_db.fetch.return_value = [{"id": item_id}]
    mock_db.execute.return_value = "INSERT 0 1"
    
    payload = {
        "trip_name": "WFC Bali",
        "item_ids": [str(item_id)]
    }
    
    response = client.post("/trips", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["trip_name"] == "WFC Bali"
    assert data["id"] == str(trip_id)

def test_update_trip_item_status(client, mock_db):
    """
    Test toggling packing status of an item in a trip.
    """
    trip_id = uuid4()
    item_id = uuid4()
    
    # 1. Mock trip ownership check
    mock_db.fetchval.return_value = 1
    
    # 2. Mock update query returning UPDATE 1
    mock_db.execute.return_value = "UPDATE 1"
    
    # 3. Mock get_trip query
    mock_db.fetchrow.return_value = {
        "id": trip_id,
        "user_id": UUID("12345678-1234-5678-1234-567812345678"),
        "trip_name": "WFC Bali",
        "created_at": "2026-06-28T12:00:00Z",
        "trip_items_json": [
            {
                "is_packed": True, # Updated to True
                "item": {
                    "id": str(item_id),
                    "user_id": "12345678-1234-5678-1234-567812345678",
                    "name": "MacBook Pro",
                    "category": "Gear",
                    "status": "Owned",
                    "image_url": None,
                    "purchase_date": None,
                    "rating_worth": 5,
                    "review": None,
                    "dominant_color": None,
                    "expiry_reminder_months": None,
                    "wardrobe_class": None,
                    "created_at": "2026-06-28T12:00:00Z",
                    "tags": []
                }
            }
        ]
    }
    
    payload = {"is_packed": True}
    response = client.patch(f"/trips/{trip_id}/items/{item_id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["trip_items"][0]["is_packed"] is True
