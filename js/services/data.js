import { supabase } from './supabase.js';

export async function searchDirectory(term='') {
  if(!supabase) return { communities:[], profiles:[], games:[] };
  const q=term.trim().replace(/[,%()]/g,' ').slice(0,80);
  const escaped=q.replace(/[%_]/g,'');
  const pattern=`%${escaped}%`;
  const [profiles,communities,games]=await Promise.all([
    supabase.from('profile_cards').select('id,username,display_name,avatar_url,bio').ilike('username',pattern).limit(12),
    supabase.from('communities').select('id,slug,name,description,visibility,member_count').eq('visibility','public').ilike('name',pattern).limit(12),
    supabase.from('games').select('id,slug,title,genre').ilike('title',pattern).limit(12)
  ]);
  for(const result of [profiles,communities,games])if(result.error)throw result.error;
  return {profiles:profiles.data||[],communities:communities.data||[],games:games.data||[]};
}

export async function loadGames() {
  if(!supabase) return {data:null,error:null};
  const result=await supabase.from('games').select('id,slug,title,genre,description,is_upcoming,catalog_note,supported_platforms,game_platforms(platforms(name,slug))').order('title').limit(400);
  return result;
}

export async function loadCurrentProfile(userId) {
  const {data,error}=await supabase.from('profiles').select('id,username,display_name,avatar_url,bio,social_links,created_at').eq('id',userId).maybeSingle();
  return {data,error};
}

export async function updateProfile(userId,patch) {
  return supabase.from('profiles').update(patch).eq('id',userId).select().single();
}

export async function setGameSelection(userId,gameId,patch) {
  return supabase.from('user_games').upsert({user_id:userId,game_id:gameId,...patch},{onConflict:'user_id,game_id'}).select().single();
}
