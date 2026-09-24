/**
 * Streakify - Admin Command Center Module (admin.js)
 */

// DOM Elements: Admin Section
const adminTotalUsers = document.getElementById('adminTotalUsers');
const adminTotalHabits = document.getElementById('adminTotalHabits');
const adminActiveStreaks = document.getElementById('adminActiveStreaks');
const adminRecordStreak = document.getElementById('adminRecordStreak');
const adminUserTableBody = document.getElementById('adminUserTableBody');
const btnRefreshAdmin = document.getElementById('btnRefreshAdmin');

// Modals
const adminHabitsModal = document.getElementById('adminHabitsModal');
const adminHabitsModalTitle = document.getElementById('adminHabitsModalTitle');
const adminHabitsList = document.getElementById('adminHabitsList');

async function loadAdminData() {
  if (btnRefreshAdmin) {
    btnRefreshAdmin.disabled = true;
    btnRefreshAdmin.textContent = '⏳ Refreshing...';
  }

  try {
    const timestamp = Date.now();
    const [statsRes, usersRes] = await Promise.all([
      fetch(`${API_BASE}/admin/stats?_t=${timestamp}`, { cache: 'no-store' }).catch(() => null),
      fetch(`${API_BASE}/admin/users?_t=${timestamp}`, { cache: 'no-store' }).catch(() => null)
    ]);

    let statsLoaded = false;
    if (statsRes && statsRes.ok) {
      const stats = await statsRes.json();
      if (adminTotalUsers) adminTotalUsers.textContent = stats.totalUsers ?? 0;
      if (adminTotalHabits) adminTotalHabits.textContent = stats.totalHabits ?? 0;
      if (adminActiveStreaks) adminActiveStreaks.textContent = stats.activeStreaks ?? 0;
      if (adminRecordStreak) adminRecordStreak.innerHTML = `${stats.highestStreak ?? 0} <span class="unit">days</span>`;
      statsLoaded = true;
    }

    if (usersRes && usersRes.ok) {
      const usersList = await usersRes.json();
      renderAdminUsersTable(usersList);

      // Robust client-side fallback: ensure stat cards always reflect loaded data
      if (!statsLoaded && usersList) {
        const totalUsers = usersList.length;
        let totalHabits = 0;
        let activeStreaks = 0;
        let highestStreak = 0;

        usersList.forEach(u => {
          totalHabits += (u.habitCount || (u.habits ? u.habits.length : 0));
          if (u.currentStreak > 0) activeStreaks++;
          if (u.longestStreak > highestStreak) highestStreak = u.longestStreak;
        });

        if (adminTotalUsers) adminTotalUsers.textContent = totalUsers;
        if (adminTotalHabits) adminTotalHabits.textContent = totalHabits;
        if (adminActiveStreaks) adminActiveStreaks.textContent = activeStreaks;
        if (adminRecordStreak) adminRecordStreak.innerHTML = `${highestStreak} <span class="unit">days</span>`;
      }
    }
  } catch (err) {
    console.error('Failed to load admin data:', err);
    showToast('Failed to load admin dashboard data', 'error');
  } finally {
    if (btnRefreshAdmin) {
      btnRefreshAdmin.disabled = false;
      btnRefreshAdmin.textContent = '🔄 Refresh Data';
    }
  }
}

if (btnRefreshAdmin) {
  btnRefreshAdmin.addEventListener('click', async () => {
    await loadAdminData();
    showToast('Admin data refreshed', 'success');
  });
}

// Auto-refresh when returning to admin tab
window.addEventListener('focus', () => {
  if (currentView === 'admin' && currentUser && currentUser.role === 'ROLE_ADMIN') {
    loadAdminData();
  }
});

function renderAdminUsersTable(usersList) {
  if (!adminUserTableBody) return;
  adminUserTableBody.innerHTML = '';

  if (usersList.length === 0) {
    adminUserTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No users found.</td></tr>';
    return;
  }

  usersList.forEach(u => {
    const tr = document.createElement('tr');
    const isCurrentUser = currentUser && currentUser.id === u.id;
    const roleBadgeClass = u.role === 'ROLE_ADMIN' ? 'badge-role-admin' : 'badge-role-user';
    const roleLabel = u.role === 'ROLE_ADMIN' ? 'Admin' : 'User';
    const statusBadgeClass = u.active ? 'badge-active' : 'badge-inactive';
    const statusLabel = u.active ? 'Active' : 'Deactivated';

    tr.innerHTML = `
      <td><strong>${escapeHtml(u.name)}</strong> ${isCurrentUser ? '<span style="font-size: 11px; color: var(--primary);">(You)</span>' : ''}</td>
      <td>${escapeHtml(u.email)}</td>
      <td><span class="badge ${roleBadgeClass}">${roleLabel}</span></td>
      <td><span class="badge ${statusBadgeClass}">${statusLabel}</span></td>
      <td>${u.habitCount}</td>
      <td><span class="streak-pill">🔥 ${u.currentStreak}</span></td>
      <td>🏆 ${u.longestStreak} d</td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" data-admin-action="habits" data-user-id="${u.id}" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;">
          View Habits
        </button>
        ${!isCurrentUser ? `
          <button class="btn btn-secondary btn-sm" data-admin-action="toggle-status" data-user-id="${u.id}" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;">
            ${u.active ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn btn-danger-outline btn-sm" data-admin-action="delete-user" data-user-id="${u.id}" style="padding: 4px 8px; font-size: 12px;">
            🗑️
          </button>
        ` : ''}
      </td>
    `;

    adminUserTableBody.appendChild(tr);
  });

  // Attach action listeners
  document.querySelectorAll('[data-admin-action="toggle-status"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uId = btn.getAttribute('data-user-id');
      try {
        const res = await fetch(`${API_BASE}/admin/users/${uId}/toggle-status`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed to update user status');
        showToast('User status updated', 'success');
        loadAdminData();
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });

  document.querySelectorAll('[data-admin-action="delete-user"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uId = btn.getAttribute('data-user-id');
      if (!confirm('Are you sure you want to permanently delete this user and all their habits?')) return;
      try {
        const res = await fetch(`${API_BASE}/admin/users/${uId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
        showToast('User deleted', 'info');
        loadAdminData();
      } catch (e) {
        showToast(e.message, 'error');
      }
    });
  });

  document.querySelectorAll('[data-admin-action="habits"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uId = parseInt(btn.getAttribute('data-user-id'), 10);
      const targetUser = usersList.find(u => u.id === uId);
      if (!targetUser) return;

      adminHabitsModalTitle.textContent = `${targetUser.name}'s Habits`;
      adminHabitsList.innerHTML = '';

      if (!targetUser.habits || targetUser.habits.length === 0) {
        adminHabitsList.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 12px 0;">No habits found for this user.</p>';
      } else {
        targetUser.habits.forEach(h => {
          const item = document.createElement('div');
          item.className = 'log-item';
          item.innerHTML = `
            <div>
              <strong>${escapeHtml(h.name)}</strong>
              <div style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">Target: ${h.targetDaysPerWeek} days/week</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <span class="streak-pill">🔥 ${h.currentStreak} d</span>
              <span class="badge" style="background: rgba(255,255,255,0.06);">🏆 Best: ${h.longestStreak} d</span>
            </div>
          `;
          adminHabitsList.appendChild(item);
        });
      }

      openModal(adminHabitsModal);
    });
  });
}
