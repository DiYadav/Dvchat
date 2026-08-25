from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Profile
from .serializers import MyProfileSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Profile, Post
from .serializers import MyProfileSerializer


class MyProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, created = Profile.objects.get_or_create(
            user=request.user,
            defaults={
                "id_user": request.user.id
            }
        )

        serializer = MyProfileSerializer(
            profile,
            context={"request": request}
        )

        return Response(
            {
                "status": "success",
                "message": "Profile retrieved successfully.",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def patch(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user,defaults={"id_user": request.user.id})
        serializer = MyProfileSerializer( profile, data=request.data, partial=True, context={"request": request})

        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "status": "success",
                    "message": "Profile updated successfully.",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {
                "status": "error",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Follow, Post
from .serializers import (
    FollowSerializer,
    PostSerializer,
    PostCreateSerializer,
)


class FollowAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = FollowSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            follow = serializer.save()

            return Response(
                FollowSerializer(
                    follow,
                    context={"request": request}
                ).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class UnfollowAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        follow = Follow.objects.filter(
            follower=request.user,
            following_id=user_id
        ).first()

        if not follow:
            return Response(
                {"detail": "You are not following this user."},
                status=status.HTTP_404_NOT_FOUND
            )

        follow.delete()

        return Response(
            {"detail": "User unfollowed successfully."},
            status=status.HTTP_204_NO_CONTENT
        )


class PostListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        posts = Post.objects.all()

        serializer = PostSerializer(
            posts,
            many=True,
            context={"request": request}
        )

        return Response(serializer.data)

    def post(self, request):
        serializer = PostCreateSerializer(
            data=request.data
        )

        if serializer.is_valid():
            post = serializer.save(author=request.user)

            return Response(
                PostSerializer(
                    post,
                    context={"request": request}
                ).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class PostDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, post_id):
        try:
            return Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return None

    def get(self, request, post_id):
        post = self.get_object(post_id)

        if not post:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PostSerializer(
            post,
            context={"request": request}
        )

        return Response(serializer.data)

    def put(self, request, post_id):
        post = self.get_object(post_id)

        if not post:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if post.author != request.user:
            return Response(
                {"detail": "You can only update your own post."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PostCreateSerializer(
            post,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                PostSerializer(
                    post,
                    context={"request": request}
                ).data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, post_id):
        post = self.get_object(post_id)

        if not post:
            return Response(
                {"detail": "Post not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if post.author != request.user:
            return Response(
                {"detail": "You can only delete your own post."},
                status=status.HTTP_403_FORBIDDEN
            )

        post.delete()

        return Response(
            {"detail": "Post deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )


class LikePostAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."},status=status.HTTP_404_NOT_FOUND)

        if post.likes.filter(id=request.user.id).exists():
            return Response({"detail": "You already liked this post."},status=status.HTTP_400_BAD_REQUEST)
        
        post.likes.add(request.user)
        return Response({"detail": "Post liked successfully."},status=status.HTTP_200_OK)


class UnlikePostAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."},status=status.HTTP_404_NOT_FOUND)

        if not post.likes.filter(id=request.user.id).exists():
            return Response({"detail": "You have not liked this post."},status=status.HTTP_400_BAD_REQUEST)

        post.likes.remove(request.user)
        return Response({"detail": "Post unliked successfully."},status=status.HTTP_204_NO_CONTENT)