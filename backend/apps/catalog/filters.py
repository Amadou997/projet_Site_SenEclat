import django_filters
from django.db.models import F, Q

from apps.catalog.models import Category, Product

SORTS = {
    "relevance": ["-is_bestseller", "-is_new", "id"],
    "bestsellers": ["-sales_count", "id"],
    "newest": ["-is_new", "-created_at", "-id"],
    # Les produits sans prix (aucun format) passent en dernier dans les deux sens.
    "price_asc": [F("min_price").asc(nulls_last=True), "id"],
    "price_desc": [F("min_price").desc(nulls_last=True), "id"],
}


class ProductFilter(django_filters.FilterSet):
    category = django_filters.MultipleChoiceFilter(choices=Category.choices)
    q = django_filters.CharFilter(method="filter_search", max_length=80)
    min_price = django_filters.NumberFilter(field_name="min_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="min_price", lookup_expr="lte")
    in_stock = django_filters.BooleanFilter(method="filter_true", field_name="has_stock")
    promo = django_filters.BooleanFilter(method="filter_true", field_name="has_promo")
    new = django_filters.BooleanFilter(method="filter_true", field_name="is_new")
    bestseller = django_filters.BooleanFilter(method="filter_true", field_name="is_bestseller")
    sort = django_filters.ChoiceFilter(choices=[(k, k) for k in SORTS], method="apply_sort")

    class Meta:
        model = Product
        fields: list[str] = []

    def filter_true(self, queryset, name, value):
        # Une case décochée signifie « pas de filtre », pas « uniquement les faux ».
        return queryset.filter(**{name: True}) if value else queryset

    def filter_search(self, queryset, _name, value):
        value = value.strip()
        if not value:
            return queryset
        matching_categories = [c for c, label in Category.choices if value.lower() in label.lower()]
        return queryset.filter(
            Q(name__icontains=value)
            | Q(short_description__icontains=value)
            | Q(reference__icontains=value)
            | Q(category__in=matching_categories)
        )

    def apply_sort(self, queryset, _name, value):
        return queryset.order_by(*SORTS.get(value, SORTS["relevance"]))
