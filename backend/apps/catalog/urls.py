from rest_framework.routers import DefaultRouter

from apps.catalog.views import ProductViewSet

router = DefaultRouter(trailing_slash=True)
router.include_root_view = False
router.register("products", ProductViewSet, basename="product")

urlpatterns = router.urls
