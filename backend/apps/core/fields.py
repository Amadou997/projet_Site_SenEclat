from django.core.exceptions import ValidationError
from rest_framework import serializers

from apps.core.phone import normalize_sn_phone


class SenegalPhoneField(serializers.CharField):
    """Champ DRF qui valide et normalise un numéro sénégalais sur 9 chiffres."""

    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", 20)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        try:
            return normalize_sn_phone(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages[0]) from exc
