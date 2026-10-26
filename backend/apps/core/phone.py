import re

from django.core.exceptions import ValidationError

_SN_MOBILE = re.compile(r"^(7[05678]|33)\d{7}$")


def normalize_sn_phone(value: str) -> str:
    """Accepte « 77 123 45 67 », « +221771234567 », « 00221 77… » et renvoie « 771234567 »."""
    digits = re.sub(r"[\s.\-()]", "", value or "")
    if digits.startswith("+221"):
        digits = digits[4:]
    elif digits.startswith("00221"):
        digits = digits[5:]
    if not _SN_MOBILE.fullmatch(digits):
        raise ValidationError("Numéro incomplet : saisissez 9 chiffres, par exemple 77 123 45 67.")
    return digits
