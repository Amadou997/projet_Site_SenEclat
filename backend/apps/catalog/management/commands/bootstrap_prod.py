"""Initialisation de la production : `python manage.py bootstrap_prod` (lancé à chaque démarrage).

Idempotent : le catalogue (`fixtures/catalogue.json`) n'est chargé que si la base ne contient
encore aucun produit, pour ne jamais écraser les modifications faites dans le back-office.
Les photos officielles (`fixtures/photos_produits.json`) remplacent les visuels provisoires,
avec le nom et l'accroche lus sur l'emballage, uniquement pour les produits qui ont encore
leur visuel d'origine : une photo changée depuis le back-office n'est jamais écrasée.
Les produits ajoutés après le chargement initial (`fixtures/produits_ajoutes.json`) sont créés
s'ils n'existent pas encore (même référence ou même slug), sans jamais toucher à l'existant.
Le compte administrateur n'est créé que si ADMIN_EMAIL et ADMIN_PASSWORD sont définis et
qu'aucun compte n'existe déjà avec cet e-mail.
"""

import json
import os

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.accounts.models import User
from apps.catalog.models import Product


class Command(BaseCommand):
    help = "Charge le catalogue initial et crée l'administrateur si nécessaire."

    def handle(self, *args, **options):
        if Product.objects.exists():
            self.stdout.write("Catalogue déjà présent : chargement ignoré.")
        else:
            call_command("loaddata", str(settings.BASE_DIR / "fixtures" / "catalogue.json"))
            self.stdout.write(self.style.SUCCESS("Catalogue initial chargé."))

        self.add_products()
        self.apply_photos()

        email = os.environ.get("ADMIN_EMAIL", "").strip()
        password = os.environ.get("ADMIN_PASSWORD", "")
        if not (email and password):
            self.stdout.write("ADMIN_EMAIL / ADMIN_PASSWORD absents : aucun administrateur créé.")
        elif User.objects.filter(email__iexact=email).exists():
            self.stdout.write("Administrateur déjà présent.")
        else:
            User.objects.create_superuser(email=email, password=password, first_name="Admin", last_name="Sen Éclat")
            self.stdout.write(self.style.SUCCESS(f"Administrateur {email} créé."))

    def add_products(self):
        path = settings.BASE_DIR / "fixtures" / "produits_ajoutes.json"
        created = 0
        for entry in json.loads(path.read_text(encoding="utf-8")):
            if Product.objects.filter(Q(reference=entry["reference"]) | Q(slug=entry["slug"])).exists():
                continue
            Product.objects.create(**entry)
            created += 1
        self.stdout.write(f"Produits ajoutés : {created}.")

    def apply_photos(self):
        path = settings.BASE_DIR / "fixtures" / "photos_produits.json"
        updated = 0
        for entry in json.loads(path.read_text(encoding="utf-8")):
            product = Product.objects.filter(reference=entry["reference"], image=entry["old_image"]).first()
            if product is None:
                continue
            # La description commence par l'accroche ; le reste (référence, EAN) est conservé.
            _, sep, rest = product.description.partition("\n\n")
            product.description = entry["short_description"] + (sep + rest if sep else "")
            product.short_description = entry["short_description"]
            product.name = entry["name"]
            product.image = entry["image"]
            product.save(update_fields=["name", "short_description", "description", "image", "updated_at"])
            updated += 1
        self.stdout.write(f"Photos produits appliquées : {updated}.")
