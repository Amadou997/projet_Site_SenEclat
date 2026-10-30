from django.contrib.auth import authenticate, password_validation
from rest_framework import serializers

from apps.accounts.models import User
from apps.core.fields import SenegalPhoneField


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "phone",
            "first_name",
            "last_name",
            "loyalty_points",
            "address_zone",
            "address_line",
            "address_landmark",
            "is_staff",
        ]
        read_only_fields = ["id", "email", "phone", "loyalty_points", "is_staff"]


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=80, trim_whitespace=True)
    last_name = serializers.CharField(max_length=80, trim_whitespace=True)
    email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    phone = SenegalPhoneField(required=False, allow_null=True, allow_blank=True)
    password = serializers.CharField(write_only=True, max_length=128, style={"input_type": "password"})

    def validate_email(self, value):
        if not value:
            return None
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet e-mail.")
        return value

    def validate_phone(self, value):
        if not value:
            return None
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec ce numéro.")
        return value

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone"):
            raise serializers.ValidationError({"email": "Indiquez un e-mail ou un numéro de téléphone."})
        candidate = User(first_name=attrs["first_name"], last_name=attrs["last_name"], email=attrs.get("email"))
        try:
            password_validation.validate_password(attrs["password"], candidate)
        except Exception as exc:  # ValidationError de Django → erreur DRF
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data.get("email"),
            password=validated_data["password"],
            phone=validated_data.get("phone"),
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate_new_password(self, value):
        try:
            password_validation.validate_password(value, self.context["request"].user)
        except Exception as exc:  # ValidationError de Django → erreur DRF
            raise serializers.ValidationError(list(exc.messages)) from exc
        return value


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(max_length=254, help_text="E-mail ou téléphone")
    password = serializers.CharField(write_only=True, max_length=128, style={"input_type": "password"})

    def validate(self, attrs):
        user = authenticate(self.context.get("request"), username=attrs["identifier"], password=attrs["password"])
        if user is None:
            # Message volontairement générique : ne révèle pas si le compte existe.
            raise serializers.ValidationError("Identifiants incorrects.", code="authorization")
        attrs["user"] = user
        return attrs
