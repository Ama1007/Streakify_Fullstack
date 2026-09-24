/**
 * Streakify - Authentication Module (auth.js)
 */

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

if (tabUserLogin) tabUserLogin.addEventListener('click', () => setAuthMode('user_login'));
if (tabAdminLogin) tabAdminLogin.addEventListener('click', () => setAuthMode('admin_login'));
if (tabRegister) tabRegister.addEventListener('click', () => setAuthMode('register'));

if (authForm) {
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
}

function loginSuccess(user) {
  currentUser = user;
  localStorage.setItem('streakify_auth_user', JSON.stringify(user));
  if (authForm) authForm.reset();
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

if (btnSignOut) btnSignOut.addEventListener('click', signOut);
if (btnOpenAuth) {
  btnOpenAuth.addEventListener('click', () => {
    switchView('auth');
  });
}

function updateUIForUser() {
  if (!currentUser) {
    if (navLoggedIn) navLoggedIn.style.display = 'none';
    if (navLoggedOut) navLoggedOut.style.display = 'block';
    switchView('auth');
  } else {
    if (navLoggedOut) navLoggedOut.style.display = 'none';
    if (navLoggedIn) navLoggedIn.style.display = 'flex';

    if (currentUser.role === 'ROLE_ADMIN') {
      if (userNameDisplay) userNameDisplay.textContent = `${currentUser.name} (Admin)`;
      if (navBtnAdmin) navBtnAdmin.style.display = 'inline-flex';
      switchView('admin');
    } else {
      if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
      if (navBtnAdmin) navBtnAdmin.style.display = 'none';
      switchView('habits');
    }
  }
}
