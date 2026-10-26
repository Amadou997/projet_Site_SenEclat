"""Initialisation de la production : `python manage.py bootstrap_prod` (lancé à chaque démarrage).

Idempotent : le catalogue (`fixtures/catalogue.json`) n'est chargé que si la base ne contient
encore aucun produit, pour ne jamais écraser les modifications faites dans le back-office.
Le compte administrateur n'est créé que si ADMIN_EMAIL et ADMIN_PASSWORD sont définis et
qu'aucun compte n'existe déjà avec cet e-mail.
"""

import os

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

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

        email = os.environ.get("ADMIN_EMAIL", "").strip()
        password = os.environ.get("ADMIN_PASSWORD", "")
        if not (email and password):
            self.stdout.write("ADMIN_EMAIL / ADMIN_PASSWORD absents : aucun administrateur créé.")
        elif User.objects.filter(email__iexact=email).exists():
            self.stdout.write("Administrateur déjà présent.")
        else:
            User.objects.create_superuser(email=email, password=password, first_name="Admin", last_name="Sen Éclat")
            self.stdout.write(self.style.SUCCESS(f"Administrateur {email} créé."))
