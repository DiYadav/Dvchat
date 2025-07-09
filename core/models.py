from django.db import models
from django.contrib.auth import get_user_model
import uuid
from datetime import datetime
User = get_user_model()


class Conversation(models.Model):
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


from django.db import models
from django.contrib.auth.models import User
import uuid
from datetime import datetime

class Post(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Stores the username as string (you can change to ForeignKey for more power)
    user = models.CharField(max_length=100)
    
    image = models.ImageField(upload_to='post_images')
    caption = models.TextField()
    created_at = models.DateTimeField(default=datetime.now)
    
    # Like system
    no_of_likes = models.IntegerField(default=0)

    # ✅ This tracks which users liked the post
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True)

    def __str__(self):
        return f"{self.user} - {self.caption[:30]}"




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



class Notification(models.Model):
    # The user who receives the notification
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    # The user who triggered the notification (e.g., the new follower, the one who liked)
    # Can be null if the notification is system-generated (e.g., 'Welcome to FaceAI!')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')

    # Type of notification (e.g., 'follow', 'like', 'comment', 'message', 'welcome')
    notification_type = models.CharField(max_length=50)
    
    # Content/message of the notification
    message = models.TextField(blank=True, null=True)

    # Whether the notification has been read
    is_read = models.BooleanField(default=False)
    
    # When the notification was created
    created_at = models.DateTimeField(default=datetime.now)

    class Meta:
        ordering = ['-created_at'] # Order by newest first

    def _str_(self):
        return f"Notification for {self.recipient.username}: {self.notification_type}"
    

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def _str_(self):
        return f'Comment by {self.user.username} on {self.post.caption[:20]}'