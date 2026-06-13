import sqlite3
import os

db_path = r'c:\Users\ADMIN\Desktop\Orbisave App\orbisave\backend\db_ke.sqlite3'
if not os.path.exists(db_path):
    print(f"File {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(groups_group)")
rows = cursor.fetchall()
for row in rows:
    print(row)
conn.close()
