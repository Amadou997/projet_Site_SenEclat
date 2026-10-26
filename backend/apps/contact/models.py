from django.db import models


class Subject(models.TextChoices):
    PRODUCT = "produit", "Question sur un produit"
    TRACKING = "suivi", "Suivi de commande"
    DELIVERY = "livraison", "Livraison"
    RETURN = "retour", "Retour ou réclamation"
    OTHER = "autre", "Autre"


class ContactMessage(models.Model):
    full_name = models.CharField("nom complet", max_length=160)
    phone = models.CharField("téléphone", max_length=9)
    subject = models.CharField("sujet", max_length=20, choices=Subject.choices)
    message = models.TextField()
    is_handled = models.BooleanField("traité", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "message"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.full_name} — {self.get_subject_display()}"
