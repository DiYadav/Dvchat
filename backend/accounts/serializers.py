from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Follow, Post, PostImage, Comment


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source="user.username")
    profileimg = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "username", "profileimg", "text", "created_at"]
        read_only_fields = ["id", "username", "profileimg", "created_at"]

    def get_profileimg(self, obj):
        if hasattr(obj.user, "profile") and obj.user.profile.profileimg:
            return obj.user.profile.profileimg.url
        return "/media/blank-profile-picture.png"


class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.username")
    author_id = serializers.ReadOnlyField(source="author.id")
    author_profileimg = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(source="likes.count", read_only=True)
    is_liked = serializers.SerializerMethodField()
    images = PostImageSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)

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

    def get_author_profileimg(self, obj):
        if hasattr(obj.author, "profile") and obj.author.profile.profileimg:
            return obj.author.profile.profileimg.url
        return "/media/blank-profile-picture.png"

    def get_image(self, obj):
        if obj.image:
            return obj.image.url
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
    profileimg = serializers.ImageField(required=False)
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
            "is_face_login_enabled",
            "has_face_registered",
        ]
        read_only_fields = ["id", "username", "email", "has_face_registered"]

    def get_has_face_registered(self, obj):
        return bool(obj.face_encoding)


class FaceSettingsSerializer(serializers.Serializer):
    is_face_login_enabled = serializers.BooleanField(required=False)
    face_image = serializers.CharField(required=False, write_only=True, allow_blank=True)


class FollowSerializer(serializers.ModelSerializer):
    follower = serializers.ReadOnlyField(source="follower.username")

    class Meta:
        model = Follow
        fields = ["id", "follower", "following", "created_at"]
        read_only_fields = ["id", "follower", "created_at"]

    def validate(self, attrs):
        request = self.context["request"]
        following = attrs.get("following")

        if request.user == following:
            raise serializers.ValidationError("You cannot follow yourself.")

        if Follow.objects.filter(follower=request.user, following=following).exists():
            raise serializers.ValidationError("You are already following this user.")
        return attrs

    def create(self, validated_data):
        return Follow.objects.create(follower=self.context["request"].user, **validated_data)


class UserCardSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(source="profile.bio", read_only=True, default="")
    profileimg = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "bio", "profileimg", "is_following"]

    def get_profileimg(self, obj):
        if hasattr(obj, "profile") and obj.profile.profileimg:
            return obj.profile.profileimg.url
        return "/media/blank-profile-picture.png"

    def get_is_following(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False
