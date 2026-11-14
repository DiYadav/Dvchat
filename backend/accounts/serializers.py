from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Follow, Post, PostImage, Comment


def make_absolute_url(request, path):
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if request:
        return request.build_absolute_uri(path)
    return f"http://127.0.0.1:8000{path}"


class ReplySerializer(serializers.ModelSerializer):
    """Serializer for comment replies (one level deep)."""
    username = serializers.ReadOnlyField(source="user.username")
    user_id = serializers.ReadOnlyField(source="user.id")
    profileimg = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "user_id", "username", "profileimg", "text", "parent", "created_at"]
        read_only_fields = ["id", "user_id", "username", "profileimg", "created_at"]

    def get_profileimg(self, obj):
        request = self.context.get("request")
        if hasattr(obj.user, "profile") and obj.user.profile.profileimg:
            return make_absolute_url(request, obj.user.profile.profileimg.url)
        return make_absolute_url(request, "/media/blank-profile-picture.png")


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source="user.username")
    user_id = serializers.ReadOnlyField(source="user.id")
    profileimg = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "user_id", "username", "profileimg", "text", "parent", "replies", "reply_count", "created_at"]
        read_only_fields = ["id", "user_id", "username", "profileimg", "replies", "reply_count", "created_at"]

    def get_profileimg(self, obj):
        request = self.context.get("request")
        if hasattr(obj.user, "profile") and obj.user.profile.profileimg:
            return make_absolute_url(request, obj.user.profile.profileimg.url)
        return make_absolute_url(request, "/media/blank-profile-picture.png")

    def get_replies(self, obj):
        # Only serialize replies for top-level comments
        if obj.parent_id is not None:
            return []
        request = self.context.get("request")
        return ReplySerializer(obj.replies.all(), many=True, context={"request": request}).data

    def get_reply_count(self, obj):
        if obj.parent_id is not None:
            return 0
        return obj.replies.count()


class PostImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = PostImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_image(self, obj):
        request = self.context.get("request")
        if obj.image:
            return make_absolute_url(request, obj.image.url)
        return None


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.username")
    author_id = serializers.ReadOnlyField(source="author.id")
    author_profileimg = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(source="likes.count", read_only=True)
    is_liked = serializers.SerializerMethodField()
    images = PostImageSerializer(many=True, read_only=True)
    comments = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "author_id",
            "author_profileimg",
            "caption",
            "image",
            "images",
            "likes_count",
            "is_liked",
            "comments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "author",
            "author_id",
            "author_profileimg",
            "image",
            "likes_count",
            "is_liked",
            "images",
            "comments",
            "created_at",
            "updated_at",
        ]

    def get_comments(self, obj):
        # Only return top-level comments (parent=None); replies are nested inside each comment
        request = self.context.get("request")
        top_level = obj.comments.filter(parent__isnull=True)
        return CommentSerializer(top_level, many=True, context={"request": request}).data

    def get_author_profileimg(self, obj):
        request = self.context.get("request")
        if hasattr(obj.author, "profile") and obj.author.profile.profileimg:
            return make_absolute_url(request, obj.author.profile.profileimg.url)
        return make_absolute_url(request, "/media/blank-profile-picture.png")

    def get_image(self, obj):
        request = self.context.get("request")
        if obj.image:
            return make_absolute_url(request, obj.image.url)
        return None

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["id", "caption", "image"]
        read_only_fields = ["id"]


class MyProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    profileimg = serializers.ImageField(required=False, allow_null=True)
    profileimg_url = serializers.SerializerMethodField()
    has_face_registered = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "email",
            "bio",
            "location",
            "profileimg",
            "profileimg_url",
            "is_face_login_enabled",
            "has_face_registered",
        ]
        read_only_fields = ["id", "username", "email", "has_face_registered","profileimg_url",]

    def get_profileimg_url(self, obj):
        request = self.context.get("request")
        if obj.profileimg:
            return make_absolute_url(request, obj.profileimg.url)
        return make_absolute_url(request, "/media/blank-profile-picture.png")

    def get_has_face_registered(self, obj):
        return bool(obj.face_encoding)


class FaceSettingsSerializer(serializers.Serializer):
    is_face_login_enabled = serializers.BooleanField(required=False)
    face_image = serializers.CharField(required=False, write_only=True, allow_blank=True)


class FollowSerializer(serializers.ModelSerializer):
    follower = serializers.ReadOnlyField(source="follower.username")

    class Meta:
        model = Follow
        fields = ["id", "follower", "following", "status", "created_at"]
        read_only_fields = ["id", "follower", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        following = attrs.get("following")

        if request.user == following:
            raise serializers.ValidationError("You cannot follow yourself.")

        if Follow.objects.filter(follower=request.user, following=following).exists():
            raise serializers.ValidationError("You have already sent a follow request to this user.")
        return attrs

    def create(self, validated_data):
        return Follow.objects.create(follower=self.context["request"].user, **validated_data)


class FollowRequestSerializer(serializers.ModelSerializer):
    follower_id = serializers.ReadOnlyField(source="follower.id")
    follower_username = serializers.ReadOnlyField(source="follower.username")
    follower_profileimg = serializers.SerializerMethodField()
    follower_bio = serializers.SerializerMethodField()

    class Meta:
        model = Follow
        fields = [
            "id",
            "follower_id",
            "follower_username",
            "follower_profileimg",
            "follower_bio",
            "status",
            "created_at",
        ]

    def get_follower_profileimg(self, obj):
        request = self.context.get("request")
        if hasattr(obj.follower, "profile") and obj.follower.profile.profileimg:
            return make_absolute_url(request, obj.follower.profile.profileimg.url)
        return make_absolute_url(request, "/media/blank-profile-picture.png")

    def get_follower_bio(self, obj):
        return getattr(obj.follower.profile, "bio", "") if hasattr(obj.follower, "profile") else ""


class UserCardSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(source="profile.bio", read_only=True, default="")
    profileimg = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    follow_status = serializers.SerializerMethodField()
    can_follow_back = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "bio",
            "profileimg",
            "is_following",
            "follow_status",
            "can_follow_back",
        ]

    def get_profileimg(self, obj):
        request = self.context.get("request")
        if hasattr(obj, "profile") and obj.profile.profileimg:
            return make_absolute_url(request, obj.profile.profileimg.url)
        return make_absolute_url(request, "/media/blank-profile-picture.png")

    def get_is_following(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Follow.objects.filter(
                follower=request.user, following=obj, status="accepted"
            ).exists()
        return False

    def get_follow_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return "none"
        rel = Follow.objects.filter(follower=request.user, following=obj).first()
        if not rel:
            return "none"
        return rel.status  # 'pending' or 'accepted'

    def get_can_follow_back(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        # Target user follows me, but I do not follow target user
        they_follow_me = Follow.objects.filter(
            follower=obj, following=request.user, status="accepted"
        ).exists()
        i_follow_them = Follow.objects.filter(
            follower=request.user, following=obj
        ).exists()
        return they_follow_me and not i_follow_them
