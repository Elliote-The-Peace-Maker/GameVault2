"""Static verification for VEXRA routes, local media, and seeded game pages."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]

class Links(HTMLParser):
    def __init__(self): super().__init__(); self.hrefs=[]; self.scripts=[]; self.title=False; self.route=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ('a','link') and a.get('href'): self.hrefs.append(a['href'])
        if tag=='script' and a.get('src'): self.scripts.append(a['src'])
        if tag=='body' and a.get('data-route'): self.route=True
    def handle_data(self,data):
        if data.strip() and self.lasttag=='title': self.title=True

def local_path(url):
    clean=url.split('#',1)[0].split('?',1)[0]
    if not clean or clean.startswith(('https://','http://','mailto:','tel:','data:')): return None
    if clean.startswith('/'): clean=clean.lstrip('/')
    path=ROOT/clean
    if path.is_dir(): path=path/'index.html'
    if not path.suffix and not path.exists():
        folder=path/'index.html'
        if folder.exists(): path=folder
    return path

html_files=[p for p in ROOT.rglob('*.html') if not any(x in {'node_modules','dist'} for x in p.parts)]
for page in html_files:
    parser=Links(); parser.feed(page.read_text(encoding='utf-8'))
    if page.name!='legacy-preview.html' and not parser.route: errors.append(f'{page.relative_to(ROOT)} has no route marker')
    if page.name!='legacy-preview.html' and not parser.scripts: errors.append(f'{page.relative_to(ROOT)} has no page module')
    for ref in parser.hrefs+parser.scripts:
        target=local_path(ref)
        if target and not target.exists(): errors.append(f'{page.relative_to(ROOT)} links to missing {ref}')

catalog=json.loads((ROOT/'data/game-catalog.json').read_text(encoding='utf-8'))
if len(catalog)<150: errors.append(f'only {len(catalog)} game entries')
slugs=set()
for game in catalog:
    slug=game['slug']
    if slug in slugs: errors.append(f'duplicate game slug: {slug}')
    slugs.add(slug)
    if not (ROOT/'games'/slug/'index.html').is_file(): errors.append(f'missing direct game page: {slug}')
    if not game.get('platforms'): errors.append(f'game has no platform tags: {game["title"]}')
seed=(ROOT/'supabase/seed.sql').read_text(encoding='utf-8')
missing_seed=[game['slug'] for game in catalog if f"'{game['slug']}'" not in seed]
if missing_seed: errors.append(f'{len(missing_seed)} game catalog rows missing from seed.sql')

images=json.loads((ROOT/'data/supplied-images.json').read_text(encoding='utf-8'))
if len(images)!=154: errors.append(f'expected 154 supplied image records, found {len(images)}')
for item in images:
    if not (ROOT/'assets/supplied'/item['path']).is_file(): errors.append(f'missing supplied image {item["path"]}')
    if not item.get('category') or not item.get('purpose'): errors.append(f'image lacks use metadata: {item["path"]}')

sql='\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'supabase/migrations').glob('*.sql'))
for token in ['enable row level security','profile_cards','start_direct_conversation','respond_to_community_invitation','vexra-avatars','vexra-media']:
    if token.lower() not in sql.lower(): errors.append(f'missing database/RLS feature token: {token}')
if 'react' in (ROOT/'package.json').read_text(encoding='utf-8').lower(): errors.append('React dependency found; this project must stay plain JS')
css=(ROOT/'css/app.css').read_text(encoding='utf-8')
if '@media(max-width:760px)' not in css or 'overflow-y:auto' not in css: errors.append('mobile and independent scrolling rules missing')

print(f'HTML documents: {len(html_files)}')
print(f'Game catalog entries: {len(catalog)}')
print(f'Supplied images: {len(images)}')
print(f'Direct game pages: {sum(1 for slug in slugs if (ROOT/"games"/slug/"index.html").exists())}')
if errors:
    print('Verification issues:')
    for issue in errors: print(' - '+issue)
    sys.exit(1)
print('Static routes, local references, images, catalog seed entries, and mobile/scroll markers all passed.')
