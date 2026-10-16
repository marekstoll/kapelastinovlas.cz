"""Prepare Pages output and self-host the exact existing Google Fonts families.
A download/validation failure stops deployment, leaving the current live site intact.
Uses only the Python standard library on GitHub's runner.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import hashlib,re,shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '_site'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

def fetch(url):
    with urlopen(Request(url, headers={'User-Agent':UA}), timeout=45) as response:
        if response.status != 200:
            raise RuntimeError(f'Download failed: {url}')
        return response.read()

def main():
    if OUT.exists(): shutil.rmtree(OUT)
    OUT.mkdir()
    for name in ['index.html','ochrana-soukromi-STINOVLAS.html','robots.txt','sitemap.xml','google15adf1638b82dc0c.html']:
        shutil.copy2(ROOT/name, OUT/name)
    for name in ['images','assets']:
        shutil.copytree(ROOT/name, OUT/name)
    for key in ROOT.glob('*.txt'):
        if re.fullmatch(r'[a-f0-9]{32}\.txt',key.name): shutil.copy2(key,OUT/key.name)
    # Preserve an existing custom-domain file if one was added since this package.
    if (ROOT/'CNAME').exists(): shutil.copy2(ROOT/'CNAME',OUT/'CNAME')
    (OUT/'.nojekyll').touch()
    fonts = OUT/'fonts'; fonts.mkdir()
    html = (OUT/'index.html').read_text()
    pattern = r'<link href="(https://fonts\.googleapis\.com/[^\"]+)" rel="stylesheet">'
    match = re.search(pattern,html)
    if not match: raise RuntimeError('Expected font stylesheet is missing; inspect before deploying.')
    css = fetch(match[1]).decode('utf-8')
    blocks = re.findall(r'/\*\s*(latin(?:-ext)?)\s*\*/\s*(@font-face\s*\{[^}]+\})',css)
    if not blocks: raise RuntimeError('No Latin font subsets returned.')
    local_css=[]; downloaded={}; families=set()
    for subset, block in blocks:
        family=re.search(r"font-family:\s*['\"]([^'\"]+)['\"]",block)
        if not family: raise RuntimeError('Font family missing')
        families.add(family[1])
        for url in re.findall(r'url\((https://[^)]+)\)',block):
            if urlparse(url).hostname != 'fonts.gstatic.com': raise RuntimeError('Unexpected font host')
            if url not in downloaded:
                content=fetch(url)
                if content[:4] != b'wOF2': raise RuntimeError('Expected WOFF2 font')
                filename=hashlib.sha256(content).hexdigest()[:20]+'.woff2'
                (fonts/filename).write_bytes(content);downloaded[url]=filename
            block=block.replace(url,downloaded[url])
        local_css.append(f'/* {subset} */\n{block}')
    if families != {'Anton','Oswald','Roboto Condensed'}: raise RuntimeError('Font families incomplete')
    for family in ['anton','oswald','robotocondensed']:
        license_url=f'https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/OFL.txt'
        license_text=fetch(license_url).decode('utf-8')
        if 'SIL OPEN FONT LICENSE' not in license_text: raise RuntimeError('Font license missing')
        (fonts/(family+'-OFL.txt')).write_text(license_text)
    (fonts/'fonts.css').write_text('\n\n'.join(local_css))
    (OUT/'index.html').write_text(re.sub(pattern,'<link rel="stylesheet" href="fonts/fonts.css">',html))
    if 'fonts.googleapis.com' in (OUT/'index.html').read_text(): raise RuntimeError('External font link remains')
    print(f'Pages ready: {len(downloaded)} local WOFF2 files; Latin + Latin Extended, including Czech; three OFL licenses.')

if __name__ == '__main__': main()
