from django.urls import path
from .views import (
    ConversationListCreateAPIView,
    StartChatAPIView,
    MessageListCreateAPIView,
    UnreadMessagesCountView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateAPIView.as_view(), name="conversation-list"),
    path("start/<int:user_id>/", StartChatAPIView.as_view(), name="start-chat"),
    path("conversations/<int:conversation_id>/messages/", MessageListCreateAPIView.as_view(), name="conversation-messages"),
    path("unread-count/", UnreadMessagesCountView.as_view(), name="unread-messages-count"),
]
