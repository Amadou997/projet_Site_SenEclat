"""Émission des JWT et gestion du cookie HttpOnly qui transporte le refresh token."""

from django.conf import settings
from django.contrib.auth.models import update_last_login
from rest_framework.response import Response
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer


def _cookie_conf() -> dict:
    return settings.JWT_REFRESH_COOKIE


def set_refresh_cookie(response: Response, refresh: RefreshToken) -> None:
    conf = _cookie_conf()
    response.set_cookie(
        conf["name"],
        str(refresh),
        max_age=int(refresh.lifetime.total_seconds()),
        path=conf["path"],
        httponly=conf["httponly"],
        secure=conf["secure"],
        samesite=conf["samesite"],
    )


def clear_refresh_cookie(response: Response) -> None:
    conf = _cookie_conf()
    response.delete_cookie(conf["name"], path=conf["path"], samesite=conf["samesite"])


def session_response(user: User, refresh: RefreshToken, status: int = 200) -> Response:
    """Réponse standard : access token + profil dans le corps, refresh token dans le cookie."""
    access = refresh.access_token
    response = Response(
        {
            "access": str(access),
            "access_expires_at": access["exp"],
            "user": UserSerializer(user).data,
        },
        status=status,
    )
    response["Cache-Control"] = "no-store"
    set_refresh_cookie(response, refresh)
    return response


def issue_tokens(user: User) -> RefreshToken:
    update_last_login(None, user)
    return RefreshToken.for_user(user)


def revoke_all_tokens(user_id: int) -> None:
    """Met en liste noire tous les refresh tokens encore valides d'un utilisateur."""
    outstanding = OutstandingToken.objects.filter(user_id=user_id).exclude(blacklistedtoken__isnull=False)
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=token) for token in outstanding], ignore_conflicts=True
    )
