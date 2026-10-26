from django.urls import path

from apps.orders import views

urlpatterns = [
    path("store/config/", views.StoreConfigView.as_view(), name="store-config"),
    path("cart/quote/", views.QuoteView.as_view(), name="cart-quote"),
    path("orders/", views.OrderListCreateView.as_view(), name="order-list"),
    path("orders/<str:number>/", views.OrderDetailView.as_view(), name="order-detail"),
]
