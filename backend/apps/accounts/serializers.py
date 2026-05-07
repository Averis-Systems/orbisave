from rest_framework import serializers
from .models import User, KYCDocument

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'full_name', 'role', 'country', 'kyc_status', 'created_at']
        read_only_fields = ['id', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    # Only allow safe self-registration roles. Platform/super admin must be set via Django admin.
    role = serializers.ChoiceField(
        choices=['member', 'chairperson'],
        default='member',
        required=False,
    )

    class Meta:
        model = User
        fields = ['email', 'phone', 'full_name', 'password', 'country', 'role']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class KYCDocumentSerializer(serializers.ModelSerializer):
    user_name    = serializers.CharField(source='user.full_name', read_only=True)
    user_email   = serializers.CharField(source='user.email',     read_only=True)
    user_phone   = serializers.CharField(source='user.phone',     read_only=True)
    user_country = serializers.CharField(source='user.country',   read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True, default=None)
    front_image_url  = serializers.SerializerMethodField()
    back_image_url   = serializers.SerializerMethodField()
    selfie_image_url = serializers.SerializerMethodField()

    class Meta:
        model = KYCDocument
        fields = [
            'id', 'user_id', 'user_name', 'user_email', 'user_phone', 'user_country',
            'document_type', 'front_image_url', 'back_image_url', 'selfie_image_url',
            'status', 'rejection_reason', 'reviewed_by_name', 'reviewed_at', 'created_at',
        ]

    def _build_url(self, path):
        if not path:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(path.url)
        return path.url if path else None

    def get_front_image_url(self, obj):  return self._build_url(obj.front_image)
    def get_back_image_url(self, obj):   return self._build_url(obj.back_image)
    def get_selfie_image_url(self, obj): return self._build_url(obj.selfie_image)
