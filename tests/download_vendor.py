import urllib.request
import os

def download(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
    with open(dest, 'wb') as f:
        f.write(data)
    print(f"Downloaded {len(data)} bytes to {dest}")

download('https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js', '/home/dioriza/projects/ihsg-stockholder/assets/vendor/alpine.min.js')
download('https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js', '/home/dioriza/projects/ihsg-stockholder/assets/vendor/echarts.min.js')
