from django.shortcuts import render,redirect

from django.shortcuts import render, get_object_or_404

from django.contrib.auth.decorators import login_required



def chat_view(request):
    return render (request, 'chat_room.html')