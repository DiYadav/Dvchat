from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('settings', views.settings, name='settings'),
    path('upload', views.upload, name='upload'),
    path('follow', views.follow, name='follow'),
    path('search', views.search, name='search'),
    path('profile/<str:pk>', views.profile, name='profile'),
    path('like-post', views.like_post, name='like_post'),
    path('register/', views.register, name='register'),
    path('face_login/',views.face_login, name='face_login'),
    path('about',views.about_us, name='about'),
    path('account-setting',views.account_setting, name='account-setting'),
    path('logout', views.logout, name='logout'),
]
