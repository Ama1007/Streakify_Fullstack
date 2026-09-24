/**
 * Streakify - Community Leaderboard Module (leaderboard.js)
 */

const leaderboardTableBody = document.getElementById('leaderboardTableBody');
const btnRefreshLeaderboard = document.getElementById('btnRefreshLeaderboard');

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/habits/leaderboard`);
    if (!res.ok) throw new Error('Failed to load leaderboard');
    const list = await res.json();
    renderLeaderboard(list);
  } catch (err) {
    console.error(err);
    showToast('Failed to load leaderboard', 'error');
  }
}

if (btnRefreshLeaderboard) {
  btnRefreshLeaderboard.addEventListener('click', () => {
    loadLeaderboard();
    showToast('Leaderboard refreshed', 'info');
  });
}

function renderLeaderboard(list) {
  if (!leaderboardTableBody) return;
  leaderboardTableBody.innerHTML = '';

  if (list.length === 0) {
    leaderboardTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No streak records yet. Check in today to claim the top spot!</td></tr>';
    return;
  }

  list.forEach((item, index) => {
    const tr = document.createElement('tr');
    let rankBadge = `<span class="rank-badge">${index + 1}</span>`;
    if (index === 0) rankBadge = `<span class="rank-badge rank-1">🥇</span>`;
    if (index === 1) rankBadge = `<span class="rank-badge rank-2">🥈</span>`;
    if (index === 2) rankBadge = `<span class="rank-badge rank-3">🥉</span>`;

    tr.innerHTML = `
      <td>${rankBadge}</td>
      <td><strong>${escapeHtml(item.userName)}</strong></td>
      <td>${escapeHtml(item.habitName)}</td>
      <td><span class="streak-pill">🔥 ${item.currentStreak} days</span></td>
      <td>🏆 ${item.longestStreak} days</td>
    `;
    leaderboardTableBody.appendChild(tr);
  });
}
