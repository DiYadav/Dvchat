# core/templatetags/core_tags.py
from django import template
from ..models import Notification

register = template.Library()

@register.simple_tag(takes_context=True)
def get_unread_notifications_count(context):
    request = context['request']
    if request.user.is_authenticated:
        return Notification.objects.filter(recipient=request.user, is_read=False).count()
    return 0