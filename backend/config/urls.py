from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve


def health(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.orders.urls")),
    path("api/", include("apps.contact.urls")),
    path("api/admin/", include("apps.backoffice.urls")),
]

admin.site.site_header = "Sen Éclat — administration"
admin.site.site_title = "Sen Éclat"

if settings.DEBUG:
    urlpatterns += [path("api-auth/", include("rest_framework.urls"))]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Pas de serveur web dédié sur Render : Django sert lui-même les images produits.
    urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]
