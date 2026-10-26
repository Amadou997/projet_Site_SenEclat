from django.db.models import Count
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.catalog.filters import SORTS, ProductFilter
from apps.catalog.models import Category, Product
from apps.catalog.serializers import ProductDetailSerializer, ProductListSerializer


class CatalogPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 48

    def get_paginated_response(self, data):
        return Response(
            {
                "items": data,
                "total": self.page.paginator.count,
                "page": self.page.number,
                "pages": self.page.paginator.num_pages,
                "facets": getattr(self, "facets", []),
            }
        )


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Catalogue public : liste filtrable / triable / paginée et fiche produit par slug."""

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    filterset_class = ProductFilter
    pagination_class = CatalogPagination

    def get_queryset(self):
        # Ordre explicite : Django ignore Meta.ordering sur les requêtes agrégées (GROUP BY).
        return Product.objects.active().with_listing_data().order_by(*SORTS["relevance"])

    def get_serializer_class(self):
        return ProductDetailSerializer if self.action == "retrieve" else ProductListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        self.paginator.facets = self._category_facets(request)
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def _category_facets(self, request):
        """Compteurs par catégorie avec tous les filtres actifs, sauf la catégorie elle-même."""
        params = request.query_params.copy()
        params.pop("category", None)
        matching = ProductFilter(params, queryset=Product.objects.active().with_listing_data()).qs
        counts = dict(
            Product.objects.filter(pk__in=matching.order_by().values("pk"))
            .values_list("category")
            .annotate(n=Count("id"))
            .order_by()
        )
        return [{"value": value, "label": label, "count": counts.get(value, 0)} for value, label in Category.choices]

    @action(detail=True)
    def related(self, request, slug=None):
        product = self.get_object()
        queryset = self.get_queryset().exclude(pk=product.pk)
        same = list(queryset.filter(category=product.category).order_by("-sales_count")[:4])
        if len(same) < 4:
            same += list(queryset.exclude(pk__in=[p.pk for p in same]).order_by("-sales_count")[: 4 - len(same)])
        return Response(ProductListSerializer(same, many=True).data)
