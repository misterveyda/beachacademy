let currentUser = null;
let isSignup = false;

// configure localForage (IndexedDB wrapper)
if (window.localforage) {
  localforage.config({ name: 'BeachAcademy', storeName: 'beachacademy_data' });
}

async function loadUsers() {
  if (window.localforage) {
    const local = await localforage.getItem('usersData');
    if (local) return local;
  } else {
    const local = localStorage.getItem('usersData');
    if (local) return JSON.parse(local);
  }
  let res;
  try {
    res = await fetch('data/users-full.json');
    if (!res.ok) res = await fetch('data/users.json');
  } catch (e) {
    res = await fetch('data/users-full.json');
  }
  return res.json();
}

async function saveUsers(users) {
  if (window.localforage) {
    await localforage.setItem('usersData', users);
  } else {
    localStorage.setItem('usersData', JSON.stringify(users, null, 2));
  }
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
  await saveUsers(users);

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
  const all = users.filter(u => u.role === role);
  const tableTitle = title || `${role}s (${all.length})`;

  content.innerHTML = `
    <div class="table-container">
      <div class="table-header">
        <h3>${tableTitle}</h3>
        <div class="table-actions">
          <input id="table-search" class="search-input" placeholder="Search by name or email" />
          <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="openUserModal('add','${role}')">+ Add ${role}</button>
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
        <tbody id="table-body-${role}">
        </tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById(`table-body-${role}`);
  function renderRows(list) {
    tbody.innerHTML = list.map(u => {
      let actions = '';
      actions += `<button class="btn-small" onclick="openUserModal('edit','${role}',${u.id})">Edit</button>`;
      actions += `<button class="btn-small" onclick="openGradeModal(${u.id})">Grades</button>`;
      actions += `<button class="btn-small" onclick="openAttendanceModal(${u.id})">Attendance</button>`;
      if (role === 'Teacher' && (currentUser && currentUser.role === 'Admin')) {
        actions += `<button class="btn-small" onclick="openAssignClasses(${u.id})">Assign Classes</button>`;
      }
      actions += `<button class="btn-small danger" onclick="deleteUser(${u.id})">Delete</button>`;
      return `
      <tr>
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td><span class="badge badge-${role.toLowerCase()}">${u.role}</span></td>
        <td>${u.class || 'N/A'}</td>
        <td>${actions}</td>
      </tr>
    `;
    }).join('');
  }

  renderRows(all);

  const search = document.getElementById('table-search');
  let classFilter = '';
  if (role === 'Student') {
    getAllClasses().then(classes => {
      const select = document.createElement('select');
      select.className = 'search-input';
      select.id = 'table-class-select';
      const optAll = document.createElement('option'); optAll.value=''; optAll.text = 'All classes';
      select.appendChild(optAll);
      classes.forEach(c => { const o = document.createElement('option'); o.value = c; o.text = c; select.appendChild(o); });
      const container = document.querySelector('.table-actions');
      container.insertBefore(select, container.firstChild);
      select.addEventListener('change', () => { classFilter = select.value; applyFilters(); });
    });
  }

  search.addEventListener('input', () => applyFilters());

  function applyFilters() {
    const q = search.value.toLowerCase().trim();
    let filtered = all.slice();
    if (q) filtered = filtered.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    if (classFilter) filtered = filtered.filter(u => (u.class || '') === classFilter);
    renderRows(filtered);
  }
}

let _editingUserId = null;

async function openUserModal(mode, role, id) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('user-modal');
  document.getElementById('user-modal-title').innerText = mode === 'add' ? `Add ${role}` : 'Edit User';
  document.getElementById('modal-role').value = role || 'Student';
  document.getElementById('modal-password').value = '';
  document.getElementById('modal-class').value = '';
  _editingUserId = null;

  if (mode === 'edit') {
    const users = await loadUsers();
    const user = users.find(u => u.id === id);
    if (!user) return alert('User not found');
    document.getElementById('modal-name').value = user.name || '';
    document.getElementById('modal-email').value = user.email || '';
    document.getElementById('modal-role').value = user.role || role;
    document.getElementById('modal-class').value = user.class || '';
    _editingUserId = id;
  } else {
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-email').value = '';
    document.getElementById('modal-role').value = role || 'Student';
  }

  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function closeUserModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('user-modal').classList.add('hidden');
}

async function saveUserFromModal() {
  const name = document.getElementById('modal-name').value.trim();
  const email = document.getElementById('modal-email').value.trim();
  const role = document.getElementById('modal-role').value;
  const password = document.getElementById('modal-password').value || 'changeme';
  const cls = document.getElementById('modal-class').value || '';
  if (!name || !email) return alert('Name and email required');

  const users = await loadUsers();
  if (_editingUserId) {
    const idx = users.findIndex(u => u.id === _editingUserId);
    if (idx === -1) return alert('User not found');
    users[idx].name = name;
    users[idx].email = email;
    users[idx].role = role;
    users[idx].class = cls || users[idx].class;
    if (password) users[idx].password = password;
  } else {
    const nextId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
    users.push({ id: nextId, name, email, password, role, class: cls });
  }
  await saveUsers(users);
  closeUserModal();
  renderNav();
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  const users = await loadUsers();
  const filtered = users.filter(u => u.id !== id);
  await saveUsers(filtered);
  // refresh
  renderNav();
}

async function openGradeModal(userId) {
  const users = await loadUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return alert('User not found');
  const body = document.getElementById('grade-modal-body');
  const grades = user.grades || {};
  let html = `<p><strong>${user.name}</strong> — ${user.class || 'N/A'}</p>`;
  html += `<div id="grades-list">`;
  for (const subj in grades) {
    html += `<div><label>${subj}: <input data-subj="${subj}" value="${grades[subj]}" /></label></div>`;
  }
  html += `</div>`;
  html += `<div style="margin-top:0.75rem;"><input id="new-grade-subj" placeholder="Subject" /><input id="new-grade-val" placeholder="Grade" /><button class="btn-small" onclick="addGradeField(${userId})">Add</button></div>`;
  html += `<div style="margin-top:0.75rem;"><button class="btn-primary" onclick="saveGrades(${userId})">Save grades</button></div>`;
  body.innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('grade-modal').classList.remove('hidden');
}

function addGradeField(userId) {
  const subj = document.getElementById('new-grade-subj').value.trim();
  const val = document.getElementById('new-grade-val').value.trim();
  if (!subj) return alert('Enter subject');
  const list = document.getElementById('grades-list');
  const node = document.createElement('div');
  node.innerHTML = `<label>${subj}: <input data-subj="${subj}" value="${val}" /></label>`;
  list.appendChild(node);
  document.getElementById('new-grade-subj').value = '';
  document.getElementById('new-grade-val').value = '';
}

async function saveGrades(userId) {
  const inputs = Array.from(document.querySelectorAll('#grades-list input'));
  const grades = {};
  inputs.forEach(i => { grades[i.getAttribute('data-subj')] = i.value; });
  const users = await loadUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return alert('User not found');
  users[idx].grades = grades;
  await saveUsers(users);
  closeGradeModal();
  alert('Grades saved');
}

function closeGradeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('grade-modal').classList.add('hidden');
}

async function openAttendanceModal(userId) {
  const users = await loadUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return alert('User not found');
  const body = document.getElementById('attendance-modal-body');
  const attendance = user.attendance || [];
  let html = `<p><strong>${user.name}</strong> — ${user.class || 'N/A'}</p>`;
  html += `<div id="attendance-list">`;
  attendance.slice().reverse().forEach(a => {
    html += `<div><span class="muted">${a.date}</span> — ${a.status}</div>`;
  });
  html += `</div>`;
  const today = new Date().toISOString().slice(0,10);
  html += `<div style="margin-top:0.75rem;"><label>Date <input id="att-date" type="date" value="${today}" /></label> <select id="att-status"><option>Present</option><option>Absent</option><option>Late</option></select> <button class="btn-small" onclick="saveAttendance(${userId})">Mark</button></div>`;
  body.innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('attendance-modal').classList.remove('hidden');
}

async function saveAttendance(userId) {
  const date = document.getElementById('att-date').value;
  const status = document.getElementById('att-status').value;
  const users = await loadUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return alert('User not found');
  users[idx].attendance = users[idx].attendance || [];
  users[idx].attendance.push({ date, status });
  await saveUsers(users);
  closeAttendanceModal();
  alert('Attendance saved');
}

function closeAttendanceModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('attendance-modal').classList.add('hidden');
}

// Helper: get existing classes from students
async function getAllClasses() {
  const users = await loadUsers();
  const set = new Set();
  users.filter(u => u.role === 'Student').forEach(s => { if (s.class) set.add(s.class); });
  return Array.from(set).sort();
}

// Admin: assign classes to teacher
let _assigningTeacherId = null;
async function openAssignClasses(teacherId) {
  _assigningTeacherId = teacherId;
  const classes = await getAllClasses();
  const users = await loadUsers();
  const teacher = users.find(u => u.id === teacherId);
  const body = document.getElementById('assign-classes-body');
  let html = '';
  html += '<div style="margin-bottom:0.5rem"><strong>Available classes</strong></div>';
  html += '<div style="display:flex;flex-direction:column;gap:6px;">';
  classes.forEach(c => {
    const checked = (teacher.assignedClasses || []).includes(c) ? 'checked' : '';
    html += `<label><input type="checkbox" data-class="${c}" ${checked} /> ${c}</label>`;
  });
  html += '</div>';
  html += '<div style="margin-top:8px"><input id="new-class-name" placeholder="Create new class" /></div>';
  body.innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('assign-classes-modal').classList.remove('hidden');
}

function closeAssignClasses() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('assign-classes-modal').classList.add('hidden');
}

async function saveAssignedClasses() {
  const users = await loadUsers();
  const teacher = users.find(u => u.id === _assigningTeacherId);
  if (!teacher) return alert('Teacher not found');
  const checked = Array.from(document.querySelectorAll('#assign-classes-body input[type=checkbox]')).filter(i=>i.checked).map(i=>i.getAttribute('data-class'));
  const newClass = document.getElementById('new-class-name').value.trim();
  if (newClass) checked.push(newClass);
  teacher.assignedClasses = checked;
  await saveUsers(users);
  closeAssignClasses();
  alert('Assigned classes saved');
  renderNav();
}

// Timetable storage helpers
async function loadTimetables() {
  if (window.localforage) {
    const t = await localforage.getItem('timetables');
    return t || {};
  }
  const raw = localStorage.getItem('timetables');
  return raw ? JSON.parse(raw) : {};
}
async function saveTimetables(t) {
  if (window.localforage) {
    await localforage.setItem('timetables', t);
  } else {
    localStorage.setItem('timetables', JSON.stringify(t, null,2));
  }
}

// Open timetable modal to view/edit for a class
async function openTimetableModal(className) {
  const timetables = loadTimetables();
  const subjectsRes = await fetch('data/subjects-full.json').then(r=>r.json()).catch(()=>[]);
  const subs = subjectsRes.map(s=>s.code);
  const table = timetables[className] || {};
  const body = document.getElementById('timetable-modal-body');
  const days = ['Mon','Tue','Wed','Thu','Fri'];
  let html = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;"><strong>${className}</strong></div>`;
  html += '<table class="timetable"><thead><tr><th>Day</th><th>Period 1</th><th>Period 2</th><th>Period 3</th><th>Period 4</th></tr></thead><tbody>';
  days.forEach(d=>{
    html += `<tr><td>${d}</td>`;
    for(let p=1;p<=4;p++){
      const key = `${d}-${p}`;
      const val = table[key] || '';
      html += `<td><select data-key="${key}">`;
      html += `<option value="">--</option>`;
      subs.forEach(code=>{ const sel = val===code? 'selected':''; html+=`<option value="${code}" ${sel}>${code}</option>`; });
      html += `</select></td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';
  body.innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('timetable-modal').classList.remove('hidden');
  // store editing class on modal element
  document.getElementById('timetable-modal').setAttribute('data-class', className);
}

function closeTimetableModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('timetable-modal').classList.add('hidden');
}

async function saveTimetable() {
  const className = document.getElementById('timetable-modal').getAttribute('data-class');
  const selects = Array.from(document.querySelectorAll('#timetable-modal-body select'));
  const table = {};
  selects.forEach(s=>{ const k=s.getAttribute('data-key'); if(s.value) table[k]=s.value; });
  const timetables = await loadTimetables();
  timetables[className]=table;
  await saveTimetables(timetables);
  closeTimetableModal();
  alert('Timetable saved');
}

// Assignments: moved to IndexedDB via localforage when available
async function loadAssignments() {
  if (window.localforage) {
    const a = await localforage.getItem('assignments');
    return a || [];
  }
  const raw = localStorage.getItem('assignments');
  return raw ? JSON.parse(raw) : [];
}
async function saveAssignments(a){
  if (window.localforage) {
    await localforage.setItem('assignments', a);
  } else {
    localStorage.setItem('assignments', JSON.stringify(a, null,2));
  }
}

// Teacher: open assignment modal
function openAssignmentModal() {
  document.getElementById('assignment-title').value='';
  document.getElementById('assignment-desc').value='';
  document.getElementById('assignment-class').value='';
  document.getElementById('assignment-due').value='';
  document.getElementById('assignment-file').value='';
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('assignment-modal').classList.remove('hidden');
}
function closeAssignmentModal(){ document.getElementById('modal-overlay').classList.add('hidden'); document.getElementById('assignment-modal').classList.add('hidden'); }

async function saveAssignment(){
  const title = document.getElementById('assignment-title').value.trim();
  const desc = document.getElementById('assignment-desc').value.trim();
  const cls = document.getElementById('assignment-class').value.trim();
  const due = document.getElementById('assignment-due').value;
  const fileInput = document.getElementById('assignment-file');
  if(!title || !cls) return alert('Title and class required');
  const assignments = await loadAssignments();
  const nextId = assignments.length? Math.max(...assignments.map(a=>a.id))+1 : 1;
  const assignment = { id: nextId, title, desc, class: cls, due, teacherId: currentUser.id, created: new Date().toISOString(), attachment: null, submissions: {}, grades: {} };
  if (fileInput.files && fileInput.files[0]){
    const f = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(e){
      assignment.attachment = { name: f.name, data: e.target.result };
      assignments.push(assignment);
      await saveAssignments(assignments);
      closeAssignmentModal();
      showNotification(`📢 Assignment "${title}" posted to ${cls}`, 'success');
      alert('Assignment posted');
      renderNav();
    };
    reader.readAsDataURL(f);
  } else {
    assignments.push(assignment);
    await saveAssignments(assignments);
    closeAssignmentModal();
    showNotification(`📢 Assignment "${title}" posted to ${cls}`, 'success');
    alert('Assignment posted');
    renderNav();
  }
}

// Student: view assignments for their class
async function renderAssignmentsView(content) {
  const assignments = await loadAssignments();
  const users = await loadUsers();
  const myClass = currentUser.class;
  const list = assignments.filter(a => a.class === myClass || (currentUser.role==='Teacher' && a.teacherId===currentUser.id) );
  let html = '<div class="card"><h2>Assignments</h2>';
  if (currentUser.role === 'Teacher') html += '<div style="margin-top:8px;"><button class="btn-primary" onclick="openAssignmentModal()">+ New Assignment</button></div>';
  if (currentUser.role === 'Teacher') html += '<div style="margin-top:8px;"><button class="btn-primary" style="background:#666;" onclick="exportAssignmentsCSV()">📥 Export CSV</button> <button class="btn-primary" style="background:#666;" onclick="importAssignmentsCSV()">📤 Import CSV</button></div>';
  html += '<div class="table-container"><table><thead><tr><th>Title</th><th>Class</th><th>Due</th><th>By</th><th>Attachment</th><th>Action</th></tr></thead><tbody>';
  list.forEach(a=>{
    const teacher = users.find(u=>u.id===a.teacherId);
    html += `<tr><td>${a.title}</td><td>${a.class}</td><td>${a.due||''}</td><td>${teacher?teacher.name:''}</td><td>${a.attachment? a.attachment.name : ''}</td><td>`;
    if (currentUser.role==='Teacher' && a.teacherId===currentUser.id) {
      html += `<button class="btn-small" onclick="viewAssignment(${a.id})">View</button>`;
      html += `<button class="btn-small" onclick="openGradingModal(${a.id})">Grade</button>`;
    } else if (currentUser.role==='Student'){
      html += `<button class="btn-small" onclick="openSubmissionModal(${a.id})">Submit</button>`;
    }
    html += `</td></tr>`;
  });
  html += '</tbody></table></div></div>';
  content.innerHTML = html;
}

async function viewAssignment(id){
  const assignments = await loadAssignments();
  const a = assignments.find(x=>x.id===id);
  if(!a) return alert('Not found');
  let html = `<h3>${a.title}</h3><p>${a.desc||''}</p>`;
  if(a.attachment) html += `<p><a href="${a.attachment.data}" download="${a.attachment.name}">Download attachment</a></p>`;
  html += `<p class="muted">Due: ${a.due||'n/a'}</p>`;
  const body = document.getElementById('submission-modal-body');
  body.innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('submission-modal').classList.remove('hidden');
}

async function openSubmissionModal(assignmentId){
  const assignments = await loadAssignments();
  const a = assignments.find(x=>x.id===assignmentId);
  if(!a) return alert('Not found');
  const body = document.getElementById('submission-modal-body');
  body.innerHTML = `<p><strong>${a.title}</strong></p><input type="file" id="submission-file" />`;
  document.getElementById('submission-modal').setAttribute('data-assignment', assignmentId);
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('submission-modal').classList.remove('hidden');
}

function closeSubmissionModal(){ document.getElementById('modal-overlay').classList.add('hidden'); document.getElementById('submission-modal').classList.add('hidden'); }

function submitAssignment(){
  const assignmentId = parseInt(document.getElementById('submission-modal').getAttribute('data-assignment'));
  const fileInput = document.getElementById('submission-file');
  if(!fileInput || !fileInput.files[0]) return alert('Select file');
  const f = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async function(e){
    const assignments = await loadAssignments();
    const a = assignments.find(x=>x.id===assignmentId);
    a.submissions = a.submissions || {};
    a.submissions[currentUser.id] = { name: f.name, data: e.target.result, at: new Date().toISOString() };
    await saveAssignments(assignments);
    closeSubmissionModal();
    alert('Submitted');
  };
  reader.readAsDataURL(f);
}

// Integrate new views into loadView: add Timetable and Assignments for roles
const _originalLoadView = loadView;
async function loadView(view) {
  const content = document.getElementById('content');
  const users = await loadUsers();

  if (view === 'Assignments') {
    return renderAssignmentsView(content);
  }

  if (view === 'Timetable') {
    // For teacher: show classes assigned and open timetable for chosen class
    if (currentUser.role === 'Teacher') {
      const classes = currentUser.assignedClasses || [];
      let html = `<div class="card"><h2>Timetables</h2><div class="muted">Select a class to view or edit timetable</div>`;
      html += '<div style="margin-top:1rem;display:flex;gap:8px;flex-wrap:wrap">';
      if (classes.length===0) html += '<div class="muted">No classes assigned</div>';
      classes.forEach(c => { html += `<button class="btn-small" onclick="openTimetableModal('${c}')">${c}</button> <button class="btn-small" style="background:#666;" onclick="exportTimetableCSV('${c}')">📥</button> <button class="btn-small" style="background:#666;" onclick="importTimetableCSV('${c}')">📤</button>`; });
      html += '</div></div>';
      content.innerHTML = html;
      return;
    }
    // For student: show their class timetable
    if (currentUser.role === 'Student') {
      const cls = currentUser.class;
      if (!cls) return content.innerHTML = `<div class="card"><h2>Timetable</h2><p>No class assigned</p></div>`;
      await openTimetableModal(cls);
      return;
    }
  }

  // otherwise call original behavior based on role
  if (currentUser.role === 'Admin') return loadAdminView(view, users, content);
  if (currentUser.role === 'Teacher') return loadTeacherView(view, users, content);
  if (currentUser.role === 'Parent') return loadParentView(view, users, content);
  if (currentUser.role === 'Student') return loadStudentView(view, users, content);
}

// Update nav links to include Timetable and Assignments
function renderNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = '';

  const links = {
    Admin: ['Dashboard','Students','Teachers','Fees','Analytics'],
    Teacher: ['Dashboard','Timetable','Assignments','Classes','Attendance','Grades','Messages'],
    Parent: ['My Child','Attendance','Fees','Messages','Assignments'],
    Student: ['Profile','Grades','Timetable','Assignments']
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

// Grading: Teacher view of submissions
let _gradingAssignmentId = null;
let _gradingStudentId = null;

async function openGradingModal(assignmentId) {
  const assignments = loadAssignments();
  const a = assignments.find(x => x.id === assignmentId);
  if (!a) return alert('Assignment not found');
  
  const body = document.getElementById('grading-modal-body');
  const users = await loadUsers();
  const submissions = Object.entries(a.submissions || {});
  
  let html = `<h4>${a.title} — ${a.class}</h4>`;
  html += '<div style="margin-top:1rem;"><strong>Submissions</strong></div>';
  html += '<table style="width:100%;font-size:0.85rem;"><thead><tr><th>Student</th><th>File</th><th>Submitted</th><th>Grade</th></tr></thead><tbody>';
  
  submissions.forEach(([stId, sub]) => {
    const student = users.find(u => u.id === parseInt(stId));
    const grade = (a.grades || {})[stId] || '';
    html += `<tr>
      <td>${student ? student.name : 'Unknown'}</td>
      <td><a href="${sub.data}" download="${sub.name}" style="color:#0077b6;text-decoration:underline;">download</a></td>
      <td><span class="muted">${new Date(sub.at).toLocaleDateString()}</span></td>
      <td><button class="btn-small" onclick="editGrade(${assignmentId}, ${stId}, '${grade}')">Set</button></td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  body.innerHTML = html;
  
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('grading-modal').classList.remove('hidden');
}

function editGrade(assignmentId, studentId, currentGrade) {
  const grade = prompt('Enter grade (A, B, C, etc. or score):', currentGrade);
  if (grade === null) return;
  _gradingAssignmentId = assignmentId;
  _gradingStudentId = studentId;
  const body = document.getElementById('grading-modal-body');
  body.innerHTML = `<p>Grade <input id="grade-input" value="${grade}" /></p>`;
}

function closeGradingModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('grading-modal').classList.add('hidden');
}

function saveGrade() {
  const grade = document.getElementById('grade-input')?.value.trim();
  if (!grade) return alert('Enter a grade');
  const assignments = loadAssignments();
  const a = assignments.find(x => x.id === _gradingAssignmentId);
  if (!a) return alert('Assignment not found');
  a.grades = a.grades || {};
  a.grades[_gradingStudentId] = grade;
  saveAssignments(assignments);
  closeGradingModal();
  alert('Grade saved');
}

// Notification system
function showNotification(msg, type = 'info') {
  const container = document.getElementById('notification-container');
  const div = document.createElement('div');
  div.className = `notification notification-${type}`;
  div.style.cssText = 'background:#fff;border-left:4px solid #0077b6;padding:1rem;margin-bottom:8px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.1);';
  if (type === 'success') div.style.borderLeftColor = '#66bb6a';
  if (type === 'error') div.style.borderLeftColor = '#ff6b6b';
  div.innerText = msg;
  container.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// CSV export functions
function exportTimetableCSV(className) {
  const timetables = loadTimetables();
  const table = timetables[className] || {};
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  let csv = 'Day,Period1,Period2,Period3,Period4\n';
  days.forEach(d => {
    const row = [d];
    for (let p = 1; p <= 4; p++) {
      row.push(table[`${d}-${p}`] || '');
    }
    csv += row.map(c => `"${c}"`).join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timetable-${className}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAssignmentsCSV() {
  const assignments = loadAssignments();
  const users = {};
  (async () => {
    const u = await loadUsers();
    u.forEach(x => users[x.id] = x.name);
  })();
  
  let csv = 'ID,Title,Class,Due,By,Submissions\n';
  assignments.forEach(a => {
    const subCount = Object.keys(a.submissions || {}).length;
    csv += `${a.id},"${a.title}","${a.class}","${a.due || ''}","${users[a.teacherId] || ''}",${subCount}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'assignments.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function importAssignmentsCSV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = async (e) => {
    const f = e.target.files[0];
    const text = await f.text();
    const lines = text.split('\n').slice(1).filter(l => l.trim());
    const assignments = loadAssignments();
    const maxId = assignments.length ? Math.max(...assignments.map(a => a.id)) : 0;
    let imported = 0;
    
    lines.forEach((line, idx) => {
      const parts = line.split(',').map(p => p.replace(/^"|"$/g, ''));
      if (parts.length >= 3) {
        assignments.push({
          id: maxId + idx + 1,
          title: parts[1],
          class: parts[2],
          due: parts[3] || '',
          teacherId: currentUser.id,
          created: new Date().toISOString(),
          attachment: null,
          submissions: {},
          grades: {}
        });
        imported++;
      }
    });
    
    saveAssignments(assignments);
    showNotification(`Imported ${imported} assignments`, 'success');
  };
  input.click();
}

function importTimetableCSV(className) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.onchange = async (e) => {
    const f = e.target.files[0];
    const text = await f.text();
    const lines = text.split('\n').slice(1).filter(l => l.trim());
    const timetables = loadTimetables();
    const table = {};
    
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        const day = parts[0].trim();
        for (let p = 1; p <= 4; p++) {
          if (parts[p]) table[`${day}-${p}`] = parts[p].trim();
        }
      }
    });
    
    timetables[className] = table;
    saveTimetables(timetables);
    showNotification('Timetable imported', 'success');
  };
  input.click();
}

window.onload = initApp;
