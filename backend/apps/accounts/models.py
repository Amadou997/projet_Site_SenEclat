from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models import Q
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str | None, password: str | None, **extra):
        if not email and not extra.get("phone"):
            raise ValueError("Un e-mail ou un téléphone est requis.")
        user = self.model(email=self.normalize_email(email) if email else None, **extra)
        user.set_password(password)
        user.full_clean(exclude=["password"])
        user.save(using=self._db)
        return user

    def create_user(self, email: str | None = None, password: str | None = None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email: str, password: str, **extra):
        extra.update(is_staff=True, is_superuser=True)
        return self._create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """Client Sen Éclat : identifiable par e-mail **ou** téléphone (comme sur la maquette)."""

    email = models.EmailField("e-mail", unique=True, null=True, blank=True)
    phone = models.CharField("téléphone", max_length=9, unique=True, null=True, blank=True)
    first_name = models.CharField("prénom", max_length=80)
    last_name = models.CharField("nom", max_length=80)

    loyalty_points = models.PositiveIntegerField("points fidélité", default=0)
    address_zone = models.CharField("commune / quartier", max_length=80, blank=True)
    address_line = models.CharField("adresse", max_length=200, blank=True)
    address_landmark = models.CharField("point de repère", max_length=200, blank=True)

    is_active = models.BooleanField(default=True)
    password_changed_at = models.DateTimeField("mot de passe changé le", null=True, blank=True, editable=False)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = "client"
        constraints = [
            models.CheckConstraint(
                condition=Q(email__isnull=False) | Q(phone__isnull=False),
                name="user_has_email_or_phone",
            )
        ]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} <{self.email or self.phone}>"
