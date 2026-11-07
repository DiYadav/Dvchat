from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterAPIView,
    LoginAPIView,
    FaceLoginAPIView,
    LogoutAPIView,
)

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/', LoginAPIView.as_view(), name='login'),
    path('password-login/', LoginAPIView.as_view(), name='password_login'),
    path('login/face/', FaceLoginAPIView.as_view(), name='face_login'),
    path('face-login/', FaceLoginAPIView.as_view(), name='face_login_alias'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]