import urllib.request
from html.parser import HTMLParser
import re

class ImgParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            d = dict(attrs)
            if 'src' in d and ('thumb' in d['src'] or 'upload' in d['src']):
                # get original or large size by removing /thumb/ and the last size part
                src = d['src']
                if not src.startswith('http'):
                    src = 'https:' + src
                # Convert thumb URL to full size
                full = re.sub(r'/thumb(/.*)/[^/]+$', r'\1', src)
                if full.lower().endswith('.jpg') or full.lower().endswith('.png'):
                    self.images.append(full)

def get_images(url):
    html = urllib.request.urlopen(url).read().decode('utf-8')
    p = ImgParser()
    p.feed(html)
    return p.images

print("Farmer:")
for img in get_images("https://en.wikipedia.org/wiki/Agriculture_in_Africa")[:3]:
    print(img)

print("\nCorporate:")
for img in get_images("https://en.wikipedia.org/wiki/Economy_of_Africa")[:3]:
    print(img)

print("\nCommunity:")
for img in get_images("https://en.wikipedia.org/wiki/Economy_of_Kenya")[:3]:
    print(img)
