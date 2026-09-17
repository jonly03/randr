const summary = document.querySelector('#summary');
const attention = document.querySelector('#attention');
const stream = document.querySelector('#stream');
const connection = document.querySelector('#connection');
let events = [];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
const eventCard = (event) => `<article class="event ${escapeHtml(event.signal)}"><div class="event-meta"><span>${escapeHtml(event.signal)}</span><time>${new Date(event.occurredAt).toLocaleString()}</time></div><h3>${escapeHtml(event.headline)}</h3><p>${escapeHtml(event.summary)}</p><small>${escapeHtml(event.source)} · ${escapeHtml(event.subject?.branch || event.subject?.kind || 'delivery')}</small>${event.url ? `<a href="${escapeHtml(event.url)}" target="_blank" rel="noreferrer">Open evidence ↗</a>` : ''}</article>`;

function render() {
  const counts = ['green', 'yellow', 'red'].reduce((result, signal) => ({ ...result, [signal]: events.filter((event) => event.signal === signal).length }), {});
  summary.innerHTML = ['green', 'yellow', 'red'].map((signal) => `<div class="stat ${signal}"><strong>${counts[signal]}</strong><span>${signal}</span></div>`).join('');
  const needsAttention = events.filter((event) => event.signal !== 'green');
  attention.innerHTML = needsAttention.length ? needsAttention.map(eventCard).join('') : '<p class="empty">No yellow or red delivery events.</p>';
  stream.innerHTML = events.length ? events.map(eventCard).join('') : '<p class="empty">Waiting for verified GitHub or specialist events.</p>';
}

async function start() {
  const response = await fetch('/api/delivery/snapshot', { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load delivery snapshot');
  events = (await response.json()).events;
  render();
  const feed = new EventSource('/api/delivery/stream');
  feed.addEventListener('snapshot', (message) => { events = JSON.parse(message.data).events; render(); });
  feed.addEventListener('delivery-event', (message) => { const event = JSON.parse(message.data); if (!events.some((item) => item.id === event.id)) events.unshift(event); render(); });
  feed.onopen = () => { connection.textContent = 'Live'; connection.className = 'live'; };
  feed.onerror = () => { connection.textContent = 'Reconnecting…'; connection.className = 'reconnecting'; };
}

start().catch((error) => { connection.textContent = 'Unavailable'; stream.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; });
