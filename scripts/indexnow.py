"""Run only after a successful Pages deployment. Never reports indexing as guaranteed."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
import json,time,xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
HOST='kapelastinovlas.cz'
KEY=(ROOT/'scripts/indexnow-key.txt').read_text().strip()
KEY_URL=f'https://{HOST}/{KEY}.txt'

def get(url):
    with urlopen(Request(url,headers={'User-Agent':'STINOVLAS-IndexNow/1.0'}),timeout=45) as r:
        if r.status != 200: raise RuntimeError(f'HTTP {r.status}: {url}')
        return r.read()

def main():
    for attempt in range(6):
        try:
            if get(KEY_URL).decode('utf-8-sig').strip() != KEY:
                raise RuntimeError('The live IndexNow key does not match. Nothing was submitted.')
            break
        except Exception:
            if attempt == 5: raise
            time.sleep(10)
    sitemap=get(f'https://{HOST}/sitemap.xml')
    urls=[e.text.strip() for e in ET.fromstring(sitemap).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    if not urls or len(urls)>10000: raise RuntimeError('Invalid sitemap URL count')
    if any(urlparse(u).scheme!='https' or urlparse(u).netloc!=HOST or urlparse(u).fragment for u in urls):
        raise RuntimeError('Sitemap contains an unexpected host, scheme or fragment')
    payload=json.dumps({'host':HOST,'key':KEY,'keyLocation':KEY_URL,'urlList':urls}).encode()
    req=Request('https://api.indexnow.org/indexnow',data=payload,headers={'Content-Type':'application/json; charset=utf-8'},method='POST')
    with urlopen(req,timeout=45) as r:
        status=r.status
        if status not in (200,202): raise RuntimeError(f'IndexNow HTTP {status}')
        result=f'IndexNow HTTP {status}; submitted {len(urls)} URLs. '+('Key validation pending.' if status==202 else 'Submission received.')+' Indexing is not guaranteed.'
        print(result)
        import os
        if os.environ.get('GITHUB_STEP_SUMMARY'):
            with open(os.environ['GITHUB_STEP_SUMMARY'],'a') as summary:summary.write(result+'\n')
if __name__=='__main__': main()
