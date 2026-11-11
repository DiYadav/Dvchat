from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.models import User
from django.db.models import Max
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

try:
    from notifications.models import Notification
except ImportError:
    Notification = None


class ConversationListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Fetch conversations the current user participates in
        conversations = request.user.conversations.annotate(
            latest_msg_time=Max("messages__timestamp")
        ).order_by("-updated_at")

        serializer = ConversationSerializer(conversations, many=True, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


class StartChatAPIView(APIView):
    """
    Finds an existing 1-on-1 conversation or creates a new one with target user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Target user not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({"detail": "You cannot start a chat with yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if conversation already exists between these 2 users
        conversation = (
            Conversation.objects.filter(participants=request.user)
            .filter(participants=target_user)
            .first()
        )

        if not conversation:
            conversation = Conversation.objects.create()
            conversation.participants.add(request.user, target_user)

        serializer = ConversationSerializer(conversation, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


class MessageListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, conversation_id):
        conversation = request.user.conversations.filter(id=conversation_id).first()
        if not conversation:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Mark all unread messages from the other user as read
        conversation.messages.exclude(sender=request.user).filter(is_read=False).update(is_read=True)

        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, conversation_id):
        conversation = request.user.conversations.filter(id=conversation_id).first()
        if not conversation:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        text = request.data.get("text", "").strip()
        image = request.FILES.get("image")

        if not text and not image:
            return Response({"detail": "Message text or image is required."}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            text=text,
            image=image,
        )
        conversation.save()  # Triggers updated_at timestamp

        # Create a notification for the other participant
        recipient = conversation.participants.exclude(id=request.user.id).first()
        if recipient and Notification:
            try:
                Notification.objects.create(
                    recipient=recipient,
                    sender=request.user,
                    notification_type="message",
                    text=f"Sent you a message: {text[:40]}" if text else "Sent you a photo.",
                )
            except Exception as e:
                print("Notification creation error:", e)

        serializer = MessageSerializer(message, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)


class UnreadMessagesCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(
            conversation__participants=request.user,
            is_read=False,
        ).exclude(sender=request.user).count()

        return Response({"status": "success", "unread_count": count}, status=status.HTTP_200_OK)
