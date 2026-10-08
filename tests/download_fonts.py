import urllib.request
import os

font_dir = '/home/dioriza/projects/ihsg-stockholder/assets/fonts'
os.makedirs(font_dir, exist_ok=True)

files = {
    'manrope-v20-latin.woff2': 'https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2',
    'manrope-v20-latin-ext.woff2': 'https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggmxSuXd.woff2',
}

for fname, url in files.items():
    dest = os.path.join(font_dir, fname)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
    with open(dest, 'wb') as f:
        f.write(data)
    print(f"Downloaded {fname}: {len(data)} bytes")
