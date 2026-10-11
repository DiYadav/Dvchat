from django.shortcuts import render
from rest_framework import viewsets
from .serializers import PostSerializer
from .models import Post
from rest_framework.permissions import (IsAuthenticatedOrReadOnly,)
from rest_framework.exceptions import PermissionDenied

# Create your views here.


class PostViewset(viewsets.ModelViewSet):
    serializer_class=PostSerializer
    permission_classes=[IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Post.objects.all().order_by("-id")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def peform_update(self, serializer):
        if serializer.instance.author!=self.request.user:
            raise PermissionDenied("you can update your own posts.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author!=self.request.user:
            raise PermissionDenied("You can delete your own posts.")
        instance.delete()