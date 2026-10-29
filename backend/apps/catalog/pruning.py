"""Catalogue réduit aux produits qui ont une photo officielle (fixtures du dossier `fixtures/`)."""

import json

from django.conf import settings


def kept_references() -> set[str]:
    fixtures = settings.BASE_DIR / "fixtures"
    refs = set()
    for name in ("photos_produits.json", "produits_ajoutes.json"):
        refs |= {e["reference"] for e in json.loads((fixtures / name).read_text(encoding="utf-8"))}
    return refs


def prune_catalogue(product_model) -> int:
    """Supprime les produits sans photo officielle ; les commandes gardent nom et prix (variante mise à NULL)."""
    stale = product_model.objects.exclude(reference__in=kept_references())
    count = stale.count()
    stale.delete()
    return count
