from django.contrib import admin

from apps.orders.models import Order, OrderItem, PromoCode


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ["product_name", "variant_label", "unit_price", "quantity", "line_total"]
    fields = readonly_fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["number", "created_at", "first_name", "last_name", "phone", "total", "payment_status", "status"]
    list_filter = ["status", "payment_status", "payment_method", "shipping_method"]
    list_editable = ["status"]
    search_fields = ["number", "phone", "last_name", "email"]
    date_hierarchy = "created_at"
    inlines = [OrderItemInline]
    readonly_fields = [
        "number", "user", "subtotal", "discount", "shipping_fee", "total", "promo_code",
        "loyalty_points_earned", "created_at", "updated_at",
    ]


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ["code", "percent_off", "min_subtotal", "is_active"]
    list_editable = ["is_active"]
