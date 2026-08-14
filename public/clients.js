const clientForm = document.getElementById('client-form');
const nameInput = document.getElementById('client-name');
const websiteInput = document.getElementById('client-website');
const notesInput = document.getElementById('client-notes');
const clientListEl = document.getElementById('client-list');

let clients = [];

async function loadClients() {
  clients = await fetch('/api/clients').then((r) => r.json());
  renderClients();
}

function renderClients() {
  clientListEl.innerHTML = '';

  if (clients.length === 0) {
    clientListEl.innerHTML = '<p class="muted">No clients added yet.</p>';
    return;
  }

  for (const c of clients) {
    const card = document.createElement('div');
    card.className = 'client-card';
    card.innerHTML = `
      <div class="client-header">
        <div>
          <h4>${c.name}</h4>
          <a href="${c.website}" target="_blank" rel="noopener noreferrer">${c.website}</a>
        </div>
        <button class="link-btn remove-client">Remove</button>
      </div>
      <label>Notes</label>
      <textarea class="notes">${c.notes || ''}</textarea>
      <div class="client-actions">
        <button class="save-notes">Save notes</button>
        <button class="get-suggestions">Suggest subreddits</button>
      </div>
      <div class="suggestion-result"></div>
    `;

    card.querySelector('.remove-client').addEventListener('click', async () => {
      await fetch(`/api/clients/${c.id}`, { method: 'DELETE' });
      await loadClients();
    });

    card.querySelector('.save-notes').addEventListener('click', async () => {
      const notes = card.querySelector('.notes').value;
      await fetch(`/api/clients/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
    });

    card.querySelector('.get-suggestions').addEventListener('click', async () => {
      const resultEl = card.querySelector('.suggestion-result');
      resultEl.innerHTML = '<span class="muted">Analyzing site...</span>';

      const res = await fetch(`/api/clients/${c.id}/suggestions`);
      const data = await res.json();

      if (!res.ok) {
        resultEl.innerHTML = `<span class="error-text">${data.error}</span>`;
        return;
      }

      const badge = data.method === 'ai' ? '<span class="badge">AI</span>' : '<span class="badge" style="background:var(--muted)">Keyword match</span>';

      if (data.suggestions.length === 0) {
        resultEl.innerHTML = `${badge}<p class="muted" style="margin-top:0.5rem;">${data.note}</p>`;
        return;
      }

      resultEl.innerHTML = `
        ${badge}
        ${data.note ? `<p class="muted" style="margin:0.4rem 0;">${data.note}</p>` : ''}
        <div style="margin-top:0.5rem;">
          ${data.suggestions
            .map(
              (s) => `
            <div class="suggestion-item">
              <span class="sr-name">r/${s.subreddit}</span>
              <span class="sr-reason">${s.reason}</span>
            </div>`
            )
            .join('')}
        </div>
      `;
    });

    clientListEl.append(card);
  }
}

clientForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const website = websiteInput.value.trim();
  const notes = notesInput.value.trim();
  if (!name || !website) return;

  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, website, notes }),
  });

  if (!res.ok) {
    const data = await res.json();
    alert(data.error || 'Could not add client.');
    return;
  }

  nameInput.value = '';
  websiteInput.value = '';
  notesInput.value = '';
  await loadClients();
});

loadClients();
