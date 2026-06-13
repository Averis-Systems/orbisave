import sqlite3
import os

db_path = r'c:\Users\ADMIN\Desktop\Orbisave App\orbisave\backend\db_ke.sqlite3'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name, status, verification_status FROM groups_group ORDER BY created_at DESC LIMIT 5")
rows = cursor.fetchall()
for row in rows:
    print(row)
conn.close()
