/**
 * Streakify - API Configuration & Shared Utilities (api.js)
 */

// Determine API Base URL (works seamlessly when served by Spring Boot on cloud or local, or standalone live server)
const API_BASE = (window.location.hostname === 'localhost' && window.location.port !== '8080' && window.location.port !== '')
  ? 'http://localhost:8080'
  : window.location.origin;

// Shared State
let currentUser = null; // { id, name, email, role }
let activeHabits = [];
let activeHabitLogsMap = {}; // habitId -> Array of logs
let activeHabitStreakMap = {}; // habitId -> { currentStreak, longestStreak }
let activeHistoryHabitId = null;
let currentView = 'habits'; // 'habits', 'admin', 'leaderboard', 'auth'
let authMode = 'user_login'; // 'user_login', 'admin_login', 'register'

// Shared Toast Notification Container
const toastContainer = document.getElementById('toastContainer');

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
  if (!toastContainer) return;
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
  if (modal) modal.style.display = 'flex';
}

function closeModal(modal) {
  if (modal) modal.style.display = 'none';
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
