import os, sys, traceback
os.environ['SECRET_KEY'] = 'dummy'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['DATABASE_URL_KENYA'] = 'sqlite:///:memory:'
os.environ['DATABASE_URL_RWANDA'] = 'sqlite:///:memory:'
os.environ['DATABASE_URL_GHANA'] = 'sqlite:///:memory:'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

try:
    from django.core.management import call_command
    import django
    django.setup()
    call_command('makemigrations', 'groups')
    print("Success")
except Exception as e:
    with open("error_out.txt", "w") as f:
        traceback.print_exc(file=f)
