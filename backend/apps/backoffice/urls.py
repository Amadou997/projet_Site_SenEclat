from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.backoffice import views

router = DefaultRouter(trailing_slash=True)
router.include_root_view = False
router.register("products", views.AdminProductViewSet, basename="admin-product")
router.register("orders", views.AdminOrderViewSet, basename="admin-order")
router.register("customers", views.AdminCustomerViewSet, basename="admin-customer")
router.register("promo-codes", views.AdminPromoCodeViewSet, basename="admin-promo")
router.register("messages", views.AdminContactMessageViewSet, basename="admin-message")

urlpatterns = [
    path("stats/", views.StatsView.as_view(), name="admin-stats"),
    path("settings/", views.SiteSettingsView.as_view(), name="admin-settings"),
    *router.urls,
]
