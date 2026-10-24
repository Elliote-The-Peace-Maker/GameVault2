import { supabase, SUPABASE_CONFIGURED, getOptionalUser } from '../services/supabase.js';

const PET_IMAGE = '/assets/vault-guide-skull.png';
const FIRE_IMAGE = '/assets/vault-guide-fire.svg';
const QUICK_PROMPTS = [
  'Help me find a GTA title',
  'Help me find a GTA crew',
  'How do I update my profile?'
];

export function mountVexraPet(root) {
  if (!root || root.querySelector('.vexra-pet-launcher')) return;

  const launcher = document.createElement('button');
  launcher.className = 'vexra-pet-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Chat with Vault Guide');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'vexra-chat-panel');
  launcher.innerHTML = `<span class="gv-vault-guide-avatar" aria-hidden="true"><img class="gv-vault-guide-flames" src="${FIRE_IMAGE}" alt=""><img class="gv-vault-guide-skull" src="${PET_IMAGE}" alt=""></span><span class="vexra-pet-label">Chat with Vault Guide</span>`;

  const panel = document.createElement('section');
  panel.className = 'vexra-chat-panel surface';
  panel.id = 'vexra-chat-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'vexra-chat-title');
  panel.innerHTML = `
    <header class="vexra-chat-header">
      <span class="gv-guide-mini" aria-hidden="true"><img class="gv-vault-guide-flames" src="${FIRE_IMAGE}" alt=""><img class="gv-vault-guide-skull" src="${PET_IMAGE}" alt=""></span>
      <div class="vexra-chat-heading"><strong id="vexra-chat-title">Talk to Vault Guide</strong><span><i></i> Your gaming sidekick</span></div>
      <button class="vexra-chat-icon" type="button" data-clear aria-label="Start a new chat" title="Start a new chat">↺</button>
      <button class="vexra-chat-icon" type="button" data-close aria-label="Close chat">×</button>
    </header>
    <div class="vexra-chat-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
    <div class="vexra-chat-prompts" aria-label="Suggested messages"></div>
    <div class="vexra-chat-access" role="status" hidden></div>
    <a class="btn btn-primary vexra-chat-signin" href="/pages/login.html" hidden>Sign in to chat</a>
    <form class="vexra-chat-form">
      <label class="sr-only" for="vexra-chat-input">Message Vault Guide</label>
      <input id="vexra-chat-input" maxlength="1200" autocomplete="off" placeholder="Message Vault Guide…" required disabled>
      <button class="btn btn-primary" type="submit" aria-label="Send message" disabled>➤</button>
    </form>
    <p class="vexra-chat-privacy">Messages are sent to OpenAI to generate replies. Don’t share passwords or private account details.</p>`;

  root.append(launcher, panel);

  const log = panel.querySelector('.vexra-chat-messages');
  const prompts = panel.querySelector('.vexra-chat-prompts');
  const status = panel.querySelector('.vexra-chat-access');
  const signIn = panel.querySelector('.vexra-chat-signin');
  const form = panel.querySelector('.vexra-chat-form');
  const input = panel.querySelector('#vexra-chat-input');
  const send = form.querySelector('button');
  const conversation = [];
  let canChat = false;
  let busy = false;

  function addMessage(role, text, { pending = false } = {}) {
    const row = document.createElement('div');
    row.className = `vexra-message vexra-message-${role}${pending ? ' is-pending' : ''}`;
    if (role === 'assistant') {
      const avatar = document.createElement('span');
      avatar.className = 'gv-guide-message-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.innerHTML = `<img class="gv-vault-guide-flames" src="${FIRE_IMAGE}" alt=""><img class="gv-vault-guide-skull" src="${PET_IMAGE}" alt="">`;
      row.append(avatar);
    }
    const bubble = document.createElement('p');
    bubble.className = 'vexra-message-bubble';
    bubble.textContent = text;
    row.append(bubble);
    log.append(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function setStatus(message, { needsSignIn = false } = {}) {
    status.textContent = message;
    status.hidden = !message;
    signIn.hidden = !needsSignIn;
  }

  function setEnabled(enabled) {
    canChat = enabled;
    input.disabled = !enabled;
    send.disabled = !enabled || busy;
    prompts.querySelectorAll('button').forEach(button => { button.disabled = !enabled || busy; });
  }

  async function checkAccess() {
    if (!SUPABASE_CONFIGURED || !supabase) {
      setStatus('Vault Guide is ready. Connect Supabase and deploy the GameVault chat function to turn on live replies.');
      setEnabled(false);
      return;
    }
    const { data: { user }, error } = await getOptionalUser();
    if (error || !user) {
      setStatus('Sign in to chat with Vault Guide.', { needsSignIn: true });
      setEnabled(false);
      return;
    }
    setStatus('');
    setEnabled(true);
  }

  function drawWelcome() {
    log.replaceChildren();
    addMessage('assistant', "Hey, player! I'm Vault Guide. I can help you explore Grand Theft Auto titles, find a world, and use the GameVault community.");
    prompts.hidden = false;
  }

  async function sendMessage(rawText) {
    const message = rawText.trim();
    if (!message || !canChat || busy) return;
    prompts.hidden = true;
    setStatus('');
    input.value = '';
    conversation.push({ role: 'user', content: message });
    addMessage('user', message);
    busy = true;
    setEnabled(true);
    const pending = addMessage('assistant', 'Vault Guide is thinking…', { pending: true });
    try {
      const { data, error } = await supabase.functions.invoke('vexra-chat', {
        body: { messages: conversation.slice(-10) }
      });
      if (error || !data?.reply) throw error || new Error('No reply received');
      pending.remove();
      conversation.push({ role: 'assistant', content: data.reply });
      addMessage('assistant', data.reply);
    } catch {
      pending.remove();
      setStatus('Vault Guide cannot answer right now. Check the GameVault chat setup and try again.');
    } finally {
      busy = false;
      setEnabled(canChat);
      input.focus();
    }
  }

  drawWelcome();
  QUICK_PROMPTS.forEach(text => {
    const button = document.createElement('button');
    button.className = 'vexra-prompt';
    button.type = 'button';
    button.textContent = text;
    button.addEventListener('click', () => sendMessage(text));
    prompts.append(button);
  });
  setEnabled(false);
  checkAccess().catch(() => setStatus('Vault Guide chat is unavailable right now.'));

  launcher.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    if (open && canChat) input.focus();
  });
  panel.querySelector('[data-close]').addEventListener('click', () => {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  });
  panel.querySelector('[data-clear]').addEventListener('click', () => {
    conversation.length = 0;
    setStatus('');
    drawWelcome();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage(input.value);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    }
  });
}
