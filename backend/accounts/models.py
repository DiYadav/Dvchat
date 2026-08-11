from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User,on_delete=models.CASCADE,related_name="profile")
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=100, blank=True)
    profileimg = models.ImageField(upload_to="profile_images/",default="blank-profile-picture.png",blank=True)
    face_image = models.ImageField(upload_to="user_faces/",null=True,blank=True)
    face_encoding = models.BinaryField(null=True,blank=True)
    is_face_login_enabled = models.BooleanField(default=False)
    
    def __str__(self):
        return self.user.username