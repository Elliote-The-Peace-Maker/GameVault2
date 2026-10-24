"""Generate direct-load HTML wrappers for every GameVault destination."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
MAIN={
 'home':('Home / Feed','Posts from your communities and connections, with replies and reactions.'),
 'explore':('Explore','Find real players, creators, communities, and games.'),
 'communities':('Communities','Browse public communities, member counts, and game categories.'),
 'community':('Community details','Read descriptions, rules, members, and posts; join or leave.'),
 'profile':('Player profile','Public player details, selected games, and visible achievements.'),
 'creators':('Creator hub','Published creator profiles and their featured work.'),
 'media':('Clips & media','Community media, upload review, and the supplied image library.'),
 'streams':('Streams','Member-submitted public stream links.'),
 'messages':('Messages','Private conversations and messages.'),
 'notifications':('Notifications','Your connection, reply, mention, invitation, and moderation alerts.'),
 'challenges':('Challenges & leaderboards','Challenges and player-entered results.'),
 'history':('Achievements & gaming history','Your milestones and player-entered gaming history.'),
 'settings':('Settings','Profile, privacy, account, and notification preferences.'),
 'help':('Guidelines & help','Community guidelines, reporting, and support information.'),
 'moderation':('Moderation dashboard','Moderator-only report queue and moderation actions.'),
 'login':('Sign in','Sign in with Supabase Auth.'),
 'signup':('Create account','Register with email verification through Supabase Auth.'),
 'forgot-password':('Forgot password','Request a secure password reset email.'),
 'reset-password':('Reset password','Choose a new password from a recovery link.'),
 'account':('Account overview','Account status and private account controls.'),
 'account-profile':('Account profile','Edit username, avatar, bio, games, and platforms.'),
 'account-privacy':('Account privacy','Profile visibility and field-level choices.'),
 'account-security':('Account security','Verified email and password controls.'),
 'account-notifications':('Notification preferences','Choose which GameVault notifications you receive.'),
 'account-games':('Game library','Manage your games, favorites, current play status, and platforms.'),
 'account-delete':('Delete account','Confirm permanent account deletion.'),
}
FEATURES={
 'home':'home','explore':'explore','communities':'communities','community':'community','profile':'profile',
 'creators':'creators','media':'media','streams':'streams','messages':'messages','notifications':'notifications',
 'challenges':'challenges','history':'history','settings':'settings','help':'guidelines','moderation':'moderation',
 'login':'login','signup':'signup','forgot-password':'forgot','reset-password':'reset','account':'account',
 'account-profile':'account-profile','account-privacy':'account-privacy','account-security':'account-security',
 'account-notifications':'account-notifications','account-games':'account-games','account-delete':'account-delete'
}
def html(route,title,desc):
    title=title.replace('&','&amp;')
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#090910"><title>{title} · GameVault</title><meta name="description" content="{desc}"><link rel="icon" href="/assets/game-vault-logo.jpeg"><link rel="stylesheet" href="/css/app.css"></head><body data-route="{route}"><div data-app-shell></div><script type="module" src="/js/pages/route-{route}.js"></script></body></html>'''
def write(path,route,title,desc):
    f=ROOT/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(html(route,title,desc),encoding='utf-8')
def main():
    for route,(title,desc) in MAIN.items():
        write(Path('pages')/(route+'.html'),route,title,desc)
        # Friendly directory URLs are available as direct bookmarks too.
        if route not in {'community','profile'}:
            write(Path(route)/'index.html',route,title,desc)
    for folder,route in [('pages/account/profile.html','account-profile'),('pages/account/privacy.html','account-privacy'),('pages/account/security.html','account-security'),('pages/account/notifications.html','account-notifications'),('pages/account/games.html','account-games'),('pages/account/delete.html','account-delete')]:
        title,desc=MAIN[route];write(Path(folder),route,title,desc)
    for folder,route in [('account/profile/index.html','account-profile'),('account/privacy/index.html','account-privacy'),('account/security/index.html','account-security'),('account/notifications/index.html','account-notifications'),('account/games/index.html','account-games'),('account/delete/index.html','account-delete')]:
        title,desc=MAIN[route];write(Path(folder),route,title,desc)
    for name,route in [('index','home'),('games','game-directory')]:
        if name=='index':
            title,desc=MAIN['home'];write(Path('index.html'),'home',title,desc)
        else:
            write(Path('games/index.html'),'game-directory','Game directory','Search the GameVault GTA game catalog by title, genre, and platform.')
    write(Path('games/library/index.html'),'account-games',*MAIN['account-games'])
    # Route entry modules keep a one-file entry for each destination while reusing feature code.
    for route,feature in FEATURES.items():
        (ROOT/'js/pages'/f'route-{route}.js').write_text(f"import {{ initFeature }} from './features.js';\ninitFeature({json.dumps(feature)});\n",encoding='utf-8')
    (ROOT/'js/pages/route-game-directory.js').write_text("import './game-directory.js';\n",encoding='utf-8')
    print(f'Generated {len(MAIN)} page routes and their direct-load HTML aliases.')
if __name__=='__main__':main()
