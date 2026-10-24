"""Create an attributed gallery index for all user-supplied image files."""
import json
import re
from pathlib import Path

root=Path(__file__).resolve().parents[1]
legacy=(root/'assets/supplied-images.js').read_text(encoding='utf-8')
payload=legacy.split('=',1)[1].strip().rstrip(';')
old=json.loads(payload)
items=[]
for item in old:
    path=item['path'].replace('\\','/')
    lower=path.lower()
    if lower.startswith(('authors/','comment/')):
        category='Portraits'; purpose='Optional avatar preset; this is an image asset, not a GameVault account.'
    elif re.fullmatch(r'elements/f[1-8]\.jpg',lower):
        category='Country flag graphics'; purpose='Use as country or locale decoration only; not a user avatar or game cover.'
    elif re.fullmatch(r'elements/g[1-8]\.jpg',lower) or lower in {'elements/a.jpg','elements/a2.jpg','elements/d.jpg'}:
        category='Lifestyle photography'; purpose='Editorial or page decoration only; not a GameVault member, post, or game cover.'
    elif lower in {'logo.png','logo_bg.png','war_logo_1.png','war_logo_2.png'}:
        category='Other supplied brand marks'; purpose='Preserved as a supplied asset; not the GameVault logo or an endorsement.'
    elif lower.startswith('icon/') or any(t in lower.rsplit('/',1)[-1] for t in ['arrow','heart','star','check','radio','phone','mail','location','play','next','left','right','add']):
        category='Interface icons'; purpose='Use for interface controls or decorative UI where the symbol matches.'
    elif lower.startswith('animate_icon/') or any(t in lower for t in ['shape','bg','breadcrumb','favicon','portfolio','pricing','promo','about_']):
        category='Decorative interface artwork'; purpose='Use as page decoration, background, or visual flourish.'
    elif lower.startswith(('gallery/','post/','b/','k/','m/','n/')):
        category='Gaming and community artwork'; purpose='Gallery artwork or mood image. Not an official game cover and not evidence of an integration.'
    elif re.search(r'(banner|game|war|stream|slider|review|featured|recent)',lower):
        category='Gaming and community artwork'; purpose='Use as a gaming/community mood image; not an official game cover.'
    elif lower in {'1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','attachment.jpg','author.jpg','add.jpg'}:
        category='Gaming and community artwork'; purpose='Supplied visual for the media gallery and game page atmosphere; not a real account or official cover.'
    else:
        category='Decorative artwork'; purpose='Preserved in the searchable gallery for page decoration or future matching use.'
    items.append({'name':item['name'],'path':path,'src':'/assets/supplied/'+path,'type':item['type'],'category':category,'purpose':purpose})
missing=[x['path'] for x in items if not (root/'assets/supplied'/x['path']).is_file()]
if missing: raise SystemExit('Missing copied assets: '+', '.join(missing))
(root/'data/supplied-images.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Indexed {len(items)} supplied image files with category and intended use.')
