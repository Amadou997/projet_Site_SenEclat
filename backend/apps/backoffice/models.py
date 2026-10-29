from django.conf import settings
from django.db import models


def _default_zones() -> list[str]:
    return list(settings.SEN_ECLAT["DELIVERY_ZONES"])


def _default_announcements() -> list[str]:
    return ["Livraison à Dakar", "Retrait en boutique", "Conseil sur WhatsApp", "Paiement Wave & Orange Money"]


class SiteSettings(models.Model):
    """Paramètres de la boutique modifiables depuis le tableau de bord (une seule ligne, pk=1).

    Les valeurs initiales proviennent des variables d'environnement (`settings.SEN_ECLAT`).
    """

    delivery_fee_dakar = models.PositiveIntegerField("frais de livraison Dakar (FCFA)")
    delivery_zones = models.JSONField("communes desservies", default=_default_zones)
    fcfa_per_loyalty_point = models.PositiveIntegerField("FCFA par point fidélité")
    announcements = models.JSONField("bandeau d'annonces", default=_default_announcements, blank=True)
    # Outils de mesure d'audience : chargés par le front sur les pages publiques si renseignés.
    ga4_measurement_id = models.CharField("ID de mesure Google Analytics 4", max_length=20, blank=True)
    clarity_project_id = models.CharField("ID de projet Microsoft Clarity", max_length=20, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "paramètres du site"
        verbose_name_plural = "paramètres du site"
        constraints = [
            models.CheckConstraint(condition=models.Q(fcfa_per_loyalty_point__gt=0), name="loyalty_ratio_positive"),
        ]

    def __str__(self) -> str:
        return "Paramètres du site"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "SiteSettings":
        conf = settings.SEN_ECLAT
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={
                "delivery_fee_dakar": conf["DELIVERY_FEE_DAKAR"],
                "fcfa_per_loyalty_point": conf["FCFA_PER_LOYALTY_POINT"],
            },
        )
        return obj
