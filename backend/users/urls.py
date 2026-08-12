from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import FaceLoginAPIView, RegisterAPIView,LoginAPIView, LogoutAPIView




urlpatterns = [
    #path("login/", LoginAPIView.as_view(), name="login"),
    path("password-login/", LoginAPIView.as_view(), name="password_login"),
    path('register/', RegisterAPIView.as_view(), name='register'),
    path('login/face/', FaceLoginAPIView.as_view(), name='face_login'),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]