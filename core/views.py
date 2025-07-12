from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.models import User 
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login as auth_login, logout as auth_logout# Alias Django's logout to avoid name clash with your function
from itertools import chain
import random
from django.urls import reverse
from django.http import HttpResponseRedirect
import face_recognition
import base64
import numpy as np
from django.http import JsonResponse
from django.core.files.base import ContentFile
import cv2
from .models import * # Only import 'Follower', not 'FollowersCount'
from .forms import ProfileUpdateForm 
from .models import Post 
from django.db import models 
from .forms import ProfileUpdateForm, MessageForm 
from datetime import datetime, timedelta
import base64
import json
from django.contrib.auth import authenticate, login


@login_required(login_url='face_login')
def message_inbox(request):
    # Get all conversations where the current user is a participant
    conversations = Conversation.objects.filter(participants=request.user).order_by('-updated_at').distinct()

    # Prepare conversations for the template, including other participants
    conversations_with_others = []
    for conv in conversations:
        # Get all participants for this conversation
        all_participants = conv.participants.all()
        # Filter out the current user to find the other participants
        other_participants = [p for p in all_participants if p != request.user]
        conversations_with_others.append({
            'conversation': conv,
            'other_participants': other_participants,
            'last_message': conv.messages.last() # Get last message here for efficiency
        })
    
    context = {
        'conversations_data': conversations_with_others, # Pass this new structured data
        'user_profile': request.user.profile,
    }
    return render(request, 'message_inbox.html', context)
@login_required(login_url='face_login')
def conversation_detail(request, conversation_id):
    conversation = get_object_or_404(Conversation, id=conversation_id)

    # Ensure the current user is a participant in this conversation
    if request.user not in conversation.participants.all():
        messages.error(request, "You are not a participant in this conversation.")
        return redirect('message_inbox')

    messages_in_conversation = conversation.messages.all()

    if request.method == 'POST':
        form = MessageForm(request.POST)
        if form.is_valid():
            content = form.cleaned_data['content']
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=content
            )
        
            conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
            return redirect('conversation_detail', conversation_id=conversation.id)
    else:
        form = MessageForm()
        # Mark all messages in this conversation as read for the current user when they view it
        conversation.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)


    # Identify the other participant(s) for display
    other_participants = conversation.participants.exclude(id=request.user.id)
    
    context = {
        'conversation': conversation,
        'messages': messages_in_conversation,
        'form': form,
        'user_profile': request.user.profile,
        'other_participants': other_participants,
    }
    return render(request, 'conversation_detail.html', context)


@login_required(login_url='face_login')
def start_conversation(request, user_id):
    # This view initiates a conversation with a specific user
    recipient = get_object_or_404(User, id=user_id)

    # Prevent starting a conversation with self
    if recipient == request.user:
        messages.warning(request, "You cannot start a conversation with yourself.")
        return redirect('profile_view', username=request.user.username)
    existing_conversations = Conversation.objects.filter(participants=request.user).filter(participants=recipient).annotate(num_participants=models.Count('participants')).filter(num_participants=2)

    if existing_conversations.exists():
        conversation = existing_conversations.first()
    else:
        # Create a new conversation if one doesn't exist
        conversation = Conversation.objects.create()
        conversation.participants.add(request.user, recipient)
        conversation.save() # Save after adding participants for ManyToMany

    return redirect('conversation_detail', conversation_id=conversation.id)


@login_required(login_url='face_login')
def create_post_view(request):
    if request.method == 'POST':
        # Get data from the submitted form
        user = request.user.username # Assuming Post.user stores username as a CharField
        image = request.FILES.get('image_upload') # 'image_upload' is the 'name' attribute of the file input
        caption = request.POST.get('caption') # 'caption' is the 'name' attribute of the text input

        if image: # Ensure an image was uploaded
            new_post = Post.objects.create(user=user, image=image, caption=caption)
            new_post.save()
            # Redirect to the home page or the user's profile after successful post
            return redirect('/') # Redirects to index view
        else:
            messages.error(request, "Please upload an image for your post.")
            # If no image, re-render the page with the error message
            return render(request, 'create_post.html', {'user_profile': request.user.profile})

    else:
        # For GET request, just render the empty form
        # Pass user_profile for potential display in the template (e.g., current user's profile image)
        return render(request, 'create_post.html', {'user_profile': request.user.profile})


@login_required(login_url='face_login')
def edit_profile_view(request):
    user_profile = get_object_or_404(Profile, user=request.user)

    if request.method == 'POST':
        form = ProfileUpdateForm(request.POST, request.FILES, instance=user_profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Your profile was successfully updated!')
            return redirect('profile_view', username=request.user.username) # Redirect to their profile page after saving
        else:
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field.replace('_', ' ').title()}: {error}")
    else:
        form = ProfileUpdateForm(instance=user_profile)

    return render(request, 'edit_profile.html', {'user_profile': user_profile, 'form': form})

@login_required(login_url='face_login')
def index(request):
    user_object = get_object_or_404(User, username=request.user.username)
    user_profile = get_object_or_404(Profile, user=user_object)

    # --- Feed Logic ---
    user_following = Follower.objects.filter(follower=request.user)
    user_following_list = [f.user.username for f in user_following]
    user_following_list.append(request.user.username)  # include own posts

    # Fetch posts from followed users + self
    feed = Post.objects.filter(user__in=user_following_list).order_by('-created_at')
    feed_list = list(feed)

    # ✅ Add `is_liked` attribute to each post for heart coloring
    for post in feed_list:
        post.is_liked = post.likes.filter(id=request.user.id).exists()

    # --- Suggestion Logic ---
    all_users = User.objects.all()
    user_following_users = [f.user for f in user_following]

    # Users not followed and not self
    final_suggestions = [
        user for user in all_users
        if user not in user_following_users and user != request.user
    ]
    random.shuffle(final_suggestions)

    suggestions_username_profile_list = []
    for user_obj in final_suggestions:
        profile = Profile.objects.filter(user=user_obj).first()
        if profile:
            suggestions_username_profile_list.append(profile)

    # --- Render the template ---
    return render(request, 'index.html', {
        'user_profile': user_profile,
        'posts': feed_list,
        'suggestions_username_profile_list': suggestions_username_profile_list[:5],
    })


@login_required(login_url='face_login')
def upload(request):
    if request.method == 'POST':
        user = request.user.username # Post.user is CharField, so store username string
        image = request.FILES.get('image_upload')
        caption = request.POST['caption']

        new_post = Post.objects.create(user=user, image=image, caption=caption)
        new_post.save()

        return redirect('/')
    else:
        return redirect('/')


@login_required(login_url='login')
def search(request):
    user = request.user
    user_profile = Profile.objects.get(user=user)
    username_profile_list = []
    searched_username = ''
    total_users = 0
    pages = 0
    images = 0
    groups = 0
    globals_count = 0  # You can rename it based on your model logic

    if request.method == "POST":
        searched_username = request.POST.get('username', '')
        matched_users = User.objects.filter(username__icontains=searched_username)

        for user_obj in matched_users:
            profile = Profile.objects.filter(user=user_obj).first()
            if profile:
                username_profile_list.append(profile)

        # 👉 Count logic
        total_users = len(username_profile_list)
        pages = sum(1 for profile in username_profile_list if hasattr(profile, 'page'))
        images = sum(1 for profile in username_profile_list if profile.profileimg)
        groups = sum(1 for profile in username_profile_list if hasattr(profile, 'group'))
        globals_count = sum(1 for profile in username_profile_list if profile.user.email.endswith('@gmail.com'))

    context = {
        'user_profile': user_profile,
        'username_profile_list': username_profile_list,
        'username': searched_username,
        'total_users': total_users,
        'pages': pages,
        'images': images,
        'groups': groups,
        'globals': globals_count,
    }
    return render(request, 'search.html', context)


@login_required(login_url='face_login')
def like_post(request):
    username = request.user.username
    post_id = request.GET.get('post_id')

    post = get_object_or_404(Post, id=post_id) # Use get_object_or_404 for robustness

    # LikePost.username is CharField, so filter by username string
    like_filter = LikePost.objects.filter(post_id=post_id, username=username).first()

    if like_filter is None: # Use 'is None' for comparison
        new_like = LikePost.objects.create(post_id=post_id, username=username)
        new_like.save()
        post.no_of_likes = post.no_of_likes + 1
        post.save()
    else:
        like_filter.delete()
        post.no_of_likes = post.no_of_likes - 1
        post.save()
    
    return redirect(request.META.get('HTTP_REFERER', '/')) # Redirect back to previous page


@login_required # Ensures only logged-in users can access profile pages
def profile_view(request, username):
    """
    Renders the profile page for a given username.
    """
    # 1. Fetch the profile user's data
    profile_user_obj = get_object_or_404(User, username=username)

    # Get the custom Profile object associated with this User
    profile_user_profile, created = Profile.objects.get_or_create(user=profile_user_obj)

    # 2. Determine if it's the logged-in user's own profile
    is_own_profile = (request.user == profile_user_obj)

    # 3. Fetch posts by this user
    # Post.user is a CharField, so filter by username string
    profile_posts = Post.objects.filter(user=profile_user_obj.username).order_by('-created_at')

    # 4. Calculate follower/following counts
    # Follower.user and Follower.follower are ForeignKeys to User, so filter by User objects
    followers_count = Follower.objects.filter(user=profile_user_obj).count()
    following_count = Follower.objects.filter(follower=profile_user_obj).count()

    # Count number of posts
    posts_count = profile_posts.count()

    # 5. Determine if the logged-in user is following this profile (if not their own)
    is_following = False
    if not is_own_profile:
        # Follower.follower and Follower.user are ForeignKeys to User, so filter by User objects
        if Follower.objects.filter(follower=request.user, user=profile_user_obj).exists():
            is_following = True

    # Prepare context data to pass to the template
    context = {
        'profile_user': profile_user_profile,
        'profile_user_obj': profile_user_obj,
        'profile_posts': profile_posts,
        'is_own_profile': is_own_profile,
        'is_following': is_following,
        'followers_count': followers_count,
        'following_count': following_count,
        'posts_count': posts_count,
        'user_profile': request.user.profile # Assuming current logged in user's profile is needed for sidebar
    }

    return render(request, 'profile.html', context)


@login_required(login_url='face_login')
def follow(request):
    if request.method == 'POST':
        user_to_follow_username = request.POST.get('user')
        follower_user = request.user # The currently logged-in user

        # Get the User object for the person being followed/unfollowed
        user_being_followed = get_object_or_404(User, username=user_to_follow_username)

        # Prevent a user from following themselves
        if follower_user == user_being_followed:
            messages.error(request, "You cannot follow yourself.")
            return redirect('profile_view', username=follower_user.username)

        # Check if the follower_user is already following user_being_followed
        is_following = Follower.objects.filter(
            follower=follower_user,
            user=user_being_followed
        ).exists()

        if is_following:
            # If already following, unfollow (delete the relationship)
            Follower.objects.filter(
                follower=follower_user,
                user=user_being_followed
            ).delete()
            messages.success(request, f"You have unfollowed {user_to_follow_username}.")
        else:
            # If not following, follow (create the relationship)
            Follower.objects.create(
                follower=follower_user,
                user=user_being_followed
            )
            messages.success(request, f"You are now following {user_to_follow_username}.")

            # Optional: Create a notification for the user who was just followed
            # Ensure Notification model and import are correct for this to work
            # if Notification is not defined/imported, this line will cause an error
            Notification.objects.create(
                recipient=user_being_followed,
                sender=follower_user,
                notification_type='follow',
                message=f"{follower_user.username} started following you."
            )

        # Redirect back to the profile page of the user who was followed/unfollowed
        return redirect('profile_view', username=user_to_follow_username)

    # If the request is GET, redirect to home or index
    return redirect('index')



def register(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')
        face_image_data = request.POST.get('face_image')

        # --- Validate required fields ---
        if not all([username, email, password1, password2, face_image_data]):
            return JsonResponse({'status': 'error', 'message': 'All fields are required'}, status=400)

        if password1 != password2:
            return JsonResponse({'status': 'error', 'message': 'Passwords do not match'}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({'status': 'error', 'message': 'Username already exists'}, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({'status': 'error', 'message': 'Email already registered'}, status=400)

        try:
            # --- Decode base64 face image ---
            face_image_data = face_image_data.split(',')[1]
            decoded_image = base64.b64decode(face_image_data)
            face_image = ContentFile(decoded_image, name=f'{username}_face.jpg')

            # --- Convert to image and detect face ---
            np_array = np.frombuffer(decoded_image, np.uint8)
            img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

            encodings = face_recognition.face_encodings(img)
            if not encodings:
                return JsonResponse({'status': 'error', 'message': 'No face detected'}, status=400)

            encoding = encodings[0].astype(np.float64).tobytes()

            # --- Create User & Profile ---
            user = User.objects.create_user(username=username, email=email, password=password1)
            Profile.objects.create(
                user=user,
                id_user=user.id,
                face_image=face_image,
                face_encoding=encoding
            )

            return JsonResponse({'status': 'success', 'message': 'Registered successfully', 'redirect': '/face_login/'})

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Registration failed: {e}'}, status=500)

    return render(request, 'register.html')



def face_login(request):
    if request.method == "POST":
        username = request.POST.get("username")
        face_image_data = request.POST.get("face_image")

        if not username or not face_image_data:
            return JsonResponse({"status": "error", "message": "Username and face image are required"}, status=400)

        try:
            user = User.objects.get(username=username)
            profile = Profile.objects.get(user=user)

            if not profile.is_face_login_enabled:
                return JsonResponse({"status": "error", "message": "Face login is disabled for this user."}, status=403)


            # Decode and convert image
            face_image_data = face_image_data.split(",")[1]
            decoded_image = base64.b64decode(face_image_data)
            np_array = np.frombuffer(decoded_image, np.uint8)
            img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

            # Face encoding
            encodings = face_recognition.face_encodings(img)
            if not encodings:
                return JsonResponse({"status": "error", "message": "No face detected"}, status=400)

            input_encoding = encodings[0]
            stored_encoding = np.frombuffer(profile.face_encoding, dtype=np.float64)

            matched = face_recognition.compare_faces([stored_encoding], input_encoding, tolerance=0.45)[0]
            if matched:
                login(request, user)
                return JsonResponse({"status": "success", "message": f"Welcome {user.username}", "redirect": "/home/"})
            else:
                return JsonResponse({"status": "error", "message": "Face not recognized"}, status=401)

        except User.DoesNotExist:
            return JsonResponse({"status": "error", "message": "User not found"}, status=404)
        except Profile.DoesNotExist:
            return JsonResponse({"status": "error", "message": "User profile not found"}, status=404)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return render(request, "login.html")  # For GET requests


def password_login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            username = data.get("username")
            password = data.get("password")

            if not username or not password:
                return JsonResponse({"status": "error", "message": "Username and password are required"}, status=400)

            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                return JsonResponse({"status": "success", "message": f"Welcome {user.username}", "redirect": "/home/"})
            else:
                return JsonResponse({"status": "error", "message": "Invalid credentials"}, status=401)

        except json.JSONDecodeError:
            return JsonResponse({"status": "error", "message": "Invalid JSON data"}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)




@login_required
def home_view(request): # Keep this one
    return render(request, 'home.html', {'username': request.user.username})


@login_required
def logout_view(request): # Keep this one, and use auth_logout
    auth_logout(request) # Use the aliased logout function
    return redirect('face_login')


def about_us(request):
    return render(request, "about_us.html" )

@login_required(login_url='face_login')
def dashboard(request):
    user = request.user
    user_profile = get_object_or_404(Profile, user=user)

    # 1. User Statistics
    total_posts = Post.objects.filter(user=user.username).count()
    
    # Calculate total likes across all user's posts
    # Get all post IDs by the user
    user_post_ids = Post.objects.filter(user=user.username).values_list('id', flat=True)
    # Count likes on those posts
    total_likes_on_posts = LikePost.objects.filter(post_id__in=[str(uuid) for uuid in user_post_ids]).count()

    total_followers = Follower.objects.filter(user=user).count()
    total_following = Follower.objects.filter(follower=user).count()

    # 2. Recent Activity (e.g., new followers)
    # Get recent followers (e.g., in the last 7 days)
    seven_days_ago = datetime.now() - timedelta(days=7)
    recent_followers = Follower.objects.filter(user=user, created_at__gte=seven_days_ago).order_by('-created_at')

    # Get recent messages (e.g., unread messages in user's conversations)
    unread_messages = Message.objects.filter(
        conversation__participants=user, # Messages in conversations involving the user
        is_read=False                   # That are unread
    ).exclude(sender=user).order_by('-timestamp')[:5] # Exclude messages sent by self, limit to 5

    # 3. Most Liked Posts (Top 3)
    most_liked_posts = Post.objects.filter(user=user.username).order_by('-no_of_likes')[:3]

    context = {
        'user_profile': user_profile,
        'total_posts': total_posts,
        'total_likes_on_posts': total_likes_on_posts,
        'total_followers': total_followers,
        'total_following': total_following,
        'recent_followers': recent_followers,
        'unread_messages': unread_messages,
        'most_liked_posts': most_liked_posts,
        # You can add more data here as needed for your dashboard
    }
    return render(request, 'dashboard.html', context)





@login_required(login_url='face_login')

def notifications(request):

    user_notifications = Notification.objects.filter(recipient=request.user).order_by('-created_at')

    if request.method == 'POST' and 'mark_read' in request.POST:

        notification_id = request.POST.get('notification_id')

        try:

            notification = Notification.objects.get(id=notification_id, recipient=request.user)

            notification.is_read = True

            notification.save()

            messages.success(request, "Notification marked as read.")

        except Notification.DoesNotExist:

            messages.error(request, "Notification not found or you don't have permission.")

        return redirect('notifications') # Redirect back to notifications page



    context = {

        'notifications': user_notifications,

        'unread_count': user_notifications.filter(is_read=False).count(), # Pass unread count for template

    }

    return render(request, 'notifications.html', context)


@login_required
def add_comment(request, post_id):
    if request.method == 'POST':
        post = get_object_or_404(Post, id=post_id)
        comment_text = request.POST.get('comment_text')
        if comment_text:
            Comment.objects.create(post=post, user=request.user, text=comment_text)
    return HttpResponseRedirect(request.META.get('HTTP_REFERER', reverse('index')))


@login_required
def like_post(request):
    post_id = request.GET.get('post_id')
    post = get_object_or_404(Post, id=post_id)

    if request.user in post.likes.all():
        # User already liked → unlike
        post.likes.remove(request.user)
        post.no_of_likes -= 1
    else:
        # User is liking the post
        post.likes.add(request.user)
        post.no_of_likes += 1

    post.save()
    return redirect(request.META.get('HTTP_REFERER', '/'))

@login_required(login_url='face_login')
def account_settings(request):
    user_profile = Profile.objects.get(user=request.user)

    if request.method == 'POST':
        # Handle both forms together (or split later)
        user.username = request.POST.get('username')
        user.email = request.POST.get('email')
        user_profile.alt_email = request.POST.get('alt_email')
        user_profile.facebook = request.POST.get('facebook')
        user_profile.twitter = request.POST.get('twitter')
        user_profile.instagram = request.POST.get('instagram')

        # Optional: Handle languages checkboxes
        languages = request.POST.getlist('languages')
        user_profile.languages_known = languages

        user.save()
        user_profile.save()
        return redirect('account_settings')

    context = {
        'user_profile': user_profile,
        'languages': ['English', 'French', 'Hindi', 'Spanish', 'Arabic', 'Italian']
    }
    return render(request, 'account_settings.html', context)


# @login_required(login_url='face_login')
# def settings(request):
#     user_profile = Profile.objects.get(user=request.user)

#     if request.method == 'POST':
#         # You can simplify this if/else block
#         image = request.FILES.get('image')
#         bio = request.POST['bio']
#         location = request.POST['location']

#         if image: # Check if a new image was uploaded
#             user_profile.profileimg = image
#         # Don't set image = user_profile.profileimg if image is None, just leave it unchanged if no new upload
        
#         user_profile.bio = bio
#         user_profile.location = location
#         user_profile.save()
        
#         return redirect('settings')
#     return render(request, 'setting.html', {'user_profile': user_profile})


from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .models import Profile

@login_required(login_url='face_login')
def settings(request):
    user_profile = Profile.objects.get(user=request.user)

    if request.method == 'POST':
        # Handle profile updates
        image = request.FILES.get('image')
        bio = request.POST.get('bio', '')
        location = request.POST.get('location', '')

        # Handle face lock toggle checkbox
        face_lock_enabled = request.POST.get('face_lock_toggle') == 'on'

        if image:
            user_profile.profileimg = image

        user_profile.bio = bio
        user_profile.location = location
        user_profile.is_face_login_enabled = face_lock_enabled  # ✅ update toggle
        user_profile.save()

        return redirect('settings')

    return render(request, 'setting.html', {
        'user_profile': user_profile,
        'face_login_enabled': user_profile.is_face_login_enabled  # ✅ pass to template
    })



from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator

@csrf_exempt
@login_required
def toggle_face_login(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            enable_face_login = data.get("enabled", True)
            profile = Profile.objects.get(user=request.user)
            profile.is_face_login_enabled = enable_face_login
            profile.save()
            return JsonResponse({"status": "success", "message": "Face login setting updated."})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    return JsonResponse({"status": "error", "message": "Invalid request method"}, status=405)
