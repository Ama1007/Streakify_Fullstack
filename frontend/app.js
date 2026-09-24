/**
 * Streakify Frontend Application
 * Interacts with Spring Boot REST API
 */

// Determine API Base URL (works seamlessly when served by Spring Boot on cloud or local, or standalone live server)
const API_BASE = (window.location.hostname === 'localhost' && window.location.port !== '8080' && window.location.port !== '')
  ? 'http://localhost:8080'
  : window.location.origin;

// State
let currentUser = null; // { id, name, email, role }
let activeHabits = [];
let activeHabitLogsMap = {}; // habitId -> Array of logs
let activeHabitStreakMap = {}; // habitId -> { currentStreak, longestStreak }
let activeHistoryHabitId = null;
let currentView = 'habits'; // 'habits', 'admin', 'leaderboard'
let authMode = 'user_login'; // 'user_login', 'admin_login', 'register'

// DOM Elements: Navigation & Header
const headerControls = document.getElementById('headerControls');
const navLoggedIn = document.getElementById('navLoggedIn');
const navLoggedOut = document.getElementById('navLoggedOut');
const navBtnHabits = document.getElementById('navBtnHabits');
const navBtnAdmin = document.getElementById('navBtnAdmin');
const navBtnLeaderboard = document.getElementById('navBtnLeaderboard');
const userNameDisplay = document.getElementById('userNameDisplay');
const btnSignOut = document.getElementById('btnSignOut');
const btnOpenAuth = document.getElementById('btnOpenAuth');

// DOM Elements: Main Sections
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const adminSection = document.getElementById('adminSection');
const leaderboardSection = document.getElementById('leaderboardSection');

// DOM Elements: Auth Form & Tabs
const tabUserLogin = document.getElementById('tabUserLogin');
const tabAdminLogin = document.getElementById('tabAdminLogin');
const tabRegister = document.getElementById('tabRegister');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authForm = document.getElementById('authForm');
const groupAuthName = document.getElementById('groupAuthName');
const authName = document.getElementById('authName');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const adminHintBox = document.getElementById('adminHintBox');
const btnAuthSubmit = document.getElementById('btnAuthSubmit');

// DOM Elements: User Dashboard Stats
const statTotalHabits = document.getElementById('statTotalHabits');
const statBestStreak = document.getElementById('statBestStreak');
const statTodayCompleted = document.getElementById('statTodayCompleted');
const todayProgressBar = document.getElementById('todayProgressBar');

// DOM Elements: Habits Grid
const habitsGrid = document.getElementById('habitsGrid');
const emptyHabitsState = document.getElementById('emptyHabitsState');
const btnOpenAddHabit = document.getElementById('btnOpenAddHabit');
const btnEmptyAddHabit = document.getElementById('btnEmptyAddHabit');

// DOM Elements: Admin Section
const adminTotalUsers = document.getElementById('adminTotalUsers');
const adminTotalHabits = document.getElementById('adminTotalHabits');
const adminActiveStreaks = document.getElementById('adminActiveStreaks');
const adminRecordStreak = document.getElementById('adminRecordStreak');
const adminUserTableBody = document.getElementById('adminUserTableBody');
const btnRefreshAdmin = document.getElementById('btnRefreshAdmin');

// DOM Elements: Leaderboard Section
const leaderboardTableBody = document.getElementById('leaderboardTableBody');
const btnRefreshLeaderboard = document.getElementById('btnRefreshLeaderboard');

// Modals
const habitModal = document.getElementById('habitModal');
const newHabitForm = document.getElementById('newHabitForm');
const habitTargetDays = document.getElementById('habitTargetDays');
const targetDaysDisplay = document.getElementById('targetDaysDisplay');
const historyModal = document.getElementById('historyModal');
const historyModalTitle = document.getElementById('historyModalTitle');
const historyModalSubtitle = document.getElementById('historyModalSubtitle');
const customDateLogForm = document.getElementById('customDateLogForm');
const customLogDate = document.getElementById('customLogDate');
const customLogStatus = document.getElementById('customLogStatus');
const logsList = document.getElementById('logsList');
const adminHabitsModal = document.getElementById('adminHabitsModal');
const adminHabitsModalTitle = document.getElementById('adminHabitsModalTitle');
const adminHabitsList = document.getElementById('adminHabitsList');
const toastContainer = document.getElementById('toastContainer');

// ==========================================
// Helper Functions
// ==========================================

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function openModal(modal) {
  modal.style.display = 'flex';
}

function closeModal(modal) {
  modal.style.display = 'none';
}

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modalId = btn.getAttribute('data-close');
    const modal = document.getElementById(modalId);
    if (modal) closeModal(modal);
  });
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.style.display = 'none';
  }
});

// Target days slider
if (habitTargetDays && targetDaysDisplay) {
  habitTargetDays.addEventListener('input', (e) => {
    const val = e.target.value;
    targetDaysDisplay.textContent = `${val} ${val == 1 ? 'day' : 'days'} / week`;
  });
}

document.querySelectorAll('.preset-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const days = chip.getAttribute('data-days');
    habitTargetDays.value = days;
    targetDaysDisplay.textContent = `${days} days / week`;
  });
});

if (customLogDate) {
  customLogDate.max = getTodayString();
  customLogDate.value = getTodayString();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// ==========================================
// Authentication Functions
// ==========================================

function setAuthMode(mode) {
  authMode = mode;
  tabUserLogin.classList.remove('active');
  tabAdminLogin.classList.remove('active');
  tabRegister.classList.remove('active');

  if (mode === 'user_login') {
    tabUserLogin.classList.add('active');
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Sign in to track your habits and maintain your streak.';
    groupAuthName.style.display = 'none';
    authName.required = false;
    adminHintBox.style.display = 'none';
    btnAuthSubmit.textContent = 'Sign In';
  } else if (mode === 'admin_login') {
    tabAdminLogin.classList.add('active');
    authTitle.textContent = '🛡️ Admin Portal';
    authSubtitle.textContent = 'Sign in to oversee platform health and streaks.';
    groupAuthName.style.display = 'none';
    authName.required = false;
    adminHintBox.style.display = 'block';
    btnAuthSubmit.textContent = 'Sign In as Admin';
  } else if (mode === 'register') {
    tabRegister.classList.add('active');
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Join Streakify and start building positive momentum.';
    groupAuthName.style.display = 'block';
    authName.required = true;
    adminHintBox.style.display = 'none';
    btnAuthSubmit.textContent = 'Create Account';
  }
}

tabUserLogin.addEventListener('click', () => setAuthMode('user_login'));
tabAdminLogin.addEventListener('click', () => setAuthMode('admin_login'));
tabRegister.addEventListener('click', () => setAuthMode('register'));

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (authMode === 'register') {
    const name = authName.value.trim();
    if (!name || !email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      showToast('Account created successfully! Signing you in...', 'success');
      loginSuccess({ id: data.id, name: data.name, email: data.email, role: data.role });
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  } else {
    // Login (User or Admin)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (authMode === 'admin_login' && data.role !== 'ROLE_ADMIN') {
        showToast('Notice: This account is a regular User profile. Redirecting to your Habit Dashboard...', 'info');
      } else {
        showToast(`Welcome back, ${data.name}!`, 'success');
      }

      loginSuccess({ id: data.id, name: data.name, email: data.email, role: data.role });
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  }
});

function loginSuccess(user) {
  currentUser = user;
  localStorage.setItem('streakify_auth_user', JSON.stringify(user));
  authForm.reset();
  updateUIForUser();
}

function signOut() {
  currentUser = null;
  localStorage.removeItem('streakify_auth_user');
  activeHabits = [];
  activeHabitLogsMap = {};
  activeHabitStreakMap = {};
  showToast('Signed out successfully', 'info');
  updateUIForUser();
}

btnSignOut.addEventListener('click', signOut);
btnOpenAuth.addEventListener('click', () => {
  switchView('auth');
});

// ==========================================
// View Routing & Navigation
// ==========================================

function switchView(view) {
  currentView = view;
  authSection.style.display = 'none';
  dashboardSection.style.display = 'none';
  adminSection.style.display = 'none';
  leaderboardSection.style.display = 'none';

  navBtnHabits.classList.remove('active');
  navBtnAdmin.classList.remove('active');
  navBtnLeaderboard.classList.remove('active');

  if (view === 'auth') {
    authSection.style.display = 'flex';
  } else if (view === 'habits') {
    dashboardSection.style.display = 'block';
    navBtnHabits.classList.add('active');
    if (currentUser) loadHabitsForUser(currentUser.id);
  } else if (view === 'admin') {
    adminSection.style.display = 'block';
    navBtnAdmin.classList.add('active');
    loadAdminData();
  } else if (view === 'leaderboard') {
    leaderboardSection.style.display = 'block';
    navBtnLeaderboard.classList.add('active');
    loadLeaderboard();
  }
}

navBtnHabits.addEventListener('click', () => switchView('habits'));
navBtnAdmin.addEventListener('click', () => switchView('admin'));
navBtnLeaderboard.addEventListener('click', () => switchView('leaderboard'));

function updateUIForUser() {
  if (!currentUser) {
    navLoggedIn.style.display = 'none';
    navLoggedOut.style.display = 'block';
    switchView('auth');
  } else {
    navLoggedOut.style.display = 'none';
    navLoggedIn.style.display = 'flex';

    if (currentUser.role === 'ROLE_ADMIN') {
      userNameDisplay.textContent = `${currentUser.name} (Admin)`;
      navBtnAdmin.style.display = 'inline-flex';
      switchView('admin');
    } else {
      userNameDisplay.textContent = currentUser.name;
      navBtnAdmin.style.display = 'none';
      switchView('habits');
    }
  }
}

// ==========================================
// Admin Operations
// ==========================================

async function loadAdminData() {
  try {
    const [statsRes, usersRes] = await Promise.all([
      fetch(`${API_BASE}/admin/stats`),
      fetch(`${API_BASE}/admin/users`)
    ]);

    if (statsRes.ok) {
      const stats = await statsRes.json();
      adminTotalUsers.textContent = stats.totalUsers || 0;
      adminTotalHabits.textContent = stats.totalHabits || 0;
      adminActiveStreaks.textContent = stats.activeStreaks || 0;
      adminRecordStreak.innerHTML = `${stats.highestStreak || 0} <span class="unit">days</span>`;
    }

    if (usersRes.ok) {
      const usersList = await usersRes.json();
      renderAdminUsersTable(usersList);
    }
  } catch (err) {
    console.error('Failed to load admin data:', err);
    showToast('Failed to load admin dashboard data', 'error');
  }
}

btnRefreshAdmin.addEventListener('click', () => {
  loadAdminData();
  showToast('Admin data refreshed', 'info');
});

function renderAdminUsersTable(usersList) {
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

// ==========================================
// Leaderboard Operations
// ==========================================

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

btnRefreshLeaderboard.addEventListener('click', () => {
  loadLeaderboard();
  showToast('Leaderboard refreshed', 'info');
});

function renderLeaderboard(list) {
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

// ==========================================
// User Habit Operations
// ==========================================

async function loadHabitsForUser(userId) {
  if (!userId) return;
  try {
    const res = await fetch(`${API_BASE}/users/${userId}/habits`);
    if (!res.ok) throw new Error('Failed to fetch habits');
    activeHabits = await res.json();

    // Fetch streaks & logs in parallel
    await Promise.all(activeHabits.map(async (h) => {
      try {
        const [streakRes, logsRes] = await Promise.all([
          fetch(`${API_BASE}/habits/${h.id}/streak`),
          fetch(`${API_BASE}/habits/${h.id}/logs`)
        ]);
        if (streakRes.ok) activeHabitStreakMap[h.id] = await streakRes.json();
        if (logsRes.ok) activeHabitLogsMap[h.id] = await logsRes.json();
      } catch (e) {
        console.error(`Error loading details for habit ${h.id}:`, e);
      }
    }));

    renderHabits();
    renderStats();
  } catch (err) {
    console.error(err);
    showToast('Failed to load habits', 'error');
  }
}

async function createHabit(name, targetDaysPerWeek) {
  if (!currentUser) return;
  try {
    const res = await fetch(`${API_BASE}/habits?userId=${currentUser.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, targetDaysPerWeek: parseInt(targetDaysPerWeek, 10) })
    });
    if (!res.ok) throw new Error('Failed to create habit');
    const created = await res.json();
    showToast(`Habit "${created.name}" created!`, 'success');
    closeModal(habitModal);
    newHabitForm.reset();
    habitTargetDays.value = 7;
    targetDaysDisplay.textContent = '7 days / week';
    await loadHabitsForUser(currentUser.id);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error creating habit', 'error');
  }
}

async function deleteHabit(habitId) {
  const habit = activeHabits.find(h => h.id === habitId);
  const confirmDelete = confirm(`Are you sure you want to delete "${habit ? habit.name : 'this habit'}"?`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE}/habits/${habitId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete habit');
    showToast('Habit deleted', 'info');
    await loadHabitsForUser(currentUser.id);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error deleting habit', 'error');
  }
}

async function toggleHabitLog(habitId, dateStr, desiredCompleted) {
  const existingLogs = activeHabitLogsMap[habitId] || [];
  const existingLog = existingLogs.find(l => l.logDate === dateStr);

  try {
    let res;
    if (existingLog) {
      res = await fetch(`${API_BASE}/habits/${habitId}/logs/${dateStr}?completed=${desiredCompleted}`, { method: 'PUT' });
    } else {
      res = await fetch(`${API_BASE}/habits/${habitId}/logs?date=${dateStr}&completed=${desiredCompleted}`, { method: 'POST' });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update log');
    }

    if (desiredCompleted) {
      showToast('🔥 Habit marked completed! Keep it up!', 'success');
    } else {
      showToast('Habit marked uncompleted', 'info');
    }

    await loadHabitsForUser(currentUser.id);

    if (activeHistoryHabitId === habitId) {
      renderHistoryModalLogs();
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error logging habit', 'error');
  }
}

function renderStats() {
  const total = activeHabits.length;
  statTotalHabits.textContent = total;

  let maxStreak = 0;
  let todayDone = 0;
  const today = getTodayString();

  activeHabits.forEach(h => {
    const streak = activeHabitStreakMap[h.id];
    if (streak && streak.longestStreak > maxStreak) maxStreak = streak.longestStreak;
    if (streak && streak.currentStreak > maxStreak) maxStreak = streak.currentStreak;

    const logs = activeHabitLogsMap[h.id] || [];
    const todayLog = logs.find(l => l.logDate === today);
    if (todayLog && todayLog.completed) todayDone++;
  });

  statBestStreak.innerHTML = `${maxStreak} <span class="unit">days</span>`;
  statTodayCompleted.textContent = `${todayDone} / ${total}`;

  const percent = total > 0 ? Math.round((todayDone / total) * 100) : 0;
  todayProgressBar.style.width = `${percent}%`;
}

function renderHabits() {
  habitsGrid.innerHTML = '';

  if (activeHabits.length === 0) {
    emptyHabitsState.style.display = 'block';
    return;
  }
  emptyHabitsState.style.display = 'none';

  const today = getTodayString();

  activeHabits.forEach(habit => {
    const streak = activeHabitStreakMap[habit.id] || { currentStreak: 0, longestStreak: 0 };
    const logs = activeHabitLogsMap[habit.id] || [];
    const todayLog = logs.find(l => l.logDate === today);
    const isCompletedToday = todayLog ? todayLog.completed : false;

    const card = document.createElement('div');
    card.className = 'habit-card';

    const dayChipsHtml = renderWeekChips(habit.id, logs);

    card.innerHTML = `
      <div class="habit-top">
        <h3 class="habit-name">${escapeHtml(habit.name)}</h3>
        <span class="habit-badge">🎯 ${habit.targetDaysPerWeek}d / wk</span>
      </div>

      <div class="streak-metrics">
        <div class="streak-pill">
          <span class="streak-pill-label">Current Streak</span>
          <span class="streak-pill-val ${streak.currentStreak > 0 ? 'active-flame' : ''}">
            🔥 ${streak.currentStreak}
          </span>
        </div>
        <div class="streak-pill">
          <span class="streak-pill-label">Best Streak</span>
          <span class="streak-pill-val">
            🏆 ${streak.longestStreak}
          </span>
        </div>
      </div>

      <div class="week-tracker">
        ${dayChipsHtml}
      </div>

      <div class="habit-actions">
        <button class="btn-checkin ${isCompletedToday ? 'done' : ''}" data-habit-id="${habit.id}" data-action="toggle-today">
          <span>${isCompletedToday ? '✅ Done Today' : '○ Check In Today'}</span>
        </button>
        <button class="btn-icon" data-habit-id="${habit.id}" data-action="history" title="View History & Log Past Dates">
          📅
        </button>
        <button class="btn-icon btn-delete" data-habit-id="${habit.id}" data-action="delete" title="Delete Habit">
          🗑️
        </button>
      </div>
    `;

    habitsGrid.appendChild(card);
  });

  attachHabitCardListeners();
}

function renderWeekChips(habitId, logs) {
  const days = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayName = dayNames[d.getDay()];

    const log = logs.find(l => l.logDate === dateStr);
    const isCompleted = log ? log.completed : false;
    const isToday = i === 0;

    days.push(`
      <div class="day-chip ${isCompleted ? 'completed' : ''} ${isToday ? 'today' : ''}" 
           data-habit-id="${habitId}" 
           data-date="${dateStr}" 
           data-status="${isCompleted}" 
           title="${dateStr}: ${isCompleted ? 'Completed' : 'Not completed'}. Click to toggle.">
        <span class="day-name">${isToday ? 'Today' : dayName}</span>
        <span class="day-status">${isCompleted ? '✓' : ''}</span>
      </div>
    `);
  }

  return days.join('');
}

function attachHabitCardListeners() {
  document.querySelectorAll('[data-action="toggle-today"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = parseInt(btn.getAttribute('data-habit-id'), 10);
      const today = getTodayString();
      const logs = activeHabitLogsMap[habitId] || [];
      const todayLog = logs.find(l => l.logDate === today);
      const currentStatus = todayLog ? todayLog.completed : false;
      toggleHabitLog(habitId, today, !currentStatus);
    });
  });

  document.querySelectorAll('.day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const habitId = parseInt(chip.getAttribute('data-habit-id'), 10);
      const dateStr = chip.getAttribute('data-date');
      const isCompleted = chip.getAttribute('data-status') === 'true';
      toggleHabitLog(habitId, dateStr, !isCompleted);
    });
  });

  document.querySelectorAll('[data-action="history"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = parseInt(btn.getAttribute('data-habit-id'), 10);
      openHistoryModal(habitId);
    });
  });

  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = parseInt(btn.getAttribute('data-habit-id'), 10);
      deleteHabit(habitId);
    });
  });
}

function openHistoryModal(habitId) {
  activeHistoryHabitId = habitId;
  const habit = activeHabits.find(h => h.id === habitId);
  if (!habit) return;

  historyModalTitle.textContent = `${habit.name} - History`;
  historyModalSubtitle.textContent = `Target: ${habit.targetDaysPerWeek} days/week`;

  customLogDate.value = getTodayString();
  customLogStatus.value = 'true';

  renderHistoryModalLogs();
  openModal(historyModal);
}

function renderHistoryModalLogs() {
  if (!activeHistoryHabitId) return;
  const logs = activeHabitLogsMap[activeHistoryHabitId] || [];
  logsList.innerHTML = '';

  if (logs.length === 0) {
    logsList.innerHTML = '<p style="color: var(--text-dim); font-size: 13px; text-align: center; padding: 20px 0;">No logs recorded yet.</p>';
    return;
  }

  const sortedLogs = [...logs].sort((a, b) => b.logDate.localeCompare(a.logDate));

  sortedLogs.forEach(l => {
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <div>
        <span class="log-date">${formatDate(l.logDate)}</span>
        <span style="font-size: 11px; color: var(--text-dim); margin-left: 8px;">(${l.logDate})</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="log-status-badge ${l.completed ? 'completed' : 'missed'}">
          ${l.completed ? 'Completed' : 'Missed'}
        </span>
        <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 11px;" 
                data-history-habit="${activeHistoryHabitId}" 
                data-history-date="${l.logDate}" 
                data-history-status="${l.completed}">
          Toggle
        </button>
      </div>
    `;
    logsList.appendChild(item);
  });

  logsList.querySelectorAll('button[data-history-habit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hId = parseInt(btn.getAttribute('data-history-habit'), 10);
      const dStr = btn.getAttribute('data-history-date');
      const curStatus = btn.getAttribute('data-history-status') === 'true';
      toggleHabitLog(hId, dStr, !curStatus);
    });
  });
}

// Modal open buttons
btnOpenAddHabit.addEventListener('click', () => openModal(habitModal));
btnEmptyAddHabit.addEventListener('click', () => openModal(habitModal));

newHabitForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('habitName').value.trim();
  const targetDays = habitTargetDays.value;
  if (name) createHabit(name, targetDays);
});

customDateLogForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeHistoryHabitId) return;
  const dateStr = customLogDate.value;
  const completed = customLogStatus.value === 'true';
  if (dateStr) toggleHabitLog(activeHistoryHabitId, dateStr, completed);
});

// ==========================================
// Initialization on page load
// ==========================================
const savedUser = localStorage.getItem('streakify_auth_user');
if (savedUser) {
  try {
    currentUser = JSON.parse(savedUser);
  } catch (e) {
    currentUser = null;
  }
}

updateUIForUser();
