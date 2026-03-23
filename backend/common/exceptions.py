from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def orbisave_exception_handler(exc, context):
    """
    Wrap all DRF errors in the standard OrbiSave API envelope:
    {success, data, message, errors, meta}
    """
    response = exception_handler(exc, context)

    if response is not None:
        original_data = response.data
        # Flatten string errors into a readable message
        if isinstance(original_data, list):
            message = ' '.join(str(e) for e in original_data)
            errors = None
        elif isinstance(original_data, dict):
            # Try to get a non_field_errors or detail message
            message = (
                str(original_data.get('detail', ''))
                or str(original_data.get('non_field_errors', [''])[0])
                or 'Validation failed.'
            )
            errors = {k: v if isinstance(v, list) else [v] for k, v in original_data.items()}
        else:
            message = str(original_data)
            errors = None

        return Response(
            {
                'success': False,
                'data': None,
                'message': message,
                'errors': errors,
                'meta': None,
            },
            status=response.status_code,
        )

    return response


def success_response(data, message: str = '', status_code: int = 200, meta=None):
    """Helper to return a consistent success response."""
    return Response(
        {
            'success': True,
            'data': data,
            'message': message,
            'errors': None,
            'meta': meta,
        },
        status=status_code,
    )
