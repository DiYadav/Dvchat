from rest_framework import serializers
from .models import Profile


# class ProfileSerializer(serializers.ModelSerializer):
#     username = serializers.CharField(source="user.username",read_only=True)
#     email = serializers.EmailField(source="user.email",read_only=True)

#     class Meta:
#         model = Profile
#         fields = ["id","username","email","bio","location","profileimg","face_image","is_face_login_enabled",]
#         read_only_fields = ["id","username","email","face_image",]

from rest_framework import serializers
from .models import Profile


class MyProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username",read_only=True)
    email = serializers.EmailField(source="user.email",read_only=True)

    class Meta:
        model = Profile
        fields = ["id","username","email","bio","location","profileimg","is_face_login_enabled",]
        read_only_fields = ["id","username","email",]