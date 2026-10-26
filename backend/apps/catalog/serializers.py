from rest_framework import serializers

from apps.catalog.models import Product, ProductVariant


class VariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ["id", "label", "sku", "price", "compare_at_price", "stock"]


class ProductListSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    variants = VariantSerializer(many=True, read_only=True)
    price = serializers.SerializerMethodField()
    compare_at_price = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    image_url = serializers.CharField(source="display_image_url", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "name",
            "category",
            "category_label",
            "short_description",
            "image_url",
            "is_new",
            "is_bestseller",
            "price",
            "compare_at_price",
            "discount_percent",
            "in_stock",
            "variants",
        ]

    # Les variantes sont préchargées (prefetch) : ces calculs ne déclenchent aucune requête.
    def _first(self, obj: Product) -> ProductVariant | None:
        variants = list(obj.variants.all())
        return variants[0] if variants else None

    def get_price(self, obj: Product) -> int:
        return min((v.price for v in obj.variants.all()), default=0)

    def get_compare_at_price(self, obj: Product) -> int | None:
        first = self._first(obj)
        return first.compare_at_price if first else None

    def get_discount_percent(self, obj: Product) -> int | None:
        first = self._first(obj)
        if not first or not first.compare_at_price or first.compare_at_price <= first.price:
            return None
        return round(100 * (first.compare_at_price - first.price) / first.compare_at_price)

    def get_in_stock(self, obj: Product) -> bool:
        return any(v.stock > 0 for v in obj.variants.all())


class ProductDetailSerializer(ProductListSerializer):
    class Meta(ProductListSerializer.Meta):
        fields = [
            *ProductListSerializer.Meta.fields,
            "reference",
            "description",
            "usage",
            "composition",
            "precautions",
        ]
