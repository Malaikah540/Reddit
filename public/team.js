const employeeForm = document.getElementById('employee-form');
const employeeNameInput = document.getElementById('employee-name');
const employeeList = document.getElementById('employee-list');
const employeeSelect = document.getElementById('assignment-employee');

const assignmentForm = document.getElementById('assignment-form');
const assignmentUsernameInput = document.getElementById('assignment-username');
const assignmentNoteInput = document.getElementById('assignment-note');
const assignmentListEl = document.getElementById('assignment-list');

let employees = [];
let assignments = [];

async function loadEmployees() {
  employees = await fetch('/api/employees').then((r) => r.json());
  renderEmployees();
  loadStats();
}

async function loadAssignments() {
  assignments = await fetch('/api/assignments').then((r) => r.json());
  renderAssignments();
  loadStats();
}

async function loadStats() {
  const stats = await fetch('/api/stats').then((r) => r.json());

  document.getElementById('stat-employees').textContent = stats.employees;
  document.getElementById('stat-assignments').textContent = stats.assignments;
  document.getElementById('stat-comment-checks').textContent = stats.commentChecks;

  document.getElementById('step-number-1').classList.toggle('complete', stats.employees > 0);
  document.getElementById('step-number-2').classList.toggle('complete', stats.assignments > 0);
  document.getElementById('step-number-3').classList.toggle('complete', stats.assignments > 0);
  document.getElementById('step-number-4').classList.toggle('complete', stats.commentChecks > 0);

  const desc1 = document.getElementById('step-desc-1');
  if (desc1) {
    desc1.textContent =
      stats.employees > 0
        ? `${stats.employees} teammate${stats.employees === 1 ? '' : 's'} added.`
        : "Add each teammate who'll be checking or engaging on Reddit.";
  }

  const desc3 = document.getElementById('step-desc-3');
  if (desc3) {
    desc3.textContent =
      stats.assignments > 0
        ? `Tracking ${stats.assignments} account${stats.assignments === 1 ? '' : 's'}. Pull live karma, activity, and subreddit history any time.`
        : 'Pull live karma, activity, and subreddit history for each assigned account.';
  }
}

document.querySelectorAll('[data-step-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const body = document.getElementById(btn.getAttribute('aria-controls'));
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    body.classList.toggle('collapsed', expanded);
  });
});

function renderEmployees() {
  employeeList.innerHTML = '';
  employeeSelect.innerHTML = '';

  if (employees.length === 0) {
    employeeList.innerHTML = '<li class="muted">No employees added yet.</li>';
  }

  for (const emp of employees) {
    const li = document.createElement('li');
    li.textContent = emp.name + ' ';
    const del = document.createElement('button');
    del.textContent = 'Remove';
    del.className = 'link-btn';
    del.addEventListener('click', async () => {
      await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
      await Promise.all([loadEmployees(), loadAssignments()]);
    });
    li.append(del);
    employeeList.append(li);

    const opt = document.createElement('option');
    opt.value = emp.id;
    opt.textContent = emp.name;
    employeeSelect.append(opt);
  }
}

function renderAssignments() {
  assignmentListEl.innerHTML = '';

  if (assignments.length === 0) {
    assignmentListEl.innerHTML = '<p class="muted">No assignments yet.</p>';
    return;
  }

  for (const a of assignments) {
    const card = document.createElement('div');
    card.className = 'assignment-card';
    card.innerHTML = `
      <div class="assignment-header">
        <div>
          <strong>${a.employeeName}</strong> — u/${a.redditUsername}
        </div>
        <button class="link-btn remove-assignment">Remove</button>
      </div>
      <label>Focus note</label>
      <textarea class="focus-note">${a.focusNote || ''}</textarea>
      <div class="assignment-actions">
        <button class="save-note">Save note</button>
        <button class="check-status">Check account status</button>
      </div>
      <div class="status-result"></div>
    `;

    card.querySelector('.remove-assignment').addEventListener('click', async () => {
      await fetch(`/api/assignments/${a.id}`, { method: 'DELETE' });
      await loadAssignments();
    });

    card.querySelector('.save-note').addEventListener('click', async () => {
      const focusNote = card.querySelector('.focus-note').value;
      await fetch(`/api/assignments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusNote }),
      });
    });

    card.querySelector('.check-status').addEventListener('click', async () => {
      const resultEl = card.querySelector('.status-result');
      resultEl.textContent = 'Checking...';
      const res = await fetch(`/api/assignments/${a.id}/status`);
      const data = await res.json();

      if (!res.ok) {
        resultEl.innerHTML = `<span class="error-text">${data.error}</span>`;
        return;
      }

      const s = data.stats;
      resultEl.innerHTML = `
        <div class="status-grid">
          <div><strong>${s.totalKarma.toLocaleString()}</strong> total karma</div>
          <div><strong>${s.activityLast30Days}</strong> activity (30d)</div>
          <div><strong>${s.avgUpvoteRatio ? Math.round(s.avgUpvoteRatio * 100) + '%' : 'n/a'}</strong> avg upvote ratio</div>
        </div>
        <div class="muted" style="margin-top:0.5rem;">
          Subreddits this account already participates in:
          ${s.topSubreddits.map((t) => `r/${t.subreddit}`).join(', ') || 'none found'}
        </div>
      `;
    });

    assignmentListEl.append(card);
  }
}

employeeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = employeeNameInput.value.trim();
  if (!name) return;
  await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  employeeNameInput.value = '';
  await loadEmployees();
});

assignmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const employeeId = employeeSelect.value;
  const redditUsername = assignmentUsernameInput.value.trim();
  const focusNote = assignmentNoteInput.value.trim();
  if (!employeeId || !redditUsername) return;

  const res = await fetch('/api/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, redditUsername, focusNote }),
  });

  if (!res.ok) {
    const data = await res.json();
    alert(data.error || 'Could not add assignment.');
    return;
  }

  assignmentUsernameInput.value = '';
  assignmentNoteInput.value = '';
  await loadAssignments();
});

const commentCheckForm = document.getElementById('comment-check-form');
const commentCheckInput = document.getElementById('comment-check-input');
const commentCheckResult = document.getElementById('comment-check-result');

const LEVEL_LABEL = { low: '✅ Low risk', medium: '⚠️ Medium risk', high: '🚫 High risk' };

commentCheckForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = commentCheckInput.value.trim();
  if (!text) return;

  commentCheckResult.innerHTML = '<span class="muted">Checking...</span>';

  const res = await fetch('/api/comment-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();

  if (!res.ok) {
    commentCheckResult.innerHTML = `<span class="error-text">${data.error}</span>`;
    return;
  }

  const flagsHtml = data.flags.length
    ? `<ul class="flag-list">${data.flags
        .map((f) => `<li class="flag-item level-${f.level}">${f.message}</li>`)
        .join('')}</ul>`
    : '<p class="all-clear">No major risk signals found.</p>';

  const toneHtml = data.toneNotes.length
    ? `<div style="margin-top:0.6rem;"><label>Tone notes (heuristic)</label><ul class="tone-note-list">${data.toneNotes
        .map((t) => `<li>${t}</li>`)
        .join('')}</ul></div>`
    : '';

  const aiHtml =
    data.aiNotes && data.aiNotes.length
      ? `<div style="margin-top:0.6rem;"><label>AI coaching notes <span class="badge">Claude</span></label><ul class="tone-note-list">${data.aiNotes
          .map((t) => `<li>${t}</li>`)
          .join('')}</ul></div>`
      : '';

  commentCheckResult.innerHTML = `
    <div class="comment-result">
      <div class="risk-summary">
        <span class="risk-badge-lvl ${data.riskLevel}">${LEVEL_LABEL[data.riskLevel]}</span>
        <span class="safety-score ${data.riskLevel}">${data.safetyScore}% safe to post</span>
      </div>
      <div class="safety-bar-track">
        <div class="safety-bar-fill ${data.riskLevel}" style="width:${data.safetyScore}%"></div>
      </div>
      ${flagsHtml}
      ${toneHtml}
      ${aiHtml}
    </div>
  `;

  loadStats();
});

loadEmployees();
loadAssignments();
