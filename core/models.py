from django.db import models
from django.contrib.auth import get_user_model
import uuid
from datetime import datetime

User = get_user_model()


import numpy as np
from django.contrib.auth.models import User
import pickle

# class Profile(models.Model):
#     user = models.OneToOneField(User, on_delete=models.CASCADE)
#     id_user = models.IntegerField()
#     bio = models.TextField(blank=True)
#     profileimg = models.ImageField(upload_to='profile_images', default='blank-profile-picture.png')
#     location = models.CharField(max_length=100, blank=True)
#     #face_encoding = models.BinaryField(null=True, blank=True)  # New field for face encoding
#     face_encoding =models.TextField(null=True, blank=True) 

#     def __str__(self):
#         return self.user.username


from django.db import models
from django.contrib.auth.models import User
import uuid
from datetime import datetime

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
    