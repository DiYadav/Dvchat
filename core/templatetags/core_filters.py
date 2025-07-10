# core/templatetags/core_filters.py

from django import template
from core.models import Profile, LikePost # Import LikePost
from django.contrib.auth import get_user_model

register = template.Library()
User = get_user_model()

@register.filter(name='get_profile')
def get_profile(username):
    try:
        user_obj = User.objects.get(username=username)
        return Profile.objects.get(user=user_obj)
    except (User.DoesNotExist, Profile.DoesNotExist):
        return None

@register.filter(name='has_liked_by_user')
def has_liked_by_user(post_id, user):
    if user.is_anonymous: # Handle unauthenticated users
        return False
    return LikePost.objects.filter(post_id=str(post_id), username=user.username).exists()