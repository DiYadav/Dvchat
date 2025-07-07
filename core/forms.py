# from django import forms
# from django.contrib.auth.models import User
# from .models import *
# core/forms.py
from django import forms
from .models import Profile , Message # Make sure Profile is imported

class ProfileUpdateForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['bio', 'location', 'profileimg']

class MessageForm(forms.Form):
    content = forms.CharField(widget=forms.Textarea(attrs={'rows': 3}), label='') # No label for cleaner UI
    # We won't include recipient here, as it will be handled by the view based on the conversation context

# # class UserRegistrationForm(forms.ModelForm):
# #     password = forms.CharField(widget=forms.PasswordInput)
# #     password2 = forms.CharField(label='Confirm Password', widget=forms.PasswordInput)
# #     face_image = forms.CharField(widget=forms.HiddenInput, required=False)  # Hidden field for face image data

# #     class Meta:
# #         model = User
# #         fields = ['username', 'email']

# #     def clean_password2(self):
# #         cd = self.cleaned_data
# #         if cd['password'] != cd['password2']:
# #             raise forms.ValidationError('Passwords do not match.')
# #         return cd['password2']


# # class UserLoginForm(forms.Form):
# #     username = forms.CharField()
# #     password = forms.CharField(widget=forms.PasswordInput)

# # class FaceLoginForm(forms.Form):
# #     face_image = forms.CharField(widget=forms.HiddenInput)  # Hidden field for face image data


# class UserRegistrationForm(forms.ModelForm):
#     password = forms.CharField(widget=forms.PasswordInput)
#     password2 = forms.CharField(label='Confirm Password', widget=forms.PasswordInput)
#     face_image = forms.CharField(widget=forms.HiddenInput, required=False)  # Hidden field for face image data

#     class Meta:
#         model = User
#         fields = ['username', 'email']

#     def clean_password2(self):
#         cd = self.cleaned_data
#         if cd['password'] != cd['password2']:
#             raise forms.ValidationError('Passwords do not match.')
#         return cd['password2']
    

