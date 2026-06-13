import requests

url = "http://localhost:8000/api/v1/auth/profile/update/"
# I don't have a token, but I can check the status code for an unauth request
# or check if the URL resolves.

try:
    response = requests.patch(url, data={})
    print(f"Status: {response.status_code}")
    print(f"Content: {response.text}")
except Exception as e:
    print(f"Error: {e}")
