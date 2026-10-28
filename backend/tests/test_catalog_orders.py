import pytest

from apps.accounts.models import User
from tests.conftest import register

pytestmark = pytest.mark.django_db

ORDER = {
    "first_name": "Aïssatou",
    "last_name": "Ndiaye",
    "phone": "77 123 45 67",
    "shipping_method": "delivery_dakar",
    "address_zone": "Point E",
    "address_line": "Rue 4, villa 12",
    "payment_method": "wave",
    "accept_terms": True,
}


def test_list_filters_sorts_and_facets(api, catalog):
    body = api.get("/api/products/").json()
    assert body["total"] == 3
    assert {f["value"]: f["count"] for f in body["facets"]}["lessive"] == 1

    assert api.get("/api/products/", {"in_stock": "true"}).json()["total"] == 2

    promo = api.get("/api/products/", {"promo": "true"}).json()
    assert [p["slug"] for p in promo["items"]] == ["lessive-test"]
    assert promo["items"][0]["discount_percent"] == 17

    by_cat = api.get("/api/products/?category=beaute&category=lessive").json()
    assert by_cat["total"] == 2
    assert {f["value"]: f["count"] for f in by_cat["facets"]}["cosmetiques"] == 1  # facette ignore la catégorie

    asc = api.get("/api/products/", {"sort": "price_asc"}).json()
    assert [p["price"] for p in asc["items"]] == [3000, 5000, 9000]

    priced = api.get("/api/products/", {"min_price": 4000, "max_price": 6000}).json()
    assert [p["slug"] for p in priced["items"]] == ["lessive-test"]

    search = api.get("/api/products/", {"q": "cosmét"}).json()
    assert [p["slug"] for p in search["items"]] == ["creme-test"]


def test_product_detail_related_and_404(api, catalog):
    response = api.get("/api/products/creme-test/")
    assert response.status_code == 200
    assert response.json()["category_label"] == "Cosmétiques"
    assert len(api.get("/api/products/creme-test/related/").json()) == 2
    assert api.get("/api/products/inconnu/").status_code == 404


def test_catalog_is_read_only(api, catalog):
    assert api.post("/api/products/", {"name": "x"}).status_code in (401, 405)


def test_quote_uses_server_prices_and_promo(api, catalog):
    items = [{"variant_id": catalog["lessive"].id, "quantity": 2}]
    quote = api.post("/api/cart/quote/", {"items": items, "shipping_method": "delivery_dakar"}, format="json").json()
    assert (quote["subtotal"], quote["shipping_fee"], quote["total"]) == (10000, 2000, 12000)

    with_promo = api.post("/api/cart/quote/", {"items": items, "promo_code": "eclat10"}, format="json").json()
    assert (with_promo["discount"], with_promo["total"]) == (1000, 9000)

    too_small = api.post(
        "/api/cart/quote/",
        {"items": [{"variant_id": catalog["lessive"].id, "quantity": 1}], "promo_code": "ECLAT10"},
        format="json",
    )
    assert too_small.status_code == 422


def test_checkout_requires_an_account(api, catalog):
    payload = {**ORDER, "items": [{"variant_id": catalog["creme"].id, "quantity": 1}]}
    assert api.post("/api/orders/", payload, format="json").status_code == 401
    catalog["creme"].refresh_from_db()
    assert catalog["creme"].stock == 2  # aucun stock réservé par une tentative anonyme


def test_checkout_decrements_stock_and_guards_access(api, catalog):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {register(api)['access']}")
    payload = {**ORDER, "items": [{"variant_id": catalog["creme"].id, "quantity": 2}]}
    response = api.post("/api/orders/", payload, format="json")
    assert response.status_code == 201, response.content
    order = response.json()
    assert order["phone"] == "771234567"
    assert order["payment_status"] == "paid"
    assert order["total"] == 18000 + 2000

    catalog["creme"].refresh_from_db()
    assert catalog["creme"].stock == 0
    assert api.post("/api/orders/", payload, format="json").status_code == 422  # épuisé

    number = order["number"]
    assert api.get(f"/api/orders/{number}/").status_code == 200  # propriétaire
    api.credentials()
    assert api.get(f"/api/orders/{number}/").status_code == 404
    assert api.get(f"/api/orders/{number}/", HTTP_X_ORDER_KEY="faux").status_code == 404
    assert api.get(f"/api/orders/{number}/", HTTP_X_ORDER_KEY=order["access_key"]).status_code == 200


def test_checkout_validation(api, catalog):
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {register(api)['access']}")
    item = [{"variant_id": catalog["lessive"].id, "quantity": 1}]
    assert api.post("/api/orders/", {**ORDER, "phone": "77 12", "items": item}, format="json").status_code == 400
    assert api.post("/api/orders/", {**ORDER, "accept_terms": False, "items": item}, format="json").status_code == 400
    assert api.post("/api/orders/", {**ORDER, "address_zone": "Mars", "items": item}, format="json").status_code == 400
    duplicated = [item[0], item[0]]
    assert api.post("/api/orders/", {**ORDER, "items": duplicated}, format="json").status_code == 400

    pickup = {**ORDER, "address_line": "", "shipping_method": "pickup", "payment_method": "cash_on_delivery"}
    created = api.post("/api/orders/", {**pickup, "items": item}, format="json")
    assert created.status_code == 201
    assert created.json()["shipping_fee"] == 0
    assert created.json()["payment_status"] == "on_delivery"


def test_authenticated_order_is_linked_and_earns_points(api, catalog):
    access = register(api)["access"]
    auth = {"HTTP_AUTHORIZATION": f"Bearer {access}"}
    payload = {**ORDER, "items": [{"variant_id": catalog["lessive"].id, "quantity": 3}]}
    created = api.post("/api/orders/", payload, format="json", **auth).json()
    assert created["loyalty_points_earned"] == 15

    mine = api.get("/api/orders/", **auth).json()
    assert [o["number"] for o in mine] == [created["number"]]
    assert api.get(f"/api/orders/{created['number']}/", **auth).status_code == 200

    user = User.objects.get(email="awa@example.com")
    assert user.loyalty_points == 15
    assert user.address_zone == "Point E"  # adresse mémorisée pour la prochaine commande

    assert api.get("/api/orders/").status_code == 401


def test_contact_message_and_security_headers(api):
    response = api.post(
        "/api/contact/",
        {"full_name": "Moussa Fall", "phone": "776543210", "subject": "livraison", "message": "Bonjour, quels délais ?"},
        format="json",
    )
    assert response.status_code == 201
    assert response["X-Content-Type-Options"] == "nosniff"
    assert response["X-Frame-Options"] == "DENY"


def test_bootstrap_adds_new_products_once(db):
    from django.core.management import call_command

    from apps.catalog.models import Product

    Product.objects.create(slug="deja-la", name="Déjà là", category="nettoyage", reference="X1", short_description="x")
    call_command("bootstrap_prod")
    added = Product.objects.get(reference="654/24259E-GRIS")
    assert added.name == "Paillasson Living Geo 40x60 gris"
    assert added.image.name == "products/photos/paillasson-living-geo-gris-40x60.webp"
    call_command("bootstrap_prod")
    assert Product.objects.filter(reference="654/24259E-GRIS").count() == 1
