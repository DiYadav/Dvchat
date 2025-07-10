# core/templatetags/profile_tags.py
from django import template
from core.models import Profile

register = template.Library()

@register.simple_tag
def get_profile_for_user(user):
    try:
        return Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        return None # Or a default profile object

