import base64
import io
import numpy as np
from PIL import Image
import face_recognition
from django.contrib.auth import get_user_model, logout
from django.core.files.base import ContentFile
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import Profile
from .serializers import LoginSerializer

User = get_user_model()


class LoginAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            val_data = serializer.validated_data
            return Response(
                {
                    "status": "success",
                    "message": "Login successful",
                    "access": val_data["access"],
                    "refresh": val_data["refresh"],
                    "user": val_data["user"],
                    "data": val_data,
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "status": "error",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


@method_decorator(csrf_exempt, name="dispatch")
class RegisterAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        password1 = request.data.get("password1")
        password2 = request.data.get("password2")
        face_image_data = request.data.get("face_image")

        if not all([username, email, password1, password2]):
            return Response(
                {
                    "status": "error",
                    "message": "Username, email, and both password fields are required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password1 != password2:
            return Response(
                {"status": "error", "message": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"status": "error", "message": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"status": "error", "message": "Email already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = None
        try:
            user = User.objects.create_user(username=username, email=email, password=password1)
            profile_data = {
                "user": user,
                "is_face_login_enabled": False,
            }

            # Face capture during registration is optional
            if face_image_data:
                if "," in face_image_data:
                    image_string = face_image_data.split(",", 1)[1]
                else:
                    image_string = face_image_data

                decoded_image = base64.b64decode(image_string)
                pil_image = Image.open(io.BytesIO(decoded_image)).convert("RGB")
                np_image = np.array(pil_image)

                encodings = face_recognition.face_encodings(np_image)
                if len(encodings) == 0:
                    user.delete()
                    return Response(
                        {
                            "status": "error",
                            "message": "No face detected in the captured image. Please try again with clear lighting.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                encoding_bytes = encodings[0].astype(np.float64).tobytes()
                face_image = ContentFile(decoded_image, name=f"{username}_face.jpg")
                profile_data["face_image"] = face_image
                profile_data["face_encoding"] = encoding_bytes
                profile_data["is_face_login_enabled"] = True

            Profile.objects.create(**profile_data)

            return Response(
                {
                    "status": "success",
                    "message": "Registration successful. You can now log in.",
                    "face_login_enabled": profile_data["is_face_login_enabled"],
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            if user and user.pk:
                user.delete()
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class FaceLoginAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        face_image_data = request.data.get("face_image")

        if not username or not face_image_data:
            return Response(
                {
                    "status": "error",
                    "message": "Username and face image are required for face login.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(username=username)
            profile = Profile.objects.get(user=user)

            if not profile.is_face_login_enabled or not profile.face_encoding:
                return Response(
                    {
                        "status": "error",
                        "message": "Face login is not enabled for this account. Please log in with your password.",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            if "," in face_image_data:
                image_data = face_image_data.split(",", 1)[1]
            else:
                image_data = face_image_data

            decoded_image = base64.b64decode(image_data)
            pil_image = Image.open(io.BytesIO(decoded_image)).convert("RGB")
            np_image = np.array(pil_image)

            encodings = face_recognition.face_encodings(np_image)
            if not encodings:
                return Response(
                    {
                        "status": "error",
                        "message": "No face detected in webcam stream. Please position your face clearly in the frame.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            input_encoding = encodings[0]
            stored_encoding = np.frombuffer(profile.face_encoding, dtype=np.float64)

            matches = face_recognition.compare_faces([stored_encoding], input_encoding, tolerance=0.45)
            if not matches[0]:
                return Response(
                    {
                        "status": "error",
                        "message": "Face not recognized. Verification failed.",
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Issue JWT tokens on successful facial recognition match
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            return Response(
                {
                    "status": "success",
                    "message": f"Welcome back, {user.username}!",
                    "username": user.username,
                    "access": str(access_token),
                    "refresh": str(refresh),
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                    },
                    "data": {
                        "access": str(access_token),
                        "refresh": str(refresh),
                        "username": user.username,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except User.DoesNotExist:
            return Response(
                {"status": "error", "message": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Profile.DoesNotExist:
            return Response(
                {"status": "error", "message": "Profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh_token") or request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        logout(request)
        return Response(
            {"status": "success", "message": "Logged out successfully."},
            status=status.HTTP_200_OK,
        )