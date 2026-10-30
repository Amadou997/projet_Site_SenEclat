import pytest
from rest_framework_simplejwt.tokens import AccessToken

from tests.conftest import AJAX, PASSWORD, register

pytestmark = pytest.mark.django_db


def test_register_returns_access_and_sets_httponly_refresh_cookie(api):
    response = api.post(
        "/api/auth/register/",
        {"first_name": "Awa", "last_name": "Diop", "phone": "+221 77 123 45 67", "password": PASSWORD},
        format="json",
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["phone"] == "771234567"
    assert "refresh" not in body  # le refresh token ne transite jamais dans le corps

    cookie = response.cookies["se_refresh"]
    assert cookie["httponly"]
    assert cookie["samesite"] == "Strict"
    assert cookie["path"] == "/api/auth/"


def test_register_rejects_weak_password_duplicates_and_missing_contact(api):
    weak = api.post(
        "/api/auth/register/",
        {"first_name": "A", "last_name": "B", "email": "a@b.sn", "password": "12345678"},
        format="json",
    )
    assert weak.status_code == 400

    no_contact = api.post(
        "/api/auth/register/", {"first_name": "A", "last_name": "B", "password": PASSWORD}, format="json"
    )
    assert no_contact.status_code == 400

    register(api)
    duplicate = api.post(
        "/api/auth/register/",
        {"first_name": "A", "last_name": "B", "email": "AWA@example.com", "password": PASSWORD},
        format="json",
    )
    assert duplicate.status_code == 400
    assert "existe déjà" in duplicate.json()["detail"]


def test_login_with_email_or_phone_and_access_protected_route(api):
    api.post(
        "/api/auth/register/",
        {"first_name": "Awa", "last_name": "Diop", "email": "awa@example.com", "phone": "771234567",
         "password": PASSWORD},
        format="json",
    )
    api.cookies.clear()

    assert api.post("/api/auth/login/", {"identifier": "awa@example.com", "password": "faux"}).status_code == 401
    by_phone = api.post("/api/auth/login/", {"identifier": "77 123 45 67", "password": PASSWORD})
    assert by_phone.status_code == 200

    token = by_phone.json()["access"]
    assert api.get("/api/auth/me/").status_code == 401
    me = api.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
    assert me.status_code == 200
    assert me.json()["email"] == "awa@example.com"


def test_rejects_tampered_and_refresh_tokens_as_bearer(api):
    body = register(api)
    access = body["access"]
    tampered = access[:-3] + ("abc" if not access.endswith("abc") else "xyz")
    assert api.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {tampered}").status_code == 401

    refresh = api.cookies["se_refresh"].value
    assert api.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {refresh}").status_code == 401

    claims = AccessToken(access)
    assert claims["aud"] == "sen-eclat-web"
    assert claims["iss"] == "sen-eclat-api"


def test_refresh_rotates_and_reuse_revokes_every_session(api):
    register(api)
    first = api.cookies["se_refresh"].value

    assert api.post("/api/auth/refresh/").status_code == 403  # en-tête anti-CSRF manquant

    rotated = api.post("/api/auth/refresh/", **AJAX)
    assert rotated.status_code == 200
    assert rotated.json()["access"]
    second = api.cookies["se_refresh"].value
    assert second != first

    # Rejouer l'ancien jeton (vol présumé) révoque aussi le jeton courant.
    api.cookies["se_refresh"] = first
    assert api.post("/api/auth/refresh/", **AJAX).status_code == 401
    api.cookies["se_refresh"] = second
    assert api.post("/api/auth/refresh/", **AJAX).status_code == 401


def test_logout_blacklists_refresh_token(api):
    register(api)
    token = api.cookies["se_refresh"].value
    response = api.post("/api/auth/logout/", **AJAX)
    assert response.status_code == 204
    assert response.cookies["se_refresh"].value == ""
    api.cookies["se_refresh"] = token
    assert api.post("/api/auth/refresh/", **AJAX).status_code == 401


def test_profile_update_cannot_escalate_privileges(api):
    access = register(api)["access"]
    response = api.patch(
        "/api/auth/me/",
        {"address_zone": "Point E", "is_staff": True, "loyalty_points": 9999},
        format="json",
        HTTP_AUTHORIZATION=f"Bearer {access}",
    )
    assert response.status_code == 200
    assert response.json()["address_zone"] == "Point E"
    assert response.json()["is_staff"] is False
    assert response.json()["loyalty_points"] == 0


def test_login_is_rate_limited(api):
    codes = [
        api.post("/api/auth/login/", {"identifier": "x@y.sn", "password": "nope"}).status_code for _ in range(12)
    ]
    assert codes[-1] == 429


def test_change_password_checks_current_and_revokes_other_sessions(api):
    from rest_framework.test import APIClient

    email = "awa@example.sn"
    login = {"identifier": email, "password": PASSWORD}
    api.post("/api/auth/register/", {"first_name": "Awa", "last_name": "Diop", "email": email, "password": PASSWORD}, format="json")
    other = APIClient()
    assert other.post("/api/auth/login/", login, format="json").status_code == 200
    access = api.post("/api/auth/login/", login, format="json").json()["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    url = "/api/auth/change-password/"
    new = "Autre-Secret-9271!"

    assert api.post(url, {"current_password": "faux", "new_password": new}, format="json").status_code == 400
    assert api.post(url, {"current_password": PASSWORD, "new_password": "12345678"}, format="json").status_code == 400
    done = api.post(url, {"current_password": PASSWORD, "new_password": new}, format="json")
    assert done.status_code == 200 and done.json()["access"] and "se_refresh" in done.cookies

    assert other.post("/api/auth/refresh/", **AJAX).status_code == 401
    assert api.post("/api/auth/refresh/", **AJAX).status_code == 200
    fresh = APIClient()
    assert fresh.post("/api/auth/login/", login, format="json").status_code == 401
    assert fresh.post("/api/auth/login/", {"identifier": email, "password": new}, format="json").status_code == 200
    assert APIClient().post(url, {"current_password": new, "new_password": PASSWORD}, format="json").status_code == 401
