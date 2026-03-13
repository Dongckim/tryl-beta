"""Product route tests."""

from fastapi.testclient import TestClient


def test_resolve_product_create(client: TestClient) -> None:
    """POST /products/resolve creates product when not found."""
    r = client.post(
        "/products/resolve",
        json={
            "sourceSite": "zara",
            "sourceUrl": "https://www.zara.com/us/test-shirt-001",
            "title": "Test Shirt",
            "imageUrl": "https://cdn.zara.com/shirt.jpg",
            "brand": "Zara",
            "categoryHint": "shirts",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "productId" in data
    assert data["sourceSite"] == "zara"
    assert data["title"] == "Test Shirt"
    assert data["category"] == "shirts"
    assert "canonicalImageUrl" in data


def test_resolve_product_existing(client: TestClient) -> None:
    """POST /products/resolve returns existing product for same source_url."""
    url = "https://www.zara.com/us/duplicate-test-001"
    client.post(
        "/products/resolve",
        json={
            "sourceSite": "zara",
            "sourceUrl": url,
            "title": "First",
            "imageUrl": "https://a.com/1.jpg",
        },
    )
    r = client.post(
        "/products/resolve",
        json={
            "sourceSite": "zara",
            "sourceUrl": url,
            "title": "Second",
            "imageUrl": "https://b.com/2.jpg",
        },
    )
    assert r.status_code == 200
    # Should return same product (first one's data)
    assert r.json()["title"] == "First"
