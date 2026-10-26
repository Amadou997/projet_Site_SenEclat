from django.contrib.auth.backends import ModelBackend
from django.core.exceptions import ValidationError

from apps.accounts.models import User
from apps.core.phone import normalize_sn_phone


class EmailOrPhoneBackend(ModelBackend):
    """Authentifie avec un e-mail ou un numéro sénégalais dans le même champ."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = (username or kwargs.get("email") or "").strip()
        if not identifier or password is None:
            return None

        if "@" in identifier:
            lookup = {"email__iexact": identifier}
        else:
            try:
                lookup = {"phone": normalize_sn_phone(identifier)}
            except ValidationError:
                return None

        user = User.objects.filter(**lookup).first()
        if user is None:
            # Hachage factice : temps de réponse identique que le compte existe ou non.
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
