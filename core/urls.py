from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('settings', views.settings, name='settings'),
    path('create', views.upload, name='create'),
    path('follow', views.follow, name='follow'),
    path('search/', views.search, name='search'),
    path('profile/<str:username>/', views.profile_view, name='profile_view'),
    path('like-post', views.like_post, name='like-post'),
    path('register/', views.register, name='register'),
    path('face_login/',views.face_login, name='face_login'),
    path('password_login/', views.password_login, name='password_login'), #password login match
    path('about',views.about_us, name='about'),
    path('account-setting',views.account_setting, name='account-setting'),
    path('edit_profile/', views.edit_profile_view, name='edit_profile'),
    path('create_post/', views.create_post_view, name='create_post'),
    path('logout', views.logout_view, name='logout'),
    path('messages/', views.message_inbox, name='message_inbox'),
    path('messages/<int:conversation_id>/', views.conversation_detail, name='conversation_detail'),
    path('start_conversation/<int:user_id>/', views.start_conversation, name='start_conversation'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('notifications/', views.notifications, name='notifications'),
]