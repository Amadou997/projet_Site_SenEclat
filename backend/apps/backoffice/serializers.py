from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.accounts.models import User
from apps.backoffice.models import SiteSettings
from apps.catalog.models import Product, ProductVariant
from apps.contact.models import ContactMessage
from apps.orders.models import Order, OrderStatus, PaymentStatus, PromoCode
from apps.orders.serializers import OrderSerializer

# --- Catalogue --------------------------------------------------------------------


class AdminVariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductVariant
        fields = ["id", "label", "sku", "price", "compare_at_price", "stock", "position"]
        extra_kwargs = {"sku": {"validators": []}, "position": {"required": False}}

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le prix doit être supérieur à 0.")
        return value

    def validate(self, attrs):
        compare = attrs.get("compare_at_price")
        if compare is not None and compare <= attrs.get("price", 0):
            raise serializers.ValidationError({"compare_at_price": "Le prix barré doit dépasser le prix de vente."})
        return attrs


class AdminProductSerializer(serializers.ModelSerializer):
    """Produit complet, avec ses formats imbriqués (créés, modifiés ou supprimés en une requête)."""

    slug = serializers.SlugField(max_length=120, required=False, allow_blank=True)
    variants = AdminVariantSerializer(many=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    image_url = serializers.CharField(source="display_image_url", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "name",
            "category",
            "category_label",
            "reference",
            "short_description",
            "description",
            "usage",
            "composition",
            "precautions",
            "image_url",
            "is_new",
            "is_bestseller",
            "is_active",
            "sales_count",
            "created_at",
            "updated_at",
            "variants",
        ]
        read_only_fields = ["id", "sales_count", "created_at", "updated_at"]

    def validate_variants(self, variants):
        if not variants:
            raise serializers.ValidationError("Ajoutez au moins un format (contenance et prix).")
        skus = [v["sku"].strip() for v in variants]
        if len(set(skus)) != len(skus):
            raise serializers.ValidationError("Chaque format doit avoir un SKU unique.")
        own_ids = set(self.instance.variants.values_list("id", flat=True)) if self.instance else set()
        for variant in variants:
            if "id" in variant and variant["id"] not in own_ids:
                raise serializers.ValidationError("Format inconnu pour ce produit.")
        taken = ProductVariant.objects.filter(sku__in=skus).exclude(id__in=own_ids)
        if taken.exists():
            raise serializers.ValidationError(f"SKU déjà utilisé : {', '.join(taken.values_list('sku', flat=True))}.")
        return variants

    def validate(self, attrs):
        if not attrs.get("slug") and "name" in attrs:
            attrs["slug"] = slugify(attrs["name"])[:120]
        slug = attrs.get("slug")
        if slug:
            clash = Product.objects.filter(slug=slug)
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({"slug": "Un autre produit utilise déjà cette adresse (slug)."})
        elif self.instance is None:
            raise serializers.ValidationError({"slug": "Le slug est requis."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        variants = validated_data.pop("variants")
        product = Product.objects.create(**validated_data)
        self._sync_variants(product, variants)
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        variants = validated_data.pop("variants", None)
        instance = super().update(instance, validated_data)
        if variants is not None:
            self._sync_variants(instance, variants)
        return instance

    @staticmethod
    def _sync_variants(product: Product, variants: list[dict]) -> None:
        keep = {v["id"] for v in variants if "id" in v}
        # Les lignes de commande gardent leurs libellés : supprimer un format ne casse pas l'historique.
        product.variants.exclude(id__in=keep).delete()
        for position, data in enumerate(variants):
            data = {**data, "sku": data["sku"].strip(), "position": position}
            variant_id = data.pop("id", None)
            if variant_id:
                ProductVariant.objects.filter(pk=variant_id, product=product).update(**data)
            else:
                ProductVariant.objects.create(product=product, **data)


class ProductImageSerializer(serializers.Serializer):
    MAX_BYTES = 5 * 1024 * 1024
    FORMATS = {"JPEG", "PNG", "WEBP"}

    # ImageField de DRF fait vérifier le contenu par Pillow : un fichier renommé en .jpg est refusé.
    image = serializers.ImageField()

    def validate_image(self, image):
        if image.size > self.MAX_BYTES:
            raise serializers.ValidationError("L'image ne doit pas dépasser 5 Mo.")
        if getattr(image, "image", None) is None or image.image.format not in self.FORMATS:
            raise serializers.ValidationError("Formats acceptés : JPEG, PNG ou WebP.")
        width, height = image.image.size
        if width < 200 or height < 200:
            raise serializers.ValidationError("L'image doit mesurer au moins 200 × 200 pixels.")
        return image


# --- Commandes ----------------------------------------------------------------------


class AdminOrderSerializer(OrderSerializer):
    customer_id = serializers.IntegerField(source="user_id", read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = ["id", "customer_id", *OrderSerializer.Meta.fields, "updated_at"]
        read_only_fields = fields


class AdminOrderUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices, required=False)
    payment_status = serializers.ChoiceField(choices=PaymentStatus.choices, required=False)


# --- Clients ------------------------------------------------------------------------


class AdminCustomerSerializer(serializers.ModelSerializer):
    orders_count = serializers.IntegerField(read_only=True)
    total_spent = serializers.IntegerField(read_only=True)
    last_order_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "loyalty_points",
            "address_zone",
            "address_line",
            "address_landmark",
            "is_active",
            "is_staff",
            "date_joined",
            "last_login",
            "orders_count",
            "total_spent",
            "last_order_at",
        ]
        read_only_fields = [f for f in fields if f != "is_active"]


# --- Administration du site ----------------------------------------------------------


class AdminPromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = ["id", "code", "percent_off", "min_subtotal", "is_active"]

    def validate_code(self, value):
        value = value.strip().upper()
        clash = PromoCode.objects.filter(code=value)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("Ce code existe déjà.")
        return value

    def validate_percent_off(self, value):
        if not 1 <= value <= 90:
            raise serializers.ValidationError("La remise doit être comprise entre 1 et 90 %.")
        return value


class AdminContactMessageSerializer(serializers.ModelSerializer):
    subject_label = serializers.CharField(source="get_subject_display", read_only=True)

    class Meta:
        model = ContactMessage
        fields = ["id", "full_name", "phone", "subject", "subject_label", "message", "is_handled", "created_at"]
        read_only_fields = [f for f in fields if f != "is_handled"]


def _clean_list(values: list[str], max_length: int) -> list[str]:
    cleaned = []
    for value in values:
        value = value.strip()
        if len(value) > max_length:
            raise serializers.ValidationError(f"« {value[:20]}… » dépasse {max_length} caractères.")
        if value and value not in cleaned:
            cleaned.append(value)
    return cleaned


class SiteSettingsSerializer(serializers.ModelSerializer):
    delivery_zones = serializers.ListField(child=serializers.CharField(allow_blank=True), max_length=60)
    announcements = serializers.ListField(child=serializers.CharField(allow_blank=True), max_length=10)

    class Meta:
        model = SiteSettings
        fields = ["delivery_fee_dakar", "delivery_zones", "fcfa_per_loyalty_point", "announcements", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate_delivery_zones(self, value):
        value = _clean_list(value, 80)
        if not value:
            raise serializers.ValidationError("Indiquez au moins une commune desservie.")
        return value

    def validate_announcements(self, value):
        return _clean_list(value, 80)

    def validate_fcfa_per_loyalty_point(self, value):
        if value < 1:
            raise serializers.ValidationError("La valeur doit être d'au moins 1 FCFA.")
        return value
