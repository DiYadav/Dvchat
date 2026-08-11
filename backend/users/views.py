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
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import Profile
User = get_user_model()



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
    

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        password1 = request.data.get("password1")
        password2 = request.data.get("password2")
        face_image_data = request.data.get("face_image")

        if not all([username,email,password1,password2]):  # Required fields
            return Response(
                {
                    "status": "error",
                    "message": "Username, email and passwords are required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if password1 != password2:  # Password match
            return Response(
                {
                    "status": "error",
                    "message": "Passwords do not match."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():   # Username exists
            return Response(
                {
                    "status": "error",
                    "message": "Username already exists."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():     # Email exists
            return Response(
                {
                    "status": "error",
                    "message": "Email already registered."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            if "," in face_image_data:   # Decode Base64 image
                image_string = face_image_data.split(",",1)[1]
            else:
                image_string = face_image_data

            decoded_image = base64.b64decode(image_string)
            face_image = ContentFile(decoded_image,name=f"{username}_face.jpg")   # Create image file
            image = Image.open(io.BytesIO(decoded_image)).convert("RGB")  # Convert image
            image = np.array(image)
            encodings = face_recognition.face_encodings(image)    # Detect face
            if len(encodings) == 0:
                return Response(
                    {
                        "status": "error",
                        "message": "No face detected."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            encoding = ( encodings[0].astype(np.float64).tobytes())    # Store face encoding
            user = User.objects.create_user(username=username,email=email,password=password1)   # Create User
            Profile.objects.create(user=user,id_user=user.id,face_image=face_image,face_encoding=encoding) # Create Profile
            return Response(
                {
                    "status": "success",
                    "message": "Registration successful."
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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


class FaceLoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        face_image_data = request.data.get("face_image")
        if not username or not face_image_data:
            return Response(
                {
                    "status": "error",
                    "message": "Username and face image are required"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = User.objects.get(username=username) # Get user
            profile = Profile.objects.get( user=user)

            if not profile.is_face_login_enabled:   # Check face login
                return Response(
                    {
                        "status": "error",
                        "message": "Face login is disabled."
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if "," in face_image_data:     # Decode Base64
                image_data = face_image_data.split( ",", 1 )[1]
            else:
                image_data = face_image_data 
                decoded_image = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(decoded_image)).convert("RGB")    # Convert image
            image = np.array(image)
            encodings = face_recognition.face_encodings(image)       # Detect face
            if not encodings:
                return Response(
                    {
                        "status": "error",
                        "message": "No face detected."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            input_encoding = encodings[0]
            stored_encoding = np.frombuffer(profile.face_encoding,dtype=np.float64) #Stored face encoding

            matched = face_recognition.compare_faces([stored_encoding],input_encoding,tolerance=0.45)[0]   # Compare faces
            if not matched:
                return Response(
                    {
                        "status": "error",
                        "message": "Face not recognized."
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )

            refresh = RefreshToken.for_user(user)           # JWT
            access_token = refresh.access_token
            return Response(
                {
                    "status": "success",
                    "message": f"Welcome {user.username}",
                    "username": user.username,

                    "access": str(access_token),
                    "refresh": str(refresh),
                },
                status=status.HTTP_200_OK
            )
        
        except User.DoesNotExist:
            return Response(
                {
                    "status": "error",
                    "message": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        except Profile.DoesNotExist:
            return Response(
                {
                    "status": "error",
                    "message": "Profile not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )