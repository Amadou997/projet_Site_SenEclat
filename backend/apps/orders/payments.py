"""Point d'intégration des prestataires de paiement.

Wave, Orange Money et la carte ne sont pas encore contractualisés : la passerelle simulée
valide immédiatement les paiements mobiles hors production. Pour brancher un vrai
prestataire, implémenter `PaymentGateway.initiate` (création de la demande de paiement)
puis mettre à jour `payment_status` via un webhook signé.
"""

from typing import Protocol

from django.conf import settings

from apps.orders.models import Order, PaymentMethod, PaymentStatus


class PaymentGateway(Protocol):
    def initiate(self, order: Order) -> str: ...


class SimulatedGateway:
    def __init__(self, auto_approve: bool) -> None:
        self.auto_approve = auto_approve

    def initiate(self, order: Order) -> str:
        if order.payment_method == PaymentMethod.CASH_ON_DELIVERY:
            return PaymentStatus.ON_DELIVERY
        return PaymentStatus.PAID if self.auto_approve else PaymentStatus.PENDING


def get_gateway() -> PaymentGateway:
    return SimulatedGateway(auto_approve=settings.SEN_ECLAT["PAYMENTS_AUTO_APPROVE"])
