from rest_framework import serializers
from .models import Profile, Follow, Post, PostImage
from rest_framework import serializers


class MyProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username",read_only=True)
    email = serializers.EmailField(source="user.email",read_only=True)

    class Meta:
        model = Profile
        fields = ["id","username","email","bio","location","profileimg","is_face_login_enabled",]
        read_only_fields = ["id","username","email",]

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

        if Follow.objects.filter(follower=request.user,following=following).exists():
            raise serializers.ValidationError("You are already following this user.")
        return attrs

    def create(self, validated_data):
        return Follow.objects.create(follower=self.context["request"].user,**validated_data)


class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.username")
    likes_count = serializers.IntegerField(source="likes.count",read_only=True)
    images = PostImageSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "caption",
            "likes",
            "likes_count",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "author",
            "likes",
            "likes_count",
            "images",
            "created_at",
            "updated_at",
        ]


class PostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["id", "caption"]
        read_only_fields = ["id"]