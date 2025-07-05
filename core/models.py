from django.db import models
from django.contrib.auth import get_user_model
import uuid
from datetime import datetime
User = get_user_model()


class Conversation(models.Model):
    # Participants in the conversation. Use ManyToManyField for multiple users.
    # related_name allows reverse lookup from User to Conversation (e.g., user.conversations.all())
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # To track latest activity

    class Meta:
        ordering = ['-updated_at'] # Order conversations by most recent activity

    def __str__(self):
        # Display participants' usernames for easy identification
        return ", ".join([user.username for user in self.participants.all()])


# Model for an individual message within a conversation
class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp'] # Order messages chronologically

    def __str__(self):
        return f"From {self.sender.username} in {self.conversation.id}: {self.content[:50]}..."

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    id_user = models.IntegerField()
    
    # Personal info
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=100, blank=True)

    # Profile image
    profileimg = models.ImageField(upload_to='profile_images', default='blank-profile-picture.png')
    
    # Face recognition fields
    face_image = models.ImageField(upload_to="user_faces/", null=True, blank=True)
    face_encoding = models.BinaryField(null=True, blank=True)

    def __str__(self):
        return self.user.username

class Post(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.CharField(max_length=100)
    image = models.ImageField(upload_to='post_images')
    caption = models.TextField()
    created_at = models.DateTimeField(default=datetime.now)
    no_of_likes = models.IntegerField(default=0)

    def __str__(self):
        return self.user

class LikePost(models.Model):
    post_id = models.CharField(max_length=500)
    username = models.CharField(max_length=100)

    def __str__(self):
        return self.username

class FollowersCount(models.Model):
    follower = models.CharField(max_length=100)
    user = models.CharField(max_length=100)

    def __str__(self):
        return self.user
    
class Follower(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following_set')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers_set')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Ensures a user can only follow another user once
        unique_together = ('follower', 'user')

    def __str__(self):
        return f"{self.follower.username} follows {self.user.username}"
