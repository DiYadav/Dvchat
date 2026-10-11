from django.urls import path
from .views import MyProfileAPIView,FollowAPIView, UnfollowAPIView,PostListCreateAPIView,PostDetailAPIView, LikePostAPIView, UnlikePostAPIView, PostImageCreateAPIView


urlpatterns = [
    path("profile/",MyProfileAPIView.as_view(),name="my-profile"),
    path("follow/", FollowAPIView.as_view(),name="follow"),
    path("unfollow/<int:user_id>/",UnfollowAPIView.as_view(),name="unfollow"),
    path("posts/",PostListCreateAPIView.as_view(),name="post-list-create"),
    path("posts/<int:post_id>/",PostDetailAPIView.as_view(),name="post-detail"),
    path("posts/<int:post_id>/like/",LikePostAPIView.as_view(),name="like-post"),
    path("posts/<int:post_id>/unlike/",UnlikePostAPIView.as_view(),name="unlike-post"),
    path("posts/<int:post_id>/images/",PostImageCreateAPIView.as_view(),name="post-image-create"),
]