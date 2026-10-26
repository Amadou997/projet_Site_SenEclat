from rest_framework import serializers

from apps.backoffice.models import SiteSettings
from apps.core.fields import SenegalPhoneField
from apps.orders.models import Order, OrderItem, PaymentMethod, ShippingMethod


class CartLineSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=50)


def _unique_variants(items: list[dict]) -> list[dict]:
    if len({item["variant_id"] for item in items}) != len(items):
        raise serializers.ValidationError("Chaque article ne doit apparaître qu'une fois.")
    return items


class QuoteRequestSerializer(serializers.Serializer):
    items = CartLineSerializer(many=True, allow_empty=False, max_length=50)
    shipping_method = serializers.ChoiceField(choices=ShippingMethod.choices, required=False, allow_null=True)
    promo_code = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)

    def validate_items(self, items):
        return _unique_variants(items)


class QuoteLineSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    product_name = serializers.CharField()
    product_slug = serializers.CharField()
    category = serializers.CharField()
    variant_label = serializers.CharField()
    unit_price = serializers.IntegerField()
    quantity = serializers.IntegerField()
    line_total = serializers.IntegerField()
    available = serializers.IntegerField()


class QuoteSerializer(serializers.Serializer):
    lines = QuoteLineSerializer(many=True)
    subtotal = serializers.IntegerField()
    discount = serializers.IntegerField()
    shipping_fee = serializers.IntegerField()
    total = serializers.IntegerField()
    promo_code = serializers.CharField(allow_null=True)
    loyalty_points = serializers.IntegerField()


class OrderCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    phone = SenegalPhoneField()
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    shipping_method = serializers.ChoiceField(choices=ShippingMethod.choices)
    address_zone = serializers.CharField(max_length=80, required=False, allow_blank=True)
    address_line = serializers.CharField(max_length=200, required=False, allow_blank=True)
    address_landmark = serializers.CharField(max_length=200, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
    promo_code = serializers.CharField(max_length=40, required=False, allow_blank=True, allow_null=True)
    accept_terms = serializers.BooleanField()
    items = CartLineSerializer(many=True, allow_empty=False, max_length=50)

    def validate_items(self, items):
        return _unique_variants(items)

    def validate_accept_terms(self, value):
        if not value:
            raise serializers.ValidationError("Vous devez accepter les conditions générales de vente.")
        return value

    def validate(self, attrs):
        if attrs["shipping_method"] == ShippingMethod.DELIVERY_DAKAR:
            errors = {}
            zones = SiteSettings.load().delivery_zones
            if attrs.get("address_zone") not in zones:
                errors["address_zone"] = "Choisissez une commune desservie."
            if not attrs.get("address_line", "").strip():
                errors["address_line"] = "L'adresse est requise pour une livraison."
            if errors:
                raise serializers.ValidationError(errors)
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["product_name", "product_slug", "variant_label", "unit_price", "quantity", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_label = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_status_label = serializers.CharField(source="get_payment_status_display", read_only=True)
    shipping_method_label = serializers.CharField(source="get_shipping_method_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "number",
            "created_at",
            "status",
            "status_label",
            "payment_method",
            "payment_method_label",
            "payment_status",
            "payment_status_label",
            "shipping_method",
            "shipping_method_label",
            "first_name",
            "last_name",
            "phone",
            "email",
            "address_zone",
            "address_line",
            "address_landmark",
            "subtotal",
            "discount",
            "shipping_fee",
            "total",
            "promo_code",
            "loyalty_points_earned",
            "items",
        ]
        read_only_fields = fields


class OrderCreatedSerializer(OrderSerializer):
    class Meta(OrderSerializer.Meta):
        fields = [*OrderSerializer.Meta.fields, "access_key"]
        read_only_fields = fields
