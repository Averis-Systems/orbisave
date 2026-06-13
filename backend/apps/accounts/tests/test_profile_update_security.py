import pytest
from rest_framework import status


@pytest.mark.django_db
def test_profile_update_does_not_allow_sensitive_self_service_fields(member_client, user):
    user.kyc_status = "pending"
    user.save(update_fields=["kyc_status"])

    response = member_client.patch(
        "/api/v1/auth/profile/update/",
        {
            "full_name": "Updated Member",
            "role": "super_admin",
            "country": "ghana",
            "kyc_status": "verified",
        },
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK

    user.refresh_from_db()
    assert user.full_name == "Updated Member"
    assert user.role == "member"
    assert user.country == "kenya"
    assert user.kyc_status == "pending"
