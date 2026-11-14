import base64
import io
import numpy as np
from PIL import Image
import face_recognition

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db.models import Q
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile, Follow, Post, PostImage, Comment
from .serializers import (
    MyProfileSerializer,
    FaceSettingsSerializer,
    FollowSerializer,
    FollowRequestSerializer,
    UserCardSerializer,
    PostSerializer,
    PostCreateSerializer,
    PostImageSerializer,
    CommentSerializer,
    ReplySerializer,
    make_absolute_url,
)

try:
    from notifications.models import Notification
except ImportError:
    Notification = None


class MyProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = MyProfileSerializer(profile, context={"request": request})
        return Response(
            {
                "status": "success",
                "message": "Profile retrieved successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        print("REQUEST FILES:", request.FILES)
        serializer = MyProfileSerializer(
            profile, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "status": "success",
                    "message": "Profile updated successfully.",
                    "data": serializer.data,
                },
                status=status.HTTP_200_OK,
            )
        print("SERIALZER ERRORS:", serializer.errors)
        return Response(
            {"status": "error", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class FaceSettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(
            {
                "status": "success",
                "data": {
                    "has_face_registered": bool(profile.face_encoding),
                    "is_face_login_enabled": profile.is_face_login_enabled,
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        face_image_data = request.data.get("face_image")

        if not face_image_data:
            return Response(
                {"status": "error", "message": "Face image is required for enrollment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if "," in face_image_data:
                image_string = face_image_data.split(",", 1)[1]
            else:
                image_string = face_image_data

            decoded_image = base64.b64decode(image_string)
            pil_image = Image.open(io.BytesIO(decoded_image)).convert("RGB")
            np_image = np.array(pil_image)

            encodings = face_recognition.face_encodings(np_image)
            if len(encodings) == 0:
                return Response(
                    {"status": "error", "message": "No face detected in the image. Please try again with clear lighting."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            encoding_bytes = encodings[0].astype(np.float64).tobytes()
            profile.face_encoding = encoding_bytes
            profile.face_image = ContentFile(decoded_image, name=f"{request.user.username}_face.jpg")
            profile.is_face_login_enabled = True
            profile.save()

            return Response(
                {
                    "status": "success",
                    "message": "Face recognition successfully enrolled and enabled.",
                    "data": {
                        "has_face_registered": True,
                        "is_face_login_enabled": True,
                    },
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": f"Failed to process face: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        enabled = request.data.get("is_face_login_enabled")

        if enabled is None:
            return Response(
                {"status": "error", "message": "'is_face_login_enabled' boolean is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if enabled and not profile.face_encoding:
            return Response(
                {"status": "error", "message": "Cannot enable face login before enrolling a face."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.is_face_login_enabled = bool(enabled)
        profile.save()

        return Response(
            {
                "status": "success",
                "message": f"Face login has been {'enabled' if profile.is_face_login_enabled else 'disabled'}.",
                "data": {
                    "has_face_registered": bool(profile.face_encoding),
                    "is_face_login_enabled": profile.is_face_login_enabled,
                },
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.face_encoding = None
        if profile.face_image:
            profile.face_image.delete(save=False)
            profile.face_image = None
        profile.is_face_login_enabled = False
        profile.save()

        return Response(
            {
                "status": "success",
                "message": "Face data successfully removed.",
                "data": {
                    "has_face_registered": False,
                    "is_face_login_enabled": False,
                },
            },
            status=status.HTTP_200_OK,
        )


class UserProfileDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        clean_user = username.strip() if username else ""
        if clean_user.lower() == "me" or clean_user.lower() == request.user.username.lower():
            target_user = request.user
        else:
            target_user = User.objects.filter(username__iexact=clean_user).first()
            if not target_user:
                return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = Profile.objects.get_or_create(user=target_user)

        # Follow relationship from request.user to target_user
        my_rel = Follow.objects.filter(follower=request.user, following=target_user).first()
        follow_status = my_rel.status if my_rel else "none"  # 'none' | 'pending' | 'accepted'

        # Incoming pending follow invitation from target_user to request.user
        incoming_invitation = Follow.objects.filter(
            follower=target_user, following=request.user, status="pending"
        ).first()

        # Follow back opportunity
        they_follow_me = Follow.objects.filter(
            follower=target_user, following=request.user, status="accepted"
        ).exists()
        can_follow_back = they_follow_me and (follow_status == "none")

        followers_count = target_user.follower_set.filter(status="accepted").count()
        following_count = target_user.following_set.filter(status="accepted").count()

        posts = Post.objects.filter(author=target_user).order_by("-created_at")
        posts_data = PostSerializer(posts, many=True, context={"request": request}).data

        profileimg = (
            make_absolute_url(request, profile.profileimg.url)
            if profile.profileimg
            else make_absolute_url(request, "/media/blank-profile-picture.png")
        )

        return Response(
            {
                "status": "success",
                "data": {
                    "id": target_user.id,
                    "username": target_user.username,
                    "bio": profile.bio,
                    "location": profile.location,
                    "profileimg": profileimg,
                    "is_following": follow_status == "accepted",
                    "follow_status": follow_status,  # 'none', 'pending', 'accepted'
                    "has_incoming_invitation": bool(incoming_invitation),
                    "can_follow_back": can_follow_back,
                    "is_self": target_user == request.user,
                    "followers_count": followers_count,
                    "following_count": following_count,
                    "posts": posts_data,
                },
            },
            status=status.HTTP_200_OK,
        )


class FollowAPIView(APIView):
    """
    Sends a follow invitation. Defaults to status='pending'.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_user_id = request.data.get("user_id") or request.data.get("following")
        if not target_user_id:
            return Response({"detail": "user_id or following is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response({"detail": "Target user not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user == request.user:
            return Response({"detail": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        follow, created = Follow.objects.get_or_create(
            follower=request.user,
            following=target_user,
            defaults={"status": "pending"}
        )

        if not created and follow.status == "accepted":
            return Response(
                {"detail": "You are already following this user.", "follow_status": "accepted"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Notification:
            try:
                Notification.objects.create(
                    recipient=target_user,
                    sender=request.user,
                    notification_type="follow",
                    text="sent you a follow invitation.",
                )
            except Exception:
                pass

        return Response(
            {
                "status": "success",
                "message": f"Follow invitation sent to {target_user.username}.",
                "data": {
                    "follow_status": follow.status,
                    "is_following": follow.status == "accepted",
                    "followers_count": target_user.follower_set.filter(status="accepted").count(),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class AcceptFollowAPIView(APIView):
    """
    Accepts an incoming follow invitation from user_id.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        follow = Follow.objects.filter(follower_id=user_id, following=request.user, status="pending").first()
        if not follow:
            return Response({"detail": "No pending follow invitation found from this user."}, status=status.HTTP_404_NOT_FOUND)

        follow.status = "accepted"
        follow.save()

        if Notification:
            try:
                Notification.objects.create(
                    recipient=follow.follower,
                    sender=request.user,
                    notification_type="follow",
                    text="accepted your follow invitation.",
                )
            except Exception:
                pass

        i_follow_them = Follow.objects.filter(follower=request.user, following_id=user_id, status="accepted").exists()

        return Response(
            {
                "status": "success",
                "message": f"You accepted @{follow.follower.username}'s follow invitation.",
                "data": {
                    "can_follow_back": not i_follow_them,
                    "followers_count": request.user.follower_set.filter(status="accepted").count(),
                },
            },
            status=status.HTTP_200_OK,
        )


class DeclineFollowAPIView(APIView):
    """
    Declines an incoming follow invitation from user_id.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        follow = Follow.objects.filter(follower_id=user_id, following=request.user, status="pending").first()
        if not follow:
            return Response({"detail": "No pending follow invitation found."}, status=status.HTTP_404_NOT_FOUND)

        follow.delete()
        return Response({"status": "success", "message": "Follow invitation declined."}, status=status.HTTP_200_OK)


class FollowRequestsListView(APIView):
    """
    Returns pending follow invitations received by the current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending_requests = Follow.objects.filter(following=request.user, status="pending")
        serializer = FollowRequestSerializer(pending_requests, many=True, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


class UnfollowAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        follow = Follow.objects.filter(follower=request.user, following_id=user_id).first()
        if not follow:
            return Response({"detail": "You are not following this user."}, status=status.HTTP_404_NOT_FOUND)

        follow.delete()
        target_user = User.objects.filter(id=user_id).first()
        followers_count = target_user.follower_set.filter(status="accepted").count() if target_user else 0

        return Response(
            {
                "status": "success",
                "message": "User unfollowed successfully.",
                "data": {"is_following": False, "follow_status": "none", "followers_count": followers_count},
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request, user_id=None):
        target_id = user_id or request.data.get("user_id") or request.data.get("following")
        if not target_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        follow = Follow.objects.filter(follower=request.user, following_id=target_id).first()
        if not follow:
            return Response({"detail": "You are not following this user."}, status=status.HTTP_404_NOT_FOUND)

        follow.delete()
        target_user = User.objects.filter(id=target_id).first()
        followers_count = target_user.follower_set.filter(status="accepted").count() if target_user else 0

        return Response(
            {
                "status": "success",
                "message": "User unfollowed successfully.",
                "data": {"is_following": False, "follow_status": "none", "followers_count": followers_count},
            },
            status=status.HTTP_200_OK,
        )


class FollowersListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        follower_users = User.objects.filter(following_set__following=request.user, following_set__status="accepted")
        serializer = UserCardSerializer(follower_users, many=True, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


class FollowingListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        following_users = User.objects.filter(follower_set__follower=request.user, follower_set__status="accepted")
        serializer = UserCardSerializer(following_users, many=True, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


class SuggestionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        following_ids = Follow.objects.filter(follower=request.user).values_list("following_id", flat=True)
        suggested_users = User.objects.exclude(id__in=following_ids).exclude(id=request.user.id)[:10]

        serializer = UserCardSerializer(suggested_users, many=True, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


class UserSearchAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"status": "success", "data": []}, status=status.HTTP_200_OK)

        users = User.objects.filter(
            Q(username__icontains=query) | Q(first_name__icontains=query) | Q(last_name__icontains=query)
        ).exclude(id=request.user.id)[:10]

        serializer = UserCardSerializer(users, many=True, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)


class PostListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        following_ids = list(
            Follow.objects.filter(follower=request.user, status="accepted").values_list("following_id", flat=True)
        )
        following_ids.append(request.user.id)

        posts = Post.objects.filter(author_id__in=following_ids).distinct().order_by("-created_at")
        serializer = PostSerializer(posts, many=True, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PostCreateSerializer(data=request.data)
        if serializer.is_valid():
            post = serializer.save(author=request.user)
            return Response(
                {
                    "status": "success",
                    "message": "Post created successfully.",
                    "data": PostSerializer(post, context={"request": request}).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class PostDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, post_id):
        try:
            return Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return None

    def get(self, request, post_id):
        post = self.get_object(post_id)
        if not post:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PostSerializer(post, context={"request": request})
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_200_OK)

    def put(self, request, post_id):
        post = self.get_object(post_id)
        if not post:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)
        if post.author != request.user:
            return Response({"detail": "You can only edit your own posts."}, status=status.HTTP_403_FORBIDDEN)

        serializer = PostCreateSerializer(post, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "status": "success",
                    "data": PostSerializer(post, context={"request": request}).data,
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, post_id):
        post = self.get_object(post_id)
        if not post:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)
        if post.author != request.user:
            return Response({"detail": "You can only delete your own posts."}, status=status.HTTP_403_FORBIDDEN)

        post.delete()
        return Response({"status": "success", "message": "Post deleted successfully."}, status=status.HTTP_200_OK)


class LikePostAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        if post.likes.filter(id=request.user.id).exists():
            return Response({"detail": "You already liked this post."}, status=status.HTTP_400_BAD_REQUEST)

        post.likes.add(request.user)
        return Response(
            {
                "status": "success",
                "message": "Post liked successfully.",
                "data": {"is_liked": True, "no_of_likes": post.likes.count()},
            },
            status=status.HTTP_200_OK,
        )


class UnlikePostAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        if not post.likes.filter(id=request.user.id).exists():
            return Response({"detail": "You have not liked this post."}, status=status.HTTP_400_BAD_REQUEST)

        post.likes.remove(request.user)
        return Response(
            {
                "status": "success",
                "message": "Post unliked successfully.",
                "data": {"is_liked": False, "no_of_likes": post.likes.count()},
            },
            status=status.HTTP_200_OK,
        )


class ToggleLikePostAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        if post.likes.filter(id=request.user.id).exists():
            post.likes.remove(request.user)
            is_liked = False
        else:
            post.likes.add(request.user)
            is_liked = True
            if post.author != request.user and Notification:
                try:
                    Notification.objects.create(
                        recipient=post.author,
                        sender=request.user,
                        notification_type="like",
                        post=post,
                        text="liked your post.",
                    )
                except Exception:
                    pass

        return Response(
            {
                "status": "success",
                "data": {
                    "is_liked": is_liked,
                    "no_of_likes": post.likes.count(),
                },
            },
            status=status.HTTP_200_OK,
        )


class PostImageCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        if post.author != request.user:
            return Response({"detail": "You can only add images to your own posts."}, status=status.HTTP_403_FORBIDDEN)

        serializer = PostImageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(post=post)
            return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class CommentCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        text = request.data.get("comment_text") or request.data.get("text")
        if not text or not str(text).strip():
            return Response({"detail": "Comment text cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(post=post, user=request.user, text=str(text).strip())

        if post.author != request.user and Notification:
            try:
                Notification.objects.create(
                    recipient=post.author,
                    sender=request.user,
                    notification_type="comment",
                    post=post,
                    text=f"commented: {str(text).strip()[:40]}",
                )
            except Exception:
                pass

        return Response(
            {
                "status": "success",
                "message": "Comment posted successfully.",
                "data": CommentSerializer(comment, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CommentReplyAPIView(APIView):
    """
    POST /accounts/posts/<post_id>/comments/<comment_id>/replies/
    Create a reply to a specific comment.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id, comment_id):
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            parent_comment = Comment.objects.get(id=comment_id, post=post)
        except Comment.DoesNotExist:
            return Response({"detail": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        # Prevent nested-nested replies (keep it one level deep)
        if parent_comment.parent_id is not None:
            return Response(
                {"detail": "Replies to replies are not supported. Reply to the original comment instead."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        text = request.data.get("comment_text") or request.data.get("text")
        if not text or not str(text).strip():
            return Response({"detail": "Reply text cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        reply = Comment.objects.create(
            post=post,
            user=request.user,
            parent=parent_comment,
            text=str(text).strip(),
        )

        # Notify the original commenter (if not the same user)
        if parent_comment.user != request.user and Notification:
            try:
                Notification.objects.create(
                    recipient=parent_comment.user,
                    sender=request.user,
                    notification_type="comment",
                    post=post,
                    text=f"replied to your comment: {str(text).strip()[:40]}",
                )
            except Exception:
                pass

        return Response(
            {
                "status": "success",
                "message": "Reply posted successfully.",
                "data": ReplySerializer(reply, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
