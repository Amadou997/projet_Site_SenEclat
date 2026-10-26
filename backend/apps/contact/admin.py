from django.contrib import admin

from apps.contact.models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "subject", "created_at", "is_handled"]
    list_filter = ["subject", "is_handled"]
    list_editable = ["is_handled"]
    search_fields = ["full_name", "phone", "message"]
    readonly_fields = ["full_name", "phone", "subject", "message", "created_at"]
