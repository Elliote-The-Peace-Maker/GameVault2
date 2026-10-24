-- Curated GameVault GTA catalog only; this seed creates no accounts or activity.
insert into public.platforms (slug, name) values
  ('android', 'Android'),
  ('dreamcast', 'Dreamcast'),
  ('ds', 'Nintendo DS'),
  ('gba', 'Game Boy Advance'),
  ('gbc', 'Game Boy Color'),
  ('ios', 'iOS'),
  ('pc', 'Windows PC'),
  ('ps1', 'PlayStation'),
  ('ps2', 'PlayStation 2'),
  ('ps3', 'PlayStation 3'),
  ('ps4', 'PlayStation 4'),
  ('ps5', 'PlayStation 5'),
  ('psp', 'PlayStation Portable'),
  ('switch', 'Nintendo Switch'),
  ('xbox', 'Xbox Series X|S'),
  ('xbox360', 'Xbox 360'),
  ('xboxone', 'Xbox One') on conflict (slug) do update set name = excluded.name;

insert into public.games (slug, title, genre, description, supported_platforms, catalog_note, is_upcoming, franchise) values
  ('grand-theft-auto', 'Grand Theft Auto', 'Top-down action', 'Liberty City, Vice City and San Andreas · 1997. The original entry in the series. Explore the early top-down cities of Liberty City, Vice City, and San Andreas.', array['pc', 'ps1', 'gbc']::text[], 'Historical platform information varies by release.', false, 'grand-theft-auto'),
  ('grand-theft-auto-london-1969', 'Grand Theft Auto: London 1969', 'Expansion', 'London, 1969 · 1999. A London-set expansion for the original Grand Theft Auto, with missions across a stylized 1969 city.', array['pc', 'ps1']::text[], 'Historical platform information varies by release.', false, 'grand-theft-auto'),
  ('grand-theft-auto-london-1961', 'Grand Theft Auto: London 1961', 'Expansion', 'London, 1961 · 1999. A free PC expansion set in London several years before London 1969.', array['pc']::text[], 'PC expansion; historical availability may vary.', false, 'grand-theft-auto'),
  ('grand-theft-auto-2', 'Grand Theft Auto 2', 'Top-down action', 'Anywhere City · 1999. A standalone top-down entry set in the districts of Anywhere City.', array['pc', 'ps1', 'dreamcast', 'gbc']::text[], 'Historical platform information varies by release.', false, 'grand-theft-auto'),
  ('grand-theft-auto-iii', 'Grand Theft Auto III', 'Action adventure', 'Liberty City · 2001. The series moves into a fully 3D Liberty City, with a story-led open-world campaign.', array['pc', 'ps2', 'xbox', 'ios', 'android']::text[], 'Platform availability differs by edition.', false, 'grand-theft-auto'),
  ('grand-theft-auto-vice-city', 'Grand Theft Auto: Vice City', 'Action adventure', 'Vice City, 1986 · 2002. A neon-soaked story set in Vice City in 1986, following the rise of Tommy Vercetti.', array['pc', 'ps2', 'xbox', 'ios', 'android']::text[], 'Platform availability differs by edition.', false, 'grand-theft-auto'),
  ('grand-theft-auto-san-andreas', 'Grand Theft Auto: San Andreas', 'Action adventure', 'State of San Andreas, 1992 · 2004. A sprawling 3D-era journey through Los Santos, San Fierro, Las Venturas, and the surrounding state.', array['pc', 'ps2', 'xbox', 'ios', 'android']::text[], 'Platform availability differs by edition.', false, 'grand-theft-auto'),
  ('grand-theft-auto-advance', 'Grand Theft Auto Advance', 'Action', 'Liberty City · 2004. A handheld top-down adventure set in Liberty City, made for Game Boy Advance.', array['gba']::text[], 'Original release platform.', false, 'grand-theft-auto'),
  ('grand-theft-auto-liberty-city-stories', 'Grand Theft Auto: Liberty City Stories', 'Action adventure', 'Liberty City, 1998 · 2005. A portable 3D-era story set in Liberty City before the events of Grand Theft Auto III.', array['psp', 'ps2', 'ios', 'android']::text[], 'Platform availability differs by edition.', false, 'grand-theft-auto'),
  ('grand-theft-auto-vice-city-stories', 'Grand Theft Auto: Vice City Stories', 'Action adventure', 'Vice City, 1984 · 2006. A prequel story set in Vice City in 1984, first released for PlayStation Portable.', array['psp', 'ps2']::text[], 'Platform availability differs by edition.', false, 'grand-theft-auto'),
  ('grand-theft-auto-chinatown-wars', 'Grand Theft Auto: Chinatown Wars', 'Action adventure', 'Liberty City · 2009. A handheld-focused Liberty City story with a distinct top-down presentation.', array['ds', 'psp', 'ios', 'android']::text[], 'Platform availability differs by edition.', false, 'grand-theft-auto'),
  ('grand-theft-auto-iv', 'Grand Theft Auto IV', 'Action adventure', 'Liberty City, 2008 · 2008. Niko Bellic arrives in Liberty City in a grounded, character-driven open-world story.', array['pc', 'ps3', 'xbox360']::text[], 'Original release platforms; later availability varies.', false, 'grand-theft-auto'),
  ('grand-theft-auto-iv-the-lost-and-damned', 'Grand Theft Auto IV: The Lost and Damned', 'Story expansion', 'Liberty City · 2009. An episodic Grand Theft Auto IV story centered on Johnny Klebitz and The Lost motorcycle club.', array['pc', 'ps3', 'xbox360']::text[], 'Originally released as downloadable content and later included in Episodes from Liberty City.', false, 'grand-theft-auto'),
  ('grand-theft-auto-the-ballad-of-gay-tony', 'Grand Theft Auto: The Ballad of Gay Tony', 'Story expansion', 'Liberty City · 2009. An episodic Grand Theft Auto IV story following Luis Lopez through Liberty City''s nightlife.', array['pc', 'ps3', 'xbox360']::text[], 'Originally released as downloadable content and later included in Episodes from Liberty City.', false, 'grand-theft-auto'),
  ('grand-theft-auto-episodes-from-liberty-city', 'Grand Theft Auto: Episodes from Liberty City', 'Standalone expansion collection', 'Liberty City · 2009. A standalone release collecting The Lost and Damned and The Ballad of Gay Tony.', array['pc', 'ps3', 'xbox360']::text[], 'Includes two story expansions; platform availability varies by edition.', false, 'grand-theft-auto'),
  ('grand-theft-auto-v', 'Grand Theft Auto V', 'Action adventure', 'Los Santos and Blaine County · 2013. Three protagonists share an open-world story across Los Santos and Blaine County in the state of San Andreas.', array['pc', 'ps3', 'ps4', 'ps5', 'xbox360', 'xboxone', 'xbox']::text[], 'Platform availability differs by edition and generation.', false, 'grand-theft-auto'),
  ('grand-theft-auto-online', 'Grand Theft Auto Online', 'Online world', 'Los Santos and Blaine County · 2013. The evolving online component associated with Grand Theft Auto V. GameVault does not connect to Rockstar accounts or gameplay services.', array['pc', 'ps4', 'ps5', 'xboxone', 'xbox']::text[], 'Platform availability and online features vary by edition; no Rockstar integration is provided.', false, 'grand-theft-auto'),
  ('grand-theft-auto-the-trilogy-definitive-edition', 'Grand Theft Auto: The Trilogy – The Definitive Edition', 'Remastered collection', 'Liberty City, Vice City and San Andreas · 2021. A remastered collection of Grand Theft Auto III, Vice City, and San Andreas. Individual game pages remain available in this directory.', array['pc', 'ps4', 'ps5', 'xboxone', 'xbox', 'switch', 'ios', 'android']::text[], 'Collection entry; included editions and availability vary by platform.', false, 'grand-theft-auto'),
  ('grand-theft-auto-vi', 'Grand Theft Auto VI', 'Upcoming action adventure', 'State of Leonida and Vice City · 2026. The next Grand Theft Auto entry returns to modern-day Vice City and the state of Leonida. Release information can change; check Rockstar''s official site for the latest.', array['ps5', 'xbox']::text[], 'Officially announced for PlayStation 5 and Xbox Series X|S; listed as upcoming as of October 2026.', true, 'grand-theft-auto') on conflict (slug) do update set title=excluded.title, genre=excluded.genre, description=excluded.description, supported_platforms=excluded.supported_platforms, catalog_note=excluded.catalog_note, is_upcoming=excluded.is_upcoming, franchise=excluded.franchise;

insert into public.game_platforms (game_id, platform_id)
select g.id, p.id from public.games g
cross join unnest(g.supported_platforms) as platform_slugs(slug)
join public.platforms p on p.slug = platform_slugs.slug
where g.franchise = 'grand-theft-auto'
on conflict do nothing;
