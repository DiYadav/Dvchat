from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Profile
from .serializers import MyProfileSerializer


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Profile
from .serializers import MyProfileSerializer


class MyProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, created = Profile.objects.get_or_create(
            user=request.user,
            defaults={
                "id_user": request.user.id
            }
        )

        serializer = MyProfileSerializer(
            profile,
            context={"request": request}
        )

        return Response(
            {
                "status": "success",
                "message": "Profile retrieved successfully.",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

    def patch(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user,defaults={"id_user": request.user.id})
        serializer = MyProfileSerializer( profile, data=request.data, partial=True, context={"request": request})

        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "status": "success",
                    "message": "Profile updated successfully.",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {
                "status": "error",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )