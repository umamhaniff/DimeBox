import pytest
from uuid import UUID, uuid4

def test_get_tags(client, mock_db):
    """
    Test retrieving all tags for the user.
    """
    tag_id = uuid4()
    mock_db.fetch.return_value = [
        {
            "id": tag_id,
            "user_id": UUID("12345678-1234-5678-1234-567812345678"),
            "name": "WFC",
            "created_at": "2026-06-28T12:00:00Z"
        }
    ]
    
    response = client.get("/tags")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "WFC"
    assert data[0]["id"] == str(tag_id)

def test_create_tag(client, mock_db):
    """
    Test creating a new tag.
    """
    tag_id = uuid4()
    mock_db.fetchrow.return_value = {
        "id": tag_id,
        "user_id": UUID("12345678-1234-5678-1234-567812345678"),
        "name": "Mendaki",
        "created_at": "2026-06-28T12:00:00Z"
    }
    
    payload = {"name": "Mendaki"}
    response = client.post("/tags", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Mendaki"
    assert data["id"] == str(tag_id)

def test_delete_tag(client, mock_db):
    """
    Test deleting a tag.
    """
    tag_id = uuid4()
    mock_db.fetchval.return_value = 1  # Tag exists and belongs to user
    mock_db.execute.return_value = "DELETE 1"
    
    response = client.delete(f"/tags/{tag_id}")
    assert response.status_code == 204
    mock_db.execute.assert_called_once_with("DELETE FROM tags WHERE id = $1", tag_id)
