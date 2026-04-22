from django.urls import re_path
from apps.groups.consumers import GroupConsumer

websocket_urlpatterns = [
    # ws(s)://api/ws/group/{group_id}/?token=<jwt>
    re_path(r'^ws/group/(?P<group_id>[0-9a-f-]+)/$', GroupConsumer.as_asgi()),
]
