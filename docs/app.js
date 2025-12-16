let currentUser = null;

async function loadUsers() {
  const res = await fetch('data/users.json');
  return res.json();
}

function generateJWT(user) {
  return btoa(JSON.stringify({ id: user.id, role: user.role, time: Date.now() }));
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const users = await loadUsers();

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return alert('Invalid login');

  localStorage.setItem('token', generateJWT(user));
  localStorage.setItem('user', JSON.stringify(user));
  initApp();
}

function initApp() {
  currentUser = JSON.parse(localStorage.getItem('user'));
  if (!currentUser) return;

  document.getElementById('auth').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  document.getElementById('user-info').innerText = `${currentUser.name} (${currentUser.role})`;
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

  links[currentUser.role].forEach(item => {
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
