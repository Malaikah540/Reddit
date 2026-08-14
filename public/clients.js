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

      const badge =
        data.method === 'ai'
          ? '<span class="badge">AI-powered</span>'
          : '<span class="badge" style="background:var(--muted)">Keyword match</span>';

      if (data.suggestions.length === 0) {
        resultEl.innerHTML = `${badge}<p class="muted" style="margin-top:0.5rem;">${data.note}</p>`;
        return;
      }

      const top5 = data.suggestions.slice(0, 5);
      const top10 = data.suggestions.slice(0, 10);

      resultEl.innerHTML = `
        ${badge}
        ${data.note ? `<p class="muted" style="margin:0.4rem 0;">${data.note}</p>` : ''}

        <div class="rank-section">
          <div class="rank-section-title">
            <span class="rank-badge">🏆 Top ${top5.length}</span>
            Best matches to lead with
          </div>
          <div class="top5-grid">
            ${top5
              .map(
                (s, i) => `
              <div class="top5-card">
                <div class="rank-num">#${i + 1} PICK</div>
                <div class="sr-name">r/${s.subreddit}</div>
                <div class="sr-reason">${s.reason}</div>
              </div>`
              )
              .join('')}
          </div>
        </div>

        ${
          top10.length > top5.length
            ? `
        <div class="rank-section">
          <div class="rank-section-title">
            <span class="rank-badge">📋 Top ${top10.length}</span>
            Full ranked list
          </div>
          <div class="top10-list">
            ${top10
              .map(
                (s, i) => `
              <div class="top10-row">
                <span class="rank-circle">${i + 1}</span>
                <span class="sr-name">r/${s.subreddit}</span>
                <span class="sr-reason">${s.reason}</span>
                <button class="copy-btn" data-sr="${s.subreddit}">Copy</button>
              </div>`
              )
              .join('')}
          </div>
        </div>`
            : ''
        }
      `;

      resultEl.querySelectorAll('.copy-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(`r/${btn.dataset.sr}`);
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = original), 1200);
        });
      });
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
