from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken

from apps.accounts.models import User
from apps.accounts.serializers import LoginSerializer, RegisterSerializer, UserSerializer
from apps.accounts.tokens import clear_refresh_cookie, issue_tokens, revoke_all_tokens, session_response


def _require_ajax_header(request) -> None:
    """Défense CSRF en profondeur pour les routes qui lisent le cookie : en plus de
    SameSite=Strict, on exige un en-tête qu'un formulaire cross-site ne peut pas poser."""
    if request.headers.get("X-Requested-With") != "XMLHttpRequest":
        raise PermissionDenied("En-tête X-Requested-With manquant.")


def _refresh_cookie(request) -> str | None:
    return request.COOKIES.get(settings.JWT_REFRESH_COOKIE["name"])


class AuthThrottleMixin:
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class RegisterView(AuthThrottleMixin, APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return session_response(user, issue_tokens(user), status=status.HTTP_201_CREATED)


class LoginView(AuthThrottleMixin, APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response({"detail": "Identifiants incorrects."}, status=status.HTTP_401_UNAUTHORIZED)
        user = serializer.validated_data["user"]
        return session_response(user, issue_tokens(user))


class RefreshView(AuthThrottleMixin, APIView):
    """Échange le refresh token (cookie) contre un nouvel access token + un nouveau refresh.

    L'ancien refresh est mis en liste noire. S'il est présenté une seconde fois, c'est
    le signe d'un vol : toutes les sessions de l'utilisateur sont révoquées.
    """

    throttle_scope = None  # appelé automatiquement par le front, pas de limite stricte

    def post(self, request):
        _require_ajax_header(request)
        raw = _refresh_cookie(request)
        if not raw:
            return self._fail("Session absente.")

        try:
            current = RefreshToken(raw)
        except TokenError:
            self._handle_possible_reuse(raw)
            return self._fail("Session expirée. Veuillez vous reconnecter.")

        user = User.objects.filter(pk=current["user_id"], is_active=True).first()
        if user is None:
            return self._fail("Compte indisponible.")

        current.blacklist()
        return session_response(user, RefreshToken.for_user(user))

    @staticmethod
    def _handle_possible_reuse(raw: str) -> None:
        try:
            token = UntypedToken(raw)  # signature et expiration valides…
        except TokenError:
            return
        jti = token.get("jti")
        if jti and BlacklistedToken.objects.filter(token__jti=jti).exists():  # …mais déjà consommé
            revoke_all_tokens(token["user_id"])

    @staticmethod
    def _fail(detail: str) -> Response:
        response = Response({"detail": detail}, status=status.HTTP_401_UNAUTHORIZED)
        clear_refresh_cookie(response)
        return response


class LogoutView(AuthThrottleMixin, APIView):
    throttle_scope = None

    def post(self, request):
        _require_ajax_header(request)
        raw = _refresh_cookie(request)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user
