from django.conf import settings
from django.db import models


class ShippingMethod(models.TextChoices):
    DELIVERY_DAKAR = "delivery_dakar", "Livraison à domicile — Dakar"
    PICKUP = "pickup", "Retrait en boutique"


class PaymentMethod(models.TextChoices):
    WAVE = "wave", "Wave"
    ORANGE_MONEY = "orange_money", "Orange Money"
    CARD = "card", "Carte bancaire"
    CASH_ON_DELIVERY = "cash_on_delivery", "Paiement à la livraison"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "En attente"
    PAID = "paid", "Validé"
    ON_DELIVERY = "on_delivery", "À la livraison"
    FAILED = "failed", "Échoué"


class OrderStatus(models.TextChoices):
    PREPARING = "preparing", "En préparation"
    SHIPPING = "shipping", "En cours de livraison"
    DELIVERED = "delivered", "Livrée"
    PICKED_UP = "picked_up", "Retirée en boutique"
    CANCELLED = "cancelled", "Annulée"


class PromoCode(models.Model):
    code = models.CharField(max_length=40, unique=True)
    percent_off = models.PositiveSmallIntegerField("remise (%)")
    min_subtotal = models.PositiveIntegerField("montant minimum (FCFA)", default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "code promo"

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.code} (−{self.percent_off} %)"


class Order(models.Model):
    number = models.CharField("n° de commande", max_length=20, unique=True)
    # Clé opaque permettant à un client invité (sans compte) de consulter sa confirmation.
    access_key = models.CharField(max_length=64, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )

    first_name = models.CharField("prénom", max_length=80)
    last_name = models.CharField("nom", max_length=80)
    phone = models.CharField("téléphone", max_length=9)
    email = models.EmailField(blank=True)

    shipping_method = models.CharField(max_length=20, choices=ShippingMethod.choices)
    address_zone = models.CharField(max_length=80, blank=True)
    address_line = models.CharField(max_length=200, blank=True)
    address_landmark = models.CharField(max_length=200, blank=True)

    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PREPARING)

    subtotal = models.PositiveIntegerField()
    discount = models.PositiveIntegerField(default=0)
    shipping_fee = models.PositiveIntegerField()
    total = models.PositiveIntegerField()
    promo_code = models.CharField(max_length=40, blank=True)
    loyalty_points_earned = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "commande"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.number


class OrderItem(models.Model):
    """Ligne de commande : libellés et prix figés au moment de l'achat."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey("catalog.ProductVariant", null=True, on_delete=models.SET_NULL)
    product_name = models.CharField(max_length=160)
    product_slug = models.CharField(max_length=120)
    variant_label = models.CharField(max_length=60)
    unit_price = models.PositiveIntegerField()
    quantity = models.PositiveSmallIntegerField()
    line_total = models.PositiveIntegerField()

    class Meta:
        verbose_name = "article"

    def __str__(self) -> str:
        return f"{self.quantity} × {self.product_name} ({self.variant_label})"
