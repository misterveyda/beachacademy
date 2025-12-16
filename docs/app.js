let currentUser = null;
let isSignup = false;

async function loadUsers() {
  const local = localStorage.getItem('usersData');
  if (local) return JSON.parse(local);
  let res;
  try {
    res = await fetch('data/users-full.json');
    if (!res.ok) res = await fetch('data/users.json');
  } catch (e) {
    res = await fetch('data/users-full.json');
  }
  return res.json();
}

function saveUsers(users) {
  localStorage.setItem('usersData', JSON.stringify(users, null, 2));
}

function generateJWT(user) {
  const payload = { id: user.id, role: user.role, time: Date.now() };
  return btoa(JSON.stringify(payload));
}

async function login() {
  if (isSignup) return signup();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const users = await loadUsers();

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) return alert('Invalid email or password');

  localStorage.setItem('token', generateJWT(user));
  localStorage.setItem('user', JSON.stringify(user));
  initApp();
}

async function signup() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  if (!name || !email || !password) return alert('Please fill all signup fields');

  const users = await loadUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return alert('Email already registered');

  const nextId = Math.max(...users.map(u => u.id)) + 1;
  const newUser = { id: nextId, name, email, password, role };
  if (role === 'Student') newUser.class = 'Grade 7';

  users.push(newUser);
  saveUsers(users);

  localStorage.setItem('token', generateJWT(newUser));
  localStorage.setItem('user', JSON.stringify(newUser));
  isSignup = false;
  toggleAuthMode();
  initApp();
}

function toggleAuthMode() {
  isSignup = !isSignup;
  document.getElementById('name').classList.toggle('hidden', !isSignup);
  document.getElementById('role').classList.toggle('hidden', !isSignup);
  document.getElementById('auth-title').innerText = isSignup ? 'Signup' : 'Login';
  document.getElementById('auth-submit').innerText = isSignup ? 'Create account' : 'Login';
  document.getElementById('toggle-auth').innerText = isSignup ? 'Switch to Login' : 'Switch to Signup';
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('user-info').innerText = '';
  document.getElementById('logout-btn').classList.add('hidden');
}

async function initApp() {
  currentUser = JSON.parse(localStorage.getItem('user'));
  if (!currentUser) {
    document.getElementById('auth').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    return;
  }

  document.getElementById('auth').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('user-info').innerText = `${currentUser.name} (${currentUser.role})`;
  document.getElementById('logout-btn').classList.remove('hidden');
  renderNav();
}

function renderNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';

  const links = {
    Admin: ['Dashboard','Students','Teachers','Fees','Analytics'],
    Teacher: ['Classes','Attendance','Grades','Messages'],
    Parent: ['My Child','Attendance','Fees','Messages'],
    Student: ['Profile','Grades','Timetable']
  };

  const roleLinks = links[currentUser?.role] || ['Home'];
  roleLinks.forEach(item => {
    const btn = document.createElement('button');
    btn.innerText = item;
    btn.onclick = () => loadView(item);
    nav.appendChild(btn);
  });
}

function loadView(view) {
  const content = document.getElementById('content');
  content.innerHTML = `<div class='card'><h2>${view}</h2><p>Interactive module loaded.</p></div>`;
}

window.onload = initApp;
