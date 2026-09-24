/**
 * Streakify - User Habits Management & Tracking (habits.js)
 */

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

// Modals & Forms
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
    if (newHabitForm) newHabitForm.reset();
    if (habitTargetDays) habitTargetDays.value = 7;
    if (targetDaysDisplay) targetDaysDisplay.textContent = '7 days / week';
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
  if (!statTotalHabits) return;
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

  if (statBestStreak) statBestStreak.innerHTML = `${maxStreak} <span class="unit">days</span>`;
  if (statTodayCompleted) statTodayCompleted.textContent = `${todayDone} / ${total}`;

  const percent = total > 0 ? Math.round((todayDone / total) * 100) : 0;
  if (todayProgressBar) todayProgressBar.style.width = `${percent}%`;
}

function renderHabits() {
  if (!habitsGrid) return;
  habitsGrid.innerHTML = '';

  if (activeHabits.length === 0) {
    if (emptyHabitsState) emptyHabitsState.style.display = 'block';
    return;
  }
  if (emptyHabitsState) emptyHabitsState.style.display = 'none';

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

  if (historyModalTitle) historyModalTitle.textContent = `${habit.name} - History`;
  if (historyModalSubtitle) historyModalSubtitle.textContent = `Target: ${habit.targetDaysPerWeek} days/week`;

  if (customLogDate) customLogDate.value = getTodayString();
  if (customLogStatus) customLogStatus.value = 'true';

  renderHistoryModalLogs();
  openModal(historyModal);
}

function renderHistoryModalLogs() {
  if (!activeHistoryHabitId || !logsList) return;
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
if (btnOpenAddHabit) btnOpenAddHabit.addEventListener('click', () => openModal(habitModal));
if (btnEmptyAddHabit) btnEmptyAddHabit.addEventListener('click', () => openModal(habitModal));

if (newHabitForm) {
  newHabitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('habitName').value.trim();
    const targetDays = habitTargetDays.value;
    if (name) createHabit(name, targetDays);
  });
}

if (customDateLogForm) {
  customDateLogForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeHistoryHabitId) return;
    const dateStr = customLogDate.value;
    const completed = customLogStatus.value === 'true';
    if (dateStr) toggleHabitLog(activeHistoryHabitId, dateStr, completed);
  });
}
