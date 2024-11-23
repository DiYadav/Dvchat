from django.shortcuts import render, redirect
from django.contrib.auth.models import User, auth
from django.contrib import messages, auth
from django.http import HttpResponse
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
from .forms import UserRegistrationForm
import json


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



def signup(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            face_image_data = form.cleaned_data.get('face_image')

            if not face_image_data:
                messages.error(request, "Face image data is missing. Please try again.")
                return redirect('signup')

            # Check if the user exists
            if User.objects.filter(email=email).exists():
                messages.info(request, 'Email Taken')
                return redirect('signup')
            elif User.objects.filter(username=username).exists():
                messages.info(request, 'Username Taken')
                return redirect('signup')

            # Create the user and Profile
            user = User.objects.create_user(username=username, email=email, password=password)
            user.save()
            new_profile = Profile.objects.create(user=user, id_user=user.id)

            try:
                # Decode and process the face image data
                format, imgstr = face_image_data.split(';base64,')
                decoded_img = base64.b64decode(imgstr)

                img = Image.open(BytesIO(decoded_img))
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                face_encodings = face_recognition.face_encodings(np.array(img))
                if face_encodings:
                    new_profile.face_encoding = json.dumps(face_encodings[0].tolist())
                    new_profile.save()
                else:
                    messages.error(request, "No face detected. Please try again.")
                    return redirect('signup')

            except Exception as e:
                messages.error(request, "Error processing face image. Please try again.")
                return redirect('signup')

            return redirect('settings')

    form = UserRegistrationForm()
    return render(request, 'signup.html', {'form': form})


def face_login(request):
    if request.method == 'POST':
        face_image_data = request.POST.get('face_image')

        if face_image_data:
            try:
                # Decode and process the face image data
                format, imgstr = face_image_data.split(';base64,')
                decoded_img = base64.b64decode(imgstr)
                img = Image.open(BytesIO(decoded_img))
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # Get face encoding
                face_encoding = face_recognition.face_encodings(np.array(img))
                if face_encoding:
                    face_encoding = face_encoding[0]

                    # Compare with stored encodings
                    for profile in Profile.objects.all():
                        stored_encoding = json.loads(profile.face_encoding)
                        match = face_recognition.compare_faces([stored_encoding], face_encoding)

                        if match[0]:
                            user = profile.user
                            auth.login(request, user)
                            return redirect('index')

                    messages.error(request, "Face not recognized.")
                else:
                    messages.error(request, "No face detected. Please try again.")
            except Exception as e:
                messages.error(request, "Error processing face image. Please try again.")

        return redirect('face_login')
    else:
        return render(request, 'face_login.html')









@login_required(login_url='face_login')
def about_us(request):
    
    return render(request, "about_us.html" )



@login_required(login_url='face_login')
def account_setting(request):
    
    return render (request,'account-setting.html')



@login_required(login_url='face_login')
def logout(request):
    auth.logout(request)
    return redirect('face_login')












