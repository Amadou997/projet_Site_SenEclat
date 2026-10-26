from rest_framework import serializers

from apps.contact.models import ContactMessage
from apps.core.fields import SenegalPhoneField


class ContactMessageSerializer(serializers.ModelSerializer):
    phone = SenegalPhoneField()
    message = serializers.CharField(min_length=10, max_length=2000)

    class Meta:
        model = ContactMessage
        fields = ["full_name", "phone", "subject", "message"]
