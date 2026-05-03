from rest_framework import serializers
from .models import User

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

