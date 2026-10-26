"""API du tableau de bord d'administration : réservée aux comptes `is_staff`."""

from datetime import timedelta

from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.backoffice.models import SiteSettings
from apps.backoffice.serializers import (
    AdminContactMessageSerializer,
    AdminCustomerSerializer,
    AdminOrderSerializer,
    AdminOrderUpdateSerializer,
    AdminProductSerializer,
    AdminPromoCodeSerializer,
    ProductImageSerializer,
    SiteSettingsSerializer,
)
from apps.catalog.models import Product, ProductVariant
from apps.contact.models import ContactMessage
from apps.orders import services
from apps.orders.models import Order, OrderStatus, PromoCode

LOW_STOCK_THRESHOLD = 5
_REVENUE_FILTER = ~Q(status=OrderStatus.CANCELLED)


class AdminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "items": data,
                "total": self.page.paginator.count,
                "page": self.page.number,
                "pages": self.page.paginator.num_pages,
            }
        )


class AdminMixin:
    permission_classes = [permissions.IsAdminUser]
    pagination_class = AdminPagination

    def _param(self, name: str) -> str:
        return self.request.query_params.get(name, "").strip()


class StatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        now = timezone.now()
        valid = Order.objects.filter(_REVENUE_FILTER)
        totals = valid.aggregate(revenue=Coalesce(Sum("total"), 0), count=Count("id"))
        last_30 = valid.filter(created_at__gte=now - timedelta(days=30)).aggregate(
            revenue=Coalesce(Sum("total"), 0), count=Count("id")
        )
        low_stock = (
            ProductVariant.objects.select_related("product")
            .filter(product__is_active=True, stock__lte=LOW_STOCK_THRESHOLD)
            .order_by("stock", "product__name")[:8]
        )
        top_products = Product.objects.filter(sales_count__gt=0).order_by("-sales_count")[:5]
        recent = Order.objects.prefetch_related("items")[:6]
        return Response(
            {
                "revenue_total": totals["revenue"],
                "orders_total": totals["count"],
                "revenue_30d": last_30["revenue"],
                "orders_30d": last_30["count"],
                "average_basket": totals["revenue"] // totals["count"] if totals["count"] else 0,
                "orders_to_process": Order.objects.filter(status=OrderStatus.PREPARING).count(),
                "orders_shipping": Order.objects.filter(status=OrderStatus.SHIPPING).count(),
                "customers_total": User.objects.filter(is_staff=False).count(),
                "customers_30d": User.objects.filter(is_staff=False, date_joined__gte=now - timedelta(days=30)).count(),
                "products_active": Product.objects.active().count(),
                "products_total": Product.objects.count(),
                "messages_unhandled": ContactMessage.objects.filter(is_handled=False).count(),
                "low_stock": [
                    {
                        "product_id": v.product_id,
                        "product_name": v.product.name,
                        "variant_label": v.label,
                        "sku": v.sku,
                        "stock": v.stock,
                    }
                    for v in low_stock
                ],
                "top_products": [{"id": p.id, "name": p.name, "sales_count": p.sales_count} for p in top_products],
                "recent_orders": AdminOrderSerializer(recent, many=True).data,
            }
        )


class AdminProductViewSet(AdminMixin, viewsets.ModelViewSet):
    serializer_class = AdminProductSerializer

    def get_queryset(self):
        queryset = Product.objects.prefetch_related("variants").order_by("-updated_at", "-id")
        if q := self._param("q"):
            queryset = queryset.filter(Q(name__icontains=q) | Q(reference__icontains=q) | Q(variants__sku__icontains=q))
        if category := self._param("category"):
            queryset = queryset.filter(category=category)
        if (active := self._param("active")) in {"true", "false"}:
            queryset = queryset.filter(is_active=active == "true")
        return queryset.distinct()

    def perform_destroy(self, instance):
        image = instance.image
        instance.delete()
        image.delete(save=False)

    @action(detail=True, methods=["post", "delete"], parser_classes=[MultiPartParser])
    def image(self, request, pk=None):
        """POST (multipart, champ `image`) : remplace l'image du produit. DELETE : la retire."""
        product = self.get_object()
        old = product.image.name
        if request.method == "POST":
            payload = ProductImageSerializer(data=request.data)
            payload.is_valid(raise_exception=True)
            product.image = payload.validated_data["image"]
        else:
            product.image = None
        product.save(update_fields=["image", "updated_at"])
        if old and old != product.image.name:
            product.image.storage.delete(old)
        return Response(self.get_serializer(product).data)


class AdminOrderViewSet(AdminMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = AdminOrderSerializer
    lookup_field = "number"

    def get_queryset(self):
        queryset = Order.objects.prefetch_related("items")
        if q := self._param("q"):
            queryset = queryset.filter(
                Q(number__icontains=q)
                | Q(phone__icontains=q.replace(" ", ""))
                | Q(last_name__icontains=q)
                | Q(first_name__icontains=q)
                | Q(email__icontains=q)
            )
        if order_status := self._param("status"):
            queryset = queryset.filter(status=order_status)
        if customer := self._param("customer"):
            queryset = queryset.filter(user_id=customer) if customer.isdigit() else queryset.none()
        return queryset

    def partial_update(self, request, number=None):
        order = self.get_object()
        payload = AdminOrderUpdateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        new_status = data.get("status")
        if order.status == OrderStatus.CANCELLED and new_status and new_status != OrderStatus.CANCELLED:
            raise ValidationError({"status": "Une commande annulée ne peut pas être réactivée."})
        if new_status == OrderStatus.CANCELLED:
            order = services.cancel_order(order)
        elif new_status:
            order.status = new_status
        if "payment_status" in data:
            order.payment_status = data["payment_status"]
        order.save(update_fields=["status", "payment_status", "updated_at"])
        return Response(self.get_serializer(self.get_queryset().get(pk=order.pk)).data)


class AdminCustomerViewSet(
    AdminMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet
):
    serializer_class = AdminCustomerSerializer
    http_method_names = ["get", "patch"]

    def get_queryset(self):
        queryset = User.objects.annotate(
            orders_count=Count("orders"),
            total_spent=Coalesce(Sum("orders__total", filter=~Q(orders__status=OrderStatus.CANCELLED)), 0),
            last_order_at=Max("orders__created_at"),
        ).order_by("-date_joined")
        if q := self._param("q"):
            queryset = queryset.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(email__icontains=q)
                | Q(phone__icontains=q.replace(" ", ""))
            )
        if self.action == "list" and self._param("staff") != "true":
            queryset = queryset.filter(is_staff=False)
        return queryset

    def perform_update(self, serializer):
        if serializer.instance.pk == self.request.user.pk:
            raise ValidationError({"is_active": "Vous ne pouvez pas désactiver votre propre compte."})
        serializer.save()


class AdminPromoCodeViewSet(AdminMixin, viewsets.ModelViewSet):
    serializer_class = AdminPromoCodeSerializer
    pagination_class = None
    queryset = PromoCode.objects.order_by("-is_active", "code")


class AdminContactMessageViewSet(
    AdminMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AdminContactMessageSerializer
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        queryset = ContactMessage.objects.all()
        if (handled := self._param("handled")) in {"true", "false"}:
            queryset = queryset.filter(is_handled=handled == "true")
        return queryset


class SiteSettingsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.load()).data)

    def patch(self, request):
        serializer = SiteSettingsSerializer(SiteSettings.load(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
