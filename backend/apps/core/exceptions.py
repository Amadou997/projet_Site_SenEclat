import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("sen_eclat")


class BusinessError(Exception):
    """Erreur métier attendue (stock insuffisant, code promo invalide…), renvoyée en 422."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


def api_exception_handler(exc, context):
    """Uniformise les erreurs : toujours `{"detail": …}` (+ `errors` pour la validation)."""
    if isinstance(exc, BusinessError):
        return Response({"detail": exc.detail}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    response = exception_handler(exc, context)
    if response is None:
        # Erreur inattendue : on journalise la trace mais on ne divulgue rien au client.
        logger.exception("Erreur non gérée", exc_info=exc)
        return Response({"detail": "Une erreur interne est survenue."}, status=500)

    if isinstance(response.data, dict) and "detail" not in response.data:
        errors = response.data
        first = next(iter(errors.values()), None)
        message = first[0] if isinstance(first, list) and first else "Certaines informations sont invalides."
        response.data = {"detail": str(message), "errors": errors}
    elif isinstance(response.data, list):
        response.data = {"detail": str(response.data[0]) if response.data else "Requête invalide."}
    return response
