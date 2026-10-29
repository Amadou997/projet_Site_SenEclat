from django.db import migrations

from apps.catalog.pruning import prune_catalogue


def prune(apps, schema_editor):
    prune_catalogue(apps.get_model("catalog", "Product"))


class Migration(migrations.Migration):
    """Exécutée une seule fois : les produits créés ensuite dans le back-office ne sont jamais touchés."""

    dependencies = [
        ("catalog", "0002_product_image_alter_product_image_url"),
    ]

    operations = [
        migrations.RunPython(prune, migrations.RunPython.noop),
    ]
