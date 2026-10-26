import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.backoffice.models import SiteSettings
from apps.catalog.models import Product, ProductVariant
from apps.contact.models import ContactMessage
from tests.conftest import PASSWORD, register

pytestmark = pytest.mark.django_db

ORDER = {
    "first_name": "Awa",
    "last_name": "Diop",
    "phone": "77 123 45 67",
    "shipping_method": "pickup",
    "payment_method": "wave",
    "accept_terms": True,
}


@pytest.fixture
def admin_api() -> APIClient:
    admin = User.objects.create_superuser(email="admin@example.com", password=PASSWORD, first_name="Ada", last_name="Min")
    client = APIClient()
    client.force_authenticate(admin)
    client.user = admin
    return client


def _product_payload(**overrides) -> dict:
    payload = {
        "name": "Savon Noir Karité",
        "category": "beaute",
        "reference": "SE-SAV-01",
        "short_description": "Savon traditionnel",
        "variants": [{"label": "250 g", "sku": "SAV-250", "price": 2500, "stock": 12}],
    }
    return {**payload, **overrides}


def test_admin_api_is_staff_only(api, catalog):
    assert api.get("/api/admin/stats/").status_code == 401
    token = register(api)["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    for url in ["/api/admin/stats/", "/api/admin/products/", "/api/admin/orders/", "/api/admin/customers/"]:
        assert api.get(url).status_code == 403, url
    assert api.post("/api/admin/products/", _product_payload(), format="json").status_code == 403


def test_product_crud_with_variants(admin_api, db):
    created = admin_api.post("/api/admin/products/", _product_payload(), format="json")
    assert created.status_code == 201, created.content
    product = created.json()
    assert product["slug"] == "savon-noir-karite"
    variant_id = product["variants"][0]["id"]

    updated = admin_api.patch(
        f"/api/admin/products/{product['id']}/",
        {
            "name": "Savon Noir Karité Bio",
            "is_active": False,
            "variants": [
                {"id": variant_id, "label": "250 g", "sku": "SAV-250", "price": 2700, "stock": 4},
                {"label": "500 g", "sku": "SAV-500", "price": 4500, "compare_at_price": 5000, "stock": 6},
            ],
        },
        format="json",
    )
    assert updated.status_code == 200, updated.content
    body = updated.json()
    assert body["name"] == "Savon Noir Karité Bio" and body["is_active"] is False
    assert [(v["sku"], v["price"]) for v in body["variants"]] == [("SAV-250", 2700), ("SAV-500", 4500)]

    # Le catalogue public n'affiche pas un produit hors ligne.
    assert admin_api.get(f"/api/products/{body['slug']}/").status_code == 404

    assert admin_api.delete(f"/api/admin/products/{product['id']}/").status_code == 204
    assert not Product.objects.exists() and not ProductVariant.objects.exists()


def test_product_validation(admin_api, catalog):
    no_variant = admin_api.post("/api/admin/products/", _product_payload(variants=[]), format="json")
    assert no_variant.status_code == 400
    taken_sku = _product_payload(variants=[{"label": "1 L", "sku": "lessive-test-0", "price": 1000, "stock": 1}])
    assert admin_api.post("/api/admin/products/", taken_sku, format="json").status_code == 400
    bad_compare = _product_payload(
        variants=[{"label": "1 L", "sku": "NEW-1", "price": 1000, "compare_at_price": 900, "stock": 1}]
    )
    assert admin_api.post("/api/admin/products/", bad_compare, format="json").status_code == 400


def test_order_status_and_cancellation_restocks(admin_api, api, catalog):
    token = register(api)["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    payload = {**ORDER, "items": [{"variant_id": catalog["lessive"].pk, "quantity": 3}]}
    number = api.post("/api/orders/", payload, format="json").json()["number"]
    assert ProductVariant.objects.get(pk=catalog["lessive"].pk).stock == 7

    listing = admin_api.get("/api/admin/orders/", {"status": "preparing"}).json()
    assert listing["total"] == 1 and listing["items"][0]["number"] == number

    shipped = admin_api.patch(f"/api/admin/orders/{number}/", {"status": "shipping"}, format="json")
    assert shipped.json()["status"] == "shipping"

    cancelled = admin_api.patch(f"/api/admin/orders/{number}/", {"status": "cancelled"}, format="json")
    assert cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled"
    assert ProductVariant.objects.get(pk=catalog["lessive"].pk).stock == 10
    assert User.objects.get(email="awa@example.com").loyalty_points == 0

    revived = admin_api.patch(f"/api/admin/orders/{number}/", {"status": "preparing"}, format="json")
    assert revived.status_code == 400


def test_customers_listing_and_block(admin_api, api, catalog):
    register(api)
    customers = admin_api.get("/api/admin/customers/").json()
    assert customers["total"] == 1  # le compte admin est exclu par défaut
    customer = customers["items"][0]
    assert customer["orders_count"] == 0

    blocked = admin_api.patch(f"/api/admin/customers/{customer['id']}/", {"is_active": False}, format="json")
    assert blocked.status_code == 200 and blocked.json()["is_active"] is False
    login = api.post("/api/auth/login/", {"identifier": "awa@example.com", "password": PASSWORD}, format="json")
    assert login.status_code == 401

    me = admin_api.patch(f"/api/admin/customers/{admin_api.user.pk}/", {"is_active": False}, format="json")
    assert me.status_code == 400


def test_site_settings_drive_store_and_quote(admin_api, api, catalog):
    response = admin_api.patch(
        "/api/admin/settings/",
        {"delivery_fee_dakar": 3000, "delivery_zones": ["Plateau", " Yoff ", "Plateau"], "announcements": ["Promo !"]},
        format="json",
    )
    assert response.status_code == 200, response.content
    assert response.json()["delivery_zones"] == ["Plateau", "Yoff"]

    config = api.get("/api/store/config/").json()
    assert config["delivery_fee_dakar"] == 3000 and config["announcements"] == ["Promo !"]

    quote = api.post(
        "/api/cart/quote/",
        {"items": [{"variant_id": catalog["lessive"].pk, "quantity": 1}], "shipping_method": "delivery_dakar"},
        format="json",
    ).json()
    assert quote["shipping_fee"] == 3000

    bad_zone = {**ORDER, "shipping_method": "delivery_dakar", "address_zone": "Ngor", "address_line": "Rue 1"}
    bad_zone["items"] = [{"variant_id": catalog["lessive"].pk, "quantity": 1}]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {register(api)['access']}")
    assert api.post("/api/orders/", bad_zone, format="json").status_code == 400
    assert SiteSettings.objects.count() == 1


def test_promo_codes_and_messages(admin_api, catalog):
    created = admin_api.post("/api/admin/promo-codes/", {"code": " tabaski ", "percent_off": 15}, format="json")
    assert created.status_code == 201 and created.json()["code"] == "TABASKI"
    duplicate = admin_api.post("/api/admin/promo-codes/", {"code": "TABASKI", "percent_off": 5}, format="json")
    assert duplicate.status_code == 400

    message = ContactMessage.objects.create(full_name="Fatou", phone="771234567", subject="suivi", message="Où en est ma commande ?")
    assert admin_api.get("/api/admin/messages/", {"handled": "false"}).json()["total"] == 1
    admin_api.patch(f"/api/admin/messages/{message.pk}/", {"is_handled": True}, format="json")
    assert admin_api.get("/api/admin/stats/").json()["messages_unhandled"] == 0


def _image_file(name="photo.png", size=(400, 400), fmt="PNG"):
    from io import BytesIO

    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", size, (201, 162, 74)).save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f"image/{fmt.lower()}")


def test_product_image_upload(admin_api, settings, tmp_path):
    from django.core.files.uploadedfile import SimpleUploadedFile

    settings.MEDIA_ROOT = tmp_path
    product = admin_api.post("/api/admin/products/", _product_payload(), format="json").json()
    url = f"/api/admin/products/{product['id']}/image/"

    uploaded = admin_api.post(url, {"image": _image_file()}, format="multipart")
    assert uploaded.status_code == 200, uploaded.content
    first = uploaded.json()["image_url"]
    assert first.startswith("/media/products/") and first.endswith(".png")
    assert "photo" not in first  # le nom fourni par le navigateur n'est jamais réutilisé
    assert admin_api.get(f"/api/products/{product['slug']}/").json()["image_url"] == first

    # Remplacer l'image supprime l'ancien fichier.
    replaced = admin_api.post(url, {"image": _image_file("b.webp", fmt="WEBP")}, format="multipart").json()["image_url"]
    assert replaced != first and len(list((tmp_path / "products").iterdir())) == 1

    fake = SimpleUploadedFile("virus.jpg", b"<?php echo 'x'; ?>", content_type="image/jpeg")
    assert admin_api.post(url, {"image": fake}, format="multipart").status_code == 400
    assert admin_api.post(url, {"image": _image_file(size=(50, 50))}, format="multipart").status_code == 400

    assert admin_api.delete(url).json()["image_url"] == ""
    assert not list((tmp_path / "products").iterdir())
