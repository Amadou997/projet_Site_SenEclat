from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import AdminUserCreationForm, UserChangeForm

from apps.accounts.models import User


class UserCreationForm(AdminUserCreationForm):
    class Meta:
        model = User
        fields = ["email", "phone", "first_name", "last_name"]


class UserEditForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserEditForm
    add_form = UserCreationForm
    ordering = ["-date_joined"]
    list_display = ["email", "phone", "first_name", "last_name", "loyalty_points", "is_staff", "is_active"]
    list_filter = ["is_staff", "is_active"]
    search_fields = ["email", "phone", "first_name", "last_name"]
    fieldsets = [
        (None, {"fields": ["email", "phone", "password"]}),
        ("Identité", {"fields": ["first_name", "last_name"]}),
        ("Adresse", {"fields": ["address_zone", "address_line", "address_landmark"]}),
        ("Fidélité", {"fields": ["loyalty_points"]}),
        ("Droits", {"fields": ["is_active", "is_staff", "is_superuser", "groups", "user_permissions"]}),
        ("Dates", {"fields": ["last_login", "date_joined"]}),
    ]
    add_fieldsets = [
        (
            None,
            {
                "classes": ["wide"],
                "fields": ["email", "phone", "first_name", "last_name", "usable_password", "password1", "password2"],
            },
        ),
    ]
