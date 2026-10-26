"""Logique métier des commandes, isolée des vues pour être testable et réutilisable."""

import secrets
from dataclasses import dataclass, field

from django.db import transaction
from django.db.models import F, Value
from django.db.models.functions import Greatest
from django.utils import timezone

from apps.accounts.models import User
from apps.backoffice.models import SiteSettings
from apps.catalog.models import Product, ProductVariant
from apps.core.exceptions import BusinessError
from apps.orders.models import Order, OrderItem, OrderStatus, PromoCode, ShippingMethod
from apps.orders.payments import PaymentGateway

_NUMBER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # sans 0/O/1/I : lisible au téléphone


@dataclass
class QuoteLine:
    variant_id: int
    product_name: str
    product_slug: str
    category: str
    variant_label: str
    unit_price: int
    quantity: int
    line_total: int
    available: int


@dataclass
class Quote:
    lines: list[QuoteLine] = field(default_factory=list)
    subtotal: int = 0
    discount: int = 0
    shipping_fee: int = 0
    total: int = 0
    promo_code: str | None = None
    loyalty_points: int = 0


def shipping_fee_for(method: str | None, site: SiteSettings | None = None) -> int:
    if method != ShippingMethod.DELIVERY_DAKAR:
        return 0
    return (site or SiteSettings.load()).delivery_fee_dakar


def resolve_promo(code: str | None, subtotal: int) -> PromoCode | None:
    if not code:
        return None
    promo = PromoCode.objects.filter(code=code.strip().upper(), is_active=True).first()
    if promo is None:
        raise BusinessError("Ce code promo n'est pas valide.")
    if subtotal < promo.min_subtotal:
        minimum = f"{promo.min_subtotal:,}".replace(",", " ")
        raise BusinessError(f"Ce code est valable dès {minimum} FCFA d'achat.")
    return promo


def build_quote(items: list[dict], shipping_method: str | None, promo_code: str | None, *, strict: bool = False) -> Quote:
    """Calcule le panier exclusivement à partir des prix en base — jamais ceux envoyés par le client."""
    ids = [item["variant_id"] for item in items]
    variants = ProductVariant.objects.select_related("product").filter(pk__in=ids, product__is_active=True)
    if strict:
        variants = variants.select_for_update()  # verrouille les lignes pendant la commande
    by_id = {v.pk: v for v in variants}

    quote = Quote()
    for item in items:
        variant = by_id.get(item["variant_id"])
        if variant is None:
            raise BusinessError("Un article de votre panier n'est plus disponible.")
        if strict and item["quantity"] > variant.stock:
            raise BusinessError(
                f"Stock insuffisant pour « {variant.product.name} » ({variant.stock} disponible(s))."
            )
        quote.lines.append(
            QuoteLine(
                variant_id=variant.pk,
                product_name=variant.product.name,
                product_slug=variant.product.slug,
                category=variant.product.category,
                variant_label=variant.label,
                unit_price=variant.price,
                quantity=item["quantity"],
                line_total=variant.price * item["quantity"],
                available=variant.stock,
            )
        )

    quote.subtotal = sum(line.line_total for line in quote.lines)
    promo = resolve_promo(promo_code, quote.subtotal)
    quote.discount = quote.subtotal * promo.percent_off // 100 if promo else 0
    quote.promo_code = promo.code if promo else None
    site = SiteSettings.load()
    quote.shipping_fee = shipping_fee_for(shipping_method, site)
    quote.total = quote.subtotal - quote.discount + quote.shipping_fee
    quote.loyalty_points = (quote.subtotal - quote.discount) // site.fcfa_per_loyalty_point
    return quote


def _new_order_number() -> str:
    stamp = timezone.localdate().strftime("%y%m%d")
    while True:
        number = f"SE-{stamp}-" + "".join(secrets.choice(_NUMBER_ALPHABET) for _ in range(5))
        if not Order.objects.filter(number=number).exists():
            return number


@transaction.atomic
def place_order(data: dict, user: User | None, gateway: PaymentGateway) -> Order:
    quote = build_quote(data["items"], data["shipping_method"], data.get("promo_code"), strict=True)

    for line in quote.lines:
        # Décrément conditionnel : même sans verrou (SQLite), impossible de passer sous zéro.
        updated = ProductVariant.objects.filter(pk=line.variant_id, stock__gte=line.quantity).update(
            stock=F("stock") - line.quantity
        )
        if updated != 1:
            raise BusinessError(f"« {line.product_name} » vient d'être épuisé. Merci d'ajuster votre panier.")
        Product.objects.filter(slug=line.product_slug).update(sales_count=F("sales_count") + line.quantity)

    is_delivery = data["shipping_method"] == ShippingMethod.DELIVERY_DAKAR
    order = Order(
        number=_new_order_number(),
        access_key=secrets.token_urlsafe(32),
        user=user,
        first_name=data["first_name"],
        last_name=data["last_name"],
        phone=data["phone"],
        email=data.get("email") or "",
        shipping_method=data["shipping_method"],
        address_zone=data.get("address_zone", "") if is_delivery else "",
        address_line=data.get("address_line", "") if is_delivery else "",
        address_landmark=data.get("address_landmark", "") if is_delivery else "",
        payment_method=data["payment_method"],
        subtotal=quote.subtotal,
        discount=quote.discount,
        shipping_fee=quote.shipping_fee,
        total=quote.total,
        promo_code=quote.promo_code or "",
        loyalty_points_earned=quote.loyalty_points if user else 0,
    )
    order.payment_status = gateway.initiate(order)
    order.save()
    OrderItem.objects.bulk_create(
        OrderItem(
            order=order,
            variant_id=line.variant_id,
            product_name=line.product_name,
            product_slug=line.product_slug,
            variant_label=line.variant_label,
            unit_price=line.unit_price,
            quantity=line.quantity,
            line_total=line.line_total,
        )
        for line in quote.lines
    )

    if user is not None:
        User.objects.filter(pk=user.pk).update(loyalty_points=F("loyalty_points") + order.loyalty_points_earned)
        if is_delivery and not user.address_line:
            User.objects.filter(pk=user.pk).update(
                address_zone=order.address_zone,
                address_line=order.address_line,
                address_landmark=order.address_landmark,
            )
    return order


def find_order(number: str, user: User | None, access_key: str | None) -> Order | None:
    order = Order.objects.prefetch_related("items").filter(number=number).first()
    if order is None:
        return None
    owns = user is not None and user.is_authenticated and order.user_id == user.pk
    has_key = bool(access_key) and secrets.compare_digest(order.access_key, access_key)
    return order if owns or has_key else None


@transaction.atomic
def cancel_order(order: Order) -> Order:
    """Annule une commande : remet les articles en stock et retire les points fidélité gagnés."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status == OrderStatus.CANCELLED:
        return order
    if order.status in (OrderStatus.DELIVERED, OrderStatus.PICKED_UP):
        raise BusinessError("Une commande livrée ou retirée ne peut plus être annulée.")

    for item in order.items.all():
        if item.variant_id is not None:
            ProductVariant.objects.filter(pk=item.variant_id).update(stock=F("stock") + item.quantity)
        Product.objects.filter(slug=item.product_slug).update(
            sales_count=Greatest(F("sales_count") - item.quantity, Value(0))
        )
    if order.user_id and order.loyalty_points_earned:
        User.objects.filter(pk=order.user_id).update(
            loyalty_points=Greatest(F("loyalty_points") - order.loyalty_points_earned, Value(0))
        )

    order.status = OrderStatus.CANCELLED
    order.save(update_fields=["status", "updated_at"])
    return order
