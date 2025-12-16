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
  roleLinks.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.innerText = item;
    if (idx === 0) btn.classList.add('active');
    btn.onclick = () => {
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadView(item);
    };
    nav.appendChild(btn);
  });
  
  // Load first view on init
  if (nav.children.length > 0) {
    nav.children[0].click();
  }
}

async function loadView(view) {
  const content = document.getElementById('content');
  const users = await loadUsers();

  if (currentUser.role === 'Admin') {
    return loadAdminView(view, users, content);
  } else if (currentUser.role === 'Teacher') {
    return loadTeacherView(view, users, content);
  } else if (currentUser.role === 'Parent') {
    return loadParentView(view, users, content);
  } else if (currentUser.role === 'Student') {
    return loadStudentView(view, users, content);
  }
}

function loadAdminView(view, users, content) {
  if (view === 'Dashboard') {
    const stats = {
      totalUsers: users.length,
      admins: users.filter(u => u.role === 'Admin').length,
      teachers: users.filter(u => u.role === 'Teacher').length,
      students: users.filter(u => u.role === 'Student').length,
      parents: users.filter(u => u.role === 'Parent').length
    };

    content.innerHTML = `
      <h2>Admin Dashboard</h2>
      <div class="stats-grid">
        <div class="stat-card admin">
          <h4>Total Users</h4>
          <div class="value">${stats.totalUsers}</div>
        </div>
        <div class="stat-card admin">
          <h4>Admins</h4>
          <div class="value">${stats.admins}</div>
        </div>
        <div class="stat-card teacher">
          <h4>Teachers</h4>
          <div class="value">${stats.teachers}</div>
        </div>
        <div class="stat-card student">
          <h4>Students</h4>
          <div class="value">${stats.students}</div>
        </div>
        <div class="stat-card parent">
          <h4>Parents</h4>
          <div class="value">${stats.parents}</div>
        </div>
      </div>
    `;
  } else if (view === 'Students') {
    renderUserTable('Student', users, content);
  } else if (view === 'Teachers') {
    renderUserTable('Teacher', users, content);
  } else if (view === 'Fees') {
    content.innerHTML = `<div class="card"><h2>Fees Management</h2><p>Fee tracking and payment records.</p></div>`;
  } else if (view === 'Analytics') {
    content.innerHTML = `<div class="card"><h2>Analytics</h2><p>System analytics and reports.</p></div>`;
  }
}

function loadTeacherView(view, users, content) {
  if (view === 'Classes') {
    content.innerHTML = `<div class="card"><h2>My Classes</h2><p>View and manage your classes.</p></div>`;
  } else if (view === 'Attendance') {
    content.innerHTML = `<div class="card"><h2>Attendance</h2><p>Mark and track attendance.</p></div>`;
  } else if (view === 'Grades') {
    content.innerHTML = `<div class="card"><h2>Grades</h2><p>Enter and manage student grades.</p></div>`;
  } else if (view === 'Messages') {
    content.innerHTML = `<div class="card"><h2>Messages</h2><p>Communicate with parents and students.</p></div>`;
  }
}

function loadParentView(view, users, content) {
  if (view === 'My Child') {
    const students = users.filter(u => u.parentId === currentUser.id);
    if (students.length === 0) {
      content.innerHTML = `<div class="card"><h2>My Child</h2><p>No linked students found.</p></div>`;
      return;
    }
    renderUserTable('Student', students, content, 'My Children');
  } else {
    content.innerHTML = `<div class="card"><h2>${view}</h2><p>Parent view for ${view}.</p></div>`;
  }
}

function loadStudentView(view, users, content) {
  if (view === 'Profile') {
    content.innerHTML = `
      <div class="card">
        <h2>My Profile</h2>
        <p><strong>Name:</strong> ${currentUser.name}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>Role:</strong> ${currentUser.role}</p>
        <p><strong>Class:</strong> ${currentUser.class || 'N/A'}</p>
      </div>
    `;
  } else {
    content.innerHTML = `<div class="card"><h2>${view}</h2><p>Student view for ${view}.</p></div>`;
  }
}

function renderUserTable(role, users, content, title = null) {
  const filtered = users.filter(u => u.role === role);
  const tableTitle = title || `${role}s (${filtered.length})`;

  let rows = filtered.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="badge badge-${role.toLowerCase()}">${u.role}</span></td>
      <td>${u.class || 'N/A'}</td>
      <td>
        <button class="btn-small" onclick="editUser(${u.id})">Edit</button>
        <button class="btn-small danger" onclick="deleteUser(${u.id})">Delete</button>
      </td>
    </tr>
  `).join('');

  content.innerHTML = `
    <div class="table-container">
      <div class="table-header">
        <h3>${tableTitle}</h3>
        <div class="table-actions">
          <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="addUser('${role}')">+ Add ${role}</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Class</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

async function editUser(id) {
  alert(`Edit user ${id} (feature coming soon)`);
}

async function deleteUser(id) {
  if (!confirm('Are you sure?')) return;
  const users = await loadUsers();
  const filtered = users.filter(u => u.id !== id);
  saveUsers(filtered);
  alert('User deleted');
  renderNav();
}

async function addUser(role) {
  alert(`Add new ${role} (feature coming soon)`);
}


window.onload = initApp;
