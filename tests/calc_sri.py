import urllib.request
import hashlib
import base64

def get_sri(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
    digest = hashlib.sha384(data).digest()
    sri = 'sha384-' + base64.b64encode(digest).decode('utf-8')
    return len(data), sri

try:
    alpine_len, alpine_sri = get_sri('https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js')
    print(f"Alpine: len={alpine_len}, sri={alpine_sri}")
    echarts_len, echarts_sri = get_sri('https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js')
    print(f"ECharts: len={echarts_len}, sri={echarts_sri}")
except Exception as e:
    print(f"Error: {e}")
