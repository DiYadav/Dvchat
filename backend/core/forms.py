from django import forms
from .models import Profile , Message # Make sure Profile is imported

class ProfileUpdateForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['bio', 'location', 'profileimg']

class MessageForm(forms.Form):
    content = forms.CharField(widget=forms.Textarea(attrs={'rows': 3}), label='') # No label for cleaner UI
 