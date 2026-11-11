from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Conversation, Message
from accounts.serializers import make_absolute_url


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.ReadOnlyField(source="sender.id")
    sender_username = serializers.ReadOnlyField(source="sender.username")
    sender_profileimg = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation_id",
            "sender_id",
            "sender_username",
            "sender_profileimg",
            "text",
            "image",
            "is_read",
            "is_me",
            "timestamp",
        ]
        read_only_fields = [
            "id",
            "conversation_id",
            "sender_id",
            "sender_username",
            "sender_profileimg",
            "image",
            "is_read",
            "is_me",
            "timestamp",
        ]

    def get_sender_profileimg(self, obj):
        request = self.context.get("request")
        if hasattr(obj.sender, "profile") and obj.sender.profile.profileimg:
            return make_absolute_url(request, obj.sender.profile.profileimg.url)
        return make_absolute_url(request, "/media/blank-profile-picture.png")

    def get_image(self, obj):
        request = self.context.get("request")
        if obj.image:
            return make_absolute_url(request, obj.image.url)
        return None

    def get_is_me(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.sender == request.user
        return False


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "other_user", "last_message", "unread_count", "updated_at"]

    def get_other_user(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        other = obj.participants.exclude(id=request.user.id).first()
        if other:
            profileimg = (
                make_absolute_url(request, other.profile.profileimg.url)
                if hasattr(other, "profile") and other.profile.profileimg
                else make_absolute_url(request, "/media/blank-profile-picture.png")
            )
            return {
                "id": other.id,
                "username": other.username,
                "profileimg": profileimg,
                "bio": getattr(other.profile, "bio", "") if hasattr(other, "profile") else "",
            }
        return None

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return {
                "id": last.id,
                "text": last.text or ("📷 [Image]" if last.image else ""),
                "timestamp": last.timestamp,
                "sender": last.sender.username,
                "is_read": last.is_read,
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0
