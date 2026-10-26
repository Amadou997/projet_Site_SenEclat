from django.contrib import admin

from apps.catalog.models import Product, ProductVariant


class VariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ["label", "sku", "price", "compare_at_price", "stock", "position"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "reference", "is_new", "is_bestseller", "is_active", "sales_count"]
    list_filter = ["category", "is_new", "is_bestseller", "is_active"]
    list_editable = ["is_new", "is_bestseller", "is_active"]
    search_fields = ["name", "reference", "slug"]
    prepopulated_fields = {"slug": ["name"]}
    readonly_fields = ["sales_count", "created_at", "updated_at"]
    inlines = [VariantInline]
