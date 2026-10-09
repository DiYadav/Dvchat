from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Post(models.Model):
    author=models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_posts")
    caption=models.TextField(null=True)
    image=models.ImageField(upload_to="posts/", blank=True, null=True)
    video=models.FileField(upload_to="posts/videos/", blank=True, null=True)
    likes=models.ManyToManyField(User, related_name="liked_posts", blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now_add=True)
    is_active=models.BooleanField(default=True)

    def __str__(self):
        return f"{self.author.username} - {self.caption[:30]}"


class Comment(models.Model):
    post=models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    user=models.ForeignKey(User, on_delete=models.CASCADE)
    text=models.TextField()
    created_at=models.DateTimeField(auto_now_add=True)