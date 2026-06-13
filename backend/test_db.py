import os
import dotenv
import django
from django.db import connection

dotenv.load_dotenv()
os.environ.pop('DATABASE_URL', None)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    print("Database connection successful!")
except Exception as e:
    print(f"Database connection failed: {e}")
