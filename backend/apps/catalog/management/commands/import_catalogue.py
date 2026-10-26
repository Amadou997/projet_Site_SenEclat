"""Import du catalogue fournisseur : `python manage.py import_catalogue <dossier>`.

Le dossier contient un `catalogue_produits*.csv` (reference;nom;categorie;code_barres;image)
et les images PNG. Idempotent : un produit est retrouvé par sa référence fournisseur
(suffixée du code-barres quand plusieurs lignes du CSV partagent la même référence).
Le CSV ne donne ni prix ni stock : les produits sont créés sans format, et les prix
se saisissent ensuite dans le back-office.
"""

import csv
import re
from collections import Counter
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.catalog.models import Category, Product

# Catégories du CSV absentes de la boutique : rattachées à l'univers le plus proche.
CATEGORY_MAP = {
    "beauté": Category.BEAUTE,
    "cosmétique": Category.COSMETIQUES,
    "lessives": Category.LESSIVE,
    "nettoyage": Category.NETTOYAGE,
    "bébé & hygiène": Category.COSMETIQUES,
    "maison & cuisine": Category.NETTOYAGE,
    "bricolage & auto": Category.NETTOYAGE,
}
# Articles « Maison & cuisine » liés au linge : rangés dans Lessive plutôt que Nettoyage.
LAUNDRY_KEYWORDS = ("cintres", "pinces à linge", "séchoir", "étendoir", "brosse à vêtements")

# (mots-clés, accroche) : la première règle dont un mot-clé figure dans le nom s'applique.
# L'ordre compte : les règles précises passent avant les plus générales.
PITCHES = [
    (("couches", "pants", "dodot"), "Couches absorbantes et douces qui gardent bébé au sec, de jour comme de nuit."),
    (("serviettes hygiéniques", "tampax", "protections"),
     "Protections hygiéniques confortables et discrètes, pour une absorption fiable au quotidien."),
    (("lingettes",), "Lingettes douces pour nettoyer la peau délicate de bébé en un geste."),
    (("papier toilette",), "Papier toilette doux et résistant, en pack familial."),
    (("sac à dos",), "Sac à dos pratique pour emporter partout les affaires de bébé."),
    (("mouchoirs",), "Mouchoirs doux et résistants, pour toute la famille."),
    # Linge et entretien de la maison
    (("après-shampooing", "masque capillaire", "crème douce", "crème douceur", "crème adoucissante"),
     "Soin capillaire qui démêle, nourrit et adoucit les cheveux."),
    (("lessive",), "Lessive pour un linge propre, frais et éclatant dès le premier lavage."),
    (("lagarto",), "Savon de ménage pur, idéal pour laver le linge à la main et détacher cols et poignets."),
    (("adoucissant",), "Adoucissant pour un linge souple, facile à repasser et délicatement parfumé."),
    (("javel",), "Eau de Javel qui désinfecte, blanchit et élimine les mauvaises odeurs."),
    (("activateur de lavage",), "Activateur de lavage qui renforce la lessive et ravive blancs et couleurs."),
    (("détachant", "oxygène actif", "oxi-white"), "Détachant qui élimine les taches tenaces et ravive les couleurs."),
    (("ammoniaque",), "Nettoyant puissant pour dégraisser sols et surfaces."),
    (("raticide",), "Raticide prêt à l'emploi contre rats et souris. À placer hors de portée des enfants et des animaux."),
    (("porte-balai",), "Support de brosse WC discret et facile à entretenir."),
    (("désodorisant wc",), "Désodorisant WC qui neutralise les odeurs et parfume durablement les toilettes."),
    (("wc",), "Nettoyant WC qui désinfecte, fait briller et parfume la cuvette."),
    (("insecticide", "anti-cafards", "raid", "attrape-mouches", "stockade"),
     "Insecticide efficace contre mouches, moustiques et insectes rampants."),
    (("spirales",), "Spirales anti-moustiques pour éloigner les insectes."),
    (("désodorisant", "spray d'ambiance", "air wick"),
     "Désodorisant d'intérieur qui neutralise les odeurs et parfume durablement la pièce."),
    (("vitres",), "Nettoyant vitres pour des surfaces brillantes, sans traces."),
    (("dégraissant moteur",), "Dégraissant puissant pour nettoyer moteurs et pièces mécaniques."),
    (("dégraissant",), "Dégraissant puissant pour la cuisine, les hottes et les surfaces encrassées."),
    (("anti-calcaire",), "Anti-calcaire qui élimine le tartre des robinets, douches et sanitaires."),
    (("salle de bain",), "Nettoyant salle de bain qui élimine calcaire et traces de savon."),
    (("spray meubles", "nettoyant meubles"), "Nettoyant meubles qui dépoussière et fait briller le bois et les surfaces."),
    (("nettoyant multi-usages", "spray nettoyant"),"Nettoyant multi-usages désinfectant, pour toutes les surfaces lavables."),
    (("vaisselle",), "Liquide vaisselle dégraissant, efficace dès quelques gouttes."),
    (("balai à franges",), "Balai à franges en microfibre qui capte la saleté et sèche rapidement."),
    (("serpillière",), "Serpillière épaisse et absorbante pour laver les sols."),
    (("essuie-tout",), "Essuie-tout absorbant et résistant, pour la cuisine et le ménage."),
    (("chiffon", "lavettes", "serviette séchage", "torchons"),
     "Chiffons absorbants pour nettoyer, essuyer et faire briller sans rayer."),
    (("éponge", "tampons à récurer"), "Pour récurer et nettoyer efficacement la vaisselle et les surfaces."),
    (("sacs",), "Sacs poubelle résistants pour une collecte des déchets propre et pratique."),
    (("poubelle",), "Poubelle robuste et facile à nettoyer, pour la cuisine, la salle de bain ou le bureau."),
    (("seau",), "Seau solide et pratique pour le ménage et le rangement."),
    (("plumeau",), "Plumeau qui capte la poussière sans rayer les surfaces fragiles."),
    (("manche",), "Manche robuste qui s'adapte aux balais, raclettes et brosses."),
    (("gants en nitrile",), "Gants en nitrile résistants, pour le ménage et la manipulation de produits d'entretien."),
    (("gants",), "Gants de protection résistants pour le bricolage et les travaux de manutention."),
    # Bricolage & auto
    (("peinture",), "Peinture en aérosol pour un fini uniforme et durable."),
    (("graisse", "lubrifiant", "huile multi-usages"),
     "Lubrifiant en aérosol qui protège de la rouille et débloque les mécanismes."),
    (("air comprimé",), "Air comprimé pour dépoussiérer claviers, appareils électroniques et recoins inaccessibles."),
    (("anti-crevaison",), "Bombe anti-crevaison qui répare et regonfle un pneu en quelques secondes."),
    (("cire",), "Cire nettoyante qui lave et fait briller la carrosserie rapidement."),
    (("pneus",), "Nettoyant qui ravive le noir des pneus et les protège."),
    (("tableau de bord",), "Nettoyant qui dépoussière, ravive et protège les plastiques du tableau de bord."),
    (("ameublement",), "Nettoyant mousse qui détache sièges, moquettes et tissus d'ameublement."),
    (("escabeau",), "Escabeau en aluminium léger et stable, avec marches antidérapantes."),
    (("genouillère",), "Genouillère rembourrée pour jardiner ou bricoler à genoux en tout confort."),
    (("étagère",), "Étagère métallique à 4 niveaux, robuste et facile à monter."),
    (("tabouret",), "Marchepied stable pour atteindre facilement les hauteurs."),
    # Maison & cuisine
    (("film alimentaire", "papier aluminium"), "Rouleau pour emballer et conserver les aliments au frais."),
    (("papier cuisine", "serviettes"), "Papier absorbant pratique pour la cuisine et la table."),
    (("poêle", "faitout", "marmite", "cocotte", "plat rectangulaire"),
     "Ustensile de cuisson de qualité, adapté à la cuisine de tous les jours."),
    (("cafetière",), "Cafetière italienne pour un café corsé et aromatique."),
    (("verres", "verre ", "flûtes", "tasses", "mug ", "chope", "coupes à glace"),
     "Verrerie et vaisselle de table pour servir boissons et desserts avec élégance."),
    (("saladier", "passoire", "couvercle", "plateau"),
     "Accessoire de cuisine pratique et résistant, pour préparer et servir."),
    (("distributeur de savon",), "Distributeur de savon liquide décoratif, pour la salle de bain ou la cuisine."),
    (("couteau",), "Couteau de cuisine à lame tranchante et manche ergonomique."),
    (("égouttoir",), "Égouttoir pratique pour égoutter vaisselle, couverts ou légumes."),
    (("louche", "écumoire", "spatule", "cuillère", "fourchette", "couverts", "râpe"),
     "Ustensile de cuisine solide et facile à nettoyer."),
    (("bol mélangeur", "bac gastronorme", "bac rectangulaire"),
     "Récipient résistant pour préparer, servir et conserver."),
    (("boîte alimentaire", "boîte hermétique", "bocal", "lunch box", "boîte isotherme", "set de boîtes"),
     "Contenant hermétique pour conserver et transporter les aliments en toute fraîcheur."),
    (("thermos", "isotherme", "gourde", "bouteille d'eau"),
     "Garde vos boissons chaudes ou froides pendant des heures."),
    (("glacière",), "Glacière portable pour garder boissons et repas au frais en sortie."),
    (("ventilateur",), "Ventilateur puissant pour rafraîchir efficacement la pièce."),
    (("micro-ondes",), "Four micro-ondes pour réchauffer et décongeler rapidement."),
    (("parasol",), "Parasol pour se protéger du soleil en terrasse, au jardin ou à la plage."),
    (("table à repasser",), "Table à repasser stable et réglable en hauteur, pour un repassage confortable."),
    (("chaise longue", "fauteuil"), "Mobilier de jardin confortable pour profiter de la terrasse ou du jardin."),
    (("boîte de rangement", "panier", "range-chaussures"), "Rangement pratique pour garder la maison ordonnée."),
    (("tapis de bain",), "Tapis de bain doux et absorbant, au dos antidérapant."),
    (("tapis", "paillasson"), "Tapis d'entrée qui retient la poussière et protège vos sols."),
    (("cintres",), "Cintres pour ranger vos vêtements et préserver leur forme."),
    (("pinces à linge",), "Pinces à linge solides pour étendre le linge en toute simplicité."),
    (("séchoir", "étendoir"), "Séchoir à linge pratique et peu encombrant."),
    (("brosse à vêtements",), "Brosse qui débarrasse les vêtements de la poussière et des peluches."),
    (("semelles",), "Semelles ergonomiques confortables, à découper à votre pointure."),
    # Beauté & hygiène
    (("coffret parfum",), "Coffret parfum : un flacon de 150 ml et son format voyage de 30 ml, idéal à offrir."),
    (("flacon parfum", "parfum caravan"), "Parfum en flacon de 150 ml, au sillage élégant et à la tenue durable."),
    (("brume", "body splash", "élixir corps"), "Brume parfumée pour le corps, fraîche et légère, à vaporiser à tout moment."),
    (("parfum", "utur", "coffret découverte"), "Parfum au sillage élégant et à la tenue durable."),
    (("cologne",), "Eau de Cologne fraîche et légère, à appliquer généreusement après la douche."),
    (("intime",), "Soin lavant intime doux, qui respecte l'équilibre naturel de la peau."),
    (("shampooing",), "Shampooing qui lave en douceur et laisse les cheveux souples et brillants."),
    (("lait corps", "lait corporel", "lotion corporelle"), "Soin hydratant pour une peau douce et nourrie toute la journée."),
    (("douche", "gel bain", "gel peau"), "Gel moussant qui nettoie en douceur et parfume délicatement la peau."),
    (("démaquillant",), "Soin démaquillant qui retire maquillage et impuretés en douceur."),
    (("lotion tonique",), "Lotion tonique qui purifie et rafraîchit le visage après le démaquillage."),
    (("huile corporelle",), "Huile à l'argan qui nourrit la peau et lui donne un aspect satiné."),
    (("dépilatoire",), "Crème dépilatoire pour une peau nette et douce, sans rasoir."),
    (("à raser",), "Pour un rasage précis et confortable, qui protège la peau du feu du rasoir."),
    (("coloration",), "Coloration permanente pour une couleur intense qui couvre les cheveux blancs."),
    (("crème", "beurre corporel"), "Crème hydratante qui nourrit la peau et la laisse douce et souple."),
    (("déodorant",), "Déodorant : protection efficace contre la transpiration et fraîcheur longue durée."),
    (("bain de bouche", "listerine", "plax"), "Bain de bouche pour une haleine fraîche et des dents et gencives protégées."),
    (("brosse à dents", "brosses à dents"), "Brosse à dents pour un nettoyage efficace des dents et des gencives."),
    (("dentifrice", "colgate", "signal", "sensodyne", "fluocaril"),
     "Dentifrice qui protège contre les caries et laisse une haleine fraîche."),
    (("rasoirs",), "Rasoirs jetables pour un rasage précis et confortable."),
    (("coupe-ongles",), "Coupe-ongles en acier, précis et facile à utiliser."),
    (("savon",), "Savon doux qui nettoie et prend soin de la peau."),
    (("balai", "pelle", "brosse"), "Accessoire de ménage robuste pour un entretien facile de la maison."),
]
DEFAULT_PITCH = "Produit sélectionné par Sen Éclat."
FORMAT_RE = re.compile(r"\b\d+(?:[,.]\d+)?(?:\+\d+)?\s?(?:ml|l|g|kg)\b", re.IGNORECASE)


def pitch_for(name: str) -> str:
    lowered = name.lower()
    pitch = next((p for keys, p in PITCHES if any(k in lowered for k in keys)), DEFAULT_PITCH)
    fmt = FORMAT_RE.search(name)
    return f"{pitch} Format : {fmt.group(0)}." if fmt else pitch


def category_for(name: str, csv_category: str) -> str:
    key = csv_category.strip().lower()
    if key not in CATEGORY_MAP:
        raise CommandError(f"Catégorie inconnue dans le CSV : {csv_category!r}")
    if key == "maison & cuisine" and any(k in name.lower() for k in LAUNDRY_KEYWORDS):
        return Category.LESSIVE
    return CATEGORY_MAP[key]


def unique_slug(name: str, exclude_pk: int | None) -> str:
    base = slugify(name)[:110] or "produit"
    slug, n = base, 2
    while Product.objects.filter(slug=slug).exclude(pk=exclude_pk).exists():
        slug, n = f"{base}-{n}", n + 1
    return slug


class Command(BaseCommand):
    help = "Importe les produits et images du catalogue fournisseur (CSV + PNG)."

    def add_arguments(self, parser):
        parser.add_argument("folder", type=Path)
        parser.add_argument(
            "--match", action="append", default=[], metavar="ID=IMAGE",
            help="Rattache un produit existant (id) à une ligne du CSV (nom du fichier image).",
        )
        parser.add_argument(
            "--delete", action="append", type=int, default=[], metavar="ID",
            help="Supprime un produit existant (ex. produit de démonstration).",
        )

    @transaction.atomic
    def handle(self, *args, folder: Path, match: list[str], delete: list[int], **options):
        csv_files = sorted(folder.glob("catalogue_produits*.csv"))
        if len(csv_files) != 1:
            raise CommandError(f"Un seul fichier catalogue_produits*.csv attendu dans {folder}")
        with csv_files[0].open(encoding="utf-8-sig", newline="") as fh:
            rows = list(csv.DictReader(fh, delimiter=";"))
        ref_counts = Counter(row["reference"].strip() for row in rows)

        matched = {image: int(pk) for pk, image in (m.split("=", 1) for m in match)}
        deleted, _ = Product.objects.filter(pk__in=delete).delete()

        created = updated = 0
        for row in rows:
            name, image_name = row["nom"].strip(), row["image"].strip()
            reference, ean = row["reference"].strip(), row["code_barres"].strip()
            if ref_counts[reference] > 1:
                reference = f"{reference}-{ean}"
            product = (
                Product.objects.filter(pk=matched[image_name]).first() if image_name in matched
                else Product.objects.filter(reference=reference).first()
            )
            is_new = product is None
            product = product or Product()

            product.name = name
            product.reference = reference
            product.category = category_for(name, row["categorie"])
            product.slug = unique_slug(name, product.pk)
            product.short_description = pitch_for(name)
            product.description = (
                f"{product.short_description}\n\nRéférence fournisseur : {reference}"
                f"\nCode-barres (EAN) : {ean}"
            )
            if not product.image:
                image_path = folder / image_name
                if not image_path.is_file():
                    raise CommandError(f"Image introuvable : {image_path}")
                with image_path.open("rb") as img:
                    product.image.save(image_name, File(img), save=False)
            product.save()
            created, updated = created + is_new, updated + (not is_new)

        self.stdout.write(self.style.SUCCESS(
            f"OK - {created} produit(s) créé(s), {updated} mis à jour, {deleted} objet(s) supprimé(s)"
        ))
