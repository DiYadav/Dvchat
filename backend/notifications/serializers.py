from rest_framework import serializers
from .models import Notification
from accounts.models import Follow
from accounts.serializers import make_absolute_url


class NotificationSerializer(serializers.ModelSerializer):
    sender_id = serializers.ReadOnlyField(source="sender.id")
    sender_username = serializers.ReadOnlyField(source="sender.username")
    sender_profileimg = serializers.SerializerMethodField()
    post_id = serializers.ReadOnlyField(source="post.id")
    is_follow_pending = serializers.SerializerMethodField()
    can_follow_back = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "sender_id",
            "sender_username",
            "sender_profileimg",
            "notification_type",
            "post_id",
            "text",
            "is_read",
            "created_at",
            "is_follow_pending",
            "can_follow_back",
        ]
        read_only_fields = [
            "id",
            "sender_id",
            "sender_username",
            "sender_profileimg",
            "notification_type",
            "post_id",
            "created_at",
            "is_follow_pending",
            "can_follow_back",
        ]

    def get_sender_profileimg(self, obj):
        request = self.context.get("request")
        if hasattr(obj.sender, "profile") and obj.sender.profile.profileimg:
            return make_absolute_url(request, obj.sender.profile.profileimg.url)
        return make_absolute_url(request, "/media/blank-profile-picture.png")

    def get_is_follow_pending(self, obj):
        if obj.notification_type == "follow":
            return Follow.objects.filter(follower=obj.sender, following=obj.recipient, status="pending").exists()
        return False

    def get_can_follow_back(self, obj):
        if obj.notification_type == "follow":
            return not Follow.objects.filter(follower=obj.recipient, following=obj.sender, status="accepted").exists()
        return False
