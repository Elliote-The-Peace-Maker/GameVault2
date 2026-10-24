import { renderShell } from '../components/shell.js';
import { supabase, SUPABASE_CONFIGURED, backendNotice, requireUser, escapeHTML } from '../services/supabase.js';
import { icon } from '../components/icons.js';

export function mountPage({page,title,description,run,requiresAuth=false,backend=true}) {
  renderShell(page,title,description);
  const root=document.querySelector('#page-content');
  if(!root)return;
  if(backend&&!SUPABASE_CONFIGURED) root.innerHTML=backendNotice();
  Promise.resolve(run({root,supabase,configured:SUPABASE_CONFIGURED,requireUser,escapeHTML})).catch(error=>{
    console.error(error);
    root.insertAdjacentHTML('beforeend',`<div class="state error"><h3>Page could not finish loading</h3><p>${escapeHTML(error?.message||'Unexpected error')}</p><button class="btn" onclick="location.reload()">Try again</button></div>`);
  });
}

export function showBackendEmpty(root,title,copy,actions='') {
  root.insertAdjacentHTML('beforeend',`<section class="state info"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(copy)}</p>${actions}</section>`);
}

export async function fetchList({supabase,table,select='*',limit=40,order='created_at',ascending=false,filters=[]}) {
  let q=supabase.from(table).select(select).order(order,{ascending}).limit(limit);
  for(const f of filters) q=q[f.op](f.column,f.value);
  const {data,error}=await q;if(error)throw error;return data||[];
}

export function cardLink(title,href,description,iconName='◈',meta='') {
  return `<a class="data-row" href="${href}"><span class="pill">${icon(iconName, 'data-row-icon')}</span><span class="grow"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p></span>${meta?`<span class="muted tiny">${escapeHTML(meta)}</span>`:''}${icon('arrow-right','row-arrow')}</a>`;
}
