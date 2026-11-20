from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_comment_parent'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='is_private',
            field=models.BooleanField(default=False),
        ),
    ]
