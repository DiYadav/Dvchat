from django.db import models
from django.contrib.auth.models import User
from accounts.models import Post


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ("like", "Like"),
        ("comment", "Comment"),
        ("follow", "Follow"),
        ("message", "Message"),
    )

    recipient = models.ForeignKey(User, related_name="notifications", on_delete=models.CASCADE)
    sender = models.ForeignKey(User, related_name="sent_notifications", on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    post = models.ForeignKey(Post, null=True, blank=True, on_delete=models.CASCADE)
    text = models.CharField(max_length=255, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sender.username} {self.notification_type} -> {self.recipient.username}"
