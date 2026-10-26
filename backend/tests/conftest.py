import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.catalog.models import Category, Product, ProductVariant
from apps.orders.models import PromoCode

AJAX = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}
PASSWORD = "Sen-Eclat-2026!"


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()  # les compteurs de limitation de débit sont stockés dans le cache
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def _simulated_payments(settings):
    settings.SEN_ECLAT = {**settings.SEN_ECLAT, "PAYMENTS_AUTO_APPROVE": True}


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def catalog(db) -> dict[str, ProductVariant]:
    def make(slug, category, price, stock, compare=None, **kw) -> ProductVariant:
        product = Product.objects.create(
            slug=slug,
            name=slug.replace("-", " ").title(),
            category=category,
            reference=f"REF-{slug}",
            short_description="Produit de test",
            **kw,
        )
        return ProductVariant.objects.create(
            product=product, label="1 L", sku=f"{slug}-0", price=price, compare_at_price=compare, stock=stock
        )

    variants = {
        "lessive": make("lessive-test", Category.LESSIVE, 5000, 10, compare=6000, is_bestseller=True),
        "creme": make("creme-test", Category.COSMETIQUES, 9000, 2, is_new=True),
        "savon": make("savon-test", Category.BEAUTE, 3000, 0),
    }
    PromoCode.objects.create(code="ECLAT10", percent_off=10, min_subtotal=10000)
    return variants


def register(api: APIClient, email: str = "awa@example.com") -> dict:
    response = api.post(
        "/api/auth/register/",
        {"first_name": "Awa", "last_name": "Diop", "email": email, "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 201, response.content
    return response.json()
