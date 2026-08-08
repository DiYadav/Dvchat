from django.shortcuts import render
import numpy as np
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from .serializers import LoginSerializer
from django.contrib.auth.models import User
import base64
from django.core.files.base import ContentFile
import face_recognition
import io
from PIL import Image
from django.contrib.auth import login, logout
from rest_framework.permissions import IsAuthenticated



class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            return Response(
                {
                    "status": "success",
                    "message": "Login successful",
                    "data": serializer.validated_data,
                },
                status=status.HTTP_200_OK
            )
        return Response(
            {
                "status": "error",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    

# class RegisterAPIView(APIView):
#     permission_classes = []
#     def post(self, request):

#         username = request.data.get("username")
#         email = request.data.get("email")
#         password1 = request.data.get("password1")
#         password2 = request.data.get("password2")
#         face_image_data = request.data.get("face_image")

#         # Required Fields
#         if not all([username, email, password1, password2, face_image_data]):
#             return Response(
#                 {
#                     "status": "error",
#                     "message": "All fields are required."
#                 },
#                 status=status.HTTP_400_BAD_REQUEST
#             )
#         if password1 != password2:             # Password Match
#             return Response(
#                 {
#                     "status": "error",
#                     "message": "Passwords do not match."
#                 },
#                 status=status.HTTP_400_BAD_REQUEST
#             )
#         if User.objects.filter(username=username).exists():
#             return Response(
#                 {
#                     "status": "error",
#                     "message": "Username already exists."
#                 },
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         if User.objects.filter(email=email).exists(): #Email Exists
#             return Response(
#                 {
#                     "status": "error",
#                     "message": "Email already registered."
#                 },
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         try:

#             # Decode Base64 Image
#             image_string = face_image_data.split(",")[1]
#             decoded_image = base64.b64decode(image_string)
#             face_image = ContentFile(
#                 decoded_image,
#                 name=f"{username}_face.jpg"
#             )
#             # Convert to RGB
#             image = Image.open(
#                 io.BytesIO(decoded_image)
#             ).convert("RGB")
#             image = np.array(image)
#             # Face Encoding
#             encodings = face_recognition.face_encodings(image)
#             if len(encodings) == 0:
#                 return Response(
#                     {
#                         "status": "error",
#                         "message": "No face detected."
#                     },
#                     status=status.HTTP_400_BAD_REQUEST
#                 )
#             encoding = encodings[0].astype(np.float64).tobytes()
#             # Create User
#             user = User.objects.create_user(
#                 username=username,
#                 email=email,
#                 password=password1
#             )
#             # Create Profile
#             Profile.objects.create(
#                 user=user,
#                 id_user=user.id,
#                 face_image=face_image,
#                 face_encoding=encoding
#             )
#             return Response(
#                 {
#                     "status": "success",
#                     "message": "Registration successful."
#                 },
#                 status=status.HTTP_201_CREATED
#             )
#         except Exception as e:
#             return Response(
#                 {
#                     "status": "error",
#                     "message": str(e)
#                 },
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)

        return Response(
            {
                "status": "success",
                "message": "Logged out successfully."
            },
            status=status.HTTP_200_OK
        )


# class FaceLoginAPIView(APIView):

#     permission_classes = []
#     def post(self, request):

#         username = request.data.get("username")
#         face_image_data = request.data.get("face_image")

#         if not username or not face_image_data:
#             return Response(
#                 {
#                     "status": "error",
#                     "message": "Username and face image are required"
#                 },
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         try:
#             user = User.objects.get(username=username)
#             profile = Profile.objects.get(user=user)

#             if not profile.is_face_login_enabled:
#                 return Response(
#                     {
#                         "status": "error",
#                         "message": "Face login is disabled."
#                     },
#                     status=status.HTTP_403_FORBIDDEN
#                 )

#             # Decode Base64 image
#             image_data = face_image_data.split(",")[1]
#             decoded_image = base64.b64decode(image_data)

#             image = Image.open(io.BytesIO(decoded_image)).convert("RGB")

#             image = np.array(image)

#             encodings = face_recognition.face_encodings(image)

#             if len(encodings) == 0:
#                 return Response(
#                     {
#                         "status": "error",
#                         "message": "No face detected."
#                     },
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             input_encoding = encodings[0]

#             stored_encoding = np.frombuffer(
#                 profile.face_encoding,
#                 dtype=np.float64
#             )

#             matched = face_recognition.compare_faces(
#                 [stored_encoding],
#                 input_encoding,
#                 tolerance=0.45
#             )[0]

#             if not matched:
#                 return Response(
#                     {
#                         "status": "error",
#                         "message": "Face not recognized."
#                     },
#                     status=status.HTTP_401_UNAUTHORIZED
#                 )

#             login(request, user)

#             return Response(
#                 {
#                     "status": "success",
#                     "message": f"Welcome {user.username}",
#                     "username": user.username
#                 },
#                 status=status.HTTP_200_OK
#             )

#         except User.DoesNotExist:
#             return Response(
#                 {
#                     "status": "error",
#                     "message": "User not found."
#                 },
#                 status=status.HTTP_404_NOT_FOUND
#             )

#         except Profile.DoesNotExist:
#             return Response(
#                 {
#                     "status": "error",
#                     "message": "Profile not found."
#                 },
#                 status=status.HTTP_404_NOT_FOUND
#             )

#         except Exception as e:
#             return Response(
#                 {
#                     "status": "error",
#                     "message": str(e)
#                 },
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )  # For GET requests
