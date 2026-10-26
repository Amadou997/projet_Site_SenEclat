import uuid
from pathlib import Path

from django.db import models
from django.db.models import Exists, F, Min, OuterRef, Q


class Category(models.TextChoices):
    BEAUTE = "beaute", "Beauté"
    COSMETIQUES = "cosmetiques", "Cosmétiques"
    LESSIVE = "lessive", "Lessive"
    NETTOYAGE = "nettoyage", "Nettoyage"


class ProductQuerySet(models.QuerySet):
    def active(self):
        return self.filter(is_active=True)

    def with_listing_data(self):
        """Annote le prix « à partir de », la promo et le stock pour filtrer/trier en SQL."""
        variants = ProductVariant.objects.filter(product=OuterRef("pk"))
        return self.annotate(
            min_price=Min("variants__price"),
            has_promo=Exists(variants.filter(compare_at_price__gt=F("price"))),
            has_stock=Exists(variants.filter(stock__gt=0)),
        ).prefetch_related("variants")


def product_image_path(_instance: "Product", filename: str) -> str:
    # Nom aléatoire : on n'utilise jamais le nom de fichier fourni par le navigateur.
    return f"products/{uuid.uuid4().hex}{Path(filename).suffix.lower()}"


class Product(models.Model):
    slug = models.SlugField(max_length=120, unique=True)
    name = models.CharField("nom", max_length=160)
    category = models.CharField("catégorie", max_length=20, choices=Category.choices, db_index=True)
    reference = models.CharField("référence", max_length=40, unique=True)
    short_description = models.CharField("description courte", max_length=400)
    description = models.TextField(blank=True)
    usage = models.TextField("mode d'emploi", blank=True)
    composition = models.TextField(blank=True)
    precautions = models.TextField("précautions & conservation", blank=True)
    image = models.ImageField("image", upload_to=product_image_path, blank=True)
    image_url = models.URLField("image (lien externe)", blank=True)
    is_new = models.BooleanField("nouveauté", default=False, db_index=True)
    is_bestseller = models.BooleanField("meilleure vente", default=False, db_index=True)
    is_active = models.BooleanField("en ligne", default=True, db_index=True)
    sales_count = models.PositiveIntegerField("ventes", default=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProductQuerySet.as_manager()

    class Meta:
        verbose_name = "produit"
        ordering = ["-is_bestseller", "-is_new", "id"]

    def __str__(self) -> str:
        return self.name

    @property
    def display_image_url(self) -> str:
        """Image téléversée en priorité, sinon l'ancien lien externe."""
        return self.image.url if self.image else self.image_url


class ProductVariant(models.Model):
    """Contenance / format vendable, avec son propre prix (FCFA) et son propre stock."""

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    label = models.CharField("contenance", max_length=60)
    sku = models.CharField(max_length=60, unique=True)
    price = models.PositiveIntegerField("prix (FCFA)")
    compare_at_price = models.PositiveIntegerField("prix barré (FCFA)", null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "format"
        ordering = ["position", "id"]
        constraints = [
            models.CheckConstraint(condition=Q(price__gt=0), name="variant_price_positive"),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} — {self.label}"
