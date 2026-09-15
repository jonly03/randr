const kanban = document.querySelector('#kanban');
const summary = document.querySelector('#board-summary');
const alertBox = document.querySelector('#board-alert');

const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[character]));

function renderCard(item) {
  const classes = ['board-card'];
  if (item.priority === 'Next') classes.push('next');
  if (item.status === 'done') classes.push('complete');
  const blocker = item.blockedBy?.length
    ? `<div class="board-blocker"><strong>Needs:</strong> ${escapeHtml(item.blockedBy.join(' · '))}</div>` : '';
  const evidence = item.evidence
    ? `<div class="board-evidence">✓ ${escapeHtml(item.evidence)}</div>` : '';
  return `<article class="${classes.join(' ')}">
    <div class="board-card-top"><span class="board-id">${escapeHtml(item.id)}</span><span class="board-type">${escapeHtml(item.type)}</span></div>
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.outcome)}</p>
    <div class="board-owner"><strong>Product:</strong> ${escapeHtml(item.productOwner)}<br><strong>Engineering:</strong> ${escapeHtml(item.engineeringOwner)}</div>
    ${blocker}${evidence}
  </article>`;
}

async function loadBoard() {
  try {
    const response = await fetch('project/board.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Board data returned ${response.status}`);
    const board = await response.json();
    const inProgress = board.items.filter(item => item.status === 'in-progress').length;
    const completed = board.items.filter(item => item.status === 'done').length;
    summary.innerHTML = `<div class="summary-stat"><strong>${board.items.length}</strong><span>Total items</span></div><div class="summary-stat"><strong>${inProgress}/${board.wipLimit}</strong><span>In progress</span></div><div class="summary-stat"><strong>${completed}</strong><span>Completed</span></div>`;
    kanban.innerHTML = board.columns.map(column => {
      const items = board.items.filter(item => item.status === column.id);
      return `<section class="kanban-column"><header class="kanban-column-header"><span class="kanban-count">${items.length}</span><h2>${escapeHtml(column.name)}</h2><p>${escapeHtml(column.description)}</p></header>${items.map(renderCard).join('')}</section>`;
    }).join('');
  } catch (error) {
    alertBox.innerHTML = `<div class="alert alert-danger" role="alert">The delivery board could not be loaded. ${escapeHtml(error.message)}</div>`;
  }
}

loadBoard();
