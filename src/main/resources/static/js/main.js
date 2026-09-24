/**
 * Streakify - Main Controller & Navigation Router (main.js)
 */

// Main Content Sections
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const adminSection = document.getElementById('adminSection');
const leaderboardSection = document.getElementById('leaderboardSection');

function switchView(view) {
  currentView = view;
  if (authSection) authSection.style.display = 'none';
  if (dashboardSection) dashboardSection.style.display = 'none';
  if (adminSection) adminSection.style.display = 'none';
  if (leaderboardSection) leaderboardSection.style.display = 'none';

  if (navBtnHabits) navBtnHabits.classList.remove('active');
  if (navBtnAdmin) navBtnAdmin.classList.remove('active');
  if (navBtnLeaderboard) navBtnLeaderboard.classList.remove('active');

  if (view === 'auth') {
    if (authSection) authSection.style.display = 'flex';
  } else if (view === 'habits') {
    if (dashboardSection) dashboardSection.style.display = 'block';
    if (navBtnHabits) navBtnHabits.classList.add('active');
    if (currentUser) loadHabitsForUser(currentUser.id);
  } else if (view === 'admin') {
    if (adminSection) adminSection.style.display = 'block';
    if (navBtnAdmin) navBtnAdmin.classList.add('active');
    loadAdminData();
  } else if (view === 'leaderboard') {
    if (leaderboardSection) leaderboardSection.style.display = 'block';
    if (navBtnLeaderboard) navBtnLeaderboard.classList.add('active');
    loadLeaderboard();
  }
}

if (navBtnHabits) navBtnHabits.addEventListener('click', () => switchView('habits'));
if (navBtnAdmin) navBtnAdmin.addEventListener('click', () => switchView('admin'));
if (navBtnLeaderboard) navBtnLeaderboard.addEventListener('click', () => switchView('leaderboard'));

// Global Modal Backdrop and Close Button Listeners
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

// Initialization on Page Load
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('streakify_auth_user');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      currentUser = null;
    }
  }

  updateUIForUser();
});
