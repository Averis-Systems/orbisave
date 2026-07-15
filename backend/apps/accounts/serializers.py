from rest_framework import serializers
from common.translation import SUPPORTED_LANGUAGES, default_languages_for_country
from .models import User, KYCDocument


def _validate_language_choice(value):
    """
    Product rule: users pick AT LEAST TWO preferred languages (the system
    always serves them in one of the selected). Cap at three to keep the
    preference meaningful.
    """
    if not isinstance(value, list):
        raise serializers.ValidationError("languages must be a list of language codes.")
    unsupported = [code for code in value if code not in SUPPORTED_LANGUAGES]
    if unsupported:
        supported = ', '.join(sorted(SUPPORTED_LANGUAGES))
        raise serializers.ValidationError(
            f"Unsupported language(s): {', '.join(unsupported)}. Supported: {supported}."
        )
    if len(set(value)) < 2:
        raise serializers.ValidationError("Choose at least 2 preferred languages.")
    if len(set(value)) > 3:
        raise serializers.ValidationError("Choose at most 3 preferred languages.")
    return list(dict.fromkeys(value))  # dedupe, keep order (first = primary)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'phone', 'full_name', 'role', 'country', 'kyc_status',
            'email_verified', 'phone_verified',
            'gender', 'next_of_kin_name', 'next_of_kin_phone', 'disbursement_method',
            'bank_name', 'bank_account_number', 'onboarding_popup_seen',
            'languages', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'full_name', 'gender', 'next_of_kin_name', 'next_of_kin_phone',
            'disbursement_method', 'bank_name', 'bank_account_number',
            'onboarding_popup_seen', 'languages',
        ]

    def validate_languages(self, value):
        return _validate_language_choice(value)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    # Only allow safe self-registration roles. Platform/super admin must be set via Django admin.
    role = serializers.ChoiceField(
        choices=['member', 'chairperson'],
        default='member',
        required=False,
    )
    # Preferred languages (min 2). The UI always sends an explicit choice;
    # when absent (API clients / legacy), a per-country default applies so
    # the system can ALWAYS serve the user in a known language.
    languages = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = ['email', 'phone', 'full_name', 'password', 'country', 'role', 'languages']

    def validate_languages(self, value):
        return _validate_language_choice(value)

    def create(self, validated_data):
        if not validated_data.get('languages'):
            validated_data['languages'] = default_languages_for_country(validated_data.get('country'))
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
