from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = request.user.notifications.all()[:30]
        unread_count = request.user.notifications.filter(is_read=False).count()
        serializer = NotificationSerializer(notifications, many=True, context={"request": request})
        return Response(
            {
                "status": "success",
                "unread_count": unread_count,
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = request.user.notifications.filter(id=notification_id).first()
        if not notification:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

        notification.is_read = True
        notification.save()
        return Response({"status": "success", "message": "Notification marked as read."}, status=status.HTTP_200_OK)


class MarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({"status": "success", "message": "All notifications marked as read."}, status=status.HTTP_200_OK)


class UnreadNotificationsCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = request.user.notifications.filter(is_read=False).count()
        return Response({"status": "success", "unread_count": count}, status=status.HTTP_200_OK)
