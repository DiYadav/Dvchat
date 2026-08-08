from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginAPIView
#from .views import FaceLoginAPIView, RegisterAPIView, LogoutAPIView




urlpatterns = [
    path("login/", LoginAPIView.as_view(), name="login"),
    #path('api/register/', RegisterAPIView.as_view, name='register'),
    #path('api/login/face/', FaceLoginAPIView.as_view(), name='face_login'),
    #path('password_login/', views.password_login, name='password_login'), 
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]