from django import forms
from .models import Message # Make sure Profile is imported

class MessageForm(forms.Form):
    content = forms.CharField(widget=forms.Textarea(attrs={'rows': 3}), label='') # No label for cleaner UI
 