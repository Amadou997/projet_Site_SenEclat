"""Données de démonstration (idempotent) : `python manage.py seed`.

Les produits sont fictifs et illustrent le catalogue en attendant les fiches officielles
fournies par Sen Éclat. Le compte administrateur n'est créé que si SEED_ADMIN_EMAIL et
SEED_ADMIN_PASSWORD sont définis dans l'environnement.
"""

import os

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.catalog.models import Category, Product, ProductVariant
from apps.orders.models import PromoCode

# (slug, nom, catégorie, accroche, nouveau, meilleure vente, [(format, prix, prix barré, stock)])
CATALOG = [
    ("huile-seche-argan-or", "Huile sèche Argan d'Or", Category.BEAUTE,
     "Nourrit peau et cheveux sans effet gras, pour un fini satiné lumineux.", False, True,
     [("50 ml", 8500, None, 24), ("100 ml", 14500, None, 12)]),
    ("lait-corps-karite-fleur-oranger", "Lait corps Karité & Fleur d'oranger", Category.BEAUTE,
     "Hydratation 24 h et parfum délicat inspiré des jardins andalous.", True, False,
     [("250 ml", 6500, None, 30), ("500 ml", 11000, None, 18)]),
    ("shampooing-doux-romarin", "Shampooing doux au Romarin", Category.BEAUTE,
     "Lave en douceur et fortifie les cheveux texturés dès la racine.", False, False,
     [("300 ml", 5500, 6900, 40)]),
    ("gommage-sucre-vanille", "Gommage au sucre Vanille", Category.BEAUTE,
     "Exfolie et adoucit pour une peau lisse et éclatante.", False, False,
     [("200 g", 7000, None, 0)]),
    ("creme-visage-aloe-vera", "Crème visage Aloe Vera", Category.COSMETIQUES,
     "Texture légère qui apaise et hydrate les peaux sensibles au climat chaud.", False, True,
     [("50 ml", 9500, None, 20)]),
    ("baume-levres-miel", "Baume lèvres au Miel", Category.COSMETIQUES,
     "Répare et protège les lèvres sèches tout au long de la journée.", True, False,
     [("15 ml", 2500, None, 60)]),
    ("serum-eclat-vitamine-c", "Sérum Éclat Vitamine C", Category.COSMETIQUES,
     "Unifie le teint et ravive l'éclat naturel de la peau.", False, False,
     [("30 ml", 12500, 15000, 14)]),
    ("creme-mains-amande", "Crème mains à l'Amande douce", Category.COSMETIQUES,
     "Nourrit intensément les mains sans laisser de film gras.", False, False,
     [("75 ml", 4000, None, 3)]),
    ("lessive-liquide-marseille", "Lessive liquide Savon de Marseille", Category.LESSIVE,
     "Linge propre et doux, efficace dès 30 °C, parfum frais longue durée.", False, True,
     [("1,5 L", 5500, 6500, 50), ("3 L", 9900, 11500, 25)]),
    ("adoucissant-fleurs-blanches", "Adoucissant Fleurs blanches", Category.LESSIVE,
     "Fibres assouplies, repassage facilité et parfum délicat.", True, False,
     [("2 L", 4500, None, 35)]),
    ("detachant-avant-lavage", "Détachant avant-lavage", Category.LESSIVE,
     "Élimine les taches tenaces sur le blanc comme sur les couleurs.", False, False,
     [("750 ml", 3500, None, 22)]),
    ("lessive-poudre-blancheur", "Lessive poudre Blancheur", Category.LESSIVE,
     "Ravive le blanc et respecte les couleurs, lavage main ou machine.", False, False,
     [("2 kg", 6000, None, 16)]),
    ("nettoyant-multi-surfaces-citron", "Nettoyant multi-surfaces Citron", Category.NETTOYAGE,
     "Dégraisse et fait briller toutes les surfaces lavables.", False, True,
     [("750 ml", 2900, None, 70), ("1,5 L", 4900, None, 30)]),
    ("liquide-vaisselle-concentre", "Liquide vaisselle concentré", Category.NETTOYAGE,
     "Ultra-dégraissant et doux pour les mains, quelques gouttes suffisent.", True, False,
     [("1 L", 2500, None, 45)]),
    ("javel-parfumee-lavande", "Eau de Javel parfumée Lavande", Category.NETTOYAGE,
     "Désinfecte et parfume sols et sanitaires.", False, False,
     [("2 L", 2000, 2400, 55)]),
    ("nettoyant-sols-marseille", "Nettoyant sols au Savon de Marseille", Category.NETTOYAGE,
     "Nettoie en profondeur et protège les carrelages.", False, False,
     [("1,5 L", 3800, None, 28)]),
]


class Command(BaseCommand):
    help = "Charge un catalogue de démonstration, le code promo ECLAT10 et, si configuré, un administrateur."

    @transaction.atomic
    def handle(self, *args, **options):
        created = 0
        for index, (slug, name, category, pitch, is_new, best, variants) in enumerate(CATALOG, start=1):
            product, was_created = Product.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "category": category,
                    "reference": f"SE-{category[:3].upper()}-{index:03d}",
                    "short_description": pitch,
                    "description": f"{pitch} Formulé selon le savoir-faire espagnol et sélectionné par Sen Éclat.",
                    "usage": "Conseils d'utilisation et dosage recommandés par le fabricant — fiche officielle à fournir.",
                    "composition": "Liste des ingrédients telle qu'indiquée sur l'emballage — fiche officielle à fournir.",
                    "precautions": "Tenir hors de portée des enfants. Conserver à l'abri de la chaleur et de la lumière.",
                    "is_new": is_new,
                    "is_bestseller": best,
                    "sales_count": 40 if best else index,
                },
            )
            if was_created:
                created += 1
                ProductVariant.objects.bulk_create(
                    ProductVariant(
                        product=product, label=label, sku=f"{slug}-{pos}", price=price,
                        compare_at_price=compare, stock=stock, position=pos,
                    )
                    for pos, (label, price, compare, stock) in enumerate(variants)
                )
        self.stdout.write(self.style.SUCCESS(f"OK - {created} produit(s) créé(s)"))

        _, promo_created = PromoCode.objects.get_or_create(
            code="ECLAT10", defaults={"percent_off": 10, "min_subtotal": 10000}
        )
        if promo_created:
            self.stdout.write(self.style.SUCCESS("OK - Code promo ECLAT10 créé (-10 % dès 10 000 FCFA)"))

        email, password = os.environ.get("SEED_ADMIN_EMAIL"), os.environ.get("SEED_ADMIN_PASSWORD")
        if email and password and not User.objects.filter(email__iexact=email).exists():
            User.objects.create_superuser(email=email, password=password, first_name="Admin", last_name="Sen Éclat")
            self.stdout.write(self.style.SUCCESS(f"OK - Administrateur {email} créé"))
