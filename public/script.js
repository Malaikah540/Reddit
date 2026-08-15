const form = document.getElementById('check-form');
const input = document.getElementById('username-input');
const submitBtn = document.getElementById('submit-btn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const previewEmptyEl = document.getElementById('preview-empty');

const profileIcon = document.getElementById('profile-icon');
const profileName = document.getElementById('profile-name');
const profileAge = document.getElementById('profile-age');
const statGrid = document.getElementById('stat-grid');
const subredditList = document.getElementById('subreddit-list');
const suggestionList = document.getElementById('suggestion-list');

const statCheckedEl = document.getElementById('stat-checked');
const statSuggestionsEl = document.getElementById('stat-suggestions');
let landingStatsCache = { totalChecks: 0, totalSuggestions: 0 };

function animateCount(el, from, to, duration = 900) {
  if (!el) return;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function loadLandingStats() {
  try {
    const stats = await fetch('/api/stats').then((r) => r.json());
    animateCount(statCheckedEl, 0, stats.totalChecks);
    animateCount(statSuggestionsEl, 0, stats.totalSuggestions);
    landingStatsCache = stats;
  } catch {
    // stats are a nice-to-have; fail silently if unreachable
  }
}

function setStatus(message, type) {
  if (!message) {
    statusEl.hidden = true;
    statusEl.textContent = '';
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function formatAge(days) {
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} old`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts = [];
  if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return `${parts.join(', ')} old`;
}

function statCard(label, value) {
  const div = document.createElement('div');
  div.className = 'stat-card';
  div.innerHTML = `<div class="value">${value}</div><div class="label">${label}</div>`;
  return div;
}

function renderResults(data) {
  const { stats } = data;

  profileName.textContent = `u/${data.username}`;
  profileAge.textContent = formatAge(stats.accountAgeDays);

  if (data.iconImg) {
    profileIcon.src = data.iconImg;
    profileIcon.alt = `${data.username} avatar`;
    profileIcon.hidden = false;
  } else {
    profileIcon.hidden = true;
  }

  statGrid.innerHTML = '';
  statGrid.append(
    statCard('Total karma', stats.totalKarma.toLocaleString()),
    statCard('Post karma', stats.linkKarma.toLocaleString()),
    statCard('Comment karma', stats.commentKarma.toLocaleString()),
    statCard('Avg. post score', stats.avgPostScore),
    statCard('Avg. comment score', stats.avgCommentScore),
    statCard('Avg. upvote ratio', stats.avgUpvoteRatio ? `${Math.round(stats.avgUpvoteRatio * 100)}%` : 'n/a'),
    statCard('Activity (30d)', stats.activityLast30Days),
    statCard('Verified email', stats.hasVerifiedEmail ? 'Yes' : 'No')
  );

  subredditList.innerHTML = '';
  if (stats.topSubreddits.length === 0) {
    subredditList.innerHTML = '<span class="muted">No recent public activity found.</span>';
  } else {
    for (const { subreddit, count } of stats.topSubreddits) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = `r/${subreddit} (${count})`;
      subredditList.append(chip);
    }
  }

  suggestionList.innerHTML = '';
  for (const s of data.suggestions) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="title">${s.title}</div><div class="detail">${s.detail}</div>`;
    suggestionList.append(li);
  }

  previewEmptyEl.hidden = true;
  resultsEl.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = input.value.trim().replace(/^u\//, '');
  if (!username) return;

  submitBtn.disabled = true;
  resultsEl.hidden = true;
  setStatus('Looking up account...', 'loading');

  try {
    const res = await fetch(`/api/check/${encodeURIComponent(username)}`);
    const data = await res.json();

    if (!res.ok) {
      setStatus(data.error || 'Something went wrong.', 'error');
      previewEmptyEl.hidden = false;
      return;
    }

    setStatus(null);
    renderResults(data);

    const newChecked = landingStatsCache.totalChecks + 1;
    const newSuggestions = landingStatsCache.totalSuggestions + data.suggestions.length;
    animateCount(statCheckedEl, landingStatsCache.totalChecks, newChecked, 500);
    animateCount(statSuggestionsEl, landingStatsCache.totalSuggestions, newSuggestions, 500);
    landingStatsCache = { totalChecks: newChecked, totalSuggestions: newSuggestions };
  } catch (err) {
    setStatus('Network error — please try again.', 'error');
    previewEmptyEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

document.querySelectorAll('.quick-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    input.value = chip.dataset.username;
    form.requestSubmit();
  });
});

if (typeof initLiveBackground === 'function') initLiveBackground('preview-bg');

loadLandingStats();
