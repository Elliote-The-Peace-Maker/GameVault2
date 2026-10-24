import { renderShell } from '../components/shell.js';
import { supabase, SUPABASE_CONFIGURED, escapeHTML, getOptionalUser } from '../services/supabase.js';

renderShell('subscriptions', 'Membership & Add-ons', 'Review GameVault plan concepts, map tools, and account membership status.');
const root = document.querySelector('#page-content');
const migration = 'supabase/migrations/20261024132119_202610230002_memberships_and_live_maps.sql';

// These are clearly marked product concepts for review, never active catalog data.
const draftPlans = [
  {
    id: 'open-road', name: 'Open Road', eyebrow: 'COMMUNITY ACCESS', price: 'Free', className: '',
    description: 'A welcoming base for every GTA player.',
    features: ['Browse the GTA game catalog and world guides', 'Join public communities and follow creators', 'View approved public pins on community maps', 'Submit map notes for moderator review'],
    action: '/pages/maps.html#live-maps', actionLabel: 'Explore map preview'
  },
  {
    id: 'crew-pass', name: 'Crew Pass', eyebrow: 'SUBSCRIPTION CONCEPT', price: 'Price to be set', className: 'is-featured',
    description: 'A shared planning space for regular crews.',
    features: ['Everything in Open Road', 'Private crew map layers and shared routes', 'More saved places and map collections', 'Crew scheduling and shared notes'],
    action: '/pages/communities.html', actionLabel: 'Explore communities'
  },
  {
    id: 'vault-plus', name: 'Vault+', eyebrow: 'SUPPORTER CONCEPT', price: 'Price to be set', className: '',
    description: 'Extra tools for organizers and creators.',
    features: ['Everything in Crew Pass', 'Advanced map filters and exportable personal lists', 'Expanded creator and crew profile options', 'Early access to new GameVault tools'],
    action: '/pages/creators.html', actionLabel: 'Explore creator hub'
  }
];

const draftAddons = [
  {
    name: 'GTA Online Map Pack', tag: 'COMMUNITY UPDATED', icon: '⌖',
    description: 'A shared Los Santos and San Andreas layer for community-reported activities, collectibles, businesses, landmarks, and crew routes.',
    note: 'Community pins can update live after Supabase is connected and approved. This does not track players or read Rockstar account data.',
    href: '/pages/maps.html#live-maps', action: 'Open the map preview'
  },
  {
    name: 'Crew Atlas', tag: 'CREW ADD-ON CONCEPT', icon: '✦',
    description: 'Private marker layers, route notes, and saved meeting points that a crew can manage together.',
    note: 'Requires a configured membership provider and private crew-map permissions.',
    href: '/pages/communities.html', action: 'Explore crews'
  },
  {
    name: 'Leonida Field Guide', tag: 'GTA VI MAP PREVIEW', icon: '◈',
    description: 'A planned community map layer for GTA VI locations and discoveries, with source notes and moderation before a pin becomes public.',
    note: 'This build has no GTA VI live feed or verified location data. GameVault will not invent pins or claim Rockstar telemetry.',
    href: '/pages/maps.html#live-maps', action: 'View the Leonida preview'
  }
];

function conceptBanner() {
  return '<div class="gv-membership-status" role="status"><span class="gv-status-light" aria-hidden="true"></span><div><strong>Planning preview · not for sale</strong><p>These membership tiers and add-ons are proposed options. Prices, checkout, cancellations, and benefits are not active until they are published through GameVault’s backend.</p></div><a href="/pages/help.html">Backend setup</a></div>';
}

function accessModelSection() {
  return '<section class="gv-access-model surface surface-pad"><div class="home-section-heading"><div><p class="eyebrow">CLEAR ACCESS RULES</p><h2>What needs an account?</h2></div></div><div class="gv-access-grid">' +
    '<article><span class="gv-access-label">PUBLIC</span><h3>Browse freely</h3><p>Explore the GTA catalog, world guides, public crews, approved map pins, and theme previews.</p><a href="/games/index.html">Browse games ↗</a></article>' +
    '<article><span class="gv-access-label">FREE ACCOUNT</span><h3>Join the community</h3><p>Sign in to create or join crews, post and reply, message players, build your library, and submit media or map notes.</p><a href="/pages/signup.html">Create your account ↗</a></article>' +
    '<article><span class="gv-access-label is-planned">PAID ADD-ONS · PLANNED</span><h3>Unlock crew tools later</h3><p>Private crew maps and advanced planning are proposed membership benefits. Checkout and server-verified paid access are not active yet.</p><a href="#plans">Review plan concepts ↗</a></article>' +
    '</div><p class="gv-access-footnote">No current GameVault feature is being presented as paid or subscription-unlocked. When billing is ready, premium access will be enforced by Supabase policies as well as the interface.</p></section>';
}

function formatPrice(plan) {
  if (plan.price_cents == null) return 'Price not set';
  const currency = plan.currency || 'USD';
  try {
    const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(plan.price_cents / 100);
    const interval = plan.billing_interval === 'month' ? '/ month' : plan.billing_interval === 'year' ? '/ year' : plan.billing_interval === 'one_time' ? ' once' : '';
    return formatted + interval;
  } catch { return 'Price not set'; }
}

function featureList(features) {
  let values = features;
  if (typeof values === 'string') {
    try { values = JSON.parse(values); } catch { values = []; }
  }
  if (!Array.isArray(values)) return '<li>Details are being prepared.</li>';
  return values.map(function (feature) { return '<li><span aria-hidden="true">✓</span>' + escapeHTML(feature) + '</li>'; }).join('') || '<li>Details are being prepared.</li>';
}

function draftPlanCard(plan) {
  return '<article class="gv-plan-card ' + plan.className + '"><div class="gv-plan-head"><p class="eyebrow">' + escapeHTML(plan.eyebrow) + '</p><span class="gv-plan-status">DRAFT</span></div>' +
    '<h3>' + escapeHTML(plan.name) + '</h3><p class="gv-plan-description">' + escapeHTML(plan.description) + '</p><p class="gv-plan-price">' + escapeHTML(plan.price) + '</p>' +
    '<ul class="gv-plan-features">' + featureList(plan.features) + '</ul><a class="btn gv-plan-action" href="' + escapeHTML(plan.action) + '">' + escapeHTML(plan.actionLabel) + ' <span aria-hidden="true">↗</span></a><button class="btn gv-plan-checkout" type="button" disabled title="Checkout is not connected">Checkout not connected</button></article>';
}

function livePlanCard(plan) {
  return '<article class="gv-plan-card ' + (plan.is_featured ? 'is-featured' : '') + '"><div class="gv-plan-head"><p class="eyebrow">GAMEVAULT MEMBERSHIP</p><span class="gv-plan-status">AVAILABLE</span></div>' +
    '<h3>' + escapeHTML(plan.name) + '</h3><p class="gv-plan-description">' + escapeHTML(plan.description || '') + '</p><p class="gv-plan-price">' + escapeHTML(formatPrice(plan)) + '</p>' +
    '<ul class="gv-plan-features">' + featureList(plan.features) + '</ul><button class="btn gv-plan-checkout" type="button" disabled title="A payment provider is not connected">Checkout setup pending</button></article>';
}

function draftAddonCard(addon) {
  return '<article class="gv-addon-card"><div class="gv-addon-top"><span class="gv-addon-icon" aria-hidden="true">' + addon.icon + '</span><span class="gv-plan-status">' + escapeHTML(addon.tag) + '</span></div>' +
    '<h3>' + escapeHTML(addon.name) + '</h3><p>' + escapeHTML(addon.description) + '</p><p class="gv-addon-note">' + escapeHTML(addon.note) + '</p><a class="gv-addon-link" href="' + escapeHTML(addon.href) + '">' + escapeHTML(addon.action) + ' ↗</a></article>';
}

function publishedAddonCard(addon) {
  return '<article class="gv-addon-card"><div class="gv-addon-top"><span class="gv-addon-icon" aria-hidden="true">＋</span><span class="gv-plan-status">AVAILABLE</span></div><h3>' + escapeHTML(addon.name) + '</h3><p>' + escapeHTML(addon.description || '') + '</p><p class="gv-addon-note">' + escapeHTML(formatPrice(addon)) + '</p><button class="btn gv-plan-checkout" type="button" disabled>Checkout setup pending</button></article>';
}

function draftComparison() {
  return '<div class="gv-plan-table-wrap"><table class="gv-plan-table"><caption>Draft feature comparison · subject to change</caption><thead><tr><th scope="col">Feature</th><th scope="col">Open Road</th><th scope="col">Crew Pass</th><th scope="col">Vault+</th></tr></thead><tbody>' +
    '<tr><th scope="row">Public GTA communities and world guides</th><td>Included</td><td>Included</td><td>Included</td></tr>' +
    '<tr><th scope="row">Approved community map pins</th><td>View and submit</td><td>View and submit</td><td>View and submit</td></tr>' +
    '<tr><th scope="row">Private crew layers and shared routes</th><td>—</td><td>Planned</td><td>Planned</td></tr>' +
    '<tr><th scope="row">Saved map collections and advanced filters</th><td>Basic</td><td>Expanded</td><td>Expanded</td></tr>' +
    '<tr><th scope="row">Creator and profile extras</th><td>Core</td><td>Core</td><td>Expanded</td></tr>' +
    '</tbody></table></div>';
}

function paymentOptionsSection() {
  const options = [
    ['Card', 'Visa and Mastercard through a secure hosted checkout provider.', 'Card processor not connected'],
    ['PayPal', 'PayPal checkout can be added as a separate payment route.', 'PayPal not connected'],
    ['Apple Pay & Google Pay', 'Digital wallets depend on the selected card processor and device.', 'Wallets not connected'],
    ['Crypto', 'Requires a compliant third-party checkout and server-side payment confirmation.', 'Provider not selected'],
    ['Local payment methods', 'Available methods depend on the billing provider and supported country.', 'Provider not selected']
  ];
  return '<section class="gv-membership-section gv-payment-section" id="payment-options"><div class="home-section-heading"><div><p class="eyebrow">PAYMENT OPTIONS</p><h2>Choose how you want to pay</h2></div><span class="gv-section-note">Planning · no checkout active</span></div><p class="gv-payment-intro">These are the payment routes GameVault can support after a provider is selected and securely connected. No card, wallet, or bank details are collected on this page.</p><div class="gv-payment-grid">' +
    options.map(function (item) { return '<article class="gv-payment-card"><span class="gv-payment-mark" aria-hidden="true">' + escapeHTML(item[0].slice(0, 1)) + '</span><div><h3>' + escapeHTML(item[0]) + '</h3><p>' + escapeHTML(item[1]) + '</p><span class="gv-payment-state">' + escapeHTML(item[2]) + '</span></div></article>'; }).join('') +
    '</div><p class="gv-payment-footnote">Before any paid plan goes live, checkout will use a provider-hosted payment page and server-verified webhooks. GameVault will store membership status, not raw payment credentials.</p></section>';
}
function renderPreview() {
  root.innerHTML = '<section class="gv-subscription-hero"><div class="gv-subscription-hero-copy"><p class="eyebrow">GAMEVAULT MEMBERSHIP · MAP TOOLS</p><h2>More ways to run the city together.</h2><p>Start with the community, then add crew planning and richer map tools if they prove useful. No pay-to-win perks, no claimed Rockstar benefits, and no prices invented before billing is ready.</p><div class="gv-subscription-actions"><a class="btn btn-primary" href="#plans">Compare plan concepts</a><a class="btn" href="#addons">See map add-ons</a></div></div><div class="gv-subscription-signal"><span class="gv-signal-ring"></span><strong>03</strong><small>PLAN CONCEPTS</small><i>Pricing not set</i></div></section>' +
    conceptBanner() + accessModelSection() +
    '<section class="gv-membership-section" id="plans"><div class="home-section-heading"><div><p class="eyebrow">CHOOSE YOUR ACCESS</p><h2>Membership options</h2></div><span class="gv-section-note">Proposed · not purchasable</span></div><div class="gv-plan-grid">' + draftPlans.map(draftPlanCard).join('') + '</div></section>' +
    '<section class="gv-membership-section" id="addons"><div class="home-section-heading"><div><p class="eyebrow">EXPAND YOUR MAP ROOM</p><h2>Map add-ons</h2></div><a href="/pages/maps.html#live-maps">Open map previews ↗</a></div><div class="gv-addon-grid">' + draftAddons.map(draftAddonCard).join('') + '</div></section>' +
    '<section class="gv-membership-section" id="comparison"><div class="home-section-heading"><div><p class="eyebrow">CLEAR ACCESS, NO SURPRISES</p><h2>Compare the concepts</h2></div></div>' + draftComparison() + '<p class="gv-plan-footnote">Core community access stays free. These are product ideas for review, not a promise of a paid feature or Rockstar service.</p></section>' +
    paymentOptionsSection() + '<section class="gv-subscription-map-note"><div><p class="eyebrow">LIVE MAPS · COMMUNITY LAYERS</p><h2>Useful map updates, with their source shown.</h2><p>GameVault’s live-map plan is for member-submitted pins and notes that moderators review. A live map means community updates refreshing from GameVault—not tracking a player in-game or receiving private Rockstar data.</p></div><a class="btn btn-primary" href="/pages/maps.html#live-maps">Open GTA map previews ↗</a></section>';
}

function renderPublished(plans, addons, membership, user) {
  const planMarkup = plans.length ? plans.map(livePlanCard).join('') : '<div class="state info"><h3>No plans are published</h3><p>GameVault membership products are not available yet. Add and publish approved plans in the Supabase catalog after billing setup.</p></div>';
  const addonMarkup = addons.length ? addons.map(publishedAddonCard).join('') : '<div class="state info"><h3>No add-ons are published</h3><p>Map and crew add-ons will appear here after their catalog entries are approved.</p></div>';
  let memberMarkup = '';
  if (!user) memberMarkup = '<div class="state info"><h3>Sign in to view your membership</h3><p>Membership status is private to your account.</p><a class="btn" href="/pages/login.html?next=%2Fpages%2Fsubscriptions.html">Sign in</a></div>';
  else if (membership) memberMarkup = '<div class="gv-membership-status"><span class="gv-status-light" aria-hidden="true"></span><div><strong>Your membership · ' + escapeHTML(membership.membership_plans?.name || membership.plan_id) + '</strong><p>Status: ' + escapeHTML(membership.status) + (membership.current_period_end ? ' · Renews or ends ' + escapeHTML(new Date(membership.current_period_end).toLocaleDateString()) : '') + '</p></div><a href="/pages/account.html">Account details</a></div>';
  else memberMarkup = '<div class="gv-membership-status"><span class="gv-status-light is-idle" aria-hidden="true"></span><div><strong>No active GameVault membership</strong><p>Your account can still use public GTA communities and map guides.</p></div><a href="/pages/account.html">Account</a></div>';
  root.innerHTML = '<section class="gv-subscription-hero"><div class="gv-subscription-hero-copy"><p class="eyebrow">GAMEVAULT MEMBERSHIP · PLANS & ADD-ONS</p><h2>More ways to run the city together.</h2><p>Membership products shown here are loaded from the GameVault Supabase catalog. Checkout remains unavailable until a secure payment provider is connected.</p><div class="gv-subscription-actions"><a class="btn btn-primary" href="#plans">Compare options</a><a class="btn" href="/pages/maps.html#live-maps">See map previews</a></div></div><div class="gv-subscription-signal"><span class="gv-signal-ring"></span><strong>' + String(plans.length).padStart(2, '0') + '</strong><small>LIVE PLANS</small><i>From the catalog</i></div></section>' +
    accessModelSection() + memberMarkup + '<section class="gv-membership-section" id="plans"><div class="home-section-heading"><div><p class="eyebrow">PUBLISHED IN GAMEVAULT</p><h2>Membership options</h2></div></div><div class="gv-plan-grid">' + planMarkup + '</div></section>' +
    '<section class="gv-membership-section" id="addons"><div class="home-section-heading"><div><p class="eyebrow">OPTIONAL EXTRAS</p><h2>Map and crew add-ons</h2></div></div><div class="gv-addon-grid">' + addonMarkup + '</div></section>' +
    paymentOptionsSection() + '<section class="gv-subscription-map-note"><div><p class="eyebrow">COMMUNITY MAP LAYERS</p><h2>Clear source notes, reviewed pins.</h2><p>GameVault maps show community-contributed information, not player tracking or Rockstar telemetry.</p></div><a class="btn btn-primary" href="/pages/maps.html#live-maps">Open maps ↗</a></section>';
}

async function init() {
  if (!SUPABASE_CONFIGURED || !supabase) {
    renderPreview();
    return;
  }
  root.innerHTML = '<div class="state loading">Loading GameVault membership catalog…</div>';
  try {
    const [plansResult, addonsResult, authResult] = await Promise.all([
      supabase.from('membership_plans').select('id,name,description,price_cents,currency,billing_interval,features,is_featured,display_order').eq('is_published', true).order('display_order'),
      supabase.from('membership_addons').select('id,name,description,price_cents,currency,billing_interval,features,display_order').eq('is_published', true).order('display_order'),
      getOptionalUser()
    ]);
    if (authResult.error) throw authResult.error;
    if (plansResult.error) throw plansResult.error;
    if (addonsResult.error) throw addonsResult.error;
    const user = authResult.data.user;
    let membership = null;
    if (user) {
      const result = await supabase.from('user_memberships').select('plan_id,status,current_period_end,cancel_at_period_end,membership_plans(name)').eq('user_id', user.id).in('status', ['trialing','active','past_due']).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (result.error) throw result.error;
      membership = result.data;
    }
    renderPublished(plansResult.data || [], addonsResult.data || [], membership, user);
  } catch (error) {
    renderPreview();
    root.insertAdjacentHTML('afterbegin', '<div class="state info" role="status"><h3>Membership catalog isn’t ready</h3><p>Apply <code>' + migration + '</code>, then publish approved products in Supabase. The concept cards below are for planning only; no live prices or checkout are shown. ' + escapeHTML(error.message || '') + '</p></div>');
  }
}

init();