from django.urls import path
from .views import (
    MyProfileAPIView,
    UserProfileDetailAPIView,
    FaceSettingsAPIView,
    FollowAPIView,
    AcceptFollowAPIView,
    DeclineFollowAPIView,
    FollowRequestsListView,
    UnfollowAPIView,
    FollowersListView,
    FollowingListView,
    SuggestionsAPIView,
    UserSearchAPIView,
    PostListCreateAPIView,
    PostDetailAPIView,
    LikePostAPIView,
    UnlikePostAPIView,
    ToggleLikePostAPIView,
    PostImageCreateAPIView,
    CommentCreateAPIView,
    CommentReplyAPIView,
)

urlpatterns = [
    # Profile & Account Settings
    path("profile/", MyProfileAPIView.as_view(), name="my-profile"),
    path("profile/face-settings/", FaceSettingsAPIView.as_view(), name="face-settings"),
    path("profile/<str:username>/", UserProfileDetailAPIView.as_view(), name="user-profile"),

    # Follow, Follow Requests, Accept, Decline, Unfollow
    path("follow/", FollowAPIView.as_view(), name="follow"),
    path("follow/accept/<int:user_id>/", AcceptFollowAPIView.as_view(), name="accept-follow"),
    path("follow/decline/<int:user_id>/", DeclineFollowAPIView.as_view(), name="decline-follow"),
    path("follow-requests/", FollowRequestsListView.as_view(), name="follow-requests"),
    path("unfollow/", UnfollowAPIView.as_view(), name="unfollow-post"),
    path("unfollow/<int:user_id>/", UnfollowAPIView.as_view(), name="unfollow-delete"),
    path("followers/", FollowersListView.as_view(), name="followers-list"),
    path("following/", FollowingListView.as_view(), name="following-list"),
    path("suggestions/", SuggestionsAPIView.as_view(), name="suggestions"),
    path("search/", UserSearchAPIView.as_view(), name="user-search"),

    # Posts, Images, Comments & Replies
    path("posts/", PostListCreateAPIView.as_view(), name="post-list-create"),
    path("posts/<int:post_id>/", PostDetailAPIView.as_view(), name="post-detail"),
    path("posts/<int:post_id>/like/", LikePostAPIView.as_view(), name="like-post"),
    path("posts/<int:post_id>/unlike/", UnlikePostAPIView.as_view(), name="unlike-post"),
    path("posts/<int:post_id>/toggle-like/", ToggleLikePostAPIView.as_view(), name="toggle-like-post"),
    path("posts/<int:post_id>/images/", PostImageCreateAPIView.as_view(), name="post-image-create"),
    path("posts/<int:post_id>/comments/", CommentCreateAPIView.as_view(), name="post-comment-create"),
    path("posts/<int:post_id>/comments/<int:comment_id>/replies/", CommentReplyAPIView.as_view(), name="comment-reply"),
]
