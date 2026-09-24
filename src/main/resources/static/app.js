/**
 * Streakify Frontend Application
 * Interacts with Spring Boot REST API
 */

// Determine API Base URL (works seamlessly when served by Spring Boot on cloud or local, or standalone live server)
const API_BASE = (window.location.hostname === 'localhost' && window.location.port !== '8080' && window.location.port !== '')
  ? 'http://localhost:8080'
  : window.location.origin;

// State
let users = [];
let currentUserId = localStorage.getItem('streakify_active_user_id') || null;
let activeHabits = [];
let activeHabitLogsMap = {}; // habitId -> Array of logs
let activeHabitStreakMap = {}; // habitId -> { currentStreak, longestStreak }
let activeHistoryHabitId = null;

// DOM Elements
const userSelect = document.getElementById('userSelect');
const btnNewUser = document.getElementById('btnNewUser');
const btnDeleteUser = document.getElementById('btnDeleteUser');
const noUserSection = document.getElementById('noUserSection');
const dashboardSection = document.getElementById('dashboardSection');
const btnWelcomeCreate = document.getElementById('btnWelcomeCreate');

// Stats Elements
const statTotalHabits = document.getElementById('statTotalHabits');
const statBestStreak = document.getElementById('statBestStreak');
const statTodayCompleted = document.getElementById('statTodayCompleted');
const todayProgressBar = document.getElementById('todayProgressBar');

// Habits Elements
const habitsGrid = document.getElementById('habitsGrid');
const emptyHabitsState = document.getElementById('emptyHabitsState');
const btnOpenAddHabit = document.getElementById('btnOpenAddHabit');
const btnEmptyAddHabit = document.getElementById('btnEmptyAddHabit');

// Modals
const userModal = document.getElementById('userModal');
const newUserForm = document.getElementById('newUserForm');
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

// Modal open/close handling
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

// Set max date on custom date picker to today
if (customLogDate) {
  customLogDate.max = getTodayString();
  customLogDate.value = getTodayString();
}

// ==========================================
// API Interaction Functions
// ==========================================

async function fetchUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    users = await res.json();
    renderUserSelect();
  } catch (err) {
    console.error('Failed to load users:', err);
    showToast('Could not connect to backend server. Make sure Spring Boot is running on port 8080.', 'error');
  }
}

async function createUser(name, email) {
  try {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to create user');
    }
    const newUser = await res.json();
    showToast(`User ${newUser.name} created!`, 'success');
    closeModal(userModal);
    newUserForm.reset();
    await fetchUsers();
    switchUser(newUser.id);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error creating user', 'error');
  }
}

async function deleteCurrentUser() {
  if (!currentUserId) return;
  const user = users.find(u => u.id == currentUserId);
  const confirmDelete = confirm(`Are you sure you want to delete profile "${user ? user.name : 'this user'}" and all their habits?`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE}/users/${currentUserId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete user');
    showToast('User deleted', 'info');
    currentUserId = null;
    localStorage.removeItem('streakify_active_user_id');
    await fetchUsers();
    renderAppView();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error deleting user', 'error');
  }
}

async function loadHabitsForUser(userId) {
  if (!userId) return;
  try {
    const res = await fetch(`${API_BASE}/users/${userId}/habits`);
    if (!res.ok) throw new Error('Failed to fetch habits');
    activeHabits = await res.json();

    // Fetch streaks & logs in parallel for all habits
    await Promise.all(activeHabits.map(async (h) => {
      try {
        const [streakRes, logsRes] = await Promise.all([
          fetch(`${API_BASE}/habits/${h.id}/streak`),
          fetch(`${API_BASE}/habits/${h.id}/logs`)
        ]);
        if (streakRes.ok) {
          activeHabitStreakMap[h.id] = await streakRes.json();
        }
        if (logsRes.ok) {
          activeHabitLogsMap[h.id] = await logsRes.json();
        }
      } catch (e) {
        console.error(`Error loading details for habit ${h.id}:`, e);
      }
    }));

    renderHabits();
    renderStats();
  } catch (err) {
    console.error(err);
    showToast('Failed to load habits for user', 'error');
  }
}

async function createHabit(name, targetDaysPerWeek) {
  if (!currentUserId) {
    showToast('Please select a user first', 'error');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/habits?userId=${currentUserId}`, {
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
    await loadHabitsForUser(currentUserId);
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
    await loadHabitsForUser(currentUserId);
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
      // Update existing log
      res = await fetch(`${API_BASE}/habits/${habitId}/logs/${dateStr}?completed=${desiredCompleted}`, {
        method: 'PUT'
      });
    } else {
      // Create new log
      res = await fetch(`${API_BASE}/habits/${habitId}/logs?date=${dateStr}&completed=${desiredCompleted}`, {
        method: 'POST'
      });
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

    // Refresh habit data
    await loadHabitsForUser(currentUserId);

    // If history modal is currently open for this habit, refresh it
    if (activeHistoryHabitId === habitId) {
      renderHistoryModalLogs();
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Error logging habit', 'error');
  }
}

// ==========================================
// Rendering UI Functions
// ==========================================

function renderUserSelect() {
  userSelect.innerHTML = '<option value="" disabled>Select User Profile...</option>';
  
  if (users.length === 0) {
    userSelect.innerHTML += '<option value="" disabled>(No users found)</option>';
  }

  users.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.name} (${u.email})`;
    if (currentUserId && String(u.id) === String(currentUserId)) {
      opt.selected = true;
    }
    userSelect.appendChild(opt);
  });

  // If stored user doesn't exist anymore
  if (currentUserId && !users.some(u => String(u.id) === String(currentUserId))) {
    currentUserId = null;
    localStorage.removeItem('streakify_active_user_id');
  }

  // Auto-select if only 1 user exists and none selected yet
  if (!currentUserId && users.length === 1) {
    switchUser(users[0].id);
    return;
  }

  renderAppView();
}

function switchUser(userId) {
  currentUserId = userId;
  localStorage.setItem('streakify_active_user_id', userId);
  userSelect.value = userId;
  renderAppView();
  loadHabitsForUser(userId);
}

function renderAppView() {
  if (!currentUserId) {
    noUserSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    btnDeleteUser.style.display = 'none';
  } else {
    noUserSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    btnDeleteUser.style.display = 'inline-flex';
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
    if (streak && streak.longestStreak > maxStreak) {
      maxStreak = streak.longestStreak;
    }
    if (streak && streak.currentStreak > maxStreak) {
      maxStreak = streak.currentStreak;
    }

    const logs = activeHabitLogsMap[h.id] || [];
    const todayLog = logs.find(l => l.logDate === today);
    if (todayLog && todayLog.completed) {
      todayDone++;
    }
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

    // 7 Days chips logic
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

      <!-- 7-Day Mini Tracker -->
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

  // Attach card event listeners
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
  // Toggle Today button
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

  // Day chip click toggle
  document.querySelectorAll('.day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const habitId = parseInt(chip.getAttribute('data-habit-id'), 10);
      const dateStr = chip.getAttribute('data-date');
      const isCompleted = chip.getAttribute('data-status') === 'true';
      toggleHabitLog(habitId, dateStr, !isCompleted);
    });
  });

  // History button
  document.querySelectorAll('[data-action="history"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = parseInt(btn.getAttribute('data-habit-id'), 10);
      openHistoryModal(habitId);
    });
  });

  // Delete button
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

  // Sort descending by date
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

  // Attach toggles inside history list
  logsList.querySelectorAll('button[data-history-habit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hId = parseInt(btn.getAttribute('data-history-habit'), 10);
      const dStr = btn.getAttribute('data-history-date');
      const curStatus = btn.getAttribute('data-history-status') === 'true';
      toggleHabitLog(hId, dStr, !curStatus);
    });
  });
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
// Event Listeners Setup
// ==========================================

userSelect.addEventListener('change', (e) => {
  if (e.target.value) {
    switchUser(e.target.value);
  }
});

btnNewUser.addEventListener('click', () => openModal(userModal));
btnWelcomeCreate.addEventListener('click', () => openModal(userModal));
btnDeleteUser.addEventListener('click', deleteCurrentUser);

newUserForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  if (name && email) {
    createUser(name, email);
  }
});

btnOpenAddHabit.addEventListener('click', () => openModal(habitModal));
btnEmptyAddHabit.addEventListener('click', () => openModal(habitModal));

newHabitForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('habitName').value.trim();
  const targetDays = habitTargetDays.value;
  if (name) {
    createHabit(name, targetDays);
  }
});

customDateLogForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeHistoryHabitId) return;
  const dateStr = customLogDate.value;
  const completed = customLogStatus.value === 'true';
  if (dateStr) {
    toggleHabitLog(activeHistoryHabitId, dateStr, completed);
  }
});

// Initial startup
fetchUsers();
