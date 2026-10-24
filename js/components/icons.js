const names = new Set([
  'home','explore','communities','games','library','creator','media','news','streams',
  'messages','notifications','challenges','history','account','settings','help','moderation',
  'maps','subscription','search','menu','plus','close','chevron-down','arrow-right','filter','grid','list','edit',
  'trash','upload','download','check','external-link','more','send','link','share','copy',
  'heart','comment','reply','flag','follow','invite','eye','lock','verified','status','alert',
  'discord','twitch','youtube','instagram','x'
]);
const aliases = {
  '⌂':'home','⌕':'search','◉':'communities','▣':'games','▤':'library','✦':'creator',
  '▧':'media','♜':'challenges','✉':'messages','♧':'notifications','◷':'history','◎':'account',
  '⚙':'settings','?':'help','⚑':'moderation','◈':'status','●':'status','○':'eye','✎':'edit',
  '♡':'heart','♥':'heart','☰':'menu','↗':'external-link','→':'arrow-right','←':'arrow-right'
};
export function icon(name, className = '') {
  const key = aliases[name] || name;
  const safeKey = names.has(key) ? key : 'status';
  const classes = ['vexra-icon', className].filter(Boolean).join(' ');
  return `<svg class="${classes}" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#icon-${safeKey}"></use></svg>`;
}
