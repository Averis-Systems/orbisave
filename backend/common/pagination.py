from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'data': data,
            'message': '',
            'errors': None,
            'meta': {
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
            },
        })

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'success': {'type': 'boolean'},
                'data': schema,
                'message': {'type': 'string'},
                'errors': {'nullable': True},
                'meta': {
                    'type': 'object',
                    'properties': {
                        'count': {'type': 'integer'},
                        'next': {'type': 'string', 'nullable': True},
                        'previous': {'type': 'string', 'nullable': True},
                        'page': {'type': 'integer'},
                        'total_pages': {'type': 'integer'},
                    },
                },
            },
        }
