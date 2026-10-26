from dataclasses import asdict

from rest_framework import permissions, status
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.backoffice.models import SiteSettings
from apps.orders import services
from apps.orders.models import Order
from apps.orders.payments import get_gateway
from apps.orders.serializers import (
    OrderCreatedSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    QuoteRequestSerializer,
    QuoteSerializer,
)


class StoreConfigView(APIView):
    """Paramètres publics affichés par le front (frais, zones desservies, bandeau)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        site = SiteSettings.load()
        return Response(
            {
                "delivery_fee_dakar": site.delivery_fee_dakar,
                "delivery_zones": site.delivery_zones,
                "fcfa_per_loyalty_point": site.fcfa_per_loyalty_point,
                "announcements": site.announcements,
            }
        )


class QuoteView(APIView):
    """Recalcule le panier côté serveur : prix, stock disponible, remise, livraison."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = QuoteRequestSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        quote = services.build_quote(
            payload.validated_data["items"],
            payload.validated_data.get("shipping_method"),
            payload.validated_data.get("promo_code"),
        )
        return Response(QuoteSerializer(asdict(quote)).data)


class OrderListCreateView(ListAPIView):
    """GET : commandes du client connecté. POST : passer commande (compte client obligatoire)."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "checkout"

    def get_throttles(self):
        if self.request.method == "POST":
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")

    def post(self, request):
        payload = OrderCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        order = services.place_order(payload.validated_data, request.user, get_gateway())
        order = Order.objects.prefetch_related("items").get(pk=order.pk)
        return Response(OrderCreatedSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, number: str):
        order = services.find_order(number, request.user, request.headers.get("X-Order-Key"))
        if order is None:
            # 404 plutôt que 403 : ne révèle pas l'existence d'une commande appartenant à un tiers.
            return Response({"detail": "Commande introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)
