from django.shortcuts import render, redirect
from django.contrib.auth.models import User, auth
from django.contrib import messages, auth
from django.contrib.auth.decorators import login_required
from .models import Profile, Post, LikePost, FollowersCount
from itertools import chain
import random
import face_recognition
import base64
from io import BytesIO
from PIL import Image
import pickle
import numpy as np
import json
from django.contrib.auth import login as auth_login
from django.http import JsonResponse
from django.core.files.base import ContentFile
import cv2



@login_required(login_url='face_login')
def index(request):
    user_object = User.objects.get(username=request.user.username)
    user_profile = Profile.objects.get(user=user_object)

    user_following_list = []
    feed = []

    user_following = FollowersCount.objects.filter(follower=request.user.username)

    for users in user_following:
        user_following_list.append(users.user)

    for usernames in user_following_list:
        feed_lists = Post.objects.filter(user=usernames)
        feed.append(feed_lists)

    feed_list = list(chain(*feed))

    # user suggestion starts
    all_users = User.objects.all()
    user_following_all = []

    for user in user_following:
        user_list = User.objects.get(username=user.user)
        user_following_all.append(user_list)
    
    new_suggestions_list = [x for x in list(all_users) if (x not in list(user_following_all))]
    current_user = User.objects.filter(username=request.user.username)
    final_suggestions_list = [x for x in list(new_suggestions_list) if ( x not in list(current_user))]
    random.shuffle(final_suggestions_list)

    username_profile = []
    username_profile_list = []

    for users in final_suggestions_list:
        username_profile.append(users.id)

    for ids in username_profile:
        profile_lists = Profile.objects.filter(id_user=ids)
        username_profile_list.append(profile_lists)

    suggestions_username_profile_list = list(chain(*username_profile_list))


    return render(request, 'index.html', {'user_profile': user_profile, 'posts':feed_list, 'suggestions_username_profile_list': suggestions_username_profile_list[:4]})



@login_required(login_url='face_login')
def upload(request):

    if request.method == 'POST':
        user = request.user.username
        image = request.FILES.get('image_upload')
        caption = request.POST['caption']

        new_post = Post.objects.create(user=user, image=image, caption=caption)
        new_post.save()

        return redirect('/')
    else:
        return redirect('/')
    


@login_required(login_url='face_login')
def search(request):
    user_object = User.objects.get(username=request.user.username)
    user_profile = Profile.objects.get(user=user_object)

    if request.method == 'POST':
        username = request.POST.get('username')
        username_object = User.objects.filter(username__icontains=username)

        username_profile = []
        username_profile_list = []

        for users in username_object:
            username_profile.append(users.id)

        for ids in username_profile:
            profile_lists = Profile.objects.filter(id_user=ids)
            username_profile_list.append(profile_lists)
        
        username_profile_list = list(chain(*username_profile_list))
    return render(request, 'search.html', {'user_profile': user_profile, 'username_profile_list': username_profile_list})



@login_required(login_url='face_login')
def like_post(request):
    username = request.user.username
    post_id = request.GET.get('post_id')

    post = Post.objects.get(id=post_id)

    like_filter = LikePost.objects.filter(post_id=post_id, username=username).first()

    if like_filter == None:
        new_like = LikePost.objects.create(post_id=post_id, username=username)
        new_like.save()
        post.no_of_likes = post.no_of_likes+1
        post.save()
        return redirect('/')
    else:
        like_filter.delete()
        post.no_of_likes = post.no_of_likes-1
        post.save()
        return redirect('/')



@login_required(login_url='face_login')
def profile(request, pk):
    user_object = User.objects.get(username=pk)
    user_profile = Profile.objects.get(user=user_object)
    user_posts = Post.objects.filter(user=pk)
    user_post_length = len(user_posts)

    follower = request.user.username
    user = pk

    if FollowersCount.objects.filter(follower=follower, user=user).first():
        button_text = 'Unfollow'
    else:
        button_text = 'Follow'

    user_followers = len(FollowersCount.objects.filter(user=pk))
    user_following = len(FollowersCount.objects.filter(follower=pk))

    context = {
        'user_object': user_object,
        'user_profile': user_profile,
        'user_posts': user_posts,
        'user_post_length': user_post_length,
        'button_text': button_text,
        'user_followers': user_followers,
        'user_following': user_following,
    }
    return render(request, 'profile.html', context)



@login_required(login_url='face_login')
def follow(request):
    if request.method == 'POST':
        follower = request.POST['follower']
        user = request.POST['user']

        if FollowersCount.objects.filter(follower=follower, user=user).first():
            delete_follower = FollowersCount.objects.get(follower=follower, user=user)
            delete_follower.delete()
            return redirect('/profile/'+user)
        else:
            new_follower = FollowersCount.objects.create(follower=follower, user=user)
            new_follower.save()
            return redirect('/profile/'+user)
    else:
        return redirect('/')



@login_required(login_url='face_login')
def settings(request):
    user_profile = Profile.objects.get(user=request.user)

    if request.method == 'POST':
        
        if request.FILES.get('image') == None:
            image = user_profile.profileimg
            bio = request.POST['bio']
            location = request.POST['location']

            user_profile.profileimg = image
            user_profile.bio = bio
            user_profile.location = location
            user_profile.save()
        if request.FILES.get('image') != None:
            image = request.FILES.get('image')
            bio = request.POST['bio']
            location = request.POST['location']

            user_profile.profileimg = image
            user_profile.bio = bio
            user_profile.location = location
            user_profile.save()
        
        return redirect('settings')
    return render(request, 'setting.html', {'user_profile': user_profile})



def register(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        face_image_data = request.POST.get('face_image')

        if not username or not face_image_data:
            return JsonResponse({'status': 'error', 'message': 'Missing username or face image'}, status=400)

        try:
            # Decode base64 image
            face_image_data = face_image_data.split(',')[1]
            decoded_image = base64.b64decode(face_image_data)
            face_image = ContentFile(decoded_image, name=f'{username}_face.jpg')

            # Convert to OpenCV image
            np_array = np.frombuffer(decoded_image, np.uint8)
            img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

            # Get face encoding
            encodings = face_recognition.face_encodings(img)
            if not encodings:
                return JsonResponse({'status': 'error', 'message': 'No face detected'}, status=400)

            encoding = encodings[0].astype(np.float64).tobytes()

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Invalid image: {e}'}, status=400)

        try:
            if User.objects.filter(username=username).exists():
                return JsonResponse({'status': 'error', 'message': 'Username already exists'}, status=400)

            user = User.objects.create(username=username)
            Profile.objects.create(
                user=user,
                id_user=user.id,
                face_image=face_image,
                face_encoding=encoding
            )
            return JsonResponse({'status': 'success', 'message': 'Registered successfully', 'redirect': '/face_login/'})

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': f'Profile creation failed: {e}'}, status=400)

    return render(request, 'register.html')



def face_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        face_image_data = request.POST.get('face_image')

        if not username or not face_image_data:
            return JsonResponse({'status': 'error', 'message': 'Username and face image are required'}, status=400)

        try:
            # Decode base64 image
            face_image_data = face_image_data.split(',')[1]
            decoded_image = base64.b64decode(face_image_data)
            np_array = np.frombuffer(decoded_image, np.uint8)
            img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

            # Get encoding from captured image
            input_encodings = face_recognition.face_encodings(img)
            if not input_encodings:
                return JsonResponse({'status': 'error', 'message': 'No face detected in image'}, status=400)

            input_encoding = input_encodings[0]

            try:
                user = User.objects.get(username=username)
                profile = Profile.objects.get(user=user)
            except User.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'Username not found'}, status=404)
            except Profile.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'Profile not found'}, status=404)

            if not profile.face_encoding:
                return JsonResponse({'status': 'error', 'message': 'No face encoding found for this user'}, status=400)

            known_encoding = np.frombuffer(profile.face_encoding, dtype=np.float64)

            # Use compare_faces with distance check
            results = face_recognition.compare_faces([known_encoding], input_encoding, tolerance=0.45)
            face_distance = face_recognition.face_distance([known_encoding], input_encoding)[0]

            if results[0] and face_distance < 0.45:
                auth_login(request, user)
                return JsonResponse({'status': 'success', 'message': f'Welcome {user.username}', 'redirect': '/home/'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Face does not match the username'}, status=401)

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    return render(request, 'login.html')


@login_required
def home_view(request):
    return render(request, 'home.html', {'username': request.user.username})


@login_required
def logout_view(request):
    logout(request)
    return redirect('face_login')

@login_required
def home_view(request):
    return render(request, 'home.html', {'username': request.user.username})


@login_required
def logout_view(request):
    logout(request)
    return redirect('face_login')



def about_us(request):
    
    return render(request, "about_us.html" )



@login_required(login_url='face_login')
def account_setting(request):
    
    return render (request,'account-setting.html')



@login_required(login_url='face_login')
def logout(request):
    auth.logout(request)
    return redirect('face_login')
