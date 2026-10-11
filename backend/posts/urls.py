from rest_framework.routers import DefaultRouter
from .views import PostViewset


router=DefaultRouter()
router.register("posts", PostViewset, basename="posts")

urlpatterns=[]
urlpatterns += router.urls
